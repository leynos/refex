/** Compiler fixture case; cases.json records acceptance or the expected diagnostic. */
let good = (): Refex.Fx.t<int, string, {.."clock": int}> => Refex.Fx.succeed(1)
