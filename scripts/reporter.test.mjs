import test from 'node:test';
import assert from 'node:assert/strict';
import Reporter from '../reporter/index.mjs';

const result=(status,retry=0,errors=[])=>({status,retry,duration:7,errors});
function testCase(title,expectedStatus,outcome,results){
  return {title,expectedStatus,results,outcome:()=>outcome,titlePath:()=>['','chromium','checkout.spec.ts','checkout',title],
    location:{file:'/repo/tests/checkout.spec.ts',line:4,column:3},parent:{project:()=>({name:'chromium'})}};
}

test('reporter emits a Playwright JSON-compatible record that keeps every outcome honest',()=>{
  const reporter=new Reporter({task:'CHECKOUT-42'});
  reporter.onBegin({rootDir:'/repo/tests'},{allTests:()=>[
    testCase('passes','passed','expected',[result('passed')]),
    testCase('fails','passed','unexpected',[result('failed',0,[{message:'\u001b[31mExpected declined\u001b[39m'}])]),
    testCase('flaky','passed','flaky',[result('failed'),result('passed',1)]),
    testCase('skipped','skipped','skipped',[result('skipped')]),
    testCase('interrupted then passed','passed','expected',[result('interrupted'),result('passed',1)])
  ]});
  reporter.onError({message:'worker crashed'});
  const record=reporter.buildReport({startTime:new Date('2026-11-01T10:00:00Z'),duration:99},'/repo');
  assert.deepEqual(record.stats,{expected:2,unexpected:1,skipped:1,flaky:1,startTime:'2026-11-01T10:00:00.000Z',duration:99});
  const specs=record.suites[0].specs;
  assert.equal(specs[0].title,'checkout › passes');assert.equal(specs[0].file,'tests/checkout.spec.ts');
  assert.equal(specs[1].tests[0].results[0].errors[0].message,'Expected declined','ANSI colour codes are stripped');
  assert.deepEqual(specs[4].tests[0].results.map(r=>r.status),['passed'],'interrupted attempts are excluded like Playwright outcome()');
  assert.deepEqual(record.errors,[{message:'worker crashed'}]);
});

test('reporter does nothing when disabled for a run',()=>{
  const reporter=new Reporter();let built=false;reporter.buildReport=()=>{built=true;};
  reporter.onBegin({rootDir:'/repo'},{allTests:()=>[]});
  process.env.PLAYWRIGHT_AGENT_REPORT='off';
  try{reporter.onEnd({startTime:new Date(),duration:0});}finally{delete process.env.PLAYWRIGHT_AGENT_REPORT;}
  assert.equal(built,false);
});
