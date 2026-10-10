/**
Makefile contracts: environment defaults and gate ordering.

Two repository invariants are owned here. The uv cache and tool directories
must be defaults rather than overrides, because a CI provisioner exports its own
location and fails its post-job cache save when uv writes elsewhere. The `all`
target must run the gates sequentially and stop at the first failure, including
under `make -j`, so a parallel invocation cannot hide a broken gate behind an
unrelated success.

Shared assertions live in `support/repository-contracts.mjs`; this file owns
only the values it feeds them.
*/

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spellingGateContract } from "./support/repository-contracts.mjs";

const source = (path) => readFileSync(path, "utf8");

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
});
