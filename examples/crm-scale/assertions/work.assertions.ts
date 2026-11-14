import { expect } from '@playwright/test';
import { GenericAssertions } from '../lib/generic.assertions';

/** Layer 2: tasks, reports, users, settings and audit. */
export class WorkAssertions extends GenericAssertions {
  async expectMetric(id: string, value: string) { await expect(this.page.getByTestId(`metric-${id}`).locator('strong')).toHaveText(value); }
  async expectTaskOrder(titles: string[]) {
    await expect(this.page.getByTestId('task-list').locator('[data-col="title"]')).toHaveText(titles);
  }
  async expectTaskOverdue(title: string, overdue: boolean) {
    const task = this.page.getByTestId('task-list').getByRole('listitem').filter({ hasText: title });
    await expect(task.getByTestId('overdue-badge')).toHaveCount(overdue ? 1 : 0);
  }
  async expectTaskDone(title: string) {
    await expect(this.page.getByTestId('task-list').getByRole('listitem').filter({ hasText: title }).getByTestId('done-badge')).toBeVisible();
  }
  async expectUserStatus(email: string, status: 'Active' | 'Deactivated') {
    await expect(this.page.getByTestId('users-table').locator('tbody tr').filter({ hasText: email }).locator('[data-col="status"]')).toHaveText(status);
  }
  async expectAuditEntry(action: string, entity: string, id: string) {
    await expect(this.page.getByTestId('audit-table').locator('tbody tr').filter({ hasText: id }).filter({ hasText: action }).filter({ hasText: entity })).toHaveCount(1);
  }
}
