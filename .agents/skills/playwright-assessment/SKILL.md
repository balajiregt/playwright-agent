---
name: playwright-assessment
description: Assess functional acceptance coverage, requirement traceability, test matrices, gaps or duplicate coverage when the user explicitly requests that review.
---

# Playwright assessment

Read-only unless fixes are also requested: no source or test edits, and no test
runs or mutations unless asked.

1. **Index first.** When criteria are in a JSON file (`requirements` with `id` and
   `criterion`, optional `roleAccess`), run from the Playwright Agent root:

   ```bash
   npm run coverage:matrix -- --project <playwright project dir> --criteria <criteria.json>
   ```

   It lists candidate tests per criterion with the roles each runs as and whether
   it asserts a denial. It flags role rules ("only X can…") where an allowed role
   is never exercised or another role is never checked for a denial. The index
   is a pointer, not proof. Without a criteria file, find candidates by reading.
2. **Judge from assertions.** For each criterion, open the candidate tests and
   their helpers. Covered means an assertion would fail if this behaviour broke.
   Check every clause: each named role, state, value and both sides of an
   "only". Titles, flags, graph edges and green runs do not prove coverage.
3. **Classify** each criterion as covered, partial, missing or unknown, with the
   test reference and a one-line reason naming the missing clause. Use the
   project's requested output format, or the
   [assessment template](../playwright-agent/assets/acceptance-report.md).
4. Keep source quotes, judgments and any runtime evidence separate. A suspected
   weak assertion is a finding. Proving it needs an explicit mutation request.

If fixes were also requested, finish the findings first, then use
[test authoring](../playwright-test-authoring/SKILL.md). For document extraction
or evidence packets, see [intake](../../../docs/document-intake.md) and
[claim evidence](../../../docs/claim-evidence.md).
