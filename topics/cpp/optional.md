---
title: std::optional
area: cpp
created: 2026-10-29
updated: 2026-10-29
prerequisites: []
related: [cpp/sanitizers]
projects: [partonforge]
tags: [cpp, optional, nullopt, nullable, has-value, value-or, bad-optional-access]
---

# std::optional

## TL;DR

- `std::optional<T>` (C++17) holds either a `T` or nothing. It is C#'s `Nullable<T>` (`int?`), for any type.
- The `T` lives inside the optional itself. Nothing is allocated on the heap.
- `if (opt)` asks "is there a value?". `*opt` and `opt->member` reach the value **without checking**. `opt.value()` checks and throws.
- `return value;` fills it, and `return std::nullopt;` leaves it empty.
- `std::optional<bool>` in an `if` tests whether there is a value, not whether it is `true`.

## Key claims

- <a id="c1"></a>**C1.** `std::optional<T>`, declared in `<optional>` since C++17, either contains a value of type `T` or is empty; the contained value is stored inside the optional object, so no heap allocation takes place.
- <a id="c2"></a>**C2.** A `T` converts implicitly to `std::optional<T>`, so a function returning `std::optional<int>` can `return 7;`; `return std::nullopt;` or `return {};` returns an empty optional.
- <a id="c3"></a>**C3.** `opt.has_value()` and `static_cast<bool>(opt)` are true exactly when `opt` contains a value; an `if (opt)` or `!opt` uses the same test.
- <a id="c4"></a>**C4.** `*opt` and `opt->member` access the contained value without checking; on an empty optional they are undefined behaviour. `opt.value()` checks and throws `std::bad_optional_access` when `opt` is empty.
- <a id="c5"></a>**C5.** `opt.value_or(fallback)` returns the contained value, or `fallback` if `opt` is empty.
- <a id="c6"></a>**C6.** C#'s counterpart is `Nullable<T>` (`T?`) for value types: `HasValue` corresponds to `has_value()`, `Value` (which throws `InvalidOperationException` when empty) to `value()`, and `GetValueOrDefault(x)` or `?? x` to `value_or(x)`. C# has no unchecked access like `*opt`.
- <a id="c7"></a>**C7.** `std::optional<T&>`, an optional reference, does not compile in C++20 (C++26 adds it); the usual substitutes are a pointer, which may be null, or `std::optional<std::reference_wrapper<T>>`.
- <a id="c8"></a>**C8.** Comparing an optional with a value, as in `opt == 5`, is true only if `opt` contains a value equal to 5; an empty optional compares unequal to every value.

## Explanation

### A value that may be missing

A function sometimes has no answer: a parse that fails, a lookup that finds nothing, a computation that could not run. C# writes this as `int?`, or returns `null` for a reference type. C++ has no `null` for a value type, and returning `-1` or `0` as "no answer" mixes the answer with the error. `std::optional<T>` makes the possibility part of the type ([C1](#c1)).

Unlike a pointer, an optional owns its value and keeps it inside itself: a `std::optional<double>` is a `double` plus a flag that says whether it is set. Nothing is allocated, and copying the optional copies the value.

### Filling and testing

Returning a `T` from a function declared to return `std::optional<T>` fills it automatically, and `std::nullopt` stands for "nothing" ([C2](#c2)). The caller tests with `if (result)` or `result.has_value()` ([C3](#c3)), the same test C# writes as `result.HasValue`.

### Getting the value out

C++ offers three ways to read the value, with different safety ([C4](#c4), [C5](#c5)):

| Expression | Empty optional | C# counterpart |
|---|---|---|
| `*opt`, `opt->member` | undefined behaviour | none |
| `opt.value()` | throws `std::bad_optional_access` | `Value` throws `InvalidOperationException` |
| `opt.value_or(x)` | returns `x` | `GetValueOrDefault(x)`, `?? x` |

The `*` and `->` operators borrow pointer syntax, but `opt` is not a pointer. The optional *overloads* them to reach the value inside. They check nothing, which costs nothing, so they belong right after a test: `if (opt) use(*opt);`. Where no test comes first, `value()` turns a mistake into an exception instead of undefined behaviour ([C4](#c4)).

### Limits

An optional holds an object, so `std::optional<int&>` does not compile in C++20 ([C7](#c7)). A pointer already means "a reference that may be missing".

An optional also says only *that* something is missing, not *why*. When the caller needs the reason, C++23's `std::expected<T, E>` carries either a value or an error, and exceptions remain the other choice.

## Examples

Filling, testing and reading:

```cpp
#include <iostream>
#include <optional>
#include <string>

std::optional<int> parse_digit(char c) {
    if (c < '0' || c > '9') return std::nullopt;   // empty
    return c - '0';                                // an int converts to optional<int>
}

int main() {
    const auto seven = parse_digit('7');
    const auto none = parse_digit('x');
    std::cout << std::boolalpha << seven.has_value() << ' ' << static_cast<bool>(none) << '\n';
    if (seven) std::cout << *seven << '\n';        // unchecked access, safe after the test
    std::cout << none.value_or(-1) << '\n';
    try {
        std::cout << none.value() << '\n';         // checked access: throws on empty
    } catch (const std::bad_optional_access& error) {
        std::cout << "bad_optional_access\n";
    }
    const std::optional<std::string> word = "hello";
    std::cout << word->size() << '\n';             // -> reaches the string's members
}
```

Expected output:

```
true false
7
-1
bad_optional_access
5
```

An optional `bool`, and what the optional costs in memory:

```cpp
#include <iostream>
#include <optional>

int main() {
    const std::optional<bool> verbose = false;     // holds a value: false
    if (verbose) std::cout << "has a value\n";     // tests presence, not the bool
    if (verbose == true) std::cout << "is true\n";
    std::cout << sizeof(double) << ' ' << sizeof(std::optional<double>) << '\n';
}
```

Expected output with GCC and Clang on x86-64 (the flag and padding make the optional twice as large):

```
has a value
8 16
```

## Pitfalls

- `if (opt)` on a `std::optional<bool>` holding `false` is true: it tests presence ([C3](#c3)). Write `if (opt == true)` or `if (opt.value_or(false))`.
- `*opt` on an empty optional is not an exception, it is undefined behaviour ([C4](#c4)). Use `value()` where no test precedes it.
- Expecting `std::optional<T&>` to work like a nullable reference. In C++20, use a pointer ([C7](#c7)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-28: the walkthrough of `tests/test_gfortran_diff.cpp` in [PR 1](https://github.com/thomaswening/PartonForge/pull/1) (`compare_all` returns `std::optional<Tally>`; `main` uses `!tally`, `*tally` and `tally->mismatches`).
- cppreference: [`std::optional`](https://en.cppreference.com/w/cpp/utility/optional), [`std::expected`](https://en.cppreference.com/w/cpp/utility/expected).
- C#: [nullable value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-value-types).
