# ADR 007: shared work, closure, and recovery contract

Status: candidate. Date: 17 October 2026.

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
1.3.2 to 1.3.5 implement. Its status is `candidate`: the accepted contract
still awaits evidence E9 and the 1.3.x tasks supply.

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

| Question     | Answer                                                                                                                                                                                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger      | The producer's owner starts acquisition explicitly; construction does no work. Lease requests are admitted only after publication; the shell holds earlier requests until then, and a cancelled held request leaves no claim. Re-entry by the owner joins the current acquisition rather than starting another. |
| Owner        | The producer owner holds the producer, its raw external work, and each resource generation in a live owner registry. Each consumer owns only its lease and its wait, never the producer.                                                                                                                        |
| Cancellation | A consumer stops waiting and releases its lease; the producer continues while another lease remains. The owner's close revokes remaining leases and starts one release attempt. Confirmed termination requires the adapter's release predicate.                                                                 |
| Handoff      | A successor for the same exclusive identity is admitted only after the predecessor is released with a receipt, or after verified isolation.                                                                                                                                                                     |
| Recovery     | An unresolved generation stays in the registry with its owner, attempt, and report history. Recovery starts a new attempt only from a settled failure. Transfer completes only when the destination acknowledges it.                                                                                            |

The three cancellation contracts of
[design §6.2](design.md#62-three-cancellation-contracts) stay distinct and
named: *stop waiting* withdraws one observer; *interrupt and join* requests
managed interruption and observes termination plus finalizer attempts; *confirm
termination* establishes the adapter's external predicate. A promise adapter
states which it provides. Interrupting `tryPromise` provides only stop waiting
(audit P6).

## Lifecycle model

The model below is specified, not implemented. One producer identity has a
configuration and the following fields for each generation. The configuration
holds `maxAttempt` (an `int`, at least 1) and the adapter's declaration, which
the reducer needs in order to decide T-13, T-18, T-23, and T-24 rather than
trusting the shell: `releasePredicate`, the one predicate value T-13 accepts
and T-18 refuses in favour of any other, and `evidenceKinds`, the declared
kinds of isolation evidence T-23 accepts and T-24 refuses outside. Both are
opaque values compared for identity only; the reducer interprets neither.

- `generation`, the identifier that settlement, bound, and isolation events
  must match; a successor gets a new identifier, so a late event for a
  predecessor never matches it;
- `owner` and an optional `pendingTransfer` destination;
- `phase`, one of the phases listed below;
- `lastStarted`, the last attempt started, and `lastSettledFailed`, the last
  attempt that settled as failed (0 before any failure); T-14 sets
  `lastSettledFailed` to the failed attempt, and T-15 starts a new attempt only
  when `lastSettledFailed == lastStarted`;
- `history`, an append-only array of report-or-refusal records, the element
  type covering both what T-1 to T-17 report to a caller and the refusal that
  T-18 and T-24 append;
- `isolationVerified`, a boolean;
- `deferredSuccessors` and `admittedSuccessors`, both keyed by successor
  identity. They belong to the predecessor generation, so a successor
  generation starts with empty sets and admits its own successor in turn.
  `startedSuccessors` records which admissions T-25 has consumed, without
  removing them from `admittedSuccessors`, so duplicates remain refused.

Phases: `Acquiring{cancelRequested, joiners}`, `Open{leases}`,
`Closing{attempt, joiners}`, `UnresolvedPending{attempt, joiners, report}`,
`UnresolvedSettledFailed{attempt, report}`, `Recovering{attempt, joiners}`,
`Released{receipt}`, and `AcquisitionFailed{report}`, which is terminal and
carries no obligation. `UnresolvedPending` is the owner-visible phase reached
when the owner's observation bound elapses while an attempt is still in flight;
a caller's own bound only delivers that caller a report.

Every `report` field in a phase, and every record appended to `history`, is
synthesized by the reducer from the generation, attempt, phase, and cause it
already holds when the transition is taken. No adapter, shell, or caller
supplies one, so a report cannot disagree with the state it describes, and T-11
needs no command to populate the field it sets.

A generation is *live* while it carries an obligation, that is, while its phase
is neither `Released` nor `AcquisitionFailed` (INV-8). A `Released` generation
is retained in the registry for T-21 and T-17, but is no longer live. T-25
requires an unconsumed successor admission, an open predecessor gate, and no
other live holder. Verified isolation can open that gate while the predecessor
remains live.

T-25 starts an initial generation when no predecessor exists for its identity,
or a successor admitted by its predecessor when no other live generation holds
that identity and the predecessor is released, acquisition-failed, or has
verified isolation. T-25 records that admission in `startedSuccessors` so it
cannot start another generation. A deferred request is only a reservation; it
creates no generation. T-22 permits a request for the predecessor's own
identity while it is live, but refuses an identity held by any other live
generation. T-21 uses the same exclusion after the predecessor's gate opens.
Isolation may leave the predecessor live, but its verified boundary prevents it
affecting the admitted successor. Repeated requests remain refused, and repeat
acquisition joins or reports the existing generation (T-26 and T-27).

Events: `AcquireRequested{caller}`, `AcquireSucceeded{generation}`,
`AcquireFailed{generation, partial}`, `AcquireCancelRequested{caller}`,
`LeaseAcquired{lease}`, `LeaseCancelled{lease, caller}`,
`LeaseReleased{lease, caller}`, `CloseRequested{caller}`,
`WaitBoundElapsed{generation, caller, attempt}`,
`OwnerBoundElapsed{generation, attempt}`,
`AttemptSucceeded{generation, attempt, predicate}`,
`AttemptFailed{generation, attempt, issue}`, `RecoverRequested{caller}`,
`TransferOffered{caller, destination}`, `TransferAcknowledged{destination}`,
`SuccessorRequested{identity}`, and
`IsolationVerified{caller, generation, evidence}`. Every privileged event names
its `caller`, so the reducer itself decides authorization (INV-14) from the
event and the generation's owner, rather than trusting the shell. Attempt
numbers are scoped to a generation, so every settlement and bound event names
its generation. A "current" event in the table below matches the current
generation and, for attempt settlements and bound events, that generation's
in-flight attempt; any other is stale (T-18). Acquisition completions carry no
attempt identifier, so for `AcquireSucceeded` and `AcquireFailed` "current"
means the current generation with an unsettled `Acquiring` phase (T-1 to T-4).

`AcquireFailed{generation, partial}` reports a failure after acquiring
something: `partial: true` means resources now need release, so T-3 starts the
cleanup attempt, while `partial: false` means nothing was acquired, so T-4 is
terminal. The classification is the adapter's, on the same footing as AXIOM-5b,
and task 1.3.2 carries it as a conformance obligation. A failure the adapter
cannot classify is reported as partial, because a spurious cleanup attempt is
cheaper than a leaked resource.

Both acquisition completions name the generation they settle, as the settlement
and bound events already do. A completion whose generation is not current is
stale: it must not publish, fail, or clean up a later acquisition, so T-1 to
T-4 match only the current generation, and the rest are refused by T-24 under
its late-or-already-settled-acquisition clause. A delayed duplicate from an
earlier generation therefore cannot retire a live successor.

Commands to the shell: `StartAcquisition{generation}`,
`JoinAcquisition{caller, generation}`, `Publish`,
`StartAttempt{generation, attempt}`, `JoinAttempt{caller, attempt}`,
`Report{caller, report}`, `RevokeLease{lease}`, `AdmitSuccessor{identity}`,
`DeferSuccessor{identity}`, and `Refuse{reason}`.

### Observable transitions

"In flight" means `Closing`, `UnresolvedPending`, or `Recovering`. "Authorized"
means the owner, or the host acting for it. Each transition names the
observation a test uses to establish it. Identifiers are stable: review added
T-25 to T-27 after T-24 was assigned, and T-24 remains the catch-all.

| ID   | From                                                                                                                                                                 | Event and guard                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | To                                                                                                                                                                                                                      | Commands                                                                                    | Observation                |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------- |
| T-1  | `Acquiring{cancelRequested: false}`                                                                                                                                  | `AcquireSucceeded{current}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `Open{[]}`                                                                                                                                                                                                              | one `Publish`, `Report` per acquisition joiner                                              | Publication readiness      |
| T-2  | `Acquiring{cancelRequested: true}`                                                                                                                                   | `AcquireSucceeded{current}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `Closing{lastStarted + 1}`, acquisition joiners carried over                                                                                                                                                            | one `StartAttempt`, `JoinAttempt` per joiner, no `Publish`                                  | Finalizer entry            |
| T-3  | `Acquiring`                                                                                                                                                          | `AcquireFailed{current, partial: true}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `Closing{lastStarted + 1}`, acquisition joiners carried over                                                                                                                                                            | one `StartAttempt`, `JoinAttempt` per joiner                                                | Finalizer entry            |
| T-4  | `Acquiring`                                                                                                                                                          | `AcquireFailed{current, partial: false}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `AcquisitionFailed`, deferred successors moved to admitted                                                                                                                                                              | `Report` per acquisition joiner, `AdmitSuccessor` per moved identity                        | Failure report             |
| T-5  | `Acquiring`                                                                                                                                                          | authorized `AcquireCancelRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `Acquiring{cancelRequested: true}`, caller added to joiners                                                                                                                                                             | one `JoinAcquisition` when the caller is newly added                                        | Owner record               |
| T-6  | `Open`, lease not held                                                                                                                                               | `LeaseAcquired`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `Open`, lease added                                                                                                                                                                                                     | none                                                                                        | Lease readiness            |
| T-7  | `Open`, other leases remain                                                                                                                                          | `LeaseCancelled` or `LeaseReleased` whose caller holds the lease                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `Open`, that lease removed                                                                                                                                                                                              | none                                                                                        | Other leases remain served |
| T-8  | `Open`, last lease                                                                                                                                                   | `LeaseCancelled` or `LeaseReleased` whose caller holds the lease                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `Closing{lastStarted + 1}`, the owner as joiner                                                                                                                                                                         | one `StartAttempt`, `JoinAttempt` for the owner                                             | Finalizer entry            |
| T-9  | `Open`                                                                                                                                                               | authorized `CloseRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `Closing{lastStarted + 1}`                                                                                                                                                                                              | `RevokeLease` per lease, one `StartAttempt`, `JoinAttempt`                                  | Finalizer entry            |
| T-10 | in flight                                                                                                                                                            | authorized `CloseRequested` or `RecoverRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | unchanged; caller added to joiners                                                                                                                                                                                      | one `JoinAttempt{current}` when the caller is newly added; none for a caller already joined | Same attempt reported      |
| T-11 | `Closing` or `Recovering`                                                                                                                                            | `OwnerBoundElapsed{current}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `UnresolvedPending`, same attempt                                                                                                                                                                                       | none                                                                                        | Owner inspection           |
| T-12 | in flight, caller is a current joiner                                                                                                                                | `WaitBoundElapsed{caller, current}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | unchanged, caller removed                                                                                                                                                                                               | one `Report` to that caller                                                                 | Caller's report            |
| T-13 | in flight                                                                                                                                                            | `AttemptSucceeded{current, predicate}`, predicate is the adapter's declared release predicate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `Released{receipt}`, receipt built from the event's generation, attempt, and predicate; deferred successors moved to admitted                                                                                           | `Report` per joiner, `AdmitSuccessor` per moved identity                                    | Receipt                    |
| T-14 | in flight                                                                                                                                                            | `AttemptFailed{current}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `UnresolvedSettledFailed`                                                                                                                                                                                               | `Report` per joiner                                                                         | Settled-failure report     |
| T-15 | `UnresolvedSettledFailed`, below bound                                                                                                                               | authorized `RecoverRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `Recovering{lastStarted + 1}`                                                                                                                                                                                           | one `StartAttempt`, `JoinAttempt`                                                           | Finalizer entry            |
| T-16 | `UnresolvedSettledFailed`, at bound                                                                                                                                  | authorized `RecoverRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | unchanged                                                                                                                                                                                                               | `Refuse`                                                                                    | Refusal                    |
| T-17 | `UnresolvedSettledFailed` or `Released`                                                                                                                              | authorized `CloseRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | unchanged                                                                                                                                                                                                               | one `Report` of the settled state                                                           | Existing report            |
| T-18 | any                                                                                                                                                                  | stale or duplicate settlement, or an `AttemptSucceeded` whose predicate is not the adapter's declared release predicate                                                                                                                                                                                                                                                                                                                                                                                                                                                             | unchanged, history appended                                                                                                                                                                                             | `Refuse`                                                                                    | History entry              |
| T-19 | any non-terminal                                                                                                                                                     | authorized `TransferOffered`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `pendingTransfer` set                                                                                                                                                                                                   | none                                                                                        | Owner record               |
| T-20 | any non-terminal                                                                                                                                                     | `TransferAcknowledged` from the offered destination                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | owner changed, `pendingTransfer` cleared                                                                                                                                                                                | none                                                                                        | Destination owns it        |
| T-21 | `Released`, `AcquisitionFailed`, or isolation verified                                                                                                               | `SuccessorRequested` for an identity in neither successor set and held by no live generation other than this predecessor                                                                                                                                                                                                                                                                                                                                                                                                                                                            | identity added to `admittedSuccessors`                                                                                                                                                                                  | `AdmitSuccessor`                                                                            | Successor starts           |
| T-22 | otherwise                                                                                                                                                            | `SuccessorRequested` for an identity in neither successor set and held by no live generation other than this predecessor                                                                                                                                                                                                                                                                                                                                                                                                                                                            | identity added to `deferredSuccessors`                                                                                                                                                                                  | `DeferSuccessor`                                                                            | Successor waits            |
| T-23 | any non-terminal, isolation not yet recorded                                                                                                                         | authorized `IsolationVerified` for the current generation, with evidence of a kind the adapter declared                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | isolation recorded, deferred successors moved to admitted                                                                                                                                                               | `AdmitSuccessor` per moved identity                                                         | Successor starts           |
| T-25 | no predecessor exists for the identity, or a predecessor admitted but has not started it and is released, acquisition-failed, or isolated, with no other live holder | `AcquireRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | a new generation, recording any predecessor admission as started: fresh identifier, the caller as owner, `Acquiring{cancelRequested: false}` with no joiners, both attempt counters 0, empty history and successor sets | one `StartAcquisition`                                                                      | Acquisition entry          |
| T-26 | `Acquiring`                                                                                                                                                          | authorized `AcquireRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | unchanged; caller added to joiners                                                                                                                                                                                      | one `JoinAcquisition` when the caller is newly added; none for a caller already joined      | Same acquisition reported  |
| T-27 | `Open`                                                                                                                                                               | authorized `AcquireRequested`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | unchanged                                                                                                                                                                                                               | one `Report` of readiness to the caller                                                     | Publication readiness      |
| T-24 | any                                                                                                                                                                  | any event that matches no other row, including an unauthorized request; a `SuccessorRequested` for an identity already deferred or admitted or held by another live generation; a lease release from a caller that does not hold the lease; `LeaseAcquired` outside `Open` or for a held lease; `WaitBoundElapsed` for a non-joiner; `AcquireRequested` in any other phase; repeated, other-generation, or undeclared-evidence `IsolationVerified`; and `AcquireSucceeded` or `AcquireFailed` that is late, from another generation, or a repeat for an already-settled acquisition | unchanged                                                                                                                                                                                                               | `Refuse`                                                                                    | Refusal                    |

A close requested by the owner while consumers still hold leases revokes them
(T-9). The rejected alternative, waiting for the last lease, would let a
consumer delay the owner's shutdown indefinitely. `RevokeLease` is a
notification: the reducer does not wait for a revoked consumer to stop using
the resource before `StartAttempt`. Preventing use after revocation is the
adapter's obligation, a conformance requirement of task 1.3.2.

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
- INV-20, one acquisition per generation: `StartAcquisition` is emitted only
  by T-25, which creates the generation it names, so each generation is
  acquired at most once.
- INV-4, receipt soundness: `Released` is reached only by T-13, from an
  `AttemptSucceeded` for the current attempt whose predicate is the adapter's
  declared release predicate (AXIOM-5). The receipt is built from that event
  and carries its generation, attempt, and predicate. An unconfirmed success is
  refused with a history entry (T-18), as evidence that an adapter reported a
  release it could not confirm, and leaves the attempt in flight.
- INV-5, stale and duplicate refusal: a settlement for a non-current attempt,
  another generation, or a settled phase changes no owner, phase, or attempt,
  and appends one refusal record to `history`.
- INV-6, bounded attempts: `0 <= lastStarted <= maxAttempt`. ReScript `int` is
  32-bit and wraps, so the bound is a production-code rule (T-16), not a proof
  convenience. Monotonicity relates two states, so it is part of L-4, not of
  this state predicate.
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
- INV-13, one report per join: each time a caller joins an attempt (T-2,
  T-3, T-8, T-9, T-10, or T-15), that join is answered by exactly one report,
  from T-12, T-13, or T-14. A caller removed by its own wait bound (T-12) may
  join again and receives a further report for that new join. An acquisition
  join (T-5, T-26) is answered by T-1 or T-4, or is carried into the attempt
  that T-2 or T-3 starts.
- INV-14, authorization: only the owner or the host may close, recover, offer
  a transfer, cancel an acquisition (T-5), or record isolation (T-23); a
  leaseholder may release or cancel only its own lease. A re-entrant
  `AcquireRequested` (T-26, T-27) is authorized for the generation's owner on
  the same rule. The five guarded rows therefore name every authority INV-14
  grants, and T-24 refuses the rest.
- INV-15, fresh attempts before cleanup: in `Acquiring` and `Open`,
  `lastStarted` is 0. With `maxAttempt` at least 1, T-2, T-3, T-8, and T-9
  therefore always start attempt 1 within the bound; only recovery (T-15, T-16)
  can reach it.
- INV-16, uniqueness: the lease set and each phase's joiners hold every
  identity at most once, so removing a lease removes exactly that lease
  (INV-10) and each join is answered once (INV-13).
- INV-17, isolation is recorded once per generation, and recording it admits
  the deferred successors and moves them to `admittedSuccessors`.
- INV-18, one successor per identity: within one predecessor generation, an
  exclusive identity appears at most once across `deferredSuccessors` and
  `admittedSuccessors`. T-21 and T-22 apply only to an identity in neither set,
  admission moves an identity from the first set to the second (T-4, T-13,
  T-23), and a repeated `SuccessorRequested` is refused (T-24), so no
  predecessor admits an identity twice. The admitted successor's own
  generation, created by T-25, starts with empty sets.
- INV-19, settled failure bookkeeping: in `UnresolvedSettledFailed`,
  `lastSettledFailed == lastStarted`; elsewhere
  `lastSettledFailed < lastStarted` or both are 0.

Exact-effect and progress clauses guard against a contract that a reducer
refusing everything would satisfy: PR-1 is T-9, PR-2 is T-13, PR-3 is T-14,
PR-4 is T-15, PR-5 is T-11, PR-6 is T-6, PR-7 is T-10 (one `JoinAttempt` per
newly joined caller), PR-8 is T-8, PR-9 is T-20, PR-10 is T-21 and T-22 (never
`Refuse` for an identity in neither set), PR-11 is T-23, PR-12 is T-1 and T-2,
PR-13 is T-12, PR-14 is T-25, and PR-15 is T-26 (one `JoinAcquisition` per
newly joined caller), each with exactly the commands listed.

Lemma statements:

- L-1: `step` preserves `wellFormed`, the conjunction of INV-1, INV-2, INV-6,
  INV-11, INV-15, INV-16, INV-19, and the structural shape constraints.
- L-2: each PR clause holds as a postcondition of `step`.
- L-3: INV-5 and INV-14 hold as frame postconditions of `step`.
- L-4: per generation, `lastStarted` increases by exactly 1 on each step that
  emits `StartAttempt` and is unchanged on every other step, and emitted
  `StartAttempt` commands carry attempts 1, 2, 3, and so on, consecutively.
  Base case: attempt 1 is started by T-2, T-3, T-8, or T-9 from
  `lastStarted == 0` (INV-15), with no predecessor. Step case: attempt k + 1 is
  started only by T-15, after T-14 recorded the failure of attempt k
  (`lastSettledFailed == k`, INV-19). The per-step proof is carried by
  `lastStarted` and `lastSettledFailed`; the trace statement follows by
  induction.
- L-5: INV-4, INV-7, INV-12, INV-17, INV-18, and INV-20 hold as
  postconditions of `step`.
- L-6: per step on an existing generation, owner and obligation are unchanged
  except under T-4, T-13, and T-20; T-25 creates a generation rather than
  changing one. The trace statement follows by induction.

Axioms and trusted base:

- AXIOM-1: a synchronous `step` call is atomic with respect to other
  JavaScript in the same agent. The shell stores the new state before executing
  commands, queues events that commands produce synchronously, and turns a
  synchronous throw from starting an attempt into `AttemptFailed`, or a defect,
  for that attempt.
- AXIOM-2: ReScript 12.3.1 compilation and genType's description of the
  runtime representation.
- AXIOM-3: the selected proof toolchain: LemmaScript's translation, the
  bridge's contract attachment, Dafny, and Z3.
- AXIOM-4: backend semantics observed for the pinned version only.
- AXIOM-5: an adapter reports a release predicate truthfully.
- AXIOM-5b: an adapter reports `AttemptFailed` only once the attempt can no
  longer act on the resource; an adapter that cannot know reports pending. Each
  adapter's classification is a conformance obligation in task 1.3.2.
- AXIOM-5c: isolation evidence is declared by the adapter and reported
  truthfully. The reducer refuses `IsolationVerified` whose evidence is not of
  a kind the adapter declared (T-24); it cannot check the evidence itself.
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
- an alphabet of every event kind, including `AcquireRequested`, with two
  callers plus an unknown caller, two owners plus an unknown owner, two leases
  plus an unknown lease, two generations, and attempts up to `maxAttempt = 3`
  plus out-of-range values;
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

When enumeration contradicts this ADR, the ADR is amended in the same or an
earlier commit before any oracle predicate changes. An oracle is never weakened
to fit the reducer.

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
- FX-1 found four limits in the bridge, which are part of the trusted base.
  The 1.3.3 gate either fixes them upstream in the skill, or rejects the inputs
  that would expose them:
  - The bridge rewrites `result` even inside quoted contract literals, so a
    contract must not quote the word `result`.
  - It starts the verification unit at the first function, so the reducer
    module must have no top-level non-function bindings that verified code
    reads, because the audit compares only function declarations.
  - Its int32 typing predicate does not traverse array elements
    (representation rule 9 below).
  - It finds a definition's pattern node by the first occurrence of the text
    `pattern`, so no contract or attribute before the pattern may contain
    that word.
- While that gate runs outside CI, any change to the reducer, its contracts,
  the mutant catalogue, the bridge scripts, or a tool pin requires a fresh
  proof transcript in the pull request. A CI contract records the content hash
  of each of those inputs beside its transcript and fails when a hash has no
  matching transcript.
- Proof budget: each required lemma has a budget of ten prover runs, each a
  full pass from the bridge to Dafny, counted from its first complete
  formulation. A lemma not verified within its budget is reported as
  unverified. The gate then falls back, for that lemma, to the enumeration
  above plus `fast-check` property tests over generated traces longer than the
  enumeration depth, and this ADR is amended in the same pull request to change
  that lemma's assurance claim from proved to tested. A downgrade is recorded,
  not hidden, and does not block task 1.3.4.

## Representation guidance

Task 1.3.3 implements the lifecycle as a pure reducer in core,
`step(config, state, event)`, returning the next state and an array of
commands, which the effectful shell performs under AXIOM-1. FX-1 turned the
following rules from proposals into binding guidance. Rules 1 and 4 to 9 came
from failures FX-1 observed; rules 2 and 3 record the supported subset it
exercised (features F3 and F7):

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
9. Recursive variants that need proof carry no `int` fields unless the bridge's
   int32 typing predicate is extended to recurse through their children (FX-1
   rule 6).

## Host-exit limits

In-memory retention ends when the host process exits. Before exit, the host
must run a bounded close of its owner registry, sending
`AcquireCancelRequested` to each generation still in `Acquiring` and
`CloseRequested` to every other generation, and report every generation that
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
inspects raw-work state and owner records. The simulated adapter must model
identity reuse, such as a shared slot that late cleanup deletes; without it,
the "Remove generation checks" ablation cannot fail. It must also model a
revoked consumer that is still reading when `StartAttempt` runs.

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
race old cleanup, given truthful release and isolation evidence (AXIOM-5 and
AXIOM-5c). The cost is an explicit registry, a shell that follows AXIOM-1, and
stuck generations that block exclusive replacement until the host exits, which
the host-exit report makes visible.

Proof maintenance has its own cost, which task 1.3.3 takes on: enabling genType
and deciding whether its `.gen.ts` output is committed, native Dafny and Z3
installs, vendoring the bridge scripts that FX-1 kept in scratch, a checker for
the four bridge limits, reruns measured at `real 8m34.091s` for one full FX-1
pass on the FX-1 host, so every change to the reducer, its contracts, or a tool
pin pays that cost before the gate reports, and a development-only verification
pipeline kept apart from the product build.

## References

- [Technical design §§2.4, 5, 6, and 10.4](design.md#24-behaviour-before-primitives).
- [Runtime-boundary audit](evidence/runtime-boundary-audit.md).
- [ADR 004](adr-004-runtime-boundary.md) and
  [ADR 006](adr-006-complete-outcomes.md).
