# User guide

## What this guide covers

This guide describes what is actually installable and importable from this
repository today. Refex is an experimental structured-effects library. The
package exports opaque `IO` and `Fx` description types with no runner. Neither
surface has a stability promise.

`Effect`, `Exit`, `Cause`, `Fiber`, `Scope`, `Context`, `Layer`, and `Schedule`
do not exist here. See [ADR 001](adrs/adr-0001-repository-bootstrap.md) for the
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

The package exports these paths: `./package.json`, `./src/IO.res.mjs`, and
`./src/Fx.res.mjs`. Import the concrete ReScript output path:

```javascript
import { succeed } from "refex/src/IO.res.mjs";

const outcome = succeed("Hello, refex.")();
```

Importing `refex` alone does not work. There is no bare-specifier entry point
and no alias, because ReScript consumers emit the concrete
`refex/src/IO.res.mjs` or `refex/src/Fx.res.mjs` path themselves. An alias-only
export would compile but fail at execution.

ReScript consumers depend on `refex` and call the namespaced module directly.
The package's own `refex` dependency resolution supplies the path above; no
extra configuration is required beyond a normal `dependencies: ["refex"]` entry
in `rescript.json`.

There is no stability promise of any kind: not semantic versioning, not source
compatibility, not a deprecation window. The version is `0.0.0`.

## `IO`

`IO.t<'a, 'e>` is a lazy description of work that succeeds with `'a` or fails
with the expected error `'e`. Build one with `IO.succeed`, `IO.fail`, or
`IO.suspend`, and combine descriptions with `IO.flatMap` and `IO.mapError`.
Building a description runs nothing. For ReScript consumers the type is
abstract: the `.resi` interface prevents them from calling, inspecting, or
forging one.

`IO.suspend` defers construction: its callback runs when the description is
evaluated, at most once per evaluation, and must return the description to run.
`IO.flatMap` evaluates its receiver, applies its callback to a success value,
and evaluates the description that callback returns; a failure is returned
unchanged and the callback is not called. `IO.mapError` touches only the
failure path: it maps the error and returns a success value unchanged, without
calling its mapper. These are the `IO` forms of the `Fx` rules below, and the
callback limit is the same: per combinator invocation, so a description reused
in two places is evaluated once for each place.

JavaScript consumers import the generated module, where `IO.t` is an ordinary
zero-argument function. They can call it and observe the `result` it returns.
That representation is an implementation detail with no compatibility promise;
task 1.3.1 may replace it.

This release provides **no runner**. Roadmap task 1.3.1 adds the runtime entry
point that evaluates a description. Until then nothing in the package evaluates
one: only the repository's tests, and a JavaScript consumer that calls the
generated thunk directly, do so.

## `Fx`

`Fx.t<'a, 'e, 'r>` is a lazy description that needs an environment of type `'r`
and, once provided, yields `IO.t<'a, 'e>`. Build one with `Fx.succeed`,
`Fx.fail`, or `Fx.suspend`; sequence with `Fx.flatMap`; transform with `Fx.map`,
`Fx.mapError`, and `Fx.tap`; read the environment with `Fx.access` and
`Fx.accessEffect`; apply it with `Fx.provide`; and adapt it to a larger
environment with `Fx.contramapEnvironment`.

Building a description and calling `Fx.provide` run no user callback, and
`Fx.provide` does not traverse the description. Nothing runs until the resulting
`IO.t` is evaluated. The limit is per combinator invocation, not per user
function across the whole evaluation: an `IO` or `Fx` combinator runs its
callback at most once per evaluation of that combinator's result, and a
description reused in two places is evaluated once for each place, so its
callbacks can run more than once in a single evaluation. Which functions run
depends on the branch taken: `Fx.map`, `Fx.flatMap`, and `Fx.tap` skip their
callback when the receiver fails, `Fx.mapError` skips its callback when the
receiver succeeds, and `Fx.access` reads the environment only on the success
path. `Fx.flatMap` short-circuits on failure, and `Fx.tap` runs its work once
in order and keeps the original value; if the work fails, the whole description
fails with that error. `Fx.accessEffect` runs the description it returns in the
same environment, and `Fx.contramapEnvironment` projects the environment once
per evaluation, before the description runs.

Two services:

```rescript
module Fx = Refex.Fx
module IO = Refex.IO

type clock = {now: unit => int}
type log = {format: int => string}
type services = {clock: clock, log: log}

let clock = {now: () => 42}
let log = {format: tick => "tick " ++ Int.toString(tick)}

let describe: Fx.t<string, string, services> = Fx.flatMap(
  Fx.access(services => services.clock.now()),
  tick => Fx.access(services => services.log.format(tick)),
)

let io: IO.t<string, string> = Fx.provide(describe, {clock, log})
```

Projection:

```rescript
module Fx = Refex.Fx

type small = {count: int}
type large = {small: small, label: string}

let count: Fx.t<int, string, small> = Fx.access(environment => environment.count)

let countInLarge: Fx.t<int, string, large> =
  Fx.contramapEnvironment(count, environment => environment.small)
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

Production output under `src/`, including `src/IO.res.mjs` and
`src/Fx.res.mjs`, is compiler output, committed so the archive and the package
export paths resolve without a build step. Do not read it as the definition of
the API's behaviour and never hand-edit it: ReScript 12.3.1 does not copy the
source's documentation comments into generated JavaScript, so the generated
file carries no docstrings by design. The ReScript source and its `.resi`
interface are the documentation of record.

## Getting help

- [Developer guide](developers-guide.md) for the toolchain, gates, and CI.
- [Repository layout](repository-layout.md) for path ownership.
- [Documentation index](contents.md) for the full document list.

There is no support or compatibility policy. `IO` and `Fx` are early,
unsupported surfaces with no runner. Open an issue on the repository for
bootstrap problems.
