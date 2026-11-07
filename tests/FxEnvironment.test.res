/**
@file Fx environment: access, projection, and live observation.

Every case asserts an empty trace after construction and after `provide`, then
an exact trace after evaluation. That ordering is the observable witness for
OB-1 and C-13; a description that reached its environment early would fail the
earlier assertions.
*/
open RescriptBun.Test

type environment = {base: int, token: string}

type counter = {mutable count: int, token: string}

type live = {mutable value: int}

type small = {mutable count: int}

type large = {small: small, label: string}

describe("Fx environment", () => {
  test("Given access, when built and provided, then its reader has not run", () => {
    let trace = []
    let fx: Fx.t<int, string, environment> = Fx.access(
      environment => {
        trace->Array.push("read")
        environment.base
      },
    )
    expect(trace)->Expect.toEqual([])
    let io = Fx.provide(fx, {base: 4, token: "one"})
    expect(trace)->Expect.toEqual([])
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(4))
    expect(trace)->Expect.toEqual(["read"])
  })

  test("Given access, when evaluated twice, then its reader runs once per evaluation", () => {
    let reads = ref(0)
    let fx: Fx.t<int, string, environment> = Fx.access(
      environment => {
        reads := reads.contents + 1
        environment.base
      },
    )
    let io = Fx.provide(fx, {base: 4, token: "one"})
    let _ = IoEvaluation.evaluate(io)
    let _ = IoEvaluation.evaluate(io)
    expect(reads.contents)->Expect.toBe(2)
  })

  test("Given accessEffect, when evaluated, then its result runs in the same environment", () => {
    let fx: Fx.t<int, string, counter> = Fx.accessEffect(
      (seen: counter) =>
        Fx.access(
          (inner: counter) => {
            inner.count = inner.count + 1
            seen.count
          },
        ),
    )
    let environment = {count: 0, token: "one"}
    let io = Fx.provide(fx, environment)
    expect(environment.count)->Expect.toBe(0)
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(1))
    expect(environment.count)->Expect.toBe(1)
  })

  test(
    "Given accessEffect under a projection, when evaluated twice, then it sees the projected environment",
    () => {
      let project = (environment: large): small => environment.small
      let fx: Fx.t<int, string, large> = Fx.contramapEnvironment(
        Fx.accessEffect(
          (seen: small) =>
            Fx.access(
              (inner: small) => {
                inner.count = inner.count + 1
                seen.count
              },
            ),
        ),
        project,
      )
      let environment = {small: {count: 0}, label: "large"}
      let io = Fx.provide(fx, environment)
      expect(environment.small.count)->Expect.toBe(0)
      expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(1))
      expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(2))
      expect(environment.small.count)->Expect.toBe(2)
    },
  )

  test(
    "Given contramapEnvironment, when built and provided, then its projection has not run",
    () => {
      let trace = []
      let fx: Fx.t<int, string, large> = Fx.contramapEnvironment(
        Fx.access((environment: small) => environment.count),
        environment => {
          trace->Array.push("project")
          environment.small
        },
      )
      expect(trace)->Expect.toEqual([])
      let io = Fx.provide(fx, {small: {count: 3}, label: "large"})
      expect(trace)->Expect.toEqual([])
      expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(3))
      expect(trace)->Expect.toEqual(["project"])
    },
  )

  test(
    "Given contramapEnvironment, when evaluated twice, then its projection runs once per evaluation",
    () => {
      let projections = ref(0)
      let fx: Fx.t<int, string, large> = Fx.contramapEnvironment(
        Fx.access((environment: small) => environment.count),
        environment => {
          projections := projections.contents + 1
          environment.small
        },
      )
      let io = Fx.provide(fx, {small: {count: 3}, label: "large"})
      let _ = IoEvaluation.evaluate(io)
      let _ = IoEvaluation.evaluate(io)
      expect(projections.contents)->Expect.toBe(2)
    },
  )

  test("Given a write between reads, when evaluated, then the second read observes it", () => {
    let trace = []
    let fx: Fx.t<int, string, live> = Fx.flatMap(
      Fx.tap(
        Fx.access(
          environment => {
            trace->Array.push("read:" ++ Int.toString(environment.value))
            environment.value
          },
        ),
        _ =>
          Fx.access(
            environment => {
              trace->Array.push("write")
              environment.value = environment.value + 1
              0
            },
          ),
      ),
      first =>
        Fx.map(
          Fx.access(
            environment => {
              trace->Array.push("read:" ++ Int.toString(environment.value))
              environment.value
            },
          ),
          second => first * 10 + second,
        ),
    )
    let io = Fx.provide(fx, {value: 1})
    expect(trace)->Expect.toEqual([])
    expect(IoEvaluation.evaluate(io))->Expect.toEqual(IoEvaluation.Succeeded(12))
    expect(trace)->Expect.toEqual(["read:1", "write", "read:2"])
  })

  test(
    "Given one description, when provided to two environments, then each yields its own value",
    () => {
      let fx: Fx.t<int, string, environment> = Fx.access(environment => environment.base)
      expect(IoEvaluation.evaluate(Fx.provide(fx, {base: 1, token: "one"})))->Expect.toEqual(
        IoEvaluation.Succeeded(1),
      )
      expect(IoEvaluation.evaluate(Fx.provide(fx, {base: 2, token: "two"})))->Expect.toEqual(
        IoEvaluation.Succeeded(2),
      )
    },
  )
})
