let stamp = () =>
  Clock.now()
  ->Refex.Fx.tap(time => Log.write("tick " ++ Int.toString(time)))
  ->Refex.Fx.map(time => time)

let diagnosed = () =>
  Clock.now()
  ->Refex.Fx.mapError(error => AppError.ClockFailed(error))
  ->Refex.Fx.flatMap(time =>
    Log.write(Int.toString(time))
    ->Refex.Fx.mapError(_ => AppError.LogFailed(LogError.Full))
    ->Refex.Fx.map(_ => time)
  )

let announce = () =>
  Refex.Fx.accessEffect(environment =>
    Log.write("clock " ++ Int.toString(environment["clock"].Clock.now()))
  )
