/** Evaluates the composed workflow and projection with concrete services. */
let io: Refex.IO.t<int, AppError.t> = Workflow.diagnosed()->Refex.Fx.provide({
  "clock": {Clock.now: () => 42},
  "log": {Log.write: _ => ()},
  "extra": 1,
})

let projected: Refex.IO.t<int, string> = Projection.projected->Refex.Fx.provide({
  small: {count: 7},
  label: "extra",
})
