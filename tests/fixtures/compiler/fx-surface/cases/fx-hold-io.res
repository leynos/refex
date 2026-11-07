/** Compiler fixture case; cases.json records acceptance or the expected diagnostic. */
let io: Refex.IO.t<int, string> = Refex.IO.succeed(1)
let good = io
