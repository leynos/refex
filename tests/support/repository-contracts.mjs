import assert from "node:assert/strict";

// Private to repository-contracts.test.mjs; no generic workflow engine.
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
