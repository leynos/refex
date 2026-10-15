# Freeze the hypotheses that refex's validators must test (roadmap 1.1)

This ExecPlan (execution plan) is a living document. The sections `Constraints`,
`Tolerances (exception triggers)`, `Risks`, `Progress`,
`Surprises & discoveries`, `Decision log`, `Outcomes & retrospective`,
`Conformance basis`, and `Verification plan` must be kept up to date as work
proceeds.

Status: DRAFT

Plan identifier: `EP-1.1`. Branch: `1-1-freeze-validator-hypotheses`. Roadmap
step:
[1.1](../roadmap.md#11-freeze-the-hypotheses-that-the-validators-must-test),
tasks 1.1.1 to 1.1.5.

## Purpose / big picture

refex is an experimental ReScript library for lazy computations, typed
requirements, complete failures, and accountable resource ownership. Today the
repository contains only a disposable bootstrap module (`src/Bootstrap.res`)
and a long draft design. Roadmap step 1.1 asks a narrower question before any
semantic code exists: which promises can the library defend, and what evidence
would reject each one?

After this plan is delivered, a reader of the repository can do four things
that are not possible today:

1. Open one concise design brief (`docs/design-brief.md`) and see every public
   abstraction refex intends to offer (`Fx`, `Layer`, resources, fibres,
   schedules, deterministic time, React ownership, and schema-backed codecs),
   every deferred capability, and a capability map in which each validator need
   (Minesweeper, the nine-room roguelike, and the css-view reimplementation)
   points to a named contract or a delegated library. Every row states whether
   it is proposed, delegated, deferred, or implemented, so specification is
   never mistaken for delivery.
2. Read four new architectural decision records (ADRs) that freeze the
   initial hypotheses. ADR 004 sets the runtime boundary and authorizes a
   bounded backend trial. ADR 005 sets structural dependency environments, ADR
   006 sets complete failure outcomes, and ADR 007 is the behavioural contract
   for shared work, closure, and recovery. Each ADR states what would falsify
   it and which roadmap task gathers that evidence.
3. Reproduce the evidence behind those decisions from evidence records under
   `docs/evidence/`. These hold audit probes of the candidate Effect backends,
   scratch compiler probes for requirement rows and the uninhabited error
   channel, and a bounded feasibility experiment for machine-checked proof of
   the lifecycle transition function. Each record shows its commands, pins,
   observations, and negative controls.
4. See, in a verification matrix, which later milestone discharges each
   contract and by which method: compiler fixtures, behavioural tests, property
   tests, bounded exhaustive enumeration, or deductive proof. Proved, tested,
   and merely specified claims stay separate.

Success is observable. `make all` passes on the branch. The new
documentation-contract suite rejects an ADR that is missing from
`docs/contents.md` or carries an unknown status. Every probe transcript in
`docs/evidence/` can be reproduced from its recorded commands. Roadmap tasks
1.1.1 to 1.1.5 are ticked only after the repository owner has accepted the ADRs
in review.

This step changes no runtime behaviour, installs no runtime dependency, and
exposes no new public module. It is a documentation and evidence step that also
adds one small repository-contract test.

## Constraints

These are hard invariants. Violating one requires escalation, not a workaround.

- C-1. Preserve the single root package, the portable core (`src/` imports no
  Bun, React, Node, browser, or other platform API), explicit `.resi`
  interfaces, the pinned ReScript 12.3.1 and Bun 1.4.2 toolchain, the
  generated-output policy, and accepted ADRs 001 to 003. A new ADR may propose
  a conditional, explicitly named change to ADR 002's dependency rule. It must
  not silently supersede it, and ADR 002's text changes only after the owner
  accepts that change.
- C-2. Install no package into `package.json` or `bun.lock` in this step.
  This includes `effect`, `@reventlessdev/rescript-effect`, `fast-check`,
  `lemmascript`, `typescript`, and `bignumber.js`. Audit and feasibility probes
  run in scratch directories outside the repository, with their own throwaway
  `package.json`. Installation of an authorized backend is roadmap task 1.3.1's
  work, under ADR 004.
- C-3. Add no production ReScript module, no `.resi`, no public-module
  allowlist entry, and no change to `package.json` `files` or `exports`.
  `src/Bootstrap.*` stays as it is.
- C-4. Add no proof, model-checking, or property-testing infrastructure to
  the repository (no `tools/verification/`, no `make prove`, no bridge scripts).
  `docs/developers-guide.md` states that no formal proof infrastructure
  belongs in the bootstrap. This step may select proof obligations and run a
  scratch feasibility experiment. Committed proof infrastructure waits for the
  implementation milestone that has real code to prove, and needs its own plan
  approval.
- C-5. Do not import a Rust package structure, a reserved Lean boundary,
  another project's assurance profile, Lody's service classes or migration
  ledger, or a general supervisor framework.
- C-6. Keep the distinction between specified, implemented,
  consumer-exercised, and interpreter/platform-verified behaviour. Lody's
  probes, upstream documentation, and the planning-time probes recorded below
  are source evidence. They are not refex conformance results.
- C-7. Do not renumber sections of `docs/design.md`, `docs/context.md`,
  `docs/terms-of-reference.md`, or `docs/roadmap.md`. Many documents cite them
  by section number. Add new material as new subsections, appendices, or
  separate documents.
- C-8. Follow `AGENTS.md`: en-GB Oxford spelling, 80-column prose, 120-column
  code blocks, sentence-case headings, dash bullets, language-labelled fences,
  `make all` before each commit, atomic commits with imperative subjects and
  reasons in the body, and no hand edits to `typos.toml` or compiler output.
- C-9. Never publish, release, or merge. Opening and updating the draft pull
  request is permitted.
- C-10. Do not change roadmap checkboxes, ADR status lines, or the
  `docs/contents.md` sentence about unchecked tasks until the repository owner
  has accepted the corresponding ADRs in review. Record that acceptance, with a
  link to the review comment, in `Decision log`.

## Tolerances (exception triggers)

- Scope: if delivery needs more than 22 changed files or more than 2,600
  net changed lines (documentation included), stop and escalate. The expected
  footprint is 15 to 18 files and roughly 1,800 lines.
- Code: if the documentation-contract test and its helper exceed 120 lines,
  or any non-documentation file other than `Makefile` and the new test file
  must change, stop and escalate.
- Interface: if any step appears to need a public module, export, `.resi`, or
  runtime dependency, stop. That belongs to roadmap step 1.2 or 1.3.
- Dependencies: if a probe cannot run without adding a package to the
  repository manifest, stop and escalate. Do not add it.
- Evidence contradiction: if an audit probe or compiler probe contradicts a
  claim in `docs/design.md`, `docs/terms-of-reference.md`, or
  `docs/context.md`, record a deviation in `Decision log`. Set this plan to
  `BLOCKED` when the contradiction changes a goal, an assumption (A1 to A6), or
  an accepted ADR. Otherwise record the correction in the ADR and carry on.
- Feasibility experiment: if FX-1 (see `Verification plan`) has not reached
  a verdict after one working day of effort or 25 prover runs, stop. Record the
  verdict as inconclusive, keep the proof gate open, and continue the
  documentation milestones.
- Gate iterations: if `make all` still fails after three fix attempts on the
  same gate, stop and escalate with the failing log path.
- Ambiguity: if the owner's review comments conflict with a roadmap success
  criterion, present the options and wait.

## Risks

- R-1. The ADRs may restate `docs/design.md` instead of deciding anything.
  Severity: high. Likelihood: medium. Mitigation: each ADR must contain a
  one-sentence Y-statement decision (context, concern, decision, rejected
  alternatives, quality goal, accepted downside) and at least one named
  falsifier tied to a roadmap task. Reviewers reject ADRs that lack either.
- R-2. The backend landscape is moving quickly. Effect 4.0.0 shipped on
  1 October 2026 and 4.0.5 on 15 October 2026. The audited
  `@reventlessdev/rescript-effect` 0.1.0-alpha.35 binds Effect 3.22.2, while
  Lody's evidence concerns Effect 4.0.2. Severity: high. Likelihood: high.
  Mitigation: ADR 004 pins one exact version with its registry integrity hash.
  It records that the probes apply only to that version, and it requires the
  probes and E1 to E3 and E9 to be rerun on any upgrade.
- R-3. ReScript object rows or variance annotations may behave differently
  in real modules than in scratch probes. Severity: medium. Likelihood: medium.
  Mitigation: ADR 005 states its falsifier precisely. Committed fixtures are
  roadmap 1.2.2's acceptance, so the probes here only make the falsifier
  non-vacuous.
- R-4. The deductive-verification toolchain (LemmaScript 0.6.4 with Dafny
  4.11.0 and Z3 4.12.1) is a technology preview with known gaps. It does not
  support constant constructors without payload, `result` in contracted
  signatures, loops, `ref`, division, `list`, or promises. Severity: medium.
  Likelihood: high. Mitigation: FX-1 tests the exact representation that ADR
  007 proposes before any gate depends on it, with an explicit
  accept/revise/reject rule.
- R-5. The local Bun (1.3.14) cannot read the repository's Bun 1.4.2
  lockfile. Severity: medium. Likelihood: certain on this host. Mitigation: a
  checksum-verified Bun 1.4.2 was unpacked during planning into
  `$HOME/.local/share/bun-versions/1.4.2/bin`. Prepend it to `PATH` for every
  command and never replace the global Bun.
- R-6. ADR status vocabulary may confuse readers about what is decided.
  Severity: medium. Likelihood: medium. Mitigation: define the vocabulary in
  `docs/developers-guide.md` and enforce it with the documentation-contract
  test.
- R-7. Documentation volume may exceed what reviewers will read. Severity:
  medium. Likelihood: medium. Mitigation: ADRs stay under about 200 lines each.
  Probe transcripts live in evidence records, and the design brief stays under
  about 220 lines.
- R-8. Effect 4.0.5 declares a schema JIT compiler entry as having side
  effects (`./dist/schema/SchemaJITCompiler/enable.js`), which suggests dynamic
  code generation. Severity: medium for browser content-security-policy
  deployments. Likelihood: unknown. Mitigation: the ADR 004 audit records
  whether the adapter's import graph reaches it, and records `unsafe-eval`
  exposure as an open browser-policy question beside D4.

## Progress

- [x] (2026-10-15 19:40Z) Renamed branch `session/4c10984f` to
  `1-1-freeze-validator-hypotheses`. The remote branch did not exist; upstream
  is set on first push.
- [x] (2026-10-15 19:45Z) Reconnaissance with a Wyvern team: gates and test
  selection; ADR and guide conventions; terms of reference and context;
  verification and ReScript skill guidance.
- [x] (2026-10-15 20:05Z) Registry and source research: Effect,
  `@reventlessdev/rescript-effect`, Primavera, fast-check, rescript-schema,
  Sury, and LemmaScript metadata. Archive inspection of the Reventless bindings.
- [x] (2026-10-15 20:25Z) Planning-time scratch compiler probes for open
  object rows and the uninhabited channel (see `Artefacts and notes`).
- [x] (2026-10-15 20:40Z) First complete ExecPlan draft.
- [ ] Community-of-experts design review of the draft, and revision.
- [ ] Draft pull request opened for plan review.
- [ ] Owner approval of this plan (implementation must not start before it).
- [ ] EP-M0: baseline gates green on the branch with Bun 1.4.2.
- [ ] EP-M1: documentation-contract test for the ADR index and status
  vocabulary.
- [ ] EP-M2: design brief, glossary additions, and capability map (1.1.1).
- [ ] EP-M3: runtime-boundary audit evidence and ADR 004 (1.1.2).
- [ ] EP-M4: structural-environment probes and ADR 005 (1.1.3).
- [ ] EP-M5: complete-outcome probes and ADR 006 (1.1.4).
- [ ] EP-M6: ADR 007 behavioural contract with proof sketch (1.1.5).
- [ ] EP-M7: FX-1 verification feasibility experiment and ADR 007
  representation update.
- [ ] EP-M8: cross-document integration and owner acceptance.
- [ ] EP-M9: roadmap ticks, ADR status lines, and final gates.

## Surprises & discoveries

- Observation: `@reventlessdev/rescript-effect` 0.1.0-alpha.35, the latest
  version, binds Effect 3.22.2 exactly, not Effect 4. It also declares
  `@reventlessdev/rescript-jest` 1.0.0-alpha.12, a test-binding package with a
  `jest` peer, as a production dependency. Evidence: registry metadata fetched
  on 15 October 2026, integrity
  `sha512-uQwy1nAzYG/i9N0YQicIr+2JiijsO9ACfAqMyRHlI1vtj6HXd/SlULo+vPnMHA6YmjRggbyhvamjtHH0PZWsdQ==`.
  Impact: adopting it would put a test framework into refex's production
  dependency graph. Its semantics would also differ from the Effect 4.0.2
  behaviour that Lody documents. ADR 004 must weigh both.
- Observation: the alpha.35 bindings contain signatures that erase or invent
  types. `either: t<'a,'e,'r> => t<result<'a,'e>,'e2,'r>` invents an unrelated
  error type. `scoped: t<'a,'e,'r> => t<'a,'e,'r2>` invents an unrelated
  requirement. `provide: (t<'a,'e,'r>, 'layer) => t<'a,'e,unit>` leaves the
  layer untyped. `runPromise` accepts any `'r`, and `Fiber.interrupt` returns
  an unconstrained `'e2`. The package has no `Scope`, `FiberMap`, or
  managed-runtime module and does not bind `mapError`. `tagAsEffect` uses
  `%identity`. Evidence: `grep` over the unpacked archive's `src/Effect.res`,
  `src/Fiber.res`, and `src/Layer.res`. Impact: task 1.1.4 forbids "casts an
  unrelated error type", which these signatures do, so the comparison in ADR
  004 has concrete counterexamples to cite.
- Observation: ReScript 12.3.1 does not parse an empty variant
  (`type never = |`). An abstract `.resi` type implemented as
  `type t = {absurd: 'a. 'a}`, with `let absurd: t => 'a`, compiles under `+A`
  warnings-as-errors. It rejects `Error(())` for `result<int, Never.t>`, and it
  rejects construction outside its module. Evidence: scratch probe transcript in
  `Artefacts and notes`. Impact: ADR 006 has a compiler-checked candidate for
  the "genuinely uninhabited" channel that needs no unsafe cast.
- Observation: open object rows accumulate across separately compiled
  `.resi` boundaries when accessors are exported as functions
  (`unit => Fx.t<_, _, {.."clock": Clock.service}>`). A missing capability is
  rejected at the `provide` call with the message
  `The first object is expected to have a field "log"`. An accessor exported as
  a non-function value fails interface inclusion with a weak row
  (`{_.."clock": service}`), because the requirement parameter is contravariant
  and the relaxed value restriction cannot generalize it. Evidence: scratch
  probe transcript in `Artefacts and notes`. Impact: ADR 005 can name the
  "separate-module failure" precisely. Accessors must be functions, and the
  falsifier is about composition rather than export shape.
- Observation: `tests/support/repository-contracts.mjs` is already 428
  lines, above the 400-line limit for authored files. Impact: the new
  documentation contract keeps its helper private to a new suite instead of
  growing the shared support file.
- Observation: Effect 4.0.5 has no runtime dependencies but unpacks to
  51 MB. Its `sideEffects` list names a schema JIT compiler entry. Impact: see
  R-8. Bundle measurement belongs to 1.3.1 and E8.

## Decision log

- Decision: deliver task 1.1.1's design brief as a new document,
  `docs/design-brief.md`, linked from `docs/design.md` §1, rather than as a new
  section inside `docs/design.md`. Rationale: the roadmap asks for a *concise*
  brief, and `docs/design.md` is already 842 lines. Inserting a section would
  renumber sections that other documents cite (C-7). The brief defines and
  maps; it does not restate mechanisms, and it links to the owning design
  sections and ADRs. Date/Author: 2026-10-15, planning agent.
- Decision: number the new ADRs 004 (runtime boundary), 005 (structural
  dependency environments), 006 (complete outcomes), and 007 (shared work,
  closure, and recovery contract). They follow the existing
  `docs/adr-NNN-kebab-title.md` pattern and Context, Decision, Consequences
  spine. Each adds a Y-statement and a "Falsifiers and evidence" section.
  Rationale: this matches existing conventions and adds the two parts the
  roadmap success criteria need. Date/Author: 2026-10-15, planning agent.
- Decision: introduce the ADR status vocabulary `accepted for bootstrap`
  (existing), `proposed`, `provisional`, `candidate`, `accepted`, and
  `superseded by ADR NNN`. New ADRs are written as `proposed`. On owner
  acceptance, ADR 004 becomes `provisional: authorizes a bounded trial`, ADR
  005 and ADR 006 become `accepted`, and ADR 007 becomes `candidate` (the
  roadmap's term) until E9 evidence exists. Rationale: the status line is the
  cheapest place to keep "decided" and "evidenced" apart. Date/Author:
  2026-10-15, planning agent.
- Decision: keep audit and probe sources inside Markdown evidence records
  under `docs/evidence/`, reproducible from an empty scratch directory, rather
  than committing executable probe scripts. Rationale: committed scripts would
  need dependencies (C-2), linting, and a runner. They would also look like
  conformance tests, which they are not (C-6). Date/Author: 2026-10-15,
  planning agent.
- Decision: select two contract families as candidates for machine-checked
  proof. The first is the per-generation lifecycle transition function (ADR
  007). The second is the leaf-wise error mapping and conservative result
  conversion over a refex-owned cause tree (ADR 006). Everything else gets
  compiler fixtures, behavioural tests, property tests, or bounded enumeration.
  Rationale: these are pure, contractual, and costly when wrong (ownership,
  terminal states, lost failures), which is where the `rescript-router`
  hierarchy says proof earns its cost. Scheduling, cancellation, timers, and
  promise settlement stay in conformance tests. Date/Author: 2026-10-15,
  planning agent.
- Decision: run the verification feasibility experiment FX-1 in this step,
  in a scratch directory, with no repository infrastructure. Rationale: ADR
  007's representation guidance (pure reducer, payload records on every
  constructor, bounded counters, no `result` in contracted signatures) is
  architecture. It must be tested before 1.3.3 builds on it. Committing the
  toolchain now would violate C-4. Date/Author: 2026-10-15, planning agent.
- Decision: add one documentation-contract suite,
  `tests/documentation-contracts.test.mjs`. It asserts that every
  `docs/adr-*.md` file is linked from `docs/contents.md` and declares a status
  from the vocabulary above, with negative controls. Rationale: the 1.1.1
  success criterion is that proposed and implemented status stay distinct, and
  an ADR status line is where that distinction most easily erodes. The check is
  small, deterministic, and owned by one suite. Reviewers may ask to drop it;
  that is a scope reduction, not a deviation. Date/Author: 2026-10-15, planning
  agent.
- Decision: interpret "mark the relevant roadmap entry as done" as ticking
  1.1.1 to 1.1.5 and their sub-boxes, after owner acceptance. Amend the
  roadmap's sentence "All boxes remain unchecked" so that a ticked
  specification task does not read as an implemented or verified contract.
  Rationale: the 1.1 tasks are "record an ADR" and "add a brief", so the
  recorded document is the deliverable. Date/Author: 2026-10-15, planning agent.
- Decision: no Verus milestone. Rationale: Verus verifies Rust; refex is
  ReScript. The equivalent proof gate is the LemmaScript and Dafny route
  evaluated by FX-1. Date/Author: 2026-10-15, planning agent.

## Outcomes & retrospective

Not yet started. Complete at each milestone boundary and before setting the
status to `COMPLETE`.

## Context and orientation

### Repository state

The repository root contains one private package, `refex` version 0.0.0
(`package.json`). Its only production dependency is `@rescript/runtime` 12.3.1,
and its development dependencies are ReScript 12.3.1, rescript-bun 2.1.0, Biome
2.5.15, markdownlint-cli 0.49.1, and yaml 2.9.1, all pinned exactly.
`rescript.json` declares `src` (public module allowlist `["Bootstrap"]`) and
`tests` (a development source), in-source ES modules with suffix `.res.mjs`,
and warnings `+A` as errors. The only production code is `src/Bootstrap.res`,
`src/Bootstrap.resi`, and the committed compiler output
`src/Bootstrap.res.mjs`, a disposable identity function.

The `Makefile` owns all gates. `make all` runs, in order, `check-fmt`,
`check-generated`, `lint`, `test`, `docs-check`, `spelling`, and
`package-check`. `make test` builds and then runs an explicit list of test files
(`Makefile`, target `test`). A new test file is not discovered automatically
and must be added to that list. `make coverage` and `make audit` run
separately. Markdown is checked by `mdtablefix` 0.6.1 and markdownlint with
`.markdownlint.jsonc`. New Markdown files are picked up automatically. Spelling
is checked by the pinned `typos-config-builder` gate (`make spelling`) over
tracked Markdown, so stage new files before running it.
`scripts/check-generated.mjs` compares compiler output under `src` against the
Git *index*, so stage generated output before checking. This step produces no
compiler output.

### Documents and their authority

- `docs/terms-of-reference.md` (draft v0.2, 12 October 2026) owns problem,
  goals G1 to G6, assumptions A1 to A6, non-goals, success criteria, and open
  questions Q1 to Q7.
- `docs/design.md` (draft v0.2) owns mechanisms (§§2 to 9), experiments E1 to
  E9 (§10), and open decisions D1 to D10 (§12). Relevant sections: §1 (intent),
  §2.2 to §2.4 (bootstrap compatibility, backend selection, behaviour before
  primitives), §3.2 (requirements and observation timing), §4 (complete
  outcomes), §5 (resources, joined closure, generations, layers), §6 (execution
  and cancellation), §10.4 (E9 scenario table), and §12.
- `docs/context.md` owns vocabulary (§2), evidence labels (§1: Established,
  Proposed, Unvalidated, Deferred, Open), the source register (§7, entries `C1`
  to `C12`), and the Lody learning crosswalk (§8).
- `docs/roadmap.md` owns tasks. Step 1.1 is this plan. Steps 1.2 to 1.4
  consume its outputs: 1.2.1 implements the opaque `Fx` surface, 1.2.2 and
  1.2.3 add compiler fixtures, 1.3.1 implements the audited runtime adapter,
  1.3.3 and 1.3.4 implement scoped closure and the two-consumer producer, and
  1.3.5 runs the E9 conformance matrix.
- ADR 001 (`docs/adr-001-repository-bootstrap.md`) fixes reproducible
  baselines and generated-output policy. ADR 002
  (`docs/adr-002-portable-core-and-bun-boundary.md`) says "Only the matching
  `@rescript/runtime` package is a runtime dependency" and that adapters own
  platform calls. ADR 003 fixes formatting and analysis policy. All three have
  the status line `Status: accepted for bootstrap. Date: 7 October 2026.`
- `docs/users-guide.md` describes only what is installable today.
  `docs/developers-guide.md` documents gates and conventions, and says "No
  effect model, compatibility promise, release workflow, benchmarks, mutation
  testing, or formal proof infrastructure belongs in the bootstrap."
  `docs/repository-layout.md` maps paths to owners, and `docs/contents.md`
  indexes all documents.

### Terms used in this plan

- ADR: architectural decision record, a short document recording one
  decision, its context, alternatives, and consequences.
- Y-statement: a one-sentence ADR summary of the form "In the context of X,
  facing Y, we decided for Z and against W, to achieve Q, accepting D."
- Falsifier: an observable outcome that, if seen, rejects a hypothesis.
- Probe: a small scratch program run outside the repository to observe a
  tool's or library's actual behaviour. Probe results are source evidence, not
  refex conformance evidence.
- Evidence record: a Markdown file under `docs/evidence/` with the fields
  required by `docs/design.md` §10 (claim, pins, readiness event, seeds,
  command, observations, resulting state, negative control, limits, decision).
- Capability object: a ReScript structural object type such as
  `{.."clock": Clock.service}`. The `..` makes the row *open*, so a value with
  additional fields is accepted. This is the ReScript analogue of Primavera's
  OCaml object-based dependency injection.
- Explicit projection: a function from a larger environment to a smaller
  one (`contramapEnvironment` in `docs/design.md` §3.2), used instead of
  relying on row inference.
- Uninhabited type: a type with no values. Using it as the expected-error
  type states that a computation cannot fail with an expected error.
- Cause: refex's proposed complete failure value, holding expected failures,
  defects, interruptions, and release issues with their sequential and parallel
  structure.
- Generation, attempt, receipt, owner, lease, quiescence: as defined in
  `docs/context.md` §2. A generation is one resource incarnation. An attempt is
  one execution of cleanup. A receipt confirms a named release predicate for
  one generation. An owner is the live party accountable for unresolved work. A
  lease is one consumer's recorded interest.
- Reducer (or step function): a pure function
  `step(state, event) => outcome`, where the outcome holds a next state and a
  list of commands for an effectful shell to perform.
- Shell: the effectful code that performs a reducer's commands (starting
  cleanup, scheduling timers, answering waiters) and feeds results back as
  events.
- LemmaScript route: the `rescript-deductive-verification` skill's pipeline.
  It runs ReScript, then compiled JavaScript plus genType types, a bridge into
  a TypeScript unit, LemmaScript, Dafny, and Z3, and adds a correspondence
  audit against the production `.res.mjs`, a mutation catalogue, and a
  differential translation check.

### Skills and guidance to load

The implementer must load `execplans` (to maintain this plan),
`rescript-router`, and the follow-on skills it names:
`rescript-types-and-modules` (rows, abstract types, variance),
`rescript-errors-and-results` (outcome design), `rescript-interop` (FFI
boundary rules for ADR 004), `rescript-async` (promise boundaries),
`rescript-bun-testing` (test registration), `rescript-property-testing` and
`fast-check` (forward test planning), and `rescript-deductive-verification` with
`lemmascript` (FX-1). Also load `arch-decision-records` (Y-statement format),
`en-gb-oxendict-style` (prose), `firecrawl-mcp` (all web research), and
`codegraph-mcp` (structural code queries, mostly unnecessary in a documentation
step). Use `logisphere-design-review` for the ADR review panel in EP-M8.

## Conformance basis

Upstream artefacts at commit `acee07067e92656672f571feec08a33331279cab`: terms
of reference draft v0.2, technical design draft v0.2, context draft v0.2, and
the GIST roadmap, all last revised 12 October 2026. ADRs 001 to 003 are
accepted for bootstrap. No separate requirement-identifier scheme exists beyond
goals `G1` to `G6`, assumptions `A1` to `A6`, questions `Q1` to `Q7`, decisions
`D1` to `D10`, experiments `E1` to `E9`, sources `C1` to `C12`, and roadmap
task numbers. This plan uses those identifiers and invents no new upstream
identifiers.

Trace chains (upstream, then design element, then milestone, then acceptance
evidence):

```plaintext
G1, G4, A2 -> design §§1-3, roadmap 1.1.1 -> EP-M2 -> docs/design-brief.md capability map review (EV-BRIEF)
G2, G3, G6, A3, D1 -> design §§2.2-2.3 -> roadmap 1.1.2 -> EP-M3 -> ADR 004 + docs/evidence/runtime-boundary-audit.md
G1, G4, A2, D2 -> design §3.2 -> roadmap 1.1.3 -> EP-M4 -> ADR 005 + docs/evidence/structural-environment-probes.md
G2, D8 -> design §4 -> roadmap 1.1.4 -> EP-M5 -> ADR 006 + docs/evidence/complete-outcome-probes.md
G3, A6, Q6, Q7, D9, D10 -> design §§2.4, 5-6 -> roadmap 1.1.5 -> EP-M6, EP-M7
  -> ADR 007 + docs/evidence/verification-feasibility.md
G6 (status separation) -> design §§10-11 -> EP-M1 -> tests/documentation-contracts.test.mjs
```

Downstream consumers that each ADR must name explicitly: ADR 004 governs 1.3.1
and its installation; ADR 005 governs 1.2.1 and 1.2.2; ADR 006 governs 1.2.3
and 1.3.1; ADR 007 governs 1.3.2 to 1.3.5, and its representation guidance
governs whichever task first implements the lifecycle reducer (1.3.3).

## Verification plan

### What this step verifies, and what it only plans

This step ships documents, evidence records, and one repository-contract suite.
It ships no refex semantics, so no refex implementation claim can be verified
here. The plan therefore does three different things, and they must not be
confused:

1. Verify the artefacts this step does ship. These are the documentation
   contract (VP-1), the completeness of the capability map (VP-2), and the
   reproducibility and non-vacuity of every probe (VP-3 to VP-5).
2. Run one bounded tool-feasibility experiment (FX-1). It establishes
   whether the representation ADR 007 proposes can be machine-checked by the
   LemmaScript route. FX-1 proves nothing about refex. It is evidence about a
   tool on a disposable example.
3. State, for each substantive contract the ADRs introduce, the abstract
   model, invariants, lemma statements, method, and milestone that must
   discharge it. These are unproved theorem statements and test obligations.
   They must appear in ADR 007 and ADR 006 marked as *specified, unverified*,
   never as completed proofs.

### Obligations discharged in this step

VP-1, ADR index and status contract.

- Obligation: every file matching `docs/adr-[0-9][0-9][0-9]-*.md` is linked
  from `docs/contents.md`. Its first non-heading line begins with the `Status:`
  label, followed by one of: `accepted for bootstrap`, `proposed`,
  `provisional`, `candidate`, `accepted`, or `superseded by ADR NNN`.
- Method: deterministic contract test with table-driven negative controls,
  following the existing pattern in `tests/markdown-contracts.test.mjs`.
- Artefact: `tests/documentation-contracts.test.mjs`, with a helper
  `adrIndexContract(contentsMarkdown, adrFiles)` private to the suite.
  `adrFiles` is an array of `{path, text}`.
- Evidence: `make test` lists the suite and passes. Red step: before
  `docs/contents.md` lists ADR 004, a temporary ADR 004 stub without a contents
  link makes the suite fail with a message naming `docs/adr-004-...md`. Remove
  the stub after observing the failure.
- Non-vacuity: the positive control runs against the real repository, which
  has at least three ADRs (the test asserts that `adrFiles.length >= 3`, so an
  empty glob fails). Negative controls must each throw: an ADR missing from
  contents, a status of `accepted-ish`, a missing status line, and a contents
  link to a non-existent ADR.

VP-2, capability map completeness (task 1.1.1 success criterion).

- Obligation: every validator capability named in `docs/design.md` §§9.1 to
  9.3, and in roadmap phases 2 to 4, appears in the brief's capability map.
  Each row names a contract (a design section or ADR) or a delegated library
  (React, rescript-schema, Playwright, the platform), and carries exactly one
  status from Proposed, Delegated, Deferred, Open, or Implemented. Only
  `Bootstrap.identity`-level facts may be Implemented, so no row may claim it
  today.
- Method: structured review. One reviewer sub-agent extracts the capability
  list independently from design §9 and roadmap phases 2 to 4, without seeing
  the brief. The implementer then diffs that list against the map.
- Artefact: `docs/design-brief.md` §"Validator capability map", and an
  evidence note `EV-BRIEF` recorded in this plan's `Artefacts and notes`.
- Evidence: zero unmatched capabilities, or each unmatched one recorded as a
  deliberate exclusion with a reason.
- Non-vacuity: the independent extraction must find at least the 30
  capabilities enumerated in the brief skeleton (see
  `Interfaces and dependencies`), so it cannot pass by extracting nothing. Seed
  one deliberately omitted row (for example "CDP request correlation") in a
  scratch copy and confirm the diff reports it.

VP-3, runtime-boundary audit probes (task 1.1.2).

- Obligation: for each audited behaviour, the evidence record states what
  the pinned backend version actually does, with a probe whose negative control
  shows that it can observe the opposite outcome. The behaviours are P1 lazy
  provision, P2 mixed-cause `mapError`, P3 repeated scope close, P4 keyed
  replacement and finalizer joining, P5 `runPromise` rejection projection versus
  `runPromiseExit`, and P6 interruption of a promise that ignores its abort
  signal.
- Method: executable scratch probes in an empty directory, under Bun 1.4.2,
  against exactly pinned `effect`. Probes P2 to P5 also run against the version
  the Reventless bindings pin (3.22.2), to show whether the two candidates
  differ semantically.
- Artefact: `docs/evidence/runtime-boundary-audit.md`, containing each probe
  source, the exact install and run commands, and the transcript.
- Evidence: each probe prints a single JSON line of observations, with
  decision labels `preserved`, `lost`, `joined`, `re-ran`, `awaited`,
  `not-awaited`, `squashed`, or `full`.
- Non-vacuity: each probe has a control variant. P2's control runs the same
  acquisition-failure and release-defect program without `mapError` and must
  observe both reasons, so a "lost" verdict cannot come from a probe that never
  created the defect. P3's control counts finalizer entries on the first close
  and must see exactly one. P6's control uses a promise that honours abort and
  must observe raw-work settlement, which the ignoring variant must not.

VP-4, structural-environment probes (task 1.1.3).

- Obligation: the ADR 005 falsifier is well-formed and observable with the
  pinned compiler. Positive: accessors from two separately compiled modules
  compose through `.resi` interfaces into one open row, and an environment with
  an extra field is accepted. Negative: a missing field, a conflicting field
  type, and a non-function accessor export each fail for the intended reason.
- Method: scratch ReScript 12.3.1 project outside the repository, built with
  the repository's own `node_modules/.bin/rescript`.
- Artefact: `docs/evidence/structural-environment-probes.md`, with every
  source file and each diagnostic's key line.
- Evidence and non-vacuity: each negative case's diagnostic must name the
  intended field or the weak row. An unrelated syntax error or missing-module
  error counts as a failed probe, not as enforcement. Each negative case is
  paired with the positive control from which it differs by one edit.

VP-5, complete-outcome probes (task 1.1.4).

- Obligation: the chosen uninhabited channel compiles under `+A`. It rejects
  `unit` and any constructed value outside its module, and it supports a total
  `absurd` elimination. The conservative result signature
  `Fx<A,E,R> => Fx<result<A,E>,E,R>` type-checks against the toy `Fx`, and the
  unsound variant (`'e2` free in the result's error channel) is shown to admit
  an unrelated error type. The second point is the counterexample ADR 006 cites.
- Method, artefact, evidence, and non-vacuity: as for VP-4, recorded in
  `docs/evidence/complete-outcome-probes.md`.

FX-1, verification feasibility experiment (prototyping, for ADR 007 and ADR
006).

- Question: can the LemmaScript route verify, against the compiler's own
  JavaScript, three things? (a) A step function shaped as ADR 007 proposes must
  preserve the well-formedness invariant and meet exact-effect clauses. (b) A
  trace-level join property must hold over a recursive fold of events. (c)
  Leaf-wise mapping over a recursive cause tree must preserve shape.
- Toolchain pins: ReScript 12.3.1 with genType; LemmaScript 0.6.4,
  installed exactly in the scratch directory's own lockfile; Dafny 4.11.0
  (present at `/home/leynos/.local/bin/dafny`, version
  `4.11.0+fcb2042d6d043a2634f0854338c08feeaaaf4ae2`); Z3 4.12.1 (not currently
  on `PATH`, so install a release binary into a scratch prefix and record its
  SHA-256); TypeScript and `bignumber.js` pinned exactly as the skill's
  `tools/verification/package.json` example prescribes; Bun 1.4.2.
- Toy subject (scratch only, never committed): `Lifecycle.res`, a step
  function over one generation, and `CauseTree.res`, a recursive tree with
  `mapExpected`. Use the representation rules in ADR 007's draft. Every variant
  constructor carries a record payload. Counters are `int` with an explicit
  `maxAttempt` bound. Contracted signatures use a custom outcome variant
  instead of `result`. There are no loops, `ref`, division, `list`, or `Map`.
- Commands (from the scratch directory, after copying the skill's
  `res2ls-bridge.mjs`, `res2ls-correspond.mjs`, and `res2ls-mutate.mjs` from
  `$HOME/.claude/skills/rescript-deductive-verification/references/examples/`):

  ```sh
  export PATH="$HOME/.local/share/bun-versions/1.4.2/bin:$PWD/z3/bin:$PATH"
  bun install --frozen-lockfile
  bun run rescript build
  rm -rf .verify
  bun res2ls-bridge.mjs src/Lifecycle.res .verify
  bun res2ls-correspond.mjs src/Lifecycle.res .verify
  bun node_modules/lemmascript/dist/lsc.js check --backend=dafny .verify/Lifecycle.ts
  bun res2ls-mutate.mjs src/Lifecycle.res src/Lifecycle.mutants.mjs .verify/mutants node_modules/lemmascript/dist/lsc.js
  dafny translate js --no-verify --include-runtime --output .verify/Lifecycle .verify/Lifecycle.dfy
  ```

  Repeat for `CauseTree.res`. Confirm the exact path of `lsc.js` inside the
  pinned package before running, and record it.
- Obligations checked, each reported per contract rather than as an
  aggregate count. FX-L1: `step` preserves `wellFormed`. FX-L2: exact effect, so
  `CloseRequested` on `Open` emits exactly one `StartAttempt`. FX-L3: frame,
  so a settlement for a non-current attempt leaves the state unchanged. FX-L4:
  join, so a fold over any event array containing only close requests while an
  attempt is in flight emits zero `StartAttempt`. FX-L5: no wrap, so a recovery
  request at `maxAttempt` is refused. FX-C1: `mapExpected` preserves tree
  shape. FX-C2: it leaves non-expected leaves unchanged.
- Expected result: `lsc check` exits 0 with each `@ensures` verified. The
  correspondence audit exits 0. Every mutant in the catalogue, including
  `refuses-everything` and one mutant per contract, is killed on exactly its
  listed contracts. The differential translation check agrees on all generated
  inputs.
- Verdict rule. *Accept*: FX-L1, FX-L2, FX-L3, FX-L5, and FX-C1 verify with
  a clean audit and full mutant kill. *Revise*: some obligations verify only
  after a representation change, such as splitting the trace-level join into
  per-step lemmas or making the cause tree monomorphic. Record the change as
  binding guidance in ADR 007 or ADR 006. *Reject*: the step-shaped reducer
  itself cannot be verified. Then keep the proof gate open in ADR 007, name the
  missing tool capability, and assign the obligations to bounded exhaustive
  enumeration and property tests as an explicit, reviewable downgrade of the
  assurance claim. That downgrade requires owner acceptance.
- Non-vacuity: the mutation catalogue is the primary guard. A contract that
  no mutant breaks is a finding, not a pass. A crashed or timed-out run is not
  a killed mutant. The audit must compare every compiled function. A
  correspondence check that compares nothing fails closed.
- Recorded in `docs/evidence/verification-feasibility.md`: the supported
  syntax actually used, gaps hit, trusted base, wall time per stage,
  reproducibility (rerun from an empty `.verify`), and maintenance cost.

### Abstract models and proof sketches (specified, not yet verified)

These sketches go into ADR 007 and ADR 006, labelled "specified, unverified".
They are hypotheses about the eventual proof structure. Implementation may show
that some lemmas are unnecessary or need to be split.

Lifecycle model, owned by ADR 007, for one producer identity:

- State per generation `g`: an owner identifier, an optional pending
  transfer destination, a lease set (while open), a phase, the current attempt
  number, and an append-only history of reports. The phases are `Open`,
  `Closing{attempt}`, `UnresolvedPending{attempt, report}`,
  `UnresolvedSettledFailed{attempt, report}`, `Recovering{attempt}`, and
  `Released{receipt}`, taken from `docs/design.md` §5.2.
- Events: `LeaseAcquired{lease}`, `LeaseCancelled{lease}`,
  `LeaseReleased{lease}`, `CloseRequested{caller}`, `BoundElapsed{attempt}`,
  `AttemptSucceeded{attempt, predicate}`, `AttemptFailed{attempt, issue}`,
  `RecoverRequested{caller}`, `TransferOffered{destination}`,
  `TransferAcknowledged{destination}`, and `SuccessorRequested{identity}`.
- Commands emitted to the shell: `StartAttempt{generation, attempt}`,
  `JoinAttempt{caller, attempt}`, `Report{caller, report}`,
  `AdmitSuccessor{identity}`, `DeferSuccessor{identity}`, and `Refuse{reason}`.

Invariants (each must hold in every reachable state):

- INV-1 single owner: a generation that is not `Released` has exactly one
  owner. The owner changes only on `TransferAcknowledged` from the offered
  destination.
- INV-2 one attempt in flight: in `Closing`, `UnresolvedPending`, and
  `Recovering`, the recorded attempt is the latest started attempt, and no
  other attempt of that generation is in flight.
- INV-3 no duplicate destructive call: `StartAttempt` is emitted only on
  `Open` to `Closing` (first close or last lease) and on
  `UnresolvedSettledFailed` to `Recovering` (explicit recovery). A close or
  recovery request while an attempt is in flight emits `JoinAttempt` with that
  attempt.
- INV-4 receipt soundness: `Released{receipt}` is reached only from
  `AttemptSucceeded` for the current attempt. The receipt carries that
  generation, attempt, and predicate.
- INV-5 stale isolation: settlement events for a non-current attempt or a
  different generation do not change the phase, owner, or attempt. Late success
  retires only its own generation.
- INV-6 bounded monotone attempts: attempt numbers strictly increase and
  never exceed `maxAttempt`. Recovery at the bound is refused, never wrapped.
  ReScript `int` is 32-bit and wraps, so this bound is a production-code rule,
  not a proof convenience.
- INV-7 successor gate: `AdmitSuccessor` for an exclusive identity is
  emitted only when the predecessor generation is `Released`.
- INV-8 retention: no event removes an unresolved generation except a
  success settlement or an acknowledged transfer. The reducer has no "forget"
  event, so discarding a diagnostic is not a state transition.
- INV-9 history: the report history is append-only and retains the
  original obligation.
- INV-10 lease independence: cancelling or releasing one lease removes only
  that lease. The phase stays `Open` while other leases remain. The event that
  removes the last lease emits exactly one `StartAttempt`.

Exact-effect and progress clauses guard against a specification that a "refuse
everything" reducer would satisfy:

- PR-1: `CloseRequested` on `Open` moves to `Closing{attempt+1}` and emits
  exactly one `StartAttempt`.
- PR-2: `AttemptSucceeded` for the current attempt from any in-flight phase
  moves to `Released`.
- PR-3: `AttemptFailed` for the current attempt moves to
  `UnresolvedSettledFailed`.
- PR-4: `RecoverRequested` on `UnresolvedSettledFailed` below the bound
  moves to `Recovering{attempt+1}` and emits exactly one `StartAttempt`.
- PR-5: `BoundElapsed` for the current attempt on `Closing` moves to
  `UnresolvedPending` with the same attempt and reports to joined callers.
- PR-6: `LeaseAcquired` on `Open` adds the lease.

Lemma statements:

- L-1: `step` preserves the conjunction INV-1, INV-2, and INV-6
  (`wellFormed`).
- L-2: each PR clause holds as a postcondition of `step`.
- L-3: INV-5 holds as a frame lemma over `step`.
- L-4 (trace level): for any event sequence that contains only close and
  recovery requests while an attempt is in flight, the fold of `step` emits no
  `StartAttempt`.
- L-5: INV-4 and INV-7 hold as postconditions of `step`.
- L-6 (trace level): for any sequence without a current-attempt success or
  an acknowledged transfer, an unresolved generation remains in the registry.

Cause model, owned by ADR 006: a finite tree whose leaves are `Expected{error}`,
`Defect{diagnostic}`, `Interrupted{execution}`, and `Release{issue}`, and
whose nodes are `Sequential{children}` and `Parallel{children}`.

- LC-1: `mapExpected(f, c)` has the same node kinds, child counts, and child
  order as `c`.
- LC-2: non-expected leaves are unchanged.
- LC-3: every expected leaf is mapped by `f`.
- LC-4: `result` produces `Error(e)` only when the cause is a single
  `Expected{e}` leaf. Otherwise it propagates the original cause unchanged.
- LC-5 (conformance only, because exceptions are outside the proof route):
  if `f` throws, the outcome records a mapping defect *and* retains the
  original cause as opaque provenance.

Axioms and trusted base that later proofs and tests will rely on, recorded in
ADR 007 and ADR 006:

- AXIOM-1: JavaScript run-to-completion. A synchronous `step` call is atomic
  with respect to other JavaScript code in the same agent. The shell must call
  `step` synchronously and must not interleave awaits inside it.
- AXIOM-2: ReScript 12.3.1 compilation and genType's description of runtime
  representation (trusted; the correspondence audit narrows but does not remove
  this).
- AXIOM-3: LemmaScript's TypeScript-to-Dafny translation, the bridge's
  contract attachment, Dafny 4.11.0, and Z3 4.12.1 (trusted; mutants and the
  differential check narrow this).
- AXIOM-4: the backend's observed semantics for the exact pinned version, as
  recorded by the probes (trusted only within the probe evidence, and
  re-established on upgrade).
- AXIOM-5: an adapter's release predicate is reported truthfully. This is
  external; refex can only test real adapters at real boundaries.
- AXIOM-6: callers do not use `Obj.magic`, `%identity`, or untyped JavaScript
  to forge values of opaque types.
- AXIOM-7: in-memory retention ends at host exit, so no durable crash recovery
  is claimed.

Liveness is not claimed. Eventual release depends on the adapter eventually
settling an attempt (AXIOM-5) and the shell delivering that event. ADR 007
states this as a conditional progress property, checked per step by PR-2 and
PR-3 and within bounds by enumeration. It is never stated as "cleanup always
completes".

### Verification matrix for the contracts frozen in this step

| Contract                                                  | Claim and premises                                                                                                                 | Boundary                                | Evidence method                                                                                                              | This step             | Later milestone                                                | Acceptance and limits                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| K-1 runtime boundary (ADR 004)                            | No backend type, tag, scope, or unchecked conversion appears in any public `.resi`; one exact backend pin                          | Public `.resi` files and `package.json` | Review now; package-contract test of production dependency names and `.resi` review checklist later                          | VP-3 probes, ADR text | 1.3.1 adds the dependency contract and private adapter modules | Production adoption only after E1-E3 and E9 pass; probes are version-specific |
| K-2 visible requirements (ADR 005)                        | Accessors exported as functions accumulate open rows across modules; missing or conflicting fields fail at the documented boundary | Separate `.res`/`.resi` modules         | Scratch compiler probes now; committed positive and negative fixtures later                                                  | VP-4                  | 1.2.2 (E1)                                                     | Type evidence only; no runtime ownership claim                                |
| K-3 explicit projection fallback (ADR 005)                | Projection composes without casts when rows are not wanted                                                                         | `contramapEnvironment` signature        | Compiler fixtures                                                                                                            | Signature only        | 1.2.1, 1.2.2                                                   | As K-2                                                                        |
| K-4 uninhabited channel (ADR 006)                         | `Never.t` has no constructible value without unsafe escapes; `absurd` is total                                                     | `Never.resi`                            | Compiler probes now; fixtures later                                                                                          | VP-5                  | 1.2.3                                                          | Modulo AXIOM-6 and divergence                                                 |
| K-5 leaf-wise mapping and conservative `result` (ADR 006) | LC-1 to LC-4 over a refex-owned cause tree                                                                                         | Pure cause module                       | Deductive proof (if FX-1 accepts), property tests of backend-to-refex conversion, and conformance tests for LC-5             | FX-1 (C1, C2)         | 1.2.3, 1.3.1                                                   | Proof covers pure mapping only; backend conversion is tested, not proved      |
| K-6 promise boundary (ADR 006)                            | Full outcome is available through `runExit`; any lossy projection is explicit and retains the full cause                           | Runtime boundary                        | Behavioural tests with real promises                                                                                         | Probe P5              | 1.3.1 (E9 mixed failure)                                       | Scheduling outside proof                                                      |
| K-7 lifecycle safety (ADR 007)                            | INV-1 to INV-10 and PR-1 to PR-6                                                                                                   | Pure lifecycle reducer                  | Deductive proof of `step` against compiled JavaScript, plus bounded exhaustive enumeration of the real reducer, plus mutants | FX-1 (L1-L5)          | 1.3.3                                                          | Safety plus per-step progress; no liveness                                    |
| K-8 joined close and retained recovery (ADR 007)          | Concurrent closes join one attempt; discarded diagnostics leave a live owner                                                       | Shell plus registry                     | Behavioural tests with explicit readiness; fast-check scheduler interleavings; ablations                                     | None                  | 1.3.3-1.3.5 (E3, E9)                                           | Interleavings limited to those the scheduler controls                         |
| K-9 two-consumer lease independence (ADR 007)             | INV-10 at runtime; one reader cancels without affecting the other                                                                  | Producer adapter                        | Behavioural Given/When/Then tests, model-based property tests                                                                | None                  | 1.3.4, 1.3.5                                                   | Real-boundary claims wait for adapters                                        |
| K-10 host-exit limits (ADR 007)                           | After a bounded close report, the host retains and reports unresolved owners; no claim survives exit                               | Runtime owner                           | Review now; behavioural test of the report later                                                                             | ADR text              | 1.3.5                                                          | Documentation limit, not a proof                                              |

### Test strategy applicability for this step

Unit and behavioural tests in ReScript: not applicable, because this step adds
no ReScript module. The forward plan in ADR 007 names Given/When/Then scenarios
for 1.3.x using the existing Bun runner's `describe` and `test`. No Gherkin
runner is needed; the roadmap does not require feature files.

Snapshot tests: not applicable. No stable diagnostic or trace format exists
yet. ADR 006 records that diagnostic formatting is not the recovery store.

Compiler and public-interface tests: positive and negative probes run in
scratch projects (VP-4, VP-5) because this step has no `Fx` module to attach
committed fixtures to. Committed fixtures are 1.2.2 and 1.2.3 acceptance. The
packed-consumer checks are unchanged, because no export changes.

Property and state-machine tests: not applicable now. `fast-check` is not
installed (C-2). ADR 007 records the forward plan: narrow typed bindings
following the `rescript-property-testing` skill, recorded seeds and paths,
`numRuns` in the hundreds per commit, a scheduler binding for interleavings,
and minimal counterexamples kept as regression tests.

Asynchronous and lifecycle tests: not applicable now. ADR 007 lists the E9
scenarios each later task must cover, with readiness signals, joined managed
work, raw-work inspection, and named ablations.

End-to-end tests: not applicable. No externally observable workflow changes.

Ensuring tests run: the one new suite,
`tests/documentation-contracts.test.mjs`, is added to the explicit file list in
the `Makefile` `test` target. The test checks that its own name appears in that
list. Coverage is unaffected, because the suite tests documentation, not
generated JavaScript, and `make coverage` keeps its current file list. CI runs
`make all`, so the suite runs in CI with no workflow change.

### How the methods complement one another

Compiler fixtures prove type-level claims (requirements, uninhabited errors,
unsound signatures rejected) and nothing about runtime. Deductive proof of the
pure lifecycle reducer and cause mapping establishes safety for all inputs
within the stated premises. It only reaches the production code through the
correspondence audit and the trusted base above. Bounded exhaustive enumeration
of the *real* reducer under all event orders, up to two leases, two
generations, and three attempts, gives independent confirmation and catches
specification gaps that a proof of the wrong statement would miss. Property
tests and the fast-check scheduler exercise the effectful shell, where
promises, timers, and cancellation live and proof cannot reach. Behavioural E9
tests with ablations show that the suite detects the failures it claims to
guard against. Real-boundary tests remain mandatory once platform adapters
exist.

## Plan of work

Stage A, understand and propose (complete when this plan is approved). No
repository changes beyond this plan and a `docs/contents.md` pointer to
`docs/execplans/`.

Stage B, guard and brief (EP-M0 to EP-M2). Establish green baseline gates, add
the documentation contract in red-then-green order, then write the design brief
and glossary entries. Validation: `make all` passes after each milestone.

Stage C, evidence-backed ADRs (EP-M3 to EP-M7). For each ADR, first run the
probes and write the evidence record, then write the ADR so that every claim
cites evidence or names the task that will supply it. FX-1 runs after the ADR
007 draft and before its representation section is finalized. Validation:
`make all` passes after each milestone, and probe transcripts reproduce.

Stage D, integration and closure (EP-M8 to EP-M9). Cross-link design, context,
terms of reference, guides, layout, and contents. Run the expert review panel
over the ADR set. Obtain owner acceptance, then update status lines and roadmap
ticks. Validation: `make all` passes, and the documentation contract passes
with the final statuses.

## Milestones and plateaus

EP-M0, baseline.

- Outcome: the branch builds and `make all` passes with Bun 1.4.2 before any
  change, so later failures are attributable.
- Requirements and gaps: none; precondition only.
- Acceptance evidence: scrutineer report with `make all` exit 0, log at
  `/tmp/all-refex-1-1-freeze-validator-hypotheses.out`.
- Conformance check: no file changed.
- Recovery: if the baseline fails, record the failure under
  `Surprises & discoveries` and escalate. Do not fix unrelated gates in this
  branch.
- Remaining gaps: none. Compatibility decision: none.

EP-M1, documentation contract (VP-1).

- Outcome: `tests/documentation-contracts.test.mjs` exists, is listed in the
  `Makefile` `test` target, and passes against the three existing ADRs. Its
  negative controls fail as designed.
- Requirements and gaps: G6 status separation; enables C-10.
- Acceptance evidence: red transcript (temporary ADR stub not linked from
  contents fails with its path named), then green transcript. `make all` exit 0.
- Conformance check, one line per item:
  - status vocabulary matches `Decision log`;
  - no change to `tests/support/repository-contracts.mjs`;
  - no new dependency;
  - no public interface or trust-boundary change;
  - trace chain for G6 is current.
- Recovery: revert the single commit.
- Remaining gaps: none. Compatibility decision: none.

EP-M2, design brief (task 1.1.1).

- Outcome: `docs/design-brief.md` defines the initial public abstractions
  (`Fx` and `IO`, `Layer`, resources, fibres, schedules, deterministic time
  through injected `Clock` and `Random` services, and React ownership) in one
  short paragraph each. Each paragraph says what the abstraction promises, what
  it does not promise, and where the full contract lives. The brief keeps
  rescript-schema as the codec starting point. It names the deferred
  capabilities (streams, STM, request caches, graph memoization, a native
  scheduler, transparent await, and a syntax transform), each with the roadmap
  phase 6 task that would revisit it. It contains the validator capability map.
  `docs/context.md` §2 gains glossary entries for *schedule*, *readiness*,
  *deterministic time*, *capability object*, *explicit projection*, and
  *uninhabited channel*, added as new terms without renumbering.
  `docs/design.md` §1 gains one sentence linking the brief.
- Requirements and gaps: roadmap 1.1.1; G1, G4, G5.
- Acceptance evidence: VP-2 review result recorded as EV-BRIEF, and
  `make all` exit 0.
- Conformance check: no proposed abstraction is described as implemented;
  rescript-schema is retained as delegated (D4 still open); no design-section
  renumbering.
- Recovery: revert the commit; no other milestone depends on prose details
  except link targets.
- Remaining gaps: D4 (schema package and browser policy) stays open.
  Compatibility decision: none.

EP-M3, runtime boundary (task 1.1.2).

- Outcome: `docs/evidence/runtime-boundary-audit.md` holds a static audit
  and executable probes P1 to P6. The static audit covers registry metadata,
  integrity, licence, dependency graph, module coverage, unsafe signatures, and
  `%identity` uses for `@reventlessdev/rescript-effect` 0.1.0-alpha.35 and for
  direct Effect FFI over the newest Effect 4.0.x patch available when the audit
  starts. `docs/adr-004-runtime-boundary.md` compares direct FFI with the
  audited bindings and selects one. It pins the selection exactly, with
  registry integrity. It also states three things: the conditional amendment to
  ADR 002 (exactly one additional production dependency, permitted only from
  task 1.3.1 onwards and only behind private adapter modules absent from the
  public allowlist); dependency discovery (one root package, no workspace); and
  the browser bundle questions. It authorizes a bounded trial and makes
  production adoption conditional on E1 to E3 and E9. It records the rollback:
  remove the dependency and the adapter modules.
- Hypothesis H-RT, to be tested rather than assumed: direct FFI over pinned
  Effect 4.0.x, with refex-owned narrow bindings, is preferable. The
  preliminary evidence is the Effect 3.22.2 pin, the production dependency on a
  test-binding package, and the type-inventing signatures recorded under
  `Surprises & discoveries`. H-RT is falsified if probes show that the Effect
  4.0.x line lacks or breaks a semantic that 1.3.1 needs and that 3.22.2
  provides. The candidates are P2 mixed-cause mapping, P3 repeated close, P4
  keyed replacement, and P5 full-exit availability. It is also falsified if the
  Reventless maintainers have published an Effect 4 binding with sound
  signatures by audit time. Re-check the registry when the audit starts.
- Requirements and gaps: roadmap 1.1.2; D1 (provisionally answered); A3;
  G2, G3, G6.
- Acceptance evidence: VP-3 transcripts with negative controls; ADR 004
  Y-statement and "Falsifiers and evidence" section; `make all` exit 0.
- Conformance check: no package installed in the repository; ADR 002 text
  untouched until acceptance; probes labelled as source evidence; Effect
  version differences from Lody's 4.0.2 recorded.
- Recovery: the evidence record and the ADR are separate commits; revert
  either.
- Remaining gaps: actual installation, adapter modules, dependency contract
  test, and bundle measurement (1.3.1, E8). Compatibility decision: none.

EP-M4, structural dependency environments (task 1.1.3).

- Outcome: `docs/evidence/structural-environment-probes.md` and
  `docs/adr-005-structural-dependency-environments.md`. The ADR prefers
  Primavera-style capability objects (open object rows of service records) with
  explicit projection as the sound fallback and the default for named
  environments. It fixes the accessor convention (exported accessors are
  functions) and the variance assumption on `Fx.t` (requirement parameter
  contravariant, declared in the `.resi` and justified by the representation).
  Its template separates construction inputs, invocation requirements, lifetime
  owner, and snapshot-versus-live observation for every service. It states the
  separate-module failure that rejects automatic requirement accumulation. That
  happens if, with the pinned compiler and accessors exported as functions from
  separate `.res` and `.resi` modules, any one of three things occurs. (1) A
  workflow composing two such accessors cannot be given the union row without
  annotation-level casts. (2) A missing or conflicting capability is accepted.
  (3) The rejection is reported somewhere other than the composition or
  provision site that the user guide documents. If any of these occurs in
  1.2.2, refex adopts explicit projection everywhere and removes open-row
  accessors.
- Requirements and gaps: roadmap 1.1.3; D2; G1, G4; A2.
- Acceptance evidence: VP-4 transcripts; `make all` exit 0.
- Conformance check: no committed fixtures (they belong to 1.2.2); the
  snapshot-versus-live rule from design §3.2 is preserved.
- Recovery: revert; ADR 005 depends on no other new ADR.
- Remaining gaps: committed fixtures (1.2.2), and the effect of a real
  backend-backed abstract `Fx.t` on variance, because variance on an FFI-backed
  abstract type is a trusted assertion. Compatibility decision: none.

EP-M5, complete outcomes (task 1.1.4).

- Outcome: `docs/evidence/complete-outcome-probes.md` and
  `docs/adr-006-complete-outcomes.md`. The ADR decides the following.
  - Expected errors use ordinary closed variants by default, with
    polymorphic variants optional.
  - The infallible channel is an abstract `Never.t` with a total
    `absurd`, never `unit`.
  - refex owns an inspectable cause tree (the Cause model above). The
    backend cause is converted at the adapter boundary by a total,
    reason-preserving conversion.
  - `mapError` maps expected leaves only. A throwing mapper yields a
    mapping defect and keeps the original cause as opaque provenance.
  - `result` has the conservative signature from design §4.2.
  - `runExit` returns the complete outcome. A lossy promise projection is
    explicit and retains the full cause.
  - An anticipated inability to release is a release issue, not a defect.
    An unexpected exception in cleanup is a defect with release context.
    Neither drops simultaneous reasons.
  - The release-issue fields are owner, generation, attempt, phase,
    observed condition, and remaining obligation. The payload's final shape
    stays D8 until E3 and E9.
  - LC-1 to LC-5 are recorded as specified, unverified obligations.
- Requirements and gaps: roadmap 1.1.4; D8 (partially); G2.
- Acceptance evidence: VP-5 transcripts, including the counterexample that
  an `'e2`-free signature admits an unrelated error type; `make all` exit 0.
- Conformance check: no conversion in the ADR erases simultaneous reasons
  or casts an unrelated error type; release failures are not all classified as
  defects.
- Recovery: revert.
- Remaining gaps: fixtures (1.2.3), adapter conversion tests (1.3.1), and
  proofs of LC-1 to LC-4 (1.2.3 or 1.3.1, subject to FX-1). Compatibility
  decision: none.

EP-M6, shared work, closure, and recovery contract (task 1.1.5).

- Outcome: `docs/adr-007-shared-work-lifecycle-contract.md`, status
  `proposed`, becoming `candidate` on acceptance. Its content:
  - Answers to trigger, owner, cancellation, handoff, and recovery for
    the two-consumer slice, in the design §2.4 table form.
  - The three cancellation contracts of design §6.2.
  - The lifecycle model, invariants, exact-effect clauses, lemma
    statements, axioms, and trusted base from this plan. All of it is
    labelled specified and unverified.
  - The named observable transitions T-1 onwards, one per event and
    phase pair, each with the observation that establishes it (readiness
    event, command emitted, report delivered).
  - Joined close attempts and release receipts. Unresolved generations
    with retained original pending cleanup. A live owner registry,
    independent of diagnostics, with acknowledged transfer.
  - Host-exit limits: in-memory retention ends with the host, the host
    must report unresolved owners at exit, and no durable recovery is
    claimed.
  - Representation guidance for verifiability: a pure reducer in core, a
    record payload on every variant constructor, bounded integer
    counters, no `result` in contracted signatures, and arrays rather than
    maps.
  - The forward E9 scenario mapping and ablation list for 1.3.3 to 1.3.5.
  - What it deliberately excludes: platform APIs, a general supervisor,
    process management, and graph memoization.
- Requirements and gaps: roadmap 1.1.5; D9 (seam chosen: a core owner
  registry, with the supervisor seam deferred); D10 (strict FIFO not promised);
  G3; A6; Q6; Q7.
- Acceptance evidence: ADR text reviewed against design §§2.4, 5, and 6
  with no contradiction, and `make all` exit 0.
- Conformance check: no platform import, no supervisor framework, and no
  liveness claim.
- Recovery: revert.
- Remaining gaps: representation guidance is provisional until EP-M7.
  Compatibility decision: none.

EP-M7, verification feasibility (FX-1, prototyping milestone).

- Outcome: `docs/evidence/verification-feasibility.md` records the FX-1
  verdict. ADR 007 and ADR 006 are updated with the verdict's consequences:
  accept (proof gate planned for 1.3.3, with its exact command shape), revise
  (binding representation changes), or reject (gate kept open, missing
  capability named, downgrade proposed for owner acceptance).
- Requirements and gaps: proof-obligation selection for K-5 and K-7.
- Acceptance evidence: the recorded per-obligation outcomes, the mutant
  table, the audit result, and wall times. `make all` exit 0 after the
  documentation update.
- Conformance check: nothing from the scratch directory is committed except
  the Markdown evidence record; no proof shortcut (`assume`, `//@ extern`,
  axioms, or hand-edited verification units) was used. If one was needed, the
  verdict is revise or reject, not accept.
- Recovery: the scratch directory is disposable; delete and recreate from
  the recorded commands.
- Remaining gaps: the committed proof gate, with its own `make` target
  proposal, belongs to the plan for 1.3.3. Compatibility decision: none.

EP-M8, integration and review.

- Outcome: cross-document updates (listed under `Concrete steps`) and the
  expert review panel's findings over ADRs 004 to 007, either resolved or
  recorded. A pull request comment asks the owner to accept each ADR.
- Acceptance evidence: review synthesis recorded in `Decision log`, and
  `make all` exit 0.
- Recovery: revert individual integration commits.

EP-M9, closure.

- Outcome: after owner acceptance, ADR status lines are updated. ADR 002
  gains one line noting the conditional amendment by ADR 004 (only if ADR 004
  is accepted). Roadmap tasks 1.1.1 to 1.1.5 and their sub-boxes are ticked.
  The roadmap's "All boxes remain unchecked" sentence and the matching
  `docs/contents.md` sentence are amended to say that ticked specification
  tasks are not implementation or verification evidence.
  `Outcomes & retrospective` is completed and the status set to `COMPLETE`.
- Acceptance evidence: documentation contract green with final statuses;
  `make all` exit 0; PR updated.

## Concrete steps

Run everything from the worktree root,
`/home/leynos/.lody/repos/github---leynos---refex/worktrees/4c10984f-2c00-4e9b-9d17-f7a799adc218`
(any checkout of the branch works). Every shell needs the pinned Bun first:

```sh
export PATH="$HOME/.local/share/bun-versions/1.4.2/bin:$PATH"
bun --version   # expect 1.4.2
make install    # expect "81 packages installed" or "no changes"
```

If `$HOME/.local/share/bun-versions/1.4.2/bin/bun` is missing, download
`bun-linux-x64.zip` and `SHASUMS256.txt` from the `bun-v1.4.2` GitHub release
into that directory, verify with
`grep ' bun-linux-x64.zip$' SHASUMS256.txt | sha256sum -c -`, unzip, and move
`bun-linux-x64/bun` to `bin/bun`. Never upgrade the global Bun.

Gates run through the `scrutineer` sub-agent, sequentially, with output teed to
`/tmp/$ACTION-refex-1-1-freeze-validator-hypotheses.out`. Do not run gates in
parallel. Read the cited log rather than re-running a failed gate.

EP-M1 steps:

1. Write `tests/documentation-contracts.test.mjs` with a module doc comment
   in the style of `tests/markdown-contracts.test.mjs`, the private helper
   `adrIndexContract`, one positive test, and a `test.each` table of the four
   negative controls from VP-1. Add a fifth test asserting that the `Makefile`
   `test` target names this file.
2. Add `./tests/documentation-contracts.test.mjs` to the `Makefile` `test`
   file list, keeping alphabetical order with the other contract suites.
3. Red: create a temporary `docs/adr-004-stub.md` containing
   `# ADR 004: stub` and `Status: proposed.`, then run
   `bun test ./tests/documentation-contracts.test.mjs`. Expect one failure
   whose message names `docs/adr-004-stub.md` as missing from
   `docs/contents.md`. Delete the stub.
4. Green: rerun; expect all tests to pass. Then have scrutineer run
   `make all`. Commit: "Guard the ADR index and status vocabulary".

EP-M2 steps:

1. Write `docs/design-brief.md` following the skeleton under
   `Interfaces and dependencies`.
2. Add the six glossary entries to `docs/context.md` §2 in the subsections
   where the neighbouring terms live, and add one link sentence to
   `docs/design.md` §1.
3. Add the brief to `docs/contents.md` under "Product intent and design".
4. Run VP-2: dispatch a `wyvern` sub-agent to extract capabilities from
   design §9 and roadmap phases 2 to 4 without reading the brief, then diff the
   two lists. Record the result as EV-BRIEF.
5. Run `make fmt` (it rewrites only Markdown here; inspect `git diff`), then
   scrutineer `make all`. Commit: "Add the refex design brief and capability
   map (1.1.1)".

EP-M3 steps:

1. Re-query the registry for `effect` and `@reventlessdev/rescript-effect`
   and record versions, publish times, and integrity hashes. Pick the newest
   Effect 4.0.x patch as the candidate pin, and record the time of the check.
2. In `/tmp/refex-audit/effect-4/` and `/tmp/refex-audit/effect-3/`, create
   a minimal `package.json`, run `bun add effect@<exact> --exact`, and write
   probes P1 to P6 with their controls (VP-3). Run each with
   `bun probe-p<N>.mjs` and capture the JSON line.
3. Unpack the bindings archive into `/tmp/refex-audit/reventless/` (an
   empty directory, never executed) and complete the static audit table: module
   coverage against what 1.3.1 needs, every signature with a free type variable
   in a result position, every `%identity` and `Obj.magic`, and the dependency
   graph.
4. Write `docs/evidence/runtime-boundary-audit.md`. Commit: "Record the
   runtime boundary audit evidence (1.1.2)".
5. Write `docs/adr-004-runtime-boundary.md` and add it to
   `docs/contents.md`. Scrutineer `make all`. Commit: "Propose the provisional
   runtime boundary (1.1.2)".

EP-M4 and EP-M5 steps follow the same pattern. Build a scratch project under
`/tmp/refex-probes/<name>/` with a `rescript.json` matching the repository's
warning policy, and run `<worktree>/node_modules/.bin/rescript build`. Capture
each diagnostic's key line, write the evidence record, commit it, then write
the ADR, add it to contents, run the gates, and commit. Use the commit subjects
"Record structural environment probes (1.1.3)", "Propose structural dependency
environments (1.1.3)", "Record complete outcome probes (1.1.4)", and "Propose
complete outcome semantics (1.1.4)".

EP-M6 steps: write ADR 007, add it to contents, run the gates, and commit
"Propose the shared work lifecycle contract (1.1.5)".

EP-M7 steps: create `/tmp/refex-fx1/`, install the pins listed under FX-1,
write the toy modules, contracts, and mutant catalogue, and run the FX-1
commands. Write the evidence record and update ADRs 006 and 007. Run the gates,
then commit "Record the verification feasibility verdict (1.1.5)".

EP-M8 steps:

1. Update `docs/design.md`. Add links from §2.2 and §2.3 to ADR 004, from
   §3.2 to ADR 005, from §4 to ADR 006, and from §2.4 and §5.2 to ADR 007. Mark
   D1 provisional (ADR 004), D2 decided pending E1 (ADR 005), D8 partially
   decided (ADR 006), and D9 and D10 partially decided (ADR 007). Update the
   status line's revision date.
2. Update `docs/context.md`. Add source register entries after `C12`: the
   bindings at the audited version and integrity, Effect at the probed versions
   and integrity, Primavera at a pinned commit (latest seen at planning time:
   `e468f2aad98384818ff861cc8ceb790bd5a766ed`), LemmaScript, Dafny, and Z3 at
   the FX-1 versions, and fast-check 4.10.2 as a planned development dependency
   for 1.3.x. Update the crosswalk's delivery column to cite ADRs 004 to 007.
3. Update `docs/terms-of-reference.md` only to link Q6 and Q7 to ADR 007 and
   to record any falsified assumption. Without a falsified assumption, make no
   other change.
4. Update `docs/users-guide.md` with one sentence saying the ADRs describe
   proposed behaviour and nothing new is installable.
5. Update `docs/developers-guide.md` with: the ADR status vocabulary and
   amendment rule, evidence records under `docs/evidence/` and their fields,
   `docs/execplans/`, and a note that proof tooling is evaluated by scratch
   feasibility experiments until an approved plan adds a gate.
6. Update `docs/repository-layout.md` with rows for product ADRs,
   `docs/evidence/`, and `docs/execplans/`.
7. Update `CHANGELOG.md` `Unreleased` with one bullet for the documented
   hypotheses and runtime-trial authorization.
8. Run the expert panel (see `Validation and acceptance`), revise, run the
   gates, and commit each logical update separately.

EP-M9 steps: after the owner's acceptance comment, update the status lines, the
ADR 002 amendment note, the roadmap ticks, and the two sentences. Run the
gates, commit "Mark roadmap step 1.1 delivered", and push.

Push procedure (all milestones), after checking the SSH identity with
`/usr/bin/ssh -T git@github.com`:

```sh
GIT_SSH_COMMAND=/usr/bin/ssh /usr/bin/git push git@github.com:leynos/refex.git \
  HEAD:refs/heads/1-1-freeze-validator-hypotheses
GIT_SSH_COMMAND=/usr/bin/ssh /usr/bin/git fetch git@github.com:leynos/refex.git \
  "+refs/heads/1-1-freeze-validator-hypotheses:refs/remotes/origin/1-1-freeze-validator-hypotheses"
/usr/bin/git branch --set-upstream-to=origin/1-1-freeze-validator-hypotheses
```

## Validation and acceptance

Quality criteria:

- Tests: `make test` passes and lists
  `tests/documentation-contracts.test.mjs`. The suite failed in the red step
  for the stated reason.
- Verification: VP-1 to VP-5 discharged with their non-vacuity evidence.
  FX-1 has a recorded verdict with per-obligation outcomes. Every lemma remains
  marked specified and unverified.
- Lint, format, docs, spelling, and package: `make all` exits 0 after each
  milestone. `make check-fmt`, `make lint`, and `make test` are part of it.
- Security: `make audit` runs once at EP-M9 and its result is recorded. No
  dependency changes, so no new advisory is expected.

Expert review panel (EP-M8): run `logisphere-design-review` with one sub-agent
per lens. Telefono (contracts and types) reviews ADRs 005 and
006. Doggylump (failure modes and pre-mortem) reviews ADR 007 and the
verification claims. Pandalump and Dinolump (coherence, long-term health, and
process) review ADR 004 and the integration. Wafflecat (alternatives) reviews
backend choice and verification-technique alternatives, such as TLA+ or Quint
models against the LemmaScript route. Accept no 🔴 finding unresolved. Record
each 🟡 finding as resolved or as a risk.

Acceptance is behavioural. A reviewer can open `docs/contents.md` and reach the
brief and four ADRs. Each ADR shows a Y-statement, a status from the
vocabulary, falsifiers tied to roadmap tasks, and links to evidence records
whose commands reproduce the recorded observations. Running
`bun test ./tests/documentation-contracts.test.mjs` passes. Appending an
unlisted `docs/adr-099-x.md` with `Status: proposed.` makes it fail.

## Idempotence and recovery

All probe and FX-1 work happens in `/tmp/refex-audit/`, `/tmp/refex-probes/`,
and `/tmp/refex-fx1/`. These directories are disposable; delete and recreate
them from the recorded commands. No repository step is destructive. Each
milestone is one or two commits and can be reverted independently, except that
EP-M9 depends on EP-M3 to EP-M8. `make install` with the frozen lockfile is
idempotent. If a push fails, rerun it. If the explicit-URL push leaves the
tracking ref stale, rerun the fetch with the `+` refspec.

## Artefacts and notes

Planning-time probe transcripts. These are source evidence for drafting the
ADRs, and the implementer reruns them in EP-M4 and EP-M5. Scratch project
`/tmp/refex-probes/rows/` used a toy
`Fx.t<+'a, +'e, -'r> = 'r => result<'a, 'e>` with `Clock` and `Log` accessor
modules, each with a `.resi`.

```plaintext
== positive: Clock.now: unit => Fx.t<int, 'e, {.."clock": service}> and Log.write composed in Workflow
Compiled 5 modules
== negative: provide an environment lacking "log"
This has type: {"clock": Clock.service, "extra": int}
But this function argument is expecting: {.."clock": Clock.service, "log": Log.service}
The first object is expected to have a field "log" of type Log.service, but it does not.
== negative: Clock.now exported as a non-function value
let now: Fx.t<int, 'a, {_.."clock": service}>
is not included in
let now: Fx.t<int, 'e, {.."clock": service}>
```

Scratch project `/tmp/refex-probes/never/`:

```plaintext
== type never = |
Syntax error!
== Never.resi: type t; let absurd: t => 'a / Never.res: type t = {absurd: 'a. 'a}
Compiled 2 modules
== negative: let bad: result<int, Never.t> = Error(())
This has type: unit
But it's expected to have type: Never.t
== negative: construct Never.t outside its module
Never.absurd refers to a record field, but no corresponding record type is in scope.
```

Registry facts checked on 15 October 2026:

```plaintext
@reventlessdev/rescript-effect latest 0.1.0-alpha.35 (2026-10-12), Apache-2.0,
  dependencies: effect 3.22.2, @reventlessdev/rescript-jest 1.0.0-alpha.12; peer rescript ^12.3.1
effect latest 4.0.5 (2026-10-15), MIT, no dependencies, unpacked 51,489,523 bytes,
  integrity sha512-BY4/28NlpOd99yzmV741xbVGmp+1U7tks4oB7F/Png64bTa5tm5eCA6W0RiXsnuLDDoJpjfVSo4Dnq4BZb/89Q==
effect 3.22.2 (2026-09-09), MIT, dependencies: fast-check ^3.23.1, @standard-schema/spec ^1.0.0
fast-check latest 4.10.2; rescript-schema latest 9.5.1; sury latest 11.1.0-rc.0; lemmascript latest 0.6.4
Primavera main e468f2aad98384818ff861cc8ceb790bd5a766ed (2026-08-28), MIT
```

EV-BRIEF: to be recorded in EP-M2.

## Interfaces and dependencies

No code interfaces are added. The documents below are the deliverables. Each
skeleton is binding on structure, not on wording.

`docs/design-brief.md`:

```plaintext
# refex design brief
Status line (draft, date, authority: subordinate to design.md and ADRs)
## Purpose and non-goals            (≤ 15 lines, links ToR §6)
## Initial public abstractions      (Fx/IO, Layer, Resource, fibres, Schedule,
                                     deterministic time, React ownership,
                                     codecs via rescript-schema; each: promises,
                                     non-promises, owning contract, status)
## Deferred capabilities            (streams, STM, request caches, graph memoization,
                                     native scheduler, transparent await, syntax transform;
                                     each with its phase 6 task)
## Validator capability map         (table: capability | validator | contract or delegate | status)
## Status vocabulary                (Proposed, Delegated, Deferred, Open, Implemented)
```

The capability map must cover at least these 30 capabilities. Minesweeper: pure
generation and solving, seeded randomness, paced lazy workflow, virtual-time
pacing, pause and resume, reset and new-board replacement, React provider and
hook, component-local work, shared solver producer with two views, last-lease
teardown, recovery inspection, and Direct comparison. Roguelike: shared
protocol types, schema codecs, world-state service, session store, injected
clock and randomness, logging, scoped request workflow, admission with
cancellation removal, command identity and deduplication, live versus snapshot
configuration, typed transport, and React client. css-view: typed CLI planning,
nested browser resources, walker capture, CDP connection and request
correlation, listener-before- trigger readiness, process-command capability,
transient open retry schedule, borrowed-session protection, and the
differential oracle harness.

ADRs 004 to 007:

```plaintext
# ADR 00N: <sentence-case title>
Status: proposed. Date: <day month year>.
## Context
## Decision            (opens with the Y-statement sentence)
## Alternatives considered
## Falsifiers and evidence   (each falsifier -> roadmap task / experiment; evidence record links)
## Consequences
## References
```

ADR 007 additionally has `## Behavioural contract` (the five-question table and
the three cancellation contracts), `## Lifecycle model` (states, events,
commands, transitions T-1 onwards), `## Invariants and proof obligations` (INV,
PR, L, and AXIOM lists, marked specified and unverified),
`## Representation guidance`, and `## Host-exit limits`. ADR 006 additionally
has `## Cause model and obligations`.

Evidence records under `docs/evidence/`:

```plaintext
# Evidence: <subject>
Status line (source evidence, not refex conformance; date; pins)
## Claim
## Pins and environment     (tool versions, integrity hashes, OS, Bun)
## Procedure                (exact commands from an empty directory)
## Probes                   (each: source, control, transcript, verdict)
## Limits
## Decision                 (accept / revise / reject and the ADR it informs)
```

Planned (not added in this step) development dependencies, recorded for later
plans: `fast-check` 4.10.2 (1.3.x property and scheduler tests) and a separate
`tools/verification/` package with `lemmascript` 0.6.4, `typescript`, and
`bignumber.js` at exact pins (1.3.3, subject to FX-1). Each needs its own
approved plan and lockfile change.

## Revision note

2026-10-15: initial draft, written after reconnaissance, registry research, and
planning-time compiler probes. Pending the community-of-experts review.
