/** Test-only binding to fast-check 4.10.2 (EP-1.2.1, C-3, EP-M4).

`rescript-fast-check` predates ReScript 12, so this module binds only the
combinators the law suites use. Every binding is concrete and one external per
arity, because fast-check's `property` and `tuple` are variadic. It is a
development dependency with no ReScript sources, so it stays out of
`rescript.json`.

Permitted callers: `tests/FxLawModel.res`, `tests/LawHarness.res`,
`tests/LawSuite.res`, `tests/IoLaws.test.res`, `tests/FxLaws.test.res`,
`tests/FxAgreement.test.res`, and `tests/FxEnvironmentLaws.test.res` only.
Roadmap task 1.3.1 may revisit this binding with the runtime entry point.
*/
type arbitrary<'a>
type property

// Option records are read by fast-check, not by ReScript, so reanalyze would
// report their labels as never read.
@live type intConstraints = {min?: int, max?: int}

@live
type parameters<'a> = {
  numRuns?: int,
  seed?: int,
  path?: string,
  examples?: array<'a>,
}

@live type sampleParameters = {numRuns?: int, seed?: int}

// Defaults to the full 32-bit range, which matches ReScript's `int`.
@module("fast-check")
external int: (~constraints: intConstraints=?) => arbitrary<int> = "integer"

@module("fast-check") @variadic
external constantFrom: array<'a> => arbitrary<'a> = "constantFrom"

@module("fast-check") @variadic
external oneof: array<arbitrary<'a>> => arbitrary<'a> = "oneof"

@module("fast-check")
external tuple2: (arbitrary<'a>, arbitrary<'b>) => arbitrary<('a, 'b)> = "tuple"

@module("fast-check")
external tuple3: (arbitrary<'a>, arbitrary<'b>, arbitrary<'c>) => arbitrary<('a, 'b, 'c)> = "tuple"

@send external map: (arbitrary<'a>, 'a => 'b) => arbitrary<'b> = "map"

@send external chain: (arbitrary<'a>, 'a => arbitrary<'b>) => arbitrary<'b> = "chain"

// A predicate returning `false`, or throwing, fails the property.
@module("fast-check")
external property1: (arbitrary<'a>, 'a => bool) => property = "property"

@module("fast-check")
external property2: (arbitrary<'a>, arbitrary<'b>, ('a, 'b) => bool) => property = "property"

@module("fast-check")
external property3: (
  arbitrary<'a>,
  arbitrary<'b>,
  arbitrary<'c>,
  ('a, 'b, 'c) => bool,
) => property = "property"

// Throws a JavaScript `Error` whose message includes the counterexample, the
// seed, and the shrink path; Bun reports it as the test failure.
@module("fast-check") external check: (property, ~parameters: parameters<'a>=?) => unit = "assert"

// Returns generated values without asserting a predicate. Classification uses
// it with a pinned seed and a fixed sample count.
@module("fast-check")
external sample: (arbitrary<'a>, ~parameters: sampleParameters=?) => array<'a> = "sample"
