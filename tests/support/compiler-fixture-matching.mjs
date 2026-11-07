/**
@file Compiler-fixture matching and escape scanning for the fx-surface suite.

Owns the translation of ReScript 12.3.1 build output into diagnostics, the
exact match a negative fixture must satisfy, the syntactic cast scan for
accepted sources, and the one-line-control comparison. Permitted callers are
exactly `tests/compiler-fixtures.test.mjs` and
`tests/compiler-fixture-matching.test.mjs`. This is not a generic test
framework: it registers no plugin, discovers no files, and runs no build. See
`docs/developers-guide.md`, "Compiler fixtures", before extracting anything
here.
*/

import { basename } from "node:path";

// ANSI SGR and erase sequences emitted by the compiler's coloured output.
// The escape is built at runtime so the linter's control-character rule sees
// no literal control character in a regular expression.
const ESCAPE = String.fromCharCode(27);
const ANSI = new RegExp(`${ESCAPE}\\[[0-9;]*[A-Za-z]`, "g");

// The three diagnostic headers a build can print. ReScript 12.3.1 promotes a
// warning to an error with the `(configured as error)` suffix, but an
// unpromoted warning header counts too: the fixture configuration promotes
// every warning, so an unpromoted one is a wrong diagnostic that must not be
// absorbed into the expected error block.
const HEADER =
  /(We've found a bug for you!|Warning number \d+(?: \(configured as error\))?|Syntax error!)/g;

// The `path:line:column` line that follows every header.
const LOCATION = /([^\s:]+):(\d+):\d+/;

/** Collapses runs of whitespace so diagnostic text compares stably. */
const collapse = (text) => text.replace(/\s+/g, " ").trim();

/** Classifies one matched header as `syntax`, `warning`, or `error`. */
function kindOf(header) {
  if (header === "Syntax error!") return "syntax";
  if (header.startsWith("Warning number")) return "warning";
  return "error";
}

/**
 * Splits compiler output into diagnostics.
 *
 * ANSI escapes are removed, whitespace is collapsed, and every diagnostic
 * header starts a new entry. Each entry carries its `kind` (`error`,
 * `warning`, or `syntax`), the location's file basename and first line, and
 * the normalized diagnostic text. Text before the first header is discarded;
 * trailing build-summary text belongs to the last diagnostic.
 */
export function parseDiagnostics(output) {
  const text = output.replace(ANSI, "").replace(/\r/g, "");
  const headers = [...text.matchAll(HEADER)];
  return headers.map((match, index) => {
    const start = match.index;
    const end =
      index + 1 < headers.length ? headers[index + 1].index : text.length;
    const block = collapse(text.slice(start, end));
    const location = LOCATION.exec(block);
    return {
      kind: kindOf(match[1]),
      file: location ? basename(location[1]) : null,
      line: location ? Number(location[2]) : null,
      text: block,
    };
  });
}

/**
 * Accepts exactly one diagnostic matching the expectation.
 *
 * The single diagnostic must name the expected file and first line, and its
 * normalized text must contain every fragment. A warning (promoted or not), a
 * second error, a syntax error, a wrong file or line, or a missing fragment
 * all reject.
 */
export function matchesExpectation(diagnostics, expect) {
  if (diagnostics.length !== 1) return false;
  const [diagnostic] = diagnostics;
  if (diagnostic.kind !== "error") return false;
  if (diagnostic.file !== expect.file) return false;
  if (diagnostic.line !== expect.line) return false;
  return expect.fragments.every((fragment) =>
    diagnostic.text.includes(collapse(fragment)),
  );
}

// Every syntactic unchecked conversion escape the repository forbids in an
// accepted source. `:>` is deliberately detected syntactically; an accepted
// case carries a declared `castScanExemption` only when the coercion is a
// declared variance witness (ADR 005 scopes `:>` to requirement rows).
const ESCAPES = [
  { kind: "Obj.magic", pattern: /Obj\.magic/g },
  { kind: ":>", pattern: /:>/g },
  { kind: "%identity", pattern: /%identity/g },
  { kind: "%raw", pattern: /%raw/g },
  { kind: "external", pattern: /\bexternal\b/g },
];

/**
 * Reports unchecked conversion escapes in a source.
 *
 * Returns one finding per escape, sorted by source index, each with its kind,
 * one-based line, zero-based index, and the trimmed source line. The result
 * is deterministic so a unit suite can assert on it.
 */
export function scanForCasts(source) {
  const lines = source.split("\n");
  const findings = [];
  for (const { kind, pattern } of ESCAPES) {
    for (const match of source.matchAll(pattern)) {
      const index = match.index;
      const line = source.slice(0, index).split("\n").length;
      findings.push({ kind, line, index, text: lines[line - 1].trim() });
    }
  }
  return findings.sort(
    (left, right) =>
      left.index - right.index || left.kind.localeCompare(right.kind),
  );
}

/**
 * True only when two sources have the same line count and exactly one
 * differing line.
 */
export function differsByOneLine(a, b) {
  const left = a.split("\n");
  const right = b.split("\n");
  if (left.length !== right.length) return false;
  let differing = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) differing += 1;
  }
  return differing === 1;
}
