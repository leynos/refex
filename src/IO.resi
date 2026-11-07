/**
A lazy description of work that succeeds with `'a` or fails with the expected
error `'e`. Building one runs nothing. Task 1.2.1 provides no runner. `'e` is
invariant (ADR 006).
*/
type t<+'a, 'e>

/** Builds a description that succeeds with `value`. Runs nothing. */
let succeed: 'a => t<'a, 'e>

/** Builds a description that fails with `error`. Runs nothing. */
let fail: 'e => t<'a, 'e>

/**
Builds a description that defers to `make` until it is evaluated. Each
evaluation calls `make` again, so nothing is memoized.
*/
let suspend: (unit => t<'a, 'e>) => t<'a, 'e>

/**
Runs `io` and, on success, the description returned by `next`. A failure
short-circuits without calling `next`. Runs nothing when called.
*/
let flatMap: (t<'a, 'e>, 'a => t<'b, 'e>) => t<'b, 'e>

/**
Maps an expected failure through `mapper`. The mapper runs once and only when
`io` fails. Runs nothing when called.
*/
let mapError: (t<'a, 'e1>, 'e1 => 'e2) => t<'a, 'e2>
