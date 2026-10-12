# refex roadmap

This GIST roadmap sequences the [technical design](design.md) against goals
G1-G6 in the [terms of reference](terms-of-reference.md). It retains the
user-edited plan's six phases and original identifiers while integrating the
Lody lifecycle learnings recorded in
[context §8](context.md#8-lody-learning-crosswalk). Phases state testable
ideas, steps ask delivery questions, and tasks are review-sized execution
units. It makes no date commitments.

The first semantic experiment is a shared producer with two consumers,
controlled cancellation, delayed cleanup, and failed release. The application
validators remain an animated React Minesweeper solver, a nine-room
client-server roguelike with a React client, and a ReScript/refex
reimplementation of leynos/css-view against the pinned oracle. Pure domain work
remains pure; each slice introduces only the abstractions its behaviour
requires.

All boxes remain unchecked: specifying a contract, implementing it, exercising
a consumer, and verifying an interpreter/platform are separate facts. Accepted
bootstrap ADRs remain authoritative in scope; pending decisions live in
design.md §12 and become ADRs only through review. This roadmap materializes
and extends the edited plan, not an earlier conversational draft. References
below resolve through [the source register](context.md#7-source-register).

## 1. Prove the refex type and lifecycle model across ReScript boundaries

Idea: Re-architecting. If explicit interfaces and a small shared-work slice
preserve requirements, complete failures, and retained ownership, later
applications can build on one defensible model rather than correcting leaked
backend semantics.

Foundation work is bounded by executable behaviours. Primitive coverage alone
cannot pass this phase. The shared-producer slice must report unresolved
external work honestly before React or a real process adapter depends on it.

### 1.1. Freeze the hypotheses that the validators must test

Which promises can the library defend, and what evidence would reject them? The
answers constrain API and adapter decisions. See design.md §§1-2, 12.

- [ ] 1.1.1. Add a concise refex design brief defining the initial public
  abstractions and non-goals.
  - See design.md §§1-3.
  - [ ] Define Fx, Layer, resources, fibres, schedules, deterministic time, and
    React ownership; keep rescript-schema as the codec starting point.
  - [ ] Keep streams, STM, caches, native scheduling, and transparent await
    deferred.
  - Success: Every validator capability maps to a named contract or delegated
    library, with proposed and implemented status distinct.

- [ ] 1.1.2. Record a provisional ADR for the initial runtime boundary.
  - See design.md §§2.2-2.3.
  - [ ] Compare direct FFI with audited @reventlessdev/rescript-effect, pin the
    selected package, and explicitly address bootstrap dependency policy.
  - [ ] Audit provision, mixed-cause mapping, close, replacement, and promise
    projection rather than assume names preserve semantics.
  - Success: The ADR authorizes a bounded trial without exposed backend types;
    production adoption remains conditional on E1-E3/E9, avoiding a circular
    requirement to prove an adapter before authorizing its experiment.

- [ ] 1.1.3. Record an ADR for structural dependency environments.
  - See design.md §3.2.
  - [ ] Prefer Primavera-style capability objects with explicit projection as a
    sound fallback.
  - [ ] Separate construction inputs, invocation requirements, lifetime owner,
    and snapshot-versus-live observation.
  - Success: The ADR states which separate-module failure rejects automatic
    requirement accumulation.

- [ ] 1.1.4. Record an ADR for expected failures, defects, interruption, and
  release failures.
  - See design.md §4.
  - [ ] Use ordinary variants and a genuinely uninhabited infallible channel.
  - [ ] Retain complete causes through mapping, result conversion, native await,
    and promise boundaries; do not classify every release failure as a defect.
  - Success: No conversion erases simultaneous lifecycle reasons or casts an
    unrelated error type to satisfy its signature.

- [ ] 1.1.5. Record the behavioural contract for shared work, closure, and
  recovery.
  - See design.md §§2.4, 5-6.
  - [ ] Answer trigger, owner, cancellation, handoff, and recovery for the
    two-consumer slice.
  - [ ] Define joined close attempts, release receipts, unresolved generations,
    and a live recovery owner independent of discarded diagnostics.
  - Success: An ADR candidate names observable transitions and host-exit limits
    without importing platform APIs or a general supervisor framework.

### 1.2. Prove dependency and error composition through separate modules

Does the model work at real consumer interfaces rather than only in one
inference unit? Results select structural inference or explicit adaptation. See
design.md §§3-4, 10.1.

- [ ] 1.2.1. Implement the smallest opaque Fx surface needed to compile
  multi-module workflows.
  - Requires steps 1.1.
  - See design.md §3.
  - [ ] Include succeed, fail, suspend, map, flatMap, tap, mapError, access,
    accessEffect, provide, and explicit environment projection.
  - Success: Positive consumers need no application-level cast or backend type;
    execution and environment access remain deferred.

- [ ] 1.2.2. Add positive and negative compiler fixtures for structural
  requirements.
  - Requires 1.2.1.
  - See design.md §§3.2, 10.1.
  - [ ] Define services in separate implementation/interface files; test
    missing, conflicting, extra, and projected fields.
  - Success: Failures identify the intended requirement mismatch, not incidental
    syntax; the same runner rejects unresolved requirements.

- [ ] 1.2.3. Validate error composition using ordinary and polymorphic variants.
  - Requires 1.2.1.
  - See design.md §§4.2, 10.1.
  - [ ] Compare explicit injection and open variants across .resi boundaries,
    including conservative result and Direct recovery types.
  - Success: The selected strategy preserves a mixed cause without falsely
    erasing its remaining expected-error type.

### 1.3. Deliver a shared producer whose ownership survives cancellation

Can one small end-to-end behaviour retain responsibility when waiters stop and
release fails? It determines which runtime abstractions may become public. See
design.md §§4-6, 10.2, 10.4.

- [ ] 1.3.1. Implement the minimal audited runtime adapter for complete
  outcomes.
  - Requires 1.1.2, 1.1.4, and 1.2.1.
  - See design.md §§3.1, 4.
  - [ ] Keep terminal runners private; preserve mixed expected, defect,
    interruption, and release reasons through conversion.
  - [ ] Construct external work inside thunks and start a fresh attempt for each
    explicit retry.
  - Success: Body-success/release-failure and
    acquisition-failure/release-failure cannot become success or lose reasons;
    repeated descriptions execute afresh.

- [ ] 1.3.2. Demonstrate owned child execution and distinct cancellation
  contracts.
  - Requires 1.1.5 and 1.3.1.
  - See design.md §§5.4, 6.1-6.2.
  - [ ] Supply the smallest fork, await, join, and interruption operations for a
    producer and its local readers.
  - Success: Cancelling one ready reader preserves the other; ignored external
    abort ends no ownership claim without a release predicate.

- [ ] 1.3.3. Demonstrate scoped acquisition, joined closure, and recovery
  ownership.
  - Requires 1.1.5 and 1.3.1.
  - See design.md §§5.1-5.3, 10.2.
  - [ ] Model acquisition, registration, publication, close, and recovery;
    include late acquisition and partial setup failure.
  - [ ] Join concurrent closes to one attempt; retain unresolved resources
    outside discarded failure values.
  - Success: Each acquired generation has one owner, each attempt executes once,
    and successful release requires its predicate; failed retries retain
    responsibility.

- [ ] 1.3.4. Deliver the two-consumer producer with delayed and failing
  teardown.
  - Requires 1.3.2 and 1.3.3.
  - See design.md §10.4.
  - [ ] Expose readiness and an inspectable owner; apply retire-on-last-lease
    without creating a general cache.
  - [ ] Retain the original pending cleanup operation and gate same-identity
    replacement until confirmed release.
  - Success: Both consumers receive work, one can leave independently, and the
    last release yields either a receipt or an observable recoverable
    generation.

- [ ] 1.3.5. Deliver the combined shared-work conformance matrix.
  - Requires 1.3.4 and 1.2.3.
  - See design.md §10.4.
  - [ ] Await readiness before clock advance/cancellation, join managed work,
    and inspect raw-work and owner state.
  - [ ] Temporarily remove close joining, cause preservation, retention, or
    generation protection; restore each baseline.
  - Success: Every E9 scenario has a reproducible result and each targeted
    ablation fails its intended behaviour; no refex result is inferred from
    Lody's probes.

### 1.4. Determine whether real ReScript await is useful without weakening refex

Can native syntax preserve the managed-operation contract? Failure must
restrict or reject Direct rather than block the application validators. See
design.md §§7, 10.2.

- [ ] 1.4.1. Prototype a typed direct-style scope around native ReScript async
  and await.
  - Requires steps 1.2-1.3.
  - See design.md §7.
  - [ ] Prototype Direct.make, Direct.run, and conservative Direct.result with
    shared error/environment constraints; do not transform await Fx.t.
  - Success: Managed operations retain compile-time requirements and complete
    outcomes without independent root runners.

- [ ] 1.4.2. Falsify unsafe direct-style lifetime assumptions.
  - Requires 1.4.1.
  - See design.md §§7, 10.2, 10.4.
  - [ ] Exercise raw waits ignoring cancellation, nested blocks, caught
    rejection signals, mixed causes, escaped scopes, and post-close use.
  - Success: Retained ownership and late mutation are observable; documentation
    claims neither forcible raw-continuation cancellation nor unsupported
    lifetime equivalence.

## 2. Vertical slice 1: an animated Minesweeper solver in React

Idea: Capability. If animated solving and two views can share a producer
without coupling their lifetimes, refex provides useful interactive behaviour
while making failed teardown visible.

Minesweeper tests computation pacing, React ownership, cancellation, and
replacement with a small domain. It also compares pipelines and the conditional
Direct experiment on identical behaviour.

### 2.1. Deliver a deterministic solver that can be observed one move at a time

Does the pure-domain/effect boundary remain natural? Results decide how much
orchestration the controller needs. See design.md §9.1.

- [ ] 2.1.1. Implement the board, revealed-state model, and deterministic solver
  as pure ReScript modules.
  - See design.md §9.1.
  - [ ] Inject randomness only for generation or explicit guessing; never expose
    hidden mine positions to inference.
  - Success: Fixed seeds reproduce boards/traces and no justified move is
    explicit rather than a fabricated safe deduction.

- [ ] 2.1.2. Expose solver progress as a lazy refex workflow.
  - Requires 1.3.1 and 2.1.1.
  - See design.md §§3.1, 6.3, 9.1.
  - [ ] Inject a clock for pacing and model solve, pause, reset, and new-board
    operations with bounded work between yields.
  - Success: One trace runs under virtual time and visible browser animation
    without changing domain logic.

### 2.2. Prove React can own local work and subscribe to shared work

Can component cleanup request cancellation without losing asynchronous
ownership? Results determine the adapter contract. See design.md §§8.1, 9.1.

- [ ] 2.2.1. Implement the minimal React runtime provider and execution hook.
  - Requires 1.3.5 and 2.1.2.
  - See design.md §8.1.
  - [ ] Distinguish owned/borrowed runtime and component-local work; retain
    cleanup after synchronous React cleanup.
  - [ ] Use publisher generations and cover development Strict Mode remount.
  - Success: No work starts during render, disposed runtimes are not reused, and
    pending or failed teardown retains an owner.

- [ ] 2.2.2. Deliver the animated solver interface.
  - Requires 2.2.1.
  - See design.md §9.1.
  - [ ] Render board, inference, speed, pause/resume, reset, and new-board
    controls; keep presentation state in React.
  - Success: The usable animation goes through refex without introducing a
    general reactive-state system.

- [ ] 2.2.3. Deliver two React views sharing one solver producer.
  - Requires 2.2.2 and 1.3.4.
  - See design.md §§5.4, 8.1, 9.1.
  - [ ] Give each view an independent subscription; expose unresolved teardown
    and an explicit recovery path for the owner.
  - Success: Unmounting one view preserves the other; last-lease teardown and
    exclusive same-identity replacement obey their release contract.

### 2.3. Use Minesweeper to decide the direct-style API

Does Direct remove meaningful ceremony under the same ownership contract?
Combined lifecycle evidence controls promotion, not code aesthetics. See
design.md §§7, 10.2.

- [ ] 2.3.1. Compare one non-trivial solver-control workflow using pipelines and
  experimental Direct.
  - Requires 1.4.2 and 2.2.2.
  - See design.md §§7, 9.1.
  - [ ] Share domain/UI code and compare signatures, error adaptation, lifecycle
    traces, generated output, and debugging.
  - [ ] If the prototype fails its gate, retain the pipeline and record
    rejection rather than block later delivery.
  - Success: Direct stays experimental or disappears unless measured ergonomics
    justify its truthful contract.

- [ ] 2.3.2. Add deterministic animation and cancellation scenarios for the
  complete React solver.
  - Requires 2.3.1.
  - See design.md §10.2.
  - [ ] Cover reset, new board, unmount, completion, and failure with explicit
    readiness; keep real browser coverage separate.
  - Success: No stale state update occurs; confirmed quiescence contains no
    work, and unresolved external work is reported rather than hidden.

- [ ] 2.3.3. Exercise the shared-view lifecycle matrix in React.
  - Requires 2.2.3 and 2.3.2.
  - See design.md §§10.2, 10.4.
  - [ ] Combine Strict Mode, one-reader cancellation, last release, delayed
    failure, recovery, and replacement.
  - Success: Browser observations match E9 ownership semantics and discarded
    diagnostics do not drop the recovery owner.

## 3. Vertical slice 2: a nine-room client-server roguelike

Idea: Capability. If one game reuses the same contracts on both sides of a
network, dependencies and observation timing can vary without losing service
ownership or duplicating commands.

Nine rooms bound the game. The slice tests protocol decoding, shared services,
request admission, and ambiguous writes rather than a server framework.

### 3.1. Establish one shared, schema-checked game protocol

Can schemas own boundary validation without becoming execution policy? The
result fixes the wire/domain separation. See design.md §§8.2, 9.2.

- [ ] 3.1.1. Define the nine-room world, commands, events, and protocol payloads
  as shared ReScript types.
  - See design.md §9.2.
  - [ ] Include connected rooms, descriptions, movement, an inventory
    interaction, and a minimal win condition.
  - Success: A pure command/event harness drives the complete game without React
    or HTTP.

- [ ] 3.1.2. Define request and response codecs with rescript-schema.
  - Requires 3.1.1.
  - See design.md §§8.2, 9.2.
  - [ ] Share schemas, preserve decode paths, and resolve package/browser policy
    without weakening security implicitly.
  - Success: Malformed messages cannot enter domain transitions; successful
    decoding does not substitute for domain checks.

### 3.2. Deliver a server command through independently replaceable services

Do requirement, observation, and ownership contracts remain separate under
service composition? Results constrain endpoint and layer APIs. See design.md
§§3.2, 5.4, 9.2.

- [ ] 3.2.1. Implement server services for world state, session storage,
  randomness, time, and logging.
  - Requires 1.3.5 and 3.1.1.
  - See design.md §§3.2, 5.4.
  - [ ] Keep interfaces narrow; declare snapshot or per-operation observation
    and construct shared services once.
  - Success: Changing a live provider affects the next operation, snapshots stay
    fixed, and explicitly fresh services remain independent.

- [ ] 3.2.2. Deliver the HTTP command endpoint as a scoped refex workflow.
  - Requires 3.1.2 and 3.2.1.
  - See design.md §§6.3, 9.2.
  - [ ] Decode, admit, execute, persist, and encode; serialize session mutation
    or reject stale revisions.
  - [ ] Record command identity atomically with mutation before enabling
    ambiguous-write retries; specify fairness and re-entry separately.
  - Success: Cancelled waiters cannot acquire later; replacing one service
    leaves unrelated construction alone and accepted duplicates do not repeat
    mutation.

### 3.3. Deliver the React game using the same execution model

Can presentation remain ordinary React while refex owns transport work? This
tests the same model across a real boundary. See design.md §§8-9.

- [ ] 3.3.1. Implement a typed transport service using the shared schemas.
  - Requires 3.1.2 and 3.2.2.
  - See design.md §§8.2, 9.2.
  - [ ] Contain fetch/rejections and distinguish transport, protocol, domain,
    cancellation, and lifecycle outcomes.
  - Success: Components neither parse raw JSON nor treat cancellation as proof
    of server rollback.

- [ ] 3.3.2. Build the nine-room React client.
  - Requires 2.2.1 and 3.3.1.
  - See design.md §9.2.
  - [ ] Render rooms, exits, inventory, messages, and restart; reconcile
    ambiguous commands and reject stale state revisions.
  - Success: All nine rooms are playable against the live server without
    cancelling the shared store on component unmount.

### 3.4. Stress dependency substitution, admission, and retry policy end to end

Do failures change only intended outcomes rather than observation timing or
ownership? The result validates the portable service model. See design.md
§§6.3, 10.3.

- [ ] 3.4.1. Introduce controllable latency and failures through test service
  implementations.
  - Requires 3.3.2.
  - See design.md §§4, 9.2.
  - [ ] Exercise store failure, malformed replies, lost responses, interruption,
    and body/acquisition plus release failure.
  - [ ] Retry acquisition, body, whole cycle, and recovery only under their
    separate stated policy.
  - Success: Failures preserve their intended complete outcomes and release
    failure never accidentally repeats movement or inventory changes.

- [ ] 3.4.2. Add an end-to-end dependency and failure matrix.
  - Requires 3.4.1.
  - See design.md §10.3.
  - [ ] Combine fake/live clock and randomness, shared/fresh store,
    live/snapshot config, malformed protocol, cancellation, and duplicate
    commands.
  - [ ] Include queued cancellation and immediate reacquisition; assert strict
    FIFO only when the chosen policy promises it.
  - Success: Behaviour changes through supplied services, not patched globals;
    authoritative state matches the model and lifetime claims match observed
    state.

## 4. Vertical slice 3: reimplement css-view using refex

Idea: Capability. If refex preserves CLI behaviour while exposing unresolved
browser/process cleanup and safe handoff, its lifecycle model is useful beyond
applications designed around it.

Keep the TypeScript oracle unchanged. Real browser, WebSocket, and subprocess
paths supply evidence that simulated ownership alone cannot provide. Do not
import a file-lock framework to imitate the motivating case study.

### 4.1. Establish behavioural parity before replacing implementation details

What counts as an observable compatible reimplementation? The answer prevents
silent contract changes during migration. See design.md §9.3.

- [ ] 4.1.1. Build a differential fixture harness for the original and ReScript
  css-view CLIs.
  - See design.md §§9.3, 10.3.
  - [ ] Pin oracle/browser/fixture revisions and document volatile
    normalization; preserve geometry contract checks.
  - Success: One command produces meaningful structural differences and directly
    checks important fixture facts.

- [ ] 4.1.2. Encode backend and mode rules as typed planning before browser
  execution.
  - Requires 4.1.1.
  - See design.md §9.3.
  - [ ] Preserve agent-browser, Playwright, direct CDP, walker, engine, and
    current-page compatibility rules.
  - Success: Valid/invalid CLI combinations match the oracle before any
    subprocess or browser side effect.

### 4.2. Reproduce local Playwright walker capture with explicit ownership

Can the resource abstraction replace manual cleanup without claiming release
when termination remains uncertain? This establishes the real-browser contract.
See design.md §§5, 9.3.

- [ ] 4.2.1. Implement local browser, context, and page acquisition as nested
  scoped resources.
  - Requires 1.3.5 and 4.1.2.
  - See design.md §§5.1-5.3.
  - [ ] Separate owned and borrowed handles; retain late acquisition and failed
    teardown under generation-aware ownership.
  - Success: Each acquisition failure releases already-owned resources or
    reports a retained unresolved owner; concurrent closes join one attempt.

- [ ] 4.2.2. Reimplement walker capture and reproduce the fixture snapshot.
  - Requires 4.2.1.
  - See design.md §9.3.
  - [ ] Preserve inherited/default/custom styles, text clipping, node limits,
    and cleanup of temporary in-page state.
  - Success: Stable output matches the oracle and publication never exposes an
    unowned partially initialized capture handle.

### 4.3. Reproduce direct CDP capture with owned protocol coordination

Can correlation, readiness, cancellation, and connection ownership compose
without abandoned waiters? Results determine the required primitives. See
design.md §§6, 9.3.

- [ ] 4.3.1. Implement a scoped CDP WebSocket connection and request dispatcher.
  - Requires 1.3.5 and 4.2.1.
  - See design.md §§5.3, 9.3.
  - [ ] Track request/session identities and settle pending work on replies,
    timeouts, cancellation, and closure; retain raw connection ownership
    separately.
  - Success: Cancelled waiters cannot complete later, and wrapper completion
    cannot falsely certify socket or borrowed-session termination.

- [ ] 4.3.2. Reimplement navigation/event waiting and CDP snapshot capture.
  - Requires 4.3.1.
  - See design.md §§5.3, 9.3.
  - [ ] Register listeners before triggering events and preserve
    lifecycle/network-idle waits and active-page selection.
  - Success: Synchronous-event races are covered and normalized CDP output plus
    external-session ownership match the oracle contract.

### 4.4. Reproduce agent-browser as a process dependency

Can typed commands, observation, and narrowly placed retries preserve real tool
behaviour? The result tests the platform seam rather than a new process
framework. See design.md §§6.3, 8.2, 9.3.

- [ ] 4.4.1. Define a process-command capability and implement the agent-browser
  adapter.
  - Requires 1.3.5.
  - See design.md §§8.2, 9.3.
  - [ ] Capture both output pipes and exit status, decode tab-list JSON, and
    preserve active page filtering.
  - [ ] State separate process termination, output-drain, and borrowed-session
    release predicates.
  - Success: A fake service drives the adapter, while real-path checks establish
    only their actually observed release conditions.

- [ ] 4.4.2. Express transient Event stream closed recovery as a refex schedule.
  - Requires 4.4.1.
  - See design.md §§6.3, 9.3.
  - [ ] Retry only the existing transient open failure once, with injected time
    and fresh lazy work.
  - [ ] Keep capture/body/release outside acquisition retry and join original
    pending cleanup rather than reissue it.
  - Success: Non-transient failures never retry; cancellation during delay
    prevents the second command; failed release does not repeat the body.

- [ ] 4.4.3. Reproduce current-page and normal agent-browser capture end to end.
  - Requires 4.3.2 and 4.4.2.
  - See design.md §9.3.
  - [ ] Preserve session selection, opening, endpoint discovery, target choice,
    and output without destroying borrowed sessions.
  - Success: The differential harness reports parity for both modes with
    explicit external release evidence.

### 4.5. Make lifecycle failures challenge the complete CLI behaviour

Do real boundaries meet the same contracts as E9? This decides adapter
eligibility and remaining platform limits. See design.md §§10.3-10.4.

- [ ] 4.5.1. Add a combinatorial lifecycle suite for browser, CDP, and process
  ownership.
  - Requires steps 4.2-4.4.
  - See design.md §§5, 10.3.
  - [ ] Combine delayed acquisition/release, timeout, cancellation,
    socket/command failure, concurrent close, discarded errors, and successor
    replacement.
  - [ ] Ablate recovery retention, complete-cause conversion, and generation
    protection; restore each baseline and inspect external state.
  - Success: Every case releases owned resources or retains an observable
    unresolved owner; no borrowed session dies and no failed release becomes
    success.

- [ ] 4.5.2. Run both implementations across the supported backend/mode matrix.
  - Requires 4.5.1.
  - See design.md §§9.3, 10.3.
  - [ ] Cover Playwright walker, local Chromium CDP, direct endpoint, agent
    navigation, and current-page capture with pinned browsers/platforms.
  - Success: All non-adjudicated stable behaviour matches; missing platform
    coverage remains explicit rather than inferred from local mocks.

## 5. Converge evidence into a deliberately small release surface

Idea: Refactor / consolidation. If the validators use one canonical set of
contracts without escapes, removing speculative APIs reduces maintenance cost
without discarding needed behaviour.

Judge consolidation by a smaller defect surface and lower change cost, not by
adding features. Evidence distinguishes library implementation, actual consumer
ownership, and platform coverage.

### 5.1. Inventory what the validators actually needed

Which abstractions earned a public home, and which costs came from incorrect
guesses? The result directs reduction rather than an API catalogue. See
design.md §§10-12.

- [ ] 5.1.1. Produce a capability-use matrix across all three validators.
  - Requires phases 2-4.
  - See design.md §§10-11.
  - [ ] Inventory sequencing, layers, release/recovery, fibres, clocks,
    admission, React, Direct, and raw/backend escapes.
  - Success: Each proposed public module has a consumer or unavoidable contract;
    each escape has a classified reason.

- [ ] 5.1.2. Remove or internalize APIs justified only by an early incorrect
  experiment.
  - Requires 5.1.1.
  - See design.md §12.
  - [ ] Keep one canonical implementation/name per seam, document its home, and
    retain consumer conformance during reduction.
  - Success: All validators still work, complete outcomes remain intact, and
    explicit projection wins over unsound convenience.

- [ ] 5.1.3. Record delivery and verification status independently for retained
  contracts.
  - Requires 5.1.1.
  - See design.md §§10-11.
  - [ ] Use small records for specified, implemented, consumer-exercised, and
    interpreter/platform-verified status, with revision and gaps.
  - Success: A merged kernel never marks consumers complete; untested platforms
    remain evidence gaps; no Lody-sized manual ledger is introduced.

### 5.2. Verify that refex earns its abstraction cost

Does the ReScript surface improve real work enough to justify another
dependency? Equivalent semantics and negative results determine the answer. See
design.md §10.3.

- [ ] 5.2.1. Compare representative workflows with direct Reventless bindings.
  - Requires 5.1.1.
  - See design.md §10.3.
  - [ ] Use one shared workload per validator and compare signatures, wiring,
    failures, observation timing, ownership, and change/debugging effort.
  - Success: The design names demonstrated advantages and counterexamples
    without comparing unlike safety contracts as equivalent.

- [ ] 5.2.2. Measure runtime and bundle overhead at representative boundaries.
  - Requires 5.1.1.
  - See design.md §10.3.
  - [ ] Compare promises, direct Effect, and refex; measure chains, environment
    access, admission, resources, React bundles, and CI costs.
  - [ ] Separate cancellation-to-report from confirmed release and report
    cold/warm distributions.
  - Success: Pre-agreed workloads/budgets and limitations precede performance
    claims; pure hot paths need not pay lifecycle overhead.

### 5.3. Freeze the initial supported programming model

Can maintainers state a complete and bounded contract from the evidence? The
result is release readiness, not automatic publication. See design.md §§11-12.

- [ ] 5.3.1. Ratify the public module surface as ADRs and explicit interfaces.
  - Requires steps 5.1-5.2.
  - See design.md §12.
  - [ ] Decide Direct status, React ownership, release/recovery representation,
    and which admission/schedule APIs earned support.
  - Success: Each export has observable semantics and consumer evidence,
    including unresolved release limits.

- [ ] 5.3.2. Package the three validators as executable examples and conformance
  evidence.
  - Requires 5.3.1.
  - See design.md §§10-11.
  - [ ] Keep React examples runnable and the css-view oracle corpus intact;
    require E9 and consumer checks for backend upgrades.
  - Success: Release review can distinguish passing contracts and unverified
    platforms without treating package/bootstrap checks as semantic proof.

## 6. Deferred extensions after the validated core

Idea: Capability. If the core already fulfils its bounded lifecycle promises,
wider facilities can be evaluated by new user value without destabilizing
ownership or copying an upstream catalogue.

These are separate future capabilities, not missing checkboxes to fill before
the first validators. Each proposal needs its own consumer and the same
conformance discipline.

### 6.1. Evaluate transparent monadic await

Would syntax transformation solve a demonstrated remaining usability problem?
Its result determines whether compiler tooling is justified. See design.md §§7,
12.

- [ ] 6.1.1. Prototype a pre-typecheck transform only after the Direct evidence
  justifies it.
  - Requires 5.3.1.
  - See design.md §7.
  - [ ] Transform a narrow subset into ordinary combinators and reject
    unsupported constructs explicitly.
  - Success: Types, complete failures, ownership, and evaluation order match
    handwritten pipelines.

### 6.2. Evaluate graph-level layer memoization

Does a consumer need more than explicit shared allocation? The answer gates any
graph cache. See design.md §§5.4, 12.

- [ ] 6.2.1. Add construction-node memoization only for a demonstrated graph use
  case.
  - Requires 5.3.1.
  - See design.md §5.4.
  - [ ] Define identity, configuration, scope, failures, pending release, and
    observer cancellation before implementation.
  - Success: Diamond graphs share intentionally; fresh/differently configured
    runtimes remain distinct and pending old generations cannot be replaced
    unsafely.

### 6.3. Evaluate server-state caching and request batching

Does refex add value beyond an existing React cache owner? This decides whether
an additional abstraction is warranted. See design.md §§8.1, 12.

- [ ] 6.3.1. Compare a refex request/cache abstraction with TanStack Query at
  the React boundary.
  - Requires 5.3.1.
  - See design.md §8.1.
  - [ ] Preserve independent reader waits and an explicit producer lifetime
    without duplicating freshness/invalidation machinery speculatively.
  - Success: Any promoted abstraction has a concrete advantage and an
    unambiguous owner.

### 6.4. Evaluate streams and broader concurrency facilities

Does sustained data flow require more than the existing bounded interfaces? A
vertical use case decides promotion. See design.md §§6.3, 12.

- [ ] 6.4.1. Introduce streams, PubSub, STM, or richer queues only for a
  demonstrated flow.
  - Requires 5.3.1.
  - See design.md §12.
  - [ ] Start with backpressure/coordination behaviour and specify fairness,
    cancellation, and terminal ownership.
  - Success: The subsystem begins with a usable slice, not an API-porting
    exercise.

### 6.5. Evaluate a native runtime

Do measured limitations justify owning execution machinery? The same contracts
decide whether a replacement is eligible. See design.md §§2.3, 12.

- [ ] 6.5.1. Investigate a native backend only for measured cost, portability,
  or semantic limits.
  - Requires 5.3.2.
  - See design.md §§2.3, 10.
  - [ ] Keep public interfaces and run identical E1-E9/consumer contracts,
    including failure-preserving projections and unresolved ownership.
  - Success: The decision rests on measured benefits and declared
    interpreter/platform evidence, not the aesthetic appeal of one fewer
    dependency.
