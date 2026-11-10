import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const productRoot=fileURLToPath(new URL('../',import.meta.url));
export const qualityRoot=path.join(productRoot,'quality');
const scripts={
  eval:['src/evaluation-cli.ts'],
  intake:['src/intake-cli.ts'],
  portal:['src/portal-cli.ts'],
  claims:['src/claims-cli.ts'],
  mutation:['src/mutation-cli.ts']
};
export function qualityInvocation(command,args=[],runtime={}) {
  const root=runtime.root??qualityRoot,node=runtime.node??process.execPath;
  const require=createRequire(path.join(root,'package.json'));
  if(command==='typecheck')return {command:node,args:[require.resolve('typescript/bin/tsc'),'--project',path.join(root,'tsconfig.json'),...args]};
  if(command==='test')return {command:node,args:['--import',pathToFileURL(require.resolve('tsx')).href,'--test',...readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.ts')).map(f=>path.join(root,'tests',f)),...args]};
  const selected=scripts[command];
  if(!selected)throw Error('Unknown quality command. Use intake, claims, mutation, portal or eval.');
  return {command:node,args:['--import',pathToFileURL(require.resolve('tsx')).href,path.join(root,selected[0]),...selected.slice(1),...args]};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const invocation=qualityInvocation(process.argv[2],process.argv.slice(3));
    // Preserve caller cwd so supplied config, report and repository paths keep their meaning.
    const child=spawn(invocation.command,invocation.args,{cwd:process.cwd(),env:process.env,stdio:'inherit'});
    for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
    child.on('error',()=>{console.error('Cannot start Playwright Agent quality command. Run npm ci --prefix quality.');process.exitCode=1;});
    child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
  }catch(error){console.error(error.code==='MODULE_NOT_FOUND'?'Quality dependencies are missing. Run npm ci --prefix quality.':error.message);process.exitCode=1;}
}
