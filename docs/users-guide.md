# User guide

## What this guide covers

This guide describes what is actually installable and importable from this
repository today. Refex is an experimental structured-effects library. The
package exports opaque `IO` and `Fx` description types with no runner, plus a
disposable toolchain probe. Neither surface has a stability promise.

`Effect`, `Exit`, `Cause`, `Fiber`, `Scope`, `Context`, `Layer`, and `Schedule`
do not exist here. See [ADR 001](adr-001-repository-bootstrap.md) for the
bootstrap scope.

## Installing

The package is marked `"private": true` and is **not published to npm**. There
is no release, publishing workflow, or trusted-publishing configuration, so
`bun add refex` will not resolve. The only supported way to consume it today is
from a local checkout or a locally produced archive:

```bash
git clone git@github.com:leynos/refex.git
cd refex
make install
```

`make package-check` produces and validates a real archive in a temporary
directory, but that is a quality gate rather than a distribution route; the
archive is deleted afterwards. Treat any other installation method as
unsupported until a publication decision is recorded.

## Importing

The package exports these paths: `./package.json`, `./src/Bootstrap.res.mjs`,
`./src/IO.res.mjs`, and `./src/Fx.res.mjs`. Import the concrete ReScript output
path:

```javascript
import { identity } from "refex/src/Bootstrap.res.mjs";
```

Importing `refex` alone, or `refex/bootstrap`, does not work. There is no
bare-specifier entry point and no alias, because ReScript consumers emit the
concrete `refex/src/Bootstrap.res.mjs` path themselves. An alias-only export
would compile but fail at execution.

ReScript consumers depend on `refex` and call the namespaced module directly.
The package's own `refex` dependency resolution supplies the path above; no
extra configuration is required beyond a normal `dependencies: ["refex"]` entry
in `rescript.json`.

## `Bootstrap.identity`

The one exported function returns its input unchanged:

```javascript
identity(value: string): string
```

| Input           | Result          |
| --------------- | --------------- |
| `"Refex"`       | `"Refex"`       |
| `""`            | `""`            |
| `"λ, 🐈, café"` | `"λ, 🐈, café"` |

It is a **disposable toolchain probe**, not a Refex semantic API. It exists so
the build can prove that a namespaced public module compiles against its
`.resi` interface, that the package archive contains the right files, and that
JavaScript and ReScript consumers can both execute the result. It carries no
effect, runtime, or platform behaviour, and it will be removed or replaced once
real Refex source exists.

There is no stability promise of any kind: not semantic versioning, not source
compatibility, not a deprecation window. The version is `0.0.0`.

## `IO`

`IO.t<'a, 'e>` is a lazy description of work that succeeds with `'a` or fails
with the expected error `'e`. Build one with `IO.succeed`, `IO.fail`, or
`IO.suspend`, and combine descriptions with `IO.flatMap` and `IO.mapError`.
Building a description runs nothing. For ReScript consumers the type is
abstract: the `.resi` interface prevents them from calling, inspecting, or
forging one.

JavaScript consumers import the generated module, where `IO.t` is an ordinary
zero-argument function. They can call it and observe the `result` it returns.
That representation is an implementation detail with no compatibility promise;
task 1.3.1 may replace it.

This release provides **no runner**. Roadmap task 1.3.1 adds the runtime entry
point that evaluates a description. Until then nothing in the package evaluates
one: only the repository's tests, and a JavaScript consumer that calls the
generated thunk directly, do so. `Bootstrap` remains in the package until task
1.2.1 retires it in its final milestone, and `Fx` follows in the same task.

## `Fx`

`Fx.t<'a, 'e, 'r>` is a lazy description that needs an environment of type `'r`
and, once provided, yields `IO.t<'a, 'e>`. Build one with `Fx.succeed`,
`Fx.fail`, or `Fx.suspend`; sequence with `Fx.flatMap`; transform with `Fx.map`,
`Fx.mapError`, and `Fx.tap`; read the environment with `Fx.access` and
`Fx.accessEffect`; apply it with `Fx.provide`; and adapt it to a larger
environment with `Fx.contramapEnvironment`.

Building a description and calling `Fx.provide` run no user callback.
Environment reads, projections, and every user function run only when the
resulting `IO.t` is evaluated, once per evaluation. `Fx.flatMap` short-circuits
on failure, and `Fx.tap` runs its work once in order and keeps the original
value; if the work fails, the whole description fails with that error.
`Fx.accessEffect` runs the description it returns in the same environment, and
`Fx.contramapEnvironment` projects the environment once per evaluation.

Two services:

```rescript
type clock = {now: unit => int}
type log = {format: int => string}
type services = {clock: clock, log: log}

let describe: Fx.t<string, string, services> = Fx.flatMap(
  Fx.access(services => services.clock.now()),
  tick => Fx.access(services => services.log.format(tick)),
)

let io: IO.t<string, string> = Fx.provide(describe, {clock, log})
```

Projection:

```rescript
type small = {count: int}
type large = {count: int, label: string}

let count: Fx.t<int, string, small> = Fx.access(environment => environment.count)

let countInLarge: Fx.t<int, string, large> =
  Fx.contramapEnvironment(count, environment => {count: environment.count})
```

Annotate top-level descriptions and their provided results. Without an
annotation, `'e` stays unconstrained and the compiler reports a weak type;
exported functions avoid this naturally.

For ReScript consumers `Fx.t` is abstract, so the `.resi` interface prevents
them from applying, inspecting, or forging one. JavaScript consumers import the
generated module, where `Fx.t` is an ordinary function from environment to an
`IO.t` thunk; they can call both and bypass these types. Like `IO`, `Fx` has
**no runner**: `Fx.provide` produces an `IO.t`, and nothing in the package
evaluates it. Task 1.3.1 adds the runtime entry point.

## Generated output

Production output under `src/`, including `src/Bootstrap.res.mjs`,
`src/IO.res.mjs`, and `src/Fx.res.mjs`, is compiler output, committed so the
archive and the package export paths resolve without a build step. Do not read
it as the definition of the API's behaviour and never hand-edit it: ReScript
12.3.1 does not copy the source's documentation comments into generated
JavaScript, so the generated file carries no docstrings by design. The ReScript
source and its `.resi` interface are the documentation of record.

## Getting help

- [Developer guide](developers-guide.md) for the toolchain, gates, and CI.
- [Repository layout](repository-layout.md) for path ownership.
- [Documentation index](contents.md) for the full document list.

There is no support or compatibility policy. `IO` and `Fx` are early,
unsupported surfaces with no runner, and `Bootstrap` is a disposable probe.
Open an issue on the repository for bootstrap problems.
