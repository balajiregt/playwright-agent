import { expect } from '@playwright/test';
import { GenericAssertions } from '../lib/generic.assertions';
import type { NavSection } from '../data/roles';

/** Layer 2: navigation, sign-in and permission assertions. */
export class AccessAssertions extends GenericAssertions {
  async expectSignedInAs(role: string) {
    await this.expectPage('dashboard-page');
    await expect(this.page.getByTestId('active-user')).toContainText(role);
  }
  async expectLoginError(message: string) {
    await expect(this.page.getByTestId('login-error')).toHaveText(message);
    await expect(this.page).toHaveURL(/\/login(\?|$)/);
  }
  async expectNavEnabled(section: NavSection) {
    const link = this.page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: section, exact: true });
    await expect(link).toBeVisible();
    await expect(link).not.toHaveAttribute('aria-disabled', 'true');
  }
  async expectNavDisabled(section: NavSection) {
    await expect(this.page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: section, exact: true })).toHaveAttribute('aria-disabled', 'true');
  }
}
