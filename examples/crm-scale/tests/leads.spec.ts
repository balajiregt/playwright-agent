import { test, expect } from '../fixtures/crm.fixture';
import { aLead } from '../data/builders';

test.describe('leads', () => {
  test('sales creates a lead', async ({ signInAs, crm, records }) => {
    const lead = aLead({ company: 'Lead Co' });
    await signInAs('sales');
    await crm.goto('/leads');
    await crm.openCreate('lead');
    await crm.fill({ 'Lead name': lead.name, Email: lead.email, Company: lead.company, Source: lead.source });
    await crm.submit('Create lead');
    await records.expectRecordCreated('Lead', 'leads-table', lead.name);
    await records.expectLeadStatus(crm.row('leads-table', lead.name), 'open');
  });

  const required = [
    { field: 'name', message: 'Lead name is required', omit: 'Lead name' },
    { field: 'email', message: 'Email is required', omit: 'Email' },
    { field: 'source', message: 'Lead source is required', omit: 'Source' }
  ];
  for (const { field, message, omit } of required) {
    test(`lead ${field} is required`, async ({ signInAs, crm, records }) => {
      const lead = aLead();
      const values: Record<string, string> = { 'Lead name': lead.name, Email: lead.email, Source: lead.source };
      delete values[omit];
      await signInAs('sales');
      await crm.goto('/leads');
      await crm.openCreate('lead');
      await crm.fill(values);
      await crm.submit('Create lead');
      await records.expectFieldError(field, message);
    });
  }

  test('lead email must be a valid address', async ({ signInAs, crm, records }) => {
    await signInAs('sales');
    await crm.goto('/leads');
    await crm.openCreate('lead');
    await crm.fill({ 'Lead name': 'Bad Email Lead', Email: 'bad@address', Source: 'Web' });
    await crm.submit('Create lead');
    await records.expectFieldError('email', 'Enter a valid email address');
  });

  test('duplicate lead email is rejected', async ({ signInAs, crm, records }) => {
    await signInAs('admin');
    await crm.goto('/leads');
    await crm.openCreate('lead');
    await crm.fill({ 'Lead name': 'Another Grace', Email: 'GRACE@navy.test', Source: 'Event' });
    await crm.submit('Create lead');
    await records.expectFieldError('email', 'A lead with this email already exists');
  });

  test('converting a lead with a company creates a contact and an account', async ({ signInAs, crm, records }) => {
    await signInAs('sales');
    await crm.goto('/leads');
    await crm.rowAction('leads-table', 'Grace Hopper', 'Convert');
    await records.expectToast('Lead converted');
    await records.expectLeadStatus(crm.row('leads-table', 'Grace Hopper'), 'converted');
    await crm.goto('/contacts');
    await records.expectRowWithText('contacts-table', 'Grace Hopper');
    await crm.goto('/accounts');
    await records.expectRowWithText('accounts-table', 'Navy Labs');
  });

  test('converting a lead without a company creates only a contact', async ({ signInAs, crm, records, apiAs }) => {
    await signInAs('manager');
    await crm.goto('/leads');
    await crm.rowAction('leads-table', 'Linus Pauling', 'Convert');
    await records.expectToast('Lead converted');
    const api = await apiAs('manager');
    const accounts = await (await api.get('/api/accounts')).json();
    expect(accounts.total).toBe(12);
  });

  test('a converted lead cannot be converted again', async ({ apiAs }) => {
    const api = await apiAs('sales');
    expect((await api.post('/api/leads/l1/convert')).status()).toBe(200);
    const again = await api.post('/api/leads/l1/convert');
    expect(again.status()).toBe(409);
    expect((await again.json()).error).toBe('Lead is already converted');
  });

  test('converted leads no longer offer the convert action', async ({ signInAs, crm, apiAs }) => {
    await (await apiAs('sales')).post('/api/leads/l1/convert');
    await signInAs('sales');
    await crm.goto('/leads');
    await expect(crm.row('leads-table', 'Grace Hopper').getByRole('button', { name: 'Convert' })).toHaveCount(0);
  });

  test('managers can convert but not create leads', async ({ signInAs, crm, records }) => {
    await signInAs('manager');
    await crm.goto('/leads');
    await records.expectReadOnlyBanner();
    await expect(crm.row('leads-table', 'Grace Hopper').getByRole('button', { name: 'Convert' })).toBeVisible();
  });
});
