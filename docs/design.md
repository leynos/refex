# refex technical design

Status: draft v0.1, proposed for experimental validation.
Last substantive revision: 12 October 2026.
Audience: implementers and reviewers of the library and its validators.
Companions: [terms of reference](terms-of-reference.md), [context](context.md),
and [accepted bootstrap decisions](contents.md).

## 1. Design intent and authority

refex proposes a ReScript-native interface for lazy computation, typed
requirements, expected failures, and owned execution. The intended difference
from direct Effect bindings is the application programming model, not new
scheduler capabilities. The three validators must demonstrate that difference
before the project freezes a supported surface.

The repository currently implements only the bootstrap described by its
[user guide](users-guide.md). Every API below is a design contract, not an
existing export. Signature blocks use explanatory notation and have not passed
the proposed compiler experiments. Documentation acceptance does not constitute
an accepted runtime ADR, an implementation result, or publication approval.

Goals G1-G6 and non-goals live in the
[terms of reference](terms-of-reference.md).
[Context](context.md) defines terminology and preserves the edited roadmap's
identifiers. The design deliberately avoids adding a second roadmap checklist.

The monadic starting points are [Relude's RIO][rio] and [Primavera][primavera].
Relude provides environment adaptation around IO; Primavera motivates tracking
capability requirements through object types. Neither source proves that the
same inference survives ReScript interfaces. Experiment E1 decides that.

## 2. Architecture and boundaries

### 2.1. Computational separation

The proposed opaque abstractions have these conceptual meanings:

```text
IO<A, E>        = lazy computation with success A and expected failure E
Fx<A, E, R>     = R -> IO<A, E>
Resource<A, E>  = acquisition and scoped use of A, retaining cleanup
Layer<A, E, R>  = R -> Resource<A, E>
```

Application workflows consume `Fx`, mapping helpers, and service accessors.
Resource constructors assemble dependencies. An internal execution adapter
interprets IO and preserves ownership and outcomes. Platform adapters supply
browser, React, network, and process operations. The portable core never
imports a platform adapter.

These equations explain semantics; they do not commit the public representation
to functions, a generalized algebraic datatype, or a backend object. The first
implementation chooses one compile-time backend. Runtime-selectable interpreter
plugins and a general higher-kinded encoding are not initial requirements.

### 2.2. Bootstrap compatibility

[ADR 002](adr-002-portable-core-and-bun-boundary.md) currently allows only the
matching ReScript runtime as a production dependency and keeps platform calls
outside core source. This documentation changes neither that dependency graph
nor the public-module allowlist.

The preferred experiment reuses Effect execution through a small private
adapter. Before adding it, an ADR must explicitly address the bootstrap's
runtime-dependency restriction, dependency discovery, browser bundle behaviour,
and adapter placement. An internal portable execution dependency is different
from importing Bun or React into core source, but it still requires a reviewed
change to the accepted baseline.

Keep the root package until a second package has real source, tests, and an
independent dependency boundary, as the existing workspace trigger requires.
React and Bun adapters remain planned seams, not empty packages created by this
PR. Use the ReScript 12 standard library, not an additional core library.

### 2.3. Backend selection

Compare direct Effect foreign function interface (FFI) bindings with
`@reventlessdev/rescript-effect`. The
[package describes alpha bindings][bindings] across Effect modules. It is a
candidate source of existing interoperation work,
not a certified foundation. Audit the exact package archive and selected Effect
version, including licensing notices, before adoption.

The adapter may weaken types only inside an explicit, reviewed FFI boundary.
It must not export backend tags, contexts, effects, scopes, or unchecked error
conversions. Binding audit targets include provision, construction errors,
calling conventions, native variant representation, child interruption, and
scope ownership. A hidden dependency does not excuse unsound semantics.

Backend replacement is a later experiment against the same conformance corpus.
Opaque interfaces reduce coupling; they do not guarantee cost-free migration or
identical behaviour across arbitrary runtimes.

## 3. IO, requirements, and pipelines

### 3.1. Lazy construction and sequencing

`IO.succeed` accepts an already evaluated value. `IO.sync` accepts a deferred
callback. `suspend` defers construction of the next description. Promise
adapters accept a thunk that creates work during execution; an adapter for an
already-running promise must identify that different ownership contract.

Repeated execution repeats work unless the caller explicitly introduces a
shared allocation or cache. Environment access and projection also run during
execution, not while `provide` assembles a description. Exceptions thrown by
callbacks enter the defect channel unless a named adapter classifies them.

A Reader wrapper must not consume the JavaScript stack before a stack-safe
backend gets control. Conceptually, sequence it as follows:

```text
flatMap(first, next)(environment) =
  IO.suspend(() => first(environment))
    .flatMap(value => IO.suspend(() => next(value)(environment)))
```

E2 checks long IO and Reader chains separately. Runtime fairness still requires
cooperative yielding; an unbounded pure loop inside a callback is not made
interruptible merely by returning an effect afterwards.

### 3.2. Requirement contracts

Use ordinary service records inside a structurally typed outer environment as
the preferred interface. Each service accessor requests only its own field.
Use native error variants rather than backend tagged-error classes.

The proposed type relationships are:

```text
map:                  (Fx<A,E,R>, A -> B) -> Fx<B,E,R>
flatMap:              (Fx<A,E,R>, A -> Fx<B,E,R>) -> Fx<B,E,R>
access:               (R -> A) -> Fx<A,E,R>
accessIO:             (R -> IO<A,E>) -> Fx<A,E,R>
accessEffect:         (R -> Fx<A,E,R>) -> Fx<A,E,R>
provide:              (Fx<A,E,R>, R) -> IO<A,E>
contramapEnvironment: (Fx<A,E,Small>, Large -> Small) -> Fx<A,E,Large>
```

`accessEffect` suspends its callback and executes the returned workflow with the
same environment; it must not introduce an implicit runner. It corresponds to
the name in roadmap task (1.2.1), while `accessIO` serves bound services.

A shared `R` in `flatMap` can accumulate constraints through unification only
when sufficiently open types survive the interface. E1 must test independent
services, explicit `.resi` files, extra fields, and incompatible field types.
If that fails, use explicit projections and named environment records. Never
claim an arbitrary output requirement type or erase it to `unit` without
supplying the complete environment.

Partial provision is a typed environment-building function. Initially there is
no generic field-subtraction operation. Lexical overrides affect enclosed open
operations and their owned children; they do not rebuild bound services that
captured different dependencies earlier.

### 3.3. Mapping and collection helpers

Use data-first functions and ReScript's native pipe. Do not duplicate the API
with data-last overloads. Keep the following meanings distinct:

- `map` transforms a success; `flatMap` returns another description; `tap`
  performs an effect and retains the original success. A failed tap fails the
  workflow unless explicitly recovered.
- `mapError` changes expected failure; `catchError` recovers it. `match` folds
  expected success/failure into a success, not defects or interruption.
- `fromResult`, `fromOption`, `mapResult`, and `mapOption` explicitly introduce
  expected failure. `result` exposes expected failure as a native result value.
- `extend` combines an intermediate result with another result using a typed
  merge function. It does not synthesize records from string field names.
- Container helpers traverse native arrays, options, and results. Pure inner
  mapping remains ordinary standard-library code.

Sequential traversal remains sequential. Parallel traversal takes an explicit
positive concurrency bound, preserves input order, stops admitting new work on
failure, and joins owned children before completing. Validation accumulation
collects expected errors; it does not absorb defects or cancellation.

Introduce helpers as a validator needs them. No arbitrary target module count
or reproduction of Effect's collection hierarchy defines completeness.

## 4. Expected failures, defects, and interruption

A workflow's expected-error type is an explicit contract. Ordinary application
variants can inject service-specific errors into a domain sum. Open
polymorphic variants remain an optional inference experiment, not the only
supported style.

`flatMap` does not merge unrelated closed error types by assertion. Callers
supply real injection functions, an explicit sum, or compiler-checked open-row
composition. An infallible type has no public inhabitants; `unit` is not empty.
Any widening operation accepts only a genuinely uninhabited expected channel.

`Exit<A,E>` reports success or a complete `Cause<E>`. Keep cause representation
opaque, but expose inspection of expected failure, defect, interruption, and
combined failure. Cleanup failure must not overwrite the original failure.
Deterministic tests compare meaningful outcomes and order, not backend-specific
stack-trace formatting.

`Runtime.runExit` accepts only dependency-free IO and returns the complete
outcome in a promise. The adapter must contain execution failures rather than
rejecting with an arbitrary value cast to `E`. A convenience promise runner can
reject at an explicitly documented JavaScript boundary; library combinators
must not call it internally.

Cancellation bypasses ordinary expected-error recovery and retry. A handler
that needs to inspect a complete cause must do so explicitly. The initial
surface must not provide an accidental catch-all that turns interrupted work
back into apparent success.

## 5. Resources and dependency construction

### 5.1. Ownership contract

A resource describes acquisition and scoped use. Its consumer runs before its
cleanup obligations end:

```text
Resource.use: (Resource<A,E>, A -> IO<B,E>) -> IO<B,E>
```

Normalize acquisition and consumer errors into a common domain error before
composition. Finalizer defects remain visible through the cause rather than
requiring every domain error type to include cleanup exceptions.

Acquisition, ownership registration, and cancellation form one protocol. Once
an allocation succeeds, exactly one owner must account for release, even if
cancellation arrived during acquisition. Finalizers run once, in dependency
order, with interruption protection appropriate to the chosen backend.
[Effect's scope contract][scope] is reference behaviour to verify at this
boundary, not evidence that the wrapper already implements it.

Foreign acquisition can finish after cancellation. The adapter must either
retain ownership of that late result and dispose it, or document a weaker
contract that excludes the operation from the managed surface. Sending an
abort signal alone does not discharge the release obligation.

The resource protocol distinguishes an owned process/browser from a borrowed
session. Closing an owned connection is not permission to destroy everything
reachable through it. In `css-view`, detaching a connection and terminating the
operator's browser are different operations.

This is not linear typing. An application can capture a handle or closure beyond
its scope. refex-owned wrappers may reject use after closure, but cannot revoke
all escaped third-party values. Do not expose unrestricted resource-to-IO
conversion that silently drops lifetime obligations.

### 5.2. Layer composition and sharing

A layer receives inputs and builds a resource-managed output. `map`, `flatMap`,
explicit `zipWith`, and input projection suffice for initial assembly. Provision
has the relationship:

```text
provideLayer: (Fx<A,E,Out>, Layer<Out,E,In>) -> Fx<A,E,In>
```

Constructor failures remain in `E`, and `In` remains required. Services built
before a later constructor fails must still finalize. A managed runtime can
build one application environment and submit many request-scoped workflows.

Initially, sharing means allocating a dependency once and passing that value to
multiple consumers. Reusing a layer recipe does not promise memoized allocation.
Automatic graph memoization stays deferred until identity, configuration,
failure caching, and per-runtime scope isolation have explicit contracts.

A future cache must key a bound construction node, not merely a factory. Two
applications or tenants with different configuration must not share a service
because they invoked the same constructor function.

## 6. Execution, concurrency, and policies

### 6.1. Managed runtime lifecycle

The runtime has four states: starting, open, closing, and closed. Initialization
failure closes acquired resources without exposing a usable runtime. Only open
admits submissions. Closing first rejects new work, then settles request owners,
then releases their supporting application resources. Disposal is idempotent.

Submitting after closure yields a defined submission error, not a fabricated
inhabitant of the submitted workflow's expected-error type. Distinguish this
boundary from errors returned after successful admission.

Owned child execution must expose join, outcome inspection, and interruption.
Public detached or daemon spawning is unnecessary for the first validators.
An owner cannot report successful shutdown while an admitted child remains
unaccounted for. A non-terminating finalizer can block quiescence; any bounded
shutdown escape must report that loss of guarantee explicitly.

### 6.2. Time, retry, and synchronization

Clock and random capabilities make delays, deadlines, and jitter controllable.
Virtual-time advancement runs due work until the test reaches a documented
quiescent point; it is not merely a fake timestamp disconnected from scheduling.

Timeout requests interruption and observes owned cleanup before reporting the
timeout outcome. Thus elapsed completion time can exceed the nominal deadline.
A separate 'stop waiting' API would need a visibly weaker ownership contract.

Schedules compose only the operations demanded by validators: bounded retries,
delay/backoff, jitter where needed, and repetition. State resets per execution.
Retries do not include defects or cancellation by default. Retrying acquisition
and retrying use of an acquired service remain distinct compositions.

Expose `Deferred`, `Ref`, a semaphore, or a bounded queue when a concrete
workflow requires them. Specify single completion, atomic update, permit
release, and queue shutdown respectively. The CDP dispatcher is a reason to
introduce correlation and completion primitives, not an excuse to port every
upstream concurrency module.

## 7. Native await as a gated experiment

[ReScript `await` requires a promise][await]. A library cannot make an opaque
`Fx` directly awaitable by choosing a convenient type alias. The proposed
bridge uses a typed scope:

```text
Direct.make:   (Scope<E,R> -> Promise<A>) -> Fx<A,E,R>
Direct.run:    (Scope<E,R>, Fx<A,E,R>) -> Promise<A>
Direct.result:(Scope<Outer,R>, Fx<A,Inner,R>) -> Promise<Result<A,Inner>>
```

Each `run` constrains the same scope's errors and requirements; the promise
itself does not gain a typed rejection parameter. `make` stores the callback
and invokes it afresh on execution. `result` handles the operation's expected
failures as values while preserving defects and interruption.

The bridge needs block-owned execution, inherited execution context, and
finalizers spanning the relevant awaits. Independent root `runPromise` calls
are not equivalent. Compare an owner-managed driver with supervised child
execution, including nested blocks and fibre-local context, before selecting
an implementation. Do not claim that those alternatives have identical
semantics.

Expected failures can leave native async code through a private rejection
signal tied to the block's typed state and per-execution identity. The boundary
must reject forged or foreign signals as defects rather than cast arbitrary
exceptions to `E`. Broad native catches can swallow such signals. E5 must
exercise that case and retain cancellation state independently of the signal.

Raw promises, detached continuations, escaped scopes, and raw side effects
remain outside complete management. refex cannot forcibly stop an arbitrary
JavaScript async continuation. A callback awaiting an uncooperative promise
may never settle; one that settles later may still execute raw code. The bridge
must document whether it waits or reports an incomplete shutdown, not quietly
promise prompt cancellation and total lifetime safety together.

For the managed subset, all asynchronous operations needing refex ownership
pass through the scope. Parallel work uses refex's owned combinators rather
than untracked native promise fan-out. Closed scopes reject new work, but this
runtime check is not a static non-escape proof.

Compare native-await and pipeline versions of the same Minesweeper controller.
Keep `Direct` experimental or omit it if the resulting contract is too weak or
its complexity outweighs the ergonomic gain. Transparent monadic await needs a
pre-typecheck transformation or compiler feature and remains deferred.

## 8. React and external boundaries

### 8.1. React ownership

React owns rendering and local presentation state. A provider supplies a stable
application runtime; a hook or event handler starts an owned workflow. Do not
start effects during render, or create a fresh application runtime for every
request. Dependency changes and unmount request cancellation of obsolete work.

[React's lifecycle documentation][react] defines setup and cleanup, including
an additional development Strict Mode cycle. Cleanup is a synchronous request,
not a callback whose returned shutdown promise React will await. The runtime
must retain ownership of asynchronous finalization after that request.

Use a generation identity to reject stale results before publishing state.
Cancellation alone cannot guarantee that a response does not race with a new
render. The provider must distinguish an owned runtime from a borrowed runtime,
and avoid reusing a disposed instance after the development cleanup cycle.

Test committed mount, cleanup, remount, dependency replacement, failure, and
completion. Request-server rendering and server components remain outside the
first React adapter contract. No client singleton may become a cross-request
server singleton by accident. Suspense and server-state caches remain separate
future integration decisions.

### 8.2. Schema, network, and process adapters

Use the selected `rescript-schema` package through a narrow adapter, not a new
schema language. Decode external values before the domain receives them and
preserve decode paths in typed protocol errors. Successful decoding still
requires domain validation and authorization where applicable.

The upstream [Sury documentation][sury] describes dynamic code generation and a
strict content-security-policy limitation. Pin and verify the actual ReScript
package/API and deployment policy before adopting it. Do not add an
`unsafe-eval` policy to make a demonstration pass without an explicit decision.

Network adapters distinguish transport, protocol, and domain failures and wire
cancellation to the supported foreign API. Aborting a client wait does not
undo a committed server operation. Process adapters own their spawned child,
consume stdout and stderr without pipe deadlock, and reap it after termination.
They never kill unrelated processes by name.

CDP endpoints and tab contents are sensitive. Validation uses controlled
loopback fixtures, redacts session URLs and secrets, avoids shell interpolation
of arguments, and never treats schema validation as permission to contact an
arbitrary privileged endpoint.

## 9. Vertical validation contracts

### 9.1. Animated React Minesweeper solver

Keep board generation, observations, inference, and move selection in pure
modules. The solver receives only revealed state and rules; hidden mine
positions belong to the board authority. Return an explicit 'no justified move'
result when deterministic inference cannot proceed. Any guessing strategy must
be explicit and seeded, not presented as a guaranteed safe deduction.

The controller owns solve, pause/resume, speed, reset, and new-board operations.
Inject time for pacing and publish progress through the React boundary. Bound
computation between yields so animation and cancellation have opportunities to
run; defer a worker abstraction unless measured main-thread cost requires it.

Acceptance compares fixed-seed traces under virtual and browser time, verifies
no stale board update after reset/unmount, and checks owned work at quiescence.
Use this identical controller contract to compare pipelines and `Direct` rather
than rewriting the solver algorithm to favour either surface.

### 9.2. Nine-room client-server roguelike

Deliver exactly nine connected rooms, movement, room descriptions, one inventory
interaction, and a win condition. A React client communicates with an
in-memory authoritative server through shared checked protocol values. World
transitions stay pure; session store, transport, time, randomness, and logging
have narrow replaceable interfaces.

Each server request owns its execution but not the shared application store.
The initial protocol must serialize commands per session or reject stale state
revisions. The design preference is a command identity plus expected revision:
repeated accepted identities return the recorded outcome rather than repeat the
mutation. Store update and outcome recording must share one atomic boundary.
Any simpler alternative must prohibit automatic retries of ambiguous writes.

A disconnected client may not know whether a command committed. Display and
reconcile that uncertainty instead of assuming cancellation rolls it back.
Keep monotonic state revisions in UI updates so an older response cannot undo
a newer state. In-memory state and deduplication need only survive the declared
server lifetime; durable recovery is not part of this validator.

Acceptance uses the same domain transitions with live and fake services, checks
malformed request/response rejection, duplicate and reordered commands, storage
failure, client cancellation, and clean server shutdown. Game scope must not
grow into authentication, matchmaking, or a general database framework.

### 9.3. Reimplementation of css-view

Keep the original implementation unchanged and pin the oracle revision recorded
in [context §7](context.md#7-source-register). Reimplement behaviour, not its
file structure. The [existing guide][css-guide] identifies the capture paths,
fixture policy, target filtering, and bounded transient-open retry.

Deliver local Playwright walker capture first, then local Chromium CDP,
direct external CDP, agent-browser navigation, and agent-browser current-page
capture. Preserve valid/invalid option combinations, output metadata and stable
payload facts, property selection, style inheritance, custom properties, and
node/text limits.

CDP connection state includes request identity, pending completions, event
waiters, and owned timers. Match replies by identity and session; settle every
pending completion on response, timeout, cancellation, or connection failure.
Register lifecycle observation before triggering events that could race it.
Cleanup detaches listeners and timers without closing a borrowed browser.

The existing transient-open rule retries once only for the documented non-zero
exit and `Event stream closed` condition. Virtual time must show that
cancellation during the delay prevents that second command. Never generalize
this into retries for every process failure.

Normalize only documented volatile fields, such as capture time, when comparing
outputs. Geometry still needs shape/range checks and deterministic-fixture
assertions where it is part of the contract. Do not erase differences in style
values, selected tabs, node limits, or errors to obtain parity. Oracle defects
require a recorded adjudication, not blind reproduction or silent correction.

## 10. Experimental validation

Each experiment produces a record containing the claim, revision and tool pins,
inputs/seeds, executed command, observations, limits, and accept/revise/reject
decision. Record proposed numerical budgets before collecting comparative
results. A missing tool or unexecuted scenario is an explicit gap.

### 10.1. Compiler and algebra experiments

**E1: requirements and errors, G1/G2, roadmap (1.2.1)-(1.2.3).** Compile
services and consumers through independent `.resi` boundaries on the pinned
compiler.
Accept complete and projected environments; reject absent fields, incompatible
services, wrong error injections, and unresolved requirements at a runner.
Every negative fixture must fail at its intended diagnostic. If open rows do
not compose soundly, select explicit projections rather than weaken types.

**E2: laziness and composition, G4, roadmap (1.3.1).** Record visible callbacks
and result/cause order. Test fresh repeated execution, deferred provision, and
at least 100,000 sequential binds in both IO and Reader paths as an initial
stress workload, not a throughput guarantee. Check identity, associativity,
and projection laws over generated terminating programs with pure callbacks.
Shrink failing descriptions to the smallest disagreeing trace. Exclude raw
side effects and scheduler-step counts from the law equivalence relation.

### 10.2. Ownership and direct-style experiments

**E3: acquisition and termination, G3, roadmap (1.3.2)-(1.3.3).** Enumerate
bounded schedules containing acquire, register, cancel, complete, and release
for one owner and two resources/children. Assert: each successful acquisition
has one release owner; release occurs once; children settle before required
parent resources close; cleanup failure retains the initial cause.

Implement an explicit-state reference model and compare adapter event traces
against it. Cover late acquisition, duplicate completion, partial construction,
and cancellation at every transition. Shrink by removing independent events
while preserving their happens-before constraints. This checks bounded
interleavings, not all possible foreign APIs or unbounded progress.

**E4: React ownership, G3/G5, roadmap (2.2.1)-(2.3.2).** Run development Strict
Mode and production lifecycle scenarios with reset, dependency replacement,
unmount/remount, delayed finalization, and completion races. Assert one current
publisher and no admitted owned work after observed quiescence. Test virtual
scheduling separately from real browser rendering; fake time alone does not
prove React integration.

**E5: native await, G1-G4, roadmap (1.4.1)-(1.4.2), (2.3.1).** Compare the same
controller with pipelines and the typed bridge. Exercise nested blocks, raw
promise waits, caught internal failures, escaped scopes, post-close submission,
and execution-context propagation. Failure to contain raw continuations must
remain documented. Reject general lifetime-equivalence claims if traces differ;
retain a narrower bridge only with an explicit supported contract.

### 10.3. Application and comparison experiments

**E6: client-server semantics, G2/G5, roadmap (3.4.1)-(3.4.2).** Generate
command sequences and transport schedules, then compare authoritative state
and visible revision with the pure domain model. Verify no duplicate mutation
for an
accepted command identity and no application of stale responses. Combine fake
clock/random/store with live HTTP and React end-to-end scenarios. The model
covers the single-server lifetime, not distributed durability.

**E7: tooling parity and ownership, G3/G5, roadmap (4.5.1)-(4.5.2).** Run every
supported backend/mode and explicit invalid combination against the pinned
oracle. Add pairwise coverage for independent formatting/property options, and
full targeted cases for borrowing versus ownership, active tabs with duplicate
URLs, timeout plus socket closure, and operation plus cleanup failure. Inspect
live handles/processes as well as `Exit`; clean counters alone are insufficient.

**E8: abstraction cost, G4/G6, roadmap (5.2.1)-(5.2.2).** Compare one shared
workload per validator under ordinary promises, direct bindings, and refex.
Keep domain logic, error/cancellation contract, compiler, bundler, and runtime
constant where meaningful. Mark comparisons with different semantics as such.
Report generated/browser bundle size, sequential overhead, admission and
cancellation-to-quiescence latency, acquisition cost, and build/CI resource use.
Separate cold/warm runs and report distributions, not one convenient number.

Ergonomics review records signatures, wiring sites, unsafe/platform escapes,
diagnostic quality, and the steps required for a representative change.
Reviewers assess clarity against a stated rubric; line count is not a proxy for
correctness. Publish negative results and confirm which APIs should disappear.

## 11. Operations and change discipline

Use existing public Make entrypoints and the pinned toolchain described in the
[developer guide](developers-guide.md). Keep generated production output under
compiler ownership and public modules behind `.resi` interfaces. Add actual
product scenarios to executed gates rather than accepting a test command that
never runs them.

Keep browser/process-heavy validation scoped and bounded. Reuse trusted binary
and browser caches where possible; record runner size, concurrency, wall time,
and resource use before expanding continuous-integration (CI) workloads.
Do not copy another repository's entire validation framework or create routine
heavy schedules without measured need.

Diagnostic events should identify execution, owner, resource, and phase without
logging credentials or full privileged endpoint URLs. Runtime diagnostics are
opt-in observations, not an application dependency on backend cause formatting.

A release candidate requires all three validators, explicit platform pins,
accepted API decisions, measured budgets, and ownership conformance. No release,
merge, dependency installation, or stable API follows from this draft. Existing
bootstrap tests remain necessary but insufficient.

## 12. Open decisions and adoption

- **D1, backend:** choose direct FFI or audited Reventless bindings and pin the
  runtime after E1-E3. Record the dependency-policy change as an ADR.
- **D2, requirements:** accept structural rows only after E1 across exported
  interfaces. Otherwise keep explicit projection as the public model.
- **D3, direct style:** decide supported, experimental, or omitted from E5 and
  the Minesweeper comparison. Do not make later validators depend on its
  success.
- **D4, schema deployment:** resolve the package/API, browser policy, and
  dynamic-evaluation compatibility before codec integration claims.
- **D5, numerical budgets:** approve the comparison workloads and thresholds
  before E8. Until then, no zero-cost or bundle-size promise is justified.
- **D6, package and release surface:** apply the existing real-source workspace
  trigger, then decide exports and compatibility from the three validators.
- **D7, extensions:** require a new vertical use case for graph memoization,
  streams, request caches, a native runtime, or a source transform.

Implementation owners remain unassigned. The repository owner accepts scope and
ADRs. Each experiment can accept, revise, narrow, or reject its proposal. The
library earns its surface through those outcomes, not by exhausting an upstream
module list.

## References

Sources accessed on 12 October 2026; [context §7](context.md#7-source-register)
contains the full source/provenance register.

- [Relude RIO][rio] and [Primavera][primavera]: monadic and dependency prior
  art.
- [Reventless package][bindings]: candidate bindings and consumer alternative.
- [Effect scope][scope]: resource-lifetime reference behaviour.
- [ReScript await][await]: native suspension contract.
- [React useEffect][react]: setup/cleanup and Strict Mode contract.
- [Sury][sury]: schema integration and deployment constraints.
- [css-view developer guide][css-guide]: behavioural reference and fixtures.

[rio]: https://github.com/reazen/relude/blob/main/src/Relude_RIO.re
[primavera]: https://github.com/cargocut/primavera
[bindings]: https://www.npmjs.com/package/@reventlessdev/rescript-effect
[scope]: https://www.effect.website/docs/v3/resource-management/scope
[await]: https://rescript-lang.org/docs/manual/async-await/
[react]: https://react.dev/reference/react/useEffect
[sury]: https://github.com/DZakh/sury
[css-guide]: https://github.com/leynos/css-view/blob/305bd947bdb063d3b93785186f2d0bc33d0a5ea3/docs/developers-guide.md
