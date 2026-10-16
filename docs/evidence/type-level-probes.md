# Evidence: type-level probes for ADRs 005 and 006

Status: source evidence for roadmap tasks 1.1.3 and 1.1.4, not refex
conformance. Date: 17 October 2026. Pins: ReScript 12.3.1 (the repository's
`node_modules/.bin/rescript`), Bun 1.4.2.

## Claim

Scratch ReScript projects test whether the type-level claims that ADR 005
(structural dependency environments) and ADR 006 (complete outcomes) rely on
hold under the pinned compiler, and whether each falsifier those ADRs name is
observable. Every probe crosses at least one `.res`/`.resi` boundary; none
relies on inline annotations, which can unify a supposedly free type variable
away. The probes use toy `Cause`, `IO`, and `Fx` modules shaped like the
proposed representation, not refex source, so they establish what the compiler
does with that shape and nothing about a refex implementation.

## Pins and environment

| Item           | Value                                                                |
| -------------- | -------------------------------------------------------------------- |
| Compiler       | ReScript 12.3.1 from the repository's locked `node_modules`          |
| Warning policy | `{"number": "+A", "error": "+A"}`, matching `rescript.json`          |
| Module format  | ES modules, in-source, suffix `.res.mjs`, no namespace               |
| Runtime check  | Bun 1.4.2 with `@rescript/runtime` 12.3.1 linked from the repository |

## Procedure

From the repository root with the pinned toolchain installed, copy the harness
and probe definitions from the appendices into an empty scratch directory and
run:

```sh
export PATH="$HOME/.local/share/bun-versions/1.4.2/bin:$PATH"   # Bun 1.4.2
python3 -I harness.py "$PWD/node_modules/.bin/rescript" > results.jsonl
```

`harness.py` writes each probe into its own project under `build/`, compiles
it, and checks the outcome. A positive probe must compile. A negative probe
passes only when compilation fails, the output names the expected source file,
and it contains the probe's named diagnostic text. Any other failure, such as a
syntax error, an unrelated warning, or a missing module, is reported as
`invalid`, never as a pass. Each negative probe is paired with a positive
control that differs in one respect, for example `R3` with `R2` and `f3` with
`f2`.

The runtime check builds `n4`, links `@rescript/runtime` into its build
directory, and calls `Forge.reached()`, which passes a forged `Never.t` to
`Never.absurd`:

```sh
cd build/n4-forgeries-outside-module
mkdir -p node_modules/@rescript && ln -sfn "$REPO/node_modules/@rescript/runtime" node_modules/@rescript/runtime
bun -e 'const m = await import("./src/Forge.res.mjs");
  try { m.reached() } catch (e) { console.log("threw:", e.message) }'
# threw: Panic! Never.absurd reached
```

Calibration: the first runs exposed probe defects rather than compiler facts.
These were an array-based cause that cannot be covariant, which became probe
`c1`; Warning 4 (fragile match) on a catch-all pattern; a missing `type rec`;
and an abstract implementation without declared variance. Each was corrected in
the probe, never by weakening an expectation. Two expected diagnostic strings
were also tightened to the compiler's exact wording after the corresponding
failure had been confirmed as the intended type error.

## Results

The harness ran 25 probes and 25 passed. A negative probe passes only when it
fails with its named diagnostic in its named file.

| Probe                                      | Informs | Claim                                                                                          | Expectation             | Verdict | Key diagnostic                                                                                                |
| ------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------- | ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `R1-accumulate`                            | ADR 005 | Accessors from separately compiled modules accumulate one open row.                            | compiles                | pass    | compiled                                                                                                      |
| `R2-extra-field-open`                      | ADR 005 | An open row accepts an environment with an extra field.                                        | compiles                | pass    | compiled                                                                                                      |
| `R3-missing-field`                         | ADR 005 | A missing capability is rejected at the `provide` argument.                                    | fails in `Main.res`     | pass    | `The first object is expected to have a field "log" of type Log.service, but it does not.`                    |
| `R4-conflicting-field`                     | ADR 005 | One key used with two service types is rejected at the composition expression.                 | fails in `Conflict.res` | pass    | `Field "clock" in the passed object has type OtherClock.service, but is expected to have type Clock.service.` |
| `R5-value-export`                          | ADR 005 | A non-function accessor export gets a weak row at the exporting binding.                       | fails in `Clock.res`    | pass    | `let now: Fx.t<int, '_weak1, {_.."clock": service}>`                                                          |
| `R6-closed-row-extra-field`                | ADR 005 | A closed-row export rejects an extra environment field.                                        | fails in `Main.res`     | pass    | `The second object is expected to have a field "extra" of type int, but it does not.`                         |
| `R6b-closed-row-with-coercion`             | ADR 005 | A consumer-side `:>` admits the extra field; ADR 005 counts this as a cast.                    | compiles                | pass    | compiled                                                                                                      |
| `R7-projection`                            | ADR 005 | Explicit projection composes without casts.                                                    | compiles                | pass    | compiled                                                                                                      |
| `R8-wrong-projection`                      | ADR 005 | A projection omitting a required field is rejected.                                            | fails in `Main.res`     | pass    | `The first object is expected to have a field "log" of type Log.service, but it does not.`                    |
| `R9a-open-error-injection`                 | ADR 006 | Open polymorphic-variant errors compose across `.resi` files.                                  | compiles                | pass    | compiled                                                                                                      |
| `R9b-closed-error-injection`               | ADR 006 | Closed polymorphic-variant errors do not compose.                                              | fails in `Combined.res` | pass    | `These polymorphic variants are incompatible - they share no common constructors.`                            |
| `n1-recursive-encodings-inhabited`         | ADR 006 | Self-referential record and variant encodings are inhabited through `let rec`.                 | compiles                | pass    | compiled                                                                                                      |
| `n2-polymorphic-field-rejects-let-rec`     | ADR 006 | A field of type `'a. 'a` cannot be built by `let rec`.                                         | fails in `Never.res`    | pass    | `` This kind of expression is not allowed as right-hand side of `let rec' ``                                  |
| `n3-construction-inside-module`            | ADR 006 | Inside `Never.res` a diverging constructor compiles, so the module is trusted.                 | compiles                | pass    | compiled                                                                                                      |
| `n4-forgeries-outside-module`              | ADR 006 | `%identity`, a polymorphic `@val external`, and `%raw` forge `Never.t`.                        | compiles                | pass    | compiled                                                                                                      |
| `n5-absurd-total-and-loud`                 | ADR 006 | `absurd` eliminates an infallible error channel.                                               | compiles                | pass    | compiled                                                                                                      |
| `n5b-unit-is-not-never`                    | ADR 006 | `unit` is not accepted where `Never.t` is required.                                            | fails in `Use.res`      | pass    | `But it's expected to have type: Never.t`                                                                     |
| `f2-conservative-result`                   | ADR 006 | The conservative `result` admits lossless propagation of mixed causes.                         | compiles                | pass    | compiled                                                                                                      |
| `f3-free-error-rejects-lossless`           | ADR 006 | A free output error type rejects the lossless implementation.                                  | fails in `Fx.res`       | pass    | `is not included in`                                                                                          |
| `f4-free-error-forces-erasure`             | ADR 006 | The free output error type is implementable cast-free only by erasing expected leaves.         | compiles                | pass    | compiled                                                                                                      |
| `v1-ffi-variance-trusted`                  | ADR 005 | A declared `+'r` on an abstract type is accepted and admits a requirement-forgetting coercion. | compiles                | pass    | compiled                                                                                                      |
| `v2-reader-variance-rejects-forgetting`    | ADR 005 | Reader over IO derives `-'r` and rejects that coercion.                                        | fails in `Forget.res`   | pass    | `Type Fx.t<int, string, {"clock": int}> is not a subtype of`                                                  |
| `v2b-reader-rejects-covariant-declaration` | ADR 005 | Declaring `+'r` on Reader over IO is rejected.                                                 | fails in `Fx.res`       | pass    | `Their variances do not agree.`                                                                               |
| `c1-array-cause-forces-invariance`         | ADR 006 | A cause tree with `array` children cannot be covariant in its error type.                      | fails in `IO.res`       | pass    | `but it is injective invariant.`                                                                              |
| `c2-list-cause-allows-covariance`          | ADR 006 | The same tree with `list` children can be covariant.                                           | compiles                | pass    | compiled                                                                                                      |

## Interpretation for ADR 005

- Open rows accumulate across separately compiled modules only when every
  open-row export is a function (`R1`, `R5`). A value export, whether an
  accessor or a composed workflow, gets a weak row at the exporting binding.
- With function exports, a missing field is rejected at the `provide` argument
  (`R3`), and a conflicting field type is rejected at the composition expression
  (`R4`). Field keys are a global, string-keyed namespace, so ownership of
  each key needs a convention.
- An open row accepts extra fields (`R2`). A closed row rejects them (`R6`)
  unless the consumer writes a `:>` coercion (`R6b`), which ADR 005 classes as
  an annotation-level cast.
- Explicit projection composes without casts and rejects an incomplete
  projection (`R7`, `R8`).
- Declared variance is trusted on an abstract type: a declared `+'r` admits a
  coercion that forgets a requirement (`v1`). Implementing `Fx.t` as a Reader
  over `IO.t` lets the compiler derive `-'r`, reject that coercion (`v2`), and
  reject a covariant declaration (`v2b`). The remaining trust is in the
  variance that `IO.t` declares.

## Interpretation for ADR 006

- ReScript 12.3.1 has no empty variant. An abstract `Never.t` implemented as
  `{absurd: 'a. 'a}` cannot be built by `let rec` (`n2`), unlike
  self-referential encodings (`n1`). It still has no closed, terminating,
  cast-free value outside `Never.res`, but it can be forged through
  `%identity`, a polymorphic `@val external`, or `%raw` (`n4`), and `Never.res`
  itself can construct one by diverging (`n3`). `Never.res` and those escapes
  belong to the trusted base. `absurd` implemented as a panic is total (`n5`),
  and fails loudly on a forged value (runtime check). `unit` is rejected
  (`n5b`), but that control is weak on its own, because any type other than
  `unit` rejects `()`.
- The conservative `result: t<'a,'e,'r> => t<result<'a,'e>,'e,'r>` admits
  lossless propagation of a mixed cause (`f2`). A signature with a free output
  error type rejects the lossless implementation at the interface (`f3`), and
  is implementable without casts only by erasing expected leaves (`f4`). This
  is the implementation-level evidence for the parametricity argument in ADR
  006; the Reventless `either` and `catchAll` signatures take the cast branch.
- Open polymorphic-variant errors compose across modules (`R9a`); closed ones
  do not (`R9b`).
- A cause tree whose children are an `array` cannot be covariant in its error
  type (`c1`), because ReScript arrays are invariant. With `list` children it
  can be covariant (`c2`). The choice of representation therefore trades error
  covariance against verifier support: the deductive-verification route
  supports arrays, not lists.

## Limits

- The toy modules approximate the proposed representation and do not prove a
  refex implementation; committed fixtures are the acceptance of roadmap tasks
  1.2.2 and 1.2.3.
- Compiler acceptance establishes type-level facts only, not runtime
  ownership, laziness, or failure preservation.
- Diagnostics are matched as text from ReScript 12.3.1. Another compiler
  version may word them differently; the fixtures in 1.2.2 must pin the
  compiler they check.

## Decision

The ADR 005 falsifier is observable and non-vacuous with function exports, and
the ADR 006 recovery-family and uninhabited-channel claims hold as worded, with
the trusted base named. The array-versus-list variance trade-off is recorded
for ADR 006's cause representation.

## Appendix A: harness

`harness.py`, SHA-256
`2ff2cd89b709cc6c4e2a500eef09331fddaa105ba481d5d28fb5aef978d1a35d`.

```python
"""Materialise each scratch probe project, build it with the pinned compiler, and check the outcome.

A positive probe must compile. A negative probe must fail with its named diagnostic text, in its named file;
any other failure (syntax error, unrelated warning, missing module) marks the probe invalid, not passed.
"""
import json, os, re, shutil, subprocess, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
RESCRIPT = sys.argv[1]
CONFIG = {"name": "probe", "namespace": False, "sources": [{"dir": "src"}],
          "package-specs": {"module": "esmodule", "in-source": True}, "suffix": ".res.mjs",
          "warnings": {"number": "+A", "error": "+A"}}
sys.path.insert(0, ROOT)
from probes import PROBES  # noqa: E402
ANSI = re.compile(r"\x1b\[[0-9;]*m")
results = []
for probe in PROBES:
    d = os.path.join(ROOT, "build", probe["id"])
    shutil.rmtree(d, ignore_errors=True); os.makedirs(os.path.join(d, "src"))
    json.dump(CONFIG, open(os.path.join(d, "rescript.json"), "w"))
    for name, text in probe["files"].items():
        open(os.path.join(d, "src", name), "w").write(text.strip() + "\n")
    run = subprocess.run([RESCRIPT, "build"], cwd=d, capture_output=True, text=True)
    out = ANSI.sub("", run.stdout + run.stderr)
    compiled = run.returncode == 0
    if probe["expect"] == "compile":
        verdict = "pass" if compiled else "fail"
        key = "compiled" if compiled else next((l.strip() for l in out.splitlines() if l.strip()), "")
    else:
        file_ok = f"src/{probe['site']}" in out
        text_ok = probe["diagnostic"] in out
        verdict = "pass" if (not compiled and file_ok and text_ok) else ("fail" if compiled else "invalid")
        key = next((l.strip() for l in out.splitlines() if probe["diagnostic"] in l), "")
    open(os.path.join(d, "build.out"), "w").write(out)
    results.append({"id": probe["id"], "expect": probe["expect"], "verdict": verdict, "key": key})
    print(json.dumps(results[-1]))
print(json.dumps({"total": len(results), "passed": sum(r["verdict"] == "pass" for r in results)}))
```

## Appendix B: probe definitions

`probes.py`, SHA-256
`61cf7e5b80ab1f3206f9fe8c2678532d1ea0dcc4fe71008fc9ed5e114cd87169`. Every file
each probe compiles is defined here.

```python
"""Type-level probe definitions for ADRs 005 and 006 (scratch only)."""
CAUSE = {"Cause.res": """
type rec t<'e> = Expected('e) | Defect(string) | Sequential(array<t<'e>>)
"""}
IO = {
"IO.resi": """
/** Toy dependency-free computation. An array-based cause makes the error parameter invariant. */
type t<+'a, 'e>
let succeed: 'a => t<'a, 'e>
let fail: 'e => t<'a, 'e>
let failCause: Cause.t<'e> => t<'a, 'e>
let flatMap: (t<'a, 'e>, 'a => t<'b, 'e>) => t<'b, 'e>
let foldCause: (t<'a, 'e>, Cause.t<'e> => t<'b, 'e2>, 'a => t<'b, 'e2>) => t<'b, 'e2>
let run: t<'a, 'e> => result<'a, Cause.t<'e>>
""",
"IO.res": """
type t<+'a, 'e> = unit => result<'a, Cause.t<'e>>
let succeed = a => () => Ok(a)
let fail = e => () => Error(Cause.Expected(e))
let failCause = cause => () => Error(cause)
let flatMap = (io, next) => () =>
  switch io() {
  | Ok(a) => next(a)()
  | Error(cause) => Error(cause)
  }
let foldCause = (io, onCause, onSuccess) => () =>
  switch io() {
  | Ok(a) => onSuccess(a)()
  | Error(cause) => onCause(cause)()
  }
let run = io => io()
"""}
FX_RESI = """
/** Reader over IO: the compiler derives the contravariance of 'r from Fx.res. */
type t<+'a, 'e, -'r>
let succeed: 'a => t<'a, 'e, 'r>
let fail: 'e => t<'a, 'e, 'r>
let access: ('r => 'a) => t<'a, 'e, 'r>
let flatMap: (t<'a, 'e, 'r>, 'a => t<'b, 'e, 'r>) => t<'b, 'e, 'r>
let contramapEnvironment: (t<'a, 'e, 'small>, 'large => 'small) => t<'a, 'e, 'large>
let provide: (t<'a, 'e, 'r>, 'r) => IO.t<'a, 'e>
let result: t<'a, 'e, 'r> => t<result<'a, 'e>, RESULT_ERROR, 'r>
"""
FX_RES = """
type t<+'a, 'e, -'r> = 'r => IO.t<'a, 'e>
let succeed = a => _ => IO.succeed(a)
let fail = e => _ => IO.fail(e)
let access = f => r => IO.succeed(f(r))
let flatMap = (fx, next) => r => IO.flatMap(fx(r), a => next(a)(r))
let contramapEnvironment = (fx, project) => large => fx(project(large))
let provide = (fx, r) => fx(r)
RESULT_IMPL
"""
LOSSLESS = """
let result = fx => r =>
  IO.foldCause(
    fx(r),
    cause =>
      switch cause {
      | Cause.Expected(e) => IO.succeed(Error(e))
      | Cause.Defect(_) | Cause.Sequential(_) => IO.failCause(cause)
      },
    a => IO.succeed(Ok(a)),
  )
"""
ERASING = """
let rec erase = (cause: Cause.t<'e>): option<Cause.t<'e2>> =>
  switch cause {
  | Cause.Expected(_) => None
  | Cause.Defect(d) => Some(Cause.Defect(d))
  | Cause.Sequential(causes) =>
    switch causes->Array.filterMap(erase) {
    | [] => None
    | kept => Some(Cause.Sequential(kept))
    }
  }
let result = fx => r =>
  IO.foldCause(
    fx(r),
    cause =>
      switch cause {
      | Cause.Expected(e) => IO.succeed(Error(e))
      | Cause.Defect(_) | Cause.Sequential(_) =>
        switch erase(cause) {
        | Some(kept) => IO.failCause(kept)
        | None => IO.failCause(Cause.Defect("expected leaves erased"))
        }
      },
    a => IO.succeed(Ok(a)),
  )
"""
def fx(error="'e", impl=LOSSLESS):
    return {**CAUSE, **IO, "Fx.resi": FX_RESI.replace("RESULT_ERROR", error),
            "Fx.res": FX_RES.replace("RESULT_IMPL", impl)}
CLOCK = {
"Clock.resi": """
type service = {now: unit => int}
let now: unit => Fx.t<int, 'e, {.."clock": service}>
""",
"Clock.res": """
type service = {now: unit => int}
let now = () => Fx.access(env => env["clock"].now())
"""}
LOG = {
"Log.resi": """
type service = {write: string => unit}
let write: string => Fx.t<unit, 'e, {.."log": service}>
""",
"Log.res": """
type service = {write: string => unit}
let write = message => Fx.access(env => env["log"].write(message))
"""}
WORKFLOW = {
"Workflow.resi": """
let stamp: unit => Fx.t<int, 'e, {.."clock": Clock.service, "log": Log.service}>
""",
"Workflow.res": """
let stamp = () =>
  Clock.now()->Fx.flatMap(time => Log.write(Int.toString(time))->Fx.flatMap(() => Fx.succeed(time)))
"""}
SERVICES = {**fx(), **CLOCK, **LOG, **WORKFLOW}
CLOCK_SVC = '{Clock.now: () => 42}'
LOG_SVC = '{Log.write: _ => ()}'
def main(body):
    return {"Main.res": body}
PROBES = [
{"id": "R1-accumulate", "expect": "compile", "files": {**SERVICES, **main(f"""
let env = {{"clock": {CLOCK_SVC}, "log": {LOG_SVC}}}
let stamped: result<int, Cause.t<string>> = Workflow.stamp()->Fx.provide(env)->IO.run
""")}},
{"id": "R2-extra-field-open", "expect": "compile", "files": {**SERVICES, **main(f"""
let env = {{"clock": {CLOCK_SVC}, "log": {LOG_SVC}, "extra": 1}}
let stamped: result<int, Cause.t<string>> = Workflow.stamp()->Fx.provide(env)->IO.run
""")}},
{"id": "R3-missing-field", "expect": "error", "site": "Main.res",
 "diagnostic": 'The first object is expected to have a field "log"', "files": {**SERVICES, **main(f"""
let env = {{"clock": {CLOCK_SVC}, "extra": 1}}
let stamped: result<int, Cause.t<string>> = Workflow.stamp()->Fx.provide(env)->IO.run
""")}},
{"id": "R4-conflicting-field", "expect": "error", "site": "Conflict.res", "diagnostic": 'Field "clock"',
 "files": {**SERVICES,
  "OtherClock.resi": """
type service = {tick: unit => int}
let now: unit => Fx.t<int, 'e, {.."clock": service}>
""",
  "OtherClock.res": """
type service = {tick: unit => int}
let now = () => Fx.access(env => env["clock"].tick())
""",
  "Conflict.res": """
let both = () => Clock.now()->Fx.flatMap(_ => OtherClock.now())
"""}},
{"id": "R5-value-export", "expect": "error", "site": "Clock.res", "diagnostic": '{_.."clock": service}',
 "files": {**fx(), "Clock.resi": """
type service = {now: unit => int}
let now: Fx.t<int, 'e, {.."clock": service}>
""", "Clock.res": """
type service = {now: unit => int}
let now = Fx.access(env => env["clock"].now())
"""}},
{"id": "R6-closed-row-extra-field", "expect": "error", "site": "Main.res",
 "diagnostic": 'The second object is expected to have a field "extra"',
 "files": {**fx(), **CLOCK, **LOG, "Workflow.resi": """
let stamp: unit => Fx.t<int, 'e, {"clock": Clock.service, "log": Log.service}>
""", "Workflow.res": WORKFLOW["Workflow.res"], **main(f"""
let env = {{"clock": {CLOCK_SVC}, "log": {LOG_SVC}, "extra": 1}}
let stamped: result<int, Cause.t<string>> = Workflow.stamp()->Fx.provide(env)->IO.run
""")}},
{"id": "R6b-closed-row-with-coercion", "expect": "compile",
 "files": {**fx(), **CLOCK, **LOG, "Workflow.resi": """
let stamp: unit => Fx.t<int, 'e, {"clock": Clock.service, "log": Log.service}>
""", "Workflow.res": WORKFLOW["Workflow.res"], **main(f"""
type wide = {{"clock": Clock.service, "log": Log.service, "extra": int}}
let env: wide = {{"clock": {CLOCK_SVC}, "log": {LOG_SVC}, "extra": 1}}
let widened = (Workflow.stamp() :> Fx.t<int, string, wide>)
let stamped: result<int, Cause.t<string>> = widened->Fx.provide(env)->IO.run
""")}},
{"id": "R7-projection", "expect": "compile", "files": {**SERVICES, **main(f"""
type app = {{services: {{"clock": Clock.service, "log": Log.service}}, name: string}}
let app = {{services: {{"clock": {CLOCK_SVC}, "log": {LOG_SVC}}}, name: "demo"}}
let projected = Workflow.stamp()->Fx.contramapEnvironment((whole: app) => whole.services)
let stamped: result<int, Cause.t<string>> = projected->Fx.provide(app)->IO.run
""")}},
{"id": "R8-wrong-projection", "expect": "error", "site": "Main.res",
 "diagnostic": 'The first object is expected to have a field "log"', "files": {**SERVICES, **main(f"""
type app = {{services: {{"clock": Clock.service, "log": Log.service}}, name: string}}
let app = {{services: {{"clock": {CLOCK_SVC}, "log": {LOG_SVC}}}, name: "demo"}}
let projected =
  Workflow.stamp()->Fx.contramapEnvironment((whole: app) => {{"clock": whole.services["clock"]}})
let stamped: result<int, Cause.t<string>> = projected->Fx.provide(app)->IO.run
""")}},
{"id": "R9a-open-error-injection", "expect": "compile", "files": {**fx(),
 "Remote.resi": "let fetch: unit => Fx.t<int, [> #Timeout], 'r>",
 "Remote.res": "let fetch = () => Fx.fail(#Timeout)",
 "Parse.resi": "let parse: int => Fx.t<string, [> #Malformed(string)], 'r>",
 "Parse.res": "let parse = n => n > 0 ? Fx.succeed(Int.toString(n)) : Fx.fail(#Malformed(\"negative\"))",
 "Combined.resi": "let load: unit => Fx.t<string, [> #Timeout | #Malformed(string)], 'r>",
 "Combined.res": "let load = () => Remote.fetch()->Fx.flatMap(Parse.parse)"}},
{"id": "R9b-closed-error-injection", "expect": "error", "site": "Combined.res",
 "diagnostic": "they share no common constructors", "files": {**fx(),
 "Remote.resi": "let fetch: unit => Fx.t<int, [#Timeout], 'r>",
 "Remote.res": "let fetch = () => Fx.fail(#Timeout)",
 "Parse.resi": "let parse: int => Fx.t<string, [#Malformed(string)], 'r>",
 "Parse.res": "let parse = n => n > 0 ? Fx.succeed(Int.toString(n)) : Fx.fail(#Malformed(\"negative\"))",
 "Combined.res": "let load = () => Remote.fetch()->Fx.flatMap(Parse.parse)"}},
{"id": "n1-recursive-encodings-inhabited", "expect": "compile", "files": {"Recursive.res": """
type rec selfRecord = {self: selfRecord}
type rec selfVariant = Never(selfVariant)
let rec record = {self: record}
let rec variant = Never(variant)
"""}},
{"id": "n2-polymorphic-field-rejects-let-rec", "expect": "error", "site": "Never.res",
 "diagnostic": "not allowed as right-hand side of `let rec'", "files": {"Never.res": """
type t = {absurd: 'a. 'a}
let rec forged: t = {absurd: forged.absurd}
"""}},
{"id": "n3-construction-inside-module", "expect": "compile", "files": {"Never.res": """
type t = {absurd: 'a. 'a}
let forged = () => {absurd: panic("never")}
"""}},
{"id": "n4-forgeries-outside-module", "expect": "compile", "files": {
 "Never.resi": "type t\nlet absurd: t => 'a",
 "Never.res": "type t = {absurd: 'a. 'a}\nlet absurd = (_: t) => panic(\"Never.absurd reached\")",
 "Forge.res": """
external fromInt: int => Never.t = "%identity"
@val external parse: string => 'a = "JSON.parse"
let byIdentity = fromInt(1)
let byExternal: Never.t = parse("1")
let byRaw: Never.t = %raw(`undefined`)
let reached = () => Never.absurd(byIdentity)
"""}},
{"id": "n5-absurd-total-and-loud", "expect": "compile", "files": {
 "Never.resi": "type t\nlet absurd: t => 'a",
 "Never.res": "type t = {absurd: 'a. 'a}\nlet absurd = (_: t) => panic(\"Never.absurd reached\")",
 "Use.res": """
let infallible: result<int, Never.t> = Ok(1)
let value = switch infallible {
| Ok(v) => v
| Error(never) => Never.absurd(never)
}
"""}},
{"id": "n5b-unit-is-not-never", "expect": "error", "site": "Use.res",
 "diagnostic": "But it's expected to have type: Never.t", "files": {
 "Never.resi": "type t\nlet absurd: t => 'a",
 "Never.res": "type t = {absurd: 'a. 'a}\nlet absurd = (_: t) => panic(\"Never.absurd reached\")",
 "Use.res": "let wrong: result<int, Never.t> = Error()"}},
{"id": "f2-conservative-result", "expect": "compile", "files": fx()},
{"id": "f3-free-error-rejects-lossless", "expect": "error", "site": "Fx.res",
 "diagnostic": "is not included in", "files": fx(error="'e2")},
{"id": "f4-free-error-forces-erasure", "expect": "compile", "files": fx(error="'e2", impl=ERASING)},
{"id": "v1-ffi-variance-trusted", "expect": "compile", "files": {
 "Raw.resi": "type t<+'a, +'e, +'r>",
 "Raw.res": "type t<+'a, +'e, +'r>",
 "Forget.res": """
let forget = (needsClock: Raw.t<int, string, {"clock": int}>) => (needsClock :> Raw.t<int, string, {.}>)
"""}},
{"id": "v2-reader-variance-rejects-forgetting", "expect": "error", "site": "Forget.res",
 "diagnostic": "is not a subtype of", "files": {**fx(), "Forget.res": """
let forget = (needsClock: Fx.t<int, string, {"clock": int}>) => (needsClock :> Fx.t<int, string, {.}>)
"""}},
{"id": "v2b-reader-rejects-covariant-declaration", "expect": "error", "site": "Fx.res",
 "diagnostic": "variances", "files": {**CAUSE, **IO,
 "Fx.resi": FX_RESI.replace("type t<+'a, 'e, -'r>", "type t<+'a, 'e, +'r>").replace("RESULT_ERROR", "'e"),
 "Fx.res": FX_RES.replace("RESULT_IMPL", LOSSLESS)}},
{"id": "c1-array-cause-forces-invariance", "expect": "error", "site": "IO.res",
 "diagnostic": "but it is injective invariant", "files": {**CAUSE,
 "IO.resi": "type t<+'a, +'e>\nlet fail: 'e => t<'a, 'e>",
 "IO.res": "type t<+'a, +'e> = unit => result<'a, Cause.t<'e>>\nlet fail = e => () => Error(Cause.Expected(e))"}},
{"id": "c2-list-cause-allows-covariance", "expect": "compile", "files": {
 "Cause.res": "type rec t<'e> = Expected('e) | Defect(string) | Sequential(list<t<'e>>)",
 "IO.resi": "type t<+'a, +'e>\nlet fail: 'e => t<'a, 'e>",
 "IO.res": "type t<+'a, +'e> = unit => result<'a, Cause.t<'e>>\nlet fail = e => () => Error(Cause.Expected(e))"}},
]
```
