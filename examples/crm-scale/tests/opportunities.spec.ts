import { test, expect } from '../fixtures/crm.fixture';

const STAGE_TABLE = [
  { name: 'Fabrikam pilot', stage: 'prospecting', probability: '10%', weighted: 'USD 2,000.00' },
  { name: 'Contoso expansion', stage: 'proposal', probability: '50%', weighted: 'USD 40,000.00' },
  { name: 'Northwind renewal', stage: 'negotiation', probability: '75%', weighted: 'USD 90,000.00' },
  { name: 'Northwind add-on', stage: 'won', probability: '100%', weighted: 'USD 15,000.00' },
  { name: 'Legacy migration', stage: 'lost', probability: '0%', weighted: 'USD 0.00' }
];

test.describe('opportunities', () => {
  for (const row of STAGE_TABLE) {
    test(`${row.stage} opportunities carry ${row.probability} probability`, async ({ signInAs, crm, records }) => {
      await signInAs('viewer');
      await crm.goto('/opportunities');
      const opp = crm.row('opportunities-table', row.name);
      await records.expectStage(opp, row.stage);
      await records.expectOpportunityFigures(opp, { probability: row.probability, weighted: row.weighted });
    });
  }

  test('qualification stage carries 25% probability', async ({ apiAs }) => {
    const api = await apiAs('sales');
    const updated = await (await api.post('/api/opportunities/o3/stage', { data: { stage: 'qualification' } })).json();
    expect(updated.probability).toBe(25);
    expect(updated.weighted).toBe(5000);
  });

  test('sales creates an opportunity in prospecting', async ({ signInAs, crm, records }) => {
    await signInAs('sales');
    await crm.goto('/opportunities');
    await crm.openCreate('opportunity');
    await crm.fill({ 'Opportunity name': 'Contoso upsell', Value: '30000', Account: 'a2' });
    await crm.submit('Create opportunity');
    await records.expectRecordCreated('Opportunity', 'opportunities-table', 'Contoso upsell');
    await records.expectStage(crm.row('opportunities-table', 'Contoso upsell'), 'prospecting');
  });

  for (const value of ['0', '-500']) {
    test(`opportunity value ${value} is rejected`, async ({ signInAs, crm, records }) => {
      await signInAs('sales');
      await crm.goto('/opportunities');
      await crm.openCreate('opportunity');
      await crm.fill({ 'Opportunity name': 'Bad value', Value: value, Account: 'a1' });
      await crm.submit('Create opportunity');
      await records.expectFieldError('value', 'Value must be a positive number');
    });
  }

  test('opportunity needs an account', async ({ signInAs, crm, records }) => {
    await signInAs('sales');
    await crm.goto('/opportunities');
    await crm.openCreate('opportunity');
    await crm.fill({ 'Opportunity name': 'No account', Value: '1000' });
    await crm.submit('Create opportunity');
    await records.expectFieldError('accountId', 'Choose an account');
  });

  test('advancing moves an opportunity to the next stage', async ({ signInAs, crm, records }) => {
    await signInAs('sales');
    await crm.goto('/opportunities');
    await crm.rowAction('opportunities-table', 'Fabrikam pilot', 'Advance stage');
    await records.expectToast('Stage updated');
    await records.expectStage(crm.row('opportunities-table', 'Fabrikam pilot'), 'qualification');
  });

  test('marking won sets 100% probability', async ({ signInAs, crm, records }) => {
    await signInAs('manager');
    await crm.goto('/opportunities');
    await crm.rowAction('opportunities-table', 'Contoso expansion', 'Mark won');
    await records.expectOpportunityFigures(crm.row('opportunities-table', 'Contoso expansion'), { probability: '100%', weighted: 'USD 80,000.00' });
  });

  test('closing as lost requires a reason', async ({ apiAs }) => {
    const api = await apiAs('sales');
    const response = await api.post('/api/opportunities/o2/stage', { data: { stage: 'lost' } });
    expect(response.status()).toBe(422);
    expect((await response.json()).errors.lostReason).toBe('A reason is required to close as lost');
  });

  test('closing as lost with a reason succeeds', async ({ signInAs, crm, records }) => {
    await signInAs('sales');
    await crm.goto('/opportunities');
    crm.answerNextDialog('Chose a competitor');
    await crm.rowAction('opportunities-table', 'Fabrikam pilot', 'Mark lost');
    await records.expectStage(crm.row('opportunities-table', 'Fabrikam pilot'), 'lost');
  });

  test('viewers cannot change opportunity stages', async ({ signInAs, crm, apiAs }) => {
    await signInAs('viewer');
    await crm.goto('/opportunities');
    await expect(crm.row('opportunities-table', 'Fabrikam pilot').getByRole('button')).toHaveCount(0);
    const api = await apiAs('viewer');
    expect((await api.post('/api/opportunities/o3/stage', { data: { stage: 'proposal' } })).status()).toBe(403);
  });
});
