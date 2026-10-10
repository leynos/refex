# Contributor and agent instructions

## Code for humans

- Code is for humans. Prefer clarity for a tired teammate over cleverness.
- Explain why: assumptions, ownership, trade-offs, and failure boundaries.
  Do not narrate obvious statements.
- Keep functions and modules small and single-purpose. Use precise names;
  prefer `is`, `has`, or `should` for predicates.
- Organize by feature. Keep related source, fixtures, and tests together.
- Keep authored code files below 400 lines. Split coherent responsibilities
  before introducing a generic helper framework.
- Before adding an abstraction, search for an existing equivalent. Document
  its ownership, permitted callers, and reuse boundary in the developer guide.

## ReScript boundary

- Keep `src/` portable. No Bun, React, Node, browser, or other platform calls.
- Give every public module an explicit `.resi` interface and add it to the
  production public-module allowlist deliberately.
- Keep Bun bindings under ReScript `dev-dependencies`, visible only to dev
  sources. Never globally open Bun or platform namespaces through compiler
  flags. Tests may locally open `RescriptBun.Test`.
- No unsafe casts or `Obj.magic`-style escapes outside narrow, documented
  foreign function interface (FFI) boundaries. This bootstrap has none.
- Use the ReScript 12 standard library. Do not add `@rescript/core`.
- Treat `Bootstrap` as disposable tooling evidence, not a product API.
- Change and format ReScript source, then rebuild and commit production
  `.res.mjs` output. Never hand-edit or reformat compiler output. Keep
  generated test JavaScript untracked.

## Verification and change discipline

- Use the public Make targets. Run `make all` before committing; run coverage
  and advisory auditing separately where relevant.
- Use deterministic tests. Behaviour-changing fixes require regression tests.
  Verify the test command executes the relevant tests, not just a green exit.
- Use the official ReScript formatter, strict warning errors, and the official
  editor code analyser. Do not claim editor-only analysis runs in CI.
- Biome owns authored JavaScript and JSON checks, not ReScript linting.
- Documentation is part of the change. Start at [contents](docs/contents.md)
  and update the relevant guide or architectural decision record (ADR).
- Make atomic commits with imperative subjects and reasons in the body.
  Separate functional changes from subsequent refactoring commits.
- Keep support helpers private to their suite. Do not grow a second build
  system or copy generic validation machinery from reference repositories.
- Never publish or merge as part of bootstrap work.

## Prose and spelling

- Use en-GB-oxendict: `-ize`, `-yse`, `-our`, and British grammar, preserving
  external API identifiers and the conventional `LICENSE` filename.
- Wrap prose at 80 columns and code blocks at 120. Use sentence-case headings,
  dash bullets, numbered sequential steps, and language-labelled fences.
- `make spelling` runs the pinned shared `typos-config-builder` gate. It
  regenerates `typos.toml` from the shared Oxford dictionary and
  `typos.local.toml`, then checks tracked Markdown and phrase corrections.
- Never edit `typos.toml` by hand. Add narrowly scoped identifier exceptions
  to `typos.local.toml`; shared spelling rules belong upstream.
- Commit regenerated spelling configuration when policy changes. Review
  unrelated policy churn separately from functional changes.
