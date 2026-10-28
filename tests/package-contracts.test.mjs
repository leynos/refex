/**
Package, compiler, and packaging contracts.

The subject of this suite is the package itself: its metadata and exact pins,
the archive `bun pm pack` actually produces, the Biome policy over authored
support files, and the compiler's treatment of the Bun boundary recorded in
ADR 002. Every contract is paired with negative controls that mutate a real
file or fixture, so a contract that cannot fail does not pass.

Shared assertions live in `support/package-dependency-contracts.mjs`; this
file owns only the values it feeds them.
*/

import { describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packageContract } from "./support/package-dependency-contracts.mjs";

// Private to this suite: reads the repository's own files, not a generic model.
const root = process.cwd();
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const source = (path) => readFileSync(path, "utf8");
const pkg = json("package.json");
const config = json("rescript.json");

describe("package and compiler contracts", () => {
  test("real archive includes ISC and production output, never test output", () => {
    const directory = mkdtempSync(join(tmpdir(), "refex-archive-"));
    try {
      const archive = join(directory, "refex.tgz");
      const packed = Bun.spawnSync([
        process.execPath,
        "pm",
        "pack",
        "--ignore-scripts",
        "--filename",
        archive,
      ]);
      expect(packed.exitCode).toBe(0);
      const inspected = Bun.spawnSync(["tar", "-tzf", archive]);
      expect(inspected.exitCode).toBe(0);
      const files = inspected.stdout.toString().trim().split("\n");
      expect(files).toContain("package/LICENSE");
      expect(files).toContain("package/src/Bootstrap.res.mjs");
      expect(files.some((path) => path.startsWith("package/tests/"))).toBe(
        false,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("Biome checks authored support files and excludes compiler output", () => {
    const biome = json("biome.json");
    expect(biome.linter.rules.preset).toBe("recommended");
    expect(biome.files.includes).toContain("!!**/*.res.mjs");
    expect(biome.files.includes).toContain("!!.uv-cache");
    expect(biome.vcs.useIgnoreFile).toBe(true);
  });

  test("portable private package with exact tools and explicit exports", () => {
    packageContract(pkg, config);
    expect(source("LICENSE")).toContain("Permission to use, copy, modify");
    expect(source("LICENSE")).toContain("Copyright (c) 2026 leynos");
  });

  test.each([
    [
      "compiler/runtime mismatch",
      (metadata) => {
        metadata.dependencies["@rescript/runtime"] = "12.0.0";
      },
    ],
    [
      "runtime Bun dependency",
      (metadata) => {
        metadata.dependencies["rescript-bun"] = "2.1.0";
      },
    ],
    [
      "production Bun binding",
      (_, rescript) => {
        rescript.dependencies.push("rescript-bun");
      },
    ],
    [
      "production tests",
      (_, rescript) => {
        delete rescript.sources[1].type;
      },
    ],
    [
      "global Bun open",
      (_, rescript) => {
        rescript["compiler-flags"].push("-open RescriptBun");
      },
    ],
    [
      "implicit public modules",
      (_, rescript) => {
        delete rescript.sources[0].public;
      },
    ],
    [
      "publishable package",
      (metadata) => {
        metadata.private = false;
      },
    ],
    [
      "inherited licence",
      (metadata) => {
        metadata.license = "MIT";
      },
    ],
    [
      "test output in package",
      (metadata) => {
        metadata.files.push("tests/Bootstrap.test.res.mjs");
      },
    ],
    [
      "missing generated output",
      (metadata) => {
        metadata.files = metadata.files.filter(
          (file) => !file.endsWith(".mjs"),
        );
      },
    ],
  ])("rejects %s", (_, mutate) => {
    const metadata = structuredClone(pkg);
    const rescript = structuredClone(config);
    mutate(metadata, rescript);
    expect(() => packageContract(metadata, rescript)).toThrow();
  });

  // This contract runs two complete compiler builds, so it needs an explicit
  // budget. Bun's 5s default is a wall-clock limit on a shared machine, not a
  // property of the boundary being asserted: it fails under load while the
  // compiler is still working, and reports the killed child's null exit code
  // as if the contract had been violated. The timeout is generous because the
  // assertion detects a wrong exit code, not a slow one.
  test("compiler rejects Bun in production and accepts it in dev source", () => {
    const directory = mkdtempSync(join(tmpdir(), "refex-boundary-"));
    try {
      symlinkSync(
        join(root, "node_modules"),
        join(directory, "node_modules"),
        "dir",
      );
      writeFileSync(
        join(directory, "Probe.res"),
        'open RescriptBun.Test\ntest("boundary probe", () => {expect(1)->Expect.toBe(1)})\n',
      );
      writeFileSync(
        join(directory, "package.json"),
        JSON.stringify({ name: "boundary-probe", private: true }),
      );
      for (const isDev of [false, true]) {
        writeFileSync(
          join(directory, "rescript.json"),
          JSON.stringify({
            ...config,
            name: "boundary-probe",
            sources: [
              {
                dir: ".",
                public: ["Probe"],
                ...(isDev ? { type: "dev" } : {}),
              },
            ],
          }),
        );
        const result = Bun.spawnSync(
          [process.execPath, "run", "--bun", "rescript", "build"],
          { cwd: directory },
        );
        if (isDev)
          expect(`${result.stdout}${result.stderr}`).not.toContain(
            "cannot be found",
          );
        expect(result.exitCode).toBe(isDev ? 0 : 1);
        if (!isDev)
          expect(`${result.stdout}${result.stderr}`).toContain("RescriptBun");
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 60_000);
});
