/**
Archive and package-consumer gate for the published `refex` tarball.

Unlike the contract tests, which inspect metadata, this script inspects the
real produced archive and then installs it into a temporary fixture: a plain
JavaScript consumer exercises the generated `IO` and `Fx` ESM, and a separate
ReScript consumer compiles the multi-module fixture base against the packed
interface and executes its workflow. The archive must
match an explicit allowlist, so the check tests what `bun pm pack` actually
emits rather than what `package.json` claims. Nothing here publishes; see
`docs/developers-guide.md` for the release boundary.
*/

import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const manifest = await Bun.file("package.json").json();
const fixture = mkdtempSync(join(tmpdir(), "refex-package-"));

function run(command, cwd = fixture) {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  assert.equal(
    result.exitCode,
    0,
    `${command.join(" ")}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout.toString();
}

try {
  const archive = join(fixture, "refex.tgz");
  run(
    [process.execPath, "pm", "pack", "--ignore-scripts", "--filename", archive],
    root,
  );
  // Independent of package.json.files: broadening metadata cannot silently
  // admit tests, scripts, coverage or unrelated documentation.
  const allowed = [
    "package/LICENSE",
    "package/README.md",
    "package/package.json",
    "package/rescript.json",
    "package/src/Bootstrap.res",
    "package/src/Bootstrap.resi",
    "package/src/Bootstrap.res.mjs",
    "package/src/IO.res",
    "package/src/IO.resi",
    "package/src/IO.res.mjs",
    "package/src/Fx.res",
    "package/src/Fx.resi",
    "package/src/Fx.res.mjs",
  ].sort();
  const contents = run(["tar", "-tzf", archive]).trim().split("\n").sort();
  assert.deepEqual(
    contents,
    allowed,
    "package archive must contain only the explicit allowlist",
  );
  assert.equal(manifest.license, "ISC");
  assert.ok(
    await Bun.file(join(root, "LICENSE")).exists(),
    "root ISC licence is required",
  );

  const bun = process.execPath;
  writeFileSync(
    join(fixture, "package.json"),
    JSON.stringify({
      name: "refex-consumer-fixture",
      private: true,
      type: "module",
      dependencies: { refex: "file:./refex.tgz" },
      devDependencies: { rescript: manifest.devDependencies.rescript },
    }),
  );
  // Resolve the new temporary fixture once, then verify its frozen install.
  // No project devDependencies or Bun bindings are installed from the archive.
  run([bun, "install", "--ignore-scripts"]);
  run([bun, "install", "--frozen-lockfile", "--ignore-scripts"]);
  assert.equal(
    await Bun.file(
      join(fixture, "node_modules/rescript-bun/package.json"),
    ).exists(),
    false,
  );
  writeFileSync(
    join(fixture, "consumer.mjs"),
    [
      'import * as Fx from "refex/src/Fx.res.mjs";',
      'import * as IO from "refex/src/IO.res.mjs";',
      'for (const name of ["succeed", "map", "flatMap", "provide"]) {',
      '  if (typeof Fx[name] !== "function") throw new Error("Fx." + name + " is not exported");',
      "}",
      'for (const name of ["succeed", "flatMap", "mapError"]) {',
      '  if (typeof IO[name] !== "function") throw new Error("IO." + name + " is not exported");',
      "}",
      "const result = Fx.provide(Fx.map(Fx.succeed(20), value => value + 22), {})();",
      'if (result.TAG !== "Ok" || result._0 !== 42) throw new Error("JavaScript Fx consumer failed");',
      "",
    ].join("\n"),
  );
  run([bun, "consumer.mjs"]);

  writeFileSync(
    join(fixture, "rescript.json"),
    JSON.stringify({
      name: "refex-consumer-fixture",
      sources: ["consumer"],
      dependencies: ["refex"],
      "package-specs": { module: "esmodule", "in-source": true },
      suffix: ".res.mjs",
      warnings: { number: "+A", error: "+A" },
    }),
  );
  mkdirSync(join(fixture, "consumer"));
  cpSync(
    join(root, "tests/fixtures/compiler/fx-surface/base"),
    join(fixture, "consumer"),
    { recursive: true },
  );
  run([bun, "run", "--bun", "rescript", "build"]);
  writeFileSync(
    join(fixture, "check-rescript.mjs"),
    [
      'import {io, projected} from "./consumer/Main.res.mjs";',
      "const workflow = io();",
      'if (workflow.TAG !== "Ok" || workflow._0 !== 42) throw new Error("ReScript workflow failed");',
      "const projection = projected();",
      'if (projection.TAG !== "Ok" || projection._0 !== 7) throw new Error("ReScript projection failed");',
      "",
    ].join("\n"),
  );
  run([bun, "check-rescript.mjs"]);
  console.log(
    `Verified ${contents.length} package files, ISC licence, a JavaScript consumer, and a multi-module ReScript consumer.`,
  );
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
