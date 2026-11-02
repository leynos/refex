/**
@file Exact public-interface contracts for the packaged `src/*.resi` files.

`src/` is reachable by consumers whatever `public` says (ADR 008), so the
exported item set is the real boundary. This suite runs `rescript-tools doc`
on each interface and compares the exported names, kinds, and signatures with
an expected table, which makes an added, removed, or widened export fail here
rather than at a consumer.

The table is private to this suite: it records refex's current surface, not a
reusable model. A negative control proves the comparison can reject an extra
item.
*/

import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";

// One entry per interface, in declaration order.
const expectedSurface = {
  "src/IO.resi": [
    ["t", "type", "type t<+'a, 'e>"],
    ["succeed", "value", "let succeed: 'a => t<'a, 'e>"],
    ["fail", "value", "let fail: 'e => t<'a, 'e>"],
    ["suspend", "value", "let suspend: (unit => t<'a, 'e>) => t<'a, 'e>"],
    [
      "flatMap",
      "value",
      "let flatMap: (t<'a, 'e>, 'a => t<'b, 'e>) => t<'b, 'e>",
    ],
    [
      "mapError",
      "value",
      "let mapError: (t<'a, 'e1>, 'e1 => 'e2) => t<'a, 'e2>",
    ],
  ],
  "src/Fx.resi": [
    ["t", "type", "type t<+'a, 'e, -'r>"],
    ["succeed", "value", "let succeed: 'a => t<'a, 'e, 'r>"],
    ["fail", "value", "let fail: 'e => t<'a, 'e, 'r>"],
    [
      "suspend",
      "value",
      "let suspend: (unit => t<'a, 'e, 'r>) => t<'a, 'e, 'r>",
    ],
    ["map", "value", "let map: (t<'a, 'e, 'r>, 'a => 'b) => t<'b, 'e, 'r>"],
    [
      "flatMap",
      "value",
      "let flatMap: (t<'a, 'e, 'r>, 'a => t<'b, 'e, 'r>) => t<'b, 'e, 'r>",
    ],
    [
      "tap",
      "value",
      "let tap: (t<'a, 'e, 'r>, 'a => t<'b, 'e, 'r>) => t<'a, 'e, 'r>",
    ],
    [
      "mapError",
      "value",
      "let mapError: (t<'a, 'e1, 'r>, 'e1 => 'e2) => t<'a, 'e2, 'r>",
    ],
    ["access", "value", "let access: ('r => 'a) => t<'a, 'e, 'r>"],
    [
      "accessEffect",
      "value",
      "let accessEffect: ('r => t<'a, 'e, 'r>) => t<'a, 'e, 'r>",
    ],
    [
      "provide",
      "value",
      "let provide: (t<'a, 'e, 'r>, 'r) => Refex.IO.t<'a, 'e>",
    ],
    [
      "contramapEnvironment",
      "value",
      "let contramapEnvironment: (t<'a, 'e, 'small>, 'large => 'small) => t<'a, 'e, 'large>",
    ],
  ],
};

// Compares the exported name, kind, and signature of every item. Throws
// naming the first difference so an unexpected export is easy to locate.
function assertSurface(actual, expected) {
  const projected = actual.map((item) => [
    item.name,
    item.kind,
    item.signature,
  ]);
  if (JSON.stringify(projected) !== JSON.stringify(expected)) {
    throw new Error(
      `exported surface differs\nexpected: ${JSON.stringify(expected)}\nactual:   ${JSON.stringify(projected)}`,
    );
  }
}

function documentedSurface(file) {
  const result = Bun.spawnSync([
    process.execPath,
    "run",
    "--bun",
    "rescript-tools",
    "doc",
    file,
  ]);
  if (result.exitCode !== 0) {
    throw new Error(
      `rescript-tools doc ${file} failed: ${result.stdout}${result.stderr}`,
    );
  }
  return JSON.parse(result.stdout.toString()).items;
}

describe("public interface contracts", () => {
  test("every src interface has an expected surface and no other exists", () => {
    const interfaces = readdirSync("src")
      .filter((name) => name.endsWith(".resi"))
      .map((name) => `src/${name}`)
      .sort();
    expect(interfaces).toEqual(Object.keys(expectedSurface).sort());
  });

  for (const [file, expected] of Object.entries(expectedSurface)) {
    test(`${file} exports exactly its declared surface`, () => {
      assertSurface(documentedSurface(file), expected);
    });
  }

  test("an extra exported item is rejected", () => {
    const doctored = [
      ...expectedSurface["src/IO.resi"],
      ["unsafeRun", "value", "let unsafeRun: t<'a, 'e> => result<'a, 'e>"],
    ];
    expect(() =>
      assertSurface(
        doctored.map(([name, kind, signature]) => ({ name, kind, signature })),
        expectedSurface["src/IO.resi"],
      ),
    ).toThrow();
  });
});
