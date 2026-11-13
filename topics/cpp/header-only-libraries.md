---
title: Header-only libraries
area: cpp
created: 2026-10-20
updated: 2026-10-20
prerequisites: [cpp/abi-and-shared-libraries]
related: [c/opaque-handles]
projects: [tante]
tags: [cpp, header-only, inline, odr, templates, abi]
---

# Header-only libraries

## TL;DR

- A **header-only library** keeps all its code in header files: users `#include` it and there is nothing to build or link.

- Its code is compiled by the user's compiler with the user's settings, inside the user's program, so it can't suffer an ABI mismatch.

- Functions defined in a header must be `inline` (or be templates, or be defined inside a class body), or including the header in two source files breaks the link.

- The price is compile time and exposed implementation: every file that includes it compiles it again.

- What avoids the ABI problem is shipping source rather than compiled code. A source file the user compiles, such as SQLite's single `.c` file, does the same.

## Key claims

- <a id="c1"></a>**C1.** A header-only library provides all of its code in headers, so using it needs only an `#include`; there is no separate library file to build or link.

- <a id="c2"></a>**C2.** Code from a header-only library is compiled into the user's own binary by the user's compiler and settings, so no binary interface exists between the library and the user's code, and the library cannot cause an ABI mismatch with it.

- <a id="c3"></a>**C3.** A function that is not `inline`, defined in a header included by two source files of one program, is defined twice, and the link fails with a multiple-definition error; marking it `inline` allows one identical definition per source file.

- <a id="c4"></a>**C4.** Member functions defined inside a class body are implicitly `inline`, and function templates may be defined in headers without `inline`; templates generally must be, because the compiler needs their definition wherever they are used.

- <a id="c5"></a>**C5.** Header-only libraries cost compile time, since every source file that includes them compiles their code again, and any change to them recompiles every including file.

- <a id="c6"></a>**C6.** Distributing a library as source the user compiles, whether headers or `.cpp` files, avoids the ABI problem; distributing it pre-compiled reintroduces it unless its interface is restricted to C.

## Explanation

### What "header-only" means

C++ normally splits a library in two: headers with declarations, which users include, and source files with definitions, which are compiled into a library file users link against. A header-only library puts the definitions in the headers too ([C1](#c1)). Well-known examples are much of Boost, Eigen and nlohmann/json.

### Why it sidesteps the ABI

A [pre-compiled C++ library](abi-and-shared-libraries.md#c4) works only with a compatible compiler and settings. A header-only library is never pre-compiled: its code becomes part of each user's own build ([C2](#c2)), compiled by the same compiler as the code around it. Two parts of one build always agree on layout and naming, so there is no binary boundary to get wrong.

This is the point of shipping a C++ wrapper for a C interface as a header. The C functions underneath cross the binary boundary safely ([C5 there](abi-and-shared-libraries.md#c5)); the C++ convenience layer, with its classes, exceptions and RAII, is compiled into each user's binary and never crosses it.

The header is a convenience, not the essential part ([C6](#c6)). A `.cpp` file shipped as source and compiled by the user works equally well. SQLite does this with a single `sqlite3.c`.

### The one-definition rule and `inline`

C++ allows a non-inline function to be defined only once in a whole program. A header is pasted into every source file that includes it, so a plain function defined in a header ends up defined in each of them, and the linker rejects the duplicates ([C3](#c3)). `inline` relaxes the rule: each source file may have its own definition, provided they are identical, and the linker keeps one. Despite the name, it is mostly about this rule rather than about inlining. Functions defined inside a class, and templates, are already exempt ([C4](#c4)).

### The cost

Every source file that includes the library compiles all of it again, and changing it recompiles every includer ([C5](#c5)). For a thin wrapper of one-line forwarding functions this is negligible, and the compiler can inline the forwards. For a large library it is noticeable, which is why some libraries offer a compiled mode as well. Catch2 moved away from being header-only in version 3 for compile time.

The nearest .NET picture is a source-only NuGet package, whose `.cs` files are compiled into your project instead of being referenced as a DLL.

## Examples

A header defining functions correctly:

```cpp
// mathutil.hpp
#pragma once

inline int square(int x) { return x * x; }       // inline: may appear in many .cpp files

template <typename T>
T cube(T x) { return x * x * x; }                 // template: fine in a header

struct Counter {
    int value = 0;
    void add(int n) { value += n; }               // defined in the class body: implicitly inline
};
```

```cpp
// a.cpp
#include "mathutil.hpp"
int a() { return square(3); }

// b.cpp
#include "mathutil.hpp"
int b() { return cube(2); }

// main.cpp
#include <iostream>
int a();
int b();
int main() { std::cout << a() + b() << '\n'; }
```

Expected output:

```
17
```

Remove `inline` from `square` and the link fails with an error such as `multiple definition of 'square(int)'` (GCC) or `LNK2005: ... already defined` (MSVC), because both `a.cpp` and `b.cpp` now define it.

## Pitfalls

- Defining a non-template free function in a header without `inline` ([C3](#c3)).

- Believing header-only means faster: the compiler can inline more, but compile times rise ([C5](#c5)).

- Shipping a pre-compiled "wrapper library" to avoid the user's build step, and reintroducing the ABI problem the header form avoided ([C6](#c6)).

- Static data in a header: a non-`inline` global variable defined in a header has the same multiple-definition problem; C++17's `inline` variables solve it.

## Sources

- Claude session on [Tante](https://github.com/thomaswening/Tante), 2026-10-19, on why the C++ wrapper of the module interface in [Tante ADR-0004](https://github.com/thomaswening/Tante/pull/1) ships as a header.
- cppreference: [inline specifier](https://en.cppreference.com/w/cpp/language/inline), [definitions and the one-definition rule](https://en.cppreference.com/w/cpp/language/definition).
- SQLite: [the amalgamation](https://www.sqlite.org/amalgamation.html).
