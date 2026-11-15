// Playwright Agent reporter: saves each run as task evidence and refreshes the static report.
//
// Wire it into an existing project's playwright.config.ts (path relative to that config):
//   reporter: [['list'], ['../playwright-agent/reporter/index.mjs', { task: 'LOGIN-123' }]]
//
// Options (all optional):
//   task    Work-item ID. Default: $PLAYWRIGHT_AGENT_TASK, otherwise "playwright-runs".
//   repo    Project root that owns artifacts/agent-tasks. Default: $PLAYWRIGHT_AGENT_REPO,
//           otherwise the config file's folder.
//   report  false skips rebuilding <repo>/playwright-agent-report/index.html.
// Set PLAYWRIGHT_AGENT_REPORT=off to disable the reporter for one run.
//
// The reporter only records what Playwright observed. It never changes tests, retries
// failures or marks anything as covered. Attachment uses the same validation as
// `npm run portal -- attach`, so an inconsistent report is refused rather than stored.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const toolkitRoot=fileURLToPath(new URL('../',import.meta.url));
const runner=path.join(toolkitRoot,'scripts','run-quality.mjs');
const MAX_MESSAGE=4000,MAX_ERRORS=5;
const ansi=/\u001b\[[0-9;]*[A-Za-z]/g;
const message=error=>String(error?.message??error?.value??'Error details unavailable').replace(ansi,'').slice(0,MAX_MESSAGE);

export default class PlaywrightAgentReporter {
  constructor(options={}){
    this.options=options;
    this.errors=[];
  }
  printsToStdio(){return false;}
  onBegin(config,suite){this.config=config;this.suite=suite;}
  onError(error){if(this.errors.length<100)this.errors.push({message:message(error)});}

  /** Playwright JSON-reporter-compatible shape, as accepted by `portal attach --kind playwright`. */
  buildReport(result,repo=this.config.rootDir){
    const root=repo,stats={expected:0,unexpected:0,skipped:0,flaky:0,startTime:result.startTime.toISOString(),duration:result.duration};
    const specs=[];
    for(const test of this.suite.allTests()){
      // Interrupted attempts are excluded by Playwright's own outcome(); keep the record consistent with it.
      const results=test.results.filter(r=>r.status!=='interrupted').map(r=>({status:r.status,duration:r.duration,retry:r.retry,errors:r.errors.slice(0,MAX_ERRORS).map(e=>({message:message(e)}))}));
      const outcome=test.outcome();
      stats[outcome]++;
      specs.push({title:test.titlePath().slice(3).join(' › ')||test.title,file:path.relative(root,test.location.file).split(path.sep).join('/'),line:test.location.line,column:test.location.column,
        tests:[{projectName:test.parent.project()?.name??'',expectedStatus:test.expectedStatus,status:outcome,results}]});
    }
    return {stats,suites:[{title:'',specs}],errors:this.errors};
  }

  onEnd(result){
    if(process.env.PLAYWRIGHT_AGENT_REPORT==='off'||!this.config)return;
    const repo=path.resolve(this.options.repo??process.env.PLAYWRIGHT_AGENT_REPO??(this.config.configFile?path.dirname(this.config.configFile):process.cwd()));
    const task=String(this.options.task??process.env.PLAYWRIGHT_AGENT_TASK??'playwright-runs');
    const directory=path.join(repo,'test-results','playwright-agent');
    const file=path.join(directory,'results-'+result.startTime.toISOString().replace(/[:.]/g,'-')+'.json');
    try{
      mkdirSync(directory,{recursive:true});
      writeFileSync(file,JSON.stringify(this.buildReport(result,repo)));
    }catch(error){console.error('[playwright-agent] Could not write the run record: '+message(error));return;}
    const quality=(...args)=>spawnSync(process.execPath,[runner,'portal',...args],{cwd:repo,encoding:'utf8'});
    const attached=quality('attach','--repo',repo,'--task',task,'--kind','playwright','--file',file);
    if(attached.status!==0){console.error('[playwright-agent] Run was not attached: '+(attached.stderr||attached.stdout).trim());return;}
    let line=`[playwright-agent] Run saved to work item ${task}.`;
    if(this.options.report!==false){
      const built=quality('report','--repo',repo);
      line+=built.status===0?` Report: ${path.join(repo,'playwright-agent-report','index.html')}`:' Report was not rebuilt: '+(built.stderr||built.stdout).trim();
    }
    console.log(line);
  }
}
