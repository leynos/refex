/** Compiler fixture case; cases.json records acceptance or the expected diagnostic. */
let workflow: Refex.Fx.t<int, string, {.."clock": int}> = Refex.Fx.succeed(1)
let good: Refex.IO.t<int, string> = Refex.Fx.provide(workflow, {"clock": 1})
