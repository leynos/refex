/**
JavaScript consumer test for the package export.

It imports the committed generated ESM through the same `refex/src/...` path an
external package consumer uses, so a broken export map or a missing generated
file fails here rather than at a consumer's install. `scripts/package-check.mjs`
exchanges this checkout for a real archive; this suite keeps the fast in-repo
signal.
*/

import { expect, test } from "bun:test";
import { identity } from "refex/src/Bootstrap.res.mjs";

test("plain JavaScript imports the provisional ESM entry point", () => {
  expect(identity("Unicode: λ, 🐈, café")).toBe("Unicode: λ, 🐈, café");
  expect(identity("")).toBe("");
});
