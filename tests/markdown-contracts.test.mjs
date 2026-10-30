/**
Markdown toolchain and rule-policy contracts.

The replacement linter must stay braces-free, exactly pinned, and still reach
dot-directories, and the rules chosen deliberately in `.markdownlint.jsonc` must
survive that replacement rather than resetting to the tool's defaults. Both
contracts carry negative controls that reopen an exemption, widen a width, or
silence a rule, so a policy assertion that accepts everything fails here.

Shared assertions live in `support/toolchain-workflow-contracts.mjs`; this
file owns only the values it feeds them.
*/

import { describe, expect, test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  markdownLintContract,
  markdownPolicyContract,
} from "./support/toolchain-workflow-contracts.mjs";

// Private to this suite: reads the repository's own files, not a generic model.
const source = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const jsonc = (path) => JSON.parse(source(path).replace(/^\s*\/\/.*$/gm, ""));
const pkg = json("package.json");

/**
 * Keeps local agent state out of commits and Markdown lint traversal.
 * Private to this suite: these two files jointly own the scratch exclusion.
 */
const agentScratchIgnoreContract = (files) => {
  for (const [path, pattern] of [
    [".gitignore", "/.vtcode/"],
    [".markdownlintignore", ".vtcode/"],
  ]) {
    assert.ok(
      files[path].split("\n").includes(pattern),
      `${path} must exclude local .vtcode state`,
    );
  }
};

const scratchIgnoreFiles = () => ({
  ".gitignore": source(".gitignore"),
  ".markdownlintignore": source(".markdownlintignore"),
});

describe("Markdown contracts", () => {
  test("local agent state stays excluded from Git and Markdown linting", () => {
    agentScratchIgnoreContract(scratchIgnoreFiles());
  });

  test.each([
    [".gitignore", "/.vtcode/"],
    [".markdownlintignore", ".vtcode/"],
  ])("rejects removal of the scratch exclusion from %s", (path, pattern) => {
    const files = scratchIgnoreFiles();
    const mutated = files[path]
      .split("\n")
      .filter((line) => line !== pattern)
      .join("\n");
    expect(mutated).not.toBe(files[path]);
    files[path] = mutated;
    expect(() => agentScratchIgnoreContract(files)).toThrow();
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
});
