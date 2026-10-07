open RescriptBun.Test

describe("ReScript bootstrap smoke", () => {
  test("preserves an ordinary string", () => {
    expect(Bootstrap.identity("Refex"))->Expect.toBe("Refex")
  })
  test("preserves the empty string", () => {
    expect(Bootstrap.identity(""))->Expect.toBe("")
  })
})
