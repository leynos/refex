# Documentation contents

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

All roadmap tasks remain unchecked. Specified, implemented, consumer-exercised,
and interpreter/platform-verified behaviour are separate facts. Lody's probes
and documentation are source evidence, not refex conformance results.

## Proposed decisions, evidence, and plans

- [Execution plan for roadmap step 1.1](execplans/1-1-freeze-validator-hypotheses.md):
  the approved plan for freezing the validator hypotheses; in progress.

## Implemented bootstrap and contribution

- [User guide](users-guide.md): what is installable today, and what is not.
- [Developer guide](developers-guide.md): build, tests, package checks,
  analysis, and continuous-integration operation.
- [Repository layout](repository-layout.md): paths and ownership boundaries.
- [ADR 001](adr-001-repository-bootstrap.md): reproducible baselines, scope,
  versions, and generated-output policy.
- [ADR 002](adr-002-portable-core-and-bun-boundary.md): portable core,
  development bindings, and future adapter seams.
- [ADR 003](adr-003-formatting-and-analysis-policy.md): canonical formatting,
  warning errors, and analysis limits.

See the [README](../README.md) for the runnable bootstrap quick start and
[AGENTS.md](../AGENTS.md) for contributor instructions.
