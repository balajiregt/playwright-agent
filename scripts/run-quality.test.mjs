import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {qualityInvocation,qualityRoot} from './run-quality.mjs';

test('root mutation entry point resolves caller-relative configuration outside the product',()=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'agent-entry with spaces-'));
  try {
    mkdirSync(path.join(dir,'app'));mkdirSync(path.join(dir,'requirements'));
    writeFileSync(path.join(dir,'app/app.js'),'const count=3;');
    writeFileSync(path.join(dir,'requirements/epic.md'),'The count must equal three.');
    writeFileSync(path.join(dir,'task.json'),JSON.stringify({version:1,repo:'app',artifactDir:'requirements',output:'reports',sourceFiles:['app.js']}));
    const result=spawnSync(process.execPath,[fileURLToPath(new URL('./run-quality.mjs',import.meta.url)),'mutation','context','--config','task.json'],{cwd:dir,encoding:'utf8',timeout:20000});
    assert.equal(result.status,0,result.stderr);
    const data=JSON.parse(result.stdout);
    assert.deepEqual(data.sourceFiles,['app.js']);assert.equal(data.artifacts.length,1);assert.match(data.contextHash,/^[a-f0-9]{64}$/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('unknown entry points cannot select arbitrary executable files',()=>{
  assert.throws(()=>qualityInvocation('../arbitrary-script'),/Unknown quality command/);
});
test('functional evaluation report works from an external caller without providers or test execution',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'evaluation entry-'));
 try{
  const manifest={version:1,taskId:'EVAL-001',title:'Unrun evaluation',scope:'No execution is claimed.',evidenceKind:'synthetic',evidence:[],cases:[{id:'routing',capability:'skill_routing',dimension:'Requested skill selection',request:'Create tests only.',expectedOutcome:'Authoring skill selected without mutation.',execution:'not_run',reference:{status:'pending_review',evidenceIds:[]},checks:[{id:'skill',rule:'Only the requested skill is selected.',expected:'playwright-test-authoring'}]}]};
  writeFileSync(path.join(dir,'input.json'),JSON.stringify(manifest));
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./run-quality.mjs',import.meta.url)),'eval','report','--repo','.','--input','input.json','--out','artifacts/report'],{cwd:dir,encoding:'utf8',timeout:20000});
  assert.equal(result.status,0,result.stderr);const data=JSON.parse(result.stdout);
  assert.equal(data.executed,false);assert.equal(data.published,false);assert.equal(data.capabilities.at(-1).notAssessed,1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('claim assessment prepares external source and hands off to native without running Playwright',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'claim cli entry-'));
 try{
  const requirement='The result count must equal zero.';
  const code="import {test,expect} from '@playwright/test';\ntest('observes',async({page})=>{await expect(page.getByTestId('count')).toHaveText('0');});\n";
  const sha=s=>createHash('sha256').update(s).digest('hex');
  writeFileSync(path.join(dir,'requirements.md'),requirement);writeFileSync(path.join(dir,'selected.spec.ts'),code);
  writeFileSync(path.join(dir,'claims.json'),JSON.stringify({version:1,taskId:'CLAIM-CLI',evidenceKind:'synthetic',artifacts:[{id:'ticket',file:'requirements.md',sha256:sha(requirement)}],cases:[{id:'C1',clause:{artifactId:'ticket',quote:requirement},claim:'The count is asserted to be zero.',test:{file:'selected.spec.ts',line:2,column:1,sha256:sha(code)}}]}));
  const entry=fileURLToPath(new URL('./run-quality.mjs',import.meta.url));
  let r=spawnSync(process.execPath,[entry,'claims','prepare','--repo','.','--input','claims.json','--out','prepared'],{cwd:dir,encoding:'utf8',timeout:20000});
  assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).eligible,1);
  r=spawnSync(process.execPath,[entry,'claims','run','--packet','prepared/packet.json','--out','handoff'],{cwd:dir,encoding:'utf8',timeout:20000});
  assert.equal(r.status,0,r.stderr);const data=JSON.parse(r.stdout);assert.equal(data.cells[0].status,'awaiting_agent');assert.equal(data.testExecution,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
