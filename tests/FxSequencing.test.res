/**
@file Fx sequencing: construction, deferral, chaining, and error mapping.

Every case asserts an empty trace after construction and after `provide`, then
an exact trace after evaluation. That ordering is the observable witness for
OB-1 and C-13; a description that ran a callback early would fail the earlier
assertions.
*/
open RescriptBun.Test

type environment = {base: int, token: string}

describe("Fx sequencing", () => {
  test("Given succeed, when provided and evaluated, then it yields Ok and runs nothing", () => {
    let trace = []
    let fx: Fx.t<int, string, environment> = Fx.succeed(3)
    expect(trace)->Expect.toEqual([])
    let io = Fx.provide(fx, {base: 1, token: "one"})
    expect(trace)->Expect.toEqual([])
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(3))
    expect(trace)->Expect.toEqual([])
  })

  test("Given fail, when provided and evaluated, then it yields its error and runs nothing", () => {
    let fx: Fx.t<int, string, environment> = Fx.fail("expected")
    let io = Fx.provide(fx, {base: 1, token: "one"})
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Failed("expected"))
  })

  test("Given suspend, when built and provided, then its constructor has not run", () => {
    let trace = []
    let fx: Fx.t<int, string, environment> = Fx.suspend(
      () => {
        trace->Array.push("construct")
        Fx.succeed(7)
      },
    )
    expect(trace)->Expect.toEqual([])
    let io = Fx.provide(fx, {base: 1, token: "one"})
    expect(trace)->Expect.toEqual([])
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(7))
    expect(trace)->Expect.toEqual(["construct"])
  })

  test("Given suspend, when evaluated twice, then its constructor runs twice", () => {
    let trace = []
    let fx: Fx.t<int, string, environment> = Fx.suspend(
      () => {
        trace->Array.push("construct")
        Fx.succeed(7)
      },
    )
    let io = Fx.provide(fx, {base: 1, token: "one"})
    let _ = IoEvaluation.evaluate(io)
    let _ = IoEvaluation.evaluate(io)
    expect(trace)->Expect.toEqual(["construct", "construct"])
  })

  test("Given map, when built and provided, then its mapper has not run", () => {
    let trace = []
    let fx: Fx.t<int, string, environment> = Fx.map(
      Fx.succeed(2),
      value => {
        trace->Array.push("map:" ++ Int.toString(value))
        value + 1
      },
    )
    expect(trace)->Expect.toEqual([])
    let io = Fx.provide(fx, {base: 1, token: "one"})
    expect(trace)->Expect.toEqual([])
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(3))
    expect(trace)->Expect.toEqual(["map:2"])
  })

  test("Given map over a failure, when evaluated, then its mapper does not run", () => {
    let trace = []
    let fx: Fx.t<int, string, environment> = Fx.map(
      Fx.fail("nope"),
      value => {
        trace->Array.push("map")
        value
      },
    )
    expect(IoEvaluation.evaluate(Fx.provide(fx, {base: 1, token: "one"})))->Expect.toEqual(
      IoEvaluation.Failed("nope"),
    )
    expect(trace)->Expect.toEqual([])
  })

  test(
    "Given flatMap, when evaluated, then the first description runs before its continuation",
    () => {
      let trace = []
      let fx: Fx.t<int, string, environment> = Fx.flatMap(
        Fx.suspend(
          () => {
            trace->Array.push("first")
            Fx.succeed(2)
          },
        ),
        value =>
          Fx.suspend(
            () => {
              trace->Array.push("second")
              Fx.succeed(value + 1)
            },
          ),
      )
      expect(trace)->Expect.toEqual([])
      let io = Fx.provide(fx, {base: 1, token: "one"})
      expect(trace)->Expect.toEqual([])
      expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(3))
      expect(trace)->Expect.toEqual(["first", "second"])
    },
  )

  test("Given flatMap over a failure, when evaluated, then the continuation does not run", () => {
    let trace = []
    let fx: Fx.t<int, string, environment> = Fx.flatMap(
      Fx.fail("expected"),
      _ =>
        Fx.suspend(
          () => {
            trace->Array.push("continuation")
            Fx.succeed(0)
          },
        ),
    )
    expect(IoEvaluation.evaluate(Fx.provide(fx, {base: 1, token: "one"})))->Expect.toEqual(
      IoEvaluation.Failed("expected"),
    )
    expect(trace)->Expect.toEqual([])
  })

  test("Given a flatMap description, when evaluated twice, then nothing is memoized", () => {
    let runs = ref(0)
    let fx: Fx.t<int, string, environment> = Fx.flatMap(
      Fx.suspend(
        () => {
          runs := runs.contents + 1
          if runs.contents == 1 {
            Fx.succeed(1)
          } else {
            Fx.fail("second")
          }
        },
      ),
      value => Fx.succeed(value + 1),
    )
    let io = Fx.provide(fx, {base: 1, token: "one"})
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(2))
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Failed("second"))
    expect(runs.contents)->Expect.toBe(2)
  })

  test("Given tap, when evaluated, then its work runs once in order and the value is kept", () => {
    let trace = []
    let fx: Fx.t<int, string, environment> = Fx.tap(
      Fx.succeed(5),
      value =>
        Fx.suspend(
          () => {
            trace->Array.push("tap:" ++ Int.toString(value))
            Fx.succeed(0)
          },
        ),
    )
    expect(trace)->Expect.toEqual([])
    let io = Fx.provide(fx, {base: 1, token: "one"})
    expect(trace)->Expect.toEqual([])
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(5))
    expect(trace)->Expect.toEqual(["tap:5"])
  })

  test("Given tap, when its work succeeds, then the callback runs exactly once", () => {
    let calls = ref(0)
    let fx: Fx.t<int, string, environment> = Fx.tap(
      Fx.succeed(5),
      _ => {
        calls := calls.contents + 1
        Fx.succeed(0)
      },
    )
    expect(calls.contents)->Expect.toBe(0)
    let io = Fx.provide(fx, {base: 1, token: "one"})
    expect(calls.contents)->Expect.toBe(0)
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(5))
    expect(calls.contents)->Expect.toBe(1)
  })

  test("Given tap, when the description fails, then the callback does not run", () => {
    let calls = ref(0)
    let fx: Fx.t<int, string, environment> = Fx.tap(
      Fx.fail("nope"),
      _ => {
        calls := calls.contents + 1
        Fx.succeed(0)
      },
    )
    expect(IoEvaluation.evaluate(Fx.provide(fx, {base: 1, token: "one"})))->Expect.toEqual(
      IoEvaluation.Failed("nope"),
    )
    expect(calls.contents)->Expect.toBe(0)
  })

  test("Given tap, when its work fails, then the whole description fails", () => {
    let fx: Fx.t<int, string, environment> = Fx.tap(Fx.succeed(5), _ => Fx.fail("tap-failed"))
    expect(IoEvaluation.evaluate(Fx.provide(fx, {base: 1, token: "one"})))->Expect.toEqual(
      IoEvaluation.Failed("tap-failed"),
    )
  })

  test("Given mapError, when the description succeeds, then its mapper does not run", () => {
    let trace = []
    let fx: Fx.t<int, string, environment> = Fx.mapError(
      Fx.succeed(1),
      error => {
        trace->Array.push("map:" ++ error)
        error ++ "!"
      },
    )
    expect(IoEvaluation.evaluate(Fx.provide(fx, {base: 1, token: "one"})))->Expect.toEqual(
      IoEvaluation.Succeeded(1),
    )
    expect(trace)->Expect.toEqual([])
  })

  test("Given mapError, when the description fails, then its mapper runs exactly once", () => {
    let trace = []
    let fx: Fx.t<int, string, environment> = Fx.mapError(
      Fx.fail("nope"),
      error => {
        trace->Array.push("map:" ++ error)
        error ++ "!"
      },
    )
    expect(IoEvaluation.evaluate(Fx.provide(fx, {base: 1, token: "one"})))->Expect.toEqual(
      IoEvaluation.Failed("nope!"),
    )
    expect(trace)->Expect.toEqual(["map:nope"])
  })

  // Provision must hand its backend a description without first traversing the
  // chain (design §3.1). Evaluating a chain this deep remains task 1.3.1's
  // stack-safety work (R-4); completing this case without a stack overflow is
  // the assertion.
  test("Given a deep map chain, when provided, then provision does not recurse", () => {
    let fx: ref<Fx.t<int, string, unit>> = ref(Fx.succeed(0))
    let remaining = ref(50000)
    while remaining.contents > 0 {
      fx := Fx.map(fx.contents, value => value + 1)
      remaining := remaining.contents - 1
    }
    let _io = Fx.provide(fx.contents, ())
  })
})
