/** Fixture pair: calling an IO.t is a type error; binding it is accepted. */
let io: Refex.IO.t<int, string> = Refex.IO.succeed(1)
let bad = io()
