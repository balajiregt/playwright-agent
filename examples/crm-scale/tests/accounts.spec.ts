import { test, expect } from '../fixtures/crm.fixture';
import { anAccount } from '../data/builders';

test.describe('accounts', () => {
  test('sales creates an account', async ({ signInAs, crm, records }) => {
    const account = anAccount();
    await signInAs('sales');
    await crm.goto('/accounts');
    await crm.openCreate('account');
    await crm.fill({ 'Account name': account.name, Industry: account.industry });
    await crm.submit('Create account');
    await records.expectRecordCreated('Account', 'accounts-table', account.name);
  });

  test('account name is required', async ({ signInAs, crm, records }) => {
    await signInAs('sales');
    await crm.goto('/accounts');
    await crm.openCreate('account');
    await crm.submit('Create account');
    await records.expectFieldError('name', 'Account name is required');
  });

  test('account names are unique regardless of case', async ({ signInAs, crm, records }) => {
    await signInAs('manager');
    await crm.goto('/accounts');
    await crm.openCreate('account');
    await crm.fill({ 'Account name': 'NORTHWIND traders' });
    await crm.submit('Create account');
    await records.expectFieldError('name', 'An account with this name already exists');
  });

  test('search filters accounts by name', async ({ signInAs, crm, records }) => {
    await signInAs('viewer');
    await crm.goto('/accounts');
    await crm.search('contoso');
    await records.expectVisibleRows('accounts-table', 1);
    await records.expectRowWithText('accounts-table', 'Contoso Ltd');
  });

  test('accounts are paginated ten per page', async ({ signInAs, crm, records }) => {
    await signInAs('viewer');
    await crm.goto('/accounts');
    await records.expectVisibleRows('accounts-table', 10);
    await records.expectPageInfo(1, 2, 12);
    await crm.nextPage();
    await records.expectVisibleRows('accounts-table', 2);
    await records.expectPageInfo(2, 2, 12);
  });

  test('an account with unpaid invoices cannot be deleted', async ({ signInAs, crm, records }) => {
    await signInAs('admin');
    await crm.goto('/accounts');
    crm.answerNextDialog();
    await crm.rowAction('accounts-table', 'Northwind Traders', 'Delete');
    await records.expectToast('Account has unpaid invoices and cannot be deleted');
    await records.expectRowWithText('accounts-table', 'Northwind Traders');
  });

  test('admin deletes an account without invoices', async ({ signInAs, crm, records }) => {
    await signInAs('admin');
    await crm.goto('/accounts');
    crm.answerNextDialog();
    await crm.rowAction('accounts-table', 'Fabrikam Inc', 'Delete');
    await records.expectToast('Account deleted');
    await records.expectNoRowWithText('accounts-table', 'Fabrikam Inc');
  });

  test('only admins see the delete action', async ({ signInAs, crm }) => {
    await signInAs('manager');
    await crm.goto('/accounts');
    await expect(crm.row('accounts-table', 'Contoso Ltd').getByRole('button', { name: 'Delete' })).toHaveCount(0);
  });

  test('manager exports accounts', async ({ signInAs, crm, records }) => {
    await signInAs('manager');
    await crm.goto('/accounts');
    await crm.page.getByTestId('export-accounts').click();
    await records.expectToast('Exported 12 accounts');
  });

  test('sales cannot export accounts', async ({ signInAs, crm, records, apiAs }) => {
    await signInAs('sales');
    await crm.goto('/accounts');
    await records.expectDisabled(crm.page.getByTestId('export-accounts'));
    const api = await apiAs('sales');
    expect((await api.get('/api/accounts/export')).status()).toBe(403);
  });

  test('viewers see accounts read-only', async ({ signInAs, crm, records }) => {
    await signInAs('viewer');
    await crm.goto('/accounts');
    await records.expectReadOnlyBanner();
    await expect(crm.page.getByTestId('new-account')).toHaveCount(0);
  });
});
