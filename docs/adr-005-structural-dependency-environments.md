# ADR 005: structural dependency environments

Status: candidate. Date: 17 October 2026.

## Context

refex computations of type `Fx<A, E, R>` need a required environment `R` whose
omissions and mismatches fail compilation at a documented boundary (goal G1),
while composition stays ordinary ReScript (G4).
[Design §3.2](design.md#32-requirements-construction-and-observation-timing)
prefers ordinary service records inside a structural outer environment, with
explicit projection if inference fails, and leaves the choice open as decision
D2. Primavera motivates the structural approach in OCaml, but its inference
through ReScript `.resi` boundaries was unverified (assumption A2).

The [type-level probes](evidence/type-level-probes.md) established, with
ReScript 12.3.1:

- Accessors exported as functions from separately compiled modules accumulate
  one open object row such as `{.."clock": Clock.service, "log": Log.service}`
  (`R1`), and accept environments with extra fields (`R2`).
- A missing field is rejected at the `provide` argument (`R3`); one key used
  with two service types is rejected at the composition expression (`R4`).
- A non-function accessor export gets a weak row at
  the exporting binding (`R5`) because the requirement is contravariant and the
  relaxed value restriction cannot generalize it.
- Closed rows reject extra fields unless a consumer writes `:>` (`R6`, `R6b`).
- Explicit projection composes without casts and rejects an incomplete
  projection (`R7`, `R8`).
- A declared `+'r` on an abstract type admits a coercion that forgets a
  requirement (`v1`); a Reader-over-IO representation lets the compiler derive
  `-'r` and reject it (`v2`, `v2b`).

## Decision

In the context of typing refex's required environments across separately
compiled modules, facing ReScript's value restriction and a global,
string-keyed object-row namespace, refex decides for capability objects in open
object rows with function exports and explicit projection as the sound
fallback, and against nominal environment records, Effect context tags,
functors, and field subtraction, to achieve compile-time requirement visibility
at named sites with ordinary ReScript composition, accepting that every
open-row export is a function and that row keys need an ownership convention.

### Representation

`Fx.t<+'a, 'e, -'r>` is a Reader over the dependency-free `IO.t`:
`'r => IO.t<'a, 'e>`, kept abstract behind `.resi`. The compiler derives the
contravariance of `'r` from that definition, so no requirement variance is
declared on trust. The variance `IO.t` declares remains in the trusted base
until `IO.t` has a checked definition. Error-parameter variance is settled by
[ADR 006](adr-006-complete-outcomes.md)'s cause representation.

### Conventions

- A requirement is an open object row of service records:
  `{.."clock": Clock.service}`. Each service is an ordinary record whose
  methods return `Fx` or `IO` values with native error variants.
- Every export whose type contains an open row is a function, such as
  `let now: unit => Fx.t<int, 'e, {.."clock": service}>`. This applies to
  accessors and composed workflows alike.
- Each row key is owned by the module that defines its service type. The key
  is that module's name in lower camel case: `Clock.service` lives at
  `"clock"`. A second service type for the same key is a composition error, not
  a shadowing.
- Named environments, adapters to existing application state, and any place
  where an open row would leak an internal key use explicit projection,
  `contramapEnvironment: (Fx<A, E, Small>, Large => Small) => Fx<A, E, Large>`.
- Requirement discharge is `provide: (Fx<A, E, R>, R) => IO.t<A, E>`, as design
  §3.2 declares it. It consumes the requirement, so it is the only site where
  the compiler can report a missing or conflicting field before anything runs,
  which is why the table below names it.
- Partial provision is a typed environment-building function, never generic
  field subtraction.

An *annotation-level cast* is any of the following: `Obj.magic`, `%identity`,
`%raw`, an `external` with a free result type variable, or a consumer-side `:>`
coercion on a requirement row. Requirement composition must need none of them.

### Diagnostic sites

| Mismatch                             | Site of the compiler error          |
| ------------------------------------ | ----------------------------------- |
| Missing capability                   | The `provide` argument              |
| Conflicting service type for one key | The composition expression          |
| Non-function open-row export         | The exporting binding in its `.res` |
| Extra field against a closed row     | The `provide` argument              |
| Incomplete projection                | The projection function             |

### Service contracts

Every service, layer, or adapter that refex or a validator introduces records
four separate facts:

| Fact                    | Question it answers                                     |
| ----------------------- | ------------------------------------------------------- |
| Construction inputs     | What builds the service, observed when?                 |
| Invocation requirements | What each method requests from the environment when run |
| Lifetime owner          | Who acquires and releases it, and through which scope   |
| Observation timing      | Snapshot at construction, or live per invocation        |

Replacing an outer environment field affects open operations and their
children; it does not rebuild a bound service that captured different inputs.
Changing a live provider must affect the next operation, while a snapshot stays
fixed (E6).

## Alternatives considered

| Option                                 | Assessment                                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Open object rows with function exports | Selected. Accumulation and rejection observed at real `.resi` boundaries.                                                           |
| Explicit projection everywhere         | Retained as the fallback and for named environments. Sound, but adds a projection at every composition.                             |
| Nominal environment records            | Rejected. Each workflow would fix one record type, so combining workflows needs projection anyway and extra fields fail.            |
| Effect `Context` tags through FFI      | Rejected. Exposes backend types (ADR 004) and the audited bindings erase requirements in `provide`, `provideService`, and `scoped`. |
| Functors over service modules          | Rejected for the core API. Composition becomes module plumbing rather than ordinary values; may suit adapters later.                |
| Generic field subtraction              | Rejected. ReScript object types cannot express it without casts.                                                                    |

## Falsifiers and evidence

Automatic requirement accumulation is rejected, and refex adopts explicit
projection everywhere and removes open-row accessors, if the committed fixtures
of roadmap task 1.2.2 show any of the following with the pinned compiler,
function exports, and separate `.res`/`.resi` modules:

1. A composed workflow cannot receive the union row without an
   annotation-level cast.
2. A missing field is not rejected at the `provide` argument.
3. A conflicting field is not rejected at the composition expression.
4. An open-row requirement rejects an environment with an extra field.
5. An unresolved requirement reaches a runner.

The planning probes `R1` to `R8` and `v1` to `v2b` make each falsifier
observable now; they are scratch evidence, not the fixtures 1.2.2 must commit.
E6 (task 3.2.1) tests the snapshot-versus-live service contract at runtime.

## Consequences

Requirement errors surface at predictable sites with messages that name the
missing or conflicting key. Library authors pay a small ergonomic cost:
open-row exports are thunks, and row keys follow the owning-module convention.
Type evidence establishes requirement visibility only; it says nothing about
runtime ownership or observation timing, which E3, E6, and E9 test separately.

## References

- [Type-level probe evidence](evidence/type-level-probes.md).
- [Technical design §3.2 and §12](design.md#32-requirements-construction-and-observation-timing).
- [Primavera](https://github.com/cargocut/primavera), prior art for
  object-based dependency injection in OCaml.
- [ADR 004](adr-004-runtime-boundary.md) and
  [ADR 006](adr-006-complete-outcomes.md).
