import {test, expect} from '@playwright/test';
test('checks the visible behavior', async ({page}) => {
  await page.goto('/');
  await expect(page.getByTestId('connection-status')).toHaveText('Mockserver connected');
  await page.route('**/bff/v1/workspace**', async route => {
    await route.continue({headers:{...route.request().headers(), 'downstream-error':'true'}});
  });
  await page.getByRole('button', {name:'Refresh session',exact:true}).click();
  await expect(page.getByTestId('connection-status')).toHaveText('Mockserver error');
  const checks={clear:async()=>expect(page.getByTestId('action-grid').getByRole('article')).toHaveCount(0)};
  await checks[process.env.CHECK_NAME]();
});
