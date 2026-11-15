import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildMatrix,main,parseSpec,restriction,toMarkdown} from './coverage-matrix.mjs';

const ROLES=['admin','manager','sales','viewer'];
const SPEC=`
import { ROLES } from '../data/roles';
test.describe('quotes', () => {
  test('sales cannot approve a quote', async ({ signInAs, apiAs }) => {
    await signInAs('sales');
    expect((await api.post('/api/quotes/1/approve')).status()).toBe(403);
  });
  test('a manager approves a pending quote', async ({ signInAs, quotes }) => {
    await signInAs('manager');
    await quotes.approveQuote('Q-1');
  });
  for (const role of ROLES) {
    test(\`\${role} can sign in\`, async ({ signInAs }) => { await signInAs(role); });
  }
});`;

test('restrictions name allowed roles after "only", and subjects of "cannot"', () => {
  assert.deepEqual(restriction('Only managers and admins can approve quotes.',ROLES),{allowed:['admin','manager'],denied:['sales','viewer']});
  assert.deepEqual(restriction('Viewers cannot change stages.',ROLES),{allowed:[],denied:['viewer']});
  assert.equal(restriction('The last active admin cannot be demoted.',ROLES),null);  // a state rule, not a role rule
  assert.equal(restriction('A quote total is rounded to the cent.',ROLES),null);
});

test('specs yield roles, denial checks and role loops', () => {
  const [deny,approve,loop]=parseSpec(SPEC,'quotes.spec.ts',ROLES);
  assert.deepEqual([deny.roles,deny.negative,deny.line],[['sales'],true,4]);
  assert.deepEqual([approve.roles,approve.negative],[['manager'],false]);
  assert.deepEqual(loop.roles,ROLES);  // an imported ROLES list covers every role
});

test('a role rule flags unexercised allowed roles and unchecked denials', () => {
  const tests=parseSpec(SPEC,'quotes.spec.ts',ROLES);
  const [row]=buildMatrix([{id:'QUO-APPROVE-ROLE',criterion:'Only managers and admins can approve quotes; sales see no Approve action.'}],tests,ROLES,{minScore:0.5});
  assert.equal(row.candidates[0].title,'sales cannot approve a quote');
  assert.deepEqual(row.flags,['allowed role never exercised: admin','denial never checked for: viewer']);
  const [none]=buildMatrix([{id:'X',criterion:'Invoices export to spreadsheet format.'}],tests,ROLES,{minScore:0.5});
  assert.deepEqual(none.flags,['no candidate test found']);
  assert.match(toMarkdown([row,none],{flaggedOnly:true}),/2 criteria; 2 flagged/);
});

test('criteria files may use a requirements or a criteria array, and anything else is refused', () => {
  const dir=mkdtempSync(path.join(tmpdir(),'matrix-'));
  mkdirSync(path.join(dir,'tests'));writeFileSync(path.join(dir,'tests/a.spec.ts'),SPEC);
  for(const [name,body] of [['r.json',{requirements:[{id:'A',criterion:'x'}]}],['c.json',{criteria:[{id:'A',criterion:'x'}],roleAccess:{admin:[]}}]]) {
    writeFileSync(path.join(dir,name),JSON.stringify(body));
    assert.doesNotThrow(()=>main(['--project',dir,'--criteria',path.join(dir,name),'--out',path.join(dir,'out.md')]));
  }
  writeFileSync(path.join(dir,'bad.json'),'{"items":[]}');
  assert.throws(()=>main(['--project',dir,'--criteria',path.join(dir,'bad.json')]),/requirements or criteria array/);
});
