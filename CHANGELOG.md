# Changelog

## Unreleased

- Establish a private ReScript 12 package with Bun development and tests.
- Add portable-core boundaries, repository gates, and contributor guidance.
- Add opaque `IO` and `Fx` descriptions for deferral, sequencing, composition,
  environment access and projection, provision, and typed expected failures.
  Execution still has no runner.
- Retire the disposable bootstrap probe; `IO` and `Fx` are the package's public
  modules and archive contents.
