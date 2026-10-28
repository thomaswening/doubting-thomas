---
title: Choosing an integer type in C++
area: cpp
created: 2026-10-29
updated: 2026-10-29
prerequisites: []
related: [cpp/sanitizers]
projects: [partonforge]
tags: [cpp, int, long, size_t, cstdint, uint64_t, unsigned, data-model, sign-compare, bit-cast]
---

# Choosing an integer type in C++

## TL;DR

- C++ fixes only **minimum** widths for `int`, `long` and `long long`. The real width depends on the platform. C# fixes them: `int` is always 32 bits, `long` always 64.
- The classic trap is `long`: 32 bits on 64-bit Windows, 64 bits on 64-bit Linux and macOS.
- `<cstdint>` has exact-width types such as `std::uint64_t`. They are aliases of the built-in types, so `std::uint64_t` is `unsigned long` on Linux and `unsigned long long` on Windows.
- `size_t` is the type of sizes and indices. It is unsigned and as wide as the platform's addresses.
- Unsigned arithmetic wraps around instead of going negative, and a comparison between a signed and an unsigned value quietly converts the signed one. Use unsigned types for bit patterns and sizes, not to say "never negative".
- Rule of thumb: `int` for ordinary counting and arithmetic, `size_t` for sizes, a fixed-width type when the exact width is part of the meaning, and never `long` for a 64-bit value.

## Key claims

- <a id="c1"></a>**C1.** The C++ standard guarantees only minimum widths: `short` and `int` at least 16 bits, `long` at least 32, `long long` at least 64. In C#, `int` is always 32 bits and `long` always 64.
- <a id="c2"></a>**C2.** 64-bit Windows uses the LLP64 data model, in which `int` and `long` are 32 bits and `long long` and pointers 64 bits; 64-bit Linux and macOS use LP64, in which `long`, `long long` and pointers are 64 bits and `int` is 32.
- <a id="c3"></a>**C3.** `<cstdint>` defines exact-width types such as `std::int32_t` and `std::uint64_t`, with exactly that many bits and no padding. They are aliases of built-in types, not new types: on 64-bit Linux `std::uint64_t` is `unsigned long`, on 64-bit Windows `unsigned long long`.
- <a id="c4"></a>**C4.** `std::size_t` is the unsigned type that `sizeof` returns and that standard containers use for `size()` and indices; its width follows the platform, 64 bits on a 64-bit platform.
- <a id="c5"></a>**C5.** Unsigned arithmetic is done modulo 2^N, so with a 32-bit `unsigned int`, `0u - 1` is 4294967295, and `v.size() - 1` on an empty vector is the largest `size_t`. Signed overflow, by contrast, is undefined behaviour.
- <a id="c6"></a>**C6.** When an `int` is compared with an `unsigned int`, the `int` is converted to `unsigned int` first, so `-1 < 1u` is false; GCC and Clang report this with `-Wsign-compare`, which `-Wall -Wextra` turns on. C# converts both operands of an `int`-`uint` comparison to `long`, so there `-1 < 1u` is true.
- <a id="c7"></a>**C7.** `std::bit_cast<To>(from)` compiles only if `To` and the type of `from` have the same size, so reinterpreting a `double`'s 64 bits needs a 64-bit integer type such as `std::uint64_t`.
- <a id="c8"></a>**C8.** The C++ Core Guidelines recommend unsigned types for bit manipulation (ES.101) and signed types for arithmetic (ES.102), and advise against using an unsigned type merely to express that a value cannot be negative (ES.106).

## Explanation

### Widths are a platform decision

C# defines `int` as 32 bits and `long` as 64 bits, everywhere. C++ inherited C's approach: the standard sets minimum widths and leaves the rest to the platform ([C1](#c1)). Every mainstream desktop platform makes `int` 32 bits. They disagree about `long` ([C2](#c2)). Windows kept `long` at 32 bits when it moved to 64-bit, so that old code and file formats would not change size. Linux and macOS made it 64 bits.

So code that stores a 64-bit value in a `long` works on Linux and silently truncates on Windows. That is why `long` has no place in portable code that needs 64 bits.

### Exact widths when the width is the point

`<cstdint>` names the widths explicitly ([C3](#c3)): `std::int8_t` to `std::int64_t`, and `std::uint8_t` to `std::uint64_t`. Use them where the number of bits is part of what the value *means*:

- a bit pattern, such as the 64 bits of a `double` ([C7](#c7));
- a field in a binary file format or a network protocol;
- an interface that asks for one, such as `std::mt19937_64`, whose numbers are 64 bits;
- a value that may exceed 2^31.

These types are aliases, not new types. That matters wherever the exact type matters, for example in overloads or in `printf`, whose length modifier must match the argument's type. `%llu` expects `unsigned long long`. On Linux, a `std::uint64_t` is an `unsigned long`, so it must be cast first.

### Sizes and indices

`std::size_t` is what `sizeof`, `std::vector::size()` and `std::string::size()` return ([C4](#c4)). A loop that compares its counter with `size()` uses `size_t`, or the compiler warns about mixing signed and unsigned ([C6](#c6)). The Core Guidelines prefer signed indices (ES.107), and C++20 adds `std::ssize()`, which returns a signed size. In practice, `size_t` for anything compared with `size()` avoids the warning, and is what most code does.

### What unsigned means

An unsigned type cannot hold a negative value, but that does not stop a computation from going below zero. It wraps around to a huge positive number instead ([C5](#c5)). Mixing signed and unsigned is worse: the signed operand is converted before the comparison, so `-1` turns into the largest unsigned value ([C6](#c6)). C# avoids this by widening both sides to `long`.

That is why the Core Guidelines use unsigned types only for bit patterns and leave arithmetic to signed ones ([C8](#c8)). "This count can't be negative" is a reason for a check, not for `unsigned`. `size_t` is the exception everyone lives with, because the standard library chose it.

### The rule of thumb

| Use | When |
|---|---|
| `int` | ordinary counts and arithmetic that fit easily in 32 bits |
| `std::size_t` | sizes, and indices compared with `size()` |
| `std::int64_t`, `std::uint64_t`, … | the exact width is part of the meaning (C3, C7) |
| `long` | never for a 64-bit value: it is 32 bits on Windows |

## Examples

The widths on 64-bit Linux, and what `std::uint64_t` is there:

```cpp
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <type_traits>

int main() {
    std::cout << "int " << sizeof(int) * 8 << ", long " << sizeof(long) * 8
              << ", long long " << sizeof(long long) * 8
              << ", size_t " << sizeof(std::size_t) * 8 << '\n';
    std::cout << std::boolalpha
              << std::is_same_v<std::uint64_t, unsigned long> << ' '
              << std::is_same_v<std::uint64_t, unsigned long long> << '\n';
}
```

Expected output on 64-bit Linux (with MSVC on Windows, `long` is 32 and the second line is `false true`):

```
int 32, long 64, long long 64, size_t 64
true false
```

Unsigned values wrap, and a signed value converts:

```cpp
#include <iostream>
#include <vector>

int main() {
    unsigned int zero = 0;
    std::cout << zero - 1 << '\n';          // wraps around

    int minus_one = -1;
    unsigned int one = 1;
    std::cout << std::boolalpha << (minus_one < one) << '\n';   // -1 becomes 4294967295

    std::vector<int> empty;
    std::cout << empty.size() - 1 << '\n';  // size_t wraps too
}
```

Expected output, with a `-Wsign-compare` warning on the comparison from both GCC and Clang:

```
4294967295
false
18446744073709551615
```

`std::bit_cast` needs equal sizes:

```cpp
#include <bit>
#include <cstdint>
#include <iostream>

int main() {
    const std::uint64_t bits = std::bit_cast<std::uint64_t>(1.0);
    std::cout << std::hex << bits << '\n';
    // const unsigned int half = std::bit_cast<unsigned int>(1.0);  // error: sizes differ (4 and 8)
}
```

Expected output:

```
3ff0000000000000
```

## Pitfalls

- Storing a 64-bit value in a `long`. It compiles and works on Linux, then truncates on Windows ([C2](#c2)).
- `for (size_t i = v.size() - 1; i >= 0; --i)` never ends: `i >= 0` is always true for an unsigned type, and an empty `v` starts at the largest `size_t` ([C5](#c5)).
- Declaring a value `unsigned` because it "can't be negative". A subtraction bug then produces a huge number instead of a negative one that a check would catch ([C8](#c8)).
- Assuming `std::uint64_t` and `unsigned long long` are the same type. On Linux they are not, which matters for overloads and `printf` length modifiers ([C3](#c3)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-28: the walkthrough of `tests/test_gfortran_diff.cpp` in [PR 1](https://github.com/thomaswening/PartonForge/pull/1) (the seed as `uint64_t`, `bits_of`, `static_cast<unsigned long long>` for `%llX`).
- cppreference: [fundamental types and data models](https://en.cppreference.com/w/cpp/language/types), [fixed width integer types](https://en.cppreference.com/w/cpp/types/integer), [`std::size_t`](https://en.cppreference.com/w/cpp/types/size_t), [usual arithmetic conversions](https://en.cppreference.com/w/cpp/language/usual_arithmetic_conversions), [`std::bit_cast`](https://en.cppreference.com/w/cpp/numeric/bit_cast).
- C++ Core Guidelines: [ES.101, ES.102, ES.106, ES.107](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#es101-use-unsigned-types-for-bit-manipulation).
- C# language specification: [binary numeric promotions](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/expressions#12473-binary-numeric-promotions).
