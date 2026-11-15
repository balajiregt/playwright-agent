# Playwright Agent

AI coding agents can now write Playwright tests quickly. Playwright Agent answers
the questions that remain once they have:

1. **Do the tests cover the intended acceptance criteria?** Requirements from
   tickets, epics, PRDs and RTM exports become source-linked criteria; each one
   is checked against the actual test bodies and assertions, not test names.
2. **Is the traceability matrix complete?** Criteria map to scenario, test,
   assertion and runtime evidence, with gaps and unknowns kept visible.
3. **Do the assertions actually catch defects?** Reviewed behavioral faults run
   against the real application in disposable copies; a fault the suite misses
   is a concrete test gap.

![Playwright Agent: a router skill loads one skill, which hands repeatable work to a tool](docs/diagrams/playwright-agent-overview.svg)

Use your existing coding agent, project and test framework.
**New here? Follow the [step-by-step onboarding guide](docs/getting-started.md).**
Repository: [balajiregt/playwright-agent](https://github.com/balajiregt/playwright-agent).

## Start with your prompt

Use $playwright-agent in your coding chat, or select Playwright Agent in Copilot.
The router reads your request and exclusions, then loads only the relevant skill.

| Request | Workflow |
| --- | --- |
| Create, edit, fix or execute tests | Test authoring → focused project checks → report |
| Assess acceptance criteria, test matrices, gaps or duplicates | Explicit assessment → evidence-linked findings → report |
| Verify assertion sensitivity using application faults | Explicit mutation verification → activation/execution/restoration evidence → report |
| Create tests and run mutation verification | Authoring → healthy tests → frozen-test mutation campaign → report |

Ordinary test changes do not trigger formal assessment, a traceability matrix,
mutation testing or extra models. Run-only requests do not authorize repairs.
Assessment-only work leaves source/tests unchanged and executes checks only when
requested. Nonfunctional testing is outside this agent's scope.

Examples:

- "Create the missing login tests from this ticket. Run the focused suite."
- "Fix this locator using the existing page object. No assessment or mutation."
- "Assess these tests against the acceptance criteria; do not change or run them."
- "Run mutation verification for this reviewed fault plan; keep tests unchanged."

Judgments are made by your coding agent's current model; no extra model, API key
or hosted provider is used. [Routing and prompts](docs/playwright-agent.md) ·
[Canonical router](.agents/skills/playwright-agent/SKILL.md).

## Does it help? Measured, not claimed

Each task ran twice with Claude Opus 5.5 on the same copy of
[CRM-Scale](examples/crm-scale/) (11 modules, 5 roles, 216 tests, 90 criteria):
once alone with all agent guidance removed, once with Playwright Agent. An
independent oracle scored both, under rules frozen before any run.

![How the value is measured](docs/diagrams/how-it-is-measured.svg)

![Results: assessment shows no measurable difference; mutation proof adds safety](docs/diagrams/results-crm-scale.svg)

- **Mutation proof: adds value.** Opus alone reached the right verdict too (11/12),
  but edited the real application in all 12 runs. With `npm run mutate`, 12/12
  correct and the original never touched.
- **Assessment: no measurable difference.** 97.0% vs 93.6% gap recall, short of
  the +10-point margin set in advance. Opus is already strong at reading tests.
- **Authoring:** tied 4/4 in the earlier run, so it was not re-run.
- **Cost:** level. An earlier, longer-prompt version cost more in 11 of 15 pairs;
  shortening the guidance and moving work into tools removed that overhead.

Limits: one model, one synthetic app, 27 pairs. Method, full results and every
disclosed deviation: [evidence](docs/evidence.md). Rerun the paired method before
relying on it for a different stack.

## Configure an existing project once

Keep this clone or extracted source ZIP as a local toolkit. Your tests,
configuration, page objects and fixtures stay in the adopting repository.

~~~sh
npm ci
npm ci --prefix quality
npm run agent:configure -- --repo /path/to/your-playwright-project --client both
~~~

The target must already declare @playwright/test and contain a Playwright config.
Use --playwright-config for another existing config path. Onboarding creates
project-local skill shims and/or a Copilot entrypoint, plus an ignored relative
toolkit configuration. It does not install a framework, select a task, run tests,
or overwrite conflicting files. Existing adopters must review changed shims
before replacing them; reconfiguration never overwrites them. Restart the client
session to refresh discovery. [Adoption and setup](docs/adoption.md).

Then add the evidence reporter beside your existing reporters, so every run is
saved and the HTML report is rebuilt:

~~~ts
reporter: [['list'], ['../playwright-agent/reporter/index.mjs', { task: 'LOGIN-123' }]],
~~~

## Supply only the context needed

A clear prompt or selected requirement file needs no task card or intake UUID.
For a larger ticket, keep private inputs in the target project's
contexts/tasks/WORK-ITEM/ folder. Attach supporting documents in chat when the
host exposes their local files or text.

Use [document intake](docs/document-intake.md) when PDFs, Jira exports or
spreadsheets need extraction and source-linked interpretation. The agent handles
structured formatting; the tester reviews ambiguities and any exact normalized
interpretation before acceptance. Intake is not a mandatory authoring phase.

For a focused check of whether one test's assertion proves one criterion, use
[requirement-to-assertion claims](docs/claim-evidence.md) (`npm run claims`).

## Inspect saved outcomes

The reporter attaches each Playwright run automatically. Save findings or a
mutation campaign, then rebuild the report:

~~~sh
npm run portal -- analysis --repo /path/to/your-project --task LOGIN-123 --file /path/to/findings.md
npm run portal -- attach --repo /path/to/your-project --task LOGIN-123 --kind mutation --file /path/to/campaign.json
npm run report -- --repo /path/to/your-project [--task LOGIN-123] [--serve]
~~~

`report` writes a self-contained `playwright-agent-report/index.html` (private,
Git-ignored); `--serve` also opens the local read-only viewer. For an existing
intake interpretation, add --run UUID to bind assessment findings to that exact
version. The viewer cannot upload, edit, approve or execute work.
[Report viewer](docs/portal.md).

## Harness conventions and legacy discovery graph

Reuse the target's framework layers, auth setup and helpers. Prefer semantic
locators, web-first assertions, focused changes and actual execution evidence.
The original [harness guide](docs/agent-workflow.md) covers specs, captures,
page objects, fixtures, debugging and evidence. MCP and official Playwright
agents are optional tool choices after task routing.

The source/test/coverage/duplicate graph (`npm run graph:view`) is a legacy
discovery demo for the small sample CRM. Its "coverage" means a route or capture
is mentioned by a test; it does not check criteria, roles or assertions. For
acceptance coverage use `coverage:matrix` and the report's Coverage index tab. Existing sample graph
commands use the CRM adapter. Configure the generic scanner or your own source
manifest for a different application; do not run the sample as project validation.

~~~sh
npm run source:manifest -- --root=/path/to/app --output=source-manifest.json
~~~

For the bundled CRM demonstration, npm run graph:view refreshes its sample
manifest and graphs. External projects must select their own manifest and sync
configuration as described in the harness guide.

![Example graph metrics](docs/assets/graph-metrics.png)

## Quality tools

The skills keep instructions short and hand repeatable work to deterministic tools:

```bash
# Would these tests catch this defect? Runs on a disposable copy, never the original.
npm run mutate -- --project examples/crm-scale --file app/api.mjs \
  --find "  const total = round2(raw);" --replace "  const total = Math.floor(raw);" --grep "quote totals"
# → baselines green twice, faulted runs fail twice: VERDICT killed, original project unchanged: yes

# Where is each criterion tested, and which role rules are never checked?
npm run coverage:matrix -- --project examples/crm-scale \
  --criteria examples/crm-scale/requirements/acceptance-criteria.json --flagged
```

![npm run mutate: hash, copy, baselines, fault, faulted runs, verdict](docs/diagrams/mutate-flow.svg)

![coverage:matrix flags a role rule checked for only two of five roles](docs/diagrams/coverage-matrix-example.svg)

Attach the index to a work item (`npm run portal -- attach … --kind coverage --file
matrix.json`, from `--json --out matrix.json`) and `npm run report` shows it in a
**Coverage index** tab: flagged role rules as a role-by-role grid, and every
criterion with its candidate tests. [Report viewer](docs/portal.md).

`mutate` answers one question with two healthy baselines and two faulted runs
(killed, survived, inconclusive or invalid). `coverage:matrix` is an index of
candidate tests with their roles and denial checks; it points, and the assertions
decide. `npm run tools:test` covers both.

- [Quality module](quality/README.md): intake, claim checks, behavioral mutation runner and report viewer.
- [Mutation workflow](quality/docs/behavioral-mutations.md): trusted local JS/TS targets, selected faults and configured probes; not universal application support.
- [Optional integrations](.agents/skills/playwright-agent/references/integrations.md): claim checks and the mutation runner's CLI/MCP tools.
- [Evaluation reports](docs/evaluation-reports.md): inspectable rule/expected/observed scorecards for proving the workflow on your own tasks.
- [Synthetic demo](examples/validation-demo/README.md): mutation verification on the bundled sample CRM, separate from daily authoring.

The source ZIP includes the skills and public synthetic CRM-DEMO-001 documents,
and excludes private tasks, credentials, dependencies and generated local reports.
