/** Test-only registration for one law suite property (EP-1.2.1 EP-M4).

Every law runs the same fixed number of generated cases under the same Bun
timeout, so a regression in one suite cannot be hidden by a different budget in
another. The helper is split from the model and harness so the environment law
suite can live in its own file without copying this policy.

Permitted callers: `tests/IoLaws.test.res`, `tests/FxLaws.test.res`,
`tests/FxAgreement.test.res`, and `tests/FxEnvironmentLaws.test.res`. This is
test code only; nothing here is packaged.
*/
let law = (~examples=?, name, makeProperty) =>
  RescriptBun.Test.test(
    name,
    () => FastCheck.check(makeProperty(), ~parameters={numRuns: 200, ?examples}),
    ~options=RescriptBun.Test.Timeout(30000.0),
  )
