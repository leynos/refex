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

| Item             | Value                                                                                                                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Host             | Linux 6.12.0-211.62.1.el10_2.x86_64 (Rocky 10)                                                                                                                                                                                                                                                                                       |
| Bun              | 1.4.2                                                                                                                                                                                                                                                                                                                                |
| ReScript         | 12.3.1, with genType (`{"language": "typescript", "generatedFileExtension": ".gen.ts"}`)                                                                                                                                                                                                                                             |
| LemmaScript      | 0.6.4, `sha512-rnAnCt36hmAhu7RjlbrY6ky5kDcTfk9Tv1q+0rxaVJJqiQ7uH5fgYgNuyA0MXmeujuegCsm2OWrc99fwJunhAg==`, binary `tools/dist/lsc.js`                                                                                                                                                                                                 |
| TypeScript       | 5.9.3 (the bridge uses the TypeScript 5 compiler API)                                                                                                                                                                                                                                                                                |
| bignumber.js     | 11.1.5                                                                                                                                                                                                                                                                                                                               |
| Dafny            | 4.11.0+fcb2042d6d043a2634f0854338c08feeaaaf4ae2                                                                                                                                                                                                                                                                                      |
| Z3               | 4.12.1, `z3-4.12.1-x64-glibc-2.35.zip`, SHA-256 `c5360fd157b0f861ec8780ba3e51e2197e9486798dc93cd878df69a4b0c2b7c5`                                                                                                                                                                                                                   |
| Bridge scripts   | `res2ls-bridge.mjs` `8b2e62b3be90b2ac327e406ade544e71c7c0940cc2bcd58f0593b5e3bc851b76`, `res2ls-correspond.mjs` `96cfee1eddb78ae25a7b9cfbd2e1bcd3a232894fac64900258d4e74d8f274036`, `res2ls-mutate.mjs` `d2060149ea7c98d0499a20b2d39aeabb4286e97febd697dd2e680d3d9c89c274`, copied unchanged from the skill's `references/examples/` |
| Scratch lockfile | `bun.lock` SHA-256 `caf000a69fef02fe64811004f29ec39b6feca005d7b8ace450a7a08e734921c8`                                                                                                                                                                                                                                                |

## Procedure

In an empty scratch directory, write `package.json` as
`{"name":"refex-fx1","private":true,"type":"module"}` and the `rescript.json`
below, install the pins once, copy the three bridge scripts from the skill, and
place the toy sources, mutant catalogues, `fail-closed.mjs`, and `run-fx1.sh`
from this record:

```sh
bun add --exact rescript@12.3.1 @rescript/runtime@12.3.1 lemmascript@0.6.4 typescript@5.9.3 bignumber.js@11.1.5
./run-fx1.sh   # regenerates .verify from empty and exits non-zero on any hole
```

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
used 23, including the two control runs and the final pass, and ended with a
verdict inside the one-day limit.

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
| FX-L1            | `step` preserves `wellFormed`                                                                                             | Verified                 | `wrap-attempt`                                                                       |
| FX-L2            | PR-1: a close on `Open` starts exactly one attempt                                                                        | Verified                 | `close-recovers`, `refuses-everything`                                               |
| FX-L2            | PR-7: a close in flight joins the current attempt                                                                         | Verified                 | `join-wrong-attempt`, `refuse-join`, `duplicate-start`, `refuses-everything`         |
| FX-L3            | A stale or other-generation settlement keeps owner, phase, attempt, and the other generation, appending one history entry | Verified                 | `stale-other-generation`                                                             |
| FX-L4            | A started attempt is `lastStarted + 1`                                                                                    | Verified per step        | `numbering-skips`, `duplicate-start`                                                 |
| FX-L5            | Recovery at `maxAttempt` is refused, never wrapped                                                                        | Verified                 | `bound-joins`                                                                        |
| FX-L6            | The fold over close requests in flight starts nothing                                                                     | Not verified (F9)        | none                                                                                 |
| FX-C1            | `mapExpected` keeps the node kind, child count, and child kinds                                                           | Verified, one level deep | `expected-becomes-defect`, `sequential-drops-children`, `parallel-flattens-children` |
| FX-C2            | `mapExpected` keeps defect and provenance leaves                                                                          | Verified at the node     | `defect-loses-message`, `provenance-forged`                                          |
| Helper contracts | `refuse` (7 contracts) and `settle` (7 contracts) exact effects                                                           | Verified                 | one mutant each, listed in the catalogue                                             |

The Lifecycle catalogue has 23 mutants and the cause-tree catalogue 6. The
final pass killed all 29 on exactly their listed contracts. Writing the
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

Excerpt of `./run-fx1.sh` output from an empty `.verify` directory:

```plaintext
1.4.2
Z3 version 4.12.1 - 64 bit
4.11.0+fcb2042d6d043a2634f0854338c08feeaaaf4ae2
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
killed close-recovers
killed join-wrong-attempt
killed refuse-join
killed duplicate-start
killed bound-joins
killed stale-other-generation
killed numbering-skips
killed refuses-everything
23/23 mutants killed
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

SHA-256 `39e0b4ddd95b60c40373a4e15ae66955c14904cfddd54c29a7f9df44109a2657`.

```sh
#!/usr/bin/env bash
# FX-1 runner: regenerates every verification artefact from an empty .verify directory and fails closed.
set -euo pipefail
export PATH="$HOME/scratch/refex-1-1/z3/z3-4.12.1-x64-glibc-2.35/bin:$HOME/.local/share/bun-versions/1.4.2/bin:$PATH"
LSC=node_modules/lemmascript/tools/dist/lsc.js
bun --version; z3 --version; dafny --version
bun install --frozen-lockfile
bunx rescript build
rm -rf .verify
for m in Lifecycle CauseTree; do
  d=.verify/$m; mkdir -p "$d"
  bun res2ls-bridge.mjs "src/$m.res" "$d" | tee "$d/bridge.out"; echo "${PIPESTATUS[0]}" > "$d/bridge.status"
  bun res2ls-correspond.mjs "src/$m.res" "$d" | tee "$d/correspond.out"; echo "${PIPESTATUS[0]}" > "$d/correspond.status"
  bun "$LSC" check --backend=dafny "$d/$m.ts" | tee "$d/check.out"; echo "${PIPESTATUS[0]}" > "$d/check.status"
  bun res2ls-mutate.mjs "src/$m.res" "src/$m.mutants.mjs" "$d/mutants" "$LSC" | tee "$d/mutate.out"
  echo "${PIPESTATUS[0]}" > "$d/mutate.status"
done
bun fail-closed.mjs
# Feature probe F9 is expected to fail; it is recorded, never counted towards acceptance.
mkdir -p .verify/Fold
bun res2ls-bridge.mjs src/Fold.res .verify/Fold > /dev/null
bun res2ls-correspond.mjs src/Fold.res .verify/Fold
set +e; bun "$LSC" check --backend=dafny .verify/Fold/Fold.ts > .verify/Fold/check.out 2>&1; echo "F9 probe exit $?"; set -e
grep -E 'Error:|verified' .verify/Fold/check.out | sed -E 's/^Fold.dfy\([0-9]+,[0-9]+\): //' | sort | uniq -c
```

### `fail-closed.mjs`

SHA-256 `00da8531ac055a0edf514648628d98382bf76b75b8d331cf825839e153acb030`.

```js
/**
@file FX-1 fail-closed check. Reads the artefacts that run-fx1.sh leaves under .verify/<Module> and exits non-zero on any
hole: a missing or failing stage status, a Dafny summary with errors or an unexpected verified count, a forbidden proof
escape in the generated Dafny, an audit that compared fewer functions than the module exports, or a mutant that was
not killed. A crash or timeout leaves a missing status file, which is a failure, never a pass.
*/
import { existsSync, readFileSync } from "node:fs";

const MODULES = { Lifecycle: { verified: 10, mutants: 23 }, CauseTree: { verified: 6, mutants: 6 } };
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

### `Lifecycle.res`

SHA-256 `386e010aebed236939e01e668906dcfdc8388ce4865df679ea628e8cb61bc6bf`.

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
Any attempt a phase records is the last one started. The switch is on a
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
  | Acquiring(_) => lastStarted >= 0
  | Open(_) => lastStarted >= 0
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

SHA-256 `60eb50e3ec216ce9ef06350cce39d59a2546ec6d60acc482d25491d52881968d`.

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
