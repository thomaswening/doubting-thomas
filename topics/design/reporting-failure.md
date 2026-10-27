---
title: "Reporting failure: exceptions, the Try pattern and result types"
area: design
created: 2026-10-26
updated: 2026-10-26
prerequisites: []
related: [cpp/raii-and-ownership]
projects: [partonforge]
tags: [design, exceptions, try-parse, optional, expected, result-type, nullable, csharp, cpp]
---

# Reporting failure: exceptions, the Try pattern and result types

## TL;DR

- A function that can fail tells its caller in one of three ways: it **throws an exception**, it returns "maybe a value" (the C# **Try pattern**, a nullable type, C++'s `std::optional`), or it returns a **result type** holding a value or the reason it failed (C++23's `std::expected`).
- Choose by who handles the failure. If the caller cannot handle it on the spot (a missing file, a broken invariant), throw. If the caller expects it and the reason is obvious, return "maybe a value". If the caller expects it and needs the reason, return a result type.
- .NET's design guidelines recommend the Try pattern where failure is common: `bool TryParse(string text, out int value)`, next to a `Parse` that throws.
- Do not turn every exception into a result. A result the caller cannot act on only moves the problem up by hand.

## Key claims

- <a id="c1"></a>**C1.** Microsoft's Framework Design Guidelines recommend the Try-Parse pattern for members that may fail in common scenarios. Such a member is named with the prefix `Try`, returns `bool` and delivers its result through an `out` parameter.
- <a id="c2"></a>**C2.** The same guidelines require a Try member to throw for every failure other than its one well-defined case, and to have a throwing counterpart: `int.TryParse` next to `int.Parse`.
- <a id="c3"></a>**C3.** In C#, `[NotNullWhen(true)]` on an `out` parameter, as in `bool TryFindUnit(string symbol, [NotNullWhen(true)] out string? unit)`, tells the nullable analysis that `unit` is not null when the method returns `true`.
- <a id="c4"></a>**C4.** `std::optional<T>` (C++17, header `<optional>`) holds a `T` or nothing. `value_or(fallback)` returns the value or the fallback. `value()` on an empty optional throws `std::bad_optional_access`. `*` on an empty optional is undefined behaviour.
- <a id="c5"></a>**C5.** `std::expected<T, E>` (C++23, header `<expected>`) holds either a `T` or an error of type `E`. A function returns the error as `return std::unexpected(reason);`. The caller reads it with `error()`. `value()` on an error throws `std::bad_expected_access<E>`.
- <a id="c6"></a>**C6.** C# has no built-in result type. "Maybe a value" is `T?`. A result with a reason is a library type or a small record of one's own.
- <a id="c7"></a>**C7.** An exception suits a failure the immediate caller cannot handle: a missing file, a broken invariant, a programming error. A Try method, optional or result type suits a failure the caller expects and acts on, such as invalid user input.
- <a id="c8"></a>**C8.** Outside such idioms, a function returns its output instead of writing it into an argument. The C++ Core Guidelines say so in F.20. F.21 returns several outputs as a struct.

## Explanation

### Three ways to say "it failed"

An exception jumps out of the function and up the call stack until someone catches it. It needs no help from the functions in between. That is its strength: code between the failure and the handler stays free of error checks. It is also its cost. A caller cannot see from the signature that a function throws. In .NET, a thrown exception can be orders of magnitude slower than a normal return.

"Maybe a value" puts the failure into the return type. In C# that is the Try pattern ([C1](#c1)) or a nullable return. In C++ it is `std::optional` ([C4](#c4)), which has no Try pattern of its own. The caller must check before using the value. The compiler helps: C#'s nullable analysis warns about an unchecked `T?` ([C3](#c3)).

A result type is "maybe a value" with a reason attached ([C5](#c5)). It suits failures where the caller needs to know which rule was broken, for example to show a message.

### Choosing

The question is who handles the failure, and how often it happens ([C7](#c7)).

| Failure | Who handles it | Use |
|---|---|---|
| A config file is missing | someone far up, often `main` | exception |
| A broken invariant, a bug | nobody: the program should stop | exception (or an assertion) |
| User input is not a number | the immediate caller | Try pattern, `T?`, `std::optional` |
| User input breaks one of several rules | the immediate caller, who shows which | result type |

The .NET guidelines draw the line the same way ([C2](#c2)). `TryParse` returns `false` only for "this is not a number". A `null` argument still throws, because that is a bug in the caller, not the expected case.

### Not every exception becomes a result

A result type that the caller cannot act on only gets passed up, function by function, until someone can. That is an exception written out by hand, with an `if` at every level. So a result type is for expected failures. The rest stays an exception.

### Out-parameters

The Try pattern is the one place where an `out` parameter is idiomatic in C#. Elsewhere, and in C++ in general, a function returns its output ([C8](#c8)). A function that fills in an argument, such as `void ComputeStatistics(List<double> values, Statistics result)`, hides its output in its signature. `Statistics ComputeStatistics(IReadOnlyList<double> values)` shows it.

## Examples

C#, run with `dotnet run fail.cs` (.NET 10):

```csharp
using System.Diagnostics.CodeAnalysis;

foreach (var text in new[] { "42", "4x" })
{
    // Try pattern: the common failure is a false return, not an exception.
    if (int.TryParse(text, out var count)) Console.WriteLine($"ok {count}");
    else Console.WriteLine($"not a number: '{text}'");
}

Console.WriteLine(FindUnit("GeV") ?? "unknown");
Console.WriteLine(FindUnit("furlong") ?? "unknown");

if (TryFindUnit("MeV", out var unit)) Console.WriteLine(unit.Length);  // no null warning

static string? FindUnit(string symbol) => symbol switch
{
    "GeV" => "giga-electronvolt",
    "MeV" => "mega-electronvolt",
    _ => null,
};

// [NotNullWhen(true)] tells the nullable analysis that unit is set when the method returns true.
static bool TryFindUnit(string symbol, [NotNullWhen(true)] out string? unit)
{
    unit = FindUnit(symbol);
    return unit is not null;
}
```

Expected output:

```text
ok 42
not a number: '4x'
giga-electronvolt
unknown
17
```

C++, `std::optional` for "maybe a number" and `std::expected` for "a number or the reason" (GCC 13, `-std=c++23`). `std::from_chars` parses without throwing. Its result says where parsing stopped and whether it failed.

```cpp
#include <charconv>
#include <expected>
#include <iostream>
#include <optional>
#include <string>
#include <string_view>

// "Maybe a value": empty if the text is not a whole number.
std::optional<int> parse_count(std::string_view text) {
    int value{};
    const auto [end, error] = std::from_chars(text.data(), text.data() + text.size(), value);
    if (error != std::errc{} || end != text.data() + text.size()) return std::nullopt;
    return value;
}

// "A value or the reason": the caller learns why it failed.
std::expected<int, std::string> parse_positive(std::string_view text) {
    const std::optional<int> count = parse_count(text);
    if (!count) return std::unexpected("not a whole number: '" + std::string(text) + "'");
    if (*count <= 0) return std::unexpected("not positive: " + std::to_string(*count));
    return *count;
}

int main() {
    std::cout << parse_count("42").value_or(-1) << ' ' << parse_count("4x").value_or(-1) << '\n';
    for (const std::string_view text : {"7", "-3", "abc"}) {
        const auto result = parse_positive(text);
        if (result) std::cout << "ok " << *result << '\n';
        else std::cout << "error " << result.error() << '\n';
    }
}
```

Expected output:

```text
42 -1
ok 7
error not positive: -3
error not a whole number: 'abc'
```

`const auto [end, error] = …` is a structured binding: it unpacks the two fields of the returned struct into two names, like C#'s `var (end, error) = …` on a tuple.

## Pitfalls

- Writing a `TryX` method that returns `false` for every failure, bugs included. It should throw for anything but its one expected case ([C2](#c2)).
- Using `*optional` without checking it. On an empty optional that is undefined behaviour, not an exception ([C4](#c4)).
- Replacing every exception with a result type, so that every function in between needs an `if` to pass it on.
- Using `std::expected` in a C++20 project. It needs C++23 ([C5](#c5)). Until then, a small struct with the value and the reason does the job.

## Sources

- Thomas's review of [claude-config PR #9](https://github.com/thomaswening/claude-config/pull/9), 2026-10-25: "Isn't this a real use case for `out`, though?", on the coding guideline's rule about out-parameters.
- [Framework Design Guidelines: Exceptions and performance](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/exceptions-and-performance) (Tester-Doer and Try-Parse patterns).
- [Attributes for null-state static analysis](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/attributes/nullable-analysis) (`NotNullWhen`).
- [cppreference: `std::optional`](https://en.cppreference.com/w/cpp/utility/optional), [`std::expected`](https://en.cppreference.com/w/cpp/utility/expected), [`std::from_chars`](https://en.cppreference.com/w/cpp/utility/from_chars).
- [C++ Core Guidelines, F.20 and F.21](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rf-out) (return values instead of output parameters).
