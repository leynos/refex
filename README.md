# refex

*An experimental ReScript-first model for typed effects and dependencies.*

refex explores lazy workflows, explicit capabilities, typed failures, and owned
resources without exposing a backend runtime's API to application code.
React is the primary application target; the core remains portable ReScript.

**Status: development bootstrap only. No effects API exists yet.** The private
`0.0.0` package exports one disposable toolchain probe, not a stable library.
The [technical design](docs/design.md) describes proposals to validate, not
features that can already be imported.

______________________________________________________________________

## Why refex?

ReScript workflows should make their dependencies, failures, and lifetimes
readable together. refex investigates whether native variants, modules, and
pipelines offer a useful alternative to exposing Effect's API directly.
The project must earn that distinction through working applications, not a
longer list of combinators.

The [terms of reference](docs/terms-of-reference.md) define the problem and
non-goals. The [context](docs/context.md) records prior art, vocabulary, and the
limits of the current evidence.

______________________________________________________________________

## Quick start

### Installation

Use a local checkout. The package is private and has no npm release.
For this smoke check, install Bun 1.4.2, Make, and Git. See the
[developer guide](docs/developers-guide.md) for the complete pinned gate tools.

```bash
git clone https://github.com/leynos/refex.git
cd refex
make install
make build
```

### Basic usage

Run the existing compiled bootstrap probe from the repository root:

```bash
bun -e 'import { identity } from "./src/Bootstrap.res.mjs"; console.log(identity("Hello, refex."))'
```

It prints `Hello, refex.`. This verifies the current import path; it does not
exercise effects, dependencies, fibres, or cleanup. `Bootstrap.identity` will
be removed or replaced when real library code exists.

For package consumers, the concrete export is
`refex/src/Bootstrap.res.mjs`, not bare `refex`. The
[user guide](docs/users-guide.md) explains local consumption and current limits.

______________________________________________________________________

## Features

Available today: a pinned ReScript 12.3.1 bootstrap, explicit interfaces,
committed generated production JavaScript, a consumer smoke test, and
sequential Make gates. Bun runs development tools and tests; it is not a
core dependency. Core source must not call React, Bun, Node, or browser APIs.

Planned and unvalidated: typed `Fx` workflows, dependency-aware resources and
layers, pipeline helpers, owned concurrency, deterministic time, a React
adapter, and a gated native-await experiment. `rescript-schema` supplies the
schema starting point rather than a new refex schema language.

Three vertical validators decide which abstractions survive:

- An animated React Minesweeper solver challenges time and component lifetimes.
- A nine-room client-server roguelike with a React client challenges service
  composition and checked protocol boundaries.
- A ReScript/refex reimplementation of `leynos/css-view` challenges browser,
  WebSocket, subprocess, and resource ownership against an existing oracle.

No validator is implemented here yet. No benchmark, stable API, platform
compatibility, or cancellation-safety claim follows from the bootstrap.

______________________________________________________________________

## Learn more

- [User guide](docs/users-guide.md): what can be installed and imported today.
- [Developer guide](docs/developers-guide.md): toolchain, gates, and
  contribution.
- [Terms of reference](docs/terms-of-reference.md): users, scope, and outcomes.
- [Technical design](docs/design.md): contracts and acceptance experiments.
- [Context](docs/context.md): vocabulary, evidence, and prior art.
- [Roadmap context](docs/context.md#6-validation-and-roadmap-traceability):
  traceability to the supplied edited GIST plan, not a completion checklist.
- [Documentation index](docs/contents.md): guides and accepted bootstrap ADRs.

______________________________________________________________________

## Licence

ISC. See [LICENSE](LICENSE) for the licence and copyright notice.

______________________________________________________________________

## Contributing

Contributions that make a design claim testable are welcome. Start with
[AGENTS.md](AGENTS.md) and the [developer guide](docs/developers-guide.md).
Run `make all` before committing; the guide lists the additional gate tools.
Use `make help` for the contributor interface.

Keep pure application logic pure, preserve the platform boundary, and report
negative experiment results. This project does not publish packages or merge
changes as part of documentation or bootstrap work.

A [df12 Productions](https://df12.studio/) project.
