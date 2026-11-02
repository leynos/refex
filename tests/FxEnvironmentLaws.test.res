/**
@file Fx environment laws on generated continuations (OB-7 and OB-8).

Every law is one property with 200 runs. Each side is observed twice, so state
that leaks between evaluations fails the law. Fast-check reports the seed and
shrink path of a counterexample; replay with the same `seed` and `path`.
Projection laws state whether the projection is pure, because a traced
projection would run a different number of times on each side. This suite is
split from `FxLaws.test.res` to keep both files inside the authored-size
tolerance.
*/
open RescriptBun.Test

type base = {base: int}

type large = {base: int, token: string, offset: int}

let law = LawSuite.law

let fixed = LawHarness.fixedEnvironment

describe("Fx environment laws", () => {
  law("Given Fx, when access is provided, then it reads once per evaluation", () =>
    FastCheck.property2(
      FxLawModel.environment,
      FxLawModel.smallInt,
      (environment, value) => {
        let leftTrace = []
        let rightTrace = []
        let read = (seen: FxLawModel.environment, trace) => {
          LawHarness.traced("read", trace)
          seen.base + value
        }
        let left = Fx.provide(Fx.access(seen => read(seen, leftTrace)), environment)
        let right = IO.suspend(() => IO.succeed(read(environment, rightTrace)))
        LawHarness.holdsIo(
          ~resultsOnly=false,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )

  law("Given Fx, when accessEffect is provided, then it equals access then provide", () =>
    FastCheck.property2(
      FxLawModel.environment,
      FxLawModel.smallInt,
      (environment, value) => {
        let leftTrace = []
        let rightTrace = []
        let run = (seen: FxLawModel.environment, trace) => {
          LawHarness.traced("effect", trace)
          LawHarness.fxFor(LawHarness.SuspendAdd(value), seen.base, trace)
        }
        let left = Fx.provide(Fx.accessEffect(seen => run(seen, leftTrace)), environment)
        // Defer the body so construction records no trace event; the harness
        // observes each evaluation from an empty trace.
        let right = Fx.provide(Fx.suspend(() => run(environment, rightTrace)), environment)
        LawHarness.holdsIo(
          ~resultsOnly=true,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )

  law("Given Fx, when accessEffect returns a read, then it equals access", () =>
    FastCheck.property2(
      FxLawModel.environment,
      FxLawModel.smallInt,
      (environment, value) => {
        let leftTrace = []
        let rightTrace = []
        let read = (seen: FxLawModel.environment, trace) => {
          LawHarness.traced("read", trace)
          seen.base + value
        }
        let left = LawHarness.fxTerm(
          Fx.accessEffect(seen => Fx.succeed(read(seen, leftTrace))),
          leftTrace,
        )
        let right = LawHarness.fxTerm(Fx.access(seen => read(seen, rightTrace)), rightTrace)
        LawHarness.holdsFx(~resultsOnly=false, left, right, environment)
      },
    )
  )

  law("Given Fx, when accessEffect ignores its environment, then it equals the body", () =>
    FastCheck.property2(
      FxLawModel.environment,
      LawHarness.step,
      (environment, chosen) => {
        let leftTrace = []
        let rightTrace = []
        let left = LawHarness.fxTerm(
          Fx.accessEffect(_ => LawHarness.fxFor(chosen, 1, leftTrace)),
          leftTrace,
        )
        let right = LawHarness.fxTerm(LawHarness.fxFor(chosen, 1, rightTrace), rightTrace)
        LawHarness.holdsFx(~resultsOnly=false, left, right, environment)
      },
    )
  )

  law("Given Fx, when the environment is projected identically, then nothing changes", () =>
    FastCheck.property3(
      FxLawModel.smallInt,
      FxLawModel.smallInt,
      LawHarness.step,
      (base, offset, chosen) => {
        let leftTrace = []
        let rightTrace = []
        let left = LawHarness.fxTerm(
          Fx.contramapEnvironment(
            LawHarness.fxFor(chosen, base, leftTrace),
            (environment: base) => environment,
          ),
          leftTrace,
        )
        let right = LawHarness.fxTerm(LawHarness.fxFor(chosen, base, rightTrace), rightTrace)
        LawHarness.holdsFx(~resultsOnly=false, left, right, {base: base + offset})
      },
    )
  )

  law("Given Fx, when projections nest, then they compose", () =>
    FastCheck.property3(
      FxLawModel.smallInt,
      FxLawModel.smallInt,
      LawHarness.step,
      (base, offset, chosen) => {
        let leftTrace = []
        let rightTrace = []
        let inner = (environment: FxLawModel.environment): base => {
          base: environment.base + offset,
        }
        let outer = (environment: large): FxLawModel.environment => {
          base: environment.base + environment.offset,
          token: environment.token,
        }
        let left = LawHarness.fxTerm(
          Fx.contramapEnvironment(
            Fx.contramapEnvironment(LawHarness.fxFor(chosen, base, leftTrace), inner),
            outer,
          ),
          leftTrace,
        )
        let right = LawHarness.fxTerm(
          Fx.contramapEnvironment(
            LawHarness.fxFor(chosen, base, rightTrace),
            seen => inner(outer(seen)),
          ),
          rightTrace,
        )
        LawHarness.holdsFx(~resultsOnly=false, left, right, {base, token: "one", offset})
      },
    )
  )

  law("Given Fx, when a projected description is provided, then provision commutes", () =>
    FastCheck.property3(
      FxLawModel.smallInt,
      FxLawModel.smallInt,
      LawHarness.step,
      (base, offset, chosen) => {
        let leftTrace = []
        let rightTrace = []
        let project = (environment: large): base => {
          base: environment.base + environment.offset,
        }
        let environment = {base, token: "one", offset}
        let left = Fx.provide(
          Fx.contramapEnvironment(LawHarness.fxFor(chosen, base, leftTrace), project),
          environment,
        )
        let right = IO.suspend(
          () => Fx.provide(LawHarness.fxFor(chosen, base, rightTrace), project(environment)),
        )
        LawHarness.holdsIo(
          ~resultsOnly=false,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )

  law("Given Fx, when a projection wraps access, then the read composes", () =>
    FastCheck.property3(
      FxLawModel.smallInt,
      FxLawModel.smallInt,
      FxLawModel.smallInt,
      (base, offset, value) => {
        let project = (environment: large): base => {
          base: environment.base + environment.offset,
        }
        let read = (environment: base) => environment.base + value
        let environment = {base, token: "one", offset}
        let left = LawHarness.fxTerm(Fx.contramapEnvironment(Fx.access(read), project), [])
        let right = LawHarness.fxTerm(Fx.access(seen => read(project(seen))), [])
        LawHarness.holdsFx(~resultsOnly=true, left, right, environment)
      },
    )
  )

  law("Given Fx, when a pure projection meets sequencing, then it distributes", () =>
    FastCheck.property2(
      FxLawModel.smallInt,
      LawHarness.step,
      (base, chosen) => {
        let leftTrace = []
        let rightTrace = []
        let project = (environment: large): base => {
          base: environment.base + environment.offset,
        }
        let left = LawHarness.fxTerm(
          Fx.contramapEnvironment(
            Fx.flatMap(
              LawHarness.fxFor(chosen, base, leftTrace),
              seen => LawHarness.fxFor(chosen, seen, leftTrace),
            ),
            project,
          ),
          leftTrace,
        )
        let right = LawHarness.fxTerm(
          Fx.flatMap(
            Fx.contramapEnvironment(LawHarness.fxFor(chosen, base, rightTrace), project),
            seen => Fx.contramapEnvironment(LawHarness.fxFor(chosen, seen, rightTrace), project),
          ),
          rightTrace,
        )
        LawHarness.holdsFx(~resultsOnly=true, left, right, {base, token: "one", offset: 2})
      },
    )
  )

  law("Given Fx, when provision meets sequencing, then it distributes", () =>
    FastCheck.property2(
      FxLawModel.smallInt,
      LawHarness.step,
      (value, chosen) => {
        let leftTrace = []
        let rightTrace = []
        let left = Fx.provide(
          Fx.flatMap(
            LawHarness.fxFor(chosen, value, leftTrace),
            seen => LawHarness.fxFor(chosen, seen, leftTrace),
          ),
          fixed,
        )
        let right = IO.flatMap(
          Fx.provide(LawHarness.fxFor(chosen, value, rightTrace), fixed),
          seen => Fx.provide(LawHarness.fxFor(chosen, seen, rightTrace), fixed),
        )
        LawHarness.holdsIo(
          ~resultsOnly=false,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )
})
