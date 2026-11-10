# Self-contained Playwright Agent validation demo

This demo uses only the bundled Sample CRM, synthetic requirements and the
existing framework and behavioral mutation runner. It needs no sibling
mockserver, customer documents, credentials or model server.
The seeded demo accounts are test fixtures, not production identities.

## Setup and browser verification

From the product root, use the documented Node version, then install:

```sh
npm ci
npm ci --prefix quality
npx playwright install chromium
```

Run the browser suite and record it on the demo work item:

```sh
PLAYWRIGHT_AGENT_TASK=CRM-DEMO-001 PLAYWRIGHT_AGENT_REPO="$PWD" \
  npx playwright test --config examples/validation-demo/playwright.config.ts \
  --reporter=list,./reporter/index.mjs
```

Then run the reviewed faults and build the report:

```sh
npm run mutation -- bind --catalogue examples/validation-demo/fault-catalogue.json --config examples/validation-demo/mutation.config.json
npm run mutation -- run --config examples/validation-demo/mutation.config.json --allow-run
npm run portal -- attach --repo . --task CRM-DEMO-001 --kind mutation --file artifacts/validation-demo/mutations/RUN_ID/campaign.json
npm run report -- --repo . --task CRM-DEMO-001
```

`bind` validates the reviewed catalogue against the current task and source
hashes without executing anything. `run` uses the mandatory model-free mutation
checks below. Open `playwright-agent-report/index.html` to see the passing suite
beside the fault it misses. Nothing starts a model provider or publishes results.

For focused browser troubleshooting, use:

```sh
npx playwright test --config examples/validation-demo/playwright.config.ts
```

The dedicated config starts CRM at `http://127.0.0.1:4287`, sets the target for
existing CRM specs, and selects **six tests**: five existing example tests and
one invalid-password test. It has one Chromium project, zero retries, no
template auth-state setup and no reuse of an already running server. A busy
port fails visibly. No separate server terminal or `.env` file is required.

Expected browser evidence is six executed, passing tests with zero skips.
Actual results must be read from the generated JSON report; this README does
not claim those checks have run. Reports and failure traces remain under
ignored `artifacts/validation-demo/browser/`.

## Selected task and acceptance evidence

The tracked [CRM-DEMO-001 task](../../contexts/tasks/CRM-DEMO-001/epic.md)
contains an authored epic, synthetic tickets and normalized requirements. It is
the single shared source used by `mutation.config.json` and Git clones;
`mutation bind` reads these existing files without copying or overwriting them. Other work items remain private and ignored;
use a separate task ID for real tickets and exports.

| Criterion | Existing demonstration evidence |
| --- | --- |
| Valid admin login | Dashboard and active-role assertions in the CRM example suite |
| Invalid password | Visible exact `Invalid credentials`, retained login URL and absent dashboard |
| Viewer read-only accounts | Read-only banner and disabled export assertion |
| Manager navigation | Enabled allowed buttons and disabled restricted buttons |
| Lead validation and creation | Required-field alert and created lead row |
| Opportunity creation and report retry | Created opportunity and report-ready assertions |
| Open-pipeline value `$842k` | **Known gap:** no value assertion in the current suite |

The six tests cover multiple criteria. A passing browser run does not prove
every requirement is covered, nor does it establish production security or
exhaustive role coverage.

## Inspect the existing graphs

The repository's existing graph scripts and interactive HTML view show the
sample CRM's source → tests → coverage → duplicate analysis. They add no graph
framework or model, and never refresh tracked application source. Regenerate and
open them with:

```sh
npm run graph:view
```

These graphs discover the **whole repository**, not only the six selected demo
tests. Coverage is inferred from names, routes, roles and helper mentions;
duplicate/overlap findings are review candidates. Graphs do not establish
assertion adequacy, runtime acceptance or actual duplicate behavior. Curated
captures and adapter enrichments can also be stale independently of manifest
freshness. Keep those limitations and all reported gaps visible alongside the
browser and mutation evidence.

## Mandatory model-free mutation evidence

[The config](mutation.config.json) selects only the bundled CRM browser source
and the prepared task folder. [The fixed catalogue](fault-catalogue.json)
cites exact `epic.md` quotes. `mutation bind` binds that catalogue to the current
source and task hashes, then `mutation run` executes it; no planner or model is
required.

| Fault | Independent observation | Expected suite outcome, pending execution |
| --- | --- | --- |
| Viewer read-only behavior removed | Accounts banner count changes from `1` to `0` | Existing viewer assertion should kill the fault twice |
| Dashboard metric changed to `$0` | Metric text changes from `$842kOpen pipeline` to `$0Open pipeline` | Fault should survive twice, exposing the documented missing value assertion |

The runner uses a disposable source copy. Required evidence includes two green
baselines, an observed change for each fault, two repeatable suite outcomes,
restored green and an unchanged original source tree. Startup errors, missing
activation, unstable failures or skipped checks are inconclusive evidence.
Detailed reports stay under ignored `artifacts/validation-demo/mutations/`.

The intended surviving fault is a validation of the demonstration's ability to
expose a known test gap. It is **not** fulfilled acceptance or a claim that the
suite detects all faults. Keep its missing assertion visible in the acceptance
report.
