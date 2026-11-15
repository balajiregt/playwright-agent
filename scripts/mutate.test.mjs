import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {applyEdits,parseArgs,treeHash,verdict} from './mutate.mjs';

const run=(label,passed,failed=0,failedTests=[],extra={})=>({label,ok:true,passed,failed,flaky:0,skipped:0,failedTests,setupError:false,...extra});
const green=[run('b1',4),run('b2',4)];

test('a fault caught by the same test in every run is killed', () => {
  const v=verdict(green,[run('f1',3,1,['a','b']),run('f2',3,1,['a'])]);
  assert.deepEqual(v,{verdict:'killed',killedBy:['a']});
});

test('a fault that every run passes survives', () => {
  assert.equal(verdict(green,[run('f1',4),run('f2',4)]).verdict,'survived');
});

test('unhealthy baselines, partial detection and lost tests are inconclusive, never killed', () => {
  assert.equal(verdict([run('b1',4),run('b2',3,1)],[run('f1',3,1,['a']),run('f2',3,1,['a'])]).verdict,'inconclusive');
  assert.equal(verdict(green,[run('f1',3,1,['a']),run('f2',4)]).verdict,'inconclusive');
  assert.equal(verdict(green,[run('f1',0,1,['startup']),run('f2',0,1,['startup'])]).verdict,'inconclusive');
  assert.equal(verdict(green,[run('f1',3,1,['a'],{setupError:true}),run('f2',3,1,['a'])]).verdict,'inconclusive');
  assert.equal(verdict(green,[run('f1',3,1,['a']),run('f2',3,1,['b'])]).verdict,'inconclusive');
});

test('fault text must match exactly once, and a dry run writes nothing', () => {
  const dir=mkdtempSync(path.join(tmpdir(),'mutate-'));
  writeFileSync(path.join(dir,'a.js'),'x = 1; y = 1;');
  assert.match(applyEdits(dir,[{file:'a.js',find:'= 1',replace:'= 2'}]).reason,/matches 2 times/);
  assert.match(applyEdits(dir,[{file:'b.js',find:'x',replace:'y'}]).reason,/not found/);
  const before=treeHash(dir);
  assert.ok(applyEdits(dir,[{file:'a.js',find:'x = 1',replace:'x = $&2'}],{dryRun:true}).ok);
  assert.equal(treeHash(dir),before);
  assert.ok(applyEdits(dir,[{file:'a.js',find:'x = 1',replace:'x = $&2'}]).ok);
  assert.equal(readFileSync(path.join(dir,'a.js'),'utf8'),'x = $&2; y = 1;');  // replacement is literal
  assert.notEqual(treeHash(dir),before);
});

test('arguments need a project, a complete fault and at least two runs', () => {
  assert.throws(()=>parseArgs(['--file','a','--find','x','--replace','y']),/--project/);
  assert.throws(()=>parseArgs(['--project','p']),/Give a fault/);
  assert.throws(()=>parseArgs(['--project','p','--file','a','--find','x']),/file, find and replace/);
  assert.throws(()=>parseArgs(['--project','p','--file','a','--find','x','--replace','y','--runs','1']),/at least 2/);
  const o=parseArgs(['--project','p','--file','a','--find','x','--replace','y','--env','PORT=1=2','--grep','g']);
  assert.deepEqual([o.edits,o.env,o.grep,o.runs],[[{file:'a',find:'x',replace:'y'}],{PORT:'1=2'},'g',2]);
});
