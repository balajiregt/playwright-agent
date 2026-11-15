import {expect, type Page} from '@playwright/test';
export async function checkWorkspace(page:Page) {
  await expect(page.getByTestId('connection-status')).toHaveText('Mockserver error');
}
