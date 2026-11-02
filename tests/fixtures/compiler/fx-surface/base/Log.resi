type service = {write: string => unit}
let write: string => Refex.Fx.t<unit, 'e, {.."log": service}>
