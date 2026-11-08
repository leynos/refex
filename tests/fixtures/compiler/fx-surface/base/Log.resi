/** Log service type and accessor signature. */
type service = {write: string => unit}
let write: string => Refex.Fx.t<unit, 'e, {.."log": service}>
