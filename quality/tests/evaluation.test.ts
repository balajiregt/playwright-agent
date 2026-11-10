import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,symlink,mkdir,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {evaluate,jsonPointer,renderEvaluationHtml,renderEvaluationMarkdown,writeEvaluation} from '../src/evaluation.js';
const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
async function fixture(){
 const repo=await mkdtemp(path.join(os.tmpdir(),'functional-eval-'));
 const content=JSON.stringify({reached:true,label:'covered',failed:false,probabilities:{covered:.99,partial:.01},confidence:.99,model:'fixture-model'});
 await writeFile(path.join(repo,'result.json'),content);await writeFile(path.join(repo,'rubric.md'),'The check must reach the acceptance assertion.');
 const evidence=[{id:'result',file:'result.json',sha256:sha(content)},{id:'rubric',file:'rubric.md',sha256:sha('The check must reach the acceptance assertion.')}];
 const c={id:'case',capability:'acceptance_assessment',dimension:'Assertion sensitivity',request:'Assess the selected criterion.',expectedOutcome:'The assertion must be reached.',execution:'recorded',reference:{status:'reviewed',reviewedBy:'fixture reviewer; synthetic declaration',evidenceIds:['rubric']},checks:[{id:'reached',rule:'A real assertion is reached.',operator:'equal',expected:true,observed:{evidenceId:'result',pointer:'/reached'}}]};
 return {repo,evidence,c,input:{version:1,taskId:'SYNTHETIC-EVAL',title:'Synthetic evaluation',scope:'Fictional unit-test facts.',evidenceKind:'synthetic',evidence,cases:[c]}};
}
test('reviewed references produce evidence-bound binary scores, while pending, missing and unrun cases cannot pass',async()=>{
 const f=await fixture();try{
  const cases=[f.c,{...f.c,id:'pending',reference:{...f.c.reference,status:'pending_review'}},{...f.c,id:'unrun',execution:'not_run'},{...f.c,id:'missing',checks:[{...f.c.checks[0],observed:{evidenceId:'result',pointer:'/absent'}}]},{...f.c,id:'failure',checks:[{...f.c.checks[0],expected:false}]}];
  const r=await evaluate({...f.input,cases},f.repo);
  assert.deepEqual(r.cases.map(c=>c.verdict),['pass','needs_review','not_assessed','needs_review','fail']);
  assert.deepEqual(r.cases.map(c=>c.score.earned),[1,null,null,null,0]);
  assert.equal(r.cases[1].score.unscored,1);assert.equal(r.cases[4].checks[0].points,0);
  assert.equal(r.capabilities[0].pass,1);assert.equal(r.evidence[0].actualHash,f.evidence[0].sha256);
 }finally{await rm(f.repo,{recursive:true,force:true});}
});
test('high model probabilities cannot override an observed mismatch; absent host scores stay null',async()=>{
 const f=await fixture();try{
  const r=await evaluate({...f.input,cases:[{...f.c,checks:[{...f.c.checks[0],expected:false}],provider:{name:'jev',observation:{evidenceId:'result',pointer:''}}},{...f.c,id:'native',provider:{name:'agent',observation:{evidenceId:'result',pointer:'/label'}}}]},f.repo);
  assert.equal(r.cases[0].verdict,'fail');assert.equal(r.cases[0].providerScores!.confidence,.99);
  assert.equal(r.cases[1].providerScores,null);assert.match(r.cases[1].providerIssue!,/no numerical scores were invented/);
  assert.equal(jsonPointer({'a/b':{'~x':false}},'/a~1b/~0x'),false);
  assert.throws(()=>jsonPointer({},'/toString'),/absent/);
  assert.throws(()=>jsonPointer([true],'/length'),/array index/);
  assert.equal(jsonPointer([true],'/0'),true);
 }finally{await rm(f.repo,{recursive:true,force:true});}
});
test('changed, missing, malformed and escaped evidence stays unscored and cannot expose hidden files',async()=>{
 const f=await fixture();try{
  await writeFile(path.join(f.repo,'result.json'),'{"reached":true,"changed":true}');
  const stale=await evaluate(f.input,f.repo);assert.equal(stale.evidence[0].status,'stale');assert.equal(stale.cases[0].verdict,'needs_review');
  await assert.rejects(evaluate({...f.input,evidence:[{...f.evidence[0],file:'../outside.json'},f.evidence[1]]},f.repo));
  await mkdir(path.join(f.repo,'.private'));await writeFile(path.join(f.repo,'.private/secret.json'),'{}');
  await symlink(path.join(f.repo,'.private/secret.json'),path.join(f.repo,'alias.json'));
  const hidden=await evaluate({...f.input,evidence:[{...f.evidence[0],file:'alias.json',sha256:sha('{}')},f.evidence[1]]},f.repo);
  assert.equal(hidden.evidence[0].status,'unavailable');assert.equal(hidden.cases[0].checks[0].points,null);
  await writeFile(path.join(f.repo,'broken.json'),'not JSON');
  const broken=await evaluate({...f.input,evidence:[{...f.evidence[0],file:'broken.json',sha256:sha('not JSON')},f.evidence[1]]},f.repo);
  assert.equal(broken.evidence[0].status,'unavailable');
 }finally{await rm(f.repo,{recursive:true,force:true});}
});
test('standalone and Markdown reports expose rule/evidence/denominators and escape untrusted text; existing output is preserved',async()=>{
 const f=await fixture();try{
  const r=await evaluate({...f.input,title:'<script>alert(1)</script>',cases:[{...f.c,request:'<img src=x onerror=alert(1)>',observedSummary:'<script>untrusted recorded reason</script>',reference:{...f.c.reference,status:'pending_review'}}]},f.repo);
  const html=renderEvaluationHtml(r),md=renderEvaluationMarkdown(r);
  assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.match(html,/Unscored/);assert.match(html,/1 expected/);
  assert.match(html,/Recorded result/);assert.match(md,/untrusted recorded reason/);
  assert.match(md,/Unscored/);assert.match(md,/result#\/reached/);assert.match(md,/pending_review/);
  const out=path.join(f.repo,'artifacts/report');const files=await writeEvaluation(r,out);const before=await readFile(files.html,'utf8');
  await assert.rejects(writeEvaluation(r,out));assert.equal(await readFile(files.html,'utf8'),before);
 }finally{await rm(f.repo,{recursive:true,force:true});}
});
