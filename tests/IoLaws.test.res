/**
@file IO laws on generated continuations (OB-6).

Each law is one property over a generated value and continuation descriptor.
Both sides defer their continuation, so a trace comparison measures evaluation
rather than test construction. Each side is observed twice inside the harness,
which exposes anything memoized between evaluations. Fast-check reports the
seed and shrink path of a counterexample; replay with the same `seed` and
`path`.
*/
open RescriptBun.Test

let law = LawSuite.law

describe("IO laws", () => {
  law("Given IO, when flatMap follows succeed, then the continuation is the only work", () =>
    FastCheck.property2(
      FxLawModel.smallInt,
      LawHarness.step,
      (value, chosen) => {
        let leftTrace = []
        let rightTrace = []
        let left = IO.flatMap(IO.succeed(value), seen => LawHarness.ioFor(chosen, seen, leftTrace))
        let right = IO.suspend(() => LawHarness.ioFor(chosen, value, rightTrace))
        LawHarness.holdsIo(
          ~resultsOnly=false,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )

  law("Given IO, when flatMap ends in succeed, then the description is unchanged", () =>
    FastCheck.property2(
      FxLawModel.smallInt,
      LawHarness.step,
      (value, chosen) => {
        let leftTrace = []
        let rightTrace = []
        let left = IO.flatMap(LawHarness.ioFor(chosen, value, leftTrace), IO.succeed)
        let right = LawHarness.ioFor(chosen, value, rightTrace)
        LawHarness.holdsIo(
          ~resultsOnly=false,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )

  law("Given IO, when flatMap nests, then associativity holds", () =>
    FastCheck.property3(
      FxLawModel.smallInt,
      LawHarness.step,
      LawHarness.step,
      (value, first, second) => {
        let leftTrace = []
        let rightTrace = []
        let k1 = seen => LawHarness.ioFor(first, seen, leftTrace)
        let k2 = seen => LawHarness.ioFor(second, seen, leftTrace)
        let left = IO.flatMap(IO.flatMap(LawHarness.ioFor(first, value, leftTrace), k1), k2)
        let right = IO.flatMap(
          LawHarness.ioFor(first, value, rightTrace),
          seen =>
            IO.flatMap(
              LawHarness.ioFor(first, seen, rightTrace),
              nested => LawHarness.ioFor(second, nested, rightTrace),
            ),
        )
        LawHarness.holdsIo(
          ~resultsOnly=false,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )

  law("Given IO, when flatMap follows fail, then its continuation never runs", () =>
    FastCheck.property2(
      FxLawModel.errorText,
      LawHarness.step,
      (error, chosen) => {
        let leftTrace = []
        let rightTrace = []
        let left = IO.flatMap(IO.fail(error), seen => LawHarness.ioFor(chosen, seen, leftTrace))
        let right = IO.fail(error)
        LawHarness.holdsIo(
          ~resultsOnly=false,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )

  law("Given IO, when suspend wraps a description, then evaluation is unchanged", () =>
    FastCheck.property2(
      FxLawModel.smallInt,
      LawHarness.step,
      (value, chosen) => {
        let leftTrace = []
        let rightTrace = []
        let left = IO.suspend(() => LawHarness.ioFor(chosen, value, leftTrace))
        let right = LawHarness.ioFor(chosen, value, rightTrace)
        LawHarness.holdsIo(
          ~resultsOnly=false,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )

  law("Given IO, when mapError maps with identity, then nothing changes", () =>
    FastCheck.property2(
      FxLawModel.smallInt,
      LawHarness.step,
      (value, chosen) => {
        let leftTrace = []
        let rightTrace = []
        let left = IO.mapError(LawHarness.ioFor(chosen, value, leftTrace), error => error)
        let right = LawHarness.ioFor(chosen, value, rightTrace)
        LawHarness.holdsIo(
          ~resultsOnly=false,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )

  law("Given IO, when mapError nests, then composition holds", () =>
    FastCheck.property3(
      FxLawModel.smallInt,
      LawHarness.step,
      LawHarness.errorMap,
      (value, chosen, mapper) => {
        let leftTrace = []
        let rightTrace = []
        let outer = error => LawHarness.applyErrorMap(mapper, error)
        let inner = error => error ++ "!"
        let left = IO.mapError(
          IO.mapError(LawHarness.ioFor(chosen, value, leftTrace), inner),
          outer,
        )
        let right = IO.mapError(
          LawHarness.ioFor(chosen, value, rightTrace),
          error => outer(inner(error)),
        )
        LawHarness.holdsIo(
          ~resultsOnly=false,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )

  law("Given IO, when mapError wraps a success, then its mapper never runs", () =>
    FastCheck.property2(
      FxLawModel.smallInt,
      LawHarness.errorMap,
      (value, mapper) => {
        let leftTrace = []
        let rightTrace = []
        let left = IO.mapError(
          IO.succeed(value),
          error => {
            leftTrace->Array.push("mapped:" ++ error)
            LawHarness.applyErrorMap(mapper, error)
          },
        )
        let right = IO.succeed(value)
        LawHarness.holdsIo(
          ~resultsOnly=false,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )

  law("Given IO, when mapError wraps a failure, then it maps the error once", () =>
    FastCheck.property2(
      FxLawModel.errorText,
      LawHarness.errorMap,
      (error, mapper) =>
        LawHarness.holdsIo(
          ~resultsOnly=true,
          LawHarness.ioTerm(
            IO.mapError(IO.fail(error), mapped => LawHarness.applyErrorMap(mapper, mapped)),
            [],
          ),
          LawHarness.ioTerm(IO.fail(LawHarness.applyErrorMap(mapper, error)), []),
        ),
    )
  )

  law("Given IO, when mapError meets flatMap, then it distributes", () =>
    FastCheck.property3(
      FxLawModel.smallInt,
      LawHarness.step,
      LawHarness.errorMap,
      (value, chosen, mapper) => {
        let leftTrace = []
        let rightTrace = []
        let map = error => LawHarness.applyErrorMap(mapper, error)
        let left = IO.mapError(
          IO.flatMap(
            LawHarness.ioFor(chosen, value, leftTrace),
            seen => LawHarness.ioFor(chosen, seen, leftTrace),
          ),
          map,
        )
        let right = IO.flatMap(
          IO.mapError(LawHarness.ioFor(chosen, value, rightTrace), map),
          seen => IO.mapError(LawHarness.ioFor(chosen, seen, rightTrace), map),
        )
        LawHarness.holdsIo(
          ~resultsOnly=true,
          LawHarness.ioTerm(left, leftTrace),
          LawHarness.ioTerm(right, rightTrace),
        )
      },
    )
  )
})
