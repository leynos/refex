/**
Generated-output synchronization gate for production ReScript JavaScript.

The ReScript build owns every generated `.res.mjs` file under `src`. This
script rebuilds nothing: `make check-generated` compiles first, then this check
rejects a production artefact that is missing, untracked, or stale against
Git's index. That index is the reviewable baseline, including staged files
during the initial bootstrap, so generated output that is staged but not
committed is still rejected on the next run. ReScript-format ownership makes
hand-editing the output a defect rather than a fix; see
`docs/developers-guide.md`.
*/

import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

function generatedFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return generatedFiles(path);
    return path.endsWith(".res.mjs") ? [path] : [];
  });
}

const tracked = Bun.spawnSync(["git", "ls-files", "-z", "--", "src"]);
assert.equal(tracked.exitCode, 0, "cannot read tracked production files");
const expected = tracked.stdout
  .toString()
  .split("\0")
  .filter((path) => path.endsWith(".res.mjs"))
  .sort();
assert.ok(expected.length > 0, "production JavaScript must be committed");
assert.deepEqual(
  generatedFiles("src").sort(),
  expected,
  "generated file inventory drift",
);
const diff = Bun.spawnSync(["git", "diff", "--exit-code", "--", ...expected], {
  stdout: "inherit",
  stderr: "inherit",
});
assert.equal(
  diff.exitCode,
  0,
  "rebuild and commit production output with the source change",
);
