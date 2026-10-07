import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
    'import {identity} from "refex/src/Bootstrap.res.mjs";\nif (identity("consumer") !== "consumer") throw new Error("consumer failed");\n',
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
  writeFileSync(
    join(fixture, "consumer/Consumer.res"),
    'let value = Refex.Bootstrap.identity("ReScript consumer")\n',
  );
  run([bun, "run", "--bun", "rescript", "build"]);
  writeFileSync(
    join(fixture, "check-rescript.mjs"),
    'import {value} from "./consumer/Consumer.res.mjs";\nif (value !== "ReScript consumer") throw new Error("ReScript consumer failed");\n',
  );
  run([bun, "check-rescript.mjs"]);
  console.log(
    `Verified ${contents.length} package files, ISC licence and both isolated consumers.`,
  );
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
