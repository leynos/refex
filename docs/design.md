# refex technical design

Status: draft v0.2, proposed for experimental validation. Last substantive
revision: 12 October 2026. Audience: implementers and reviewers of the library
and its validators. Companions:
[terms of reference](terms-of-reference.md), [context](context.md), [GIST roadmap](roadmap.md),
and [bootstrap decisions](contents.md).

## 1. Design intent and authority

refex proposes a ReScript-native interface for lazy computation, typed
requirements, complete failures, and accountable resource ownership. Its
intended difference from direct Effect bindings is the programming model and
explicit behavioural contract, not an assertion of new scheduler capabilities.
The three validators must demonstrate that difference before API acceptance.

The repository implements only the bootstrap described in the
[user guide](users-guide.md). All signatures here are explanatory proposals,
not compiled interfaces or existing exports. Draft acceptance neither selects a
runtime dependency nor approves publication. Goals G1-G6 live in the
[terms of reference](terms-of-reference.md); [context](context.md) owns
vocabulary and source provenance; [roadmap](roadmap.md) owns delivery tasks.

[Relude RIO][rio] motivates Reader around IO and environment projection.
[Primavera][primavera] motivates structural capability requirements. Neither
establishes equivalent inference through ReScript `.resi` boundaries; E1 must.

The supplied Lody learning note and [PR #1452][lody-pr] motivate this revision.
The PR changes documentation and guidance, not product code. Lody reports five
selected probes against Effect 4.0.2, not end-to-end migration verification.
Supporting process/file-lock notes have their own revisions and limits. Their
results have not been rerun for refex.
[Context §8](context.md#8-lody-learning-crosswalk) separates source
observations from proposed refex contracts.

## 2. Architecture and boundaries

### 2.1. Computational separation

The opaque abstractions retain these conceptual meanings:

```text
IO<A, E>        = lazy computation with success A and expected failure E
Fx<A, E, R>     = R -> IO<A, E>
Resource<A, E>  = acquisition and scoped use of A, retaining release obligations
Layer<A, E, R>  = R -> Resource<A, E>
```

Workflows consume `Fx`, helpers, and service accessors. Resource constructors
assemble dependencies. An internal execution adapter interprets IO; a live
owner retains lifecycle obligations. Platform adapters establish browser,
network, and process observations. Core source never imports those adapters.

These equations do not select a function representation, instruction tree, or
backend object. The first implementation uses one compile-time backend. A
general higher-kinded encoding or interpreter plugin system is not required. An
environment-free IO is not necessarily pure: captured state, time, and
randomness still require the appropriate boundary.

### 2.2. Bootstrap compatibility

[ADR 002](adr-002-portable-core-and-bun-boundary.md) permits only the matching
ReScript runtime as a production dependency. This revision changes no package,
dependency, generated source, or public-module allowlist.

The preferred experiment uses a private Effect execution adapter. Before
adoption, an ADR must address the bootstrap dependency restriction, adapter
placement, dependency discovery, and browser bundle behaviour. A portable
execution dependency differs from importing Bun or React into core source, but
still requires a reviewed change to the baseline.

Keep one root package until a second has real source, tests, and an independent
dependency boundary. React and Bun remain planned seams, not empty packages.
Use the ReScript 12 standard library rather than adding a replacement core.

### 2.3. Backend selection and execution boundary

Compare direct Effect FFI with [`@reventlessdev/rescript-effect`][bindings].
Audit the selected archive, resolved runtime, licence, and actual semantics.
Existing binding coverage is useful work, not a certified foundation.

Contain weakened types in a narrow foreign function interface (FFI). Public
interfaces must not expose backend tags, contexts, scopes, or unchecked error
conversions. Audit provision, error conversion, native variant representation,
calling conventions, cancellation, close, and keyed replacement.

Lody's guide documents version-specific differences between primitive names and
needed behaviour: repeated `Scope.close`, `FiberMap.run` replacement,
`mapError` on mixed causes, and promise failure projection. Treat these as
conformance targets, not universal claims about Effect versions.
[Lody guide][lody-guide]

Only identified runtime entries launch programs. Composition that happens to
contain `run` in its name is not automatically execution. Follow injected
callbacks and handles as well as imports when inspecting boundaries; wrapping
an internal promise workflow does not make its descendants structured.

Backend upgrades and any later replacement must rerun the same observable
contracts. If upstream behaviour disagrees, repair the adapter, narrow the
supported operation, or reject the backend. Do not silently weaken the contract.

### 2.4. Behaviour before primitives

Every resource-owning operation answers five questions in its existing design
or evidence record before selecting a primitive:

| Question     | Required answer                                                    |
| ------------ | ------------------------------------------------------------------ |
| Trigger      | What input starts work; what ordering and re-entry are allowed?    |
| Owner        | Who owns the producer, raw work, resource, and individual waiters? |
| Cancellation | Which wait or work stops, and what establishes termination?        |
| Handoff      | What observable condition permits replacement or a successor?      |
| Recovery     | Who retains unresolved work and the complete failure?              |

This adapts Lody's behavioural contract without importing its application
architecture. Link existing answers rather than require a new checklist file
for every edit. Service inputs and pure helpers need no new dependency service.

The first executable slice is one shared producer with two consumers, local
cancellation, delayed cleanup, and failed release. It exercises the smallest
necessary interaction of IO, outcomes, ownership, and time before broad APIs.

## 3. IO, requirements, and pipelines

### 3.1. Lazy construction and sequencing

`IO.succeed` accepts an evaluated value; `IO.sync` defers a callback; `suspend`
defers description construction. Promise adapters create work inside a thunk on
execution. Retrying invokes that thunk anew. An already-started promise adapter
must explicitly identify its weaker start/ownership contract.

Repeated execution repeats work unless sharing or caching explicitly says
otherwise. Environment access and projection execute lazily, not during
`provide`. Callback exceptions become defects unless a named adapter classifies
them. Laziness alone does not establish interruption of the resulting work.

A Reader wrapper must not exhaust the stack before its backend gets control:

```text
flatMap(first, next)(environment) =
  IO.suspend(() => first(environment))
    .flatMap(value => IO.suspend(() => next(value)(environment)))
```

E2 tests IO and Reader chains separately. Cooperative yields remain necessary;
an unbounded pure loop is not made interruptible by later returning an effect.

### 3.2. Requirements, construction, and observation timing

Prefer ordinary service records inside a structural outer environment. Each
accessor requests its own capability and uses native error variants.

```text
map:                  (Fx<A,E,R>, A -> B) -> Fx<B,E,R>
flatMap:              (Fx<A,E,R>, A -> Fx<B,E,R>) -> Fx<B,E,R>
access:               (R -> A) -> Fx<A,E,R>
accessIO:             (R -> IO<A,E>) -> Fx<A,E,R>
accessEffect:         (R -> Fx<A,E,R>) -> Fx<A,E,R>
provide:              (Fx<A,E,R>, R) -> IO<A,E>
contramapEnvironment: (Fx<A,E,Small>, Large -> Small) -> Fx<A,E,Large>
```

`accessEffect` suspends its callback and executes its result in the same
environment, without a runner. `accessIO` serves bound-service methods.

A common `R` accumulates requirements only if open types survive exported
interfaces. E1 covers independent services, extra fields, and conflicts. Use
explicit projections and named environments if inference fails. Never erase
requirements or invent an arbitrary combined type.

Partial provision is a typed environment-building function, not generic field
subtraction. Lexical overrides affect open operations and their children; they
do not rebuild a bound service that captured different inputs.

Document three independent service contracts: construction inputs, invocation
requirements, and lifetime owner. A workflow composing services is not thereby
a platform adapter. Deterministic reducers/codecs remain ordinary functions.

Snapshot configuration and a live provider differ. The layer must not replace
per-operation observation with construction-time capture without an explicit
contract change. E6 changes a supplied configuration source between operations
and checks both advertised behaviours. Lody's file-lock directory correction is
the motivating example, not a reason to add filesystem calls to core.
[Lody file-lock note][lody-lock]

### 3.3. Mapping and collection helpers

Use data-first functions and ReScript's native pipe; avoid data-last overloads.

- `map` transforms success; `flatMap` sequences descriptions; `tap` performs
  work while retaining success. A failing tap fails unless explicitly handled.
- `mapError` transforms only expected-error leaves while preserving the complete
  cause structure. Recovery obeys §4, not a backend function's convenient name.
- `fromResult`, `fromOption`, `mapResult`, and `mapOption` introduce explicit
  expected failure. `result` must not absorb lifecycle failures.
- `extend` retains intermediate values through a typed merge function rather
  than constructing records from string field names.
- Traversals use native arrays, options, and results. Pure inner mapping stays
  ordinary standard-library code.

Sequential traversal stays sequential. Parallel traversal requires a positive
concurrency bound, preserves input order, stops admission on failure, and joins
owned children. If external work remains unresolved, joining a child is not
proof of release; §5's recovery owner must still account for it.

Validation accumulation collects expected errors, not defects, interruption, or
failed cleanup. Introduce helpers only as validators need them.

## 4. Expected failures, defects, interruption, and release failures

### 4.1. Complete outcomes

Ordinary variants inject service errors into a domain sum. Open polymorphic
variants are optional. `flatMap` cannot merge unrelated closed errors by
assertion. Infallibility means no inhabitant in the expected-error channel;
`unit` is not empty and infallibility does not imply release success.

The proposed opaque `Cause<E>` preserves expected failures, defects,
interruption, release issues, and sequential/parallel composition. Sequential
ordering is significant. Parallel causes preserve branches without inventing a
wall-clock total order. Inspection must not require backend stack formatting.

A release issue identifies the owner, resource generation, release phase,
observed condition, and remaining obligation. An adapter may classify an
anticipated inability to release as a release failure rather than a programmer
defect. An unexpected exception in cleanup remains a defect with release
context. No public implementation may drop the original reason or simultaneous
failures merely to fit this classification.

The exact `ReleaseIssue` payload and adapter-specific detail representation
remain D8, decided by E3/E9 before a public interface freezes. The initial
proposal keeps lifecycle issues separate from `E`, avoiding a requirement for
every domain error sum to absorb every backend finalizer exception.

### 4.2. Error transformation and recovery

For `mapError(f)`, transform every expected-error leaf and preserve unrelated
reasons, resource identities, branch structure, and ordering. If `f` itself
throws, record the mapping defect without silently dropping the existing cause.
If a mapper throws, retain the original cause as opaque diagnostic provenance,
not as old typed leaves relabelled with the new error type. The FFI audit must
demonstrate this behaviour for the installed backend.

Lody documents an acquisition failure whose simultaneous release defect
vanished through its installed Effect 4.0.2 `mapError`; it changed that
conversion to map inside the full cause. This motivates a refex contract, not a
claim that all versions behave alike. [Process-release note][lody-process]

Default `catchError`, `match`, and `result` recover a standalone expected
failure. They propagate a compound cause containing defects, interruption, or
release issues. A handler for multiple expected-only failures requires an
explicit aggregation policy; it must not choose the first leaf silently.

A conservative initial `result` relationship is:

```text
result: Fx<A,E,R> -> Fx<Result<A,E>,E,R>
```

The retained `E` permits an unconverted mixed cause to propagate losslessly.
This narrows the earlier sketch: recovery must not promise an arbitrary new
error type while unexplained old typed failures remain possible. E1/E9 must
validate this constraint. A future complete-outcome-as-value operation is
explicit, and still cannot dispose an owner by discarding its returned value.

### 4.3. Runtime and promise boundaries

`Runtime.runExit` accepts dependency-free IO and returns its complete outcome.
A defined submission failure is distinct from the workflow's `E`. Do not cast
arbitrary JavaScript rejections into domain errors.

A convenience promise runner may project failures only at a documented outer
boundary. Lifecycle-sensitive callers use full outcomes; any lossy exception
projection must be explicit. Preserve the full cause behind the projection and
retain unresolved owners independently of the exception's reachability.

Lody #1452 corrects its earlier account: its pinned `runPromise` already uses
`Cause.squash`. refex must test its own contract rather than depend on either
remembered rejection shape. [Reference and probe note][lody-probes]

## 5. Resources and dependency construction

### 5.1. Ownership contract

A resource retains acquisition and release obligations throughout scoped use:

```text
Resource.use: (Resource<A,E>, A -> IO<B,E>) -> IO<B,E>
```

Normalize acquisition/body errors before composition. Lifecycle failure stays
visible even after body success. Acquire, register ownership, publish a handle,
and cancel form one protocol. Every successful allocation has one release owner
before publication, including a result arriving after cancellation.

Register the finalizer once and run each close attempt once. Do not describe
this as unconditional 'exactly-once successful release': attempts can fail,
remain pending, or require deliberate recovery. Normal dependency ordering
releases dependants before their supporting resources.

Adapters must retain late foreign acquisitions until disposal or confirmed
termination. Sending abort alone does not discharge ownership. Borrowed browser
sessions and owned processes have different release predicates; closing an
owned connection does not authorize destroying everything reachable through it.

ReScript does not provide a non-escape proof here. Wrappers can reject use
after closure, but cannot revoke arbitrary captured third-party values. No
unrestricted resource-to-IO conversion may silently discard ownership.

### 5.2. Joined closure and retained recovery

The proposed lifecycle is:

```text
Open -> Closing(attempt) -> Released(receipt)
                        -> Unresolved(owner, generation, report)
Unresolved -> Recovering(new attempt) -> Released | Unresolved
```

Concurrent closes join one in-progress attempt and observe its same report.
Further close calls may observe that settled report; they do not implicitly
retry failed cleanup. Explicit recovery creates or joins a serialized recovery
attempt. Distinguish attempt identity, resource generation, and release receipt.

A live owner registry or supervisor retains unresolved resources independently
of returned errors. A diagnostic can expose a recovery reference, but is not
the sole ownership record. Transfer requires acknowledgement by a destination
owner before the source drops responsibility. This is a refex proposal stronger
than Lody's process note, which explicitly warns that discarded failures can
abandon caller-held leases. [Process-release note][lody-process]

The outer host retains an unresolved runtime/owner after a bounded close
report; it cannot discard it as disposed. D9 decides the API for inspection,
retry, transfer, and force-exit reporting. Until that exists, an uncooperative
adapter cannot advertise fully managed release. In-memory retention does not
survive host termination and is not durable crash recovery.

A receipt confirms only its adapter's stated predicate. Process-tree absence
need not mean drained output; socket closure need not mean remote rollback. Log
failures must not suppress ownership transfer or change failed release into
success. Recovery history retains the original obligation and later failures.

### 5.3. Generations, pending work, and handoff

A resource name is not a generation. Key replacement must not assume that
interrupting an old fibre joined cleanup or made its external identity
reusable. For exclusive replacement, wait for a confirmed release receipt or a
verified isolation mechanism that prevents old work affecting the successor.

Retain the original external cleanup operation while it is pending. A waiter
timeout neither cancels that operation nor permits a duplicate destructive
attempt. Join pending or already-successful operations. Only a settled failed
attempt may be retried, subject to the adapter's identity and safety contract.
Late completion must retire only its own generation.

Lody's delayed-unlink case motivates this rule: reissuing cleanup against a
reused path can delete the successor. Local generation checks alone are not a
cross-process compare-and-delete primitive. Any filesystem or process adapter
must record the real identity guarantees and unverified platform limits.
[Lody file-lock note][lody-lock]

Publication is a separate transition from preparation. Register observations
before triggering synchronous events, keep partially initialized resources
private, and establish ownership before exposing them. A migration that inserts
an await can alter these boundaries despite unchanged signatures. No assumption
of cross-process atomicity follows from synchronous JavaScript execution.

### 5.4. Layers, sharing, and observation

A layer builds a resource-managed output from inputs. Initial assembly uses
`map`, `flatMap`, explicit `zipWith`, and input projection:

```text
provideLayer: (Fx<A,E,Out>, Layer<Out,E,In>) -> Fx<A,E,In>
```

Constructor failures and residual inputs remain visible. Earlier services still
require release or recovery ownership when a later constructor fails.

Initially share an allocation by building once and passing its value to
multiple consumers. Reusing a recipe promises neither memoization nor sharing.
Test one acquisition, identical instance observation, and release at the actual
owner. Explicit fresh construction remains separate, including across runtimes.

Two readers of a shared producer own their waits, not the producer. Cancelling
one reader preserves the other's lease. The producer owner defines the
last-lease policy: retire and join cleanup, or retain an application-owned
cache. The first experiment uses retire-on-last-release; it does not build a
cache.

Graph memoization remains deferred. Any future key identifies a bound node and
its configuration within a scope, not merely a constructor function. Snapshot
versus live dependency observation remains explicit under §3.2.

## 6. Execution, concurrency, and policies

### 6.1. Managed runtime lifecycle

Starting admits no work; successful construction moves to open. Close
atomically stops admission, settles request ownership, and attempts release of
supporting services. It reports released or unresolved, never unconditional
'closed'. Failed initialization also retains any unresolved partial
construction.

Owned child interruption requests cancellation and joins managed termination.
No public detached spawning is needed initially. Joining a fibre does not by
itself confirm foreign termination. A successful shutdown requires all owned
obligations released or explicitly transferred to an acknowledged live owner; a
mere unresolved transfer must not be labelled global quiescence.

### 6.2. Three cancellation contracts

Expose the distinction in names or operation documentation, not just footnotes:

- **Stop waiting:** cancel one observer and remove its admission/interest claim.
  The producer and raw operation may remain under another owner.
- **Interrupt and join:** request managed interruption and observe the fibre's
  termination plus applicable finalizer attempts. Return unresolved details
  rather than infer successful external release.
- **Confirm termination:** the adapter establishes its external release
  predicate before handoff. Cooperative abort is evidence only when verified.

A promise adapter declares which it provides. The scope bridge must preserve
that classification. A bounded wait, confirmed termination, and immediate safe
reuse cannot all be promised for work that may ignore cancellation forever.

The ordinary owned timeout interrupts and joins; cleanup can exceed the
execution deadline. A bounded cleanup observation returns an unresolved report
with a retained owner. Do not stack 'stop waiting' and 'release' and call it an
owned timeout. Independent waiters may have different deadlines.

### 6.3. Time, admission, and retry placement

Clock and randomness make delay and jitter controllable. Tests await explicit
readiness before advancing time or cancelling; a fake timestamp alone does not
establish a queued waiter or running finalizer.

Specify exclusion, fairness, re-entry, cancellation removal, and handoff
separately. A semaphore is not automatically FIFO. The initial admission helper
promises exclusion and cancelled-waiter removal; strict FIFO requires an
explicitly named policy and evidence. Test immediate reacquisition as well as
queued cancellation. Reject or document re-entry rather than deadlock silently.

Schedules include only demanded bounded retries, backoff, jitter, and
repetition. State resets per execution. Default retries exclude defects and
interruption. Document four distinct placements:

| Retried region  | Repetition permitted                                                 |
| --------------- | -------------------------------------------------------------------- |
| Acquisition     | A new acquisition attempt, never the already-executed body.          |
| Body            | Only an explicitly repeatable body while the resource remains valid. |
| Whole lifecycle | A new acquire/use/release cycle with an explicit policy.             |
| Recovery        | A safe settled-failure retry for the original unresolved generation. |

A release failure must not accidentally retry a non-idempotent body. Pending
cleanup is joined, not retried. Lody's acquisition-only correction supplies the
counterexample; its exact delays are not refex defaults.
[File-lock note][lody-lock]

Introduce `Deferred`, `Ref`, semaphore, or bounded queue only for a consuming
slice. Specify single completion, atomic update, permit release, and shutdown
where relevant. Measurements can justify keeping pure hot paths outside
effects, but not unmanaged background work.

## 7. Native await as a gated experiment

[Native ReScript await requires promises][await]. The typed bridge is a
proposal, not transparent `await Fx.t` or a source transformation:

```text
Direct.make:   (Scope<E,R> -> Promise<A>) -> Fx<A,E,R>
Direct.run:    (Scope<E,R>, Fx<A,E,R>) -> Promise<A>
Direct.result: (Scope<E,R>, Fx<A,E,R>) -> Promise<Result<A,E>>
```

`make` stores a callback and invokes it afresh per execution. Each operation
constrains the same environment/error scope. `result` converts standalone
expected failure but propagates mixed causes through that scope. This narrows
the earlier unconstrained `Outer`/`Inner` sketch to preserve §4.2's failures.
No typed rejection channel appears in a native promise.

The bridge needs one block owner, inherited context, and resource lifetimes
spanning awaits. Compare a driver and supervised child execution; independent
root runners are not equivalent. Private rejection signals must refer to
scope-owned typed state and execution identity. Foreign signals become defects,
not unchecked casts. Broad catches cannot erase cancellation state or recovery
ownership. E5 and E9 cover nested blocks and mixed failures.

Raw promises, detached continuations, escaped scopes, and raw side effects
remain outside complete control. The bridge cannot pre-empt arbitrary async
continuations. Late work may still mutate state after the local wait ends.
Retain raw-work ownership, classify adapter cancellation honestly, and reject
new scope submissions after closure. These runtime checks are not non-escape
proofs. Unsupported operations must not advertise managed termination.

Parallel work uses owned refex combinators. Compare the same Minesweeper
controller with pipelines and `Direct`. Retain a restricted bridge or omit it
if its contract or complexity fails the experiment. Later validators must not
depend on its acceptance. Compiler-assisted monadic await remains deferred.

## 8. React and external boundaries

### 8.1. React ownership

React owns rendering and presentation state. A stable provider supplies the
application runtime; committed hooks and handlers launch work, never render.
Keep component-local execution separate from application-owned shared
producers. Unmount releases a shared subscription, not every producer it can
reach.

[React documents an additional development Strict Mode lifecycle][react].
Cleanup requests cancellation synchronously; React does not join the returned
shutdown promise. A runtime owner must retain asynchronous finalization and any
unresolved report after that request. Provider ownership distinguishes borrowed
from owned runtimes and avoids reusing a disposed instance on remount.

Use generation identities to reject stale publishers. Exclusive external
identity reuse also requires §5.3's release gate; a UI generation guard alone
cannot prevent old cleanup affecting the new resource. Independent resources
may overlap only under an explicit ownership policy.

E4 covers component-local work, two subscribers, last-lease release,
replacement, Strict Mode, and finalization failure. Server components,
request-server rendering, Suspense, and query caches remain separate future
decisions. Never reuse a client singleton as an accidental cross-request server
singleton.

### 8.2. Schemas, network, and process adapters

Use `rescript-schema` through a narrow adapter. Preserve decode paths in typed
protocol errors; decoding alone is not authorization or all domain validation.
The [Sury deployment caveat][sury] remains a version/policy question. Verify
the chosen package before integration; do not silently allow dynamic evaluation.

Network adapters distinguish transport, protocol, domain, and lifecycle
outcomes. Client abort does not undo a committed command. Process adapters own
only their spawned resources, drain pipes according to contract, and establish
termination using platform evidence, not just a wrapper exit or signal delivery.

CDP endpoints and tab data are sensitive. Use controlled loopback fixtures,
redact session URLs and credentials, and pass process arguments without shell
interpolation. Generation bookkeeping grants no authority over borrowed
sessions and no protection against arbitrary external actors reusing an
identity.

## 9. Vertical validation contracts

### 9.1. Animated React Minesweeper solver

Keep generation, inference, and move selection pure. The solver receives
revealed state and rules, not hidden mines. A 'no justified move' result is
valid; any guessing must be explicit and seeded.

The controller owns solve, pause/resume, speed, reset, and new-board work.
Inject pacing time and bound work between yields. Defer workers unless measured
main-thread cost requires them. Compare fixed-seed traces under virtual and
browser time, including no stale publication after reset/unmount.

Add two independent React views of one solver producer. Cancel one pending
reader without stopping the other; release the last lease and observe cleanup.
Block and fail release, then request replacement and verify the generation gate
and retained recovery owner. An explicit inspection surface can show the
unresolved state instead of pretending reset disposed everything.

Use this same controller and domain implementation for pipeline/Direct
comparison. This is lifecycle validation, not a new reactive-state framework.

### 9.2. Nine-room client-server roguelike

Deliver nine connected rooms, descriptions, movement, an inventory interaction,
and a win condition. The in-memory authoritative server and React client share
checked protocol types. World transitions remain pure; services stay narrow.

A request owns its execution, not the application store. Prefer command
identity plus expected revision: accepted duplicates return the recorded
outcome, and mutation plus outcome recording share an atomic boundary. A
simpler protocol must prohibit retries of ambiguous writes. Disconnection does
not prove rollback; reconcile uncertain outcomes and reject stale UI revisions.

Test per-session admission with queued cancellation and immediate re-entry. If
FIFO is required, prove that policy rather than infer it from a semaphore.
Change a configuration provider between calls to distinguish live observation
from a snapshot. Count one shared store acquisition and separate explicitly
fresh instances; request cancellation must not destroy the shared service.

Exercise body-plus-release and acquisition-plus-release failure, lost
responses, and retry placement without repeating movement/inventory mutation.
In-memory state and deduplication cover the declared server lifetime, not crash
durability. No authentication or database framework is added by this validator.

### 9.3. Reimplementation of css-view

Keep the original unchanged and pin
[the context oracle](context.md#7-source-register). Reimplement behaviour, not
source layout. The [existing guide][css-guide] defines capture paths, fixtures,
target filtering, and bounded open retry.

Deliver local Playwright walker, local Chromium CDP, direct CDP, agent-browser
navigation, and current-page capture. Preserve invalid combinations, metadata,
style inheritance, custom properties, selected fields, node/text limits, active
targets, and stable output facts.

CDP requests carry identity/session correlation. Register listeners before
triggering events; settle every waiter on reply, timeout, cancellation, or
connection failure. Cancelling a waiter must not leave it eligible for later
completion. Detach only owned connections, not borrowed browsers.

For owned browser/process work, delay external termination beyond a waiter
budget, fail release, discard its diagnostic, and inspect the retained owner. A
successor sharing an external session identity must wait for its predicate.
Keep process-tree absence, drained output, and browser/session detachment as
separate adapter assertions, including their platform limitations.

The existing `Event stream closed` open rule retries once only for its
specified non-zero exit. Cancellation during delay prevents the second command.
A body or release failure must not re-run capture or output publication.
Complete result and recovery details survive both native and CLI/promise
boundaries.

Normalize documented volatile fields only. Geometry still needs shape/range and
deterministic-fixture checks. Never erase style, target, limit, or error
differences to manufacture parity. Record oracle defects for adjudication
rather than reproduce or correct them silently. No filesystem lock framework is
added.

## 10. Experimental validation

Record specified, implemented, consumer-exercised, and
interpreter/platform-verified states separately. Each evidence entry includes
claim, source/runtime pins, readiness event, seeds, command, observations,
resource state, negative control, limits, and accept/revise/reject decision.
Missing coverage is not an implementation result in either direction. Set
budgets before comparison.

### 10.1. Compiler and algebra experiments

**E1: requirements/errors, G1/G2; (1.2.1)-(1.2.3).** Use independent `.resi`
consumers. Accept complete/projected environments and reject missing fields,
wrong injections, unresolved requirements, and unsound mixed-cause recovery
signatures for the intended diagnostic. Choose explicit projection if open rows
fail. Type evidence does not establish runtime ownership.

**E2: laziness/composition, G4; (1.3.1).** Record callbacks and cause order.
Run repeated executions, lazy provision, fresh promise retries, and at least
100,000 binds separately for IO and Reader as a stress workload, not a speed
promise. Check algebra/projection laws on terminating generated descriptions
with pure callbacks, shrinking disagreement traces. Exclude raw side effects
and scheduler step counts from equivalence.

### 10.2. Ownership and direct-style experiments

**E3: acquisition/termination, G3; (1.3.2)-(1.3.3).** Enumerate bounded
schedules for acquire, register, publish, cancel, close, and recover with one
owner and two resources/children. Each acquired generation has an owner; one
attempt runs once; released status requires its predicate; dependants finish or
transfer ownership before supporting release. Compare adapter traces with an
explicit-state model.

Cover late acquisition, duplicate completion, partial construction, joined
close, recovery after scope closure, and failure at every transition. Shrink
events while preserving happens-before constraints. This bounds interleavings;
it does not prove unbounded liveness or arbitrary platform operations.

**E4: React ownership, G3/G5; (2.2.1)-(2.3.3).** Use development Strict Mode
and production builds with local work and two shared subscribers. Readiness
must establish attachment before cancellation. Require one current publisher,
reader independence, observable last-lease cleanup, generation-safe
replacement, and inspectable unresolved release. Separate fake-time results
from browser observations. Do not report unresolved external activity as
quiescent.

**E5: native await, G1-G4; (1.4.1)-(1.4.2), (2.3.1).** Compare the same
controller with pipelines and scoped awaits. Cover nested blocks, raw waits,
ignored abort, caught rejection signals, mixed failures, escaped scopes,
post-close submission, and context propagation. Inspect retained raw-work
owners and late mutation. Reject stronger equivalence claims when traces differ.

### 10.3. Application and comparison experiments

**E6: client-server semantics, G2/G5; (3.4.1)-(3.4.2).** Generate command and
transport sequences against the pure model. Verify single mutation for each
accepted identity, monotonic UI revision, explicit ambiguous outcomes,
cancelled admission removal, snapshot/live observation, and shared/fresh
ownership. Combine fake services with live HTTP/React. Bound the claim to one
server lifetime.

**E7: tooling parity/ownership, G3/G5; (4.5.1)-(4.5.2).** Run all supported
backend/mode paths and invalid combinations against the pinned oracle. Use
pairwise independent options and full targeted lifecycle interactions:
borrowing, duplicate tab URLs, delayed teardown plus replacement, timeout plus
closure, and body/acquisition plus release failure. Inspect real handles and
processes, not only counters or mocks; record operating-system/browser coverage
explicitly.

**E8: abstraction cost, G4/G6; (5.2.1)-(5.2.2).** Hold domain logic, error and
ownership semantics, compiler, bundler, and runtime constant where meaningful.
Label weaker promise baselines. Report bundle size, long-chain overhead,
admission, cancellation-to-report versus cancellation-to-confirmed-release,
acquisition, and build/CI resource use. Separate cold/warm distributions.

Ergonomics review records signatures, wiring, escapes, diagnostics, and the
steps for a representative change against an agreed rubric. Line count is not
safety. Publish negative results and remove APIs that did not earn their
complexity.

### 10.4. First shared-producer conformance slice

**E9: shared work and unresolved release, G2/G3/G5; (1.3.4)-(1.3.5).** Build
one minimal portable workflow with an injectable external-operation adapter,
two consumers, and an inspectable owner. This is the first semantic vertical
experiment, not a collection of independent primitive demonstrations.

| Scenario                    | Observable acceptance                                        |
| --------------------------- | ------------------------------------------------------------ |
| Lazy start/retry            | No work on construction; fresh execution per attempt.        |
| Cancelled queued waiter     | Its claim disappears and cannot acquire later.               |
| Two readers                 | Cancelling one leaves the other producer lease usable.       |
| Last lease                  | Owner initiates and joins cleanup or reports unresolved.     |
| Concurrent close            | Callers join one attempt and receive its same report.        |
| Mixed failure               | Mapping/result/Direct/boundary retain all relevant reasons.  |
| Ignored abort               | Local wait ends without a false termination receipt.         |
| Delayed release/replacement | Successor waits; old completion cannot target it.            |
| Discarded diagnostic        | A live owner still exposes and can recover the resource.     |
| Failed retry                | Same generation remains owned; no false successful disposal. |

First await readiness that proves admission, producer start, or finalizer
entry. Then advance the controlled clock or cancel. Join affected managed work
and inspect raw-work state plus owner records. A fake clock alone is
insufficient.

Temporarily remove close joining, owner retention, generation checks, or
cause-preserving conversion one at a time. The corresponding behavioural case
must fail; restore and rerun the baseline. Keep temporary ablation scripts
outside product code and retain reproducible patches/results in evidence.
Unit/behavioural checks belong in delivery tasks; the combined E9 acceptance
matrix is a genuine end-to-end conformance task, not a coverage quota.

Real-boundary tests remain mandatory when adapters exist. A simulated unlink
cannot prove filesystem publication and a mocked process table cannot prove
process-tree termination. The same corpus guards later backend upgrades.

## 11. Operations and change discipline

Use public Make targets and pinned tooling from the
[developer guide](developers-guide.md). Preserve compiler-owned output,
explicit interfaces, and the public allowlist. No new enforcement tool or
platform dependency follows from this document.

Keep lifecycle work inside the task's purpose. Review compares evidence;
debugging isolates causes; a feature/fix changes relevant behaviour; migration
needs explicit scope and complete dependency/consumer ownership. Defer a larger
migration with named blockers instead of expanding a local fix. Trace callbacks
and resources, not only imports. Pure code remains pure.

Static boundary checks should identify actual launch operations with explicit
adapter exceptions, not ban `run*`, all promises, maps, or callbacks. Add
guards only when a demonstrated boundary warrants them. They complement, not
replace, observable lifecycle acceptance. Lody's synthetic guidance cases are
proposed evaluations, not proof of agent effectiveness.
[Probe note][lody-probes]

Bound browser/process-heavy validation and record runner size, concurrency,
wall time, and memory before expanding CI. Reuse trusted binary caches. Do not
copy Lody's migration ledger or another repository's validation framework.

Diagnostics identify execution, owner, generation, attempt, and phase without
secrets. An error formatter or logger cannot be the only recovery store.
Maintain a small evidence record per contract; no manual application-tier
ledger is required. Release readiness depends on exercised consumers and
declared platform coverage, not only merged kernels or passing document checks.

## 12. Open decisions and adoption

- **D1, backend:** select direct FFI or audited bindings after E1-E3/E9 and
  explicitly revise dependency policy before installation.
- **D2, requirements:** validate open rows or choose explicit projection.
- **D3, direct style:** accept, restrict, or omit it from E5; later validators
  must remain independent of that outcome.
- **D4, schemas:** resolve package/API, browser policy, and deployment caveats.
- **D5, budgets:** approve workloads and thresholds before E8.
- **D6, packaging/release:** apply the real-source workspace trigger and derive
  exports/compatibility from consumer evidence; no publication is authorized.
- **D7, extensions:** require a new use case for graph memoization, streams,
  request caches, a native runtime, or syntax transformation.
- **D8, complete outcomes:** settle release-issue representation and
  conservative recovery types through compiler fixtures plus E3/E9, before
  exposing `.resi`.
- **D9, recovery owner:** choose a core owner or higher-level supervisor seam;
  prove retention after discarded errors, joined close/recovery attempts, and
  explicit host shutdown limits. Do not create a general process manager.
- **D10, admission/publication:** decide which operations need FIFO, re-entry,
  generation exclusion, or atomic publication. Require adapter-level evidence
  instead of asserting universal guarantees from primitive names.

Owners remain unassigned; the repository owner accepts scope and ADRs.
Experiments may accept, revise, narrow, or reject proposals. No implementation,
release, compatibility, or cross-platform claim follows from this draft.

## References

Sources inspected or supplied on 12 October 2026. Full provenance and limits
appear in [context §§7-8](context.md#7-source-register).

- [Relude RIO][rio], [Primavera][primavera], and [Reventless][bindings]: prior
  art.
- [Effect scope][scope], [ReScript await][await], and [React useEffect][react]:
  reference contracts; test the selected implementation rather than infer it.
- [Sury][sury] and [css-view guide][css-guide]: existing integration
  constraints.
- [Lody #1452][lody-pr], [guide][lody-guide], [process release][lody-process],
  [file locks][lody-lock], and [probe limits][lody-probes]: pinned evidence.

[rio]: https://github.com/reazen/relude/blob/main/src/Relude_RIO.re
[primavera]: https://github.com/cargocut/primavera
[bindings]: https://www.npmjs.com/package/@reventlessdev/rescript-effect
[scope]: https://www.effect.website/docs/v3/resource-management/scope
[await]: https://rescript-lang.org/docs/manual/async-await/
[react]: https://react.dev/reference/react/useEffect
[sury]: https://github.com/DZakh/sury
[css-guide]: https://github.com/leynos/css-view/blob/305bd947bdb063d3b93785186f2d0bc33d0a5ea3/docs/developers-guide.md
[lody-pr]: https://github.com/LodyAI/Lody/pull/1452
[lody-guide]: https://github.com/LodyAI/Lody/blob/d8b3fd5bd19c632a7ad34b85fc9b26c2363c45d5/.agents/docs/cli-effect-ts.md
[lody-process]: https://github.com/LodyAI/Lody/blob/d8b3fd5bd19c632a7ad34b85fc9b26c2363c45d5/.agents/notes/implemented/bug-fix/2026-10-10-effect-process-release-failure.md
[lody-lock]: https://github.com/LodyAI/Lody/blob/d8b3fd5bd19c632a7ad34b85fc9b26c2363c45d5/.agents/notes/implemented/architecture/2026-10-10-effect-file-lock-lifecycle.md
[lody-probes]: https://github.com/LodyAI/Lody/blob/d8b3fd5bd19c632a7ad34b85fc9b26c2363c45d5/.agents/notes/implemented/process/2026-10-11-effect-reference-skills.md
