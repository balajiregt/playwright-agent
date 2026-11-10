import {test, expect} from '@playwright/test';
test('checks the visible behavior', async ({page}) => {
  await page.route('**/auth/token**', async route => {
    await route.continue({headers:{...route.request().headers(), 'agent-roles':'viewer'}});
  });
  await page.goto('/');
  await expect(page.getByTestId('role-list')).toHaveText('viewer');
  await expect(page.getByTestId('action-admin-console')).toBeVisible();
});
