import { expect, test } from "bun:test";
import { identity } from "refex/src/Bootstrap.res.mjs";

test("plain JavaScript imports the provisional ESM entry point", () => {
  expect(identity("Unicode: λ, 🐈, café")).toBe("Unicode: λ, 🐈, café");
  expect(identity("")).toBe("");
});
