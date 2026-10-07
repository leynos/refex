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

## Tests and coverage

```bash
make test
make coverage
```

The test target compiles first and explicitly selects
`tests/Bootstrap.test.res.mjs`, the authored JavaScript consumer, and
repository contracts. This prevents a green run that never executes the
ReScript smoke. Contract tests cover package and compiler boundaries, workflow
permissions and pins, privileged metadata-only operations, and `make -j` gate
order. Controlled bad fixtures must fail the same invariant checks that accept
the repository.

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

Biome handles authored JavaScript and JSON. Markdown uses markdownlint-cli2 and
mdtablefix. The spelling gate regenerates `typos.toml` from the shared live
en-GB-oxendict authority and the local overlay. This shared policy can advance
independently of source dependencies; review and commit generated policy
changes deliberately. Keep technical exceptions narrow.

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

The initial audit identified Markdown-only transitive dependencies:

| Dependency      | Finding                                                                  | Disposition                                                                                        |
| --------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| KaTeX 0.16.47   | [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) | Pin override to stable 0.19.0 and verify Markdown lint.                                            |
| smol-toml 1.8.0 | [GHSA-r4xh-jqrq-34v2](https://github.com/advisories/GHSA-r4xh-jqrq-34v2) | Pin override to stable 1.9.0 and verify Markdown lint.                                             |
| braces 3.0.3    | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | No patched registry release or advisory fix exists at bootstrap. Audit remains failing; no waiver. |

The remaining issue is recursive brace expansion against deeply nested glob
patterns. It enters through markdownlint-cli2, globby, fast-glob, and
micromatch; it is absent from runtime dependencies and the packed consumer. The
committed lint command uses a fixed Markdown glob, which narrows exposure but
does not establish general immunity. Update or replace the shared tooling path
once upstream supplies a supported fix; do not manufacture an audit pass with a
severity cutoff or ignore list. Ordinary CI's advisory step reports this
blocker until then.

Dependabot groups minor/patch Bun and action updates, applies ecosystem labels,
uses cooldowns, and caps each ecosystem at five open PRs. Major updates require
separate review. Grouping is not a proof of compatibility: version-match and
behavioural gates still apply. Exact tool pins in Make and action inputs need
deliberate maintenance; Dependabot cannot discover every external-tool pin.

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
5. Resolve the reported advisory or approve an explicit policy decision in a
   separate reviewed change. This bootstrap grants no audit waiver.
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

## Future adapters and workspace migration

Platform adapters must have real platform-specific source and tests, own their
runtime dependencies, and depend inward on core. Core must not depend on them.
Do not create `refex-bun` or `refex-react` as empty name reservations.

Convert to a ReScript 12 monorepo when a second package has real source, tests,
independent dependency boundaries, and a plausible publication lifecycle. Bun
1.3 and later may require `[install] linker = "hoisted"` in `bunfig.toml` for
dependency discovery. Validate that change against actual package symlinks at
migration; no speculative configuration belongs here now.

No effect model, compatibility promise, release workflow, benchmarks, mutation
testing, or formal proof infrastructure belongs in the bootstrap. Act remains a
deferred validation option. Hosted GitHub Actions establish the actual PR check
results.
