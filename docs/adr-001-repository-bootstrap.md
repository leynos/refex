# ADR 001: repository bootstrap

Status: accepted for bootstrap. Date: 7 October 2026.

## Context

Refex needs a reproducible development foundation before its effect model
exists. The target already contains a Git ignore file and a `main` branch; its
existing private visibility must remain unchanged.

The inspected immutable baselines are:

- [Simulacat Core](https://github.com/leynos/simulacat-core/tree/03ce6cfc3815e92ce1a1422d0be784d11e693c7e)
  at `03ce6cfc3815e92ce1a1422d0be784d11e693c7e`.
- [Combobulate PR 1](https://github.com/leynos/combobulate/pull/1)
  at `6c9f1c37e278bf4c8a9c01ad5e47413b4bb60e17`.

Both remain at these heads when inspected. Simulacat supplies package-tooling,
Markdown, Oxford spelling, Dependabot, and reusable automerge conventions.
Combobulate supplies sequential recursive Make gates, explicit bootstrap scope,
path ownership, scheduled audits, and focused negative contract tests. Its
broader Rust toolchain and design validation do not describe Refex.

## Decision

Keep one root package and one disposable public `Bootstrap` module with a
`.resi` interface. Pin ReScript and its runtime to the same stable version.
Keep the package private at `0.0.0`; this value promises no stable API or
versioning policy. Use an independently selected ISC licence with copyright for
repository owner leynos.

Registry checks confirm ReScript/runtime 12.3.1, `rescript-bun` 2.1.0, and Bun
1.4.2. ReScript 13 alpha exists but is outside the authorized baseline. Bun
1.4.2 replaces Simulacat's 1.3.11 after real build and test validation; no
compatibility fallback is needed. The upstream Bun bindings' main commit
`b82e963ebcef3a99276605eae5e23875b7483515` matches the 2.1.0 npm git head.

| Tool                    | Exact bootstrap version                             |
| ----------------------- | --------------------------------------------------- |
| ReScript and runtime    | 12.3.1                                              |
| Bun                     | 1.4.2                                               |
| ReScript Bun bindings   | 2.1.0                                               |
| Biome                   | 2.5.15                                              |
| markdownlint-cli2       | 0.23.3                                              |
| YAML contract parser    | 2.9.1                                               |
| mdtablefix              | 0.6.1                                               |
| uv                      | 0.12.23                                             |
| Spelling builder        | 0.1.3 at `c8a4f95d7cf7f6a1b7517f2775d122d47d5721eb` |
| Spelling Python         | 3.14.7                                              |
| Optional Make validator | mbake 1.4.6                                         |

mdtablefix 0.6.1 advances the reference's 0.6.0, including released fixes for
list numbering across nested headings and wrapping only at source whitespace.
See its
[release notes](https://github.com/leynos/mdtablefix/releases/tag/v0.6.1).
Biome advances the reference's 2.5.3 package range to an exact current pin. The
inspected shared-actions main head `7d751eded578e48dacf43ab173d5820e6437c474`
has no relevant automerge workflow change; retain the reviewed baseline pin
`ff1dd759dfffc0db3459e30e833f52437ee62b57`. Use current checkout v6 at
`d23441a48e516b6c34aea4fa41551a30e30af803` with credential persistence disabled.

Commit textual `bun.lock`. Use frozen installation and full action commit pins.
Commit compiler-owned production `.res.mjs` files, following the
[official library guidance](https://rescript-lang.org/docs/manual/libraries/).
Do not commit generated tests. The generated gate compares exact output and
inventory against Git's index; even formatting drift fails. Biome excludes all
compiler-generated JavaScript.

An independent archive allowlist admits only package metadata, configuration,
README, ISC licence, and the bootstrap source, interface, and generated ESM. An
isolated fixture installs the archive and validates both JavaScript and
ReScript consumers without Bun bindings.

## Deliberate exclusions

Reject TypeScript-specific build/lint layers and Rust, Cargo, Clippy, Whitaker,
linkers, verifier tooling, and Rust shared actions. Reject inherited product
design documents, generic workflow-testing machinery, mutation testing,
coverage ratchets, publishing, and premature adapter packages. Hosted GitHub
Actions remain authoritative; Act is a deferred option. There is no real
Mermaid diagram, so no diagram tooling belongs in this scaffold.

## Consequences

The foundation can prove its package and platform boundaries without pretending
to implement effects. New semantic code must replace the disposable module and
supply real behavioural tests. Tooling advisories remain explicit; the
[developer guide](developers-guide.md) records patched transitive pins and the
remaining unpatched advisory, without an audit waiver.

Required CI protection and repository settings need administrative operations
the connected integration does not expose. Dependabot automerge remains in
dry-run mode until those controls exist; major updates always need review.
