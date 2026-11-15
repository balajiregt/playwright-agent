import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareClaims,readClaimsJson,validateFrozenClaims,assertClaimsFresh,reviewClaims,claimEvaluation} from './claims.js';
const help=`Selected-test assertion evidence checks
  claims prepare --repo PROJECT --input claims.json --out NEW_DIRECTORY
  claims run --packet packet.json --out NEW_DIRECTORY [--answers native-answers.json]
  claims report --packet packet.json --review review.json --out NEW_DIRECTORY
    [--references reviewed-labels.json]

Prepare reuses the existing source/helper collector without executing tests.
Missing/stale/ambiguous evidence is excluded before inference. Native mode hands
off to this coding session or records its hash-bound answers; no second LLM
is called. Reference labels never enter requests.
Report writes the existing functional evaluation format; it never calls models.
Paths are caller-relative. Existing output directories are preserved.
`;
export async function claimsMain(args:string[]){
 const command=args.shift();if(!command||command==='help'||command==='--help'){console.log(help);return;}
 const allowed:Record<string,string[]>={prepare:['--repo','--input','--out'],run:['--packet','--out','--answers'],report:['--packet','--review','--out','--references']};
 if(!allowed[command])throw Error('Use claims help');const flags:Record<string,string>={};
 while(args.length){const k=args.shift()!;if(!allowed[command].includes(k)||Object.hasOwn(flags,k))throw Error('Unknown or duplicate claim argument');const v=args.shift();if(!v||v.startsWith('--'))throw Error('Missing claim argument');flags[k]=v;}
 if(!flags['--out'])throw Error('--out is required');const out=path.resolve(flags['--out']);
 if(command==='prepare'){
  if(!flags['--repo']||!flags['--input'])throw Error('prepare requires --repo and --input');
  const packet=await prepareClaims(path.resolve(flags['--repo']),await readClaimsJson(flags['--input']));
  await mkdir(path.dirname(out),{recursive:true});await mkdir(out);await mkdir(path.join(out,'requests'));
  await writeFile(path.join(out,'packet.json'),JSON.stringify(packet,null,2)+'\n',{mode:0o600});
  for(const c of packet.cases)if(c.request)await writeFile(path.join(out,'requests',c.id+'.json'),JSON.stringify(c.request,null,2)+'\n',{mode:0o600});
  await writeFile(path.join(out,'native-answers.template.json'),JSON.stringify({version:1,packetHash:packet.hash,decisions:packet.cases.filter(c=>c.request).map(c=>({caseId:c.id,requestHash:c.requestHash,label:null,rationale:'Replace with the current host judgment and cited evidence.',citations:[]}))},null,2)+'\n',{mode:0o600});
  await writeFile(path.join(out,'references.template.json'),JSON.stringify({version:1,packetHash:packet.hash,reviewKind:'unreviewed',labels:packet.cases.map(c=>({caseId:c.id,requestHash:c.requestHash,expected:null,rationale:'Await a reviewed expected answer; model agreement is not a reference.'}))},null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({packet:path.join(out,'packet.json'),hash:packet.hash,eligible:packet.cases.filter(c=>c.request).length,excluded:packet.cases.filter(c=>!c.request).map(c=>({id:c.id,issues:c.issues})),inference:false},null,2));return;
 }
 if(!flags['--packet'])throw Error('--packet is required');const packet=validateFrozenClaims(await readClaimsJson(flags['--packet']));
 if(command==='run'){
  const provider='agent' as const;
  if(packet.cases.some(c=>c.request))await assertClaimsFresh(packet);
  // Reserve the output before recording any answer.
  await mkdir(path.dirname(out),{recursive:true});await mkdir(out);
  const save=async(data:unknown)=>{await writeFile(path.join(out,'review.json'),JSON.stringify(data,null,2)+'\n',{mode:0o600});};
  const review=await reviewClaims(packet,{provider,answers:flags['--answers']?await readClaimsJson(flags['--answers']):undefined,onProgress:save});
  await writeFile(path.join(out,'review.json'),JSON.stringify(review,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({review:path.join(out,'review.json'),provider,cells:review.cells.map(c=>({id:c.caseId,status:c.status,label:c.label,reason:c.reason})),reviewRequired:true,testExecution:false},null,2));if(review.cells.some(c=>c.status==='error'))process.exitCode=2;return;
 }
 if(!flags['--review'])throw Error('report requires --review');
 const result=await claimEvaluation(packet,await readClaimsJson(flags['--review']),out,flags['--references']?await readClaimsJson(flags['--references']):undefined);
 console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))claimsMain(process.argv.slice(2)).catch(error=>{console.error(error instanceof Error?error.message:'Claim command failed');process.exitCode=1;});
