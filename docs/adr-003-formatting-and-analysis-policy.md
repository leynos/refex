# ADR 003: formatting and analysis policy

Status: accepted for bootstrap. Date: 7 October 2026.

## Context

The foundation needs canonical formatting and meaningful static checks.
ReScript 12 supplies a formatter, compiler diagnostics, and editor dead-code
analysis. None of the inspected community projects supplies a mature, broadly
adopted, opinionated Clippy equivalent for this baseline.

## Decision

Use only official `rescript format` for `.res` and `.resi`, with explicit
source and test paths. The non-mutating gate uses `rescript format --check`. Do
not install Prettier or invent unsupported formatting preferences.

Enable compiler warning set `+A` and promote enabled project warnings to errors
with `error: +A`. No numbered exceptions are necessary for the bootstrap.
Future exceptions must name the warning number, rationale, and narrow scope;
never relax the policy globally to make a build pass.

Configure official `reanalyze` dead-code analysis with `analysis: [dce]`, empty
suppression lists, and `transitive: false`. The official editor extension's
`Start Code Analyzer` command owns this analysis. The installed 12.3.1 CLI
exposes build, watch, clean, format, and compiler arguments, but no official
`reanalyze` command. Therefore, this bootstrap does not claim CI-enforced dead
code analysis and does not install an obsolete standalone analyser.

Do not adopt `plow-technologies/rescript-linter`, an experimental ast-grep
`rescript-lint`, or a custom OCaml linter. They would introduce a rule-engine
maintenance task before hazardous product idioms exist. Biome checks authored
JavaScript and JSON only; compiler output is excluded. Oxlint has no
demonstrated additional role here.

Use pinned markdownlint-cli for Markdown, mdtablefix for deterministic
wrapping, numbering, breaks, ellipses, fences, and tables, and the shared
en-GB-oxendict spelling gate. `markdownlint-cli` reaches the same
`markdownlint` 0.41.1 rule engine as the replaced `markdownlint-cli2` without
the `braces` dependency that carries the unpatched
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm); the
`--dot` flag preserves dot-directory coverage. Generated spelling policy
belongs to the shared authority; local exceptions stay narrow.

## Reconsideration criteria

Revisit semantic lint tooling only when all of these hold:

1. The same hazardous idiom recurs in real source.
2. A rule recognizes it structurally, without fragile textual matching.
3. Tests establish the rule's false-positive policy.
4. The rule belongs in a shared or upstream profile, rather than a one-off
   local contraption.

## References

- [Build configuration](https://rescript-lang.org/docs/manual/build-configuration/).
- [Build overview](https://rescript-lang.org/docs/manual/build-overview/).
- [Editor code analysis](https://rescript-lang.org/docs/manual/editor-code-analysis/).
- [ReScript 12 migration](https://rescript-lang.org/docs/manual/migrate-to-v12/).
- [Reforging the build system](https://rescript-lang.org/blog/reforging-build-system/).
