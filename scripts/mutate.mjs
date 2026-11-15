#!/usr/bin/env node
// Single-fault mutation check: "would these tests catch this defect?"
// The fault is applied only to a disposable copy of the Playwright project; the
// original files are hashed before and after to prove they were not touched.
//
//   npm run mutate -- --project examples/crm-scale --file app/api.mjs \
//     --find "Math.round(x * 100)" --replace "Math.floor(x * 100)" [--grep quotes] [--runs 2]
//   npm run mutate -- --project examples/crm-scale --fault fault.json   # {"edits":[{file,find,replace}]}
//
// Exit code: 0 killed or survived (a valid answer), 2 inconclusive or invalid, 1 usage error.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,existsSync,mkdirSync,readFileSync,readdirSync,rmSync,statSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SKIP=new Set(['node_modules','test-results','playwright-report','.mutation-work','.git','.playwright']);

export function parseArgs(argv) {
  const opts={runs:2,env:{},tests:[],edits:[],keep:false,json:false};
  for(let i=0;i<argv.length;i++) {
    const a=argv[i],next=()=>{if(i+1>=argv.length)throw Error(`${a} needs a value`);return argv[++i];};
    if(a==='--project')opts.project=next();
    else if(a==='--fault')opts.edits.push(...JSON.parse(readFileSync(next(),'utf8')).edits);
    else if(a==='--file')opts.edits.push({file:next()});
    else if(a==='--find')last(opts,a).find=next();
    else if(a==='--replace')last(opts,a).replace=next();
    else if(a==='--grep')opts.grep=next();
    else if(a==='--test')opts.tests.push(next());
    else if(a==='--runs')opts.runs=Number(next());
    else if(a==='--env'){const [k,...v]=next().split('=');opts.env[k]=v.join('=');}
    else if(a==='--out')opts.out=next();
    else if(a==='--keep')opts.keep=true;
    else if(a==='--json')opts.json=true;
    else throw Error(`Unknown option ${a}`);
  }
  if(!opts.project)throw Error('--project <playwright project dir> is required');
  if(!opts.edits.length)throw Error('Give a fault: --fault <json> or --file/--find/--replace');
  for(const e of opts.edits)if(!e.file||typeof e.find!=='string'||typeof e.replace!=='string')throw Error('Each edit needs file, find and replace');
  if(!(opts.runs>=2))throw Error('--runs must be at least 2');
  return opts;
}
function last(opts,flag){const e=opts.edits.at(-1);if(!e)throw Error(`${flag} must follow --file`);return e;}

export function treeHash(root) {
  const hash=createHash('sha256');
  const walk=dir=>{
    for(const name of readdirSync(dir).sort()) {
      if(SKIP.has(name))continue;
      const full=path.join(dir,name),st=statSync(full);
      if(st.isDirectory())walk(full);
      else {hash.update(path.relative(root,full));hash.update(readFileSync(full));}
    }
  };
  walk(root);
  return hash.digest('hex');
}

export function applyEdits(root,edits,{dryRun=false}={}) {
  const texts=new Map();
  for(const e of edits) {
    const file=path.join(root,e.file);
    if(!texts.has(file)&&!existsSync(file))return {ok:false,reason:`fault file not found: ${e.file}`};
    const text=texts.get(file)??readFileSync(file,'utf8'),count=text.split(e.find).length-1;
    if(count!==1)return {ok:false,reason:`fault text matches ${count} times in ${e.file} (must be exactly 1)`};
    texts.set(file,text.replace(e.find,()=>e.replace));
  }
  if(!dryRun)for(const [file,text] of texts)writeFileSync(file,text);
  return {ok:true};
}

function runTests(dir,opts,label) {
  const report=path.join(dir,`.mutate-${label}.json`);
  const args=['playwright','test','--reporter=json',...opts.tests];
  if(opts.grep)args.push('--grep',opts.grep);
  const r=spawnSync('npx',args,{cwd:dir,encoding:'utf8',env:{...process.env,...opts.env,PLAYWRIGHT_JSON_OUTPUT_NAME:report},maxBuffer:64<<20});
  if(!existsSync(report))return {label,ok:false,error:(r.stderr||r.stdout||'no report').slice(-800)};
  const data=JSON.parse(readFileSync(report,'utf8')),failed=[];
  const visit=s=>{for(const spec of s.specs??[])for(const t of spec.tests??[])if(t.status==='unexpected')failed.push(`${spec.file} › ${spec.title}`);for(const c of s.suites??[])visit(c);};
  for(const s of data.suites??[])visit(s);
  const st=data.stats??{};
  return {label,ok:true,passed:st.expected??0,failed:st.unexpected??0,flaky:st.flaky??0,skipped:st.skipped??0,failedTests:failed,setupError:(data.errors??[]).length>0};
}

export function verdict(baselines,faulted) {
  if(baselines.some(b=>!b.ok||b.setupError||b.failed||b.flaky||!b.passed))return {verdict:'inconclusive',reason:'the unfaulted copy was not green in every baseline run'};
  if(faulted.some(f=>!f.ok||f.setupError))return {verdict:'inconclusive',reason:'a faulted run did not complete (startup or setup error)'};
  const total=baselines[0].passed+baselines[0].skipped;
  if(faulted.some(f=>f.passed+f.failed+f.flaky+f.skipped!==total))return {verdict:'inconclusive',reason:'a faulted run did not execute the same tests as the baseline'};
  if(faulted.every(f=>f.failed>0)) {
    const sets=faulted.map(f=>new Set(f.failedTests)),stable=[...sets[0]].filter(t=>sets.every(s=>s.has(t)));
    return stable.length?{verdict:'killed',killedBy:stable}:{verdict:'inconclusive',reason:'different tests failed in each faulted run'};
  }
  if(faulted.every(f=>!f.failed&&!f.flaky))return {verdict:'survived',reason:'every selected test passed with the fault present'};
  return {verdict:'inconclusive',reason:'the fault was caught in some runs but not others'};
}

export function main(argv) {
  const opts=parseArgs(argv),project=path.resolve(opts.project);
  if(!['playwright.config.ts','playwright.config.js','playwright.config.mjs'].some(f=>existsSync(path.join(project,f))))throw Error(`No Playwright config in ${project}`);
  const check=applyEdits(project,opts.edits,{dryRun:true});
  if(!check.ok)throw Error(`Invalid fault: ${check.reason}`);
  const before=treeHash(project);
  const id=new Date().toISOString().replace(/[:.]/g,'-'),work=path.join(project,'.mutation-work',id);
  mkdirSync(path.dirname(work),{recursive:true});
  // Inside the project, so the copy resolves the same node_modules as the original.
  mkdirSync(work);
  for(const name of readdirSync(project))if(!SKIP.has(name))cpSync(path.join(project,name),path.join(work,name),{recursive:true,filter:src=>!SKIP.has(path.basename(src))});
  const result={project:opts.project,edits:opts.edits,grep:opts.grep??null,tests:opts.tests,runs:opts.runs,copy:opts.keep?work:null};
  try {
    result.baselines=Array.from({length:opts.runs},(_,i)=>runTests(work,opts,`baseline-${i+1}`));
    const applied=applyEdits(work,opts.edits);
    if(!applied.ok)Object.assign(result,{verdict:'invalid',reason:applied.reason,faulted:[]});
    else {
      result.faulted=Array.from({length:opts.runs},(_,i)=>runTests(work,opts,`fault-${i+1}`));
      Object.assign(result,verdict(result.baselines,result.faulted));
    }
  } finally {
    if(!opts.keep)rmSync(work,{recursive:true,force:true});
  }
  result.originalUnchanged=treeHash(project)===before;
  if(!result.originalUnchanged)Object.assign(result,{verdict:'invalid',reason:'the original project changed during the check'});
  if(opts.out)writeFileSync(opts.out,JSON.stringify(result,null,2)+'\n');
  if(opts.json)console.log(JSON.stringify(result,null,2));
  else {
    const row=r=>r.ok?`${r.label}: ${r.passed} passed, ${r.failed} failed${r.flaky?`, ${r.flaky} flaky`:''}`:`${r.label}: did not run (${r.error})`;
    console.log([...result.baselines.map(row),...result.faulted.map(row)].join('\n'));
    console.log(`\nVERDICT: ${result.verdict}${result.reason?` (${result.reason})`:''}`);
    for(const t of result.killedBy??[])console.log(`  caught by: ${t}`);
    console.log(`Original project unchanged: ${result.originalUnchanged ? 'yes' : 'NO'}${opts.keep?`\nFaulted copy kept at ${work}`:''}`);
  }
  return ['killed','survived'].includes(result.verdict)?0:2;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {process.exitCode=main(process.argv.slice(2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
