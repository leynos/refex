/**
A lazy description that needs an environment `'r`. Applying it to an
environment produces an `IO.t`, and building or applying one runs no user
callback. Task 1.2.1 provides no runner. `'e` is invariant (ADR 006); `'r` is
contravariant because the description consumes it.
*/
type t<+'a, 'e, -'r>

/** Builds a description that succeeds with `value`. Runs nothing. */
let succeed: 'a => t<'a, 'e, 'r>

/** Builds a description that fails with `error`. Runs nothing. */
let fail: 'e => t<'a, 'e, 'r>

/**
Builds a description that defers to `make` until it is evaluated. Each
evaluation calls `make` again, so nothing is memoized.
*/
let suspend: (unit => t<'a, 'e, 'r>) => t<'a, 'e, 'r>

/**
Maps a success through `transform`. The callback runs once on success and
never on failure. Runs nothing when called.
*/
let map: (t<'a, 'e, 'r>, 'a => 'b) => t<'b, 'e, 'r>

/**
Runs `fx` in the environment and, on success, the description returned by
`next` in the same environment. A failure short-circuits without calling
`next`. Runs nothing when called.
*/
let flatMap: (t<'a, 'e, 'r>, 'a => t<'b, 'e, 'r>) => t<'b, 'e, 'r>

/**
Runs `work` on a success and keeps the original value. The work runs once, in
order; if it fails, the whole description fails with its error. Runs nothing
when called.
*/
let tap: (t<'a, 'e, 'r>, 'a => t<'b, 'e, 'r>) => t<'a, 'e, 'r>

/**
Maps an expected failure through `mapper`. The mapper runs once and only when
`fx` fails. Runs nothing when called.
*/
let mapError: (t<'a, 'e1, 'r>, 'e1 => 'e2) => t<'a, 'e2, 'r>

/** Reads `read` from the environment once per evaluation. Runs nothing when called. */
let access: ('r => 'a) => t<'a, 'e, 'r>

/**
Runs the description returned by `next` in the same environment, once per
evaluation. Runs nothing when called.
*/
let accessEffect: ('r => t<'a, 'e, 'r>) => t<'a, 'e, 'r>

/** Applies `fx` to `environment`, producing the description to evaluate. */
let provide: (t<'a, 'e, 'r>, 'r) => IO.t<'a, 'e>

/**
Adapts `fx` to a larger environment by projecting it with `project`. The
projection runs once per evaluation, never when `fx` is built or provided.
*/
let contramapEnvironment: (t<'a, 'e, 'small>, 'large => 'small) => t<'a, 'e, 'large>
