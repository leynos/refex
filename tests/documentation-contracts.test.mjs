/**
@file Documentation contracts: the ADR index and status vocabulary.

An ADR's status line is where "decided" and "evidenced" most easily blur, so
every `docs/adr-NNN-*.md` must declare one status from a fixed vocabulary and
be reachable from `docs/contents.md`. The status token is the text after
`Status:` up to the first `.` or `:`, so `provisional: authorizes a bounded
trial.` reads as `provisional`. Negative controls drop an index link, invent a
status, remove the status line, and link a missing ADR, so a contract that
accepts everything fails here.

The helper is private to this suite because no other suite reads ADRs, so
there is no second caller to justify a shared support module.
*/

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

const STATUSES = [
  "accepted for bootstrap",
  "proposed",
  "provisional",
  "candidate",
  "accepted",
];
const SUPERSEDED = /^superseded by ADR \d{3}$/;
const ADR_FILE = /^adr-\d{3}-[a-z0-9-]+\.md$/;

const adrFiles = () =>
  readdirSync("docs")
    .filter((name) => ADR_FILE.test(name))
    .sort()
    .map((name) => ({
      path: `docs/${name}`,
      text: readFileSync(`docs/${name}`, "utf8"),
    }));

// The status token is the text after `Status:` up to the first `.` or `:`, on
// the first non-blank line after the title.
const statusToken = (text) =>
  text
    .split("\n")
    .filter((entry) => entry.trim())[1]
    ?.match(/^Status: ([^.:]+)[.:]/)?.[1];

// Whether a token is a vocabulary entry or a supersession naming ADR NNN.
const isKnownStatus = (token) =>
  Boolean(token) && (STATUSES.includes(token) || SUPERSEDED.test(token));

// The error a fixture raises when its status line is altered: the suite names
// the first ADR, so every negative control over an ADR's status expects this.
const UNRECOGNIZED =
  "adr-001-repository-bootstrap.md has no recognized status line";

// Rewrites the text of the first fixture ADR, leaving the rest untouched.
const rewriteFirstAdr = (adrs, rewrite) =>
  adrs.map((adr, index) =>
    index === 0 ? { ...adr, text: rewrite(adr.text) } : adr,
  );

// Throws naming the first index link whose ADR file does not exist.
function assertLinksResolve(linked, present) {
  for (const path of linked) {
    if (!present.has(path)) {
      throw new Error(`docs/contents.md links missing ${path}`);
    }
  }
}

// Throws naming the first ADR that is unindexed or lacks a known status.
function assertAdrsIndexed(linked, adrs) {
  for (const { path, text } of adrs) {
    if (!linked.has(path)) {
      throw new Error(`${path} is missing from docs/contents.md`);
    }
    if (!isKnownStatus(statusToken(text))) {
      throw new Error(`${path} has no recognized status line`);
    }
  }
}

// Throws naming the first ADR that is unindexed, unstatused, or missing.
function adrIndexContract(contents, adrs) {
  const linked = new Set(
    [...contents.matchAll(/\]\((adr-[^)#\s]+\.md)\)/g)].map(
      (match) => `docs/${match[1]}`,
    ),
  );
  const present = new Set(adrs.map((adr) => adr.path));
  assertLinksResolve(linked, present);
  assertAdrsIndexed(linked, adrs);
}

describe("Documentation contracts", () => {
  test("every ADR is indexed and declares a known status", () => {
    const adrs = adrFiles();
    expect(adrs.length).toBeGreaterThanOrEqual(3);
    adrIndexContract(readFileSync("docs/contents.md", "utf8"), adrs);
  });

  test.each([
    [
      "the status token allows a qualifier after a colon",
      "provisional: authorizes a bounded trial.",
    ],
    [
      "a superseded status naming its successor is accepted",
      "superseded by ADR 012. Kept for history.",
    ],
  ])("%s", (_name, status) => {
    const adr = {
      path: "docs/adr-099-x.md",
      text: `# ADR 099: x\n\nStatus: ${status}\n`,
    };
    adrIndexContract("[ADR 099](adr-099-x.md)", [adr]);
  });

  test("the developers guide status table matches the suite vocabulary", () => {
    const guide = readFileSync("docs/developers-guide.md", "utf8");
    const lines = guide.split("\n");
    const row = lines.findIndex((line) => line.startsWith("| `provisional`"));
    expect(row).toBeGreaterThan(0);
    let start = row;
    while (lines[start - 1]?.startsWith("|")) start -= 1;
    let end = row;
    while (lines[end + 1]?.startsWith("|")) end += 1;
    const documented = lines
      .slice(start, end + 1)
      .map((line) => line.match(/^\| `([^`]+)`/)?.[1])
      .filter(Boolean);
    expect(new Set(documented)).toEqual(
      new Set([...STATUSES, "superseded by ADR NNN"]),
    );
  });

  test.each([
    [
      "an ADR missing from the index",
      "adr-001-repository-bootstrap.md is missing from docs/contents.md",
      (contents, adrs) => [
        contents.replace("(adr-001-repository-bootstrap.md)", "(elsewhere.md)"),
        adrs,
      ],
    ],
    [
      "an invented status",
      UNRECOGNIZED,
      (contents, adrs) => [
        contents,
        rewriteFirstAdr(adrs, (text) =>
          text.replace(/Status: [^.]+\./, "Status: accepted-ish."),
        ),
      ],
    ],
    [
      "a missing status line",
      UNRECOGNIZED,
      (contents, adrs) => [
        contents,
        rewriteFirstAdr(adrs, (text) =>
          text.replace(/^Status: .*$/m, "Context."),
        ),
      ],
    ],
    [
      "a status line that is not the first line after the title",
      UNRECOGNIZED,
      (contents, adrs) => [
        contents,
        rewriteFirstAdr(adrs, (text) =>
          text.replace(/^(# .*\n)/, "$1\nA paragraph before the status.\n"),
        ),
      ],
    ],
    [
      "an index link to a missing ADR",
      "docs/contents.md links missing docs/adr-098-gone.md",
      (contents, adrs) => [`${contents}\n- [ADR 098](adr-098-gone.md)\n`, adrs],
    ],
  ])("rejects %s", (_, reason, mutate) => {
    const [contents, adrs] = mutate(
      readFileSync("docs/contents.md", "utf8"),
      adrFiles(),
    );
    expect(() => adrIndexContract(contents, adrs)).toThrow(reason);
  });
});
