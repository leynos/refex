/**
Documentation contracts: the ADR index and status vocabulary.

An ADR's status line is where "decided" and "evidenced" most easily blur, so
every `docs/adr-NNN-*.md` must declare one status from a fixed vocabulary and
be reachable from `docs/contents.md`. The status token is the text after
`Status:` up to the first `.` or `:`, so `provisional: authorizes a bounded
trial.` reads as `provisional`. Negative controls drop an index link, invent a
status, remove the status line, and link a missing ADR, so a contract that
accepts everything fails here.

The helper is private to this suite: no other suite reads ADRs, and the shared
support module is already at its size limit.
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

// Throws naming the first ADR that is unindexed, unstatused, or missing.
function adrIndexContract(contents, adrs) {
  const linked = new Set(
    [...contents.matchAll(/\]\((adr-[^)#\s]+\.md)\)/g)].map(
      (match) => `docs/${match[1]}`,
    ),
  );
  const present = new Set(adrs.map((adr) => adr.path));
  for (const path of linked) {
    if (!present.has(path)) {
      throw new Error(`docs/contents.md links missing ${path}`);
    }
  }
  for (const { path, text } of adrs) {
    if (!linked.has(path)) {
      throw new Error(`${path} is missing from docs/contents.md`);
    }
    // The status line is the first non-blank line after the title.
    const status = text.split("\n").filter((entry) => entry.trim())[1];
    const token = status?.match(/^Status: ([^.:]+)[.:]/)?.[1];
    if (!token || !(STATUSES.includes(token) || SUPERSEDED.test(token))) {
      throw new Error(`${path} has no recognized status line`);
    }
  }
}

describe("Documentation contracts", () => {
  test("every ADR is indexed and declares a known status", () => {
    const adrs = adrFiles();
    expect(adrs.length).toBeGreaterThanOrEqual(3);
    adrIndexContract(readFileSync("docs/contents.md", "utf8"), adrs);
  });

  test("the status token allows a qualifier after a colon", () => {
    const adr = {
      path: "docs/adr-099-x.md",
      text: "# ADR 099: x\n\nStatus: provisional: authorizes a bounded trial.\n",
    };
    adrIndexContract("[ADR 099](adr-099-x.md)", [adr]);
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
      "adr-001-repository-bootstrap.md has no recognized status line",
      (contents, adrs) => [
        contents,
        adrs.map((adr, index) =>
          index === 0
            ? {
                ...adr,
                text: adr.text.replace(
                  /Status: [^.]+\./,
                  "Status: accepted-ish.",
                ),
              }
            : adr,
        ),
      ],
    ],
    [
      "a missing status line",
      "adr-001-repository-bootstrap.md has no recognized status line",
      (contents, adrs) => [
        contents,
        adrs.map((adr, index) =>
          index === 0
            ? { ...adr, text: adr.text.replace(/^Status: .*$/m, "Context.") }
            : adr,
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
