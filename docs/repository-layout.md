# Repository layout

One root package is sufficient for the current source and tests. No reserved
adapter packages, examples, benchmarks, or website exist.

| Path                                         | Responsibility                                                     | Ownership boundary                                               |
| -------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `src/Bootstrap.res`                          | Disposable pure toolchain probe.                                   | Portable library source; no effect semantics.                    |
| `src/Bootstrap.resi`                         | Explicit public interface.                                         | Compiler-checked library contract.                               |
| `src/*.res.mjs`                              | Deterministic generated production ESM.                            | Compiler-owned, tracked, and packaged; never formatted manually. |
| `tests/Bootstrap.test.res`                   | Behavioural test through Bun bindings.                             | Dev source; generated output stays untracked.                    |
| `tests/consumer.test.mjs`                    | Plain JavaScript consumer smoke.                                   | Authored test support, never packaged.                           |
| `tests/repository-contracts.test.mjs`        | Package, compiler, and workflow invariants with negative controls. | Suite-local helpers; no generic workflow framework.              |
| `scripts/check-generated.mjs`                | Compare compiler output against the Git index.                     | Root build gate, never a library dependency.                     |
| `scripts/package-check.mjs`                  | Inspect a real archive and run isolated consumers.                 | Root package-validation gate; always removes its fixture.        |
| `rescript.json`                              | Namespacing, sources, exports, warnings, and editor analysis.      | Single ReScript package configuration.                           |
| `package.json`, `bun.lock`                   | Metadata, exact dependencies, ESM entry points, and frozen graph.  | Root package and development tooling.                            |
| `bunfig.toml`                                | Exclude test bodies from text and LCOV coverage.                   | Current test configuration; no workspace anticipation.           |
| `tests/support/repository-contracts.mjs`     | Private invariant assertions for the repository contract suite.    | Owned solely by that suite; no external reuse.                   |
| `Makefile`                                   | Stable contributor entrypoints and sequential commit gates.        | Root build interface.                                            |
| `biome.json`                                 | Authored JavaScript and JSON policy.                               | Excludes compiler output.                                        |
| `.markdownlint.jsonc`, `.markdownlintignore` | Markdown rule policy and excluded paths.                           | Documentation gate.                                              |
| `typos.local.toml`, `typos.toml`             | Narrow spelling overlay and generated shared policy.               | Local exceptions versus shared Oxford authority.                 |
| `.github/workflows/ci.yml`                   | Authoritative read-only verification and LCOV artefact.            | Unprivileged PR and main validation.                             |
| `.github/workflows/audit.yml`                | Weekly and manual advisory auditing.                               | Default-branch dependency surveillance.                          |
| `.github/workflows/dependabot-automerge.yml` | Dependabot metadata and reusable workflow previews.                | Privileged API operations only; never PR code.                   |
| `.github/dependabot.yml`                     | Bounded Bun and action updates.                                    | Minor/patch grouping, separate major review.                     |
| `docs/contents.md`                           | Canonical documentation index.                                     | Documentation inventory owner.                                   |
| `docs/`                                      | Developer guidance and bootstrap ADRs.                             | Engineering decisions, not a fabricated product design.          |
| `AGENTS.md`                                  | Contributor and agent guidance.                                    | Repository-wide authored-code policy.                            |
| `README.md`, `CHANGELOG.md`, `LICENSE`       | Status, change record, and ISC terms.                              | Package introduction and legal metadata.                         |
| `.gitignore`                                 | Compiler internals, test output, coverage, and local state.        | Preserve production generated output.                            |

Search for existing equivalents before introducing helpers. The generated gate
owns only source/output synchronization; the package checker owns only archive
inspection and consumer fixtures; contract-test helpers stay within their
suite. These responsibilities must not become interchangeable command routers.

`tests/support/repository-contracts.mjs` belongs exclusively to the repository
contract suite. It asserts package and workflow values and receives controlled
mutations from that suite; it has no external reuse or build responsibilities.

`bunfig.toml` owns the current coverage exclusion for generated test bodies. It
contains no install-linker or workspace configuration and never ships in the
package archive.
