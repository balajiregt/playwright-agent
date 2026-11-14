import { expect, type Locator, type Page } from '@playwright/test';

/** Layer 1: generic, application-agnostic UI assertions shared by every domain. */
export class GenericAssertions {
  constructor(readonly page: Page) {}

  async expectPage(testId: string) {
    await expect(this.page.getByTestId(testId)).toBeVisible();
  }

  async expectToast(text: string | RegExp) {
    await expect(this.page.getByTestId('toast')).toContainText(text);
  }

  async expectFieldError(field: string, message: string) {
    await expect(this.page.getByTestId(`error-${field}`)).toHaveText(message);
  }

  async expectNoFieldError(field: string) {
    await expect(this.page.getByTestId(`error-${field}`)).toBeHidden();
  }

  async expectRowWithText(table: string, text: string) {
    await expect(this.page.getByTestId(table).locator('tbody tr').filter({ hasText: text })).toHaveCount(1);
  }

  async expectNoRowWithText(table: string, text: string) {
    await expect(this.page.getByTestId(table).locator('tbody tr').filter({ hasText: text })).toHaveCount(0);
  }

  async expectCell(row: Locator, column: string, text: string | RegExp) {
    await expect(row.locator(`[data-col="${column}"]`)).toHaveText(text);
  }

  async expectDisabled(locator: Locator) {
    await expect(locator).toBeDisabled();
  }

  async expectPermissionDenied(path: string) {
    await expect(this.page.getByTestId('permission-denied')).toHaveText(`You do not have access to ${path}.`);
  }

  async expectReadOnlyBanner() {
    await expect(this.page.getByTestId('read-only-banner')).toBeVisible();
  }
}
