/** Fixture pair: forging an Fx.t from a function is rejected; building it is accepted. */
let good = (): Refex.Fx.t<int, string, {.."clock": int}> => Refex.Fx.succeed(1)
