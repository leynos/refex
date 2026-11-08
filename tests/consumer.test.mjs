/**
@file Plain JavaScript consumer test for the package exports.

It imports the committed generated ESM through the same `refex/src/...` paths
an external package consumer uses, so a broken export map or a missing
generated file fails here rather than at a consumer's install.
`scripts/package-check.mjs` exchanges this checkout for a real archive; this
suite keeps the fast in-repo signal. Building and providing the description
must run no callback; only evaluating the returned thunk may.
*/

import { expect, test } from "bun:test";
import * as Fx from "refex/src/Fx.res.mjs";
import * as IO from "refex/src/IO.res.mjs";

test("plain JavaScript imports and defers the opaque descriptions", () => {
  const calls = [];
  const describe = Fx.flatMap(
    Fx.access((services) => {
      calls.push("read");
      return services.name;
    }),
    (name) => Fx.succeed(`Hello, ${name}.`),
  );
  expect(calls).toEqual([]);
  const io = Fx.provide(describe, { name: "refex" });
  expect(calls).toEqual([]);
  expect(io()).toEqual({ TAG: "Ok", _0: "Hello, refex." });
  expect(calls).toEqual(["read"]);
  expect(IO.succeed("ok")()).toEqual({ TAG: "Ok", _0: "ok" });
});

test("plain JavaScript observes an expected failure", () => {
  expect(IO.fail("halt")()).toEqual({ TAG: "Error", _0: "halt" });
});
