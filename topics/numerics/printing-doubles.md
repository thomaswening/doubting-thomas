---
title: Printing a double as decimal text
area: numerics
created: 2026-10-27
updated: 2026-10-27
prerequisites: [c/format-strings]
related: [numerics/ball-arithmetic, testing/golden-results-and-dependency-updates]
projects: [partonforge]
tags: [ieee-754, double, round-trip, significant-digits, decimal-exponent, signed-zero, fortran]
---

# Printing a double as decimal text

## TL;DR

- A `double` is binary. Most decimal numbers, such as 0.1, have no exact `double`, so printing one means choosing how many decimal digits to show.
- **17 significant digits are always enough**: reading the 17-digit text back gives exactly the same `double`. 15 are not always enough.
- Many values need fewer digits. .NET's `ToString()` and C++'s `std::to_chars` print the *shortest* text that reads back exactly.
- To find a value's decimal exponent, read it from the printed text, not from `log10`, which can be off by one at powers of ten.
- `-0.0` exists. It equals `0.0`, so `x < 0` misses it; `std::signbit` finds it.

## Key claims

- <a id="c1"></a>**C1.** An IEEE-754 `double` has 64 bits: 1 sign bit, 11 exponent bits and 52 stored bits of the significand, which with an implicit leading 1 give 53 significant bits, about 16 decimal digits. C#'s `double` is the same format.
- <a id="c2"></a>**C2.** Printing any finite `double` with 17 significant decimal digits and reading the text back yields exactly the original `double` (C++ `std::numeric_limits<double>::max_digits10` is 17); with 15 digits this fails for some values, for example `0.1 + 0.2` prints as `0.3`, which reads back as a different `double`.
- <a id="c3"></a>**C3.** The 17 digits are not the exact value either: the `double` nearest 0.1 is 0.1000000000000000055511151231257827…, which 17 digits show as `0.10000000000000001`.
- <a id="c4"></a>**C4.** Shortest round-trip formatting prints the fewest digits that still read back as the same `double`, so the `double` nearest 0.1 prints as `0.1`; .NET's `double.ToString()` does this since .NET Core 3.0, and so does C++17's `std::to_chars` when no precision is given.
- <a id="c5"></a>**C5.** C's `%E` writes a nonzero value as $d.ddd \times 10^{k}$ with one nonzero digit before the point, while the normalised form $0.d_1 d_2 \ldots \times 10^{e}$ with $d_1 \neq 0$ has the point before the first digit; the two exponents are related by $e = k + 1$.
- <a id="c6"></a>**C6.** `std::log10` cannot reliably give a `double`'s decimal exponent: the `double` written `1e23` is slightly less than $10^{23}$ (it prints as `9.9999999999999992E+22`), yet `std::log10` of it returns exactly 23.0. Reading the exponent from `%.16E` text gives the exponent of the printed 17-digit value.
- <a id="c7"></a>**C7.** `-0.0` is a `double` with only the sign bit set: `-0.0 == 0.0` is true and `-0.0 < 0.0` is false, but `std::signbit(-0.0)` is true and `printf("%f", -0.0)` prints `-0.000000`.
- <a id="c8"></a>**C8.** Fortran's list-directed output (`write(unit, *) x`) leaves the layout to the compiler. gfortran 13.3 on x86-64 writes a `double` with 17 significant digits in a field of 26 columns: plain decimal with $17 - e$ decimals when $0 \le e \le 17$, otherwise exponent notation with a three-digit exponent such as `8.6988206403525968E-003`.

## Explanation

### Binary numbers, decimal text

A `double` stores a number as a sign, a binary exponent and a 53-bit binary significand ([C1](#c1)). Only fractions whose denominator is a power of two are exact. 0.5 is, 0.1 is not: the literal `0.1` gives the nearest `double`, which is a little above 0.1 ([C3](#c3)). So printing a `double` in decimal is always a choice of how many digits to show, and the question is how many are needed.

### How many digits

53 bits correspond to just under 16 decimal digits. That is too few to tell every pair of neighbouring `double`s apart in decimal, because the spacing of binary and decimal numbers doesn't line up. 17 digits are always enough: two different `double`s never print as the same 17 digits, so the text identifies its `double` uniquely ([C2](#c2)). 15 digits are not. `0.1 + 0.2` is a `double` just above 0.3, and 15 digits round it to `0.3`, which is the text for a different `double`. That is the same reason `0.1 + 0.2 == 0.3` is false.

17 digits are enough for the round trip but often more than needed. The shortest text that reads back exactly is often much shorter ([C4](#c4)). Since .NET Core 3.0, `double.ToString()` prints exactly that, so C# shows `0.1`. C's `printf` has no such mode. A program that must print a fixed number of digits, as a file format may require, uses 17.

### The decimal exponent

Two ways of writing scientific notation are in use ([C5](#c5)). C's `%E` puts one digit before the point: 13.35 is $1.335 \times 10^{1}$. Fortran and many numerical texts put the point first: $0.1335 \times 10^{2}$. The exponents differ by one, $e = k + 1$. For a value of 1 or more, $e$ is the number of digits before the decimal point.

The obvious way to find $e$ is $\lfloor \log_{10} |x| \rfloor + 1$. It breaks exactly at powers of ten ([C6](#c6)). The `double` written `1e23` is slightly less than $10^{23}$, because $10^{23}$ itself has no `double`. Its true logarithm is a hair under 23. The nearest `double` to that logarithm is 23.0, so `log10` returns 23 and the formula gives the wrong exponent. Printing with `%.16E` and reading the exponent from the text avoids that. It also gives the exponent of the value as printed, which is what a formatter needs when it decides between plain and exponent notation.

### Signed zero

The sign bit is separate from the rest ([C1](#c1)), so zero exists twice ([C7](#c7)). `-0.0` comes out of, for example, `-1.0 * 0.0` or a negative value too small to represent. It compares equal to `0.0`, so a test `x < 0` treats it as positive. A formatter that must print the sign as another program does uses `std::signbit`, which reads the sign bit itself.

### One compiler's choice

Fortran's list-directed output, `write(unit, *) x`, lets the compiler choose the layout ([C8](#c8)). gfortran writes 17 significant digits, so its output round-trips ([C2](#c2)). Whether a value comes out as `0.26236426446749106` or `8.6988206403525968E-003` depends on its decimal exponent ([C5](#c5)). A program that must reproduce such files byte for byte, as [PartonForge](https://github.com/thomaswening/PartonForge) does, has to measure the compiler's choices, not read them from the standard ([golden results](../testing/golden-results-and-dependency-updates.md)).

## Examples

```cpp
#include <cmath>
#include <cstdio>

int main() {
    std::printf("%.17g\n", 0.1);
    std::printf("%.15g %.17g\n", 0.1 + 0.2, 0.1 + 0.2);
    std::printf("%d\n", 0.1 + 0.2 == 0.3);

    const double big = 1e23;
    std::printf("%.16E\n", big);
    std::printf("%.17g\n", std::log10(big));

    const double negative_zero = -0.0;
    std::printf("%d %d %d\n", negative_zero == 0.0, negative_zero < 0.0, std::signbit(negative_zero));
    std::printf("%f\n", negative_zero);
}
```

Expected output:

```text
0.10000000000000001
0.3 0.30000000000000004
0
9.9999999999999992E+22
23
1 0 1
-0.000000
```

- Line 1: 17 digits of the `double` nearest 0.1 ([C3](#c3)).
- Lines 2 and 3: 15 digits hide the difference that 17 digits show ([C2](#c2)).
- Lines 4 and 5: the `double` `1e23` is below $10^{23}$, but its `log10` is exactly 23 ([C6](#c6)).
- Lines 6 and 7: `-0.0` equals zero, isn't less than zero, has its sign bit set and prints with a minus ([C7](#c7)). A comparison or `std::signbit` passed to `printf` is promoted to `int`, so `%d` prints 0 or 1.

The decimal exponent of 13.354993539365465, read from text as PartonForge's `decimal_exponent` does ([C5](#c5)):

```text
%.16E                →  1.3354993539365465E+01
digits after 'E'     →  +01, so k = 1
e = k + 1            →  2       (13.35… = 0.1335… × 10²)
decimals: 17 − e     →  15      →  13.354993539365465
```

## Pitfalls

- Printing with 15 or 16 digits and expecting to read back the same `double` ([C2](#c2)).
- Reading 17 printed digits as the exact value. They identify the `double`; its exact decimal expansion is longer ([C3](#c3)).
- Computing a decimal exponent with `floor(log10(x))` near a power of ten ([C6](#c6)).
- Testing the sign with `x < 0` when `-0.0` must print as negative ([C7](#c7)).
- Mixing up $d.ddd \times 10^{k}$ and $0.ddd \times 10^{e}$ and getting the exponent off by one ([C5](#c5)).

## Exercises

1. **Predict.** gfortran writes $0 \le e \le 17$ in plain decimal. Is 0.05 written in plain decimal or exponent notation? And 0.5?

   <details><summary>Solution</summary>

   $0.05 = 0.5 \times 10^{-1}$, so $e = -1$: exponent notation. $0.5 = 0.5 \times 10^{0}$, so $e = 0$: plain decimal, with $17 - 0 = 17$ decimals ([C5](#c5), [C8](#c8)).

   </details>

2. **Explain.** Why can't a program write a `double` with 15 digits and read it back to get the same number? What is the smallest digit count that always works?

   <details><summary>Solution</summary>

   Two different `double`s can round to the same 15-digit text, so the text doesn't identify the `double`; `0.1 + 0.2` and `0.3` both print as `0.3`. 17 digits always work ([C2](#c2)).

   </details>

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-27: Thomas's walkthrough of `src/fortran_io.cpp` in [PR 1](https://github.com/thomaswening/PartonForge/pull/1), which reproduces gfortran's list-directed output.
- cppreference: [`std::numeric_limits::max_digits10`](https://en.cppreference.com/w/cpp/types/numeric_limits/max_digits10), [`std::to_chars`](https://en.cppreference.com/w/cpp/utility/to_chars), [`std::signbit`](https://en.cppreference.com/w/cpp/numeric/math/signbit).
- Microsoft: [Floating-point parsing and formatting improvements in .NET Core 3.0](https://devblogs.microsoft.com/dotnet/floating-point-parsing-and-formatting-improvements-in-net-core-3-0/).
- David Goldberg, [What every computer scientist should know about floating-point arithmetic](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html), for the background.
