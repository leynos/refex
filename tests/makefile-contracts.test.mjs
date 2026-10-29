/**
@file Makefile contracts: environment defaults, gate ordering, and suite
registration.

Three repository invariants are owned here. The uv cache and tool directories
must be defaults rather than overrides, because a CI provisioner exports its own
location and fails its post-job cache save when uv writes elsewhere. The `all`
target must run the gates sequentially and stop at the first failure, including
under `make -j`, so a parallel invocation cannot hide a broken gate behind an
unrelated success. Every authored test suite must be named by the `test`
target, because Bun does not discover `.test.res.mjs` output and an unlisted
suite would pass by never running.

Shared assertions live in `support/toolchain-workflow-contracts.mjs`; this
file owns only the values it feeds them, plus the suite-registration check
below, which stays private because only this suite reads the `test` recipe.
*/

import { describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spellingGateContract } from "./support/toolchain-workflow-contracts.mjs";

const source = (path) => readFileSync(path, "utf8");

// The executable path of every authored suite, as `make test` must name it.
const authoredSuites = () =>
  readdirSync("tests")
    .filter((name) => name.endsWith(".test.mjs") || name.endsWith(".test.res"))
    .map((name) => `./tests/${name.endsWith(".res") ? `${name}.mjs` : name}`)
    .sort();

// The joined `$(BUN) test` command of the `test` recipe, up to any shell
// comment: a path in a recipe comment, a trailing comment, or another command
// is not executed by `bun test`. Throws when the recipe or command is absent.
function testCommand(makefile) {
  const recipe = makefile.match(/^test:.*\n((?:\t.*\n?)+)/m)?.[1];
  if (!recipe) throw new Error("Makefile has no test recipe");
  const command = recipe
    .replace(/\\\n\t*/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("$(BUN) test "))
    ?.replace(/\s#.*$/, "");
  if (!command) throw new Error("test recipe has no $(BUN) test command");
  return command;
}

// The suite paths a command line names.
const namedSuites = (command) =>
  new Set(command.split(/\s+/).filter((arg) => arg.startsWith("./tests/")));

// Throws naming the first suite that the `test` recipe does not run.
function testTargetListsEverySuite(makefile, suites) {
  const named = namedSuites(testCommand(makefile));
  const missing = suites.filter((suite) => !named.has(suite));
  if (missing.length > 0) {
    throw new Error(`make test does not run ${missing[0]}`);
  }
}

describe("Makefile contracts", () => {
  test("spelling gate lets the provisioner choose the uv cache location", () => {
    spellingGateContract(source("Makefile"));
  });

  test.each([
    [
      "an inline cache override",
      (makefile) => makefile.replace("UV_CACHE_DIR ?=", "UV_CACHE_DIR ="),
    ],
    [
      "an inline tool-directory override",
      (makefile) => makefile.replace("UV_TOOL_DIR ?=", "UV_TOOL_DIR ="),
    ],
    [
      "a hard-coded environment prefix",
      (makefile) =>
        makefile.replace(
          "UV_CACHE_DIR=$(UV_CACHE_DIR)",
          "UV_CACHE_DIR=.uv-cache",
        ),
    ],
  ])("spelling gate rejects %s", (_, mutate) => {
    expect(() => spellingGateContract(mutate(source("Makefile")))).toThrow();
  });

  test("make -j all runs sequential gates and stops on failure", () => {
    const gates = [
      "check-fmt",
      "check-generated",
      "lint",
      "test",
      "docs-check",
      "spelling",
      "package-check",
    ];
    const directory = mkdtempSync(join(tmpdir(), "refex-make-"));
    try {
      const probe = join(directory, "probe.sh");
      const log = join(directory, "gates.log");
      writeFileSync(
        probe,
        '#!/bin/bash\nprintf "%s\\n" "$1" >> "$GATE_LOG"\nif [ "$1" = "$FAIL_GATE" ]; then exit 1; fi\n',
        { mode: 0o755 },
      );
      for (const failOn of ["", "lint", "package-check"]) {
        writeFileSync(log, "");
        const result = Bun.spawnSync(["make", "-j8", "all", `MAKE=${probe}`], {
          env: { ...process.env, GATE_LOG: log, FAIL_GATE: failOn },
        });
        expect(result.exitCode === 0).toBe(failOn === "");
        const expected = failOn
          ? gates.slice(0, gates.indexOf(failOn) + 1)
          : gates;
        expect(readFileSync(log, "utf8").trim().split("\n")).toEqual(expected);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("make test runs every authored test suite", () => {
    const suites = authoredSuites();
    expect(suites.length).toBeGreaterThanOrEqual(8);
    testTargetListsEverySuite(source("Makefile"), suites);
  });

  test.each([
    [
      "an unlisted suite",
      (makefile) => makefile.replace("./tests/consumer.test.mjs", ""),
      null,
    ],
    [
      "a suite named only in a recipe comment",
      (makefile) =>
        makefile
          .replace("./tests/consumer.test.mjs", "")
          .replace(
            "\t+$(MAKE) build\n\t$(BUN) test",
            "\t+$(MAKE) build\n\t# ./tests/consumer.test.mjs\n\t$(BUN) test",
          ),
      "\t# ./tests/consumer.test.mjs\n",
    ],
    [
      "a suite named only in a trailing shell comment",
      (makefile) =>
        makefile
          .replace("./tests/consumer.test.mjs", "")
          .replace(
            "./tests/workflow-contracts.test.mjs",
            "./tests/workflow-contracts.test.mjs # ./tests/consumer.test.mjs",
          ),
      "./tests/workflow-contracts.test.mjs # ./tests/consumer.test.mjs",
    ],
  ])("suite registration rejects %s", (_, mutate, injected) => {
    const makefile = mutate(source("Makefile"));
    // A `.replace` that matches nothing would leave the Makefile valid and let
    // the rejection below pass for the wrong reason, so prove the mutation hit.
    if (injected !== null) expect(makefile).toContain(injected);
    expect(() => testTargetListsEverySuite(makefile, authoredSuites())).toThrow(
      "make test does not run ./tests/consumer.test.mjs",
    );
  });
});
