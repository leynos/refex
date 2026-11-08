/**
@file Fx inertness, model agreement, and classification (OB-1, OB-9).

Split from `FxLaws.test.res` to keep both files inside the plan's 350-line
authored-size tolerance. Fast-check reports the seed and shrink path of a
counterexample; replay with the same `seed` and `path`.
*/
open RescriptBun.Test

let law = LawSuite.law

let fixed = LawHarness.fixedEnvironment

/**
Named regressions from developing the agreement property and from ablations
A-3b (`flatMap` evaluates its first description twice), A-4 (`mapError` calls
its mapper twice), and A-7 (`tap` ignores its work). Each passed once the
production was restored, and each fails if its defect returns.
*/
let agreementExamples: array<(FxLawModel.expr, FxLawModel.environment)> = [
  // Development: traced tap, projection, and mapError callbacks exposed the
  // cumulative second trace snapshot in the test harness.
  (
    FxLawModel.Tap(
      FxLawModel.Suspend(FxLawModel.Project(FxLawModel.Map(FxLawModel.Succeed(0), 0, "a"), 0, "a")),
      FxLawModel.Branch(
        FxLawModel.Project(FxLawModel.MapError(FxLawModel.Succeed(0), "boom", "a"), 0, "a"),
        FxLawModel.MapError(FxLawModel.Suspend(FxLawModel.Succeed(0)), "boom", "a"),
      ),
    ),
    {base: 0, token: "one"},
  ),
  // A-3b.
  (
    FxLawModel.FlatMap(
      FxLawModel.Project(FxLawModel.Map(FxLawModel.Suspend(FxLawModel.Succeed(0)), 0, "a"), 0, "a"),
      FxLawModel.Const(
        FxLawModel.MapError(FxLawModel.Project(FxLawModel.Succeed(0), 0, "a"), "boom", "a"),
      ),
    ),
    {base: 0, token: "one"},
  ),
  // A-4.
  (
    FxLawModel.MapError(
      FxLawModel.MapError(
        FxLawModel.FlatMap(
          FxLawModel.Map(FxLawModel.Fail("boom"), 0, "a"),
          FxLawModel.Branch(FxLawModel.Succeed(0), FxLawModel.Fail("boom")),
        ),
        "boom",
        "a",
      ),
      "boom",
      "a",
    ),
    {base: 0, token: "one"},
  ),
  // A-7.
  (
    FxLawModel.Tap(
      FxLawModel.Access(0, "a"),
      FxLawModel.Const(FxLawModel.Suspend(FxLawModel.Access(0, "a"))),
    ),
    {base: 0, token: "one"},
  ),
]

describe("Fx properties", () => {
  law("Given any description, when built and provided, then no callback runs", () =>
    FastCheck.property2(
      FxLawModel.expr,
      FxLawModel.environment,
      (expression, environment) => {
        let trace = []
        let description = FxLawModel.build(expression, trace)
        Array.length(trace) == 0 && {
            let _io = Fx.provide(description, environment)
            Array.length(trace) == 0
          }
      },
    )
  )

  law(
    ~examples=agreementExamples,
    "Given any description, when evaluated, then the production agrees with the model",
    () =>
      FastCheck.property2(
        FxLawModel.expr,
        FxLawModel.environment,
        (expression, environment) => {
          let trace = []
          let io = Fx.provide(FxLawModel.build(expression, trace), environment)
          let first = IoEvaluation.evaluate(io)
          let firstTrace = Array.copy(trace)
          let second = IoEvaluation.evaluate(io)
          let secondTrace = Array.copy(trace)
          let (modelFirst, modelFirstTrace) = FxLawModel.denote(expression, environment)
          let (modelSecond, modelSecondTrace) = FxLawModel.denote(expression, environment)
          // The production trace is one array shared by both evaluations, so the
          // second snapshot holds the first run's events followed by the second's.
          LawHarness.sameModelObserved(modelFirst, first) &&
          LawHarness.sameModelObserved(modelSecond, second) &&
          LawHarness.sameObserved(first, second) &&
          FxLawModel.sameTrace(firstTrace, modelFirstTrace) &&
          FxLawModel.sameTrace(secondTrace, Array.concat(firstTrace, modelSecondTrace))
        },
      ),
  )

  test(
    "Given a pinned seed, when sampling descriptions, then the classification thresholds hold",
    () => {
      let samples = FastCheck.sample(FxLawModel.expr, ~parameters={numRuns: 1000, seed: 20261102})
      let total = Array.length(samples)
      let count = predicate =>
        samples->Array.reduce(0, (hits, sample) => predicate(sample) ? hits + 1 : hits)
      let successes = count(expression =>
        switch FxLawModel.denote(expression, fixed)->Pair.first {
        | FxLawModel.Succeeded(_) => true
        | FxLawModel.Failed(_) => false
        }
      )
      let failures = total - successes
      let deep = count(expression => FxLawModel.exprDepth(expression) >= 4)
      let overDeep = count(expression => FxLawModel.exprDepth(expression) > 4)
      let present = name =>
        count(expression =>
          FxLawModel.constructorNames(expression)->Array.some(found => String.equal(found, name))
        )
      let threshold = ratio => Int.toFloat(total) *. ratio
      expect(Int.toFloat(successes))->Expect.toBeGreaterThanOrEqual(threshold(0.2))
      expect(Int.toFloat(failures))->Expect.toBeGreaterThanOrEqual(threshold(0.2))
      expect(Int.toFloat(deep))->Expect.toBeGreaterThanOrEqual(threshold(0.05))
      // Reachability alone would accept a generator that exceeded its stated
      // bound, so enforce the upper bound as well.
      expect(overDeep)->Expect.toEqual(0)
      FxLawModel.allConstructors->Array.forEach(name =>
        expect(Int.toFloat(present(name)))->Expect.toBeGreaterThanOrEqual(threshold(0.3))
      )
    },
    ~options=Timeout(30000.0),
  )
})
