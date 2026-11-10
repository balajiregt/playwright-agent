import {readFile,writeFile,mkdir,lstat,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {taskList,taskDetail,validTask} from './project.js';
import type {PortalTaskDetail} from './types.js';

const staticRoot=fileURLToPath(new URL('./public/',import.meta.url));
export const DEFAULT_REPORT_DIR='playwright-agent-report';

/** JSON safe to embed in a <script> element: no closing tags, comments or line separators. */
const embed=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

/**
 * Build one self-contained HTML snapshot of the saved evidence. It reads the same
 * records as the live viewer; it never executes tests or copies original documents.
 */
export async function buildStaticReport({repo,taskId,out}:{repo:string;taskId?:string;out?:string}){
 const tasks=(await taskList(repo)).filter(task=>!taskId||task.id===validTask(taskId));
 if(taskId&&!tasks.length)throw Error('No saved evidence was found for '+taskId);
 const details:Record<string,PortalTaskDetail>={};
 for(const task of tasks){try{details[task.id]=await taskDetail(repo,task.id);}catch{/* Listed as "Evidence unavailable"; the snapshot keeps the row. */}}
 const data={generatedAt:new Date().toISOString(),session:{project:{name:path.basename(repo),root:'Static snapshot (project path omitted)'}},tasks,details,initialTask:taskId??null};
 const [html,css,js]=await Promise.all(['index.html','styles.css','app.js'].map(name=>readFile(path.join(staticRoot,name),'utf8')));
 const page=html
  .replace('<link rel="stylesheet" href="/styles.css">',()=>'<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>')
  .replace('<script src="/app.js" defer></script>',()=>'<script type="application/json" id="embedded-evidence">'+embed(data)+'</script>')
  .replace('</body>',()=>'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>\n</body>')
  .replace('<title>Report viewer · Playwright Agent</title>','<title>Evidence report · Playwright Agent</title>');
 if(!page.includes('id="embedded-evidence"')||!page.includes('<style>'))throw Error('Report template changed; cannot embed evidence');
 const directory=path.resolve(repo,out??DEFAULT_REPORT_DIR);
 try{const info=await lstat(directory);if(info.isSymbolicLink()||!info.isDirectory())throw Error('Report output must be a real directory');}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;await mkdir(directory,{recursive:true,mode:0o700});}
 // The snapshot contains private findings and error excerpts: keep it out of Git by default.
 try{await lstat(path.join(directory,'.gitignore'));}catch{await writeFile(path.join(directory,'.gitignore'),'# Private Playwright Agent evidence snapshot\n*\n',{mode:0o600});}
 const file=path.join(directory,'index.html'),temp=path.join(directory,'.index-'+randomUUID()+'.tmp');
 try{await writeFile(temp,page,{flag:'wx',mode:0o600});await rename(temp,file);}finally{await rm(temp,{force:true});}
 return {file,tasks:tasks.length,bytes:Buffer.byteLength(page),executed:false};
}
