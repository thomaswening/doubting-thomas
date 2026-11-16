---
title: Hotspot analysis
area: refactoring
created: 2026-11-16
updated: 2026-11-16
prerequisites: []
related: [refactoring/characterization-tests]
projects: []
tags: [legacy-code, hotspots, technical-debt, version-control, code-metrics, tornhill]
---

# Hotspot analysis

## TL;DR

- The problem: a legacy WPF app has hundreds of messy files, and the team can refactor only a few of them. Which ones? The ugliest? The oldest? Gut feeling?

- **Hotspot analysis** answers from data you already have. Git knows how often each file changed. A quick metric says how complex each file is. A **hotspot** is a file that scores high on both.

- The reason: messy code costs time only when someone has to work in it. A complex file nobody has touched for three years costs almost nothing today. A complex file that changes every week costs time every week.

- Development activity is concentrated: a small part of the code gets most of the changes. So a short list of hotspots covers much of the time the team actually spends.

- A hotspot is a place to look, not a verdict. The numbers are rough: commit habits, renames and generated files distort them. Read the file before you plan anything.

## Key claims

- <a id="c1"></a>**C1.** A hotspot is code that is both complex and frequently changed. Change frequency is measured from version-control history, usually as the number of commits that touched a file in a recent period.

- <a id="c2"></a>**C2.** Hotspot analysis ranks technical debt by what it costs now. Complexity in code that rarely changes costs little, because nobody has to read or change it. Complexity in code that changes often costs effort on every change.

- <a id="c3"></a>**C3.** In most codebases, development activity is concentrated in relatively few files. Most of the code changes rarely. That is why a short list of hotspots can account for a large share of the effort.

- <a id="c4"></a>**C4.** Complexity is measured with a cheap, language-neutral proxy: lines of code, or indentation-based complexity, the sum of the indentation levels of the non-blank lines. Both are good enough to rank files, not to judge a single file.

- <a id="c5"></a>**C5.** Change counts are distorted by anything that changes a file without real work in it. This includes generated files, files every feature touches (such as a project file or a resource list), renames and moves that split a file's history, and differences in how often developers commit. Such files are excluded or read with care.

- <a id="c6"></a>**C6.** The analysis uses a recent time window, for example the last twelve months, because it estimates where effort will go next. Activity from years ago says little about that.

- <a id="c7"></a>**C7.** A hotspot list is a starting point for investigation, not a refactoring plan. Each hotspot is read to find out why it changes so often. Changes then go there first, protected by characterization tests.

## Explanation

### Start from the question the team has to answer

Say your team agrees to spend some time each sprint on refactoring. The codebase has 2,000 C# files. Everyone has a favourite horror file. Which ones go first?

"The worst code first" sounds right but misses something. Some of the worst code is a 3,000-line view model for a dialog that nobody has opened in the code for years. Cleaning it up costs weeks and saves nothing, because nobody pays for its mess. Technical debt is like a loan whose interest is paid only when you work in the code ([C2](#c2)). So the useful question is: *where does the mess cost us time?*

### Two numbers per file

Adam Tornhill's answer, in *Your Code as a Crime Scene*, is to combine two numbers per file ([C1](#c1)):

- **Change frequency**: how many commits touched the file. Git has it already: `git log --name-only` lists the files of each commit. Count how often each file appears.
- **Complexity**: how hard the file is to work in. Precise metrics such as cyclomatic complexity need a parser for each language. A rough proxy is enough to rank files ([C4](#c4)). Lines of code is the simplest. Indentation is a good second one: deeply nested `if`s inside `foreach`s inside `try`s push the code to the right. Summing the indentation levels of all non-blank lines measures that shape without understanding the language. CodeScene, Tornhill's commercial tool, uses this "indentation-based complexity".

A file high on both is a hotspot. In a picture with change frequency on one axis and complexity on the other, the hotspots sit top right:

```mermaid
quadrantChart
    title Files of a legacy WPF app
    x-axis Rarely changed --> Often changed
    y-axis Simple --> Complex
    quadrant-1 Hotspots: start here
    quadrant-2 Complex but stable: leave alone for now
    quadrant-3 Simple and stable
    quadrant-4 Simple and busy: fine
    MainViewModel.cs: [0.85, 0.9]
    ExportService.cs: [0.7, 0.75]
    LegacyReportDialog.cs: [0.1, 0.85]
    Strings.resx: [0.9, 0.1]
    App.xaml.cs: [0.2, 0.2]
```

`LegacyReportDialog.cs` is ugly but stable: leave it. `Strings.resx` changes all the time, but there is nothing to refactor. `MainViewModel.cs` is where the time goes.

### Why a short list is enough

Change frequency is far from evenly spread ([C3](#c3)). CodeScene's documentation states it as "most development activity tends to be located in relatively few modules". Most files change a few times a year or never. A handful change every week. That is good news for a team with little refactoring time: the few files that get most of the changes are where cleanup pays back fastest.

In .NET terms, it is the same idea as profiling before optimising. You don't optimise the method that looks slowest. You run the profiler and optimise where the time is actually spent. Hotspot analysis is a profiler for developer time, with git history as the trace.

### Read the numbers with care

The numbers are rough, in known ways ([C5](#c5)):

- **Generated and bookkeeping files** change with every feature: `*.Designer.cs`, `.csproj`, resource files, index files. Exclude them, or ignore them in the list.
- **Renames and moves** split a file's history in two, unless you follow renames. A file that moved last month looks young and quiet.
- **Commit habits** differ. One developer commits ten times a day, another once a week. Over a whole team and a year this evens out a little, but not completely.

Use a recent window ([C6](#c6)). Twelve months is a common choice. A file that was rewritten five years ago and has been quiet since is not where the next year's work goes.

### From the list to the work

The list tells you where to look, not what to do ([C7](#c7)). For each top hotspot, ask *why* it changes so often. Is it a god class that every feature has to touch? A dumping ground for unrelated responsibilities? Is the complexity in one method or spread everywhere? Tornhill's tool then goes one level deeper and repeats the analysis per function inside the file.

This is where the other refactoring notes come in. The next change to a hotspot starts with [characterization tests](characterization-tests.md#c6) around it. Over a few months, the code the team changes most is also the code best covered by tests and most improved.

## Examples

### A hotspot script in C#

This script lists the files changed most often in the last twelve months, with both complexity proxies. It is a .NET 10 file-based app: no project file needed, run it with `dotnet run hotspots.cs -- <repository> .cs`.

```csharp
// Lists the files changed most often in the last months, with two complexity proxies.
// Usage: dotnet run hotspots.cs -- <repository> <extension> [since]
using System.Diagnostics;

var repo = args[0];
var extension = args[1];                               // ".cs"
var since = args.Length > 2 ? args[2] : "12.months";

// One line per file per commit that touched it.
var log = Git(repo, $"log --since={since} --no-renames --format=format: --name-only");

var hotspots = log
    .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Where(path => path.EndsWith(extension))
    .GroupBy(path => path)
    .Select(g => (Path: g.Key, Changes: g.Count()))
    .Where(f => File.Exists(Path.Combine(repo, f.Path)))  // skip deleted files
    .OrderByDescending(f => f.Changes)
    .Take(10)                                             // read only the files we show
    .Select(f => Measure(repo, f.Path, f.Changes));

Console.WriteLine($"{"Changes",7} {"Lines",6} {"Indent",6}  File");
foreach (var h in hotspots)
    Console.WriteLine($"{h.Changes,7} {h.Lines,6} {h.Indentation,6}  {h.Path}");

// Lines of code and indentation-based complexity of one file.
static (string Path, int Changes, int Lines, int Indentation) Measure(
    string repo, string path, int changes)
{
    var lines = File.ReadAllLines(Path.Combine(repo, path))
                    .Where(line => line.Trim().Length > 0)
                    .ToList();
    var indentation = lines.Sum(IndentationLevel);
    return (path, changes, lines.Count, indentation);
}

// Leading whitespace in steps of four spaces; a tab counts as four.
static int IndentationLevel(string line) =>
    line.Replace("\t", "    ").TakeWhile(c => c == ' ').Count() / 4;

static string Git(string repo, string arguments)
{
    var start = new ProcessStartInfo("git", $"-C \"{repo}\" {arguments}")
    {
        RedirectStandardOutput = true,
    };
    using var git = Process.Start(start)!;
    var output = git.StandardOutput.ReadToEnd();
    git.WaitForExit();
    return output;
}
```

The script sorts by change count and takes the top ten *before* it measures, so it reads ten files, not every file in the history. That is where the speed comes from. Almost all of the run time is `git log` walking the history, and reading ten files asynchronously or in parallel would not shorten that. To rank by a combination of changes and complexity instead, every file would have to be measured. Only then would parallel reading start to pay off.

### Reading the output

On a real repository, this knowledge base with `.md` instead of `.cs`, the top of the list on 16 November 2026 was:

```text
Changes  Lines Indent  File
     21    177      7  AGENTS.md
     16     64      0  backlog.md
     13    161     43  topics/c/array-parameters.md
     12     27      0  README.md
     11    177     37  topics/cpp/constructors.md
     10    111     14  topics/c/opaque-handles.md
     10     13      0  topics/c/index.md
```

Reading it as hotspot analysis would:

- `AGENTS.md` changes most and is among the longest: the top hotspot. It fits: every new rule lands there.
- `backlog.md`, `README.md` and `topics/c/index.md` change often but are short and flat. They are bookkeeping files, the kind [C5](#c5) warns about.
- `array-parameters.md` and `constructors.md` change often *and* are deeply nested (Indent 43 and 37, from nested lists and code). They are the content hotspots.

On a WPF codebase, the same reading applies. Expect `.csproj`, `*.Designer.cs` and resource files near the top, and skip them. The interesting rows are the large view models and services that also change often.

## Pitfalls

- **Refactoring the ugliest code first.** Ugly but stable code costs little. Its cleanup competes with hotspots for the same time and pays back less ([C2](#c2)).

- **Treating the ranking as precise.** Two files with 40 and 38 changes are equally hot. The analysis finds the top group, not an exact order ([C4](#c4), [C5](#c5)).

- **Forgetting the noise.** Generated and bookkeeping files float to the top of every list ([C5](#c5)).

- **Using all of history.** A ten-year window favours code that was busy long ago ([C6](#c6)).

- **Using the list to blame people.** Hotspots are about code, not authors. Who changed a file says nothing about why it is complex. A list read as a blame list stops people from committing honestly.

- **Starting a rewrite because of the list.** The list says where to look ([C7](#c7)). Whether a hotspot needs small refactorings or a bigger restructuring is decided by reading it.

## Exercises

1. **Which first?** File A: 4,000 lines, 2 changes last year. File B: 1,200 lines, 60 changes last year. File C: 80 lines, 90 changes last year. Where does refactoring time pay back first, and why?

   <details><summary>Solution</summary>

   File B: complex *and* often changed, so its complexity costs effort on every one of its 60 changes ([C1](#c1), [C2](#c2)). A is complex but stable. C is busy but simple, so there is little to gain, and it may be a bookkeeping file ([C5](#c5)).

   </details>

2. **Noise.** Your hotspot list for a WPF app starts with `MyApp.csproj`, `Resources.Designer.cs` and `MainViewModel.cs`. What do you do with each?

   <details><summary>Solution</summary>

   The project file and the designer file change whenever files or resources are added, without real work in them. Skip or exclude them ([C5](#c5)). `MainViewModel.cs` is a candidate: read it to find out why it changes so often ([C7](#c7)).

   </details>

3. **Explain.** A colleague says: "Our worst code is the old import module. Let's start there." It hasn't changed in two years. What do you answer?

   <details><summary>Solution</summary>

   Its mess costs us nothing while nobody has to work in it ([C2](#c2)). Refactoring time pays back where code is both complex and changed often. Once a change to the import module comes up, it becomes a candidate, and that change starts with characterization tests ([C7](#c7)).

   </details>

## Sources

- Adam Tornhill, [*Your Code as a Crime Scene*](https://pragprog.com/titles/atcrime2/your-code-as-a-crime-scene-second-edition/), second edition, Pragmatic Bookshelf, 2024 (first edition 2015): hotspots as the intersection of complexity and effort, from version-control data.
- CodeScene documentation, [Hotspots](https://codescene.io/docs/guides/technical/hotspots.html): development activity concentrated in relatively few modules.
- CodeScene documentation, [Complexity trends](https://codescene.io/docs/guides/technical/complexity-trends.html): indentation-based complexity and its limits.
- Adam Tornhill, [code-maat](https://github.com/adamtornhill/code-maat): the open-source tool from the book that mines git logs for these analyses.
- Microsoft, [File-based apps](https://learn.microsoft.com/dotnet/core/sdk/file-based-apps): `dotnet run` on a single `.cs` file in .NET 10.
- Claude session at work, 2026-11-16.
