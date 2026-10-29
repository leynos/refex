# ADR 002: portable core and Bun boundary

Status: accepted for bootstrap. Date: 7 October 2026.

## Context

Bun is a convenient development runner and initial test runtime. Its APIs do
not define the portable effect library. The upstream Bun binding README's
ordinary dependency and global-open recommendations suit Bun applications; they
would erase Refex's intended library boundary.

## Decision

Keep portable ReScript at the architectural centre. Only the matching
`@rescript/runtime` package is a runtime dependency. Declare the compiler and
`rescript-bun` as development dependencies in package metadata, and declare
`rescript-bun` exclusively under ReScript `dev-dependencies`.

Mark `tests` as a dev source. Production `src` cannot resolve dev bindings:
this compiler-enforced separation is the primary boundary, verified with
positive dev-source and negative production-source compiler fixtures. It does
not prohibit raw platform FFI by itself; source review and the contributor
policy prohibit that separate escape route.

No global compiler flag opens Bun or another runtime namespace. Tests open
`RescriptBun.Test` locally. Future runtime adapters must own platform calls and
their independent dependencies; the core must not import the adapters.

Keep `refex-bun`, `refex-react`, and possible browser adapters as planned
seams. Create no empty packages to reserve them.

## Workspace trigger

Convert to a ReScript 12 monorepo when a second package has real source, tests,
independent dependency boundaries, and a plausible publication lifecycle.

At that point, follow the
[official monorepo setup](https://rescript-lang.org/docs/manual/build-monorepo-setup/)
with root and package ReScript configuration and package-manager symlinks. Bun
1.3 and later may require a hoisted installation layout:

```toml
[install]
linker = "hoisted"
```

Validate dependency discovery during that migration. Add no installation linker
or workspace configuration before the second package exists. The current
`bunfig.toml` only excludes generated test bodies from coverage.

## Consequences

Bun test ergonomics remain available without making the library Bun-specific.
Runtime interpretation, React integration, and browser execution need later
design decisions, source, and tests. The pure bootstrap function establishes
none of those semantics.

## Amendments

[ADR 004](adr-004-runtime-boundary.md) conditionally permits a private,
portable execution adapter in core and its backend dependency for the bounded
trial in tasks 1.3.1 to 1.3.5. Production adoption remains subject to its named
evidence gates; the bootstrap dependency policy otherwise remains in force.
