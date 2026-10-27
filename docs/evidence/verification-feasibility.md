# Evidence: verification feasibility (FX-1)

Status: tool-capability evidence for roadmap task 1.1.5, not refex conformance.
Date: 17 October 2026. Pins: ReScript 12.3.1, LemmaScript 0.6.4, TypeScript
5.9.3, bignumber.js 11.1.5, Dafny 4.11.0, Z3 4.12.1, Bun 1.4.2.

## Claim

FX-1 asks which constructs that
[ADR 007](../adr-007-shared-work-lifecycle-contract.md)'s representation
guidance and [ADR 006](../adr-006-complete-outcomes.md)'s cause model rely on
can be verified against the compiler's own JavaScript by the
`rescript-deductive-verification` route, and whether that route can state
lemmas of the shape a 1.3.3 proof would need. It runs disposable toy modules in
a scratch directory. Nothing here is refex source, and no refex property is
proved.

## Pins and environment

| Item             | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host             | Linux 6.12.0-211.62.1.el10_2.x86_64 (Rocky 10)                                                                                                                                                                                                                                                                                                                                                                                                        |
| Bun              | 1.4.2                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ReScript         | 12.3.1, with genType (`{"language": "typescript", "generatedFileExtension": ".gen.ts"}`)                                                                                                                                                                                                                                                                                                                                                              |
| LemmaScript      | 0.6.4, `sha512-rnAnCt36hmAhu7RjlbrY6ky5kDcTfk9Tv1q+0rxaVJJqiQ7uH5fgYgNuyA0MXmeujuegCsm2OWrc99fwJunhAg==`, binary `tools/dist/lsc.js`                                                                                                                                                                                                                                                                                                                  |
| TypeScript       | 5.9.3 (the bridge uses the TypeScript 5 compiler API)                                                                                                                                                                                                                                                                                                                                                                                                 |
| bignumber.js     | 11.1.5                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Dafny            | 4.11.0+fcb2042d6d043a2634f0854338c08feeaaaf4ae2                                                                                                                                                                                                                                                                                                                                                                                                       |
| Z3               | 4.12.1, `z3-4.12.1-x64-glibc-2.35.zip`, SHA-256 `c5360fd157b0f861ec8780ba3e51e2197e9486798dc93cd878df69a4b0c2b7c5`                                                                                                                                                                                                                                                                                                                                    |
| Bridge scripts   | `res2ls-bridge.mjs` `8b2e62b3be90b2ac327e406ade544e71c7c0940cc2bcd58f0593b5e3bc851b76`, `res2ls-correspond.mjs` `96cfee1eddb78ae25a7b9cfbd2e1bcd3a232894fac64900258d4e74d8f274036`, `res2ls-mutate.mjs` `d2060149ea7c98d0499a20b2d39aeabb4286e97febd697dd2e680d3d9c89c274`, copied unchanged from the `rescript-deductive-verification` skill's `references/examples/` and embedded in full in the appendix, because they are not published elsewhere |
| Scratch lockfile | `bun.lock` SHA-256 `caf000a69fef02fe64811004f29ec39b6feca005d7b8ace450a7a08e734921c8`                                                                                                                                                                                                                                                                                                                                                                 |

## Procedure

In an empty scratch directory, write `package.json` as
`{"name":"refex-fx1","private":true,"type":"module"}` and the `rescript.json`
below, install the pins once, copy the three bridge scripts from the skill, and
place the toy sources, mutant catalogues, `fail-closed.mjs`, and `run-fx1.sh`
from this record:

Install the two native tools from their releases and verify each archive:

- Dafny 4.11.0:
  `https://github.com/dafny-lang/dafny/releases/download/v4.11.0/dafny-4.11.0-x64-ubuntu-22.04.zip`,
  SHA-256 `a46a9ff7cdd720f7955854c78e95df13f4cfe6b80691b05f8654fe19e8267179`.
  Unpack it and set `DAFNY_HOME` to the directory holding `dafny`, or put
  `dafny` on `PATH`.
- Z3 4.12.1:
  `https://github.com/Z3Prover/z3/releases/download/z3-4.12.1/z3-4.12.1-x64-glibc-2.35.zip`,
  SHA-256 `c5360fd157b0f861ec8780ba3e51e2197e9486798dc93cd878df69a4b0c2b7c5`.
  Unpack it and set `Z3_HOME` to the unpacked `z3-4.12.1-x64-glibc-2.35`
  directory.

Then, with Bun 1.4.2 on `PATH`:

```sh
bun add --exact rescript@12.3.1 @rescript/runtime@12.3.1 lemmascript@0.6.4 typescript@5.9.3 bignumber.js@11.1.5
chmod +x run-fx1.sh check-f9.sh
Z3_HOME=/path/to/z3-4.12.1-x64-glibc-2.35 DAFNY_HOME=/path/to/dafny ./run-fx1.sh
```

The runner checks the Bun, Z3, and Dafny versions and stops on any mismatch. It
regenerates each module's `.verify` directory from empty and exits non-zero on
any hole. `MODULES` limits a rerun to named modules, and `SKIP_F9=1` skips the
expected-failure probe.

```json
{"name":"refex-fx1","namespace":false,"sources":[{"dir":"src"}],
 "package-specs":{"module":"esmodule","in-source":true},"suffix":".res.mjs",
 "warnings":{"number":"+A","error":"+A"},
 "gentypeconfig":{"language":"typescript","generatedFileExtension":".gen.ts"}}
```

Control: before the toys, the skill's own `VerifiedLease` example verified ("5
verified, 0 errors") and its 13 mutants were all killed, so the toolchain
itself was sound on this host.

Budget: the plan allowed 25 prover runs, counting a mutation sweep as one. FX-1
reached its verdict in 23, including the two control runs and the final pass,
within the one-day limit. Milestone review then found that the toy's
`wellFormed` admitted a non-zero `lastStarted` in `Acquiring` and `Open`, which
ADR 007's INV-15 forbids. The predicate was tightened, a mutant added, and
Lifecycle re-proved: two more runs, for 25 in total.

## Feature verdicts

| Feature | Construct                                                 | Verdict                   | Notes                                                                                                                                                                    |
| ------- | --------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1      | `@tag` variant with a record payload on every constructor | Supported                 | Phases, events, commands, and causes all translate to Dafny datatypes                                                                                                    |
| F2      | Event and command variants of the same shape              | Supported                 |                                                                                                                                                                          |
| F3      | Array with removal through `Array.filter`                 | Supported                 | Leases; children arrays use `Array.map`                                                                                                                                  |
| F4      | Output command arrays                                     | Supported                 | Array literals and `Array.concat`                                                                                                                                        |
| F5      | Append-only history                                       | Supported                 | `Array.concat(history, [entry])`; length growth proved                                                                                                                   |
| F6      | String equality on identities                             | Supported                 | Owners, callers, and the `target` discriminator                                                                                                                          |
| F7      | Bounded `int` counter, bound in a `config` record         | Supported                 | The bridge's int32 model applies; bound checks keep counters in range                                                                                                    |
| F8      | Two generations in one state record                       | Supported                 | `result.state.previous === state.previous` proved as a frame                                                                                                             |
| F9      | Recursive fold of a step function over an event array     | Unsupported               | Tail recursion compiles to `while (true)`; a non-tail fold needs a `decreases` clause the bridge cannot attach; the int32 model of `index + 1` also needs a length bound |
| F10     | Recursion through array children of a tree                | Supported with workaround | Verifies with a non-`int` leaf payload; with an `int` field, the bridge's int32 typing precondition on the recursive call cannot be discharged                           |
| F11     | Record field holding a function                           | Supported                 | Identity preserved and checked by a mutant                                                                                                                               |

## Obligation outcomes

Each obligation is reported separately. "Mutants" names the catalogue entries
whose failure demonstrates that the contract is checked.

| Obligation       | Contract                                                                                                                  | Outcome                  | Mutants killed on it                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| FX-L1            | `step` preserves `wellFormed`, including INV-15's `lastStarted == 0` in `Acquiring` and `Open`                            | Verified                 | `wrap-attempt`, `open-advances-attempt`                                              |
| FX-L2            | PR-1: a close on `Open` starts exactly one attempt                                                                        | Verified                 | `close-recovers`, `refuses-everything`                                               |
| FX-L2            | PR-7: a close in flight joins the current attempt                                                                         | Verified                 | `join-wrong-attempt`, `refuse-join`, `duplicate-start`, `refuses-everything`         |
| FX-L3            | A stale or other-generation settlement keeps owner, phase, attempt, and the other generation, appending one history entry | Verified                 | `stale-other-generation`                                                             |
| FX-L4            | A started attempt is `lastStarted + 1`                                                                                    | Verified per step        | `numbering-skips`, `duplicate-start`                                                 |
| FX-L5            | Recovery at `maxAttempt` is refused, never wrapped                                                                        | Verified                 | `bound-joins`                                                                        |
| FX-L6            | The fold over close requests in flight starts nothing                                                                     | Not verified (F9)        | none                                                                                 |
| FX-C1            | `mapExpected` keeps the node kind, child count, and child kinds                                                           | Verified, one level deep | `expected-becomes-defect`, `sequential-drops-children`, `parallel-flattens-children` |
| FX-C2            | `mapExpected` keeps defect and provenance leaves                                                                          | Verified at the node     | `defect-loses-message`, `provenance-forged`                                          |
| Helper contracts | `refuse` (7 contracts) and `settle` (7 contracts) exact effects                                                           | Verified                 | one mutant each, listed in the catalogue                                             |

The Lifecycle catalogue has 24 mutants and the cause-tree catalogue 6. The
final passes killed all 30 on exactly their listed contracts. Writing the
catalogue also found a specification gap: `settle` first had no contract
distinguishing a successful settlement from a failed one, so a mutant recording
a failure as a release would have survived. Two exact-effect contracts were
added before the sweep.

## Representation rules discovered

Each rule below came from a concrete failure in this experiment. ADR 007 adopts
them as binding guidance for task 1.3.3.

1. Pass no closures that build variant values. Higher-order helpers whose
   lambdas return tagged objects did not translate; first-order helpers did.
2. Never give a parameter the name of a type, and never name a record type
   like a variant tag. `state: state`, `cause: cause`, and a `provenance`
   record beside a `provenance` tag each collided with Dafny constructors.
3. Keep predicates used in contracts free of compiled `let` bindings. Switch on
   parameters rather than field projections, build records field by field
   rather than with spread, and give each helper a contract where the compiler
   inlines a `let` regardless. A compiled `let` makes LemmaScript emit an
   opaque method rather than a function.
4. Write one property per `@ensures` when the conclusion is a conjunction.
   LemmaScript splits a top-level conjunction into separate Dafny
   postconditions, which defeats the mutation harness's mapping.
5. Avoid tail recursion where a proof needs recursion: the compiler emits a
   loop. Trace properties stay per-step lemmas unless the bridge gains a
   `decreases` attribute.
6. Keep `int` fields out of recursive variants that need proof, or extend the
   bridge's typing predicate to recurse through children.
7. Mutants must construct values through typed paths. An untyped object
   literal in edited JavaScript fails translation and is not a kill.

The toy uses `@@warning("-4")` for catch-all match arms. Production code keeps
`+A` and enumerates constructors instead.

## Trusted base and limits

- Trusted: the ReScript compiler and genType's description of runtime shapes;
  the bridge's contract attachment, typing predicates, and int32 prelude;
  LemmaScript's translation; Dafny 4.11.0; and Z3 4.12.1. The correspondence
  audit compared every compiled function with the verified unit, so function
  bodies are the shipped JavaScript; the additions around them stay trusted.
- `Fold.res`'s doc comment was corrected after the final pass. Its compiled
  `Fold.res.mjs` is byte-identical to the audited one (SHA-256
  `9740fdd41435094dca9906e007fb96b6de0e0b86bcd2aca4518c2f783167c1a7`), so the
  F9 result stands.
- After the final passes, review asked that a `MODULES` rerun check only the
  modules it regenerated. `run-fx1.sh` now passes `$MODULES` to
  `fail-closed.mjs`, which checks only the modules it is given, or all of them
  when it is given none. The passes above ran the earlier versions, which
  checked both modules. Both versions are fail-closed, and no prover run was
  repeated, because the budget was spent.
- The F9 probe's expected failure is now checked fail-closed by
  `check-f9.sh`, which the runner calls. The probe must have failed, and failed
  for the missing termination measure, so an unexpected pass or an unrelated
  failure fails the run. The check was exercised on the recorded probe output
  without a further prover run, and an output without the expected message was
  rejected.
- Review asked whether the F9 postcondition `result === 0` is vacuous,
  because the `closing` precondition makes the `Start` branch unreachable. It
  is not vacuous. The precondition is satisfiable, it mirrors L-4's antecedent
  (an attempt in flight), and a `step` that emitted `Start` while closing would
  falsify the postcondition. The unreachable branch is the property itself. No
  claim rests on F9 either way, because it did not verify.
- The runner's pin check was made exact after the final passes. The passes
  used prefix matching, but the versions they printed were exactly Bun 1.4.2,
  Z3 4.12.1, and Dafny 4.11.0, so the result is unchanged. `PINS_ONLY=1` runs
  only the check, which passes with the pinned tools and rejects Bun 1.4.4.
- Review of the embedded bridge scripts found three limits in this part of
  the trusted base. The scripts are unchanged copies pinned by hash, so the
  limits are recorded here, and ADR 007 makes closing or guarding them a 1.3.3
  gate obligation. None of them affected this experiment.
  - `toLemmaScript` rewrites `result` inside quoted contract literals too.
    No contract here quotes the word.
  - `buildUnit` starts at the first function, dropping top-level
    non-function bindings, and the correspondence audit compares only
    functions. The toys have no such bindings.
  - The int32 typing predicate does not traverse array elements. That is the
    mechanism behind the F10 `int` failure recorded above.
- No `assume`, `{:axiom}`, `{:verify false}`, `decreases *`, `//@ extern`, or
  hand-edited `.dfy` was used; `fail-closed.mjs` checks the generated Dafny for
  the first four.
- The translation check (`dafny translate js` with a differential run) was not
  run, because the toys are disposable; the 1.3.3 gate must include it.
- Contracts cover single steps and one level of the cause tree. Liveness,
  scheduling, cancellation, timers, promises, and stack depth remain outside
  this route and need conformance tests.
- Wall time on this host: about 15 seconds per Lifecycle proof, 3 seconds per
  cause-tree proof, and five to six minutes per 23-mutant sweep.
- Maintenance: LemmaScript is a technology preview. Every pin change, contract
  change, or reducer change needs a full rerun, and the representation rules
  above constrain how the production reducer is written.

## Verdict

Revise. F1 to F8 are supported, and FX-L1 to FX-L5 verify with a clean audit
and a full mutant kill, but only after representation changes, which ADR 007
now records as binding guidance. The lifecycle reducer is therefore selected
for machine-checked proof of the per-step lemmas L-1, L-2, L-3, and L-5, and of
L-4 and L-6 in their per-step form; their trace forms stay induction arguments
recorded as unverified, because F9 is unsupported. Cause mapping (LC-1 to LC-4)
is selected subject to rule 6 and to stating deep shape preservation, which
FX-1 checked only one level deep. Bounded enumeration of the production reducer
remains the mandatory gate in every case.

These results concern the tool on toy modules and are not evidence about refex.

## Final run transcript

Excerpts of the final passes, each from empty output directories: Lifecycle
from the INV-15 rerun (`MODULES=Lifecycle SKIP_F9=1`), then CauseTree and the
F9 probe from the preceding full pass.

```plaintext
identical to production: inFlightAttempt, attemptMatches, generationWellFormed, wellFormed, withCurrent, refuse,
  enter, startClosing, startRecovering, settle, step
Dafny program verifier finished with 10 verified, 0 errors
killed refuse-keeps-history
killed refuse-changes-phase
killed refuse-bumps-attempt
killed refuse-changes-owner
killed refuse-drops-previous
killed refuse-wrong-command
killed refuse-doubles-command
killed enter-changes-owner
killed enter-drops-previous
killed stale-accept
killed settle-bumps-attempt
killed settle-releases-other-attempt
killed success-records-failure
killed failure-records-release
killed wrap-attempt
killed open-advances-attempt
killed close-recovers
killed join-wrong-attempt
killed refuse-join
killed duplicate-start
killed bound-joins
killed stale-other-generation
killed numbering-skips
killed refuses-everything
24/24 mutants killed
fail-closed: Lifecycle, CauseTree clean
real    8m34.091s
identical to production: mapExpected
Dafny program verifier finished with 6 verified, 0 errors
killed expected-becomes-defect
killed expected-keeps-old-error
killed defect-loses-message
killed provenance-forged
killed sequential-drops-children
killed parallel-flattens-children
6/6 mutants killed
fail-closed: Lifecycle, CauseTree clean
identical to production: step, startsFrom
F9 probe exit 1
      1 Dafny program verifier finished with 4 verified, 2 errors
      1 Error: a precondition for this call could not be proved
      1 Error: cannot prove termination; try supplying a decreases clause
real    6m1.778s
```

## Appendix: sources

The exact files run, with SHA-256 values. Contract strings in ReScript
attributes cannot be wrapped, so this appendix is exempt from the code-block
width rule.

<!-- markdownlint-disable MD013 -->

### `run-fx1.sh`

SHA-256 `06de149a2619d32f7b862f6b5c9681e6a65feb1c050ab025595148decd5758a9`.

```sh
#!/usr/bin/env bash
# FX-1 runner: regenerates verification artefacts from empty output directories and fails closed.
# Requires: Bun 1.4.2 on PATH; Z3_HOME pointing at the unpacked z3-4.12.1-x64-glibc-2.35 directory; Dafny 4.11.0
# either on PATH or under DAFNY_HOME. MODULES selects the modules to rerun (default: all); SKIP_F9=1 skips the
# F9 feature probe. fail-closed.mjs checks the modules that this run regenerated.
set -euo pipefail
: "${Z3_HOME:?set Z3_HOME to the unpacked z3-4.12.1 directory}"
export PATH="$Z3_HOME/bin${DAFNY_HOME:+:$DAFNY_HOME}:$PATH"
MODULES="${MODULES:-Lifecycle CauseTree}"
LSC=node_modules/lemmascript/tools/dist/lsc.js
# Exact version-token comparison: `1.4.20` must not pass for `1.4.2`.
expect() { [[ "$2" == "$3" ]] || { echo "pin mismatch: $1 is '$2', expected '$3'" >&2; exit 2; }; }
expect bun "$(bun --version)" "1.4.2"
expect z3 "$(z3 --version | awk '{print $3}')" "4.12.1"   # "Z3 version 4.12.1 - 64 bit"
expect dafny "$(dafny --version | cut -d+ -f1)" "4.11.0"  # "4.11.0+<commit>"
if [[ "${PINS_ONLY:-0}" == 1 ]]; then echo "pins: bun 1.4.2, z3 4.12.1, dafny 4.11.0"; exit 0; fi
bun install --frozen-lockfile
bunx rescript build
for m in $MODULES; do
  d=.verify/$m; rm -rf "$d"; mkdir -p "$d"
  bun res2ls-bridge.mjs "src/$m.res" "$d" | tee "$d/bridge.out"; echo "${PIPESTATUS[0]}" > "$d/bridge.status"
  bun res2ls-correspond.mjs "src/$m.res" "$d" | tee "$d/correspond.out"; echo "${PIPESTATUS[0]}" > "$d/correspond.status"
  bun "$LSC" check --backend=dafny "$d/$m.ts" | tee "$d/check.out"; echo "${PIPESTATUS[0]}" > "$d/check.status"
  bun res2ls-mutate.mjs "src/$m.res" "src/$m.mutants.mjs" "$d/mutants" "$LSC" | tee "$d/mutate.out"
  echo "${PIPESTATUS[0]}" > "$d/mutate.status"
done
bun fail-closed.mjs $MODULES
if [[ "${SKIP_F9:-0}" != 1 ]]; then
  # Feature probe F9 is expected to fail; it is recorded, never counted towards acceptance.
  rm -rf .verify/Fold; mkdir -p .verify/Fold
  bun res2ls-bridge.mjs src/Fold.res .verify/Fold > /dev/null
  bun res2ls-correspond.mjs src/Fold.res .verify/Fold
  set +e; bun "$LSC" check --backend=dafny .verify/Fold/Fold.ts > .verify/Fold/check.out 2>&1
  echo "$?" > .verify/Fold/check.status; set -e
  echo "F9 probe exit $(cat .verify/Fold/check.status)"
  grep -E 'Error:|verified' .verify/Fold/check.out | sed -E 's/^Fold.dfy\([0-9]+,[0-9]+\): //' | sort | uniq -c
  ./check-f9.sh
fi
```

### `fail-closed.mjs`

SHA-256 `73d34b7ca4eac6891a160308147967559e3ab38fac3a886411a49a0af74b38ba`.

```js
/**
@file FX-1 fail-closed check. Reads the artefacts that run-fx1.sh leaves under .verify/<Module> and exits non-zero on any
hole: a missing or failing stage status, a Dafny summary with errors or an unexpected verified count, a forbidden proof
escape in the generated Dafny, an audit that compared fewer functions than the module exports, or a mutant that was
not killed. A crash or timeout leaves a missing status file, which is a failure, never a pass.
*/
import { existsSync, readFileSync } from "node:fs";

const EXPECTED = { Lifecycle: { verified: 10, mutants: 24 }, CauseTree: { verified: 6, mutants: 6 } };
// Modules named on the command line are checked; with none, every module is.
const selected = process.argv.slice(2);
const MODULES = Object.fromEntries(
  Object.entries(EXPECTED).filter(([name]) => selected.length === 0 || selected.includes(name)),
);
if (selected.some((name) => !(name in EXPECTED))) {
  console.error(`unknown module in ${selected.join(", ")}`);
  process.exit(1);
}
const FORBIDDEN = ["assume", "{:axiom}", "{:verify false}", "decreases *"];
const problems = [];
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : null);

for (const [name, expected] of Object.entries(MODULES)) {
  const dir = `.verify/${name}`;
  for (const stage of ["bridge", "correspond", "check", "mutate"]) {
    const status = read(`${dir}/${stage}.status`);
    if (status?.trim() !== "0") problems.push(`${name}: stage ${stage} status ${status?.trim() ?? "missing"}`);
  }
  const check = read(`${dir}/check.out`) ?? "";
  const summary = check.match(/finished with (\d+) verified, (\d+) errors/);
  if (!summary || Number(summary[2]) !== 0 || Number(summary[1]) !== expected.verified) {
    problems.push(`${name}: Dafny summary ${summary?.[0] ?? "missing"}, expected ${expected.verified} verified, 0 errors`);
  }
  const dfy = read(`${dir}/${name}.dfy`) ?? "";
  for (const token of FORBIDDEN) if (dfy.includes(token)) problems.push(`${name}: generated Dafny contains ${token}`);
  const exported = [...(read(`src/${name}.res.mjs`) ?? "").matchAll(/^function (\w+)\(/gm)].map((m) => m[1]);
  const audited = (read(`${dir}/correspond.out`) ?? "").match(/identical to production: (.*)/)?.[1].split(", ") ?? [];
  const missing = exported.filter((fn) => !audited.includes(fn));
  if (exported.length === 0 || missing.length > 0) problems.push(`${name}: audit missed ${missing.join(", ") || "all"}`);
  const killed = (read(`${dir}/mutate.out`) ?? "").match(/(\d+)\/(\d+) mutants killed/);
  if (!killed || killed[1] !== killed[2] || Number(killed[2]) !== expected.mutants) {
    problems.push(`${name}: mutants ${killed?.[0] ?? "missing"}, expected ${expected.mutants}/${expected.mutants}`);
  }
}
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`fail-closed: ${Object.keys(MODULES).join(", ")} clean`);
```

### `check-f9.sh`

SHA-256 `23f19db8df309e4e9f576898dfcf233d6a0adb524b570d204e50239cb8087a1f`.

```sh
#!/usr/bin/env bash
# Fail-closed check of the F9 probe: it must have run, failed, and failed for the expected reason (no termination
# measure), so an unexpected pass or an unrelated failure fails the FX-1 run.
set -euo pipefail
out=.verify/Fold/check.out
status=$(cat .verify/Fold/check.status 2>/dev/null || echo missing)
[[ -f "$out" ]] || { echo "F9: no probe output" >&2; exit 1; }
[[ "$status" != 0 && "$status" != missing ]] || { echo "F9: probe status $status, expected a failure" >&2; exit 1; }
grep -q 'cannot prove termination; try supplying a decreases clause' "$out" \
  || { echo "F9: probe failed for an unexpected reason" >&2; exit 1; }
echo "F9: expected failure confirmed (status $status, missing termination measure)"
```

### `res2ls-bridge.mjs`

SHA-256 `8b2e62b3be90b2ac327e406ade544e71c7c0940cc2bcd58f0593b5e3bc851b76`.

```js
/**
@file res2ls bridge: turn one compiled ReScript module into a LemmaScript
verification unit, using only compiler output and the contracts written on the
ReScript declarations.

  bun res2ls-bridge.mjs <path/to/Module.res> <out-dir>

Inputs, all produced by the ReScript 12 toolchain from `Module.res`:

- `Module.res.mjs`: the production JavaScript, used verbatim as the bodies
  (in-source output with the `.res.mjs` suffix);
- `Module.gen.ts`: genType's TypeScript view of the runtime types;
- `bsc -only-parse -dparsetree`: the `@requires` and `@ensures` attributes;
- `rescript-tools doc`: ReScript-level types, to tell `int` from `float`.

Outputs: `<out-dir>/Module.ts`, the unit `lsc check --backend=dafny` proves,
and `<out-dir>/Module.manifest.json`, which ties the unit to the hashes of its
inputs for `res2ls-correspond.mjs`.

The unit differs from the production JavaScript only by insertion (types,
`//@` lines, a prelude) and two reversible rewrites, both undone by the
correspondence audit:

- `e | 0` becomes `int32(e)`, because LemmaScript lowers `|` without int32
  wrap-around. TRUSTED: the prelude's `int32` equals `| 0` on safe integers.
- compiler-generated locals such as `by$1` become `by__1`, because `$` is not
  a Dafny identifier character. Names containing `__`, or a `$` that is not a
  trailing number, are refused so that the audit's reversal is exact.

Contract strings come from Printast, which prints each non-ASCII byte as a
three-digit decimal escape; they are decoded as UTF-8, strictly.
*/

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import ts from "typescript";

export const BRIDGE_VERSION = "1";

/** Returns the hex SHA-256 digest of `text`. */
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/** Directory holding `bsc.exe` and `rescript-tools.exe` for this host. */
export function rescriptBin(fromDir = process.cwd()) {
  if (process.env.RESCRIPT_BIN) {
    return process.env.RESCRIPT_BIN;
  }
  const require = createRequire(join(fromDir, "package.json"));
  const pkg = `@rescript/${process.platform}-${process.arch}/package.json`;
  return join(dirname(require.resolve(pkg)), "bin");
}

// ── Contracts from the ReScript parse tree ──────────────────────────────

const CONTRACT_ATTRIBUTES = new Set(["requires", "ensures"]);
const OCAML_ESCAPES = {
  n: "\n",
  t: "\t",
  r: "\r",
  b: "\b",
  "\\": "\\",
  '"': '"',
  "'": "'",
  " ": " ",
};

/**
 * Decodes an OCaml string literal as the compiler's Printast prints it.
 * Printast escapes each non-ASCII byte as exactly three decimal digits, so
 * the literal is a byte string: collect the bytes, then decode them as UTF-8,
 * refusing anything malformed rather than guessing.
 */
export function ocamlString(literal) {
  const bytes = [];
  for (let i = 1; i < literal.length - 1; i++) {
    const char = literal[i];
    if (char !== "\\") {
      bytes.push(...new TextEncoder().encode(char));
      continue;
    }
    i++;
    const escaped = literal[i];
    if (escaped in OCAML_ESCAPES) {
      bytes.push(OCAML_ESCAPES[escaped].charCodeAt(0));
    } else if (/[0-9]/.test(escaped)) {
      const digits = literal.slice(i, i + 3);
      if (!/^[0-9]{3}$/.test(digits) || Number(digits) > 255) {
        throw new Error(`malformed decimal escape \\${digits} in ${literal}`);
      }
      bytes.push(Number(digits));
      i += 2;
    } else {
      throw new Error(`unsupported escape \\${escaped} in ${literal}`);
    }
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(bytes),
  );
}

/**
 * Maps each top-level value name to its `@requires` and `@ensures` strings,
 * in source order. A contract attribute without exactly one string literal
 * is an error, not something to skip.
 */
export function contractsFromParsetree(text) {
  const contracts = new Map();
  const attribute =
    /attribute\s+"([^"]+)"\s*\[\s*(?:structure_item\s+Pstr_eval\s+expression\s+Pexp_constant PConst_string \(("(?:[^"\\]|\\.)*"),[^)]*\)\s*\])?/g;
  // Each binding prints as `<def>`, then its attributes, then its pattern.
  for (const def of text.split(/^\s*<def>\s*$/m).slice(1)) {
    const name = def.match(/Ppat_var "([^"]+)"/)?.[1];
    const head = def.slice(0, def.indexOf("pattern"));
    const found = { requires: [], ensures: [] };
    for (const match of head.matchAll(attribute)) {
      if (!CONTRACT_ATTRIBUTES.has(match[1])) {
        continue;
      }
      if (!name || !match[2]) {
        throw new Error(
          `@${match[1]} on ${name ?? "a non-variable binding"} must carry one string literal`,
        );
      }
      found[match[1]].push(ocamlString(match[2]));
    }
    if (found.requires.length > 0 || found.ensures.length > 0) {
      contracts.set(name, found);
    }
  }
  return contracts;
}

/**
 * Spells the return value of a contract as `\result`. Contracts use `result`
 * for the return value; `\result` would need `\\result` inside a ReScript
 * string.
 */
const toLemmaScript = (spec) => spec.replace(/\bresult\b/g, "\\result");

// ── Types from genType and rescript-tools doc ───────────────────────────

/**
 * Parses genType output, returning its type aliases and the function-typed
 * signatures keyed by name.
 */
function genTypeDeclarations(genTs) {
  const sf = ts.createSourceFile("gen.ts", genTs, ts.ScriptTarget.Latest, true);
  const types = [];
  const signatures = new Map();
  for (const st of sf.statements) {
    if (ts.isTypeAliasDeclaration(st)) {
      types.push(st.getText(sf));
    }
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (d.type && ts.isFunctionTypeNode(d.type)) {
          signatures.set(d.name.getText(sf), d.type);
        }
      }
    }
  }
  return { sf, types, signatures };
}

/**
 * Splits `text` at each `separator` outside brackets, trimming the parts and
 * dropping an empty tail. A `=>` is not read as a closing bracket.
 */
function splitTopLevel(text, separator) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith("=>", i)) {
      current += "=>";
      i++;
      continue;
    }
    const ch = text[i];
    if ("(<{[".includes(ch)) {
      depth++;
    } else if (")>}]".includes(ch)) {
      depth--;
    }
    if (ch === separator && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

/**
 * ReScript parameter and result types of a value, from its documentation
 * signature `let f: (a, b) => r`. Returns no parameters for anything that is
 * not a single top-level function arrow.
 */
export function signatureTypes(doc, name) {
  const signature = doc.items.find(
    (item) => item.kind === "value" && item.name === name,
  )?.signature;
  const body = signature?.replace(/^let [^:]+:\s*/, "") ?? "";
  const arrows = [];
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    if (body.startsWith("=>", i)) {
      if (depth === 0) {
        arrows.push(i);
      }
      i++;
    } else if ("(<{[".includes(body[i])) {
      depth++;
    } else if (")>}]".includes(body[i])) {
      depth--;
    }
  }
  if (arrows.length !== 1) {
    return { params: [], ret: null };
  }
  let params = body.slice(0, arrows[0]).trim();
  if (params.startsWith("(") && params.endsWith(")")) {
    params = params.slice(1, -1);
  }
  return {
    params: splitTopLevel(params, ",").map((p) => p.replace(/^~\w+:\s*/, "")),
    ret: body.slice(arrows[0] + 2).trim(),
  };
}

/**
 * For each variant type with an `int` field, directly or through another
 * such type, a predicate stating ReScript's typing guarantee that the field
 * fits in int32. genType maps `int` and `float` alike to `number`, so this
 * information exists only at the ReScript level.
 */
function rangePredicates(doc, genSf) {
  const variants = new Map(
    doc.items
      .filter((item) => item.kind === "type" && item.detail?.kind === "variant")
      .map((item) => [item.name, item.detail.items]),
  );
  const tags = new Map();
  for (const st of genSf.statements) {
    if (ts.isTypeAliasDeclaration(st) && ts.isUnionTypeNode(st.type)) {
      tags.set(
        st.name.text,
        st.type.types.map((member) => {
          const prop = member.members?.find(
            (m) => m.type && ts.isLiteralTypeNode(m.type),
          );
          return (
            prop && {
              field: prop.name.getText(genSf),
              tag: prop.type.literal.text,
            }
          );
        }),
      );
    }
  }
  const needs = (name, seen = new Set()) => {
    if (seen.has(name) || !variants.has(name)) {
      return false;
    }
    seen.add(name);
    return variants
      .get(name)
      .some((ctor) =>
        (ctor.payload?.fields ?? []).some(
          (f) => f.signature === "int" || needs(f.signature, seen),
        ),
      );
  };
  const predicates = new Map();
  for (const [name, ctors] of variants) {
    if (!needs(name)) {
      continue;
    }
    const memberTags = tags.get(name);
    if (
      !memberTags ||
      memberTags.length !== ctors.length ||
      memberTags.some((t) => !t)
    ) {
      throw new Error(
        `${name}: genType members do not line up with its constructors; give every constructor a record payload`,
      );
    }
    const cases = ctors.map((ctor, i) => {
      const conjuncts = (ctor.payload?.fields ?? []).flatMap((f) => {
        if (f.signature === "int") {
          return [`isInt32(v.${f.name})`];
        }
        return needs(f.signature)
          ? [`int32Typed_${f.signature}(v.${f.name})`]
          : [];
      });
      const body = conjuncts.length > 0 ? conjuncts.join(" && ") : "true";
      return `    case "${memberTags[i].tag}":\n      return ${body};`;
    });
    predicates.set(
      name,
      [
        "//@ pure",
        `function int32Typed_${name}(v: ${name}): boolean {`,
        `  switch (v.${memberTags[0].field}) {`,
        ...cases,
        "  }",
        "}",
      ].join("\n"),
    );
  }
  return predicates;
}

// ── The verification-only prelude ───────────────────────────────────────

export const INT32_PRELUDE = `// ReScript \`int\` is a wrapping int32; the compiler emits \`e | 0\`.
// TRUSTED: for safe integers x, int32(x) === (x | 0). Established by test.
//@ pure
function int32(x: number): number {
  //@ ensures -2147483648 <= \\result && \\result <= 2147483647
  //@ ensures -2147483648 <= x && x <= 2147483647 ==> \\result === x
  const m = ((x % 4294967296) + 4294967296) % 4294967296;
  return m >= 2147483648 ? m - 4294967296 : m;
}

//@ pure
function isInt32(x: number): boolean {
  return -2147483648 <= x && x <= 2147483647;
}`;

/** Reports whether `name` is one of the bridge's own prelude helpers. */
export const isPreludeName = (name) =>
  name === "int32" || name === "isInt32" || name.startsWith("int32Typed_");

// ── Production bodies from the compiled JavaScript ──────────────────────

/**
 * Rewrites a compiler-generated local such as `by$1` to `by__1`, because `$`
 * is not a Dafny identifier character. The rewrite must be exactly
 * reversible, so the audit can undo it: a `$` anywhere but before a trailing
 * number, and a `__` already present in production code, are refused rather
 * than rewritten.
 */
export function dollarFree(name) {
  if (name.includes("__")) {
    throw new Error(`${name}: "__" is reserved for the bridge's $ rewrite`);
  }
  const rewritten = name.replace(/\$(\d+)$/, "__$1");
  if (rewritten.includes("$")) {
    throw new Error(
      `${name}: only a trailing $<number>, as the compiler generates, can be rewritten`,
    );
  }
  return rewritten;
}

/** Reports whether `node` is an expression of the form `e | 0`. */
function isOrZero(node) {
  return (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.BarToken &&
    ts.isNumericLiteral(node.right) &&
    node.right.text === "0"
  );
}

/**
 * Returns the text edits that give a compiled function its genType parameter
 * and result types, its contract comments, `$`-free local names, and `int32`
 * calls in place of `e | 0`.
 */
function functionEdits(st, jsSf, sig, genSf, contract, typing) {
  const edits = [];
  const name = st.name.text;
  st.parameters.forEach((p, i) => {
    const type = sig.parameters[i]?.type?.getText(genSf);
    if (!type) {
      throw new Error(`${name}: genType gives no type for parameter ${i}`);
    }
    edits.push({ pos: p.end, end: p.end, text: `: ${type}` });
  });
  const close = st.parameters.end + 1;
  edits.push({ pos: close, end: close, text: `: ${sig.type.getText(genSf)}` });

  const lines = [
    ...(typing.requires.length + typing.ensures.length > 0
      ? ["  // ReScript typing: trusted on entry, proved on exit."]
      : []),
    ...typing.requires.map((r) => `  //@ requires ${r}`),
    ...typing.ensures.map((e) => `  //@ ensures ${e}`),
    ...contract.requires.map((r) => `  //@ requires ${toLemmaScript(r)}`),
    ...contract.ensures.map((e) => `  //@ ensures ${toLemmaScript(e)}`),
  ];
  if (lines.length > 0) {
    const open = st.body.getStart(jsSf) + 1;
    edits.push({ pos: open, end: open, text: `\n${lines.join("\n")}` });
  }

  const visit = (node) => {
    if (ts.isIdentifier(node) && /\$|__/.test(node.text)) {
      edits.push({
        pos: node.getStart(jsSf),
        end: node.end,
        text: dollarFree(node.text),
      });
    }
    if (isOrZero(node)) {
      edits.push({
        pos: node.getStart(jsSf),
        end: node.left.getStart(jsSf),
        text: "int32(",
      });
      edits.push({ pos: node.left.end, end: node.end, text: ")" });
    }
    ts.forEachChild(node, visit);
  };
  visit(st.body);
  return edits;
}

/**
 * Returns the `requires` and `ensures` predicates that a function's ReScript
 * types imply: `int` values are 32-bit, and predicated types hold their
 * `int32Typed_` predicate.
 */
function typingContracts(name, sig, genSf, doc, predicates) {
  const { params, ret } = signatureTypes(doc, name);
  const requires = sig.parameters.flatMap((p, i) => {
    const type = p.type?.getText(genSf);
    const param = p.name.getText(genSf);
    if (params[i] === "int") {
      return [`isInt32(${param})`];
    }
    return predicates.has(type) ? [`int32Typed_${type}(${param})`] : [];
  });
  const retType = sig.type.getText(genSf);
  let ensures = [];
  if (ret === "int") {
    ensures = ["isInt32(\\result)"];
  } else if (predicates.has(retType)) {
    ensures = [`int32Typed_${retType}(\\result)`];
  }
  return { requires, ensures };
}

/** Reads the four inputs for `resPath` without writing anything. */
export function readInputs(resPath, bin = rescriptBin()) {
  const stem = resPath.replace(/\.res$/, "");
  const parse = spawnSync(
    join(bin, "bsc.exe"),
    ["-only-parse", "-dparsetree", resPath],
    { encoding: "utf8" },
  );
  if (parse.status !== 0) {
    throw new Error(`bsc -dparsetree failed for ${resPath}: ${parse.stderr}`);
  }
  return {
    res: readFileSync(resPath, "utf8"),
    js: readFileSync(`${stem}.res.mjs`, "utf8"),
    genTs: readFileSync(`${stem}.gen.ts`, "utf8"),
    // Printast writes the tree to stderr; stdout carries JavaScript.
    parsetree: parse.stderr,
    doc: JSON.parse(
      execFileSync(join(bin, "rescript-tools.exe"), ["doc", resPath], {
        encoding: "utf8",
      }),
    ),
  };
}

/** Builds the unit text and manifest from already-read inputs. */
export function buildUnit(moduleName, inputs) {
  const contracts = contractsFromParsetree(inputs.parsetree);
  const { sf: genSf, types, signatures } = genTypeDeclarations(inputs.genTs);
  const predicates = rangePredicates(inputs.doc, genSf);
  const jsSf = ts.createSourceFile(
    `${moduleName}.res.mjs`,
    inputs.js,
    ts.ScriptTarget.Latest,
    true,
  );
  const functions = jsSf.statements.filter(
    (st) => ts.isFunctionDeclaration(st) && st.name,
  );
  if (functions.length === 0) {
    throw new Error(
      `${moduleName}.res.mjs has no function bodies: its values compile to aliases of other code, such as @rescript/runtime, which cannot be verified here`,
    );
  }

  const edits = [];
  const unbridged = [];
  for (const st of functions) {
    const name = st.name.text;
    if (isPreludeName(name)) {
      throw new Error(`${name} collides with a name the bridge reserves`);
    }
    const sig = signatures.get(name);
    if (!sig) {
      unbridged.push(name);
      continue;
    }
    const contract = contracts.get(name) ?? { requires: [], ensures: [] };
    const contracted = contract.requires.length + contract.ensures.length > 0;
    if (contracted && /[{]/.test(sig.getText(genSf))) {
      throw new Error(
        `${name}: genType inlines an anonymous object type in its signature; give that type a @genType name`,
      );
    }
    const typing = contracted
      ? typingContracts(name, sig, genSf, inputs.doc, predicates)
      : { requires: [], ensures: [] };
    edits.push(...functionEdits(st, jsSf, sig, genSf, contract, typing));
  }
  for (const name of contracts.keys()) {
    if (!signatures.has(name)) {
      throw new Error(`contract on ${name}, which has no @genType signature`);
    }
  }

  // Apply edits back to front; at equal positions the wider edit goes first,
  // so an insertion never lands inside text that is about to be replaced.
  let text = inputs.js;
  for (const e of [...edits].sort((a, b) => b.pos - a.pos || b.end - a.end)) {
    text = text.slice(0, e.pos) + e.text + text.slice(e.end);
  }
  const first = functions[0].getStart(jsSf);
  const last = functions.at(-1).end;
  const growth = edits
    .filter((e) => e.pos < last)
    .reduce((n, e) => n + e.text.length - (e.end - e.pos), 0);

  const unit = [
    `// Generated by res2ls ${BRIDGE_VERSION} from ${moduleName}.res; do not edit.`,
    `// Function bodies are ${moduleName}.res.mjs as the compiler emitted it.`,
    "",
    types.join("\n\n"),
    "",
    INT32_PRELUDE,
    "",
    [...predicates.values()].join("\n\n"),
    "",
    text.slice(first, last + growth).trim(),
    "",
  ].join("\n");

  const manifest = {
    bridge: BRIDGE_VERSION,
    module: moduleName,
    inputs: {
      [`${moduleName}.res`]: sha256(inputs.res),
      [`${moduleName}.res.mjs`]: sha256(inputs.js),
      [`${moduleName}.gen.ts`]: sha256(inputs.genTs),
    },
    unit: { [`${moduleName}.ts`]: sha256(unit) },
    contracts: Object.fromEntries(contracts),
    rangePredicates: [...predicates.keys()],
    unbridged,
  };
  return { unit, manifest };
}

/** Reads, builds, and writes the unit and manifest for one module. */
export function bridge(resPath, outDir, bin = rescriptBin()) {
  const moduleName = basename(resPath, ".res");
  const { unit, manifest } = buildUnit(moduleName, readInputs(resPath, bin));
  mkdirSync(outDir, { recursive: true });
  const unitPath = join(outDir, `${moduleName}.ts`);
  writeFileSync(unitPath, unit);
  writeFileSync(
    join(outDir, `${moduleName}.manifest.json`),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return { unitPath, manifest };
}

if (import.meta.main) {
  const [resPath, outDir] = process.argv.slice(2);
  if (!resPath || !outDir) {
    console.error("usage: bun res2ls-bridge.mjs <Module.res> <out-dir>");
    process.exit(2);
  }
  const { unitPath, manifest } = bridge(resPath, outDir);
  console.log(`wrote ${unitPath}`);
  for (const name of manifest.unbridged) {
    console.log(`not bridged (no @genType signature): ${name}`);
  }
}
```

### `res2ls-correspond.mjs`

SHA-256 `96cfee1eddb78ae25a7b9cfbd2e1bcd3a232894fac64900258d4e74d8f274036`.

```js
/**
@file res2ls correspondence audit: show that a verification unit is the production
JavaScript the ReScript compiler emitted, not a model of it.

  bun res2ls-correspond.mjs <path/to/Module.res> <out-dir>

Passes only when:

1. every input hash in the manifest matches the files beside `Module.res`,
   and the unit's own hash matches, so the unit was generated from exactly
   these sources and not edited since; and
2. erasing the unit's types with TypeScript's own transpiler, dropping the
   bridge's prelude, and undoing the two documented rewrites (`int32(e)` back
   to `e | 0`, `x__n` back to `x$n`) yields function declarations that print
   identically to those in `Module.res.mjs`.

Every compiled function must appear in the unit: one without a @genType
signature is reported as unverified, not silently ignored.
*/

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import ts from "typescript";
import { isPreludeName } from "./res2ls-bridge.mjs";

/** Returns the hex SHA-256 digest of `text`. */
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/**
 * Returns a transform that reverses the bridge's two rewrites: `int32(e)` back
 * to `e | 0`, and `x__n` back to `x$n`.
 */
function undoRewrites(context) {
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "int32" &&
      node.arguments.length === 1
    ) {
      return ts.factory.createBinaryExpression(
        ts.visitNode(node.arguments[0], visit),
        ts.SyntaxKind.BarToken,
        ts.factory.createNumericLiteral(0),
      );
    }
    // The bridge refuses production names containing `__`, so every `__n`
    // here is one of its own `$n` rewrites.
    if (ts.isIdentifier(node) && /__\d+$/.test(node.text)) {
      return ts.factory.createIdentifier(node.text.replace(/__(\d+)$/, "$$$1"));
    }
    return ts.visitEachChild(node, visit, context);
  };
  return (node) => ts.visitNode(node, visit);
}

/** Prints each non-prelude function declaration, comments removed. */
export function printedFunctions(source, fileName, undo) {
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const [out] = ts.transform(sf, undo ? [undoRewrites] : []).transformed;
  const printer = ts.createPrinter({ removeComments: true });
  return new Map(
    out.statements
      .filter(
        (st) =>
          ts.isFunctionDeclaration(st) &&
          st.name &&
          !isPreludeName(st.name.text),
      )
      .map((st) => [
        st.name.text,
        printer.printNode(ts.EmitHint.Unspecified, st, out),
      ]),
  );
}

/** Compares a unit's text with production JavaScript; returns problems. */
export function compareUnit(unitText, productionJs) {
  const erased = ts.transpileModule(unitText, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  const unit = printedFunctions(erased, "unit.js", true);
  const production = printedFunctions(productionJs, "production.js", false);
  const problems = [];
  const identical = [];
  for (const name of new Set([...unit.keys(), ...production.keys()])) {
    if (!production.has(name)) {
      problems.push(`${name} is in the unit but not in production`);
    } else if (!unit.has(name)) {
      problems.push(`${name} is in production but was not verified`);
    } else if (unit.get(name) === production.get(name)) {
      identical.push(name);
    } else {
      problems.push(`${name} differs from production`);
    }
  }
  return { identical, problems };
}

/**
 * Checks a generated unit against its manifest and the production JavaScript.
 * Returns the functions that match production and any problems found.
 */
export function correspond(resPath, outDir) {
  const moduleName = basename(resPath, ".res");
  const sourceDir = dirname(resPath);
  const manifest = JSON.parse(
    readFileSync(join(outDir, `${moduleName}.manifest.json`), "utf8"),
  );
  const problems = [];
  for (const [file, hash] of Object.entries(manifest.inputs)) {
    if (sha256(readFileSync(join(sourceDir, file), "utf8")) !== hash) {
      problems.push(`${file} changed after the unit was generated`);
    }
  }
  const unitText = readFileSync(join(outDir, `${moduleName}.ts`), "utf8");
  if (sha256(unitText) !== manifest.unit[`${moduleName}.ts`]) {
    problems.push(`${moduleName}.ts was edited after generation`);
  }
  const productionJs = readFileSync(
    join(sourceDir, `${moduleName}.res.mjs`),
    "utf8",
  );
  const compared = compareUnit(unitText, productionJs);
  return {
    identical: compared.identical,
    problems: [...problems, ...compared.problems],
  };
}

if (import.meta.main) {
  const [resPath, outDir] = process.argv.slice(2);
  if (!resPath || !outDir) {
    console.error("usage: bun res2ls-correspond.mjs <Module.res> <out-dir>");
    process.exit(2);
  }
  const { identical, problems } = correspond(resPath, outDir);
  console.log(`identical to production: ${identical.join(", ") || "none"}`);
  for (const problem of problems) {
    console.log(`MISMATCH: ${problem}`);
  }
  process.exit(problems.length > 0 ? 1 : 0);
}
```

### `res2ls-mutate.mjs`

SHA-256 `d2060149ea7c98d0499a20b2d39aeabb4286e97febd697dd2e680d3d9c89c274`.

```js
/**
@file res2ls mutation check: show that each contract on a module says something, by
breaking the production JavaScript and requiring the proof to fail on exactly
the contracts the break should violate.

  bun res2ls-mutate.mjs <path/to/Module.res> <mutants.mjs> <out-dir> <lsc.js>

`mutants.mjs` default-exports an array of
`{ name, breaks: [contract fragment, ...], edits: [{ old, new }, ...] }`.
Each `old` must occur exactly once in `Module.res.mjs`. Each fragment must
match exactly one failed contract, and every failed contract must be matched,
so a mutant that breaks more, or less, than it claims fails the check.

The mutants edit the compiled JavaScript rather than the ReScript source: the
proof is about that JavaScript, and editing it directly avoids a second
compiler project. A mutant that is not even well-formed Dafny, or that fails
for a reason other than a postcondition, is reported as an error.
*/

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildUnit, readInputs } from "./res2ls-bridge.mjs";

/** Applies `edits` to `text`, requiring each `old` to occur exactly once. */
export function applyEdits(text, edits, label = "mutant") {
  let out = text;
  for (const { old, new: replacement } of edits) {
    const first = out.indexOf(old);
    if (first === -1 || out.indexOf(old, first + 1) !== -1) {
      throw new Error(
        `${label}: edit target must occur exactly once: ${JSON.stringify(old)}`,
      );
    }
    out = out.slice(0, first) + replacement + out.slice(first + old.length);
  }
  if (out === text) {
    throw new Error(`${label}: edits leave the JavaScript unchanged`);
  }
  return out;
}

/**
 * Returns the source contract of every postcondition Dafny could not prove,
 * as `\result`-free text, by matching the failing `.dfy` ensures line to the
 * unit's `//@ ensures` line with the same position in the same function.
 */
export function failedContracts(verifierOutput, dfy, unit) {
  const dfyLines = dfy.split("\n");
  const unitLines = unit.split("\n");
  const failing = new Set();
  for (const m of verifierOutput.matchAll(
    /\.dfy\((\d+),\d+\): Related location: this is the postcondition that could not be proved/g,
  )) {
    failing.add(Number(m[1]) - 1);
  }
  const contracts = [];
  for (const index of [...failing].sort((a, b) => a - b)) {
    let header = index;
    while (header >= 0 && !/^(method|function) /.test(dfyLines[header])) {
      header--;
    }
    if (header < 0) {
      throw new Error(`no declaration above .dfy line ${index + 1}`);
    }
    const name = dfyLines[header].match(/^(?:method|function) (\w+)/)[1];
    const ordinal = dfyLines
      .slice(header + 1, index + 1)
      .filter((line) => /^\s+ensures /.test(line)).length;
    const fn = unitLines.findIndex((line) =>
      line.startsWith(`function ${name}(`),
    );
    const ensures = unitLines
      .slice(fn + 1)
      .filter((line) => /^\s*\/\/@ ensures /.test(line))
      .slice(0, ordinal);
    if (fn === -1 || ensures.length < ordinal) {
      throw new Error(`cannot match .dfy line ${index + 1} to ${name}`);
    }
    contracts.push(
      ensures
        .at(-1)
        .replace(/^\s*\/\/@ ensures /, "")
        .replaceAll("\\result", "result"),
    );
  }
  return contracts;
}

/** Compares failed contracts with the fragments a mutant claims to break. */
export function judge(failed, breaks) {
  const problems = [];
  for (const fragment of breaks) {
    const hits = failed.filter((c) => c.includes(fragment));
    if (hits.length !== 1) {
      problems.push(
        `"${fragment}" matches ${hits.length} failed contracts, not 1`,
      );
    }
  }
  for (const contract of failed) {
    if (!breaks.some((fragment) => contract.includes(fragment))) {
      problems.push(`unexpected failure: ${contract}`);
    }
  }
  return problems;
}

/**
 * Judges one finished verifier run of a mutant; returns a list of problems,
 * empty when the mutant was killed on exactly the contracts it lists.
 * `readDfy` is called only once the run is known to have reached Dafny.
 */
export function judgeRun({ status, output }, readDfy, unit, breaks, log) {
  if (status === 0) {
    return ["survived: the proof still passes"];
  }
  const errors = [...output.matchAll(/\.dfy\(\d+,\d+\): Error: (.*)/g)].map(
    (m) => m[1],
  );
  if (errors.length === 0) {
    // A crash, a timeout, or a translation failure before Dafny ran: the
    // mutant was not judged, so it must not count as killed.
    return [`lsc exited with status ${status} and no Dafny error; see ${log}`];
  }
  const foreign = errors.filter((e) => !/postcondition/.test(e));
  if (foreign.length > 0) {
    return foreign.map((e) => `failed for another reason: ${e}`);
  }
  return judge(failedContracts(output, readDfy(), unit), breaks);
}

/** Bridges, proves, and judges one mutant; returns a list of problems. */
function runMutant(moduleName, inputs, mutant, outDir, lscPath) {
  const dir = join(outDir, mutant.name);
  mkdirSync(dir, { recursive: true });
  const js = applyEdits(inputs.js, mutant.edits, mutant.name);
  const { unit } = buildUnit(moduleName, { ...inputs, js });
  const unitPath = join(dir, `${moduleName}.ts`);
  writeFileSync(unitPath, unit);
  const run = spawnSync(
    process.execPath,
    [lscPath, "check", "--backend=dafny", unitPath],
    { encoding: "utf8" },
  );
  const output = `${run.stdout}${run.stderr}`;
  const log = join(dir, "verify.log");
  writeFileSync(log, output);
  return judgeRun(
    { status: run.status, output },
    () => readFileSync(join(dir, `${moduleName}.dfy`), "utf8"),
    unit,
    mutant.breaks,
    log,
  );
}

if (import.meta.main) {
  const [resPath, mutantsPath, outDir, lscPath] = process.argv.slice(2);
  if (!resPath || !mutantsPath || !outDir || !lscPath) {
    console.error(
      "usage: bun res2ls-mutate.mjs <Module.res> <mutants.mjs> <out-dir> <lsc.js>",
    );
    process.exit(2);
  }
  const moduleName = basename(resPath, ".res");
  const inputs = readInputs(resPath);
  const { default: mutants } = await import(
    pathToFileURL(resolve(mutantsPath)).href
  );
  let failures = 0;
  for (const mutant of mutants) {
    const problems = runMutant(
      moduleName,
      inputs,
      mutant,
      outDir,
      resolve(lscPath),
    );
    console.log(
      `${problems.length === 0 ? "killed" : "PROBLEM"} ${mutant.name}`,
    );
    for (const problem of problems) {
      console.log(`  ${problem}`);
    }
    failures += problems.length === 0 ? 0 : 1;
  }
  console.log(`${mutants.length - failures}/${mutants.length} mutants killed`);
  process.exit(failures === 0 ? 0 : 1);
}
```

### `Lifecycle.res`

SHA-256 `d1ef09a25466c6833cf8c4efa71db00c890de97a685c00d62899b07e9474fc50`.

```rescript
/***
FX-1 toy: a reduced per-generation lifecycle shaped by ADR 007's representation
guidance. Scratch only; it is never shipped and proves nothing about refex.
*/

// Scratch-only: the toy uses catch-all arms, which Warning 4 flags as fragile.
@@warning("-4")

@genType @tag("kind")
type phase =
  | @as("acquiring") Acquiring({cancelRequested: bool})
  | @as("open") Open({leases: array<string>})
  | @as("closing") Closing({attempt: int, joiners: array<string>})
  | @as("settledFailed") SettledFailed({attempt: int})
  | @as("recovering") Recovering({attempt: int, joiners: array<string>})
  | @as("released") Released({attempt: int})

@genType
type generation = {owner: string, phase: phase, lastStarted: int, history: array<string>}

// F8: two generations held in one state.
@genType
type machine = {current: generation, previous: generation}

@genType
type config = {maxAttempt: int}

@genType @tag("kind")
type event =
  | @as("acquired") Acquired({by: string})
  | @as("leaseAcquired") LeaseAcquired({lease: string})
  | @as("leaseReleased") LeaseReleased({lease: string})
  | @as("close") Close({caller: string})
  | @as("recover") Recover({caller: string})
  | @as("succeeded") Succeeded({target: string, attempt: int})
  | @as("failed") Failed({target: string, attempt: int})

@genType @tag("kind")
type command =
  | @as("publish") Publish({target: string})
  | @as("start") Start({target: string, attempt: int})
  | @as("join") Join({caller: string, attempt: int})
  | @as("refuse") Refuse({reason: string})

@genType
type outcome = {state: machine, commands: array<command>}

/** The attempt recorded by an in-flight phase, or -1 when nothing is in flight. */
@genType
let inFlightAttempt = (phase: phase): int =>
  switch phase {
  | Closing({attempt, _}) | Recovering({attempt, _}) => attempt
  | Acquiring(_) | Open(_) | SettledFailed(_) | Released(_) => -1
  }

/**
Any attempt a phase records is the last one started, and no attempt precedes cleanup (ADR 007 INV-15). The switch is on a
parameter, not a field projection: a projection compiles to a mutable `let`,
which LemmaScript classifies as impure.
*/
@genType
let attemptMatches = (phase: phase, lastStarted: int): bool =>
  switch phase {
  | Closing({attempt, _}) => attempt == lastStarted
  | Recovering({attempt, _}) => attempt == lastStarted
  | SettledFailed({attempt}) => attempt == lastStarted
  | Released({attempt}) => attempt == lastStarted
  | Acquiring(_) => lastStarted == 0
  | Open(_) => lastStarted == 0
  }

/** One generation is well formed: attempts are bounded and any recorded attempt is the last started. */
@genType
let generationWellFormed = (config: config, gen: generation): bool =>
  gen.lastStarted >= 0 && gen.lastStarted <= config.maxAttempt && attemptMatches(gen.phase, gen.lastStarted)

@genType
let wellFormed = (config: config, state: machine): bool =>
  generationWellFormed(config, state.current) && generationWellFormed(config, state.previous)

// Helpers build records field by field: a record spread compiles to a mutable `let`, which LemmaScript treats as
// impure, so the helper would become an opaque method without postconditions.
@genType
let withCurrent = (state: machine, gen: generation): machine => {current: gen, previous: state.previous}

// The compiler inlines `withCurrent` here as mutable lets, so `refuse` stays a method; these exact-effect contracts
// make its behaviour visible to `step`'s proof.
@genType
@ensures("result.state.current.phase === state.current.phase")
@ensures("result.state.current.lastStarted === state.current.lastStarted")
@ensures("result.state.current.owner === state.current.owner")
@ensures("result.state.previous === state.previous")
@ensures("result.state.current.history.length === state.current.history.length + 1")
@ensures("result.commands.length === 1")
@ensures("result.commands[0].kind === 'refuse'")
let refuse = (state: machine, reason: string): outcome => {
  state: withCurrent(
    state,
    {
      owner: state.current.owner,
      phase: state.current.phase,
      lastStarted: state.current.lastStarted,
      history: Array.concat(state.current.history, [reason]),
    },
  ),
  commands: [Refuse({reason: reason})],
}

@genType
let enter = (state: machine, phase: phase, lastStarted: int): machine =>
  withCurrent(
    state,
    {owner: state.current.owner, phase, lastStarted, history: state.current.history},
  )

@genType
let startClosing = (state: machine, joiners: array<string>): outcome => {
  state: enter(
    state,
    Closing({attempt: state.current.lastStarted + 1, joiners}),
    state.current.lastStarted + 1,
  ),
  commands: [Start({target: "current", attempt: state.current.lastStarted + 1})],
}

@genType
let startRecovering = (state: machine, joiners: array<string>): outcome => {
  state: enter(
    state,
    Recovering({attempt: state.current.lastStarted + 1, joiners}),
    state.current.lastStarted + 1,
  ),
  commands: [Start({target: "current", attempt: state.current.lastStarted + 1})],
}

@genType
@ensures("result.state.previous === state.previous")
@ensures("result.state.current.owner === state.current.owner")
@ensures("result.state.current.lastStarted === state.current.lastStarted")
@ensures(
  "(target !== 'current' || attempt !== inFlightAttempt(state.current.phase) || attempt < 0) ==> result.state.current.phase === state.current.phase && result.state.current.history.length === state.current.history.length + 1 && result.commands.length === 1 && result.commands[0].kind === 'refuse'"
)
@ensures(
  "!(target !== 'current' || attempt !== inFlightAttempt(state.current.phase) || attempt < 0) ==> result.commands.length === 0 && attemptMatches(result.state.current.phase, attempt)"
)
@ensures(
  "!(target !== 'current' || attempt !== inFlightAttempt(state.current.phase) || attempt < 0) && succeeded ==> result.state.current.phase.kind === 'released'"
)
@ensures(
  "!(target !== 'current' || attempt !== inFlightAttempt(state.current.phase) || attempt < 0) && !succeeded ==> result.state.current.phase.kind === 'settledFailed'"
)
let settle = (state: machine, target: string, attempt: int, succeeded: bool): outcome =>
  if target != "current" || attempt != inFlightAttempt(state.current.phase) || attempt < 0 {
    refuse(state, "stale")
  } else if succeeded {
    {state: enter(state, Released({attempt: attempt}), state.current.lastStarted), commands: []}
  } else {
    {state: enter(state, SettledFailed({attempt: attempt}), state.current.lastStarted), commands: []}
  }

@genType
@requires("config.maxAttempt >= 1 && config.maxAttempt <= 1000000")
@requires("wellFormed(config, state)")
@ensures("wellFormed(config, result.state)")
@ensures(
  "state.current.phase.kind === 'open' && event.kind === 'close' && event.caller === state.current.owner && state.current.lastStarted < config.maxAttempt ==> result.state.current.phase.kind === 'closing' && result.commands.length === 1 && result.commands[0].kind === 'start'"
)
@ensures(
  "inFlightAttempt(state.current.phase) >= 0 && event.kind === 'close' && event.caller === state.current.owner ==> result.commands.length === 1 && result.commands[0].kind === 'join' && result.commands[0].attempt === inFlightAttempt(state.current.phase) && result.state.current.lastStarted === state.current.lastStarted"
)
@ensures(
  "(event.kind === 'succeeded' || event.kind === 'failed') && (event.target !== 'current' || event.attempt !== inFlightAttempt(state.current.phase)) ==> result.state.current.phase === state.current.phase && result.state.current.lastStarted === state.current.lastStarted && result.state.current.owner === state.current.owner && result.state.previous === state.previous && result.state.current.history.length === state.current.history.length + 1"
)
@ensures(
  "result.commands.length > 0 && result.commands[0].kind === 'start' ==> result.commands[0].attempt === state.current.lastStarted + 1 && result.state.current.lastStarted === state.current.lastStarted + 1"
)
@ensures(
  "state.current.phase.kind === 'settledFailed' && event.kind === 'recover' && event.caller === state.current.owner && state.current.lastStarted >= config.maxAttempt ==> result.commands.length === 1 && result.commands[0].kind === 'refuse'"
)
let step = (config: config, state: machine, event: event): outcome =>
  switch (state.current.phase, event) {
  | (Acquiring({cancelRequested: false}), Acquired(_)) => {
      state: enter(state, Open({leases: []}), state.current.lastStarted),
      commands: [Publish({target: "current"})],
    }
  | (Acquiring({cancelRequested: true}), Acquired(_)) =>
    if state.current.lastStarted >= config.maxAttempt {
      refuse(state, "bound")
    } else {
      startClosing(state, [])
    }
  | (Open({leases}), LeaseAcquired({lease})) => {
      state: enter(state, Open({leases: Array.concat(leases, [lease])}), state.current.lastStarted),
      commands: [],
    }
  | (Open({leases}), LeaseReleased({lease})) =>
    let remaining = leases->Array.filter(held => held != lease)
    if remaining->Array.length == 0 && state.current.lastStarted < config.maxAttempt {
      startClosing(state, [])
    } else {
      {state: enter(state, Open({leases: remaining}), state.current.lastStarted), commands: []}
    }
  | (Open(_), Close({caller})) =>
    if caller != state.current.owner {
      refuse(state, "unauthorized")
    } else if state.current.lastStarted >= config.maxAttempt {
      refuse(state, "bound")
    } else {
      startClosing(state, [caller])
    }
  | (Closing({attempt, _}) | Recovering({attempt, _}), Close({caller}) | Recover({caller})) =>
    if caller != state.current.owner {
      refuse(state, "unauthorized")
    } else {
      {state, commands: [Join({caller, attempt})]}
    }
  | (SettledFailed(_), Recover({caller})) =>
    if caller != state.current.owner {
      refuse(state, "unauthorized")
    } else if state.current.lastStarted >= config.maxAttempt {
      refuse(state, "bound")
    } else {
      startRecovering(state, [caller])
    }
  | (_, Succeeded({target, attempt})) => settle(state, target, attempt, true)
  | (_, Failed({target, attempt})) => settle(state, target, attempt, false)
  | (_, _) => refuse(state, "invalid")
  }
```

### `Lifecycle.mutants.mjs`

SHA-256 `e97597b8cf8e17574e002533fe7ba8fdb6d6b052f032fef067c9f3c2f3eb882a`.

```js
/**
@file FX-1 mutants of the compiled toy Lifecycle.res.mjs, run by res2ls-mutate.mjs. Each edit breaks one behaviour, and
`breaks` lists a fragment of every contract that must then fail, and no other. Dafny reports only the first failing
postcondition on a return path, so a mutant that also violates a later contract on that path lists only the first.
*/

const R_PHASE = "result.state.current.phase === state.current.phase";
const ATTEMPT_KEPT = "result.state.current.lastStarted === state.current.lastStarted";
const OWNER_KEPT = "result.state.current.owner === state.current.owner";
const PREVIOUS_KEPT = "result.state.previous === state.previous";
const R_HISTORY = "result.state.current.history.length === state.current.history.length + 1";
const R_COMMAND = "result.commands[0].kind === 'refuse'";
const R_ONE_COMMAND = "result.commands.length === 1";
const S_STALE = "attempt < 0) ==> result.state.current.phase === state.current.phase";
const S_MATCH = "attemptMatches(result.state.current.phase, attempt)";
const S_RELEASED = "=== 'released'";
const S_FAILED = "=== 'settledFailed'";
const WELL_FORMED = "wellFormed(config, result.state)";
const CLOSE_STARTS = "result.state.current.phase.kind === 'closing'";
const CLOSE_JOINS = "result.commands[0].kind === 'join'";
const STALE_FRAME = "event.target !== 'current'";
const NUMBERING = "result.commands[0].attempt === state.current.lastStarted + 1";
const BOUND = "state.current.lastStarted >= config.maxAttempt ==>";

const one = (name, breaks, old, replacement) => ({ name, breaks, edits: [{ old, new: replacement }] });

export default [
  one("refuse-keeps-history", [R_HISTORY], "state.current.history.concat([reason])", "state.current.history"),
  one("refuse-changes-phase", [R_PHASE], "let gen_phase = state.current.phase;", "let gen_phase = state.previous.phase;"),
  one("refuse-bumps-attempt", [ATTEMPT_KEPT], "let gen_lastStarted = state.current.lastStarted;",
    "let gen_lastStarted = state.current.lastStarted + 1 | 0;"),
  one("refuse-changes-owner", [OWNER_KEPT], "let gen_owner = state.current.owner;", 'let gen_owner = "intruder";'),
  one("refuse-drops-previous", [PREVIOUS_KEPT], "current: gen,\n      previous: state.previous",
    "current: gen,\n      previous: gen"),
  one("refuse-wrong-command", [R_COMMAND], 'kind: "refuse",\n        reason: reason',
    'kind: "publish",\n        target: reason'),
  one("refuse-doubles-command", [R_ONE_COMMAND], 'kind: "refuse",\n        reason: reason\n      }]',
    'kind: "refuse",\n        reason: reason\n      }, {\n        kind: "refuse",\n        reason: reason\n      }]'),
  one("enter-changes-owner", [OWNER_KEPT], "owner: state.current.owner,\n      phase: phase,",
    'owner: "intruder",\n      phase: phase,'),
  one("enter-drops-previous", [PREVIOUS_KEPT], "history: state.current.history\n    },\n    previous: state.previous",
    "history: state.current.history\n    },\n    previous: state.current"),
  one("stale-accept", [S_STALE], "attempt !== inFlightAttempt(state.current.phase) || attempt < 0", "attempt < 0"),
  one("settle-bumps-attempt", [ATTEMPT_KEPT],
    'kind: "released",\n        attempt: attempt\n      }, state.current.lastStarted)',
    'kind: "released",\n        attempt: attempt\n      }, state.current.lastStarted + 1 | 0)'),
  one("settle-releases-other-attempt", [S_MATCH],
    'kind: "released",\n        attempt: attempt\n      }, state.current.lastStarted)',
    'kind: "released",\n        attempt: attempt + 1 | 0\n      }, state.current.lastStarted)'),
  one("success-records-failure", [S_RELEASED],
    'kind: "released",\n        attempt: attempt\n      }, state.current.lastStarted)',
    'kind: "settledFailed",\n        attempt: attempt\n      }, state.current.lastStarted)'),
  one("failure-records-release", [S_FAILED], 'kind: "settledFailed",\n        attempt: attempt',
    'kind: "released",\n        attempt: attempt'),
  one("wrap-attempt", [WELL_FORMED], 'kind: "closing",\n      attempt: state.current.lastStarted + 1 | 0',
    'kind: "closing",\n      attempt: state.current.lastStarted + 2 | 0'),
  one("open-advances-attempt", [WELL_FORMED],
    'kind: "open",\n                leases: []\n              }, state.current.lastStarted)',
    'kind: "open",\n                leases: []\n              }, state.current.lastStarted + 1 | 0)'),
  one("close-recovers", [CLOSE_STARTS], "return startClosing(state, [caller]);",
    "return startRecovering(state, [caller]);"),
  one("join-wrong-attempt", [CLOSE_JOINS], "caller: caller$2,\n                    attempt: match.attempt",
    "caller: caller$2,\n                    attempt: match.attempt + 1 | 0"),
  one("refuse-join", [CLOSE_JOINS],
    'return {\n                state: state,\n                commands: [{\n                    kind: "join",\n                    caller: caller$2,\n                    attempt: match.attempt\n                  }]\n              };',
    'return refuse(state, "busy");'),
  one("duplicate-start", [CLOSE_JOINS, NUMBERING],
    'return {\n                state: state,\n                commands: [{\n                    kind: "join",\n                    caller: caller$2,\n                    attempt: match.attempt\n                  }]\n              };',
    'return {\n                state: state,\n                commands: [{\n                    kind: "start",\n                    target: "current",\n                    attempt: match.attempt\n                  }]\n              };'),
  one("bound-joins", [BOUND],
    'return refuse(state, "bound");\n          } else {\n            return startRecovering(state, [caller$1]);',
    'return {state: state, commands: [{kind: "join", caller: caller$1, attempt: 0}]};\n          } else {\n            return startRecovering(state, [caller$1]);'),
  one("stale-other-generation", [STALE_FRAME], "return settle(state, event.target, event.attempt, true);",
    'return settle(state, "current", event.attempt, true);'),
  {
    name: "numbering-skips",
    breaks: [NUMBERING],
    edits: [{
      old: 'kind: "recovering",\n      attempt: state.current.lastStarted + 1 | 0,\n      joiners: joiners\n    }, state.current.lastStarted + 1 | 0),\n    commands: [{\n        kind: "start",\n        target: "current",\n        attempt: state.current.lastStarted + 1 | 0',
      new: 'kind: "recovering",\n      attempt: state.current.lastStarted + 1 | 0,\n      joiners: joiners\n    }, state.current.lastStarted + 1 | 0),\n    commands: [{\n        kind: "start",\n        target: "current",\n        attempt: state.current.lastStarted + 2 | 0',
    }],
  },
  one("refuses-everything", [CLOSE_STARTS, CLOSE_JOINS],
    "function step(config, state, event) {\n  let match = state.current.phase;",
    'function step(config, state, event) {\n  return refuse(state, "everything");\n  let match = state.current.phase;'),
];
```

### `CauseTree.res`

SHA-256 `8cc622cd98399bd03191af200496da8aa3fda1ba9a0d7d0e2bd8ec5cd07960c9`.

```rescript
/***
FX-1 toy: leaf-wise mapping over a cause tree with array children (F10) and an opaque provenance leaf holding a record of
functions (F11). Scratch only; it proves nothing about refex.
*/

@genType
type trace = {describe: unit => string}

@genType @tag("kind")
type rec cause =
  | @as("expected") Expected({error: string})
  | @as("defect") Defect({message: string})
  | @as("provenance") Provenance({opaque: trace})
  | @as("sequential") Sequential({children: array<cause>})
  | @as("parallel") Parallel({children: array<cause>})

/** Replaces every expected leaf's error with `replacement`, keeping every other leaf and the shape. */
@genType
@ensures("result.kind === node.kind")
@ensures("node.kind === 'expected' ==> result.error === replacement")
@ensures("node.kind === 'defect' ==> result.message === node.message")
@ensures("node.kind === 'provenance' ==> result.opaque === node.opaque")
@ensures(
  "(node.kind === 'sequential' || node.kind === 'parallel') ==> result.children.length === node.children.length"
)
@ensures(
  "(node.kind === 'sequential' || node.kind === 'parallel') ==> forall(k: nat, k < node.children.length ==> result.children[k].kind === node.children[k].kind)"
)
let rec mapExpected = (node: cause, replacement: string): cause =>
  switch node {
  | Expected(_) => Expected({error: replacement})
  | Defect({message}) => Defect({message: message})
  | Provenance({opaque}) => Provenance({opaque: opaque})
  | Sequential({children}) =>
    Sequential({children: children->Array.map(child => mapExpected(child, replacement))})
  | Parallel({children}) => Parallel({children: children->Array.map(child => mapExpected(child, replacement))})
  }
```

### `CauseTree.mutants.mjs`

SHA-256 `0ccab8f132737f1a9236dfc3f2b4994a8b76878b1daed9078bac340b014fe36b`.

```js
/**
@file FX-1 mutants of the compiled toy CauseTree.res.mjs, run by res2ls-mutate.mjs. Each breaks one contract on
`mapExpected`; `breaks` lists a fragment of every contract that must then fail, and no other.
*/

const KIND = "result.kind === node.kind";
const ERROR = "result.error === replacement";
const MESSAGE = "result.message === node.message";
const OPAQUE = "result.opaque === node.opaque";
const LENGTH = "result.children.length === node.children.length";
const CHILD_KINDS = "result.children[k].kind === node.children[k].kind";

const one = (name, breaks, old, replacement) => ({ name, breaks, edits: [{ old, new: replacement }] });

export default [
  one("expected-becomes-defect", [KIND], 'kind: "expected",\n        error: replacement',
    'kind: "defect",\n        message: replacement'),
  one("expected-keeps-old-error", [ERROR], "error: replacement", "error: node.error"),
  one("defect-loses-message", [MESSAGE], "message: node.message", 'message: "lost"'),
  one("provenance-forged", [OPAQUE], "opaque: node.opaque", 'opaque: {describe: () => "forged"}'),
  one("sequential-drops-children", [LENGTH], "children: node.children.map(child => mapExpected(child, replacement))\n      };\n    case \"parallel\"",
    "children: []\n      };\n    case \"parallel\""),
  one("parallel-flattens-children", [CHILD_KINDS],
    'kind: "parallel",\n        children: node.children.map(child => mapExpected(child, replacement))',
    'kind: "parallel",\n        children: node.children.map(child => child.kind === "expected" ? node.children[0] : mapExpected(child, replacement))'),
];
```

### `Fold.res`

SHA-256 `153bcbb31906b0eb2165877eb5ccca1d460bf22035ef0067302f5f1422447e0f`.

```rescript
/***
FX-1 toy for feature F9: a recursive fold of a step function over an event array, decreasing on the remaining count,
with a trace-level postcondition. Scratch only; it proves nothing about refex.
*/

@genType @tag("kind")
type phase =
  | @as("open") Open({attempt: int})
  | @as("closing") Closing({attempt: int})

@genType @tag("kind")
type event = | @as("close") Close({caller: string})

@genType @tag("kind")
type command =
  | @as("start") Start({attempt: int})
  | @as("join") Join({attempt: int})

@genType
type outcome = {next: phase, command: command}

/** A close on an open phase starts an attempt; a close while closing joins it and leaves the phase unchanged. */
@genType
@ensures("current.kind === 'closing' ==> result.command.kind === 'join'")
@ensures("current.kind === 'closing' ==> result.next === current")
let step = (current: phase, _event: event): outcome =>
  switch current {
  | Open({attempt}) => {next: Closing({attempt: attempt + 1}), command: Start({attempt: attempt + 1})}
  | Closing({attempt}) => {next: current, command: Join({attempt: attempt})}
  }

/**
Counts the attempts started while folding `step` over `events` from `index`. Neither recursive call is in tail
position, because the compiler lowers tail recursion to a `while` loop, which the verification route cannot model. The
fold still fails to verify: the recursion needs a termination measure that the bridge cannot attach.
*/
@genType
@requires("current.kind === 'closing'")
@requires("index >= 0 && index <= events.length")
@ensures("result === 0")
let rec startsFrom = (current: phase, events: array<event>, index: int): int =>
  if index >= Array.length(events) {
    0
  } else {
    switch step(current, events->Array.getUnsafe(index)) {
    | {command: Start(_), next} => 1 + startsFrom(next, events, index + 1)
    | {command: Join(_), next} => 0 + startsFrom(next, events, index + 1)
    }
  }
```

<!-- markdownlint-enable MD013 -->
