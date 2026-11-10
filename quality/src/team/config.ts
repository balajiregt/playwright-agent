import {z} from 'zod';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
export const requirementSchema=z.object({id:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/),criterion:z.string().trim().min(5).max(8000),journey:z.string().trim().min(1).max(120),critical:z.boolean().default(false)}).strict();
export const requirementsSchema=z.object({version:z.literal(1),requirements:z.array(requirementSchema).min(1).max(2000)}).strict().superRefine((v,c)=>{if(new Set(v.requirements.map(r=>r.id)).size!==v.requirements.length)c.addIssue({code:'custom',message:'Duplicate requirement IDs'});});
export type Requirement=z.infer<typeof requirementSchema>;
export async function insideRepo(repo:string,file:string){const root=await realpath(repo);const p=await realpath(path.resolve(root,file));if(!p.startsWith(root+path.sep))throw Error('Evidence path escapes repository');return p;}
