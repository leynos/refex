# ADR 004: provisional runtime boundary

Status: proposed. Date: 17 October 2026.

On owner acceptance, this ADR's status becomes
`provisional: authorizes a bounded trial (tasks 1.3.1 to 1.3.5)`, and ADR 002
receives its amendment at that point. At the end of task 1.3.5 it becomes
`accepted` or `superseded by ADR NNN`.

## Context

refex needs an execution backend for lazy work, scopes, fibres, interruption,
and exits. [Design §2.3](design.md#23-backend-selection-and-execution-boundary)
prefers a private Effect execution adapter and leaves the choice between direct
foreign function interface (FFI) bindings and the published
`@reventlessdev/rescript-effect` bindings open as decision D1.

[ADR 002](adr-002-portable-core-and-bun-boundary.md) permits only the matching
`@rescript/runtime` as a production dependency, so any backend needs a reviewed
change to that baseline. [Design §2.2](design.md#22-bootstrap-compatibility)
requires that change to address adapter placement, dependency discovery, and
browser bundle behaviour.

The [runtime-boundary audit](evidence/runtime-boundary-audit.md) established:

- Effect 4.0.5 has no runtime dependencies, supports deep subpath imports, and
  lets an adapter-owned scope observe body and finalizer exits separately. Its
  `Cause` is a flat list of reasons.
- Effect 3.22.2 keeps a sequential and parallel cause tree, but depends at
  runtime on `fast-check` and `@standard-schema/spec` through caret ranges.
- On both lines, `mapError` drops a simultaneous release defect, a repeated
  `Scope.close` does not join an in-flight finalizer, `FiberMap` replacement
  does not await the old finalizer, and interrupting `tryPromise` does not wait
  for work that ignores its abort signal. Effect 4.0.5's `runPromise` rejects
  with the bare expected error.
- On Effect 4.0.5, provision is lazy: supplying a service runs no environment
  access, and each execution of the provided computation runs afresh (probe P1).
- The audit did not cover native variant representation or calling
  conventions, which design §2.3 lists as audit items; task 1.3.1 closes that
  gap (see its obligations).
- `@reventlessdev/rescript-effect` 1.0.0-alpha.0 binds Effect 3.22.2, depends
  at runtime on a Jest binding package, exposes un-namespaced global modules,
  lacks `Scope`, `mapError`, `catchCause`, and `uninterruptibleMask` bindings,
  and contains signatures that invent or erase types.

The owner directed that Effect 4 be preferred for the backend primitives unless
a compelling reason ruled it out. The audit found none.

## Decision

In the context of choosing refex's first execution backend, facing an accepted
single-runtime-dependency baseline and backend primitives whose names do not
guarantee refex's lifecycle semantics, refex decides for a provisional, bounded
trial of `effect` 4.0.5 behind refex-owned narrow bindings, and against the
Reventless bindings, an Effect 3.22.x backend, and a native runtime, to achieve
complete outcomes and owned lifecycles built on observable primitives,
accepting one extra production dependency during the trial and refex-owned work
for mapping, joined close, generation gates, and promise projection.

The selection is `effect` at exactly 4.0.5, registry integrity
`sha512-BY4/28NlpOd99yzmV741xbVGmp+1U7tks4oB7F/Png64bTa5tm5eCA6W0RiXsnuLDDoJpjfVSo4Dnq4BZb/89Q==`.
This ADR records the pin; it installs nothing. Task 1.3.1 adds the exact
version to `package.json` `dependencies` and the textual `bun.lock`.

### Execution adapter and platform adapters

The *execution adapter* is the private code that backs refex's opaque
computation types with Effect. It is portable: it uses no Bun, browser, Node,
or process API. It lives in private modules under `src/` that are absent from
the `rescript.json` public-module allowlist, binds Effect through deep subpaths
only (`effect/Effect`, `effect/Cause`, `effect/Exit`, `effect/Scope`,
`effect/Fiber`, `effect/Deferred`, and others as needed), and never through the
`effect` barrel or `effect/schema`.

*Platform adapters* own Bun, browser, network, and process calls. They remain
governed by ADR 002 unchanged and may not import the execution adapter's
private bindings directly.

No public `.resi` exposes an Effect type, tag, context, scope, fibre, or
unchecked conversion. Bindings follow the repository's FFI rules: no
`Obj.magic`, no `%raw`, and no type variable that appears only in a result
position unless it is phantom and sound, such as the error type of a
constructor that cannot fail.

### One conditioned clause and two interpretations

This ADR conditions one statement (clause 1) and interprets two (clauses 2 and
3), and only for the trial. Clauses 2 and 3 leave their rules unchanged:

1. ADR 002: "Only the matching `@rescript/runtime` package is a runtime
   dependency." During the trial, `effect` 4.0.5 is the one additional
   production dependency.
2. ADR 002: "Future runtime adapters must own platform calls and their
   independent dependencies; the core must not import the adapters." The
   execution adapter is not a platform adapter: it makes no platform calls, and
   core may depend on it.
3. [Developer guide](developers-guide.md#future-adapters-and-workspace-migration):
   "Platform adapters must have real platform-specific source and tests, own
   their runtime dependencies, and depend inward on core." Unchanged for
   platform adapters; the execution adapter's dependency belongs to core.

Every other ADR 002 rule stands, including dev-only Bun bindings, no global
namespace opens, and no empty adapter packages. The enforcement point that task
1.3.1 deliberately changes is `packageContract` in
`tests/support/package-dependency-contracts.mjs`, which gains an exact
allowlist of production dependency names: `@rescript/runtime` and `effect`.

### Trial bounds

- Tasks: roadmap 1.3.1 to 1.3.5.
- Permitted changes: the exact `effect` pin in `package.json` `dependencies`,
  `bun.lock`, private `src/` modules absent from the public allowlist, the
  dependency contract above, and `.github/dependabot.yml` with its workflow
  contract test `tests/workflow-contracts.test.mjs`.
- Not permitted: any change to `package.json` `exports` or `files` for
  backend reasons, a workspace or second package, or an Effect type in a public
  interface.
- Dependency discovery: one root package and no workspace linker
  configuration, per ADR 002's workspace trigger.
- Final selection: D1 closes at the end of task 1.3.5, by updating this ADR's
  status or by a superseding ADR.
- Exit criterion for task 1.3.5: if the trial is rolled back, the native
  minimal core (design decision D7) is brought forward as the next roadmap
  work, rather than trying another library first. This is the rollback
  destination for every rollback trigger below. The P7 falsifier is the
  exception: it faults the cause-shape observation rather than the trial's
  outcome, so it selects Effect 3.22.x, as that falsifier states.

### Obligations on task 1.3.1

- A binding-surface smoke test that imports every bound Effect name and
  asserts its runtime kind, because ReScript `external` declarations are not
  checked against Effect's TypeScript declarations. It also round-trips each
  bound `Exit` and `Cause` shape and each binding's calling convention (arity,
  currying, and the `_tag` discriminant versus ReScript's `TAG`) through a
  ReScript fixture. This satisfies design §2.3's "native variant
  representation, calling conventions" audit item, which the 1.1 audit did not
  cover.
- An `ignore` entry for `effect` (all update types) in
  `.github/dependabot.yml`, asserted by the workflow contract suite, so no
  automated update moves the pin.
- A browser-target bundle of the packed consumer that contains no
  `new Function` and no `eval(`, with its minified and gzipped size recorded as
  the E8 baseline.
- A clean `make audit` with the dependency installed.
- Refex-owned implementations, never delegation, for the facts the audit
  showed neither Effect line provides: leaf-wise expected-error mapping, joined
  close, awaiting predecessor cleanup before a successor, a full-outcome
  promise boundary, and explicit stop-waiting versus confirmed termination.

### Upgrades

Any minor or patch upgrade of `effect` requires a fresh runtime-boundary audit
and reruns of E1 to E3 and E9 before the pin moves. E1 to E3 and E9 are defined
in [design §10](design.md#10-experimental-validation). The probes in the
evidence record are version-specific.

## Alternatives considered

| Option                                       | Assessment                                                                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Refex bindings over Effect 4.0.x             | Selected. One dependency, deep imports, separately observable exits; refex builds cause structure.                                                                                                         |
| Refex bindings over Effect 3.22.x            | Rejected unless a compelling reason appears. Keeps a cause tree, but adds three production dependencies with caret ranges and an older maintenance line; P7 showed the tree is not needed for observation. |
| Reventless bindings (Effect 3.22.2)          | Rejected. A Jest binding package in production dependencies, global un-namespaced modules, missing primitives, and type-inventing signatures. Retained as prior art.                                       |
| Forking the Reventless bindings for Effect 4 | Rejected. Effect 4 renames many bound functions, so a fork would be a rewrite with the same unsound shapes to remove.                                                                                      |
| A native minimal runtime                     | Deferred to roadmap 6.5.1 (D7). It would avoid amending ADR 002 but would own scheduling before any measured need.                                                                                         |
| A TypeScript shim over Effect                | Rejected. It would add a second build system, which AGENTS.md forbids.                                                                                                                                     |

## Falsifiers and evidence

- If Effect 4.0.x cannot let the adapter observe body and finalizer exits
  separately, refex selects Effect 3.22.x or narrows design §4.1 as a recorded
  deviation. Evidence: probe P7 in the
  [audit](evidence/runtime-boundary-audit.md); task 1.3.1 rechecks it through
  refex's own adapter.
- If a listed primitive is missing or behaves differently from its
  documentation, the trial stops for that contract. Evidence: P1 to P7 now; the
  binding-surface smoke test in 1.3.1.
- Rollback triggers during the trial: failure of E1 to E3 or E9, an advisory
  with no fix, `eval` or `new Function` in the consumer bundle, or a failed
  smoke test. Rollback removes the dependency, the private adapter modules, the
  allowlist entry, and the Dependabot `ignore` entry. Its destination is a
  native minimal core, refex's own small effect interpreter (D7).
- Production adoption requires E1 to E3 and E9 to pass at the end of 1.3.5.

## Consequences

refex can start tasks 1.3.1 to 1.3.5 against a pinned, audited backend without
exposing it. Lifecycle contracts that Effect's names suggest but do not provide
become refex's own implementation work, tested by E3 and E9. The package gains
a runtime dependency only in a reviewed, reversible step, and ADR 002 gains an
amendment note only once this ADR becomes provisional.

A security advisory affecting the pinned `effect` triggers the same re-audit
before the pin moves. The tolerated window is seven days from publication,
during which the advisory is recorded against the trial. If the advisory is
exploitable through a refex path and the re-audit cannot finish in that window,
the trial rolls back.

## References

- [Runtime-boundary audit evidence](evidence/runtime-boundary-audit.md).
- [Technical design §§2.2-2.3 and §12](design.md#22-bootstrap-compatibility).
- [ADR 002](adr-002-portable-core-and-bun-boundary.md).
- [Design brief](design-brief.md).
