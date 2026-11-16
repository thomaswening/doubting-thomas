---
title: Characterization tests
area: refactoring
created: 2026-11-16
updated: 2026-11-16
prerequisites: [refactoring/seams]
related: [testing/golden-results-and-dependency-updates]
projects: []
tags: [legacy-code, characterization-tests, golden-master, snapshot-testing, feathers]
---

# Characterization tests

## TL;DR

- The problem: you must change a legacy method, say `FormatRow`, which writes one line of a CSV export. It has no tests, and you don't know exactly what it does for every input. After your change, how would you know you broke nothing?

- A **characterization test** records what the code does *today*, not what it should do. You write an assertion you know is wrong, run it, and copy the actual value from the failure message into the test.

- Bugs included: if `FormatRow` writes `-0` for `-0.4`, the test expects `-0`. Fixing it is a separate, deliberate change, because someone may rely on it.

- The tests are a **change detector**. A failure after your edit says "behaviour changed here". You then decide whether you meant it.

- They are step 4 of Feathers's **legacy code change algorithm**: identify change points, find test points, break dependencies ([seams](seams.md)), write tests, then change and refactor.

## Key claims

- <a id="c1"></a>**C1.** A characterization test is a test that pins down the actual behaviour of existing code, whether or not that behaviour is correct. A passing characterization test says "unchanged", not "right".

- <a id="c2"></a>**C2.** Feathers's recipe for writing one: put the code in a test harness, write an assertion you know will fail, let the failure report the actual behaviour, change the assertion to expect that behaviour, and repeat with further inputs.

- <a id="c3"></a>**C3.** When a characterization test fails after a change, it means the behaviour changed. If the change was intended, the test's expected value is updated in the same commit. If not, the change is undone or fixed.

- <a id="c4"></a>**C4.** Behaviour that looks like a bug is still pinned as it is. The test is named or marked as suspicious, and the fix is decided separately. Code in production has become its own specification: callers, users or files may depend on the "wrong" behaviour.

- <a id="c5"></a>**C5.** The legacy code change algorithm has five steps: (1) identify change points, (2) find test points, (3) break dependencies, (4) write tests, (5) make changes and refactor.

- <a id="c6"></a>**C6.** Characterization tests are written for the code about to change and the behaviour the change could affect, not for the whole system. They grow where the code is changed.

- <a id="c7"></a>**C7.** Every input the code reads besides its parameters, such as the current culture, the clock or a file, must be fixed by the test. Otherwise the test pins one machine's environment by accident and fails on another.

- <a id="c8"></a>**C8.** For code with large output (a whole report, a serialised object), the same idea is applied as a golden master or snapshot test. The output is stored once and compared on every run. In .NET, libraries such as Verify do this.

- <a id="c9"></a>**C9.** "Characterization" describes where a test's expected value came from: the code's current output. Once a requirement backs the expected value, the test is an ordinary specification test, and its name says what it requires.

## Explanation

### Start from the change you have to make

Say a CSV export in a WPF app writes each result row with this method, and you are asked to make the export use a dot as decimal separator on every machine:

```csharp
public static string FormatRow(string name, double value, int decimals)
{
    var label = name.Trim();
    if (label.Length > 10)
        label = label.Substring(0, 10);
    return label + ";" + Math.Round(value, decimals).ToString("F" + decimals);
}
```

There are no tests. Reading the code, you think you know what it does. But do you know what `Math.Round(0.125, 2)` returns, or how `-0.4` comes out with zero decimals? Feathers calls the usual way of working here *edit and pray*: change carefully, then hope. His alternative is *cover and modify*: first cover the code with tests, then change it with the tests watching.

The tests you need for that are not about the requirement ("what should the export do?"). Nobody may know any more. They are about the code: what does it do now? That is a characterization test ([C1](#c1)).

### Let the code tell you

You don't work out the expected values by reading the code. You ask the code ([C2](#c2)). Write a test with an expected value you know is wrong, here an empty string:

```csharp
[Fact]
public void Rounds_to_the_given_decimals()
{
    Assert.Equal("", ResultExport.FormatRow("Sample", 0.125, 2));
}
```

The test fails, and xUnit's failure message shows the actual value, `Sample;0,12` on a German machine. Copy it into the test, and the test passes. Then go on with the next input you are curious about. Each run teaches you something. Here it already taught two things: the separator follows the machine's culture, and `0.125` rounds *down* to `0.12`. `Math.Round` rounds a midpoint to the even digit by default (banker's rounding), not away from zero as at school.

Feathers's blog post on the topic shows the extreme form: start with a test literally named `x`, see what comes out, and only then name the test after the behaviour you found.

**What if the "wrong" assertion passes?** Then the code really returns `""` for that input, and you have learned something you didn't expect. Keep the test: it already characterises the behaviour. "An assertion you know will fail" only means: don't guess the answer, let the run tell you.

### How much poking?

Not every member of every class. You characterise only what your change could affect ([C6](#c6)). For the decimal-separator change, that is a handful of inputs to `FormatRow`: one per behaviour you see in its few lines (the separator, the rounding, the cut, a negative number). Nothing else in the class gets a test today. The next change to a different method brings its own handful.

Where one test per input is still too much, for example a method with several parameters, a snapshot library helps. Verify runs a list of inputs and stores all the outputs in one file that you read and approve once ([C8](#c8)).

**What could the change affect?** In C#, a change can reach other code by more paths than "Find All References" on the method shows:

- its return value and its `out` and `ref` parameters, read by the callers;
- objects passed in and changed, used by the caller afterwards;
- fields and static data it writes, read by other methods of the class or by anyone else;
- overrides: if the method is `virtual`, every subclass that overrides it or calls `base`;
- events it raises, whose handlers you find by searching for `+=` on the event;
- in WPF, `PropertyChanged` for a property, which reaches every XAML binding to that property. A binding names the property in a string, so the compiler and "Find All References" don't see it. Search the XAML for the name.

You won't trace every path. So test where the paths meet: a method higher up, such as the export command, whose result shows the effects of all the methods below it. Feathers calls such a place a pinch point. A test there catches effects that you didn't think of.

### Bugs are pinned too

Try `FormatRow("Sample", -0.4, 0)`. It returns `Sample;-0`. That is almost certainly not what anyone wanted. The characterization test still expects `-0` ([C4](#c4)). It records what the export does, and maybe a spreadsheet macro somewhere reads that `-0`. Mark the test so the doubt is visible and searchable. In xUnit, a trait does that: `[Trait("Characterization", "Suspicious")]`. `dotnet test --filter "Characterization=Suspicious"` then runs exactly those tests, and the test explorer can group by trait. Then raise the question separately. If the team decides it is a bug, fixing it is a change of its own, with its own updated test ([C3](#c3)).

This is the main difference from an ordinary unit test. A unit test written from a requirement fails when the code is wrong. A characterization test fails when the code is *different*. Wikipedia's article calls them change detectors for that reason.

### Fix the hidden inputs

`FormatRow` takes three parameters, but it reads a fourth input: `CultureInfo.CurrentCulture`. A test that doesn't set it pins `0,12` on a German developer machine and fails with `0.12` on an English build server ([C7](#c7)). Set the culture in the test. The same holds for `DateTime.Now`, the current directory, environment variables and files. Where you can't set such an input from the test, you need a [seam](seams.md) first.

### Where characterization tests fit: the legacy code change algorithm

Feathers frames the whole job as five steps ([C5](#c5)):

1. **Identify change points.** Where in the code does the change go? Here: `FormatRow`.
2. **Find test points.** Where can a test observe the effect? Here: `FormatRow`'s return value. In worse code, the only observable effect might be a file the export writes.
3. **Break dependencies.** Make the test points reachable from a test. `FormatRow` is static and pure apart from the culture, so nothing needs breaking. A view model method that opens a dialog first needs a [seam](seams.md#c6) for *separation*. The export that only writes a file needs one for *sensing*: for example, pass in a `TextWriter` instead of a path. Production passes a `StreamWriter` on the file, the test a `StringWriter`, and the test reads the string ([seams C5](seams.md#c5)).
4. **Write tests.** Characterization tests, until you trust that they cover what your change could affect ([C6](#c6)).
5. **Make changes and refactor.** Now change the code. Then the tests show which behaviours changed: the intended ones and, you hope, nothing else.

Step 4 is where you stop. You don't characterise the whole export, only the behaviour your change touches. Over many changes, the tests accumulate where the code changes most.

### Where they live, and what they become

A characterization test is an ordinary test in an ordinary test project. Put it next to the other tests of the same code, so it runs in every build. What makes it a characterization test is only where its expected value came from: the code's own output, not a requirement. A trait such as `[Trait("Category", "Characterization")]` on the class keeps that visible and lets you filter.

That origin can change ([C9](#c9)). When a requirement later backs a test's expected value, as in the example below, it is a normal specification test from then on. Rename it after the requirement and remove the characterization trait. The tests nobody has decided about stay characterization tests. Over time, a legacy area moves from "pinned because it is so" to "tested because it should be so", one change at a time.

### Large outputs: golden masters

When the output is a whole report rather than a string, writing `Assert.Equal` per value is too slow. Store the complete output once as an approved file and compare against it on every run. This is called a golden master or snapshot test ([C8](#c8)). In .NET, the Verify library does this: `await Verify(report);` writes a `.received.` file and compares it with the `.verified.` one. The same caution applies as for the [golden results note](../testing/golden-results-and-dependency-updates.md#c2): a snapshot recorded from the code's own output proves only that nothing changed, not that it was ever right.

## Examples

### The characterization tests for `FormatRow`

After a few rounds of "assert wrong, read the failure, copy", the tests look like this. Each name states the behaviour found.

```csharp
[Trait("Category", "Characterization")]
public class FormatRowCharacterization
{
    public FormatRowCharacterization() =>
        CultureInfo.CurrentCulture = new CultureInfo("de-DE"); // fixed hidden input (C7)

    [Fact]
    public void Uses_the_current_culture_s_decimal_separator() =>
        Assert.Equal("Sample;1,0", ResultExport.FormatRow("Sample", 1.0, 1));

    [Fact]
    public void Rounds_a_midpoint_to_even() =>
        Assert.Equal("Sample;0,12", ResultExport.FormatRow("Sample", 0.125, 2));

    [Fact]
    public void Trims_the_name_and_cuts_it_to_ten_characters() =>
        Assert.Equal("Calibratio;1,0", ResultExport.FormatRow("  Calibration run 7 ", 1.0, 1));

    [Fact]
    [Trait("Characterization", "Suspicious")] // looks like a bug, decided separately (C4)
    public void Negative_value_rounding_to_zero_keeps_its_sign() =>
        Assert.Equal("Sample;-0", ResultExport.FormatRow("Sample", -0.4, 0));
}
```

Result: all four pass against the unchanged `FormatRow`. Outputs checked on .NET 8: `Sample;0,12`, `Calibratio;1,0` and `Sample;-0` under `de-DE`.

### Making the change

The requested change is "always a dot". Pass `CultureInfo.InvariantCulture` to `ToString`:

```csharp
return label + ";" + Math.Round(value, decimals)
    .ToString("F" + decimals, CultureInfo.InvariantCulture);
```

Run the tests. Three of them fail: the decimal-separator test, the rounding test and the name test all expected a comma. Read each failure. The actual values are `Sample;1.0`, `Sample;0.12` and `Calibratio;1.0`. They differ from the old ones only in the separator. The rounding (`0.12`) and the cut to ten characters (`Calibratio`) are unchanged, which is the evidence that the change did nothing else. So the three expected values get a dot ([C3](#c3)).

One of the three is now more than a characterization: the dot is a requirement. That test moves out of the characterization class into the ordinary tests of `ResultExport` and is renamed after the requirement ([C9](#c9)). It also sets a German culture, because the requirement is "a dot *even* on a German machine":

```csharp
public class ResultExportTests
{
    [Fact]
    public void Always_uses_a_dot_as_decimal_separator()
    {
        CultureInfo.CurrentCulture = new CultureInfo("de-DE");
        Assert.Equal("Sample;1.0", ResultExport.FormatRow("Sample", 1.0, 1));
    }
}
```

The rounding and the name tests stay in the characterization class with their dots updated. Nobody has decided that rounding to even or cutting at ten characters is *wanted*, only that it is what the code does. The `-0` test passes unchanged and still waits for its decision ([C4](#c4)).

## Pitfalls

- **"Correcting" the expected value to what the code should do.** Then the test fails on unchanged code, and you no longer know which failures your change caused ([C1](#c1), [C4](#c4)).

- **Working out expected values by reading the code.** You will reproduce your misunderstanding, as with `0.125` rounding to `0.12`. Let the failure report the value ([C2](#c2)).

- **Accepting every failure after a change.** A failing characterization test is a question: "did you mean this?" Updating it without checking turns the safety net into a record of whatever the code does now ([C3](#c3)).

- **Forgetting hidden inputs.** Tests that pass on your machine and fail on the build server usually depend on culture, time zone, clock or file system ([C7](#c7)).

- **Trying to characterise everything first.** Coverage of the whole legacy system is never reached. Characterise around the change point ([C6](#c6)).

- **Leaving a test labelled "characterization" after a requirement backs it.** The label then says "nobody knows if this is wanted" about something that was decided. Rename it and remove the trait ([C9](#c9)).

## Exercises

1. **Predict.** Under `CultureInfo.InvariantCulture`, what does `FormatRow("  Sample A  ", 2.5, 0)` return? Then say how you would find out without predicting.

   <details><summary>Solution</summary>

   `Sample A;2`: the name is trimmed, and `2.5` is a midpoint that rounds to the even number `2`. Without predicting: assert `""`, run, and copy the actual value from the failure message ([C2](#c2)).

   </details>

2. **Bug or behaviour?** A colleague finds that an export writes dates in the format of the machine's culture. They want the characterization test to expect ISO dates "because that's correct". What do you tell them?

   <details><summary>Solution</summary>

   The characterization test expects what the code does now, the culture-dependent format, with the culture fixed in the test ([C7](#c7)). Switching to ISO dates is a change of its own, decided separately because files already written or programs reading them may depend on the current format ([C4](#c4)). When that change is made, the test's expected value is updated in the same commit ([C3](#c3)).

   </details>

3. **The algorithm.** A view model method `Export(path)` must also write a header line. It shows a `MessageBox` when the file exists. Walk through the five steps.

   <details><summary>Solution</summary>

   (1) The change point is `Export`, where the lines are written. (2) The test point is the written file, or the writer it calls. (3) Break the dialog dependency with a seam (Extract and Override Call), and if needed the writer too, so the test can sense the lines. (4) Write characterization tests of today's output: the rows, the cancel path. (5) Add the header line. One test now fails, intentionally, and gets the header in its expected value ([C5](#c5)).

   </details>

## Sources

- Michael Feathers, *Working Effectively with Legacy Code*, Prentice Hall, 2004: chapter 2 "Working with Feedback" (edit and pray, cover and modify, the legacy code change algorithm), chapter 13 "I Need to Make a Change, but I Don't Know What Tests to Write" (characterization tests and how to write them).
- Michael Feathers, [Characterization Testing](https://michaelfeathers.silvrback.com/characterization-testing), blog post, 2016: tests that describe actual behaviour, the test named `x`, and production code as its own specification.
- Wikipedia, [Characterization test](https://en.wikipedia.org/wiki/Characterization_test): the term, golden master testing, change detectors.
- [Verify](https://github.com/VerifyTests/Verify): snapshot testing library for .NET.
- Microsoft, [Math.Round](https://learn.microsoft.com/dotnet/api/system.math.round): midpoint values round to even by default.
- Claude session at work, 2026-11-16.
