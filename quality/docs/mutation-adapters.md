# Use behavioral mutations with your application

The reusable runner patches allowed JavaScript/TypeScript application source in
a disposable copy, starts the target with its own Playwright configuration, and
runs its unchanged tests. It requires source access and a working local startup
and test setup. It does not mutate an arbitrary deployed URL, infer every fault,
or automatically support every language or monorepo layout.

For a simple page, retain the built-in `text`/`count` probe. For login, checkout,
refresh/recovery or another stateful journey, configure a trusted project-owned
module:

```json
"probeAdapter": {"module": "support/observe.ts", "export": "observe"}
```

The corresponding fault plan supplies:

```json
"probe": {
  "kind": "adapter", "project": "chromium",
  "input": {"quantity": 2}, "expected": "24 USD"
}
```

`observe({page, input})` runs through the target's installed Playwright runner.
It owns setup, navigation, interactions and readiness waits, and returns a string
of at most 1,000 characters. Input is JSON limited to 4,000 characters. Return a
stable projection of the required behavior; JSON.stringify is useful for several
fields. Do not return changing timestamps/tokens, fetch a new expected value from
the mutated source, or use the test assertions under evaluation as the oracle.

The baseline observation must equal the independently reviewed `expected` value.
The same observation must complete and change with the fault active. Only then
does the runner execute the unchanged suite twice. A fault the suite catches is
**killed**; an activated fault with two healthy test runs **survived**. A broken
adapter, invalid return, startup failure or unstable result is inconclusive and
excluded from the score. The adapter must observe the faulty state rather than
assert it is still correct, since that would prevent activation measurement.

The adapter bypasses built-in `probeSetup`, navigation and `readiness`; it owns
those steps. Simple probes still use the earlier interface unchanged. Adapters
are local trusted code, not downloaded document instructions. Their module cannot
be a mutation target. Its contents and helpers are covered by the repository hash;
adapter module/export selection is also covered by the execution-scope hash.

The harness resolves server working directories and explicit project testDir
against the original configuration directory. Other relative-path conventions,
authentication files, project dependencies or custom startup arrangements still
need a target-specific review. Hidden files and credentials are not copied. The
current environment override keys are APP_URL, APP_PORT, MOCKSERVER_URL and
MOCKSERVER_PORT; projects can read those in their existing local startup config.

No additional mutation library or paid model is required. The coding agent can
prepare a reviewed plan, or the user can supply it. Optional Codex CLI planning
remains separate from execution.

The deliberately small quote fixture verifies that the runner works without roles
or a mockserver. From `quality/`, explicitly run the installed local browser check:

```sh
node --import tsx scripts/verify-mutation-adapter.ts
```

It requires existing root Playwright dependencies and Chromium. It checks a killed
price fault, surviving currency fault and invalid observer, two healthy baselines,
restoration and an unchanged original tree. Offline unit tests do not execute this
campaign. This portability check establishes those interfaces, not universal
application support or mutation completeness.
