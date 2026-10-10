/**
Repository contract tests.

Each test feeds a real repository file, or a real subprocess, through the
shared contract helpers in `support/repository-contracts.mjs`. The fixture
tests below exist because a contract that cannot fail is not a contract: every
helper is exercised against a deliberately mutated or broken input, and
`scripts/check-generated.mjs` runs against temporary Git repositories whose
generated inventory is wrong in a specific way. Anything that changes an
assertion here should also keep its paired negative control passing.
*/

import { describe, expect, test } from "bun:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
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
  coverageConfigContract,
  dependabotContract,
  markdownLintContract,
  markdownPolicyContract,
  packageContract,
  spellingGateContract,
  workflowContract,
} from "./support/repository-contracts.mjs";

// These helpers belong only to this suite. They validate values supplied by
// the real repository and controlled fixtures, not a generic workflow model.
const root = process.cwd();
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const pkg = json("package.json");
const config = json("rescript.json");
const source = (path) => readFileSync(path, "utf8");
const jsonc = (path) => JSON.parse(source(path).replace(/^\s*\/\/.*$/gm, ""));
const yamlFile = (path) => {
  const document = parseDocument(source(path));
  assert.equal(document.errors.length, 0, `${path}: valid YAML`);
  return document.toJS();
};
const dependabot = yamlFile(".github/dependabot.yml");
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

  test("Markdown linting uses a braces-free toolchain", () => {
    markdownLintContract(pkg, source("Makefile"));
  });

  test.each([
    [
      "the vulnerable linter",
      (metadata, makefile) => {
        delete metadata.devDependencies["markdownlint-cli"];
        metadata.devDependencies["markdownlint-cli2"] = "0.23.3";
        return makefile;
      },
    ],
    [
      "a floating linter pin",
      (metadata, makefile) => {
        metadata.devDependencies["markdownlint-cli"] = "^0.49.1";
        return makefile;
      },
    ],
    [
      "dropped dot-directory coverage",
      (_, makefile) => makefile.replace("markdownlint --dot", "markdownlint"),
    ],
  ])("rejects %s", (_, mutate) => {
    const metadata = structuredClone(pkg);
    const makefile = mutate(metadata, source("Makefile"));
    expect(() => markdownLintContract(metadata, makefile)).toThrow();
  });

  test("Dependabot keeps grouping, cooldowns and the ReScript 13 exclusion", () => {
    dependabotContract(dependabot);
  });

  test.each([
    [
      "an unprotected dependency major",
      (configuration) => {
        configuration.updates[0].groups["minor-and-patch"]["update-types"] = [
          "minor",
          "patch",
          "major",
        ];
      },
    ],
    [
      "a dropped ReScript 13 exclusion",
      (configuration) => {
        configuration.updates[0].ignore.pop();
      },
    ],
    [
      "a raised adoption cooldown requirement",
      (configuration) => {
        configuration.updates[0].cooldown = {};
      },
    ],
    [
      "an unbounded pull-request limit",
      (configuration) => {
        configuration.updates[1]["open-pull-requests-limit"] = 50;
      },
    ],
    [
      "a lost ecosystem",
      (configuration) => {
        configuration.updates.pop();
      },
    ],
  ])("Dependabot contract rejects %s", (_, mutate) => {
    const configuration = structuredClone(dependabot);
    mutate(configuration);
    expect(() => dependabotContract(configuration)).toThrow();
  });

  test("Markdown policy and ignore paths survive the linter replacement", () => {
    markdownPolicyContract(
      jsonc(".markdownlint.jsonc"),
      source(".markdownlintignore").trim().split("\n"),
    );
  });

  test.each([
    [
      "a reopened wrapping exemption",
      (rules) => {
        rules.MD013.tables = true;
      },
    ],
    [
      "a widened code-block width",
      (rules) => {
        rules.MD013.code_block_line_length = 200;
      },
    ],
    [
      "a silenced tab rule",
      (rules) => {
        rules.MD010.code_blocks = true;
      },
    ],
  ])("Markdown policy rejects %s", (_, mutate) => {
    const rules = jsonc(".markdownlint.jsonc");
    mutate(rules);
    expect(() =>
      markdownPolicyContract(rules, source(".markdownlintignore").split("\n")),
    ).toThrow();
  });

  test("coverage excludes generated test bodies and they stay untracked", () => {
    coverageConfigContract(source("bunfig.toml"), source(".gitignore"));
  });

  // Every row supplies all three elements. Bun's test.each binds arguments
  // positionally across rows, so a row of a different length silently shifts
  // the mutation functions and the negative control stops testing anything.
  const identity = (value) => value;
  test.each([
    [
      "a dropped coverage exclusion",
      (bunfig) => bunfig.replace('["tests/**"]', "[]"),
      identity,
    ],
    [
      "a tracked generated test",
      identity,
      (gitignore) => gitignore.replace("/tests/**/*.res.mjs", ""),
    ],
  ])("coverage configuration rejects %s", (_, mutateConfig, mutateIgnore) => {
    expect(() =>
      coverageConfigContract(
        mutateConfig(source("bunfig.toml")),
        mutateIgnore(source(".gitignore")),
      ),
    ).toThrow();
  });

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
      "an audit that stops being scheduled",
      (workflow) => {
        delete workflow.on.schedule;
      },
    ],
    [
      "an audit that no longer runs the target",
      (workflow) => {
        workflow.jobs.audit.steps.find(
          (step) => step.run === "make audit",
        ).run = "make test";
      },
    ],
    [
      "an audit against an unfrozen graph",
      (workflow) => {
        workflow.jobs.audit.steps.find((step) =>
          step.run?.startsWith("bun install"),
        ).run = "bun install";
      },
    ],
  ])("audit workflow rejects %s", (_, mutate) => {
    const workflow = structuredClone(workflows[1][1]);
    mutate(workflow);
    expect(() =>
      workflowContract("audit.yml", workflow, pkg.packageManager.slice(4)),
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

describe("generated-output gate", () => {
  // The gate is a script, not a helper, so it can only be tested by running
  // it. Each case builds a throwaway Git repository whose generated inventory
  // is wrong in exactly one way and asserts the gate's exit status. Without
  // these, a gate that always exits 0 would pass the real repository too.
  const script = join(root, "scripts", "check-generated.mjs");
  const generated = "// Generated by ReScript, PLEASE EDIT WITH CARE\n";
  const git = (directory, ...args) => {
    const result = Bun.spawnSync(["git", ...args], {
      cwd: directory,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "contract fixture",
        GIT_AUTHOR_EMAIL: "fixture@example.invalid",
        GIT_COMMITTER_NAME: "contract fixture",
        GIT_COMMITTER_EMAIL: "fixture@example.invalid",
      },
    });
    assert.equal(
      result.exitCode,
      0,
      `git ${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
    );
  };
  const runGate = (directory) =>
    Bun.spawnSync([process.execPath, script], { cwd: directory }).exitCode;
  const fixture = (prepare) => {
    const directory = mkdtempSync(join(tmpdir(), "refex-generated-"));
    try {
      git(directory, "init", "--quiet");
      mkdirSync(join(directory, "src"));
      prepare(directory);
      return runGate(directory);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  };

  test("accepts committed output that matches the worktree", () => {
    expect(
      fixture((directory) => {
        writeFileSync(join(directory, "src/Module.res.mjs"), generated);
        git(directory, "add", "--", "src");
        git(directory, "commit", "--quiet", "--message", "generated output");
      }),
    ).toBe(0);
  });

  test("rejects output that is committed but stale in the worktree", () => {
    expect(
      fixture((directory) => {
        writeFileSync(join(directory, "src/Module.res.mjs"), generated);
        git(directory, "add", "--", "src");
        git(directory, "commit", "--quiet", "--message", "generated output");
        writeFileSync(
          join(directory, "src/Module.res.mjs"),
          `${generated}// drifted\n`,
        );
      }),
    ).not.toBe(0);
  });

  test("rejects generated output that is missing from the worktree", () => {
    expect(
      fixture((directory) => {
        writeFileSync(join(directory, "src/Module.res.mjs"), generated);
        git(directory, "add", "--", "src");
        git(directory, "commit", "--quiet", "--message", "generated output");
        rmSync(join(directory, "src/Module.res.mjs"));
      }),
    ).not.toBe(0);
  });

  test("rejects generated output that is present but untracked", () => {
    expect(
      fixture((directory) => {
        writeFileSync(join(directory, "src/Module.res.mjs"), generated);
        git(directory, "add", "--", "src");
        git(directory, "commit", "--quiet", "--message", "generated output");
        writeFileSync(join(directory, "src/Extra.res.mjs"), generated);
      }),
    ).not.toBe(0);
  });

  test("rejects a repository with no committed production output", () => {
    expect(
      fixture((directory) => {
        writeFileSync(join(directory, "src/Module.res"), "let x = 1\n");
        git(directory, "add", "--", "src");
        git(directory, "commit", "--quiet", "--message", "source only");
      }),
    ).not.toBe(0);
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
