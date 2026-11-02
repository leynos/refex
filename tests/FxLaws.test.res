/**
@file Fx laws (OB-7).

Every law is one property with 200 runs. Each side is observed twice, so state
that leaks between evaluations fails the law. Fast-check reports the seed and
shrink path of a counterexample; replay with the same `seed` and `path`.
Inertness, model agreement, and classification live in
`FxAgreement.test.res`, split out to keep both files inside the authored-size
tolerance.
*/
open RescriptBun.Test

let law = LawSuite.law

let fixed = LawHarness.fixedEnvironment

let fxLaw = (name, make) =>
  law(name, () =>
    FastCheck.property2(FxLawModel.smallInt, LawHarness.step, (value, chosen) => {
      let (left, right) = make(value, chosen)
      LawHarness.holdsFx(~resultsOnly=false, left, right, fixed)
    })
  )

describe("Fx laws", () => {
  fxLaw("Given Fx, when flatMap follows succeed, then the continuation is the only work", (
    value,
    chosen,
  ) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(
        Fx.flatMap(Fx.succeed(value), seen => LawHarness.fxFor(chosen, seen, leftTrace)),
        leftTrace,
      ),
      LawHarness.fxTerm(Fx.suspend(() => LawHarness.fxFor(chosen, value, rightTrace)), rightTrace),
    )
  })

  fxLaw("Given Fx, when flatMap ends in succeed, then the description is unchanged", (
    value,
    chosen,
  ) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(
        Fx.flatMap(LawHarness.fxFor(chosen, value, leftTrace), Fx.succeed),
        leftTrace,
      ),
      LawHarness.fxTerm(LawHarness.fxFor(chosen, value, rightTrace), rightTrace),
    )
  })

  fxLaw("Given Fx, when flatMap nests, then associativity holds", (value, chosen) => {
    let leftTrace = []
    let rightTrace = []
    let k1 = seen => LawHarness.fxFor(chosen, seen, leftTrace)
    let k2 = seen => LawHarness.fxFor(chosen, seen, leftTrace)
    (
      LawHarness.fxTerm(
        Fx.flatMap(Fx.flatMap(LawHarness.fxFor(chosen, value, leftTrace), k1), k2),
        leftTrace,
      ),
      LawHarness.fxTerm(
        Fx.flatMap(
          LawHarness.fxFor(chosen, value, rightTrace),
          seen =>
            Fx.flatMap(
              LawHarness.fxFor(chosen, seen, rightTrace),
              nested => LawHarness.fxFor(chosen, nested, rightTrace),
            ),
        ),
        rightTrace,
      ),
    )
  })

  fxLaw("Given Fx, when flatMap follows fail, then its continuation never runs", (
    _value,
    chosen,
  ) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(
        Fx.flatMap(Fx.fail("halt"), seen => LawHarness.fxFor(chosen, seen, leftTrace)),
        leftTrace,
      ),
      LawHarness.fxTerm(Fx.fail("halt"), rightTrace),
    )
  })

  fxLaw("Given Fx, when suspend wraps a description, then evaluation is unchanged", (
    value,
    chosen,
  ) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(Fx.suspend(() => LawHarness.fxFor(chosen, value, leftTrace)), leftTrace),
      LawHarness.fxTerm(LawHarness.fxFor(chosen, value, rightTrace), rightTrace),
    )
  })

  fxLaw("Given Fx, when mapError maps with identity, then nothing changes", (value, chosen) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(
        Fx.mapError(LawHarness.fxFor(chosen, value, leftTrace), error => error),
        leftTrace,
      ),
      LawHarness.fxTerm(LawHarness.fxFor(chosen, value, rightTrace), rightTrace),
    )
  })

  fxLaw("Given Fx, when mapError nests, then composition holds", (value, chosen) => {
    let leftTrace = []
    let rightTrace = []
    let inner = error => error ++ "!"
    let outer = error => error ++ "?"
    (
      LawHarness.fxTerm(
        Fx.mapError(Fx.mapError(LawHarness.fxFor(chosen, value, leftTrace), inner), outer),
        leftTrace,
      ),
      LawHarness.fxTerm(
        Fx.mapError(LawHarness.fxFor(chosen, value, rightTrace), error => outer(inner(error))),
        rightTrace,
      ),
    )
  })

  fxLaw("Given Fx, when mapError wraps a success, then its mapper never runs", (value, _) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(
        Fx.mapError(
          Fx.succeed(value),
          error => {
            LawHarness.traced("mapped:" ++ error, leftTrace)
            error
          },
        ),
        leftTrace,
      ),
      LawHarness.fxTerm(Fx.succeed(value), rightTrace),
    )
  })

  fxLaw("Given Fx, when mapError wraps a failure, then it maps the error once", (
    _value,
    _chosen,
  ) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(Fx.mapError(Fx.fail("nope"), error => error ++ "!"), leftTrace),
      LawHarness.fxTerm(Fx.fail("nope!"), rightTrace),
    )
  })

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
          LawHarness.fxTerm(left, leftTrace),
          LawHarness.fxTerm(right, rightTrace),
          fixed,
        )
      },
    )
  )

  fxLaw("Given Fx, when map replaces flatMap, then both agree", (value, chosen) => {
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
        leftTrace,
      ),
      LawHarness.fxTerm(
        Fx.flatMap(
          LawHarness.fxFor(chosen, value, rightTrace),
          seen => {
            LawHarness.traced("map", rightTrace)
            Fx.succeed(seen + 1)
          },
        ),
        rightTrace,
      ),
    )
  })

  fxLaw("Given Fx, when map applies identity, then nothing changes", (value, chosen) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(
        Fx.map(LawHarness.fxFor(chosen, value, leftTrace), seen => seen),
        leftTrace,
      ),
      LawHarness.fxTerm(LawHarness.fxFor(chosen, value, rightTrace), rightTrace),
    )
  })

  fxLaw("Given Fx, when map nests, then composition holds", (value, chosen) => {
    let leftTrace = []
    let rightTrace = []
    let first = seen => seen + 1
    let second = seen => seen * 2
    (
      LawHarness.fxTerm(
        Fx.map(Fx.map(LawHarness.fxFor(chosen, value, leftTrace), first), second),
        leftTrace,
      ),
      LawHarness.fxTerm(
        Fx.map(LawHarness.fxFor(chosen, value, rightTrace), seen => second(first(seen))),
        rightTrace,
      ),
    )
  })

  fxLaw("Given Fx, when tap sequences work, then it equals flatMap then map", (value, chosen) => {
    let leftTrace = []
    let rightTrace = []
    (
      LawHarness.fxTerm(
        Fx.tap(Fx.succeed(value), seen => LawHarness.fxFor(chosen, seen, leftTrace)),
        leftTrace,
      ),
      LawHarness.fxTerm(
        Fx.flatMap(
          Fx.succeed(value),
          seen => Fx.map(LawHarness.fxFor(chosen, seen, rightTrace), _ => seen),
        ),
        rightTrace,
      ),
    )
  })
})
