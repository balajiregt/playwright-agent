# Optional claim-check and mutation integrations

These stages extend the selected task; they are not prerequisites for writing
tests. Do not install providers, connect global MCP servers, change model
configuration or publish as a side effect.

## Use the product's quality module

The selected Playwright Agent repository owns `quality/`. Read `quality/AGENTS.md`
and the relevant guide there. Use the root `npm run claims`, `npm run mutation`
and `npm run report` commands; no separate evaluator repository or copied runner
is required.

- Assertion claim checks: `docs/claim-evidence.md`.
- Behavioral execution: `quality/docs/behavioral-mutations.md`.
- Stateful observation adapters: `quality/docs/mutation-adapters.md`.

The synthetic role-aware sample remains a fixture, not validation of the selected
CRM/team login flow. Configure the actual repository, allowed app source,
requirements, projects, readiness and an independent observation adapter. Keep
original tests and working source unchanged during fault execution.

## Judge criteria and assertions in the host agent

Criterion/test judgments are made by the current host session; no extra model
API is called. Provide the actual relevant test bodies, helpers, role/state and
requirement, not just names. Keep an insufficient-evidence outcome available.
`npm run claims -- prepare` freezes that evidence; `claims run` hands it to this
session and records hash-bound answers. Never treat formatted output as accuracy,
calibration or acceptance proof. Reviewed labels and observed execution outcomes
are distinct evaluation evidence.

## Run behavioral faults

The mutation runner is also exposed as a local MCP server with `context`,
`evidence` and `inspect` tools, plus `plan` or `run` only when their flags are
given:

```text
npm run mutation -- mcp --config <selected-config>
```

 Without it, use the CLI from
the Playwright Agent product root:

```text
npm run mutation -- context --config <selected-config>
npm run mutation -- inspect --config <selected-config>
npm run mutation -- run --config <selected-config> --allow-run
```

`context` and `inspect` read context/an existing valid plan; `run` requires a
valid plan and explicit execution scope. If no plan exists, prepare and validate
one using the runner's documented workflow. Codex CLI planning (`plan
--allow-hosted`) needs its own authorization; do not silently enable it. Never
register the server globally just to complete a task.

## Interpret fault execution

Use disposable application copies and the runner's green baselines, independent
fault activation observation, repeated test execution and restored-green checks.
An activated fault that the suite repeatedly fails on is killed; one it
repeatedly passes on survived. Unactivated faults, startup failures, flaky
outcomes and missing probes are inconclusive, not detected bugs or coverage gaps.
Do not generalize a selected fault catalogue to all possible defects.

Attach the campaign with `npm run portal -- attach --kind mutation` and rebuild
the report with `npm run report`. Reports stay local; this agent does not publish
them.
