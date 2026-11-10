# Playwright Agent — quality module

This is an internal capability of Playwright Agent. The product root is the
parent repository, `qa-projects/Playwright Agentic Framework` in the workspace.
It owns requirement intake, assertion claim checks, behavioral mutation
execution and the evidence report viewer. It never calls a hosted or local
model; judgments come from the host coding agent.

From the product root:

```sh
npm ci --prefix quality
npm run intake -- help
npm run claims -- help
npm run mutation -- help
npm run report -- --repo /path/to/project
npm run quality:typecheck
npm run quality:test
```

Paths supplied to root commands are relative to the caller's working directory.
For example, select `quality/examples/mutation/role-aware.config.json` from the
product root. That sample still targets the existing role-aware mockserver;
it is not a configured mutation campaign for the CRM login flow.

- [Mutation workflow](docs/behavioral-mutations.md)
- [Stateful observation adapters](docs/mutation-adapters.md)
- [Recorded mutation validation](docs/behavioral-mutation-validation.md)
- [Consolidation and provenance](../docs/playwright-agent-consolidation.md)

Generated reports stay under ignored folders; canonical private tickets, epics
and PRDs belong in the parent `contexts/tasks/<work-item>/` folder. Select
existing requirements explicitly for mutation `artifactDir`; do not create a
second import folder here. Mutation config paths resolve relative to the config
file; CLI-supplied config paths resolve relative to the caller's working directory.

Optional Python document parsers are configured separately (see
`python/requirements-*.txt`). Do not copy a virtual environment or credentials
into source control. Feature knowledge and work-item requirements remain in the
parent `contexts/` folders; see [context ownership](../contexts/README.md).
