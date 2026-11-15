"""Generate the Playwright Agent diagrams as SVG: python3 docs/diagrams/generate.py docs/diagrams"""
import sys
from html import escape
from pathlib import Path

OUT = Path(sys.argv[1])
BG, INK, MUTED, LINE = "#0b1220", "#e6edf7", "#9fb0c8", "#5b6b85"
C = {  # fill, stroke
    "neutral": ("#161f30", "#3a4a66"), "teal": ("#0f2f2c", "#2bb3a3"), "blue": ("#0f2540", "#4d9de0"),
    "violet": ("#211a3d", "#8b7cf0"), "amber": ("#33240c", "#e0a33a"), "red": ("#3a1518", "#e06666"),
    "green": ("#123020", "#4cc38a"),
}
FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"


class Svg:
    def __init__(self, w, h, title, subtitle):
        self.w, self.h, self.parts = w, h, []
        self.parts.append(f'<rect width="{w}" height="{h}" fill="{BG}"/>')
        self.text(60, 70, title, 34, INK, weight=700)
        self.text(60, 106, subtitle, 18, MUTED)

    def text(self, x, y, s, size=17, fill=INK, weight=400, anchor="start", mono=False):
        self.parts.append(f'<text x="{x}" y="{y}" font-family="{MONO if mono else FONT}" font-size="{size}" '
                          f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{escape(s)}</text>')

    def box(self, x, y, w, h, kind, title=None, lines=(), size=16, mono=False, center=False, title_size=19):
        fill, stroke = C[kind]
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')
        tx, anchor = (x + w / 2, "middle") if center else (x + 20, "start")
        ty = y + 34
        if title:
            self.text(tx, ty, title, title_size, INK, 700, anchor)
            ty += title_size + 10
        for line in lines:
            colour = MUTED if not line.startswith("!") else stroke
            self.text(tx, ty, line.lstrip("!"), size, colour, 400, anchor, mono)
            ty += size + 9

    def arrow(self, x1, y1, x2, y2, dashed=False):
        dash = ' stroke-dasharray="7 6"' if dashed else ""
        self.parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{LINE}" stroke-width="2.5"{dash} marker-end="url(#a)"/>')

    def path(self, d):
        self.parts.append(f'<path d="{d}" fill="none" stroke="{LINE}" stroke-width="2.5" marker-end="url(#a)"/>')

    def save(self, name, desc):
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" '
                f'role="img" aria-labelledby="t d"><title id="t">{escape(name)}</title><desc id="d">{escape(desc)}</desc>'
                f'<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
                f'<path d="M0,0 L10,5 L0,10 z" fill="{LINE}"/></marker></defs>')
        (OUT / f"{name}.svg").write_text(head + "".join(self.parts) + "</svg>\n")


OUT.mkdir(parents=True, exist_ok=True)

# 1. Hero: how Playwright Agent works
s = Svg(1400, 760, "Playwright Agent", "An add-on for coding agents: short skills route the work, deterministic tools do the proving")
s.box(60, 170, 230, 170, "neutral", "Request", ['"Would our tests catch', 'a rounding bug in', 'quote totals?"'])
s.box(330, 170, 200, 170, "violet", "Router skill", ["reads the intent", "and exclusions,", "loads one skill"])
rows = [("teal", "Test authoring", "create · edit · fix · run", "project's own tests", "focused run, framework fit"),
        ("blue", "Assessment", "criteria → assertions", "npm run coverage:matrix", "index of candidates, findings per clause"),
        ("amber", "Mutation proof", "would tests catch it?", "npm run mutate", "verdict from execution, original unchanged")]
for i, (kind, skill, what, tool, ev) in enumerate(rows):
    y = 150 + i * 150
    s.box(580, y, 220, 120, kind, skill, [what])
    s.box(840, y, 250, 120, kind, "Tool", ["!" + tool], mono=True, size=15)
    s.box(1130, y, 220, 120, "neutral", "Evidence", [part.strip() for part in ev.split(",")], size=15)
    s.arrow(800, y + 60, 836, y + 60)
    s.arrow(1090, y + 60, 1126, y + 60)
    s.path(f"M530,255 C555,255 555,{y + 60} 576,{y + 60}")
s.arrow(290, 255, 326, 255)
s.box(60, 620, 1290, 90, "neutral", None, [])
s.text(705, 658, "Host coding agent (Claude Code, Codex, Copilot) makes every judgment. No extra model, hooks or servers.", 18, INK, 600, "middle")
s.text(705, 688, "Guidance stays short (router + one skill ≈ 4 KB); repeatable work goes to tools that cannot skip steps.", 16, MUTED, 400, "middle")
s.save("playwright-agent-overview", "A request goes to a router skill, which loads one of three skills: test authoring, assessment or mutation proof. "
       "Each skill hands its repeatable work to a tool (the project's tests, coverage:matrix, mutate) and returns evidence.")

# 2. How it was measured
s = Svg(1400, 700, "How the value is measured", "Paired trials: the same model, prompt and project copy, with and without Playwright Agent")
s.box(60, 170, 300, 230, "neutral", "One task", ["CRM-Scale: 11 modules,", "5 roles, 216 tests,", "90 acceptance criteria", "", "Frozen answer key:", "every gap proven", "with a real fault"])
s.box(450, 150, 380, 120, "neutral", "Arm A: Opus alone", ["project copy, all agent", "guidance removed"])
s.box(450, 300, 380, 120, "teal", "Arm B: Opus + Playwright Agent", ["same copy + router, one", "skill, tools"])
s.path("M360,250 C400,250 400,210 446,210")
s.path("M360,320 C400,320 400,360 446,360")
s.box(920, 170, 420, 230, "blue", "Independent oracle", ["assessment: answer key", "authoring: test must fail", "  under the gap's fault", "mutation: verdict proven", "  by execution, app restored"])
s.arrow(830, 210, 916, 240)
s.arrow(830, 360, 916, 330)
s.box(60, 470, 1280, 150, "neutral", "Rules written and frozen before any run", [])
for i, t in enumerate(["accuracy first (margins fixed in advance)", "then safety and framework fit",
                       "then tokens and cost per success", "arm order alternates · transcripts audited",
                       "answer-key access excludes the run", "refused or blocked runs are disclosed"]):
    s.text(90 + (i % 3) * 420, 552 + (i // 3) * 34, "• " + t, 17, MUTED)
s.save("how-it-is-measured", "Each task runs twice with Claude Opus: once alone with agent guidance removed, once with Playwright Agent. "
       "An independent oracle scores both, under rules frozen before any run.")

# 4. coverage:matrix example
s = Svg(1400, 760, "coverage:matrix finds what readers miss", "Real output on CRM-Scale: a role rule whose denial is checked for two of five roles")
s.box(60, 150, 1280, 100, "neutral", "PERM-AUDIT", ['"Only admins can read the audit log; other roles see permission denied."'], size=18)
heads = ["Role", "Expected", "Checked by the suite?"]
for j, h in enumerate(heads):
    s.text([90, 330, 640][j], 300, h, 17, MUTED, 600)
roles = [("admin", "can read", "never exercised", "red"), ("manager", "denied", "audit.spec.ts:25 asserts denial", "green"),
         ("sales", "denied", "permissions-api.spec.ts:16 asserts denial", "green"), ("support", "denied", "never checked", "red"),
         ("viewer", "denied", "never checked", "red")]
for i, (role, exp, got, kind) in enumerate(roles):
    y = 320 + i * 58
    s.box(60, y, 1280, 48, "neutral")
    s.text(90, y + 31, role, 18, INK, 600)
    s.text(330, y + 31, exp, 18, MUTED)
    s.text(640, y + 31, ("✓ " if kind == "green" else "✗ ") + got, 18, C[kind][1], 600 if kind == "red" else 400)
s.box(60, 630, 620, 90, "blue", None, ["!Flag: allowed role never exercised: admin;", "!denial never checked for: support, viewer"], size=17, mono=True)
s.box(720, 630, 620, 90, "neutral", None, ["A pointer, not proof: the agent still reads", "each assertion before deciding coverage."], size=17)
s.save("coverage-matrix-example", "For the criterion 'only admins can read the audit log', the suite checks the denial only for manager and sales. "
       "coverage:matrix flags that admin is never exercised and support and viewer are never checked.")

# 5. mutate flow
s = Svg(1400, 620, "npm run mutate", "One fault, proven by execution, without touching the original project")
steps = [("neutral", "1 · Hash", ["original project", "fingerprinted"]), ("blue", "2 · Copy", ["into ignored", ".mutation-work/"]),
         ("green", "3 · Baselines", ["tests run twice", "must be green"]), ("amber", "4 · Fault", ["exact text, once,", "in the copy only"]),
         ("red", "5 · Faulted runs", ["same tests", "run twice"]), ("violet", "6 · Verdict", ["copy deleted,", "hash re-checked"])]
for i, (kind, t, lines) in enumerate(steps):
    x = 60 + i * 215
    s.box(x, 160, 185, 140, kind, t, lines)
    if i:
        s.arrow(x - 30, 230, x - 4, 230)
verdicts = [("green", "killed", "the same tests fail in both runs"), ("amber", "survived", "every test passes with the fault"),
            ("neutral", "inconclusive", "unhealthy baseline or unstable"), ("neutral", "invalid", "fault text must match once")]
for i, (kind, v, why) in enumerate(verdicts):
    x = 60 + i * 322
    s.box(x, 350, 300, 90, kind, v, [why], size=15)
s.box(60, 480, 1280, 100, "neutral", None, [])
s.text(90, 520, "$ npm run mutate -- --project examples/crm-scale --file app/api.mjs --find \"const total = round2(raw);\" …", 16, MUTED, mono=True)
s.text(90, 552, "VERDICT: killed · caught by quotes.spec.ts › quote totals: cents round half up · original project unchanged: yes", 16, C["green"][1], mono=True)
s.save("mutate-flow", "npm run mutate hashes the original project, copies it, runs two green baselines, applies one fault to the copy, "
       "runs the tests twice and reports killed, survived, inconclusive or invalid, then proves the original unchanged.")
# 3. Results: CRM-Scale tools-first extension (evidence/trials/crm-scale/EXTENSION.md, Opus 5.5)
s = Svg(1400, 800, "What it added to Claude Opus", "CRM-Scale paired trials, rules frozen before the runs · grey = Opus alone · teal = Opus + Playwright Agent")
GREY, TEAL = ("#3a4a66", "#9fb0c8"), ("#2bb3a3", "#2bb3a3")


def bars(x, y, title, verdict, vkind, items):
    """items: (label, base value 0-1, base text, framework value 0-1, framework text)."""
    s.box(x, y, 620, 300, "neutral", title)
    s.text(x + 600, y + 34, verdict, 16, MUTED if vkind == "neutral" else C[vkind][1], 700, "end")
    for i, (label, b, bt, f, ft) in enumerate(items):
        yy = y + 78 + i * 72
        s.text(x + 20, yy + 14, label, 16, MUTED)
        for j, (val, txt, (fill, ink)) in enumerate(((b, bt, GREY), (f, ft, TEAL))):
            by = yy + 24 + j * 20
            s.parts.append(f'<rect x="{x + 20}" y="{by}" width="{max(4, 420 * val):.0f}" height="14" rx="4" fill="{fill}"/>')
            s.text(x + 452, by + 13, txt, 15, ink if j else MUTED, 600 if j else 400)


bars(60, 150, "Assessment · 15 pairs", "no measurable difference", "neutral", [
    ("Gap recall (all criteria)", .936, "93.6% (247/264)", .970, "97.0% (256/264)"),
    ("The 4 role-permission gaps", 44 / 60, "44 / 60", 52 / 60, "52 / 60"),
    ("Median cost per run", 1.20 / 1.5, "$1.20", 1.14 / 1.5, "$1.14")])
bars(720, 150, "Mutation proof · 12 pairs", "Playwright Agent adds value", "green", [
    ("Correct verdict, proven by execution", 11 / 12, "11 / 12", 1, "12 / 12"),
    ("Safe method (real source never edited)", 0, "0 / 12", 1, "12 / 12"),
    ("Median cost per run", .45 / .6, "$0.45", .41 / .6, "$0.41")])
s.box(60, 490, 1280, 250, "neutral", "Read it carefully", [])
for i, t in enumerate([
        "Assessment: +3.4 points recall and 8 pair wins to 3 losses, short of the +10-point margin fixed in advance.",
        "The coverage:matrix tool ran in only 3 of 15 runs, so it does not explain the role-gap gain.",
        "Mutation: Opus alone edited the real application in all 12 runs (and restored it); with Playwright Agent, 0 of 12.",
        "Cost was level (assessment: no measurable efficiency difference). Phase 2's version cost more in 11 of 15 pairs.",
        "One model, one synthetic app, 27 pairs. Authoring was not re-run: Phase 2 tied 4 / 4."]):
    s.text(90, 572 + i * 32, "• " + t, 17, MUTED)
s.save("results-crm-scale", "Paired trials on CRM-Scale with Claude Opus 5.5. Assessment, 15 pairs: gap recall 93.6% alone and 97.0% "
       "with Playwright Agent, no measurable difference under the frozen rules. Mutation proof, 12 pairs: correct verdicts 11 and 12, "
       "safe method 0 of 12 alone and 12 of 12 with Playwright Agent. Median cost was level.")
print("ok")
