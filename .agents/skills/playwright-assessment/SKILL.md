---
name: playwright-assessment
description: Assess functional acceptance coverage, requirement traceability, test matrices, gaps or duplicate coverage when the user explicitly requests that review.
---

# Playwright assessment

For explicitly requested requirement-to-assertion checks, use
[the claim-evidence workflow](../../../docs/claim-evidence.md). Reuse the actual
test/helper collector and selected provider. Exclude incomplete or stale evidence
before inference, retain packet/source hashes and never infer whole-suite coverage
from one selected test. Keep reference labels out of model inputs.

For explicitly requested evaluation scores, follow
[evaluation reporting](../../../docs/evaluation-reports.md); no invented model
confidence or score for missing/unreviewed evidence.

Use only for requested assessment. Follow the selected project's instructions
and [router](../playwright-agent/SKILL.md). Leave application source and tests
unchanged unless the user also requests fixes. Saving private findings is allowed;
assessment alone does not authorize test execution or mutation.

Make criterion/assertion judgments in the current host agent session; no second
model is called. Keep those judgments separate from source evidence and runtime
results. Missing helpers/evidence stay unknown.

1. Select the relevant requirements and test scope. Extract documents only when
   necessary using [intake](../../../docs/document-intake.md). Preserve source
   quotations, conflicts and unknowns; source code describes implemented behavior,
   not business approval.
2. Inspect actual test bodies, helpers, fixtures, role/state setup and assertions.
   Titles, graph edges, green reports and imported RTM labels do not prove coverage.
3. For coverage/matrix work, map criterion/source → scenario/role/state → actual
   assertion → supported/partial/missing/unknown → action/gap. Use the existing
   [assessment template](../playwright-agent/assets/acceptance-report.md).
   For duplicate-only review, report equivalence/differences and proposed action;
   do not force a full acceptance matrix or remove tests.
4. Keep runtime evidence separate and revision-matched. Run selected checks only
   if requested; otherwise mark execution not run. A suspected weak assertion is
   a finding, not authorization to execute mutations or advisory models.
5. Save the analysis and any requested matrix in the existing private work-item
   paths. With intake, preserve matrix headers and bind findings to its exact
   version; without intake, use task-level findings. Open the
   [report viewer](../../../docs/portal.md) last.

If assessment and fixes were both requested, finish the findings first, then
follow [test authoring](../playwright-test-authoring/SKILL.md) for the authorized
changes and focused verification. Do not claim complete acceptance from static
review or a passing unrelated suite.
