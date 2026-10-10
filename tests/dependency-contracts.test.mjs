/**
Dependency-update and coverage-configuration contracts.

Dependabot grouping is an advisory convenience, not a compatibility proof, so
the contract pins the shape an update must keep and rejects a configuration
that would let a ReScript major arrive as an ordinary grouped update. The
coverage contract keeps generated test bodies out of coverage and untracked, so
a weakened exclusion fails rather than silently inflating the report.

Shared assertions live in `support/repository-contracts.mjs`; this file owns
only the values it feeds them.
*/

import assert from "node:assert/strict";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseDocument } from "yaml";
import {
  coverageConfigContract,
  dependabotContract,
} from "./support/repository-contracts.mjs";

// Private to this suite: reads the repository's own files, not a generic model.
const source = (path) => readFileSync(path, "utf8");
const yamlFile = (path) => {
  const document = parseDocument(source(path));
  assert.equal(document.errors.length, 0, `${path}: valid YAML`);
  return document.toJS();
};
const dependabot = yamlFile(".github/dependabot.yml");

describe("dependency contracts", () => {
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
});
