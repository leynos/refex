/**
@file Package, dependency-update, and coverage assertions for contract suites.

Owns the invariants behind package portability and exact pins, Dependabot
policy, and the coverage and ignore-file agreement. Permitted callers are the
`package-contracts` and `dependency-contracts` suites only. The suites feed both
the real repository and deliberately mutated fixtures through these functions,
so an assertion that accepts everything fails its negative control. These
helpers register no plugin, no generic workflow engine, and no reusable policy
layer; see `docs/developers-guide.md` before extracting anything here.
*/

import assert from "node:assert/strict";

/**
 * Asserts the package stays private, portable, and exactly pinned.
 *
 * Covers the compiler/runtime version match, the absence of a production Bun
 * dependency, the explicit public-module allowlist, and the packaged file
 * inventory. Rejects a publishable package, an inherited licence, or test
 * output reaching the archive.
 */
export function packageContract(metadata, rescript) {
  const compiler = metadata.devDependencies.rescript;
  assert.match(compiler, /^12\.\d+\.\d+$/);
  assert.equal(metadata.dependencies["@rescript/runtime"], compiler);
  for (const version of Object.values({
    ...metadata.dependencies,
    ...metadata.devDependencies,
  })) {
    assert.match(version, /^\d+\.\d+\.\d+$/, "exact stable package pin");
  }
  assert.match(metadata.packageManager, /^bun@\d+\.\d+\.\d+$/);
  assert.equal(metadata.private, true);
  assert.equal(metadata.type, "module");
  assert.equal(metadata.license, "ISC");
  assert.equal(metadata.dependencies["rescript-bun"], undefined);
  assert.ok(metadata.devDependencies["rescript-bun"]);
  assert.equal(rescript.name, metadata.name);
  assert.equal(rescript.namespace, true);
  assert.ok(rescript["dev-dependencies"].includes("rescript-bun"));
  assert.ok(!rescript.dependencies.includes("rescript-bun"));
  assert.deepEqual(
    rescript.sources.find((entry) => entry.dir === "src").public,
    ["Bootstrap"],
  );
  assert.equal(
    rescript.sources.find((entry) => entry.dir === "tests").type,
    "dev",
  );
  assert.deepEqual(rescript["compiler-flags"], [], "no global platform opens");
  for (const legacy of [
    "bs-dependencies",
    "bs-dev-dependencies",
    "bsc-flags",
  ]) {
    assert.equal(rescript[legacy], undefined);
  }
  assert.deepEqual(rescript["package-specs"], {
    module: "esmodule",
    "in-source": true,
  });
  assert.equal(rescript.suffix, ".res.mjs");
  assert.deepEqual(rescript.warnings, { number: "+A", error: "+A" });
  assert.deepEqual(rescript.reanalyze.analysis, ["dce"]);
  assert.deepEqual(rescript.reanalyze.suppress, []);
  assert.equal(metadata.devDependencies["@rescript/core"], undefined);
  assert.equal(metadata.dependencies["@rescript/core"], undefined);
  assert.deepEqual(Object.keys(metadata.exports).sort(), [
    "./package.json",
    "./src/Bootstrap.res.mjs",
  ]);
  assert.equal(
    metadata.exports["./src/Bootstrap.res.mjs"],
    "./src/Bootstrap.res.mjs",
  );
  assert.deepEqual(
    [...metadata.files].sort(),
    [
      "LICENSE",
      "README.md",
      "rescript.json",
      "src/Bootstrap.res",
      "src/Bootstrap.res.mjs",
      "src/Bootstrap.resi",
    ].sort(),
  );
}

/**
 * Asserts Dependabot grouping, cooldowns, and the ReScript 13 exclusion.
 *
 * Grouping must not absorb major updates, and the compiler/runtime major must
 * stay excluded until a migration decision is recorded.
 */
export function dependabotContract(configuration) {
  // Dependabot grouping is an advisory convenience, not a compatibility proof,
  // so the contract pins the shape an update must keep: bounded open PRs, a
  // daily schedule, minor/patch grouping, a cooldown before adoption, and an
  // explicit ReScript 13 exclusion. A dropped exclusion would let a compiler
  // major arrive as an ordinary grouped update, bypassing the migration
  // decision recorded in ADR 001.
  assert.equal(configuration.version, 2, "Dependabot configuration schema");
  const ecosystems = configuration.updates.map((u) => u["package-ecosystem"]);
  assert.deepEqual(
    [...ecosystems].sort(),
    ["bun", "github-actions"],
    "both dependency ecosystems stay covered",
  );
  for (const update of configuration.updates) {
    const where = update["package-ecosystem"];
    assert.equal(update.directory, "/", `${where}: repository root only`);
    assert.equal(update.schedule.interval, "daily", `${where}: daily cadence`);
    assert.ok(
      update["open-pull-requests-limit"] > 0 &&
        update["open-pull-requests-limit"] <= 5,
      `${where}: bounded open pull requests`,
    );
    assert.ok(
      update.labels.includes("dependencies"),
      `${where}: dependency label`,
    );
    const group = update.groups["minor-and-patch"];
    assert.deepEqual(
      group.patterns,
      ["*"],
      `${where}: groups every dependency`,
    );
    assert.deepEqual(
      [...group["update-types"]].sort(),
      ["minor", "patch"],
      `${where}: grouping must not absorb major updates`,
    );
    assert.ok(
      update.cooldown["default-days"] >= 7,
      `${where}: a cooldown delays adoption of a fresh release`,
    );
  }
  const bun = configuration.updates.find(
    (update) => update["package-ecosystem"] === "bun",
  );
  assert.ok(
    bun.cooldown["semver-major-days"] > bun.cooldown["default-days"],
    "major updates wait longer than routine ones",
  );
  const ignored = new Map(
    bun.ignore.map((entry) => [entry["dependency-name"], entry.versions]),
  );
  for (const dependency of ["rescript", "@rescript/runtime"]) {
    assert.deepEqual(
      ignored.get(dependency),
      [">=13.0.0"],
      `${dependency} 13 requires an explicit migration decision`,
    );
  }
}

/**
 * Asserts coverage excludes generated test bodies and they stay untracked.
 *
 * Bun cannot recognise the compiler's `.test.res.mjs` suffix, so the
 * exclusion is by path; the ignore file must agree with it.
 */
export function coverageConfigContract(bunfig, gitignore) {
  // Bun's default test patterns do not recognise the compiler's
  // `.test.res.mjs` suffix, so test bodies are excluded by path instead. The
  // ignore file must keep the same exclusions as tracked patterns, or a
  // generated test artefact would be committed as if it were source.
  assert.match(
    bunfig,
    /^coveragePathIgnorePatterns = \["tests\/\*\*"\]$/m,
    "test bodies must not appear in coverage",
  );
  assert.match(
    bunfig,
    /^\[test\]$/m,
    "the exclusion belongs to Bun's test section",
  );
  for (const entry of ["/lib/", "/coverage/", "/tests/**/*.res.mjs"]) {
    assert.ok(gitignore.includes(entry), `${entry} must stay untracked`);
  }
}
