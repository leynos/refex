/**
A description that needs an environment `'r` and yields an `IO.t` when applied.
Each combinator returns an environment closure that only builds IO thunks, so
no user callback runs until the resulting IO is evaluated (C-13).
*/
type t<'a, 'e, 'r> = 'r => IO.t<'a, 'e>

let succeed = (value: 'a): t<'a, 'e, 'r> => _environment => IO.succeed(value)

let fail = (error: 'e): t<'a, 'e, 'r> => _environment => IO.fail(error)

let suspend = (make: unit => t<'a, 'e, 'r>): t<'a, 'e, 'r> =>
  environment => IO.suspend(() => make()(environment))

let map = (fx: t<'a, 'e, 'r>, transform: 'a => 'b): t<'b, 'e, 'r> =>
  environment =>
    IO.suspend(() => IO.flatMap(fx(environment), value => IO.succeed(transform(value))))

let flatMap = (first: t<'a, 'e, 'r>, next: 'a => t<'b, 'e, 'r>): t<'b, 'e, 'r> =>
  environment =>
    IO.suspend(() => first(environment))->IO.flatMap(value =>
      IO.suspend(() => next(value)(environment))
    )

let tap = (fx: t<'a, 'e, 'r>, work: 'a => t<'b, 'e, 'r>): t<'a, 'e, 'r> =>
  environment =>
    IO.suspend(() =>
      IO.flatMap(fx(environment), value =>
        IO.flatMap(work(value)(environment), _ => IO.succeed(value))
      )
    )

let mapError = (fx: t<'a, 'e1, 'r>, transform: 'e1 => 'e2): t<'a, 'e2, 'r> =>
  environment => IO.suspend(() => IO.mapError(fx(environment), transform))

let access = (read: 'r => 'a): t<'a, 'e, 'r> =>
  environment => IO.suspend(() => IO.succeed(read(environment)))

let accessEffect = (next: 'r => t<'a, 'e, 'r>): t<'a, 'e, 'r> =>
  environment => IO.suspend(() => next(environment)(environment))

let provide = (fx: t<'a, 'e, 'r>, environment: 'r): IO.t<'a, 'e> =>
  IO.suspend(() => fx(environment))

let contramapEnvironment = (fx: t<'a, 'e, 'small>, project: 'large => 'small): t<'a, 'e, 'large> =>
  environment => IO.suspend(() => fx(project(environment)))
