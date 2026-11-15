import { test } from '../fixtures/crm.fixture';
import { NAV_ACCESS, NAV_SECTIONS, ROLES } from '../data/roles';

test.describe('navigation access by role', () => {
  for (const role of ROLES) {
    for (const section of NAV_SECTIONS) {
      const allowed = NAV_ACCESS[role].includes(section);
      test(`${role} sees ${section} navigation ${allowed ? 'enabled' : 'disabled'}`, async ({ signInAs, access }) => {
        await signInAs(role);
        if (allowed) await access.expectNavEnabled(section);
        else await access.expectNavDisabled(section);
      });
    }
  }
});
