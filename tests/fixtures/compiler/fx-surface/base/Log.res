/** Log service accessor: writes a message through the environment. */
type service = {write: string => unit}
let write = message => Refex.Fx.access(environment => environment["log"].write(message))
