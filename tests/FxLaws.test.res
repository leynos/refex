/**
@file Fx laws, inertness, and model agreement (OB-1, OB-7 to OB-9).

Every law is one property with 200 runs. Each side is observed twice, so state
that leaks between evaluations fails the law. Fast-check reports the seed and
shrink path of a counterexample; replay with the same `seed` and `path`.
*/
open RescriptBun.Test

let law = LawSuite.law

let fixed = LawHarness.fixedEnvironment

let fxLaw = (name, make) =>
  law(name, () =>
    FastCheck.property2(FxLawModel.smallInt, LawHarness.step, (value, chosen) => {
      let (left, right) = make(value, chosen, [])
      LawHarness.holdsFx(~resultsOnly=false, left, right, fixed)
    })
  )

describe("Fx laws", () => {
  fxLaw("Given Fx, when flatMap follows succeed, then the continuation is the only work", (
    value,
    chosen,
    _,
  ) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(
        Fx.flatMap(Fx.succeed(value), seen => LawHarness.fxFor(chosen, seen, leftTrace)),
      ),
      LawHarness.fxTerm(Fx.suspend(() => LawHarness.fxFor(chosen, value, rightTrace))),
    )
  })

  fxLaw("Given Fx, when flatMap ends in succeed, then the description is unchanged", (
    value,
    chosen,
    _,
  ) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(Fx.flatMap(LawHarness.fxFor(chosen, value, leftTrace), Fx.succeed)),
      LawHarness.fxTerm(LawHarness.fxFor(chosen, value, rightTrace)),
    )
  })

  fxLaw("Given Fx, when flatMap nests, then associativity holds", (value, chosen, _) => {
    let leftTrace = []
    let rightTrace = []
    let k1 = seen => LawHarness.fxFor(chosen, seen, leftTrace)
    let k2 = seen => LawHarness.fxFor(chosen, seen, leftTrace)
    (
      LawHarness.fxTerm(Fx.flatMap(Fx.flatMap(LawHarness.fxFor(chosen, value, leftTrace), k1), k2)),
      LawHarness.fxTerm(
        Fx.flatMap(LawHarness.fxFor(chosen, value, rightTrace), seen => Fx.flatMap(k1(seen), k2)),
      ),
    )
  })

  fxLaw("Given Fx, when flatMap follows fail, then its continuation never runs", (
    _value,
    chosen,
    _,
  ) => {
    let leftTrace = []
    (
      LawHarness.fxTerm(
        Fx.flatMap(Fx.fail("halt"), seen => LawHarness.fxFor(chosen, seen, leftTrace)),
      ),
      LawHarness.fxTerm(Fx.fail("halt")),
    )
  })

  fxLaw("Given Fx, when suspend wraps a description, then evaluation is unchanged", (
    value,
    chosen,
    _,
  ) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(Fx.suspend(() => LawHarness.fxFor(chosen, value, leftTrace))),
      LawHarness.fxTerm(LawHarness.fxFor(chosen, value, rightTrace)),
    )
  })

  fxLaw("Given Fx, when mapError maps with identity, then nothing changes", (value, chosen, _) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(Fx.mapError(LawHarness.fxFor(chosen, value, leftTrace), error => error)),
      LawHarness.fxTerm(LawHarness.fxFor(chosen, value, rightTrace)),
    )
  })

  fxLaw("Given Fx, when mapError nests, then composition holds", (value, chosen, _) => {
    let leftTrace = []
    let rightTrace = []
    let inner = error => error ++ "!"
    let outer = error => error ++ "?"
    (
      LawHarness.fxTerm(
        Fx.mapError(Fx.mapError(LawHarness.fxFor(chosen, value, leftTrace), inner), outer),
      ),
      LawHarness.fxTerm(
        Fx.mapError(LawHarness.fxFor(chosen, value, rightTrace), error => outer(inner(error))),
      ),
    )
  })

  fxLaw("Given Fx, when mapError wraps a success, then its mapper never runs", (value, _, _) => {
    let leftTrace = []
    (
      LawHarness.fxTerm(
        Fx.mapError(
          Fx.succeed(value),
          error => {
            LawHarness.traced("mapped:" ++ error, leftTrace)
            error
          },
        ),
      ),
      LawHarness.fxTerm(Fx.succeed(value)),
    )
  })

  fxLaw("Given Fx, when mapError wraps a failure, then it maps the error once", (_, _, _) => (
    LawHarness.fxTerm(Fx.mapError(Fx.fail("nope"), error => error ++ "!")),
    LawHarness.fxTerm(Fx.fail("nope!")),
  ))

  law("Given Fx, when mapError meets flatMap, then it distributes", () =>
    FastCheck.property2(
      FxLawModel.smallInt,
      LawHarness.step,
      (value, chosen) => {
        let leftTrace = []
        let rightTrace = []
        let map = error => error ++ "?"
        let left = Fx.mapError(
          Fx.flatMap(
            LawHarness.fxFor(chosen, value, leftTrace),
            seen => LawHarness.fxFor(chosen, seen, leftTrace),
          ),
          map,
        )
        let right = Fx.flatMap(
          Fx.mapError(LawHarness.fxFor(chosen, value, rightTrace), map),
          seen => Fx.mapError(LawHarness.fxFor(chosen, seen, rightTrace), map),
        )
        LawHarness.holdsFx(
          ~resultsOnly=true,
          LawHarness.fxTerm(left),
          LawHarness.fxTerm(right),
          fixed,
        )
      },
    )
  )

  fxLaw("Given Fx, when map replaces flatMap, then both agree", (value, chosen, _) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(
        Fx.map(
          LawHarness.fxFor(chosen, value, leftTrace),
          seen => {
            LawHarness.traced("map", leftTrace)
            seen + 1
          },
        ),
      ),
      LawHarness.fxTerm(
        Fx.flatMap(
          LawHarness.fxFor(chosen, value, rightTrace),
          seen => {
            LawHarness.traced("map", rightTrace)
            Fx.succeed(seen + 1)
          },
        ),
      ),
    )
  })

  fxLaw("Given Fx, when map applies identity, then nothing changes", (value, chosen, _) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(Fx.map(LawHarness.fxFor(chosen, value, leftTrace), seen => seen)),
      LawHarness.fxTerm(LawHarness.fxFor(chosen, value, rightTrace)),
    )
  })

  fxLaw("Given Fx, when map nests, then composition holds", (value, chosen, _) => {
    let leftTrace = []
    let rightTrace = []
    let first = seen => seen + 1
    let second = seen => seen * 2
    (
      LawHarness.fxTerm(Fx.map(Fx.map(LawHarness.fxFor(chosen, value, leftTrace), first), second)),
      LawHarness.fxTerm(
        Fx.map(LawHarness.fxFor(chosen, value, rightTrace), seen => second(first(seen))),
      ),
    )
  })

  fxLaw("Given Fx, when tap sequences work, then it equals flatMap then map", (
    value,
    chosen,
    _,
  ) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(
        Fx.tap(Fx.succeed(value), seen => LawHarness.fxFor(chosen, seen, leftTrace)),
      ),
      LawHarness.fxTerm(
        Fx.flatMap(
          Fx.succeed(value),
          seen => Fx.map(LawHarness.fxFor(chosen, seen, rightTrace), _ => seen),
        ),
      ),
    )
  })
})

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
      let present = name =>
        count(expression =>
          FxLawModel.constructorNames(expression)->Array.some(found => String.equal(found, name))
        )
      let threshold = ratio => Int.toFloat(total) *. ratio
      expect(Int.toFloat(successes))->Expect.toBeGreaterThanOrEqual(threshold(0.2))
      expect(Int.toFloat(failures))->Expect.toBeGreaterThanOrEqual(threshold(0.2))
      expect(Int.toFloat(deep))->Expect.toBeGreaterThanOrEqual(threshold(0.05))
      FxLawModel.allConstructors->Array.forEach(name =>
        expect(Int.toFloat(present(name)))->Expect.toBeGreaterThanOrEqual(threshold(0.3))
      )
    },
    ~options=Timeout(30000.0),
  )
})
