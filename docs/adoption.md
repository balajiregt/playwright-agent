# Use Playwright Agent in an existing project

For a step-by-step walkthrough, start with [getting started](getting-started.md).

Keep one toolkit checkout or extracted source ZIP. The adopting project's own
instructions, application, tests, helpers and configuration remain authoritative.

## Configure once

From the toolkit root:

~~~sh
npm ci
npm ci --prefix quality
npm run agent:configure -- --repo "../my-existing-project" --client both
~~~

The target must already declare @playwright/test and have an existing config.
Select another existing file with --playwright-config config/ui.config.ts.
Clients are codex, copilot or both.

Codex onboarding adds a router shim and three capability shims:
playwright-test-authoring, playwright-assessment and playwright-mutation.
The latter two have explicit-only discovery policies. The router can load them
when the user clearly requests that work in natural language.
Copilot onboarding adds one custom-agent entrypoint linking to the same router.
Each shim explicitly targets the adopter repository, not the toolkit or CRM.

The ignored .playwright-agent.local.json stores a relative toolkit location and
the selected config. Judgments come from the host coding agent; no model provider
is configured. Older configs with a retired decisionProvider key stay valid and
are left unchanged.

Keep that relative layout valid. Onboarding preserves AGENTS.md,
source, tests and package manifests; identical configuration is idempotent.
All selected destinations are checked before writes. Different existing shims
are refused: review and replace only the generated files deliberately, then
reconfigure. Do not delete project instructions to upgrade.

Setup does not install dependencies into the target, choose requirements,
launch browsers/models, connect MCP servers, enable hooks or run tests.
Reload the client session to refresh discovery. Directly reading the canonical
skill remains a fallback; a file check does not prove a live client's picker.

## Get an evidence report from every run

Add the reporter next to your existing reporters in the project's Playwright
config. The path is relative to that config file:

~~~ts
reporter: [
  ['list'],
  ['../playwright-agent/reporter/index.mjs', { task: 'LOGIN-123' }],
],
~~~

Each `npx playwright test` run is then validated, saved under
`artifacts/agent-tasks/LOGIN-123/portal/reports/` and the static report
`playwright-agent-report/index.html` is rebuilt. Open that file directly or keep
it as a CI artifact. Both folders are private and Git-ignored.

- `task` defaults to `$PLAYWRIGHT_AGENT_TASK`, then `playwright-runs`.
- `report: false` keeps saving runs without rebuilding the HTML.
- `PLAYWRIGHT_AGENT_REPORT=off` disables the reporter for one run.

The reporter records what Playwright observed; it does not retry, edit tests or
mark criteria as covered. Rebuild the report on demand, for example after saving
agent findings or a mutation campaign:

~~~sh
npm run report -- --repo "../my-existing-project" [--task LOGIN-123] [--serve]
~~~

## Route one task

Start with $playwright-agent or the Playwright Agent custom agent, identify the
project and state the requested work. The [router](../.agents/skills/playwright-agent/SKILL.md)
selects authoring, explicit assessment or explicit mutation verification.

Authoring reuses the target's existing framework and includes focused checks.
It does not require a formal matrix, document intake or a mutation campaign.
Assessment stays read-only unless fixes were also requested; tests execute only
when requested. Mutation keeps tests unchanged during each measurement and runs
only selected faults in disposable application copies. Nonfunctional testing is
outside this agent's scope.

A sufficient prompt or existing requirement file needs no task card. For source
documents needing extraction, use [intake](document-intake.md) with the adopter
as --repo; preserve originals and review interpretations before acceptance.
Do not force parsing or an acceptance workflow onto a small test edit.

## Save findings and open the viewer last

Use [portal analysis](portal.md) without --run for task-level findings. Attach the
actual Playwright JSON or behavioral campaign when available. For an assessment
of an existing intake version, use its --run UUID instead. Open the matching
project's read-only viewer after the requested workflow, including failures and
blocked work. Missing execution remains not run.

The host session supplies the model, tools and permissions; no other model or
provider is needed. Mutation configuration requires
the actual source, startup, test scope and supported observation interface;
copying the example config does not validate another application.
