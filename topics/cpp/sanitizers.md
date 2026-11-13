---
title: Sanitizers and undefined behaviour
area: cpp
created: 2026-10-20
updated: 2026-10-20
prerequisites: [c/stack-and-heap]
related: [cpp/raii-and-ownership, cpp/static-analysis]
projects: [tante]
tags: [cpp, c, undefined-behaviour, asan, ubsan, tsan, testing, ci]
---

# Sanitizers and undefined behaviour

## TL;DR

- C and C++ do not check array bounds, freed memory or signed overflow at run time. Breaking those rules is **undefined behaviour**: the program may crash, print garbage, or seem to work.
- .NET checks these things on every access and throws an exception. C++ only checks them when you build with a **sanitizer**.
- A sanitizer is a compiler option that inserts run-time checks into the program. When a check fails, it stops the program and reports the file, the line and the kind of error.
- **AddressSanitizer** finds memory errors, **UndefinedBehaviorSanitizer** finds arithmetic and type errors, and **ThreadSanitizer** finds data races.
- Sanitized builds are slower, so they are used for tests and CI, not for releases. They only find errors on code paths the tests actually run.

## Key claims

- <a id="c1"></a>**C1.** In C and C++, reading or writing outside an array's bounds, using memory after it has been freed, and overflowing a signed integer are undefined behaviour: the language standard places no requirement at all on what the program then does.

- <a id="c2"></a>**C2.** Undefined behaviour often does not crash immediately; a program with it can produce correct-looking output, and the optimiser may assume undefined behaviour never happens, so it can change what other, correct-looking code does.

- <a id="c3"></a>**C3.** A sanitizer is enabled at compile time (for example `-fsanitize=address` with GCC and Clang, `/fsanitize=address` with MSVC) and works by inserting run-time checks into the compiled program; it finds errors only on paths the program actually executes.

- <a id="c4"></a>**C4.** AddressSanitizer (ASan) detects out-of-bounds accesses to heap, stack and global memory, use after free, and double free; on Linux it also reports memory leaks when the program exits.

- <a id="c5"></a>**C5.** UndefinedBehaviorSanitizer (UBSan) detects errors such as signed integer overflow, shifts by an invalid amount and misaligned pointers; it is available with GCC and Clang but not with MSVC.

- <a id="c6"></a>**C6.** ThreadSanitizer (TSan) detects data races, where two threads access the same memory without synchronisation and at least one of them writes; it cannot be combined with AddressSanitizer in one build.

- <a id="c7"></a>**C7.** In C++, overflow of an unsigned integer is defined and wraps around modulo $2^n$, where $n$ is its width in bits, while overflow of a signed integer is undefined behaviour.

- <a id="c8"></a>**C8.** A sanitized build typically runs about twice as slowly as a normal one with AddressSanitizer, and several times more slowly with ThreadSanitizer, so sanitizers are used in tests and CI rather than in released programs.

## Explanation

### Why C++ needs them and C# does not

In C#, `arr[10]` on a five-element array throws `IndexOutOfRangeException`, because the runtime checks every index. Reading an object after it is gone cannot happen, because the garbage collector keeps it alive while anything refers to it.

C++ does neither. `arr[10]` computes an address and reads whatever bytes lie there. Memory freed a moment ago can still be read, and may still hold the old value. The standard calls this **undefined behaviour** ([C1](#c1)): it promises nothing. The program may crash, print nonsense, or print exactly what you expected ([C2](#c2)). That last case is the dangerous one, because the bug survives every test that only looks at output.

Undefined behaviour is not just "some random value". Compilers optimise on the assumption that it never happens. A loop `for (int i = start; i <= end; ++i)` may be compiled as if `i` can never overflow, because signed overflow is undefined ([C7](#c7)). If it does overflow, the loop does something the source code does not say.

### What a sanitizer does

A sanitizer is a build mode ([C3](#c3)). The compiler adds a check before every memory access, or around every risky operation. When a check fails, the program stops and prints a report: the kind of error, the line where it happened, and for memory errors also where the memory was allocated and freed. It is roughly .NET's always-on checking, switched on only for the builds you test with.

The checks only see code that runs. A sanitizer cannot find a bug on a path no test executes. That is the difference from static analysis ([static analysis](static-analysis.md)), which reads the code without running it.

### The three that matter

- **AddressSanitizer** ([C4](#c4)): memory errors. Out-of-bounds reads and writes, use after free, double free, and, on Linux, leaks at exit.
- **UndefinedBehaviorSanitizer** ([C5](#c5)): signed overflow, invalid shifts, misaligned pointers, and similar. GCC and Clang only.
- **ThreadSanitizer** ([C6](#c6)): data races between threads. It needs its own build, separate from ASan, and is the slowest ([C8](#c8)).

A typical project builds and runs its whole test suite once with ASan and UBSan together, and once with TSan, on every change.

## Examples

Use after free that usually "works":

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {1, 2, 3};
    int& first = v[0];   // a reference to the first element
    v.push_back(4);      // appends 4, like List<T>.Add; if the vector is full, it
                         // moves its elements to a bigger block and frees the old one
    std::cout << first << '\n';   // reads the old, freed memory
}
```

Without a sanitizer this often prints `1`. Built with `-fsanitize=address`, it stops at the last line and reports `heap-use-after-free`, with the line of `push_back` as the place where the memory was freed.

Signed overflow:

```cpp
#include <climits>
#include <iostream>

int main() {
    int x = INT_MAX;      // the largest int, like int.MaxValue; from <climits>
    x = x + 1;            // undefined behaviour
    std::cout << x << '\n';
}
```

With `-fsanitize=undefined` this reports `signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'`. In C#, the same code wraps to `int.MinValue` by default, or throws `OverflowException` in a `checked` block. In C++ neither is promised.

Building with sanitizers in CMake, for GCC or Clang:

```cmake
target_compile_options(app PRIVATE -fsanitize=address,undefined -fno-omit-frame-pointer)
target_link_options(app PRIVATE -fsanitize=address,undefined)
```

## Pitfalls

- "It printed the right answer, so there is no bug." Undefined behaviour often gives the right answer until the compiler, the optimisation level or the input changes ([C2](#c2)).
- A clean sanitizer run proves only that the paths the tests ran were clean ([C3](#c3)).
- Sanitizers check code compiled with them. A library built without the flag, such as a prebuilt C library, is not checked inside.
- Unsigned overflow is not a bug to the sanitizer, because it is defined ([C7](#c7)). A `size_t` that wraps below zero to a huge number is still a bug in your logic.

## Sources

- Claude session on [Tante](https://github.com/thomaswening/Tante), 2026-10-20, explaining the guardrails of [ADR-0001](https://github.com/thomaswening/Tante/blob/main/docs/adr/0001-cpp20-cmake-vcpkg-guardrails.md) and its [build spike](https://github.com/thomaswening/Tante/blob/main/docs/spikes/2026-10-16-native-arithmetic-build.md), which ran all three systems under ASan and UBSan.
- [Clang AddressSanitizer documentation](https://clang.llvm.org/docs/AddressSanitizer.html), [UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html), [ThreadSanitizer](https://clang.llvm.org/docs/ThreadSanitizer.html).
- [AddressSanitizer in MSVC](https://learn.microsoft.com/en-us/cpp/sanitizers/asan).
