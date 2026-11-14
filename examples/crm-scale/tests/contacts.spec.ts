import { test, expect } from '../fixtures/crm.fixture';

test.describe('contacts', () => {
  test('support creates a contact', async ({ signInAs, crm, records }) => {
    await signInAs('support');
    await crm.goto('/contacts');
    await crm.openCreate('contact');
    await crm.fill({ 'Contact name': 'Katherine Johnson', Email: 'katherine@nasa.test' });
    await crm.submit('Create contact');
    await records.expectRecordCreated('Contact', 'contacts-table', 'Katherine Johnson');
  });

  test('contact email is required', async ({ signInAs, crm, records }) => {
    await signInAs('sales');
    await crm.goto('/contacts');
    await crm.openCreate('contact');
    await crm.fill({ 'Contact name': 'No Email' });
    await crm.submit('Create contact');
    await records.expectFieldError('email', 'A valid email is required');
  });

  test('contact email must be valid', async ({ signInAs, crm, records }) => {
    await signInAs('sales');
    await crm.goto('/contacts');
    await crm.openCreate('contact');
    await crm.fill({ 'Contact name': 'Bad Email', Email: 'not-an-email' });
    await crm.submit('Create contact');
    await records.expectFieldError('email', 'A valid email is required');
  });

  test('manager deletes a contact', async ({ signInAs, crm, records }) => {
    await signInAs('manager');
    await crm.goto('/contacts');
    crm.answerNextDialog();
    await crm.rowAction('contacts-table', 'Alan Turing', 'Delete');
    await records.expectToast('Contact deleted');
    await records.expectNoRowWithText('contacts-table', 'Alan Turing');
  });

  test('support cannot delete contacts', async ({ signInAs, crm, apiAs }) => {
    await signInAs('support');
    await crm.goto('/contacts');
    await expect(crm.row('contacts-table', 'Ada Lovelace').getByRole('button', { name: 'Delete' })).toHaveCount(0);
    const api = await apiAs('support');
    expect((await api.delete('/api/contacts/c1')).status()).toBe(403);
  });

  test('search finds contacts by email', async ({ signInAs, crm, records }) => {
    await signInAs('viewer');
    await crm.goto('/contacts');
    await crm.search('alan@');
    await records.expectVisibleRows('contacts-table', 1);
  });
});
