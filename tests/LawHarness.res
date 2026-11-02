/** Test-only harness for the IO and Fx law suites (EP-1.2.1 EP-M4).

A law compares two descriptions at the strength it claims: results-only, or
results-and-trace. Every side is observed by evaluating the same description
twice, so state carried between evaluations is exposed (OB-2). Traces are
snapshots: each side owns its array, and the second evaluation must repeat the
first event sequence exactly.

The step generator supplies continuations built from production operations, so
the laws exercise the same constructors as ordinary callers. Permitted callers:
`tests/IoLaws.test.res`, `tests/FxLaws.test.res`,
`tests/FxAgreement.test.res`, and `tests/FxEnvironmentLaws.test.res`.
*/
type fxTerm<'r> = {
  description: Fx.t<int, string, 'r>,
  trace: array<string>,
}

type ioTerm = {description: IO.t<int, string>, trace: array<string>}

type observation = {
  first: IoEvaluation.outcome<int, string>,
  second: IoEvaluation.outcome<int, string>,
  firstTrace: array<string>,
  secondTrace: array<string>,
}

/** Records one callback invocation, so a trace measures evaluation order. */
let traced = (label: string, trace: array<string>) => {
  trace->Array.push(label)
  ()
}

/** Carries the array the description's callbacks write to, so observation
can compare event order and repeatability rather than two empty arrays. */
let fxTerm = (description: Fx.t<int, string, 'r>, trace: array<string>): fxTerm<'r> => {
  description,
  trace,
}

let ioTerm = (description: IO.t<int, string>, trace: array<string>): ioTerm => {
  description,
  trace,
}

let sameObserved = (
  left: IoEvaluation.outcome<int, string>,
  right: IoEvaluation.outcome<int, string>,
) =>
  switch (left, right) {
  | (IoEvaluation.Succeeded(a), IoEvaluation.Succeeded(b)) => a == b
  | (IoEvaluation.Failed(a), IoEvaluation.Failed(b)) => String.equal(a, b)
  | (IoEvaluation.Succeeded(_), IoEvaluation.Failed(_)) => false
  | (IoEvaluation.Failed(_), IoEvaluation.Succeeded(_)) => false
  }

let sameModelObserved = (model, observed) =>
  switch (model, observed) {
  | (FxLawModel.Succeeded(a), IoEvaluation.Succeeded(b)) => a == b
  | (FxLawModel.Failed(a), IoEvaluation.Failed(b)) => String.equal(a, b)
  | (FxLawModel.Succeeded(_), IoEvaluation.Failed(_)) => false
  | (FxLawModel.Failed(_), IoEvaluation.Succeeded(_)) => false
  }

let observeFx = (term: fxTerm<'r>, environment: 'r) => {
  let io = Fx.provide(term.description, environment)
  let first = IoEvaluation.evaluate(io)
  let firstTrace = Array.copy(term.trace)
  let second = IoEvaluation.evaluate(io)
  {first, second, firstTrace, secondTrace: Array.copy(term.trace)}
}

let observeIo = (term: ioTerm) => {
  let first = IoEvaluation.evaluate(term.description)
  let firstTrace = Array.copy(term.trace)
  let second = IoEvaluation.evaluate(term.description)
  {first, second, firstTrace, secondTrace: Array.copy(term.trace)}
}

/** The second evaluation repeats the first outcome and the first trace. */
let isRepeatable = observed =>
  sameObserved(observed.first, observed.second) &&
  FxLawModel.sameTrace(observed.secondTrace, Array.concat(observed.firstTrace, observed.firstTrace))

let holdsFx = (~resultsOnly, left, right, environment) => {
  let leftObserved = observeFx(left, environment)
  let rightObserved = observeFx(right, environment)
  let outcomesHold =
    sameObserved(leftObserved.first, rightObserved.first) &&
    isRepeatable(leftObserved) &&
    isRepeatable(rightObserved)
  let tracesHold =
    resultsOnly ||
    (FxLawModel.sameTrace(leftObserved.firstTrace, rightObserved.firstTrace) &&
    FxLawModel.sameTrace(leftObserved.secondTrace, rightObserved.secondTrace))
  outcomesHold && tracesHold
}

let holdsIo = (~resultsOnly, left, right) => {
  let leftObserved = observeIo(left)
  let rightObserved = observeIo(right)
  let outcomesHold =
    sameObserved(leftObserved.first, rightObserved.first) &&
    isRepeatable(leftObserved) &&
    isRepeatable(rightObserved)
  let tracesHold =
    resultsOnly ||
    (FxLawModel.sameTrace(leftObserved.firstTrace, rightObserved.firstTrace) &&
    FxLawModel.sameTrace(leftObserved.secondTrace, rightObserved.secondTrace))
  outcomesHold && tracesHold
}

/** A continuation descriptor; building one runs no callback. */
type step = Add(int) | FailWith(string) | SuspendAdd(int)

let step = FastCheck.oneof([
  FxLawModel.smallInt->FastCheck.map(delta => Add(delta)),
  FxLawModel.errorText->FastCheck.map(error => FailWith(error)),
  FxLawModel.smallInt->FastCheck.map(delta => SuspendAdd(delta)),
])

let fxFor = (chosen, value, trace) =>
  switch chosen {
  | Add(delta) =>
    Fx.map(Fx.succeed(value), seen => {
      trace->Array.push("map")
      seen + delta
    })
  | FailWith(error) => Fx.fail(error)
  | SuspendAdd(delta) =>
    Fx.suspend(() => {
      trace->Array.push("suspend")
      Fx.succeed(value + delta)
    })
  }

let ioFor = (chosen, value, trace) =>
  switch chosen {
  | Add(delta) =>
    IO.flatMap(IO.succeed(value), seen => {
      trace->Array.push("map")
      IO.succeed(seen + delta)
    })
  | FailWith(error) => IO.fail(error)
  | SuspendAdd(delta) =>
    IO.suspend(() => {
      trace->Array.push("suspend")
      IO.succeed(value + delta)
    })
  }

type errorMap = Suffix(string)

let errorMap = FxLawModel.errorText->FastCheck.map(suffix => Suffix(suffix))

let applyErrorMap = (mapper, error) =>
  switch mapper {
  | Suffix(suffix) => error ++ suffix
  }

let fixedEnvironment: FxLawModel.environment = {base: 0, token: "one"}
