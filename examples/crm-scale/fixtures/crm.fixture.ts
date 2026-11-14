import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { CrmPage, InvoicesPage, LoginPage, QuotesPage, SettingsPage, TasksPage, UsersPage } from '../pages/crm.page';
import { AccessAssertions } from '../assertions/access.assertions';
import { RecordsAssertions } from '../assertions/records.assertions';
import { CommerceAssertions } from '../assertions/commerce.assertions';
import { WorkAssertions } from '../assertions/work.assertions';
import type { Role } from '../data/roles';

type Fixtures = {
  tenant: string;
  signInAs: (role: Role | 'sales2') => Promise<void>;
  apiAs: (role: Role | 'sales2') => Promise<APIRequestContext>;
  crm: CrmPage; login: LoginPage; quotes: QuotesPage; invoices: InvoicesPage; tasks: TasksPage; users: UsersPage; settings: SettingsPage;
  access: AccessAssertions; records: RecordsAssertions; commerce: CommerceAssertions; work: WorkAssertions;
};

export const test = base.extend<Fixtures>({
  // Every test gets its own seeded tenant, so tests are isolated and parallel-safe.
  tenant: async ({}, use, testInfo) => { await use(testInfo.testId.replace(/[^\w-]/g, '').slice(0, 60)); },
  signInAs: async ({ page, tenant }, use) => {
    await use(async role => {
      const response = await page.request.post('/api/session', { data: { email: `${role}@example.com`, password: 'password', tenant } });
      expect(response.status(), `sign in as ${role}`).toBe(200);
      await page.goto('/dashboard');
    });
  },
  apiAs: async ({ playwright, tenant, baseURL }, use) => {
    const contexts: APIRequestContext[] = [];
    await use(async role => {
      const ctx = await playwright.request.newContext({ baseURL });
      contexts.push(ctx);
      const response = await ctx.post('/api/session', { data: { email: `${role}@example.com`, password: 'password', tenant } });
      expect(response.status(), `API sign in as ${role}`).toBe(200);
      return ctx;
    });
    await Promise.all(contexts.map(c => c.dispose()));
  },
  crm: async ({ page }, use) => { await use(new CrmPage(page)); },
  login: async ({ page }, use) => { await use(new LoginPage(page)); },
  quotes: async ({ page }, use) => { await use(new QuotesPage(page)); },
  invoices: async ({ page }, use) => { await use(new InvoicesPage(page)); },
  tasks: async ({ page }, use) => { await use(new TasksPage(page)); },
  users: async ({ page }, use) => { await use(new UsersPage(page)); },
  settings: async ({ page }, use) => { await use(new SettingsPage(page)); },
  access: async ({ page }, use) => { await use(new AccessAssertions(page)); },
  records: async ({ page }, use) => { await use(new RecordsAssertions(page)); },
  commerce: async ({ page }, use) => { await use(new CommerceAssertions(page)); },
  work: async ({ page }, use) => { await use(new WorkAssertions(page)); }
});

export { expect };
