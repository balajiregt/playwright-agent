# CRM-Scale benchmark application

A larger, deterministic sample CRM with a realistic Playwright suite, built to
evaluate test authoring, coverage assessment and mutation verification on work
that is harder than the bundled sample CRM. It has no dependencies beyond the
toolkit's `@playwright/test`.

## What it contains

| Part | Contents |
| --- | --- |
| `app/` | Node HTTP server, JSON API and a vanilla JS single-page app: accounts, contacts, leads, opportunities, quotes, invoices, tasks, reports, users, settings and an audit log, with five roles (admin, manager, sales, support, viewer) |
| `lib/` | Layer 1: generic UI assertions (tables, toasts, field errors, disabled controls, permission denied) |
| `assertions/` | Layer 2: domain assertions (access, records, commerce, work) built on layer 1 |
| `pages/` | Layer 3: page objects for actions only |
| `fixtures/` | Signs each test in as a role, inside its own seeded tenant |
| `data/` | Role and navigation matrices, the API permission matrix and data builders |
| `tests/` | 216 tests in 14 spec files |

## Run

```sh
# from qa/playwright-agent
npx playwright test -c examples/crm-scale/playwright.config.ts
CRM_SCALE_WORKERS=1 npx playwright test -c examples/crm-scale/playwright.config.ts   # serial
node examples/crm-scale/app/server.mjs                                               # app only, port 4300
```

The suite starts its own server on port 4300 (`CRM_SCALE_PORT` to change it).

## Determinism and isolation

- "Today" is fixed at 15 November 2026, so overdue and quarter logic never drifts.
- Every session belongs to a tenant with its own freshly seeded data. The fixture
  uses the test's ID as the tenant, so tests never share state and run in
  parallel. The browser login page accepts `?tenant=` for the same purpose.

## Business rules under test

Lead validation and conversion; opportunity stages, probabilities and weighted
value; quote line totals with an 18% tax, two-decimal rounding and a configurable
discount-approval threshold (15% by default, above which a manager must approve);
invoices only from accepted quotes, sequential `INV-2026-NNNN` numbers, partial
and full payments, overdue status; tasks ordered by due date with overdue status
and assignee-only completion; report figures; user invitations, role changes, the
last-admin guard and deactivation; settings; and the audit trail.

## Benchmark faults

`app/api.mjs` exports `FAULTS`, named switches at the exact rule sites (for example
`quote-rounding`, `invoice-partial` or `user-last-admin`). A fault is enabled only
in benchmark mode:

```sh
CRM_SCALE_BENCHMARK=1 CRM_SCALE_FAULT=quote-rounding node examples/crm-scale/app/server.mjs
CRM_SCALE_FAULT=quote-rounding npx playwright test -c examples/crm-scale/playwright.config.ts
```

Faults are used to prove which requirements a test suite really protects. They
are never enabled outside benchmark runs.
