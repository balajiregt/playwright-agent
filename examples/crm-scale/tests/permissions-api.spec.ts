import { test, expect } from '../fixtures/crm.fixture';
import { API_PROBES, ROLES } from '../data/roles';

test.describe('API permission matrix', () => {
  for (const probe of API_PROBES) {
    for (const role of ROLES) {
      const allowed = probe.allowed.includes(role);
      test(`${probe.id}: ${role} is ${allowed ? 'allowed' : 'refused'}`, async ({ apiAs }) => {
        const api = await apiAs(role);
        const response = await api.fetch(probe.path, { method: probe.method, data: probe.body });
        expect(response.status()).toBe(allowed ? (probe.okStatus ?? 200) : 403);
      });
    }
  }

  test('direct navigation to a forbidden page shows permission denied', async ({ signInAs, crm, access }) => {
    await signInAs('sales');
    await crm.goto('/users');
    await access.expectPermissionDenied('/users');
  });
});
