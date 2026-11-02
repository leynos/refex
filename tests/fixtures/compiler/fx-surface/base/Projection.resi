type small = {count: int}
type large = {small: small, label: string}
let count: Refex.Fx.t<int, string, small>
let projected: Refex.Fx.t<int, string, large>
