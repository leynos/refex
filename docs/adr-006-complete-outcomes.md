# ADR 006: complete outcomes

Status: proposed. Date: 17 October 2026.

## Context

Goal G2 requires that expected errors stay typed while every transformation and
boundary conversion preserves simultaneous defects, interruptions, and release
failures.
[Design §4](design.md#4-expected-failures-defects-interruption-and-release-failures)
proposes ordinary error variants, an opaque `Cause`, a conservative `result`
relationship, and explicit promise projection, and leaves the release-issue
payload open as decision D8.

The two evidence records established the following:

- Neither Effect line keeps a simultaneous release defect through `mapError`,
  and Effect 4.0.5's `runPromise` rejects with the bare expected error
  ([runtime-boundary audit](evidence/runtime-boundary-audit.md), P2 and P5).
- Effect 4.0.5's cause is a flat, occurrence-ordered list of reasons, and
  `Effect.all` reports only the first of two concurrent failures; an adapter
  can still observe body and finalizer exits separately and collect each
  child's exit (P7).
- ReScript 12.3.1 has no empty variant. An abstract `Never.t` implemented as
  `{absurd: 'a. 'a}` resists `let rec` construction but can be forged through
  `%identity`, a polymorphic `@val external`, or `%raw`
  ([type-level probes](evidence/type-level-probes.md), `n1` to `n5`).
- A recovery signature with a free output error type rejects lossless
  propagation and is implementable without casts only by erasing expected leaves
  (`f2` to `f4`).
- A cause tree with `array` children cannot be covariant in its error type;
  with `list` children it can (`c1`, `c2`).

## Decision

In the context of carrying failures through mapping, recovery, native await,
and promise boundaries, facing backend primitives that drop simultaneous
reasons and a type system with no empty variant, refex decides for a
refex-owned cause tree built at refex's own composition points, conservative
recovery types, and an abstract uninhabited channel, and against delegating to
the backend's `Cause`, `mapError`, or `runPromise`, and against `unit` as
"infallible", to achieve outcomes from which no simultaneous reason is lost or
mislabelled, accepting an invariant error parameter and conversion work at the
adapter boundary.

### Expected errors

Expected errors are ordinary closed variants by default. A workflow that calls
several services injects their errors into its own domain variant explicitly,
through `mapError`. Open polymorphic variants are permitted where several
independent modules contribute to one open set; they compose across `.resi`
files when open and fail to compose when closed (`R9a`, `R9b`).

### Uninhabited channel

`Never.t` is abstract in `Never.resi` and implemented as
`type t = {absurd: 'a. 'a}`. `Never.absurd: t => 'a` is implemented as
`(_: t) => panic("Never.absurd reached")`, so a forged value fails loudly
rather than returning `undefined`. The guarantee is exactly this: no closed,
terminating, cast-free term of type `Never.t` exists outside `Never.res`.
`Never.res` and the escapes `Obj.magic`, `%identity`, `%raw`, any `external`
with a free result type variable, and untyped JavaScript are in the trusted
base. `unit` is never used to mean infallible. Task 1.3.1 must turn a foreign
rejection inside `Fx<_, Never.t, _>` into a defect, never an expected leaf.

### Cause model

refex owns an inspectable cause tree. Every constructor carries a record
payload, which the deductive-verification route requires:

| Constructor   | Payload                        | Meaning                                                                                     |
| ------------- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| `Expected`    | `{error: 'e}`                  | A value of the declared error channel                                                       |
| `Defect`      | `{diagnostic}`                 | Unexpected failure, including a throwing callback                                           |
| `Interrupted` | `{execution}`                  | Managed interruption of an identified execution                                             |
| `Release`     | `{issue: releaseIssue}`        | Inability to establish a release condition                                                  |
| `Provenance`  | `{opaque}`                     | An earlier cause kept for diagnosis, behind a record of functions that hides its error type |
| `Sequential`  | `{children: array<cause<'e>>}` | Ordered composition                                                                         |
| `Parallel`    | `{children: array<cause<'e>>}` | Concurrent branches, with no invented total order                                           |

Well-formedness: no node has an empty child list, and a single-child node is
flattened to its child. Children are arrays, so the error parameter is invariant
(`c1`). refex accepts that: error widening goes through explicit `mapError` or
open polymorphic variants, which need unification, not subtyping. Arrays keep
the verification route available, whereas lists would not (FX-1, feature F10).

Structure is built where refex knows it:

- Resource use with finalization records the body exit and the finalizer exit
  separately, through an adapter-owned scope, and combines them as `Sequential`.
- refex's parallel combinators collect every child's exit and combine them as
  `Parallel`. Effect's own concurrent combinators are not used to aggregate
  failures because they keep only the first.
- A backend cause with one reason converts to the matching leaf. A backend
  cause with several reasons, which refex did not structure itself, converts to
  `Sequential` in the backend's reported order. Effect 4 records reasons in
  occurrence order (P7, `ordered`).

The conversion is total and keeps every reason. No narrowing of design §4.1
follows from Effect 4's flat cause.

### Mapping and recovery

- `mapError(f)` maps every `Expected` leaf and leaves every other leaf, node,
  child count, and order unchanged. refex implements it over its own cause
  through `catchCause` and `failCause`, never through the backend's `mapError`
  (P2). If `f` throws, the outcome is a `Defect` for the mapping failure
  composed with the original cause held as `Provenance`, never the old leaves
  relabelled with the new type.
- The recovery family is `catchError`, `match`, `result`, and
  `Direct.result`. Each either keeps the input error type `E` in its output
  error channel, so a mixed cause propagates losslessly, or demotes the
  propagated expected leaves to `Provenance`. None has an output error type
  that no input supplies. The model-level argument is parametricity: a
  cast-free total function cannot produce a value of a type it was never given,
  so a free output error type forces erasure or a cast; `f3` and `f4` are the
  implementation-level evidence. `result` is
  `Fx<A, E, R> => Fx<result<A, E>, E, R>`.
- A handler for several expected-only failures needs an explicit aggregation
  policy and never silently chooses the first leaf.

### Runtime, promise, and native-await boundaries

- `Runtime.runExit` returns the complete outcome, with the full cause, for a
  dependency-free computation. A submission failure is distinct from the
  workflow's `E`. Typed cause access exists only through `runExit`.
- A convenience promise runner may reject only with a refex boundary error
  that names its projection. It holds the full cause as untyped provenance or a
  runner-held handle because a typed cause cannot be carried through a promise
  rejection. It never uses the backend's `runPromise` (P5).
- The native-await bridge `Direct` has no typed rejection channel.
  `Direct.result` converts a standalone expected failure and passes a mixed
  cause through the scope. A foreign rejection signal becomes a defect, never
  an unchecked cast. Roadmap tasks 1.4.1 and 1.4.2 test this (E5).
- Diagnostic formatting is for people, not recovery: no formatter or logger
  is the only record of an unresolved owner.

### Release failures

An anticipated inability to release, such as a process that cannot be shown
gone or a lock that cannot be shown released, is a `Release` leaf. An
unexpected exception in cleanup is a `Defect` with release context. Neither
classification may drop a simultaneous reason. A release issue identifies the
owner, resource generation, attempt, release phase, observed condition, and
remaining obligation. The exact payload type and the adapter-specific detail
remain D8, settled by E3 and E9 before a public interface freezes.

### Proof obligations (specified, unverified)

These statements are hypotheses about a future proof. None is verified.

- LC-1: `mapExpected(f, c)` has the same node kinds, child counts, and child
  order as `c`.
- LC-2: non-expected leaves, including `Provenance`, are unchanged.
- LC-3: `f` maps every `Expected` leaf.
- LC-4: `result` yields `Error(e)` only when the flattened cause is the single
  leaf `Expected{error: e}`; otherwise it propagates the original cause.
- LC-5, conformance only: a throwing `f` yields a mapping defect and keeps the
  original cause as `Provenance`.
- LC-6, model-level: a cast-free total implementation of a recovery signature
  whose output error type no input supplies must erase every old `Expected`
  leaf from a mixed cause.

The verification feasibility experiment
([FX-1](evidence/verification-feasibility.md)) verified a toy cause tree with
array children and a record of functions as provenance: kind, child count, and
child kinds were preserved one level deep, and defect and provenance leaves
were unchanged, with every mutant killed. LC-1 to LC-4 are therefore selected
for machine-checked proof against the compiled JavaScript of the pure cause
module, with three conditions:

- Recursive cause variants carry no `int` fields unless the bridge's int32
  typing predicate recurses through children (FX-1 feature F10).
- Deep shape preservation must be stated and proved, not only the one-level
  form FX-1 checked.
- The generic error payload `'e` was not exercised; task 1.2.3 must confirm
  that the route handles it before the proof gate depends on it, or else record
  the gap and fall back to bounded enumeration over small trees and property
  tests, as an explicit change to this ADR.

LC-5 needs exceptions and stays a conformance test. The backend conversion is
tested, not proved.

## Alternatives considered

| Option                                       | Assessment                                                                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A refex-owned cause tree with array children | Selected. Inspectable, verifiable, structure built at refex's composition points.                                          |
| The same tree with list children             | Rejected for now. Covariant in `'e`, but outside the verification route's supported constructs.                            |
| Exposing the backend `Cause`                 | Rejected. Backend type in public interfaces (ADR 004), flat on Effect 4, and its `mapError` and `runPromise` lose reasons. |
| `unit` as the infallible error type          | Rejected. `unit` is inhabited.                                                                                             |
| A recursive variant or record as `Never`     | Rejected. Inhabited through `let rec` (`n1`).                                                                              |
| Free output error types in recovery          | Rejected. Forces erasure or casts (`f3`, `f4`); the Reventless `either` and `catchAll` take the cast branch.               |
| Release issues inside every domain `E`       | Rejected. Would force every error variant to absorb backend finalizer failures.                                            |

## Falsifiers and evidence

- If a cast-free implementation with a free output error type propagates a
  mixed cause losslessly, LC-6 is false. The `f3` and `f4` probes stand against
  this now; task 1.2.3 commits one such fixture per recovery combinator.
- If a cast-free, terminating term of `Never.t` can be written outside
  `Never.res` without the listed escapes, the uninhabited-channel claim is
  false. Task 1.2.3 commits the `n` probes as fixtures.
- If refex's adapter cannot observe body and finalizer exits separately on the
  pinned backend, the structure rule fails and design §4.1 must narrow, as a
  recorded deviation. Task 1.3.1 rechecks P7 through the adapter.
- If any E9 mixed-failure scenario loses a reason through mapping, `result`,
  `Direct.result`, or a promise boundary, the contract fails for that path
  (tasks 1.3.1 and 1.3.5).

## Consequences

Callers can rely on outcomes that never hide a release defect behind a body
failure or relabel old errors as new ones. refex carries the implementation
cost for mapping, recovery, and promise projection that Effect's names suggest
but do not provide. The invariant error parameter means no `:>` widening of
error types; explicit injection is the idiom. The trusted base for
infallibility and variance is named rather than hidden.

## References

- [Runtime-boundary audit](evidence/runtime-boundary-audit.md) and
  [type-level probes](evidence/type-level-probes.md).
- [Technical design §§4 and 7](design.md#4-expected-failures-defects-interruption-and-release-failures).
- [ADR 004](adr-004-runtime-boundary.md) and
  [ADR 005](adr-005-structural-dependency-environments.md).
