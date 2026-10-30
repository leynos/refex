# Implement the smallest opaque Fx surface (roadmap 1.2.1)

This ExecPlan (execution plan) is a living document. The sections `Constraints`,
`Tolerances (exception triggers)`, `Risks`, `Progress`,
`Surprises & discoveries`, `Decision log`, `Outcomes & retrospective`,
`Conformance basis`, and `Verification plan` must be kept up to date as work
proceeds.

Status: DRAFT

Plan identifier: `EP-1.2.1`. Branch: `1-2-1-smallest-opaque-fx-surface`.
Roadmap task:
[1.2.1](../roadmap.md#12-prove-dependency-and-error-composition-through-separate-modules),
the first task of step 1.2. Implementation must not begin until the repository
owner approves this plan. EP-M1 additionally waits for the owner to accept ADR
008, which EP-M0 drafts.

## Purpose / big picture

refex is an experimental ReScript 12 library for lazy computations with typed
requirements and typed failures. Today the repository contains only a
disposable toolchain probe, `src/Bootstrap.res`, and a set of design decisions.
No computation type exists yet, so none of those decisions has been tested at a
real consumer's interface.

Roadmap task 1.2.1 asks for the smallest opaque `Fx` surface that lets
separately compiled modules build workflows. `Fx.t<'a, 'e, 'r>` describes a
computation that, when eventually executed with an environment of type `'r`,
either succeeds with `'a` or fails with the expected error `'e`. "Opaque" means
that consumers can build and combine descriptions only through the published
operations: they cannot call, inspect, or forge one.

After this plan is delivered, a ReScript developer who installs the packed
`refex` archive can:

1. Write service modules in separate `.res`/`.resi` files, each exporting
   accessors such as
   `let now: unit => Refex.Fx.t<int, 'e, {.."clock": service}>`.
2. Compose those accessors in a third module with `Fx.flatMap`, `Fx.map`,
   `Fx.tap`, `Fx.accessEffect`, and `Fx.mapError`, and have the compiler
   accumulate the combined requirement
   `{.."clock": Clock.service, "log": Log.service}` without any cast,
   `Obj.magic`, `%identity`, `%raw`, or backend type.
3. Discharge the requirement with `Fx.provide(workflow, environment)` or adapt
   a named environment with `Fx.contramapEnvironment`, receiving an opaque
   `Refex.IO.t<'a, 'e>`.
4. Rely on the repository's tests for the deferral contract: neither building
   a description nor providing its environment runs any user callback.
   Execution and environment access wait until a runtime, which roadmap task
   1.3.1 adds, executes the description.

Success is observable in four places. `make test` runs new behavioural suites
for `IO` and `Fx`, law and model-agreement property suites, an exact
public-interface contract, and a compiler-fixture suite whose positive
consumers compile and whose negative consumers fail with the intended
diagnostic. `make package-check` builds and executes a multi-module ReScript
consumer against the packed archive. The users' guide documents the new surface
as implemented but unpublished, with no runner. The roadmap marks 1.2.1 done.

## Constraints

Hard invariants. Violating any of them requires escalation, not a workaround.

- C-1, portable core: `src/` contains only portable ReScript using the ReScript
  12 standard library. No Bun, Node, browser, React, process, or Effect call,
  import, or type appears there (ADR 002, AGENTS.md).
- C-2, no backend: install no runtime dependency. ADR 004 limits the `effect`
  4.0.5 trial to tasks 1.3.1 to 1.3.5. `package.json` `dependencies` stays
  exactly `{"@rescript/runtime": "12.3.1"}`.
- C-3, no escape hatches in production: `src/` contains no `Obj.magic`,
  `%identity`, `%raw`, `external`, or other unchecked conversion. Tests have
  exactly two documented foreign function interface (FFI) boundaries: the
  evaluation binding `tests/IoEvaluation.res` (EP-M1) and the fast-check binding
  `tests/FastCheck.res` (EP-M4). AGENTS.md is updated to name them.
- C-4, explicit interfaces: every module under `src/` has a `.resi` file, and
  every public type introduced here is abstract in its `.resi`. A contract
  enforces both (EP-M1).
- C-5, no consumer-reachable runner: no module under `src/` exports anything
  that executes an `IO.t` or `Fx.t`. ReScript 12.3.1's default build, Rewatch,
  does not implement `sources[].public` (see `Surprises & discoveries`), so
  every module under `src/` is reachable by consumers as `Refex.<Module>`. This
  constraint is therefore met by having no runner in `src/`, checked by the
  exact export-set contract (D-11).
- C-6, representation follows ADRs 005 and 006: `Fx.t<+'a, 'e, -'r>` is a
  Reader over `IO.t`, that is `'r => IO.t<'a, 'e>`, with `-'r` derived by the
  compiler. `IO.resi` declares `'e` invariant, as ADR 006 requires.
- C-7, toolchain pins: ReScript and `@rescript/runtime` 12.3.1, Bun 1.4.2,
  `rescript-bun` 2.1.0, Biome 2.5.15. No toolchain upgrade.
- C-8, generated output: commit production `src/*.res.mjs`, never hand-edit or
  reformat it, and keep generated test JavaScript untracked (ADR 001).
- C-9, gates: `make check-fmt`, `make lint`, and `make test` pass at the end of
  every milestone, and `make all` passes before every commit. Stage source and
  generated output together before `make check-generated`, because the gate
  compares against the Git index.
- C-10, no compatibility theatre: the package is private, at `0.0.0`, and
  unreleased. Add no aliases, deprecated entry points, or shims.
- C-11, prose: en-GB-oxendict spelling, sentence-case headings, 80-column
  prose, and the shared spelling gate (`make spelling`).
- C-12, ADR authority: change an accepted ADR's decision only through a new
  ADR (developers' guide, "Architecture decision records"). Record the
  resulting change in an `## Amendments` section of the amended ADR, as ADR 002
  already does. This plan's new ADR is ADR 008 (D-12).
- C-13, deferred callbacks: `Fx.res` and `IO.res` invoke a user callback only
  inside an IO thunk that runs at evaluation: an `IO.suspend` constructor, or an
  `IO.flatMap` or `IO.mapError` continuation. Applying an `Fx.t` to an
  environment therefore runs no user callback. This keeps every user callback
  inside the region where task 1.3.1's adapter can classify a thrown exception
  as a defect.
- C-14, delivery: the plan's pull request stays a draft until the owner
  decides otherwise; never merge or publish (AGENTS.md).

## Tolerances (exception triggers)

The ExecPlan file, compiler-generated `src/*.res.mjs`, `bun.lock`, and the
regenerated `typos.toml` are excluded from every count below.

- Scope: stop and escalate if delivery needs more than 85 changed or deleted
  files, or more than 3,800 net added lines. The expected footprint is about 79
  files, many of them one-line fixture cases (see
  `Interfaces and dependencies`, "Expected footprint").
- File size: split any authored file that would exceed 350 lines before it
  reaches the repository's 400-line limit; stop if a coherent split is not
  apparent.
- Public interface: stop and escalate if any public module other than `IO` and
  `Fx` is needed, or if either `.resi` needs an export not listed in
  `Interfaces and dependencies`.
- Falsifier: stop if any positive consumer needs an annotation-level cast
  (ADR 005's definition) or a backend type. That would trigger ADR 005's
  falsifier 1, which needs an owner decision.
- Dependencies: stop if any direct dependency other than the development
  dependency `fast-check` at exactly 4.10.2 is needed. Its transitive dependency
  `pure-rand` does not trigger this tolerance.
- ADR acceptance: stop at the end of EP-M0 until the owner accepts ADR 008.
- Iterations: stop if a gate still fails after three fix attempts for the same
  cause.
- Fixture budget: stop if the compiler-fixture suite needs more than 120
  seconds on the development host or in CI. The per-test timeout is separate
  (EP-M3).
- Ambiguity: stop and present options if a law in the `Verification plan`
  fails in a way that suggests the specification, not the implementation, is
  wrong.

## Risks

- R-1, diagnostic wording drift. Negative fixtures match compiler text from
  ReScript 12.3.1. Severity medium, likelihood low while pinned. Mitigation:
  the runner first asserts that `rescript --version` reports 12.3.1 and fails
  closed otherwise; it matches stable message fragments after collapsing
  whitespace, not whole messages or mangled module names such as
  `\"Fx-Refex".t`.
- R-2, wrong-reason failures. A negative fixture could fail for a syntax
  error, a promoted warning, a missing module, or an unrelated type error.
  Probes found a real instance: in a consumer, `environment["clock"].now()` can
  fail with "now refers to a record field, but no corresponding record type is
  in scope"; the access must then be written
  `environment["clock"].Clock.now()`. Severity high, likelihood medium.
  Mitigation: count every diagnostic header kind; match file, line, and
  fragments; pair each negative with a positive control differing in one line;
  run a live wrong-reason control through the real compiler; and unit-test the
  matcher.
- R-3, representation coupling in tests. The test evaluator calls the thunk
  representation of `IO.t`. Severity medium, likelihood certain at task 1.3.1.
  Mitigation: confine the coupling to one binding that fails closed on any
  other representation, and return a test-owned `outcome` type that task 1.3.1
  extends rather than rewrites.
- R-4, non-stack-safe reference representation. The thunk-based `IO.t`
  recurses once per nested bind when evaluated. Severity low for 1.2.1, because
  no consumer can evaluate. Mitigation: property generators bound depth at
  four; E2's 100,000-bind stress belongs to 1.3.1.
- R-5, editor dead-code analysis flags public exports that the package does not
  use itself. Severity low. Mitigation: ADR 003 makes the editor analyser
  advisory; record findings; add no `@live` to production exports without a
  recorded reason.
- R-6, removing `Bootstrap` touches many contracts and documents. Severity
  medium, likelihood medium. Mitigation: retire it in its own milestone after
  the new consumer checks pass, with the exact enforcement points listed in
  EP-M5.
- R-7, fixture builds in the system temporary directory. The existing
  package-contract suites already build in `os.tmpdir()`. Severity low.
  Mitigation: follow that convention, keep the project small (each build took
  about 0.43 seconds in review probes), and remove it in a `finally` block. A
  project nested inside the repository was rejected because the build might
  discover the parent configuration.
- R-8, invariant `'e` makes unannotated top-level values weak.
  `let x = IO.succeed(1)` and an unannotated top-level `Fx.provide(…)` result
  get weak error types. Severity low, likelihood certain. Mitigation: fixture
  `fx-value-export`, an ADR 006 amendment through ADR 008, and a users'-guide
  note to annotate top-level descriptions or export functions.
- R-9, `namespace-entry` is undocumented. It hides modules (probe `ns8`), but
  the Rewatch configuration specification at the 12.3.1 tag does not list it.
  Severity medium for 1.3.1, none for 1.2.1, which needs no hidden module.
  Mitigation: record the probe; leave adoption to task 1.3.1 with its own
  evidence.

## Progress

- [x] (2026-10-31) Renamed the branch to `1-2-1-smallest-opaque-fx-surface`;
  `origin` has no branch of that name yet, so upstream tracking is set on the
  first push.
- [x] (2026-10-31) Wyvern reconnaissance of build, test, and package plumbing,
  and of the 1.1 plan's conventions and evidence.
- [x] (2026-10-31) Planning probes `ns1` to `ns8` (see `Artefacts and notes`).
- [x] (2026-10-31) First draft of this plan (commit `0a8c11d`).
- [x] (2026-10-31) Expert-panel review: type system and interfaces,
  verification rigour, repository policy and delivery, and alternatives with a
  pre-mortem. Verdict: revise. Findings folded into this revision (see
  `Revision note`).
- [ ] Owner approval of this plan.
- [ ] EP-M0: baseline, namespace-visibility evidence, and ADR 008 (proposed).
- [ ] Owner acceptance of ADR 008.
- [ ] EP-M1: `IO` test-first, with interface and module contracts.
- [ ] EP-M2: `Fx` test-first.
- [ ] EP-M3: compiler fixtures and the packed consumer.
- [ ] EP-M4: law and model-agreement property tests.
- [ ] EP-M5: retire `Bootstrap`.
- [ ] EP-M6: reconciliation and roadmap completion.

## Surprises & discoveries

- Observation: ReScript 12.3.1's default build, Rewatch, does not implement
  `sources[].public`. A consumer of a library with `"public": ["IO"]` compiled
  and ran `Refex.Kernel.evaluate(...)`, where `Kernel` was absent from
  `public`, both with a symbolic-link dependency and with a copied package
  (`ns1`, `ns2`). A nonsense value,
  `"public": "bogus-value-should-be-rejected"`, builds without complaint
  (`ns7`). The un-namespaced name fails for every module, including `IO`, which
  is listed (`ns6`), so that failure reflects the namespace, not `public`. The
  Rewatch configuration specification at the `v12.3.1` tag marks both forms of
  `public` as not implemented, while the ReScript manual documents the field.
  Evidence: the probes, and sources C19 and C20 (EP-M0). Impact: a "private
  kernel" cannot hold a test-only runner (C-5); `public` is a declaration, not
  an enforcement point; ADR 004's "private `src/` modules absent from the
  public allowlist" are reachable.
- Observation: Rewatch's undocumented `namespace-entry` key does hide modules.
  With `"namespace-entry": "Refex"` and an entry module `Refex.res`/`.resi`
  that re-exports only `IO`, a consumer's `Refex.Kernel.evaluate` failed with
  "The module or file Refex.Kernel can't be found." while `Refex.IO.t` resolved
  (`ns8`). Whether in-package dev sources can still reach hidden modules is
  untested. Impact: a candidate mechanism for task 1.3.1's private adapter, not
  adopted here (R-9).
- Observation: under ReScript 12's uncurried calling convention, a Reader
  combinator must return a one-argument closure explicitly
  (`value => _environment => ...`). A three-parameter function is not a
  function of the environment and fails to unify. Impact: write each `Fx`
  combinator with an explicit environment closure and annotate it with `t<...>`.
- Observation: once `IO.t` has a concrete definition, the compiler checks the
  variances declared in `.resi` files. Declaring `+'r` on `Fx.t` over
  `'r => IO.t<'a, 'e>` fails with "Their variances do not agree" (`ns3`). ADR
  005 already anticipates this ("until `IO.t` has a checked definition"). The
  trust returns at task 1.3.1 if `IO.t` binds a backend type abstractly.
- Observation (review probe): `IO.mapError` that runs its mapper on success is
  ill-typed, because no error value exists on that branch; likewise a `flatMap`
  continuation cannot run after a failure without a stale value. Parametricity
  excludes most stateless faults, so the ablations below target duplication,
  elision, caching, and timing, which are well-typed.
- Observation (review probe): the compiler ignores `NO_COLOR`; diagnostics
  still contain ANSI escape sequences, which the runner must strip.

## Decision log

- D-1 (2026-10-31): `IO` is a public module with a minimal combinator set:
  `succeed`, `fail`, `suspend`, `flatMap`, and `mapError`, over the abstract
  type `IO.t<+'a, 'e>`. Rationale: `Fx.provide` must return `IO.t` (ADR 005);
  `Fx.res` must build `IO.t` values; and probes `ns1` and `ns7` show that no
  module under `src/` can be private. `IO.mapError` is necessary because
  `Fx.mapError` has no other way to reach a failure. `IO.map` is not needed.
  Building `Fx` solely on `IO.resi` lets task 1.3.1 change the IO
  representation without touching `Fx.res`. Accepted cost: until `accessIO` or
  `fromIO` arrives, a consumer can build an `IO.t` but cannot lift it into `Fx`
  or run it. Alternatives rejected: a private kernel (reachable, `ns1`); `IO.t`
  manifestly equal to a kernel type (leaks the kernel's name in diagnostics,
  `ns4`); a nested `Fx.IO` module (diverges from ADR 005's `IO.t`); a type-only
  public `IO` behind `namespace-entry` (undocumented, R-9; reconsider at 1.3.1).
- D-2 (2026-10-31): the 1.2.1 representation is a refex-native thunk,
  `IO.t<'a, 'e> = unit => result<'a, 'e>`. It is a reference representation for
  type-level and law evidence, not the runtime and not the seed of the native
  core that ADR 004 names as its rollback destination (D7). It has no defect,
  interruption, or release reasons, and it is not stack-safe; those belong to
  1.3.1's adapter (ADR 006, E2). Alternative noted, not adopted: an inspectable
  instruction tree whose `flatMap` hides its intermediate type in an explicitly
  polymorphic record field. It could be stack-safe now, but would cost several
  hundred lines that 1.3.1 replaces.
- D-3 (2026-10-31): no runner exists in `src/`. Tests evaluate an `IO.t`
  through one test-only binding, `tests/IoEvaluation.res`, backed by
  `tests/support/io-evaluation.mjs`. It returns a test-owned
  `outcome<'a, 'e> = Succeeded('a) | Failed('e)`, which task 1.3.1 extends with
  defect and interruption cases rather than rewriting every comparison. The
  binding contains no business logic and fails closed on any other
  representation.
- D-4 (2026-10-31): the explicit environment projection is named
  `contramapEnvironment`, as in design §3.2 and ADR 005. It is refex's partial
  provision: ADR 005's "typed environment-building function", corresponding to
  ZIO's `provideSomeEnvironment`, Primavera's `local`, and Relude's `withRIO`.
  Relude's `local` keeps the environment type, so the name `local` is avoided.
  No alias.
- D-5 (2026-10-31): `accessIO`, `fromIO`, `result`, `catchError`, `match`, and
  `Never` are out of scope. The roadmap's list for 1.2.1 omits them; `result`,
  `catchError`, `match`, and `Never` belong to 1.2.3, and `accessIO` to the
  first task with bound service methods. The name `accessEffect` follows design
  §3.2; in this repository "Effect" also names the backend, so `accessFx` would
  read more clearly. That ambiguity is recorded for the design owner, not
  resolved here.
- D-6 (2026-10-31): `fast-check` 4.10.2 enters now, as an exact development
  dependency, rather than at 1.3.x as source C18 planned. Rationale: the laws
  and model agreement introduced here are invariants over generated
  descriptions. ADR 001 excludes mutation testing, not property testing.
- D-7 (2026-10-31): no machine-checked proof is selected for 1.2.1. See
  `Verification plan`, "Proof selection". The proof sketch stays in this plan
  and in design §3 as unproved statements.
- D-8 (2026-10-31): retire `Bootstrap` in EP-M5. ADR 001's consequences state
  that "new semantic code must replace the disposable module", and the module
  documents "remove this module once real Refex source exists". ADR 008 records
  the replacement. If the owner vetoes it, EP-M5 is dropped, ADR 008 says so,
  and `Bootstrap` stays public beside `IO` and `Fx`.
- D-9 (2026-10-31): keep `rescript.json` `public` as a declaration of the
  intended public modules, and add a contract that `public` plus a declared,
  documented internal list equals the set of modules under `src/`. The internal
  list is empty in 1.2.1; task 1.3.1 adds adapter modules to it deliberately
  rather than redesigning the contract. Rationale: Rewatch ignores `public`, so
  the field documents intent only; the contract keeps the documentation
  truthful, and D-11 provides the actual guard.
- D-10 (2026-10-31): compiler fixtures live under `tests/fixtures/compiler/`
  and run from a new authored suite, `tests/compiler-fixtures.test.mjs`,
  against a consumer project that installs the package's `files` allowlist. A
  contract checks that the copied list equals `package.json` `files`.
  `make package-check` remains the authoritative packed-archive check and
  reuses the fixture's base sources; this coupling is documented in
  `docs/repository-layout.md`. Roadmap task 1.2.2 extends the same runner with
  structural requirement cases.
- D-11 (2026-10-31): add an exact public-interface contract,
  `tests/interface-contracts.test.mjs`, that runs `rescript-tools doc` on each
  `src/*.resi` and compares the exported item names, kinds, and signatures with
  the lists in `Interfaces and dependencies`. Rationale: with every `src/`
  module reachable (C-5), the exported set is the only boundary, so it must be
  mechanized rather than left to review.
- D-12 (2026-10-31): draft ADR 008, "First semantic modules and module
  visibility", status `proposed`, in EP-M0. It decides: `IO` and `Fx` replace
  `Bootstrap` as the public modules and archive contents (amending ADR 001's
  decision on one disposable public module and its archive allowlist); `public`
  is a declaration under Rewatch 12.3.1, with D-9 and D-11 as its enforcement;
  and it hands task 1.3.1 the open question of hiding adapter modules (amending
  ADR 004's trial bound on private modules). It also records the weak-type
  consequence of ADR 006's invariant `'e` (R-8). The owner's acceptance gates
  EP-M1.

## Outcomes & retrospective

Not started. Complete this section at each milestone boundary and at
completion: what was delivered, which acceptance evidence passed, what changed
from the plan, and lessons for 1.2.2, 1.2.3, and 1.3.1.

## Context and orientation

### Repository state

The repository is a single private package named `refex`, version `0.0.0`,
built with ReScript 12.3.1 and tested with Bun 1.4.2. Key files:

- `rescript.json`: `namespace: true`, so consumers see modules as
  `Refex.Fx`; `sources` lists `src` (with `"public": ["Bootstrap"]`) and
  `tests` as a non-recursive dev source; warnings `+A` are all errors;
  `package-specs` emits in-source ESM with suffix `.res.mjs`.
- `package.json`: exact pins; `description` says "toolchain bootstrap only";
  `files` lists seven archive entries; `exports` lists
  `./src/Bootstrap.res.mjs` and `./package.json`.
- `Makefile`: uses `SHELL := bash` without `globstar`, so `**` in a recipe
  behaves like `*`. `make test` builds, then passes every suite to `bun test`
  explicitly; Bun does not discover `*.test.res.mjs` on its own.
  `make coverage` names its suites explicitly too and has no threshold.
  `make all` runs `check-fmt`, `check-generated`, `lint`, `test`, `docs-check`,
  `spelling`, and `package-check` in order.
- `bunfig.toml`: excludes `tests/**` from coverage.
- `scripts/check-generated.mjs`: compares tracked `src/**/*.res.mjs` with the
  on-disk inventory and runs `git diff --exit-code` against the index, so new
  output must be staged and deleted output removed with `git rm`.
- `scripts/package-check.mjs`: packs the archive, compares its listing with a
  hard-coded allowlist (lines 44 to 52), installs it into a clean fixture, and
  runs a JavaScript consumer (line 88) and a ReScript consumer (lines 106 and
  114).
- `tests/makefile-contracts.test.mjs`: requires every top-level
  `tests/*.test.mjs` and `tests/*.test.res` suite in `make test` (lines 34 to
  54), and hard-codes `./tests/Bootstrap.test.res.mjs` at line 175. It does not
  check the format or coverage recipes. Suites in subdirectories are invisible
  to its inventory, so keep suites at the top level of `tests/`.
- `tests/support/package-dependency-contracts.mjs`: `packageContract`
  asserts the `public` list (lines 43 to 46), the `exports` keys (69 to 76), the
  `files` list (77 to 87), and exact-version pins (27 to 32). It is pure; its
  callers pass parsed metadata.
- `tests/package-contracts.test.mjs`: archive listing check (line 51), a
  negative-control string naming `tests/Bootstrap.test.res` (line 126), and the
  compiler boundary fixture showing that production source cannot open
  `RescriptBun` (lines 150 to 196, with a 60-second budget).
- `tests/consumer.test.mjs`: imports `refex/src/Bootstrap.res.mjs`.
- `.github/workflows/ci.yml`: one 15-minute job running
  `bun install --frozen-lockfile`, `make all`, `make coverage`, and
  `make audit`. A workflow contract restricts CI run steps to exactly those
  commands, so new suites enter only through `make test` and `make coverage`.

### Documents and their authority

Read these before implementing; each section named matters.

- `docs/roadmap.md`, step 1.2 and task 1.2.1: the task and its success
  criterion. Tasks 1.2.2 and 1.2.3 follow and must not be pulled forward.
- `docs/design.md` §2.1 (computational separation and the IO/Fx equations),
  §2.2 (bootstrap compatibility: "changes no … public-module allowlist" becomes
  false), §3.1 (laziness and the stack-safe Reader `flatMap` shape), §3.2
  (operation signatures, `accessEffect`, `provide`, `contramapEnvironment`,
  live versus snapshot observation), §3.3 (`map`, `flatMap`, `tap`, `mapError`
  meanings), §4.1 to §4.2 (expected errors), §10.1 (E1 and E2), §11 (change
  discipline), and §12 (D1, D2, D7, D8).
- `docs/terms-of-reference.md`: goals G1 (visible requirements), G2 (typed
  expected errors), and G4 (usable composition); assumption A2 (requirements
  survive interfaces); success criterion §7.1.
- `docs/context.md` §1 (implementation baseline), §7 (source register `C1` to
  `C18`), and §8 (Lody learning crosswalk; its rows on mixed-cause mapping and
  construction capture motivate later tasks, not this one).
- `docs/adr-001-repository-bootstrap.md` (accepted for bootstrap): pins,
  generated-output policy, the disposable `Bootstrap` module, and the archive
  allowlist; amended through ADR 008.
- `docs/adr-002-portable-core-and-bun-boundary.md` (accepted for bootstrap):
  portable core, dev-only Bun bindings, no global opens.
- `docs/adr-003-formatting-and-analysis-policy.md`: formatter, `+A` warnings,
  advisory editor analysis.
- `docs/adr-004-runtime-boundary.md` (provisional): no backend before 1.3.1;
  private adapter modules, affected by `ns1`; amended through ADR 008.
- `docs/adr-005-structural-dependency-environments.md` (candidate): open-row
  requirements, function exports, row-key ownership, `provide`,
  `contramapEnvironment`, the definition of an annotation-level cast, and the
  diagnostic-site table.
- `docs/adr-006-complete-outcomes.md` (candidate): invariant `'e` in
  `IO.resi`, expected errors as ordinary variants, conservative recovery.
- `docs/evidence/type-level-probes.md`: probes `R1` to `R9`, `v1` to `v2b`;
  Appendix B holds probe sources reusable as fixture seeds.
- `docs/evidence/verification-feasibility.md`: experiment FX-1; its "Rule 1"
  says higher-order helpers whose lambdas build tagged values did not translate
  to the proof route.
- `docs/developers-guide.md` (suites, generated output, ADR statuses and
  amendments, helper ownership), `docs/users-guide.md`,
  `docs/repository-layout.md`, `docs/design-brief.md`, `docs/contents.md`,
  `AGENTS.md`, `README.md`, and `CHANGELOG.md`: updated by this plan.

### Terms used

- Description: a value of type `IO.t` or `Fx.t`. Building one performs no
  work.
- Evaluation, execution: running a description to obtain its outcome. In this
  task only tests evaluate, through `IoEvaluation.evaluate`.
- Environment, requirement: the value of type `'r` that an `Fx.t` needs. An
  open object row such as `{.."clock": Clock.service}` means "at least a
  `clock` field of this type".
- Projection: a function from a larger environment to the smaller one a
  description needs, applied by `Fx.contramapEnvironment`.
- Annotation-level cast: any of `Obj.magic`, `%identity`, `%raw`, an `external`
  with a free result type variable, or a consumer-side `:>` coercion on a
  requirement row (ADR 005).
- Positive fixture: a consumer project that must compile. Negative fixture: a
  one-file case that must fail with a named diagnostic. Positive control: a
  case differing from its negative in exactly one line that must compile,
  proving the negative fails for its intended reason.
- Trace: the sequence of labelled events that test callbacks append to a
  test-owned array when they run.
- Observational equivalence (`≈` below): defined in the `Verification plan`.
- Ablation: a temporary, deliberate fault in production source used to show
  that a test can fail; always reverted.

### Skills to load

Load `execplans` to maintain this plan; `rescript-router`, then
`rescript-types-and-modules` (abstract types, variance, `.resi`),
`rescript-bun-testing` (suites and explicit runner lists),
`rescript-property-testing` (fast-check bindings, laws, and replay),
`rescript-interop` (the two test-only bindings), `rescript-build-and-config`
(`rescript.json`, `public`, namespaces), and `rescript-quality-tools`
(formatter and analysis). Load `rescript-deductive-verification` only to
re-check the proof-selection reasoning. Use `codegraph-mcp` for structural
questions, `firecrawl-mcp` for external documentation, `en-gb-oxendict` for
prose, and `commit-message` and `pr-creation` for delivery. Delegate full gate
runs to the `scrutineer` agent and mechanical documentation edits to `scribe`.

## Conformance basis

Upstream artefacts at commit `826202b37289a590cfaebdbd661baabbcc3e5ff5`
(`main`, 2026-10-30):

- `docs/terms-of-reference.md`: G1, G2, G4; A2; success criterion §7.1.
- `docs/design.md` draft v0.2: §§2.1, 2.2, 3.1 to 3.3, 4.1 to 4.2, 10.1 (E1,
  E2), 11, 12 (D1, D2, D7, D8).
- ADR 001 and ADR 002 (accepted for bootstrap), ADR 003, ADR 004
  (provisional), ADR 005 and ADR 006 (candidate).
- `docs/roadmap.md` task 1.2.1 and its success criterion; tasks 1.2.2, 1.2.3,
  and 1.3.1 as downstream consumers.
- Evidence: `docs/evidence/type-level-probes.md` (`R1` to `R8`, `v2`, `v2b`)
  and `docs/evidence/verification-feasibility.md` (FX-1).

This plan invents no new upstream identifiers. Plan-local identifiers are `C-n`
(constraints), `R-n` (risks), `D-n` (decisions), `EP-Mn` (milestones), `OB-n`
(verification obligations), `P-n` (premises), `AXIOM-n` (axioms), `A-n`
(ablations), and `K-n` (matrix rows). ADR 008 is a new, proposed upstream
artefact that this plan drafts.

Trace chains:

```plaintext
G1, A2 -> design §3.2, ADR 005 (open rows, function exports) -> 1.2.1
  -> EP-M2, EP-M3 -> base fixture fx-surface, fx-value-export -> K-5
G1 -> design §3.2, ADR 005 (contramapEnvironment) -> 1.2.1
  -> EP-M2, EP-M3, EP-M4 -> Fx.test.res projection cases, base Projection
     module, FxLaws projection laws -> K-6, K-9
G2, G4 -> design §§3.3, 4.1, ADR 006 (ordinary variants, invariant 'e)
  -> 1.2.1 -> EP-M1, EP-M3 -> base AppError injection, fx-error-widening
     and its control -> K-7
G4 -> design §3.1 (laziness, fresh execution), §3.2 (live observation)
  -> 1.2.1 success criterion -> EP-M1, EP-M2, EP-M4 -> IO.test.res,
     Fx.test.res deferral cases, inertness property -> K-1, K-2, K-3, K-12
G1 -> ADR 004 (no exposed backend), design §2.3 -> 1.2.1 success criterion
  -> EP-M0, EP-M1, EP-M3 -> ADR 008, export-set and module contracts,
     opacity fixtures, escape scan -> K-4, K-8
ADR 001 consequences (replace Bootstrap) -> ADR 008 -> EP-M5
  -> package-check consumers
```

Downstream obligations this plan hands on:

- 1.2.2 extends `tests/compiler-fixtures.test.mjs` with missing, conflicting,
  closed-row extra, and incomplete-projection fixtures, reusing the base
  project and the matcher.
- 1.2.3 adds `result`, `catchError`, `match`, and `Never`, keeps `'e`
  invariant, and updates the export-set contract deliberately.
- 1.3.1 replaces the thunk representation behind `IO.resi` with the Effect
  adapter; replaces `tests/IoEvaluation.res` with the private runtime entry and
  extends its `outcome` type; reruns `IoLaws.test.res`, `FxLaws.test.res`, and
  the model-agreement property against it; adds a throwing-callback test for
  every operation (relying on C-13); adds the E2 stress workload; decides how
  to hide adapter modules (`namespace-entry` or single-unit encapsulation, D-9,
  R-9); and re-establishes trust in `IO.t`'s declared variance.

## Verification plan

### What this task must establish

The task's claims are of two kinds. Type-level claims concern what the compiler
accepts and rejects at real `.res`/`.resi` boundaries. Behavioural claims
concern what happens, and when, as a description is built, provided, and
evaluated. Neither kind establishes runtime ownership, interruption, cleanup,
stack safety, or defect classification, which do not exist yet.

### Abstract model

The model is independent of ReScript. For sets `A` (success), `E` (expected
error), and `R` (environment):

```plaintext
IO(A, E)    = 1 -> A + E          total, terminating, exception-free thunks
Fx(A, E, R) = R -> IO(A, E)

IO.succeed(a)         = λ(). inl a
IO.fail(e)            = λ(). inr e
IO.suspend(c)         = λ(). c()()
IO.flatMap(m, k)      = λ(). case m() of inl a -> k(a)() | inr e -> inr e
IO.mapError(m, g)     = λ(). case m() of inl a -> inl a | inr e -> inr g(e)

succeed(a)            = λr. IO.succeed(a)
fail(e)               = λr. IO.fail(e)
suspend(c)            = λr. IO.suspend(λ(). c()(r))
flatMap(m, k)         = λr. IO.flatMap(IO.suspend(λ(). m(r)),
                                       λa. IO.suspend(λ(). k(a)(r)))
map(m, f)             = flatMap(m, λa. succeed(f(a)))
tap(m, k)             = flatMap(m, λa. map(k(a), λ_. a))
mapError(m, g)        = λr. IO.mapError(IO.suspend(λ(). m(r)), g)
access(h)             = λr. IO.suspend(λ(). IO.succeed(h(r)))
accessEffect(h)       = λr. IO.suspend(λ(). h(r)(r))
provide(m, r)         = m(r)
contramapEnvironment(m, p) = λl. IO.suspend(λ(). m(p(l)))
```

`provide` applies the description directly. Every combinator's environment
closure is inert (C-13), so `provide` runs no callback by construction; the
combinators, not `provide`, own deferral. This assignment makes each
combinator's deferral observable through `provide` (see ablations A-2, A-5).

Premises under which the equations below are claimed:

- P-1: every user callback is total, terminating, and does not throw.
- P-2: every user callback is deterministic: its result depends only on its
  arguments and, for environment readers, on the environment's current state.
- P-3: the only observable effect of a callback is an event appended to a
  test-owned trace, or, in the live-observation examples only, a write to a
  mutable environment field.
- P-4: outcomes are compared with a typed equality over
  `IoEvaluation.outcome<int, string>`, never by JavaScript identity.

Observational equivalence comes in two strengths, and each law states which it
claims:

- results-only (`≈r`): for the same environment, evaluating both sides yields
  equal outcomes;
- results-and-trace (`≈t`): additionally, both evaluations append the same
  sequence of events. A single global trace is sound for these laws because
  both sides perform the same callbacks in the same order.

Each equivalence is checked by evaluating each side twice, so state carried
between evaluations is exposed.

### Obligations

Each obligation names its claim, boundary, method, and non-vacuity evidence.

- OB-1, inertness. Building any description, and applying it to an
  environment (which `provide` does), invokes no user callback. Boundary:
  `IO.resi`, `Fx.resi`, `Fx.provide`. Method: per-operation named examples in
  `tests/IO.test.res` and `tests/Fx.test.res` that assert an empty trace after
  construction and after `provide`, then a non-empty trace after evaluation;
  and an inertness property over generated descriptions in
  `tests/FxLaws.test.res`. Non-vacuity: the post-evaluation assertion is the
  witness; ablations A-2 and A-5 must fail it.
- OB-2, fresh execution. Evaluating the same `IO.t` twice invokes each
  callback twice and yields equal outcomes; nothing is memoized, including
  across a success followed by a failure. Method: named examples, including one
  whose environment makes the first evaluation succeed and the second fail.
  Non-vacuity: ablations A-3 and A-6 must fail.
- OB-3, sequencing, short-circuit, and counts. In `flatMap(m, k)` every event
  of `m` precedes every event of `k(a)`; after an expected failure no `map`,
  `flatMap`, or `tap` continuation runs; `mapError`'s mapper runs exactly once
  and only on failure; `access`'s reader runs exactly once per evaluation; a
  suspended constructor runs exactly once per evaluation at its point in the
  sequence. Method: exact-trace named examples and the `≈t` laws. Non-vacuity:
  ablations A-3b and A-4 must fail.
- OB-4, operation semantics. Each operation's evaluated outcome matches the
  model for success, failure, and environment reads. `tap` keeps the original
  value, runs its work once and in order, and fails the whole description when
  its work fails. `accessEffect` runs its result in the same environment,
  witnessed by an identity token in the environment, including under a
  projection, where it sees `p(l)`. Method: Given/When/Then examples.
  Non-vacuity: ablation A-7 must fail; each example asserts a value a constant
  implementation would not produce.
- OB-5, live observation. The environment is read at each operation's
  execution, not captured at construction or provision (design §3.2): an
  `access`, then a `tap` that writes a mutable environment field, then a second
  `access` observes the new value; and one description provided to two
  environments yields each environment's value. Method: named examples.
  Non-vacuity: ablation A-2 (read at environment application) fails the first
  example.
- OB-6, IO laws, tested in `tests/IoLaws.test.res`:
  - left identity `IO.flatMap(IO.succeed(a), k) ≈t k(a)`;
  - right identity `IO.flatMap(m, IO.succeed) ≈t m`;
  - associativity `IO.flatMap(IO.flatMap(m, k1), k2) ≈t
    IO.flatMap(m, a => IO.flatMap(k1(a), k2))`;
  - left zero `IO.flatMap(IO.fail(e), k) ≈t IO.fail(e)`;
  - suspension `IO.suspend(() => m) ≈t m`;
  - `IO.mapError` identity and composition (`≈t`);
  - `IO.mapError(IO.succeed(a), g) ≈t IO.succeed(a)` and
    `IO.mapError(IO.fail(e), g) ≈r IO.fail(g(e))`;
  - `IO.mapError` distributes over `IO.flatMap` (`≈r`).
- OB-7, Fx laws, tested in `tests/FxLaws.test.res`: the OB-6 laws restated for
  `Fx` (same strengths), plus `map(m, f) ≈t flatMap(m, a => succeed(f(a)))`,
  `map` identity and composition (`≈t`), `Fx.suspend(() => m) ≈t m`, and
  `tap(m, k) ≈t flatMap(m, a => map(k(a), _ => a))`.
- OB-8, environment laws, tested in `tests/FxLaws.test.res`:
  - `provide(access(h), r) ≈t IO.suspend(() => IO.succeed(h(r)))`;
  - `provide(accessEffect(h), r) ≈r provide(h(r), r)` (results-only: the
    right side calls `h` while the test builds the term);
  - `accessEffect(r => succeed(h(r))) ≈t access(h)`;
  - `accessEffect(_ => m) ≈t m`;
  - `contramapEnvironment(m, x => x) ≈t m`;
  - `contramapEnvironment(contramapEnvironment(m, f), g)
    ≈t contramapEnvironment(m, x => f(g(x)))`;
  - `provide(contramapEnvironment(m, p), l) ≈t
    IO.suspend(() => provide(m, p(l)))`;
  - `contramapEnvironment(access(h), p) ≈r access(x => h(p(x)))`;
  - projection distributes over sequencing (`≈r`, because the right side
    calls `p` twice):
    `contramapEnvironment(flatMap(m, k), p)
    ≈r flatMap(contramapEnvironment(m, p), a => contramapEnvironment(k(a), p))`;
  - provision distributes over sequencing:
    `provide(flatMap(m, k), r) ≈t IO.flatMap(provide(m, r), a =>
    provide(k(a), r))`.

  Each projection runs once per evaluation of the projected description, never
  at construction or provision (named example).
- OB-9, model agreement. For every generated description `e` in the
  test-side syntax and every environment, evaluating the production description
  `build(e)` agrees with the executable model `denote(e, env)` in outcome and
  trace (`≈t`). Method: a property in `tests/FxLaws.test.res`. This is the
  "tested agreement" half of the proof sketch's correspondence claim.
  Non-vacuity: ablations A-3b, A-4, and A-7 must produce counterexamples; the
  laws alone compare production with production and would pass a consistently
  wrong implementation.
- OB-10, opacity (type level). A consumer cannot apply, construct, or
  destructure `IO.t` or `Fx.t`. Boundary: the installed package's `.resi`
  files. Method: negative fixtures `fx-apply-io`, `fx-apply-fx`, and
  `fx-forge-fx`, each paired with a one-line positive control. Non-vacuity:
  ablation A-11 (make `IO.t` manifest in `IO.resi`) makes `fx-apply-io`
  compile, so the suite fails.
- OB-11, requirement variance. `Fx.t` is contravariant in `'r`: a coercion
  that forgets a requirement is rejected, and one that adds a requirement
  compiles. Method: negative `fx-forget-requirement` and control
  `fx-add-requirement`. Non-vacuity: ablation A-9 (declare `+'r`) fails the
  library build itself (`ns3`); ablation A-12 (declare `'r` invariant) makes
  the control fail.
- OB-12, error invariance. `:>` cannot widen `'e` even where the error types
  are subtypes; the same coercion on `result` compiles; explicit `mapError`
  injection compiles. Method: negative `fx-error-widening` and control
  `fx-widen-result`, plus the base project's `AppError` injection. Non-vacuity:
  ablation A-10 (declare `+'e` in `IO.resi` and `Fx.resi`) makes the negative
  compile.
- OB-13, multi-module accumulation without casts. Accessors exported as
  functions from separate service modules compose in a third module, the
  combined open row is inferred, and `provide` accepts an environment with an
  extra field. A non-function export of an open-row description is rejected at
  the exporting binding (ADR 005's diagnostic-site table, probe `R5`). Method:
  the base fixture project (Clock, Log, Workflow, Projection, AppError, Main),
  fixture `fx-value-export` with control `fx-function-export`, and the escape
  scan. Non-vacuity: the scan's unit test must flag a seeded `Obj.magic` and
  the exempt variance witness when its exemption is removed;
  `make package-check` executes `Main.res.mjs`.
- OB-14, no consumer-reachable runner, backend, or undeclared module. The
  exported items of `IO` and `Fx` equal the lists in
  `Interfaces and dependencies`; every `src/*.res` has a `.resi`; `public` plus
  the internal list equals the `src/` modules; `package.json` `dependencies` is
  unchanged. Method: D-11 and D-9 contracts and the existing dependency
  contract. Non-vacuity: ablation A-13 (add `IO.unsafeRun`) fails the
  export-set contract; each module contract has a negative control with a
  synthetic extra module.

### Axioms and trusted base

- AXIOM-1: the ReScript 12.3.1 type checker soundly enforces `.resi`
  abstraction, declared-variance checks, and object-row typing. Evidence that
  narrows the trust: fixtures and probes `ns3`, `v2`, `R1` to `R8`.
- AXIOM-2: the compiler's generated JavaScript preserves the call order and
  closure semantics of the source. Evidence that narrows it: behavioural and
  model-agreement tests run the generated modules.
- AXIOM-3: Bun 1.4.2's JavaScript engine evaluates calls as JavaScript
  specifies.
- AXIOM-4: the test binding's assumption that an `IO.t` is a zero-argument
  JavaScript function returning ReScript 12's `result` representation
  (`{TAG: "Ok" | "Error", _0}`). Only `tests/support/io-evaluation.mjs` depends
  on it; it checks the shape and throws otherwise.
- AXIOM-5: fast-check 4.10.2's generators, shrinking, and seeded pseudo-random
  generator behave as documented.
- AXIOM-6: `rescript-tools doc` 12.3.1 reports every exported item of a built
  `.resi`. Evidence that narrows it: ablation A-13.
- AXIOM-7: JavaScript consumers are untyped. They can call the representation
  directly, so opacity is a ReScript-consumer guarantee only. The users' guide
  states this.

### Proof selection

No obligation in this task is selected for machine-checked proof (D-7). The
reasons, obligation by obligation:

- OB-10 to OB-14 are type-level or inventory facts. The ReScript compiler and
  `rescript-tools` are themselves the checkers; fixtures with intended
  diagnostics are direct evidence, subject to AXIOM-1 and AXIOM-6. A separate
  prover would re-prove the type system, not refex.
- OB-6 to OB-9 are equations between higher-order terms. Their proof is
  equational reasoning in the model: the laws are the textbook Reader and
  Either monad laws under P-1 and P-2, so a mechanized model proof would add
  little. The selected route, LemmaScript and Dafny over compiled JavaScript,
  could not translate higher-order helpers whose lambdas build tagged values
  (FX-1, Rule 1), and the `rescript-deductive-verification` skill records that
  the route refuses `result<...>` in a contracted signature. Every production
  function here returns a closure that builds a `result`, so both limits apply
  to the shipped code, not only to a hypothetical model. No feasibility
  experiment is therefore planned.
- OB-1 to OB-5 are properties of evaluation order and timing. Design §11 and
  the deductive-verification skill keep such properties in conformance tests.
- The representation is temporary: task 1.3.1 replaces it. The durable proof
  targets remain the pure cause functions (ADR 006, LC-1 to LC-3, tasks 1.2.3
  and 1.3.1) and the lifecycle transition function (ADR 007, task 1.3.3).

Proof sketch, recorded as unproved statements:

- Lemma S (suspension): if building `x` runs no callback, then
  `IO.suspend(() => x) ≈t x`. Unfold: `IO.suspend(c)() = c()()`, and `c()`
  returns `x` without events.
- Lemma I (inertness): for every description `d` built by the public
  operations and every environment `r`, computing `d(r)` runs no user callback.
  By structural induction over the operations: each combinator's closure body
  is an `IO` constructor applied to values and to closures that call user code
  only inside an IO thunk (C-13).
- Laws: unfold the model definitions and apply Lemma S to remove the
  `IO.suspend` layers that `Fx` inserts; each law then reduces to case analysis
  on `m(r)()`. For example, `flatMap(succeed(a), k)(r)() = k(a)(r)()`.
  Distributivity of projection unfolds both sides to
  `case m(p(l))() of inl a -> k(a)(p(l))() | inr e -> inr e`, with `p`
  evaluated once on the left and twice on the right, hence `≈r`.
- Correspondence: production `IO.res` and `Fx.res` are the model's terms
  written in ReScript; the refinement argument needs Lemma S, Lemma I, AXIOM-2,
  and premises P-1 to P-4. OB-9 tests the agreement.

This is model reasoning plus tested agreement, not a machine-checked proof of
the ReScript implementation, and no document may describe it otherwise.

### Verification matrix

| Row  | Claim (premises)                                 | Boundary                | Evidence now                                              | Later                    | Acceptance                                                    | Limits and feasibility gate                    |
| ---- | ------------------------------------------------ | ----------------------- | --------------------------------------------------------- | ------------------------ | ------------------------------------------------------------- | ---------------------------------------------- |
| K-1  | Inertness (OB-1)                                 | `IO.resi`, `Fx.resi`    | Named examples, property, A-2, A-5                        | 1.3.1 reruns             | Empty trace after build and `provide`; exact after evaluation | Sampled; callbacks, not allocation; no gate    |
| K-2  | Fresh execution (OB-2)                           | IO evaluation           | Named examples, A-3, A-6                                  | 1.3.1                    | Two evaluations, two traces, no stale value                   | P-1 to P-3; no gate                            |
| K-3  | Ordering, short-circuit, counts (OB-3)           | IO and Fx evaluation    | Exact traces, `≈t` laws, A-3b, A-4                        | 1.3.1, E2                | Exact traces asserted                                         | No exceptions, async, or interruption; no gate |
| K-4  | Exact surface, no runner or backend (OB-14)      | `src/`, `rescript.json` | Export-set and module contracts, A-13                     | 1.2.3, 1.3.1 revisit     | Contracts pass; negative controls fail                        | AXIOM-6, AXIOM-7; no gate                      |
| K-5  | Multi-module accumulation, no casts (OB-13)      | Installed package       | Base fixture, `fx-value-export` pair, scan, package-check | 1.2.2 rejection cases    | Base compiles and runs; scan clean; scan controls fail        | Type-level only; no gate                       |
| K-6  | Explicit projection composes (OB-8, design §3.2) | Installed package, `Fx` | Base `Projection` module, examples, laws                  | 1.2.2 incomplete case    | Compiles without casts; examples and laws pass                | As K-5                                         |
| K-7  | Error injection, invariant `'e` (OB-12)          | Installed package       | Base `AppError`, `fx-error-widening` pair, A-10           | 1.2.3 recovery types     | Negative fails at the coercion; control compiles              | No mixed causes yet; no gate                   |
| K-8  | Opacity (OB-10)                                  | Installed package       | Three negative fixtures with controls, A-11               | none                     | Each fails with its fragment, file, and line                  | AXIOM-1; no gate                               |
| K-9  | IO, Fx, and environment laws (OB-6 to OB-8)      | IO and Fx evaluation    | fast-check, 200 runs per law, evaluate-twice              | 1.3.1 reruns             | All laws pass; pinned-seed classification thresholds met      | Sampled, depth 4; P-1 to P-4; no gate          |
| K-10 | Model agreement (OB-9)                           | `Fx` against `denote`   | fast-check property, A-3b, A-4, A-7                       | 1.3.1 reruns             | Passes; each listed ablation yields a counterexample          | Model is test code; P-1 to P-4; no gate        |
| K-11 | Requirement variance (OB-11)                     | `Fx.resi`               | Negative and control fixtures, A-9, A-12                  | 1.3.1 if `IO.t` abstract | Negative fails; control compiles; ablations fail              | AXIOM-1; trust returns at 1.3.1                |
| K-12 | Live observation (OB-5)                          | `Fx` evaluation         | Named examples, A-2                                       | 3.2.1 (E6)               | Second read sees the write; two environments, two values      | One mutable field; no gate                     |

### Ablations

Each ablation is a temporary edit to production source. Make it in the working
tree, rebuild, run the named suite, observe the failure and its reason, revert,
and confirm `git diff --exit-code src/`. Record each result in
`Artefacts and notes`, then rerun the full suite.

- A-2: `Fx.access` reads the environment when its closure is applied, outside
  `IO.suspend`. Expected: OB-1 (`provide` trace) and OB-5 examples fail.
- A-3: `IO.flatMap` caches the last successful value in a `ref` and, on a
  later failure, calls the continuation with the cached value. Expected: the
  OB-2 succeed-then-fail example fails.
- A-3b: `Fx.flatMap` evaluates `first` twice. Expected: OB-3 exact traces,
  `≈t` laws, and OB-9 fail.
- A-4: `IO.mapError` calls its mapper twice on failure. Expected: OB-3 and
  OB-9 fail. (Running the mapper on success is ill-typed.)
- A-5: `Fx.contramapEnvironment` calls `p(l)` when its closure is applied,
  outside `IO.suspend`. Expected: OB-1 and the once-per-evaluation example fail.
- A-6: `IO.suspend` memoizes the first constructed description. Expected:
  OB-2 fails.
- A-7: `Fx.tap` ignores `k`. Expected: OB-4 (failing tap) and OB-9 fail; the
  `tap` law fails when `k` fails.
- A-9: `Fx.resi` declares `+'r`. Expected: `make build` fails with "Their
  variances do not agree."
- A-10: `IO.resi` and `Fx.resi` declare `+'e`. Expected: `fx-error-widening`
  compiles, so the fixture suite fails.
- A-11: `IO.resi` declares `type t<+'a, 'e> = unit => result<'a, 'e>`.
  Expected: `fx-apply-io` compiles, so the fixture suite fails.
- A-12: `Fx.resi` declares `'r` without variance. Expected: control
  `fx-add-requirement` fails, so the fixture suite fails.
- A-13: add `let unsafeRun: t<'a, 'e> => result<'a, 'e>` to `IO`. Expected:
  the export-set contract fails.

Parametricity excludes the remaining short-circuit faults: no well-typed
`IO.flatMap` can call its continuation after a failure without a stale value,
and `IO.mapError` cannot call its mapper on success.

### Test strategy applicability

- Unit and behavioural tests: applicable. `tests/IO.test.res` and
  `tests/Fx.test.res` use `describe` and `test` from `RescriptBun.Test`, opened
  locally, with Given/When/Then test names. No Gherkin requirement exists, so
  no second runner is added.
- Snapshot tests: not applicable. No stable diagnostic, trace format, or
  serialization is part of this task's contract. Compiler diagnostics are
  matched by fragment, file, and line, not snapshotted.
- Compiler and public-interface tests: applicable, as K-4 to K-8 and K-11.
- Property tests: applicable, as K-1, K-9, and K-10.
- Model-based state-machine tests: not applicable. Descriptions are immutable
  values; OB-9's model is a denotational oracle, not a command sequence.
- Asynchronous and lifecycle tests: not applicable. This task introduces no
  promise, clock, scope, resource, or cancellation. Readiness signals, joins,
  and ownership inspection begin at 1.3.x.
- End-to-end tests: the external boundary is the packed package. The
  extended `make package-check` ReScript consumer, built from the archive and
  executed, is the end-to-end test. No browser, network, or process boundary
  exists.
- Formal proof and model checking: not selected; see "Proof selection".

### How the methods complement one another

The compiler and `rescript-tools` establish what consumers can write and what
the package exports (K-4 to K-8, K-11). Named examples establish when callbacks
run and what each operation computes on chosen inputs (K-1 to K-3, K-12). Laws
generalize the equations; model agreement ties the production code to the
abstract model (K-9, K-10). Ablations show that each suite can fail. None
establishes stack safety, exception classification, or runtime ownership; tasks
1.3.1 and later own those.

## Plan of work

Seven milestones follow. Each ends with `make check-fmt`, `make lint`, and
`make test` passing, and `make all` passing before each commit. Delegate full
gate runs to `scrutineer`; when it reports a failure, read its cited log rather
than rerunning. Each milestone carries its own documentation changes, so every
plateau is truthful; EP-M6 only reconciles. Keep functional and refactoring
commits separate (AGENTS.md).

## Milestones and plateaus

### EP-M0: baseline, evidence, and ADR 008

- Outcome: the namespace-visibility evidence is reproducible from the
  repository, and ADR 008 exists as `proposed`.
- Requirements and gaps: C-5, C-12, D-9, D-12; sources C19 and C20.
- Work:
  1. Run `make all` on the unchanged branch through `scrutineer` and record
     the result.
  2. Re-run `probe.sh` from `Artefacts and notes` and record its output.
  3. Add "Planning probes for task 1.2.1" to
     `docs/evidence/type-level-probes.md`: claim, pins (ReScript 12.3.1, Bun
     1.4.2), the full script, observations for `ns1` to `ns8`, negative
     controls (`ns6` shows that the un-namespaced failure is the namespace's
     doing), limits (in-package dev-source access under `namespace-entry` is
     untested; `rescript-legacy` was not tried), and decision.
  4. Add to `docs/context.md` §7: C19, the ReScript manual's build
     configuration page describing `public`; C20, the Rewatch configuration
     specification at tag `v12.3.1`
     (`https://github.com/rescript-lang/rescript/blob/v12.3.1/rewatch/CompilerConfigurationSpec.md`)
     and issue 6760, which mark `public` as not implemented and list
     `namespace-entry`; and update C16 to cite Primavera's `lib/sig.mli` for
     its `local`, `perform`, and `perform_value` signatures.
  5. Write `docs/adr-008-first-semantic-modules-and-module-visibility.md`,
     status `proposed`, covering D-12 in the Y-statement form the other ADRs
     use, with falsifiers (for example, "if a pinned compiler implements
     `public`, revisit D-9") and its amendments to ADR 001, ADR 004, and
     ADR 006. Link it from `docs/contents.md`.
- Acceptance evidence: the evidence section reproduces `ns1`, `ns7`, and
  `ns8`; `documentation-contracts` accepts ADR 008; the `scrutineer` log
  `/tmp/all-refex-1-2-1-smallest-opaque-fx-surface.out` shows `make all`
  passing.
- Commits: "Record namespace visibility evidence for task 1.2.1";
  "Propose ADR 008 for the first semantic modules".
- Conformance check: no production or test code changed.
- Recovery: documentation only; revert the commits.
- Remaining gaps: the owner must accept ADR 008 before EP-M1.

### EP-M1: `IO` test-first, with interface and module contracts

- Outcome: a public, opaque `IO` module with tested deferral, and mechanized
  surface contracts.
- Requirements: C-1 to C-6, C-13; OB-1 to OB-3 for IO, OB-14; D-1, D-3, D-9,
  D-11.
- Red:
  1. Create `tests/support/io-evaluation.mjs`, exporting `evaluate(io)`:
     throw a `TypeError` naming the expected representation unless
     `typeof io === "function" && io.length === 0`; call `io()`; throw unless
     the result is an object whose `TAG` is `"Ok"` or `"Error"`; return it.
  2. Create `tests/IoEvaluation.res`:

     ```rescript
     /** Test-only FFI (EP-1.2.1, D-3). `IO.t` is a zero-argument thunk in task
     1.2.1; task 1.3.1 replaces this module with the private runtime entry. */
     type outcome<'a, 'e> = Succeeded('a) | Failed('e)

     @module("./support/io-evaluation.mjs")
     external evaluateRaw: IO.t<'a, 'e> => result<'a, 'e> = "evaluate"

     let evaluate = (io: IO.t<'a, 'e>): outcome<'a, 'e> =>
       switch evaluateRaw(io) {
       | Ok(value) => Succeeded(value)
       | Error(error) => Failed(error)
       }
     ```

  3. Create `tests/IO.test.res` with Given/When/Then cases for `succeed`,
     `fail`, `suspend` (constructor not invoked until evaluation; invoked
     again on a second evaluation), `flatMap` (ordering, short-circuit,
     succeed-then-fail fresh execution), and `mapError` (only on failure,
     exactly once). Each case records events in a local `array<string>`
     trace.
  4. Add `./tests/IO.test.res.mjs` to the `test` and `coverage` recipes.
  5. Run `make test`; it must fail with "The module or file IO can't be
     found." Record that output.
- Green:
  1. Create `src/IO.resi` and `src/IO.res` as `Interfaces and dependencies`
     specifies.
  2. Set `rescript.json` `public` to `["Bootstrap", "IO"]`; add
     `src/IO.res`, `src/IO.resi`, and `src/IO.res.mjs` to `package.json`
     `files`; add `./src/IO.res.mjs` to `exports`; mirror both in
     `packageContract` and in the allowlist of `scripts/package-check.mjs`.
  3. Add `publicModulesContract(rescript, srcEntries, internalModules)` to
     `tests/support/package-dependency-contracts.mjs`, with `internalModules`
     an exported, documented empty array. It asserts that `public` plus
     `internalModules` equals the `src/*.res` module names and that every
     `src/*.res` has a `.resi`. Call it from
     `tests/package-contracts.test.mjs` with the real directory listing, and
     add negative controls there: an extra synthetic module name, and a
     synthetic `.res` without a `.resi`, must each make it throw. Update the
     helper's "Permitted callers" note.
  4. Create `tests/interface-contracts.test.mjs`. For each `src/*.resi`, run
     `bun run --bun rescript-tools doc <file>`, parse the JSON, and compare
     the item `name`, `kind`, and `signature` list with an expected table in
     the suite. `Bootstrap` stays in the table until EP-M5. Add a negative
     control: a doctored item list with an extra value must be rejected by the
     comparison function. Add the suite to `make test`.
  5. Add a `coverage`-recipe contract to `tests/makefile-contracts.test.mjs`:
     every `tests/*.test.res` suite appears in `make coverage`. The authored
     `.mjs` contract suites, including `compiler-fixtures`, stay out of
     coverage, which measures `src/`.
  6. Build, then stage: `git add src/IO.res src/IO.resi src/IO.res.mjs`.
- Refactor: none expected. Run ablations A-3, A-6, and A-13 and record them.
- Documentation in the same milestone: `docs/users-guide.md` (`IO` exists,
  cannot be run; `Bootstrap` still present until EP-M5);
  `docs/developers-guide.md` (package validation no longer "seven-file"; the
  evaluation binding; the module and interface contracts; the `public` finding);
  `docs/repository-layout.md` (rows for `src/IO.*`, `tests/IoEvaluation.res`,
  `tests/support/io-evaluation.mjs`, the new suites); `AGENTS.md` (replace
  "This bootstrap has none" with the two named test-only FFI boundaries; the
  public allowlist is a declaration checked by contracts); `docs/design.md`
  §2.2 (the package and allowlist changed under ADR 008); the `## Amendments`
  sections of ADR 001 and ADR 004 that ADR 008 calls for; `docs/contents.md`
  (ADR 008 accepted).
- Acceptance evidence: recorded red output; `bun test ./tests/IO.test.res.mjs`
  lists every new case passing; the module and interface contracts and their
  negative controls pass; `make all` passes.
- Commits: "Add the opaque IO description type" (source, tests, package
  registration, docs); "Enforce the src module and interface inventories" (D-9
  and D-11 contracts).
- Conformance check: `dependencies` unchanged; no `external` under `src/`;
  `IO.resi` exports exactly the five operations.
- Recovery: revert both commits; EP-M0 stands alone.
- Remaining gaps: `Fx` absent.

### EP-M2: `Fx` test-first

- Outcome: the full roadmap operation list, with tested deferral, live
  observation, and semantics.
- Requirements: C-6, C-13; OB-1 to OB-5 for Fx; D-4, D-5.
- Red:
  1. Create `tests/Fx.test.res` with Given/When/Then cases for every
     operation in the roadmap list: `succeed`, `fail`, `suspend`, `map`,
     `flatMap`, `tap` (keeps the original value; runs once and in order; a
     failing tap fails the description), `mapError`, `access` (once per
     evaluation), `accessEffect` (same environment, by identity token, also
     under a projection), `provide`, and `contramapEnvironment` (once per
     evaluation; never at construction or provision). Each case asserts the
     trace after construction (empty), after `provide` (empty), and after
     evaluation (exact). Add the OB-5 live-observation cases, using an
     environment record with one `mutable` field.
  2. Add `./tests/Fx.test.res.mjs` to the `test` and `coverage` recipes.
  3. Run `make test`; it must fail with "The module or file Fx can't be
     found."
- Green:
  1. Create `src/Fx.resi` and `src/Fx.res` as specified. `Fx.res` uses only
     `IO.resi`. Each combinator returns an explicit environment closure whose
     body calls user code only inside IO thunks (C-13); `flatMap` follows
     design §3.1's shape; `provide` is `fx(environment)`.
  2. Register `Fx` in `public`, `files`, `exports`, `packageContract`, the
     package-check allowlist, and the interface-contract table.
  3. Stage `src/Fx.res src/Fx.resi src/Fx.res.mjs`.
- Refactor, as a separate commit if any: remove duplication between `map` and
  `tap` only if the result stays readable. Run ablations A-2, A-3b, A-5, A-7,
  and A-9 and record them; A-12 needs EP-M3's fixture and is recorded there.
- Documentation in the same milestone: `docs/users-guide.md` (the `Fx`
  operations, a two-service example, a projection example, no runner,
  JavaScript consumers untyped); `docs/design.md` §3.2 (task 1.2.1 implemented
  the listed operations over the thunk reference representation; §3.1's runtime
  claims remain 1.3.1's); `docs/repository-layout.md` rows.
- Acceptance evidence: recorded red output; every `Fx` case passes; ablation
  results recorded; `make all` passes.
- Commit: "Add the opaque Fx Reader over IO".
- Conformance check: `Fx.res` imports nothing but `IO`; `Fx.resi` matches
  `Interfaces and dependencies` exactly.
- Recovery: revert the commit; EP-M1 stands alone.
- Remaining gaps: no consumer-boundary evidence yet.

### EP-M3: compiler fixtures and the packed consumer

- Outcome: separately compiled consumers prove accumulation, projection,
  injection, opacity, and variance against the installed package.
- Requirements: OB-10 to OB-13; D-10; K-5 to K-8, K-11.
- Fixture layout, all under `tests/fixtures/compiler/fx-surface/`:
  - `base/`: `ClockError.res`/`.resi` (`type t = Unavailable`),
    `LogError.res`/`.resi` (`type t = Full`), `AppError.res`/`.resi`
    (`type t = ClockFailed(ClockError.t) | LogFailed(LogError.t)`),
    `WideError.res`/`.resi` (`type t = | ...ClockError.t | Other`),
    `Clock.res`/`.resi`, `Log.res`/`.resi`, `Workflow.res`/`.resi` (composes
    Clock and Log with `flatMap`, `map`, `tap`, and `accessEffect`, and
    injects errors into `AppError` with `mapError`), `Projection.res`/`.resi`
    (adapts a named environment record with `contramapEnvironment`), and
    `Main.res` (provides an environment with an extra field and annotates the
    provided types, per R-8). Seed them from `Artefacts and notes`. Qualify
    record-field access through open objects where needed (R-2).
  - `cases/<id>.res`: one file per case, each a one-line or two-line
    declaration, written into the project as `src/Case.res`.
  - `cases.json`: metadata only. Schema, by example:

    ```json
    {
      "compiler": "12.3.1",
      "cases": [
        {
          "id": "fx-apply-io",
          "kind": "reject",
          "control": "fx-hold-io",
          "expect": {
            "file": "Case.res",
            "line": 1,
            "fragments": ["This can't be called, it's not a function.", "IO-"]
          }
        },
        {
          "id": "fx-hold-io",
          "kind": "accept"
        },
        {
          "id": "fx-add-requirement",
          "kind": "accept",
          "castScanExemption": "Variance witness; ADR 005 bans `:>` only in composition."
        }
      ]
    }
    ```

  - Cases: `fx-apply-io`/`fx-hold-io`; `fx-apply-fx`/`fx-provide-fx`;
    `fx-forge-fx`/`fx-build-fx`;
    `fx-forget-requirement`/`fx-add-requirement`;
    `fx-error-widening`/`fx-widen-result` (an ordinary-variant spread,
    `ClockError.t` into `WideError.t`, coerced inside `Fx.t` and inside
    `result`); `fx-value-export`/`fx-function-export` (expected fragment
    "cannot be generalized"; confirm the exact wording at implementation and
    record it); and `wrong-reason-control`, a syntax-broken copy of
    `fx-apply-io` that keeps its expectation.
- Work:
  1. Create `tests/support/compiler-fixture-matching.mjs` exporting
     `parseDiagnostics(output)`, `matchesExpectation(diagnostics, expect)`,
     `scanForCasts(source)`, and `differsByOneLine(a, b)`. Its permitted
     callers are exactly `tests/compiler-fixtures.test.mjs` and
     `tests/compiler-fixture-matching.test.mjs`; record that ownership in the
     module's doc comment and in the developers' guide.
     `parseDiagnostics` strips ANSI codes, collapses whitespace, and counts
     every header kind: "We've found a bug for you!", "Warning number", and
     "Syntax error!".
  2. Create `tests/compiler-fixture-matching.test.mjs`, unit-testing the
     helpers on captured output: a wrong file, a wrong line, a missing
     fragment, an extra warning block, and two error blocks must each be
     rejected; a seeded `Obj.magic`, a bare `:>`, and the
     `fx-add-requirement` source without its exemption must each be flagged.
  3. Create `tests/compiler-fixtures.test.mjs`. It: asserts that
     `bun run --bun rescript --version` prints `12.3.1`; asserts that its copy
     list equals `package.json` `files`; creates one project with
     `mkdtempSync(join(tmpdir(), "refex-fixtures-"))`, copies those files into
     `node_modules/refex/`, symlinks `rescript`, `@rescript/runtime`, and
     `.bin` from the repository's `node_modules`, copies `base/` into `src/`,
     and writes a consumer `rescript.json` with `dependencies: ["refex"]` and
     `+A` warnings as errors; builds the base and requires success; for each
     case, in its own `test` with a 60-second timeout, writes `src/Case.res`,
     builds, checks the outcome, and deletes the file in a `finally` block;
     checks that each negative and its control differ by exactly one line;
     requires that `wrong-reason-control` builds unsuccessfully and that the
     matcher rejects its output; rebuilds the base at the end and requires
     success; scans every base and accepted case source, honouring only
     declared exemptions; and logs the wall-clock time of the whole suite.
  4. Add both suites to `make test`. Add the fixture paths to `fmt` and
     `check-fmt` explicitly (no `**`):
     `tests/fixtures/compiler/fx-surface/base/*.res`,
     `tests/fixtures/compiler/fx-surface/base/*.resi`, and
     `tests/fixtures/compiler/fx-surface/cases/*.res`. The syntax-broken case
     cannot be formatted, so store it as
     `cases/wrong-reason-control.res.txt` and list it in `cases.json` with
     that file name.
  5. Extend `scripts/package-check.mjs`: the ReScript consumer copies
     `base/` into its `consumer/` directory, builds against the installed
     archive, and executes `consumer/Main.res.mjs`; the JavaScript consumer
     imports `refex/src/Fx.res.mjs` and `refex/src/IO.res.mjs` and checks
     that `succeed`, `flatMap`, and `provide` are functions. Change its final
     line to `Verified N package files, ISC licence, a JavaScript consumer,
     and a multi-module ReScript consumer.`
  6. Run ablations A-10, A-11, and A-12 and record them.
- Documentation in the same milestone: the developers' guide's fixture
  section (how to add a case with its control, the exemption rule, the R-2
  record-field trap, diagnostics are version-specific); repository-layout rows
  for `tests/fixtures/compiler/` and the coupling with package-check;
  users-guide note on weak top-level types (R-8).
- Acceptance evidence: `bun test ./tests/compiler-fixtures.test.mjs` lists
  every case id passing and logs its time below 120 seconds;
  `make package-check` prints the new line; `make all` passes.
- Commits: "Add a compiler-fixture runner for consumer boundaries" (helpers,
  their unit suite, runner, fixtures); "Build the multi-module consumer from
  the packed archive" (package-check).
- Conformance check: no cast in any accepted source except declared variance
  witnesses; no change to `src/`.
- Recovery: revert either commit independently.
- Remaining gaps: structural rejection cases belong to 1.2.2.

### EP-M4: law and model-agreement property tests

- Outcome: the laws and the model agreement hold on generated descriptions,
  with reproducible failures.
- Requirements: OB-1 (property), OB-6 to OB-9; D-6; K-9, K-10.
- Work:
  1. `bun add -d --exact fast-check@4.10.2`; confirm `bun.lock` records
     integrity
     `sha512-iK2f+YrcmoeGqk6fA0ea2bptcu/itMIm4NfEozq6N25+aG6h7s5HZbB/k1aV7b5w5sFLMCbbtRUsTVR+BgC3xw==`.
     Do not add it to `rescript.json`.
  2. Create `tests/FastCheck.res`, a narrow binding following the
     `rescript-property-testing` skill's example: `arbitrary`, `property`,
     `integer` with constraints, `constantFrom`, `oneof`, `tuple2`, `tuple3`,
     `map`, `chain`, `property1` to `property3`, `check` with `numRuns`,
     `seed`, `path`, and `examples`, and `sample` for classification. No type
     variable appears only in a result position.
  3. Create `tests/FxLawModel.res`, shared by both law suites (documented
     callers: `IoLaws.test.res`, `FxLaws.test.res`). It defines a
     defunctionalized syntax, for example
     `type rec expr = Succeed({value: int}) | Fail({error: string}) |
     Suspend({inner: expr}) | Map({inner: expr, delta: int, label: string}) |
     FlatMap({inner: expr, next: cont}) | Tap({inner: expr, work: cont}) |
     MapError({inner: expr, suffix: string, label: string}) |
     Access({scale: int, label: string}) | AccessEffect({next: cont}) |
     Project({inner: expr, offset: int, label: string})` and
     `and cont = Const({body: expr}) | Branch({even: expr, odd: expr}) |
     AddThen({delta: int})`. It provides `build(expr, trace)`, mapping each
     constructor one-to-one onto production operations with traced
     callbacks; `denote(expr, env)`, the executable model returning the
     outcome and trace; typed equality for outcomes and traces; and the
     arbitraries, bounded at depth four. The environment is
     `{base: int, token: string}`.
  4. Create `tests/IoLaws.test.res` (OB-6) and `tests/FxLaws.test.res` (OB-1
     property, OB-7 to OB-9). Each law is one property with `numRuns: 200`
     and a Bun timeout of 30 seconds, evaluating each side twice and
     comparing at the strength the law states. On failure, fast-check reports
     `seed` and `path`; record them.
  5. Add one classification test with a pinned seed and 1,000 samples. It
     asserts at least 20 per cent of samples end in success, at least 20 per
     cent in failure, each constructor appears in at least 30 per cent, and
     depth four is reached in at least 5 per cent.
  6. Keep any minimal counterexample found during development as a named
     example through fast-check's `examples` parameter, beside its property.
  7. Add both suites to `make test` and `make coverage`. Run ablations A-3b,
     A-4, and A-7 against OB-9 and record the counterexamples.
- Documentation in the same milestone: `docs/context.md` C18 (fast-check
  entered at 1.2.1); developers' guide (the binding, replay with `seed` and
  `path`, the model's ownership); repository-layout rows.
- Acceptance evidence: every law and the agreement property pass; the
  classification thresholds hold; ablations produce counterexamples; `make all`
  and `make audit` pass.
- Commits: "Add fast-check as an exact development dependency"; "Check the IO
  and Fx laws and model agreement on generated descriptions".
- Conformance check: `dependencies` unchanged; `devDependencies` gains only
  `fast-check`.
- Recovery: revert the two commits; earlier milestones stand.
- Remaining gaps: stack safety and exceptions remain 1.3.1's.

### EP-M5: retire `Bootstrap`

- Outcome: `IO` and `Fx` are the only modules; every check and document
  agrees.
- Requirements: D-8; ADR 008.
- Work:
  1. `git rm src/Bootstrap.res src/Bootstrap.resi src/Bootstrap.res.mjs
     tests/Bootstrap.test.res`.
  2. Remove `Bootstrap` from `rescript.json` `public`, `package.json` `files`
     and `exports`, `packageContract`, the interface-contract table, the
     `test` and `coverage` recipes, and the package-check allowlist.
  3. Update `tests/makefile-contracts.test.mjs:175` to name
     `./tests/Fx.test.res.mjs`; `tests/package-contracts.test.mjs:51` to
     `package/src/Fx.res.mjs`; the negative-control string at
     `tests/package-contracts.test.mjs:126` to a non-Bootstrap suite path;
     and `tests/consumer.test.mjs` to import `refex/src/Fx.res.mjs` and
     `refex/src/IO.res.mjs`.
  4. Update `package.json` `description`, `README.md` (quick start),
     `AGENTS.md` (remove the `Bootstrap` rule), `docs/users-guide.md`,
     `docs/developers-guide.md` (coverage baseline, format paths, suite
     inventory, "no effect model belongs" text), `docs/repository-layout.md`,
     `docs/context.md` §1 (the baseline description and the link to
     `../src/Bootstrap.resi`), `docs/design-brief.md`, and
     `docs/contents.md`.
- Acceptance evidence: this search returns only permitted historical
  residue, listed in the commit message (ADR 001 and its amendment, ADR 008,
  `docs/terms-of-reference.md` historical baseline, the design §2.2 heading,
  earlier ExecPlans, and `CHANGELOG.md`):

  ```bash
  rg -n "Bootstrap" --glob '!docs/execplans/**'
  ```

  `make all` passes.
- Commit: "Retire the bootstrap probe module".
- Conformance check: no source depends on `Bootstrap`.
- Recovery: revert this commit alone; EP-M1 to EP-M4 do not depend on it.
- Remaining gaps: none for `Bootstrap`.

### EP-M6: reconciliation and roadmap completion

- Outcome: documents and evidence agree with what was built; the roadmap
  records completion.
- Work:
  1. Reconcile every artefact in `Conformance basis` against the delivered
     code; record any mechanical deviation in `Decision log`.
  2. `CHANGELOG.md`: under "Unreleased", add the opaque `IO` and `Fx`
     descriptions and the retirement of `Bootstrap`.
  3. `docs/contents.md`: describe this plan as complete.
  4. `docs/roadmap.md`: mark task 1.2.1 and its sub-item `[x]`.
  5. Fill `Outcomes & retrospective`; set this plan's status to `COMPLETE`.
- Acceptance evidence: `make all`, `make coverage`, and `make audit` pass;
  the roadmap shows 1.2.1 checked.
- Commit: "Complete roadmap task 1.2.1".
- Recovery: revert the commit.

## Concrete steps

Run every command from the repository root. Capture long output with `tee`.

```bash
BRANCH=$(git branch --show-current)
make all 2>&1 | tee "/tmp/all-refex-${BRANCH}.out"
make check-fmt 2>&1 | tee "/tmp/check-fmt-refex-${BRANCH}.out"
make lint 2>&1 | tee "/tmp/lint-refex-${BRANCH}.out"
make test 2>&1 | tee "/tmp/test-refex-${BRANCH}.out"
make coverage 2>&1 | tee "/tmp/coverage-refex-${BRANCH}.out"
make audit 2>&1 | tee "/tmp/audit-refex-${BRANCH}.out"
```

Focused runs during red and green stages, after `make build`:

```bash
bun test ./tests/IO.test.res.mjs
bun test ./tests/Fx.test.res.mjs
bun test ./tests/IoLaws.test.res.mjs ./tests/FxLaws.test.res.mjs
bun test ./tests/compiler-fixture-matching.test.mjs ./tests/compiler-fixtures.test.mjs
bun test ./tests/interface-contracts.test.mjs
```

Expected red output in EP-M1, abbreviated:

```plaintext
The module or file IO can't be found.
```

Expected green output, abbreviated, where `N` is the suite's case count:

```plaintext
 N pass
 0 fail
```

Record each suite's pass count in `Artefacts and notes`, so an emptied suite
cannot pass silently.

Staging before `make check-generated` or `make all`, per milestone:

```bash
git add src/IO.res src/IO.resi src/IO.res.mjs            # EP-M1
git add src/Fx.res src/Fx.resi src/Fx.res.mjs            # EP-M2
git rm src/Bootstrap.res src/Bootstrap.resi src/Bootstrap.res.mjs \
  tests/Bootstrap.test.res                                # EP-M5
```

Coverage and audit run separately, as CI runs them, after `make all`.

## Validation and acceptance

The task is accepted when all of the following hold:

1. `make all` passes on the final commit; `make coverage` and `make audit`
   pass separately.
2. `make test` executes `tests/IO.test.res.mjs`, `tests/Fx.test.res.mjs`,
   `tests/IoLaws.test.res.mjs`, `tests/FxLaws.test.res.mjs`,
   `tests/interface-contracts.test.mjs`,
   `tests/compiler-fixture-matching.test.mjs`, and
   `tests/compiler-fixtures.test.mjs`; their pass counts are recorded; the
   makefile contracts confirm the `test` and `coverage` inventories.
3. Every positive fixture compiles without an annotation-level cast, except
   declared variance witnesses, and without a backend type; the packed-archive
   consumer builds and executes the multi-module workflow.
4. Every negative fixture fails with its intended fragments, file, and line;
   its one-line control compiles; the wrong-reason control is rejected by the
   matcher.
5. Every ablation was observed to fail for its stated reason and was
   reverted, with results recorded.
6. No user callback runs during construction or `provide` (K-1).
7. Documentation distinguishes implemented (`IO`, `Fx` descriptions),
   consumer-exercised (fixtures, packed consumer), and not yet verified
   (execution, runtime, stack safety, defect classification) behaviour.
8. ADR 008 is accepted, and its amendments appear in ADRs 001, 004, and 006.
9. `docs/roadmap.md` marks 1.2.1 done.

## Idempotence and recovery

Every step is re-runnable. Fixture and package-check projects are created in
fresh temporary directories and removed in `finally` blocks. Generated output
is reproduced by `make build`; if `make check-generated` fails, rebuild and
stage the regenerated `.res.mjs` files rather than editing them. Each milestone
is one or two commits, so rollback is `git revert` of that milestone's commits.
Ablations happen in the working tree and are reverted before staging; confirm
with `git diff --exit-code src/` before committing.

## Artefacts and notes

### Planning probes

Run on 2026-10-31 with ReScript 12.3.1 and Bun 1.4.2, outside the repository.
`probe.sh` reproduces `ns1`, `ns2`, and `ns6` to `ns8`; run it as
`bash probe.sh "$PWD"` from the repository root after `bun install`:

```bash
#!/usr/bin/env bash
# Reproduce planning probes for EP-1.2.1. Usage: probe.sh REPO_ROOT
set -uo pipefail
REPO=$1; P=$(mktemp -d "$HOME/.cache/refex-ns-XXXXXX")
lib=$P/lib; con=$P/consumer; mkdir -p $lib/src $con/src $con/node_modules
ln -s "$REPO/node_modules" $lib/node_modules
for f in "$REPO"/node_modules/* "$REPO"/node_modules/.bin "$REPO"/node_modules/@rescript; do
  ln -sfn "$f" $con/node_modules/
done
build() {
  (cd "$1" && bun run --bun rescript build 2>&1 \
    | grep -E "error|Error|bug|can't|cannot|not a|subtype|variances|expected|Compiled" | head -6)
}
SPECS='"package-specs":{"module":"esmodule","in-source":true},"suffix":".res.mjs"'
WARN='"warnings":{"number":"+A","error":"+A"}'
libcfg() {
  echo "{\"name\":\"refex\",\"namespace\":true,$1\"sources\":[{\"dir\":\"src\",\"public\":$2}],$SPECS,$WARN}" \
    > $lib/rescript.json
}
install() {
  rm -rf $con/node_modules/refex $con/lib; mkdir $con/node_modules/refex
  cp -r $lib/src $lib/package.json $lib/rescript.json $con/node_modules/refex/
  rm -f $con/node_modules/refex/src/*.mjs
}
echo '{"name":"refex","private":true,"version":"0.0.0"}' > $lib/package.json
echo '{"name":"consumer","private":true,"type":"module"}' > $con/package.json
echo "{\"name\":\"consumer\",\"sources\":[\"src\"],\"dependencies\":[\"refex\"],$SPECS,$WARN}" \
  > $con/rescript.json
printf "type t<+'a, 'e>\nlet succeed: 'a => t<'a, 'e>\n" > $lib/src/IO.resi
printf "type t<'a, 'e> = unit => result<'a, 'e>\n" > $lib/src/IO.res
printf "let succeed = (value): t<'a, 'e> => () => Ok(value)\n" >> $lib/src/IO.res
printf 'let evaluate: IO.t<int, string> => int\n' > $lib/src/Kernel.resi
printf 'let evaluate = (_: IO.t<int, string>) => 42\n' > $lib/src/Kernel.res
echo 'let io: Refex.IO.t<int, string> = Refex.IO.succeed(1)' > $con/src/Main.res
echo "== ns1/ns2: Kernel absent from public, consumer calls Refex.Kernel"
libcfg "" '["IO"]'; build $lib; install
echo 'let leaked = Refex.Kernel.evaluate(Main.io)' > $con/src/Escape.res; build $con
(cd $con && echo 'import {leaked} from "./src/Escape.res.mjs"; console.log("ran:", leaked)' > run.mjs && bun run.mjs)
echo "== ns6: bare IO (listed in public) from consumer"
echo 'let x: IO.t<int, string> = Main.io' > $con/src/Escape.res; build $con
echo "== ns7: nonsense public value accepted"
libcfg "" '"bogus-value-should-be-rejected"'; build $lib
echo "== ns8: namespace-entry hides Kernel"
libcfg '"namespace-entry":"Refex",' '["IO"]'
printf 'module IO = IO\n' > $lib/src/Refex.res; printf 'module IO = IO\n' > $lib/src/Refex.resi
build $lib; install
echo 'let leaked = Refex.Kernel.evaluate(Main.io)' > $con/src/Escape.res; build $con
echo 'let ok: Refex.IO.t<int, string> = Main.io' > $con/src/Escape.res; build $con
rm -rf "$P"
```

Observed output, abbreviated:

```plaintext
== ns1/ns2: Kernel absent from public, consumer calls Refex.Kernel
Compiled 4 modules
ran: 42
== ns6: bare IO (listed in public) from consumer
The module or file IO can't be found.
== ns7: nonsense public value accepted
Compiled 2 modules
== ns8: namespace-entry hides Kernel
The module or file Refex.Kernel can't be found.
Compiled 5 modules
```

The remaining probes used the full layout of `Interfaces and dependencies` with
the consumer seeds below:

- `ns3`: declaring `type t<+'a, 'e, +'r>` in `Fx.resi` over
  `'r => IO.t<'a, 'e>` failed: "Type declarations do not match … Their
  variances do not agree." This is ablation A-9.
- `ns4`: with `IO.t` manifestly equal to a kernel type, applying it in a
  consumer failed with "This can't be called, it's not a function. The function
  has type: \"FxKernel-Refex".io<int, string>", leaking the kernel's name.
- `ns5`: the adopted layout compiled the consumer seeds with no cast.
  Applying the provided `IO.t` failed with "This can't be called, it's not a
  function." Forgetting a requirement by `:>` failed with "Type {"clock": int}
  is not a subtype of {"clock": int, "log": int}". Providing only `clock`
  failed at the argument with "The first object is expected to have a field
  "log" of type Log.service, but it does not."

Review probes (type-system panel member, same pins) confirmed that the full
`IO.resi` and `Fx.resi` below compile against a thunk and Reader
implementation; that `fx-forge-fx` fails with "This has type: 'a => 'b … But
it's expected to have type: Refex.Fx.t<…>"; that `fx-add-requirement` compiles;
that an ordinary-variant spread coerced inside `Fx.t` is rejected ("Type
ClockError.t is not compatible with type …") while the same coercion on
`result` compiles; that `let x = IO.succeed(1)` has a weak error type; and that
each fixture build takes about 0.43 seconds.

### Consumer seeds

These compiled in `ns5`. EP-M3 extends them with the error, projection, and
`accessEffect` modules listed there.

```rescript
// Clock.resi
type service = {now: unit => int}
let now: unit => Refex.Fx.t<int, 'e, {.."clock": service}>

// Clock.res
type service = {now: unit => int}
let now = () => Refex.Fx.access(environment => environment["clock"].now())

// Log.resi
type service = {write: string => unit}
let write: string => Refex.Fx.t<unit, 'e, {.."log": service}>

// Log.res
type service = {write: string => unit}
let write = message => Refex.Fx.access(environment => environment["log"].write(message))

// Workflow.resi
let stamp: unit => Refex.Fx.t<int, 'e, {.."clock": Clock.service, "log": Log.service}>

// Workflow.res
let stamp = () =>
  Clock.now()->Refex.Fx.flatMap(time => Log.write(Int.toString(time))->Refex.Fx.map(() => time))

// Main.res
let io: Refex.IO.t<int, string> = Workflow.stamp()->Refex.Fx.provide({
  "clock": {Clock.now: () => 42},
  "log": {Log.write: _ => ()},
  "extra": 1,
})
```

Where a record field is reached through an open object in a module that does
not define the record type, qualify it (`environment["clock"].Clock.now()`), as
R-2 records.

### Implementation records

Red-stage outputs, ablation results, suite pass counts, fixture-suite timings,
and `scrutineer` log paths are appended here during implementation.

## Interfaces and dependencies

### Public interfaces

`src/IO.resi`, complete apart from doc comments. Each export's doc comment
states that it runs nothing when called.

```rescript
/** A lazy description of work that succeeds with `'a` or fails with the
expected error `'e`. Building one runs nothing. Task 1.2.1 provides no runner.
`'e` is invariant (ADR 006). */
type t<+'a, 'e>

let succeed: 'a => t<'a, 'e>
let fail: 'e => t<'a, 'e>
let suspend: (unit => t<'a, 'e>) => t<'a, 'e>
let flatMap: (t<'a, 'e>, 'a => t<'b, 'e>) => t<'b, 'e>
let mapError: (t<'a, 'e1>, 'e1 => 'e2) => t<'a, 'e2>
```

`src/IO.res` defines `type t<'a, 'e> = unit => result<'a, 'e>`. Each operation
returns a thunk and calls no argument callback until the thunk runs.

`src/Fx.resi`, complete apart from doc comments:

```rescript
/** A lazy description that needs environment `'r`. Contravariance in `'r` is
derived by the compiler from the representation, not declared on trust. */
type t<+'a, 'e, -'r>

let succeed: 'a => t<'a, 'e, 'r>
let fail: 'e => t<'a, 'e, 'r>
let suspend: (unit => t<'a, 'e, 'r>) => t<'a, 'e, 'r>
let map: (t<'a, 'e, 'r>, 'a => 'b) => t<'b, 'e, 'r>
let flatMap: (t<'a, 'e, 'r>, 'a => t<'b, 'e, 'r>) => t<'b, 'e, 'r>
let tap: (t<'a, 'e, 'r>, 'a => t<'b, 'e, 'r>) => t<'a, 'e, 'r>
let mapError: (t<'a, 'e1, 'r>, 'e1 => 'e2) => t<'a, 'e2, 'r>
let access: ('r => 'a) => t<'a, 'e, 'r>
let accessEffect: ('r => t<'a, 'e, 'r>) => t<'a, 'e, 'r>
let provide: (t<'a, 'e, 'r>, 'r) => IO.t<'a, 'e>
let contramapEnvironment: (t<'a, 'e, 'small>, 'large => 'small) => t<'a, 'e, 'large>
```

`src/Fx.res` defines `type t<'a, 'e, 'r> = 'r => IO.t<'a, 'e>` and uses only
`IO.resi`. For example:

```rescript
let flatMap = (first: t<'a, 'e, 'r>, next: 'a => t<'b, 'e, 'r>): t<'b, 'e, 'r> =>
  environment =>
    IO.suspend(() => first(environment))->IO.flatMap(value =>
      IO.suspend(() => next(value)(environment))
    )

let access = (read: 'r => 'a): t<'a, 'e, 'r> =>
  environment => IO.suspend(() => IO.succeed(read(environment)))

let provide = (fx: t<'a, 'e, 'r>, environment: 'r): IO.t<'a, 'e> => fx(environment)
```

### Dependencies

No new runtime dependency. One new development dependency, `fast-check` 4.10.2,
used only from `tests/`. No change to `rescript.json` `dependencies` or
`dev-dependencies`.

### Expected footprint

New production files: 4 (`src/IO.*`, `src/Fx.*`, excluding `.res.mjs`). New
test files: about 12 (two bindings and their support module, eight suites, the
law model, the fixture helpers). Fixtures: about 19 base files, about 15 case
files, and `cases.json`. Modified files: about 12 (`Makefile`, `package.json`,
`rescript.json`, `scripts/package-check.mjs`, four test contract files,
`AGENTS.md`, `README.md`, `CHANGELOG.md`, and `typos.local.toml` if needed).
Documents: about 13, including ADR 008 and the evidence section. Deleted files:
4. Total about 79, within the 85-file tolerance; added lines are dominated by
the suites and documentation, and are estimated at 3,000.

## Revision note

2026-10-31, revision 1: initial draft, written from Wyvern reconnaissance,
planning probes, and the documents in `Conformance basis`.

2026-10-31, revision 2: folded in the expert panel's findings. Corrected the
`public` finding (Rewatch does not implement the field; `namespace-entry` hides
modules) and recast D-9 as a declaration contract with an internal list; added
D-11 (exact export-set contract) and D-12 (ADR 008, needed because ADR 001's
decision changes); moved deferral ownership from `provide` to the combinators
(C-13), which made the ablations observable; replaced results-only laws with
stated-strength laws evaluated twice, added a defunctionalized law model with
an executable oracle (OB-9), and added the missing laws and live-observation
cases; replaced ill-typed or masked ablations with well-typed duplication,
caching, elision, and declaration ablations; fixed the fixture design (cases as
files, explicit format paths, variance-witness exemptions, all diagnostic
header kinds, one-line controls, a live wrong-reason control, per-test
timeouts, a copy-list contract); moved documentation into each milestone and
listed every enforcement point for retiring `Bootstrap`; embedded the probe
script; and raised the tolerances to the inventoried footprint. Remaining work
is unchanged in scope: owner approval, then EP-M0.
