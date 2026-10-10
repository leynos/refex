/**
Workflow security contracts.

Each workflow is asserted against the least-privilege rules for its trigger:
unprivileged runs stay read-only, and the privileged Dependabot workflow may
execute nothing at all and may reach only the reviewed metadata action. Negative
controls supply a floating action, a persisted credential, a widened token, an
unfrozen install, and an unprotected live merge, so a contract that accepts
every workflow fails its own fixtures.

Shared assertions live in `support/repository-contracts.mjs`; this file owns
only the values it feeds them.
*/

import assert from "node:assert/strict";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseDocument } from "yaml";
import { workflowContract } from "./support/repository-contracts.mjs";

// Private to this suite: reads the repository's own files, not a generic model.
const source = (path) => readFileSync(path, "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
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
