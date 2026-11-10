'use strict';

(() => {
  const $ = selector => document.querySelector(selector);
  const tabs = [['overview','Overview'],['artifacts','Artifacts'],['criteria','Acceptance criteria'],['traceability','Traceability'],['tests','Test reports'],['mutations','Mutation reports']];
  const state = {project:null,tasks:[],detail:null,draft:null,tab:'overview',sourceId:null,busy:false,preview:false,overviewReport:{}};
  let fieldId=0,requestId=0,toastTimer,insight=null;
  // A static snapshot (portal report) embeds its evidence; the live viewer leaves this null and uses the local API.
  const embedded=(()=>{const element=document.getElementById('embedded-evidence');if(!element)return null;try{return JSON.parse(element.textContent);}catch{return null;}})();
  const chartColors=['#128775','#d4a14b','#8a9eac','#737dad','#b86572','#699eb1','#a9805a'];
  // Deliberately separate from the live task/draft state. Nothing here is sent to an API.
  const illustrativeDetail={taskId:'RECEIVING-482',run:{id:'illustration',createdAt:'2030-04-18T09:15:00Z',goal:'assess',accepted:false,reviewed:true,blockingDocuments:0,documents:[{name:'receiving-notes.md',extraction:{format:'md'}},{name:'example-criteria.json',extraction:{format:'json'}},{name:'example-links.csv',extraction:{format:'csv'}}],draft:{requirements:Array.from({length:5},(_,index)=>({id:'EXAMPLE-'+(index+1),sources:[{sourceId:'illustrative-source',segmentId:'example-segment',quote:'Fictional source quotation.'}]})),questions:[{id:'example-question-1'},{id:'example-question-2'}]},matrix:[{Assessment:'supported'},{Assessment:'supported'},{Assessment:'partial'},{Assessment:'unknown'},{Assessment:'unknown'}]},reports:{tests:[{name:'illustrative-playwright-report.json',importedAt:'2030-04-18T09:32:00Z',counts:{expected:10,unexpected:1,skipped:1,flaky:0,total:12}}],mutations:[{name:'illustrative-mutation-report.json',importedAt:'2030-04-18T09:40:00Z',counts:{requested:4,killed:2,survived:1,inconclusive:1,notActivated:0,invalid:0,notRun:0}}]}};
  const fictionalCriteria=['A receiving operator can confirm a delivery after scanning its unique label.','A duplicate delivery label must show a visible validation message.','Received quantities must retain the recorded decimal precision.','A supervisor can review a receiving exception before completing it.','A failed receiving request must leave a visible retry action.'];
  illustrativeDetail.run.documents.forEach((source,index)=>{source.id='illustrative-source-'+index;source.bytes=null;source.extraction.issues=[];source.extraction.segments=[{id:'example-segment-'+index,text:fictionalCriteria.join('\n'),locator:index===2?{row:2,cells:'A2:D2'}:{line:1,section:'Fictional receiving requirements'}}];});
  illustrativeDetail.run.draft.requirements.forEach((requirement,index)=>{Object.assign(requirement,{criterion:fictionalCriteria[index],journey:'receiving',critical:index<2,sources:[{sourceId:'illustrative-source-0',segmentId:'example-segment-0',quote:fictionalCriteria[index]}]});});
  illustrativeDetail.run.draft.questions=[{id:'example-question-1',message:'Fictional clarification: which roles may retry an exception?',sourceIds:['illustrative-source-0']},{id:'example-question-2',message:'Fictional clarification: which decimal precision is required?',sourceIds:['illustrative-source-2']}];
  illustrativeDetail.run.matrix=illustrativeDetail.run.matrix.map((row,index)=>({...row,'Requirement ID':'EXAMPLE-'+(index+1),Criterion:fictionalCriteria[index],Journey:'receiving',Scenario:'Fictional receiving scenario '+(index+1),Role:index===3?'supervisor':'receiving operator',State:'seeded example delivery',Test:index<3?'receiving.spec.ts / example '+(index+1):'',Assertion:index<2?'Recorded visible state assertion':index===2?'Quantity precision assertion remains incomplete':'',Runtime:index<3?'passed':'not run','Source refs':'receiving-notes.md / fictional source quotation','Supplied test IDs (historical)':'','Supplied statuses (historical)':''}));
  const exampleAttempts=(status,retry=0)=>({status,retry,durationMs:480+retry*170,errorCount:status==='failed'?1:0,errors:status==='failed'?['Illustrative assertion excerpt: the expected validation message was not visible.']:[]});
  const exampleTests=Array.from({length:10},(_,index)=>({title:index<2?'Receives a labelled delivery':'Fictional receiving check '+(index+1),project:index===1?'firefox':'chromium',file:'tests/receiving.spec.ts',line:12+index*9,column:3,status:'passed',outcome:'expected',expectedStatus:'passed',durationMs:480,errors:[],errorCount:0,attempts:[exampleAttempts('passed')]}));
  exampleTests.push({title:'Rejects a duplicate delivery label',project:'chromium',file:'tests/receiving-validation.spec.ts',line:44,column:3,status:'failed',outcome:'unexpected',expectedStatus:'passed',durationMs:1130,errors:['Illustrative first-attempt assertion excerpt.','Illustrative retry assertion excerpt.'],errorCount:2,attempts:[exampleAttempts('failed'),exampleAttempts('failed',1)]},{title:'Prints a partner receiving label',project:'chromium',file:'tests/receiving-labels.spec.ts',line:20,column:3,status:'skipped',outcome:'skipped',expectedStatus:'skipped',durationMs:null,errors:[],errorCount:0,attempts:[]});
  Object.assign(illustrativeDetail.reports.tests[0],{id:'illustrative-tests-latest',kind:'playwright',recordedAt:'2030-04-18T09:31:00Z',durationMs:9400,reportErrors:[],reportErrorCount:0,tests:exampleTests,limitations:['Fictional client-only illustration. No tests were executed or imported.']});
  illustrativeDetail.reports.tests.push({...illustrativeDetail.reports.tests[0],id:'illustrative-tests-earlier',name:'illustrative-earlier-check.json',recordedAt:'2030-04-18T09:26:00Z',importedAt:'2030-04-18T09:28:00Z',durationMs:2100,counts:{expected:30,unexpected:0,skipped:0,flaky:0,total:30},tests:Array.from({length:30},(_,index)=>({...exampleTests[index%10],title:'Fictional archived receiving check '+(index+1)}))});
  const exampleExecution=(status,failed=0)=>({status,errors:0,tests:6,passed:6-failed,failed,skipped:0,other:0,assertionFailures:failed,durationMs:2100});
  const exampleFaults=[['LABEL-LOCK-REMOVED','killed','1','0'],['RECEIPT-LIMIT-REMOVED','killed','blocked','enabled'],['QUANTITY-ROUNDING','survived','12.75','13'],['RECOVERY-TIMEOUT','inconclusive','retry visible','retry visible']].map(([id,status,baselineProbe,mutantProbe],index)=>({id,requirementId:'EXAMPLE-'+(index+1),criterion:fictionalCriteria[index],description:'Fictional controlled behavior change for this layout preview.',status,baselineProbe,mutantProbe,reason:status==='inconclusive'?'The fictional observations do not establish activation.':undefined,killingTests:status==='killed'?['chromium › fictional receiving assertion']:[],killingTestCount:status==='killed'?1:0,attempts:[exampleExecution(status==='killed'?'failed':'passed',status==='killed'?1:0),exampleExecution(status==='killed'?'failed':'passed',status==='killed'?1:0)]}));
  Object.assign(illustrativeDetail.reports.mutations[0],{id:'illustrative-mutation-latest',kind:'mutation',runId:'fictional-campaign-482',recordedAt:'2030-04-18T09:38:00Z',baselines:[exampleExecution('passed'),exampleExecution('passed')],restored:'passed',restoration:exampleExecution('passed'),originalUnchanged:true,faults:exampleFaults,limitations:['Fictional client-only illustration. No mutation campaign was executed or imported.']});
  exampleFaults[3].reason='Fictional probe unavailable; activation is not established.';delete exampleFaults[3].mutantProbe;exampleFaults[3].attempts=[];
  illustrativeDetail.run.analysis={text:'Fictional findings: the duplicate-label check recorded an unexpected outcome, and the quantity mutation survived its recorded attempts. Retry permissions remain an unresolved source question. This text demonstrates the saved-analysis layout only.',recordedAt:'2030-04-18T09:20:00Z',intakeHash:'fictional-intake',draftHash:'fictional-draft',stale:false};

  function node(tag,attributes={},...children){
    const element=document.createElement(tag);
    for(const [key,value] of Object.entries(attributes)){
      if(value===undefined||value===null)continue;
      if(key.startsWith('on')&&typeof value==='function')element.addEventListener(key.slice(2).toLowerCase(),value);
      else if(key==='class')element.className=value;
      else if(['value','checked','disabled','hidden','selected','readOnly'].includes(key))element[key]=value;
      else element.setAttribute(key,String(value));
    }
    for(const child of children.flat(Infinity))if(child!==null&&child!==undefined&&child!==false)element.append(child instanceof Node?child:document.createTextNode(String(child)));
    return element;
  }
  const button=(text,action,className='button secondary',disabled=false)=>node('button',{type:'button',class:className,onClick:action,disabled},text);
  const badge=(text,tone='')=>node('span',{class:'pill '+tone},text);
  const run=()=>state.detail?.run;
  const taskUrl=(suffix='')=>'/api/tasks/'+encodeURIComponent(state.detail.taskId)+suffix;
  const runUrl=()=>taskUrl('/runs/'+encodeURIComponent(run().id));
  const docUrl=source=>runUrl()+'/documents/'+encodeURIComponent(source.id);
  const download=(text,url,className='button secondary small')=>embedded?node('span',{class:'pill outline',title:'Static snapshot: original files are not embedded. Use portal serve to download them.'},'Download in live viewer'):node('a',{href:url,class:className,download:''},text);
  const date=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Not recorded';
  const bytes=value=>value<1024?value+' B':value<1024*1024?(value/1024).toFixed(1)+' KB':(value/1024/1024).toFixed(1)+' MB';
  const goal=value=>({create:'Create tests',update:'Update tests',assess:'Assess coverage'}[value]||value);
  const unresolved=()=>state.draft?.questions.filter(q=>!q.resolution?.trim())??[];
  const sourceFor=id=>run()?.documents.find(source=>source.id===id);
  const segmentFor=ref=>sourceFor(ref.sourceId)?.extraction.segments.find(segment=>segment.id===ref.segmentId);
  function locator(value={}){return [value.page!==undefined?'Page '+value.page:null,value.sheet?'Sheet '+value.sheet:null,value.row!==undefined?'row '+value.row:null,value.cells||null,value.line!==undefined?'line '+value.line:null,value.section||null].filter(Boolean).join(' · ')||'Document record';}
  function notify(message){clearTimeout(toastTimer);$('#live-status').textContent=message;$('#live-status').hidden=false;toastTimer=setTimeout(()=>{$('#live-status').hidden=true;},6500);}
  function clearError(){$('#error-banner').hidden=true;$('#error-banner').replaceChildren();}
  function showError(error){$('#error-banner').textContent=error instanceof Error?error.message:'The request could not be completed.';$('#error-banner').hidden=false;}
  function snapshot(url){
    const parsed=new URL(url,'http://snapshot.local'),parts=parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if(parsed.pathname==='/api/session')return embedded.session;
    if(parsed.pathname==='/api/tasks')return {tasks:embedded.tasks};
    const detail=parts.length===3&&parts[1]==='tasks'?embedded.details[parts[2]]:null;
    if(!detail)throw Error('This work item is not included in the static snapshot.');
    const run=parsed.searchParams.get('run');if(run&&detail.run?.id!==run)throw Error('Only the latest intake version is included in the static snapshot. Use portal serve for earlier versions.');
    return detail;
  }
  async function api(url){
    if(embedded)return snapshot(url);
    const response=await fetch(url,{method:'GET',credentials:'same-origin',cache:'no-store'});
    let data;try{data=await response.json();}catch{throw Error('The local report viewer returned an unreadable response.');}
    if(!response.ok)throw Error(typeof data.error==='string'?data.error:'The evidence could not be read ('+response.status+').');
    return data;
  }
  function syncLocation(){if(state.preview||!state.detail)return;const params=new URLSearchParams({task:state.detail.taskId,tab:state.tab});if(run())params.set('run',run().id);history.replaceState(null,'','#'+params.toString());}
  function takeDetail(detail){if(state.detail?.taskId!==detail.taskId)state.overviewReport={};state.detail=detail;state.draft=detail.run?.draft||null;state.sourceId=detail.run?.documents[0]?.id??null;render();syncLocation();}
  async function reloadTasks(){const result=await api('/api/tasks');state.tasks=result.tasks;renderTasks();}
  async function selectTask(id,version){
    const current=++requestId;clearError();notify('Loading work item…');
    try{const detail=await api('/api/tasks/'+encodeURIComponent(id)+(version?'?run='+encodeURIComponent(version):''));if(current!==requestId)return;takeDetail(detail);closeMenu();$('#live-status').hidden=true;}catch(error){if(current===requestId)showError(error);}
  }
  function selectTab(id,focus=false){state.tab=id;render();syncLocation();if(focus)$('#tab-'+id)?.focus();}
  function closeMenu(){const restoreFocus=$('#sidebar').contains(document.activeElement)&&window.matchMedia('(max-width:760px)').matches;$('#sidebar').classList.remove('mobile-open');$('.app-shell').inert=false;$('#sidebar-scrim').hidden=true;$('#menu-toggle').setAttribute('aria-expanded','false');$('#menu-toggle').setAttribute('aria-label','Open work item navigation');if(restoreFocus)$('#menu-toggle').focus();}
  function empty(title,text,actionButton,symbol='◇'){return node('div',{class:'empty'},node('div',{class:'empty-symbol','aria-hidden':'true'},symbol),node('h2',{},title),node('p',{},text),actionButton);}
  function field(label,input,hint){const id='field-'+(++fieldId);input.id=id;return node('label',{class:'field',for:id},label,input,hint?node('small',{},hint):null);}
  function notice(title,text,tone=''){return node('div',{class:'notice '+tone},node('strong',{},title),text);}

  function renderAgentAnalysis(detail,{preview=false}={}){
    if(detail?.analysis&&detail?.run?.analysis)return node('div',{},renderAgentAnalysis({analysis:detail.analysis},{preview}),renderAgentAnalysis({run:detail.run},{preview}));
    const analysis=detail?.analysis??detail?.run?.analysis,taskLevel=analysis?.binding==='task',content=node('section',{class:'panel agent-analysis'},node('div',{class:'panel-head'},node('div',{},node('div',{class:'eyebrow'},'RECORDED AGENT FINDINGS'),node('h2',{},taskLevel?'Task findings':'Agent analysis'),node('p',{},taskLevel?'Saved findings from the requested work. No document intake was required.':'Saved findings from the requested work, with their source and draft binding.')),preview?badge('Illustrative','warning'):badge(analysis?'Recorded findings':'Not recorded','outline')));
    if(!analysis)content.append(node('p',{class:'agent-analysis-empty'},detail?.run?'No agent analysis was saved for this intake version. Available criteria, matrix rows and reports remain inspectable below.':'No intake snapshot or agent analysis is linked to this work item. Available reports are shown as separate recorded evidence.'));
    else content.append(node('p',{class:'agent-analysis-meta'},'Recorded '+date(analysis.recordedAt)+' · '+(taskLevel?'Task-level report; application/test freshness is not checked automatically.':analysis.stale?'The source or draft has changed since these findings were saved.':'Bound to the recorded intake and draft.')),...(analysis.stale?[notice('Stale analysis','These findings refer to an earlier source or draft state. Treat their freshness as unresolved.','warning')]:[]),collapsible(markdown(analysis.text),analysis.text.length>900),node('p',{class:'viewer-evidence-note'},'Agent findings are not human approval or proof that acceptance criteria pass. Source-linked criteria, assertion coverage and execution outcomes remain separate evidence.'),node('details',{class:'details'},node('summary',{},'Analysis provenance'),detailFacts(taskLevel?[['Scope','Selected work item; no intake binding'],['Revisions and commands','See the recorded findings and matching reports']]:[['Intake fingerprint',analysis.intakeHash],['Draft fingerprint',analysis.draftHash]])));
    return content;
  }

  const insightTitles={tests:'Test outcome insights',mutations:'Mutation outcome insights',criteria:'Requirements interpretation',traceability:'Traceability insights',artifacts:'Source document insights',activity:'Activity & provenance'};
  const outcomeName=value=>({expected:'Expected outcome',unexpected:'Unexpected outcome',flaky:'Flaky',skipped:'Skipped',killed:'Killed',survived:'Survived',inconclusive:'Inconclusive',not_activated:'Not activated',invalid_mutation:'Invalid mutation',not_run:'Not run',unknown:'Unknown / not projected'}[value]||value);
  const duration=value=>typeof value==='number'?value.toLocaleString()+' ms':'Unavailable';
  function insightReport(){const reports=insight?.detail?.reports[insight.kind==='tests'?'tests':'mutations']||[];return reports.find(report=>report.id===insight.reportId)||null;}
  function openInsight(kind,{reportId,filter='all'}={}){
    const dialog=$('#insight-dialog'),previousOpener=dialog.open?insight?.opener:document.activeElement;
    const detail=state.preview?illustrativeDetail:state.detail,collection=detail?.reports[kind==='tests'?'tests':'mutations']||[];
    insight={kind,detail,draft:state.preview?illustrativeDetail.run.draft:state.draft,preview:state.preview,reportId:reportId||newest(collection)?.id||null,filter,search:'',limit:25,openRows:new Set(),opener:previousOpener};
    $('#insight-title').textContent=insightTitles[kind];
    $('#insight-scope').textContent=insight.preview?'Illustrative layout preview — not project evidence. All details below are fictional and read-only.':'Recorded evidence for '+(detail?.taskId||'the selected work item')+'. This view does not execute tests, verify coverage or approve product behavior.';
    dialog.classList.toggle('illustrative-insight',insight.preview);renderInsightControls();renderInsightResults();if(!dialog.open)dialog.showModal();$('#close-insight').focus();
  }
  function renderInsightControls(){
    const host=$('#insight-controls');host.replaceChildren();if(!insight)return;
    const controls=node('div',{class:'insight-controls'}),reportKind=['tests','mutations'].includes(insight.kind);
    if(reportKind){
      const reports=insight.detail?.reports[insight.kind==='tests'?'tests':'mutations']||[];
      const select=node('select',{'aria-label':'Imported report',disabled:!reports.length,onChange:event=>{insight.reportId=event.target.value;insight.limit=25;insight.openRows.clear();renderInsightResults();}},...(reports.length?reports.slice().sort((a,b)=>Date.parse(b.importedAt)-Date.parse(a.importedAt)).map(report=>node('option',{value:report.id,selected:report.id===insight.reportId},report.name+' · imported '+date(report.importedAt))):[node('option',{},'No reports attached')]));
      controls.append(field('Imported report',select));
    }
    let options=[];
    if(insight.kind==='tests')options=[['expected','Expected outcomes'],['unexpected','Unexpected outcomes'],['skipped','Skipped'],['flaky','Flaky'],['unknown','Unknown / not projected']];
    if(insight.kind==='mutations')options=['killed','survived','inconclusive','not_activated','invalid_mutation','not_run'].map(value=>[value,outcomeName(value)]);
    if(insight.kind==='criteria')options=[['accepted','Accepted interpretation'],['draft','Draft criteria'],['missing','Source quotation needed'],['questions','Open questions']];
    if(insight.kind==='traceability')options=Array.from(new Set((insight.detail?.run?.matrix||[]).map(row=>row.Assessment?.trim()||'unknown'))).map(value=>[value,value]);
    if(insight.kind==='artifacts')options=Array.from(new Set((insight.detail?.run?.documents||[]).map(source=>source.extraction.format.toUpperCase()))).map(value=>[value,value]);
    if(options.length){const select=node('select',{'aria-label':reportKind?'Outcome filter':'Record filter',onChange:event=>{insight.filter=event.target.value;insight.limit=25;renderInsightResults();}},node('option',{value:'all',selected:insight.filter==='all'},'All '+(reportKind?'outcomes':'records')),...options.map(([value,label])=>node('option',{value,selected:insight.filter===value},label)));controls.append(field(reportKind?'Outcome filter':'Record filter',select));}
    const search=node('input',{type:'search','aria-label':'Search details',value:insight.search,placeholder:reportKind?'Test / fault, source, project, available errors…':'Search the selected evidence…',onInput:event=>{insight.search=event.target.value;insight.limit=25;renderInsightResults();}});
    controls.append(field('Search details',search));host.append(controls);
  }
  function insightMetadata(report){
    const base='/api/tasks/'+encodeURIComponent(insight.detail.taskId);
    return node('div',{class:'insight-provenance'},node('div',{},node('h3',{},report.name),node('p',{},'Recorded: '+date(report.recordedAt)),node('p',{},'Imported: '+date(report.importedAt)),node('p',{},'Report ID: '+report.id)),!insight.preview?download('Full imported JSON ↓',base+'/reports/'+encodeURIComponent(report.id)):badge('Fictional example','warning'));
  }
  function detailFacts(items){const list=node('dl',{class:'insight-facts'});for(const [name,value]of items){const display=value===null||value===undefined||typeof value==='string'&&!value.trim()?'Not recorded':typeof value==='boolean'?String(value):value;list.append(node('div',{},node('dt',{},name),node('dd',{},display)));}return list;}
  function errorExcerpts(title,errors,total){
    const values=Array.isArray(errors)?errors:[],count=typeof total==='number'?total:null;
    const content=node('section',{class:'insight-error-block'},node('h4',{},title+(count!==null?' · '+count+' recorded':'')));
    if(!values.length)content.append(node('p',{class:'muted'},count===0?'No errors recorded.':'No error excerpts were supplied in this projection.'));
    else content.append(...values.map((text,index)=>node('details',{class:'details insight-error'},node('summary',{},'Error excerpt '+(index+1)),node('pre',{},String(text).slice(0,4000)+(String(text).length>4000?'\n[Display excerpt limited to 4,000 characters.]':'')))));
    if(count!==null&&count>values.length)content.append(node('p',{class:'insight-caption'},'Showing '+values.length+' excerpts from '+count+' recorded errors. Inspect the imported JSON for the full recorded payload.'));
    return content;
  }
  function expandableRecord(title,meta,tag,key,body){
    const owner=insight,details=node('details',{class:'insight-record'}),holder=node('div',{class:'insight-record-body'});let built=false;
    const build=()=>{if(!built){holder.append(body());built=true;}};
    details.append(node('summary',{},node('span',{class:'insight-chevron','aria-hidden':'true'},'›'),node('span',{class:'insight-record-title'},node('strong',{},title),node('small',{},meta)),tag),holder);
    details.addEventListener('toggle',()=>{if(insight!==owner)return;if(details.open){insight.openRows.add(key);build();}else insight.openRows.delete(key);});
    if(insight.openRows.has(key)){details.open=true;build();}return details;
  }
  function executionSummary(execution,title){
    const section=node('section',{class:'insight-execution'},node('h4',{},title));
    if(!execution){section.append(node('p',{class:'muted'},'Detailed execution summary was not recorded.'));return section;}
    section.append(detailFacts([['Recorded status',execution.status],['Tests',execution.tests],['Passed',execution.passed],['Failed',execution.failed],['Skipped',execution.skipped],['Other outcomes',execution.other],['Execution errors',execution.errors],['Tests with assertion failures',execution.assertionFailures],['Execution wall time',duration(execution.durationMs)]]));return section;
  }
  function testInsightBody(test){
    const attempts=Array.isArray(test.attempts)?test.attempts:[],source=test.file?[test.file,test.line,test.column].filter(value=>value!==undefined).join(':'):'Not recorded';
    return node('div',{},detailFacts([['Project',test.project||'Not recorded'],['Source location',source],['Expected status',test.expectedStatus||'Not projected'],['Final recorded status',test.status],['Playwright outcome',outcomeName(test.outcome||'unknown')],['Test duration · sum of recorded attempts',duration(test.durationMs)],['Attempts projected',attempts.length]]),errorExcerpts('Test error excerpts',test.errors,test.errorCount),node('h4',{class:'insight-section-label'},'Recorded attempts & retries'),attempts.length?node('div',{class:'insight-attempts'},...attempts.map((attempt,index)=>node('section',{class:'insight-attempt'},node('h4',{},'Attempt '+(index+1)),detailFacts([['Retry index',attempt.retry===null?'Not recorded':attempt.retry],['Status',attempt.status],['Duration',duration(attempt.durationMs)],['Recorded error count',attempt.errorCount??'Not projected']]),errorExcerpts('Attempt error excerpts',attempt.errors,attempt.errorCount)))):node('p',{class:'insight-caption'},'No attempt details were recorded. A missing attempt or duration is not a zero-duration pass.'));
  }
  function mutationInsightBody(fault){
    const attempts=Array.isArray(fault.attempts)?fault.attempts:[],references=fault.killingTests||[],count=fault.killingTestCount;
    return node('div',{},fault.criterion?node('blockquote',{class:'source-quote'},fault.criterion):null,fault.description?node('p',{class:'insight-description'},fault.description):null,detailFacts([['Criterion ID',fault.requirementId],['Reported outcome',outcomeName(fault.status)],['Reason',fault.reason||'Not supplied'],['Suite attempts projected',attempts.length]]),node('div',{class:'insight-observations'},node('section',{},node('h4',{},'Baseline observation'),node('pre',{},fault.baselineProbe??'Not recorded')),node('section',{},node('h4',{},'Mutant observation'),node('pre',{},fault.mutantProbe??'Not recorded'))),node('p',{class:'insight-caption'},'Observations are reported values. Their presence or difference is not independent verification of fault activation.'),node('h4',{class:'insight-section-label'},'Killing test references · recorded'),references.length?node('pre',{class:'insight-reference-list'},references.join('\n')):node('p',{class:'insight-caption'},'No killing test references recorded.'),typeof count==='number'&&count>references.length?node('p',{class:'insight-caption'},'Showing '+references.length+' of '+count+' recorded references. See the imported JSON for the remaining references.'):null,node('h4',{class:'insight-section-label'},'Repeated suite execution records'),attempts.length?node('div',{class:'insight-attempts'},...attempts.map((attempt,index)=>executionSummary(attempt,'Attempt '+(index+1)))):node('p',{class:'insight-caption'},'No suite attempt details were supplied.'));
  }
  function matchesSearch(values){return !insight.search.trim()||values.join('\n').toLocaleLowerCase().includes(insight.search.trim().toLocaleLowerCase());}
  function insightRows(rows,kind){
    const host=node('div',{class:'insight-records'}),matches=rows.filter(row=>row.match);
    host.append(node('p',{class:'insight-result-count',role:'status','aria-live':'polite'},'Showing '+Math.min(insight.limit,matches.length)+' of '+matches.length+' matching '+kind+' · '+rows.length+' in this view.'));
    if(!matches.length)host.append(empty('No matching '+kind,'Try another outcome filter, report or search term. The selected evidence exists; this filter has no matching records.'));
    else host.append(...matches.slice(0,insight.limit).map(row=>row.render()));
    if(matches.length>insight.limit)host.append(button('Show 25 more',()=>{const previous=insight.limit;insight.limit+=25;renderInsightResults();document.querySelectorAll('#insight-results .insight-record > summary')[previous]?.focus();},'button secondary insight-more'));
    return host;
  }
  function renderReportInsight(){
    const kind=insight.kind,report=insightReport();if(!report)return empty('No '+(kind==='tests'?'test report':'mutation campaign')+' attached','Choose a work item with recorded evidence to inspect outcomes. Nothing is inferred, executed or uploaded by this view.');
    const content=node('div',{},insightMetadata(report),notice('Recorded evidence','The selected imported report is fixed while filtering and searching. These views do not independently verify its association with the work item or its underlying execution.'));
    if(kind==='tests'){
      content.append(detailFacts([['Total reported tests',report.counts.total],['Expected outcomes',report.counts.expected],['Unexpected outcomes',report.counts.unexpected],['Skipped',report.counts.skipped],['Flaky',report.counts.flaky],['Report wall duration',duration(report.durationMs)]]),errorExcerpts('Report-level error excerpts',report.reportErrors,report.reportErrorCount));
      const rows=(report.tests||[]).map((test,index)=>{const outcome=test.outcome||(['expected','unexpected','flaky','skipped'].includes(test.status)?test.status:'unknown');return {match:(insight.filter==='all'||insight.filter===outcome)&&matchesSearch([test.title,test.project,test.file||'',test.expectedStatus||'',...(test.errors||[]),...(test.attempts||[]).flatMap(attempt=>attempt.errors||[])]),render:()=>expandableRecord(test.title,(test.project||'Project not recorded')+' · '+(test.file||'Source not recorded')+' · '+duration(test.durationMs),badge(outcomeName(outcome),'status-'+outcome),report.id+':test:'+index,()=>testInsightBody(test))};});
      content.append(node('p',{class:'insight-caption'},'Search covers every projected test in the selected report. Error text is excerpted; use the imported JSON for its complete recorded payload. Expected outcomes can include tests expected to fail.'),insightRows(rows,'tests'));
    }else{
      content.append(detailFacts([['Requested faults',report.counts.requested],['Killed',report.counts.killed],['Survived',report.counts.survived],['Inconclusive',report.counts.inconclusive],['Campaign run ID',report.runId],['Original source unchanged',report.originalUnchanged?'Reported yes':'Not established']]));
      const gates=node('details',{class:'insight-gates'},node('summary',{},'Baseline & restoration records · '+report.baselines.length+' baseline runs'),node('p',{class:'insight-caption'},'Inspect these reported execution summaries. The viewer has not rerun or independently verified the baseline, activation or restoration gates.'),node('div',{class:'insight-attempts'},...report.baselines.map((baseline,index)=>executionSummary(baseline,'Baseline '+(index+1))),executionSummary(report.restoration,'Restoration'+(report.restored?' · reported '+report.restored:''))));content.append(gates);
      const rows=(report.faults||[]).map((fault,index)=>({match:(insight.filter==='all'||insight.filter===fault.status)&&matchesSearch([fault.id,fault.requirementId,fault.criterion||'',fault.description||'',fault.reason||'',fault.baselineProbe||'',fault.mutantProbe||'',...(fault.killingTests||[])]),render:()=>expandableRecord(fault.id,fault.requirementId+' · '+(fault.description||'No description supplied'),badge(outcomeName(fault.status),'status-'+fault.status),report.id+':fault:'+index,()=>mutationInsightBody(fault))}));content.append(node('p',{class:'insight-caption'},'Fault outcomes remain the report’s classifications. Expand a fault to inspect observations, repeated attempts and killing test references.'),insightRows(rows,'faults'));
    }
    if(report.limitations?.length)content.append(node('details',{class:'details insight-limitations'},node('summary',{},'Projection & report limitations'),node('ul',{},...report.limitations.map(limit=>node('li',{},limit)))));return content;
  }
  function renderSourceInsight(){
    const documents=insight.detail?.run?.documents||[];if(!documents.length)return empty('No source documents recorded','This view shows only the source snapshots for the selected intake. No files are read or uploaded when opening it.');
    return insightRows(documents.map((source,index)=>({match:(insight.filter==='all'||insight.filter===source.extraction.format.toUpperCase())&&matchesSearch([source.name,...source.extraction.segments.map(segment=>segment.text)]),render:()=>expandableRecord(source.name,source.extraction.format.toUpperCase()+' · '+source.extraction.segments.length+' text segments',badge(source.extraction.issues.some(issue=>issue.severity==='blocking')?'Needs attention':'Captured',source.extraction.issues.some(issue=>issue.severity==='blocking')?'warning':'outline'),'source:'+source.id+':'+index,()=>node('div',{},detailFacts([['Source ID',source.id],['Size',typeof source.bytes==='number'?bytes(source.bytes):'Not captured in this illustration'],['Raw-file SHA256',source.sha256||'Unavailable in this illustration'],['Selected worksheet',source.extraction.selection?.sheet||'All available content']]),!insight.preview?download('Original document ↓','/api/tasks/'+encodeURIComponent(insight.detail.taskId)+'/runs/'+encodeURIComponent(insight.detail.run.id)+'/documents/'+encodeURIComponent(source.id)):null,...source.extraction.issues.map(issue=>notice(issue.severity==='blocking'?'Extraction blocker':'Review note',issue.message,issue.severity==='blocking'?'warning':'')),node('h4',{class:'insight-section-label'},'Source segment previews'),...source.extraction.segments.slice(0,10).map(segment=>node('details',{class:'details insight-source-segment'},node('summary',{},locator(segment.locator)),node('pre',{},segment.text.slice(0,4000)+(segment.text.length>4000?'\n[Display excerpt limited to 4,000 characters.]':'')))),source.extraction.segments.length>10?node('p',{class:'insight-caption'},'Showing the first 10 segment previews. The Artifacts tab contains the recorded extraction; the original document remains available for review.'):null))})), 'documents');
  }
  function renderCriteriaInsight(){
    const requirements=insight.draft?.requirements||[],questions=insight.draft?.questions||[];if(!requirements.length&&!questions.length)return empty('No acceptance criteria recorded','This intake has no source-linked criteria yet. No requirements or coverage are invented by the insights view.');
    const accepted=Boolean(insight.detail?.run?.accepted),sources=insight.detail?.run?.documents||[];
    const rows=requirements.map((requirement,index)=>{const linked=requirement.sources.some(ref=>ref.quote?.trim()),status=accepted?'accepted':linked?'draft':'missing';return {match:(insight.filter==='all'||insight.filter===status)&&matchesSearch([requirement.id,requirement.criterion||'',requirement.journey||'',...requirement.sources.map(ref=>ref.quote)]),render:()=>expandableRecord(requirement.id,requirement.criterion||'No expected outcome',badge(status==='accepted'?'Accepted interpretation':status==='draft'?'Draft criterion':'Source needed',status==='accepted'?'good':'warning'),'criterion:'+index,()=>node('div',{},node('blockquote',{class:'source-quote'},requirement.criterion),detailFacts([['Journey',requirement.journey],['Critical criterion',requirement.critical?'Yes':'No'],['Product / test acceptance','Not established by interpretation review']]),...requirement.sources.map(ref=>{const source=sources.find(item=>item.id===ref.sourceId),segment=source?.extraction.segments.find(item=>item.id===ref.segmentId);return node('section',{class:'insight-source-reference'},node('h4',{},source?.name||'Source not found'),node('p',{class:'insight-caption'},locator(segment?.locator)),node('blockquote',{class:'source-quote'},ref.quote));})))};});
    const content=node('div',{},notice('Requirements interpretation','Accepted criteria record a reviewed interpretation. They do not establish implementation coverage or passing tests.'));
    if(insight.filter!=='questions')content.append(requirements.length?insightRows(rows,'criteria'):empty('No criteria recorded','The recorded clarification questions are shown below.'));
    if(questions.length){const questionRows=questions.map((question,index)=>({match:(insight.filter!=='questions'||!question.resolution?.trim())&&matchesSearch([question.message,question.resolution||'',...(question.sourceIds||[])]),render:()=>expandableRecord(question.id,question.message,badge(question.resolution?.trim()?'Resolution recorded':'Unresolved',question.resolution?.trim()?'good':'warning'),'question:'+index,()=>node('div',{},node('blockquote',{class:'source-quote'},question.message),node('h4',{class:'insight-section-label'},'Recorded resolution'),node('p',{class:'insight-description'},question.resolution||'No resolution has been recorded.'),detailFacts([['Source references',(question.sourceIds||[]).map(id=>sources.find(source=>source.id===id)?.name||id).join(', ')||'Not supplied']])))}));content.append(node('h3',{class:'insight-section-label'},insight.filter==='questions'?'Open clarification questions':'Recorded clarification questions'),insightRows(questionRows,'questions'));}
    else if(insight.filter==='questions')content.append(empty('No open questions','No clarification questions were recorded in this interpretation.'));
    return content;
  }
  function renderMatrixInsight(){
    const matrix=insight.detail?.run?.matrix||[];if(!matrix.length)return empty('No recorded matrix rows','The source / test / assertion / runtime matrix has not been populated for this view.');
    return node('div',{},notice('Recorded traceability','Matrix labels and runtime cells are authored evidence. They are not independently checked against code or attached reports by this viewer.'),insightRows(matrix.map((row,index)=>({match:(insight.filter==='all'||insight.filter===(row.Assessment?.trim()||'unknown'))&&matchesSearch(Object.values(row)),render:()=>expandableRecord(row['Requirement ID']||'ID not recorded',row.Criterion||'Criterion not recorded',badge(row.Assessment||'unknown','outline'),'matrix:'+index,()=>detailFacts(Object.entries(row)))})),'matrix rows'));
  }
  function renderActivityInsight(){
    const detail=insight.detail,events=[];if(detail?.run)events.push({title:'Intake captured',text:detail.run.documents.length+' source documents',at:detail.run.createdAt,kind:'artifacts'});for(const report of detail?.reports.tests||[])events.push({title:'Playwright report imported',text:report.name,at:report.importedAt,kind:'tests',reportId:report.id});for(const report of detail?.reports.mutations||[])events.push({title:'Mutation report imported',text:report.name,at:report.importedAt,kind:'mutations',reportId:report.id});
    events.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));if(!events.length)return empty('No recorded activity','Only intake creation and report imports with supplied timestamps appear here. No progress or execution activity is assumed.');
    const matches=events.filter(event=>matchesSearch([event.title,event.text,date(event.at)]));
    return node('div',{},notice('Event provenance','Imported timestamps describe attachment activity. They do not establish that different reports are comparable or associated with the selected criteria.'),...(matches.length?matches.map(event=>node('article',{class:'insight-activity-row'},node('div',{},node('h3',{},event.title),node('p',{},event.text),node('time',{datetime:event.at},date(event.at))),button('Inspect details →',()=>openInsight(event.kind,{reportId:event.reportId}),'button secondary small'))):[empty('No matching activity','Try another search term. No event records match this search.')]));
  }
  function renderInsightResults(){
    if(!insight)return;const renderer={tests:renderReportInsight,mutations:renderReportInsight,artifacts:renderSourceInsight,criteria:renderCriteriaInsight,traceability:renderMatrixInsight,activity:renderActivityInsight};$('#insight-results').replaceChildren(renderer[insight.kind]());
  }

  function renderTasks(){
    if(state.preview)return;
    $('#task-count').textContent=state.tasks.length;
    $('#task-list').replaceChildren(...(state.tasks.length?state.tasks.map(task=>node('button',{type:'button',class:'task-button'+(state.detail?.taskId===task.id?' active':''),'aria-current':state.detail?.taskId===task.id?'page':undefined,onClick:()=>selectTask(task.id)},node('span',{class:'task-icon','aria-hidden':'true'},'▤'),node('span',{},node('strong',{},task.id),node('small',{},taskMeta(task)+(task.openQuestions?' · '+task.openQuestions+' open questions':''))))):[node('p',{class:'sidebar-empty'},'No saved work items were found.')]));
  }
  function renderHeader(){
    const header=$('#work-item-header');header.replaceChildren();if(!state.detail)return;
    const current=run(),meta=node('div',{class:'heading-meta'},badge(current?goal(current.goal):'Report-only work item','outline'),current?badge(current.accepted?'Interpretation accepted':current.reviewed?'Draft validated':'Interpretation unreviewed',current.accepted?'good':'warning'):null,badge('Read-only report viewer','outline'));
    if(state.detail.runs.length){const select=node('select',{'aria-label':'Intake version',onChange:event=>selectTask(state.detail.taskId,event.target.value)},...state.detail.runs.map(item=>node('option',{value:item.id,selected:item.id===current?.id},date(item.createdAt))));meta.append(node('label',{class:'run-select'},'Recorded intake version',select));}
    header.append(node('div',{class:'page-heading'},node('div',{},node('div',{class:'breadcrumb'},'RECORDED WORK ITEM / '+state.detail.taskId),node('h1',{},state.detail.taskId),node('p',{class:'muted'},'Final recorded findings, source references and observed results.'),meta),current?.matrix?node('div',{class:'heading-actions'},download('Download matrix ↓',runUrl()+'/matrix.csv','button secondary')):null));
    if(current?.stale)header.append(notice('The source material has changed',String(current.stale)+' The displayed snapshot and findings may be stale.','warning'));
    if(current?.accepted)header.append(notice('Accepted interpretation recorded','This records a requirements review. It does not establish product acceptance, assertion coverage or passing tests.'));
  }
  function tabCount(id){return ({artifacts:run()?.documents.length,criteria:state.draft?.requirements.length,tests:state.detail?.reports.tests.length,mutations:state.detail?.reports.mutations.length})[id];}
  function renderTabs(){
    const bar=$('#tab-bar');bar.hidden=!state.detail;bar.replaceChildren();if(!state.detail)return;
    tabs.forEach(([id,title],index)=>bar.append(node('button',{type:'button',class:'tab',id:'tab-'+id,role:'tab','aria-selected':String(state.tab===id),'aria-controls':'view-panel',tabindex:state.tab===id?'0':'-1',onClick:()=>selectTab(id),onKeydown:event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();selectTab(tabs[next][0],true);}}},title,tabCount(id)!==undefined?node('small',{},tabCount(id)):null)));
    $('#view-panel').setAttribute('role','tabpanel');$('#view-panel').setAttribute('aria-labelledby','tab-'+state.tab);
  }
  function renderWelcome(){
    return node('div',{class:'crm-overview'},node('div',{class:'crm-welcome'},node('div',{},node('div',{class:'eyebrow'},'PLAYWRIGHT AGENT / REPORT VIEWER'),node('h1',{},'Your recorded evidence, in view.'),node('p',{},'Inspect the saved outcome of your agent’s work: findings, source-linked criteria, traceability and recorded test or mutation results.')),node('div',{class:'crm-welcome-actions'},button('Preview the layout',()=>setPreview(true),'button secondary'))),node('div',{class:'crm-empty-next'},node('span',{class:'crm-next-icon','aria-hidden':'true'},'▤'),node('div',{},node('h2',{},state.tasks.length?'Choose a saved work item':'Start in your existing agent chat'),node('p',{},state.tasks.length?'Select a work item from the sidebar to inspect its saved outputs. Missing, blocked or partial evidence stays visible.':'Ask your existing coding agent to do the requested analysis or test work. Open this viewer afterward to inspect its saved outputs, including blocked, partial or assessment-only work.'))),state.tasks.length?renderProjectTable():null);
  }
  function taskMeta(task){const plural=(n,word)=>n+' '+word+(n===1?'':'s');return [task.criteria?plural(task.criteria,'criterion').replace('criterions','criteria'):null,task.testReports?plural(task.testReports,'test report'):null,task.mutationReports?plural(task.mutationReports,'mutation report'):null,task.status].filter(Boolean).join(' · ');}
  function renderProjectTable(){return node('section',{class:'panel evidence-panel'},node('div',{class:'panel-head'},node('div',{},node('h2',{},'Work items in this project'),node('p',{},'Newest activity first. Select one to see its evidence.'))),node('div',{class:'table-wrap'},node('table',{class:'evidence-table'},node('thead',{},node('tr',{},...['Work item','State','Test reports','Mutation reports','Criteria','Last activity'].map(h=>node('th',{scope:'col'},h)))),node('tbody',{},...state.tasks.map(task=>node('tr',{},node('td',{},button(task.id,()=>selectTask(task.id),'button quiet small task-link')),node('td',{},badge(task.status,task.status==='No saved evidence'||task.status==='Evidence unavailable'?'warning':'outline')),node('td',{},task.testReports),node('td',{},task.mutationReports),node('td',{},task.criteria||'—'),node('td',{},task.updatedAt?date(task.updatedAt):'—')))))));}
  function svgNode(tag,attributes={},...children){const element=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attributes))element.setAttribute(key,String(value));for(const child of children)element.append(child instanceof Node?child:document.createTextNode(String(child)));return element;}
  function ring(groups,available,total,label){
    const titleId='chart-title-'+(++fieldId),circumference=2*Math.PI*55;
    const graphic=svgNode('svg',{viewBox:'0 0 150 150',class:'crm-ring',role:'img','aria-labelledby':titleId},svgNode('title',{id:titleId},available?label+': '+groups.map(group=>group.label+' '+group.value).join(', '):'No recorded '+label.toLowerCase()+' data'),svgNode('circle',{cx:75,cy:75,r:55,fill:'none',stroke:'#eaf0f3','stroke-width':16}));
    let offset=0;for(const [index,group]of groups.entries()){if(!available||!total||!group.value)continue;const length=circumference*group.value/total;graphic.append(svgNode('circle',{cx:75,cy:75,r:55,fill:'none',stroke:group.color||chartColors[index%chartColors.length],'stroke-width':16,'stroke-dasharray':length+' '+circumference,'stroke-dashoffset':-offset,transform:'rotate(-90 75 75)'}));offset+=length;}
    graphic.append(svgNode('text',{x:75,y:74,'text-anchor':'middle',class:'crm-ring-value'},available?total:'—'),svgNode('text',{x:75,y:94,'text-anchor':'middle',class:'crm-ring-label'},label));
    return graphic;
  }
  function legend(groups,available,onSelect){return node('div',{class:'crm-legend'},...groups.map((group,index)=>node(onSelect?'button':'div',{type:onSelect?'button':undefined,class:'crm-legend-row'+(onSelect?' crm-outcome-action':''),onClick:onSelect?()=>onSelect(group):undefined,'aria-label':onSelect?'Inspect '+group.label+' · '+(available?group.value:'no evidence attached'):undefined},svgNode('svg',{width:8,height:8,viewBox:'0 0 8 8','aria-hidden':'true'},svgNode('circle',{cx:4,cy:4,r:4,fill:group.color||chartColors[index%chartColors.length]})),node('span',{},group.label),node('strong',{},available?group.value:'—'))));}
  function chartHeader(title,qualifier,preview=false){return node('div',{class:'crm-chart-heading'},node('div',{},node('h2',{},title),node('p',{},qualifier)),preview?badge('Illustrative','warning'):null);}
  function barChart(groups,available,onSelect,scale){const max=Math.max(1,scale??Math.max(...groups.map(group=>group.value||0)));return node('div',{class:'crm-bars'},...groups.map((group,index)=>node(onSelect?'button':'div',{type:onSelect?'button':undefined,class:'crm-bar-row'+(onSelect?' crm-outcome-action':''),onClick:onSelect?()=>onSelect(group):undefined,'aria-label':onSelect?'Inspect '+group.label+' faults · '+(available?group.value:'no evidence attached'):undefined},node('div',{class:'crm-bar-label'},node('span',{},group.label),node('strong',{},available?(group.value??0)+(scale?' · '+percent(group.value||0,max):''):'—')),svgNode('svg',{viewBox:'0 0 300 7',preserveAspectRatio:'none','aria-hidden':'true'},svgNode('rect',{width:300,height:7,rx:3.5,fill:'#eaf0f3'}),svgNode('rect',{width:available?300*(group.value||0)/max:0,height:7,rx:3.5,fill:group.color||chartColors[index%chartColors.length]})))));}
  const percent=(value,total)=>total?Math.round(100*value/total)+'%':'—';
  const executedAt=report=>report.recordedAt||report.importedAt;
  // Execution time first (import time only as fallback); ties stay deterministic and every report remains listed.
  function ordered(reports){return reports.slice().sort((a,b)=>(Date.parse(executedAt(b))||0)-(Date.parse(executedAt(a))||0)||String(a.id).localeCompare(String(b.id)));}
  function newest(reports){return ordered(reports)[0]||null;}
  function chosen(detail,kind){const reports=detail?.reports[kind]||[],id=state.overviewReport?.[kind];return reports.find(report=>report.id===id)||newest(reports);}
  function testFacts(report){
    const tests=Array.isArray(report?.tests)?report.tests:[],complete=report&&tests.length===report.counts.total;
    const passed=complete?tests.filter(test=>test.outcome==='expected'&&test.expectedStatus==='passed').length:null;
    return {passed,expectedFailures:passed===null?null:report.counts.expected-passed,...report?.counts};
  }
  function mutationFacts(report){
    const c=report?.counts||{},conclusive=(c.killed||0)+(c.survived||0),baselines=report?.baselines||[];
    const gates=[['Two green baselines',baselines.length>=2&&baselines.every(b=>b.status==='passed'&&!b.failed&&!b.errors)],['Restored green',report?.restored==='passed'],['Original unchanged',Boolean(report?.originalUnchanged)]];
    return {...c,conclusive,score:conclusive?c.killed/conclusive:null,gates,suiteSize:baselines[0]?.tests??null};
  }
  function glanceTile({label,value,sub,tone='',action,detail}){return node('article',{class:'glance-tile '+tone},node('span',{class:'glance-label'},label),node('strong',{class:'glance-value'},value),sub?node('p',{class:'glance-sub'},sub):null,detail?node('p',{class:'glance-detail'},detail):null,action||null);}
  function renderGlance(detail,{preview,draft}){
    const current=detail?.run,test=chosen(detail,'tests'),mutation=chosen(detail,'mutations'),analysis=detail?.analysis??current?.analysis;
    const requirements=draft?.requirements||[],linked=requirements.filter(r=>r.sources.some(ref=>ref.quote?.trim())).length,open=draft?.questions.filter(q=>!q.resolution?.trim()).length||0;
    const t=testFacts(test),m=mutationFacts(mutation),testCount=detail?.reports.tests.length||0,mutationCount=detail?.reports.mutations.length||0;
    const of=(n,kind)=>n>1?'Showing 1 of '+n+' '+kind+' · see table below':null;
    const tiles=[
     glanceTile({label:'Test execution',tone:!test?'muted':t.unexpected?'bad':t.flaky?'warn':'good',value:!test?'Not attached':t.passed!==null?t.passed+' / '+t.total+' passed':t.expected+' / '+t.total+' expected',sub:test?[t.unexpected+' unexpected',t.flaky+' flaky',t.skipped+' skipped',t.expectedFailures?t.expectedFailures+' expected failures':null].filter(Boolean).join(' · '):'No Playwright JSON report saved',detail:of(testCount,'reports'),action:test?button('Inspect tests →',()=>openInsight('tests',{reportId:test.id}),'button quiet small'):null}),
     glanceTile({label:'Mutation sensitivity',tone:!mutation?'muted':m.score===null?'warn':m.survived?'warn':'good',value:!mutation?'Not attached':m.conclusive?m.killed+' / '+m.conclusive+' killed':'No conclusive faults',sub:mutation?(m.score!==null?'Score '+percent(m.killed,m.conclusive)+' of conclusive faults':'Score unavailable')+' · '+m.requested+' requested'+(m.requested-m.conclusive?' · '+(m.requested-m.conclusive)+' not conclusive':''):'No mutation campaign saved',detail:of(mutationCount,'campaigns'),action:mutation?button('Inspect faults →',()=>openInsight('mutations',{reportId:mutation.id}),'button quiet small'):null}),
     glanceTile({label:'Requirements',tone:!current?'muted':open||linked<requirements.length?'warn':'good',value:current?linked+' / '+requirements.length+' source-linked':'No intake',sub:current?(current.accepted?'Interpretation accepted':current.reviewed?'Draft validated':'Interpretation unreviewed')+' · '+open+' open question'+(open===1?'':'s'):'Criteria and matrix were not recorded',action:current?button('Inspect criteria →',()=>openInsight('criteria'),'button quiet small'):null}),
     glanceTile({label:'Agent findings',tone:!analysis?'muted':analysis.stale?'warn':'',value:analysis?(analysis.stale?'Stale':'Recorded'):'Not recorded',sub:analysis?date(analysis.recordedAt):'No findings file saved',detail:analysis?.binding==='task'?'Task-level; source freshness not checked':null})
    ];
    return node('section',{class:'glance','aria-label':'Evidence at a glance'},...tiles,preview?node('p',{class:'glance-note'},badge('Illustrative','warning'),' Fictional values.'):null);
  }
  function renderEvidenceTable(detail,{preview}){
    const rows=[...ordered(detail?.reports.tests||[]).map(report=>({kind:'tests',report})),...ordered(detail?.reports.mutations||[]).map(report=>({kind:'mutations',report}))];
    const section=node('section',{class:'panel evidence-panel'},node('div',{class:'panel-head'},node('div',{},node('h2',{},'Attached evidence'),node('p',{},'Every saved report, listed separately. Reports are never merged; pick which one the charts show.'))));
    if(!rows.length){section.append(node('p',{class:'muted'},'No Playwright or mutation report is attached to this work item. Nothing is shown as passed.'));return section;}
    const dup=['tests','mutations'].filter(kind=>(detail.reports[kind]||[]).length>1);
    if(dup.length)section.append(notice('More than one report of a kind','This work item has '+dup.map(kind=>detail.reports[kind].length+(kind==='tests'?' Playwright reports':' mutation campaigns')).join(' and ')+'. They may cover different suites or applications. Check each row before quoting a number.','warning'));
    const head=['Kind','Report','Executed','Result','Gates','',''];
    const table=node('table',{class:'evidence-table'},node('thead',{},node('tr',{},...head.map(h=>node('th',{scope:'col'},h)))),node('tbody',{},...rows.map(({kind,report})=>{
     const isTests=kind==='tests',active=chosen(detail,kind)?.id===report.id;
     let result,gates;
     if(isTests){const t=testFacts(report);result=(t.passed!==null?t.passed+' / '+t.total+' passed':t.expected+' / '+t.total+' expected')+(t.unexpected?' · '+t.unexpected+' unexpected':'')+(t.flaky?' · '+t.flaky+' flaky':'');gates=report.reportErrorCount?badge(report.reportErrorCount+' runner errors','bad'):badge('No runner errors','good');}
     else{const m=mutationFacts(report);result=m.killed+' / '+m.conclusive+' killed'+(m.score!==null?' ('+percent(m.killed,m.conclusive)+')':'')+' · suite of '+(m.suiteSize??'?')+(m.suiteSize===1?' test':' tests');gates=node('span',{class:'gate-list'},...m.gates.map(([name,ok])=>badge((ok?'✓ ':'✕ ')+name,ok?'good':'bad')));}
     return node('tr',{class:active?'active':''},node('td',{},badge(isTests?'Playwright':'Mutation','outline')),node('td',{},node('strong',{},report.name),node('small',{class:'muted block'},isTests?'ID '+String(report.id).slice(0,8):'Run '+String(report.runId).slice(0,8))),node('td',{},date(executedAt(report)),report.recordedAt?null:node('small',{class:'muted block'},'import time; run time not recorded')),node('td',{},result),node('td',{},gates),
      node('td',{},active?badge('In charts','good'):button('Show in charts',()=>{state.overviewReport={...state.overviewReport,[kind]:report.id};render();},'button quiet small')),
      node('td',{},button('Inspect →',()=>openInsight(kind,{reportId:report.id}),'button secondary small')));
    })));
    section.append(node('div',{class:'table-wrap'},table));
    if(preview)section.append(node('p',{class:'muted'},'Fictional rows.'));
    return section;
  }
  function renderDashboard(detail,{preview=false,draft=detail?.run?.draft,analysisNode=null}={}){
    const current=detail?.run,hasIntake=Boolean(current),requirements=draft?.requirements||[],documents=current?.documents||[],test=chosen(detail,'tests'),mutation=chosen(detail,'mutations');
    const linked=requirements.filter(requirement=>requirement.sources.some(ref=>ref.quote?.trim())).length;
    const t=testFacts(test),m=mutationFacts(mutation);
    const testGroups=[{label:'Passed',value:t.passed??t.expected,color:'#128775',filter:'expected'},...(t.expectedFailures?[{label:'Expected failures',value:t.expectedFailures,color:'#699eb1',filter:'expected'}]:[]),{label:'Unexpected',value:t.unexpected,color:'#bb6570',filter:'unexpected'},{label:'Flaky',value:t.flaky,color:'#737dad',filter:'flaky'},{label:'Skipped',value:t.skipped,color:'#d4a14b',filter:'skipped'}];
    const testsCard=node('section',{class:'crm-chart-card'},chartHeader('Test outcomes',test?test.name+' · run '+date(executedAt(test)):'No Playwright report attached',preview),node('div',{class:'crm-test-chart'},ring(testGroups,Boolean(test),t.total||0,'tests'),legend(testGroups,Boolean(test),group=>openInsight('tests',{reportId:test?.id,filter:group.filter}))),node('p',{class:'crm-evidence-note'},'A pass shows the run was green, not that assertions cover a criterion.'),button('Explore test outcomes →',()=>openInsight('tests',{reportId:test?.id}),'button quiet small crm-insight-link'));
    const mutationGroups=[{label:'Killed',value:m.killed,color:'#128775'},{label:'Survived',value:m.survived,color:'#d4a14b'},{label:'Inconclusive',value:m.inconclusive,color:'#8a9eac'},{label:'Not activated',value:m.notActivated,color:'#699eb1'},{label:'Invalid',value:m.invalid,color:'#bb6570'},{label:'Not run',value:m.notRun,color:'#a9b6bf'}].filter(group=>!mutation||group.value||['Killed','Survived'].includes(group.label));
    const mutationFilter=label=>({'Killed':'killed','Survived':'survived','Inconclusive':'inconclusive','Not activated':'not_activated','Invalid':'invalid_mutation','Not run':'not_run'}[label]);
    const mutationCard=node('section',{class:'crm-chart-card'},chartHeader('Mutation outcomes',mutation?mutation.name+' · run '+String(mutation.runId).slice(0,8)+' · '+date(executedAt(mutation)):'No mutation campaign attached',preview),mutation?node('div',{class:'score-line'},node('strong',{},m.score===null?'—':percent(m.killed,m.conclusive)),node('span',{},'mutation score · killed ÷ (killed + survived)')):null,mutation?barChart(mutationGroups,true,group=>openInsight('mutations',{reportId:mutation?.id,filter:mutationFilter(group.label)}),m.requested):node('p',{class:'crm-chart-empty'},'No mutation campaign saved. Mutation testing is optional; see the mutation guide to add one.'),mutation?node('div',{class:'gate-list'},...m.gates.map(([name,ok])=>badge((ok?'✓ ':'✕ ')+name,ok?'good':'bad'))):null,button('Explore mutation outcomes →',()=>openInsight('mutations',{reportId:mutation?.id}),'button quiet small crm-insight-link'));
    const activity=[];if(current)activity.push({title:'Intake captured',text:documents.length+' saved source files in this version',at:current.createdAt});const analysis=detail?.analysis??current?.analysis;if(analysis)activity.push({title:'Findings recorded',text:analysis.binding==='task'?'Task-level findings':'Intake-bound analysis',at:analysis.recordedAt});for(const report of detail?.reports.tests||[])activity.push({title:'Playwright report imported',text:report.name,at:report.importedAt});for(const report of detail?.reports.mutations||[])activity.push({title:'Mutation report imported',text:report.name+' · run '+String(report.runId).slice(0,8),at:report.importedAt});
    activity.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
    const activityCard=node('section',{class:'crm-chart-card'},chartHeader('Activity',preview?'Illustrative events':'Saved intake, findings and report imports',preview),activity.length?node('ol',{class:'crm-activity'},...activity.slice(0,5).map(item=>node('li',{},node('span',{class:'crm-activity-dot','aria-hidden':'true'}),node('div',{},node('h3',{},item.title),node('p',{},item.text),node('time',{datetime:item.at},date(item.at)))))):node('p',{class:'crm-chart-empty'},'No recorded events.'),button('Explore activity →',()=>openInsight('activity'),'button quiet small crm-insight-link'));
    const hasFindings=Boolean(detail?.analysis||current?.analysis);
    const parts=[renderGlance(detail,{preview,draft}),renderEvidenceTable(detail,{preview}),hasFindings||hasIntake?analysisNode:null,node('div',{class:'crm-chart-grid'},testsCard,mutationCard,activityCard)];
    if(hasIntake){
      const stages=[['Documents',documents.length,'Saved source files'],['Criteria',requirements.length,'Expected outcomes'],['Traceability',linked,'Criteria linked to sources'],['Test results',test?.counts.total??null,'Tests in charted report'],['Mutations',mutation?.counts.requested??null,'Faults in charted campaign']];
      const pipeline=node('section',{class:'crm-pipeline'},node('div',{class:'crm-pipeline-heading'},node('h2',{},'The evidence pipeline'),node('span',{},preview?'Fictional example':'Selected work item')),node('div',{class:'crm-pipeline-stages'},...stages.map(([title,value,note],index)=>node('button',{type:'button',class:'crm-stage crm-stage-action'+(value!==null?' populated':''),onClick:()=>openInsight(['artifacts','criteria','traceability','tests','mutations'][index],{reportId:index===3?test?.id:index===4?mutation?.id:undefined}),'aria-label':'Inspect '+title},node('span',{class:'crm-stage-step'},String(index+1).padStart(2,'0')),node('div',{},node('h3',{},title),node('strong',{},value??'—'),node('p',{},note)),index<stages.length-1?node('span',{class:'crm-stage-arrow','aria-hidden':'true'},'→'):null))));
      const accepted=current.accepted?requirements.length:0,missing=requirements.length-linked;
      const interpretation=[{label:'Accepted interpretation',value:accepted,color:'#128775'},{label:'Draft criteria',value:current.accepted?0:linked,color:'#d4a14b'},{label:'Source quotation needed',value:current.accepted?0:missing,color:'#8a9eac'}];
      const assessmentMap=new Map();for(const row of current.matrix||[]){const value=row.Assessment?.trim()||'unknown';assessmentMap.set(value,(assessmentMap.get(value)||0)+1);}
      const assessmentColors=new Map([['supported','#128775'],['covered','#128775'],['partial','#d4a14b'],['missing','#bb6570'],['missing assertion','#bb6570'],['uncovered','#bb6570']]);
      const assessments=Array.from(assessmentMap,([label,value])=>({label,value,color:assessmentColors.get(label.toLowerCase())||'#8a9eac'}));
      const formats=new Map();for(const source of documents){const format=source.extraction.format.toUpperCase();formats.set(format,(formats.get(format)||0)+1);}
      const formatGroups=Array.from(formats,([label,value])=>({label,value}));
      const interpretationCard=node('section',{class:'crm-chart-card crm-interpretation-card'},chartHeader('Requirements & traceability','Review state and recorded matrix labels stay separate.',preview),node('div',{class:'crm-dual-charts'},node('div',{class:'crm-mini-chart'},node('h3',{},'Interpretation review'),node('div',{class:'crm-donut-layout'},ring(interpretation,true,requirements.length,'criteria'),legend(interpretation,true,group=>openInsight('criteria',{filter:group.label==='Accepted interpretation'?'accepted':group.label==='Draft criteria'?'draft':'missing'})))),node('div',{class:'crm-mini-chart'},node('h3',{},'Recorded matrix labels'),node('div',{class:'crm-donut-layout'},ring(assessments,Boolean(current.matrix?.length),current.matrix?.length||0,'matrix rows'),assessments.length?legend(assessments,true,group=>openInsight('traceability',{filter:group.label})):node('p',{class:'crm-chart-empty'},'No matrix assessments recorded.')))),node('p',{class:'crm-chart-foot'},'Matrix labels are authored by the reviewer or agent; the viewer does not re-check them against code.'));
      const formatsCard=node('section',{class:'crm-chart-card'},chartHeader('Source format mix','Recorded source documents in this intake.',preview),node('div',{class:'crm-format-ring'},ring(formatGroups,true,documents.length,'documents')),formatGroups.length?legend(formatGroups,true,group=>openInsight('artifacts',{filter:group.label})):node('p',{class:'crm-chart-empty'},'No source documents selected.'),button('Inspect source documents →',()=>openInsight('artifacts'),'button quiet small crm-insight-link'));
      parts.push(pipeline,node('div',{class:'crm-chart-grid intake-grid'},interpretationCard,formatsCard));
    }else if(detail)parts.push(node('p',{class:'intake-absent'},'No intake was recorded for this work item, so source documents, criteria and the traceability matrix are not available. That is not a coverage result.'));
    return node('div',{class:'crm-dashboard'},...parts.filter(Boolean));
  }
  function inlineText(text){const parts=[];const pattern=/(`[^`]+`|\*\*[^*]+\*\*)/g;let last=0,match;while((match=pattern.exec(text))){if(match.index>last)parts.push(text.slice(last,match.index));const value=match[0];parts.push(value.startsWith('`')?node('code',{},value.slice(1,-1)):node('strong',{},value.slice(2,-2)));last=match.index+value.length;}if(last<text.length)parts.push(text.slice(last));return parts;}
  // Minimal, DOM-built Markdown rendering for saved findings; never uses innerHTML.
  function markdown(text){
    const host=node('div',{class:'md-findings'}),lines=String(text).replace(/\r\n?/g,'\n').split('\n');let list=null,para=[],code=null;
    const flush=()=>{if(para.length){host.append(node('p',{},inlineText(para.join(' '))));para=[];}};
    for(const line of lines){
      if(code!==null){if(/^```/.test(line)){host.append(node('pre',{},code.join('\n')));code=null;}else code.push(line);continue;}
      if(/^```/.test(line)){flush();list=null;code=[];continue;}
      const heading=/^(#{1,4})\s+(.*)$/.exec(line),item=/^\s*(?:[-*]|\d+[.)])\s+(.*)$/.exec(line);
      if(heading){flush();list=null;host.append(node(heading[1].length<=2?'h3':'h4',{},inlineText(heading[2])));}
      else if(item){flush();if(!list){list=node('ul',{});host.append(list);}list.append(node('li',{},inlineText(item[1])));}
      else if(!line.trim()){flush();list=null;}
      else{list=null;para.push(line.trim());}
    }
    if(code!==null)host.append(node('pre',{},code.join('\n')));flush();
    return host;
  }
  function collapsible(content,long){if(!long)return content;const wrap=node('div',{class:'collapsible collapsed'},content);const toggle=button('Show full findings',()=>{const collapsed=wrap.classList.toggle('collapsed');toggle.textContent=collapsed?'Show full findings':'Collapse findings';toggle.setAttribute('aria-expanded',String(!collapsed));},'button quiet small collapse-toggle');toggle.setAttribute('aria-expanded','false');return node('div',{},wrap,toggle);}
  function setPreview(value){state.preview=value;closeMenu();$('#error-banner').hidden=true;render();notify(value?'Illustrative layout preview opened. No project evidence was created.':'Returned to the recorded project evidence.');}
  function renderPreview(){
    document.body.classList.add('preview-mode');$('#project-name').textContent='Illustrative layout';$('#project-root').textContent='Fictional data in this browser view only.';$('#task-count').textContent='1 example';$('#refresh').disabled=true;$('#preview-toggle').textContent='Exit preview';$('#preview-toggle').setAttribute('aria-pressed','true');$('.local-badge').replaceChildren(node('span',{class:'local-dot','aria-hidden':'true'}),'Layout preview');
    $('#task-list').replaceChildren(node('div',{class:'task-button active'},node('span',{class:'task-icon','aria-hidden':'true'},'▤'),node('span',{},node('strong',{},illustrativeDetail.taskId),node('small',{},'Fictional receiving evidence'))));
    $('#work-item-header').replaceChildren(node('div',{class:'preview-banner'},node('div',{},node('strong',{},'Illustrative layout preview — not project evidence'),node('p',{},'Fictional values show the report layout. These records were not executed or imported.')),button('Exit preview',()=>setPreview(false),'button secondary small')),node('div',{class:'page-heading'},node('div',{},node('div',{class:'breadcrumb'},'FICTIONAL WORK ITEM / RECEIVING EVIDENCE'),node('h1',{},illustrativeDetail.taskId),node('p',{class:'muted'},'A client-only example of the recorded evidence overview.'))));
    $('#tab-bar').hidden=false;$('#tab-bar').replaceChildren(...tabs.map(([id,title])=>node('button',{type:'button',class:'tab',role:'tab','aria-selected':String(id==='overview'),disabled:id!=='overview',tabindex:id==='overview'?'0':'-1'},title)));
    $('#context-panel').hidden=true;$('#context-panel').replaceChildren();$('#workspace-grid').classList.add('no-context');$('#view-panel').removeAttribute('aria-labelledby');$('#view-panel').setAttribute('aria-label','Illustrative layout preview');$('#view-panel').replaceChildren(renderDashboard(illustrativeDetail,{preview:true,analysisNode:renderAgentAnalysis(illustrativeDetail,{preview:true})}));
  }
  function renderContext(){
    const host=$('#context-panel'),show=Boolean(state.detail&&state.tab!=='overview');host.hidden=!show;host.replaceChildren();$('#workspace-grid').classList.toggle('no-context',!show);if(!show)return;
    const current=run(),source=sourceFor(state.sourceId);
    const card=node('section',{class:'context-card'},node('div',{class:'eyebrow'},'RECORDED CONTEXT'),node('h2',{},source?source.name:'This work item'));
    if(source){
      const rows=[['Format',source.extraction.format.toUpperCase()],['Size',bytes(source.bytes)],['Text segments',source.extraction.segments.length],['Selected sheet',source.extraction.selection?.sheet||'All available content']];
      card.append(...rows.map(([key,value])=>node('div',{class:'context-row'},node('span',{},key),node('strong',{},value))),download('Download original ↓',docUrl(source)),node('details',{class:'details'},node('summary',{},'Source fingerprint'),node('code',{class:'hash'},source.sha256)));
    }else{
      card.append(node('div',{class:'context-row'},node('span',{},'Documents'),node('strong',{},current?.documents.length??'Not supplied')),node('div',{class:'context-row'},node('span',{},'Unresolved questions'),node('strong',{},current?unresolved().length:'Not assessed')),node('div',{class:'context-row'},node('span',{},'Requirements'),node('strong',{},current?.accepted?'Accepted interpretation':current?'Review not accepted':'Not recorded')));
    }
    if(current)card.append(node('dl',{},node('dt',{},'Intake recorded'),node('dd',{},date(current.createdAt)),node('dt',{},'Task intent'),node('dd',{},goal(current.goal))));
    host.append(card,node('section',{class:'context-card'},node('div',{class:'eyebrow'},'READ THE EVIDENCE SEPARATELY'),node('h2',{},'Keep the source in view'),node('p',{},'A recorded requirements review does not mark the application or its tests as passed. Matrix labels and report outcomes remain separate evidence.')),node('div',{class:'context-note'},node('strong',{},'Read-only report viewer'),'Changes and follow-up work belong in your existing agent chat. This view reads saved project outputs.'));
  }
  function renderOverview(){
    const current=run(),notes=node('div',{});
        if(current?.blockingDocuments)notes.append(notice('Document blockers recorded',current.blockingDocuments+' source document issue'+(current.blockingDocuments===1?' remains':'s remain')+' unresolved. Inspect the recorded extraction issues; no missing content is assumed.','warning'));
    return node('div',{},notes,renderDashboard(state.detail,{draft:state.draft,analysisNode:renderAgentAnalysis(state.detail)}));
  }
  function renderArtifacts(){
    if(!run()?.documents.length)return empty('No source documents recorded','No source snapshot is linked to this work item. Existing test or mutation reports remain available in their tabs.');
    const current=run(),selected=sourceFor(state.sourceId)||current.documents[0];
    const cards=current.documents.map(source=>node('article',{class:'source-card'+(selected?.id===source.id?' selected':'')},node('div',{class:'source-card-top'},node('span',{class:'file-mark'},source.extraction.format),node('div',{},node('h3',{},source.name),node('p',{class:'source-card-meta'},bytes(source.bytes)+' · '+source.extraction.segments.length+' extracted segments'+(source.extraction.selection?.sheet?' · '+source.extraction.selection.sheet:'')))),node('div',{class:'source-actions'},button(selected?.id===source.id?'Viewing text':'Inspect text',()=>{state.sourceId=source.id;render();},'button secondary small'),download('Original ↓',docUrl(source)),source.extraction.issues.some(issue=>issue.severity==='blocking')?badge('Extraction blocked','bad'):badge('Captured','outline')),source.extraction.issues.length?node('div',{class:'source-issues'},...source.extraction.issues.map(issue=>node('div',{class:'source-issue '+issue.severity},node('strong',{},issue.severity==='blocking'?'Needs action':'Review'),issue.message))):null));
    const preview=selected?node('section',{class:'panel source-text-panel'},node('div',{class:'panel-head'},node('div',{},node('h2',{},'Extracted source text'),node('p',{},selected.name+' · Recorded snapshot for this intake version'))),node('div',{class:'source-preview'},...(selected.extraction.segments.length?selected.extraction.segments.map(segment=>node('section',{class:'segment',id:'source-segment-'+segment.id,tabindex:'-1'},node('div',{class:'segment-label'},locator(segment.locator)),node('pre',{},segment.text||'No readable text in this segment.'))):[node('p',{class:'muted'},'No text was extracted. Review the document issues above.')]))) : null;
    return node('div',{},node('div',{class:'section-title'},node('div',{},node('h2',{},'The original context'),node('p',{},'Inspect the recorded extraction issues, source snapshots and exact quotations.'))),node('div',{class:'stack'},...cards),preview);
  }
  function reference(ref){
    const source=sourceFor(ref.sourceId),segment=segmentFor(ref);
    return node('div',{class:'source-reference'},node('div',{class:'reference-head'},node('span',{},(source?.name||'Unknown source')+' · '+locator(segment?.locator)),button('Open source',()=>{state.sourceId=ref.sourceId;selectTab('artifacts');const target=document.getElementById('source-segment-'+ref.segmentId);if(target){target.focus();target.scrollIntoView({block:'center'});}},'button quiet small',!source)),node('blockquote',{},ref.quote));
  }
  function renderCriterion(requirement){
    const sources=requirement.sources||[],links=requirement.suppliedLinks||[],card=node('article',{class:'criteria-card'},node('div',{class:'criterion-summary'},node('div',{class:'criterion-top'},node('div',{},node('span',{class:'criterion-id'},requirement.id||'ID not recorded'),badge(requirement.journey||'Journey not recorded','outline'),requirement.critical?badge('Critical','warning'):null)),node('p',{class:'criterion-text'},requirement.criterion||'Expected outcome not recorded.'),node('div',{class:'criterion-bottom'},node('span',{},sources.length+' recorded source quotation'+(sources.length===1?'':'s')),node('span',{},'Coverage is recorded separately in the matrix'))));
    if(sources.length)card.append(node('details',{class:'details criterion-reference-details'},node('summary',{},'Inspect source quotations'),...sources.map(reference)));
    else card.append(node('p',{class:'viewer-record-note'},'No source quotation is recorded for this criterion.'));
    if(links.length)card.append(node('p',{class:'viewer-record-note'},'Supplied RTM references: '+links.map(link=>link.testId+(link.status?' ('+link.status+')':'')).join(', ')+'. These are document claims, not verified test coverage.'));
    return card;
  }
  function renderCriteria(){
    if(!run())return empty('No source-linked criteria recorded','This work item has no linked intake snapshot. Available reports do not establish missing requirements or coverage.');
    const current=run(),requirements=state.draft?.requirements||[],questions=state.draft?.questions||[],content=node('div',{},node('div',{class:'section-title'},node('div',{},node('h2',{},'Recorded expected behavior'),node('p',{},'Source-linked requirements and clarification decisions from the saved intake.'))),notice('Recorded interpretation state',current.accepted?'This interpretation was accepted. Acceptance of the interpretation does not establish that the product meets it.':current.reviewed?'The draft was validated; no accepted interpretation is recorded.':'No reviewed or accepted interpretation is recorded.',''));
    if(current.blockingDocuments)content.append(notice('Source extraction blockers',current.blockingDocuments+' recorded document blocker'+(current.blockingDocuments===1?'':'s')+' remain unresolved. Missing source content stays unknown.','warning'));
    if(!requirements.length)content.append(empty('No criteria saved','No source-linked acceptance criteria were recorded for this intake version.'));
    content.append(...requirements.map(renderCriterion));
    if(questions.length){const section=node('section',{class:'questions'},node('div',{class:'section-title'},node('div',{},node('h2',{},'Recorded clarification questions'),node('p',{},'Unresolved questions remain visible alongside any saved decision and source.'))));for(const question of questions)section.append(node('article',{class:'question'+(question.resolution?.trim()?' resolved':'')},node('div',{class:'viewer-question-heading'},node('h3',{},question.message),badge(question.resolution?.trim()?'Resolution recorded':'Unresolved',question.resolution?.trim()?'good':'warning')),node('pre',{class:'viewer-resolution'},question.resolution||'No resolution recorded.'),node('p',{class:'viewer-record-note'},'Source references: '+((question.sourceIds||[]).map(id=>sourceFor(id)?.name||id).join(', ')||'Not recorded'))));content.append(section);}
    return content;
  }
  function renderTraceability(){
    if(!run()?.matrix?.length)return empty('No recorded traceability matrix','No matrix rows were saved for this intake. Test names, passing reports and supplied RTM links do not establish assertion coverage.');
    const records=run().matrix;
    const table=node('table',{},node('thead',{},node('tr',{},...['Criterion','Scenario / state','Test / assertion','Recorded assessment','Source / supplied links'].map(label=>node('th',{scope:'col'},label)))),node('tbody',{},...records.map(record=>node('tr',{},node('td',{},node('strong',{},record['Requirement ID']||'ID not recorded'),node('p',{class:'muted'},record.Criterion||'Criterion not recorded')),node('td',{},record.Scenario||'Scenario not recorded',node('p',{class:'muted'},'Journey: '+(record.Journey||'Not recorded')),node('p',{class:'muted'},'Role: '+(record.Role||'Not recorded')+' · State: '+(record.State||'Not recorded'))),node('td',{},node('strong',{},record.Test||'Test not recorded'),node('p',{class:'muted'},record.Assertion||'Assertion not recorded')),node('td',{},badge(record.Assessment||'unknown','outline'),node('p',{class:'muted'},'Runtime: '+(record.Runtime||'not run'))),node('td',{},node('details',{class:'details'},node('summary',{},'Source references'),node('pre',{class:'source-quote'},record['Source refs']||'No source references recorded')),node('p',{class:'muted'},'Supplied test IDs: '+(record['Supplied test IDs (historical)']||'None')),record['Supplied statuses (historical)']?node('p',{class:'muted'},'Supplied statuses: '+record['Supplied statuses (historical)']):null)))));
    return node('div',{},node('div',{class:'section-title'},node('div',{},node('h2',{},'From requirement to observed evidence'),node('p',{},'Saved criterion, scenario, assertion and runtime records from this intake version.')),download('Matrix CSV ↓',runUrl()+'/matrix.csv')),notice('Recorded matrix evidence','These are the values in this intake version’s matrix.csv. The viewer does not independently verify coverage or execution. Attached reports remain separate evidence.'),node('div',{class:'table-wrap'},table));
  }
  function reportHeader(report){return node('div',{},node('div',{class:'panel-head report-heading'},node('div',{},node('h2',{},report.name),node('div',{class:'report-meta'},'Run time: '+date(report.recordedAt)+' · Imported '+date(report.importedAt))),download('Original JSON ↓',taskUrl('/reports/'+encodeURIComponent(report.id)))));}
  function reportLimits(report){return node('div',{class:'report-foot'},node('p',{},'Recorded report evidence. Viewing a report does not execute tests, verify requirement coverage or approve the product. Check its task and intake association before relying on it.'),report.limitations?.length?node('details',{class:'details'},node('summary',{},'Report limitations'),node('ul',{},...report.limitations.map(limit=>node('li',{},limit)))):null);}
  function renderReportCards(host,kind){
    const isTests=kind==='tests',reports=state.detail.reports[kind];host.replaceChildren();
    if(!reports.length)host.append(empty(isTests?'No test execution report attached':'No mutation campaign attached','No report of this kind was saved for this work item. No execution outcome is assumed.'));
    for(const report of reports){
      const fields=isTests?[[report.counts.expected,'Expected outcomes'],[report.counts.unexpected,'Unexpected outcomes'],[report.counts.skipped,'Skipped'],[report.counts.flaky,'Flaky'],[report.counts.total,'Total tests']]:[[report.counts.requested,'Requested faults'],[report.counts.killed,'Killed'],[report.counts.survived,'Survived'],[report.counts.inconclusive,'Inconclusive'],[report.counts.notActivated,'Not activated'],[report.counts.invalid,'Invalid'],[report.counts.notRun,'Not run']];
      const explore=button('Explore outcomes →',()=>openInsight(kind,{reportId:report.id}),'button secondary');
      explore.setAttribute('aria-label','Explore outcomes in '+report.name);
      host.append(node('article',{class:'report-card'},reportHeader(report),node('div',{class:'report-stats'},...fields.map(([value,label])=>node('div',{class:'report-stat'},node('small',{},label),node('strong',{},value)))),explore,reportLimits(report)));
    }
  }
  function renderReportTab(kind){
    const isTests=kind==='tests',reports=node('div',{id:'report-list'});renderReportCards(reports,kind);
    return node('div',{},node('div',{class:'section-title'},node('div',{},node('h2',{},isTests?'Playwright execution evidence':'Behavioral mutation evidence'),node('p',{},'Explore saved report outcomes, search records and inspect individual evidence.'))),reports);
  }
  function renderTestReports(){return renderReportTab('tests');}
  function renderMutationReports(){return renderReportTab('mutations');}
  function render(){
    if(state.preview){renderPreview();return;}
    document.body.classList.remove('preview-mode');$('#refresh').disabled=state.busy;$('#view-panel').setAttribute('aria-label','Work item content');$('#preview-toggle').textContent='Layout preview';$('#preview-toggle').setAttribute('aria-pressed','false');$('.local-badge').replaceChildren(node('span',{class:'local-dot','aria-hidden':'true'}),embedded?'Static snapshot · '+date(embedded.generatedAt):'Project local');if(embedded)$('#refresh').disabled=true;
    if(state.project){$('#project-name').textContent=state.project.name;$('#project-root').textContent=state.project.root;}
    renderTasks();renderHeader();renderTabs();renderContext();
    const panel=$('#view-panel');
    if(!state.detail){panel.removeAttribute('role');panel.removeAttribute('aria-labelledby');panel.replaceChildren(renderWelcome());return;}
    const renderer={overview:renderOverview,artifacts:renderArtifacts,criteria:renderCriteria,traceability:renderTraceability,tests:renderTestReports,mutations:renderMutationReports};
    panel.replaceChildren((renderer[state.tab]||renderOverview)());
  }

  $('#close-insight').addEventListener('click',()=>$('#insight-dialog').close());
  $('#insight-dialog').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();$('#insight-dialog').close();}});
  $('#insight-dialog').addEventListener('close',()=>{const opener=insight?.opener;insight=null;if(opener?.isConnected)opener.focus();});
  $('#preview-toggle').addEventListener('click',()=>setPreview(!state.preview));
  if(embedded)$('.brand').addEventListener('click',event=>{event.preventDefault();state.detail=null;state.draft=null;state.preview=false;history.replaceState(null,'',location.pathname);render();});
  $('#menu-toggle').addEventListener('click',()=>{const open=!$('#sidebar').classList.contains('mobile-open');if(!open){closeMenu();return;}$('#sidebar').classList.add('mobile-open');$('.app-shell').inert=true;$('#sidebar-scrim').hidden=false;$('#menu-toggle').setAttribute('aria-expanded','true');$('#menu-toggle').setAttribute('aria-label','Close work item navigation');$('#nav-close').focus();});
  $('#nav-close').addEventListener('click',closeMenu);
  $('#sidebar-scrim').addEventListener('click',closeMenu);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
  window.addEventListener('resize',()=>{if(!window.matchMedia('(max-width:760px)').matches)closeMenu();});
  $('#refresh').addEventListener('click',async()=>{
    if(state.busy||state.preview)return;state.busy=true;$('#refresh').disabled=true;clearError();
    try{if(!state.project){await start();return;}await reloadTasks();if(state.detail)await selectTask(state.detail.taskId,run()?.id);else render();notify('Saved work items and results refreshed.');}
    catch(error){showError(error);}finally{state.busy=false;$('#refresh').disabled=state.preview;}
  });
  async function start(){
    render();try{const session=await api('/api/session');state.project=session.project;$('#project-name').textContent=session.project.name;$('#project-root').textContent=session.project.root;await reloadTasks();const params=new URLSearchParams(location.hash.slice(1));const selected=params.get('task')||embedded?.initialTask;if(tabs.some(([id])=>id===params.get('tab')))state.tab=params.get('tab');if(selected)await selectTask(selected,params.get('run'));else render();}catch(error){$('#project-name').textContent='Connection unavailable';showError(error);$('#task-list').replaceChildren(node('p',{class:'sidebar-empty'},'Check that the local report viewer is running, then refresh.'));}
  }
  start();
})();
