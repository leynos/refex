type clock = {"clock": int}
type both = {"clock": int, "log": int}
type clockFx = Refex.Fx.t<int, string, clock>
type bothFx = Refex.Fx.t<int, string, both>
let good: bothFx = (Refex.Fx.succeed(1): clockFx :> bothFx)
