import {loadConfig} from './mutation/schema.js';
import {mutationTools,bindCatalogue} from './mutation/tools.js';
import {serveMutationMcp} from './mutation/mcp.js';
const args=process.argv.slice(2),command=args.shift();
function flag(name:string,fallback?:string){const i=args.indexOf('--'+name);if(i<0)return fallback;const v=args[i+1];if(!v||v.startsWith('--'))throw Error('Missing --'+name+' value');return v;}
async function main(){
 if(!command||command==='help'){console.log('mutation context|evidence|plan|inspect|run|mcp --config FILE\nmutation bind --catalogue REVIEWED-FAULTS.json --config FILE\nplan uses the Codex CLI and requires --allow-hosted; execution requires --allow-run.\nFaults run one at a time in disposable copies. Detailed artifacts stay local.');return;}
 const c=await loadConfig(flag('config','mutation.config.local.json')!),options={allowHosted:args.includes('--allow-hosted'),allowRun:args.includes('--allow-run')};
 if(command==='mcp'){await serveMutationMcp(c,options);return;}
 if(command==='bind'){const file=flag('catalogue');if(!file)throw Error('--catalogue is required');console.log(JSON.stringify(await bindCatalogue(c,file),null,2));return;}
 const tools=mutationTools(c,options);if(!Object.hasOwn(tools,command))throw Error('Unknown mutation command');
 console.log(JSON.stringify(await tools[command as keyof typeof tools](),null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Mutation command failed');process.exitCode=1;});
