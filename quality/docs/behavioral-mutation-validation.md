# Behavioral mutation pilot — 31 October 2026

The first implementation measured **two detected faults and one surviving fault**
using seven existing tests in the role-aware sample's viewer project. The epic
and Jira-like exports are authored examples, not customer downloads.

| Criterion | Independent activation observation | Existing tests, twice |
| --- | --- | --- |
| Viewer must not see admin console | Admin action count: 0 → 1 | Detected by the role-matrix test's absent-action assertion |
| Display the correct action count | Label: 3 actions → 4 actions | All seven passed; an assertion gap |
| Display the viewer workspace title | Correct title → Viewer Workspace | Detected by the role-matrix test's title assertion |

Two baselines and the restored baseline each passed **7/7**. Each mutation ran
separately in a disposable copy. Original source was unchanged. The conclusive
campaign took **58.46 seconds** and produced an observed detection rate of **2/3**.
This describes only these three selected faults, not overall suite effectiveness.

Run ID: `e015b7b2-8124-4808-b360-c74fa3fa0eeb`.
Private artifacts: `artifacts/behavioral-mutations/<run-id>/`.

Codex CLI generated the three requirement-linked patches from exact document
quotes in **13.69 seconds**, using 17,742 input and 578 output tokens. It used
the CLI default model; no resolved model name was emitted, and actual cost is
unavailable. The plan and usage records remain local.

This run also recorded retired model-prediction research; that part is omitted
here (the original record is kept in the local recovery archive). Only the
observed Playwright outcomes below count as detection evidence.

The first campaign retained two inconclusive results because the assertion wait
and test timeout expired together. After giving assertions a shorter timeout,
the complete baseline/mutant/restoration sequence was rerun. Earlier artifacts
were retained; their results were not relabelled as successful detections.

The final installed root and optional dependency sets audited clean.

Verification: TypeScript checking, 72 offline/unit/integration tests, required
historical previews, and extraction of synthetic PDF/DOCX/HTML/XLSX documents.
The generated HTML was opened and inspected in a browser. No new reports were
published, no global MCP configuration was changed, and no test assertions were
added to hide the surviving fault. Legacy DOC/XLS imports are supported through
existing converters/readers but were not exercised in this pilot.
