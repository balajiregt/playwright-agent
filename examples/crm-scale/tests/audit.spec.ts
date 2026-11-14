import { test } from '../fixtures/crm.fixture';

test.describe('audit log', () => {
  test('creating a lead is audited', async ({ apiAs, signInAs, crm, work }) => {
    const lead = await (await (await apiAs('sales')).post('/api/leads', { data: { name: 'Audit Lead', email: 'audit@lead.test', source: 'Web' } })).json();
    await signInAs('admin');
    await crm.goto('/audit');
    await work.expectAuditEntry('create', 'lead', lead.id);
  });

  test('deleting an account is audited', async ({ apiAs, signInAs, crm, work }) => {
    await (await apiAs('admin')).delete('/api/accounts/a3');
    await signInAs('admin');
    await crm.goto('/audit');
    await work.expectAuditEntry('delete', 'account', 'a3');
  });

  test('deleting a contact is audited', async ({ apiAs, signInAs, crm, work }) => {
    await (await apiAs('manager')).delete('/api/contacts/c2');
    await signInAs('admin');
    await crm.goto('/audit');
    await work.expectAuditEntry('delete', 'contact', 'c2');
  });

  test('only admins can read the audit log', async ({ signInAs, crm, work }) => {
    await signInAs('manager');
    await crm.goto('/audit');
    await work.expectPermissionDenied('/audit');
  });
});
