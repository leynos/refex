# refex context

Status: draft v0.1 vocabulary and provenance record.
Last substantive revision: 12 October 2026.
Audience: contributors, reviewers, and agents working on refex.
Companions: [terms of reference](terms-of-reference.md),
[technical design](design.md), and [documentation index](contents.md).

## 1. Status and document authority

The inspected `main` baseline is
`aa3c0f71816b84da95765616589f38a075b2f26c`. It contains the private `0.0.0`
package and a disposable `Bootstrap.identity` export, not an effects API.
[Package metadata](../package.json), the [source
interface](../src/Bootstrap.resi),
and the [user guide](users-guide.md) describe that implemented state.

Use the following evidence labels when extending these documents:

- **Established:** an explicit requirement or an inspected implementation fact.
- **Proposed:** a design choice awaiting implementation and review.
- **Unvalidated:** a claim whose stated experiment has not yet supplied
  evidence.
- **Deferred:** work outside the initial supported scope.
- **Open:** a question with neither an accepted decision nor sufficient
  evidence.

The terms of reference owns the problem, intended users, and scope. This file
owns shared vocabulary, provenance, and distinctions that must not drift. The
technical design owns proposed mechanisms and acceptance experiments. Existing
ADRs remain accepted for their bootstrap scope; a draft design does not silently
supersede them. The guides continue to describe what contributors can run today.

The source brief is the supplied refex discussion and the user's edited GIST
roadmap. No repository-local roadmap exists at the inspected baseline. Section
6 records traceability to that edited plan without recreating its checklist,
renumbering tasks, or marking any work complete. A later roadmap commit should
use the edited source, not an earlier conversational version.

## 2. Ubiquitous language

### 2.1. Computations and requirements

**Effect description:** a value describing work. Constructing it does not
necessarily perform that work. refex must state which constructors defer a
callback and which accept an already evaluated value.

**Execution:** one interpretation of a description under an owner and supplied
capabilities. Reusing a description does not imply reusing an execution.

**IO:** the proposed dependency-free computation abstraction. Its name does not
mean every operation performs input or output; pure values can also inhabit it.

**Fx:** the proposed environment-dependent computation abstraction. Its three
parameters describe success, expected failure, and required environment.

**Reader:** a computation that receives an environment. The Reader pattern
provides dependency access; it does not provide cancellation or finalization.

**Capability:** an explicitly supplied operation or service value. A capability
can provide access to authority, but a ReScript object field is not a sandbox
or a security proof.

**Environment:** the value supplying a workflow's capabilities. It is not a
process environment-variable map and not React context.

**Requirement:** the type-level obligation that an environment must satisfy.
A missing requirement is distinct from a present service that fails at runtime.

**Open operation:** a workflow that requests capabilities when executed.
**Bound service:** a service that captures its construction dependencies and
then exposes operations without those open requirements. Replacing an outer
environment field does not rebuild a service that already captured its inputs.

**Provision:** supplying a complete required environment or a constructor for
it. Provision must retain construction errors and remaining requirements.

**Projection:** a typed function that constructs a smaller environment from a
larger one. Projection is a supported explicit interface, not a failure of the
design or permission to erase requirement types.

### 2.2. Ownership and outcomes

**Owner:** the execution or scope responsible for child work and cleanup.
**Scope:** a lifetime boundary that records finalizers and admits owned work.
**Resource:** an acquisition recipe together with cleanup obligations, not just
the acquired handle.

**Layer:** a proposed dependency-aware resource constructor. A layer builds a
capability or environment; it is not a global service locator.

**Sharing:** reuse of one allocated value within a defined lifetime.
**Memoization:** reuse of a recorded construction result under a defined key and
scope. Reusing the same recipe does not, by itself, promise either.

**Fibre:** a runtime-managed execution with an outcome and ownership relation.
The public identifier may be `Fiber`, preserving ecosystem spelling; prose uses
'fibre'. A fibre need not be an operating-system thread.

**Cancellation request:** a request to stop work. **Interruption:** the runtime
termination path that propagates that request. Neither proves that a remote
operation rolled back or that an uncooperative foreign callback stopped.

**Finalization:** execution of an owned resource's cleanup obligations.
**Quiescence:** no remaining admitted work or cleanup within the measured scope.
A cancellation request and quiescence are separate observable events.

**Expected failure:** a recoverable value in the declared error channel.
**Defect:** an unexpected execution failure, such as an unclassified exception.
**Exit:** the complete terminal outcome of an execution.
**Cause:** information retaining expected failure, defect, interruption, and
combined failures without flattening them into one message.

**Infallible:** having no inhabitant in the expected-error channel. It does not
mean immune to defects, interruption, or external failure.

### 2.3. Integration and evidence

**Direct:** the proposed native-`async`/`await` bridge with a typed execution
scope. It is not transparent monadic `await` and is not an accepted API.

**React Effect:** React's setup/cleanup integration mechanism. Distinguish this
from an Effect-library computation and a refex effect description.

**Schema boundary:** the point at which external values acquire checked domain
types. Parsing is not authentication, authorization, or validation of all
cross-field domain invariants.

**Validator:** an application used to challenge the library's claims, rather
than only demonstrate an attractive example.

**Oracle:** an independently executed behavioural reference. An oracle can have
bugs; disagreement requires investigation, not automatic baseline replacement.

**Evidence record:** reproducible inputs, tool and source revisions, commands,
observations, limits, and a decision. A green exit without executed scenarios
is not an evidence record.

## 3. Relationships that must remain explicit

The conceptual dependency chain is application workflow, supplied environment,
resource constructors, and owned execution. The technical design chooses how
these cooperate; none of them subsumes the others.

The compiler can establish that an environment supplies a database capability.
It does not establish that every captured database handle remains live. Runtime
ownership can account for finalizers without proving that foreign code cannot
retain a handle. These are separate guarantees with separate experiments.

A React component lifetime can own one request while an application runtime
owns shared services. A request completing does not end the application
runtime. A component unmounting does not undo an accepted server command.

Provision and serialization are also distinct. The roguelike sends checked
protocol values, not closures, service environments, fibres, or runtime objects.
Client and server each own their local executions.

## 4. Established constraints and proposed choices

The supplied brief establishes ReScript-first ergonomics, React for both game
clients, `rescript-schema` for schema work, and three vertical validators.
[ADR 002](adr-002-portable-core-and-bun-boundary.md) establishes portable core
source, development-only Bun bindings, and a real-source trigger for adding a
workspace. [ADR 003](adr-003-formatting-and-analysis-policy.md) establishes
formatting and analysis policy.

The Reader/IO split, structural capability inference, scoped layers, and a
private Effect backend are proposed mechanisms. Automatic row composition must
survive separate `.resi` interfaces before documentation describes it as
working. Direct FFI versus Reventless bindings remains an explicit backend
selection experiment, not an installed dependency decision.

The native-await bridge remains experimental. Transparent `await Fx.t`, graph
memoization, streams, transactional memory, a query cache, and a native runtime
remain deferred. The source brief contains no measured bundle budget, accepted
latency target, compatibility promise, or production-support commitment.

## 5. Prior art and corrected assumptions

[Relude's RIO source][rio] combines an environment with its IO abstraction and
provides environment adaptation. [Primavera][primavera] combines Reader-style
dependency access with OCaml object types. They support studying these designs,
not claiming that OCaml and ReScript have identical inference or lifetime rules.

[Reventless's package description][reventless] presents alpha bindings mirroring
Effect modules. That is both an alternative for consumers and a possible
private implementation dependency. Breadth of bindings is not evidence of
soundness for every signature. Audit the exact chosen package rather than
repeating earlier unverified claims about particular bindings.

[Effect's scope documentation][effect-scope] supplies an execution reference,
not a promise that an arbitrary wrapper preserves its guarantees. A hidden
backend still requires interoperation, failure, and ownership tests.

[ReScript documents promise-specific `await`][await]. [React documents setup,
cleanup, and an additional development Strict Mode cycle][react]. Those
constraints shape experiments; refex must not describe promises as generic
monadic continuations or React cleanup as an awaited shutdown operation.

The upstream schema project now calls itself [Sury][sury]. The brief's name
`rescript-schema` remains the requirement reference until an explicit package
selection resolves naming, versions, ReScript API, and deployment compatibility.
The upstream README currently describes dynamic code generation and a strict
content-security-policy limitation. Do not assume schema choice is independent
of the browser security policy, or relax that policy without a decision.

No supplied or inspected evidence establishes that refex is faster, smaller,
safer overall, or easier to use than direct Effect bindings. These are
comparison questions, not README features.

## 6. Validation and roadmap traceability

The following identifiers refer to the user's edited GIST roadmap supplied with
this work. They preserve its scope and numbering, not task completion status.
The plan has no date commitments. Technical acceptance detail lives in
[design §10](design.md#10-experimental-validation).

### 6.1. Foundation and Minesweeper

Tasks (1.1.1)-(1.4.2) establish the problem brief and challenge type, execution,
resource, and direct-style contracts. This documentation contributes to
(1.1.1); it is not evidence that the later tests pass.

Tasks (2.1.1)-(2.3.2) deliver the animated React Minesweeper solver. Its purpose
is to expose lazy execution, controllable time, restart and unmount ownership,
and the ergonomics of pipelines versus `Direct`. Pure board inference remains
pure. A solver must not consult hidden mine locations through an accidental
capability leak; inability to infer a safe move is a valid domain result.

### 6.2. Nine-room client-server roguelike

Tasks (3.1.1)-(3.4.2) deliver one small game with a React client, a server,
shared checked protocol, and substitutable services. Nine rooms constrain the
game's scope. The validator tests compositional requirements and failures,
not a general multiplayer, persistence, or deployment platform.

The design must distinguish an obsolete UI response from a server command
that already committed. Cancellation and retry policies must not silently
duplicate movement or inventory changes.

### 6.3. Reimplementing `css-view`

Tasks (4.1.1)-(4.5.2) reimplement the command-line tool in ReScript/refex and
compare it with [the inspected `css-view` revision][css-baseline]. This is the
third validator, not a React application or a change to the original repository.

The [existing guide][css-guide] identifies local Playwright, direct CDP, and
agent-browser paths, plus walker and CDP capture. It also specifies active-page
filtering, scoped fixture processes, stable snapshot facts, and one bounded
retry for the transient `Event stream closed` open failure.

Keep its source revision, browser revision, fixtures, and normalization rules
in each comparison record. A stable-output mismatch must remain visible until
review establishes whether the reimplementation, oracle, or contract is wrong.

### 6.4. Convergence and deferred scope

Tasks (5.1.1)-(5.3.2) decide which abstractions earned a supported interface and
compare equivalent workflows with ordinary promises and direct bindings.
Useful counterexamples can justify deleting an abstraction.

Tasks (6.1.1)-(6.5.1) gate transparent monadic await, graph memoization,
server-state caching, broader concurrency/streams, and a native runtime. They
require new application evidence rather than mechanical API parity.

## 7. Source register

Sources inspected or supplied for this draft on 12 October 2026:

- **C1, product intent:** the supplied design discussion and edited refex GIST
  roadmap. This file records their requirements and traceability; they are not
  implementation evidence or a separately published specification.
- **C2, implementation baseline:** refex commit
  `aa3c0f71816b84da95765616589f38a075b2f26c`, its package and source interface,
  contributor instructions, guides, and accepted bootstrap ADRs.
- **C3, documentation conventions:** [df12 documentation skills][skills],
  specifically terms-of-reference-doc, tech-design-doc and its anatomy,
  research, and editing references, df12-readme, and pr-creation. This context
  file supplies the companion vocabulary required by those skills.
- **C4, monadic prior art:** [Relude RIO][rio] and [Primavera][primavera].
  Compatibility with the pinned ReScript compiler remains unverified.
- **C5, execution alternatives:** [Reventless bindings][reventless] and
  [Effect scope documentation][effect-scope]. No latest-version or audit claim
  follows from a package description.
- **C6, host contracts:** [ReScript await][await] and [objects][objects], plus
  [React useEffect][react].
- **C7, schema constraint:** [Sury upstream][sury], including its ReScript
  documentation link and dynamic-evaluation caveat.
- **C8, behavioural oracle:** `css-view` commit
  `305bd947bdb063d3b93785186f2d0bc33d0a5ea3` and its
  [developer guide][css-guide].

[skills]: https://github.com/leynos/df12-documentation-skills
[rio]: https://github.com/reazen/relude/blob/main/src/Relude_RIO.re
[primavera]: https://github.com/cargocut/primavera
[reventless]: https://www.npmjs.com/package/@reventlessdev/rescript-effect
[effect-scope]: https://www.effect.website/docs/v3/resource-management/scope
[await]: https://rescript-lang.org/docs/manual/async-await/
[objects]: https://rescript-lang.org/docs/manual/object/
[react]: https://react.dev/reference/react/useEffect
[sury]: https://github.com/DZakh/sury
[css-baseline]: https://github.com/leynos/css-view/tree/305bd947bdb063d3b93785186f2d0bc33d0a5ea3
[css-guide]: https://github.com/leynos/css-view/blob/305bd947bdb063d3b93785186f2d0bc33d0a5ea3/docs/developers-guide.md
