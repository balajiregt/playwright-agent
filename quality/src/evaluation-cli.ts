import path from 'node:path';
import {readEvaluationInput,evaluate,writeEvaluation} from './evaluation.js';
const help=`Functional evaluation evidence report
  eval report --repo PROJECT --input MANIFEST.json --out PRIVATE_DIRECTORY

Reads explicit, hash-bound saved evidence and computes binary rubric checks.
Writes evaluation.json, evaluation.md and a standalone index.html.
No agents, providers, tests, mutations, publication or deployment are invoked.
Unreviewed expectations and missing/stale observations remain unscored.
Paths are caller-relative. Evidence file paths are relative to PROJECT.
`;
async function main(){
 const args=process.argv.slice(2),command=args.shift();
 if(!command||command==='help'||command==='--help'){console.log(help);return;}
 if(command!=='report')throw Error('Use eval report; see --help');
 const flags:Record<string,string>={};
 while(args.length){const key=args.shift()!;if(!['--repo','--input','--out'].includes(key)||Object.hasOwn(flags,key))throw Error('Unknown or duplicate evaluation argument');const v=args.shift();if(!v||v.startsWith('--'))throw Error('Missing evaluation argument');flags[key]=v;}
 if(!flags['--repo']||!flags['--input']||!flags['--out'])throw Error('report requires --repo, --input and --out');
 const input=await readEvaluationInput(flags['--input']),report=await evaluate(input,path.resolve(flags['--repo']));
 const files=await writeEvaluation(report,path.resolve(flags['--out']));
 console.log(JSON.stringify({files,capabilities:report.capabilities,executed:false,published:false},null,2));
}
main().catch(error=>{console.error(error instanceof Error&&error.name!=='ZodError'?error.message:'Invalid evaluation manifest; source contents were not printed');process.exitCode=1;});
