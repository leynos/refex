/**
@file Documentation contracts: the ADR index and status vocabulary.

An ADR's status line is where "decided" and "evidenced" most easily blur, so
every `docs/adrs/adr-NNNN-*.md` must declare one status from a fixed vocabulary
and be reachable from `docs/contents.md`. The status token is the text after
`Status:` up to the first `.` or `:`, so `provisional: authorizes a bounded
trial.` reads as `provisional`. Discovery rejects a malformed ADR filename
instead of skipping it, so a mistyped name cannot hide from the index and
status checks. Negative controls drop an index link, invent a status, remove
the status line, link a missing ADR, and supply malformed filenames or a
repeated serial, so a contract that accepts everything fails here. Two
properties over generated names hold discovery to the filename grammar and to
serial uniqueness, because a table of examples cannot cover the whole grammar.

The helper is private to this suite because no other suite reads ADRs, so
there is no second caller to justify a shared support module.
*/

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import fc from "fast-check";

const STATUSES = [
  "accepted for bootstrap",
  "proposed",
  "provisional",
  "candidate",
  "accepted",
];
const SUPERSEDED = /^superseded by ADR \d{3}$/;
const ADR_FILE = /^adr-\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

// A name that claims to be an ADR but fails ADR_FILE. Discovery rejects such a
// name rather than filtering it out: a dropped ADR escapes both the index and
// the status checks, so a mistyped new filename would pass unnoticed.
const ADR_CANDIDATE = /^adr-.*\.md$/;

// Generators mirror the filename grammar so the properties below can compare
// discovery with ADR_FILE over valid names and near misses alike.
const SERIAL = fc
  .integer({ min: 0, max: 9999 })
  .map((serial) => String(serial).padStart(4, "0"));
const SLUG_PART = fc
  .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789"), {
    minLength: 1,
    maxLength: 6,
  })
  .map((chars) => chars.join(""));
const SLUG = fc
  .array(SLUG_PART, { minLength: 1, maxLength: 3 })
  .map((parts) => parts.join("-"));
const VALID_NAME = fc
  .tuple(SERIAL, SLUG)
  .map(([serial, slug]) => `adr-${serial}-${slug}.md`);
const NOISE = fc
  .array(
    fc.constantFrom(
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-é",
    ),
    { maxLength: 6 },
  )
  .map((chars) => chars.join(""));
const CANDIDATE_NAME = fc.oneof(
  VALID_NAME,
  fc
    .tuple(NOISE, fc.constantFrom("_", "A", "-", ".", "é"), NOISE)
    .map(([head, noise, tail]) => `adr-${head}${noise}${tail}.md`),
);

// Throws naming the first candidate that is not named like an ADR, or whose
// serial an earlier ADR already uses: one serial identifies one decision, and
// two files sharing it leave every "ADR NNNN" reference ambiguous. Files that
// do not start with `adr-` belong to no contract here and are ignored.
function assertAdrNames(names) {
  const serials = new Map();
  for (const name of names) {
    if (!ADR_CANDIDATE.test(name)) {
      continue;
    }
    if (!ADR_FILE.test(name)) {
      throw new Error(`${name} is not a valid ADR filename`);
    }
    const serial = name.slice(4, 8);
    const first = serials.get(serial);
    if (first) {
      throw new Error(`${name} reuses the ADR serial in ${first}`);
    }
    serials.set(serial, name);
  }
}

// Discovers ADRs from a directory listing, reading each file through
// `readFile(name)` so tests can supply listings without touching the disk.
const discoverAdrFiles = (names, readFile) => {
  assertAdrNames(names);
  return names
    .filter((name) => ADR_FILE.test(name))
    .sort()
    .map((name) => ({ path: `docs/adrs/${name}`, text: readFile(name) }));
};

const adrFiles = () =>
  discoverAdrFiles(readdirSync("docs/adrs"), (name) =>
    readFileSync(`docs/adrs/${name}`, "utf8"),
  );

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
  "adr-0001-repository-bootstrap.md has no recognized status line";

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
    [...contents.matchAll(/\]\((adrs\/adr-[^)#\s]+\.md)\)/g)].map(
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
    ["a four-digit serial and ASCII slug", "adr-0008-valid-slug.md"],
    ["a one-character slug", "adr-0008-x.md"],
    ["digits in the slug", "adr-0008-step-2.md"],
  ])("discovers %s", (_name, file) => {
    expect(discoverAdrFiles([file], () => "Status: proposed.")).toEqual([
      { path: `docs/adrs/${file}`, text: "Status: proposed." },
    ]);
  });

  test.each([
    ["a three-digit serial", "adr-008-three-digit.md"],
    ["a two-digit serial", "adr-08-two-digit.md"],
    ["a five-digit serial", "adr-00008-five-digit.md"],
    ["consecutive hyphens", "adr-0008-double--dash.md"],
    ["a leading hyphen in the slug", "adr-0008--leading.md"],
    ["a trailing hyphen in the slug", "adr-0008-trailing-.md"],
    ["an empty slug", "adr-0008-.md"],
    ["an underscore in the slug", "adr-0008-under_score.md"],
    ["an uppercase letter in the slug", "adr-0008-Caps.md"],
    ["a non-ASCII letter in the slug", "adr-0008-café.md"],
  ])("rejects %s", (_name, file) => {
    expect(() => discoverAdrFiles([file], () => "")).toThrow(
      `${file} is not a valid ADR filename`,
    );
  });

  test("discovers ADRs whose serials differ", () => {
    const names = ["adr-0008-first-slug.md", "adr-0009-second-slug.md"];
    expect(discoverAdrFiles(names, () => "").map(({ path }) => path)).toEqual(
      names.map((name) => `docs/adrs/${name}`),
    );
  });

  test("rejects a repeated ADR serial", () => {
    expect(() =>
      discoverAdrFiles(
        ["adr-0008-first-slug.md", "adr-0008-second-slug.md"],
        () => "Status: proposed.",
      ),
    ).toThrow(
      "adr-0008-second-slug.md reuses the ADR serial in adr-0008-first-slug.md",
    );
  });

  test("accepts a name exactly when it matches the filename grammar", () => {
    fc.assert(
      fc.property(CANDIDATE_NAME, (name) => {
        if (ADR_FILE.test(name)) {
          expect(discoverAdrFiles([name], () => "")).toEqual([
            { path: `docs/adrs/${name}`, text: "" },
          ]);
          return;
        }
        expect(() => discoverAdrFiles([name], () => "")).toThrow(
          `${name} is not a valid ADR filename`,
        );
      }),
    );
  });

  test("rejects every pair of ADRs that shares a serial", () => {
    fc.assert(
      fc.property(SERIAL, (serial) => {
        const first = `adr-${serial}-first-slug.md`;
        const second = `adr-${serial}-second-slug.md`;
        expect(() => discoverAdrFiles([first, second], () => "")).toThrow(
          `${second} reuses the ADR serial in ${first}`,
        );
      }),
    );
  });

  test("rejects a malformed ADR that the index does not link", () => {
    expect(() =>
      discoverAdrFiles(
        ["adr-0001-repository-bootstrap.md", "adr-0008-bad_slug.md"],
        () => "Status: proposed.",
      ),
    ).toThrow("adr-0008-bad_slug.md is not a valid ADR filename");
  });

  test("ignores files that are not ADR candidates", () => {
    expect(discoverAdrFiles(["README.md", "notes.md"], () => "")).toEqual([]);
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
      path: "docs/adrs/adr-0099-x.md",
      text: `# ADR 099: x\n\nStatus: ${status}\n`,
    };
    adrIndexContract("[ADR 099](adrs/adr-0099-x.md)", [adr]);
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
      "docs/adrs/adr-0001-repository-bootstrap.md is missing from docs/contents.md",
      (contents, adrs) => [
        contents.replace(
          "(adrs/adr-0001-repository-bootstrap.md)",
          "(elsewhere.md)",
        ),
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
      "docs/contents.md links missing docs/adrs/adr-0098-gone.md",
      (contents, adrs) => [
        `${contents}\n- [ADR 098](adrs/adr-0098-gone.md)\n`,
        adrs,
      ],
    ],
  ])("rejects %s", (_, reason, mutate) => {
    const [contents, adrs] = mutate(
      readFileSync("docs/contents.md", "utf8"),
      adrFiles(),
    );
    expect(() => adrIndexContract(contents, adrs)).toThrow(reason);
  });
});
