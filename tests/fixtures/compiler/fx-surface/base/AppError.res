/** Combined clock and log failures for the fixture workflow. */
type t = ClockFailed(ClockError.t) | LogFailed(LogError.t)
