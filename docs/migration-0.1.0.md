# Migrating to 0.1.0

Status: unreleased. `refex` is a private package at version `0.0.0` and has
never been published, so no published consumer exists to migrate. This note
records the API change for anyone who used the bootstrap probe, and describes
the shape a `0.1.0` release would have if one is published.

## `Bootstrap` is removed

The bootstrap probe `Refex.Bootstrap` exported one function:

```rescript
let identity: string => string
```

It existed only to prove that the toolchain built a namespaced public module,
linked it against its `.resi`, and produced consumable ESM. It carried no
effect, runtime, or platform behaviour. It is deleted, and there is no
replacement: a consumer that only needed an identity function should use the
value directly.

## `IO` and `Fx` are the package's public modules

`Refex.IO` describes a suspended computation that yields `result<'a, 'e>`;
`Refex.Fx` describes one that also needs an environment `'r` and yields an
`IO.t` once that environment is provided. Both are abstract in their `.resi`
interfaces, and the package still ships no runner, so nothing in `refex`
evaluates a description yet. The [user guide](users-guide.md) documents the
operations and the evaluation rules.

## What a consumer must change

1. Delete every `Refex.Bootstrap` import and `Bootstrap.identity` call.
2. Replace hand-rolled thunks with `IO.suspend`, and sequence them with
   `IO.flatMap` and `IO.mapError`.
3. Describe environment-dependent work as `Fx.t` and apply it with
   `Fx.provide`; do not call, inspect, or forge a description.
4. Update archive expectations. The package contains `src/IO.res`,
   `src/IO.resi`, `src/IO.res.mjs`, and the same three files for `Fx`. No
   `Bootstrap` file remains.

## Unchanged

The package name, the ISC licence, the ReScript 12.3.1 compiler pin, and the
`refex/src/IO.res.mjs` and `refex/src/Fx.res.mjs` module paths are unchanged.
