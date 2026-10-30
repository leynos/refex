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
owner approves this plan.

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
   `Fx.tap`, and `Fx.mapError`, and have the compiler accumulate the combined
   requirement `{.."clock": Clock.service, "log": Log.service}` without any
   cast, `Obj.magic`, `%identity`, `%raw`, or backend type.
3. Discharge the requirement with `Fx.provide(workflow, environment)` or adapt
   a named environment with `Fx.contramapEnvironment`, receiving an opaque
   `Refex.IO.t<'a, 'e>`.
4. Observe, through the repository's tests, that neither building a description
   nor providing its environment runs any user callback: execution and
   environment access stay deferred until a runtime (roadmap task 1.3.1)
   executes the description.

Success is observable in four places. `make test` runs new behavioural suites
for `IO` and `Fx`, a law-based property suite, and a compiler-fixture suite
whose positive consumers compile and whose negative consumers fail with the
intended diagnostic. `make package-check` builds a multi-module ReScript
consumer against the packed archive. The users' guide documents the new surface
as implemented but unpublished, with no runner. The roadmap marks 1.2.1 `done`.

## Constraints

Hard invariants. Violating any of them requires escalation, not a workaround.

- C-1, portable core: `src/` contains only portable ReScript using the ReScript
  12 standard library. No Bun, Node, browser, React, process, or Effect call,
  import, or type appears there (ADR 002, AGENTS.md).
- C-2, no backend: install no runtime dependency. ADR 004 limits the `effect`
  4.0.5 trial to tasks 1.3.1 to 1.3.5. `package.json` `dependencies` stays
  exactly `{"@rescript/runtime": "12.3.1"}`.
- C-3, no escape hatches in production: `src/` contains no `Obj.magic`,
  `%identity`, `%raw`, `external`, or other unchecked conversion. The only
  permitted test-side foreign function interface (FFI) is the single documented
  evaluation binding defined in EP-M1.
- C-4, explicit interfaces: every module under `src/` has a `.resi` file, and
  every public type introduced here is abstract in its `.resi`.
- C-5, no public runner: nothing reachable by a package consumer executes an
  `IO.t` or `Fx.t`. ReScript 12.3.1's `public` list does not hide modules from
  namespaced consumers (see `Surprises & discoveries`), so this constraint is
  met only by having no runner in `src/` at all.
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
- C-12, accepted bootstrap ADRs stay authoritative. Where this plan changes a
  statement in an ADR, it adds a dated amendment note, as ADR 002 already does,
  and names the change in the `Decision log`.

## Tolerances (exception triggers)

ExecPlan files are excluded from every count below.

- Scope: stop and escalate if delivery needs more than 45 changed non-ExecPlan
  files, or more than 2,600 net added lines of code and other documentation.
- Public interface: stop and escalate if any public module other than `IO` and
  `Fx` is needed, or if either `.resi` needs an export not listed in
  `Interfaces and dependencies`.
- Falsifier: stop if any positive consumer fixture needs an annotation-level
  cast (ADR 005's definition) or a backend type. That would trigger ADR 005's
  falsifier 1, which needs an owner decision.
- Dependencies: stop if any dependency other than the development dependency
  `fast-check` at exactly 4.10.2 is needed.
- Iterations: stop if a gate still fails after three fix attempts for the same
  cause.
- Fixture budget: stop if the compiler-fixture suite needs more than 120
  seconds on the development host. That would change CI cost assumptions.
- Ambiguity: stop and present options if a law in the `Verification plan`
  fails in a way that suggests the specification, not the implementation, is
  wrong.

## Risks

- R-1, diagnostic wording drift. Negative fixtures match compiler text from
  ReScript 12.3.1. Severity medium, likelihood low while pinned. Mitigation:
  the runner first asserts that `rescript --version` reports 12.3.1, and fails
  closed otherwise.
- R-2, vacuous negative fixtures. A fixture could fail for a syntax error or a
  missing module rather than the intended mismatch. Severity high, likelihood
  medium. Mitigation: match file, line, and message; require exactly one error
  block; pair each negative with a positive control; and unit-test the matcher
  against captured wrong-reason output.
- R-3, representation coupling in tests. The test evaluator calls the private
  thunk representation of `IO.t`. Severity medium, likelihood certain at task
  1.3.1. Mitigation: confine the coupling to one documented binding that fails
  closed if the representation is not a zero-argument function; task 1.3.1
  replaces it with the real runtime entry.
- R-4, non-stack-safe reference representation. The thunk-based `IO.t`
  recurses once per nested bind when evaluated. Severity low for 1.2.1, because
  no consumer can evaluate. Mitigation: property generators bound depth; E2's
  100,000-bind stress belongs to 1.3.1 and is recorded there.
- R-5, editor dead-code analysis flags public exports that the package does not
  use itself. Severity low. Mitigation: ADR 003 says the editor analyser is
  advisory; record findings; do not add `@live` to production exports without a
  recorded reason.
- R-6, removing `Bootstrap` touches many contracts. Severity medium,
  likelihood medium. Mitigation: retire it in its own milestone after the new
  consumer checks pass, so rollback is a single revert.
- R-7, fixture builds in the system temporary directory. The existing
  package-contract suites already build in `os.tmpdir()`. Severity low.
  Mitigation: follow that convention, keep the fixture project small, and
  remove it in a `finally` block. A project nested inside the repository was
  rejected because the ReScript build might discover the parent configuration.

## Progress

- [x] (2026-10-31) Renamed the branch to `1-2-1-smallest-opaque-fx-surface`;
  `origin` has no branch of that name yet, so upstream tracking is set on the
  first push.
- [x] (2026-10-31) Wyvern reconnaissance of build, test, and package plumbing,
  and of the 1.1 plan's conventions and evidence.
- [x] (2026-10-31) Planning probes `ns1` to `ns5` (see `Artefacts and notes`).
- [x] (2026-10-31) First draft of this plan.
- [ ] Expert-panel review and revision of this plan.
- [ ] Owner approval of this plan.
- [ ] EP-M0: baseline gates and the namespace-visibility evidence.
- [ ] EP-M1: `IO` test-first.
- [ ] EP-M2: `Fx` test-first.
- [ ] EP-M3: compiler fixtures and the packed consumer.
- [ ] EP-M4: law-based property tests.
- [ ] EP-M5: retire `Bootstrap`.
- [ ] EP-M6: documentation reconciliation and roadmap completion.

## Surprises & discoveries

- Observation: ReScript 12.3.1's `sources[].public` list does not hide a module
  from a consumer package that refers to it through the namespace. A consumer
  of a library with `"public": ["Fx", "IO"]` compiled and ran
  `Refex.FxKernel.evaluate(...)`, where `FxKernel` was absent from `public`.
  Only the un-namespaced name `FxKernel` failed to resolve. The result held
  both with a symbolic-link dependency and with a copied package directory. The
  ReScript manual says `public` marks modules "exposed to outside consumers",
  so the documented intent and the observed behaviour differ. Evidence: probes
  `ns1` and `ns2`. Impact: a "private kernel" module cannot hold a test-only
  runner (C-5), and ADR 004's plan for private execution adapter modules
  "absent from the public allowlist" does not make them unreachable. Hiding
  requires `.resi` abstraction. EP-M0 records this as evidence, and EP-M6 adds
  an amendment note to ADR 004 for task 1.3.1.
- Observation: under ReScript 12's uncurried calling convention, a Reader
  combinator must return a one-argument closure explicitly
  (`value => _environment => ...`). A three-parameter function is not a
  function of the environment and fails to unify. Evidence: the first `ns`
  build failure. Impact: write each `Fx` combinator with an explicit
  environment closure and annotate it with `t<...>`.
- Observation: once `IO.t` has a concrete definition, the compiler checks the
  variances declared in `.resi` files. Declaring `+'r` on `Fx.t` over
  `'r => IO.t<'a, 'e>` fails with "Their variances do not agree" (`ns3`). The
  trust in a declared variance that ADR 005 records therefore ends for task
  1.2.1. It returns at task 1.3.1 if `IO.t` binds a backend type abstractly.

## Decision log

- D-1 (2026-10-31): `IO` is a public module with a minimal combinator set:
  `succeed`, `fail`, `suspend`, `flatMap`, and `mapError`, over the abstract
  type `IO.t<+'a, 'e>`. Rationale: `Fx.provide` must return `IO.t` (ADR 005),
  `Fx.res` must build `IO.t` values, and probe `ns1` showed that a "private"
  module would be reachable by consumers. Exporting only design-sanctioned IO
  operations (design §3.1) keeps every reachable function honest. Building `Fx`
  solely on `IO.resi` also means task 1.3.1 can change the IO representation
  without touching `Fx.res`. Alternatives rejected: a private kernel module
  (reachable, `ns1`); an `IO.t` manifestly equal to a kernel type (leaks
  `FxKernel` in diagnostics, `ns4`); a nested `Fx.IO` module (diverges from ADR
  005's `IO.t` and would move at 1.3.1).
- D-2 (2026-10-31): the 1.2.1 representation is a refex-native thunk,
  `IO.t<'a, 'e> = unit => result<'a, 'e>`. It is a reference representation for
  type-level and law evidence, not the runtime. Rationale: ADR 004 forbids
  installing Effect before 1.3.1; a thunk is the simplest representation whose
  evaluation is the denotational model itself. It has no defect, interruption,
  or release reasons, and it is not stack-safe; those belong to 1.3.1's adapter
  (ADR 006, E2).
- D-3 (2026-10-31): no runner exists in `src/`. Tests evaluate an `IO.t`
  through one test-only binding, `tests/support/io-evaluation.mjs`, bound by
  `tests/IoEvaluation.res`. Rationale: C-5 and probe `ns1`. The binding is the
  narrow, documented test-only FFI that the task brief permits; it contains no
  business logic (`io => io()`) and fails closed on any other representation.
- D-4 (2026-10-31): the explicit environment projection is named
  `contramapEnvironment`, as in design §3.2 and ADR 005, with signature
  `(t<'a, 'e, 'small>, 'large => 'small) => t<'a, 'e, 'large>`. No alias.
- D-5 (2026-10-31): `accessIO`, `fromIO`, `result`, `catchError`, `match`, and
  `Never` are out of scope. The roadmap's list for 1.2.1 omits them; `result`,
  `catchError`, `match`, and `Never` belong to 1.2.3, and `accessIO` to the
  first task with bound service methods.
- D-6 (2026-10-31): `fast-check` 4.10.2 enters now, as an exact development
  dependency, rather than at 1.3.x as context C18 planned. Rationale: the
  monad, functor, and projection laws introduced here are invariants over
  generated descriptions, which the task brief assigns to property tests. The
  bindings are narrow and test-local, following the `rescript-property-testing`
  skill.
- D-7 (2026-10-31): no machine-checked proof is selected for 1.2.1. See
  `Verification plan`, "Proof selection", for the reasoning. The proof sketch
  stays in this plan and in design §3 as unproved statements.
- D-8 (2026-10-31): retire `Bootstrap` in EP-M5. ADR 001's consequences state
  that "new semantic code must replace the disposable module", and the module
  documents "remove this module once real Refex source exists". The owner may
  veto this at approval; if vetoed, EP-M5 is dropped and `Bootstrap` stays
  public beside `IO` and `Fx`.
- D-9 (2026-10-31): add a contract that `rescript.json`'s `public` list equals
  the set of modules under `src/`. Rationale: probe `ns1` shows that absence
  from `public` hides nothing, so a module absent from `public` would be an
  undocumented public module. Task 1.3.1 must revisit this contract when it
  adds adapter modules, and must hide them by `.resi` abstraction.
- D-10 (2026-10-31): compiler fixtures live under `tests/fixtures/compiler/`
  and run from a new authored suite, `tests/compiler-fixtures.test.mjs`,
  against a consumer project that installs the package's `files` allowlist.
  `make package-check` remains the authoritative packed-archive check. Roadmap
  task 1.2.2 extends the same runner with structural requirement cases
  (missing, conflicting, extra, and incompletely projected fields).

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
- `package.json`: exact pins; `files` lists seven archive entries; `exports`
  lists `./src/Bootstrap.res.mjs` and `./package.json`.
- `Makefile`: `make test` builds, then passes every suite to `bun test`
  explicitly. Bun does not discover `*.test.res.mjs` on its own.
  `make coverage` names its suites explicitly too. `make all` runs `check-fmt`,
  `check-generated`, `lint`, `test`, `docs-check`, `spelling`, and
  `package-check` in order.
- `bunfig.toml`: excludes `tests/**` from coverage.
- `scripts/check-generated.mjs`: compares tracked `src/**/*.res.mjs` with the
  index and the on-disk inventory.
- `scripts/package-check.mjs`: packs the archive, compares its file list with a
  hard-coded allowlist, installs it into a clean fixture, and runs a JavaScript
  and a ReScript consumer.
- `tests/makefile-contracts.test.mjs`: fails unless every top-level
  `tests/*.test.mjs` and `tests/*.test.res` suite appears in `make test`.
  Suites in subdirectories are invisible to that inventory, so keep suites at
  the top level of `tests/`.
- `tests/support/package-dependency-contracts.mjs`: asserts the `public` list,
  the `files` list, the `exports` keys, and exact-version dependency pins.
- `tests/package-contracts.test.mjs`: includes the compiler boundary fixture
  showing that production source cannot open `RescriptBun`.
- `.github/workflows/ci.yml`: one job running `bun install --frozen-lockfile`,
  `make all`, `make coverage`, and `make audit`. A workflow contract restricts
  CI run steps to exactly those commands, so new suites must enter through
  `make test` and `make coverage`, not new CI steps.

### Documents and their authority

Read these before implementing; each section named matters.

- `docs/roadmap.md`, step 1.2 and task 1.2.1: the task and its success
  criterion. Tasks 1.2.2 and 1.2.3 follow and must not be pre-empted.
- `docs/design.md` §2.1 (computational separation and the IO/Fx equations),
  §3.1 (laziness and the stack-safe Reader `flatMap` shape), §3.2 (operation
  signatures, `accessEffect`, `provide`, `contramapEnvironment`), §3.3 (`map`,
  `flatMap`, `tap`, `mapError` meanings), §4.1 to §4.2 (expected errors), §10.1
  (E1 and E2), §11 (change discipline), and §12 (D2, D7, D8).
- `docs/terms-of-reference.md`: goals G1 (visible requirements), G2 (typed
  expected errors), and G4 (usable composition); assumption A2 (requirements
  survive interfaces); success criterion §7.1.
- `docs/context.md` §7, the source register (`C1` to `C18`), and §8, the Lody
  learning crosswalk. The crosswalk rows on mixed-cause mapping and
  construction capture motivate later tasks, not this one.
- `docs/adr-001-repository-bootstrap.md` (accepted for bootstrap): pins,
  generated-output policy, and the disposable `Bootstrap` module.
- `docs/adr-002-portable-core-and-bun-boundary.md` (accepted for bootstrap):
  portable core, dev-only Bun bindings, no global opens.
- `docs/adr-003-formatting-and-analysis-policy.md`: formatter, `+A` warnings,
  advisory editor analysis.
- `docs/adr-004-runtime-boundary.md` (provisional): no backend before 1.3.1;
  private adapter modules (affected by probe `ns1`).
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
- `docs/users-guide.md`, `docs/developers-guide.md`,
  `docs/repository-layout.md`, `docs/contents.md`, and `CHANGELOG.md`: updated
  by this plan.

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
  one-file change to it that must fail with a named diagnostic. Positive
  control: a near-identical change that must compile, proving the negative
  fails for its intended reason.
- Observational equivalence (`≈` below): two descriptions are equivalent when,
  for the same environment, evaluating each yields equal `result` values and
  the same sequence of recorded callback events.

### Skills to load

Load `execplans` to maintain this plan; `rescript-router`, then
`rescript-types-and-modules` (abstract types, variance, `.resi`),
`rescript-bun-testing` (suites and explicit runner lists),
`rescript-property-testing` (fast-check bindings and laws), `rescript-interop`
(the single test-only binding), `rescript-build-and-config` (`rescript.json`,
`public`, namespaces), and `rescript-quality-tools` (formatter and analysis).
Load `rescript-deductive-verification` only to re-check the proof-selection
reasoning. Use `codegraph-mcp` for structural questions, `firecrawl-mcp` for
external documentation, `en-gb-oxendict` for prose, and `commit-message` and
`pr-creation` for delivery.

## Conformance basis

Upstream artefacts at commit `826202b37289a590cfaebdbd661baabbcc3e5ff5`
(`main`, 2026-10-30):

- `docs/terms-of-reference.md`: G1, G2, G4; A2; success criterion §7.1.
- `docs/design.md` draft v0.2: §§2.1, 3.1 to 3.3, 4.1 to 4.2, 10.1 (E1, E2),
  11, 12 (D1, D2, D7, D8).
- ADR 001 and ADR 002 (accepted for bootstrap), ADR 003, ADR 004
  (provisional), ADR 005 and ADR 006 (candidate).
- `docs/roadmap.md` task 1.2.1 and its success criterion; tasks 1.2.2, 1.2.3,
  and 1.3.1 as downstream consumers.
- Evidence: `docs/evidence/type-level-probes.md` (`R1` to `R8`, `v2`, `v2b`)
  and `docs/evidence/verification-feasibility.md` (FX-1).

This plan invents no new upstream identifiers. Plan-local identifiers are `C-n`
(constraints), `R-n` (risks), `D-n` (decisions), `EP-Mn` (milestones), `OB-n`
(verification obligations), `AX-n` (axioms), and `K-n` (matrix rows).

Trace chains:

```plaintext
G1, A2 -> design §3.2, ADR 005 (open rows, function exports) -> 1.2.1
  -> EP-M2, EP-M3 -> fixtures fx-multi-module, fx-extra-field -> K-5
G1 -> design §3.2, ADR 005 (contramapEnvironment) -> 1.2.1
  -> EP-M2, EP-M3, EP-M4 -> Fx.test.res projection cases, fixture
     fx-projection, FxLaws projection laws -> K-6, K-9
G2, G4 -> design §§3.3, 4.1, ADR 006 (ordinary variants, invariant 'e)
  -> 1.2.1 -> EP-M1, EP-M3 -> fixtures fx-error-injection,
     fx-error-widening (negative) -> K-7
G4 -> design §3.1 (laziness, fresh execution) -> 1.2.1 success criterion
  -> EP-M1, EP-M2 -> IO.test.res, Fx.test.res deferral cases -> K-1, K-2, K-3
G1 -> ADR 004 (no exposed backend), design §2.3 -> 1.2.1 success criterion
  -> EP-M0, EP-M1, EP-M3 -> public-equals-src contract, opacity fixtures,
     escape scan -> K-4, K-8
ADR 001 consequences (replace Bootstrap) -> EP-M5 -> package-check consumers
```

Downstream obligations this plan hands on:

- 1.2.2 extends `tests/compiler-fixtures.test.mjs` with missing, conflicting,
  extra (closed-row), and incomplete-projection fixtures.
- 1.2.3 adds `result`, `catchError`, `match`, and `Never`, and must keep
  `'e` invariant.
- 1.3.1 replaces the thunk representation behind `IO.resi` with the Effect
  adapter, replaces `tests/IoEvaluation.res` with the private runtime entry,
  reruns `FxLaws.test.res` against it, adds the E2 stress workload, revisits
  the public-equals-src contract (D-9), and re-establishes trust in `IO.t`'s
  declared variance.

## Verification plan

### What this task must establish

The task's claims are of two kinds. Type-level claims concern what the compiler
accepts and rejects at real `.res`/`.resi` boundaries. Behavioural claims
concern what happens, and when, as a description is built, provided, and
evaluated. Neither kind establishes runtime ownership, interruption, cleanup,
or defect classification, which do not exist yet.

### Abstract model

The model is independent of ReScript. For sets `A` (success), `E` (expected
error), and `R` (environment):

```plaintext
IO(A, E)    = 1 -> A + E          total, terminating, exception-free thunks
Fx(A, E, R) = R -> IO(A, E)

succeed(a)            = λr. λ(). inl a
fail(e)               = λr. λ(). inr e
suspend(m)            = λr. λ(). m()(r)()
flatMap(m, k)         = λr. λ(). case m(r)() of inl a -> k(a)(r)()
                                              | inr e -> inr e
map(m, f)             = flatMap(m, λa. succeed(f(a)))
tap(m, k)             = flatMap(m, λa. map(k(a), λ_. a))
mapError(m, g)        = λr. λ(). case m(r)() of inl a -> inl a
                                              | inr e -> inr g(e)
access(h)             = λr. λ(). inl h(r)
accessEffect(h)       = λr. λ(). h(r)(r)()
provide(m, r)         = λ(). m(r)()
contramapEnvironment(m, p) = λl. λ(). m(p(l))()
```

The model's equalities hold under premises P-1 to P-3:

- P-1: every user callback (`f`, `g`, `h`, `k`, `p`, and suspended
  constructors) is total, terminating, and does not throw.
- P-2: equality of outcomes is structural equality of `result` values whose
  payloads are compared with a typed equality, not JavaScript identity.
- P-3: the only observable effect of a callback is an event appended to a
  test-owned trace.

Beyond the denotation, the operational model records when callbacks run. A
trace is the sequence of callback invocations. The invariants below are
statements about traces.

### Obligations

Each obligation names its claim, premises, boundary, method, artefact, and
non-vacuity evidence. "Now" means this task; "later" names the task that
re-discharges it against the runtime.

- OB-1, construction is inert. Building any description with any operation
  invokes no user callback. Premises: none beyond well-typed construction.
  Boundary: `IO.resi`, `Fx.resi`. Method: named examples per operation in
  `tests/IO.test.res` and `tests/Fx.test.res`, plus a property over generated
  descriptions in `tests/FxLaws.test.res` asserting an empty trace after
  construction. Non-vacuity: the same tests then evaluate and assert a
  non-empty trace (witness); ablation A-2 (eager `access`) must fail them.
- OB-2, provision is inert. `Fx.provide(m, r)` invokes no user callback,
  including `access`, `accessEffect`, and projection callbacks. Boundary:
  `Fx.provide`. Method: named examples and the generated-description property.
  Non-vacuity: ablation A-1 (`provide` applies `m(r)` eagerly, which runs
  projections) must fail.
- OB-3, fresh execution. Evaluating the same `IO.t` twice invokes each
  callback twice and yields equal results; nothing is memoized. Method: named
  examples. Non-vacuity: ablation A-6 (memoize the first outcome in
  `IO.suspend`) must fail.
- OB-4, sequencing and short-circuit. In `flatMap(m, k)`, every event of `m`
  precedes every event of `k(a)`; after an expected failure no `map`,
  `flatMap`, or `tap` continuation runs, and `mapError`'s mapper runs exactly
  once, only on failure. Method: named examples plus a trace property.
  Non-vacuity: ablation A-3 (continue after failure) and A-4 (map success
  through `mapError`) must fail.
- OB-5, operation semantics. Each operation's evaluated outcome matches the
  model equation for representative inputs: success, failure, and environment
  reads. Method: Given/When/Then examples in `tests/Fx.test.res` and
  `tests/IO.test.res`. Non-vacuity: each example asserts a value that a
  constant implementation would not produce.
- OB-6, algebraic laws, stated for the model and tested on generated
  terminating descriptions with pure callbacks:
  - left identity `flatMap(succeed(a), k) ≈ k(a)`;
  - right identity `flatMap(m, succeed) ≈ m`;
  - associativity
    `flatMap(flatMap(m, k1), k2) ≈ flatMap(m, a => flatMap(k1(a), k2))`;
  - functor identity and composition for `map` and for `mapError`;
  - `mapError(succeed(a), g) ≈ succeed(a)` and
    `mapError(fail(e), g) ≈ fail(g(e))`;
  - `tap(m, k) ≈ flatMap(m, a => map(k(a), _ => a))`.

  Method: fast-check properties in `tests/FxLaws.test.res`. Non-vacuity: the
  generator's classification shows at least 15 per cent of runs ending in
  success and at least 15 per cent in failure, and nesting depth reaching its
  bound; ablations A-3 and A-4 must produce counterexamples.
- OB-7, environment laws:
  - `provide(access(h), r) ≈ IO.succeed(h(r))`;
  - `provide(accessEffect(h), r) ≈ provide(h(r), r)`;
  - `contramapEnvironment(m, x => x) ≈ m`;
  - `contramapEnvironment(contramapEnvironment(m, f), g)
    ≈ contramapEnvironment(m, x => f(g(x)))`;
  - `provide(contramapEnvironment(m, p), l) ≈ provide(m, p(l))`;
  - projection distributes over sequencing:
    `contramapEnvironment(flatMap(m, k), p)
    ≈ flatMap(contramapEnvironment(m, p), a => contramapEnvironment(k(a), p))`.

  Each projection is invoked once per evaluation of the projected description,
  never at construction or provision. Method: fast-check properties and named
  examples. Non-vacuity: ablation A-5 (projection invoked at construction) must
  fail OB-1 and the once-per-evaluation example.
- OB-8, opacity (type level). A consumer cannot apply, construct, or
  destructure `IO.t` or `Fx.t`. Boundary: the installed package's `.resi`
  files. Method: negative fixtures `fx-apply-io`, `fx-apply-fx`, and
  `fx-forge-fx`, each paired with a positive control that uses the published
  operation instead. Non-vacuity: the matcher requires the specific message
  (for example "This can't be called, it's not a function."), file, and line.
- OB-9, requirement variance. `Fx.t` is contravariant in `'r`: a coercion that
  forgets a requirement is rejected, and one that adds a requirement compiles.
  Method: negative fixture `fx-forget-requirement` and positive control
  `fx-add-requirement`; the declared variance is compiler-checked against the
  concrete representation (`ns3`). Non-vacuity: ablation A-9 (declare `+'r`)
  fails the library build itself, as probe `ns3` showed.
- OB-10, error invariance. `:>` cannot widen `'e`; explicit `mapError`
  injection compiles. Method: negative fixture `fx-error-widening` and positive
  control `fx-error-injection`. Non-vacuity: ablation A-10 (declare `+'e` in
  `IO.resi` and `Fx.resi`) makes the negative fixture compile, so the suite
  fails.
- OB-11, multi-module accumulation without casts. Accessors exported as
  functions from separate service modules compose in a third module, the
  combined open row is inferred, and `provide` accepts an environment with an
  extra field. Method: positive fixture `fx-multi-module` (Clock, Log,
  Workflow, Main, each with `.resi` except Main), plus a scan of every positive
  fixture source for annotation-level casts. Non-vacuity: the scan has a unit
  test with a seeded `Obj.magic` that it must report; the fixture's `Main.res`
  is executed in `make package-check` to show it is not dead code.
- OB-12, no consumer-reachable runner or backend. Every module under `src/` is
  listed in `public`, each has a `.resi`, no `.resi` exports a function
  returning a non-description from a description, and `package.json`
  `dependencies` is unchanged. Method: the public-equals-src contract (D-9),
  the existing dependency contract, and review of `.resi` exports against
  `Interfaces and dependencies`. Non-vacuity: the contract's negative control
  adds a synthetic non-public module name and must fail.

### Axioms and trusted base

- AX-1: the ReScript 12.3.1 type checker soundly enforces `.resi`
  abstraction, declared variance checks, and object-row typing. Evidence that
  narrows the trust: fixtures and probes `ns3`, `v2`, `R1` to `R8`.
- AX-2: the compiler's generated JavaScript preserves call order and closure
  semantics of the source. Evidence that narrows it: behavioural trace tests
  run the generated modules.
- AX-3: Bun 1.4.2's JavaScript engine evaluates calls as JavaScript specifies.
- AX-4: ReScript 12's `result` representation is `{TAG: "Ok" | "Error", _0}`;
  only the test-side evaluation binding depends on it, and it is exercised by
  every behavioural test.
- AX-5: fast-check 4.10.2's generators and shrinking behave as documented;
  its pseudo-random generator is seeded deterministically per run.
- AX-6: JavaScript consumers are untyped. They can call the representation
  directly, so opacity is a ReScript-consumer guarantee only. The users' guide
  states this.

### Proof selection

No obligation in this task is selected for machine-checked proof (D-7). The
reasons, obligation by obligation:

- OB-8 to OB-12 are type-level facts. The ReScript compiler is itself the
  checker; compiler fixtures with intended diagnostics are direct evidence of
  the checked property, subject to AX-1. A separate prover would re-prove the
  type system, not refex.
- OB-6 and OB-7 are equations between higher-order terms. Their natural proof
  is equational reasoning in the model above: each law unfolds to the Reader
  and Either monad laws, which hold by definition under P-1. The selected
  verification route, LemmaScript and Dafny over compiled JavaScript, could not
  translate higher-order helpers whose lambdas build tagged values (FX-1, Rule
  1), and it has not been exercised on polymorphic type parameters. Proving the
  model in another prover would prove a surrogate, which the task brief forbids
  presenting as implementation evidence.
- OB-1 to OB-4 are trace properties of an effectful evaluation order. Design
  §11 and the deductive-verification skill keep such properties in conformance
  tests.
- The representation is temporary: task 1.3.1 replaces it. The durable proof
  targets remain the pure cause functions (ADR 006, LC-1 to LC-3, tasks 1.2.3
  and 1.3.1) and the lifecycle transition function (ADR 007, task 1.3.3).

No feasibility experiment is planned because FX-1 already answered the deciding
question (closures that build tagged values do not translate). A future
obligation that is first-order and pure, such as the cause tree's leaf mapping,
is where proof applies.

Proof sketch, recorded as unproved statements. For OB-6, unfold `flatMap` and
`succeed` in the model: `flatMap(succeed(a), k)(r)() = k(a)(r)()`, which is
left identity pointwise; right identity and associativity follow by case
analysis on `m(r)()`. For OB-7, distributivity unfolds both sides to
`case m(p(l))() of inl a -> k(a)(p(l))() | inr e -> inr e`. The representation
relation is the identity: production `IO.t` is the model's thunk, and `Fx.t` is
the model's function of the environment, so the correspondence argument reduces
to AX-2 plus premises P-1 to P-3. This is model reasoning plus tested
agreement, not a machine-checked proof of the ReScript implementation, and no
document may describe it otherwise.

### Verification matrix

| Row  | Claim (premises)                                  | Boundary                         | Evidence now                                                         | Later                            | Acceptance                                                   | Limits                                      |
| ---- | ------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| K-1  | Construction is inert (OB-1)                      | `IO.resi`, `Fx.resi`             | Named examples, property, ablation A-2                               | 1.3.1 reruns on the runtime      | Empty trace after build; non-empty after evaluation          | Sampled; callbacks only, not allocation     |
| K-2  | Provision is inert (OB-2)                         | `Fx.provide`                     | Named examples, property, ablation A-1                               | 1.3.1                            | Empty trace after `provide`                                  | As K-1                                      |
| K-3  | Fresh execution and ordering (OB-3, OB-4)         | `IO` evaluation                  | Named examples, trace property, ablations A-3, A-4, A-6              | 1.3.1, E2                        | Exact traces asserted                                        | No exceptions, async, or interruption (P-1) |
| K-4  | No reachable runner or backend (OB-12)            | `src/`, `rescript.json`, package | Public-equals-src contract, dependency contract                      | 1.3.1 revisits                   | Contract passes; its negative control fails                  | JavaScript consumers untyped (AX-6)         |
| K-5  | Multi-module accumulation, no casts (OB-11)       | Packed consumer                  | Fixture `fx-multi-module`, escape scan, package-check                | 1.2.2 adds rejection cases       | Compiles and runs; scan clean; seeded scan control fails     | Type-level only                             |
| K-6  | Explicit projection composes (OB-7, design §3.2)  | Packed consumer, `Fx`            | Fixture `fx-projection`, named examples                              | 1.2.2 incomplete projection      | Compiles without casts; examples pass                        | As K-5                                      |
| K-7  | Error injection, `'e` invariant (OB-10)           | Packed consumer                  | Fixtures `fx-error-injection`, `fx-error-widening`, ablation A-10    | 1.2.3 recovery types             | Positive compiles; negative fails at the coercion            | No mixed causes exist yet                   |
| K-8  | Opacity (OB-8)                                    | Packed consumer                  | Fixtures `fx-apply-io`, `fx-apply-fx`, `fx-forge-fx` with controls   | none                             | Each fails with its intended message, file, and line         | AX-1                                        |
| K-9  | Monad, functor, and environment laws (OB-6, OB-7) | `Fx`, `IO` evaluation            | fast-check, 200 runs per law, classified                             | 1.3.1 reruns against the runtime | All laws pass; classification thresholds met; ablations fail | Sampled, not exhaustive; P-1 to P-3         |
| K-10 | Requirement variance (OB-9)                       | `Fx.resi`                        | Fixtures `fx-forget-requirement`, `fx-add-requirement`, ablation A-9 | 1.3.1 if `IO.t` binds a backend  | Negative fails; control compiles                             | AX-1                                        |

### Ablations

Each ablation is a temporary source edit made on a scratch commit or in the
working tree, run against the named suite, observed to fail for the stated
reason, and reverted. Record each result in `Artefacts and notes`. Rebuild and
rerun the full suite after reverting.

- A-1: `Fx.provide` applies `m(r)` immediately instead of inside
  `IO.suspend`. Expected: OB-2 examples fail, because projection and
  `accessEffect` callbacks run at provision.
- A-2: `Fx.access` reads the environment when the closure is applied rather
  than inside `IO.suspend`. Expected: OB-1 and OB-2 examples fail.
- A-3: `IO.flatMap` calls the continuation after a failure with a default
  value. This does not type-check generically, so instead make `IO.flatMap`
  evaluate the continuation of the error branch by re-running `io`. Expected:
  OB-3 and OB-4 traces fail. If no well-typed ablation of short-circuiting
  exists, record that the type system excludes the fault and keep only the
  trace example.
- A-4: `IO.mapError` applies the mapper on success too, discarding its result.
  Expected: OB-4 trace example and the `mapError(succeed(a), g)` law fail.
- A-5: `Fx.contramapEnvironment` calls `p(l)` when applied to `l`, outside
  `IO.suspend`. Expected: OB-2 and the once-per-evaluation example fail.
- A-6: `IO.suspend` memoizes the first constructed description. Expected:
  OB-3 fails.
- A-9: `Fx.resi` declares `+'r`. Expected: `make build` fails with "Their
  variances do not agree."
- A-10: `IO.resi` and `Fx.resi` declare `+'e`. Expected: fixture
  `fx-error-widening` compiles, so the fixture suite fails.

### Test strategy applicability

- Unit and behavioural tests: applicable. `tests/IO.test.res` and
  `tests/Fx.test.res` use `describe` and `test` from `RescriptBun.Test`, opened
  locally, with Given/When/Then test names. No Gherkin requirement exists, so
  no second runner is added.
- Snapshot tests: not applicable. No stable diagnostic, trace format, or
  serialization is part of this task's contract. Compiler diagnostics are
  matched by message, file, and line, not snapshotted.
- Compiler and public-interface tests: applicable, as K-5 to K-8 and K-10.
- Property tests: applicable, as K-9 and the inertness property in K-1.
- Model-based state-machine tests: not applicable. Descriptions are immutable
  values; there is no state machine.
- Asynchronous and lifecycle tests: not applicable. This task introduces no
  promise, clock, scope, resource, or cancellation. Readiness signals, joins,
  and ownership inspection begin at 1.3.x.
- End-to-end tests: the external boundary is the packed package. The
  extended `make package-check` ReScript consumer, built from the archive and
  executed, is the end-to-end test. No browser, network, or process boundary
  exists.
- Formal proof and model checking: not selected; see "Proof selection".

### How the methods complement one another

The compiler establishes what consumers can write (K-4 to K-8, K-10). The
behavioural examples establish when callbacks run and what each operation
computes on chosen inputs (K-1 to K-3). The property suite generalizes the
equations over generated descriptions (K-9). Ablations show that each suite can
fail. None of these establishes stack safety, exception classification, or
runtime ownership; tasks 1.3.1 and later own those.

## Plan of work

The work proceeds in seven milestones. Each ends with `make check-fmt`,
`make lint`, and `make test` passing and with `make all` passing before its
commit. Delegate full gate runs to the `scrutineer` agent where available, and
read its cited log on failure rather than rerunning.

### EP-M0: baseline and namespace-visibility evidence

Run `make all` on the unchanged branch and record the result. Re-run probes
`ns1` and `ns2` using the script in `Artefacts and notes`, outside the
repository (the probe directory used during planning was
`~/.cache/refex-probe-1-2-1/`). Add a section "Planning probes for task 1.2.1"
to `docs/evidence/type-level-probes.md` with the claim, pins (ReScript 12.3.1,
Bun 1.4.2), commands, observations, negative controls, limits, and decision for
`ns1` to `ns5`. Add a source-register entry `C19` to `docs/context.md` §7 for
the ReScript build-configuration manual's statement about `public`.

Acceptance: the evidence section reproduces the observation that
`Refex.FxKernel.evaluate` compiles and runs in a consumer while the
un-namespaced `FxKernel` does not resolve. `make all` passes. Commit: "Record
namespace visibility evidence for task 1.2.1".

Recovery: documentation only; revert the commit.

### EP-M1: `IO` test-first

Red: create `tests/support/io-evaluation.mjs`, which exports `evaluate(io)`: it
throws a `TypeError` naming the expected representation unless
`typeof io === "function" && io.length === 0`, then returns `io()`. Create
`tests/IoEvaluation.res`, a dev module with one binding:

```rescript
/** Test-only FFI. `IO.t` is a zero-argument thunk in task 1.2.1 (EP-1.2.1,
D-3); task 1.3.1 replaces this module with the private runtime entry. */
@module("./support/io-evaluation.mjs")
external evaluate: IO.t<'a, 'e> => result<'a, 'e> = "evaluate"
```

Create `tests/IO.test.res` with Given/When/Then cases for `succeed`, `fail`,
`suspend` (constructor not invoked until evaluation; invoked again on a second
evaluation), `flatMap` (ordering, short-circuit), and `mapError` (only on
failure, exactly once). Each case records callback events in a local
`array<string>` trace. Add `./tests/IO.test.res.mjs` to `make test` and
`make coverage`. Run `make test`; it must fail because module `IO` cannot be
found. Record that output.

Green: create `src/IO.resi` and `src/IO.res` exactly as
`Interfaces and dependencies` specifies. Add `IO` to `rescript.json` `public`;
add `src/IO.res`, `src/IO.resi`, and `src/IO.res.mjs` to `package.json`
`files`; add `./src/IO.res.mjs` to `exports`; update
`tests/support/package-dependency-contracts.mjs` and the allowlist in
`scripts/package-check.mjs` to match. Add the public-equals-src contract (D-9)
to `tests/support/package-dependency-contracts.mjs`, with its negative control
in `tests/package-contracts.test.mjs`. Build, stage `src/IO.res.mjs`, and run
the gates.

Refactor: none expected. Run ablations A-3, A-4, and A-6 and record them.

Acceptance: `bun test ./tests/IO.test.res.mjs` reports every new case passing,
and the earlier red output is recorded. `make all` passes. Commit: "Add the
opaque IO description type".

### EP-M2: `Fx` test-first

Red: create `tests/Fx.test.res` with Given/When/Then cases for every operation
in the roadmap list: `succeed`, `fail`, `suspend`, `map`, `flatMap`, `tap`
(keeps the original value; a failing tap fails; tap's work runs once and in
order), `mapError`, `access`, `accessEffect` (the callback's result runs in the
same environment), `provide`, and `contramapEnvironment` (projection applied
once per evaluation, never at construction or provision). Each case asserts the
trace after construction (empty), after `provide` (empty), and after evaluation
(exact). Add a case that provides one description to two different environments
and evaluates both, showing the environment is read at execution. Add
`./tests/Fx.test.res.mjs` to `make test` and `make coverage`. Run `make test`;
it must fail because module `Fx` cannot be found.

Green: create `src/Fx.resi` and `src/Fx.res` as specified. `Fx.res` uses only
the exports of `IO.resi`. Each combinator returns an explicit environment
closure whose body is wrapped in `IO.suspend`, so that applying the closure
runs no callback; `flatMap` follows design §3.1's shape. Register `Fx` in
`public`, `files`, `exports`, the contracts, and the package-check allowlist.

Refactor: remove duplication between `map` and `tap` only if the result stays
readable. Run ablations A-1, A-2, A-5, and A-9 and record them.

Acceptance: every `Fx` case passes; `make all` passes. Commit: "Add the opaque
Fx Reader over IO".

### EP-M3: compiler fixtures and the packed consumer

Create `tests/fixtures/compiler/fx-surface/` containing a positive consumer
project's sources: `Clock.res`, `Clock.resi`, `Log.res`, `Log.resi`,
`Workflow.res`, `Workflow.resi`, `Projection.res`, `Projection.resi`,
`Errors.res`, `Errors.resi`, and `Main.res`. Seed them from probe sources `R1`,
`R2`, and `R7` in `docs/evidence/type-level-probes.md` Appendix B and from the
planning probe in `Artefacts and notes`. `Workflow` composes `Clock` and `Log`
with `flatMap`, `map`, and `tap`; `Projection` adapts a named environment
record with `contramapEnvironment`; `Errors` injects two service error variants
into a domain variant with `mapError`; `Main` provides an environment with an
extra field.

Create `tests/fixtures/compiler/fx-surface/cases.json`, listing each case: `id`,
`kind` (`"accept"` or `"reject"`), the single file it adds, the file's source,
and for rejections the expected `file`, `line`, and message substring, plus the
`control` case id. Initial cases: `fx-multi-module`, `fx-extra-field`,
`fx-projection`, `fx-error-injection`, `fx-add-requirement` (accept);
`fx-apply-io`, `fx-apply-fx`, `fx-forge-fx`, `fx-forget-requirement`,
`fx-error-widening` (reject).

Create `tests/compiler-fixtures.test.mjs`. It:

1. asserts that `bun run --bun rescript --version` reports `12.3.1`;
2. creates one project with `mkdtempSync(join(tmpdir(), "refex-fixtures-"))`,
   copies the entries of `package.json` `files` into `node_modules/refex/`,
   symlinks `rescript` and `@rescript/runtime` from the repository's
   `node_modules`, and writes a consumer `rescript.json` with
   `dependencies: ["refex"]` and `+A` warnings as errors;
3. builds the base positive project and requires success (positive control
   for the harness itself);
4. for each case, writes its one file, builds, strips ANSI codes, and checks
   the outcome: accepts require exit 0 and no error block; rejects require a
   non-zero exit, exactly one "We've found a bug for you!" block, and the
   expected file, line, and message; then removes the file;
5. rebuilds the base project after all cases and requires success;
6. scans every accepted source for annotation-level casts (`Obj.magic`,
   `%identity`, `%raw`, `external`, and `:>` applied to a type mentioning a
   requirement row) and fails on any match;
7. unit-tests its matcher and scanner on captured strings: a wrong-file,
   wrong-message, and two-error output must each be rejected, and a seeded
   `Obj.magic` must be reported.

Give the suite an explicit 120-second budget, following the existing boundary
fixture's comment on Bun's default timeout. Add it to `make test`. Add the
fixture directory to the `rescript format` file lists in `fmt` and `check-fmt`
(`tests/fixtures/**/*.res tests/fixtures/**/*.resi`), and update
`tests/makefile-contracts.test.mjs` if it pins those recipes.

Extend `scripts/package-check.mjs`: the ReScript consumer copies the
`fx-surface` positive sources into its `consumer/` directory, builds them
against the installed archive, and executes `Main.res.mjs`, which must load
without error. The JavaScript consumer imports `refex/src/Fx.res.mjs` and
`refex/src/IO.res.mjs` and checks that `succeed`, `flatMap`, and `provide` are
functions. Run ablation A-10 and record it.

Acceptance: `bun test ./tests/compiler-fixtures.test.mjs` passes and its log
shows every case id; `make package-check` prints its verification line
including the multi-module consumer; `make all` passes. Commit: "Exercise the
Fx surface at separately compiled consumer boundaries".

### EP-M4: law-based property tests

Add `fast-check` at exactly `4.10.2` to `devDependencies` with
`bun add -d --exact fast-check@4.10.2`, and commit the textual `bun.lock`
change. Confirm the integrity in `bun.lock` matches
`sha512-iK2f+YrcmoeGqk6fA0ea2bptcu/itMIm4NfEozq6N25+aG6h7s5HZbB/k1aV7b5w5sFLMCbbtRUsTVR+BgC3xw==`.
Do not add it to `rescript.json`; it has no ReScript sources.

Create `tests/FastCheck.res`, a narrow binding module following the
`rescript-property-testing` skill's `FastCheck.res` example: `arbitrary`,
`property`, `integer` with constraints, `constantFrom`, `oneof`, `tuple2`,
`tuple3`, `map`, `chain`, `letrec` only if needed, `property1` to `property3`,
and `check` with `numRuns`, `seed`, and `path` parameters. No `'a` appears only
in a result position.

Create `tests/FxLaws.test.res`. Generate descriptions from a small test-side
syntax,
`type rec expr = Succeed({value: int}) | Fail({error: string}) |
Map({inner: expr, delta: int}) | FlatMap({inner: expr, next: int => expr}) |
Access({scale: int}) | MapError({inner: expr, suffix: string}) | Tap(…)`,
built only from production operations by a test-side `build` function. Bound
depth at 4. Use one closed environment record type, `{base: int}`, and pure
callbacks over `int` and `string`. Compare evaluated `result<int, string>`
values with a typed equality. Implement each law in OB-6 and OB-7 as one
property with `numRuns: 200`. Record classification counts (success, failure,
depth reached) and assert the thresholds in OB-6. Print the seed on failure;
fast-check reports `seed` and `path` for replay.

Add the suite to `make test` and `make coverage`. Run ablations A-3 and A-4
against the laws and record the counterexamples. Preserve any minimal
counterexample found during development as a named regression case in
`tests/Fx.test.res`.

Acceptance: every law passes at 200 runs; classification thresholds hold;
ablations produce counterexamples; `make all` and `make audit` pass. Commits:
"Add fast-check as an exact development dependency" and "Check the Fx laws on
generated descriptions".

### EP-M5: retire `Bootstrap`

Delete `src/Bootstrap.res`, `src/Bootstrap.resi`, `src/Bootstrap.res.mjs`, and
`tests/Bootstrap.test.res`. Remove `Bootstrap` from `public`, `files`,
`exports`, the contracts, the package-check allowlist and consumers, the
`Makefile` suite lists, and `tests/consumer.test.mjs`, which now imports
`refex/src/Fx.res.mjs` and `refex/src/IO.res.mjs` instead. Update the README
quick start. Add an amendment note to ADR 001 stating that task 1.2.1 replaced
the disposable module, as its consequences required.

Acceptance:
`rg -n "Bootstrap" --glob '!docs/execplans/**' --glob '!CHANGELOG.md'` finds
only the ADR 001 history and its amendment; `make all` passes. Commit: "Retire
the bootstrap probe module".

Recovery: revert this commit alone; EP-M1 to EP-M4 do not depend on it.

### EP-M6: documentation reconciliation and roadmap completion

Update, with `scribe` assistance for mechanical edits:

- `docs/users-guide.md`: the installable surface is now `IO` and `Fx` (and no
  longer `Bootstrap`); the package is still private and unpublished; there is
  no runner, so descriptions cannot yet be executed; opacity holds for ReScript
  consumers, while JavaScript consumers must treat the values as opaque; list
  the operations with one example of a two-service workflow and a projection.
- `docs/developers-guide.md`: the compiler-fixture runner and how to add a
  case with its positive control; the test-only evaluation binding and its
  1.3.1 replacement; the fast-check binding and replay with `seed` and `path`;
  the public-equals-src contract and the namespace-visibility finding; the
  ownership of each new helper, its permitted callers, and its reuse boundary
  (AGENTS.md).
- `docs/repository-layout.md`: rows for `src/IO.*`, `src/Fx.*`,
  `tests/IoEvaluation.res`, `tests/support/io-evaluation.mjs`,
  `tests/FastCheck.res`, `tests/fixtures/compiler/`, and the new suites.
- `docs/design.md`: in §3.2, record that task 1.2.1 implemented the listed
  operations and `contramapEnvironment` with the thunk reference
  representation, while §3.1's runtime claims (callback exceptions as defects,
  stack safety) remain 1.3.1's; in §2.2, record the namespace-visibility
  finding.
- `docs/adr-004-runtime-boundary.md`: an amendment note that absence from
  `public` does not hide a module from namespaced consumers in ReScript 12.3.1,
  so task 1.3.1's private adapter modules need `.resi` abstraction, and the
  public-equals-src contract must be revisited deliberately.
- `docs/adr-005-structural-dependency-environments.md`: an amendment note that
  `IO.t`'s declared variance is compiler-checked while its definition is
  concrete (`ns3`), and becomes trusted again only if 1.3.1 binds it abstractly.
- `docs/context.md`: update `C18` (fast-check entered at 1.2.1) and add `C19`
  if EP-M0 did not.
- `docs/contents.md`: link this plan and any new evidence section.
- `CHANGELOG.md`: under "Unreleased", add the opaque `IO` and `Fx`
  descriptions and the retirement of `Bootstrap`.
- `docs/roadmap.md`: mark task 1.2.1 and its sub-item `done` (`[x]`).

Reconcile every upstream artefact in `Conformance basis` against what was
built; record any mechanical deviation in `Decision log`. Set this plan's
status to `COMPLETE` only after `make all` passes and the documents agree.

Acceptance: `make all` passes; the roadmap shows 1.2.1 checked. Commit:
"Document the delivered Fx surface and complete roadmap task 1.2.1".

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
bun test ./tests/FxLaws.test.res.mjs
bun test ./tests/compiler-fixtures.test.mjs
```

Expected red output in EP-M1, abbreviated:

```plaintext
The module or file IO can't be found.
```

Expected green output, abbreviated:

```plaintext
 N pass
 0 fail
```

Before `make check-generated` or `make all`, stage production output:

```bash
git add src/IO.res src/IO.resi src/IO.res.mjs src/Fx.res src/Fx.resi src/Fx.res.mjs
```

Coverage and audit are run separately, as CI does, after `make all`.

## Validation and acceptance

The task is accepted when all of the following hold:

1. `make all` passes on the final commit; `make coverage` and `make audit`
   pass separately.
2. `make test` executes `tests/IO.test.res.mjs`, `tests/Fx.test.res.mjs`,
   `tests/FxLaws.test.res.mjs`, and `tests/compiler-fixtures.test.mjs`, and the
   Bun summary lists their tests; `tests/makefile-contracts.test.mjs` confirms
   the inventory.
3. Every positive fixture compiles without an annotation-level cast or
   backend type, and the packed-archive consumer builds and executes the
   multi-module workflow.
4. Every negative fixture fails with its intended file, line, and message,
   and its positive control compiles.
5. Every ablation in the `Verification plan` was observed to fail for its
   stated reason and was reverted, with results recorded.
6. No user callback runs during construction or `provide` (K-1, K-2).
7. Documentation distinguishes implemented (`IO`, `Fx` descriptions),
   consumer-exercised (fixtures, packed consumer), and not yet verified
   (execution, runtime, stack safety, defect classification) behaviour.
8. `docs/roadmap.md` marks 1.2.1 done.

## Idempotence and recovery

Every step is re-runnable. Fixture and package-check projects are created in
fresh temporary directories and removed in `finally` blocks. Generated output
is reproduced by `make build`; if `make check-generated` fails, rebuild and
stage the regenerated `.res.mjs` files rather than editing them. Each milestone
is one or two commits, so rollback is `git revert` of that milestone's commits.
Ablations happen in the working tree and are reverted before staging; verify
with `git diff --exit-code src/` before committing.

## Artefacts and notes

Planning probes, run on 2026-10-31 with ReScript 12.3.1 and Bun 1.4.2 in
`~/.cache/refex-probe-1-2-1/`, outside the repository:

- `ns1`: a library with `"public": ["Fx", "IO"]` and an extra module
  `FxKernel`; a consumer's `let leaked = Refex.FxKernel.evaluate(Main.io)`
  compiled, emitted
  `import * as FxKernel$Refex from "refex/src/FxKernel.res.mjs"`, and ran,
  printing `{"TAG":"Ok","_0":42}`.
- `ns2`: the same with the library copied, not symbolically linked, into
  `node_modules/refex`: same result. The un-namespaced `FxKernel.evaluate(...)`
  failed with "The module or file FxKernel can't be found."
- `ns3`: declaring `type t<+'a, 'e, +'r>` in `Fx.resi` over
  `'r => IO.t<'a, 'e>` failed: "Type declarations do not match … Their
  variances do not agree."
- `ns4`: with `IO.t` manifestly equal to a kernel type, applying it in a
  consumer failed with "This can't be called, it's not a function. The function
  has type: \"FxKernel-Refex".io<int, string>", leaking the kernel's name.
- `ns5`: the adopted layout (public `IO` with `succeed`, `fail`, `suspend`,
  `flatMap`, `mapError`; `Fx` over `IO.resi`) compiled a consumer with `Clock`,
  `Log`, `Workflow` (each with `.resi`) and `Main`, providing
  `{"clock", "log", "extra"}` with no cast. Applying the provided `IO.t` failed
  with "This can't be called, it's not a function." Forgetting a requirement by
  `:>` failed with "Type {"clock": int} is not a subtype of {"clock": int,
  "log": int}". Widening a closed polymorphic-variant error by `:>` failed with
  "The first polymorphic variant is closed and doesn't include the constructor:
  #B." Providing only `clock` failed at the argument with "The first object is
  expected to have a field "log" of type Log.service, but it does not."

The probe sources are reproduced in the EP-M0 evidence section. Ablation and
red-stage results are appended here during implementation.

## Interfaces and dependencies

`src/IO.resi`, complete. Each export carries a doc comment stating laziness.

```rescript
/** A lazy description of work that succeeds with `'a` or fails with the
expected error `'e`. Building one runs nothing. Task 1.2.1 provides no runner. */
type t<+'a, 'e>

let succeed: 'a => t<'a, 'e>
let fail: 'e => t<'a, 'e>
let suspend: (unit => t<'a, 'e>) => t<'a, 'e>
let flatMap: (t<'a, 'e>, 'a => t<'b, 'e>) => t<'b, 'e>
let mapError: (t<'a, 'e1>, 'e1 => 'e2) => t<'a, 'e2>
```

`src/IO.res` defines `type t<'a, 'e> = unit => result<'a, 'e>`; each operation
returns a thunk and calls no argument callback until the thunk runs.

`src/Fx.resi`, complete:

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
```

Dependencies: no new runtime dependency. One new development dependency,
`fast-check` 4.10.2, used only from `tests/`. No change to `rescript.json`
`dependencies` or `dev-dependencies`.

## Revision note

2026-10-31: initial draft, written from Wyvern reconnaissance, the planning
probes `ns1` to `ns5`, and the documents in `Conformance basis`. Awaiting
expert-panel review and owner approval.
