# ADR 007: shared work, closure, and recovery contract

Status: proposed. Date: 17 October 2026.

## Context

The first semantic experiment (E9) is one shared producer with two consumers,
local cancellation, delayed cleanup, and failed release
([design §§2.4, 5, 6, 10.4](design.md#24-behaviour-before-primitives)). Goal
G3 requires that a failed release keeps an identifiable owner until confirmed
release or explicit transfer, and that discarding a diagnostic does not discard
that responsibility. Design §5.2 proposes the release lifecycle, and decisions
D9 (recovery owner) and D10 (admission and publication) remain open.

The [runtime-boundary audit](evidence/runtime-boundary-audit.md) showed that
neither Effect line joins a repeated scope close, awaits a replaced fibre's
finalizer, or waits for work that ignores its abort signal. These contracts are
therefore refex's own. This ADR is the behavioural contract that roadmap tasks
1.3.2 to 1.3.5 implement; it is a candidate until E9 supplies evidence.

## Decision

In the context of one shared producer with two consumers whose cleanup can be
delayed or fail, facing backend primitives that neither join close attempts nor
protect successors, refex decides for an explicit per-generation lifecycle held
by a live owner registry and advanced by a pure transition function, and
against delegating closure to backend scopes, a general supervisor framework,
and generation checks in the user interface alone, to achieve joined close
attempts, honest unresolved states, and recovery that survives discarded
diagnostics, accepting that a generation which never settles blocks exclusive
replacement and is retained until the host exits.

## Behavioural contract

The five questions of design §2.4, answered for the two-consumer slice:

| Question     | Answer                                                                                                                                                                                                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger      | The producer's owner starts acquisition explicitly; construction does no work. Lease requests are admitted only after publication; the shell holds earlier requests until then, and a cancelled held request leaves no claim. Re-entry by the owner joins the current attempt rather than starting another. |
| Owner        | The producer owner holds the producer, its raw external work, and each resource generation in a live owner registry. Each consumer owns only its lease and its wait, never the producer.                                                                                                                    |
| Cancellation | A consumer stops waiting and releases its lease; the producer continues while another lease remains. The owner's close revokes remaining leases and starts one release attempt. Confirmed termination requires the adapter's release predicate.                                                             |
| Handoff      | A successor for the same exclusive identity is admitted only after the predecessor is released with a receipt, or after verified isolation.                                                                                                                                                                 |
| Recovery     | An unresolved generation stays in the registry with its owner, attempt, and report history. Recovery starts a new attempt only from a settled failure. Transfer completes only when the destination acknowledges it.                                                                                        |

The three cancellation contracts of
[design §6.2](design.md#62-three-cancellation-contracts) stay distinct and
named: *stop waiting* withdraws one observer; *interrupt and join* requests
managed interruption and observes termination plus finalizer attempts; *confirm
termination* establishes the adapter's external predicate. A promise adapter
states which it provides. Interrupting `tryPromise` provides only stop waiting
(audit P6).

## Lifecycle model

The model below is specified, not implemented. One producer identity has a
configuration `maxAttempt` (an `int`, at least 1) and the following fields for
each generation:

- `generation`, the identifier that settlement, bound, and isolation events
  must match; a successor gets a new identifier, so a late event for a
  predecessor never matches it;
- `owner` and an optional `pendingTransfer` destination;
- `phase`, one of the phases listed below;
- `lastStarted` and `lastSettledFailed`, the attempt history fields;
- `history`, an append-only array of reports;
- `isolationVerified`, a boolean.

The producer also holds `deferredSuccessors`, keyed by successor identity.

Phases: `Acquiring{cancelRequested}`, `Open{leases}`,
`Closing{attempt, joiners}`, `UnresolvedPending{attempt, joiners, report}`,
`UnresolvedSettledFailed{attempt, report}`, `Recovering{attempt, joiners}`,
`Released{receipt}`, and `AcquisitionFailed{report}`, which is terminal and
carries no obligation. `UnresolvedPending` is the owner-visible phase reached
when the owner's observation bound elapses while an attempt is still in flight;
a caller's own bound only delivers that caller a report.

Events: `AcquireSucceeded`, `AcquireFailed{partial}`,
`AcquireCancelRequested{caller}`, `LeaseAcquired{lease}`,
`LeaseCancelled{lease, caller}`, `LeaseReleased{lease, caller}`,
`CloseRequested{caller}`, `WaitBoundElapsed{generation, caller, attempt}`,
`OwnerBoundElapsed{generation, attempt}`,
`AttemptSucceeded{generation, attempt, predicate}`,
`AttemptFailed{generation, attempt, issue}`, `RecoverRequested{caller}`,
`TransferOffered{destination}`, `TransferAcknowledged{destination}`,
`SuccessorRequested{identity}`, and `IsolationVerified{generation, evidence}`.
Attempt numbers are scoped to a generation, so every settlement and bound event
names its generation; a "current" event in the table below matches both the
current generation and its in-flight attempt, and any other is stale (T-18).

Commands to the shell: `Publish`, `StartAttempt{generation, attempt}`,
`JoinAttempt{caller, attempt}`, `Report{caller, report}`, `RevokeLease{lease}`,
`AdmitSuccessor{identity}`, `DeferSuccessor{identity}`, and `Refuse{reason}`.

### Observable transitions

"In flight" means `Closing`, `UnresolvedPending`, or `Recovering`. "Authorized"
means the owner, or the host acting for it. Each transition names the
observation a test uses to establish it.

| ID   | From                                                   | Event and guard                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | To                                                                                     | Commands                                                                                    | Observation                |
| ---- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------- |
| T-1  | `Acquiring{cancelRequested: false}`                    | `AcquireSucceeded`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `Open{[]}`                                                                             | one `Publish`                                                                               | Publication readiness      |
| T-2  | `Acquiring{cancelRequested: true}`                     | `AcquireSucceeded`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `Closing{lastStarted + 1}`                                                             | one `StartAttempt`, no `Publish`                                                            | Finalizer entry            |
| T-3  | `Acquiring`                                            | `AcquireFailed{partial: true}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `Closing{lastStarted + 1}`                                                             | one `StartAttempt`                                                                          | Finalizer entry            |
| T-4  | `Acquiring`                                            | `AcquireFailed{partial: false}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `AcquisitionFailed`                                                                    | `AdmitSuccessor` per deferred                                                               | Failure report             |
| T-5  | `Acquiring`                                            | authorized `AcquireCancelRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `Acquiring{cancelRequested: true}`                                                     | none                                                                                        | Owner record               |
| T-6  | `Open`, lease not held                                 | `LeaseAcquired`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `Open`, lease added                                                                    | none                                                                                        | Lease readiness            |
| T-7  | `Open`, other leases remain                            | `LeaseCancelled` or `LeaseReleased` whose caller holds the lease                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `Open`, that lease removed                                                             | none                                                                                        | Other leases remain served |
| T-8  | `Open`, last lease                                     | `LeaseCancelled` or `LeaseReleased` whose caller holds the lease                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `Closing{lastStarted + 1}`                                                             | one `StartAttempt`                                                                          | Finalizer entry            |
| T-9  | `Open`                                                 | authorized `CloseRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `Closing{lastStarted + 1}`                                                             | `RevokeLease` per lease, one `StartAttempt`, `JoinAttempt`                                  | Finalizer entry            |
| T-10 | in flight                                              | authorized `CloseRequested` or `RecoverRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | unchanged; caller added to joiners                                                     | one `JoinAttempt{current}` when the caller is newly added; none for a caller already joined | Same attempt reported      |
| T-11 | `Closing` or `Recovering`                              | `OwnerBoundElapsed{current}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `UnresolvedPending`, same attempt                                                      | none                                                                                        | Owner inspection           |
| T-12 | in flight, caller is a current joiner                  | `WaitBoundElapsed{caller, current}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | unchanged, caller removed                                                              | one `Report` to that caller                                                                 | Caller's report            |
| T-13 | in flight                                              | `AttemptSucceeded{current, predicate}`, predicate is the adapter's declared release predicate                                                                                                                                                                                                                                                                                                                                                                                                                              | `Released{receipt}`, receipt built from the event's generation, attempt, and predicate | `Report` per joiner, `AdmitSuccessor` per deferred                                          | Receipt                    |
| T-14 | in flight                                              | `AttemptFailed{current}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `UnresolvedSettledFailed`                                                              | `Report` per joiner                                                                         | Settled-failure report     |
| T-15 | `UnresolvedSettledFailed`, below bound                 | authorized `RecoverRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `Recovering{lastStarted + 1}`                                                          | one `StartAttempt`, `JoinAttempt`                                                           | Finalizer entry            |
| T-16 | `UnresolvedSettledFailed`, at bound                    | authorized `RecoverRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | unchanged                                                                              | `Refuse`                                                                                    | Refusal                    |
| T-17 | `UnresolvedSettledFailed` or `Released`                | authorized `CloseRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | unchanged                                                                              | one `Report` of the settled state                                                           | Existing report            |
| T-18 | any                                                    | stale or duplicate settlement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | unchanged, history appended                                                            | `Refuse`                                                                                    | History entry              |
| T-19 | any non-terminal                                       | authorized `TransferOffered`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `pendingTransfer` set                                                                  | none                                                                                        | Owner record               |
| T-20 | any non-terminal                                       | `TransferAcknowledged` from the offered destination                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | owner changed                                                                          | none                                                                                        | Destination owns it        |
| T-21 | `Released`, `AcquisitionFailed`, or isolation verified | `SuccessorRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | unchanged                                                                              | `AdmitSuccessor`                                                                            | Successor starts           |
| T-22 | otherwise                                              | `SuccessorRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | identity deferred                                                                      | `DeferSuccessor`                                                                            | Successor waits            |
| T-23 | any non-terminal, isolation not yet recorded           | authorized `IsolationVerified` for the current generation                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | isolation recorded, deferred successors cleared                                        | `AdmitSuccessor` per deferred                                                               | Successor starts           |
| T-24 | any                                                    | any event that matches no row above, including unauthorized request, a repeated `SuccessorRequested` for an identity already deferred or admitted, including a lease release from a caller that does not hold the lease; `LeaseAcquired` outside `Open` or for a held lease; `WaitBoundElapsed` for a non-joiner; repeated or other-generation `IsolationVerified`; `AttemptSucceeded` whose predicate is not the adapter's declared release predicate; and late `AcquireSucceeded` or `AcquireFailed` outside `Acquiring` | unchanged                                                                              | `Refuse`                                                                                    | Refusal                    |

A close requested by the owner while consumers still hold leases revokes them
(T-9). The rejected alternative, waiting for the last lease, would let a
consumer delay the owner's shutdown indefinitely.

## Invariants and proof obligations

These statements are specified and unverified. They are hypotheses about the
eventual proof structure, not completed proofs.

Invariants, which must hold in every reachable state:

- INV-1, single owner: a generation that is neither `Released` nor
  `AcquisitionFailed` has exactly one owner, which changes only on
  `TransferAcknowledged` from the offered destination; the obligation moves
  intact.
- INV-2, one attempt in flight: in an in-flight phase the recorded attempt
  equals `lastStarted`, and no other attempt of that generation is in flight.
- INV-3, no duplicate destructive call: `StartAttempt` is emitted only by
  T-2, T-3, T-8, T-9, and T-15.
- INV-4, receipt soundness: `Released` is reached only by T-13, from an
  `AttemptSucceeded` for the current attempt whose predicate is the adapter's
  declared release predicate (AXIOM-5). The receipt is built from that event
  and carries its generation, attempt, and predicate. An unconfirmed success is
  refused (T-24) and leaves the attempt in flight.
- INV-5, stale and duplicate refusal: a settlement for a non-current attempt,
  another generation, or a settled phase changes no owner, phase, or attempt,
  and appends one refusal record to `history`.
- INV-6, bounded monotone attempts: `lastStarted` strictly increases and never
  exceeds `maxAttempt`. ReScript `int` is 32-bit and wraps, so the bound is a
  production-code rule (T-16), not a proof convenience.
- INV-7, successor gate: `AdmitSuccessor` for an exclusive identity is emitted
  only when the predecessor is `Released`, `AcquisitionFailed` (which never
  acquired anything), or isolation is verified.
- INV-8, retention: only T-13, T-20, and T-4 remove an obligation from this
  owner. Discarding a diagnostic is not an event.
- INV-9, history is append-only and keeps the original obligation.
- INV-10, lease independence: in `Open`, removing a lease removes only that
  lease.
- INV-11, leases exist only in `Open` (T-24 refuses others).
- INV-12, ownership before publication: `Publish` is emitted only by T-1.
- INV-13, one report per joiner per attempt.
- INV-14, authorization: only the owner or the host may close, recover, or
  offer a transfer; a leaseholder may release or cancel only its own lease.
- INV-15, fresh attempts before cleanup: in `Acquiring` and `Open`,
  `lastStarted` is 0. With `maxAttempt` at least 1, T-2, T-3, T-8, and T-9
  therefore always start attempt 1 within the bound; only recovery (T-15, T-16)
  can reach it.
- INV-16, uniqueness: the lease set and each attempt's joiners hold every
  identity at most once, so removing a lease removes exactly that lease
  (INV-10) and each joiner receives one report (INV-13).
- INV-17, isolation is recorded once per generation, and recording it admits
  and clears the deferred successors.
- INV-18, one successor per identity: `deferredSuccessors` holds each
  exclusive identity at most once, a repeated `SuccessorRequested` for a
  deferred or admitted identity is refused (T-24), and each admission removes
  its identity, so no identity is admitted twice.

Exact-effect and progress clauses guard against a contract that a reducer
refusing everything would satisfy: PR-1 is T-9, PR-2 is T-13, PR-3 is T-14,
PR-4 is T-15, PR-5 is T-11, PR-6 is T-6, PR-7 is T-10 (one `JoinAttempt` per
newly joined caller), PR-8 is T-8, PR-9 is T-20, PR-10 is T-21 and T-22 (never
`Refuse`), PR-11 is T-23, PR-12 is T-1 and T-2, and PR-13 is T-12, each with
exactly the commands listed.

Lemma statements:

- L-1: `step` preserves `wellFormed`, the conjunction of INV-1, INV-2, INV-6,
  INV-11, INV-15, INV-16, and the structural shape constraints.
- L-2: each PR clause holds as a postcondition of `step`.
- L-3: INV-5 and INV-14 hold as frame postconditions of `step`.
- L-4: per generation, emitted `StartAttempt` commands carry attempts 1, 2, 3,
  and so on, consecutively, each after an accepted failure of its predecessor.
  The per-step proof is carried by `lastStarted` and `lastSettledFailed`; the
  trace statement follows by induction.
- L-5: INV-4, INV-7, INV-12, INV-17, and INV-18 hold as postconditions of
  `step`.
- L-6: per step, owner and obligation are unchanged except under T-4, T-13,
  and T-20; the trace statement follows by induction.

Axioms and trusted base:

- AXIOM-1: a synchronous `step` call is atomic with respect to other
  JavaScript in the same agent. The shell stores the new state before executing
  commands, queues events that commands produce synchronously, and turns a
  synchronous throw from starting an attempt into `AttemptFailed`, or a defect,
  for that attempt.
- AXIOM-2: ReScript 12.3.1 compilation and genType's description of the
  runtime representation.
- AXIOM-3: the proof toolchain, if one is selected: LemmaScript's translation,
  the bridge's contract attachment, Dafny, and Z3.
- AXIOM-4: backend semantics observed for the pinned version only.
- AXIOM-5: an adapter reports a release predicate truthfully.
- AXIOM-5b: an adapter reports `AttemptFailed` only once the attempt can no
  longer act on the resource; an adapter that cannot know reports pending. Each
  adapter's classification is a conformance obligation in task 1.3.2.
- AXIOM-6: no caller forges values of opaque types through casts or untyped
  JavaScript.
- AXIOM-7: in-memory retention ends at host exit.

Liveness is not claimed. Eventual release depends on the adapter eventually
settling an attempt (AXIOM-5, AXIOM-5b) and on the shell delivering that event.
T-13 and T-14 state the conditional progress per step; bounded enumeration
checks reachability within its bounds.

### Verification gate

Task 1.3.3 must check the production reducer, not a separate model, by bounded
exhaustive enumeration under `bun test`:

- breadth-first search over deduplicated states to a depth of at least 10
  events, which reaches the shortest interesting traces: a stale failure during
  recovery, exhausting recovery attempts, a transfer during an attempt, and two
  closers with different deadlines;
- an alphabet of two callers plus an unknown caller, two owners plus an
  unknown owner, two leases plus an unknown lease, two generations, and
  attempts up to `maxAttempt = 3` plus out-of-range values;
- oracle predicates for every INV and PR clause, written from the E9
  acceptance column independently of `wellFormed`, checked over every
  well-formed state within the bounds, not only reachable ones;
- a reachability check that every reachable state with an obligation can
  reach `Released` or an unresolved phase with every joiner reported;
  `AcquisitionFailed` is terminal and carries no obligation, so it is an
  accepted end state;
- a totality check that every event in the alphabet, in every reachable
  phase, matches exactly one row, with T-24 as the catch-all;
- one seeded mutation per invariant that the enumeration must reject.

The verification feasibility experiment
([FX-1](evidence/verification-feasibility.md)) returned the verdict `revise`.
The lifecycle reducer is therefore selected for machine-checked proof against
its compiled JavaScript in task 1.3.3, in addition to enumeration:

- L-1, L-2, L-3, and L-5, and the per-step forms of L-4 and L-6, are required
  proof obligations, each reported separately and each with at least one mutant
  that the proof must reject.
- The trace forms of L-4 and L-6 remain induction arguments over the verified
  per-step lemmas, recorded as unverified, until the bridge can attach a
  termination measure (FX-1 feature F9).
- The 1.3.3 gate pins LemmaScript 0.6.4, TypeScript 5.9.3, bignumber.js 11.1.5,
  Dafny 4.11.0, and Z3 4.12.1 exactly. It runs the bridge, the correspondence
  audit, the proof, the mutation catalogue, and the `dafny translate js`
  differential check from an empty output directory, and fails closed on any
  missing stage, proof escape, or surviving mutant.
- FX-1 found three limits in the bridge, which are part of the trusted base.
  The 1.3.3 gate either fixes them upstream in the skill, or rejects the inputs
  that would expose them:
  - The bridge rewrites `result` even inside quoted contract literals, so a
    contract must not quote the word `result`.
  - It starts the verification unit at the first function, so the reducer
    module must have no top-level non-function bindings that verified code
    reads, because the audit compares only function declarations.
  - Its int32 typing predicate does not traverse array elements (rule 6
    below).
- While that gate runs outside CI, any change to the reducer, its contracts,
  the mutant catalogue, the bridge scripts, or a tool pin requires a fresh
  proof transcript in the pull request.

## Representation guidance

Task 1.3.3 implements the lifecycle as a pure reducer in core,
`step(config, state, event)`, returning the next state and an array of
commands, which the effectful shell performs under AXIOM-1. FX-1 turned the
following rules from proposals into binding guidance because each one was
needed for the proof to go through:

1. Every variant constructor carries a record payload; contracted signatures
   use a custom outcome type, not `result`.
2. Counters are `int` with the bound in `config`, and every increment is
   guarded by that bound.
3. Collections are arrays, built with literals, `Array.concat`, `Array.map`, and
   `Array.filter`; no loops, `ref`, division, maps, or lists.
4. Helpers are first-order: no closure that builds a variant value is passed as
   an argument.
5. No parameter shares a type's name, and no record type shares a variant tag.
6. Predicates used in contracts compile without `let` bindings: they switch on
   parameters rather than field projections and build records field by field. A
   helper that the compiler inlines into `let` bindings carries its own
   exact-effect contracts.
7. Each `@ensures` states one property where its conclusion is a conjunction.
8. A proof that needs recursion avoids tail calls, which compile to loops.

## Host-exit limits

In-memory retention ends when the host process exits. Before exit, the host
must run a bounded close of its owner registry and report every generation that
still carries an obligation, that is, every generation that is neither
`Released` nor `AcquisitionFailed`, with its owner, generation, attempt, phase,
and last report. A bounded close report is an observation, not proof that
cleanup settled. refex claims no durable recovery, no cross-process
compare-and-delete, and no global quiescence while any generation is unresolved.

## E9 scenario mapping

| Scenario                        | Transitions and invariants                 | Task         | Ablation that must fail it         |
| ------------------------------- | ------------------------------------------ | ------------ | ---------------------------------- |
| Lazy start and retry            | T-1, fresh attempt per execution (E2)      | 1.3.1        | none                               |
| Cancelled queued waiter         | Shell admission before T-6; INV-11         | 1.3.2, 1.3.4 | none                               |
| Two readers                     | T-6, T-7, INV-10                           | 1.3.4        | none                               |
| Last lease                      | T-8, PR-8                                  | 1.3.4        | none                               |
| Concurrent close                | T-9, T-10, INV-3, INV-13                   | 1.3.3        | Remove close joining               |
| Mixed failure                   | ADR 006 conversions                        | 1.3.1        | Remove cause-preserving conversion |
| Ignored abort                   | Stop waiting, T-12, AXIOM-5b               | 1.3.2        | none                               |
| Delayed release and replacement | T-11, T-13, T-18, T-21, T-22, INV-5, INV-7 | 1.3.4        | Remove generation checks           |
| Discarded diagnostic            | INV-8, registry inspection                 | 1.3.3        | Remove owner retention             |
| Failed retry                    | T-14, T-15, T-16, INV-6                    | 1.3.3        | none                               |

Each scenario first awaits the readiness its observation column names, then
advances the controlled clock or cancels, joins the affected managed work, and
inspects raw-work state and owner records.

## Exclusions

This contract adds no platform API to core, no general supervisor or process
manager, no graph memoization, and no FIFO promise: admission removes cancelled
waiters but promises exclusion only (D10). The owner registry is a core seam
(D9); a higher-level supervisor seam stays deferred.

## Alternatives considered

| Option                                                          | Assessment                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Explicit lifecycle in a pure reducer with a live owner registry | Selected. Inspectable, testable by enumeration, and verifiable.                          |
| Backend scopes and `FiberMap`                                   | Rejected. They neither join repeated close nor await replaced finalizers (audit P3, P4). |
| User-interface generation guards only                           | Rejected. Cannot stop old cleanup affecting a successor (design §8.1).                   |
| Waiting for the last lease on owner close                       | Rejected. A consumer could delay shutdown indefinitely.                                  |
| A general supervisor framework                                  | Rejected by the terms of reference non-goals.                                            |

## Falsifiers and evidence

- If enumeration in task 1.3.3 finds a reachable state violating any INV or PR
  clause, the reducer or this contract must change before 1.3.4.
- If any E9 scenario fails, or any listed ablation does not fail its scenario,
  the contract or its tests are wrong (task 1.3.5).
- If an adapter cannot honour AXIOM-5b, it may advertise only stop waiting,
  and its failures cannot enable recovery (task 1.3.2).

## Consequences

Unresolved release becomes a first-class, inspectable state rather than a
discarded error. Consumers cannot delay owner shutdown, and successors cannot
race old cleanup. The cost is an explicit registry, a shell that follows
AXIOM-1, and stuck generations that block exclusive replacement until the host
exits, which the host-exit report makes visible.

## References

- [Technical design §§2.4, 5, 6, and 10.4](design.md#24-behaviour-before-primitives).
- [Runtime-boundary audit](evidence/runtime-boundary-audit.md).
- [ADR 004](adr-004-runtime-boundary.md) and
  [ADR 006](adr-006-complete-outcomes.md).
