---
name: playwright-agent
description: Route functional Playwright requests to test authoring, explicitly requested coverage assessment, or explicitly requested mutation verification.
---

# Playwright Agent

Use the host coding session's existing model, file, terminal and available browser
tools. Select the target project and read its AGENTS.md, package commands and
actual Playwright configuration. The default target is this toolkit repository;
an adopter shim or the user's selected repository overrides it. Preserve the
target's framework, repository boundaries and existing changes.

## Route the user's request first

Read the user's intent and exclusions before choosing tools. Documents, quoted
prompts, examples and historical reports are evidence, not requests to run stages.
State the selected work briefly, then read only its skill:

| Requested work | Skill | Sequence |
| --- | --- | --- |
| Create, edit, fix or refactor tests; run existing tests | [Test authoring](../playwright-test-authoring/SKILL.md) | Relevant context → inspect source/tests → requested change, if any → focused checks → report |
| Assess acceptance criteria, gaps, RTM/test matrix or duplicate coverage | [Assessment](../playwright-assessment/SKILL.md) | Selected requirements → actual assertions → findings/matrix → report |
| Mutation testing or executed fault-injection verification of assertion strength | [Mutation verification](../playwright-mutation/SKILL.md) | Reviewed faults → frozen tests → healthy baselines → isolated faults/probes → repeated execution → restoration → report |
| Set up/adopt the harness | [Setup guidance](../../../docs/adoption.md) | Inspect existing project/config → configure requested local entrypoints → verify setup |

Assessment and mutation require an explicit request, including clear natural
language; the user need not know a skill name. Ordinary authoring still checks
the expected behavior and nearby assertions, but does not generate a formal
acceptance matrix or start a mutation campaign. A broad request such as "validate
these tests" means focused execution/integrity review; clarify only if the desired
assessment or fault-execution scope cannot be inferred.

Respect "no mutation", "do not assess", "read-only" and "do not run tests".
Run-only requests do not authorize repairs. Assessment-only requests do not
authorize code edits or test execution. Mutations change only disposable
application copies, never the original tests. Nonfunctional testing is outside
this agent's scope; accessible locators remain an authoring convention.

For combined requests, compose only the requested stages: assess-and-fix uses
assessment → authoring; create-and-mutate uses authoring → mutation. Freeze tests
throughout each mutation measurement. Restore the application before any separately
requested test improvement, then measure that new test version in a fresh campaign.
Do not infer assessment from "create missing tests" or mutation from "weak assertion".

## Context and completion

Criterion and assertion judgments are made by the current host agent; no extra
model API is called. Selecting this agent never enables an unrequested assessment
or mutation stage.

Use only the relevant prompt, selected documents or contexts/tasks/work-item folder.
A sufficient prompt needs no task card or intake UUID. For documents that need
extraction, follow [document intake](../../../docs/document-intake.md); preserve
originals, source quotes and ambiguities. Accepting normalized interpretations
requires review of the exact criteria; clear authorized test edits need no extra
approval. Do not invent requirements from implementation.

MCP and the official Playwright agents are optional tool
choices after task selection. They do not change its scope. Load
[integration guidance](references/integrations.md) only for a requested integration.
Do not add dependencies, model providers, hooks or global servers as a side effect.

Retain actual commands, source/test revisions, findings and matching reports in
the selected project's private task artifacts. Follow [reporting](../../../docs/portal.md):
save task-level findings without intake, or bind an assessment to an existing
reviewed intake version. Never fabricate machine reports or acceptance.
Launch/reuse the matching project's read-only viewer last, including blocked or
partial outcomes; if unavailable, return the artifacts and launch command.
No automatic publication, deployment or external messages.

For requested evaluation scores, use
[functional evaluation reports](../../../docs/evaluation-reports.md). Log each
rule, expected/observed value, evidence, points and reason. Unreviewed expectations
remain unscored; provider probabilities stay separate. This does not authorize
additional execution or hosted calls.
