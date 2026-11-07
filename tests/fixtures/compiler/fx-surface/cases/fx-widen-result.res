/** Fixture pair: widening an error without a cast is rejected; the cast is accepted. */
type narrow = ClockError.t
type wide = WideError.t
type narrowFx = Refex.Fx.t<int, narrow, {"clock": int}>
type wideFx = Refex.Fx.t<int, wide, {"clock": int}>
type narrowResult = result<int, narrow>
type wideResult = result<int, wide>
let good = (Ok(1): narrowResult :> wideResult)
