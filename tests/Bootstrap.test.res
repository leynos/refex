/**
Behavioural smoke test for the bootstrap probe.

It opens the Bun test bindings, which are visible only to dev sources, and
proves the ReScript test toolchain compiles and executes. It is not a spec for
`Bootstrap.identity`; that function is disposable.
*/
open RescriptBun.Test

describe("ReScript bootstrap smoke", () => {
  test("preserves an ordinary string", () => {
    expect(Bootstrap.identity("Refex"))->Expect.toBe("Refex")
  })
  test("preserves the empty string", () => {
    expect(Bootstrap.identity(""))->Expect.toBe("")
  })
})
