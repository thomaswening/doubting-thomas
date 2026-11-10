---
title: Catch2 for a C# developer
area: testing
created: 2026-11-10
updated: 2026-11-10
prerequisites: []
related: [testing/golden-results-and-dependency-updates, numerics/printing-doubles]
projects: [partonforge]
tags: [cpp, catch2, unit-test, ctest, tags, sections, matchers, xunit, nunit]
---

# Catch2 for a C# developer

## TL;DR

- Catch2 is a C++ unit-test framework. `TEST_CASE("name", "[tags]")` is xUnit's `[Fact]` or MSTest's `[TestMethod]`. The tags play the part of `[Trait]` or `[TestCategory]`.
- `CHECK` records a failure and lets the test go on. `REQUIRE` stops the test, as an xUnit `Assert` does.
- A `SECTION` is a branch of its test case. Catch2 runs the test case once per section, from the top each time, so the code above the sections is fresh setup for each one.
- `INFO("value " << value)` adds a message that is printed only if a later assertion in the same scope fails.
- Matchers such as `ContainsSubstring` and `WithinULP` are objects that describe a condition. `CHECK_THAT(actual, matcher)` applies one, like NUnit's `Assert.That(actual, Does.Contain("x"))`.
- With `catch_discover_tests(... ADD_TAGS_AS_LABELS)`, every `TEST_CASE` becomes its own CTest test, labelled with its tags, so `ctest -L formatter` runs one group.

## Key claims

- <a id="c1"></a>**C1.** `TEST_CASE("name", "[tag1][tag2]")` defines a test with a free-text name and optional tags in square brackets. It corresponds to xUnit's `[Fact]` or MSTest's `[TestMethod]`.
- <a id="c2"></a>**C2.** Tags select tests on the command line: `test_units "[formatter]"` runs only the test cases tagged `[formatter]`, `"~[formatter]"` runs all others, and `"[formatter][layout]"` those with both tags. They correspond to xUnit's `[Trait]` and `dotnet test --filter`.
- <a id="c3"></a>**C3.** CMake's `catch_discover_tests(target ...)` registers every `TEST_CASE` of a test program as a separate CTest test; with `ADD_TAGS_AS_LABELS`, each test also gets its tags, without the brackets, as CTest labels, so `ctest -L formatter` runs the test cases tagged `[formatter]`.
- <a id="c4"></a>**C4.** A failed `CHECK` is reported and the test case continues with the next statement; a failed `REQUIRE` is reported and ends the current run of the test case. `REQUIRE` suits a condition the rest of the test depends on, such as a size checked before indexing.
- <a id="c5"></a>**C5.** A test case with several `SECTION`s is run once per section, from the top each time; the code outside the sections runs on every pass, so each section starts from fresh setup and sees none of the other sections' changes.
- <a id="c6"></a>**C6.** A failed `REQUIRE` inside one section ends that pass only: Catch2 still runs the test case again for the remaining sections.
- <a id="c7"></a>**C7.** `INFO(message)` stores a message that is printed with every failed assertion after it in the same scope, and not printed if those assertions pass; inside a loop, it shows which iteration failed.
- <a id="c8"></a>**C8.** A Catch2 matcher is an object that describes a condition and is applied by `CHECK_THAT(actual, matcher)` or `REQUIRE_THAT`; it can be stored in a variable and combined with `&&`, `||` and `!`, like an NUnit constraint such as `Does.Contain("x")` or a prebuilt `Func<string, bool>`.
- <a id="c9"></a>**C9.** `WithinULP(target, n)` passes if the value is at most `n` doubles away from `target`, so `WithinULP(0.3, 1)` accepts `0.1 + 0.2` and `WithinULP(0.3, 0)` rejects it; with `n = 0` it passes exactly when `==` would, including for `-0.0` against `0.0`.
- <a id="c10"></a>**C10.** `CHECK_THROWS_AS(expression, type)` passes if the expression throws an exception of that type, and `CHECK_THROWS_WITH(expression, matcher)` if it throws an exception whose message satisfies the matcher, such as `ContainsSubstring("duplicate key")`.

## Explanation

### Test cases and tags

In xUnit, a test is a method with an attribute. In Catch2, it is a block introduced by the macro `TEST_CASE` ([C1](#c1)). There is no class and no method name: the test's name is a string, which can be a whole sentence. PartonForge's tests use that, for example `TEST_CASE("F/E switch sits at decimal exponents 0 and 17", "[formatter][IO-4]")`.

The second argument holds the **tags**. They group tests across files, as `[Trait("Category", "formatter")]` does in xUnit ([C2](#c2)). PartonForge tags each test with its area (`[formatter]`, `[steering]`, `[diff]`) and with the requirement it tests (`[IO-4]`). Running `test_units "[IO-4]"` then checks one requirement.

Catch2 builds a test program. CTest, CMake's test runner, runs programs. `catch_discover_tests` connects the two ([C3](#c3)). At build time it asks the program for its list of test cases and registers each as a CTest test of its own. PartonForge adds the prefix `unit.`, so a test appears in CTest's output as `unit.F/E switch sits at decimal exponents 0 and 17`. With `ADD_TAGS_AS_LABELS`, the tags become CTest **labels**, CTest's own grouping. `ctest -L IO-4` then selects the same tests as `test_units "[IO-4]"`, together with any non-Catch2 test that carries the label.

### CHECK and REQUIRE

An xUnit `Assert.Equal` throws when it fails. The test ends at the first failure. Catch2 offers both behaviours ([C4](#c4)). `CHECK` notes the failure and continues, so one run reports every failed condition, much like NUnit's `Assert.Multiple`. `REQUIRE` ends the test case, like an xUnit assertion.

Use `REQUIRE` when what follows makes no sense without it. PartonForge's diff test writes `REQUIRE(diff.patterns.size() == 1);` before it reads `diff.patterns.front()`. If the size were 0, a `CHECK` would carry on into an out-of-range read. Everything else is a `CHECK`.

Both print the values of a comparison: `CHECK(1 + 1 == 3)` reports `with expansion: 2 == 3`. The macro takes the expression apart, so there is no need for an `Assert.Equal(expected, actual)` form.

### SECTION: one setup, several branches

xUnit creates a new instance of the test class for every test. The constructor is therefore fresh setup for each `[Fact]`. Catch2 gets the same effect inside one test case with `SECTION` ([C5](#c5)). Each section is a branch. Catch2 runs the test case once for each branch, from the top. The code before the sections runs on every pass, and the sections not chosen on this pass are skipped.

So in the example below, `clear empties` sees `{1, 2, 3}`, not the `{1, 2, 3, 4}` that the first section produced. PartonForge's `bad steering is rejected rather than defaulted` uses sections for six inputs that each must fail with their own message.

A failed `REQUIRE` ends only the current pass ([C6](#c6)). The remaining sections still get their run. One broken section does not hide the others.

### INFO: context for a failure

A loop with a `CHECK` inside reports only the failing line. It does not say which iteration it was in. `INFO` adds that ([C7](#c7)): `INFO("value " << value);` at the top of the loop body attaches the current value to any failed assertion that follows in that iteration. If everything passes, nothing is printed. The message is built with `<<`, like an output stream. PartonForge's `every field is 26 columns wide` uses it to say which of five values had the wrong width.

### Matchers: conditions as objects

`CHECK(expression)` covers comparisons. For conditions such as "contains this substring" or "within n ulps", Catch2 has **matchers** ([C8](#c8)). A matcher is an ordinary object. `ContainsSubstring("not closed")` builds one, and `CHECK_THAT(text, matcher)` applies it to a value. Because it is an object, it can be built once, kept in a variable and applied to several values. It can also be combined: `ContainsSubstring("unknown") && EndsWith("'x'")`. NUnit's constraint model has the same shape: `Assert.That(text, Does.Contain("not closed"))`, where `Does.Contain(...)` is a constraint object. Without a framework, the C# counterpart is a predicate built in advance, a `Func<string, bool>`.

A matcher also describes itself. A failure prints `"..." contains: "not closed"` instead of only `false`.

### WithinULP

`WithinULP(target, n)` compares doubles by how many doubles lie between them, not by an absolute tolerance ([C9](#c9)). One ulp is the gap from one double to the next. `0.1 + 0.2` is `0.30000000000000004`, the double right after `0.3`, so it is within 1 ulp but not within 0.

PartonForge writes `CHECK_THAT(steering.real("q_g"), WithinULP(1.3, 0));` for values that must be parsed exactly. With `n = 0`, the matcher accepts the same values as `==`: it passes for `-0.0` against `0.0` and fails for NaN against NaN. Its use is to say "exactly, on purpose" where a reader might expect a tolerance. The failure message is no better: Catch2 3.16 prints doubles with all 17 digits in both cases.

### Exceptions

`CHECK_THROWS_AS(expression, type)` is xUnit's `Assert.Throws<T>` ([C10](#c10)). `CHECK_THROWS_WITH(expression, matcher)` checks the message instead, which is what PartonForge's steering tests do: a misspelled key must fail with `unknown steering key 'zm_fixd'`, not with just any `runtime_error`.

## Examples

The snippets were compiled with GCC 13.3 against Catch2 3.16.0's single-file build (`catch_amalgamated.cpp`, which supplies `main`), and run with `--colour-mode none`.

Sections re-run the test case from the top ([C5](#c5)):

```cpp
#include <catch_amalgamated.hpp>
#include <iostream>
#include <vector>

TEST_CASE("sections re-run the test case from the top", "[demo]") {
  std::vector<int> values{1, 2, 3};          // runs once per section
  std::cout << "setup, size " << values.size() << '\n';

  SECTION("push_back adds one") {
    values.push_back(4);
    CHECK(values.size() == 4);
  }
  SECTION("clear empties") {
    values.clear();
    CHECK(values.empty());                   // sees 1, 2, 3 again, not 1, 2, 3, 4
  }
}
```

Output:

```text
setup, size 3
setup, size 3
===============================================================================
All tests passed (2 assertions in 1 test case)
```

`CHECK`, `REQUIRE` and `INFO` ([C4](#c4), [C6](#c6), [C7](#c7)):

```cpp
#include <catch_amalgamated.hpp>
#include <iostream>

TEST_CASE("CHECK goes on, REQUIRE stops", "[demo]") {
  CHECK(1 + 1 == 3);
  std::cout << "after the failed CHECK\n";
  REQUIRE(2 + 2 == 5);
  std::cout << "after the failed REQUIRE\n";  // never printed
}

TEST_CASE("INFO is shown only with a failure in its scope", "[demo]") {
  for (const int value : {1, 2, 3}) {
    INFO("value " << value);
    CHECK(value < 3);
  }
}

TEST_CASE("a failed REQUIRE in one section does not skip the next", "[demo]") {
  SECTION("first") { REQUIRE(false); }
  SECTION("second") { std::cout << "second section ran\n"; }
}
```

The relevant parts of the output:

```text
catch_check_require.cpp:5: FAILED:
  CHECK( 1 + 1 == 3 )
with expansion:
  2 == 3

after the failed CHECK
catch_check_require.cpp:7: FAILED:
  REQUIRE( 2 + 2 == 5 )
with expansion:
  4 == 5

catch_check_require.cpp:14: FAILED:
  CHECK( value < 3 )
with expansion:
  3 < 3
with message:
  value 3

catch_check_require.cpp:19: FAILED:
  REQUIRE( false )

second section ran
===============================================================================
test cases: 3 | 3 failed
assertions: 6 | 2 passed | 4 failed
```

`after the failed REQUIRE` is missing. The message `value 3` appears only for the failing iteration.

Matchers and exceptions ([C8](#c8), [C9](#c9), [C10](#c10)):

```cpp
#include <catch_amalgamated.hpp>
#include <stdexcept>
#include <string>

using Catch::Matchers::ContainsSubstring;
using Catch::Matchers::EndsWith;
using Catch::Matchers::WithinULP;

TEST_CASE("matchers are objects", "[demo]") {
  const auto mentions_key = ContainsSubstring("unknown steering key");   // built first
  CHECK_THAT("error: unknown steering key 'zm_fixd'", mentions_key);     // applied later
  CHECK_THAT("error: unknown steering key 'x'", mentions_key && EndsWith("'x'"));

  CHECK_THAT(0.1 + 0.2, WithinULP(0.3, 1));    // one double apart: passes
  CHECK_THAT(0.1 + 0.2, WithinULP(0.3, 0));    // fails: not the same double
  CHECK(0.1 + 0.2 == 0.3);                     // fails too: compare the messages

  CHECK_THROWS_WITH(throw std::runtime_error("unknown steering key 'q'"), ContainsSubstring("unknown"));
  CHECK_THROWS_AS(throw std::runtime_error("x"), std::runtime_error);
}
```

The relevant parts of the output:

```text
catch_matchers.cpp:15: FAILED:
  CHECK_THAT( 0.1 + 0.2, WithinULP(0.3, 0) )
with expansion:
  0.30000000000000004 is within 0 ULPs of 2.9999999999999999e-01 ([2.
  9999999999999999e-01, 2.9999999999999999e-01])

catch_matchers.cpp:16: FAILED:
  CHECK( 0.1 + 0.2 == 0.3 )
with expansion:
  0.30000000000000004 == 0.29999999999999999

===============================================================================
test cases: 1 | 1 failed
assertions: 7 | 5 passed | 2 failed
```

## Pitfalls

- Expecting a section to see what an earlier section did. Each starts again from the top ([C5](#c5)).
- Using `CHECK` for a precondition such as a size before indexing. The test carries on into undefined behaviour ([C4](#c4)).
- Putting `INFO` after the assertion it should explain. It applies only to assertions that follow it ([C7](#c7)).
- Reading `WithinULP(x, 0)` as a tolerance. It is exact equality ([C9](#c9)).
- Two `TEST_CASE`s with the same name and the same tags. Catch2 3.16 prints `error: test case "same", with tags "[x]" already defined.` and runs no tests at all. With different tags, it accepts both, which makes two tests that only a reader of the tags can tell apart.

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-11-09 and 2026-11-10: the walkthrough of [PR 1](https://github.com/thomaswening/PartonForge/pull/1), [`tests/test_units.cpp`](https://github.com/thomaswening/PartonForge/blob/56b51e6d0d0d3f2c8c4b2b67de40aaa8c469347a/tests/test_units.cpp) and the [`catch_discover_tests` call](https://github.com/thomaswening/PartonForge/blob/56b51e6d0d0d3f2c8c4b2b67de40aaa8c469347a/CMakeLists.txt#L32-L42) in `CMakeLists.txt`.
- Catch2 documentation: [tutorial](https://github.com/catchorg/Catch2/blob/devel/docs/tutorial.md), [assertion macros](https://github.com/catchorg/Catch2/blob/devel/docs/assertions.md), [test cases and sections](https://github.com/catchorg/Catch2/blob/devel/docs/test-cases-and-sections.md), [logging macros](https://github.com/catchorg/Catch2/blob/devel/docs/logging.md), [matchers](https://github.com/catchorg/Catch2/blob/devel/docs/matchers.md), [command line](https://github.com/catchorg/Catch2/blob/devel/docs/command-line.md), [CMake integration](https://github.com/catchorg/Catch2/blob/devel/docs/cmake-integration.md).
- NUnit: [constraint model](https://docs.nunit.org/articles/nunit/writing-tests/constraints/Constraints.html), [`Assert.Multiple`](https://docs.nunit.org/articles/nunit/writing-tests/assertions/multiple-asserts.html).
