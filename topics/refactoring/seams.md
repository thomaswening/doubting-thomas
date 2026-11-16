---
title: Seams
area: refactoring
created: 2026-11-16
updated: 2026-11-16
prerequisites: []
related: []
projects: []
tags: [legacy-code, seams, dependency-breaking, testability, feathers]
---

# Seams

## TL;DR

- The problem: a view model method calls `MessageBox.Show` directly. A test of that method would pop up a real dialog and wait for a click. You want the test to answer "No" instead, but `MessageBox.Show` is static, so neither a mock nor a fake can replace it.

- A **seam** is a place in the code where a test can swap such a call for something harmless *without editing the method that makes the call*. In C# that means a call to a `virtual` or interface member, on an object the method gets from outside. The place where the test picks the replacement, such as `new ReportViewModel(fakeDialogs)`, is the **enabling point**.

- A static call, a non-virtual call, or a call on an object made with `new` inside the method is **not** a seam. Then you first create one with a small edit. For example, move `MessageBox.Show` into a `protected virtual bool ConfirmOverwrite()`. A test subclass overrides it to return `false`.

- Two reasons to need a seam: **separation**, when the code can't run in a test at all (the dialog), and **sensing**, when the test can't see what the code did (it only wrote a file).

- The edit that creates the seam happens *before* there are tests. So it is small and mechanical: keep signatures as they are and let the compiler find the call sites. Only once a test runs through the seam do you start improving the code.

## Key claims

- <a id="c1"></a>**C1.** A seam is a place where you can alter the behaviour of a program without editing in that place (Feathers's definition).

- <a id="c2"></a>**C2.** Every seam has an enabling point: a place where you decide which behaviour runs. For an object seam, the enabling point is the place where the object the call goes to is created or passed in, such as a constructor argument in a test.

- <a id="c3"></a>**C3.** Feathers names three kinds of seam: preprocessing seams (behaviour swapped by macros or conditional compilation), link seams (swapped by linking or loading a different library or class) and object seams (swapped by the object a call is dispatched to). In object-oriented languages, object seams are generally the best choice. The other two are less explicit and are kept for dependencies that are everywhere.

- <a id="c4"></a>**C4.** A call is an object seam only if a different implementation can be substituted without editing the calling method. That means the target is virtual or an interface member, and the object comes from outside the method. A call to a static member (`MessageBox.Show`, `DateTime.Now`, `Singleton.Instance`) or to an object built with `new` inside the method is not a seam.

- <a id="c5"></a>**C5.** Dependencies are broken for two reasons. *Separation*: the code can't run in a test harness at all, for example because it opens a dialog or needs hardware. *Sensing*: the test can't observe the values the code computes or the effects it has.

- <a id="c6"></a>**C6.** *Extract and Override Call* creates an object seam with a minimal edit. Move the problematic call into a `protected virtual` method of the same class. A test subclass then overrides that method. The class's public interface does not change.

- <a id="c7"></a>**C7.** *Extract Interface* plus *Parameterize Constructor* creates an explicit object seam. The dependency gets an interface and the class receives it through a new constructor. The old constructor stays and passes the production implementation, so existing callers compile unchanged.

- <a id="c8"></a>**C8.** Because the code has no tests yet while a seam is being created, the edits that create it should be small, mechanical and signature-preserving. They should lean on the compiler to report every place a change affects, rather than on reading the code.

## Explanation

### The problem seams solve

Start with a test you would like to write. A WPF view model exports a report and asks before it overwrites a file:

```csharp
public void Export(string path)
{
    if (File.Exists(path) &&
        MessageBox.Show($"Overwrite {path}?", "Export", MessageBoxButton.YesNo)
            != MessageBoxResult.Yes)
    {
        Status = "Cancelled";
        return;
    }
    // ... write the file ...
    Status = "Exported";
}
```

You want a test: "if the user says No, `Status` is `Cancelled`". In such a test, `MessageBox.Show` opens a real modal dialog and the test hangs. You would like to tell the code "pretend the user clicked No". With a mock or a fake you could do that, but only if there is a place where the fake can be slotted in. `MessageBox.Show` is static, so there is none.

Feathers defines legacy code as code without tests. This example shows the legacy code dilemma he names: to change the code safely you want tests first, but to write the tests you have to change the code. A **seam** is the way out: a place where a test can swap the troublesome call for a harmless one.

### Seam and enabling point

The definition in [C1](#c1) is about *where* behaviour can change. The method that makes a call is not edited, but the call can end up somewhere else. What decides where it goes is the **enabling point** ([C2](#c2)).

In the example: once the dialog is behind a `protected virtual bool ConfirmOverwrite(string path)`, the line `if (File.Exists(path) && !ConfirmOverwrite(path))` in `Export` is the seam. `Export` stays as it is, but the call can go to WPF's dialog or to a test's override. The enabling point is the line where the test creates its subclass instead of the real view model. The full code is under [Examples](#examples).

In .NET terms: constructor injection, as in an ASP.NET Core app, is a seam. A class that takes an `ILogger` in its constructor calls `_logger.Log(...)`. That call is the seam. The composition root, where the container decides which `ILogger` to build, is the enabling point. In a unit test, the enabling point is the line `new OrderService(fakeLogger)`.

### Three kinds of seam, one that matters in C\#

Feathers lists three kinds ([C3](#c3)), from C and C++ as much as from Java:

- **Preprocessing seams**: a macro replaces a function call before compilation. C# has no macro preprocessor. Its nearest relative is conditional compilation with `#if`, where the enabling point is a build symbol.
- **Link seams**: the program is linked or loaded against a different library or class that has the same names. In C this means linking a fake object file. In Java it means a different classpath.
- **Object seams**: a call on an object goes to whichever implementation that object has. This is virtual dispatch, the mechanism you already know from `virtual`, `override` and interfaces.

Object seams are the best choice in object-oriented languages because they are explicit: you can see in the code that a behaviour is replaceable. For C# code, object seams are nearly the whole story.

### What is *not* a seam

[C4](#c4) is the test you apply while reading legacy code. Ask of each troublesome call: "Can a test change where this call goes without editing this method?"

- `_dialogs.Confirm(...)` on an injected `IDialogService`: yes. That is a seam.
- `MessageBox.Show(...)`: no. It is static, so the call always goes to WPF's dialog.
- `new ReportWriter().Write(...)` inside the method: no. The method itself picks the class.
- `ReportWriter.Instance.Write(...)` through a singleton: no, unless the class offers a way to replace `Instance`.

This is also why mocking libraries such as Moq can fake interfaces and virtual members, but not static calls: they work by generating a subclass or an implementation. In other words, they need an object seam.

### Why break dependencies: separation and sensing

[C5](#c5) names the two reasons. In a WPF view model, a `MessageBox.Show` is a *separation* problem: the test would block on a modal dialog. A method that writes its result to a file and returns `void` is a *sensing* problem: the test runs, but it can't see what was written. The two reasons call for different fakes. A fake for separation only needs to do nothing harmlessly. A fake for sensing must record what it was given.

### Creating a seam safely

When the code offers no seam, you create one with a dependency-breaking technique. Feathers catalogues about two dozen of them. Two cover most cases in a C# view model:

- **Extract and Override Call** ([C6](#c6)) is the quickest. It needs one new `protected virtual` method and one test subclass. It suits a single troublesome call.
- **Extract Interface + Parameterize Constructor** ([C7](#c7)) costs more, but leaves a seam that stays useful: the interface documents the dependency. It is how a view model gets an `IDialogService`.

Either edit happens before there are tests ([C8](#c8)). So you make it the boring way: copy the code unchanged into the new method, keep parameter lists as they are, and build after each step. Where the compiler can find every affected line, for example when you remove the old member and read the errors, it does the checking that tests would otherwise do.

## Examples

### A view model without a seam

A WPF view model exports a report. If the file exists, it asks the user first.

```csharp
using System.IO;
using System.Windows;

public class ReportViewModel
{
    public string Status { get; private set; } = "";

    public void Export(string path)
    {
        if (File.Exists(path) &&
            MessageBox.Show($"Overwrite {path}?", "Export", MessageBoxButton.YesNo)
                != MessageBoxResult.Yes)
        {
            Status = "Cancelled";
            return;
        }
        ReportWriter.Instance.Write(path, BuildRows());
        Status = "Exported";
    }

    private List<string> BuildRows() => new() { "a", "b" };
}
```

A test of the "user declines" path would open a real dialog and wait for a click. `MessageBox.Show` is static, so there is no seam here ([C4](#c4)).

### Extract and Override Call

Move the call into a `protected virtual` method. `Export` itself only changes in that one expression.

```csharp
public class ReportViewModel
{
    public string Status { get; protected set; } = "";

    public void Export(string path)
    {
        if (File.Exists(path) && !ConfirmOverwrite(path))
        {
            Status = "Cancelled";
            return;
        }
        ReportWriter.Instance.Write(path, BuildRows());
        Status = "Exported";
    }

    protected virtual bool ConfirmOverwrite(string path) =>
        MessageBox.Show($"Overwrite {path}?", "Export", MessageBoxButton.YesNo)
            == MessageBoxResult.Yes;

    private List<string> BuildRows() => new() { "a", "b" };
}
```

The test subclass overrides it. It is not a fake view model. It is the real `ReportViewModel` with exactly one method replaced, so everything else the test runs is the production code under test. Its constructor call is the enabling point ([C2](#c2)). The `Asked` counter is for *sensing* ([C5](#c5)).

```csharp
class ReportViewModelThatDeclines : ReportViewModel
{
    public int Asked { get; private set; }

    protected override bool ConfirmOverwrite(string path)
    {
        Asked++;
        return false;
    }
}

[Fact]
public void Export_to_existing_file_is_cancelled_when_user_declines()
{
    var path = Path.GetTempFileName();          // creates the file, so it exists
    var vm = new ReportViewModelThatDeclines();  // enabling point

    vm.Export(path);

    Assert.Equal("Cancelled", vm.Status);
    Assert.Equal(1, vm.Asked);
}
```

Result: the test passes without a dialog. `ReportWriter.Instance` is never reached on this path. A test of the "user agrees" path would need a second seam for the writer.

### Extract Interface + Parameterize Constructor

The explicit version ([C7](#c7)): the dialog becomes a dependency with a name.

```csharp
public interface IDialogService
{
    bool Confirm(string message);
}

public class MessageBoxDialogService : IDialogService
{
    public bool Confirm(string message) =>
        MessageBox.Show(message, "", MessageBoxButton.YesNo) == MessageBoxResult.Yes;
}

public class ReportViewModel
{
    private readonly IDialogService _dialogs;

    // The old constructor stays: existing callers (XAML, other code) compile unchanged.
    public ReportViewModel() : this(new MessageBoxDialogService()) { }

    public ReportViewModel(IDialogService dialogs) => _dialogs = dialogs;

    public string Status { get; private set; } = "";

    public void Export(string path)
    {
        if (File.Exists(path) && !_dialogs.Confirm($"Overwrite {path}?"))
        {
            Status = "Cancelled";
            return;
        }
        ReportWriter.Instance.Write(path, BuildRows());
        Status = "Exported";
    }

    private List<string> BuildRows() => new() { "a", "b" };
}
```

In a test, `new ReportViewModel(new DecliningDialogs())` is the enabling point, where `DecliningDialogs.Confirm` returns `false`. Result: `Status` is `"Cancelled"`, as before.

## Pitfalls

- **Taking a static call for a seam.** `DateTime.Now`, `MessageBox.Show`, `File.Exists` and `Something.Instance` look like ordinary calls, but a test can't redirect them ([C4](#c4)).

- **Overriding a method the constructor calls.** If the base constructor calls the `virtual` method, the override runs before the subclass's constructor body. Anything that body sets is still unset. Extract and Override Call is safe for methods the constructor does not call ([C6](#c6)).

- **Refactoring "a little more" while creating the seam.** Renaming, reordering or cleaning up in the same step mixes untested changes with the seam. Make only the seam. Then write a test through it that pins down what the code does today, such as "user declines, so `Status` is `Cancelled`", and get it to pass. Only then improve the code: that test now tells you if the improvement changed the behaviour ([C8](#c8)). Tests that pin down current behaviour this way are called characterization tests.

- **Removing the old constructor.** Parameterize Constructor keeps the parameterless one. Deleting it breaks every caller at once, XAML-created view models included ([C7](#c7)).

- **Faking everything.** A seam is for the dependency that blocks the test. Replacing every collaborator means the test checks the fakes, not the code.

## Exercises

1. **Spot the seams.** Which of these calls in a view model method are object seams? (a) `_repository.Load(id)` on a field set from a constructor parameter of type `IRepository`; (b) `DateTime.Now`; (c) `new CsvExporter().Export(rows)`; (d) `Settings.Default.LastFolder`.

   <details><summary>Solution</summary>

   Only (a): the call goes through an interface, and the object comes from outside the method ([C4](#c4)). Its enabling point is the constructor call ([C2](#c2)). (b) and (d) are static members. (c) creates its object inside the method.

   </details>

2. **Separation or sensing?** A method computes a total and only writes it to a log file. Another one shows a modal progress window. Which reason to break a dependency applies to each?

   <details><summary>Solution</summary>

   The log file is *sensing*: the code runs, but the test can't see the total. The progress window is *separation*: the code can't run in a test at all ([C5](#c5)).

   </details>

3. **Make a seam.** `ReportViewModel` also sets `Status = $"Exported at {DateTime.Now:HH:mm}"`. Make the time controllable in a test with Extract and Override Call.

   <details><summary>Solution</summary>

   Add `protected virtual DateTime Now() => DateTime.Now;` and write `Status = $"Exported at {Now():HH:mm}";`. A test subclass overrides `Now()` to return a fixed time ([C6](#c6)). The explicit alternative is a clock interface passed to the constructor ([C7](#c7)). In .NET 8 and later, the built-in `TimeProvider` class plays that role.

   </details>

## Sources

- Michael Feathers, *Working Effectively with Legacy Code*, Prentice Hall, 2004: chapter 3 "Sensing and Separation", chapter 4 "The Seam Model" (definition of seam and enabling point, the three seam types), chapter 25 "Dependency Breaking Techniques" (Extract and Override Call, Extract Interface, Parameterize Constructor). Chapter 4 is free as a [sample chapter](https://www.informit.com/articles/article.aspx?p=359417) from the publisher.
- Martin Fowler, [Legacy Seam](https://martinfowler.com/bliki/LegacySeam.html), 2024: a short summary of seams and enabling points.
- Microsoft, [TimeProvider class](https://learn.microsoft.com/dotnet/api/system.timeprovider): .NET's own seam for the clock.
- Claude session at work, 2026-11-16.
