/**
@file Test-only evaluation of an `IO.t` description.

`IO.t` is opaque to consumers, so the suites cannot call it directly. This
helper is the single place that relies on the representation recorded by
decision D-2 in the 1.2.1 ExecPlan: a zero-argument thunk returning a `result`.
It rejects an unexpected
shape loudly, because a silent `undefined` would make a broken representation
look like a passing test.

Permitted caller: `tests/IoEvaluation.res` only. Roadmap task 1.3.1 replaces
this helper with the private runtime entry point.
*/

/**
 * Evaluates one `IO.t` and returns its ReScript `result`.
 *
 * Throws a `TypeError` naming the expected representation when the value is
 * not a zero-argument thunk or does not return an `Ok`/`Error` record.
 */
export function evaluate(io) {
  if (typeof io !== "function" || io.length !== 0) {
    throw new TypeError(`IO.t must be a zero-argument thunk, not ${typeof io}`);
  }
  const outcome = io();
  if (
    outcome === null ||
    typeof outcome !== "object" ||
    (outcome.TAG !== "Ok" && outcome.TAG !== "Error")
  ) {
    throw new TypeError(
      `IO.t must evaluate to a result, not ${typeof outcome}`,
    );
  }
  return outcome;
}
