import {readFile,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import {digest} from '../context.js';
import {insideRepo} from './config.js';
export interface Evidence {code:string;sources:{ref:string;file:string;code:string;sha256:string}[];issues:string[];fingerprint:string}
export async function sourceEvidence(repo:string,file:string,line:number,column:number,maxBytes:number):Promise<Evidence>{
 repo=await realpath(repo);
 const sources:Evidence['sources']=[],issues:string[]=[];const seen=new Set<string>();let total=0;let code='';
 let options:ts.CompilerOptions={allowJs:true,moduleResolution:ts.ModuleResolutionKind.NodeNext};
 const tsconfig=ts.findConfigFile(repo,ts.sys.fileExists);
 if(tsconfig){const r=ts.readConfigFile(tsconfig,ts.sys.readFile);if(!r.error)options={...options,...ts.parseJsonConfigFileContent(r.config,ts.sys,path.dirname(tsconfig)).options};}
 async function visit(input:string){
  let absolute:string;try{absolute=await insideRepo(repo,input);}catch{issues.push('dependency_outside_repository_or_missing');return;}
  if(seen.has(absolute))return;seen.add(absolute);
  if(seen.size>30){issues.push('source_file_limit');return;}
  if(!/\.(?:[cm]?[jt]sx?)$/.test(absolute)){issues.push('unsupported_dependency_type');return;}
  const size=(await stat(absolute)).size;if(total+size>maxBytes){issues.push('source_byte_limit');return;}total+=size;
  const text=await readFile(absolute,'utf8');const sf=ts.createSourceFile(absolute,text,ts.ScriptTarget.Latest,true);
  sources.push({ref:`source-${sources.length+1}`,file:path.relative(repo,absolute),code:text,sha256:digest(text)});
  let target:ts.CallExpression|undefined;
  if(absolute===path.resolve(repo,file)){
   const pos=sf.getPositionOfLineAndCharacter(line-1,column-1);let best:ts.CallExpression|undefined;
   function find(n:ts.Node){if(ts.isCallExpression(n)&&n.getStart(sf)<=pos&&n.end>=pos&&(!best||n.end-n.getStart(sf)<best.end-best.getStart(sf)))best=n;ts.forEachChild(n,find);}find(sf);
   target=best;code=best?best.getText(sf):'';if(!code)issues.push('test_body_not_resolved');
  }
  // Remove unrelated test declarations from model context while retaining imports,
  // fixture definitions and the selected test's enclosing hooks. Hash original source.
  const removals:{start:number;end:number}[]=[];
  function rootName(e:ts.Expression):string{if(ts.isIdentifier(e))return e.text;if(ts.isPropertyAccessExpression(e))return rootName(e.expression);return '';}
  const testRoot=target?rootName(target.expression):'test';
  function isolate(n:ts.Node){
   if(ts.isCallExpression(n)&&rootName(n.expression)===testRoot&&n.arguments.some(a=>ts.isArrowFunction(a)||ts.isFunctionExpression(a))){
    const name=n.expression.getText(sf);const isHook=/\.(beforeEach|afterEach|beforeAll|afterAll)$/.test(name);
    const containsTarget=target&&n.pos<=target.pos&&n.end>=target.end;
    if(!isHook&&!containsTarget){removals.push({start:n.getStart(sf),end:n.end});return;}
   }
   ts.forEachChild(n,isolate);
  }
  isolate(sf);let isolated=text;for(const span of removals.sort((a,b)=>b.start-a.start))isolated=isolated.slice(0,span.start)+isolated.slice(span.start,span.end).replace(/[^\n\r]/g,' ')+isolated.slice(span.end);
  sources[sources.length-1].code=isolated;
  function dependencies(n:ts.Node){
   if(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword)issues.push('dynamic_import_requires_review');
   if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='require')issues.push('commonjs_dependency_requires_review');
   ts.forEachChild(n,dependencies);
  }dependencies(sf);
  for(const statement of sf.statements){
   let spec:string|undefined;
   if(ts.isImportDeclaration(statement)&&ts.isStringLiteral(statement.moduleSpecifier)&&!statement.importClause?.isTypeOnly)spec=statement.moduleSpecifier.text;
   if(ts.isExportDeclaration(statement)&&statement.moduleSpecifier&&ts.isStringLiteral(statement.moduleSpecifier))spec=statement.moduleSpecifier.text;
   if(!spec||spec==='@playwright/test'||spec==='playwright/test'||spec.startsWith('node:'))continue;
   const resolved=ts.resolveModuleName(spec,absolute,options,ts.sys).resolvedModule;
   if(!resolved||resolved.isExternalLibraryImport||resolved.resolvedFileName.includes(`${path.sep}node_modules${path.sep}`)){issues.push('external_or_unresolved_helper');continue;}
   await visit(resolved.resolvedFileName);
  }
 }
 await visit(file);
 return {code,sources,issues:[...new Set(issues)],fingerprint:digest(JSON.stringify(sources.map(s=>[s.file,s.sha256])))};
}
