#!/usr/bin/env node
// Deterministic criterion → candidate-test index for coverage assessment.
// It points the agent at where to look; it never decides coverage. The agent still
// reads each candidate's assertions. Its main job is mechanical checks a reader
// misses at scale: for "only X can …" criteria, which allowed roles are never
// exercised and which other roles are never checked for a denial.
//
//   npm run coverage:matrix -- --project examples/crm-scale \
//     --criteria examples/crm-scale/requirements/acceptance-criteria.json [--tests tests] [--json] [--flagged]
//
// Criteria JSON: {requirements|criteria:[{id, criterion}], roleAccess?:{role:[…]}} or a bare array.
// Roles come from roleAccess keys or --roles admin,manager,…
import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const STOP=new Set('the and that this with from have has are can cannot for not only their them they when which shows show user users other each into than then must also does without within after before while being been were will would should could role roles page sees see'.split(' '));
const NEGATIVE=/toBe\(\s*40[13]\s*\)|status\(\)\)\.toBe\(40[13]|toBeHidden|not\.toBeVisible|toHaveCount\(\s*0\s*\)|toBeDisabled|not\.toBeEnabled|PermissionDenied|Forbidden|AccessDenied|Unauthori[sz]ed|NotAllowed/i;

export function words(text) {
  return String(text).replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().split(/[^a-z0-9]+/)
    .filter(w=>w.length>=4&&!STOP.has(w)).map(w=>w.replace(/(ies)$/,'y').replace(/(?<=[a-z]{3})(es|s)$/,''));
}

function matchClose(text,open) {
  // Index of the bracket closing text[open]; skips quoted strings and comments roughly.
  const pairs={'{':'}','(':')'},close=pairs[text[open]];let depth=0,quote=null;
  for(let i=open;i<text.length;i++) {
    const c=text[i];
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote=null;continue;}
    if(c==='/'&&text[i+1]==='/'){i=text.indexOf('\n',i);if(i<0)return text.length;continue;}
    if(c==='\''||c==='"'||c==='`'){quote=c;continue;}
    if(c===text[open])depth++;
    else if(c===close&&--depth===0)return i;
  }
  return text.length;
}

export function parseSpec(text,file,roles) {
  const loops=[];
  for(const m of text.matchAll(/for\s*\(\s*const\s+(.+?)\s+of\s+([\w.[\]'", ]+?)\s*\)\s*\{/g)) {
    const start=m.index+m[0].length-1;loops.push({binding:m[1],source:m[2],start,end:matchClose(text,start)});
  }
  const tests=[];
  for(const m of text.matchAll(/\btest(?:\.only|\.fixme)?\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,/g)) {
    const open=text.indexOf('(',m.index),end=matchClose(text,open),body=text.slice(m.index,end);
    const line=text.slice(0,m.index).split('\n').length;
    const found=new Set();
    for(const r of roles)if(new RegExp(`['"\`]${r}['"\`]`).test(body))found.add(r);
    for(const loop of loops.filter(l=>l.start<m.index&&m.index<l.end&&/role/i.test(l.binding))) {
      const literal=roles.filter(r=>new RegExp(`['"]${r}['"]`).test(loop.source));
      (literal.length?literal:roles).forEach(r=>found.add(r));  // an imported ROLES list covers every role
    }
    const urls=[...body.matchAll(/['"`](\/[a-z][\w/-]*)/g)].map(u=>u[1]);
    tests.push({file,line,title:m[2],roles:[...found],negative:NEGATIVE.test(body),
      terms:new Set(words(`${m[2]} ${path.basename(file,'.spec.ts')} ${urls.join(' ')} ${[...body.matchAll(/\.(\w+)\(/g)].map(c=>c[1]).join(' ')}`))});
  }
  return tests;
}

export function restriction(criterion,roles) {
  const text=criterion.toLowerCase();
  const only=text.match(/\bonly\s+((?:[a-z]+(?:,\s*|\s+and\s+|\s+or\s+))*[a-z]+)/);
  if(only){const allowed=roles.filter(r=>new RegExp(`\\b${r}s?\\b`).test(only[1]));if(allowed.length)return {allowed,denied:roles.filter(r=>!allowed.includes(r))};}
  const cannot=roles.filter(r=>new RegExp(`(^|[.;,:]\\s*|\\band\\s+)${r}s?(\\s+users?)?\\s+(cannot|can't|can not|may not|must not)\\b`).test(text));
  if(cannot.length)return {allowed:[],denied:cannot};
  return null;
}

export function buildMatrix(criteria,tests,roles,{top=3,minScore=2}={}) {
  const df=new Map();
  for(const t of tests)for(const w of t.terms)df.set(w,(df.get(w)??0)+1);
  const idf=w=>Math.log((tests.length+1)/((df.get(w)??0)+1));
  return criteria.map(c=>{
    const cw=new Set(words(`${c.criterion} ${c.id.replace(/-/g,' ')}`)),rule=restriction(c.criterion,roles);
    const scored=tests.map(t=>{let s=0;for(const w of cw)if(t.terms.has(w))s+=idf(w);if(rule&&t.negative)s*=1.25;return {t,s};})
      .filter(x=>x.s>=minScore).sort((a,b)=>b.s-a.s).slice(0,top);
    const candidates=scored.map(({t})=>({ref:`${t.file}:${t.line}`,title:t.title,roles:t.roles,negative:t.negative}));
    const flags=[];
    if(!candidates.length)flags.push('no candidate test found');
    if(rule) {
      const asRole=(r,neg)=>scored.some(({t})=>t.roles.includes(r)&&t.negative===neg);
      const unexercised=rule.allowed.filter(r=>!asRole(r,false)),unchecked=rule.denied.filter(r=>!asRole(r,true));
      if(unexercised.length)flags.push(`allowed role never exercised: ${unexercised.join(', ')}`);
      if(unchecked.length)flags.push(`denial never checked for: ${unchecked.join(', ')}`);
    }
    return {id:c.id,candidates,rule,flags};
  });
}

export function toMarkdown(rows,{flaggedOnly=false}={}) {
  // Compact on purpose: it is read into agent context. Titles only where a flag needs them.
  const ref=(x,title)=>`${x.ref}${title?` "${x.title.slice(0,50)}"`:''} ${x.roles.join('+')||'-'}${x.negative?'✗':''}`;
  const flaggedRows=rows.filter(r=>r.flags.length);
  const out=['# Coverage index: pointers, not proof. Read each candidate assertion.','file:line roles (✗ = asserts a denial)',''];
  if(flaggedRows.length)out.push('## Flagged leads',...flaggedRows.map(r=>`- ${r.id}: ${r.flags.join('; ')}\n  ${r.candidates.map(x=>ref(x,true)).join('\n  ')}`),'');
  if(!flaggedOnly)out.push('## All criteria',...rows.map(r=>`${r.id}: ${r.candidates.map(x=>ref(x,false)).join(', ')||'—'}`),'');
  out.push(`${rows.length} criteria; ${flaggedRows.length} flagged. Flags are leads to verify, not verdicts.`);
  return out.join('\n')+'\n';
}

function specFiles(dir) {
  return readdirSync(dir).flatMap(n=>{const p=path.join(dir,n);return statSync(p).isDirectory()?specFiles(p):/\.(spec|test)\.[cm]?[jt]s$/.test(n)?[p]:[];});
}

export function main(argv) {
  const opt={tests:'tests'};
  for(let i=0;i<argv.length;i++){const a=argv[i];if(a==='--json'||a==='--flagged')opt[a.slice(2)]=true;else if(a.startsWith('--'))opt[a.slice(2)]=argv[++i];else throw Error(`Unknown argument ${a}`);}
  if(!opt.project||!opt.criteria)throw Error('Usage: coverage-matrix --project <dir> --criteria <json> [--tests tests] [--roles a,b] [--json] [--flagged] [--out file]');
  const data=JSON.parse(readFileSync(opt.criteria,'utf8')),criteria=Array.isArray(data)?data:data.requirements??data.criteria;
  if(!Array.isArray(criteria))throw Error('Criteria JSON needs a requirements or criteria array of {id, criterion}');
  const roles=opt.roles?opt.roles.split(','):Object.keys(data.roleAccess??{});
  const testDir=path.join(opt.project,opt.tests);
  const tests=specFiles(testDir).flatMap(f=>parseSpec(readFileSync(f,'utf8'),path.relative(testDir,f),roles));
  const rows=buildMatrix(criteria,tests,roles);
  const text=opt.json?JSON.stringify({roles,tests:tests.length,rows},null,1)+'\n':toMarkdown(rows,{flaggedOnly:opt.flagged});
  if(opt.out)writeFileSync(opt.out,text);else process.stdout.write(text);
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try{main(process.argv.slice(2));}catch(error){console.error(error.message);process.exitCode=1;}
}
