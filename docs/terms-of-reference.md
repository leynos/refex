# refex terms of reference

Status: draft v0.2 for review. Last substantive revision: 12 October 2026.
Audience: the repository owner, contributors, and technical reviewers.
Companions:
[context](context.md), [technical design](design.md), [GIST roadmap](roadmap.md),
and the [documentation index](contents.md).

## 1. Background and motivation

ReScript application authors need to coordinate asynchronous operations, supply
dependencies, recover expected failures, and stop work when its owner no longer
needs it. Those concerns cross component, request, and resource boundaries.
Writing each boundary independently makes ownership and error policy difficult
to inspect together.

The initiating design discussion asks whether an effects library designed
around ReScript can make that work clearer than either ordinary promises or
bindings that expose Effect's existing programming model. This is an
engineering hypothesis, not demonstrated market demand or a claim that Effect
lacks these runtime capabilities. The [roadmap](roadmap.md) uses three
applications to test it and preserves the supplied edited task identifiers.

The supplied Lody learning note adds a specific pressure: a computation can
stop waiting or finish finalization without establishing that its external work
stopped or its resource became safe to reuse. Lody's documented process and
file-lock corrections motivate requirements for complete failures, confirmed
handoff, and retained recovery responsibility. They do not establish refex
correctness. [Context §7](context.md#7-source-register) records the
version-specific sources and their verification limits.

The repository contains a development bootstrap, not an effect system. This
brief reconstructs the problem from supplied design material and evidence;
proposed mechanisms are not requirements already met.

## 2. Domain

The domain is application-level asynchronous programming in ReScript, with
React applications as the primary validation setting. Client-server behaviour
and command-line tooling provide additional boundaries against which the
library must justify its generality.

Distinguish descriptions from executions, requirements from supplied services,
local cancellation from external termination, and cleanup attempts from
confirmed release. [Context §2](context.md#2-ubiquitous-language) defines these
terms. A type-correct program can encounter hostile input, unavailable
services, or an external operation that ignores cancellation.

No sector-specific regulatory or contractual requirement has been supplied. The
repository's [ISC licence](../LICENSE) and contributor policies remain in
force; this brief introduces no commercial or support model.

## 3. Market context

The immediate alternatives are ordinary ReScript promises and explicit
parameters, direct use of TypeScript Effect, and
[`@reventlessdev/rescript-effect`][reventless]. Existing bindings remove any
justification based solely on making Effect accessible from ReScript.

[Relude][relude] and [Primavera][primavera] provide prior art for computation
and dependency composition, not proof of modern ReScript compatibility. React
and schema libraries solve adjacent jobs. refex should cooperate with these
libraries rather than require their application-wide replacement.

Lody supplies lifecycle case studies, not a competing library or a blueprint to
copy wholesale. Its PR #1452 changes documentation and guidance; supporting
implementation notes record narrower process and file-lock fixes. Neither a
merged documentation PR nor selected upstream probes prove a completed
application migration. See
[context §5](context.md#5-prior-art-and-corrected-assumptions).

The proposed gap is a consistent ReScript-facing model whose requirements,
complete outcomes, and continuing ownership remain intelligible through public
interfaces. If representative applications do not demonstrate that advantage,
retaining existing alternatives is a valid outcome.

## 4. Users and stakeholders

These groups describe the brief, not a completed user-research study.

| Group     | Role and interest                                                 |
| --------- | ----------------------------------------------------------------- |
| Primary   | ReScript developers delivering React workflows.                   |
| Secondary | Authors of supporting services and command-line adapters.         |
| Reviewers | Maintainers inspecting failures, handoff, and recovery ownership. |
| Sponsor   | Repository owner `leynos`, who controls scope and acceptance.     |
| Non-users | Teams seeking immediate stable Effect API parity.                 |

Primary users need readable application code and substitutable dependencies.
They should not need backend tags or scheduler internals to review a workflow.
Reviewers need explicit limits and reproducible evidence, not an assertion that
a generic parameter or a primitive's name proves safety.

The supporting-service and tooling audience validates portability. It does not
expand the product into a server framework, deployment platform, or CLI
framework.

## 5. Jobs to be done

When a React interaction launches asynchronous work, an application developer
wants to identify which work remains relevant and who owns it, so replacement,
failure, and unmounting leave neither stale results nor abandoned activity.

When several consumers share work, an author wants to withdraw one consumer's
interest without disrupting the others, so consumer lifetime does not silently
become producer lifetime.

When a workflow or its cleanup fails, its owner wants to inspect every relevant
failure and determine who still holds recovery responsibility, so catching or
logging an error does not silently abandon a live resource.

When a resource name is about to be reused, an adapter author wants evidence
that the previous generation permits handoff, so delayed old work cannot
corrupt its successor.

When a maintainer changes an execution mechanism, they want to replay
representative behaviours and inspect the evidence, so a simpler interface does
not conceal weaker guarantees or changed observation timing.

These are functional jobs. No evidence supports additional emotional personas,
adoption forecasts, or claims about how users wish others to perceive them.

## 6. Scope

### 6.1. Goals

- **G1: visible requirements.** Authors can identify and satisfy a workflow's
  dependencies through its ReScript interface; unsupported omissions and
  mismatches fail compilation at the documented boundary.
- **G2: inspectable outcomes.** Expected errors remain typed, while transforms
  and boundary conversions preserve simultaneous defects, interruption, and
  release failures. Reporting body success must not conceal failed cleanup.
- **G3: accountable lifetimes.** Authors can distinguish stopping a wait,
  joining managed interruption, and confirming external termination. Failed
  release retains an identifiable owner until confirmed release or an explicit
  transfer; discarding a diagnostic does not discard that responsibility.
- **G4: usable composition.** Mapping, sequencing, and dependency substitution
  follow ReScript conventions without imposing effects on pure calculations or
  silently changing snapshot-versus-live observation semantics.
- **G5: credible validation.** The shared-producer experiment and the three
  applications challenge one model without validator-specific core escapes.
- **G6: proportionate adoption.** Record code, dependency, build, and runtime
  costs separately from specified, implemented, consumer-exercised, and
  interpreter/platform-verified behaviour.

### 6.2. Non-goals

- Full Effect API parity is outside initial scope; evaluate Effect or its
  bindings for that surface.
- A replacement schema language or standard library is outside scope. The
  brief selects `rescript-schema` as the schema starting point.
- A React state framework, query cache, or rendering model is outside scope.
  Shared-producer lifecycle experiments do not authorize a caching framework.
- A general server, database, lock manager, process supervisor, or CLI framework
  is outside scope. The validators exercise boundaries, not new platforms.
- A native scheduler, transparent monadic `await`, general streaming,
  transactional memory, and graph memoization remain deferred experiments.
- Static proof of every lifetime and forced cancellation of arbitrary foreign
  work are not promises. Neither are guaranteed FIFO admission for every
  primitive, cross-process atomicity, crash recovery, or remote rollback.
- Copying Lody's service classes, architecture tiers, full migration ledger,
  or agent-policy machinery is outside scope. Review and debugging do not
  authorize unrelated migrations.
- Publication, compatibility commitments, visibility changes, and release
  permissions remain outside this documentation change.

## 7. Success criteria

### 7.1. User-facing outcomes

G1 requires separate-module examples that accept complete environments and
reject omitted or incompatible capabilities for the intended diagnostic. G2
requires full failures to survive mapping, recovery, and JavaScript boundaries,
including failed acquisition followed by failed release.

G3 requires observable answers to five questions for each lifecycle: trigger,
owner, cancellation, handoff, and failure recovery. Concurrent close callers
must observe one in-progress attempt. An unresolved attempt must not masquerade
as successful release or authorize unsafe replacement. A retained owner must
remain recoverable when the caller drops the failure value.

The first end-to-end semantic experiment has two consumers, one shared
producer, a cancelled local waiter, delayed cleanup, and a failing release.
Observable resource state, not only returned values, decides its outcome. The
animated Minesweeper solver, nine-room roguelike, and `css-view` then challenge
the same contracts through React, network, browser, and subprocess boundaries.

G4 and G5 require a reviewable advantage over existing approaches. Comparisons
must include pure-code counterexamples, observation timing, scope placement,
and any weaker contract rather than counting lines alone.

### 7.2. Operational outcomes

G6 requires reproducible measurements with pinned tools, representative inputs,
and equivalent semantics. Numerical budgets remain open and must precede
comparative results. No budget has passed through this documentation change.

Evidence records distinguish specification, implementation, exercised consumer
path, and verified interpreter/platform. They retain revision, readiness,
commands, resulting state, negative controls, and untested limits. A local
simulation is not real-boundary evidence; a green bootstrap is not conformance.

When external work ignores cancellation indefinitely, the product must not
promise bounded return, confirmed termination, and immediate safe reuse
simultaneously. It must report the unresolved obligation and its owner.

### 7.3. Strategic outcome

The owner can make an evidence-backed continue, narrow, or stop decision. No
download, revenue, or adoption target has been agreed. Keeping direct bindings
can satisfy the investigation without producing a stable library.

## 8. Constraints and assumptions

### 8.1. Hard constraints

The brief fixes ReScript, React for both game clients, the named validators, and
`rescript-schema` as the schema starting point. These are constraints, not
interoperability results.

Accepted bootstrap ADRs keep core source portable, maintain explicit public
interfaces, and separate development bindings from production. Their packaging
and toolchain rules remain in force until a reviewed decision changes them. No
calendar commitment follows from this brief.

Retained ownership must not require platform calls in the portable core.
Platform adapters establish their own release predicates. Process-tree absence,
drained output, detached sessions, and remote rollback are distinct
observations; one must not serve as evidence for another without a contract.

### 8.2. Assumptions

- **A1:** ReScript-native composition improves reviewability. If comparison
  rejects that, narrow the library or retain existing tools.
- **A2:** Dependency/error relationships survive interfaces. Otherwise prefer
  explicit projection and injection over unchecked erasure.
- **A3:** Existing execution machinery can meet refex's contracts. If the
  selected adapter fails conformance, revise it or narrow its promise; do not
  change the requirement merely to match an upstream primitive.
- **A4:** The schema release fits browser deployment constraints. Otherwise
  request a scoped decision rather than weaken deployment policy silently.
- **A5:** The validators expose enough boundaries for an initial API, not
  arbitrary application safety.
- **A6:** A live host owner can retain unresolved cleanup. If the host ends,
  in-memory retention alone cannot discharge or recover that obligation.

### 8.3. Dependencies

Compiler and React host contracts constrain the surface. Effect and Reventless
are candidate execution dependencies, not installed choices. Codec work needs a
checked package/API. `css-view` supplies a pinned behavioural reference. Lody
supplies version-specific evidence that must not become an implicit requirement
to adopt its Effect version or architecture.

The repository owner accepts scope. No external team delivery, commercial
deadline, or assigned implementation owner has been supplied.

## 9. Open questions

**Q1: Who beyond the validators needs refex?** Additional consumers must
support wider adoption claims; this does not block the initial investigation.

**Q2: Which budgets define acceptance?** The owner must approve workloads,
reporting, and numerical budgets before comparative measurement.

**Q3: Which browser/schema deployment restrictions apply?** Resolve the schema
package, content-security policy, and browser matrix before compatibility
claims.

**Q4: What cancellation contract can direct style offer?** Require compiler and
lifecycle evidence, including uncooperative raw work and mixed failures.

**Q5: What publication commitment is acceptable?** The owner must decide
compatibility, upgrades, licences, and maintenance before any release change.

**Q6: Who retains unresolved work at the outermost boundary?** Decide the
host's retention, inspection, retry, transfer, and force-exit policy. Require
an experiment showing that ignoring a diagnostic does not lose a recovery
owner; record separately what cannot survive process exit.

**Q7: What permits resource replacement?** Each adapter must name its release
predicate, identity/generation guarantees, and any cross-process limits.
Evidence of a finished wrapper alone cannot resolve this question.

Implementation owners remain unassigned. The owner accepts decisions through
review; the [design](design.md#12-open-decisions-and-adoption) specifies the
experiments that can close these questions.

## 10. Handoff

This brief supports experimental design with open questions visible.
[Context](context.md) owns vocabulary and source provenance;
[design](design.md) owns proposed mechanisms; the [roadmap](roadmap.md) owns
GIST delivery tasks. Existing task identifiers remain stable and unchecked.
Documentation supplies intent, not evidence that semantic tasks have passed.

## References

Sources accessed or supplied on 12 October 2026. The
[source register](context.md#7-source-register) distinguishes supplied intent,
inspected documents, and unperformed experiments.

- [Reventless bindings][reventless], [Relude][relude], and
  [Primavera][primavera]: alternatives and prior art.
- [Lody PR #1452][lody-pr]: documentation/guidance revision and stated limits.
- [Lody evidence record](context.md#8-lody-learning-crosswalk): pinned notes
  supporting the additional lifecycle requirements.
- [Bootstrap](adr-001-repository-bootstrap.md),
  [portable boundary](adr-002-portable-core-and-bun-boundary.md), and
  [analysis policy](adr-003-formatting-and-analysis-policy.md): accepted scope.

[reventless]: https://www.npmjs.com/package/@reventlessdev/rescript-effect
[relude]: https://github.com/reazen/relude
[primavera]: https://github.com/cargocut/primavera
[lody-pr]: https://github.com/LodyAI/Lody/pull/1452
