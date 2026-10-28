---
title: Formatting output in C++
area: cpp
created: 2026-10-29
updated: 2026-10-29
prerequisites: [c/format-strings]
related: [numerics/printing-doubles]
projects: [partonforge]
tags: [cpp, printf, iostream, iomanip, manipulator, setw, std-format, format-string, type-safety]
---

# Formatting output in C++

## TL;DR

- C++ has three ways to format text: C's `printf` family, iostreams with *manipulators* from `<iomanip>`, and C++20's `std::format`.
- `printf` is compact, but nothing checks its arguments: a wrong length modifier is undefined behaviour, caught only by a compiler warning.
- iostreams are type-safe but verbose. Some manipulators apply to the next item only (`setw`), others stay on the stream until changed (`hex`, `left`).
- `std::format` combines both: a format string like `printf`'s, checked against the argument types at compile time. It needs no length modifiers.
- `std::format("{}", 0.1)` gives `0.1`, the shortest text that reads back exactly. For a fixed number of digits, write the precision.
- C#'s `string.Format` and `$"{x,10:F3}"` are the closest relatives of `std::format`.

## Key claims

- <a id="c1"></a>**C1.** C++ offers three ways to produce formatted text: the C functions `printf`, `snprintf` and friends from `<cstdio>`, output streams such as `std::cout` with manipulators from `<iomanip>`, and `std::format` from `<format>` (C++20), which returns a `std::string`; C++23 adds `std::print`, which writes directly.
- <a id="c2"></a>**C2.** `std::setw(n)` sets the width for the next output item only, while `std::left`, `std::right`, `std::hex`, `std::dec`, `std::uppercase`, `std::fixed`, `std::setprecision` and `std::setfill` stay in effect on the stream until they are changed.
- <a id="c3"></a>**C3.** In `std::format`, each `{}` is a replacement field for the next argument; an optional specification after a colon has the form `[[fill]align][sign][#][0][width][.precision][type]`, with alignment `<` left, `>` right and `^` centred, so `{:>10}` right-aligns in 10 columns and `{:016X}` writes upper-case hexadecimal padded with zeros to 16 digits. `{1}` and `{0}` select arguments by position.
- <a id="c4"></a>**C4.** When the format string of `std::format` is a string literal, it is checked against the argument types at compile time, and a mismatch such as `std::format("{:d}", "text")` does not compile; in `printf`, a mismatch between a conversion and its argument is undefined behaviour, which GCC and Clang report only as a `-Wformat` warning.
- <a id="c5"></a>**C5.** `std::format` takes the argument's type from the argument itself, so it has no length modifiers: `{:X}` works for an `int`, an `unsigned long` and a `std::uint64_t` alike, where `printf` needs `%X`, `%lX` and `%llX` (or `PRIX64`).
- <a id="c6"></a>**C6.** For a floating-point argument, `{}` without a precision writes the shortest text that reads back as the same value, so `std::format("{}", 0.1)` is `0.1`; `{:.17g}` gives `0.10000000000000001`, as `printf("%.17g")` does.
- <a id="c7"></a>**C7.** `printf` and `std::cout` write to the same standard output, and by default (`std::ios::sync_with_stdio(true)`) their output appears in program order, so a program may mix them.
- <a id="c8"></a>**C8.** C#'s composite formatting `{index,alignment:format}` corresponds to `std::format`'s `{index:[align]width.precision type}`: C#'s `$"{x,10:F3}"` is `std::format("{:>10.3f}", x)`, and a negative C# alignment such as `{x,-10}` left-aligns like `{:<10}`.

## Explanation

### Three tools

`printf` comes from C ([C1](#c1)), and [printf format strings](../c/format-strings.md) describes it in full. A format string says where each value goes and how it looks. The arguments follow, and nothing checks that they fit ([C4](#c4)). Each argument's type has to be spelt out in a length modifier, which turns `std::uint64_t` into `%llX` on Windows and `%lX` on Linux ([C5](#c5)).

iostreams were C++'s answer: `std::cout << value` picks the right output for each type, so there are no type mismatches. Layout is set with manipulators, and that is where it gets verbose ([C2](#c2)). A column of 12 characters, left-aligned, is `std::left << std::setw(12) << name`. Worse, most manipulators are *sticky*. After `std::hex`, every later integer on that stream is hexadecimal until someone writes `std::dec`. Only `setw` resets itself after one item.

`std::format` (C++20) takes the format string idea back from `printf` and adds the type safety of iostreams ([C3](#c3), [C4](#c4)). The specification inside the braces describes only the look: width, alignment, precision and representation. The type comes from the argument ([C5](#c5)).

### Checked at compile time

With a string literal as the format, the compiler parses the format string while compiling ([C4](#c4)). A field that cannot apply to its argument, such as `{:d}` for a string, is a compile error. `printf` gets at most a warning, and only when the format is a literal. When the format string is only known at run time, `std::vformat` checks it at run time and throws `std::format_error`.

### Doubles

`printf("%f")` prints 6 decimals unless told otherwise. `std::format("{}")` prints the shortest text that reads back as the same `double` ([C6](#c6)), as C#'s `double.ToString()` does (see [printing a double](../numerics/printing-doubles.md)). When a file format needs a fixed number of digits, the precision is written explicitly, with the same meaning as in `printf`: `{:.17g}`, `{:.16E}`, `{:.3f}`.

### Mixing them

`printf` and `std::cout` share standard output, and by default they are kept in sync ([C7](#c7)). Mixing them works, but one style per file is easier to read. In new C++20 code, `std::format` with `std::cout`, or C++23's `std::print`, covers both cases.

### From C#

C# composite formatting puts the alignment after a comma and the format after a colon: `{0,10:F3}` ([C8](#c8)). `std::format` puts both after the colon, with the alignment as a symbol: `{:>10.3f}`. C# right-aligns with a positive width and left-aligns with a negative one. `std::format` writes `>` or `<`, and its default depends on the type: numbers right, strings left.

## Examples

The same line three ways:

```cpp
#include <cstddef>
#include <cstdio>
#include <format>
#include <iomanip>
#include <iostream>

int main() {
    const char* name = "near-10^k";
    const std::size_t count = 33357;

    std::printf("[%-12s|%10zu]\n", name, count);
    std::cout << '[' << std::left << std::setw(12) << name << '|'
              << std::right << std::setw(10) << count << "]\n";
    std::cout << std::format("[{:<12}|{:>10}]\n", name, count);
}
```

Expected output:

```
[near-10^k   |     33357]
[near-10^k   |     33357]
[near-10^k   |     33357]
```

Which manipulators stay on:

```cpp
#include <iomanip>
#include <iostream>

int main() {
    std::cout << std::setw(6) << 42 << '|' << 42 << "|\n";   // setw: next item only
    std::cout << std::hex << 255 << '|' << 255 << "|\n";      // hex: stays on
    std::cout << 10 << '\n';                                  // still hexadecimal
    std::cout << std::dec << 10 << '\n';                      // back to decimal
}
```

Expected output:

```
    42|42|
ff|ff|
a
10
```

Format specifications:

```cpp
#include <cstdint>
#include <format>
#include <iostream>

int main() {
    const std::uint64_t bits = 0x3FF0000000000000;
    std::cout << std::format("{:016X}|{:x}|{:#x}\n", bits, 255, 255);   // no length modifier needed
    std::cout << std::format("{}|{:.17g}|{:.3f}|{:e}\n", 0.1, 0.1, 0.1, 0.1);
    std::cout << std::format("{:>8}|{:<8}|{:^8}|{:*>8}\n", "r", "l", "c", 7);
    std::cout << std::format("{1} before {0}\n", "second", "first");
}
```

Expected output:

```
3FF0000000000000|ff|0xff
0.1|0.10000000000000001|0.100|1.000000e-01
       r|l       |   c    |*******7
first before second
```

A mismatch, both ways:

```cpp
#include <cstdint>
#include <cstdio>
#include <format>
#include <string>

int main() {
    const std::uint64_t bits = 0x3FF0000000000000;
    std::printf("%016llX\n", bits);   // on Linux uint64_t is unsigned long: -Wformat warning, undefined behaviour
    // std::string text = std::format("{:d}", "text");   // error: {:d} does not apply to a string
}
```

On x86-64 Linux the `printf` line prints `3FF0000000000000` despite the mismatch, with a `-Wformat` warning from GCC and Clang. The commented-out line fails to compile with both.

## Pitfalls

- Forgetting that `std::hex`, `std::left` and `std::setprecision` stay on the stream. Later output changes too ([C2](#c2)).
- Expecting `std::setw` to apply to everything after it. It applies to the next item only ([C2](#c2)).
- Using `{}` for a `double` where a fixed number of digits is required. It gives the shortest round-trip text, which varies in length ([C6](#c6)).
- Treating a `printf` `-Wformat` warning as harmless because the output looks right. The behaviour is undefined, and it may differ on another platform ([C4](#c4)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-28: the walkthrough of `tests/test_gfortran_diff.cpp` in [PR 1](https://github.com/thomaswening/PartonForge/pull/1), which mixes `printf` and `std::cout` (`print_tally`, `compare_batch`).
- cppreference: [`std::format`](https://en.cppreference.com/w/cpp/utility/format/format), [standard format specification](https://en.cppreference.com/w/cpp/utility/format/spec), [`<iomanip>`](https://en.cppreference.com/w/cpp/header/iomanip), [`sync_with_stdio`](https://en.cppreference.com/w/cpp/io/ios_base/sync_with_stdio).
- C#: [composite formatting](https://learn.microsoft.com/en-us/dotnet/standard/base-types/composite-formatting).
