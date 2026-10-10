/**
Contract assertions shared only by the repository contract suites.

Each export encodes one repository invariant — package portability, the
Markdown toolchain, the spelling gate's cache contract, dependency-update
policy, and workflow security boundaries — and is written to reject a weakened
implementation, not merely to describe the current one. The suites feed both
the real repository and deliberately mutated fixtures through the same
functions, so an assertion that accepts everything fails its negative control.
These helpers are private to those suites and register no plugin, no generic
workflow engine, and no reusable policy layer; see `docs/developers-guide.md`
before extracting anything here.
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
 * Asserts the Markdown toolchain stays free of the vulnerable `braces` chain.
 *
 * The replacement linter must remain exactly pinned and keep `--dot`, or
 * dot-directory Markdown silently leaves the lint surface.
 */
export function markdownLintContract(metadata, makefile) {
  // markdownlint-cli2 resolves micromatch, whose braces dependency carries
  // GHSA-vfj7-8cjw-p6xm with no patched release. markdownlint-cli reaches the
  // same markdownlint 0.41.1 rule engine through tinyglobby and minimatch, so
  // the policy and its findings are unchanged without the vulnerable chain.
  assert.equal(
    metadata.devDependencies["markdownlint-cli2"],
    undefined,
    "the braces-bearing linter must not return",
  );
  assert.equal(
    metadata.devDependencies["markdownlint-cli"],
    "0.49.1",
    "exact Markdown linter pin",
  );
  assert.match(
    makefile,
    /^MDLINT = .*markdownlint --dot$/m,
    "--dot keeps dot-directory coverage on the replacement linter",
  );
}

/**
 * Asserts the uv cache and tool directories are defaults, not overrides.
 *
 * A CI provisioner exports its own location and fails its post-job cache
 * save when uv writes elsewhere, so the environment has to win.
 */
export function spellingGateContract(makefile) {
  // A CI provisioner exporting UV_CACHE_DIR (astral-sh/setup-uv does) fails
  // its post-job cache save when uv wrote to a different directory. The
  // Makefile must therefore default these rather than override them, so the
  // provisioner's location wins and the step does not skip the cached work.
  for (const variable of ["UV_CACHE_DIR", "UV_TOOL_DIR"]) {
    assert.match(
      makefile,
      new RegExp(`^${variable} \\?= \\S+$`, "m"),
      `${variable} must be a default so the environment can override it`,
    );
    assert.equal(
      makefile.includes(`${variable}=.uv-`),
      false,
      `${variable} must not be assigned inline, which overrides the environment`,
    );
  }
  assert.match(
    makefile,
    /^TYPOS_CONFIG_BUILDER = UV_CACHE_DIR=\$\(UV_CACHE_DIR\)/m,
    "the gate forwards whatever location was resolved",
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
  // weekly schedule, minor/patch grouping, a cooldown before adoption, and an
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
    assert.equal(
      update.schedule.interval,
      "weekly",
      `${where}: weekly cadence`,
    );
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
 * Asserts the deliberate Markdown rules and ignore paths survive a linter swap.
 *
 * Restates only the rules that were chosen deliberately, so replacing the
 * linter cannot quietly reset the policy to its defaults.
 */
export function markdownPolicyContract(rules, ignorePatterns) {
  // The replacement linter reaches the same `markdownlint` rule engine, but
  // only if this policy survives the swap. Assert the rules that were chosen
  // deliberately rather than restating an empty default.
  assert.equal(rules.MD004.style, "dash", "dash bullets");
  assert.deepEqual(
    rules.MD010,
    { code_blocks: false },
    "code blocks keep tabs",
  );
  assert.equal(rules.MD013.line_length, 80, "prose wraps at 80 columns");
  assert.equal(
    rules.MD013.code_block_line_length,
    120,
    "code blocks wrap at 120 columns",
  );
  assert.equal(rules.MD013.tables, false, "tables are exempt from wrapping");
  assert.equal(
    rules.MD013.headings,
    false,
    "headings are exempt from wrapping",
  );
  assert.equal(rules.MD029.style, "ordered", "ordered lists use numbers");
  const ignored = ignorePatterns.map((entry) => entry.replace(/\/$/, ""));
  for (const path of [
    "node_modules",
    "lib",
    "coverage",
    ".uv-cache",
    ".uv-tools",
  ]) {
    assert.ok(
      ignored.includes(path),
      `${path} must stay excluded from Markdown linting`,
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

/**
 * Asserts one workflow's security boundaries, pins, and required commands.
 *
 * Applies the unprivileged or privileged rules by trigger, then adds the
 * assertions specific to `ci.yml` and `audit.yml`. Caller-side only: this does
 * not claim hosted execution of the reusable callee.
 */
export function workflowContract(name, workflow, bunVersion) {
  const privileged = Object.hasOwn(workflow.on, "pull_request_target");
  if (!privileged) assert.deepEqual(workflow.permissions, { contents: "read" });
  else assert.deepEqual(workflow.permissions, {});
  assert.ok(workflow.concurrency?.group, `${name}: bounded overlapping runs`);
  for (const job of Object.values(workflow.jobs)) {
    if (job.uses) assert.match(job.uses, /@[a-f0-9]{40}$/);
    if (job.steps) {
      assert.ok(job["timeout-minutes"] > 0 && job["timeout-minutes"] <= 15);
      if (!privileged && job.permissions)
        assert.deepEqual(job.permissions, { contents: "read" });
      for (const step of job.steps) {
        if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
        if (step.uses?.startsWith("actions/checkout@")) {
          assert.equal(step.with?.["persist-credentials"], false);
          assert.equal(
            step.with?.ref,
            undefined,
            "ordinary checkout uses the safe event default",
          );
        }
        if (step.uses?.startsWith("oven-sh/setup-bun@")) {
          assert.equal(step.with["bun-version"], bunVersion);
        }
        if (privileged) {
          assert.equal(
            step.run,
            undefined,
            "pull_request_target cannot execute commands",
          );
          assert.match(
            step.uses,
            /^dependabot\/fetch-metadata@[a-f0-9]{40}$/,
            "only reviewed metadata action is permitted, never checkout or PR code",
          );
          assert.equal(step.with?.["skip-verification"], undefined);
        }
      }
    }
    if (privileged && job.uses) {
      assert.match(
        job.uses,
        /^leynos\/shared-actions\/\.github\/workflows\/dependabot-automerge.yml@[a-f0-9]{40}$/,
      );
      assert.equal(job.with["merge-method"], "squash");
      assert.equal(
        job.with["dry-run"],
        true,
        "activate only after required verify protection exists",
      );
      assert.deepEqual(job.permissions, {
        contents: "write",
        "pull-requests": "write",
        checks: "read",
        statuses: "read",
        "id-token": "write",
      });
    }
  }
  if (name === "audit.yml") {
    // The audit is the compensating control for Dependabot PRs skipping the
    // advisory step, so it must actually run on a schedule and dispatch, and
    // must actually invoke the audit target rather than a weaker command.
    assert.ok(
      Object.hasOwn(workflow.on, "schedule"),
      "the scheduled audit is the compensating control",
    );
    assert.match(
      workflow.on.schedule[0].cron,
      /^\d+ \d+ \* \* \d$/,
      "a weekly cron, not a one-off date",
    );
    assert.ok(Object.hasOwn(workflow.on, "workflow_dispatch"));
    const commands = workflow.jobs.audit.steps
      .filter((step) => step.run)
      .map((step) => step.run);
    assert.ok(
      commands.includes("make audit"),
      "the workflow must run the real audit target",
    );
    assert.ok(
      commands.includes("bun install --frozen-lockfile"),
      "the audit runs against the committed lockfile",
    );
  }
  if (name === "ci.yml") {
    assert.ok(Object.hasOwn(workflow.on, "pull_request"));
    assert.ok(Object.hasOwn(workflow.on, "workflow_dispatch"));
    assert.deepEqual(workflow.on.push.branches, ["main"]);
    assert.equal(workflow.concurrency["cancel-in-progress"], true);
    const commands = workflow.jobs.verify.steps
      .filter((step) => step.run)
      .map((step) => step.run);
    assert.ok(commands.includes("bun install --frozen-lockfile"));
    assert.ok(commands.includes("make all"));
    assert.ok(commands.includes("make coverage"));
    assert.ok(
      commands.every((command) =>
        [
          "bun install --frozen-lockfile",
          "make all",
          "make coverage",
          "make audit",
        ].includes(command),
      ),
    );
    const audit = workflow.jobs.verify.steps.find(
      (step) => step.run === "make audit",
    );
    assert.equal(
      audit.if,
      "github.event.pull_request.user.login != 'dependabot[bot]'",
    );
  }
  if (privileged) {
    assert.equal(
      workflow.jobs.metadata.if,
      "github.event_name == 'pull_request_target' && github.actor == 'dependabot[bot]' && github.event.pull_request.user.login == 'dependabot[bot]'",
    );
    assert.equal(workflow.jobs.automerge.needs, "metadata");
    assert.equal(
      workflow.jobs.automerge.if,
      "needs.metadata.outputs.update-type == 'version-update:semver-minor' || needs.metadata.outputs.update-type == 'version-update:semver-patch'",
    );
    assert.equal(
      workflow.jobs["manual-preview"].if,
      "github.event_name == 'workflow_dispatch'",
    );
  }
}
