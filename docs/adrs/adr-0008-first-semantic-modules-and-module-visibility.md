# ADR 008: first semantic modules and module visibility

Status: accepted. Date: 2 November 2026.

## Context

[ADR 001](adr-0001-repository-bootstrap.md) decides that the bootstrap package
keeps one disposable public `Bootstrap` module, together with an archive
allowlist that names only that module's source, interface, and generated ESM.
Its Consequences require new semantic code to replace the disposable module.
Roadmap task 1.2.1 delivers that replacement: the opaque `IO` and `Fx`
descriptions.

Two accepted or provisional decisions constrain how the replacement may be
published. ADR 001 fixes the archive contents.
[ADR 004](adr-0004-runtime-boundary.md) permits, for its bounded trial, "private
`src/` modules absent from the public allowlist".
[ADR 006](adr-0006-complete-outcomes.md) requires `'e` to be invariant in
`IO.resi`. The compiler checks a declared variance against the concrete
definition, but it does not require invariance: `unit => result<'a, 'e>` is
covariant in `'e`, so an invariant declaration is accepted trivially. The
`fx-error-widening` fixture, not the compiler's variance check, guards the
invariant.

Compiler probes on the pinned toolchain change what those words can mean. Under
ReScript 12.3.1's default build, Rewatch:

- `sources[].public` is not implemented. A consumer compiled and ran
  `Refex.Kernel.evaluate` while `Kernel` was absent from `public` (`ns1`,
  `ns2`), and a nonsense `public` value built without complaint (`ns7`). The
  field is a declaration, not an enforcement point.
- Every module under `src/` is therefore reachable as `Refex.<Module>`.
- The undocumented `namespace-entry` key does hide modules: with an entry
  module re-exporting only `IO`, `Refex.Kernel` was not found while `Refex.IO`
  resolved (`ns8`). Whether in-package development sources can still reach a
  hidden module is untested.

The evidence is recorded in
[type-level probes](../evidence/type-level-probes.md#planning-probes-for-task-121).

## Decision

In the context of delivering the first semantic modules on ReScript 12.3.1,
facing a build that ignores the public-module allowlist and an accepted
bootstrap decision that names one disposable public module, refex decides for a
public `IO` and `Fx` pair that replaces `Bootstrap` as the package's semantic
surface and archive contents, and for keeping `public` as a declaration whose
truth is enforced by module-inventory and exact export-set contracts, and
against treating `public`, or a `src/` module's absence from it, as a
visibility boundary, to achieve separately compiled consumers that compose
opaque descriptions without a runner or backend, accepting that every `src/`
module stays reachable by consumers until a compile-time hiding mechanism is
adopted with its own evidence.

### Public modules and archive contents

`IO` and `Fx` are public modules with explicit `.resi` interfaces, and each
public type introduced is abstract there. Task 1.2.1 retired `Bootstrap` in its
EP-M5 milestone, as ADR 001's Consequences require; the archive now contains
the semantic modules alone. `package.json` `files` and `exports`, the package
contract, the package-check allowlist, and the interface-contract table gained
`IO` and `Fx` when those modules landed and lost `Bootstrap` when EP-M5 retired
it.

### `public` is a declaration, not an enforcement point

`rescript.json` keeps `public` as the declaration of the intended public
modules. Two contracts keep the declaration truthful and guard the real
boundary:

- the module-inventory contract compares `public` plus a documented, explicit
  internal list with the modules under `src/`, and requires a `.resi` beside
  every `.res`;
- the export-set contract compares each `src/*.resi` with an expected table of
  exported names, kinds, and signatures.

The internal list is empty when this ADR is accepted. A later task adds to it
deliberately rather than redesigning the contract. No document may describe a
`src/` module as private on the strength of its absence from `public`.

### Weak types from the invariant error parameter

Because ADR 006 requires `'e` to be invariant, an unannotated top-level
`let x = IO.succeed(1)`, and an unannotated top-level `Fx.provide` result, have
weak error types. Consumers annotate such descriptions or export functions
instead. The users' guide states this; it is a typing consequence, not a defect
in the representation.

### Hand-off to task 1.3.1

Hiding adapter modules remains open. `namespace-entry` hides modules on the
pinned compiler (`ns8`) but is undocumented and its effect on in-package
development sources is untested. Task 1.3.1 decides between it and single-unit
encapsulation, with its own evidence, when it introduces the execution adapter.

## Alternatives considered

| Option                                               | Assessment                                                                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| An unlisted "private kernel" module holding a runner | Reachable by consumers (`ns1`), so C-5's no-runner guarantee would not hold.                                      |
| Make `IO.t` manifestly equal to a kernel type        | Leaks the kernel's module name in consumer diagnostics and defeats opacity.                                       |
| Nest `IO` inside `Fx`                                | Diverges from ADR 005's `IO.t` and from the `provide` signature it fixes.                                         |
| Adopt `namespace-entry` now                          | Undocumented at the 12.3.1 tag; in-package development access untested. Left to task 1.3.1 with its own evidence. |

## Falsifiers and evidence

- If a pinned ReScript build enforces `sources[].public`, revisit the
  declaration-only treatment and reconsider whether the export-set contract
  remains the primary guard.
- If `namespace-entry` becomes documented for a pinned compiler, and in-package
  development sources can still reach hidden modules, task 1.3.1 may adopt it
  for adapter modules.
- If replacing `Bootstrap` requires a further public module beyond `IO` and
  `Fx`, this decision is incomplete and needs a new ADR.
- Evidence: `ns1`, `ns2`, `ns6`, `ns7`, and `ns8` in
  [type-level probes](../evidence/type-level-probes.md#planning-probes-for-task-121).

## Consequences

The package's semantic surface is `IO` and `Fx`; the archive now contains those
two modules and their generated output, and no longer contains `Bootstrap`,
which EP-M5 retired. Adding a public module or a public export is now a
contract change that must be made deliberately, because the module and
export-set contracts will reject an unrecorded addition. Consumers of the
packed package can reach every `src/` module, so the honesty of the public
declaration rests on those contracts and on review, not on the compiler.
JavaScript consumers remain untyped and can call the generated representation
directly; opacity is a ReScript-consumer guarantee only.

## Amendments

### ADR 001

The archive allowlist admits the package's semantic modules: `IO` and `Fx`,
each with its `.resi` and generated ESM. EP-M5 retired `Bootstrap`, so the
archive contains the semantic modules alone. ADR 001's consequence that "new
semantic code must replace the disposable module" is executed by roadmap task
1.2.1. Every other bootstrap rule, including exact pins, generated-output
policy, and the isolated archive check, stands.

### ADR 004

The trial bound permitting "private `src/` modules absent from the public
allowlist" is a declaration, not a visibility guarantee, on ReScript 12.3.1:
such modules remain reachable by consumers (`ns1`, `ns2`). The execution
adapter therefore may not rely on allowlist absence to keep a runner or a
backend type unreachable. Hiding adapter modules becomes an explicit open
question for task 1.3.1, to be settled with the evidence this ADR records.

### ADR 006

The contract stands. Its invariant `'e` produces weak error types for
unannotated top-level descriptions; consumers annotate them or export functions
instead. No change is made to the invariant, to expected errors as ordinary
variants, or to explicit injection through `mapError`.

## References

- [Type-level probes](../evidence/type-level-probes.md), especially the planning
  probes for task 1.2.1.
- [ADR 001](adr-0001-repository-bootstrap.md),
  [ADR 004](adr-0004-runtime-boundary.md), and
  [ADR 006](adr-0006-complete-outcomes.md).
- [ADR 005](adr-0005-structural-dependency-environments.md) for the `IO.t` and
  Reader signatures that fix `provide`.
- [Technical design §2.3](../design.md#23-backend-selection-and-execution-boundary)
  and [§3](../design.md#3-io-requirements-and-pipelines).
- [Roadmap task 1.2.1](../roadmap.md#12-prove-dependency-and-error-composition-through-separate-modules).
