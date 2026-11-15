import {test, expect} from '@playwright/test';
test('checks the visible behavior', async ({page}) => {
  await page.goto('/');
  await page.getByLabel('Email').fill('demo@example.test');
  await page.getByRole('button', {name:'Sign in',exact:true}).click();
  await expect(page.getByTestId('dashboard')).toBeVisible();
  await expect(page.getByTestId('login-form')).toBeHidden();
});
