/** Explicit local browser verification. Offline npm test never starts this campaign. */
import {cp,mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {createServer} from 'node:net';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ROOT} from '../src/context.js';
import {configSchema} from '../src/mutation/schema.js';
import {loadContext} from '../src/mutation/context.js';
import {runCampaign} from '../src/mutation/runner.js';
const output=path.resolve(process.argv[2]??path.join(ROOT,'artifacts/mutation-adapter-verification'));
const port=await new Promise<number>((resolve,reject)=>{
 const server=createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{
  const port=(server.address() as {port:number}).port;server.close(()=>resolve(port));
 });
});
const temp=await mkdtemp(path.join(os.tmpdir(),'mutation-cart-proof-'));
try{
 const repo=path.join(temp,'repo'),artifactDir=path.join(temp,'context');
 await cp(path.join(ROOT,'tests/fixtures/mutation-cart'),repo,{recursive:true});
 await symlink(path.resolve(ROOT,'../node_modules'),path.join(repo,'node_modules'),'dir');
 await mkdir(artifactDir);await writeFile(path.join(artifactDir,'requirements.md'),'Two items cost 24 USD. The displayed currency must be USD.');
 const c=configSchema.parse({version:1,repo,artifactDir,output,sourceFiles:['app/app.js'],projects:['chromium'],testTimeoutMs:3000,
  probeAdapter:{module:'support/observe.ts',export:'observe'},env:{APP_PORT:String(port),APP_URL:`http://127.0.0.1:${port}`}});
 const ctx=await loadContext(c),source={artifactId:ctx.artifacts[0].id,quote:'Two items cost 24 USD. The displayed currency must be USD.'};
 const probe={kind:'adapter',project:'chromium',expected:'24 USD',input:{quantity:2}};
 const plan={version:1,contextHash:ctx.hash,requirements:[{id:'QUOTE',criterion:source.quote,critical:true,source}],mutations:[
  {id:'PRICE',requirementId:'QUOTE',description:'Charge too much for the same quantity.',file:'app/app.js',before:'const price=12;',after:'const price=13;',probe},
  {id:'CURRENCY',requirementId:'QUOTE',description:'Display an incorrect currency.',file:'app/app.js',before:"const currency='USD';",after:"const currency='EUR';",probe},
  {id:'BAD-OBSERVER',requirementId:'QUOTE',description:'Invalid observer must not count as detection.',file:'app/app.js',before:'const price=12;',after:'const price=99;',probe:{...probe,input:{invalidOutput:true}}},
 ]};
 const {dir,report}=await runCampaign(c,plan);
 assert.deepEqual(report.faults.map(f=>[f.id,f.status]),[['PRICE','killed'],['CURRENCY','survived'],['BAD-OBSERVER','inconclusive']]);
 assert.equal(report.originalUnchanged,true);assert.equal(report.restored?.status,'passed');
 console.log(JSON.stringify({report:path.join(dir,'index.html'),statuses:report.faults.map(f=>[f.id,f.status]),originalUnchanged:report.originalUnchanged}));
}finally{await rm(temp,{recursive:true,force:true});}
