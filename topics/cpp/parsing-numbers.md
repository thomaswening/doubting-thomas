---
title: Parsing numbers from text
area: cpp
created: 2026-11-10
updated: 2026-11-10
prerequisites: [cpp/references, cpp/arrays-and-containers]
related: []
projects: [partonforge]
tags: [cpp, parsing, from-chars, stoi, stod, locale, tryparse, charconv]
---

# Parsing numbers from text

## TL;DR

- `std::stoi` and `std::stod` skip leading blanks, read as much of a number as they can and ignore the rest. They throw if nothing at the start is a number.
- `std::from_chars` (C++17) throws nothing. It returns where it stopped and an error code, and leaves the variable unchanged on failure.
- `from_chars` skips no blanks, accepts no `+` and ignores the locale. It is the parser for formats a program writes, not text a person types.
- Both accept trailing characters: `"12abc"` gives 12. To parse a whole field, check that parsing stopped at its end.
- C#'s `int.TryParse` is the opposite on both counts: it allows surrounding blanks and rejects `"12abc"`.

## Key claims

- <a id="c1"></a>**C1.** `std::stoi`, `std::stol`, `std::stoll` and `std::stod` (in `<string>`) skip leading whitespace, accept a leading `+` or `-`, read as many characters as form a number and ignore the rest, without an error: `std::stoi("12abc")` returns 12. Their optional second argument, a `size_t*`, receives the number of characters used, counting the skipped whitespace: 3 for `" 42"`.
- <a id="c2"></a>**C2.** `std::stoi` and its relatives throw `std::invalid_argument` if no number starts the string, as for `"abc"`, and `std::out_of_range` if the number does not fit the result type, as for `"99999999999"` read into an `int`.
- <a id="c3"></a>**C3.** `std::stod` reads its decimal point from the current C locale, because it calls `std::strtod`. A program starts in the `"C"` locale, whose decimal point is `.`. After `std::setlocale(LC_ALL, "de_DE.UTF-8")`, the decimal point is `,`, so `std::stod("2.5")` stops at the `.` and returns 2.
- <a id="c4"></a>**C4.** `std::from_chars(first, last, value)` (in `<charconv>`, C++17) parses a number from the characters `[first, last)` into `value` without exceptions, without the locale, without skipping whitespace and without accepting a leading `+`. It returns a `std::from_chars_result` whose `ptr` is the first character it did not use and whose `ec` is a `std::errc` error code.
- <a id="c5"></a>**C5.** On success, `from_chars` sets `ec` to `std::errc{}`, the empty error code, and stores the number in `value`. If no number starts the range, `ec` is `std::errc::invalid_argument` and `ptr == first`. If the number does not fit, `ec` is `std::errc::result_out_of_range` and `ptr` points past the digits. On either failure `value` keeps its previous contents.
- <a id="c6"></a>**C6.** Like `std::stoi`, `std::from_chars` stops at the first character that cannot continue the number and still reports success: for `"12abc"` it stores 12 and `ptr` points at the `a`. Whether a whole field was a number is the test `ptr == last`, or `used == s.size()` for `std::stoi`.
- <a id="c7"></a>**C7.** C#'s `int.TryParse(s, out int value)` returns `false` instead of throwing. Unlike `std::from_chars`, by default it allows whitespace before and after the number and rejects any other trailing character, so `int.TryParse("12abc", out _)` is `false` and `int.TryParse(" 42 ", out _)` is `true`.
- <a id="c8"></a>**C8.** For integers, `from_chars` takes a base as a fourth argument: `std::from_chars(first, last, value, 16)` reads `"1A"` as 26. It does not accept a `0x` prefix: in base 10, `"-0x1A"` gives 0 and stops at the `x`.

## Explanation

### Two families, two jobs

C++ has two ways to turn text into a number. The older one, `std::stoi`, `std::stod` and their relatives, takes a `std::string` and returns the number ([C1](#c1)). It is forgiving with its input. It skips leading blanks, takes an optional sign, then reads digits for as long as it can. What follows the number is ignored. When nothing at the start looks like a number, it throws ([C2](#c2)).

`std::stod` has one more property that matters in research code: it follows the C locale ([C3](#c3)). The locale is a process-wide setting for things such as the decimal separator. A program starts in the neutral `"C"` locale, so a number with a `.` reads correctly. A library that switches the process to a German locale makes `.` stop the parse. This is the C++ form of a trap .NET developers know: `double.Parse` uses `CurrentCulture` and reads `"2.5"` differently on a German machine.

`std::from_chars` was added in C++17 for machine-written text, such as numbers in data files ([C4](#c4)). It ignores the locale and allows no blanks or `+`. It never throws and never allocates. It works on a range of `char`s given by two pointers, so it needs no `std::string`. A `std::string s` gives that range as `s.data()` and `s.data() + s.size()`.

### Reading the result

`from_chars` cannot return the number, because it needs to report failure as well. It writes the number into a variable you pass by reference and returns two pieces of information ([C4](#c4), [C5](#c5)):

- `ptr` is where parsing stopped: the first character that was not part of the number.
- `ec` is an error code of type `std::errc`, an `enum class`. `std::errc{}` is its zero value and means "no error". The other two values a parse can give are `invalid_argument`, nothing to parse, and `result_out_of_range`, too large.

On failure, the variable keeps what it held. Initialising it first therefore gives a defined value in every case.

In C#, `TryParse` makes the same split between a result and success, with a `bool` return and an `out` parameter. C++ returns a small struct instead, with both pieces in it. Code often unpacks it at once with a structured binding, which names the struct's members in order:

```cpp
const auto [end, error] = std::from_chars(first, last, value);
```

### Trailing characters

Both families stop at the first character that cannot continue the number and call that a success ([C1](#c1), [C6](#c6)). For `"12abc"`, both give 12. This lets a parser read a number from the middle of a line and carry on from `ptr`. A caller that wants a whole field to be a number must check that parsing reached the end.

C#'s `TryParse` decides the other way on both questions ([C7](#c7)). It rejects trailing characters other than blanks. It accepts blanks at both ends. A port from C# to `from_chars` must therefore trim the field and add the end check.

[PartonForge](https://github.com/thomaswening/PartonForge)'s steering parser does both checks. An integer must use every character. A real may use Fortran's `d` exponent, as in `1.0d0`. `std::stod("1.0d0")` returns 1 and uses 3 characters, stopping at the `d`. The parser therefore replaces `d` by `e` first, then rejects the value unless `stod` used every character.

## Examples

What each function makes of the same inputs, compiled with `g++ -std=c++20`:

```cpp
#include <charconv>
#include <iostream>
#include <stdexcept>
#include <string>
#include <system_error>

void with_stoi(const std::string& text) {
    try {
        std::size_t used = 0;
        const int value = std::stoi(text, &used);
        std::cout << "stoi       \"" << text << "\": " << value << ", used " << used << '\n';
    } catch (const std::invalid_argument&) {
        std::cout << "stoi       \"" << text << "\": throws invalid_argument\n";
    } catch (const std::out_of_range&) {
        std::cout << "stoi       \"" << text << "\": throws out_of_range\n";
    }
}

void with_from_chars(const std::string& text) {
    int value = -1;                                      // kept on failure (C5)
    const char* first = text.data();
    const char* last = text.data() + text.size();
    const std::from_chars_result result = std::from_chars(first, last, value);
    std::cout << "from_chars \"" << text << "\": " << value << ", used " << (result.ptr - first);
    if (result.ec == std::errc{}) std::cout << (result.ptr == last ? ", whole field\n" : ", stopped early\n");
    else if (result.ec == std::errc::invalid_argument) std::cout << ", invalid_argument\n";
    else std::cout << ", result_out_of_range\n";
}

int main() {
    for (const std::string text : {"42", " 42", "12abc", "abc", "+5", "99999999999"}) {
        with_stoi(text);
        with_from_chars(text);
    }
}
```

Output:

```text
stoi       "42": 42, used 2
from_chars "42": 42, used 2, whole field
stoi       " 42": 42, used 3
from_chars " 42": -1, used 0, invalid_argument
stoi       "12abc": 12, used 2
from_chars "12abc": 12, used 2, stopped early
stoi       "abc": throws invalid_argument
from_chars "abc": -1, used 0, invalid_argument
stoi       "+5": 5, used 2
from_chars "+5": -1, used 0, invalid_argument
stoi       "99999999999": throws out_of_range
from_chars "99999999999": -1, used 11, result_out_of_range
```

A base, a prefix, and a Fortran exponent:

```cpp
#include <charconv>
#include <iostream>
#include <string>

int main() {
    const std::string hex = "1A";
    int value = 0;
    std::from_chars(hex.data(), hex.data() + hex.size(), value, 16);
    std::cout << value << '\n';                          // 26 (C8)

    const std::string prefixed = "-0x1A";
    std::from_chars(prefixed.data(), prefixed.data() + prefixed.size(), value);
    std::cout << value << '\n';                          // 0: stops at the x (C8)

    std::size_t used = 0;
    const double real = std::stod("1.0d0", &used);
    std::cout << real << ", used " << used << '\n';      // stops at the d (C1)
}
```

Output:

```text
26
0
1, used 3
```

## Good habits

- Parse machine-written numbers with `std::from_chars`. Its result does not depend on the locale ([C3](#c3), [C4](#c4)).
- Check `ptr == last` when a whole field must be a number ([C6](#c6)).
- Initialise the target variable before `from_chars`, so it has a defined value after a failure ([C5](#c5)).

## Pitfalls

- Treating `std::stoi("12abc")` as an error. It returns 12 without complaint ([C1](#c1)).
- Testing `if (result.ec)` for success. `std::errc` is an `enum class` and does not convert to `bool`. Compare with `std::errc{}` ([C5](#c5)).
- Passing a field with a leading blank or `+` to `from_chars`. Both give `invalid_argument` ([C4](#c4)).
- Porting C# `TryParse` code to `from_chars` and losing the trailing-character check ([C7](#c7)).
- Reading data files with `std::stod` in a program whose libraries may change the locale ([C3](#c3)).

## Exercises

1. **Predict.** For each input, what do `value` and `ec` hold after `int value = 7; auto result = std::from_chars(first, last, value);`? Inputs: `"0042"`, `"-"`, `"3.9"`.

   <details><summary>Solution</summary>

   `"0042"`: 42, `std::errc{}`, `ptr == last`: leading zeros are digits. `"-"`: 7, `invalid_argument`: a sign with no digit is no number, so `value` is unchanged ([C5](#c5)). `"3.9"`: 3, `std::errc{}`, `ptr` at the `.`: an integer parse stops at the point ([C6](#c6)).

   </details>

2. **Explain.** A C# method returns `false` for `"12abc"`. Its C++ port returns 12. What check is missing?

   <details><summary>Solution</summary>

   The port does not check that parsing used the whole field. `from_chars` and `stoi` stop at the `a` and report success ([C6](#c6)). `TryParse` rejects trailing characters ([C7](#c7)). The fix is `ptr == last`.

   </details>

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-11-10: Thomas's review of [PR 6](https://github.com/thomaswening/PartonForge/pull/6) asked what `parsed.ec` means in `parse_integer` ([comment](https://github.com/thomaswening/PartonForge/pull/6#discussion_r4524492295)).
- cppreference: [`std::from_chars`](https://en.cppreference.com/w/cpp/utility/from_chars), [`std::stoi`](https://en.cppreference.com/w/cpp/string/basic_string/stol), [`std::stod`](https://en.cppreference.com/w/cpp/string/basic_string/stof), [`std::strtod`](https://en.cppreference.com/w/cpp/string/byte/strtof) (locale), [`std::errc`](https://en.cppreference.com/w/cpp/error/errc).
- Microsoft Learn: [`Int32.TryParse`](https://learn.microsoft.com/en-us/dotnet/api/system.int32.tryparse) and [`NumberStyles.Integer`](https://learn.microsoft.com/en-us/dotnet/api/system.globalization.numberstyles).
