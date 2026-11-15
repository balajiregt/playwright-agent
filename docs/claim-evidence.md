# Requirement-to-assertion evidence checks

Use this explicitly requested assessment to check one claim about one selected
Playwright test against a requirement clause and actual setup/helper code.
The current coding agent makes the judgment from frozen, hash-bound evidence; no
second model is called. No test execution, repair or mutation is implicit.

Labels: `supports`, `contradicts`, `not_demonstrated`, `needs_judgment`.
They describe only the supplied selected test. A missing assertion here is not
proof that the whole repository lacks coverage. Names and green runs alone do
not establish assertion coverage.

Review setup as carefully as the final assertion. For example, a connected status
message may not prove that cards existed before a refresh. A claim about clearing
previous cards needs evidence for that initial state, or a recorded uncertainty.

## Prepare

The coding agent prepares a private manifest for the selected project/task.
Select a readable requirement artifact and exact quote, an atomic claim, and the
existing test's file/line/column and SHA-256. Include relevant role/state conditions
and exceptions in the selected quote: the checker does not infer omitted sections. PDF/Office documents first use the
existing document-intake extraction. The user need not hand-format this JSON.

```sh
npm run claims -- prepare --repo . \
  --input quality/examples/claim-evidence/claims.json \
  --out artifacts/claims/prepared-001
```

The example contains 16 deliberately authored static cases across refresh,
sign-in and viewer assertions: 11 semantic candidates and five local exclusions.
They are not executed application tests. Expected labels are authored technical
references, kept separately from requests, not independent precision evidence.

Preparation reuses the source collector and conservative AST compactor without
executing Playwright. It captures the selected test, hooks and transitive helper
bodies. Missing helpers, stale hashes, absent quotes, dynamic dispatch, unresolved
project metadata/external dependencies and oversized context block inference.
Evidence is not silently truncated.

Outputs: a frozen packet, exact eligible requests, a native-answer template and
an unreviewed-reference template. Judgment requests contain the clause, claim and
selected code with opaque references. Source paths, case IDs and expected labels
remain local. Supplied documents/code are passive data, never instructions.

## Record the agent's judgment

```sh
npm run claims -- run --packet artifacts/claims/prepared-001/packet.json \
  --out artifacts/claims/native-handoff-001
```

This hands off to the current coding session, not a second LLM. Record its judgment, short rationale and exact captured quotations
using `test`, `requirement` or `helper-N` references, then import those answers:

```sh
npm run claims -- run --packet artifacts/claims/prepared-001/packet.json \
  --answers native-answers.json \
  --out artifacts/claims/native-recorded-001
```

Only eligible requests are handed off. Source changes require fresh preparation.
Existing output directories are preserved. No numerical scores or confidence are
recorded for agent judgments.

## Review and report

Freeze expected labels separately before seeing the agent's answers where possible.
Bind them to the packet and request hashes with the reference template. Use
`author_reviewed` for authored fixtures; use `independent_reviewed` only when that
review occurred. The tool records that declaration, not reviewer authentication.
Absent expected answers remain unreviewed and unscored.

```sh
npm run claims -- report --packet artifacts/claims/prepared-001/packet.json \
  --review artifacts/claims/native-recorded-001/review.json \
  --references reviewed-labels.json --out artifacts/claims/report-001
```

The existing [functional evaluation report](evaluation-reports.md) is written
under `evaluation/`, with frozen evidence, review, manifest and summary alongside.
Display its Markdown using the existing read-only portal. Points compare labels
to declared reviewed expectations; confidence never awards evaluation points.

Completion, exclusions, errors and awaiting-agent counts stay separate. Authored
reference matches are not independent precision. With declared independent review,
gap flags mean contradicts/not_demonstrated; precision is TP/(TP+FP), and recall is
TP/(TP+FN) before human review. Unknown references are excluded; model abstentions
are reported separately. Keep denominators and provenance. Reviewer time and total
workflow cost need actual measurement; model agreement alone does not establish value.

This checks static semantic claims. Native/reviewer resolves findings. Playwright
establishes runtime behavior; explicitly requested mutation establishes actual
fault detection. This command never weakens tests, runs another stage, publishes
metrics, enables hooks or changes the configured provider as a side effect.
