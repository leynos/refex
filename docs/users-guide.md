# User guide

## What this guide covers

This guide describes what is actually installable and importable from this
repository today. It is short because almost nothing is: Refex is an
experimental structured-effects library with no effect-system API yet. The only
published symbol is a disposable toolchain probe.

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

The package exports exactly two paths: `./package.json` and the generated ESM
entry point. Import the concrete ReScript output path:

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

## Generated output

`src/Bootstrap.res.mjs` is compiler output, committed so the archive and the
package export path resolve without a build step. Do not read it as the
definition of the API's behaviour and never hand-edit it: ReScript 12.3.1 does
not copy the source's documentation comments into generated JavaScript, so the
generated file carries no docstrings by design. The ReScript source and its
`.resi` interface are the documentation of record.

## Getting help

- [Developer guide](developers-guide.md) for the toolchain, gates, and CI.
- [Repository layout](repository-layout.md) for path ownership.
- [Documentation index](contents.md) for the full document list.

Because no public API exists yet, there is no support or compatibility policy
to state. Open an issue on the repository for bootstrap problems.
