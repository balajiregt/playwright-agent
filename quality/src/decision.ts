import {createHash} from 'node:crypto';
import {z} from 'zod';

/** Judgments are made by the host coding agent; no hosted model is called. */
export const decisionProvider=z.enum(['agent']);
export type DecisionProvider=z.infer<typeof decisionProvider>;
export const decisionRequest=z.object({
 state:z.union([z.string().min(1),z.record(z.string(),z.unknown()),z.array(z.unknown())]),
 instructions:z.string().min(1).max(4000),
 choices:z.record(z.string().regex(/^[a-z][a-z0-9_]{0,59}$/),z.string().min(1).max(1200))
  .refine(v=>Object.keys(v).length>=2&&Object.keys(v).length<=16&&Object.hasOwn(v,'needs_judgment'),'Use 2–16 choices including needs_judgment')
}).strict();
export type DecisionRequest=z.infer<typeof decisionRequest>;

/** Native mode is a handoff to the current coding session, never a second model API. */
export function decide(input:unknown,options:{provider:DecisionProvider}){
 const provider=decisionProvider.parse(options.provider),request=decisionRequest.parse(input);
 if(JSON.stringify(request.state).length>12000)throw Error('Narrow decision state to at most 12,000 characters');
 const requestHash=createHash('sha256').update(JSON.stringify(request)).digest('hex');
 return {
  version:1,provider,status:'awaiting_agent' as const,requestHash,request,
  model:null,probabilities:null,confidence:null,costUsd:null,executed:false,approved:false,
  nextAction:'Use the current coding agent to evaluate this evidence against the choices. Record evidence references; do not invent model probabilities or confidence.'
 };
}
