# Evidence: runtime-boundary audit for ADR 004

Status: source evidence for roadmap task 1.1.2, not refex conformance. Date:
17 October 2026. Pins: `effect` 4.0.5 and 3.22.2,
`@reventlessdev/rescript-effect` 1.0.0-alpha.0, Bun 1.4.2.

## Claim

The audit tests hypothesis H-RT from the
[execution plan](../execplans/1-1-freeze-validator-hypotheses.md): Effect 4.0.x
supplies every primitive refex will build on and exposes enough for refex to
build its own complete outcomes. It also records what each Effect line does for
provision, mixed-cause mapping, close, replacement, and promise projection, so
that [ADR 004](../adr-004-runtime-boundary.md) does not assume that names
preserve semantics.

These observations concern the pinned upstream versions only. They are not
evidence that any refex contract holds; refex has no runtime code yet.

## Pins and environment

| Item                                           | Value                                                                                                                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host                                           | Linux 6.12.0-211.62.1.el10_2.x86_64 (Rocky 10), Bun 1.4.2                                                                                                                                |
| Registry check                                 | 2026-10-16T23:30Z (UTC)                                                                                                                                                                  |
| `effect` 4.0.5                                 | Latest; published 2026-10-15; MIT; no runtime dependencies; unpacked 51,489,523 bytes; `sha512-BY4/28NlpOd99yzmV741xbVGmp+1U7tks4oB7F/Png64bTa5tm5eCA6W0RiXsnuLDDoJpjfVSo4Dnq4BZb/89Q==` |
| `effect` 3.22.2                                | Pinned by the Reventless bindings; MIT; runtime dependencies `fast-check ^3.23.1` and `@standard-schema/spec ^1.0.0`                                                                     |
| `@reventlessdev/rescript-effect` 1.0.0-alpha.0 | Latest; published 2026-10-15; Apache-2.0; `sha512-XXenFZWN4AB8KCXugzJ/84GcuDBKruuEiP+SLE7wkkD3xSN4BPSTsSZJGMJZNXCSk5BJcVIy8pqGXqZxbNYp6w==`, verified against the downloaded archive     |
| Scratch lockfile, Effect 4                     | `bun.lock` SHA-256 `087c5b3324091048e523a89a610f84fd19d64c1ee6c17c7f497144e93bd86880`                                                                                                    |
| Scratch lockfile, Effect 3                     | `bun.lock` SHA-256 `b15313873e3a3ca10bc4c7d50ff3afe17726c06f692f56f023d935e8d6f5c51d`                                                                                                    |

## Procedure

Run from an empty directory outside the repository. The probe sources below are
the sources of record; `cause.mjs` is a shared helper. Each probe prints one
JSON line ending in a `verdict`; `invalid-control` means its control failed and
the observation must not be used.

The transcripts below were reproduced on 29 October 2026 from the revised P5,
P6, and P7 sources with their strengthened controls. Each source was extracted
from this record, checked against its recorded SHA-256, written into the pinned
scratch directory, and executed under Bun 1.4.2. Every control returned valid:
the P5 `controlKeepsBoth`, the P6 `bothStarted` and
`honouring.settledAtInterruptReturn` checks, and P7's `orderedControl`,
`perChildControl`, and `observedControl` are all `true` in the outputs below.
The earlier transcripts, produced before the controls were strengthened, are
superseded.

```sh
export PATH="$HOME/.local/share/bun-versions/1.4.2/bin:$PATH"   # Bun 1.4.2
mkdir effect-4 && cd effect-4
printf '{"name":"refex-audit-effect-4","private":true,"type":"module"}\n' > package.json
bun add --exact effect@4.0.5
mkdir probes   # write cause.mjs and probe-p1.mjs to probe-p7.mjs from this record
for n in 1 2 3 4 5 6 7; do bun probes/probe-p$n.mjs; done
bun audit
# Effect 3 comparison: repeat in a sibling directory with effect@3.22.2, running P2 to P7.
```

The plan limits Effect 3.22.2 runs to P7 and to probes that Effect 4.0.x fails.
P2 to P6 also ran on Effect 3.22.2 so that the "neither line provides it"
statements below rest on execution rather than source reading.

## Probes

### Shared helper

SHA-256 `39e4365b7f7d2b6f08f9c93fb30533ebcca4efd61de830840111c809aae4f4e6`.

```js
// Describes a cause from either Effect line: flat `reasons` (4.x) or a tagged tree (3.x).
export const describe = (cause) =>
  Array.isArray(cause?.reasons)
    ? { shape: "flat", reasons: cause.reasons.map(reason) }
    : { shape: "tree", tree: tree(cause) };
const reason = (r) =>
  r._tag === "Fail"
    ? `Fail(${String(r.error)})`
    : r._tag === "Die"
      ? `Die(${String(r.defect)})`
      : r._tag;
const tree = (c) =>
  c._tag === "Sequential" || c._tag === "Parallel"
    ? { [c._tag]: [tree(c.left), tree(c.right)] }
    : c._tag === "Fail"
      ? `Fail(${String(c.error)})`
      : c._tag === "Die"
        ? `Die(${String(c.defect)})`
        : c._tag;
export const tick = (n = 5) => new Promise((r) => setTimeout(r, n));
```

### P1: lazy provision

Question: Does supplying a service run environment access before execution, and
does each execution run afresh? Control: the counters after each run show that
access is observable.

SHA-256 `6b09fe1f9f3bdee6952220eb20d187706aef44795941f3db2980a658145fb97f`.

```js
// P1 lazy provision: does supplying a service run environment access?
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
const Config = Context.Service("Config");
let accessed = 0;
const program = Effect.flatMap(Config, (c) =>
  Effect.sync(() => {
    accessed += 1;
    return c.value;
  }),
);
const provided = Effect.provideService(program, Config, { value: 42 });
const afterProvide = accessed;
const value = await Effect.runPromise(provided); // control: access is observable
const afterRun = accessed;
await Effect.runPromise(provided); // re-execution runs afresh
console.log(
  JSON.stringify({
    probe: "P1",
    afterProvide,
    afterRun,
    afterSecondRun: accessed,
    value,
    verdict: afterProvide === 0 && afterRun === 1 && accessed === 2 ? "preserved" : "lost",
  }),
);
```

Effect 4.0.5:

```json
{
  "probe": "P1",
  "afterProvide": 0,
  "afterRun": 1,
  "afterSecondRun": 2,
  "value": 42,
  "verdict": "preserved"
}
```

Effect 3.22.2: not run.

Interpretation: Provision is lazy and re-execution runs afresh. refex owns
laziness either way, so this probe ran on Effect 4.0.5 only.

### P2: mixed-cause `mapError`

Question: Does `mapError` keep a simultaneous release defect when the body
fails? Control: the unmapped run must show both `Fail(body-failed)` and
`Die(release-defect)`.

SHA-256 `a2043508321604cf919ace313f24342927b98d6d481a02ae69f7a57b2524d3d7`.

```js
// P2 mixed-cause mapError: body failure plus a release defect.
import * as Effect from "effect/Effect";
import { describe } from "./cause.mjs";
const mixed = Effect.scoped(
  Effect.flatMap(
    Effect.acquireRelease(Effect.succeed("handle"), () => Effect.die("release-defect")),
    () => Effect.fail("body-failed"),
  ),
);
const control = await Effect.runPromiseExit(mixed); // control: both reasons exist
const mapped = await Effect.runPromiseExit(Effect.mapError(mixed, (e) => `mapped:${e}`));
const c = describe(control.cause),
  m = describe(mapped.cause);
const hasDie = (d) => JSON.stringify(d).includes("release-defect");
console.log(
  JSON.stringify({
    probe: "P2",
    control: c,
    mapped: m,
    verdict: hasDie(c) ? (hasDie(m) ? "preserved" : "lost") : "invalid-control",
  }),
);
```

Effect 4.0.5:

```json
{
  "probe": "P2",
  "control": {
    "shape": "flat",
    "reasons": [
      "Fail(body-failed)",
      "Die(release-defect)"
    ]
  },
  "mapped": {
    "shape": "flat",
    "reasons": [
      "Fail(mapped:body-failed)"
    ]
  },
  "verdict": "lost"
}
```

Effect 3.22.2:

```json
{
  "probe": "P2",
  "control": {
    "shape": "tree",
    "tree": {
      "Sequential": [
        "Fail(body-failed)",
        "Die(release-defect)"
      ]
    }
  },
  "mapped": {
    "shape": "tree",
    "tree": "Fail(mapped:body-failed)"
  },
  "verdict": "lost"
}
```

Interpretation: Both lines lose the release defect. refex must not delegate
leaf-wise mapping to `mapError`.

### P3: repeated scope close

Question: Does a second `Scope.close` join an in-flight finalizer? Control: the
first close must enter the finalizer exactly once.

SHA-256 `6f8a7664de3aa52cd036febb81e3be878e267faaf47d2c02e723190a0ba7d9c1`.

```js
// P3 repeated scope close while the first close's finalizer is still running.
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Scope from "effect/Scope";
import { tick } from "./cause.mjs";
const scope = Effect.runSync(Scope.make());
let entries = 0,
  open;
const gate = new Promise((r) => {
  open = r;
});
Effect.runSync(
  Scope.addFinalizer(
    scope,
    Effect.promise(() => {
      entries += 1;
      return gate;
    }),
  ),
);
let first = false,
  second = false;
const p1 = Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))).then(() => {
  first = true;
});
await tick();
const entriesAfterFirst = entries; // control: exactly one entry
const p2 = Effect.runPromise(Scope.close(scope, Exit.succeed(undefined))).then(() => {
  second = true;
});
await tick(20);
const secondBeforeRelease = second,
  firstBeforeRelease = first;
open();
await Promise.all([p1, p2]);
console.log(
  JSON.stringify({
    probe: "P3",
    entriesAfterFirst,
    totalEntries: entries,
    firstBeforeRelease,
    secondBeforeRelease,
    verdict:
      entriesAfterFirst !== 1
        ? "invalid-control"
        : secondBeforeRelease
          ? "returned-immediately"
          : "joined",
  }),
);
```

Effect 4.0.5:

```json
{
  "probe": "P3",
  "entriesAfterFirst": 1,
  "totalEntries": 1,
  "firstBeforeRelease": false,
  "secondBeforeRelease": true,
  "verdict": "returned-immediately"
}
```

Effect 3.22.2:

```json
{
  "probe": "P3",
  "entriesAfterFirst": 1,
  "totalEntries": 1,
  "firstBeforeRelease": false,
  "secondBeforeRelease": true,
  "verdict": "returned-immediately"
}
```

Interpretation: Both lines return from the second close immediately. refex owns
joined close.

### P4: keyed replacement

Question: Does `FiberMap.run` wait for the replaced fibre's finalizer before
starting the successor or returning? Control: the replaced fibre's finalizer
must be observed entering.

SHA-256 `95b3c87a81cce228d98760a5f5aa5b60f1df8cda9056872cbdc6e0c8f148f5ef`.

```js
// P4 keyed replacement: does FiberMap.run await the replaced fibre's finalizer?
import * as Effect from "effect/Effect";
import * as FiberMap from "effect/FiberMap";
import { tick } from "./cause.mjs";
let runReturnedBeforeFinalizerDone = null;
let open,
  finalizerEntered = false,
  finalizerDone = false,
  successorStartedBeforeFinalizerDone = null;
const gate = new Promise((r) => {
  open = r;
});
const first = Effect.ensuring(
  Effect.never,
  Effect.promise(() => {
    finalizerEntered = true;
    return gate.then(() => {
      finalizerDone = true;
    });
  }),
);
const second = Effect.sync(() => {
  successorStartedBeforeFinalizerDone = !finalizerDone;
});
const program = Effect.scoped(
  Effect.gen(function* () {
    const map = yield* FiberMap.make();
    yield* FiberMap.run(map, "k", first);
    yield* Effect.promise(() => tick(5));
    setTimeout(open, 30); // release the old finalizer later, independently
    yield* FiberMap.run(map, "k", second);
    runReturnedBeforeFinalizerDone = !finalizerDone;
    yield* Effect.promise(() => tick(60));
  }),
);
await Effect.runPromise(program);
console.log(
  JSON.stringify({
    probe: "P4",
    finalizerEntered,
    finalizerDone,
    successorStartedBeforeFinalizerDone,
    runReturnedBeforeFinalizerDone,
    verdict: !finalizerEntered
      ? "invalid-control"
      : successorStartedBeforeFinalizerDone || runReturnedBeforeFinalizerDone
        ? "not-awaited"
        : "awaited",
  }),
);
```

Effect 4.0.5:

```json
{
  "probe": "P4",
  "finalizerEntered": true,
  "finalizerDone": true,
  "successorStartedBeforeFinalizerDone": true,
  "runReturnedBeforeFinalizerDone": true,
  "verdict": "not-awaited"
}
```

Effect 3.22.2:

```json
{
  "probe": "P4",
  "finalizerEntered": true,
  "finalizerDone": true,
  "successorStartedBeforeFinalizerDone": true,
  "runReturnedBeforeFinalizerDone": true,
  "verdict": "not-awaited"
}
```

Interpretation: Both lines start the successor, and return, before the old
finalizer completes. refex owns the generation gate. The verdict checks both
early-behaviour flags; either one rejects joined replacement. On
30 October 2026 (Europe/Berlin; 29 October UTC) the revised source was rerun
under Bun 1.4.2 against both pinned versions. Both flags were `true` in each
run, reproducing the transcripts above.

### P5: promise projection

Question: What does `runPromise` reject with for a mixed cause, compared with
`runPromiseExit`? Control: `runPromiseExit` must expose both reasons.

SHA-256 `dab5399d8c0e4254506a517a57aed16728b782e9b0635e00f6d12f8b1550c6e7`.

```js
// P5 promise projection: what does runPromise reject with for a mixed cause?
import * as Effect from "effect/Effect";
import { describe } from "./cause.mjs";
const mixed = Effect.scoped(
  Effect.flatMap(
    Effect.acquireRelease(Effect.succeed("handle"), () => Effect.die("release-defect")),
    () => Effect.fail("body-failed"),
  ),
);
const exit = await Effect.runPromiseExit(mixed); // control: full cause available
const controlText = JSON.stringify(exit);
const controlKeepsBoth =
  controlText.includes("body-failed") && controlText.includes("release-defect");
let rejection;
try {
  await Effect.runPromise(mixed);
} catch (error) {
  rejection = error;
}
const rejected = {
  type: rejection instanceof Error ? rejection.constructor.name : typeof rejection,
  text: String(rejection).split("\n"),
};
const text = JSON.stringify(rejected);
const keepsBoth = text.includes("body-failed") && text.includes("release-defect");
console.log(
  JSON.stringify({
    probe: "P5",
    exitCause: describe(exit.cause),
    rejection: rejected,
    controlKeepsBoth,
    verdict: !controlKeepsBoth
      ? "invalid-control"
      : keepsBoth
        ? "full"
        : "squashed",
  }),
);
```

Effect 4.0.5:

```json
{
  "probe": "P5",
  "exitCause": {
    "shape": "flat",
    "reasons": [
      "Fail(body-failed)",
      "Die(release-defect)"
    ]
  },
  "rejection": {
    "type": "string",
    "text": [
      "body-failed"
    ]
  },
  "controlKeepsBoth": true,
  "verdict": "squashed"
}
```

Effect 3.22.2:

```json
{
  "probe": "P5",
  "exitCause": {
    "shape": "tree",
    "tree": {
      "Sequential": [
        "Fail(body-failed)",
        "Die(release-defect)"
      ]
    }
  },
  "rejection": {
    "type": "FiberFailureImpl",
    "text": [
      "(FiberFailure) Error: body-failed",
      "Error: release-defect"
    ]
  },
  "controlKeepsBoth": true,
  "verdict": "full"
}
```

Interpretation: Effect 4.0.5 rejects with the bare expected error value (a
string here), dropping the defect. Effect 3.22.2 rejects with a `FiberFailure`
that names both. refex uses `runPromiseExit` on either line and owns any lossy
projection.

### P6: interrupting `tryPromise`

Question: Does interruption wait for promise work that ignores its abort
signal? Control: the variant that honours abort must have settled when
interruption returns.

SHA-256 `8e925b7afd2a7193ba0066b260a909b5a35a748372686c9078adf4a4557c4283`.

```js
// P6 interrupting tryPromise whose work ignores (or honours) its abort signal.
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import { tick } from "./cause.mjs";
const run = async (honours) => {
  let rawSettled = false,
    started = false;
  const work = Effect.tryPromise({
    try: (signal) =>
      new Promise((resolve, reject) => {
        started = true;
        const timer = setTimeout(() => {
          rawSettled = true;
          resolve("done");
        }, 60);
        if (honours)
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            rawSettled = true;
            reject(new Error("aborted"));
          });
      }),
    catch: (e) => e,
  });
  const fiber = Effect.runFork(work);
  await tick();
  await Effect.runPromise(Fiber.interrupt(fiber));
  const settledAtInterruptReturn = rawSettled;
  await tick(80);
  return { started, settledAtInterruptReturn, settledLater: rawSettled };
};
const ignoring = await run(false),
  honouring = await run(true); // honouring is the control
const bothStarted = ignoring.started && honouring.started;
console.log(
  JSON.stringify({
    probe: "P6",
    ignoring,
    honouring,
    bothStarted,
    verdict: !bothStarted
      ? "invalid-control"
      : !honouring.settledAtInterruptReturn
        ? "invalid-control"
        : ignoring.settledAtInterruptReturn
          ? "awaited"
          : "not-awaited",
  }),
);
```

Effect 4.0.5:

```json
{
  "probe": "P6",
  "ignoring": {
    "started": true,
    "settledAtInterruptReturn": false,
    "settledLater": true
  },
  "honouring": {
    "started": true,
    "settledAtInterruptReturn": true,
    "settledLater": true
  },
  "bothStarted": true,
  "verdict": "not-awaited"
}
```

Effect 3.22.2:

```json
{
  "probe": "P6",
  "ignoring": {
    "started": true,
    "settledAtInterruptReturn": false,
    "settledLater": true
  },
  "honouring": {
    "started": true,
    "settledAtInterruptReturn": true,
    "settledLater": true
  },
  "bothStarted": true,
  "verdict": "not-awaited"
}
```

Interpretation: On both lines the local wait ends while ignoring work is still
running. This is a stop-waiting contract, not confirmed termination; refex
adapters must say which they provide.

### P7: cause structure and separate observation

Question: Does the cause keep order and parallel branches, and can an adapter
observe body and finalizer exits separately? Control: an explicit `ensuring`
order must be visible in the cause.

SHA-256 `9fdb01963999acf0be442a01b41b0ca8f43cbc28e78a985f56b12a82166d94e9`.

```js
// P7 cause structure, and whether body and finalizer exits are separately observable.
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Scope from "effect/Scope";
import { describe } from "./cause.mjs";
const lifecycle = await Effect.runPromiseExit(
  Effect.scoped(
    Effect.flatMap(
      Effect.acquireRelease(Effect.succeed("h"), () => Effect.die("finalizer-defect")),
      () => Effect.fail("body-failed"),
    ),
  ),
);
const parallel = await Effect.runPromiseExit(
  Effect.all([Effect.fail("left"), Effect.fail("right")], {
    concurrency: "unbounded",
    mode: "default",
  }),
);
const perChild = await Effect.runPromise(
  // owned combinator: keep every child exit
  Effect.all([Effect.exit(Effect.fail("left")), Effect.exit(Effect.fail("right"))], {
    concurrency: "unbounded",
  }),
);
const ordered = await Effect.runPromiseExit(
  // control: explicit order is visible
  Effect.ensuring(Effect.fail("first"), Effect.die("second")),
);
// Separate observation: an adapter-owned scope sees the body exit at close and wraps the finalizer.
const observed = await Effect.runPromise(
  Effect.gen(function* () {
    const scope = yield* Scope.make();
    let bodyExitSeen, finalizerExit;
    yield* Scope.addFinalizerExit(scope, (exit) =>
      Effect.flatMap(Effect.exit(Effect.die("finalizer-defect")), (fin) =>
        Effect.sync(() => {
          bodyExitSeen = exit;
          finalizerExit = fin;
        }),
      ),
    );
    const body = yield* Effect.exit(Effect.fail("body-failed"));
    yield* Scope.close(scope, body);
    return { body: describe(bodyExitSeen.cause), finalizer: describe(finalizerExit.cause) };
  }),
);
const shapeOf = (d) => d.shape;
// Controls: the ordered line must show both reasons, the per-child line must
// show both children, and the separate observation must carry both exits.
const orderedText = JSON.stringify(describe(ordered.cause));
const orderedControl =
  orderedText.includes("first") &&
  orderedText.includes("second") &&
  orderedText.indexOf("first") < orderedText.indexOf("second");
const childText = perChild.map((entry) => JSON.stringify(describe(entry.cause)));
const perChildControl =
  perChild.length === 2 &&
  childText[0].includes("Fail(left)") &&
  childText[1].includes("Fail(right)");
const observedControl =
  JSON.stringify(observed.body).includes("body-failed") &&
  JSON.stringify(observed.finalizer).includes("finalizer-defect");
const controlsHold = orderedControl && perChildControl && observedControl;
console.log(
  JSON.stringify({
    probe: "P7",
    lifecycle: describe(lifecycle.cause),
    parallel: describe(parallel.cause),
    perChild: perChild.map((e) => describe(e.cause)),
    ordered: describe(ordered.cause),
    observed,
    orderedControl,
    perChildControl,
    observedControl,
    verdict: !controlsHold
      ? "invalid-control"
      : `${shapeOf(describe(lifecycle.cause))}; separately-observable=${
          JSON.stringify(observed.body).includes("body-failed") &&
      JSON.stringify(observed.finalizer).includes("finalizer-defect")
    }`,
  }),
);
```

Effect 4.0.5:

```json
{
  "probe": "P7",
  "lifecycle": {
    "shape": "flat",
    "reasons": [
      "Fail(body-failed)",
      "Die(finalizer-defect)"
    ]
  },
  "parallel": {
    "shape": "flat",
    "reasons": [
      "Fail(left)"
    ]
  },
  "perChild": [
    {
      "shape": "flat",
      "reasons": [
        "Fail(left)"
      ]
    },
    {
      "shape": "flat",
      "reasons": [
        "Fail(right)"
      ]
    }
  ],
  "ordered": {
    "shape": "flat",
    "reasons": [
      "Fail(first)",
      "Die(second)"
    ]
  },
  "observed": {
    "body": {
      "shape": "flat",
      "reasons": [
        "Fail(body-failed)"
      ]
    },
    "finalizer": {
      "shape": "flat",
      "reasons": [
        "Die(finalizer-defect)"
      ]
    }
  },
  "orderedControl": true,
  "perChildControl": true,
  "observedControl": true,
  "verdict": "flat; separately-observable=true"
}
```

Effect 3.22.2:

```json
{
  "probe": "P7",
  "lifecycle": {
    "shape": "tree",
    "tree": {
      "Sequential": [
        "Fail(body-failed)",
        "Die(finalizer-defect)"
      ]
    }
  },
  "parallel": {
    "shape": "tree",
    "tree": {
      "Parallel": [
        "Fail(left)",
        "Fail(right)"
      ]
    }
  },
  "perChild": [
    {
      "shape": "tree",
      "tree": "Fail(left)"
    },
    {
      "shape": "tree",
      "tree": "Fail(right)"
    }
  ],
  "ordered": {
    "shape": "tree",
    "tree": {
      "Sequential": [
        "Fail(first)",
        "Die(second)"
      ]
    }
  },
  "observed": {
    "body": {
      "shape": "tree",
      "tree": "Fail(body-failed)"
    },
    "finalizer": {
      "shape": "tree",
      "tree": "Die(finalizer-defect)"
    }
  },
  "orderedControl": true,
  "perChildControl": true,
  "observedControl": true,
  "verdict": "tree; separately-observable=true"
}
```

Interpretation: Effect 4.0.5 keeps reasons in a flat, ordered list and
`Effect.all` reports only the first of two concurrent failures; Effect 3.22.2
keeps a `Sequential`/`Parallel` tree. On both lines an adapter-owned scope
observes the body exit at close and wraps the finalizer to observe its exit
separately, and per-child `Effect.exit` keeps every branch. refex can therefore
build ordered and parallel structure at its own composition points.

## Primitive sufficiency on Effect 4.0.5

Each primitive refex plans to build on was located in the installed source
(`node_modules/effect/src`) and imported through a deep subpath. The probes
exercised those marked "probed".

| Primitive                                                                                | Location                                | Evidence               |
| ---------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------- |
| `Exit` and `Effect.exit`                                                                 | `effect/Exit`, `effect/Effect`          | Probed (P2, P5, P7)    |
| `Effect.catchCause`, `Effect.failCause`                                                  | `effect/Effect`                         | Present; bundled below |
| `Scope.make`, `Scope.addFinalizer`, `Scope.addFinalizerExit`, `Scope.close(scope, exit)` | `effect/Scope`                          | Probed (P3, P7)        |
| `Effect.uninterruptibleMask`                                                             | `effect/Effect`                         | Present; bundled below |
| `Effect.tryPromise` with an `AbortSignal`                                                | `effect/Effect`                         | Probed (P6)            |
| `Deferred`                                                                               | `effect/Deferred`                       | Present; bundled below |
| Deep subpath imports                                                                     | `package.json` `exports` includes `./*` | Bundled below          |

## Advisories and bundle

`bun audit` in the Effect 4.0.5 scratch directory reported "No vulnerabilities
found (checked 1 package)".

A browser-target `Bun.build` of the entry below, importing only `effect/Cause`,
`effect/Deferred`, `effect/Effect`, `effect/Exit`, `effect/Fiber`, and
`effect/Scope` and touching the primitives above, was rebuilt and scanned on
29 October 2026 under Bun 1.4.2. It produced 95,399 minified bytes (32,901
gzipped) containing no `new Function` and no `eval(`:

```json
{"minifiedBytes":95399,"gzipBytes":32901,"newFunction":0,"evalCall":0}
```

An earlier, unpreserved entry measured 30,208 minified bytes (10,571 gzipped).
Tree shaking depends on which exports are reachable, so those figures describe
that entry only and do not carry over. The measured figures above supersede
them, and the scan result now applies to the entry below: the claim this record
rests on is the absence of dynamic evaluation, not a size budget. An earlier
draft of this section claimed the figures and the scan result were both
historical; the rebuild shows otherwise.

`bundle/entry.mjs` is the whole entry; the measurement is not reproducible
without it, because the import set and the usage decide what tree shaking keeps:

```js
// bundle/entry.mjs: the exact import set the measurement claims to bundle.
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Scope from "effect/Scope";

// Reach every namespace so the bundler cannot drop a requested module, and
// touch the primitives the probe table marks as bundled.
export const entry = {
  Cause,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Scope,
  catchCause: Effect.catchCause,
  failCause: Effect.failCause,
  uninterruptibleMask: Effect.uninterruptibleMask,
  make: Scope.make,
  addFinalizer: Scope.addFinalizer,
  addFinalizerExit: Scope.addFinalizerExit,
  close: Scope.close,
  deferred: Deferred.make,
};
```

```js
const result = await Bun.build({ entrypoints: ["./bundle/entry.mjs"], minify: true, target: "browser" });
const text = await result.outputs[0].text();
console.log({ minifiedBytes: text.length, gzipBytes: Bun.gzipSync(new TextEncoder().encode(text)).length,
  newFunction: (text.match(/new Function/g) ?? []).length, evalCall: (text.match(/\beval\(/g) ?? []).length });
```

The entry above is stored as `bundle/entry.mjs` in the Effect 4.0.5 scratch
directory and its SHA-256 is
`b8f2fea7ac638ff344ff217971a14b5f2c7efeb26a3c464dfe844f22112db383`. Run the
build snippet as `bundle/build.mjs` with `bun bundle/build.mjs`.

## Static audit of the Reventless bindings

`@reventlessdev/rescript-effect` 1.0.0-alpha.0 was unpacked into an empty
directory and read, never executed. It is a binding of Effect 3.22.2 with 2,038
lines of ReScript across 22 modules.

Packaging and dependency findings:

- `package.json` lists `effect` 3.22.2 and `@reventlessdev/rescript-jest`
  1.0.0-alpha.12 as production dependencies; the latter declares a `jest` peer.
  `rescript.json` also lists `@reventlessdev/rescript-jest` under production
  `dependencies`.
- `rescript.json` has no `namespace`, so the package exposes global
  top-level modules named `Effect`, `Cause`, `Exit`, `Context`, `Layer`,
  `Fiber`, and others.
- Warning policy is `"error": "-44+101"`, far weaker than refex's `+A`.

Coverage of the primitives above: no `Scope`, `FiberMap`, or managed-runtime
module; no binding for `mapError`, `catchCause`, `failCause`, `sandbox`,
`uninterruptibleMask`, `addFinalizer`, or `exit`.

Signatures that invent or erase types. Phantom polymorphism such as
`succeed: 'a => t<'a, 'e, 'r>` is sound and excluded; these are not:

| Binding                                                                                 | Signature                                                             | Problem                                                   |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| `Effect.either`                                                                         | `t<'a, 'e, 'r> => t<result<'a, 'e>, 'e2, 'r>`                         | A mixed cause keeps old `'e` leaves typed as any `'e2`    |
| `Effect.catchAll`                                                                       | `(t<'a, 'e, 'r>, 'e => t<'a, 'e2, 'r>) => t<'a, 'e2, 'r>`             | Same hole for mixed causes                                |
| `Effect.scoped`                                                                         | `t<'a, 'e, 'r> => t<'a, 'e, 'r2>`                                     | Erases every requirement, not only the scope              |
| `Effect.provide`                                                                        | `(t<'a, 'e, 'r>, 'layer) => t<'a, 'e, unit>`                          | Accepts any value as a layer and erases requirements      |
| `Effect.provideService`                                                                 | `(t<'a, 'e, 'r>, Context.tag<'service>, 'service) => t<'a, 'e, unit>` | Removes all requirements, not only the provided service   |
| `Effect.runPromise`, `runSync`                                                          | `t<'a, 'e, 'r> => …`                                                  | Runs with unsatisfied requirements                        |
| `Effect.acquireRelease`                                                                 | release `('a, Exit.t<'b, 'e2>) => t<unit, 'e3, 'r>`                   | A failing release's `'e3` disappears from the result type |
| `Effect.tagAsEffect`                                                                    | `= "%identity"`                                                       | Unchecked cast                                            |
| `EffectOption.toOption`                                                                 | `%raw`                                                                | Unchecked conversion                                      |
| `Stream.arrayFrom`, `effectOptionGetOrUndefined`, `chunkFromIterable`, `toEffectOption` | free result types                                                     | Unchecked casts                                           |
| `Context.genericTag`                                                                    | `string => tag<'a>`                                                   | Caller chooses the service type unchecked                 |

## Compelling-reason assessment

The plan's `Decision log` makes Effect 4.0.x the default and names three
compelling reasons that could select Effect 3.22.x instead.

1. Body and finalizer exits not separately observable on Effect 4.0.x: not
   met. P7 observed both separately on both lines.
2. A primitive missing or broken on Effect 4.0.x without an adapter-local
   workaround: not met. Every listed primitive is present, and P1 to P7 found
   no primitive behaving differently from its documentation.
3. An advisory with no fix, or unavoidable dynamic evaluation, affecting only
   Effect 4.0.x: not met. No advisories, and the deep-import bundle contains no
   `new Function` or `eval(`.

Not compelling on their own, as the plan states: the flat cause, which refex
replaces with its own structure; the 4.0.x release cadence; and the existence
of the Reventless bindings, which target Effect 3.

## Must-not-delegate facts

Neither Effect line provides these refex contracts, so refex owns them:
leaf-wise expected-error mapping (P2), joined close (P3), awaiting predecessor
cleanup before a successor (P4), a full-outcome promise boundary with any lossy
projection explicit (P5), and confirmed termination of work that ignores
cancellation (P6).

## Limits

- One host, one Bun version, and one run per probe. Timing-based probes (P3,
  P4, P6) use short real delays; their verdicts are about ordering, not speed.
- An earlier P4 design that released the old finalizer only after the second
  `FiberMap.run` timed out on Effect 3.22.2 after 30 seconds. The redesign
  releases it from an independent timer; the reason for the original hang was
  not isolated, and no conclusion is drawn from it.
- The static audit reads source text. It does not establish runtime behaviour
  of the bindings, and the free-type-variable scan is a text heuristic checked
  by reading each flagged signature.
- Effect upgrades can change every observation here. ADR 004 requires a fresh
  audit on any minor or patch upgrade.

## Decision

H-RT is not falsified for Effect 4.0.5, and no compelling reason selects Effect
3.22.x. This evidence supports ADR 004's provisional selection of `effect`
4.0.5 behind refex-owned narrow bindings, with the Reventless package treated
as prior art and as the source of the unsound-signature counterexamples cited by
[ADR 006](../adr-006-complete-outcomes.md).
