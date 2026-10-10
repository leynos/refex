/**
Disposable toolchain probe, not a Refex semantic API.

The interface is deliberately minimal: one pure string function. It exists so
the package export, the generated ESM entry point, and both isolated consumers
can be exercised end to end without implying any Refex semantics. ReScript
12.3.1 does not copy these doc comments into generated `.res.mjs` output, so
`src/Bootstrap.res.mjs` documents itself as generated code only; never
hand-edit it. Remove this module once real Refex source exists.
*/
/** Returns its input unchanged. */
let identity: string => string
