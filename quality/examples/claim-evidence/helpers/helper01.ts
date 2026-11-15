import {expect, type Page} from '@playwright/test';
export async function checkWorkspace(page:Page) {
  await expect(page.getByTestId('action-grid').getByRole('article')).toHaveCount(0);
}
