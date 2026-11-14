import { expect, type Locator } from '@playwright/test';
import { GenericAssertions } from '../lib/generic.assertions';

/** Layer 2: accounts, contacts, leads and opportunities. */
export class RecordsAssertions extends GenericAssertions {
  async expectRecordCreated(entity: string, table: string, name: string) {
    await this.expectToast(`${entity} created`);
    await this.expectRowWithText(table, name);
  }
  async expectPageInfo(page: number, pages: number, total: number) {
    await expect(this.page.getByTestId('page-info')).toHaveText(`Page ${page} of ${pages} · ${total} total`);
  }
  async expectVisibleRows(table: string, count: number) {
    await expect(this.page.getByTestId(table).locator('tbody tr')).toHaveCount(count);
  }
  async expectLeadStatus(row: Locator, status: string) { await this.expectCell(row, 'status', status); }
  async expectOpportunityFigures(row: Locator, figures: { probability: string; weighted: string }) {
    await this.expectCell(row, 'probability', figures.probability);
    await this.expectCell(row, 'weighted', figures.weighted);
  }
  async expectStage(row: Locator, stage: string) { await this.expectCell(row, 'stage', stage); }
}
