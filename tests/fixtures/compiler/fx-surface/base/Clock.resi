/** Clock service type and accessor signature. */
type service = {now: unit => int}
let now: unit => Refex.Fx.t<int, 'e, {.."clock": service}>
