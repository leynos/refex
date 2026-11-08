/** Fixture pair: calling an Fx.t is a type error; providing it is accepted. */
let workflow: Refex.Fx.t<int, string, {.."clock": int}> = Refex.Fx.succeed(1)
let bad = workflow({"clock": 1})
