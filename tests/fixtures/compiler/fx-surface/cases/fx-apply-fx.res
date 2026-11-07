/** Compiler fixture case; cases.json records acceptance or the expected diagnostic. */
let workflow: Refex.Fx.t<int, string, {.."clock": int}> = Refex.Fx.succeed(1)
let bad = workflow({"clock": 1})
