/** Clock service accessor: reads the clock from the environment. */
type service = {now: unit => int}
let now = () => Refex.Fx.access(environment => environment["clock"].now())
