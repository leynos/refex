/** Fixture pair: forging an Fx.t from a function is rejected; building it is accepted. */
let bad: Refex.Fx.t<int, string, {.."clock": int}> = _environment => Refex.IO.succeed(1)
