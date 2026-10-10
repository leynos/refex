/**
Disposable toolchain probe, not a Refex semantic API.

This module exists only to prove that the bootstrap compiles a namespaced
public module, links it against its `.resi` interface, and produces consumable
generated ESM. It carries no effect, runtime, or platform behaviour, and it
must be deleted or replaced once real Refex source exists.
*/
/** Returns `value` unchanged. Present only to give the probe a callable body. */
let identity = (value: string): string => value
