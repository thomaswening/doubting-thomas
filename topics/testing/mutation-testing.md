---
title: Mutation testing and tests that test nothing
area: testing
created: 2026-10-26
updated: 2026-10-26
prerequisites: []
related: [testing/golden-results-and-dependency-updates]
projects: [crateedit]
tags: [mutation-testing, test-quality, stryker, coverage, vacuous-tests]
---

# Mutation testing and tests that test nothing

## TL;DR

- A test can pass **for the wrong reason**: it never reaches the behaviour it is named after, so it would also pass if that behaviour were broken.
- Reading the test rarely shows this. The test looks right, and it is green.
- **Mutation testing** finds such tests. A tool makes small changes to the code (**mutants**) and runs the tests for each one. A mutant that no test notices has **survived**.
- A surviving mutant points to a missing or weak test, unless the change is **equivalent** (it doesn't alter behaviour).
- Code coverage can't find these tests. It shows which code ran, not which results were checked.
- Cheap habits that prevent the problem: see a new test fail once, and make fixtures refuse invalid input.

## Key claims

- <a id="c1"></a>**C1.** A test passes for the wrong reason when it would also pass if the behaviour it is named after were broken. Typically its input never reaches that behaviour.
- <a id="c2"></a>**C2.** Mutation testing changes the code under test in small ways, such as `>=` to `>` or `&&` to `||`, and runs the tests once per change. A mutant is **killed** if at least one test fails and has **survived** if all tests pass.
- <a id="c3"></a>**C3.** The mutation score is the share of mutants the tests kill (Stryker counts a mutant that makes the tests time out as killed too). A surviving mutant means that no test checks the behaviour the change breaks.
- <a id="c4"></a>**C4.** An **equivalent mutant** changes the code without changing its behaviour, so no test can kill it. A surviving mutant must therefore be inspected before a test is written for it.
- <a id="c5"></a>**C5.** Code coverage measures which lines ran during the tests, not whether any test checked their results. A line can have full coverage while a mutation of it survives.
- <a id="c6"></a>**C6.** Mutation testing runs the test suite once per mutant, so it is far slower than a normal test run. It is typically limited to the most important code or run as an occasional report rather than on every build.
- <a id="c7"></a>**C7.** Seeing a new test fail once, by breaking the code it guards on purpose, rules out that the test passes for the wrong reason. This is a mutation test done by hand for a single test.
- <a id="c8"></a>**C8.** A test fixture that refuses input invalid for the format, by throwing as soon as a test builds it, stops a test from passing because the code silently skipped the invalid input.

## Explanation

### A test that tests nothing

A test is evidence only if it would fail when the behaviour is wrong. Usually that holds by construction: the test sets up input, calls the code, and checks the result. It breaks down when the input never reaches the code the test is about ([C1](#c1)).

In [CrateEdit](https://github.com/thomaswening/CrateEdit), a test checked that a technical iTunes comment (a comment frame described `iTunNORM`) is not shown as the track's comment. The fixture built that frame in UTF-8 inside an ID3v2.3 tag. ID3v2.3 has no UTF-8, so the reader treated the frame as unreadable and skipped it. The comment came out empty, as the test expected. It came out empty for the wrong reason, though: the rule about which comment frame counts was never consulted. The test would also have passed with that rule removed.

Nobody noticed by reading. The test name, the fixture and the assertion all looked right. Then the rule was broken on purpose: four comment tests failed, but the two iTunes tests stayed green. After the fixture was fixed to use Latin-1, all six failed ([C7](#c7)).

### Mutation testing does this systematically

Breaking the code by hand to see which tests notice is exactly what a mutation testing tool automates ([C2](#c2)). For C#, the tool is [Stryker.NET](https://stryker-mutator.io/docs/stryker-net/introduction/). It is a `dotnet` tool. It changes one small thing at a time:

| Original | Mutant |
|---|---|
| `age >= 18` | `age > 18` |
| `a && b` | `a \|\| b` |
| `return x;` | `return default;` |
| `"text"` | `""` |

For each mutant it runs the tests. If some test fails, the mutant is killed: the tests noticed. If all pass, the mutant survived: no test checks what the change broke ([C3](#c3)). The report lists survivors by file and line, which tells you where to doubt the tests.

The mutation score, killed mutants over all mutants, is a better measure of test strength than coverage ([C5](#c5)). Coverage only knows that a line ran. A test that calls a method and asserts nothing gives that method full coverage, while every mutant of it survives.

### Survivors need judgement

Not every survivor is a missing test. An equivalent mutant cannot be killed ([C4](#c4)). For example, `i < length` changed to `i != length` in a loop that counts up from 0 by 1 gives the same result. So for each survivor, first ask whether the change could make any observable difference. If it could, write the missing test. If not, mark the mutant as equivalent (Stryker lets you exclude it).

### Cost, and the cheap habits

Running the whole suite once per mutant takes long ([C6](#c6)). A project with hundreds of mutants and a one-second suite takes minutes. A slow suite can take hours. So mutation testing is usually aimed at the code where a weak test costs most, such as CrateEdit's tag writer, and run as an informational report rather than a gate on every pull request.

Two habits catch most of these tests far more cheaply:

- **See it fail once** ([C7](#c7)). When writing a test, break the behaviour it guards and check the test turns red. This is the "red" step of test-driven development.
- **Fixtures refuse invalid input** ([C8](#c8)). After the iTunes bug, CrateEdit's MP3 fixture throws when a test builds a UTF-8 text frame for ID3v2.3. The mistake can't silently happen again.

## Examples

A surviving mutant and the test that kills it:

```csharp
static bool IsAdult(int age) => age >= 18;

[Fact]
public void Thirty_is_adult() => Assert.True(IsAdult(30));
```

The mutant `age > 18` survives: `IsAdult(30)` is still `true`. The test doesn't check the boundary. A second test kills it:

```csharp
[Fact]
public void Eighteen_is_adult() => Assert.True(IsAdult(18));   // fails for the mutant: 18 > 18 is false
```

A test that passes for the wrong reason, in the shape of the CrateEdit bug:

```csharp
// The reader returns null for a frame it cannot decode, and the "not shown" rule
// is never reached. The test passes whether or not the rule exists.
var frame = Frames.Comment("iTunNORM", "...", encoding: Utf8);   // invalid in ID3v2.3
var source = Mp3Fixture.Build(version: 3, [frame]);

Assert.Null(ReadComment(source));
```

The fix is valid input (`encoding: Latin1`). The fixture now also throws for the invalid one.

The snippets are illustrations. They were not run with Stryker.

## Pitfalls

- **Reading a green test as proof.** A pass shows that the assertions held, not that the code under test was reached ([C1](#c1)).
- **High coverage as proof of good tests.** Coverage doesn't look at assertions ([C5](#c5)).
- **Writing a test for every survivor.** Some survivors are equivalent mutants and can't be killed ([C4](#c4)).
- **Running mutation testing on every build.** It multiplies test time by the number of mutants ([C6](#c6)).

## Sources

- [CrateEdit PR #21](https://github.com/thomaswening/CrateEdit/pull/21): the iTunes comment tests that passed for the wrong reason, found by breaking the comment rule by hand. The same PR's [discussion](https://github.com/thomaswening/CrateEdit/pull/21#issuecomment-6404855667) proposes Stryker.NET as a report.
- Claude session on CrateEdit, 2026-10-13 to 2026-10-26.
- [Stryker.NET documentation](https://stryker-mutator.io/docs/stryker-net/introduction/), and [mutant states and metrics](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/), which defines the mutation score.
