import type { Locator, Page } from '@playwright/test';
import type { NavSection } from '../data/roles';

/** Layer 3: page objects for actions. No assertions here. */
export class CrmPage {
  constructor(readonly page: Page) {}

  async goto(path: string) { await this.page.goto(path); }
  navLink(section: NavSection | 'Dashboard') { return this.page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: section, exact: true }); }
  async open(section: NavSection) { await this.navLink(section).click(); }
  async signOut() { await this.page.getByTestId('sign-out').click(); }
  async search(text: string) { await this.page.getByTestId('search').fill(text); await this.page.getByRole('button', { name: 'Search' }).click(); }
  async nextPage() { await this.page.getByTestId('next-page').click(); }
  async openCreate(entity: string) { await this.page.getByTestId(`new-${entity}`).click(); }
  async fill(fields: Record<string, string>) {
    for (const [label, value] of Object.entries(fields)) {
      const control = this.page.getByLabel(label, { exact: true });
      if (await control.evaluate(el => el.tagName === 'SELECT')) await control.selectOption(value);
      else await control.fill(value);
    }
  }
  async submit(name: string) { await this.page.getByRole('button', { name, exact: true }).click(); }
  row(table: string, text: string): Locator { return this.page.getByTestId(table).locator('tbody tr').filter({ hasText: text }); }
  async rowAction(table: string, text: string, action: string) { await this.row(table, text).getByRole('button', { name: action }).click(); }
  /** Accept the next confirm/prompt dialog, answering prompts with `answer`. */
  answerNextDialog(answer?: string) { this.page.once('dialog', d => d.accept(answer)); }
}

export class LoginPage {
  constructor(readonly page: Page) {}
  async signIn(email: string, password: string, tenant?: string) {
    await this.page.goto(tenant ? `/login?tenant=${encodeURIComponent(tenant)}` : '/login');
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}

export class QuotesPage extends CrmPage {
  async createQuote(accountLabel: string, lines: { item: string; qty: number; unitPrice: number }[], discountPct = 0) {
    await this.goto('/quotes');
    await this.openCreate('quote');
    await this.page.getByLabel('Account').selectOption({ label: accountLabel });
    for (const [i, line] of lines.entries()) {
      await this.page.getByLabel(`Item ${i + 1}`).fill(line.item);
      await this.page.getByLabel(`Quantity ${i + 1}`).fill(String(line.qty));
      await this.page.getByLabel(`Unit price ${i + 1}`).fill(String(line.unitPrice));
    }
    await this.page.getByLabel('Discount %').fill(String(discountPct));
    await this.submit('Create quote');
  }
  quoteRow(number: string) { return this.row('quotes-table', number); }
  async quoteAction(number: string, action: 'Approve' | 'Send' | 'Mark accepted') { await this.quoteRow(number).getByRole('button', { name: action }).click(); }
}

export class InvoicesPage extends CrmPage {
  async createFromQuote(quoteNumber: string) {
    await this.goto('/invoices');
    await this.page.getByLabel('Accepted quote').selectOption({ label: quoteNumber });
    await this.submit('Create invoice');
  }
  invoiceRow(number: string) { return this.row('invoices-table', number); }
  async send(number: string) { await this.invoiceRow(number).getByRole('button', { name: 'Send' }).click(); }
  async pay(number: string, amount: number) {
    this.answerNextDialog(String(amount));
    await this.invoiceRow(number).getByRole('button', { name: 'Record payment' }).click();
  }
}

export class TasksPage extends CrmPage {
  task(title: string) { return this.page.getByTestId('task-list').getByRole('listitem').filter({ hasText: title }); }
  async addTask(title: string, dueOn: string) { await this.goto('/tasks'); await this.fill({ 'Task title': title, 'Due date': dueOn }); await this.submit('Add task'); }
  async complete(title: string) { await this.task(title).getByRole('button', { name: 'Complete' }).click(); }
  async titles() { return this.page.getByTestId('task-list').locator('[data-col="title"]').allTextContents(); }
}

export class UsersPage extends CrmPage {
  async invite(email: string, role: string) { await this.goto('/users'); await this.fill({ Email: email, Role: role }); await this.submit('Invite user'); }
  async setRole(email: string, role: string) { await this.page.getByLabel(`Role for ${email}`).selectOption(role); }
  async toggleActive(email: string) { await this.row('users-table', email).getByRole('button').click(); }
}

export class SettingsPage extends CrmPage {
  async save(values: { threshold?: number; currency?: string }) {
    await this.goto('/settings');
    if (values.threshold !== undefined) await this.page.getByLabel('Approval threshold %').fill(String(values.threshold));
    if (values.currency) await this.page.getByLabel('Currency').selectOption(values.currency);
    await this.submit('Save settings');
  }
}
