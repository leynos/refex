/** Compiler fixture case; cases.json records acceptance or the expected diagnostic. */
let bad: Refex.Fx.t<int, string, {.."clock": int}> = _environment => Refex.IO.succeed(1)
