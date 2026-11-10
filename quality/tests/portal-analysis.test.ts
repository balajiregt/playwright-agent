import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {ROOT} from '../src/context.js';
import {prepareIntake,inspectIntake,saveIntakeDraft} from '../src/intake/store.js';
import {readAgentAnalysis,recordAgentAnalysis,readTaskAnalysis} from '../src/portal/analysis.js';
import {taskDetail,taskList} from '../src/portal/project.js';

const bundled=path.join(ROOT,process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python');
const python=existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3';
async function fixture(t:{after:(f:()=>Promise<void>)=>void}){
 const root=await mkdtemp(path.join(os.tmpdir(),'portal analysis with spaces-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const repo=path.join(root,'project');await mkdir(repo);
 const source=path.join(root,'ticket.json');await writeFile(source,JSON.stringify({version:1,requirements:[{id:'AC1',criterion:'Invalid passwords show a visible credential error.',journey:'login',critical:true}]}));
 const prepared=await prepareIntake({repo,task:'LOGIN-123',files:[source],python});
 const current=await inspectIntake({run:prepared.run}),identity={intakeHash:current.snapshot.intakeHash,draftHash:current.draftHash};
 const file=path.join(root,'assessment.md');await writeFile(file,'# Draft assessment\n\nAC1: assertion missing; execution not run.');
 return {root,repo,prepared,current,identity,file};
}
test('host-agent analysis is linked to the exact intake/draft without accepting or executing',async t=>{
 const f=await fixture(t);assert.equal(await readAgentAnalysis(f.prepared.run,f.identity),undefined);
 const result=await recordAgentAnalysis({run:f.prepared.run,file:f.file});assert.equal(result.accepted,false);assert.equal(result.executed,false);
 const analysis=await readAgentAnalysis(f.prepared.run,f.identity);assert.equal(analysis!.stale,false);assert.match(analysis!.text,/assertion missing/);
 const current=await inspectIntake({run:f.prepared.run});assert.equal(current.accepted,false);assert.equal(current.reviewed,false);
 const draft=structuredClone(current.draft);draft.requirements[0].criterion='Invalid passwords retain a visible credential error.';
 await saveIntakeDraft({run:f.prepared.run,draft});
 const changed=await inspectIntake({run:f.prepared.run});assert.equal((await readAgentAnalysis(f.prepared.run,{intakeHash:f.identity.intakeHash,draftHash:changed.draftHash}))!.stale,true);
 assert.equal((await readAgentAnalysis(f.prepared.run,{...f.identity,stale:true}))!.stale,true);
});
test('empty, oversized, malformed and linked agent findings are refused without changing a valid record',async t=>{
 const f=await fixture(t);await recordAgentAnalysis({run:f.prepared.run,file:f.file});
 const target=path.join(f.prepared.run,'agent-analysis.json'),before=await readFile(target);
 for(const bytes of [Buffer.from('   '),Buffer.alloc(128*1024+1),Buffer.from([0xff,0xfe])]){
  await writeFile(f.file,bytes);await assert.rejects(recordAgentAnalysis({run:f.prepared.run,file:f.file}));assert.deepEqual(await readFile(target),before);
 }
 const link=path.join(f.root,'linked.md');await symlink(f.file,link);await assert.rejects(recordAgentAnalysis({run:f.prepared.run,file:link}),/regular/);
 const tampered=JSON.parse(before.toString());tampered.text='Changed findings';await writeFile(target,JSON.stringify(tampered));await assert.rejects(readAgentAnalysis(f.prepared.run,f.identity),/changed/);
 await rm(target);await symlink(f.file,target);await assert.rejects(readAgentAnalysis(f.prepared.run,f.identity),/regular/);
});

test('task findings are inspectable without intake, inferred criteria or an acceptance matrix',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'task findings-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const repo=path.join(root,'project');await mkdir(repo);
 const file=path.join(root,'findings.md');await writeFile(file,'# Test edit\n\nChanged a locator; source abc123; targeted execution not run.');
 const result=await recordAgentAnalysis({repo,taskId:'EDIT-1',file});
 assert.equal(result.scope,'task');assert.equal(result.accepted,false);assert.equal(result.executed,false);
 assert.equal(existsSync(path.join(repo,'contexts')),false);
 assert.equal(existsSync(path.join(repo,'artifacts/agent-tasks/EDIT-1/intake')),false);
 const detail=await taskDetail(repo,'EDIT-1');
 assert.equal(detail.run,null);assert.deepEqual(detail.runs,[]);
 assert.equal(detail.analysis!.binding,'task');assert.match(detail.analysis!.text,/targeted execution not run/);
 assert.equal(detail.analysis!.intakeHash,undefined);assert.deepEqual(detail.reports,{tests:[],mutations:[]});
 const summary=(await taskList(repo))[0];assert.equal(summary.status,'Findings recorded');assert.equal(summary.criteria,0);
 assert.equal((await readFile(path.join(path.dirname(result.file),'.gitignore'),'utf8')).trimEnd().split('\n').at(-1),'*');
 await writeFile(file,'Updated findings; execution still not run.');await recordAgentAnalysis({repo,taskId:'EDIT-1',file});
 assert.match((await readTaskAnalysis(repo,'EDIT-1'))!.text,/Updated findings/);
 const before=await readFile(result.file);await writeFile(file,' ');
 await assert.rejects(recordAgentAnalysis({repo,taskId:'EDIT-1',file}),/empty/);
 assert.deepEqual(await readFile(result.file),before);
 const linked=path.join(root,'linked');await symlink(path.join(repo,'artifacts/agent-tasks/EDIT-1'),linked);
 await writeFile(file,'Valid findings for the path-boundary check.');
 await assert.rejects(recordAgentAnalysis({repo:linked,taskId:'ESCAPE',file}),/real directory/);
});

test('task and intake-bound findings coexist without rebinding or approving either interpretation',async t=>{
 const f=await fixture(t);await recordAgentAnalysis({run:f.prepared.run,file:f.file});
 await writeFile(f.file,'Authoring follow-up; focused checks not run.');
 await recordAgentAnalysis({repo:f.repo,taskId:'LOGIN-123',file:f.file});
 const detail=await taskDetail(f.repo,'LOGIN-123');
 assert.equal(detail.analysis!.binding,'task');assert.match(detail.analysis!.text,/Authoring follow-up/);
 assert.equal(detail.run!.analysis!.binding,'intake');assert.match(detail.run!.analysis!.text,/assertion missing/);
 assert.equal(detail.run!.accepted,false);assert.equal(detail.run!.reviewed,false);
});
