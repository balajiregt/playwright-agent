# Playwright Agent instructions for Copilot

Read AGENTS.md and the canonical router at
.agents/skills/playwright-agent/SKILL.md before selecting a workflow.
Route the user's requested task before selecting MCP/CLI tools.

- Create/edit/fix/run tests: use playwright-test-authoring and relevant project checks.
- Formal acceptance, matrix, gaps or duplicate review: use playwright-assessment only when requested.
- Application fault injection: use playwright-mutation only when requested.
- Setup/adoption: follow docs/adoption.md for the explicitly selected project.

Respect exclusions. Run-only does not authorize repair; assessment-only does not
authorize edits or execution. Ordinary authoring does not require formal
assessment, a matrix, intake or mutations. Nonfunctional testing is outside scope.
Use the selected project's existing framework, helpers, configuration and actual
commands. The detailed harness conventions are in docs/agent-workflow.md; read
only relevant sections. Source graphs and captures support discovery and do not
establish coverage or requirements by themselves.

Keep optional models, MCP connections, hooks and publication disabled
unless requested. Save actual findings/reports and open the matching project's
read-only viewer last. Do not invent execution evidence.
