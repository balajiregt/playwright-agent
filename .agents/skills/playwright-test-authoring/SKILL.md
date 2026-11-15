---
name: playwright-test-authoring
description: Create, edit, repair, refactor or execute functional Playwright tests using the selected project's existing framework and focused verification.
---

# Playwright test authoring

Follow the selected project's AGENTS.md, actual configuration and the
[router's scope rules](../playwright-agent/SKILL.md). Use the user's target,
requirements and execution constraints. Run-only requests leave code unchanged.

1. Read the relevant requirements, source, existing tests, helpers and fixtures.
   Inspect nearby coverage to avoid duplicate tests. Report unsupported product
   behavior or ambiguous expectations without weakening assertions.
2. Make the smallest requested change in the owning test/page/assertion/fixture.
   Use the target's existing structure. For broad new flows, read the relevant
   [harness authoring guidance](../../../docs/agent-workflow.md#test-authoring-rules);
   small locator/assertion edits need no new spec, graph or document intake.
3. Obtain current page evidence only when needed. Prefer accessible locators,
   stable test IDs, web-first assertions and existing auth/setup helpers. Never
   use fixed sleeps or invent browser observations.
4. Typecheck executable TypeScript changes and run the narrowest relevant tests,
   plus repository-required checks within the authorized scope. Inspect real
   failures before repairing; an application gap is not permission to change its
   expected behavior. Respect an explicit instruction not to execute.
5. Retain changed files, command/results, revisions, limitations and real reports;
   save task findings and open the [viewer](../../../docs/portal.md) last.

Do not start a formal assessment, create an RTM/acceptance matrix or inject
faults unless the user requested that additional
stage. Ordinary assertion and duplicate checks are part of careful authoring,
not a suite-wide assessment. Nonfunctional checks are outside this skill.
