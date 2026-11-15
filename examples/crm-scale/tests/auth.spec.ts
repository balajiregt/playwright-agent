import { test, expect } from '../fixtures/crm.fixture';
import { ROLES } from '../data/roles';

test.describe('sign in', () => {
  for (const role of ROLES) {
    test(`${role} can sign in and reach the dashboard`, async ({ login, access }) => {
      await login.signIn(`${role}@example.com`, 'password');
      await access.expectSignedInAs(role);
    });
  }

  test('wrong password is rejected and stays on login', async ({ login, access }) => {
    await login.signIn('sales@example.com', 'wrong-password');
    await access.expectLoginError('Invalid email or password');
  });

  test('unknown email is rejected', async ({ login, access }) => {
    await login.signIn('nobody@example.com', 'password');
    await access.expectLoginError('Invalid email or password');
  });

  test('signing out returns to the login page', async ({ signInAs, crm, page }) => {
    await signInAs('manager');
    await crm.signOut();
    await expect(page.getByTestId('login-page')).toBeVisible();
  });

  test('API calls without a session are refused', async ({ request }) => {
    const response = await request.get('/api/accounts');
    expect(response.status()).toBe(401);
  });

  test('protected pages redirect to login when signed out', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page).toHaveURL(/\/login$/);
  });
});
