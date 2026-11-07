/** Fixture pair: dropping an environment requirement is rejected; adding one is accepted. */
type clock = {"clock": int}
type both = {"clock": int, "log": int}
type clockFx = Refex.Fx.t<int, string, clock>
type bothFx = Refex.Fx.t<int, string, both>
let bad: clockFx = (Refex.Fx.succeed(1): bothFx :> clockFx)
