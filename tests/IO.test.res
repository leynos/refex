/**
Behavioural specification for the opaque `IO` description.

Each case records events in a local trace and asserts the same three moments:
after construction, after a description is built, and after evaluation. A
description that runs work early, caches an outcome, or skips a continuation
fails the exact trace rather than a loose final value.

Given/When/Then names make the failing step obvious in the runner output.
*/
open RescriptBun.Test

describe("IO", () => {
  test("Given succeed, when evaluated, then it yields Ok and runs nothing", () => {
    let trace = []
    let io = IO.succeed(42)
    expect(trace)->Expect.toEqual([])
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(42))
    expect(trace)->Expect.toEqual([])
  })

  test("Given fail, when evaluated, then it yields Error and runs nothing", () => {
    let io = IO.fail("expected")
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Failed("expected"))
  })

  test("Given suspend, when built, then its constructor has not run", () => {
    let trace = []
    let io = IO.suspend(
      () => {
        trace->Array.push("construct")
        IO.succeed(7)
      },
    )
    expect(trace)->Expect.toEqual([])
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(7))
    expect(trace)->Expect.toEqual(["construct"])
  })

  test("Given suspend, when evaluated twice, then its constructor runs twice", () => {
    let trace = []
    let io = IO.suspend(
      () => {
        trace->Array.push("construct")
        IO.succeed(7)
      },
    )
    let _ = IoEvaluation.evaluate(io)
    let _ = IoEvaluation.evaluate(io)
    expect(trace)->Expect.toEqual(["construct", "construct"])
  })

  test(
    "Given flatMap, when evaluated, then the first description runs before its continuation",
    () => {
      let trace = []
      let io = IO.flatMap(
        IO.suspend(
          () => {
            trace->Array.push("first")
            IO.succeed(2)
          },
        ),
        value =>
          IO.suspend(
            () => {
              trace->Array.push("second")
              IO.succeed(value + 1)
            },
          ),
      )
      expect(trace)->Expect.toEqual([])
      expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(3))
      expect(trace)->Expect.toEqual(["first", "second"])
    },
  )

  test("Given flatMap over a failure, when evaluated, then the continuation does not run", () => {
    let trace = []
    let io = IO.flatMap(
      IO.fail("expected"),
      _ =>
        IO.suspend(
          () => {
            trace->Array.push("continuation")
            IO.succeed(0)
          },
        ),
    )
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Failed("expected"))
    expect(trace)->Expect.toEqual([])
  })

  test("Given a flatMap description, when evaluated twice, then nothing is memoized", () => {
    let runs = ref(0)
    let io = IO.flatMap(
      IO.suspend(
        () => {
          runs := runs.contents + 1
          if runs.contents == 1 {
            IO.succeed(1)
          } else {
            IO.fail("second")
          }
        },
      ),
      value => IO.succeed(value + 1),
    )
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(2))
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Failed("second"))
    expect(runs.contents)->Expect.toBe(2)
  })

  test("Given mapError, when the description succeeds, then its mapper does not run", () => {
    let trace = []
    let io = IO.mapError(
      IO.succeed(1),
      error => {
        trace->Array.push("map:" ++ error)
        error ++ "!"
      },
    )
    expect(trace)->Expect.toEqual([])
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(1))
    expect(trace)->Expect.toEqual([])
  })

  test("Given mapError, when the description fails, then its mapper runs exactly once", () => {
    let trace = []
    let io = IO.mapError(
      IO.fail("nope"),
      error => {
        trace->Array.push("map:" ++ error)
        error ++ "!"
      },
    )
    expect(trace)->Expect.toEqual([])
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Failed("nope!"))
    expect(trace)->Expect.toEqual(["map:nope"])
  })
})
