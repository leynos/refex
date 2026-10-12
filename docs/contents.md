# Documentation contents

The product documents distinguish intended outcomes and proposed mechanisms
from the implemented bootstrap. Draft designs do not supersede accepted ADRs
or establish a working effects API.

## Product intent and design

- [Terms of reference](terms-of-reference.md): problem, users, scope,
  constraints, success criteria, and open questions.
- [Technical design](design.md): proposed computation and ownership contracts,
  adapters, validator applications, and experimental acceptance gates.
- [Context](context.md): shared vocabulary, evidence status, prior art, and
  traceability to the user's edited GIST roadmap.

The supplied roadmap is not yet a repository-local checklist. Its original task
identifiers and validator sequence appear in
[the roadmap context](context.md#6-validation-and-roadmap-traceability).
No documentation addition marks those tasks complete.

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
