type small = {count: int}
type large = {small: small, label: string}
let count = Refex.Fx.access(environment => environment.count)
let projected = Refex.Fx.contramapEnvironment(count, environment => environment.small)
