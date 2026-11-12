# Documentation contents

This page, [documentation contents](contents.md), is the index for refex's
product and contributor documentation.

The product documents distinguish intended outcomes and proposed mechanisms
from the implemented bootstrap. Draft designs do not supersede accepted ADRs or
establish a working effects API.

## Product intent and design

- [Terms of reference](terms-of-reference.md): problem, users, scope,
  constraints, success criteria, and open questions.
- [Technical design](design.md): computation, complete outcomes, retained
  ownership, adapters, validators, and experimental acceptance gates.
- [Design brief](design-brief.md): the initial public abstractions, deferred
  capabilities, and a validator capability map with explicit statuses.
- [Context](context.md): shared vocabulary, evidence status, prior art, and
  the version-specific Lody learning crosswalk.
- [GIST roadmap](roadmap.md): the supplied edited plan extended with lifecycle
  contracts and vertical experiments, retaining original task identifiers.

A checked specification task does not establish implementation or verification.
Specified, implemented, consumer-exercised, and interpreter/platform-verified
behaviour are separate facts. Lody's probes and documentation are source
evidence, not refex conformance results.

## Product decisions, evidence, and plans

- [ADR 004](adrs/adr-0004-runtime-boundary.md):
  provisional runtime boundary authorizing a bounded trial of `effect` 4.0.5
  behind private bindings.
- [ADR 005](adrs/adr-0005-structural-dependency-environments.md):
  candidate open-row capability objects with function exports, named diagnostic
  sites, and explicit projection as the sound fallback.
- [ADR 006](adrs/adr-0006-complete-outcomes.md):
  candidate refex-owned cause tree, conservative recovery types, an abstract
  uninhabited channel, and lossless promise and native-await boundaries.
- [ADR 007](adrs/adr-0007-shared-work-lifecycle-contract.md):
  candidate behavioural contract for shared work, joined closure, unresolved
  generations, retained recovery, and host-exit limits.
- [ADR 0008](adrs/adr-0008-first-semantic-modules-and-module-visibility.md):
  accepted decision that `IO` and `Fx` are the package's public modules,
  replacing the retired bootstrap probe, and that `public` is a declaration
  enforced by module and export-set contracts.
- [Runtime-boundary audit](evidence/runtime-boundary-audit.md): executed Effect
  probes and the static binding audit behind ADR 004; source evidence only.
- [Verification feasibility](evidence/verification-feasibility.md): the FX-1
  tool-capability experiment behind the proof selection in ADRs 006 and 007;
  tool evidence only.
- [Type-level probes](evidence/type-level-probes.md): scratch compiler probes
  behind ADRs 005 and 006; source evidence only.
- [Execution plan for roadmap step 1.1](execplans/1-1-freeze-validator-hypotheses.md):
  the completed plan for freezing the validator hypotheses.
- [Execution plan for roadmap task 1.2.1](execplans/1-2-1-smallest-opaque-fx-surface.md):
  the completed plan for the smallest opaque `Fx` surface.

## Implemented bootstrap and contribution

- [Documentation style guide](documentation-style-guide.md): repository
  documentation conventions.
- [User guide](users-guide.md): what is installable today, and what is not.
- [Migrating to 0.1.0](migration-0.1.0.md): the `Bootstrap` removal and the
  `IO` and `Fx` surface, for anyone who used the bootstrap probe.
- [Developer guide](developers-guide.md): build, tests, package checks,
  analysis, and continuous-integration operation.
- [Repository layout](repository-layout.md): paths and ownership boundaries.
- [ADR 001](adrs/adr-0001-repository-bootstrap.md):
  reproducible baselines, scope, versions, and generated-output policy.
- [ADR 002](adrs/adr-0002-portable-core-and-bun-boundary.md):
  portable core, development bindings, and future adapter seams.
- [ADR 003](adrs/adr-0003-formatting-and-analysis-policy.md):
  canonical formatting, warning errors, and analysis limits.

See the [README](../README.md) for the runnable bootstrap quick start and
[AGENTS.md](../AGENTS.md) for contributor instructions.
