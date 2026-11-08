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
2. Treat `IO` and `Fx` as optional descriptions, not a required replacement for
   working thunks. The package ships no runner, so a description built with
   `IO.suspend`, `IO.flatMap`, or `IO.mapError` cannot be evaluated from
   ReScript yet. Keep code that already runs, and adopt the descriptions when
   roadmap task 1.3.1 supplies the runner.
3. Do not call, inspect, evaluate, or forge a description. Its representation
   is private and carries no compatibility promise.
4. If describing environment-dependent work, use `Fx.t` and apply it with
   `Fx.provide`.
5. Update archive expectations. The package contains `src/IO.res`,
   `src/IO.resi`, `src/IO.res.mjs`, and the same three files for `Fx`. No
   `Bootstrap` file remains.

## Unchanged

The package name, the ISC licence, and the ReScript 12.3.1 compiler pin are
unchanged.

The `refex/src/IO.res.mjs` and `refex/src/Fx.res.mjs` module paths are new. The
previous version exported only `Refex.Bootstrap`, so an import of either path
introduces API rather than keeping an existing path as it was.
