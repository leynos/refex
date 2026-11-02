let stamp: unit => Refex.Fx.t<int, 'e, {.."clock": Clock.service, "log": Log.service}>

let diagnosed: unit => Refex.Fx.t<int, AppError.t, {.."clock": Clock.service, "log": Log.service}>

let announce: unit => Refex.Fx.t<unit, 'e, {.."clock": Clock.service, "log": Log.service}>
