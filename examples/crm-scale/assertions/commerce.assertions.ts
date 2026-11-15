import { expect, type Locator } from '@playwright/test';
import { GenericAssertions } from '../lib/generic.assertions';

/** Layer 2: quotes and invoices. */
export class CommerceAssertions extends GenericAssertions {
  async expectQuoteTotals(row: Locator, totals: { subtotal: string; tax: string; total: string }) {
    await this.expectCell(row, 'subtotal', totals.subtotal);
    await this.expectCell(row, 'tax', totals.tax);
    await this.expectCell(row, 'total', totals.total);
  }
  async expectQuoteStatus(row: Locator, status: string) { await this.expectCell(row, 'status', status); }
  async expectInvoice(row: Locator, invoice: { status: string; balance: string }) {
    await this.expectCell(row, 'status', invoice.status);
    await this.expectCell(row, 'balance', invoice.balance);
  }
  async expectOverdue(row: Locator, overdue: boolean) {
    await expect(row.getByTestId('overdue-badge')).toHaveCount(overdue ? 1 : 0);
  }
}
