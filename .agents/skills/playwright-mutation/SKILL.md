---
name: playwright-mutation
description: Prove by execution whether unchanged Playwright tests catch a specific application defect, only when mutation or fault-injection verification is explicitly requested.
---

# Playwright mutation verification

A verdict counts only if it comes from execution. Use the tools; do not edit the
application or tests to inject a fault.

## One question: "would the tests catch this defect?"

1. Read the requirement and the source that implements it. Write the fault as an
   exact find/replace that breaks that behaviour (the text must occur once).
2. Pick the narrowest test scope that should catch it (`--test` file or `--grep`).
3. Run, from the Playwright Agent root:

   ```bash
   npm run mutate -- --project <playwright project dir> --file <path in project> \
     --find "<exact source text>" --replace "<faulty text>" [--test tests/x.spec.ts] \
     [--env PORT_VAR=4399] [--keep]
   ```

   It copies the project into its ignored `.mutation-work/`, runs two healthy
   baselines, applies the fault to the copy only, runs the tests twice, and reports
   **killed** (the same tests fail every run, named), **survived**, **inconclusive**
   or **invalid**. It also proves the original project unchanged.
4. If it survived, confirm the fault is really active. Re-run with `--keep` and
   observe the broken behaviour in the kept copy (for example a request or a page
   check), then delete the copy. An unobserved survivor stays inconclusive.
5. Report the fault, the scope, the verdict, the killing tests and the
   "original unchanged" line. Do not fix tests during a measurement.

## A campaign over many requirement-linked faults

Use the existing runner (`npm run mutation`). Follow
[behavioural mutation guidance](../../../quality/docs/behavioral-mutations.md) and
[quality/AGENTS.md](../../../quality/AGENTS.md). Its denominator and scope stay
explicit; it does not establish general test completeness.

When test improvements are also requested: finish the measurement, use the
[authoring skill](../playwright-test-authoring/SKILL.md), then re-run the same faults.
