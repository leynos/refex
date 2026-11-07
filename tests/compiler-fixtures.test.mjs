/**
@file Compiler-fixture runner for the opaque Fx surface.

Owns one temporary consumer project that installs the package's `files`
allowlist, builds the shared base modules, and compiles every recorded case.
Negative cases must fail with exactly one diagnostic at the expected file,
line, and fragments; controls must compile; each control differs from its
negative by exactly one line. The matcher and cast scan are shared with
`compiler-fixture-matching.test.mjs` only.

Diagnostics are ReScript 12.3.1-specific, so the runner fails closed on any
other compiler version. The suite logs its wall clock; its 120-second planning
budget is read from that log rather than asserted, so a slow runner cannot fail
a correctness test. Each case gets 60 seconds. Accepted sources are the only
place the runner scans for casts; a case carries a `castScanExemption` only
when the coercion is a declared variance witness.
*/

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  differsByOneLine,
  matchesExpectation,
  parseDiagnostics,
  scanForCasts,
} from "./support/compiler-fixture-matching.mjs";

const root = process.cwd();
const fixtureRoot = join(root, "tests/fixtures/compiler/fx-surface");
const baseDir = join(fixtureRoot, "base");
const casesDir = join(fixtureRoot, "cases");
const metadata = JSON.parse(
  readFileSync(join(fixtureRoot, "cases.json"), "utf8"),
);
const cases = metadata.cases;
const started = performance.now();

// The fixture-relative path a case's source occupies in cases.json.
const caseFile = (entry) => entry.file ?? `cases/${entry.id}.res`;
const sourcePath = (entry) => join(fixtureRoot, caseFile(entry));

// True only for the exact pinned version, not a longer version that shares
// its prefix such as 12.3.10.
const isPinnedCompiler = (printed) => /^rescript 12\.3\.1$/m.test(printed);

const project = mkdtempSync(join(tmpdir(), "refex-fixtures-"));
const packageDir = join(project, "node_modules/refex");

/**
 * Lists the relative paths of every ordinary file under a directory.
 *
 * Recurses into subdirectories and joins paths with `/`, so the copied package
 * tree can be compared against the manifest allowlist.
 */
function listFiles(directory, prefix = "") {
  const entries = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      entries.push(...listFiles(join(directory, entry.name), relative));
    } else {
      entries.push(relative);
    }
  }
  return entries;
}

/**
 * Copies every `package.json` `files` entry into the fixture's package
 * directory and returns the manifest.
 *
 * The copied tree is what the package actually ships, so a missing or extra
 * entry fails the inventory test rather than being hidden by the checkout.
 */
function copyPackage() {
  const manifest = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  ).files;
  for (const path of manifest) {
    const target = join(packageDir, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, path), target);
  }
  return manifest;
}

/** Writes the fixture consumer's private manifest and ReScript config. */
function writeProject() {
  writeFileSync(
    join(project, "package.json"),
    `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
  );
  writeFileSync(
    join(project, "rescript.json"),
    `${JSON.stringify(
      {
        name: "refex-fixtures-consumer",
        sources: ["src"],
        dependencies: ["refex"],
        "package-specs": { module: "esmodule", "in-source": true },
        suffix: ".res.mjs",
        warnings: { number: "+A", error: "+A" },
      },
      null,
      2,
    )}\n`,
  );
}

/** Symlinks the pinned compiler, runtime, and executable directory. */
function linkToolchain() {
  mkdirSync(join(project, "node_modules/@rescript"), { recursive: true });
  symlinkSync(
    join(root, "node_modules/rescript"),
    join(project, "node_modules/rescript"),
    "dir",
  );
  symlinkSync(
    join(root, "node_modules/@rescript/runtime"),
    join(project, "node_modules/@rescript/runtime"),
    "dir",
  );
  symlinkSync(
    join(root, "node_modules/.bin"),
    join(project, "node_modules/.bin"),
    "dir",
  );
}

/** Builds the fixture consumer and returns its status and combined output. */
function build() {
  // A synchronous spawn blocks the event loop, so the per-case test timeout
  // cannot interrupt it; bound the process itself instead.
  const result = Bun.spawnSync(
    [process.execPath, "run", "--bun", "rescript", "build"],
    { cwd: project, timeout: 60_000 },
  );
  return {
    status: result.exitCode,
    output: `${result.stdout.toString()}${result.stderr.toString()}`,
  };
}

/**
 * Throws when a build result is not successful, naming the fixture.
 *
 * The combined output is included so a compiler failure is diagnosable from
 * the test log.
 */
function requireBuilt(result, label) {
  if (result.status !== 0) {
    throw new Error(`${label} did not build:\n${result.output}`);
  }
}

let manifest = [];

beforeAll(() => {
  const version = Bun.spawnSync(
    [process.execPath, "run", "--bun", "rescript", "--version"],
    { cwd: root },
  );
  const printed = `${version.stdout.toString()}${version.stderr.toString()}`;
  if (version.exitCode !== 0 || !isPinnedCompiler(printed)) {
    throw new Error(`expected ReScript 12.3.1, got:\n${printed}`);
  }
  mkdirSync(join(project, "src"), { recursive: true });
  writeProject();
  manifest = copyPackage();
  linkToolchain();
  for (const name of readdirSync(baseDir)) {
    copyFileSync(join(baseDir, name), join(project, "src", name));
  }
});

afterAll(() => {
  rmSync(project, { recursive: true, force: true });
  const seconds = (performance.now() - started) / 1000;
  console.log(`compiler-fixture suite wall clock: ${seconds.toFixed(1)}s`);
});

describe("compiler fixtures", () => {
  test("the compiler is the pinned ReScript version", () => {
    const result = Bun.spawnSync(
      [process.execPath, "run", "--bun", "rescript", "--version"],
      { cwd: root },
    );
    const printed = `${result.stdout.toString()}${result.stderr.toString()}`;
    expect(result.exitCode).toBe(0);
    expect(isPinnedCompiler(printed)).toBe(true);
  });

  test("the copied package files equal package.json files", () => {
    expect(listFiles(packageDir).sort()).toEqual([...manifest].sort());
  });

  test("the base fixture builds", () => {
    requireBuilt(build(), "the base fixture");
  }, 60_000);

  for (const entry of cases) {
    test(`case ${entry.id} is ${entry.kind}`, () => {
      const source = readFileSync(sourcePath(entry), "utf8");
      if (entry.control) {
        const control = cases.find(
          (candidate) => candidate.id === entry.control,
        );
        expect(control).toBeDefined();
        expect(
          differsByOneLine(source, readFileSync(sourcePath(control), "utf8")),
        ).toBe(true);
      }
      const target = join(project, "src/Case.res");
      try {
        writeFileSync(target, source);
        const result = build();
        if (entry.id === "wrong-reason-control") {
          if (result.status === 0) {
            throw new Error("the wrong-reason control compiled");
          }
          const diagnostics = parseDiagnostics(result.output);
          // The control must fail because of its syntax, not some other way
          // that merely looks unlike the expected type error.
          expect(
            diagnostics.some(
              ({ kind, file, line }) =>
                kind === "syntax" && file === "Case.res" && line === 3,
            ),
          ).toBe(true);
          expect(matchesExpectation(diagnostics, entry.expect)).toBe(false);
          return;
        }
        if (entry.kind === "reject") {
          if (result.status === 0) {
            throw new Error(`expected ${entry.id} to fail`);
          }
          if (
            !matchesExpectation(parseDiagnostics(result.output), entry.expect)
          ) {
            throw new Error(
              `unexpected diagnostics for ${entry.id}:\n${result.output}`,
            );
          }
          return;
        }
        requireBuilt(result, entry.id);
      } finally {
        rmSync(target, { force: true });
        rmSync(`${target}.mjs`, { force: true });
      }
    }, 60_000);
  }

  test("the base fixture rebuilds after the cases", () => {
    requireBuilt(build(), "the rebuilt base fixture");
  }, 60_000);

  test("accepted sources carry no undeclared cast", () => {
    for (const name of readdirSync(baseDir)) {
      expect(scanForCasts(readFileSync(join(baseDir, name), "utf8"))).toEqual(
        [],
      );
    }
    for (const entry of cases.filter(
      (candidate) => candidate.kind === "accept",
    )) {
      const findings = scanForCasts(readFileSync(sourcePath(entry), "utf8"));
      if (!entry.castScanExemption) {
        expect(findings).toEqual([]);
        continue;
      }
      const exemption = entry.castScanExemption;
      const isDeclared = ({ kind, line }) =>
        kind === exemption.kind && line === exemption.line;
      // The whole source is still scanned: a second escape, even of the
      // exempted kind, fails, and the declared witness must actually exist.
      expect(findings.filter(isDeclared)).toHaveLength(1);
      expect(findings.filter((finding) => !isDeclared(finding))).toEqual([]);
    }
  });

  test("cases.json covers exactly the fixture files", () => {
    const listed = cases.map(caseFile).sort();
    const actual = readdirSync(casesDir)
      .filter((name) => name.endsWith(".res") || name.endsWith(".res.txt"))
      .map((name) => `cases/${name}`)
      .sort();
    expect(listed).toEqual(actual);
  });
});
