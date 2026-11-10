import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {loadContext,validatePlan} from './context.js';
import type {MutationConfig} from './schema.js';
import {planWithCodex} from './codex.js';
import {runCampaign} from './runner.js';
import {campaignMetrics} from './report.js';

/**
 * Bind a reviewed, portable fault catalogue (requirements cite artifact filenames) to the
 * current requirements/source context and save it as the runnable plan. Nothing is executed.
 */
export async function bindCatalogue(c:MutationConfig,catalogueFile:string){
 const context=await loadContext(c),raw=JSON.parse(await readFile(catalogueFile,'utf8'));
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Fault catalogue must be a JSON object');
 if(raw.contextHash===undefined){
  raw.contextHash=context.hash;
  for(const r of Array.isArray(raw.requirements)?raw.requirements:[]){
   const artifact=context.artifacts.find(a=>a.file===r?.source?.artifactFile);
   if(!artifact)throw Error('Catalogue cites an artifact file that is not in the selected requirements');
   r.source={artifactId:artifact.id,quote:r.source.quote};
  }
 }
 const plan=validatePlan(raw,context,c),planFile=path.join(c.output,'plan.json');
 await mkdir(c.output,{recursive:true});await writeFile(planFile,JSON.stringify(plan,null,2));
 return {planFile,contextHash:plan.contextHash,requirements:plan.requirements.length,mutations:plan.mutations.map(m=>({id:m.id,requirementId:m.requirementId,description:m.description})),executed:false};
}
export function mutationTools(c:MutationConfig,options:{allowHosted?:boolean;allowRun?:boolean}={}){
 const planFile=path.join(c.output,'plan.json');
 const plan=async()=>validatePlan(JSON.parse(await readFile(planFile,'utf8')),await loadContext(c),c);
 return {
  async context(){const v=await loadContext(c);return {contextHash:v.hash,artifacts:v.artifacts.map(a=>({id:a.id,file:a.file,characters:a.text.length})),sourceFiles:v.sources.map(s=>s.file)};},
  async evidence(){return loadContext(c);},
  async plan(){if(!options.allowHosted)throw Error('Codex planning requires explicit --allow-hosted');const ctx=await loadContext(c),result=await planWithCodex(c,ctx);await mkdir(c.output,{recursive:true});await writeFile(planFile,JSON.stringify(result.plan,null,2));await writeFile(path.join(c.output,'planner.json'),JSON.stringify(result.metadata,null,2));return {planFile,requirements:result.plan.requirements.length,mutations:result.plan.mutations.map(m=>({id:m.id,requirementId:m.requirementId,description:m.description})),metadata:result.metadata};},
  async inspect(){return plan();},
  async run(){if(!options.allowRun)throw Error('Mutation execution requires explicit --allow-run');const p=await plan();const {dir,report}=await runCampaign(c,p);return {dir,metrics:campaignMetrics(report)};}
 };
}
