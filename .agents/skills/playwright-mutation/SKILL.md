---
name: playwright-mutation
description: Execute requirement-guided application fault injection against unchanged Playwright tests only when mutation verification is explicitly requested.
---

# Playwright mutation verification

Use only for explicit mutation/fault-execution requests. Follow the target's
instructions, the [router](../playwright-agent/SKILL.md), [quality guidance](../../../quality/AGENTS.md) and
[behavioral mutation guidance](../../../quality/docs/behavioral-mutations.md).
Reuse the existing runner; Stryker and extra models are not prerequisites.

1. Select a bounded requirement-linked fault plan and actual target source,
   startup commands, Playwright scope and independent observation. Validate that
   the runner supports the target. Use built-in page text/count probes for simple
   observations, or an explicitly configured project-owned probeAdapter for a
   multi-step journey. Review its setup, expected observation and source binding.
   Report missing adapters rather than claim universal application support.
   Do not run a historical demo as this task.
2. Bind the plan to current requirements/application/test/config revisions.
   Freeze the existing tests and helpers. Authoring requested in the same prompt
   must finish and pass focused checks before this measurement begins.
3. Use a disposable application copy and establish at least two healthy baselines.
   Activate one fault, independently observe its requirement-breaking behavior,
   and run the same tests twice.
4. Record repeatable assertion detection as killed, and repeated passing after
   activation as survived. Startup errors, invalid/unactivated faults, incomplete
   runs and unstable failures remain excluded/inconclusive, not detected faults.
5. Restore the application and verify green; verify original source/tests remain
   unchanged. Retain patches, activation, attempts, killing assertions and
   restoration evidence in the campaign report.
6. Attach the actual campaign and task findings, then open the
   [read-only viewer](../../../docs/portal.md) last. Keep this campaign's
   denominator and scope explicit; it does not establish general test completeness.

Do not edit tests during a measurement or automatically fix survivors. When
improvements are also requested, restore first, use the
[authoring skill](../playwright-test-authoring/SKILL.md), and measure the new
test version separately against the same reviewed faults.
Load [optional integrations](../playwright-agent/references/integrations.md) only
when requested. A mutation request does not authorize hosted planning, model
comparisons, global MCP installation or publication.
