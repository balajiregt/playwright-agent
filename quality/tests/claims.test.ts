import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {prepareClaims,validateFrozenClaims,reviewClaims,claimEvaluation,validateClaimReview} from '../src/claims.js';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
async function fixture(){
 const repo=await mkdtemp(path.join(os.tmpdir(),'claim-evidence-'));
 await mkdir(path.join(repo,'tests'));await mkdir(path.join(repo,'helpers'));
 const requirement='After a failed refresh, previous action cards must disappear.';
 await writeFile(path.join(repo,'requirements.md'),requirement);
 const spec="import {test} from '@playwright/test';\nimport {checkWorkspace} from '../helpers/workspace.js';\ntest('observes the workspace',async({page})=>{await page.goto('/');await checkWorkspace(page);});\n";
 await writeFile(path.join(repo,'tests/selected.spec.ts'),spec);
 await writeFile(path.join(repo,'helpers/workspace.ts'),"import {expect} from '@playwright/test';\nexport async function checkWorkspace(page){await expect(page.getByTestId('action-grid').getByRole('article')).toHaveCount(0);}\n");
 const input={version:1,taskId:'CLAIM-001',evidenceKind:'synthetic',artifacts:[{id:'ticket',file:'requirements.md',sha256:sha(requirement)}],cases:[{id:'C1',clause:{artifactId:'ticket',quote:requirement},claim:'The supplied test contains a reached zero-card assertion.',test:{file:'tests/selected.spec.ts',line:3,column:1,sha256:sha(spec)}}]};
 return {repo,input,spec};
}
const noNetwork:typeof fetch=async()=>{throw Error('Network must not be called');};
function nativeAnswer(p:Awaited<ReturnType<typeof prepareClaims>>){
 const c=p.cases[0],state=c.request!.state as {supporting:{ref:string;code:string}[]};
 const helper=state.supporting.find(s=>s.code.includes('toHaveCount(0)'))!;
 return {version:1,packetHash:p.hash,decisions:[{caseId:c.id,requestHash:c.requestHash,label:'supports',rationale:'The called helper contains the exact zero-card assertion.',citations:[{ref:helper.ref,quote:'toHaveCount(0)'}]}]};
}
test('claim capture reuses actual helper bodies, hides paths/reference labels and binds source snapshots',async()=>{
 const f=await fixture();try{
  const p=await prepareClaims(f.repo,f.input);validateFrozenClaims(p);assert.equal(p.cases[0].issues.length,0);
  const raw=JSON.stringify(p.cases[0].request);assert.match(raw,/toHaveCount\(0\)/);assert.ok(!raw.includes(f.repo));assert.ok(!raw.includes('workspace.ts'));assert.ok(!raw.includes('C1'));assert.ok(!raw.includes('expected_label'));
  const native=await reviewClaims(p,{provider:'agent'});assert.equal(native.cells[0].status,'awaiting_agent');assert.equal(native.cells[0].answer!.probabilities,null);
  await writeFile(path.join(f.repo,'helpers/workspace.ts'),'export async function checkWorkspace(){}');
  await assert.rejects(reviewClaims(p,{provider:'agent'}),/changed/);
 }finally{await rm(f.repo,{recursive:true,force:true});}
});
test('absent quotes, missing helpers, stale tests and dynamic setup are excluded before any inference',async()=>{
 const f=await fixture();try{
  const base=f.input.cases[0],cases=[{...base,id:'quote',clause:{...base.clause,quote:'This requirement was never present in the source.'}},{...base,id:'stale',test:{...base.test,sha256:'0'.repeat(64)}}];
  let p=await prepareClaims(f.repo,{...f.input,cases});assert.ok(p.cases.every(c=>c.request===null));
  const r=await reviewClaims(p,{provider:'agent'});assert.ok(r.cells.every(c=>c.status==='excluded'&&c.label==='needs_judgment'));
  await rm(path.join(f.repo,'helpers/workspace.ts'));p=await prepareClaims(f.repo,f.input);assert.ok(p.cases[0].issues.includes('external_or_unresolved_helper'));
  const dynamic="import {test} from '@playwright/test';\ntest('observes',async()=>{const checks={x:()=>true};checks[process.env.CHECK]();});";
  await writeFile(path.join(f.repo,'tests/selected.spec.ts'),dynamic);
  p=await prepareClaims(f.repo,{...f.input,cases:[{...base,test:{...base.test,line:2,sha256:sha(dynamic)}}]});assert.ok(p.cases[0].issues.some(x=>x.includes('dynamic')));
 }finally{await rm(f.repo,{recursive:true,force:true});}
});
test('native answers need matching hashes and real citations; excluded cases and fake provider scores cannot be imported',async()=>{
 const f=await fixture();try{
  const p=await prepareClaims(f.repo,f.input),answer=nativeAnswer(p),r=await reviewClaims(p,{provider:'agent',answers:answer});
  assert.equal(r.cells[0].status,'recorded_agent');assert.equal(r.cells[0].label,'supports');validateClaimReview(p,r);
  assert.throws(()=>validateClaimReview(p,{...r,cells:[{...r.cells[0],citations:[{ref:'test',quote:'fabricated assertion'}]}]}),/citations/);
  assert.throws(()=>validateClaimReview(p,{...r,cells:[{...r.cells[0],status:'not_run'}]}),/Non-decisions/);
  await assert.rejects(reviewClaims(p,{provider:'agent',answers:{...answer,packetHash:'0'.repeat(64)}}),/match/);
  await assert.rejects(reviewClaims(p,{provider:'agent',answers:{...answer,decisions:[{...answer.decisions[0],citations:[{ref:'helper-1',quote:'fabricated assertion'}]}]}}),/citations/);
  assert.throws(()=>validateFrozenClaims({...p,hash:'0'.repeat(64)}),/changed/);
 }finally{await rm(f.repo,{recursive:true,force:true});}
});
test('existing evaluation reports keep author reference agreement separate from independent precision and do not overwrite outputs',async()=>{
 const f=await fixture();try{
  const p=await prepareClaims(f.repo,f.input),r=await reviewClaims(p,{provider:'agent',answers:nativeAnswer(p)});
  const refs={version:1,packetHash:p.hash,reviewKind:'author_reviewed',reviewedBy:'Synthetic author reference only',labels:[{caseId:'C1',requestHash:p.cases[0].requestHash,expected:'supports',rationale:'The selected helper explicitly asserts zero cards.'}]};
  const out=path.join(f.repo,'report'),result=await claimEvaluation(p,r,out,refs);assert.equal(result.statistics.referenceMatches,1);assert.equal(result.statistics.independentPrecision,null);
  const report=JSON.parse(await readFile(path.join(out,'evaluation/evaluation.json'),'utf8'));assert.equal(report.cases[0].verdict,'pass');assert.equal(report.cases[0].providerScores.probabilities,null);
  const html=await readFile(path.join(out,'evaluation/index.html'),'utf8');assert.match(html,/Cited captured evidence/);assert.match(html,/toHaveCount\(0\)/);
  await assert.rejects(claimEvaluation(p,r,out,refs));
  const pending=await claimEvaluation(p,r,path.join(f.repo,'pending'));assert.equal(pending.statistics.referenceMatches,null);
 }finally{await rm(f.repo,{recursive:true,force:true});}
});
