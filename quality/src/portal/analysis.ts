import {constants} from 'node:fs';
import {lstat,open,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {inspectIntake} from '../intake/store.js';
import {privateReportsDirectory,reportsDirectory} from './reports.js';

const MAX_TEXT_BYTES=128*1024,MAX_RECORD_BYTES=1024*1024;
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const recordSchema=z.object({version:z.literal(1),kind:z.literal('agent-analysis'),recordedAt:z.string().datetime(),intakeHash:hash,draftHash:hash,contentHash:hash,text:z.string().min(1)}).strict();
const taskRecordSchema=recordSchema.omit({intakeHash:true,draftHash:true}).extend({kind:z.literal('agent-task-analysis')}).strict();
const digest=(text:string)=>createHash('sha256').update(text).digest('hex');
export interface AgentAnalysis {text:string;recordedAt:string;intakeHash?:string;draftHash?:string;stale:boolean;binding?:'intake'|'task'}

async function boundedFile(file:string,max:number){
 const info=await lstat(file);if(info.isSymbolicLink()||!info.isFile()||info.size>max)throw Error('Select a regular, bounded local analysis file');
 const handle=await open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{if(!(await handle.stat()).isFile())throw Error('Analysis must be a regular file');const bytes=await handle.readFile();if(bytes.length>max)throw Error('Analysis exceeds the local size limit');return bytes;}finally{await handle.close();}
}
/** Read a guarded evidence directory; identity is supplied only for intake-bound findings. */
export async function readAgentAnalysis(runDirectory:string,identity?:{intakeHash:string;draftHash:string;stale?:boolean}):Promise<AgentAnalysis|undefined>{
 let bytes:Buffer;try{bytes=await boundedFile(path.join(runDirectory,'agent-analysis.json'),MAX_RECORD_BYTES);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw error;}
 const record=(identity?recordSchema:taskRecordSchema).parse(JSON.parse(bytes.toString('utf8')));
 if(Buffer.byteLength(record.text)>MAX_TEXT_BYTES||digest(record.text)!==record.contentHash)throw Error('Recorded agent analysis changed or exceeds the local size limit');
 if(record.kind==='agent-task-analysis')return {text:record.text,recordedAt:record.recordedAt,stale:false,binding:'task'};
 return {text:record.text,recordedAt:record.recordedAt,intakeHash:record.intakeHash,draftHash:record.draftHash,stale:Boolean(identity!.stale||record.intakeHash!==identity!.intakeHash||record.draftHash!==identity!.draftHash),binding:'intake'};
}
export async function readTaskAnalysis(repo:string,taskId:string){
 const directory=await reportsDirectory(repo,taskId);
 return directory?readAgentAnalysis(directory):undefined;
}
/** Store host-agent findings as data; this never approves criteria or executes a model. */
export async function recordAgentAnalysis(options:({run:string}|{repo:string;taskId:string})&{file:string}){
 const current='run' in options?await inspectIntake({run:options.run}):undefined;
 const bytes=await boundedFile(path.resolve(options.file),MAX_TEXT_BYTES);
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
 if(!text.trim())throw Error('The agent analysis file is empty');
 const directory='run' in options?current!.run:await privateReportsDirectory(options.repo,options.taskId);
 const target=path.join(directory,'agent-analysis.json');
 try{await boundedFile(target,MAX_RECORD_BYTES);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 const common={version:1,recordedAt:new Date().toISOString(),contentHash:digest(text),text};
 const record=current?recordSchema.parse({...common,kind:'agent-analysis',intakeHash:current.snapshot.intakeHash,draftHash:current.draftHash}):taskRecordSchema.parse({...common,kind:'agent-task-analysis'});
 const temp=path.join(directory,'.agent-analysis-'+randomUUID()+'.tmp');
 try{await writeFile(temp,JSON.stringify(record)+'\n',{flag:'wx',mode:0o600});await rename(temp,target);}finally{await rm(temp,{force:true});}
 return {file:target,recordedAt:record.recordedAt,...(record.kind==='agent-analysis'?{intakeHash:record.intakeHash,draftHash:record.draftHash}:{}),scope:current?'intake':'task',bytes:Buffer.byteLength(text),accepted:false,executed:false};
}
