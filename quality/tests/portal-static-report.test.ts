import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm,realpath} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {attachReport} from '../src/portal/reports.js';
import {buildStaticReport} from '../src/portal/static-report.js';

const hostile='</script><script>alert(1)</script>';
const report={stats:{expected:1,unexpected:1,skipped:0,flaky:0,startTime:'2026-11-01T10:00:00.000Z',duration:20},suites:[{specs:[
 {title:'passes',tests:[{projectName:'chromium',expectedStatus:'passed',status:'expected',results:[{status:'passed',duration:5,retry:0,errors:[]}]}]},
 {title:'fails '+hostile,tests:[{projectName:'chromium',expectedStatus:'passed',status:'unexpected',results:[{status:'failed',duration:5,retry:0,errors:[{message:'Expected declined '+hostile}]}]}]}]}]};

async function project(t:{after:(fn:()=>Promise<void>)=>void}){
 const temp=await realpath(await mkdtemp(path.join(os.tmpdir(),'static report-')));t.after(()=>rm(temp,{recursive:true,force:true}));
 const repo=path.join(temp,'private-project-name');await mkdir(repo);return repo;
}
function embedded(html:string){const match=/<script type="application\/json" id="embedded-evidence">([\s\S]*?)<\/script>/.exec(html);assert.ok(match,'evidence is embedded');return JSON.parse(match[1]);}

test('static report embeds saved evidence in one private, self-contained HTML file without executing anything',async t=>{
 const repo=await project(t);
 await attachReport({repo,taskId:'CHECKOUT-42',kind:'playwright',name:'results.json',bytes:Buffer.from(JSON.stringify(report))});
 const built=await buildStaticReport({repo});
 assert.equal(built.file,path.join(repo,'playwright-agent-report','index.html'));assert.equal(built.tasks,1);assert.equal(built.executed,false);
 const html=await readFile(built.file,'utf8');
 assert.doesNotMatch(html,/<link rel="stylesheet"|<script src=/,'no external assets');
 assert.equal(html.split(hostile).length,1,'report text cannot close the embedding script');
 const data=embedded(html);
 assert.equal(data.tasks[0].id,'CHECKOUT-42');assert.equal(data.details['CHECKOUT-42'].reports.tests[0].counts.unexpected,1);
 assert.ok(data.details['CHECKOUT-42'].reports.tests[0].tests[1].title.includes(hostile),'text survives escaping intact');
 assert.doesNotMatch(JSON.stringify(data.session),new RegExp(repo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'absolute project path is omitted');
 assert.match(await readFile(path.join(repo,'playwright-agent-report','.gitignore'),'utf8'),/^\*$/m);
});

test('static report can be limited to one work item and refuses an unknown one',async t=>{
 const repo=await project(t);
 for(const taskId of ['A-1','B-2'])await attachReport({repo,taskId,kind:'playwright',name:'results.json',bytes:Buffer.from(JSON.stringify(report))});
 const built=await buildStaticReport({repo,taskId:'B-2',out:'out/report'});
 const data=embedded(await readFile(built.file,'utf8'));
 assert.deepEqual(Object.keys(data.details),['B-2']);assert.equal(data.initialTask,'B-2');
 await assert.rejects(buildStaticReport({repo,taskId:'MISSING-1'}),/No saved evidence/);
});
