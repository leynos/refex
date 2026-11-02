/** Shared model and arbitraries for the IO and Fx law suites (EP-1.2.1 EP-M4).

The defunctionalized syntax `expr` maps one-to-one onto the production
operations, so `build` produces the real description and `denote` an
independent executable model. Generated descriptions are bounded at depth four.
Every callback records a label in a trace, so the model and production are
compared on outcome and exact ordering. Constructors carry positional payloads:
ReScript 12.3.1 rejects inlined record payloads when the constructor is used in
a generated lambda, reporting that the anonymous type would escape.

Permitted callers: `tests/LawHarness.res`, `tests/IoLaws.test.res`,
`tests/FxLaws.test.res`, and `tests/FxEnvironmentLaws.test.res`. This is test
code only; nothing here is packaged.
*/
type environment = {base: int, token: string}

type outcome = Succeeded(int) | Failed(string)

type rec expr =
  | Succeed(int)
  | Fail(string)
  | Suspend(expr)
  | Map(expr, int, string)
  | FlatMap(expr, cont)
  | Tap(expr, cont)
  | MapError(expr, string, string)
  | Access(int, string)
  | AccessEffect(cont)
  | Project(expr, int, string)
and cont =
  | Const(expr)
  | Branch(expr, expr)
  | AddThen(int)

let sameOutcome = (left, right) =>
  switch (left, right) {
  | (Succeeded(a), Succeeded(b)) => a == b
  | (Failed(a), Failed(b)) => String.equal(a, b)
  | (Succeeded(_), Failed(_)) => false
  | (Failed(_), Succeeded(_)) => false
  }

let sameTrace = (left, right) => Array.equal(left, right, String.equal)

/** Applies a continuation body to a value, as the production callback would. */
let applyCont = (continuation, value) =>
  switch continuation {
  | Const(body) => body
  | Branch(even, odd) => value / 2 * 2 == value ? even : odd
  | AddThen(delta) => Succeed(value + delta)
  }

/** Builds the production description for one model expression. */
let rec build = (expr, trace: array<string>): Fx.t<int, string, environment> =>
  switch expr {
  | Succeed(value) => Fx.succeed(value)
  | Fail(error) => Fx.fail(error)
  | Suspend(inner) =>
    Fx.suspend(() => {
      trace->Array.push("suspend")
      build(inner, trace)
    })
  | Map(inner, delta, label) =>
    Fx.map(build(inner, trace), value => {
      trace->Array.push(label)
      value + delta
    })
  | FlatMap(inner, next) =>
    Fx.flatMap(build(inner, trace), value => build(applyCont(next, value), trace))
  | Tap(inner, work) => Fx.tap(build(inner, trace), value => build(applyCont(work, value), trace))
  | MapError(inner, suffix, label) =>
    Fx.mapError(build(inner, trace), error => {
      trace->Array.push(label)
      error ++ suffix
    })
  | Access(scale, label) =>
    Fx.access(environment => {
      trace->Array.push(label)
      environment.base + scale
    })
  | AccessEffect(next) =>
    Fx.accessEffect(environment => build(applyCont(next, environment.base), trace))
  | Project(inner, offset, label) =>
    Fx.contramapEnvironment(build(inner, trace), environment => {
      trace->Array.push(label)
      {base: environment.base + offset, token: environment.token}
    })
  }

let rec eval = (expr, environment, trace: array<string>): outcome =>
  switch expr {
  | Succeed(value) => Succeeded(value)
  | Fail(error) => Failed(error)
  | Suspend(inner) =>
    trace->Array.push("suspend")
    eval(inner, environment, trace)
  | Map(inner, delta, label) =>
    switch eval(inner, environment, trace) {
    | Succeeded(value) =>
      trace->Array.push(label)
      Succeeded(value + delta)
    | Failed(error) => Failed(error)
    }
  | FlatMap(inner, next) =>
    switch eval(inner, environment, trace) {
    | Succeeded(value) => eval(applyCont(next, value), environment, trace)
    | Failed(error) => Failed(error)
    }
  | Tap(inner, work) =>
    switch eval(inner, environment, trace) {
    | Succeeded(original) =>
      switch eval(applyCont(work, original), environment, trace) {
      | Succeeded(_) => Succeeded(original)
      | Failed(error) => Failed(error)
      }
    | Failed(error) => Failed(error)
    }
  | MapError(inner, suffix, label) =>
    switch eval(inner, environment, trace) {
    | Succeeded(value) => Succeeded(value)
    | Failed(error) =>
      trace->Array.push(label)
      Failed(error ++ suffix)
    }
  | Access(scale, label) =>
    trace->Array.push(label)
    Succeeded(environment.base + scale)
  | AccessEffect(next) => eval(applyCont(next, environment.base), environment, trace)
  | Project(inner, offset, label) =>
    trace->Array.push(label)
    eval(inner, {base: environment.base + offset, token: environment.token}, trace)
  }

/** Evaluates the executable model, returning its outcome and trace. */
let denote = (expr, environment): (outcome, array<string>) => {
  let trace = []
  let outcome = eval(expr, environment, trace)
  (outcome, trace)
}

/** The largest number of nested expression layers in a description. */
let rec exprDepth = expr =>
  switch expr {
  | Succeed(_) | Fail(_) | Access(_, _) => 1
  | Suspend(inner) | Map(inner, _, _) | MapError(inner, _, _) | Project(inner, _, _) =>
    1 + exprDepth(inner)
  | FlatMap(inner, next) => 1 + largest(exprDepth(inner), contDepth(next))
  | Tap(inner, work) => 1 + largest(exprDepth(inner), contDepth(work))
  | AccessEffect(next) => 1 + contDepth(next)
  }

and contDepth = continuation =>
  switch continuation {
  | Const(body) => exprDepth(body)
  | Branch(even, odd) => largest(exprDepth(even), exprDepth(odd))
  | AddThen(_) => 0
  }

and largest = (left, right) => left > right ? left : right

/** Every expression constructor name used in a description. */
let rec constructorNames = expr =>
  switch expr {
  | Succeed(_) => ["Succeed"]
  | Fail(_) => ["Fail"]
  | Suspend(inner) => ["Suspend", ...constructorNames(inner)]
  | Map(inner, _, _) => ["Map", ...constructorNames(inner)]
  | FlatMap(inner, next) => ["FlatMap", ...constructorNames(inner), ...contNames(next)]
  | Tap(inner, work) => ["Tap", ...constructorNames(inner), ...contNames(work)]
  | MapError(inner, _, _) => ["MapError", ...constructorNames(inner)]
  | Access(_, _) => ["Access"]
  | AccessEffect(next) => ["AccessEffect", ...contNames(next)]
  | Project(inner, _, _) => ["Project", ...constructorNames(inner)]
  }

and contNames = continuation =>
  switch continuation {
  | Const(body) => constructorNames(body)
  | Branch(even, odd) => [...constructorNames(even), ...constructorNames(odd)]
  | AddThen(_) => []
  }

let allConstructors = [
  "Succeed",
  "Fail",
  "Suspend",
  "Map",
  "FlatMap",
  "Tap",
  "MapError",
  "Access",
  "AccessEffect",
  "Project",
]

let smallInt = FastCheck.int(~constraints={min: -3, max: 3})
let label = FastCheck.constantFrom(["a", "b", "c"])
let errorText = FastCheck.constantFrom(["boom", "nope", "halt"])
let token = FastCheck.constantFrom(["one", "two"])

let leaf = () =>
  FastCheck.oneof([
    smallInt->FastCheck.map(value => Succeed(value)),
    errorText->FastCheck.map(error => Fail(error)),
  ])

/**
Weights a constructor alternative three times against the single leaf
alternative. An unweighted `oneof` left Tap, Project, FlatMap, and MapError
below the 30 per cent presence threshold at depth four, because a leaf ends a
branch early while every constructor defers to another layer.
*/
let frequent = (arbitrary: FastCheck.arbitrary<'a>): array<FastCheck.arbitrary<'a>> => [
  arbitrary,
  arbitrary,
  arbitrary,
]

// Every recursive constructor spends one layer, so generated descriptions stay
// bounded at depth four while every constructor remains reachable.
let rec exprAt = depth =>
  depth <= 0
    ? leaf()
    : {
        let inner = exprAt(depth - 1)
        let continuation = contAt(depth - 1)
        FastCheck.oneof(
          Belt.Array.concatMany([
            [leaf()],
            frequent(inner->FastCheck.map(inner => Suspend(inner))),
            frequent(
              FastCheck.tuple3(inner, smallInt, label)->FastCheck.map(((
                inner,
                delta,
                label,
              )) => Map(inner, delta, label)),
            ),
            frequent(
              FastCheck.tuple2(inner, continuation)->FastCheck.map(((inner, next)) => FlatMap(
                inner,
                next,
              )),
            ),
            frequent(
              FastCheck.tuple2(inner, continuation)->FastCheck.map(((inner, work)) => Tap(
                inner,
                work,
              )),
            ),
            frequent(
              FastCheck.tuple3(inner, errorText, label)->FastCheck.map(((
                inner,
                suffix,
                label,
              )) => MapError(inner, suffix, label)),
            ),
            frequent(
              FastCheck.tuple2(smallInt, label)->FastCheck.map(((scale, label)) => Access(
                scale,
                label,
              )),
            ),
            frequent(continuation->FastCheck.map(next => AccessEffect(next))),
            frequent(
              FastCheck.tuple3(inner, smallInt, label)->FastCheck.map(((
                inner,
                offset,
                label,
              )) => Project(inner, offset, label)),
            ),
          ]),
        )
      }

and contAt = depth =>
  depth <= 0
    ? FastCheck.oneof([
        exprAt(0)->FastCheck.map(body => Const(body)),
        smallInt->FastCheck.map(delta => AddThen(delta)),
      ])
    : {
        let body = exprAt(depth - 1)
        FastCheck.oneof([
          body->FastCheck.map(body => Const(body)),
          FastCheck.tuple2(body, exprAt(depth - 1))->FastCheck.map(((even, odd)) => Branch(
            even,
            odd,
          )),
          smallInt->FastCheck.map(delta => AddThen(delta)),
        ])
      }

let expr = exprAt(4)
let cont = contAt(3)

let environment = FastCheck.tuple2(smallInt, token)->FastCheck.map(((base, token)) => {base, token})
