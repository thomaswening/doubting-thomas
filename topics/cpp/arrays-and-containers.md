---
title: Arrays, std::array, std::vector and std::span
area: cpp
created: 2026-10-25
updated: 2026-10-29
prerequisites: [c/array-parameters, cpp/references]
related: [cpp/raii-and-ownership, cpp/copy-and-move, cpp/const-and-constexpr]
projects: [partonforge]
tags: [cpp, array, std-array, vector, span, decay, list]
---

# Arrays, std::array, std::vector and std::span

## TL;DR

- A built-in array `T a[N]` holds N elements inline. N is fixed at compile time and is part of the type. The array decays to a pointer, cannot be assigned and does not know its length once passed on.

- `std::array<T, N>` stores the same elements the same way, but behaves like a value: it can be copied, assigned and returned, and has `.size()`.

- `std::vector<T>` keeps its elements on the heap, can grow, and frees them in its destructor. It is C#'s `List<T>`.

- C#'s `T[]` is closest to `std::vector<T>`, not to `T*`: both have a run-time length and live on the heap. A C# array cannot grow, and assigning one shares it instead of copying.

- `std::span<T>` (C++20) is a non-owning view of elements stored elsewhere: a pointer plus a length. `std::span<T>` may change the elements, like C#'s `Span<T>`; `std::span<const T>` may only read them, like `ReadOnlySpan<T>`. It is the modern replacement for a `(T*, size_t)` parameter pair.

## Key claims

- <a id="c1"></a>**C1.** The size of a built-in array `T a[N]` must be a constant expression and is part of its type; `int a[n];` with `n` known only at run time is not standard C++, although gcc accepts it as an extension and warns with `-Wvla` under `-pedantic`.

- <a id="c2"></a>**C2.** `std::array<T, N>` stores its N elements inside the object, like a built-in array and without a heap allocation, but unlike a built-in array it can be copied, assigned, passed by value and returned, does not decay to a pointer, and reports its length with `.size()`.

- <a id="c3"></a>**C3.** `std::vector<T>` stores its elements in heap memory it owns; its length is set and changed at run time (`push_back`, `resize`), and its destructor destroys the elements and frees the memory.

- <a id="c4"></a>**C4.** Assigning one `std::array` or `std::vector` to another copies every element, so the two are independent afterwards; assigning a C# array variable copies only the reference, so both variables then name the same array.

- <a id="c5"></a>**C5.** C#'s `List<T>` corresponds to `std::vector<T>`; C#'s `T[]` corresponds to `std::vector<T>` more closely than to a built-in array or a pointer, since both keep a run-time length on the heap, but a C# array cannot change its length.

- <a id="c6"></a>**C6.** `std::span<T>` (C++20) refers to a contiguous run of elements owned by something else, holding only a pointer and a length; a `std::span<const T>` parameter accepts a built-in array, a `std::array` or a `std::vector` without copying, as C#'s `ReadOnlySpan<T>` does.

- <a id="c7"></a>**C7.** `const char* names[] = {"g", "u", "d"};` declares a built-in array of three pointers, its length deduced from the initialiser; `std::size(names)` gives that length, 3.

- <a id="c8"></a>**C8.** Through a `std::span<T>` the viewed elements can be modified, as through C#'s `Span<T>`; through a `std::span<const T>` they can only be read. The `const` belongs to the element type, as in `const T*`.

## Explanation

### The built-in array

A built-in array is C's array ([array parameters](../c/array-parameters.md)). Its length is part of its type and must be known when compiling ([C1](#c1), [const and constexpr](const-and-constexpr.md#c3)). Its elements sit directly in the enclosing object or stack frame. In most expressions it decays to a pointer to its first element, so a function receiving it gets an address and no length. And it cannot be assigned or returned.

All of that makes it awkward to use as a value. Modern C++ uses it mainly for small constant tables, such as a list of names ([C7](#c7)).

### std::array: the same storage, as a value

`std::array<double, 3>` holds three doubles inline, exactly as `double[3]` does ([C2](#c2)). The difference is behaviour. It is a class, so it is copied by assignment and by passing it by value, and it can be returned. It keeps its length and never decays. Use it whenever the length is fixed at compile time.

### std::vector: the run-time-sized owner

`std::vector<double>` holds a pointer to heap memory, a length and a capacity ([C3](#c3)). It grows when you `push_back` and frees its memory in its destructor ([RAII and ownership](raii-and-ownership.md#c5)). It is the default container in C++, as `List<T>` is in C#.

### Mapping C#'s T[]

A C# `int[]` lives on the heap, knows its `Length` and is fixed in length once created. In C++ the nearest thing is `std::vector<int>` ([C5](#c5)). The large difference is assignment ([C4](#c4)). C++ containers are values: `b = a;` copies every element ([copy and move](copy-and-move.md)). In C#, `b = a;` makes `b` refer to the same array, so a change through `b` shows through `a`. To share without copying in C++, pass a reference ([references](references.md)) or a span.

### std::span: a view

A function that only reads a run of values should not care which container holds them. Before C++20 it took a pointer and a length, which nothing checked belonged together. `std::span<const T>` is that pair as one object ([C6](#c6)). It accepts any contiguous storage and copies nothing. A function that should write the elements, for example to scale them in place, takes `std::span<T>` instead ([C8](#c8)). Like a reference, it does not keep the elements alive: the container must outlive the span.

## Examples

Compiled with `g++ -std=c++20`:

```cpp
#include <array>
#include <iostream>
#include <span>
#include <vector>

// Accepts any contiguous doubles. `for (double value : values)` is C#'s foreach.
double sum(std::span<const double> values) {
    double total = 0;
    for (double value : values) total += value;
    return total;
}

int main() {
    double raw[3] = {1, 2, 3};                // built-in array
    std::array<double, 3> fixed = {4, 5, 6};  // fixed length, behaves as a value
    std::vector<double> grown = {7};          // heap, can grow
    grown.push_back(8);

    std::array<double, 3> copy = fixed;       // copies all three elements
    copy[0] = 0;                              // fixed is unchanged

    std::cout << sum(raw) << ' ' << sum(fixed) << ' ' << sum(grown) << ' '
              << fixed[0] << ' ' << copy[0] << ' ' << grown.size() << '\n';
}
```

Output:

```text
6 15 15 4 0 2
```

A table of names, as in [PartonForge](https://github.com/thomaswening/PartonForge)'s `grid_diff.cpp`:

```cpp
#include <iostream>
#include <iterator>   // std::size

const char* kNames[] = {"g", "u", "d"};   // an array of three pointers

int main() {
    std::cout << std::size(kNames) << ' ' << kNames[1] << '\n';
}
```

Output:

```text
3 u
```

## Pitfalls

- Reading `const char* names[]` as "a pointer". The brackets make it an array; each element is a pointer ([C7](#c7)).

- Expecting `b = a;` between two vectors to share them, as in C#. It copies ([C4](#c4)).

- Using a run-time length for a built-in array because gcc accepts it. It is not portable C++ ([C1](#c1)); use `std::vector`.

- Keeping a `std::span` to a vector, then letting the vector grow or be destroyed. The span then points to freed memory ([C6](#c6)).

- Taking `T*` as the C++ version of C#'s `T[]`. A pointer carries no length and owns nothing ([C5](#c5)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-25: Thomas's review of [PR 1](https://github.com/thomaswening/PartonForge/pull/1) asked whether arrays always have pointer type, and whether C#'s `Person[]` maps to `Person*`.
- [cppreference: arrays](https://en.cppreference.com/w/cpp/language/array), [`std::array`](https://en.cppreference.com/w/cpp/container/array), [`std::vector`](https://en.cppreference.com/w/cpp/container/vector), [`std::span`](https://en.cppreference.com/w/cpp/container/span).
