# Prove structural requirements across compiler interfaces

Status: DRAFT — awaiting explicit approval before implementation.

This ExecPlan is a living document for roadmap task **1.2.2**. Keep its
constraints, tolerances, risks, progress, discoveries, decisions, outcomes,
conformance basis, and verification plan current. Planning and publishing a
reviewable draft do not authorize execution of the implementation milestones.

## Purpose and big picture

A consumer must be able to compose independently exported services without
losing a dependency at a ReScript interface. After this work, `make test` will
compile complete, extra-field, and explicitly projected environments, and will
reject missing capabilities, incompatible service types, incomplete
projections, and an unresolved `Fx` passed to an `IO` boundary. Every rejection
must identify the intended mismatch. A syntax error or broken dependency must
fail the test.

This is the requirements portion of design experiment E1, not completion of
phase 1. Error composition remains task 1.2.3. Runtime execution, retained
ownership, cancellation, and the shared-producer slice remain tasks 1.3.x.

## Constraints

- Preserve the single root package, portable `src/`, explicit public `.resi`
  interfaces, existing public-module allowlist, and accepted bootstrap ADRs.
- Preserve ReScript and `@rescript/runtime` 12.3.1, Bun 1.4.2,
  `rescript-bun` 2.1.0, and the committed lockfile. Add no dependency.
- Extend the existing compiler-fixture suite. Do not create another build
  system, a generic validation framework, a public runner, or a platform
  adapter.
- Production API and implementation changes are outside this plan's authority.
  Do not erase requirements, add consumer casts, or weaken diagnostic checks.
- Keep generated fixture/test JavaScript untracked. Production JavaScript is
  compiler-owned and tracked; do not edit or format it independently.
- Keep authored code files below 400 lines. Helpers belong only to their suite.
- Preserve existing work. Never reset unrelated changes or kill other agents'
  processes. Use `/tmp` for logs and existing disposable compiler consumers,
  never as a Cargo build target.
- Implement only after approval. Do not mark roadmap task 1.2.2 done during
  planning. Publishing this draft PR does not publish a package or authorize
  merge.

## Tolerances (exception triggers)

Stop, record the proposed deviation and affected trace links in the Decision
log, set status to BLOCKED, and obtain explicit approval if a public signature,
production representation, dependency, accepted ADR, or trust boundary must
change. In particular, an ADR 005 falsifier requires a reviewed decision about
explicit projection; do not silently replace open rows or count a weaker test
as success.

Allow at most 30 non-ExecPlan files and 800 net lines of code and other
documentation. ExecPlan files are excluded from both limits. Escalate after
three unsuccessful attempts to obtain an intended diagnostic for one fixture,
or if a suite-owned helper would exceed 400 lines. There is no elapsed-time
limit; healthy tool queues are not failures. Record fixture wall-clock time
against the existing 120-second advisory budget; an overrun calls for
diagnosis, not a weaker oracle or parallel compiler processes.

## Risks

- High impact, medium likelihood: a rejection occurs for a record-label or
  value-restriction error before the intended requirement mismatch. Use
  qualified record labels, function exports, one-line positive controls, and
  exact sites.
- High impact, low likelihood: the consumer boundary loses a requirement.
  Exercise both missing fields separately and retain the existing variance
  witnesses. Escalate any ADR 005 falsifier.
- Medium impact, medium likelihood: diagnostic fragments match a source excerpt
  rather than the type explanation. Require type-mismatch language as well as
  the key/type relationship; review the complete captured diagnostic.
- Medium impact, medium likelihood: fixture isolation or discovery misses work.
  Keep exact metadata/file inventory and base builds before and after cases;
  reject empty/malformed metadata and duplicate identifiers.
- Medium impact, low likelihood: a process timeout or crash resembles rejection.
  Require normal compiler termination and the intended single diagnostic;
  environmental failure never counts as a killed negative control.

## Progress

- [x] (2026-11-09) Read repository guidance and inspect the 1.2.1 baseline.
- [x] (2026-11-09) Rename branch to
  `1-2-2-positive-and-negative-compiler-fixtures`; preserve the clean worktree.
- [x] (2026-11-09) Wyvern team examines contracts and compiler-runner
      integration.
- [x] (2026-11-09) Consult installed ReScript and proof guidance and upstream
  object documentation through Firecrawl.
- [x] (2026-11-09) Complete six-lens community-of-experts review and reconcile
  interface, diagnostic, logging, and delivery findings.
- [x] (2026-11-09) Format and validate the planning candidate: `make all`
  passed with pinned Bun 1.4.2; 197 tests passed, none failed.
- [ ] Commit and publish the validated plan as a draft PR (delivery metadata
  is recorded in the PR; implementation still requires explicit approval).
- [ ] Obtain explicit approval of this plan.
- [ ] EP-M1: establish structural cases and strengthen their failure oracle.
- [ ] EP-M2: reconcile consumer guidance and record completion evidence.

## Surprises & discoveries

Task 1.2.1 already provides `Clock`, `Log`, `Projection`, and `Workflow` as
separate `.res`/`.resi` modules under
`tests/fixtures/compiler/fx-surface/base/`. Its fixture runner already checks
ReScript 12.3.1, one-line controls, exact diagnostic sites, package inventory,
and forbidden casts. The missing work is a structural case matrix, not a new
runner. Existing base compilation alone does not identify each rejection.

There is no production ReScript runner. `tests/IoEvaluation.res` is an
existing, representation-sensitive test-only FFI boundary. The new compiler
cases must not introduce a second evaluator or claim runtime conformance from an
`IO` type check. See the unresolved-requirement obligation below.

CodeGraph reindex reported three indexed files and no changed files; its graph
is insufficient evidence for the ReScript module relationships. Named-file
inspection and the Wyvern context pack supplied the missing context.

The remote branch was absent when inspected with SSH on 2026-11-09. This is not
a blocker: establish its upstream after the first push. GitHub API and SSH
identity checks both identified `leynos`.

## Decision log

- D1 (2026-11-09): extend `fx-surface/cases.json` and its existing runner.
  The same package-consumer boundary already owns these contracts; a second
  suite root would duplicate setup and diagnostic handling.
- D2 (2026-11-09): select pinned compiler fixtures plus tests of the harness.
  No new business algorithm, transition system, or universal semantic lemma is
  introduced. A proof assistant would not establish the compiler's row typing
  or diagnostic integration. The formal-proof selection is explained below.
- D3 (2026-11-09): distinguish unresolved `Fx` rejection at an `IO` input from
  execution by a future runtime. Use the same compiler runner for both positive
  and negative cases; preserve the absence of a production runner.
- D4 (2026-11-09): keep explicit projection as a capability adaptation, not a
  compatibility shim. No aliases, deprecated facades, or dual APIs are needed.

## Outcomes & retrospective

The six expert lenses reviewed the draft. Revisions replace a nonexistent
`IO.map` example with `IO.flatMap`, distinguish composition from execution,
keep incomplete projections in the consumer, tighten control metadata, and
retain separate failure logs with fail-fast commands. No implementation
milestone or new compiler case has been executed. The completed 1.2.1 task
supplies infrastructure and candidate interfaces, not evidence that the new
1.2.2 cases have passed.

Before completion, reconcile discoveries against every conformance document.
Update design/ADR evidence where warranted; do not promote all of E1, ADR 006,
or phase 1 from this requirements-only result. Record commands, case outcomes,
negative-control outcomes, limitations, and the final commit identity.

## Context and orientation

An environment is a value containing services. A requirement row describes the
fields a workflow consumes. An open row admits additional fields; a closed row
names a fixed object shape. Each service is a record; the outer capability
object is structural. `Clock.service` owns the `"clock"` key and `Log.service`
owns `"log"`. Accessors and workflows containing open rows must be functions,
so the compiler can generalize their types across `.resi` interfaces.

`src/Fx.resi` exposes opaque `Fx.t<+'a, 'e, -'r>` and
`provide: (t<'a, 'e, 'r>, 'r) => IO.t<'a, 'e>`. The requirement parameter is
contravariant because the implementation consumes its environment.
`contramapEnvironment` adapts a larger environment through an explicit
`'large => 'small` projection. Neither function is an evaluator.

`tests/compiler-fixtures.test.mjs` copies the package manifest's `files`
allowlist into an isolated consumer, links the installed toolchain, copies the
base modules, and builds each metadata case as `src/Case.res`. It checks the
base before and after the cases. `tests/support/compiler-fixture-matching.mjs`
parses diagnostics, matches one error at a named file and line, scans accepted
sources for casts, and compares one-line controls. Its only callers are the
runner and `tests/compiler-fixture-matching.test.mjs`.

`Makefile` explicitly selects test files and formatter inputs. The existing base
`*.res`/`*.resi` and case `*.res` globs already cover this plan's additions.
Syntax-broken `.res.txt` controls stay outside formatting. Fixture modules are
compiled in disposable consumers, not added to production or ordinary dev
source compilation. `scripts/package-check.mjs` independently exercises a real
archive; copying an allowlist is not the same as testing that archive.

## Conformance basis

The reviewed planning baseline is commit
`32e98547980eb708fe415602fc5b845b5d606467`. All following revision references
mean the files at that commit; record any changed premise before execution.

- [Contents](../contents.md) supplies document authority and navigation.
- [Roadmap](../roadmap.md), task 1.2.2, requires completed task 1.2.1 and the
  separate-module structural fixture matrix.
- [Terms of reference](../terms-of-reference.md), G1, G4, G6, A2, and §8.1,
  require visible requirements, ordinary composition, proportionate evidence,
  and the accepted core/toolchain boundaries.
- [Design](../design.md), §§3.2 and 10.1 (E1), defines complete and projected
  environments, rejection sites, and the explicit-projection fallback.
- [Context](../context.md), §§1, 7, and 8, separates evidence statuses and
  records sources C6/C16/C17/C20 and the Lody learning crosswalk. Prior-art
  results do not become refex conformance evidence.
- [ADR 002](../adr-002-portable-core-and-bun-boundary.md) and
  [ADR 003](../adr-003-formatting-and-analysis-policy.md) preserve portability,
  development bindings, official formatting, strict warnings, and editor-only
  analysis limits. ADR 001 preserves exact versions and generated output.
- [ADR 005](../adr-005-structural-dependency-environments.md) defines open
  function exports, key ownership, diagnostic sites, and five falsifiers.
  [ADR 008](../adr-008-first-semantic-modules-and-module-visibility.md) fixes
  the public modules and treats `public` as a declaration, not enforcement.
- [User guide](../users-guide.md), [developer guide](../developers-guide.md),
  and [repository layout](../repository-layout.md) define current behaviour,
  fixture ownership, package checks, and contribution commands.
- `Makefile`, `package.json`, `rescript.json`, `bunfig.toml`, the compiler
  suites, `scripts/check-generated.mjs`, `scripts/package-check.mjs`, and
  `.github/workflows/ci.yml` are the executable integration baseline.

Trace chains are deliberately selective:

```plaintext
G1 + A2 -> design 3.2 / ADR 005 -> EP-M1 -> SR-1, SR-2, SR-3, SR-4
G4 -> design 3.2 projection -> EP-M1 -> SR-5
G6 + E1 evidence limits -> EP-M1/EP-M2 -> SR-6, SR-7 + documentation
roadmap 1.2.2 -> EP-M2 -> recorded case matrix + done checkbox
```

Applicable skills are `execplans`, `codegraph-mcp`, `rescript-router`,
`rescript-types-and-modules`, `rescript-bun-testing`, and
`rescript-deductive-verification` for verification selection. Use
`logisphere-experts` for design review, `firecrawl-mcp` for remote research,
`en-gb-oxendict-style` for prose, and `commit-message`/`pr-creation` for
delivery. Use the installed `leta` navigation guidance where its language
support is available. No separate installed ReScript complexity,
dependency-injection, or scripting skill was found; use the repository's
documented suite ownership, small-file rules, and explicit service arguments
rather than inventing one.

## Verification plan

The abstract type contract is: a workflow requires a finite mapping from keys
to service types. Composition must retain both mappings when shared keys agree;
an incompatible shared key must reject. Provision accepts a suitable
environment and yields opaque `IO`; projection supplies the required mapping
from a larger value. These are specifications of the intended type boundary,
not independent machine-checked theorems about the compiler.

Premises are the actual opaque package interfaces, separately compiled service
interfaces, function exports, no unchecked escapes, and the pinned compiler.
The important intermediate obligations are preservation across exports,
accumulation at composition, complete discharge at provision, and preservation
through projection. Check each at its real consumer boundary before choosing a
fallback. Do not assume the desired accumulation in a manually widened type.

| ID   | Claim, premises, and boundary                                                      | Evidence now / implementation                                                                     | Acceptance, limits, and non-vacuity                                                                                                                                                         |
| ---- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SR-1 | Independent `Clock`/`Log` exports compose through `Workflow.resi`.                 | Now: interface review. EP-M1: positive compiler cases.                                            | Complete union environment compiles without casts; remove each field separately for SR-2. No runtime claim.                                                                                 |
| SR-2 | A required field cannot be omitted at `Fx.provide`.                                | Now: ADR diagnostic-site review. EP-M1: two negative/control pairs.                               | Exactly one type error at provision names the missing key; one-line repaired environments compile.                                                                                          |
| SR-3 | Incompatible types at one key cannot compose.                                      | Now: contract review. EP-M1: separate conflicting service plus negative/control pair.             | Error at composition identifies incompatible service types, not an error-channel mismatch; compatible control compiles.                                                                     |
| SR-4 | An open row accepts extra capabilities.                                            | Now: review of open signatures. EP-M1: extra-field consumer.                                      | Exact and wider environments both compile through the exported workflow; retained missing-field controls prevent acceptance by erasure.                                                     |
| SR-5 | Explicit projection supplies every required field.                                 | Now: projection contract review. EP-M1: projected positive and incomplete negative/control pair.  | Projection from named application state compiles; omission fails at projection, not later at provision. No claim about invocation timing.                                                   |
| SR-6 | Unresolved `Fx` cannot cross an `IO`-only input in the same suite.                 | Now: no-runner boundary review. EP-M1: unresolved/resolved pair. Later 1.3.1: real runtime entry. | Unresolved case reports `Fx` versus `IO`; provided control compiles. This checks a type boundary, not production execution.                                                                 |
| SR-7 | The harness reports only intended successes/rejections and executes the inventory. | Now: inspect existing oracle. EP-M1: harness tests and real compiler controls.                    | Reject empty/duplicate/malformed inventory, wrong diagnostics, syntax, warnings, unexpected acceptance, crashes and timeouts. Correct controls pass; all named cases appear in test output. |

Table 1: verification obligations and their evidence boundaries.

No contractual business logic or non-trivial semantic lemma is introduced or
selected for formal verification. The deductive-verification skill targets pure
compiled JavaScript contracts; it cannot establish ReScript compiler typing or
process/diagnostic behaviour. Accordingly there is no LemmaScript, Dafny,
Verus, Lean, solver, or new proof target in this task. This is a deliberate
method selection, not a downgrade of an implementation-proof obligation. If
implementation unexpectedly changes production semantics, stop and revisit this
selection before proceeding. Any selected future proof must cover shipped code
through a documented correspondence, pin its toolchain, audit transitive
assumptions, report each obligation, and reject proof holes and vacuous mutants.

The trusted base is ReScript 12.3.1's type checker/build system, its runtime
package, Bun 1.4.2 process and test APIs, filesystem isolation, and the
repository's matcher and metadata. Tests exercise the repository-owned parts;
they do not prove those third-party implementations. The cast scan is syntactic
review assistance, not a soundness proof. Effect, platform adapters,
scheduling, promise settlement, bounded integer arithmetic, aliasing, and
resource ownership are not exercised by these compile-only cases.

Use finite named cases, not new property tests or model checking: the scoped
claims are compiler acceptance partitions, not an input-space algorithm or
interleaving protocol. Preserve existing law and behavioural suites in
`make test`. No snapshots are needed because full compiler messages are not a
stable output API; keep semantic fragments and exact locations instead. No new
browser, process-adapter, network, or lifecycle tests are justified. The real
compiler process and existing packed-consumer gate provide the relevant
integration checks. No Gherkin files or second test framework are required.

## Plan of work and interfaces

Keep the existing `Clock.res/.resi`, `Log.res/.resi`, and `Workflow.res/.resi`
exports. Their service methods return simple values and are never executed by
compiler fixtures. Record construction inputs as deterministic fixture values,
invocation requirements as their named row keys, lifetime ownership as the test
consumer, and observation timing as outside this compile-only claim.

Add `ConflictingClock.res` and `ConflictingClock.resi` in the existing base.
Give it a genuinely incompatible service record at the same `"clock"` key,
while keeping its accessor's result and error type compatible with the normal
clock accessor. The intentional key collision is a negative witness, not a new
service-key convention. Both modules must compile independently. A case
composes them through `Fx.flatMap`; its positive control replaces only the
second accessor. Do not create the conflict by changing an error type.

Add `StructuralProjection.res/.resi` in the base if `Projection`'s existing
record-only example cannot express the new capability scenario clearly. Define
a named application-state record containing real `Clock.service`,
`Log.service`, and unrelated state. Export a function that projects to the
workflow's required capability object through `Fx.contramapEnvironment`. Both
valid and incomplete projection cases must use the same independently exported
workflow. Keep the base projection valid; place the incomplete projection in
`Case.res`, importing the separately exported application-state type and
workflow. Preserve `Projection`'s existing coverage rather than renaming
unrelated fixtures.

Add the following named cases under `tests/fixtures/compiler/fx-surface/cases/`
and register each in `cases.json`:

- `requirements-complete` and `requirements-extra`: supply both services,
  then both plus an unrelated field, through the exported workflow.
- `requirements-missing-clock` / `requirements-clock-control`, and
  `requirements-missing-log` / `requirements-log-control`: each pair changes
  exactly the provision line, retaining identical imports and declarations.
- `requirements-conflicting-clock` / `requirements-compatible-clock`:
  compose incompatible/compatible accessors, changing one expression line.
- `requirements-projected` and `requirements-incomplete-projection` with a
  dedicated `requirements-projection-control` if formatting prevents sharing
  the first positive as a one-line control. The negative changes the projection
  result; retain the same larger state and workflow.
- `requirements-unresolved` / `requirements-resolved`: pass the workflow to
  the existing `Refex.IO.flatMap` operation without/with `Refex.Fx.provide`,
  changing only its input line. Keep the success and error types identical; use
  `value => Refex.IO.succeed(value)` as the callback. The same compiler-fixture
  runner executes both. This is an IO-only composition boundary; no runtime is
  introduced. Even requirement-free `Fx` values fail here, so SR-6 alone does
  not prove requirement retention. ADR 005 falsifier 5 remains OPEN until task
  1.3.1 tests a real runtime entry.

For every rejection, capture actual pinned diagnostics after formatting before
recording the file, first line, and fragments. Do not invent expected compiler
wording from this plan. Keep each pair formatter-stable and one line apart.
Accepted cases and base modules must pass the existing no-cast scan with no new
exemptions. Retain all existing opacity and variance cases.

Strengthen the existing suite only where needed for SR-7: require nonempty
metadata, unique identifiers/files, supported kinds, valid control references,
and nonempty expected fragments. Every ordinary reject entry must name an
accept-kind control; only the existing named `wrong-reason-control` is exempt.
Reject abnormal process termination before interpreting diagnostics, preserving
exit status, signal, and complete output in the failure report. Add focused
tests beside the existing matcher tests; if a pure validator is extracted, keep
it in the existing suite-owned support module and document its two permitted
callers. Do not introduce configurable plugins or a general subprocess
framework. Keep the current 60-second process limit, teardown in
`finally`/`afterAll`, and diagnostic output on failure.

Register cases under Bun `describe`/`test` with clear Given/When/Then labels:
Given separately exported services, when a complete or wider environment is
provided, then compilation succeeds; given a missing capability, when provision
is compiled, then exactly its named type mismatch is reported. Apply the same
structure to conflict, projection, unresolved-input, and wrong-reason cases.
Additional scenario specifications use the same facilities:

- Given two separately exported requirements at `"clock"`, when the consumer
  composes incompatible service types, then exactly the composition mismatch
  fails; replacing the second accessor with the compatible control compiles.
- Given the named larger state, when a consumer projects both required fields,
  then compilation succeeds; omitting one field reports the projection mismatch.
- Given an unresolved workflow, when it is passed to `IO.flatMap`, then the
  opaque `Fx`/`IO` mismatch fails; providing its environment first compiles.
- Given a listed negative and its valid control, when syntax or a dependency
  is broken instead, then the harness fails rather than accepting the unrelated
  rejection.
- Given empty, duplicated, or malformed metadata, when the suite validates it,
  then setup fails before any successful case count can be reported.
- Given an abnormal compiler result, when its output resembles the expected
  diagnostic, then classification still fails and reports status/signal/output.

Use existing Bun assertions in the authored JavaScript harness; the compiler
inputs themselves remain ReScript.

## Milestones and plateaus

### EP-M1: executable structural requirements

Assigned obligations: SR-1 through SR-7 and the requirements part of E1. Begin
with the focused suite baseline. Use Red-Green-Refactor: add failing
harness-contract tests for malformed metadata/abnormal results before changing
the harness; capture their intended failures. For compiler-only additions, the
negative program failing with the required error is the red witness and its
one-line compiling control is green. A negative fixture is successful coverage
only when the harness verifies that failure. Do not deliberately break
production typing merely to manufacture a red test.

Within this milestone, first perform a bounded feasibility check using one
complete, one missing-field, one conflict, one projection, and one unresolved
pair in the existing disposable runner. Accept if each positive builds and each
negative has one intended diagnostic at its named site. Revise formatting or
fixture construction at most three times per case if another error occurs.
Reject the approach and escalate if valid cast-free composition fails or an
unsound consumer compiles. Do not weaken the expectation to accept a different
site or add a runtime just to satisfy the fixture.

Then complete the matrix and harness controls. Add a deliberate syntax fault,
wrong-key/wrong-site expectation, and missing dependency control to demonstrate
that each cannot satisfy a requirement mismatch. Preserve logs of each
ablation; restore the baseline and rerun the focused suite. Test abnormal
process status at the narrow result-classification seam rather than actually
killing a shared process. A crash is an infrastructure failure, never the
expected rejection.

The plateau is a green expanded suite with documented fixture ownership and no
production API change. Update the developer guide's compiler-fixture section
and repository-layout entries in this commit if new base modules/helpers need
explanation. Run the milestone gates below. Check conformance to ADR 005's
sites, the unchanged public boundary, pins, source inventory, and trace links.
Remaining gap: user-facing evidence reconciliation and roadmap completion.
Recovery: revert only this atomic commit or the current uncommitted scoped
files; rerun the original suite. No compatibility layer is needed.

### EP-M2: reconcile evidence and consumer guidance

Assigned obligations: G6, E1 evidence limits, roadmap completion, and all
matrix results. Update `docs/users-guide.md` with complete/extra/projected
examples and named rejection sites only after those examples compile. Keep
examples exercised by the existing `GuideSnippets` fixture or a focused base
module. Update `docs/design.md` §3.2 and the relevant ADR 005 evidence
paragraphs to reference committed conformance cases while preserving pending
runtime claims. Do not declare all of E1 or ADR 005's runtime-adjacent
falsifiers discharged.

Update `docs/context.md` in its existing source register only for new external
evidence/version pins, and keep its baseline description accurate. Link this
plan from `docs/contents.md`. Update the developer guide and repository layout
for any remaining internal conventions. Mark task 1.2.2 and its child checkbox
`[x]` (done) only when all scoped acceptance evidence exists. Task 1.2.3 and
phase 1 remain incomplete.

The plateau is a documented, validated implementation whose evidence matches
its claims. Reconcile all conformance documents, record the case-by-case
outcome and gate logs in this plan, then set COMPLETE. Recovery is a separate
revertible documentation commit; never claim completion if EP-M1 is reverted.
No source-API compatibility scaffolding or release is required.

## Concrete steps and gates

Run from the repository root. Check branch and worktree state before edits. The
branch must be `1-2-2-positive-and-negative-compiler-fixtures`. Install the
pinned toolchain and use `make install` if dependencies are absent. Use clean
Git authentication environments as AGENTS.md requires for dependency fetches.

Create a fresh log directory for each milestone/attempt, record its path in
this plan, and retain red/ablation logs separately from restored-baseline logs:

```bash
set -euo pipefail
REFEX_LOG_DIR=$(mktemp -d /tmp/refex-122-fba86778-XXXXXX)
export REFEX_LOG_DIR
```

Focused implementation commands, after approval:

```bash
set -euo pipefail
make build 2>&1 | tee "$REFEX_LOG_DIR/build.out"
bun test ./tests/compiler-fixture-matching.test.mjs \
  ./tests/compiler-fixtures.test.mjs 2>&1 | tee "$REFEX_LOG_DIR/fixtures.out"
```

Expected evidence is one named passing test per metadata entry, successful base
builds before and after the matrix, passing matcher controls, and the logged
suite wall clock. Record the actual count; do not substitute a green process
exit or a guessed count for the case inventory.

At each major milestone, run these sequentially, never concurrently:

```bash
set -euo pipefail
make fmt 2>&1 | tee "$REFEX_LOG_DIR/fmt.out"
make check-fmt 2>&1 | tee "$REFEX_LOG_DIR/check-fmt.out"
make lint 2>&1 | tee "$REFEX_LOG_DIR/lint.out"
make test 2>&1 | tee "$REFEX_LOG_DIR/test.out"
```

Inspect formatting changes before staging. Stage intended source and generated
production output consistently because `check-generated` compares with the Git
index. Keep generated test output ignored. Run `make all` before every commit,
even for the planning document:

```bash
set -euo pipefail
make all 2>&1 | tee "$REFEX_LOG_DIR/all.out"
```

`make all` serially runs formatting, generated-output, lint, test,
documentation, spelling, and packed-consumer gates. Delegate gates to
`scrutineer`; other agents must not run competing full gates for this
candidate. Read a failure log, fix its cause, and rerun after the fix. If a
formatter changes diagnostic line numbers, recapture the intended diagnostics
and revalidate positive controls.

`make test` already includes both JavaScript compiler suites explicitly, so new
metadata cases need no additional suite selector. Keep
`tests/makefile-contracts.test.mjs` passing if a new suite becomes necessary.
CI's `verify` job invokes `make all`; preserve that route. Existing coverage
selects generated production behaviour and excludes compiler fixtures on
purpose: `make coverage` cannot measure type-level coverage. Run it separately
at EP-M1 to preserve runtime regression evidence; run `make audit` separately
for final implementation delivery, or whenever dependencies change through an
approved deviation. No additional proof or model-checking command is proposed.

Use atomic commits: one coherent fixture/harness change with its internal docs,
then evidence/user documentation and roadmap reconciliation. Any later
refactoring belongs in a separate gated commit. Do not commit a failing red
state. Record exact commands and their terminal outcomes in Progress.

## Planning delivery and recovery

For this planning task, change only the plan, its contents link, and the source
register entry needed to record consulted external evidence. Review the plan
with the community-of-experts team, apply revisions, format, stage, and run
`make all`. Commit using the commit-message skill. Push by SSH as `leynos` and
refresh the destination tracking ref before setting the named upstream:

```bash
GIT_SSH_COMMAND=/usr/bin/ssh /usr/bin/git push \
  git@github.com:leynos/refex.git HEAD:refs/heads/1-2-2-positive-and-negative-compiler-fixtures
GIT_SSH_COMMAND=/usr/bin/ssh /usr/bin/git fetch \
  git@github.com:leynos/refex.git \
  +refs/heads/1-2-2-positive-and-negative-compiler-fixtures:refs/remotes/origin/1-2-2-positive-and-negative-compiler-fixtures
/usr/bin/git branch --set-upstream-to=origin/1-2-2-positive-and-negative-compiler-fixtures
```

Apply the clean-environment and identity checks from AGENTS.md to those
commands; the displayed commands do not replace them. Confirm remote SHA equals
HEAD with `git ls-remote`. If the remote appears concurrently, inspect its
history and preserve it; never force-push over unrelated work.

Create a draft PR titled `Plan: Add structural compiler fixtures (1.2.2)`. Use
a branch-wise link to this plan in its summary. Read back the draft status,
base/head, and complete body. End the body with `## References` and
`https://lody.ai/leynos/sessions/fba86778-bbda-48aa-81ba-fdd1b5fa30c7`. The
session ID was read using `echo ${LODY_SESSION_ID}` during planning.

After delivery, await explicit approval before EP-M1. Re-running document gates
is safe. Disposable compiler consumers are removed by the existing runner;
never broaden cleanup to unrelated `/tmp` directories. Preserve logs for failed
experiments and distinguish unavailable tooling from passed checks.

## Planning validation evidence

On 2026-11-09, `make install` with Bun 1.4.2 installed the frozen dependency
graph without changing the lockfile. `make fmt` passed; its log is
`/tmp/refex-122-fba86778-fmt-no2vQ1.out`. The exclusive gate agent then ran
`make all` to exit 0, using
`BUN=/home/leynos/.local/share/bun-versions/1.4.2/bin/bun` and a clean command
environment. The log is
`/tmp/all-refex-1-2-2-positive-and-negative-compiler-fixtures-20261109.out`.

All serial subtargets passed: formatting, generated output, lint/typecheck, 197
tests with zero failures, documentation, spelling, and package checking. The
existing compiler-fixture suite passed 18 tests in 19.2 seconds. Package
checking verified 10 archive files and isolated JavaScript and multi-module
ReScript consumers. No tracked generated or spelling files changed. These are
baseline and planning-document checks, not execution of the proposed fixtures.
Final publication requires rechecking the candidate after this evidence update.

## Revision notes

- 2026-11-09: initial draft grounded in the completed 1.2.1 interfaces and
  existing runner. Select compiler evidence, scope the missing matrix, and
  preserve the implementation-approval boundary.

- 2026-11-09: reconcile the expert panel's architecture, alternatives, types,
  reliability, performance, and maintenance reviews. Preserve the runtime-entry
  obligation as open; clarify valid projection placement, positive controls,
  Given/When/Then scenarios, fail-fast gates, and unique evidence directories.
  Implementation remains unapproved.

- 2026-11-09: record completed planning validation and exact log locations.
  No implementation milestone is discharged by the baseline test results.
