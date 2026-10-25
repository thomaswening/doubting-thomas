---
title: CurrentCulture and CurrentUICulture
area: dotnet
created: 2026-10-26
updated: 2026-10-26
prerequisites: []
related: []
projects: [crateedit]
tags: [globalization, localization, culture, resources, formatting]
---

# CurrentCulture and CurrentUICulture

## TL;DR

- .NET has two "current cultures", and they control different things.
- **`CurrentCulture`** formats and parses: numbers, dates, currency, and culture-aware string comparison and sorting.
- **`CurrentUICulture`** picks the language of resource strings, the translated texts of the user interface.
- They are set independently. Windows takes them from two different settings, so English menus with German number formats is an ordinary combination.
- Text meant for machines (log files, data files, protocols) is formatted with **`CultureInfo.InvariantCulture`**, never the current culture.

## Key claims

- <a id="c1"></a>**C1.** `CultureInfo.CurrentCulture` controls formatting and parsing of numbers, dates and currency, and culture-aware string comparison. Under `de-DE`, `1.5.ToString()` returns `1,5`.
- <a id="c2"></a>**C2.** `CultureInfo.CurrentUICulture` controls which resource strings a `ResourceManager` loads. It has no effect on how numbers or dates are formatted.
- <a id="c3"></a>**C3.** The two are independent. On Windows, `CurrentCulture` comes from the region format setting and `CurrentUICulture` from the display language.
- <a id="c4"></a>**C4.** When a `ResourceManager` has no resources for the UI culture, it falls back along the parent chain, for example `de-DE` → `de` → the neutral resources. A language without a translation, such as `fr-FR` in an app with only English and German, gets the neutral (default) language.
- <a id="c5"></a>**C5.** Under `de-DE`, `double.Parse("1.5")` returns `15`, not 1.5: the full stop is the German thousands separator, which the default number style accepts and ignores.
- <a id="c6"></a>**C6.** Text that a program writes for other programs or for later parsing (log files, data files, configuration) is formatted with `CultureInfo.InvariantCulture`, so that it reads the same on every machine.
- <a id="c7"></a>**C7.** A test that changes `CurrentCulture` or `CurrentUICulture` restores the original afterwards, typically in a `finally` block or a disposable scope. Otherwise later tests run under the changed culture.

## Explanation

### Two questions, two settings

A program asks two separate questions about the user:

1. **How do they write numbers and dates?** Germans write `1,5` and `26.10.2026`, the British `1.5` and `26/10/2026`. That's `CurrentCulture` ([C1](#c1)).
2. **Which language do they read?** That decides whether the Help menu says `Help` or `Hilfe`. That's `CurrentUICulture` ([C2](#c2)).

They are separate because people's answers differ. Many Germans run Windows in English but keep German date and number formats. Windows has two settings for exactly this: *Region → Regional format* feeds `CurrentCulture`, *Language → Windows display language* feeds `CurrentUICulture` ([C3](#c3)).

| | Controls | Example under German |
|---|---|---|
| `CurrentCulture` | `ToString()`, `Parse`, string interpolation, `string.Compare`, sorting | `1.5.ToString()` gives `1,5` |
| `CurrentUICulture` | `ResourceManager.GetString`, so all `Strings.Xyz` properties of a `.resx` file | `Strings.Menu_Help` gives `_Hilfe` |

### Resource fallback

A `.resx` file `Strings.resx` holds the neutral texts (English, say) and `Strings.de.resx` the German ones. For a UI culture of `de-DE`, the `ResourceManager` looks for `de-DE`, then its parent `de`, then the neutral file ([C4](#c4)). For `fr-FR`, it finds neither `fr-FR` nor `fr`, so it uses English. That's what [CrateEdit](https://github.com/thomaswening/CrateEdit)'s `LanguageSelectionTests` check: a French user gets English, not an error.

### Machine text uses the invariant culture

Whatever `CurrentCulture` produces is meant for people. A log file is read by people too, but also by tools, other machines and support staff in another country. If it is written with the current culture, the same program writes `Retrying after 1,5 seconds` on one machine and `1.5` on another. Worse, a value written as text and parsed back under a different culture can change: `double.Parse("1.5")` under `de-DE` is 15 ([C5](#c5)). So text for machines uses `CultureInfo.InvariantCulture`, a fixed culture based on English that is the same everywhere ([C6](#c6)).

CrateEdit requires this for its diagnostic log ([REQ-129](https://github.com/thomaswening/CrateEdit/blob/main/docs/requirements.md#req-129)). The test sets `CurrentCulture` to German, because that's what would change the number format. It does not set `CurrentUICulture`, which has no effect on numbers ([C2](#c2)).

### Tests must restore the culture

Both properties belong to the running thread, so a test that changes them changes them for whatever runs next on that thread ([C7](#c7)). CrateEdit wraps this in a small disposable helper:

```csharp
using var german = CultureScope.Ui("de-DE");   // restored when german is disposed
var message = ErrorMessages.For(error);
```

## Examples

This program shows the two cultures working independently (run as a file-based app with `dotnet run check.cs`):

```csharp
using System.Globalization;

CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("de-DE");
CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("en-GB");

Console.WriteLine(1.5.ToString());                                  // 1,5
Console.WriteLine($"{1.5}");                                        // 1,5   (interpolation uses CurrentCulture)
Console.WriteLine(1.5.ToString(CultureInfo.InvariantCulture));      // 1.5
Console.WriteLine(FormattableString.Invariant($"{1.5}"));           // 1.5
Console.WriteLine(new DateTime(2026, 10, 26).ToString("d"));        // 26.10.2026
Console.WriteLine(double.Parse("1.5"));                             // 15    (C5)
Console.WriteLine(CultureInfo.CurrentUICulture.Name);               // en-GB (untouched by CurrentCulture)
Console.WriteLine(CultureInfo.GetCultureInfo("de-DE").Parent.Name); // de    (the fallback step of C4)
```

All outputs were checked with .NET 10.

## Pitfalls

- **Setting `CurrentUICulture` to test number formats.** It changes texts only ([C2](#c2)).
- **Parsing user-independent data with the current culture.** A file written on a British machine and read on a German one turns `1.5` into `15` ([C5](#c5)). Pass `CultureInfo.InvariantCulture` to `Parse` and `ToString`.
- **String interpolation in log or file output.** `$"{value}"` uses `CurrentCulture`. Use `FormattableString.Invariant` or the invariant culture ([C6](#c6)).
- **Not restoring the culture in a test.** The next test on the thread inherits it, and fails or passes depending on test order ([C7](#c7)).

## Sources

- [CrateEdit PR #21](https://github.com/thomaswening/CrateEdit/pull/21): the review question on `CultureScope`, which switches one or the other culture in tests.
- Claude session on CrateEdit, 2026-10-26.
- Microsoft Learn: [`CultureInfo.CurrentCulture`](https://learn.microsoft.com/dotnet/api/system.globalization.cultureinfo.currentculture), [`CultureInfo.CurrentUICulture`](https://learn.microsoft.com/dotnet/api/system.globalization.cultureinfo.currentuiculture), [the resource fallback process](https://learn.microsoft.com/dotnet/core/extensions/package-and-deploy-resources#the-resource-fallback-process).
