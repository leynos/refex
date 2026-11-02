/**
@file Unit tests for the compiler-fixture matcher and escape scan.

Owns the negative controls for `support/compiler-fixture-matching.mjs`: a
wrong file, a wrong line, a missing fragment, an added warning block, and two
error blocks must each reject; a seeded `Obj.magic`, a bare `:>`, and the
`fx-add-requirement` source without its exemption must each be flagged. The
captured diagnostics use the real ReScript 12.3.1 text shapes, including ANSI
colour, so the parser is exercised on what the compiler actually prints.
*/

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  differsByOneLine,
  matchesExpectation,
  parseDiagnostics,
  scanForCasts,
} from "./support/compiler-fixture-matching.mjs";

const ESC = "\u001b";
const RED = `${ESC}[1;31m`;
const CYAN = `${ESC}[36m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;

const errorBlock = `
  ${RED}We've found a bug for you!${RESET}
  ${CYAN}/tmp/refex-fixtures-probe/src/Case.res${RESET}:${DIM}2:11-12${RESET}

  1 ${DIM}│${RESET} let io: Refex.IO.t<int, string> = Refex.IO.succeed(1)
  2 ${DIM}│${RESET} let bad = io()
  3 ${DIM}│${RESET}

  This can't be called, it's not a function.
  The function has type: \\"IO-Refex".t<int, string>
`;

const warningBlock = `
  ${RED}Warning number 44${RESET} (configured as error)
  ${CYAN}/tmp/refex-fixtures-probe/src/GuideSnippets.res${RESET}:${DIM}1:1-10${RESET}

  1 ${DIM}│${RESET} open Refex

  this open statement shadows the module identifier Fx (which is later used)
`;

const syntaxBlock = `
  ${RED}Syntax error!${RESET}
  ${CYAN}/tmp/refex-fixtures-probe/src/Case.res${RESET}:${DIM}2:14${RESET}

  1 ${DIM}│${RESET} let io: Refex.IO.t<int, string> = Refex.IO.succeed(1)
  2 ${DIM}│${RESET} let bad = io(]
  3 ${DIM}│${RESET}

  I'm not sure what to parse here when looking at "]".
`;

const errorExpectation = {
  file: "Case.res",
  line: 2,
  fragments: [
    "This can't be called, it's not a function.",
    "The function has type:",
  ],
};

const fixture = (path) =>
  readFileSync(`tests/fixtures/compiler/fx-surface/${path}`, "utf8");

describe("parseDiagnostics", () => {
  test("splits every header kind and strips ANSI and line breaks", () => {
    const diagnostics = parseDiagnostics(
      `${errorBlock}${warningBlock}${syntaxBlock}`,
    );
    expect(diagnostics.map(({ kind }) => kind)).toEqual([
      "error",
      "warning",
      "syntax",
    ]);
    expect(diagnostics.map(({ file }) => file)).toEqual([
      "Case.res",
      "GuideSnippets.res",
      "Case.res",
    ]);
    expect(diagnostics.map(({ line }) => line)).toEqual([2, 1, 2]);
    for (const diagnostic of diagnostics) {
      expect(diagnostic.text).not.toContain(ESC);
      expect(diagnostic.text).not.toContain("\n");
    }
    expect(diagnostics[0].text).toContain(
      "This can't be called, it's not a function. The function has type:",
    );
  });

  test("ignores build prologue and keeps the trailing summary", () => {
    const diagnostics = parseDiagnostics(
      `Cleaned 0/24\nParsed 1 source files\nCompiled 1 modules\n${errorBlock}\nIncremental build failed. Error:   Failed to Compile. See Errors Above\n`,
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].text).toContain("Incremental build failed.");
  });
});

describe("matchesExpectation", () => {
  test("accepts the captured error shape", () => {
    expect(
      matchesExpectation(parseDiagnostics(errorBlock), errorExpectation),
    ).toBe(true);
  });

  test("rejects a wrong file", () => {
    expect(
      matchesExpectation(parseDiagnostics(errorBlock), {
        ...errorExpectation,
        file: "Other.res",
      }),
    ).toBe(false);
  });

  test("rejects a wrong line", () => {
    expect(
      matchesExpectation(parseDiagnostics(errorBlock), {
        ...errorExpectation,
        line: 3,
      }),
    ).toBe(false);
  });

  test("rejects a missing fragment", () => {
    expect(
      matchesExpectation(parseDiagnostics(errorBlock), {
        ...errorExpectation,
        fragments: [...errorExpectation.fragments, "not present"],
      }),
    ).toBe(false);
  });

  test("rejects an added warning block", () => {
    expect(
      matchesExpectation(
        parseDiagnostics(`${warningBlock}${errorBlock}`),
        errorExpectation,
      ),
    ).toBe(false);
  });

  test("rejects two error blocks", () => {
    expect(
      matchesExpectation(
        parseDiagnostics(`${errorBlock}${errorBlock}`),
        errorExpectation,
      ),
    ).toBe(false);
  });

  test("rejects a syntax error that keeps the same file and line", () => {
    expect(
      matchesExpectation(parseDiagnostics(syntaxBlock), errorExpectation),
    ).toBe(false);
  });

  test("rejects a syntax error carrying the expected fragments", () => {
    const disguised = syntaxBlock.replace(
      'I\'m not sure what to parse here when looking at "]".',
      "This can't be called, it's not a function. The function has type:",
    );
    expect(
      matchesExpectation(parseDiagnostics(disguised), errorExpectation),
    ).toBe(false);
  });

  test("rejects a promoted warning carrying the expected fragments", () => {
    const disguised = warningBlock
      .replace("GuideSnippets.res", "Case.res")
      .replace(":1:1-10", ":2:14")
      .replace(
        "this open statement shadows the module identifier Fx (which is later used)",
        "This can't be called, it's not a function. The function has type:",
      );
    expect(
      matchesExpectation(parseDiagnostics(disguised), errorExpectation),
    ).toBe(false);
  });
});

describe("scanForCasts", () => {
  test("flags each seeded escape", () => {
    const kinds = (source) => scanForCasts(source).map(({ kind }) => kind);
    expect(kinds("let bad = Obj.magic(value)")).toEqual(["Obj.magic"]);
    expect(kinds("let bad = (value :> other)")).toEqual([":>"]);
    expect(kinds("let bad = %identity")).toEqual(["%identity"]);
    expect(kinds("let bad = %raw(`value`)")).toEqual(["%raw"]);
    expect(kinds('external bad: int => int = "bad"')).toEqual(["external"]);
  });

  test("reports the line and text of a bare coercion", () => {
    const findings = scanForCasts("let a = 1\nlet b = (x :> y)\n");
    expect(
      findings.map(({ kind, line, text }) => ({ kind, line, text })),
    ).toEqual([{ kind: ":>", line: 2, text: "let b = (x :> y)" }]);
  });

  test("accepts a source with no escape", () => {
    expect(scanForCasts("let good = 1\n")).toEqual([]);
  });

  test("flags the fx-add-requirement variance witness", () => {
    expect(
      scanForCasts(fixture("cases/fx-add-requirement.res")).map(
        ({ kind, line }) => ({ kind, line }),
      ),
    ).toEqual([{ kind: ":>", line: 5 }]);
  });

  test("flags the fx-widen-result result coercion", () => {
    expect(
      scanForCasts(fixture("cases/fx-widen-result.res")).map(
        ({ kind, line }) => ({ kind, line }),
      ),
    ).toEqual([{ kind: ":>", line: 7 }]);
  });

  test("only the two declared variance witnesses carry an exemption", () => {
    const metadata = JSON.parse(fixture("cases.json"));
    expect(
      metadata.cases
        .filter((entry) => entry.castScanExemption)
        .map(({ id, castScanExemption: { kind, line, reason } }) => ({
          id,
          kind,
          line,
          hasReason: reason.length > 0,
        })),
    ).toEqual([
      { id: "fx-add-requirement", kind: ":>", line: 5, hasReason: true },
      { id: "fx-widen-result", kind: ":>", line: 7, hasReason: true },
    ]);
  });
});

describe("differsByOneLine", () => {
  test("accepts exactly one differing line", () => {
    expect(differsByOneLine("a\nb\n", "a\nc\n")).toBe(true);
  });

  test("rejects identical sources", () => {
    expect(differsByOneLine("a\nb\n", "a\nb\n")).toBe(false);
  });

  test("rejects two differing lines", () => {
    expect(differsByOneLine("a\nb\n", "c\nd\n")).toBe(false);
  });

  test("rejects a different line count", () => {
    expect(differsByOneLine("a\nb\n", "a\nb\nc\n")).toBe(false);
  });

  test("accepts the real fx-apply-io control pair", () => {
    expect(
      differsByOneLine(
        fixture("cases/fx-apply-io.res"),
        fixture("cases/fx-hold-io.res"),
      ),
    ).toBe(true);
  });
});
