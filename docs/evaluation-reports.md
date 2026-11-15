# Functional evaluation with inspectable scores

Each case records a request, expected outcome, actual output, evidence, rule,
score and reason. Keep the five capabilities separate:

| Capability | Evaluation check | Evidence required |
| --- | --- | --- |
| Acceptance assessment | Known gaps found; correct coverage not flagged | Reviewed labels, actual findings and assertion references |
| Test matrix | Each criterion linked to an assertion or explicit gap | Criteria inventory and inspected matrix records |
| Test authoring/editing | Requested behavior proved; old assertions preserved | Test diff, execution and requested sensitivity evidence |
| Mutation verification | Fault activated, repeated, classified and restored | Baselines, observations, attempts and restoration |
| Skill routing | Requested skills selected; exclusions respected | Actual request, recorded choices and outcomes |

A routing document is not an executed routing evaluation. A green run alone
does not establish assertion quality. Agreement between models is not a
correctness reference.

## Read the numbers

- **Evaluation points:** 1 when an observed value satisfies the declared rule;
  0 for a known mismatch. No overall weighted grade or leaderboard.
- **Observed facts:** values read directly from explicit JSON Pointers in saved,
  SHA-256-bound evidence. The report logs expected/actual values and their source.
- **Provider scores:** actual probabilities, confidence, usage and model identity,
  shown separately. Missing host scores stay null. These never award points.

Every check shows **rule → expected → observed → evidence → points/reason**.
The report shows matched/scored checks, total expected checks and unscored checks.
Missing, stale, unexecuted, inconclusive or unreviewed evidence stays unscored.
One scored failure makes the case Fail. Other missing checks require review;
every expected check must be scored and satisfied before a case can Pass.

Reference status `protocol` validates declared technical workflow rules;
`reviewed` records a named review of expected answers; `pending_review` keeps
correctness unscored. Reviewer identity and independence are recorded declarations,
not authenticated by this report. Passing protocol checks does not establish
correct acceptance assessment or product acceptance.

## Generate and inspect

The coding agent prepares the manifest from the selected task and saved outputs.
Testers review the expected outcomes and evidence. Include all five capabilities,
with explicit not-run cases where appropriate. Freeze expected answers before
inspecting the agent's actual decisions.

```sh
npm run eval -- report --repo . \
  --input quality/examples/evaluation/manifest.json \
  --out artifacts/evaluations/example-001
```

The example is fictional synthetic evidence and labelled as such. Use a new
output directory for each run; existing directories are preserved. Input/output
paths are caller-relative; evidence paths are relative to `--repo`. File hashes
are standard SHA-256 of bytes. Rules: strict equal, numeric at_least/at_most,
text contains. JSON Pointers escape / as ~1 and ~ as ~0.

Outputs are `evaluation.json`, `evaluation.md` and a standalone `index.html`.
The HTML embeds no external assets. Expand details to inspect provider scores,
evidence paths and hashes. Raw documents/source are not automatically copied;
selected expected/observed values may still be private. Prepare a reviewed,
sanitized report before sharing with the community.

Display the Markdown in the existing viewer with:

```sh
npm run portal -- analysis --repo PROJECT --task ID --file evaluation.md
```

This builder never invokes an agent/provider, executes tests/mutations, publishes
or deploys. Assessment and mutation remain explicitly requested tasks. Existing
comparison reports and publication contracts remain unchanged. Unknown billing,
timing and independently reviewed correctness remain unknown.
