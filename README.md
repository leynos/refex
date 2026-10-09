# Refex

Refex is an experimental structured-effects library planned for ReScript. This
repository currently contains its development foundation.

**No effect-system API exists yet.** `Bootstrap.identity` is a disposable pure
function that proves interface compilation, testing, and package consumption.
It is not a Refex semantic API. There is no stable versioning promise.

## Platform boundary

The core belongs in portable ReScript. Production source cannot resolve the
development-only `rescript-bun` dependency. Bun runs development tools and
tests; it is not a core runtime dependency. Core source must not call Bun,
React, Node, browser APIs, or another concrete runtime.

Future `refex-bun` and `refex-react` adapters remain planned seams. They have
no packages here. [ADR 002](docs/adr-002-portable-core-and-bun-boundary.md)
records the boundary and the conditions for introducing a workspace.

## Development

Prerequisites: Bun 1.4.2, Make, Git, tar, mdtablefix 0.6.1, uv 0.12.23, and
Python 3.14.7 for the shared spelling gate. ReScript 12.3.1, its matching
runtime, Bun test bindings, Biome, YAML parsing, and Markdown lint tooling use
exact package versions and the committed textual `bun.lock`.

```bash
make install
make build
make test
make all
```

Use `make watch` for incremental ReScript builds, `make fmt` to apply
formatting, and `make help` for the complete contributor interface. Formatting
uses the official ReScript formatter. Compiler warnings fail builds. Biome
checks authored JavaScript and JSON; it does not analyse ReScript.

## Layout and quality gates

| Path       | Responsibility                                                                     |
| ---------- | ---------------------------------------------------------------------------------- |
| `src/`     | Portable source, public `.resi` interface, and committed generated ESM.            |
| `tests/`   | ReScript behavioural smoke, JavaScript consumer, and focused repository contracts. |
| `scripts/` | Generated-output and isolated package-consumer checks.                             |
| `docs/`    | Contributor guidance and bootstrap decisions.                                      |
| `.github/` | Read-only validation, advisory auditing, and dependency metadata automation.       |

`make all` runs formatting, generated-output verification, static checks,
tests, documentation checks, spelling, and package validation sequentially,
including under `make -j`. `make coverage` reports generated-JavaScript text
coverage and LCOV without a decorative threshold. `make audit` reports current
advisories separately and passes cleanly. See the
[developer guide](docs/developers-guide.md) for the advisory dispositions and
automerge activation.

The package checker accepts only a small explicit file inventory, including the
ISC `LICENSE`, and executes clean JavaScript and ReScript consumers. Compiler
output stays readable and deterministic; format or edit its ReScript source
rather than the generated JavaScript.

## Decisions and non-goals

Start at the [documentation index](docs/contents.md):

- [ADR 001: repository bootstrap](docs/adr-001-repository-bootstrap.md).
- [ADR 002: portable core and Bun boundary](docs/adr-002-portable-core-and-bun-boundary.md).
- [ADR 003: formatting and analysis](docs/adr-003-formatting-and-analysis-policy.md).
- [Repository layout and ownership](docs/repository-layout.md).

This bootstrap implements no `Effect`, `Exit`, `Cause`, `Fiber`, `Scope`,
`Context`, `Layer`, or `Schedule`, and no streams, queues, resource semantics,
runtime interpreters, or platform adapters. Effect-TS compatibility,
benchmarks, mutation tests, formal proofs, and product design documents remain
out of scope.

## Publication and licence

`package.json` remains private. No release, npm publication, publishing
workflow, or trusted publishing configuration exists. Archive verification is a
local quality gate, not a release mechanism. ISC licence; see
[LICENSE](LICENSE).
