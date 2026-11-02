type service = {now: unit => int}
let now = () => Refex.Fx.access(environment => environment["clock"].now())
