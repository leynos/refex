# Repository layout

One root package is sufficient for the current source and tests. No reserved
adapter packages, examples, benchmarks, or website exist.

| Path                                                          | Responsibility                                                                    | Ownership boundary                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/Bootstrap.res`                                           | Disposable pure toolchain probe.                                                  | Portable library source; no effect semantics.                                           |
| `src/Bootstrap.resi`                                          | Explicit public interface.                                                        | Compiler-checked library contract.                                                      |
| `src/*.res.mjs`                                               | Deterministic generated production ESM.                                           | Compiler-owned, tracked, and packaged; never formatted manually.                        |
| `tests/Bootstrap.test.res`                                    | Behavioural test through Bun bindings.                                            | Dev source; generated output stays untracked.                                           |
| `tests/consumer.test.mjs`                                     | Plain JavaScript consumer smoke.                                                  | Authored test support, never packaged.                                                  |
| `tests/*-contracts.test.mjs`, `tests/generated-gate.test.mjs` | One repository invariant per file, with negative controls.                        | Suite-local helpers; no generic workflow framework.                                     |
| `scripts/check-generated.mjs`                                 | Compare compiler output against the Git index.                                    | Root build gate, never a library dependency.                                            |
| `scripts/package-check.mjs`                                   | Inspect a real archive and run isolated consumers.                                | Root package-validation gate; always removes its fixture.                               |
| `rescript.json`                                               | Namespacing, sources, exports, warnings, and editor analysis.                     | Single ReScript package configuration.                                                  |
| `package.json`, `bun.lock`                                    | Metadata, exact dependencies, ESM entry points, and frozen graph.                 | Root package and development tooling.                                                   |
| `bunfig.toml`                                                 | Exclude test bodies from text and LCOV coverage.                                  | Current test configuration; no workspace anticipation.                                  |
| `tests/support/package-dependency-contracts.mjs`              | Private package, Dependabot, and coverage assertions.                             | Owned by the package and dependency suites; no external reuse.                          |
| `tests/support/toolchain-workflow-contracts.mjs`              | Private Markdown, spelling-gate, and workflow assertions.                         | Owned by the Markdown, Makefile, and workflow suites; no external reuse.                |
| `Makefile`                                                    | Stable contributor entrypoints and sequential commit gates.                       | Root build interface.                                                                   |
| `biome.json`                                                  | Authored JavaScript and JSON policy.                                              | Excludes compiler output.                                                               |
| `.markdownlint.jsonc`, `.markdownlintignore`                  | Markdown rule policy and excluded paths.                                          | Documentation gate.                                                                     |
| `typos.local.toml`, `typos.toml`                              | Narrow spelling overlay and generated shared policy.                              | Local exceptions versus shared Oxford authority.                                        |
| `.github/workflows/ci.yml`                                    | Authoritative read-only verification and LCOV artefact.                           | Unprivileged PR and main validation.                                                    |
| `.github/workflows/audit.yml`                                 | Weekly and manual advisory auditing.                                              | Default-branch dependency surveillance.                                                 |
| `.github/workflows/dependabot-automerge.yml`                  | Dependabot metadata and reusable workflow previews.                               | Privileged API operations only; never PR code.                                          |
| `.github/dependabot.yml`                                      | Bounded Bun and action updates.                                                   | Minor/patch grouping, separate major review.                                            |
| `docs/contents.md`                                            | Canonical documentation index.                                                    | Documentation inventory owner.                                                          |
| `docs/users-guide.md`                                         | Installable surface, import path, and API limits.                                 | Consumer-facing truth; states what does not exist.                                      |
| `docs/`                                                       | Consumer and developer guidance, bootstrap and product ADRs, evidence, and plans. | Engineering decisions, not a fabricated product design.                                 |
| `docs/adr-*.md`                                               | Bootstrap and product decision records with fixed statuses.                       | Indexed by `docs/contents.md`; status vocabulary enforced by `documentation-contracts`. |
| `docs/evidence/`                                              | Source and tool evidence behind ADRs, with embedded probe sources.                | Never refex conformance; probes run in scratch directories, not committed as scripts.   |
| `docs/execplans/`                                             | Living execution plans, one per branch.                                           | Planning records; ADRs and design documents stay authoritative.                         |
| `AGENTS.md`                                                   | Contributor and agent guidance.                                                   | Repository-wide authored-code policy.                                                   |
| `README.md`, `CHANGELOG.md`, `LICENSE`                        | Status, change record, and ISC terms.                                             | Package introduction and legal metadata.                                                |
| `.gitignore`                                                  | Compiler internals, test output, coverage, and local state.                       | Preserve production generated output.                                                   |

Search for existing equivalents before introducing helpers. The generated gate
owns only source/output synchronization; the package checker owns only archive
inspection and consumer fixtures; contract-test helpers stay within their
suite. These responsibilities must not become interchangeable command routers.

Two support modules serve the contract suites.
`tests/support/package-dependency-contracts.mjs` belongs exclusively to the
package and dependency suites and asserts package, Dependabot, and coverage
values. `tests/support/toolchain-workflow-contracts.mjs` belongs exclusively to
the Markdown, Makefile, and workflow suites and asserts Markdown,
spelling-gate, and workflow values. `documentation-contracts` and
`generated-gate` use neither. Both receive controlled mutations from their
suites and have no external reuse or build responsibilities. Each suite is a
separate file — package, dependencies, Markdown, workflows, the generated gate,
Makefile ordering and suite registration, and documentation — so a single
invariant stays readable within the authored-file size limit rather than
accumulating in one test file. `documentation-contracts` checks the ADR index
and status vocabulary with a helper private to that suite, as does the
suite-registration check in `makefile-contracts`.

`bunfig.toml` owns the current coverage exclusion for generated test bodies. It
contains no install-linker or workspace configuration and never ships in the
package archive.
