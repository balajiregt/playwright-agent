import { test, expect } from '../fixtures/crm.fixture';

test.describe('reports', () => {
  test('open pipeline excludes won and lost deals', async ({ signInAs, crm, work }) => {
    await signInAs('manager');
    await crm.goto('/reports');
    await work.expectMetric('pipeline-total', 'USD 220,000.00');
  });

  test('weighted pipeline uses stage probabilities', async ({ signInAs, crm, work }) => {
    await signInAs('manager');
    await crm.goto('/reports');
    await work.expectMetric('weighted-pipeline', 'USD 132,000.00');
  });

  test('won this quarter counts deals closed since October', async ({ signInAs, crm, work }) => {
    await signInAs('viewer');
    await crm.goto('/reports');
    await work.expectMetric('won-quarter', 'USD 15,000.00');
  });

  test('outstanding invoices sum remaining balances', async ({ signInAs, crm, work, apiAs }) => {
    await (await apiAs('manager')).post('/api/invoices/i2/payments', { data: { amount: 1500 } });
    await signInAs('manager');
    await crm.goto('/reports');
    await work.expectMetric('outstanding', 'USD 3,500.00');
  });

  test('overdue tasks are counted', async ({ signInAs, crm, work }) => {
    await signInAs('admin');
    await crm.goto('/reports');
    await work.expectMetric('overdue-tasks', '2');
  });

  test('a won deal leaves the open pipeline', async ({ apiAs, signInAs, crm, work }) => {
    await (await apiAs('sales')).post('/api/opportunities/o3/stage', { data: { stage: 'won' } });
    await signInAs('manager');
    await crm.goto('/reports');
    await work.expectMetric('pipeline-total', 'USD 200,000.00');
  });

  test('sales cannot view reports', async ({ signInAs, crm, work }) => {
    await signInAs('sales');
    await crm.goto('/reports');
    await work.expectPermissionDenied('/reports');
  });

  test('report figures match the API', async ({ apiAs }) => {
    const summary = await (await (await apiAs('admin')).get('/api/reports/summary')).json();
    expect(summary).toEqual({ pipelineTotal: 220000, weightedPipeline: 132000, wonThisQuarter: 15000, outstandingInvoices: 5000, overdueTasks: 2 });
  });
});
