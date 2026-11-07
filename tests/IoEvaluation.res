/** Test-only FFI (EP-1.2.1, D-3). `IO.t` is a zero-argument thunk in task
1.2.1; task 1.3.1 replaces this module with the private runtime entry. */
type outcome<'a, 'e> = Succeeded('a) | Failed('e)

@module("./support/io-evaluation.mjs")
external evaluateRaw: IO.t<'a, 'e> => result<'a, 'e> = "evaluate"

let evaluate = (io: IO.t<'a, 'e>): outcome<'a, 'e> =>
  switch evaluateRaw(io) {
  | Ok(value) => Succeeded(value)
  | Error(error) => Failed(error)
  }
