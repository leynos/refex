# refex design brief

Status: draft brief for roadmap task 1.1.1. Date: 17 October 2026. Authority:
subordinate to the [technical design](design.md) and accepted ADRs. This brief
defines and maps; it introduces no mechanism the design does not already state.
Nothing it describes is installable: the only implemented module is the
disposable `Bootstrap` probe described in the [user guide](users-guide.md).

## Purpose and non-goals

refex proposes a ReScript-native interface for lazy computation, typed
requirements, complete failures, and accountable resource ownership. This brief
names the initial public abstractions, the capabilities deliberately deferred,
and, for every capability the three validators need, the contract or delegated
library that is expected to supply it.

The [terms of reference](terms-of-reference.md#62-non-goals) own the non-goals.
In brief: no Effect API parity, replacement schema language, React state
framework, server or process framework, native scheduler, static proof of every
lifetime, forced cancellation of foreign work, universal FIFO, cross-process
atomicity, crash recovery, or publication commitment.

## Initial public abstractions

Each entry states what the abstraction promises, what it does not, where its
full contract lives, and its status. Every entry is **Proposed**: specified in
the design, not implemented, exercised, or verified.

- **`IO` and `Fx`.** `IO<A, E>` is a lazy computation with success `A` and
  expected failure `E`; `Fx<A, E, R>` adds a required environment `R`.
  Promises: construction does no work; each execution runs afresh; mapping,
  sequencing, and environment access compose without a runner. Does not
  promise: purity of environment-free `IO`, or interruption of work that
  ignores cancellation. Contract:
  [design §§2.1, 3](design.md#3-io-requirements-and-pipelines).
- **Requirements and environments.** Services are ordinary records reached
  through a structural outer environment, with explicit projection as the sound
  fallback. Promises: a missing or conflicting capability fails compilation at
  a documented boundary. Does not promise: field subtraction, or that replacing
  an outer field rebuilds a bound service. Contract:
  [design §3.2](design.md#32-requirements-construction-and-observation-timing).
- **Complete outcomes.** Expected errors are ordinary variants; `Cause` keeps
  expected failures, defects, interruptions, and release issues with their
  structure; an infallible computation has an uninhabited error channel.
  Promises: no transformation or boundary conversion drops a simultaneous
  reason. Does not promise: that infallible work cannot be interrupted or fail
  release. Contract:
  [design §4](design.md#4-expected-failures-defects-interruption-and-release-failures).
- **Resources.** A resource retains acquisition and release obligations
  across scoped use. Promises: one owner per acquired generation before
  publication; concurrent closes join one attempt; failed release stays owned
  and recoverable. Does not promise: unconditional successful release, or
  non-escape of captured handles. Contract:
  [design §§5.1-5.3](design.md#5-resources-and-dependency-construction).
- **`Layer`.** A layer builds a resource-managed service from inputs.
  Promises: construction failures and residual inputs stay visible; sharing is
  explicit. Does not promise: memoization or sharing from recipe reuse.
  Contract: [design §5.4](design.md#54-layers-sharing-and-observation).
- **Fibres.** A fibre is managed execution with an owner and an outcome.
  Promises: owned children are interrupted and joined; three cancellation
  contracts (stop waiting, interrupt and join, confirm termination) stay
  distinct. Does not promise: that joining a fibre confirms foreign
  termination, or public detached spawning. Contract:
  [design §§6.1-6.2](design.md#6-execution-concurrency-and-policies).
- **Schedules.** A schedule describes bounded retry, backoff, jitter, or
  repetition. Promises: state resets per execution; defects and interruption
  are not retried by default; acquisition, body, whole-lifecycle, and recovery
  retries are distinct placements. Does not promise: retrying a non-idempotent
  body after a release failure. Contract:
  [design §6.3](design.md#63-time-admission-and-retry-placement).
- **Deterministic time and randomness.** Clock and randomness are injected
  services, so tests control delay, jitter, and seeds. Promises: behaviour
  changes through supplied services, not patched globals. Does not promise:
  that advancing a fake clock establishes readiness; tests await explicit
  readiness first. Contract:
  [design §6.3](design.md#63-time-admission-and-retry-placement).
- **React ownership.** A provider supplies a runtime; committed hooks and
  handlers launch work, never render. Promises: unmounting releases a
  subscription, not the producers it can reach; asynchronous finalization and
  unresolved reports stay owned after React's synchronous cleanup. Does not
  promise: a React state framework or query cache. Contract:
  [design §8.1](design.md#81-react-ownership).
- **Codecs** (Proposed; package Open, D4). Boundary decoding uses
  `rescript-schema` through a narrow adapter, preserving decode paths in typed
  protocol errors. Promises: malformed messages cannot reach domain
  transitions. Does not promise: that decoding authorizes or validates domain
  invariants. The package, browser policy, and runtime code-generation exposure
  under a content security policy remain open as D4. Contract:
  [design §8.2](design.md#82-schemas-network-and-process-adapters).

The native-await bridge (`Direct`) is an experiment, not an initial
abstraction. Roadmap step 1.4 and task 2.3.1 decide whether it survives, and no
later validator depends on it
([design §7](design.md#7-native-await-as-a-gated-experiment)).

## Deferred capabilities

Each deferred capability needs its own consumer before work starts.

| Capability                                      | Revisited by  |
| ----------------------------------------------- | ------------- |
| Transparent monadic await or a syntax transform | Roadmap 6.1.1 |
| Graph-level layer memoization                   | Roadmap 6.2.1 |
| Server-state caching and request batching       | Roadmap 6.3.1 |
| Streams, PubSub, STM, and richer queues         | Roadmap 6.4.1 |
| A native runtime or scheduler                   | Roadmap 6.5.1 |

## Validator capability map

Statuses use the vocabulary in the next section. "Delegated" names the library,
platform, or validator-owned code expected to supply the capability; refex's
contribution, if any, is the contract in the same row.

| Capability                                                                                      | Validator   | Contract or delegate                                                                             | Status    |
| ----------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------ | --------- |
| Pure board generation, inference, and solving                                                   | Minesweeper | Validator domain code in plain ReScript ([§9.1](design.md#91-animated-react-minesweeper-solver)) | Delegated |
| Seeded randomness for generation and explicit guessing                                          | Minesweeper | Injected randomness service (§6.3)                                                               | Proposed  |
| Lazy, re-runnable solver workflow with bounded work between yields                              | Minesweeper | `Fx` laziness, sequencing, and cooperative yields (§3.1)                                         | Proposed  |
| Virtual-time pacing, speed, and fixed-seed trace comparison                                     | Minesweeper | Injected clock service (§6.3)                                                                    | Proposed  |
| Solve, pause, resume, reset, and new-board operations                                           | Minesweeper | Owned fibre interruption and joining (§6.1)                                                      | Proposed  |
| Owned or borrowed runtime provider; disposed runtimes never reused                              | Minesweeper | React ownership (§8.1); React itself                                                             | Proposed  |
| Execution hook: no work in render, component-local work                                         | Minesweeper | React ownership (§8.1)                                                                           | Proposed  |
| Asynchronous cleanup retained after React's synchronous cleanup                                 | Minesweeper | React ownership and retained owners (§8.1, §5.2)                                                 | Proposed  |
| Publisher generations rejecting stale updates, including Strict Mode remount                    | Minesweeper | Generation identities (§8.1)                                                                     | Proposed  |
| One solver producer shared by two views with independent leases                                 | Minesweeper | Shared producer and leases (§5.4, §10.4)                                                         | Proposed  |
| Last-lease teardown with observable cleanup                                                     | Minesweeper | Retire-on-last-release policy (§5.4)                                                             | Proposed  |
| Fault-injectable blocked or failing release                                                     | Minesweeper | Injectable external-operation adapter (§10.4)                                                    | Proposed  |
| Exclusive same-identity replacement behind a release gate                                       | Minesweeper | Generation-safe replacement (§5.3)                                                               | Proposed  |
| Inspectable, recoverable unresolved teardown that survives a discarded diagnostic               | Minesweeper | Retained recovery owner (§5.2)                                                                   | Proposed  |
| Explicit readiness and honest quiescence reports                                                | Minesweeper | Readiness and quiescence observations (§6.3, §10.4)                                              | Proposed  |
| Pipeline versus Direct comparison on one controller                                             | Minesweeper | Native-await experiment (§7)                                                                     | Open      |
| Shared protocol types and pure world transitions                                                | Roguelike   | Validator domain code in plain ReScript ([§9.2](design.md#92-nine-room-client-server-roguelike)) | Delegated |
| Request and response codecs that preserve decode paths                                          | Roguelike   | `rescript-schema` adapter (§8.2); package and browser policy D4                                  | Open      |
| World-state, session-store, and logging services                                                | Roguelike   | Service records and requirements (§3.2)                                                          | Proposed  |
| Shared services built once; explicitly fresh instances independent                              | Roguelike   | `Layer` sharing and fresh construction (§5.4)                                                    | Proposed  |
| Replacing one service leaves unrelated construction alone                                       | Roguelike   | `Layer` composition and provision (§3.2, §5.4)                                                   | Proposed  |
| Injected clock and randomness, fake or live                                                     | Roguelike   | Injected services (§6.3)                                                                         | Proposed  |
| Live versus snapshot configuration                                                              | Roguelike   | Observation-timing contract (§3.2)                                                               | Proposed  |
| Test services injecting latency, failure, lost responses, and interruption                      | Roguelike   | Service substitution through requirements (§3.2)                                                 | Proposed  |
| Scoped HTTP command workflow; request cancellation spares shared services                       | Roguelike   | Resources and scoped execution (§5.1, §6.1); HTTP server from the platform                       | Proposed  |
| Per-session admission, cancelled-waiter removal, and immediate re-entry                         | Roguelike   | Admission helper (§6.3); FIFO only by named policy (D10)                                         | Proposed  |
| Command identity, atomic outcome recording, ambiguous-write reconciliation, and stale revisions | Roguelike   | Validator domain code over an atomic store boundary (§9.2)                                       | Delegated |
| Complete outcomes for body-plus-release and acquisition-plus-release failure                    | Roguelike   | Complete outcomes (§4)                                                                           | Proposed  |
| Separate retry placement for acquisition, body, cycle, and recovery                             | Roguelike   | Schedules (§6.3)                                                                                 | Proposed  |
| Typed transport separating outcome classes; cancellation is not rollback                        | Roguelike   | Network adapter boundary (§8.2); `fetch` from the platform                                       | Proposed  |
| Model-based checks of commands, revisions, and ownership                                        | Roguelike   | `fast-check` (C18) against the pure model (§10.3)                                                | Delegated |
| React game client reusing the runtime provider and hook                                         | Roguelike   | React ownership (§8.1); React itself                                                             | Proposed  |
| Typed CLI and backend-mode planning before side effects                                         | css-view    | Validator domain code in plain ReScript ([§9.3](design.md#93-reimplementation-of-css-view))      | Delegated |
| Nested browser, context, and page resources, including late acquisition                         | css-view    | Resources (§5.1); Playwright                                                                     | Proposed  |
| Owned versus borrowed handles and release predicates                                            | css-view    | Ownership contract (§5.1, §8.2)                                                                  | Proposed  |
| Walker capture without publishing partially initialized handles                                 | css-view    | Resources and publication (§5.1, §5.3); Playwright                                               | Proposed  |
| Joined concurrent closes and retained unresolved teardown                                       | css-view    | Joined closure and recovery owner (§5.2)                                                         | Proposed  |
| Scoped CDP connection with request and session correlation                                      | css-view    | Resources and settled waiters (§5.3, §9.3); WebSocket from the platform                          | Proposed  |
| Every waiter settled; a cancelled waiter never completes later                                  | css-view    | Settled waiters (§9.3)                                                                           | Proposed  |
| Stop waiting, interrupt and join, and confirm termination kept distinct                         | css-view    | Three cancellation contracts (§6.2)                                                              | Proposed  |
| Listeners before triggers; lifecycle and network-idle waits                                     | css-view    | Publication and readiness (§5.3)                                                                 | Proposed  |
| Process-command capability with both pipes, exit status, and no shell                           | css-view    | Process adapter boundary (§8.2); subprocess from the platform                                    | Proposed  |
| Tab-list JSON decoding                                                                          | css-view    | `rescript-schema` adapter (§8.2); package choice D4                                              | Open      |
| Fake process service for adapter tests                                                          | css-view    | Service substitution through requirements (§3.2)                                                 | Proposed  |
| One transient open retry with injected time; pending cleanup joined, not reissued               | css-view    | Schedules and joined cleanup (§6.3, §5.3)                                                        | Proposed  |
| Successor waits for the predecessor's release predicate                                         | css-view    | Generation-safe replacement (§5.3)                                                               | Proposed  |
| Complete results and recovery details across native and CLI or promise boundaries               | css-view    | Runtime and promise boundaries (§4.3)                                                            | Proposed  |
| Fault injection with ablation of retention, cause conversion, and generation protection         | css-view    | Conformance discipline (§10.4)                                                                   | Proposed  |
| Differential oracle harness with normalized volatile fields                                     | css-view    | Test harness with the pinned oracle (§9.3)                                                       | Delegated |
| Evidence records keeping missing platform coverage explicit                                     | css-view    | Evidence records (§10)                                                                           | Proposed  |

Section references in the table are to the [technical design](design.md). The
proposed decision records elaborate them:
[ADR 004](adr-004-runtime-boundary.md) for the backend,
[ADR 005](adr-005-structural-dependency-environments.md) for requirements,
[ADR 006](adr-006-complete-outcomes.md) for outcomes, and
[ADR 007](adr-007-shared-work-lifecycle-contract.md) for shared work, closure,
and recovery.

## Status vocabulary

| Brief status | Meaning                                                                     | Context label (§1)      |
| ------------ | --------------------------------------------------------------------------- | ----------------------- |
| Proposed     | A refex contract specified in the design; not implemented or exercised.     | Proposed or Unvalidated |
| Delegated    | Supplied outside refex; no refex integration is implemented.                | Open (until integrated) |
| Deferred     | Outside the initial supported scope; needs its own consumer.                | Deferred                |
| Open         | A decision or experiment must settle it first.                              | Open                    |
| Implemented  | Present in installable source; no capability in this brief has this status. | Established             |

Delegated names the owner of a capability, not its maturity: the delegate
exists outside refex, but nothing here is implemented, so every Delegated row
reads as Open until a refex integration exists.

A row moves to Implemented only when installable source exists. Consumer
exercise and interpreter or platform verification are recorded separately in
evidence records, never by changing this table's status alone.
