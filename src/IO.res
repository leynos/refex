/**
The opaque `IO` description (ADR 008).

A description is a zero-argument thunk, so building one runs nothing. Every
operation here returns a fresh thunk and calls a user callback only when that
thunk is evaluated, which keeps exceptions inside the region where roadmap task
1.3.1's adapter can classify them.
*/
/** The representation is private: consumers see only `IO.resi`. */
type t<'a, 'e> = unit => result<'a, 'e>

let succeed = (value: 'a): t<'a, 'e> => () => Ok(value)

let fail = (error: 'e): t<'a, 'e> => () => Error(error)

let suspend = (make: unit => t<'a, 'e>): t<'a, 'e> => () => make()()

let flatMap = (io: t<'a, 'e>, next: 'a => t<'b, 'e>): t<'b, 'e> =>
  () =>
    switch io() {
    | Ok(value) => next(value)()
    | Error(error) => Error(error)
    }

let mapError = (io: t<'a, 'e1>, mapper: 'e1 => 'e2): t<'a, 'e2> =>
  () =>
    switch io() {
    | Ok(value) => Ok(value)
    | Error(error) => Error(mapper(error))
    }
