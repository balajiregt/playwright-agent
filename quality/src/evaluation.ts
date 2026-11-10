import {lstat,readFile,realpath,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {createHash} from 'node:crypto';
import {digest} from './context.js';
import {insideRepo} from './team/config.js';

export const capabilities=['acceptance_assessment','test_matrix','test_authoring','mutation_verification','skill_routing'] as const;
const text=z.string().trim().min(1).max(2000),id=z.string().regex(/^[\w-]{1,80}$/);
const scalar=z.union([z.string().max(4000),z.number().finite(),z.boolean(),z.null()]);
const value=z.union([scalar,z.array(scalar).max(100)]);
const reference=z.object({evidenceId:id,pointer:z.string().max(500).refine(p=>p===''||p.startsWith('/'),'Use a JSON Pointer')}).strict();
const relative=z.string().min(1).max(400).refine(p=>!path.isAbsolute(p)&&!p.split(/[\\/]/).some(s=>s==='..'||s.startsWith('.')),'Use an explicit relative non-hidden evidence path');
export const evaluationSchema=z.object({
 version:z.literal(1),taskId:id,title:text,evidenceKind:z.enum(['recorded','synthetic']),
 scope:text,
 evidence:z.array(z.object({id,file:relative,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()).max(100),
 cases:z.array(z.object({
  id,capability:z.enum(capabilities),dimension:text,request:text,expectedOutcome:text,observedSummary:z.string().max(16000).optional(),
  execution:z.enum(['recorded','not_run','inconclusive']),
  reference:z.object({status:z.enum(['protocol','reviewed','pending_review']),reviewedBy:text.optional(),evidenceIds:z.array(id).max(20)}).strict(),
  checks:z.array(z.object({id,rule:text,operator:z.enum(['equal','at_least','at_most','contains']).default('equal'),expected:value,observed:reference.optional()}).strict()).min(1).max(50),
  provider:z.object({name:z.enum(['agent','jev','other']),observation:reference}).strict().optional(),
 }).strict()).min(1).max(100),
}).strict().superRefine((v,ctx)=>{
 const issue=(message:string)=>ctx.addIssue({code:'custom',message});
 if(new Set(v.evidence.map(e=>e.id)).size!==v.evidence.length||new Set(v.cases.map(c=>c.id)).size!==v.cases.length)issue('Duplicate evidence or case ID');
 for(const c of v.cases){
  if(new Set(c.checks.map(x=>x.id)).size!==c.checks.length)issue('Duplicate check ID');
  if(c.reference.status!=='pending_review'&&(!c.reference.reviewedBy||!c.reference.evidenceIds.length))issue('Scoring needs a named rubric/reviewer and cited reference evidence');
  const refs=[...c.reference.evidenceIds,...c.checks.flatMap(x=>x.observed?[x.observed.evidenceId]:[]),...(c.provider?[c.provider.observation.evidenceId]:[])];
  if(refs.some(id=>!v.evidence.some(e=>e.id===id)))issue('Unknown evidence ID');
  for(const check of c.checks){
   if(['at_least','at_most'].includes(check.operator)&&typeof check.expected!=='number')issue('Numeric rules need a numeric expected value');
   if(check.operator==='contains'&&typeof check.expected!=='string')issue('Contains rules need expected text');
  }
 }
});
export type EvaluationInput=z.infer<typeof evaluationSchema>;
type Value=z.infer<typeof value>;
type Ref=z.infer<typeof reference>;
type Verdict='pass'|'fail'|'needs_review'|'not_assessed';
interface Evidence {id:string;file:string;expectedHash:string;actualHash:string|null;status:'available'|'stale'|'unavailable';issue?:string}
interface CheckResult {id:string;rule:string;operator:string;expected:Value;observed:Value|undefined;source?:Ref;points:0|1|null;possible:1;reason:string}
interface CaseResult extends Omit<EvaluationInput['cases'][number],'checks'|'provider'>{
 checks:CheckResult[];verdict:Verdict;score:{earned:number|null;scored:number;expected:number;unscored:number};reason:string;
 providerScores:Record<string,unknown>|null;providerIssue?:string;
}
export interface EvaluationReport {version:1;kind:'playwright-functional-evaluation';rubricVersion:'functional-evidence-v1';taskId:string;title:string;scope:string;evidenceKind:'recorded'|'synthetic';generatedAt:string;inputHash:string;evidence:Evidence[];cases:CaseResult[];capabilities:{capability:typeof capabilities[number];cases:number;pass:number;fail:number;needsReview:number;notAssessed:number}[];limitations:string[]}
const esc=(v:unknown)=>String(v??'Not available').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const display=(v:unknown)=>v===undefined?'Not recorded':JSON.stringify(v);
const displayVerdict=(v:string)=>v.replaceAll('_',' ');
const markdown=(v:unknown)=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('|','&#124;').replace(/\r?\n/g,'<br>');

export function jsonPointer(input:unknown,pointer:string):unknown{
 let v=input;
 if(!pointer)return v;
 for(const raw of pointer.slice(1).split('/')){
  if(/~(?![01])/g.test(raw))throw Error('Invalid JSON Pointer escape');
  const key=raw.replaceAll('~1','/').replaceAll('~0','~');
  if(Array.isArray(v)&&!/^(0|[1-9]\d*)$/.test(key))throw Error('Use an explicit JSON array index');
  if(v===null||typeof v!=='object'||!Object.hasOwn(v,key))throw Error('Observation is absent at the cited JSON Pointer');
  v=(v as Record<string,unknown>)[key];
 }
 return v;
}
async function regular(file:string,max=5*1024*1024){
 const info=await lstat(file);if(!info.isFile()||info.isSymbolicLink()||info.size>max)throw Error('Select a bounded regular evidence file');
 const bytes=await readFile(file);if(bytes.length>max)throw Error('Evidence file exceeds size limit');return bytes;
}
export async function readEvaluationInput(file:string){return evaluationSchema.parse(JSON.parse((await regular(path.resolve(file),1024*1024)).toString('utf8')));}
function compare(actual:Value,expected:Value,op:string):boolean|null{
 if(op==='equal')return JSON.stringify(actual)===JSON.stringify(expected);
 if(op==='contains')return typeof actual==='string'&&typeof expected==='string'?actual.includes(expected):null;
 if(typeof actual!=='number'||typeof expected!=='number')return null;
 return op==='at_least'?actual>=expected:actual<=expected;
}
/** Scores saved observable facts only. It does not invoke agents, providers or tests. */
export async function evaluate(input:unknown,repo:string):Promise<EvaluationReport>{
 const spec=evaluationSchema.parse(input),root=await realpath(repo),data=new Map<string,unknown>(),evidence:Evidence[]=[];
 for(const e of spec.evidence){
  const record:Evidence={id:e.id,file:e.file,expectedHash:e.sha256,actualHash:null,status:'unavailable'};
  try{
   const file=await insideRepo(root,e.file);
   if(path.relative(root,file).split(path.sep).some(p=>p.startsWith('.'))||!['.json','.md','.txt','.ts','.js','.mjs','.cjs','.yml','.yaml','.csv','.toml'].includes(path.extname(file)))throw Error('Unsupported evidence file');
   const bytes=await regular(file);
   record.actualHash=createHash('sha256').update(bytes).digest('hex');
   if(record.actualHash!==e.sha256){record.status='stale';record.issue='Evidence bytes changed after the manifest was prepared';}
   else {record.status='available';if(path.extname(e.file)==='.json')data.set(e.id,JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));}
  }catch{record.status='unavailable';record.issue='Evidence is missing, invalid, nonregular, oversized or outside the selected repository';}
  evidence.push(record);
 }
 const read=(ref:Ref)=>{
  if(evidence.find(e=>e.id===ref.evidenceId)?.status!=='available'||!data.has(ref.evidenceId))throw Error('Cited JSON evidence is unavailable or stale');
  return jsonPointer(data.get(ref.evidenceId),ref.pointer);
 };
 const cases:CaseResult[]=spec.cases.map(c=>{
  const missingReference=c.reference.evidenceIds.some(id=>evidence.find(e=>e.id===id)?.status!=='available');
  const checks:CheckResult[]=c.checks.map(check=>{
   let observed:Value|undefined,problem:string|undefined;
   if(check.observed)try{observed=value.parse(read(check.observed));}catch{problem='The cited observation is missing, stale, invalid or is not a supported scalar/list';}
   let points:0|1|null=null,reason:string;
   if(c.execution==='not_run')reason='The case was not executed; no score assigned';
   else if(c.execution==='inconclusive')reason='Execution is inconclusive; no score assigned';
   else if(c.reference.status==='pending_review')reason='Expected outcome has no reviewed reference yet; no correctness score assigned';
   else if(missingReference)reason='Rubric/reference evidence is unavailable or stale; no score assigned';
   else if(!check.observed||observed===undefined||problem)reason=problem??'No observed evidence was supplied';
   else {
    const match=compare(observed,check.expected,check.operator);
    if(match===null)reason='Observation type does not support the selected rule; no score assigned';
    else {points=match?1:0;reason=match?'Observed value satisfies the declared rule':'Observed value does not satisfy the declared rule';}
   }
   return {...check,observed,source:check.observed,points,possible:1,reason};
  });
  const scored=checks.filter(x=>x.points!==null),earned=scored.reduce((n,x)=>n+x.points!,0);
  const verdict:Verdict=c.execution==='not_run'?'not_assessed':scored.some(x=>x.points===0)?'fail':scored.length===checks.length?'pass':'needs_review';
  const reason=verdict==='not_assessed'?'No recorded execution for this capability case':verdict==='needs_review'?'Missing execution, reviewed expectations or valid evidence prevents a complete verdict':verdict==='fail'?'At least one scored check fails; inspect every check and any unscored items':c.reference.status==='protocol'?'All declared protocol checks pass; this does not establish semantic correctness or product acceptance':'All checks match the recorded reviewed reference; reviewer identity and reference quality are not authenticated by this report';
  let providerScores:Record<string,unknown>|null=null,providerIssue:string|undefined;
  if(c.provider)try{
   const p=z.object({model:z.string().max(200).nullable().optional(),label:z.string().max(120).optional(),rationale:z.string().max(4000).nullable().optional(),probabilities:z.record(z.string().max(120),z.number().finite().min(0).max(1)).nullable().optional(),confidence:z.number().finite().min(0).max(1).nullable().optional(),inputTokens:z.number().int().nonnegative().optional(),outputTokens:z.number().int().nonnegative().optional(),costUsd:z.number().finite().nonnegative().nullable().optional(),requestHash:z.string().regex(/^[a-f0-9]{64}$/).optional()}).parse(read(c.provider.observation));
   providerScores={name:c.provider.name,source:c.provider.observation,origin:c.provider.name==='agent'?'host-recorded; unavailable numerical scores remain null':'provider-reported; not calibrated or independently graded',model:p.model??null,label:p.label??null,rationale:p.rationale??null,probabilities:p.probabilities??null,confidence:p.confidence??null,inputTokens:p.inputTokens??null,outputTokens:p.outputTokens??null,costUsd:p.costUsd??null,requestHash:p.requestHash??null};
  }catch{providerIssue='Provider metadata is unavailable, stale or invalid; no numerical scores were invented';}
  return {...c,checks,verdict,score:{earned:scored.length?earned:null,scored:scored.length,expected:checks.length,unscored:checks.length-scored.length},reason,providerScores,providerIssue};
 });
 return {version:1,kind:'playwright-functional-evaluation',rubricVersion:'functional-evidence-v1',taskId:spec.taskId,title:spec.title,scope:spec.scope,evidenceKind:spec.evidenceKind,generatedAt:new Date().toISOString(),inputHash:digest(JSON.stringify(spec)),evidence,cases,
  capabilities:capabilities.map(capability=>{const cs=cases.filter(c=>c.capability===capability);return {capability,cases:cs.length,pass:cs.filter(c=>c.verdict==='pass').length,fail:cs.filter(c=>c.verdict==='fail').length,needsReview:cs.filter(c=>c.verdict==='needs_review').length,notAssessed:cs.filter(c=>c.verdict==='not_assessed').length};}),
  limitations:['Scores are binary matches to declared rules: 1 for a satisfied check, 0 for a mismatch; unavailable/unreviewed checks are unscored, never zero or a fabricated probability.','Protocol checks measure recorded workflow facts. They do not establish acceptance-criterion correctness, assertion adequacy or application acceptance.','Reference quality and reviewer identity are recorded declarations, not authenticated independent review. Model agreement is not a correctness reference.','Evidence hashes bind saved bytes, not an authenticated test execution or automatic freshness of the current application. Inspect source/test revisions and provenance.','Model probabilities/confidence are provider outputs, uncalibrated for this task, and never used to set points or verdicts.','No overall weighted score, leaderboard, hosted call, test run, mutation, publication or deployment is produced by this report.']};
}
export function renderEvaluationMarkdown(r:EvaluationReport){
 const lines=[`# ${markdown(r.title)}`,'',`Evidence: **${r.evidenceKind}** · rubric ${r.rubricVersion} · task ${r.taskId}`,'',markdown(r.scope),'',
  '| Case / capability | Verdict | Matched / scored | Checks expected | Unscored |','| --- | --- | --- | --- | --- |',
  ...r.cases.map(c=>`| ${markdown(c.id)} / ${c.capability} | ${displayVerdict(c.verdict)} | ${c.score.scored?c.score.earned+'/'+c.score.scored:'Unscored'} | ${c.score.expected} | ${c.score.unscored} |`)];
 for(const c of r.cases)lines.push('',`## ${markdown(c.id)} · ${markdown(c.dimension)}`,'',`Request: ${markdown(c.request)}`,'',`Expected: ${markdown(c.expectedOutcome)}`,'',`Reference: ${c.reference.status}; ${markdown(c.reference.reviewedBy??'not reviewed')}`,'',markdown(c.reason),'',...(c.observedSummary?['Recorded result: '+markdown(c.observedSummary),'']:[]),
  '| Check / rule | Expected | Observed | Points | Evidence | Reason |','| --- | --- | --- | --- | --- | --- |',
  ...c.checks.map(x=>`| ${markdown(x.id+': '+x.rule+' ['+x.operator+']')} | ${markdown(display(x.expected))} | ${markdown(display(x.observed))} | ${x.points===null?'Unscored':x.points+'/1'} | ${markdown(x.source?x.source.evidenceId+'#'+x.source.pointer:'Not recorded')} | ${markdown(x.reason)} |`),
  '', 'Provider scores (separate from evaluation points):', '', markdown(c.providerScores?JSON.stringify(c.providerScores):c.providerIssue??'Not recorded'));
 lines.push('','## Evidence manifest','','| ID | Relative file | Status | Expected hash | Actual hash |','| --- | --- | --- | --- | --- |',...r.evidence.map(e=>`| ${markdown(e.id)} | ${markdown(e.file)} | ${e.status} | ${e.expectedHash} | ${e.actualHash??'Unavailable'} |`),'','## Reading the scores','',...r.limitations.map(s=>'- '+s));
 return lines.join('\n')+'\n';
}
export function renderEvaluationHtml(r:EvaluationReport){
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${esc(r.title)}</title><style>body{font:16px/1.6 system-ui;color:#243548;background:#f5f7fb;max-width:1200px;margin:auto;padding:24px}header,article,section{background:#fff;border:1px solid #dce3eb;border-radius:12px;padding:24px;margin:18px 0}h1,h2{line-height:1.25}small{color:#526479}.table{overflow:auto}table{border-collapse:collapse;width:100%}th,td{padding:12px;border-bottom:1px solid #dce3eb;text-align:left;vertical-align:top}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}summary{cursor:pointer}.pass{color:#176b49}.fail{color:#aa3423}.needs_review{color:#875400}.notice{border-left:4px solid #c08725;padding-left:14px}a{color:#355cb1}</style><header><small>PLAYWRIGHT AGENT · FUNCTIONAL EVALUATION · ${esc(r.evidenceKind.toUpperCase())}</small><h1>${esc(r.title)}</h1><p>${esc(r.scope)}</p><p class="notice">Each score shows its rule and source. Unreviewed or missing evidence stays unscored. Provider probabilities do not decide correctness.</p><small>${esc(r.taskId)} · ${esc(r.rubricVersion)} · ${esc(r.generatedAt)}</small></header>
 <section><h2>Evaluation cases</h2><div class="table"><table><thead><tr><th>Case / capability</th><th>Verdict</th><th>Matched / scored</th><th>Expected / unscored</th></tr></thead><tbody>${r.cases.map(c=>`<tr><td><a href="#${esc(c.id)}">${esc(c.id)}</a><br>${esc(c.capability)}<br>${esc(c.dimension)}</td><td class="${c.verdict}">${esc(displayVerdict(c.verdict))}</td><td>${c.score.scored?c.score.earned+'/'+c.score.scored:'Unscored'}</td><td>${c.score.expected} expected · ${c.score.unscored} unscored</td></tr>`).join('')}</tbody></table></div></section>
 ${r.cases.map(c=>`<article id="${esc(c.id)}"><h2>${esc(c.id)} · ${esc(c.dimension)}</h2><p><b>Request:</b> ${esc(c.request)}</p><p><b>Expected outcome:</b> ${esc(c.expectedOutcome)}</p><p><b>Reference:</b> ${esc(c.reference.status)} · ${esc(c.reference.reviewedBy??'not reviewed')} · ${esc(c.reference.evidenceIds.join(', '))}</p>${c.observedSummary?`<p><b>Recorded result:</b></p><pre>${esc(c.observedSummary)}</pre>`:''}<p class="${c.verdict}"><b>${esc(displayVerdict(c.verdict))}:</b> ${esc(c.reason)}</p><div class="table"><table><thead><tr><th>Check / rule</th><th>Expected</th><th>Observed</th><th>Points</th><th>Evidence and reason</th></tr></thead><tbody>${c.checks.map(x=>`<tr><td>${esc(x.id)}<br>${esc(x.rule)}<br><small>${esc(x.operator)}</small></td><td><pre>${esc(display(x.expected))}</pre></td><td><pre>${esc(display(x.observed))}</pre></td><td>${x.points===null?'Unscored':x.points+'/1'}</td><td>${esc(x.source?x.source.evidenceId+'#'+x.source.pointer:'No observation')}<br>${esc(x.reason)}</td></tr>`).join('')}</tbody></table></div><details><summary>Provider scores and provenance · separate from evaluation points</summary><pre>${esc(c.providerScores?JSON.stringify(c.providerScores,null,2):c.providerIssue??'No numerical model scores recorded')}</pre></details></article>`).join('')}
 <section><h2>Evidence manifest</h2>${r.evidence.map(e=>`<details><summary>${esc(e.id)} · ${esc(e.status)} · ${esc(e.file)}</summary><pre>Expected SHA-256: ${esc(e.expectedHash)}\nActual: ${esc(e.actualHash??'Unavailable')}\n${esc(e.issue??'Hash matched selected evidence')}</pre></details>`).join('')}</section><section><h2>Reading the scores</h2><ul>${r.limitations.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><small>Input manifest hash: ${esc(r.inputHash)}</small></section></html>`;
}
export async function writeEvaluation(r:EvaluationReport,out:string){
 await mkdir(path.dirname(out),{recursive:true});
 await mkdir(out); // Keep each run separate; never overwrite an existing report/evidence directory.
 await writeFile(path.join(out,'evaluation.json'),JSON.stringify(r,null,2)+'\n',{mode:0o600});
 await writeFile(path.join(out,'evaluation.md'),renderEvaluationMarkdown(r),{mode:0o600});
 await writeFile(path.join(out,'index.html'),renderEvaluationHtml(r),{mode:0o600});
 return {json:path.join(out,'evaluation.json'),markdown:path.join(out,'evaluation.md'),html:path.join(out,'index.html')};
}
