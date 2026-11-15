# Evidence: what Playwright Agent adds to Claude Opus

Paired trials on [CRM-Scale](../examples/crm-scale/), November 2026, Claude Opus 5.5
in headless Claude Code. The rules below were written and frozen (with SHA-256
hashes of every input) before any session ran.

## Method

- **Arms.** Each task runs twice on identical project copies. *Opus alone*: all
  agent guidance removed (AGENTS.md, CLAUDE.md, skills, contexts); the project's
  scripts, including the tools, stay but nothing points to them. *Opus + Playwright
  Agent*: the router, one skill and the tools. Arm order alternates by repeat.
- **Assessment oracle.** An answer key of 90 criteria (70 covered, 14 natural gaps,
  6 ambiguous and excluded). Every gap was proven with a fault that the suite
  misses. Variants B–E remove tests to plant extra gaps.
- **Mutation oracle.** Six faults (MS1–MS6) with known outcomes; a verdict counts
  only if it is proven by execution and the app is left unchanged.
- **Decision rules.** Assessment: Playwright Agent must add at least 10 points of
  recall and win more pairs than it loses, without more false alarms. Mutation:
  correct, fully proven verdicts and a safe method. Efficiency: cheaper in at
  least two thirds of pairs and a bootstrap 95% CI on the median saving that
  excludes zero.

## Results (tools-first version)

| Skill | Pairs | Opus alone | Opus + Playwright Agent | Verdict |
| --- | --- | --- | --- | --- |
| Assessment: gap recall | 15 | 93.6% (247/264), CI 89.9–95.9 | 97.0% (256/264), CI 94.1–98.5 | No measurable difference |
| Assessment: false alarms | 15 | 1 of 996 | 3 of 996 | |
| Assessment: the 4 role-permission gaps | 15 | 44 / 60 | 52 / 60 | Secondary measure |
| Mutation: correct, proven verdict | 12 | 11 / 12 | 12 / 12 | **Adds value** |
| Mutation: real source never edited | 12 | 0 / 12 | 12 / 12 | |
| Median cost per run (assessment / mutation) | | $1.20 / $0.45 | $1.14 / $0.41 | No measurable difference |

Pair outcomes for assessment: 8 wins, 3 losses, 4 ties. Authoring was not re-run
for this version; the earlier run tied 4 of 4.

## What it means

- **Mutation proof is where the add-on earns its place.** Opus alone usually gets
  the verdict right, but it gets there by editing the real application and then
  restoring it, in every run. `npm run mutate` gives the same answer from a
  disposable copy and proves the original unchanged.
- **Assessment is a wash.** Opus already reads tests well. The skill's instruction
  to check every clause of a role rule may help with role gaps (52 vs 44 of 60),
  but `coverage:matrix` ran in only 3 of 15 sessions, so the tool does not explain
  the difference, and the overall margin is below the bar set in advance.
- **Shorter guidance removed the cost overhead.** The previous, prose-heavy version
  cost more in 11 of 15 assessment pairs. This version cost less in 9 of 15, which
  is level within noise.

## Disclosed deviations

- The answer key was revised once, after a calibration pair and before the frozen
  runs; the revision is versioned.
- The tools-first rules were re-frozen once, after a dry run showed that
  `coverage:matrix` did not read the arm's `criteria` key. No scored session ran
  before the re-freeze.
- One assessment pair hit a usage limit repeatedly; those refused attempts were
  abandoned and the pair re-run from scratch. Refused runs are not scored.
- Some sessions had harmless shell commands blocked by the trial allowlist (for
  example `for` loops); both arms were affected and every blocked call is logged.
- The automatic "skill content received" check missed skills loaded through the
  Skill tool, so it reports false for mutation runs that visibly followed the skill.

## Limits

One model, one synthetic application, 27 pairs. Treat this as evidence for this
setup, and rerun the paired method on your own stack before relying on it.
