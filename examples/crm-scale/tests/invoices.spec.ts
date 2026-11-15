import { test, expect } from '../fixtures/crm.fixture';

test.describe('invoices', () => {
  test('an invoice is created from an accepted quote with the next number', async ({ signInAs, invoices, commerce }) => {
    await signInAs('manager');
    await invoices.createFromQuote('Q-1001');
    await commerce.expectToast('Invoice INV-2026-0003 created');
    await commerce.expectInvoice(invoices.invoiceRow('INV-2026-0003'), { status: 'draft', balance: 'USD 11,210.00' });
  });

  test('invoice numbers keep increasing', async ({ apiAs }) => {
    const api = await apiAs('admin');
    const first = await (await api.post('/api/invoices', { data: { quoteId: 'q1' } })).json();
    const second = await (await api.post('/api/invoices', { data: { quoteId: 'q1' } })).json();
    expect([first.number, second.number]).toEqual(['INV-2026-0003', 'INV-2026-0004']);
  });

  test('a draft quote cannot be invoiced', async ({ apiAs }) => {
    const api = await apiAs('manager');
    const response = await api.post('/api/invoices', { data: { quoteId: 'q2' } });
    expect(response.status()).toBe(409);
    expect((await response.json()).error).toBe('Only accepted quotes can be invoiced');
  });

  test('sending a draft invoice', async ({ signInAs, invoices, commerce }) => {
    await signInAs('manager');
    await invoices.createFromQuote('Q-1001');
    await invoices.send('INV-2026-0003');
    await commerce.expectToast('Invoice sent');
    await commerce.expectInvoice(invoices.invoiceRow('INV-2026-0003'), { status: 'sent', balance: 'USD 11,210.00' });
  });

  test('a partial payment leaves a balance', async ({ signInAs, invoices, commerce }) => {
    await signInAs('manager');
    await invoices.goto('/invoices');
    await invoices.pay('INV-2026-0002', 2000);
    await commerce.expectToast('Payment recorded. Status: partially-paid');
    await commerce.expectInvoice(invoices.invoiceRow('INV-2026-0002'), { status: 'partially-paid', balance: 'USD 3,000.00' });
  });

  test('paying the full balance marks the invoice paid', async ({ signInAs, invoices, commerce }) => {
    await signInAs('admin');
    await invoices.goto('/invoices');
    await invoices.pay('INV-2026-0002', 5000);
    await commerce.expectInvoice(invoices.invoiceRow('INV-2026-0002'), { status: 'paid', balance: 'USD 0.00' });
  });

  test('a payment above the balance is rejected', async ({ signInAs, invoices, commerce }) => {
    await signInAs('manager');
    await invoices.goto('/invoices');
    await invoices.pay('INV-2026-0002', 5000.01);
    await commerce.expectToast('Amount must be above zero and no more than the balance');
  });

  test('payments cannot be recorded on a draft invoice', async ({ apiAs }) => {
    const api = await apiAs('manager');
    const invoice = await (await api.post('/api/invoices', { data: { quoteId: 'q1' } })).json();
    const response = await api.post(`/api/invoices/${invoice.id}/payments`, { data: { amount: 10 } });
    expect(response.status()).toBe(409);
  });

  test('an unpaid invoice past its due date is overdue', async ({ signInAs, invoices, commerce }) => {
    await signInAs('support');
    await invoices.goto('/invoices');
    await commerce.expectOverdue(invoices.invoiceRow('INV-2026-0002'), true);
  });

  test('a paid invoice is never overdue', async ({ signInAs, invoices, commerce }) => {
    await signInAs('viewer');
    await invoices.goto('/invoices');
    await commerce.expectOverdue(invoices.invoiceRow('INV-2026-0001'), false);
  });

  test('support can view but not create invoices', async ({ signInAs, invoices, apiAs }) => {
    await signInAs('support');
    await invoices.goto('/invoices');
    await expect(invoices.page.getByTestId('invoice-form')).toHaveCount(0);
    const api = await apiAs('support');
    expect((await api.post('/api/invoices', { data: { quoteId: 'q1' } })).status()).toBe(403);
  });
});
