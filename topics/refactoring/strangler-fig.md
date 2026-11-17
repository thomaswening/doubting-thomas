---
title: Strangler Fig
area: refactoring
created: 2026-11-16
updated: 2026-11-16
prerequisites: [refactoring/seams]
related: [refactoring/characterization-tests]
projects: []
tags: [legacy-code, strangler-fig, branch-by-abstraction, migration, transitional-architecture, fowler]
---

# Strangler Fig

## TL;DR

- The problem: the report module of a legacy WPF app is beyond repair, and the team wants to replace it. A rewrite from scratch would take a year. Meanwhile the old module keeps getting changes that the rewrite has to catch up with. Rewrites like this often fail.

- **Strangler Fig** replaces the old code piece by piece instead. A **facade** sits in front of the old module and routes each call either to the old code or to the new one. Report kinds move to the new code one at a time. When nothing routes to the old code any more, it is deleted.

- Every step ships. Users get the new code for the moved parts right away, and the team learns from each part before doing the next.

- The facade, and anything else that exists only so that old and new can run side by side, is **transitional architecture**. It is built on purpose and removed at the end.

- Inside one desktop app, the facade is an interface with a routing implementation. That is Fowler's **Branch by Abstraction**, and the interface is an object [seam](seams.md).

## Key claims

- <a id="c1"></a>**C1.** The Strangler Fig pattern replaces a legacy system gradually. New code is built beside the old, takes over its behaviour piece by piece, and the old code is removed once nothing uses it. The name comes from strangler figs, which grow around a host tree until the tree dies and the fig stands in its shape.

- <a id="c2"></a>**C2.** The pattern is the alternative to a big-bang replacement. A big replacement takes long, delivers value only at the end, and has to reproduce behaviour nobody fully knows. A gradual replacement delivers value with each moved piece and lets the team learn as it goes.

- <a id="c3"></a>**C3.** A facade intercepts the calls to the legacy system and routes each one to the old or the new implementation. It is the one place that knows which parts have moved. Moving a part means changing the routing.

- <a id="c4"></a>**C4.** The migration runs in four steps. (1) Put the facade in front of the legacy system, routing everything to it. (2) Shift parts to the new system one at a time. (3) Decommission the legacy system once nothing depends on it. (4) Remove the facade, so the callers use the new system directly.

- <a id="c5"></a>**C5.** Transitional architecture is code that exists only so that old and new can run side by side, such as the facade, adapters or data synchronisation. It is meant to be removed after the migration. Its cost is accepted for the lower risk and the earlier value.

- <a id="c6"></a>**C6.** While both systems run, they usually need the same data. Shared data stores must be reachable by both, and keeping them consistent is often the hardest part of the migration.

- <a id="c7"></a>**C7.** The pattern needs a place where calls can be intercepted. It is a poor fit when there is no such place, when the system is small enough to replace at once, or when the old system has to disappear quickly.

- <a id="c8"></a>**C8.** Branch by Abstraction applies the same idea inside one codebase. Put an abstraction in front of the code to be replaced, move all callers onto it, build a new implementation behind it, switch callers over part by part, then delete the old implementation and, if no longer needed, the abstraction.

- <a id="c9"></a>**C9.** A bug found while moving a piece is fixed after the move, as a separate change. First the new code reproduces the old behaviour, so the tests show the move changed nothing. Then the fix changes the behaviour on purpose, with its test updated. Mixing the two makes a failing test ambiguous.

## Explanation

### Start from the rewrite that doesn't finish

Say the report module of your WPF app is the kind of code nobody wants to touch: a hotspot, full of special cases, and slow. The tempting plan is "let's rewrite it properly". Martin Fowler's experience is that such plans mostly go down in flames ([C2](#c2)):

- **It takes long.** For months there is nothing to ship. Meanwhile the old module still gets bug fixes and features, which the rewrite has to catch up with.
- **Nobody knows all of the old behaviour.** The old code *is* the specification, with all its special cases. Some of them matter to some customer. Many of them are no longer needed, but which ones?
- **Value comes at the end, if at all.** When the deadline slips, the business sees no return on a year of work.

### Grow the new beside the old

The strangler fig is a vine Fowler saw in the Queensland rainforest. It starts in a nook of a host tree, grows its roots down to the ground and its leaves up to the light, and over the years the host tree dies. What stands in the end is the fig, in the shape of the tree ([C1](#c1)).

For code: don't replace the module at once. Build the new code beside it, take over one piece at a time, and keep shipping. For the report module, a "piece" could be one report kind: first the summary report, then the calibration report, then the rest.

### The facade decides

To take over one piece while the rest stays old, something has to decide for every call which side handles it. That is the **facade** ([C3](#c3)). In a web system it is often an HTTP proxy in front of the old application. In a desktop app it is plain C#: an interface that callers use, with an implementation that routes.

The facade is the only place that knows what has moved. Moving the calibration report means adding `"Calibration"` to its routing table, nothing else. Moving it back, if the new code has a problem, is just as small.

Microsoft's architecture guide describes the full life cycle in four steps ([C4](#c4)): put the facade in front with everything routed to the old code, move the parts over one by one, retire the old code, and finally remove the facade, so that callers talk to the new code directly.

### Inside one codebase: Branch by Abstraction

In a single WPF app, there is no network boundary where a proxy could sit. The facade then is an abstraction inside the code. Fowler describes this as **Branch by Abstraction** ([C8](#c8)):

1. Put an interface, say `IReportExporter`, in front of the old module.
2. Move all callers onto the interface. The only implementation so far wraps the old code.
3. Write a new implementation behind the same interface. Route one report kind to it.
4. Route more kinds, one at a time.
5. When no kind goes to the old code, delete it, and delete the routing if it is no longer needed.

Step 1 creates an object [seam](seams.md#c7) on purpose: the routing implementation is chosen where the object is created ([seams C2](seams.md#c2)). The name says what it replaces: instead of a long-lived version-control branch with the rewrite, the "branch" lives in the code, behind an abstraction, and every commit goes to the main line.

The same works for screens. A navigation service that opens views can open the new `ReportView` for some report kinds and the old dialog for the others.

### Transitional architecture is planned waste

The facade, an adapter that lets the new code read the old data format, a job that copies data between old and new stores: all of these exist only for the migration ([C5](#c5)). Fowler calls this transitional architecture. It is code you build knowing you'll delete it. That feels wasteful, but it is the price of shipping every step instead of betting on one big switch, and Fowler considers it worth paying.

### Data is the hard part

While old and new code both run, they usually need the same data ([C6](#c6)). In a desktop app that may be the same settings file, the same database or the same project files on disk. Either both sides read and write the same store, which ties the new code to the old schema for a while, or the data is synchronised, which is more transitional architecture. Plan this before the first piece moves. [The example below](#shared-data-one-file-two-implementations) shows both ways going wrong with a shared template file, and the adapter that fixes it.

### Before a piece moves: know what it does

Moving a piece means the new code must do what users rely on, and not necessarily everything the old code does. [Characterization tests](characterization-tests.md#c1) on the old code show what it does today. For each finding, decide whether the new code keeps it. The tests that describe kept behaviour then run against the new implementation too.

### Bugs found while moving a piece

Moving a piece often turns up bugs: some characterization tests turn out to pin down wrong behaviour. Should you fix them during the migration, or after it is finished? Neither. Fix them right after the piece has moved, as a change of its own ([C9](#c9)):

1. **Move the piece with the bug.** The new code reproduces the old behaviour, wrong parts included. The characterization tests pass against old and new alike. That is your evidence that the move itself changed nothing. Commit.
2. **Fix the bug in the new code.** Update the test's expected value and turn it into an ordinary test of the corrected behaviour ([characterization tests C3, C9](characterization-tests.md#c3)). Commit.

Mixing both in one step loses that evidence. When a test fails, you can't tell whether the move broke something or the fix changed something on purpose. It is the same reason a seam is created before any cleanup ([seams C8](seams.md#c8)).

Waiting until the whole migration is finished is the opposite mistake. A migration can take months, and users would live with a bug the team already understands. The new code is also the better place to fix it: it is tested and easier to change.

Two consequences of the facade:

- **Switching back brings the bug back.** If the new code for a piece has a problem and the facade routes that piece to the old code again, the old bug returns with it. Know that before you rely on the switch as a safety net.
- **The bug still lives in the old code for the pieces that haven't moved.** If it is urgent there, fix it in the old code as well, with its own characterization test updated. Otherwise it disappears when that piece moves.

Whether a "bug" gets fixed at all is still a decision, not a reflex ([characterization tests C4](characterization-tests.md#c4)). Something may rely on the wrong behaviour.

### When it doesn't fit

The pattern needs a place to intercept calls ([C7](#c7)). If callers reach into the old module from everywhere, through static calls and shared globals, first create that place with seams, or the facade has nothing to stand on. For a small module that is quick to replace, the facade costs more than it saves. And if the old code must be gone by a fixed date, a long period of coexistence doesn't help.

## Examples

### A strangler facade in C\#

The report export moves report kind by report kind. Callers only know `IReportExporter`.

```csharp
public interface IReportExporter
{
    string Export(string reportKind);
}

// The old code, wrapped but not changed.
public class LegacyReportExporter : IReportExporter
{
    public string Export(string reportKind) => $"legacy export of {reportKind}";
}

// The new implementation, one report kind at a time.
public class NewReportExporter : IReportExporter
{
    public string Export(string reportKind) => $"new export of {reportKind}";
}

// The strangler facade: the only place that knows which kinds have moved.
public class ReportExporterFacade : IReportExporter
{
    private static readonly HashSet<string> Migrated = new() { "Summary", "Calibration" };

    private readonly IReportExporter _legacy;
    private readonly IReportExporter _new;

    public ReportExporterFacade(IReportExporter legacy, IReportExporter @new)
    {
        _legacy = legacy;
        _new = @new;
    }

    public string Export(string reportKind) =>
        Migrated.Contains(reportKind) ? _new.Export(reportKind) : _legacy.Export(reportKind);
}
```

At the composition root, the app builds the facade. That line is the enabling point of the seam:

```csharp
IReportExporter exporter = new ReportExporterFacade(
    new LegacyReportExporter(), new NewReportExporter());

foreach (var kind in new[] { "Summary", "Detail", "Calibration" })
    Console.WriteLine(exporter.Export(kind));
```

Expected output:

```text
new export of Summary
legacy export of Detail
new export of Calibration
```

Moving "Detail" later is one word in `Migrated`. When all kinds have moved, `LegacyReportExporter` and the facade are deleted, and the composition root creates `NewReportExporter` directly ([C4](#c4)). In a real app, `Migrated` could also come from a feature flag, so a moved kind can be switched back without a new release.

### Shared data: one file, two implementations

The report module keeps user-defined report templates in a file, `ReportTemplates.xml`:

```xml
<templates>
  <template name="Summary" decimals="2" font="Segoe UI" />
  <template name="Detail" decimals="1" font="Segoe UI" />
</templates>
```

The summary report has moved to the new code. The detail report still runs on the old code. Both read the same file, and the new code has its own model, `ReportTemplate(string Name, int Precision)`, which it would like to store as JSON ([C6](#c6)). Here is what goes wrong with the obvious choices:

- **The new code writes its own format into the same file.** It saves `<template name="Summary" precision="3" />`. The old code still reads `Summary` for the "export all" command, finds no `decimals` attribute, and either crashes or falls back to a default. The `font` attribute is gone as well, because the new code didn't know about it.
- **The new code keeps its own file**, `templates.json`. Now there are two copies. A user changes the decimals of the summary template in the new screen, and the old "export all" still prints with the old value from the XML. The copies drift apart, and users see two answers to one question.

The transitional answer: during the migration, the new code reads and writes the *old* format, through an adapter behind its own interface ([C5](#c5)). The new code works with `ReportTemplate` and `Precision`. Only the adapter knows about XML and `decimals`:

```csharp
public record ReportTemplate(string Name, int Precision);

public interface ITemplateStore
{
    ReportTemplate Load(string name);
    void Save(ReportTemplate template);
}

// Transitional: the new code reads and writes the OLD file format,
// so the old module, which still handles some report kinds, keeps working.
public class LegacyXmlTemplateStore : ITemplateStore
{
    private readonly string _path;

    public LegacyXmlTemplateStore(string path) => _path = path;

    public ReportTemplate Load(string name)
    {
        var element = Find(XDocument.Load(_path), name);
        return new ReportTemplate(name, (int)element.Attribute("decimals")!);
    }

    public void Save(ReportTemplate template)
    {
        var document = XDocument.Load(_path);
        Find(document, template.Name).SetAttributeValue("decimals", template.Precision);
        document.Save(_path);
    }

    private static XElement Find(XDocument document, string name) =>
        document.Root!.Elements("template").Single(t => (string)t.Attribute("name")! == name);
}
```

`Save` loads the file and changes only the one attribute it owns, so attributes the new code doesn't know, like `font`, survive. With the template `<template name="Summary" decimals="2" />`, loading it and saving it with `Precision = 3` leaves the file as:

```text
<template name="Summary" decimals="3" />
```

The old code reads `decimals="3"` and agrees with the new screen. Once the last report kind has moved and the old module is gone, the store can switch to JSON. A one-time conversion reads the XML through `LegacyXmlTemplateStore`, writes `templates.json`, and the adapter is deleted with the rest of the transitional architecture ([C4](#c4)).

The same questions come up with a database table, a settings file or a project file that users keep for years. Which code may write it? Which format wins? What happens to fields one side doesn't know? Answer them before the first piece moves.

## Pitfalls

- **Never finishing.** The last, hardest pieces stay on the old code for years, and the app now has two implementations and a facade to maintain. Plan the end: steps 3 and 4 are part of the pattern ([C4](#c4)).

- **Treating the facade as permanent.** It is transitional architecture. Business logic that creeps into the routing is hard to remove later ([C5](#c5)).

- **Copying every old behaviour into the new code.** Some of it is no longer wanted. Characterize first, then decide what the new code keeps.

- **Fixing bugs in the same step as the move.** A failing test then can't tell you whether the move broke something or the fix changed it on purpose ([C9](#c9)).

- **Forgetting the data.** Two implementations that write the same file or table in different ways corrupt each other's data ([C6](#c6)).

- **Starting without an interception point.** If the old module is called statically from fifty places, the facade can't route anything. Create the seam first ([C7](#c7), [C8](#c8)).

## Exercises

1. **Name the parts.** In the example, which class is the facade, which line is the seam's enabling point, and what is deleted at the end?

   <details><summary>Solution</summary>

   `ReportExporterFacade` is the facade ([C3](#c3)). The composition-root line `new ReportExporterFacade(new LegacyReportExporter(), new NewReportExporter())` decides which implementation callers get. At the end, `LegacyReportExporter` and the facade are deleted, and the composition root builds `NewReportExporter` directly ([C4](#c4), [C5](#c5)).

   </details>

2. **Rewrite or strangle?** (a) A 200-line settings dialog that nobody depends on. (b) The whole result-calculation layer, used by every screen and every export. Which approach fits each, and why?

   <details><summary>Solution</summary>

   (a) Replace it at once: it is small, and a facade would cost more than it saves ([C7](#c7)). (b) Strangle it: replacing it at once would take long, deliver value only at the end and risk missing behaviour ([C2](#c2)). Put an abstraction in front of it first ([C8](#c8)).

   </details>

3. **Explain.** Why is "rewrite it on a branch and merge when done" riskier than Branch by Abstraction?

   <details><summary>Solution</summary>

   The branch delivers nothing until the merge, and the main line keeps changing while it lives, so the merge grows harder every week. With Branch by Abstraction, every step is committed to the main line and ships, and the switch happens one part at a time behind an interface ([C2](#c2), [C8](#c8)).

   </details>

## Sources

- Martin Fowler, [Strangler Fig](https://martinfowler.com/bliki/StranglerFigApplication.html), bliki, 2024: the name, why gradual replacement beats a big rewrite, transitional architecture.
- Ian Cartwright, Rob Horn, James Lewis, [Patterns of Legacy Displacement](https://martinfowler.com/articles/patterns-legacy-displacement/), 2024: transitional architecture, event interception and the other patterns behind a gradual replacement.
- Microsoft, [Strangler Fig pattern](https://learn.microsoft.com/azure/architecture/patterns/strangler-fig), Azure Architecture Center: the facade, the four steps, data and other considerations, when not to use it.
- Martin Fowler, [Branch By Abstraction](https://martinfowler.com/bliki/BranchByAbstraction.html), bliki, 2014: the in-process technique and its steps.
- Claude session at work, 2026-11-16.
