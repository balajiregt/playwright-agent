import { test, expect } from '../fixtures/crm.fixture';

test.describe('users', () => {
  test('an admin invites a user', async ({ signInAs, users, work }) => {
    await signInAs('admin');
    await users.invite('newhire@example.com', 'support');
    await work.expectToast('Invitation sent');
    await work.expectRowWithText('users-table', 'newhire@example.com');
  });

  test('inviting needs a valid email', async ({ signInAs, users, work }) => {
    await signInAs('admin');
    await users.invite('not-valid', 'sales');
    await work.expectFieldError('email', 'A valid email is required');
  });

  test('an existing email cannot be invited again', async ({ signInAs, users, work }) => {
    await signInAs('admin');
    await users.invite('sales@example.com', 'sales');
    await work.expectFieldError('email', 'A user with this email already exists');
  });

  test('an admin changes a user’s role', async ({ signInAs, users, work, apiAs }) => {
    await signInAs('admin');
    await users.goto('/users');
    await users.setRole('support@example.com', 'manager');
    await work.expectToast('User updated');
    const list = await (await (await apiAs('admin')).get('/api/users')).json();
    expect(list.items.find((u: { email: string }) => u.email === 'support@example.com').role).toBe('manager');
  });

  test('the last active admin cannot be demoted', async ({ signInAs, users, work }) => {
    await signInAs('admin');
    await users.goto('/users');
    await users.setRole('admin@example.com', 'viewer');
    await work.expectToast('The workspace must keep at least one active admin');
  });

  test('a deactivated user cannot sign in', async ({ signInAs, users, work, login, access, page, tenant }) => {
    await signInAs('admin');
    await users.goto('/users');
    await users.toggleActive('sales2@example.com');
    await work.expectUserStatus('sales2@example.com', 'Deactivated');
    await users.signOut();
    await expect(page.getByTestId('login-page')).toBeVisible();
    await page.request.delete('/api/session');
    await login.signIn('sales2@example.com', 'password', tenant);
    await access.expectLoginError('This account is deactivated');
  });
});
