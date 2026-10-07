import { describe, expect, test } from "bun:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseDocument } from "yaml";
import {
  packageContract,
  workflowContract,
} from "./support/repository-contracts.mjs";

// These helpers belong only to this suite. They validate values supplied by
// the real repository and controlled fixtures, not a generic workflow model.
const root = process.cwd();
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const pkg = json("package.json");
const config = json("rescript.json");
const source = (path) => readFileSync(path, "utf8");
const workflows = ["ci.yml", "audit.yml", "dependabot-automerge.yml"].map(
  (name) => {
    const document = parseDocument(source(`.github/workflows/${name}`));
    assert.equal(
      document.errors.length,
      0,
      `${name}: valid YAML with unique keys`,
    );
    return [name, document.toJS()];
  },
);

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
  });
});

describe("workflow security contracts", () => {
  test.each(workflows)(
    "%s uses pinned least-privilege routes",
    (name, workflow) => {
      workflowContract(name, workflow, pkg.packageManager.slice(4));
    },
  );

  test.each([
    [
      "floating action",
      (workflow) => {
        workflow.jobs.verify.steps[0].uses = "actions/checkout@v6";
      },
    ],
    [
      "persistent credentials",
      (workflow) => {
        workflow.jobs.verify.steps[0].with["persist-credentials"] = true;
      },
    ],
    [
      "ordinary write token",
      (workflow) => {
        workflow.permissions.contents = "write";
      },
    ],
    [
      "non-frozen installation",
      (workflow) => {
        workflow.jobs.verify.steps.find((step) =>
          step.run?.startsWith("bun install"),
        ).run = "bun install";
      },
    ],
    [
      "hidden CI command",
      (workflow) => {
        workflow.jobs.verify.steps.find((step) => step.run === "make all").run =
          "bun test";
      },
    ],
  ])("rejects %s", (_, mutate) => {
    const workflow = structuredClone(workflows[0][1]);
    mutate(workflow);
    expect(() =>
      workflowContract("ci.yml", workflow, pkg.packageManager.slice(4)),
    ).toThrow();
  });

  test.each([
    [
      "PR checkout",
      (workflow) => {
        workflow.jobs.metadata.steps.push({
          uses: "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
        });
      },
    ],
    [
      "PR command",
      (workflow) => {
        workflow.jobs.metadata.steps.push({ run: "bun install" });
      },
    ],
    [
      "major automerge",
      (workflow) => {
        workflow.jobs.automerge.if = "always()";
      },
    ],
    [
      "unguarded actor",
      (workflow) => {
        workflow.jobs.metadata.if = "always()";
      },
    ],
    [
      "unprotected live merge",
      (workflow) => {
        workflow.jobs.automerge.with["dry-run"] = false;
      },
    ],
  ])("privileged workflow rejects %s", (_, mutate) => {
    const workflow = structuredClone(workflows[2][1]);
    mutate(workflow);
    expect(() =>
      workflowContract(
        "dependabot-automerge.yml",
        workflow,
        pkg.packageManager.slice(4),
      ),
    ).toThrow();
  });

  test("structured YAML parser rejects duplicate job keys", () => {
    const document = parseDocument("jobs:\n  verify: {}\n  verify: {}\n");
    expect(document.errors.length).toBeGreaterThan(0);
  });
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
