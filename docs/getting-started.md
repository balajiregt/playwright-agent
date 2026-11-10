# Getting started: onboard your Playwright project

This guide takes you from an existing Playwright project to an evidence report
that answers three questions:

1. **Coverage:** do the tests actually check the acceptance criteria in your
   tickets, epics and PRDs?
2. **Traceability:** is every criterion linked to a test and an assertion, and
   where are the gaps?
3. **Sensitivity:** do the assertions catch real defects? (behavioral mutation)

Steps 1–4 are one-time setup (about 15 minutes). Steps 5–8 are the everyday loop.
Steps 6 and 7 are optional and only run when you ask for them.

## Before you start

| You need | Notes |
| --- | --- |
| An existing Playwright project | It must declare `@playwright/test` and have a Playwright config. |
| Node.js 22 or newer | Used by the toolkit. Your project keeps its own Node setup. |
| A coding agent | Codex or GitHub Copilot (configured in step 2), or another agent that can read the skill files. |
| Python 3 (optional) | Only to read PDF or Excel requirement documents. |

No API keys, model servers or cloud services are needed. Judgments come from your
coding agent's current model.

## Step 1 — Get the toolkit

Clone it next to your project, so relative paths stay short:

```sh
cd ~/code                                   # the folder that holds your project
git clone https://github.com/balajiregt/playwright-agent.git
cd playwright-agent
npm ci
npm ci --prefix quality
```

Optional, for PDF/XLS/XLSX requirement files:

```sh
python3 -m venv quality/.venv
quality/.venv/bin/python -m pip install -r quality/python/requirements-artifacts.txt
```

The rest of this guide assumes this layout:

```text
~/code/playwright-agent        ← toolkit
~/code/my-project              ← your Playwright project
```

## Step 2 — Connect your project

From the toolkit folder:

```sh
npm run agent:configure -- --repo ../my-project --client both
```

Use `--client codex` or `--client copilot` for just one, and
`--playwright-config path/to/config.ts` if your config is not
`playwright.config.ts`.

This adds skill shims (`.agents/skills/…`) and/or a Copilot agent file to your
project, plus an ignored `.playwright-agent.local.json`. It never installs
packages, edits tests or overwrites files that differ. **Restart your coding
agent session** so it discovers the new skills.

## Step 3 — Add the evidence reporter

In your project's Playwright config, add the reporter next to the ones you
already use. The path is relative to the config file:

```ts
reporter: [
  ['list'],
  ['../playwright-agent/reporter/index.mjs', { task: 'LOGIN-123' }],
],
```

`task` is the work item (ticket or epic ID) the runs belong to. Instead of
hard-coding it, you can leave it out and set `PLAYWRIGHT_AGENT_TASK=LOGIN-123`
per run; without either, runs go to `playwright-runs`.

Now every `npx playwright test` run is validated, saved under
`artifacts/agent-tasks/<task>/` and the report
`playwright-agent-report/index.html` is rebuilt. Both folders are Git-ignored
automatically. Set `PLAYWRIGHT_AGENT_REPORT=off` to skip one run.

## Step 4 — Add your requirements

Put the requirement documents for one work item in your project:

```text
my-project/contexts/tasks/LOGIN-123/
  epic.md            ← exported Confluence page, PRD, notes…
  jira-tickets.json  ← Jira export with acceptance criteria
  rtm.csv            ← an existing traceability matrix, if you have one
```

Keep these private (add `contexts/tasks/` to your `.gitignore` unless they are
meant to be shared). Accepted formats include Markdown, text, JSON, CSV, HTML,
DOC/DOCX, PDF with selectable text, and XLS/XLSX.

For a short, clear ticket you can skip the files and paste the criteria into
your chat instead.

## Step 5 — Write or update tests with your agent

In your coding agent, in your project:

```text
Use $playwright-agent for LOGIN-123. Read contexts/tasks/LOGIN-123/ and create
the missing login tests using our existing page objects. Run the focused tests.
```

In Copilot, select the **Playwright Agent** agent instead of `$playwright-agent`.
The agent reuses your existing specs, page objects, fixtures and helpers, runs
the focused checks, and the reporter records the run.

Ordinary test work never triggers an assessment, a matrix or mutation testing.
Ask for those explicitly (steps 6 and 7).

## Step 6 — Check coverage and traceability (on request)

Ask for an assessment:

```text
Use $playwright-agent to assess LOGIN-123: map each acceptance criterion to the
tests and the exact assertions that prove it. Do not change or run tests.
Save the findings and the traceability matrix.
```

The agent reads the actual test bodies, helpers and setup — not test names or a
green run — and labels each criterion **supported**, **partial**, **missing** or
**unknown**, with the source quote and assertion location.

For long or messy documents, have the agent run **intake** first, which extracts
the documents into source-linked criteria and open questions for you to review:

```sh
npm run intake -- prepare --repo ../my-project --task LOGIN-123 --goal assess \
  --file ../my-project/contexts/tasks/LOGIN-123/epic.md
npm run intake -- review --run "../my-project/artifacts/agent-tasks/LOGIN-123/intake/RUN"
npm run intake -- accept --run "../my-project/artifacts/agent-tasks/LOGIN-123/intake/RUN" \
  --reviewed-by "Your name" --confirm-reviewed
```

Accept only after you have read the exact criteria and resolved the questions.
The agent then fills the matrix and saves its findings:

```sh
npm run portal -- analysis --repo ../my-project --task LOGIN-123 --file ../my-project/artifacts/agent-tasks/LOGIN-123/findings.md
```

Details: [document intake](document-intake.md) ·
[requirement-to-assertion claim checks](claim-evidence.md).

## Step 7 — Check that assertions catch defects (on request)

Mutation verification injects small, **requirement-breaking** changes into a
disposable copy of your application and checks whether your unchanged tests
fail. It needs JavaScript/TypeScript application source and a local app startup
that your Playwright config can launch.

**7a. Create a config** — copy
`examples/validation-demo/mutation.config.json` to
`quality/mutation.config.local.json` (Git-ignored) and set, relative to that file:

| Field | Set it to |
| --- | --- |
| `repo` | Your project, e.g. `../../my-project` |
| `artifactDir` | The requirements folder, e.g. `../../my-project/contexts/tasks/LOGIN-123` |
| `playwrightConfig` | Your Playwright config, relative to `repo` |
| `sourceFiles` | Up to 8 application files that may be mutated (never tests) |
| `projects`, `env`, `readiness` | Your Playwright project names, local app URL/port, and a "page is ready" test ID |

**7b. Write the fault list** — ask your agent:

```text
Use $playwright-agent to propose behavioral faults for LOGIN-123 in the format of
examples/validation-demo/fault-catalogue.json. Each fault must break one criterion
and quote it exactly. Do not run anything.
```

Review it: each fault replaces one exact `before` string with `after` in an
allowed source file, and has an independent `probe` that observes the change.

**7c. Bind, run and attach:**

```sh
npm run mutation -- bind --catalogue faults.json --config quality/mutation.config.local.json
npm run mutation -- run --config quality/mutation.config.local.json --allow-run
npm run portal -- attach --repo ../my-project --task LOGIN-123 --kind mutation \
  --file quality/artifacts/mutations/RUN_ID/campaign.json
```

`run` prints the campaign folder (`dir`); results go under the config's `output`
setting, which defaults to `artifacts/mutations` next to the config file.

The runner requires two green baselines, confirms each fault actually changed
the app, runs your suite twice per fault, then restores and re-checks green.
Your tests and working source are never modified.

Details: [behavioral mutations](../quality/docs/behavioral-mutations.md) ·
[stateful journeys and adapters](../quality/docs/mutation-adapters.md).

## Step 8 — Read the report

```sh
npm run report -- --repo ../my-project --task LOGIN-123
```

Open `my-project/playwright-agent-report/index.html` in a browser, or add
`--serve` for the live local viewer. The file is self-contained, so you can keep
it as a CI artifact (treat it as private: it contains findings and error text).

| You see | It means |
| --- | --- |
| Tests: `P / N passed`, unexpected, flaky | What Playwright observed in that run. A pass is not coverage. |
| Mutation: `K / C killed`, score | Faults your tests caught ÷ faults that were conclusive. |
| **Survived** fault | A real gap: the behavior broke and every test still passed. Add or strengthen an assertion. |
| Not activated / inconclusive | No conclusion — the fault didn't change the app, or the run was unstable. Not a gap. |
| Criteria: supported / partial / missing / unknown | The agent's assessment against actual assertions (step 6). |
| "More than one report of a kind" | Several runs or campaigns are attached; check which one each number comes from. |

## See it working first (optional, 5 minutes)

The toolkit ships a synthetic CRM with one deliberate gap (the dashboard's
`$842k` value is never asserted). From the toolkit folder:

```sh
npx playwright install chromium
PLAYWRIGHT_AGENT_TASK=CRM-DEMO-001 PLAYWRIGHT_AGENT_REPO="$PWD" \
  npx playwright test --config examples/validation-demo/playwright.config.ts \
  --reporter=list,./reporter/index.mjs
npm run mutation -- bind --catalogue examples/validation-demo/fault-catalogue.json --config examples/validation-demo/mutation.config.json
npm run mutation -- run --config examples/validation-demo/mutation.config.json --allow-run
npm run portal -- attach --repo . --task CRM-DEMO-001 --kind mutation --file artifacts/validation-demo/mutations/RUN_ID/campaign.json
npm run report -- --repo . --task CRM-DEMO-001
```

Expected: 6 / 6 tests pass, yet only 1 / 2 faults are killed — the survived
fault points at the missing `$842k` assertion.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Refusing to overwrite existing different …` during step 2 | A shim differs from the generated one (often after a toolkit update). Review it, delete the generated file, and re-run configure. |
| The agent doesn't know `$playwright-agent` | Restart the coding-agent session after step 2. |
| `Run was not attached` after a test run | The toolkit dependencies are missing (`npm ci --prefix quality`), or the reporter path in your config is wrong. |
| Mutation result `not_run` | The baseline was not green twice. Fix flaky or failing tests first. |
| Mutation result `not_activated` | The probe didn't see the change. Check the probe's `path`, `testId` and `expected`. |
| PDF/Excel not read | Install the optional Python parsers (step 1). Scanned PDFs need OCR text supplied separately. |

## What it will not do

It does not test non-functional behavior (performance, security, load), mutate
deployed environments, invent requirements from your code, or mark anything as
covered from test names or a green run. Missing evidence stays "unknown".
