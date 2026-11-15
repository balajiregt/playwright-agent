# Playwright task assessment

Use for explicitly requested coverage/matrix assessment. Ordinary authoring uses
task findings and actual verification reports without requiring this matrix.

- Request and mode:
- Selected repository and source revision/working-tree state:
- Requirement source files/quotations and intake/draft version, if used:
- Application source and test/helper/config revisions or working-tree references:
- Browser/tool path used:

## Acceptance matrix

| Criterion and source | Scenario / role / state | Test and assertion evidence | Coverage assessment | Action or gap | Runtime evidence |
| --- | --- | --- | --- | --- | --- |

Coverage assessment: supported, partial, missing, or unknown. Runtime evidence:
passed, failed, skipped, or not run, with the actual command/report reference.
Implementation-derived scenarios are identified separately from supplied criteria.
Connect every supported judgment to the concrete assertion and relevant helper
location. Match runtime evidence to the reviewed requirement, test/config and
application revisions. Unmatched or missing evidence remains unknown/not run.
For an existing intake `matrix.csv`, preserve its headers and put longer revision
and action references in this analysis instead of inventing a parallel schema.

## Verification

| Command | Actual outcome | Evidence location / relevant failure |
| --- | --- | --- |

## Optional analysis

- Claim checks: not run unless requested. Record the agent's judgment with
  evidence references; judgments are advisory, not observed acceptance.
- Mutation sensitivity: not run unless requested. Record activated faults,
  killed/survived/inconclusive outcomes, baselines and restored-green evidence.

## Outcome

For a requested evaluation scorecard, use [the evaluation report](../../../../docs/evaluation-reports.md).
Record each rule, expected and observed value, evidence, binary points and reason.
Show expected/scored/unscored denominators. Keep actual provider probabilities,
model/version and request provenance separate. Missing reference answers stay
unreviewed; agreement with another model is not the reference answer.

State which requested criteria are supported by which observed checks, which
remain unresolved, changed files, skipped gates and the next concrete blocker.
Keep requirements-interpretation approval separate from test/product acceptance.
Do not report fulfillment while the relevant assertion or runtime evidence is missing.

After retaining the matrix, analysis and actual reports, open the selected
project's read-only report viewer last. Include assess-only and partial/blocked
outcomes. The viewer inspects evidence; it does not author, approve or execute.
