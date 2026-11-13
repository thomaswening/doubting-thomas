---
title: How a double encodes its value
area: numerics
created: 2026-10-29
updated: 2026-10-29
prerequisites: []
related: [numerics/ball-arithmetic, cpp/integer-types]
projects: [partonforge]
tags: [ieee-754, double, bit-pattern, exponent, infinity, nan, subnormal, ulp, nextafter, numeric-limits, bit-cast]
---

# How a double encodes its value

## TL;DR

- A `double` is 64 bits: 1 sign bit, 11 exponent bits and 52 fraction bits. Most patterns are *normal* numbers, ±1.f × 2^(E − 1023).
- Two exponent values are reserved. All ones means infinity or NaN. All zeros means zero or a *subnormal* number, which reaches below the smallest normal number with fewer significant bits.
- The gap between a `double` and the next one is its **ulp** ("unit in the last place"). It doubles at every power of two: about 2.2 × 10⁻¹⁶ near 1, 16 near 10¹⁷.
- `std::nextafter` steps exactly one `double`. For positive doubles, adding 1 to the bit pattern does the same.
- `std::numeric_limits<double>::min()` is the smallest positive *normal* number, not the most negative one. That is `lowest()`.
- `std::bit_cast` reads the same 64 bits as another type. `static_cast` converts the *number*.

## Key claims

- <a id="c1"></a>**C1.** A `double` (IEEE 754 binary64) consists of 1 sign bit s, an 11-bit exponent field E and a 52-bit fraction f. For 1 ≤ E ≤ 2046 it is a normal number with value (−1)^s × 1.f × 2^(E − 1023), where 1.f is a binary number with 53 significant bits.
- <a id="c2"></a>**C2.** An exponent field of all ones (E = 2047) encodes ±infinity when the fraction is zero and NaN ("not a number") when it is not; so 1 in every 2048 random 64-bit patterns is infinite or NaN.
- <a id="c3"></a>**C3.** An exponent field of zero encodes ±0 when the fraction is zero, and otherwise a subnormal number (−1)^s × 0.f × 2^(−1022). Subnormals fill the gap between 0 and the smallest normal number 2^(−1022) ≈ 2.2 × 10⁻³⁰⁸, down to 2^(−1074) ≈ 4.9 × 10⁻³²⁴, with fewer significant bits the smaller they get.
- <a id="c4"></a>**C4.** In `std::numeric_limits<double>`, `max()` is about 1.8 × 10³⁰⁸, `lowest()` is `-max()`, `min()` is the smallest positive normal number 2.2250738585072014 × 10⁻³⁰⁸, `denorm_min()` is the smallest positive subnormal 4.9 × 10⁻³²⁴, and `epsilon()` is 2⁻⁵² ≈ 2.2 × 10⁻¹⁶, the gap between 1.0 and the next `double`.
- <a id="c5"></a>**C5.** The gap between neighbouring normal doubles, the ulp, is constant between two powers of two and doubles at each one: for 2^k ≤ |x| < 2^(k+1) it is 2^(k − 52). It is 2⁻⁵² near 1, about 1.1 × 10⁻¹³ near 1000, and 16 just below and above 10¹⁷.
- <a id="c6"></a>**C6.** `std::nextafter(x, y)` returns the `double` next to `x` in the direction of `y`, so applying it n times moves exactly n doubles. For positive finite doubles, the bit patterns read as unsigned integers have the same order as the values, so adding 1 to the pattern gives the next larger `double`.
- <a id="c7"></a>**C7.** `std::bit_cast<double>(bits)` reinterprets the 64 bits unchanged, so `0x3FF0000000000000` gives 1.0; `static_cast<double>(bits)` converts the integer's value, giving 4.607182418800017 × 10¹⁸. C#'s counterpart of `bit_cast` is `BitConverter.Int64BitsToDouble`.
- <a id="c8"></a>**C8.** A decimal literal is rounded to the nearest `double`, which can be far from it where the ulp is large: `99999999999999999.0` is exactly `1e17`, because doubles near 10¹⁷ are 16 apart.

## Explanation

### Three fields

A `double` stores a number the way scientific notation does, but in base 2 ([C1](#c1)). The sign bit says plus or minus. The exponent field E says which power of two, stored with a *bias* of 1023 so that it needs no sign of its own. E = 1023 means 2⁰. The fraction f holds the binary digits after the point. A normal number always starts with `1.`, so that 1 is not stored, which gives 53 significant bits for the price of 52.

Example: 1.0 is +1.0 × 2⁰. Sign 0, E = 1023 = `0x3FF`, fraction 0, which gives the pattern `3FF0000000000000`.

### The two reserved exponents

E = 2047, all ones, is not a power of two. It marks the values that are not numbers ([C2](#c2)): infinity, which results from overflow or division by zero, and NaN, which results from operations like 0/0. A generator that draws random bit patterns must skip these, because 1 in 2048 of its draws lands there.

E = 0, all zeros, is the other end ([C3](#c3)). With a zero fraction it is zero, and the sign bit makes `-0.0` possible. With a non-zero fraction it is a **subnormal** number. The implicit leading 1 becomes a 0, and the exponent stays at −1022. Subnormals let values shrink gradually towards zero instead of jumping from 2.2 × 10⁻³⁰⁸ straight to 0. The price is precision: the smallest subnormal has a single significant bit.

### The limits, and a misleading name

`std::numeric_limits<double>` names the extremes ([C4](#c4)). `min()` is the trap. For integers, `numeric_limits<int>::min()` is the most negative value. For floating-point types, it is the smallest positive normal number, because the most negative `double` is just `-max()`, which C++11 named `lowest()`. C#'s `double.MinValue` is the most negative value, so `lowest()` is its counterpart, not `min()`.

### The ulp

Within one *binade*, the doubles between 2^k and 2^(k+1), the 52 fraction bits divide the interval into 2⁵² equal steps ([C5](#c5)). The next binade is twice as wide, with the same number of steps, so its steps are twice as large. The ulp therefore grows with the value: relative to the value, it stays between 2⁻⁵³ and 2⁻⁵², but in absolute terms it ranges from 2⁻¹⁰⁷⁴ to 2⁹⁷¹.

`epsilon()` is the ulp of 1.0 only. A tolerance of `epsilon()` for values near 1000 is smaller than the gap between doubles there. A comparison with that tolerance is then the same as `==`.

### Stepping through doubles

`std::nextafter(x, y)` moves to the neighbour of `x` in the direction of `y` ([C6](#c6)). It works across binade boundaries, where the ulp changes, so code that wants "k doubles above x" never has to compute an ulp itself. The encoding makes this cheap: for positive numbers, a larger pattern means a larger value, so `nextafter` is essentially "add 1 to the bits".

### Bits versus values

C++ has two ways to turn a `uint64_t` into a `double`, and they do different things ([C7](#c7)). `static_cast` asks "which `double` is closest to this integer?". `std::bit_cast` asks "which `double` has these bits?". A program that passes doubles through text as hexadecimal bit patterns needs `bit_cast` on both sides, so that every value, `-0.0` and subnormals included, arrives unchanged.

## Examples

The bit patterns of the special values (`PRIX64` is the `printf` length and conversion for a `uint64_t`, from `<cinttypes>`):

```cpp
#include <bit>
#include <cinttypes>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <limits>

void show(const char* label, double value) {
    const std::uint64_t bits = std::bit_cast<std::uint64_t>(value);
    std::printf("%-12s %016" PRIX64 "  %.17g\n", label, bits, value);
}

int main() {
    using limits = std::numeric_limits<double>;
    show("1.0", 1.0);
    show("-0.0", -0.0);
    show("max()", limits::max());
    show("min()", limits::min());
    show("denorm_min()", limits::denorm_min());
    show("lowest()", limits::lowest());
    show("infinity", limits::infinity());
    show("quiet NaN", limits::quiet_NaN());
}
```

Expected output:

```
1.0          3FF0000000000000  1
-0.0         8000000000000000  -0
max()        7FEFFFFFFFFFFFFF  1.7976931348623157e+308
min()        0010000000000000  2.2250738585072014e-308
denorm_min() 0000000000000001  4.9406564584124654e-324
lowest()     FFEFFFFFFFFFFFFF  -1.7976931348623157e+308
infinity     7FF0000000000000  inf
quiet NaN    7FF8000000000000  nan
```

The ulp at different magnitudes, and the literal that rounds to `1e17`:

```cpp
#include <cmath>
#include <cstdio>
#include <limits>

double ulp(double x) { return std::nextafter(x, std::numeric_limits<double>::infinity()) - x; }

int main() {
    std::printf("%.3g %.3g %.3g %.3g\n", ulp(1.0), ulp(1000.0), ulp(1e17), ulp(0.1));
    std::printf("%.17g\n", std::nextafter(1000.0, 0.0));
    std::printf("%d\n", 99999999999999999.0 == 1e17);
    std::printf("%g\n", std::numeric_limits<double>::epsilon());
}
```

Expected output:

```
2.22e-16 1.14e-13 16 1.39e-17
999.99999999999989
1
2.22045e-16
```

`bit_cast` against `static_cast`, and the next pattern as the next `double`:

```cpp
#include <bit>
#include <cstdint>
#include <cstdio>

int main() {
    const std::uint64_t bits = 0x3FF0000000000000;
    std::printf("%.17g\n", std::bit_cast<double>(bits));     // same 64 bits, read as a double
    std::printf("%.17g\n", static_cast<double>(bits));       // the integer 4607182418800017408 as a double
    const double next = std::bit_cast<double>(bits + 1);     // next bit pattern = next double
    std::printf("%.17g\n", next);
}
```

Expected output:

```
1
4.6071824188000174e+18
1.0000000000000002
```

Subnormals, and where they end:

```cpp
#include <cstdio>
#include <limits>

int main() {
    const double smallest_normal = std::numeric_limits<double>::min();
    const double below = smallest_normal / 4;                 // a subnormal
    std::printf("%.17g\n%.17g\n", below, below * 4);
    const double tiny = std::numeric_limits<double>::denorm_min();
    std::printf("%g %g\n", tiny, tiny / 2);                   // halving the smallest gives 0
}
```

Expected output:

```
5.5626846462680035e-309
2.2250738585072014e-308
4.94066e-324 0
```

## Pitfalls

- Reading `numeric_limits<double>::min()` as the most negative `double`. It is the smallest positive normal one ([C4](#c4)).
- Using `epsilon()` as a tolerance for values far from 1. The ulp grows with the value ([C5](#c5)).
- Converting bit patterns with `static_cast`. It converts the number, so the bits change ([C7](#c7)).
- Writing a decimal literal with more digits than a `double` can hold where the ulp is large, such as `99999999999999999.0`, and assuming it differs from `1e17` ([C8](#c8)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-28: the walkthrough of `tests/test_gfortran_diff.cpp` in [PR 1](https://github.com/thomaswening/PartonForge/pull/1) (the generator's random bit patterns, `nudge` with `std::nextafter`, the special values, and the literal `99999999999999999.0`).
- cppreference: [`std::numeric_limits`](https://en.cppreference.com/w/cpp/types/numeric_limits), [`std::nextafter`](https://en.cppreference.com/w/cpp/numeric/math/nextafter), [`std::bit_cast`](https://en.cppreference.com/w/cpp/numeric/bit_cast).
- David Goldberg, [What every computer scientist should know about floating-point arithmetic](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html), sections on the IEEE standard and denormalized numbers.
- Wikipedia: [double-precision floating-point format](https://en.wikipedia.org/wiki/Double-precision_floating-point_format).
