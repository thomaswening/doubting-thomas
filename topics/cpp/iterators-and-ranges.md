---
title: Iterators and half-open ranges
area: cpp
created: 2026-11-08
updated: 2026-11-08
prerequisites: [cpp/arrays-and-containers]
related: [cpp/standard-library-met-in-code]
projects: [partonforge]
tags: [cpp, iterator, begin, end, half-open-range, algorithm, ranges, views]
---

# Iterators and half-open ranges

## TL;DR

- An **iterator** marks a position in a sequence and is used like a pointer: `*it` is the element, `++it` the next position.
- `begin()` marks the first element. `end()` marks the position **one past the last** element, which holds no element and must never be dereferenced.
- A pair `[first, last)` is a **half-open range**: `first` belongs to it, `last` does not. An empty range has `first == last`. With a vector, `last - first` is the element count.
- The algorithms in `<algorithm>` take such a pair, so they work on part of a container as well as on all of it. A search that finds nothing returns `last`.
- C++20's `std::ranges` algorithms take the container itself: `std::ranges::sort(values)`. Its views (`std::views::filter`, `transform`) are lazy, like LINQ's `Where` and `Select`.
- C# ranges are half-open too: `array[1..3]` is elements 1 and 2.

## Key claims

- <a id="c1"></a>**C1.** An iterator designates a position in a sequence; `*it` gives the element at that position and `++it` moves to the next one, so a pointer into an array is an iterator.
- <a id="c2"></a>**C2.** A container's `begin()` designates its first element and `end()` the position one past its last element; `end()` designates no element, so `*v.end()` is undefined behaviour.
- <a id="c3"></a>**C3.** The standard library writes a range as a pair of iterators `[first, last)`, which contains `first` but not `last`; the range is empty exactly when `first == last`, so for an empty container `begin() == end()`. For random-access iterators, such as a vector's, `last - first` is the number of elements.
- <a id="c4"></a>**C4.** Algorithms in `<algorithm>` take a pair of iterators and work on that range only: `std::sort(v.begin(), v.begin() + 3)` sorts the first three elements and leaves the rest alone.
- <a id="c5"></a>**C5.** A search algorithm such as `std::find(first, last, value)` returns `last` when it finds nothing; that is `v.end()` only when the search covered the whole container.
- <a id="c6"></a>**C6.** A range-based `for (auto& x : v)` loop is shorthand for a loop with an iterator from `begin(v)` to `end(v)`, so it works for every type that has `begin` and `end`.
- <a id="c7"></a>**C7.** The C++20 algorithms in namespace `std::ranges` take a whole range instead of an iterator pair, as in `std::ranges::sort(v)` and `std::ranges::find(v, 4)`, and still return iterators.
- <a id="c8"></a>**C8.** C++20 views such as `std::views::filter` and `std::views::transform` are lazy: they compute elements when iterated, from the container's current contents, like LINQ's `Where` and `Select` before `ToList()`.

## Explanation

### A position, not an element

C# walks a sequence with one object: an `IEnumerator<T>` that holds a position, gives the `Current` element and answers "is there more?" with `MoveNext()`. C++ splits this up. An iterator only knows a position ([C1](#c1)). Whether the walk is finished is decided by comparing it with a second iterator that marks the end.

The model is the pointer. A pointer to an array element can be dereferenced (`*p`) and advanced (`++p`). Every container's iterator offers at least these two operations. A vector's iterator offers everything a pointer does, including `it + 3` and `last - first`. Such an iterator is called **random-access**. A `std::list` iterator can only step one position at a time.

### Why one past the end

`end()` points one past the last element ([C2](#c2)). This choice makes ranges **half-open** ([C3](#c3)), and half-open ranges have three useful properties:

- The empty range needs no special case: it is `first == last`. A loop `for (it = first; it != last; ++it)` runs zero times on it.
- The length is `last - first`, with no `+ 1`.
- Ranges join without overlap. `[first, middle)` and `[middle, last)` together are `[first, last)`. `middle` belongs to exactly one of them.

C# uses the same convention for its index ranges: `array[1..3]` contains the elements at 1 and 2, and `^0` is the position after the last element, like `end()`. `Span<T>.Slice(start, length)` and `string.Substring(start, length)` take a length instead, as `std::string::substr` does.

### Algorithms work on ranges, not containers

`std::sort`, `std::find`, `std::all_of` and the other algorithms in `<algorithm>` know nothing about containers. They receive two iterators and work between them ([C4](#c4)). That is why the same `std::sort` sorts a vector, an array or a part of either. PartonForge's `verdict` calls `std::all_of(diff.patterns.begin(), diff.patterns.end(), …)`: the whole vector, written out as its two ends.

A search reports failure with the end of the range it searched ([C5](#c5)). There is no `-1` and no `null`. The test is therefore `it == last`. When the range was the whole container, that is `it == v.end()`. When it was part of it, the result is the end of that part, which is an ordinary element of the container. The position of a found element is `it - v.begin()`.

### The loop behind range-based for

`for (const auto& value : values)` is compiled into a loop with `begin(values)` and `end(values)` ([C6](#c6)). It is C#'s `foreach`. A type of your own can be used in it by giving it `begin()` and `end()` members, much as C#'s `foreach` needs a `GetEnumerator()` method.

### C++20 ranges

Writing `v.begin(), v.end()` for every call is noisy. Passing the ends of two different containers is also a mistake the compiler does not catch. C++20 adds overloads in the namespace `std::ranges` that take the container ([C7](#c7)): `std::ranges::sort(values)`, `std::ranges::find(values, 4)`, `std::ranges::all_of(values, predicate)`. They return iterators like the classic versions. They are also constrained by concepts, so a wrong argument gives a shorter error message.

`<ranges>` also has **views**, which are lazy like LINQ ([C8](#c8)). `values | std::views::filter(is_even) | std::views::transform(square)` computes nothing when it is written. Each element is computed when a loop asks for it, from what the container holds at that moment. A LINQ query behaves the same way until `ToList()` is called.

## Examples

Iterators, sub-ranges and a failed search:

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
  std::vector<int> values{5, 3, 4, 1, 2};
  auto first = values.begin();
  auto last = values.end();
  std::cout << *first << ' ' << (last - first) << '\n';   // first element, element count

  std::sort(values.begin(), values.begin() + 3);           // only the first three
  for (int value : values) std::cout << value << ' ';
  std::cout << '\n';

  auto found = std::find(values.begin(), values.end(), 4);
  std::cout << (found - values.begin()) << '\n';           // index of the 4
  auto missing = std::find(values.begin(), values.end(), 9);
  std::cout << std::boolalpha << (missing == values.end()) << '\n';

  auto in_part = std::find(values.begin(), values.begin() + 2, 5);   // search [0, 2) only
  std::cout << (in_part == values.begin() + 2) << '\n';

  std::vector<int> empty;
  std::cout << (empty.begin() == empty.end()) << '\n';
}
```

Output:

```text
5 5
3 4 5 1 2 
1
true
true
true
```

The 5 sits at index 2, outside `[0, 2)`, so the search of that part returns its end, `values.begin() + 2` ([C5](#c5)).

C++20 algorithms and a lazy view:

```cpp
#include <algorithm>
#include <iostream>
#include <ranges>
#include <vector>

int main() {
  std::vector<int> values{5, 3, 4, 1, 2};
  std::ranges::sort(values);                                  // the whole container
  auto found = std::ranges::find(values, 4);                  // still an iterator
  std::cout << (found - values.begin()) << '\n';

  auto even_squares = values | std::views::filter([](int v) { return v % 2 == 0; })
                             | std::views::transform([](int v) { return v * v; });
  values.push_back(6);                                        // the view is lazy: it sees the 6
  for (int square : even_squares) std::cout << square << ' ';
  std::cout << '\n';
}
```

Output:

```text
3
4 16 36 
```

Both snippets were compiled with GCC 13.3 and Clang 18.1 (`-std=c++20 -Wall -Wextra`) and gave the output shown. The `push_back` before the view is first used is safe. Changing the container while a loop over the view is running is not (see the pitfalls).

## Pitfalls

- Dereferencing `end()`, for example to read "the last element". The last element is `*(v.end() - 1)` or `v.back()`, and only if the vector is not empty ([C2](#c2)).
- Testing a search result against `v.end()` after searching only part of `v` ([C5](#c5)).
- Passing iterators of two different containers, as in `std::find(a.begin(), b.end(), x)`. It compiles and is undefined behaviour. `std::ranges::find(a, x)` makes the mistake impossible ([C7](#c7)).
- Keeping an iterator across a `push_back`. When the vector grows, it moves its elements to a new buffer. Every iterator into the old one then dangles.
- Treating a view like a list. It holds no elements and recomputes them on every pass ([C8](#c8)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-11-08: the walkthrough of [PR 1](https://github.com/thomaswening/PartonForge/pull/1), [`verdict`](https://github.com/thomaswening/PartonForge/blob/56b51e6d0d0d3f2c8c4b2b67de40aaa8c469347a/src/grid_diff.cpp#L301-L306) and [`stable_sort`](https://github.com/thomaswening/PartonForge/blob/56b51e6d0d0d3f2c8c4b2b67de40aaa8c469347a/src/grid_diff.cpp#L366) in `src/grid_diff.cpp`.
- cppreference: [iterator library](https://en.cppreference.com/w/cpp/iterator), [algorithms library](https://en.cppreference.com/w/cpp/algorithm), [range-based for loop](https://en.cppreference.com/w/cpp/language/range-for), [ranges library](https://en.cppreference.com/w/cpp/ranges).
- Edsger W. Dijkstra, [Why numbering should start at zero](https://www.cs.utexas.edu/users/EWD/transcriptions/EWD08xx/EWD831.html) (EWD 831), the argument for half-open ranges.
- C#: [indices and ranges](https://learn.microsoft.com/en-us/dotnet/csharp/tutorials/ranges-indexes).
