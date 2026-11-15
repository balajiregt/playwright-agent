import { test, expect } from '../fixtures/crm.fixture';
import { aQuoteLine } from '../data/builders';

const TOTALS = [
  { title: 'single line without discount', lines: [aQuoteLine('Licences', 4, 250)], discount: 0, subtotal: 'USD 1,000.00', tax: 'USD 180.00', total: 'USD 1,180.00' },
  { title: 'two lines with 10% discount', lines: [aQuoteLine('Licences', 2, 150), aQuoteLine('Support', 1, 99.5)], discount: 10, subtotal: 'USD 399.50', tax: 'USD 64.72', total: 'USD 424.27' },
  { title: 'cents round half up to two decimals', lines: [aQuoteLine('Seats', 3, 33.33)], discount: 0, subtotal: 'USD 99.99', tax: 'USD 18.00', total: 'USD 117.99' },
  { title: 'discount at the approval threshold', lines: [aQuoteLine('Platform', 1, 2000)], discount: 15, subtotal: 'USD 2,000.00', tax: 'USD 306.00', total: 'USD 2,006.00' }
];

test.describe('quotes', () => {
  for (const c of TOTALS) {
    test(`quote totals: ${c.title}`, async ({ signInAs, quotes, commerce }) => {
      await signInAs('sales');
      await quotes.createQuote('Northwind Traders', c.lines, c.discount);
      await commerce.expectToast('Quote Q-1003 created');
      await commerce.expectQuoteTotals(quotes.quoteRow('Q-1003'), { subtotal: c.subtotal, tax: c.tax, total: c.total });
    });
  }

  test('a discount at the threshold does not need approval', async ({ signInAs, quotes, commerce }) => {
    await signInAs('sales');
    await quotes.createQuote('Contoso Ltd', [aQuoteLine()], 15);
    await commerce.expectQuoteStatus(quotes.quoteRow('Q-1003'), 'draft');
  });

  test('a discount above the threshold needs approval', async ({ signInAs, quotes, commerce }) => {
    await signInAs('sales');
    await quotes.createQuote('Contoso Ltd', [aQuoteLine()], 16);
    await commerce.expectToast('Quote Q-1003 needs approval');
    await commerce.expectQuoteStatus(quotes.quoteRow('Q-1003'), 'pending-approval');
  });

  test('the approval threshold shown follows settings', async ({ signInAs, quotes }) => {
    await signInAs('sales');
    await quotes.goto('/quotes');
    await expect(quotes.page.getByTestId('approval-threshold')).toHaveText('Discounts above 15% need manager approval.');
  });

  test('sales cannot approve a quote', async ({ signInAs, quotes, apiAs }) => {
    await signInAs('sales');
    await quotes.createQuote('Contoso Ltd', [aQuoteLine()], 30);
    await expect(quotes.quoteRow('Q-1003').getByRole('button', { name: 'Approve' })).toHaveCount(0);
    const api = await apiAs('sales');
    const created = (await (await api.get('/api/quotes')).json()).items.find((q: { number: string }) => q.number === 'Q-1003');
    expect((await api.post(`/api/quotes/${created.id}/approve`)).status()).toBe(403);
  });

  test('a manager approves a pending quote', async ({ signInAs, quotes, commerce }) => {
    await signInAs('manager');
    await quotes.createQuote('Fabrikam Inc', [aQuoteLine()], 25);
    await quotes.quoteAction('Q-1003', 'Approve');
    await commerce.expectToast('Quote approved');
    await commerce.expectQuoteStatus(quotes.quoteRow('Q-1003'), 'draft');
  });

  test('a pending quote cannot be sent', async ({ signInAs, quotes, commerce }) => {
    await signInAs('sales');
    await quotes.createQuote('Fabrikam Inc', [aQuoteLine()], 40);
    await quotes.quoteAction('Q-1003', 'Send');
    await commerce.expectToast('Quote needs approval before it can be sent');
    await commerce.expectQuoteStatus(quotes.quoteRow('Q-1003'), 'pending-approval');
  });

  test('a sent quote can be marked accepted', async ({ signInAs, quotes, commerce }) => {
    await signInAs('sales');
    await quotes.goto('/quotes');
    await quotes.quoteAction('Q-1002', 'Send');
    await commerce.expectQuoteStatus(quotes.quoteRow('Q-1002'), 'sent');
    await quotes.quoteAction('Q-1002', 'Mark accepted');
    await commerce.expectQuoteStatus(quotes.quoteRow('Q-1002'), 'accepted');
  });

  test('a discount above 50% is rejected', async ({ signInAs, quotes, commerce }) => {
    await signInAs('manager');
    await quotes.createQuote('Northwind Traders', [aQuoteLine()], 60);
    await commerce.expectFieldError('discountPct', 'Discount must be between 0 and 50%');
  });

  test('every quote line needs an item, quantity and price', async ({ signInAs, quotes, commerce }) => {
    await signInAs('sales');
    await quotes.createQuote('Northwind Traders', [aQuoteLine('Licences', 0, 100)], 0);
    await commerce.expectFieldError('lines', 'Each line needs an item, a quantity above zero and a price');
  });

  test('raising the threshold lets larger discounts skip approval', async ({ apiAs, signInAs, quotes, commerce }) => {
    const admin = await apiAs('admin');
    expect((await admin.patch('/api/settings', { data: { approvalThresholdPct: 30 } })).status()).toBe(200);
    await signInAs('sales');
    await quotes.createQuote('Contoso Ltd', [aQuoteLine()], 25);
    await commerce.expectQuoteStatus(quotes.quoteRow('Q-1003'), 'draft');
  });
});
