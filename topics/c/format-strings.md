---
title: printf format strings
area: c
created: 2026-10-27
updated: 2026-10-29
prerequisites: [c/strings]
related: [numerics/printing-doubles]
projects: [partonforge]
tags: [c, printf, snprintf, format-string, conversion-specification, precision, width]
---

# printf format strings

## TL;DR

- The `printf` family differs only in where the text goes. `printf` writes to the screen, `fprintf` to a file, `sprintf` to a buffer, and `snprintf` to a buffer of a given size.
- A placeholder, a **conversion specification**, has five parts: `%` [flags] [width] [.precision] [length] conversion. Only the `%` and the conversion letter are required.
- The conversion letter says how the value **looks**: `d` decimal, `x` hexadecimal, `f` fixed-point, `e` exponent notation. The length modifier says what **type** the argument has, such as `ll` for `long long`.
- For `f` and `e`, the precision is the number of digits after the point, so `%.16E` gives 17 significant digits.
- The width is a minimum. It pads, usually on the left, and never cuts a value short.

## Key claims

- <a id="c1"></a>**C1.** `printf` writes to standard output, `fprintf` to a `FILE*`, `sprintf` to a character buffer without knowing its size, and `snprintf` to a buffer whose size it is given (the `n`); `sprintf` can write past the end of the buffer, `snprintf` cannot.
- <a id="c2"></a>**C2.** A conversion specification consists of `%`, optional flags, an optional minimum width, an optional precision written as `.` followed by a number, an optional length modifier, and a conversion letter, in that order; in `%016llX`, `0` is a flag, `16` the width, `ll` the length modifier and `X` the conversion.
- <a id="c3"></a>**C3.** *(withdrawn 2026-10-29: %g does not pick the shorter form; see [C9](#c9) and [C10](#c10))* The conversion letter chooses the representation: `d` (or `i`) a signed integer in base 10, `u` an unsigned integer in base 10, `x` and `X` an unsigned integer in base 16 with lower-case or upper-case letters, `o` base 8, `f` a floating-point value without exponent, `e` and `E` with exponent, `g` whichever of the two is shorter, `s` a string, `c` a character, `%%` a literal `%`.
- <a id="c4"></a>**C4.** For `f`, `e` and `E`, the precision is the number of digits after the decimal point, 6 if none is given; `e` and `E` write exactly one digit before the point, so `%.16E` writes 17 significant digits. For `g`, the precision is the number of significant digits.
- <a id="c5"></a>**C5.** The width is a minimum number of characters: a shorter value is padded with blanks on the left (right-justified), or on the right with the `-` flag, or with leading zeros with the `0` flag; a longer value is written in full, never cut.
- <a id="c6"></a>**C6.** A `*` in place of the width or the precision takes that number from the argument list, as an `int` that comes before the value: `printf("%.*f", 3, x)` prints `x` with 3 decimals.
- <a id="c7"></a>**C7.** The length modifier states the argument's type: `hh` for `char`, `h` for `short`, `l` for `long`, `ll` for `long long`, `z` for `size_t`, `L` for `long double`. A `double` needs none, and a `float` argument is converted to `double` when passed to `printf`. Nothing checks at run time that the argument matches; a mismatch is undefined behaviour, which compilers warn about when the format string is a literal.
- <a id="c8"></a>**C8.** `%e` writes at least two exponent digits (`e-03`, never `e-3`), and `%.0f` writes no decimal point at all; the `#` flag forces the point, so `%#.0f` of `1e16` gives `10000000000000000.`.
- <a id="c9"></a>**C9.** The conversion letter chooses the representation: `d` (or `i`) a signed integer in base 10, `u` an unsigned integer in base 10, `x` and `X` an unsigned integer in base 16 with lower-case or upper-case letters, `o` base 8, `f` a floating-point value without exponent, `e` and `E` with exponent, `g` either `f` or `e` style depending on the value's decimal exponent, `s` a string, `c` a character, `%%` a literal `%`.
- <a id="c10"></a>**C10.** `%g` with precision $P$ (6 if omitted, 1 if 0) takes the decimal exponent $X$ that `e` style would write and uses `e` style if $X < -4$ or $X \ge P$, otherwise `f` style; then it removes trailing zeros and a trailing decimal point, unless the `#` flag is given. It does not pick the shorter form: `%g` of `0.0001` prints `0.0001`, not the shorter `1e-04`.

## Explanation

### One family, four destinations

C has one formatting engine and several front doors ([C1](#c1)). The names are abbreviations: **f** for file, **s** for string, **n** for "at most n characters". [Strings in C](strings.md) explains why the size matters: a function that writes into a buffer can't find out how big it is, so `sprintf` writes as much as the text needs, and `snprintf` stops at the size it is given ([strings C6](strings.md#c6)).

### Anatomy of a placeholder

A format string is ordinary text with placeholders. Each placeholder starts with `%` and is replaced by the next argument ([C2](#c2)):

```text
%   0     16      .16        ll       X
│   │     │       │          │        └─ conversion: how it looks
│   │     │       │          └────────── length: the argument's type
│   │     │       └───────────────────── precision
│   │     └───────────────────────────── minimum width
│   └─────────────────────────────────── flags
└─────────────────────────────────────── start
```

Most placeholders use only a few parts: `%d`, `%5d`, `%.2f`.

### What the letter means

The letter is about **representation**, not type ([C9](#c9)). `d` stands for *decimal*, base 10, as opposed to `x` for hexadecimal or `o` for octal. All three print integers. Similarly `f` stands for *fixed-point*, not "float": it prints a `double` as plain digits with a decimal point, whereas `e` uses exponent notation.

`g` stands for *general*: it chooses between `f` and `e` by a fixed rule, not by length ([C10](#c10)). It first works out the exponent $X$ the value would get in `e` style. If that exponent is very small ($X < -4$) or at least the number of significant digits $P$, plain digits would need padding zeros that carry no information, so `g` uses `e` style. Otherwise it uses `f` style. Then it removes trailing zeros. So `0.0001` ($X = -4$) stays `0.0001`, although `1e-04` would be one character shorter, and `0.00001` ($X = -5$) becomes `1e-05`.

The type of the argument is the length modifier's job ([C7](#c7)). `%X` expects an `unsigned int`, 32 bits on the usual platforms. To print a 64-bit value in hexadecimal, write `%llX` and pass an `unsigned long long`.

### Precision and width

The two numbers mean different things ([C4](#c4), [C5](#c5)). **Precision** controls digits. For `f` and `e` it counts digits after the point. Because `e` always writes one digit before the point, `%.16E` writes 1 + 16 = 17 significant digits, which is what [printing a double](../numerics/printing-doubles.md) needs. **Width** controls the space the text takes: it pads up to that many characters and never truncates. This is how fixed-width columns are written.

When the precision is only known at run time, write `*` and pass it as an extra `int` argument before the value ([C6](#c6)).

### Compared with .NET

C#'s composite formatting splits the same information differently. `string.Format("{0,5:F2}", x)` has a width (`,5`, where a negative width left-justifies, like C's `-` flag) and a format (`F2`, fixed-point with two decimals). C# doesn't need length modifiers, because the argument carries its type at run time. C has no such information, so the format string has to state it, and it can be wrong ([C7](#c7)).

## Examples

```c
#include <stdio.h>

int main(void)
{
    printf("[%d] [%5d] [%-5d] [%05d]\n", 42, 42, 42, 42);
    printf("[%x] [%X] [%o]\n", 255, 255, 8);
    printf("[%f] [%.2f] [%.0f] [%#.0f]\n", 3.14159, 3.14159, 1e16, 1e16);
    printf("[%e] [%.16E]\n", 0.0086988, 13.354993539365465);
    printf("[%.*f]\n", 3, 2.0 / 3.0);
    printf("[%016llX]\n", 255ULL);
    printf("[%g] [%g]\n", 0.0001, 0.00001);
    return 0;
}
```

Expected output:

```text
[42] [   42] [42   ] [00042]
[ff] [FF] [10]
[3.141590] [3.14] [10000000000000000] [10000000000000000.]
[8.698800e-03] [1.3354993539365465E+01]
[0.667]
[00000000000000FF]
[0.0001] [1e-05]
```

Line by line:

1. Width 5 pads on the left ([C5](#c5)). With `-` it pads on the right, and with `0` it pads with zeros.
2. The same number 255 in base 16, then 8 in base 8 ([C9](#c9)).
3. `%f` defaults to 6 decimals ([C4](#c4)). `%.0f` drops the point, and `#` brings it back ([C8](#c8)).
4. `%e` uses a two-digit exponent ([C8](#c8)). `%.16E` writes 17 significant digits with a capital `E`.
5. The precision 3 comes from the argument list ([C6](#c6)).
6. `0` flag, width 16, `ll` because `255ULL` is an `unsigned long long`, `X` for upper-case hexadecimal ([C2](#c2)).
7. `0.0001` has exponent $-4$, so `g` keeps `f` style. `0.00001` has exponent $-5$, so `g` switches to `e` style ([C10](#c10)). Both lose their trailing zeros.

The rule of `%g` in more cases:

```c
#include <stdio.h>

int main(void)
{
    printf("[%g] [%g]\n", 0.0001, 0.00001);
    printf("[%g] [%g]\n", 123456.0, 1234567.0);
    printf("[%g] [%#g]\n", 0.5, 0.5);
    printf("[%.3g] [%.3g]\n", 123.0, 1234.0);
    printf("[%g]\n", 999999.5);
    return 0;
}
```

Expected output:

```text
[0.0001] [1e-05]
[123456] [1.23457e+06]
[0.5] [0.500000]
[123] [1.23e+03]
[1e+06]
```

1. The boundary at the small end: exponent $-4$ gives `f` style, $-5$ gives `e` style, regardless of which is shorter.
2. The boundary at the large end, with $P = 6$: exponent 5 gives `f` style, exponent 6 gives `e` style, rounded to 6 significant digits ([C4](#c4)).
3. `#` keeps the trailing zeros. `0.5` in `f` style with 6 significant digits is `0.500000`.
4. With $P = 3$, exponent 2 still fits, exponent 3 does not.
5. The exponent is the one after rounding: `999999.5` rounded to 6 significant digits is `1.00000e+06`, so $X = 6$ and `g` uses `e` style.

## Pitfalls

- Reading `%d` as "double". It prints an `int` in base 10; a `double` passed to it is undefined behaviour ([C9](#c9), [C7](#c7)).
- Expecting `%g` to pick the shorter of `f` and `e` style. It decides by the exponent: `0.0001` prints as `0.0001`, not `1e-04` ([C10](#c10)).
- Printing a 64-bit integer with `%d` or `%X`. Without `ll` (or `z` for `size_t`), the format reads the wrong type ([C7](#c7)).
- Expecting the width to cut a long value. It only pads ([C5](#c5)).
- Reading the precision of `%.16E` as 16 significant digits. It is 16 digits after the point, 17 in total ([C4](#c4)).
- Using `sprintf` where the text could be longer than the buffer ([C1](#c1)).

## Exercises

1. **Predict.** What does `printf("[%8.3f]", -2.5)` print?

   <details><summary>Solution</summary>

   `[  -2.500]`. Precision 3 gives three decimals, `-2.500`, which is 6 characters. Width 8 pads two blanks on the left ([C4](#c4), [C5](#c5)).

   </details>

2. **Interpret.** Name each part of `%-12.4e` and say what it prints for `1234.5`.

   <details><summary>Solution</summary>

   Flag `-` (left-justify), width 12, precision 4, conversion `e` ([C2](#c2)). It prints `1.2345e+03` followed by two blanks to fill 12 characters ([C4](#c4), [C5](#c5)).

   </details>

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-27: Thomas's walkthrough of `src/fortran_io.cpp` in [PR 1](https://github.com/thomaswening/PartonForge/pull/1), which formats doubles with `%.16E` and `%.*f`, and the differential test, which prints bit patterns with `%016llX`.
- cppreference: [printf, fprintf, sprintf, snprintf](https://en.cppreference.com/w/c/io/fprintf).
- Microsoft Learn: [composite formatting](https://learn.microsoft.com/en-us/dotnet/standard/base-types/composite-formatting) for the C# comparison.
