# Developer guide

## Install the toolchain

Install Bun 1.4.2, Make, Git, tar, mdtablefix 0.6.1, and uv 0.12.23. The
spelling gate asks uv for Python 3.14.7. Use prebuilt mdtablefix releases
rather than compiling a Rust toolchain solely for documentation. CI uses the
pinned shared installer. The optional Make validator is mbake 1.4.6.

```bash
make install
make help
```

`make install` runs `bun install --frozen-lockfile`; it never updates the
committed graph. Intentional dependency changes use exact package versions,
regenerate textual `bun.lock`, and pass the applicable gates. The compiler and
`@rescript/runtime` versions must match. ReScript 13 prereleases are outside
this bootstrap's authorized toolchain.

No global JavaScript tools are required. Make invokes repository-local
executables through Bun, including the ReScript CLI's JavaScript launcher. Bun
successfully runs this pinned toolchain; Node is not a library dependency or a
development prerequisite for these commands.

Use the pinned interpreter for every gate, not whichever `bun` the shell finds.
Bun refuses to parse the committed `bun.lock` when the running version is older
than the one that wrote it, and the failure surfaces as unrelated errors: a
1.3.14 binary reading this textual lockfile reports `Unknown lockfile version`
and fails `bun pm pack`, which makes `make package-check` and the archive
contract test fail for no real reason. CI pins `bun-version: '1.4.2'`; match it
locally, for example with `PATH=/path/to/bun-1.4.2:$PATH`. `package.json`
records the same version in `packageManager`, which `make install` does not
enforce on its own.

The spelling gate's uv cache and tool directories are Make defaults
(`UV_CACHE_DIR ?=`), not inline assignments. A CI provisioner such as
`astral-sh/setup-uv` exports its own cache directory and fails its post-job
cache save when uv wrote elsewhere, so the environment must win where it
supplies a location; locally the defaults keep uv inside the repository.

## Build and watch

```bash
make build
make watch
```

ReScript 12.3.1's default build includes production and dev sources. The
production core still cannot resolve `dev-dependencies`: dev sources receive
additional compiler include paths. The smoke test locally opens the Bun test
module; `src` receives no Bun include path. A negative compiler fixture proves
the distinction, with the same source compiling successfully as dev source.

`make typecheck` invokes a full compiler build because this supported toolchain
has no separate non-emitting project typecheck command. It can regenerate
JavaScript. `make clean` removes compiler output and coverage; rebuild before
reviewing generated-output changes.

## Generated JavaScript

Commit production `.res.mjs` output alongside `.res` and `.resi` changes.
Generated tests remain ignored. Never format or hand-edit compiler output;
Biome excludes it. `make check-generated` rebuilds, verifies the generated
production inventory against tracked Git paths, and rejects any diff against
the index. This exact comparison detects semantic drift and incidental output
changes. During bootstrap, stage the initial generated file before the gate.

`scripts/check-generated.mjs` owns only this synchronization boundary.
`scripts/package-check.mjs` owns archive contents and clean consumer fixtures.
Contract helpers stay private in their corresponding test suite. Search for an
existing equivalent and document ownership before extracting a new helper.

ReScript 12.3.1 does not copy doc comments from `.res`/`.resi` source into
generated JavaScript. Neither a leading `/** ... */` module comment nor a
`@doc` attribute survives the build, so `src/Bootstrap.res.mjs` carries no
docstrings by design. Document the ReScript source and its interface; do not
hand-edit the output to add comments, and do not read the absence of docstrings
there as missing documentation.

## Tests and coverage

```bash
make test
make coverage
```

The test target compiles first and explicitly selects
`tests/Bootstrap.test.res.mjs`, the authored JavaScript consumer, and the
repository contract suites. This prevents a green run that never executes the
ReScript smoke. Contract tests cover package and compiler boundaries, workflow
permissions and pins, privileged metadata-only operations, `make -j` gate
order, the Dependabot configuration, the Markdown rule policy and its ignore
paths, the Bun coverage exclusion, registration of every authored suite in the
`test` target, and the ADR index and status vocabulary. Controlled bad fixtures
must fail the same invariant checks that accept the repository; every contract
helper has at least one paired negative control.

Bun does not discover `.test.res.mjs` output, so a new suite runs only once the
`test` target names it. `makefile-contracts` fails when any `tests/*.test.mjs`
or `tests/*.test.res` suite is missing from that list, so add the path to the
`Makefile` in the same change as the suite.

The contract tests are split one concern per file — `package-contracts`,
`dependency-contracts`, `markdown-contracts`, `workflow-contracts`,
`generated-gate`, `makefile-contracts`, and `documentation-contracts` — so each
stays within the authored file size limit. Assertions are shared through two
modules that belong to these suites alone:
`tests/support/package-dependency-contracts.mjs` serves `package-contracts` and
`dependency-contracts`, and `tests/support/toolchain-workflow-contracts.mjs`
serves `markdown-contracts`, `workflow-contracts`, and `makefile-contracts`.
`generated-gate` and `documentation-contracts` use neither. When a support
module approaches the size limit, split it along the same subject boundary
rather than growing a general-purpose test file. Helpers that only one suite
needs stay private to that suite: the suite-registration check in
`makefile-contracts` and the ADR index check in `documentation-contracts` do.
Add a new contract to the file that owns its subject.

`scripts/check-generated.mjs` cannot be tested as a helper, because it is a
script that reads Git state. The suite therefore builds throwaway Git
repositories and runs it as a subprocess, asserting the exit status for
matching output, stale output, missing output, untracked output, and a
repository with no committed production output. A gate that always exited `0`
would pass the real repository and fail these.

Coverage uses Bun's text and LCOV reporters for the behavioural and consumer
tests. It measures generated JavaScript under ReScript 12, not perfect ReScript
source-line attribution. Repository-contract and gate implementation coverage
is not product coverage. CI uploads `coverage/lcov.info` for 14 days. There is
no threshold, ratchet, or external publication service. Introduce a meaningful
baseline only once product code exists.

`bunfig.toml` excludes `tests/**` from both coverage reports because Bun's
default test patterns do not recognize the compiler's `.test.res.mjs` output.
This corrects current coverage, not speculative workspace configuration.

## Formatting and analysis

```bash
make fmt
make check-fmt
make lint
make docs-check
make spelling
```

The official formatter owns all `.res` and `.resi` layout. Explicit paths
include dev tests in both formatting commands. `make fmt` also formats authored
support files and Markdown; `make check-fmt` does not write them. Compiler
warnings use `+A` and fail as errors with no bootstrap exceptions.

The official editor extension provides dead-code analysis through
`Start Code Analyzer`. `rescript.json` configures `dce`, no path suppressions,
and `transitive: false`. ReScript 12.3.1 exposes no supported analyser CLI in
its command list, so CI enforces compiler warnings rather than claiming
`reanalyze` coverage. No obsolete standalone analyser or community linter is
installed. See [ADR 003](adr-003-formatting-and-analysis-policy.md).

Biome handles authored JavaScript and JSON. Markdown uses markdownlint-cli and
mdtablefix. `.markdownlint.jsonc` holds the rule policy and
`.markdownlintignore` the excluded paths; the Makefile adds `--dot` so Markdown
under `.github` is linted too. The spelling gate regenerates `typos.toml` from
the shared live en-GB-oxendict authority and the local overlay. This shared
policy can advance independently of source dependencies; review and commit
generated policy changes deliberately. Keep technical exceptions narrow.

## Package validation

```bash
make package-check
```

This gate cleans and rebuilds, checks generated synchronization, creates a real
archive with `bun pm pack --ignore-scripts`, and compares its contents against
an independent explicit seven-file allowlist. The archive contains README,
`LICENSE`, package metadata, ReScript configuration, and the bootstrap source,
interface, and generated ESM. Tests, dev scripts, coverage, editor state, and
unrelated documents must never enter it.

A temporary clean consumer installs the archive with the matching compiler,
then checks frozen installation, imports and executes the JavaScript entry
point, compiles `Refex.Bootstrap`, and executes that compiled consumer. No
`rescript-bun` package enters the fixture. A `finally` block removes the
archive and fixture on success or failure. System tar only inspects the locally
produced archive; no publishing command exists.

The only module export is `refex/src/Bootstrap.res.mjs`. ReScript consumers
emit that concrete package path automatically, so an alias-only `bootstrap`
export would compile but fail at execution. The archive checker executes the
compiled consumer to verify this integration detail.

## CI, auditing, and dependency automation

`ci.yml` is authoritative for pull requests, main pushes, and manual dispatch.
The `verify` job runs `make all`, a conditional advisory audit, and coverage,
with read-only repository permissions, a 15-minute timeout, disabled checkout
credential persistence, exact Bun, and full action commit pins. Superseded
branch or PR runs cancel through a concurrency group. PR code never runs with
write permissions or secrets.

`make all` executes the commit gates sequentially using recursive Make recipes,
even with `make -j`. Coverage and advisory auditing remain separate targets.

```bash
make audit
```

Bun audits the entire installed lockfile. Ordinary PRs, main, and manual CI
runs audit advisories. Dependabot PRs skip that advisory step because a new
unrelated advisory could otherwise deadlock every remediation update. They
still run all ordinary validation and package checks. `audit.yml` compensates
with default-branch audits each Monday and manual dispatch.

The audit reaches a clean report through dependency replacements, not
suppression. Every advisory below is a development-only transitive dependency;
none reaches the portable runtime or the packed consumer.

| Dependency       | Finding                                                                  | Disposition                                                                           |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| KaTeX 0.16.47    | [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) | Pin override to stable 0.19.0 and verify Markdown lint.                               |
| smol-toml 1.8.0  | [GHSA-r4xh-jqrq-34v2](https://github.com/advisories/GHSA-r4xh-jqrq-34v2) | Pin override to stable 1.9.0 and verify Markdown lint.                                |
| js-yaml 5.2.3    | [GHSA-r3ph-w7gj-g6xm](https://github.com/advisories/GHSA-r3ph-w7gj-g6xm) | Pin override to stable 5.4.3 and verify Markdown lint.                                |
| minimatch 10.2.6 | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | Pin override to stable 11.0.1 and verify Markdown lint.                               |
| braces 3.0.3     | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | Replace markdownlint-cli2 with markdownlint-cli and verify the identical rule policy. |

`braces` had no patched registry release and the upstream maintainer disputes
the advisory, so no upstream fix is pending. Every `markdownlint-cli2` release
resolves `micromatch`, and therefore `braces`, so no version pin could clear it.
`markdownlint-cli` reaches the same `markdownlint` 0.41.1 rule engine through
`tinyglobby` and `minimatch`, removing the dependency rather than masking it.
The two linters share rule semantics, so the committed policy and its findings
are unchanged; `--dot` preserves dot-directory coverage, which the replacement
does not enable by default. The repository-contract suite rejects a return to
the vulnerable linter, a floating pin, or a loss of `--dot`.

Do not manufacture an audit pass with a severity cutoff or ignore list. If a
future advisory has no replacement path, record it here and keep `make audit`
failing rather than silencing it.

Dependabot checks the Bun and github-actions ecosystems daily, groups
minor/patch updates, applies ecosystem labels, uses cooldowns, and caps each
ecosystem at five open PRs. Major updates require separate review. Grouping is
not a proof of compatibility: version-match and behavioural gates still apply.
Exact tool pins in Make and action inputs need deliberate maintenance;
Dependabot cannot discover every external-tool pin.

The privileged `pull_request_target` caller reads Dependabot metadata only. It
never checks out or runs PR code. The pinned reusable workflow locates and
executes its own trusted shared-actions source through its immutable OIDC
identity; that upstream checkout is not a PR checkout. Its declared permissions
require contents/pull-request writes, check/status reads, and an identity
token. No cloud credentials or inherited secrets are passed. Local contract
checks enforce caller boundaries; they do not claim hosted execution of the
callee.

### Repository settings and automerge activation

The connected GitHub integration can publish branches, commits, and PRs, but
cannot change administrative repository settings or create labels. Preserve
existing visibility and any stricter rules. The required manual settings are:

1. Keep squash merging enabled; disable merge commits and rebase merging.
2. Enable repository auto-merge and deletion of head branches after merging.
3. Create `dependencies`, `bun`, and `github-actions` labels.
4. Require the `verify` check from the CI workflow for `main`, once GitHub has
   registered it. Do not replace or weaken any existing requirement.
5. The advisory audit passes without a waiver. Keep it so: clear a new finding
   by replacement or an upstream fix, never by a severity cutoff or ignore list.
6. After required CI protection exists, change only the automated job's
   `dry-run` input to `false` in a reviewed change and adapt its corresponding
   contract assertion. The manual job must remain a preview.

The rulesets API returned HTTP 403 during bootstrap: GitHub requires a plan
upgrade or public visibility for that feature on this repository. Preserve
private visibility. Enable private-repository protection through an appropriate
account plan before activating live automerge.

Dry-run is necessary because the reusable implementation can directly merge a
mergeable PR, and an unprotected repository supplies no required CI barrier.
The automated caller admits only verified minor/patch metadata. Unknown or
major changes cannot reach live automerge. Manual dispatch previews a named
Dependabot PR; it cannot bypass version review.

The `manual-preview` job is an accepted unavailability. The pinned callee
builds its dry-run snapshot from `event["pull_request"]`, which a
`workflow_dispatch` payload never carries, and it ignores the
`pull-request-number` input that exists to serve that trigger. A manual run
therefore exits before any API call instead of reporting a decision. The
failure is inert, because dry-run performs no mutation, and the alternatives
are worse: `dry-run: false` would merge without the semver eligibility gate on
a repository with no required-check protection, and deleting the job would
remove the input the live path will need. The workflow comment and the issue
`leynos/shared-actions#613` record the defect; this job starts working again
when the pin moves to a revision that resolves a dispatch payload. Do not
weaken the contract to hide it: `workflowContract` still asserts
`dry-run: true` on both jobs.

## Future adapters and workspace migration

Platform adapters must have real platform-specific source and tests, own their
runtime dependencies, and depend inward on core. Core must not depend on them.
[ADR 004](adr-004-runtime-boundary.md) authorizes one exception for a bounded
trial: the portable execution adapter that backs refex's computation types is
part of core and may depend on its backend. Do not create `refex-bun` or
`refex-react` as empty name reservations.

Convert to a ReScript 12 monorepo when a second package has real source, tests,
independent dependency boundaries, and a plausible publication lifecycle. Bun
1.3 and later may require `[install] linker = "hoisted"` in `bunfig.toml` for
dependency discovery. Validate that change against actual package symlinks at
migration; no speculative configuration belongs here now.

No effect model, compatibility promise, release workflow, benchmarks, mutation
testing, or formal proof infrastructure belongs in the bootstrap. Act remains a
deferred validation option. Hosted GitHub Actions establish the actual PR check
results.

## Decisions, evidence, and plans

ADRs live at `docs/adr-NNN-kebab-title.md`, numbered sequentially and never
renumbered. Each opens with `# ADR NNN: title` and a status line, and product
ADRs open their decision with a one-sentence Y-statement that names the
rejected alternatives and the accepted downside. The `documentation-contracts`
suite requires every ADR to be linked from `docs/contents.md` and to declare
one of these statuses, matched as the text after `Status:` up to the first `.`
or `:`:

| Status                   | Meaning                                                                       |
| ------------------------ | ----------------------------------------------------------------------------- |
| `accepted for bootstrap` | A bootstrap decision in force.                                                |
| `proposed`               | Written and under review; not yet accepted.                                   |
| `provisional`            | Accepted for a bounded trial only; a qualifier after a colon names the bound. |
| `candidate`              | An accepted contract awaiting the evidence that would confirm it.             |
| `accepted`               | In force.                                                                     |
| `superseded by ADR NNN`  | Replaced; kept for history.                                                   |

Change an accepted ADR's decision only through a new ADR. Record a conditional
change to an accepted ADR, once the conditioning ADR is accepted, in an
`## Amendments` section of the amended ADR, never in its status line.

Three status vocabularies coexist and must not be confused:

| ADR status                 | Context evidence label (context §1)           | Design-brief capability status    |
| -------------------------- | --------------------------------------------- | --------------------------------- |
| `proposed`                 | Proposed                                      | Proposed                          |
| `provisional`, `candidate` | Proposed or Unvalidated until evidence exists | Proposed                          |
| `accepted for bootstrap`   | Established once implemented and inspected    | Implemented when installable      |
| `accepted`                 | Established once implemented and inspected    | Implemented only when installable |
| (no ADR)                   | Deferred or Open                              | Deferred, Open, or Delegated      |

Evidence records live in `docs/evidence/`. Each records a claim, pins and
environment, the exact procedure from an empty directory, observations with
negative controls, limits, and a decision, as design §10 requires. They are
source or tool evidence: probes of upstream packages, scratch compiler probes,
or tool-feasibility experiments. They are never refex conformance results, and
their probe sources are embedded rather than committed as executable scripts.

Execution plans live in `docs/execplans/`, named after the branch, and are
living documents maintained throughout their work.

Proof tooling is evaluated by scratch feasibility experiments, recorded as
evidence, until an approved plan adds a committed gate. The first such gate is
planned for roadmap task 1.3.3 and is described in
[ADR 007](adr-007-shared-work-lifecycle-contract.md).
