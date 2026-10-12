# refex context

Status: draft v0.2 vocabulary and provenance record. Last substantive revision:
12 October 2026. Audience: contributors, reviewers, and agents working on
refex. Companions:
[terms of reference](terms-of-reference.md), [technical design](design.md), [roadmap](roadmap.md),
and [contents](contents.md).

## 1. Status and document authority

The inspected implementation baseline is
`aa3c0f71816b84da95765616589f38a075b2f26c`. It contains a private `0.0.0`
package and disposable `Bootstrap.identity`, not an effects API. Draft PR #7 at
`569f1b0f1d3d93983df71dd0f00951dbd4e8230a` adds product documents but no
semantic implementation. [Package metadata](../package.json), the
[source interface](../src/Bootstrap.resi), and [user guide](users-guide.md)
describe the implemented state.

Use these evidence labels:

- **Established:** an explicit requirement or an inspected implementation fact.
- **Proposed:** a design choice awaiting implementation and review.
- **Unvalidated:** a claim whose named experiment has not supplied evidence.
- **Deferred:** work outside the initial supported scope.
- **Open:** neither an accepted decision nor sufficient evidence exists.

The terms of reference owns the problem and scope. Context owns vocabulary and
provenance. Design owns mechanisms and experiments. The GIST roadmap owns
execution tasks. Accepted bootstrap ADRs retain their scope; draft product
choices do not silently supersede them. Guides describe what runs today.

This revision materializes the user's edited roadmap as `docs/roadmap.md`,
retaining its six phases and original task identifiers. It integrates new
criteria and appends tasks within their existing workstreams. No checkbox
becomes complete merely because documentation now describes the work.

## 2. Ubiquitous language

### 2.1. Computations and requirements

**Effect description:** a value describing work. A constructor must say whether
it defers a callback or accepts an already evaluated value.

**Execution:** one interpretation under an owner and supplied capabilities.
Reusing a description does not imply reusing an execution.

**IO:** the proposed dependency-free computation. It can contain pure values,
but absence of open requirements does not prove purity.

**Fx:** the proposed environment-dependent computation, parameterized by
success, expected error, and required environment.

**Reader:** a computation receiving an environment. Reader does not itself
provide cancellation, finalization, or dependency lifetime guarantees.

**Capability:** an explicitly supplied service or operation. Object fields can
carry authority but do not constitute a security sandbox.

**Environment:** the value supplying workflow capabilities, not necessarily
process environment variables or React context.

**Requirement:** a type-level obligation on that environment. A missing service
differs from a supplied service that fails during execution.

**Open operation:** a workflow requesting capabilities on execution. **Bound
service:** a service capturing construction dependencies. Replacing an outer
field does not rebuild that captured service.

**Construction input:** what builds a service. **Invocation requirement:** what
one method requests when run. Neither names the resulting service's owner.

**Snapshot input:** a value observed at construction or another stated instant.
**Live provider:** an operation observing its source at each stated invocation.
Substituting one for the other changes behaviour even if types stay compatible.

**Provision:** supplying an environment or its constructor while preserving
construction failures and remaining requirements.

**Projection:** a checked function from a larger environment to a smaller one.
It is an intentional interface, not permission to erase requirements.

### 2.2. Ownership and outcomes

**Owner:** the live party accountable for work, resources, and unresolved
cleanup. **Scope:** an admission/lifetime boundary that records finalizers. A
closed scope need not imply confirmed external release.

**Resource:** an acquisition recipe retaining release obligations, not merely
its handle. **Layer:** a dependency-aware resource constructor, not a global
service locator.

**Producer:** work supplying results to consumers. **Waiter:** a local observer
of progress or completion. **Lease:** a recorded interest or ownership claim
whose release follows the producer's explicit policy.

**Sharing:** reuse of one allocation within a lifetime. **Memoization:** reuse
of a recorded result under a key/scope. Recipe reuse alone promises neither.

**Fibre:** managed execution with an outcome and owner, not necessarily an OS
thread. Public identifiers may use `Fiber`; prose uses 'fibre'.

**Stop waiting:** withdraw one observer or admission claim without asserting
producer cancellation. **Interrupt and join:** request managed interruption and
observe termination plus applicable finalizer attempts. **Confirm external
termination:** establish the adapter's stated external predicate. These are
three different contracts.

**Finalization:** executing registered cleanup. **Close attempt:** one joined
execution of cleanup obligations. **Release receipt:** confirmation of a named
release predicate for a particular generation, not simply a timeout or ended
fibre. **Recovery attempt:** explicit work on an unresolved obligation,
distinct from repeating a completed `Scope.close`.

**Generation:** one resource incarnation. A key, path, session name, or numeric
process identifier is not a generation. **Handoff:** permission for a successor
under a confirmed release or verified isolation contract.

**Unresolved:** release is unconfirmed and a live owner retains responsibility.
**Recovery reference:** a way to inspect or request recovery, not the sole
owner stored inside a disposable error. **Transfer:** an acknowledged move of
that responsibility between live owners.

**Quiescence:** no remaining work or cleanup in the stated observation domain.
Local waiter termination, a scope attempt ending, and global quiescence differ.
A transfer must state which domain remains active.

**Expected failure:** a value in the domain's declared error channel.
**Defect:** unexpected execution failure. **Release issue:** failure to
establish an external release condition; it is not automatically a programmer
defect. **Exit:** complete terminal execution outcome. **Cause:** information
retaining all relevant reasons and their meaningful sequential/parallel
structure.

**Infallible:** no inhabitant in the expected-error channel, not immunity to
interruption, defects, or failed release.

### 2.3. Integration and evidence

**Direct:** experimental native `async`/`await` with a typed scope. It is
neither transparent monadic await nor an accepted API.

**React Effect:** React's setup/cleanup mechanism, distinct from Effect-library
or refex computations. React cleanup does not join asynchronous disposal.

**Schema boundary:** checking external values before domain use. Decoding alone
is not authorization or validation of all domain invariants.

**Admission:** permission to start. **Mutual exclusion:** at most the stated
number of holders. **Fairness:** an ordering/progress policy beyond exclusion.
**FIFO:** first-in-first-out ordering, promised only when explicitly
established.

**Publication:** making prepared state observable. A new suspension point can
change what observers see; synchronous JavaScript is not cross-process
atomicity.

**Validator:** an application that challenges claims, not just a demonstration.
**Oracle:** an independent behavioural reference that can itself contain bugs.

**Ablation:** temporarily removing a coordination mechanism to check that its
behavioural acceptance detects the loss, then restoring the baseline.

**Evidence record:** claim, revisions, inputs, readiness, command,
observations, resulting state, negative control, limits, and decision. A green
exit without executed scenarios is not evidence for their contracts.

## 3. Relationships that must remain explicit

An environment can satisfy a database requirement without establishing that
captured handles remain live. A scope can run finalizers without establishing
foreign termination. A typed error can describe failure without owning
recovery. Each claim needs its own contract and evidence.

A component can own a local request or merely subscribe to an application
producer. Unmounting must not terminate unrelated readers. A client stopping
its wait does not roll back an accepted server command.

Construction inputs, invocation requirements, and service ownership are three
axes. Snapshot/live observation is a fourth relevant choice. Ordinary inputs
and pure helpers do not need services merely to fit an effects architecture.

Provision differs from serialization: the roguelike sends checked values, not
closures, environments, fibres, or runtime objects. Each side owns local
executions; committed server mutations have a separate reconciliation policy.

A pending external cleanup operation remains the same attempt when its waiter
times out. Joining it later is not reissuing deletion against a reusable name.
In-memory generation bookkeeping does not establish kernel identity, external
atomicity, crash recovery, or protection against non-cooperating actors.

## 4. Established constraints and proposed choices

The brief establishes ReScript-first ergonomics, React for both game clients,
`rescript-schema` as the schema starting point, and three validators.
[ADR 002](adr-002-portable-core-and-bun-boundary.md) keeps core source portable
and Bun development-only. [ADR 003](adr-003-formatting-and-analysis-policy.md)
sets formatting/analysis policy. These decisions remain unchanged.

Reader/IO, structural requirements, scoped layers, and private Effect execution
are proposed mechanisms. Open rows must survive `.resi` tests. Direct FFI
versus Reventless is an experiment, not an installed dependency selection.

Joined closure, generation-safe handoff, cause-preserving conversion, and an
owner independent of diagnostic reachability are proposed refex contracts. The
last is deliberately stronger than Lody's caller-held process recovery lease.
Its implementation location remains open; no root registry exists here.

Transparent await, graph memoization, streams, transactional memory, query
caching, and a native runtime remain deferred. The shared-producer experiment
requires no general cache, lock manager, or process framework. No measured
budget, compatibility promise, or production commitment has been established.

## 5. Prior art and corrected assumptions

[Relude RIO][rio] supplies Reader/IO and environment adaptation.
[Primavera][primavera] combines Reader with OCaml objects. Neither proves
identical ReScript inference or lifetime rules.

[Reventless][reventless] supplies an alternative and candidate private
bindings. Audit a selected package, not claims about maturity inferred from
module count. [Effect scope documentation][effect-scope] is a reference, not
proof that a wrapper or another version meets refex's closure contract.

[ReScript await][await] is promise-specific. [React useEffect][react] specifies
setup/cleanup and a development Strict Mode cycle. These motivate boundary
experiments, not generic monadic syntax or awaited React disposal.

The upstream schema project uses [Sury][sury]; the brief retains
`rescript-schema` until a package/API decision. Its deployment caveat about
dynamic evaluation still needs checking against the selected release and
browser policy. This lifecycle update does not resolve that earlier question.

Lody's [guide][lody-guide] reports for its pinned Effect 4.0.2 that a repeated
scope close does not join the first, keyed fibre replacement need not await old
finalizers, mixed-cause error mapping can lose other reasons, and `runPromise`
already squashes causes. These statements are attributed, version-specific
evidence, not refex results or universal Effect behaviour.

No inspected source establishes that refex is faster, safer overall, smaller,
or easier than direct bindings. Comparison remains an experiment.

## 6. Validation and roadmap traceability

[The roadmap](roadmap.md) is the repository-local continuation of the edited
GIST plan. Existing IDs remain stable; new IDs append to their workstreams. All
task boxes remain unchecked. [Design §10](design.md#10-experimental-validation)
defines E1-E9 and their limits.

### 6.1. Foundation and Minesweeper

Existing (1.1.1)-(1.4.2) retain their intent, with stronger outcomes/ownership
criteria. New (1.1.5) records the five-question contract; (1.3.4)-(1.3.5)
deliver the two-consumer lifecycle slice and its end-to-end acceptance. This
adds behaviour, not an upstream primitive catalogue.

Existing (2.1.1)-(2.3.2) retain animated solver and direct-style comparison.
New (2.2.3) supplies two views sharing a producer; (2.3.3) challenges their
combined React lifecycle. Hidden mine positions remain out of solver inputs; no
justified deduction is a valid result. Ordinary React state remains ordinary.

### 6.2. Nine-room client-server roguelike

Existing (3.1.1)-(3.4.2) retain nine rooms, a React client, authoritative
server, checked protocol, and replaceable services. Expanded criteria cover
queued cancellation, observation timing, shared/fresh instances, and ambiguous
writes. They do not authorize durable storage or a multiplayer platform.

### 6.3. Reimplementing css-view

Existing (4.1.1)-(4.5.2) retain CLI parity against the pinned oracle and now
explicitly separate external release from wrapper completion. Readiness,
complete failures, delayed cleanup, safe replacement, original-operation joins,
and borrowed sessions belong in those existing workstreams.

The [existing guide][css-guide] supplies backend/mode, fixture, active-page,
and transient-open contracts. Record browser/source pins and normalize only
documented volatile fields. Adjudicate oracle mismatches rather than erase
them. The original `css-view` repository remains unchanged.

### 6.4. Convergence and deferred scope

Existing (5.1.1)-(5.3.2) retain evidence-driven API reduction and comparison.
New (5.1.3) keeps delivery state separate from interpreter/platform
verification without copying Lody's application ledger. Existing
(6.1.1)-(6.5.1) stay deferred and gain conformance prerequisites, not automatic
promotion into core scope.

## 7. Source register

Sources inspected or supplied on 12 October 2026:

- **C1:** supplied design discussion and the user's edited GIST roadmap,
  retained in [roadmap.md](roadmap.md). These establish intent, not behaviour.
- **C2:** refex implementation commit
  `aa3c0f71816b84da95765616589f38a075b2f26c` and draft documentation commit
  `569f1b0f1d3d93983df71dd0f00951dbd4e8230a`.
- **C3:** [df12 documentation skills][skills], including roadmap-doc,
  roadmap-grooming, terms-of-reference-doc, tech-design-doc, df12-readme, and
  pr-creation. These guide document structure, not runtime semantics.
- **C4:** [Relude RIO][rio] and [Primavera][primavera], compatibility
  unverified.
- **C5:** [Reventless][reventless] and [Effect scope][effect-scope], no latest
  version, selected dependency, or soundness claim.
- **C6:** [ReScript await][await], [objects][objects], and [React][react].
- **C7:** [Sury][sury]; package and deployment questions remain open.
- **C8:** `css-view` at `305bd947bdb063d3b93785186f2d0bc33d0a5ea3`, including
  its [developer guide][css-guide].
- **C9:** supplied `Pasted text(20261012-120214).txt`, the Refex/Lody learning
  note. It supplies recommendations, explicitly not rerun experiments.
- **C10:** [Lody PR #1452][lody-pr], merged 11 October 2026; inspected head
  `d8b3fd5bd19c632a7ad34b85fc9b26c2363c45d5`, merge
  `987962e77022df6a800f4e889f124b51f6eb8056`. The change is documentation and
  guidance. The [probe note][lody-probes] reports five selected Effect 4.0.2
  probes on Node 22.22.0, not Lody integration, platform, or production proof.
- **C11:** [Lody process-release note][lody-process] at that head, describing
  earlier #1379 corrections, cause preservation, and caller-held recovery. Its
  tests and platform limitations are separate from #1452's probes.
- **C12:** [Lody file-lock note][lody-lock] at that head, describing earlier
  #1377 corrections, admission, publication, and retained pending cleanup.
  Linux evidence does not establish unsupported filesystems or real Windows.

## 8. Lody learning crosswalk

This crosswalk separates source observations from refex proposals. Neither the
supplied note nor inspected Lody documentation is a refex test result.

| Source learning                                  | refex response                                          | Delivery/evidence           |
| ------------------------------------------------ | ------------------------------------------------------- | --------------------------- |
| Five lifecycle questions                         | Define contracts before selecting primitives.           | (1.1.5), design §2.4.       |
| Wait cancellation differs from raw termination   | Classify adapters and retain raw-work ownership.        | (1.3.2), (1.4.2), E3/E5/E9. |
| Repeated close/replacement may not join          | Shared attempt receipt and explicit successor gate.     | (1.3.3)-(1.3.5), E9.        |
| Failed release can appear successful             | Expose lifecycle failure and retained recovery owner.   | (1.3.1), (4.5.1), E3/E7/E9. |
| Mixed-cause mapping/projection loses reasons     | Map leaves; restrict recovery rather than erase causes. | (1.2.3), (1.3.1), E1/E9.    |
| Pending unlink outlives its waiter               | Join original work; protect unresolved generations.     | (1.3.4), (4.2.1), E9/E7.    |
| Semaphore did not establish strict FIFO          | Separate fairness, re-entry, and exclusion contracts.   | (3.2.2), (3.4.2), E6.       |
| Async publication exposed incomplete state       | Specify preparation, publication, and observation.      | (1.3.3), (4.3.2), E3/E7.    |
| Construction capture changed directory semantics | Test snapshot/live inputs and explicit sharing.         | (3.2.1), (3.4.2), E6.       |
| Acquisition-only retry preserved body execution  | Distinguish four retry regions.                         | (4.4.2), E6/E7.             |
| Readiness and ablations found lifecycle gaps     | Await signals, inspect state, remove mechanisms.        | (1.3.5), (4.5.1), E9/E7.    |
| Kernel progress is not consumer/platform proof   | Separate delivery state from evidence coverage.         | (5.1.3), design §11.        |

Independent supervisor retention is a proposed improvement, not something
Lody's process-release note already supplies. That note says no root registry
exists in its unit and discarded failures can abandon recovery. refex's D9
requires proof of a retained live owner and records host-exit limits.

The six synthetic agent-guidance cases in #1452 remain unevaluated proposals.
Borrow task-scope discipline without claiming improved agent performance or
importing Lody's architecture, ledger size, or migration policy wholesale.

[skills]: https://github.com/leynos/df12-documentation-skills
[rio]: https://github.com/reazen/relude/blob/main/src/Relude_RIO.re
[primavera]: https://github.com/cargocut/primavera
[reventless]: https://www.npmjs.com/package/@reventlessdev/rescript-effect
[effect-scope]: https://www.effect.website/docs/v3/resource-management/scope
[await]: https://rescript-lang.org/docs/manual/async-await/
[objects]: https://rescript-lang.org/docs/manual/object/
[react]: https://react.dev/reference/react/useEffect
[sury]: https://github.com/DZakh/sury
[css-guide]: https://github.com/leynos/css-view/blob/305bd947bdb063d3b93785186f2d0bc33d0a5ea3/docs/developers-guide.md
[lody-pr]: https://github.com/LodyAI/Lody/pull/1452
[lody-guide]: https://github.com/LodyAI/Lody/blob/d8b3fd5bd19c632a7ad34b85fc9b26c2363c45d5/.agents/docs/cli-effect-ts.md
[lody-process]: https://github.com/LodyAI/Lody/blob/d8b3fd5bd19c632a7ad34b85fc9b26c2363c45d5/.agents/notes/implemented/bug-fix/2026-10-10-effect-process-release-failure.md
[lody-lock]: https://github.com/LodyAI/Lody/blob/d8b3fd5bd19c632a7ad34b85fc9b26c2363c45d5/.agents/notes/implemented/architecture/2026-10-10-effect-file-lock-lifecycle.md
[lody-probes]: https://github.com/LodyAI/Lody/blob/d8b3fd5bd19c632a7ad34b85fc9b26c2363c45d5/.agents/notes/implemented/process/2026-10-11-effect-reference-skills.md
