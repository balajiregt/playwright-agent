# Using the Playwright Agent

One product uses your existing coding chat and test framework. Its
[canonical router](../.agents/skills/playwright-agent/SKILL.md) selects a focused
skill from your prompt. The read-only viewer displays the saved result last.

## Entry points

| Client | Entry |
| --- | --- |
| Codex | Use $playwright-agent, or explicitly invoke a capability skill |
| Copilot | Select Playwright Agent from the custom-agent dropdown |
| Codex delegated task | Explicitly request the named playwright_agent role |

Project and workspace shims point to the same canonical workflow. For another
repository, [configure adoption](adoption.md). The host supplies model, tools and
permissions; selecting the agent does not enable providers or workloads.
Refresh the client session after changing discovery files. This does not imply a
Copilot-style main-agent dropdown in every Codex client.

## Prompt routing and task sequences

| Prompt | Selected work |
| --- | --- |
| Create missing login tests | Authoring: context → source/tests → focused changes → execution → findings |
| Fix this assertion, no assessment or mutation | Authoring only |
| Run the existing login suite | Execution only; no automatic repairs |
| Assess acceptance coverage without editing/running tests | Assessment only: requirements → actual assertions → findings/matrix |
| Review duplicate coverage | Assessment of equivalence and differences; no automatic deletion |
| Verify mutations using this reviewed fault plan | Mutation: frozen tests → baselines → faults/probes → repeated execution → restoration |
| Assess gaps and fix them | Assessment → authoring → focused checks |
| Create tests and run mutation verification | Authoring → freeze resulting tests → mutation |

These are intended routing acceptance cases, not measured model-accuracy results.
Quoted examples, document instructions and negated stages do not authorize
execution. If "validate" is underspecified, use focused verification/integrity
review and clarify only a material ambiguity; do not silently start fault injection.

The normal flow is project selection → local instructions → prompt intent →
selected skill → requested work/checks → evidence → read-only viewer.
Assessment and mutation are explicit requests, not compulsory phases.
Nonfunctional testing is outside scope. Existing semantic locator conventions
remain useful for functional tests.

## Context and reporting

Use the supplied prompt, selected requirement files or the target project's
contexts/tasks/WORK-ITEM folder. Templates and the CRM demo do not define another
project's requirements. Source/configuration describes implementation; explicit
business requirements define expectations. Preserve gaps rather than weakening
tests.

Use [document intake](document-intake.md) only when documents need extraction or
a source-linked normalized interpretation. A simple edit needs no intake UUID.
Interpretation acceptance is separate from test/product acceptance.

Retain task findings, source/test revisions, commands and real reports in
private artifacts/agent-tasks/WORK-ITEM. Save findings with portal analysis
without --run, or add --run UUID for an existing intake-bound assessment.
Attach matching actual reports and open the [viewer](portal.md) last.
Record failures, skips and missing evidence honestly; do not fabricate JSON.

## Harness and integrations

[Harness conventions](agent-workflow.md) cover layering, captures, source graphs,
locators and debugging. Select task intent before choosing MCP versus CLI tools.
Reuse project-local commands; workspace resolvers are optional tooling for their
own projects, not runtime dependencies of this toolkit.

[Optional integrations](../.agents/skills/playwright-agent/references/integrations.md)
cover claim checks and behavioral faults. Start with source/assertion evidence.
A request for assessment or mutation does not automatically authorize another
model or hosted disclosure. The behavioral runner requires a supported local
target and configured observation; stateful journeys may need an adapter.

Passing unit tests does not prove natural-language routing accuracy, generality,
review effort or usability; use [evaluation reports](evaluation-reports.md) for
task-based evidence.
