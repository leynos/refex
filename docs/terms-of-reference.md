# refex terms of reference

Status: draft v0.1 for review. Last substantive revision: 12 October 2026.
Audience: the repository owner, contributors, and technical reviewers.
Companions: [context](context.md), [technical design](design.md), and the
[documentation index](contents.md).

## 1. Background and motivation

ReScript application authors need to coordinate asynchronous operations,
supply dependencies, recover expected failures, and stop work when its owner
no longer needs it. Those concerns cross component, request, and resource
boundaries. Writing each boundary independently makes ownership and error
policy difficult to inspect together.

The initiating design discussion asks whether an effects library designed
around ReScript can make that work clearer than either ordinary promises or
bindings that expose Effect's existing programming model. This is an
engineering hypothesis, not demonstrated market demand or a claim that Effect
lacks these runtime capabilities. The edited roadmap makes three applications
the means of testing it;
[context §6](context.md#6-validation-and-roadmap-traceability) preserves
their purpose and original task identifiers.

The repository already contains a development bootstrap, not an effect system.
This document reconstructs the problem brief from the supplied design and
roadmap without treating proposed mechanisms as requirements already met.
[Context §1](context.md#1-status-and-document-authority) records that baseline.

## 2. Domain

The domain is application-level asynchronous programming in ReScript, with
React applications as the primary validation setting. Client-server behaviour
and command-line tooling provide additional boundaries against which the
library must justify its generality.

The relevant distinctions are between a computation and its execution, a
requirement and its supplied dependency, and cancellation and completed
cleanup. [Context §2](context.md#2-ubiquitous-language) defines those terms.
A type-correct program can still encounter hostile input, unavailable services,
or an external operation that does not cooperate with cancellation.

No sector-specific regulatory or contractual requirement has been supplied.
The repository's [ISC licence](../LICENSE) and existing contributor policies
remain in force; this brief does not introduce a commercial or support model.

## 3. Market context

The immediate alternatives are ordinary ReScript promises and explicit
parameters, direct use of TypeScript Effect, and
[`@reventlessdev/rescript-effect`][reventless]. The latter describes itself as
alpha ReScript bindings to Effect. Its existence removes any justification
based solely on making Effect accessible from ReScript.

[Relude][relude] and [Primavera][primavera] provide prior art for typed
computation and dependency composition. They inform the investigation; their
existence does not establish modern ReScript compatibility. React and schema
libraries already solve adjacent jobs. refex should cooperate with those
libraries rather than require an application-wide replacement of them.

The proposed gap is narrower: a consistent ReScript-facing model whose
requirements, failures, and ownership remain intelligible through public
module interfaces. If representative applications do not demonstrate that
advantage, retaining the existing alternatives is a valid outcome.

## 4. Users and stakeholders

These groups describe the supplied brief, not a completed user-research study.

| Group     | Role and interest                                             |
| --------- | ------------------------------------------------------------- |
| Primary   | ReScript developers delivering React workflows.               |
| Secondary | Authors of supporting services and command-line adapters.     |
| Reviewers | Maintainers inspecting dependencies, failures, and ownership. |
| Sponsor   | Repository owner `leynos`, who controls scope and acceptance. |
| Non-users | Teams seeking immediate stable Effect API parity.             |

Primary users need readable application code and substitutable dependencies.
They should not need to understand backend tags or scheduler internals to
review a workflow. Reviewers need explicit limits and reproducible evidence,
not an assertion that a generic type parameter makes an interface safe.

The supporting-service and tooling audience validates portability. It does not
expand the initial product into a server framework, deployment platform, or
command-line application framework.

## 5. Jobs to be done

When a React interaction launches asynchronous work, an application developer
wants to understand which work remains relevant and which dependencies it
needs, so that replacement, failure, and unmounting do not leave stale results
or unowned activity.

When a workflow crosses a service boundary, its author wants to distinguish
invalid input, expected domain failure, and unexpected execution failure, so
that recovery policy reflects the actual outcome rather than exception text.

When a maintainer changes a dependency or execution mechanism, they want to
replay representative behaviours and inspect the resulting evidence, so that a
simpler interface does not conceal weaker guarantees.

These are functional jobs. No evidence supports additional emotional personas,
adoption forecasts, or claims about how users wish others to perceive them.

## 6. Scope

### 6.1. Goals

- **G1: visible requirements.** Application authors can identify and satisfy a
  workflow's dependencies through its ReScript interface; omitted or wrongly
  typed requirements fail compilation at the supported boundary.
- **G2: inspectable outcomes.** Expected failures remain typed and recoverable
  without treating unexpected failures or cancellation as ordinary business
  errors.
- **G3: accountable lifetimes.** Operations report who owns ongoing work and
  acquired resources, including what cancellation does and does not stop.
- **G4: usable composition.** Authors can express mapping and sequencing using
  ordinary ReScript conventions without reproducing backend-specific wiring.
- **G5: credible validation.** The same model serves the animated Minesweeper
  solver, the nine-room client-server roguelike, and the `css-view`
  reimplementation without validator-specific core escape hatches.
- **G6: proportionate adoption.** Document the additional code, dependencies,
  build cost, and runtime cost so maintainers can decide whether refex earns
  its abstraction cost.

### 6.2. Non-goals

- Full Effect API parity is outside the initial scope. Developers needing that
  surface should evaluate Effect or existing bindings directly.
- A replacement schema language or standard library is outside scope. The
  supplied brief selects `rescript-schema` for boundary validation.
- A React state-management framework, query cache, or rendering model is outside
  scope. Existing React facilities and adjacent libraries retain those jobs.
- A general server, database, or command-line framework is outside scope. The
  roguelike and `css-view` exercise application boundaries, not new platforms.
- A native scheduler, transparent monadic `await`, general streaming,
  transactional memory, and automatic dependency-graph memoization remain
  deferred experiments rather than initial requirements.
- Prevention of every side effect, cancellation of arbitrary foreign work, and
  static proof of every resource lifetime are not promises of this library.
- Publishing a stable package, promising compatibility, and changing repository
  visibility or release permissions are outside this documentation change.

## 7. Success criteria

### 7.1. User-facing outcomes

G1 succeeds when separate-module consumer examples accept correctly supplied
requirements and reject omitted or incompatible ones for the intended reason.
G2 succeeds when each validator distinguishes expected failure, defect, and
interruption without unsafe application-level casts.

G3 succeeds when the validators record acquisition, ownership transfer,
cancellation, and release, and the documented lifecycle invariants hold over
the selected failure matrix. Observable termination must not conceal a live
owned resource or an abandoned child operation.

G4 and G5 succeed when all three applications run through one supported public
model and representative workflows demonstrate a reviewable advantage over
existing approaches. The comparison must record counterexamples and cases
where ordinary pure code remains preferable.

### 7.2. Operational outcomes

G6 requires reproducible bundle, execution, and build measurements with pinned
tools, representative inputs, and equivalent semantics. Numerical acceptance
budgets remain open; the project must set them before reviewing experiment
results. No result in this document claims that those budgets have passed.

A contributor must be able to identify which checks ran, what they covered,
and which platform or lifecycle behaviours they did not establish. A green
bootstrap test is not product-conformance evidence.

### 7.3. Strategic outcome

The owner can make an evidence-backed continue, narrow, or stop decision after
the three validators. No download, revenue, or adoption target has been agreed.
A documented decision to keep direct bindings instead of refex can satisfy the
investigation even though it does not produce a new stable library.

## 8. Constraints and assumptions

### 8.1. Hard constraints

The supplied brief fixes ReScript as the application language, React for both
game clients, the three named validators, and `rescript-schema` as the schema
starting point. Those are product constraints, not claims of interoperability
already proved.

The accepted bootstrap ADRs keep the core portable, maintain explicit public
interfaces, and separate development bindings from production source. Their
current packaging and toolchain rules continue to apply until an explicit
change supersedes them. The project makes no calendar commitments here.

### 8.2. Assumptions

- **A1:** ReScript-native composition materially improves reviewability. If
  comparisons fail to show that, narrow the library or retain existing tools.
- **A2:** Dependency and error relationships survive explicit interfaces. If
  inference fails, prefer a sound explicit interface over unchecked erasure.
- **A3:** Existing execution machinery can meet the required lifecycle
  contract. If the adapter fails, reduce the promised surface or reconsider
  the backend before building more applications on it.
- **A4:** The selected schema release fits browser deployment constraints. If
  that fails, record the incompatibility and seek a scoped decision rather
  than weakening deployment policy silently.
- **A5:** The three validators expose enough distinct failure boundaries to
  justify an initial API. They do not establish arbitrary application safety.

### 8.3. Dependencies

The compiler and React lifecycle contract constrain the programming surface.
Effect and its bindings are candidate execution dependencies, not installed
runtime choices. Schema integration requires a checked package/API version.
The existing `css-view` implementation and fixtures supply a behavioural
reference whose revision must remain explicit.

The repository owner accepts product scope. No external team delivery,
commercial deadline, or assigned implementation owner has been supplied.

## 9. Open questions

**Q1: Who beyond the initial validators needs this library?** Wider adoption
claims require evidence from additional consumers. The repository owner can
resolve this after reviewing the validator results; it does not block the
initial investigation.

**Q2: Which performance and ergonomics budgets define acceptance?** Before
comparative measurements, the owner must approve representative workflows,
reporting methods, and numerical budgets. Retrospective thresholds do not close
this question.

**Q3: Which browser and schema deployment restrictions apply?** Confirm the
schema package, content-security-policy requirements, and supported browser
matrix before publishing compatibility claims. The technical design records
this dependency explicitly.

**Q4: What cancellation contract can direct style offer?** Compiler evidence
and cancellation traces must demonstrate it before direct style becomes a
supported interface. An uncooperative promise is a boundary, not a test to omit.

**Q5: What publication and maintenance commitment is acceptable?** The owner
must decide compatibility, dependency upgrades, licensing notices, and release
criteria before removing the private-package restriction. No release action
follows from accepting these documents alone.

## 10. Handoff

The problem brief is sufficient for the proposed technical design while the
open questions remain visible. [Context](context.md) supplies the shared
vocabulary and source register;
[design §12](design.md#12-open-decisions-and-adoption) records implementation
decisions that need evidence or an architectural
decision record rather than assumed acceptance.

The original roadmap's task identifiers remain planning references, not
completion claims. This documentation supplies the design brief for (1.1.1)
without claiming to complete the compiler or runtime experiments that follow.

## References

Sources accessed on 12 October 2026.
The [source register](context.md#7-source-register) records provenance and the
distinction between supplied intent and inspected implementation.

- [Reventless Effect bindings][reventless]: direct alternative.
- [Relude][relude]: prior art, not a compatibility claim.
- [Primavera][primavera]: prior art for dependency composition.
- [Bootstrap decisions](adr-001-repository-bootstrap.md),
  [portable boundary](adr-002-portable-core-and-bun-boundary.md), and
  [analysis policy](adr-003-formatting-and-analysis-policy.md): accepted scope.

[reventless]: https://www.npmjs.com/package/@reventlessdev/rescript-effect
[relude]: https://github.com/reazen/relude
[primavera]: https://github.com/cargocut/primavera
