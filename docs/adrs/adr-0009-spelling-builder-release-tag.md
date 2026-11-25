# ADR 009: spelling builder release tag

Status: accepted. Date: 25 November 2026.

## Context

[ADR 001](adr-0001-repository-bootstrap.md) records the spelling builder as
version 0.1.3 at the commit `c8a4f95d7cf7f6a1b7517f2775d122d47d5721eb`. The
concordat `spelling-config-baseline` rule now requires the builder to be pinned
to a release tag at or above v0.1.3, not to a commit, and asks that the
repository's `AGENTS.md` carry the builder's canonical spelling block.

## Decision

The Makefile pins the builder through `TYPOS_CONFIG_BUILDER_VERSION`, set to
the release tag `v0.1.4`. The runner wiring recorded in ADR 001 (cache and tool
directories, Python 3.14.7) is unchanged. `AGENTS.md` carries the canonical
spelling block in place of its handwritten spelling bullets.

This supersedes only the spelling-builder row of ADR 001's version table; ADR
001 is left as accepted.

## Consequences

- The builder moves with a reviewed release tag, which a Makefile variable can
  override to try another tag.
- A tag is mutable in principle, unlike the commit ADR 001 chose. The rule
  accepts that trade-off for every repository, so this repository follows it.
