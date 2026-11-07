/** Widened error type that includes the clock failure. */
type t = | ...ClockError.t | Other
