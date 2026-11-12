---
title: Standard library functions met in code
area: cpp
created: 2026-11-08
updated: 2026-11-10
prerequisites: [cpp/iterators-and-ranges]
related: [cpp/arrays-and-containers]
projects: [partonforge]
tags: [cpp, standard-library, all-of, string-find, npos, substr, compare, try-emplace, optional, getline, string-replace, string-literal, range-for]
---

# Standard library functions met in code

This note grows. Each function or construct met in Thomas's code gets a claim for the one thing about it that is easy to get wrong, and a section below. New functions take the next free claim number.

## TL;DR

- `std::all_of` on an empty range is **true**, so "all patterns are formatting-only" holds when there are no patterns.
- `std::string::find` and its relatives return a position, or `std::string::npos` (the largest `size_t`) for "not found". Test `== npos`, never the position as a bool.
- `substr(pos, count)` takes a **length**, like C#'s `Substring(start, length)`, not an end position.
- `compare` returns an `int` that is 0 for **equal**. As a condition it means "differ". `replace(pos, count, text)` takes out `count` characters and puts in all of `text`, so the string can change length.
- `try_emplace` inserts only if the key is missing, and tells you which happened. `operator[]` inserts silently.
- Two empty `std::optional`s compare equal. `std::getline` drops the `'\n'` but keeps a `'\r'`.
- `"a" "b"` is one literal, `"ab"`, so a missing comma in a list of strings joins two elements. `for (auto x : v)` copies every element; `const auto&` does not.

## Key claims

- <a id="c1"></a>**C1.** `std::all_of(first, last, predicate)` returns `true` for an empty range, `std::any_of` returns `false` and `std::none_of` returns `true`; this matches the mathematical convention that "every element satisfies P" holds when there are no elements.
- <a id="c2"></a>**C2.** `std::string::find`, `rfind`, `find_first_of`, `find_first_not_of` and `find_last_not_of` return the index of the match as a `size_t`, or `std::string::npos` if there is none; `npos` is `static_cast<size_t>(-1)`, the largest `size_t`. Used as a condition, the result is `false` only for a match at index 0, so a "found?" test is written `pos != std::string::npos`.
- <a id="c3"></a>**C3.** `s.substr(pos, count)` returns at most `count` characters starting at `pos`: the second argument is a length, not an end index. A `count` that reaches past the end, or no `count` at all, takes the rest of the string. `pos == s.size()` gives an empty string and `pos > s.size()` throws `std::out_of_range`.
- <a id="c4"></a>**C4.** `a.compare(b)` returns an `int` that is negative if `a` sorts before `b`, zero if they are equal and positive if after; so `if (a.compare(b))` is true when the strings **differ**. `a.compare(pos, count, b)` compares only the substring `a.substr(pos, count)` with `b`; C++20 adds `starts_with` and `ends_with` for the common prefix and suffix tests.
- <a id="c5"></a>**C5.** `map.try_emplace(key, args...)` constructs a new element from `args` only if `key` is not in the map, and returns a `std::pair` of an iterator to the element with that key (new or existing) and a `bool` that is `true` if it inserted. If the key exists, the existing value is unchanged and the arguments are not moved from.
- <a id="c6"></a>**C6.** `map[key]` inserts a value-initialised element (0 for an `int`, an empty string for a `std::string`) if `key` is missing, so merely reading `counts["missing"]` adds an entry; it cannot be used on a `const` map.
- <a id="c7"></a>**C7.** Two empty `std::optional<T>` objects compare equal with `==`, and an empty one compares unequal to one that holds a value; so `parse(a) == parse(b)` is `true` when both parses fail.
- <a id="c8"></a>**C8.** `std::getline(stream, line)` reads up to the next `'\n'`, stores the characters without the `'\n'` and returns the stream, which tests `false` once no character could be read; so `while (std::getline(stream, line))` reads every line, including a last one without `'\n'`, and a final `'\n'` does not produce an extra empty line. A `'\r'` before the `'\n'` stays in `line` unless the stream translates line endings, as a Windows text-mode file stream does.
- <a id="c9"></a>**C9.** `s.replace(pos, count, text)` removes `count` characters starting at `pos` and inserts all of `text` in their place, whatever its length; the string's size changes by `text.size() - count`, so only a `text` of exactly `count` characters keeps the positions after it where they were.
- <a id="c10"></a>**C10.** The compiler joins adjacent string literals into one, so `"ab" "cd"` is the literal `"abcd"`; in an array initialiser, `{"ln x" "ln mu", "ln k_t^2"}` therefore has two elements, not three, and GCC 13 and Clang 18 give no warning with `-Wall -Wextra`.
- <a id="c11"></a>**C11.** For an all-blank string, `s.find_last_not_of(' ') + 1` is 0 only because `npos + 1` wraps around to 0 in unsigned arithmetic; an explicit test for `npos` before the arithmetic says the same without relying on the wrap-around.
- <a id="c12"></a>**C12.** In a range-based `for`, `auto x` makes a copy of every element, so changes to `x` do not reach the container and each `std::string` element is copied; `const auto& x` reads each element without copying, and `auto& x` lets the loop change the elements.

## Explanation

### all_of, any_of, none_of: the empty range

`all_of` answers "is there no element that fails?" ([C1](#c1)). With no elements, there is none that fails, so the answer is `true`. `any_of` asks "is there one that passes?", which is `false`. C#'s LINQ follows the same logic: `new int[0].All(p)` is `true` and `.Any(p)` is `false`.

The trap is in what the `true` is used for. PartonForge's `verdict` computes `only_formatting = std::all_of(diff.patterns.begin(), diff.patterns.end(), …same_value…)`. With no patterns at all, `only_formatting` is `true`. The code guards against that by checking `!diff.patterns.empty() && only_formatting` before it reports "only formatting". Whenever an `all_of` result leads to a conclusion, ask what the conclusion should be for no elements.

### find and npos

The string members `find`, `rfind`, `find_first_of`, `find_first_not_of` and `find_last_not_of` return an index, not an iterator ([C2](#c2)). For "not found" they return `std::string::npos`. It is `size_t(-1)`, which wraps to the largest value of the unsigned type: 18446744073709551615 on a 64-bit platform. C#'s `IndexOf` returns −1 instead. Because `size_t` is unsigned, `pos < 0` is never true, and `if (pos)` tests "found at a position other than 0". The only correct test is a comparison with `npos`.

PartonForge's `trimmed` shows a second trap: arithmetic with the result. `field.find_last_not_of(' ') - first + 1` is safe only because the line before returned early when `first == npos`. Without that check, an all-blank field would turn `npos` into a nonsense length.

These members differ from the algorithm `std::find`, which takes iterators and returns `last` for "not found" ([iterators and ranges](iterators-and-ranges.md#c5)).

### substr takes a length

`substr(pos, count)` reads like C#'s `Substring(startIndex, length)` and means the same ([C3](#c3)). It is not Java's `substring(begin, end)`. Two differences from C#: a `count` that runs past the end is cut short instead of throwing, and the default `count` takes the rest. So `field.substr(field_start, kColumnsPerValue)` reads one 26-column field, and `s.substr(epos + 2)` takes everything after the exponent sign. Only a start position beyond the end throws.

### compare returns three ways

`compare` is the C++ version of C#'s `string.CompareOrdinal`: negative, zero or positive ([C4](#c4)). Zero means equal, so the result read as a `bool` means "not equal". The usual way to write an equality test is `a == b`. `compare` earns its place with its range overloads. PartonForge's `is_line_ending_only` tests whether the longer line starts with the shorter one by writing `longer.compare(0, shorter.size(), shorter) == 0`, which compares the first `shorter.size()` characters without building a substring. With C++20 this is `longer.starts_with(shorter)`.

### try_emplace inserts or finds, in one lookup

A map lookup followed by an insert searches the map twice. `try_emplace` does both in one call ([C5](#c5)). It returns a pair, which structured bindings unpack:

```cpp
const auto [entry, is_new] = position_by_key_.try_emplace(key, patterns_.size());
```

If `key` was new, `entry->second` is `patterns_.size()`, the index the new pattern is about to get. If `key` was there, `entry->second` is the index stored earlier. The `patterns_.size()` argument was then ignored. Either way `entry` points to the right element. C#'s nearest relative is `Dictionary.TryAdd`, which returns only the `bool`. Getting the existing value then takes a second lookup.

`try_emplace` differs from `emplace` in one detail: when the key exists, it leaves its arguments alone. `emplace` may build a node from them, find the key taken and throw the node away, after it has moved from the arguments.

### operator[] inserts

`counts[key]` is not a read ([C6](#c6)). If `key` is missing, it inserts a default value and returns a reference to that. This makes `++counts[word]` a one-line counter. It also means that a check like `if (counts["x"] == 0)` adds `"x"` to the map. Reading without inserting takes `find` or, since C++20, `contains`. A C# `Dictionary` indexer throws `KeyNotFoundException` instead.

### Comparing optionals

`std::optional<T>` holds a `T` or nothing. Its `==` treats "nothing" as a value of its own ([C7](#c7)): two empty optionals are equal. PartonForge's `same_value` compares two fields parsed with `parse_exact`, which returns `std::nullopt` for text that is not a number. Writing `return reference_value == rewritten_value;` would report two unparsable fields as "the same value". The code checks both first: `reference_value && rewritten_value && *reference_value == *rewritten_value`. `*opt` reads the value without checking that there is one, so the two tests before it are needed.

### getline and line endings

`std::getline` reads one line and throws away the `'\n'` ([C8](#c8)). It returns the stream. A stream in a `while` condition tests "did the last read succeed?". So the loop ends after the last line, whether or not the file ends in `'\n'`. A file `"a\nb\n"` gives two lines, not three.

What `getline` does not remove is a `'\r'`. A file with Windows line endings (`"\r\n"`) read on Linux, or read from bytes on any platform, gives lines that end in `'\r'`. Only a Windows file stream opened in text mode translates `"\r\n"` to `'\n'` before `getline` sees it. PartonForge's `diff_grid_files` reads the files in binary mode and splits them with `getline` on purpose. The `'\r'` survives, so `is_line_ending_only` can report a CRLF line instead of a values difference.

### replace changes the length

`replace(pos, count, text)` reads like "overwrite `count` characters with `text`", but it means "cut out `count`, paste in `text`" ([C9](#c9)). With a `text` of another length, everything after it moves. PartonForge's diff tests build broken grid lines this way: `data_line.replace(position, pf::kColumnsPerValue, wrong_zero)` swaps one 26-column field for another. That works only because `wrong_zero` is exactly 26 characters long. A 25-character replacement would shorten the line. The diff would then compare the line as a whole instead of field by field. C# needs `s.Remove(pos, count).Insert(pos, text)` for the same.

### Adjacent string literals

Two string literals with only whitespace between them are one literal ([C10](#c10)). The compiler joins them before it compiles anything else. This is how PartonForge's `verdict` writes a long message over two lines:

```cpp
return "Verdict: only the final newline differs -- check how the grid writer ends "
       "the file (src/grid.cpp).\n";
```

The same rule turns a forgotten comma into a silent bug. In `{"ln x" "ln mu", "ln k_t^2"}` the first element is `"ln xln mu"`, and the array has two elements. Neither GCC 13 nor Clang 18 warns with `-Wall -Wextra`. When the array has a declared size, as `integrated_coordinates[kIntegratedCoordinates]` in `field_name` has, the missing element becomes a null pointer. `field_name` would turn it into a `std::string`, which is undefined behaviour for a null pointer. C# has no such rule: two literals need a `+`.

### find_last_not_of + 1 and the wrap-around

PartonForge's `shape` computes `field.find_last_not_of(' ') + 1`, the column one past the last non-blank character ([C11](#c11)). For an all-blank field, `find_last_not_of` returns `npos`, the largest `size_t`. Adding 1 wraps around to 0, which happens to be the right answer: no non-blank character, so column 0. The code does not depend on that, because it returns `"blank"` for an empty field one line earlier. That guard is the clear way to write it. A reader who sees only `+ 1` cannot tell whether the all-blank case was thought of.

### auto or const auto& in a range-for

`for (auto key : keys)` declares a new variable for each element and copies the element into it ([C12](#c12)). For `int`s that costs nothing. For `std::string`s it allocates once per element. A change to `key` changes only the copy. `for (const auto& key : keys)` binds a reference instead: no copy, and the compiler rejects any change. PartonForge's loops use that form, as in `for (const auto& key : steering.keys_in_order())`. `auto& key` is for loops that change the elements. C#'s `foreach` gives a read-only copy of a struct element and a reference to a class element. C++ lets the loop choose.

## Examples

Algorithms and string members:

```cpp
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

int main() {
  std::vector<int> none;
  auto positive = [](int v) { return v > 0; };
  std::cout << std::boolalpha << std::all_of(none.begin(), none.end(), positive) << ' '
            << std::any_of(none.begin(), none.end(), positive) << ' '
            << std::none_of(none.begin(), none.end(), positive) << '\n';

  const std::string text = "x = 1.5E+03";
  std::cout << text.find('E') << ' ' << text.find('Q') << '\n';
  std::cout << (text.find('Q') == std::string::npos) << '\n';
  std::cout << static_cast<bool>(text.find('x')) << ' ' << static_cast<bool>(text.find('Q')) << '\n';

  std::cout << '[' << text.substr(4, 3) << "] [" << text.substr(4) << "] [" << text.substr(4, 100)
            << "] [" << text.substr(text.size()) << "]\n";
  try {
    (void)text.substr(text.size() + 1);
  } catch (const std::out_of_range&) {
    std::cout << "out_of_range\n";
  }

  const std::string a = "abc", b = "abd";
  std::cout << (a.compare(b) < 0) << ' ' << (a.compare(a) == 0) << ' ' << static_cast<bool>(a.compare(b)) << '\n';
  const std::string line = "1.0 2.0\r", other = "1.0 2.0";
  std::cout << (line.compare(0, other.size(), other) == 0) << ' ' << line.starts_with(other) << '\n';
}
```

Output on a 64-bit platform:

```text
true false true
7 18446744073709551615
true
false true
[1.5] [1.5E+03] [1.5E+03] []
out_of_range
true true true
true true
```

The fourth line is the `npos` trap ([C2](#c2)): a match at index 0 reads as `false`, "not found" as `true`.

Maps, optionals and `getline`:

```cpp
#include <iostream>
#include <map>
#include <optional>
#include <sstream>
#include <string>

int main() {
  std::map<std::string, int> position;
  auto [entry, inserted] = position.try_emplace("E-style", 0);
  std::cout << std::boolalpha << inserted << ' ' << entry->second << '\n';
  auto [again, inserted_again] = position.try_emplace("E-style", 7);
  std::cout << inserted_again << ' ' << again->second << '\n';   // the old value stays

  std::string key = "F-style";
  std::string value = "kept";
  std::map<std::string, std::string> names{{"F-style", "old"}};
  names.try_emplace(key, std::move(value));
  std::cout << '[' << value << "]\n";                              // not moved from: key existed

  std::map<std::string, int> counts;
  std::cout << counts["missing"] << ' ' << counts.size() << '\n';  // operator[] inserts 0

  std::optional<double> left, right;
  std::cout << (left == right) << '\n';                          // two empty optionals are equal

  std::istringstream lines("first\r\nsecond\nlast");
  std::string line;
  while (std::getline(lines, line)) std::cout << line.size() << ':' << (line.back() == '\r') << ' ';
  std::cout << '\n';
  std::istringstream ends_in_newline("a\nb\n");
  int count = 0;
  while (std::getline(ends_in_newline, line)) ++count;
  std::cout << count << '\n';
}
```

Output:

```text
true 0
false 0
[kept]
0 1
true
6:true 6:false 4:false 
2
```

`"first\r"` is six characters with the `'\r'` at the end. `"last"` has no `'\n'` and is still read ([C8](#c8)).

`replace`, adjacent literals, the wrap-around and range-for ([C9](#c9) to [C12](#c12)):

```cpp
#include <iostream>
#include <string>
#include <vector>

int main() {
  std::string line = "aaaa|bbbb|cccc";
  line.replace(5, 4, "XY");                 // 4 characters out, 2 in
  std::cout << line << ' ' << line.size() << '\n';
  line.replace(5, 2, "BBBB");
  std::cout << line << ' ' << line.size() << '\n';

  const char* message = "Verdict: only the final newline differs -- "
                        "check the grid writer.";
  std::cout << message << '\n';
  const char* names[] = {"ln x" "ln mu", "ln k_t^2"};   // a missing comma joins two elements
  std::cout << sizeof(names) / sizeof(names[0]) << ' ' << names[0] << '\n';

  const std::string blank = "    ";
  const std::string padded = "  1.5 ";
  std::cout << blank.find_last_not_of(' ') << ' ' << blank.find_last_not_of(' ') + 1 << ' '
            << padded.find_last_not_of(' ') + 1 << '\n';

  std::vector<std::string> keys{"q_g", "zm_fixed"};
  for (auto key : keys) key += "!";              // a copy per element: keys unchanged
  for (const auto& key : keys) std::cout << key << ' ';
  for (auto& key : keys) key += "!";             // a reference: keys changed
  for (const auto& key : keys) std::cout << key << ' ';
  std::cout << '\n';
}
```

Output on a 64-bit platform:

```text
aaaa|XY|cccc 12
aaaa|BBBB|cccc 14
Verdict: only the final newline differs -- check the grid writer.
2 ln xln mu
18446744073709551615 0 5
q_g zm_fixed q_g! zm_fixed!
```

All three snippets were compiled with GCC 13.3 and Clang 18.1 (`-std=c++20 -Wall -Wextra`) and gave the output shown. Neither compiler warned about the missing comma.

## Pitfalls

- Concluding something from `all_of` without asking about the empty case ([C1](#c1)).
- `if (s.find(x))` as "contains x", or `s.find(x) < 0` as "not found". The first is wrong for index 0, the second is never true ([C2](#c2)).
- `s.substr(start, end)` with an end index. It reads `end` characters ([C3](#c3)).
- `if (a.compare(b))` read as "equal" ([C4](#c4)).
- Reading from a map with `[]` to check for a key. It inserts the key ([C6](#c6)).
- Comparing two optionals to ask "same value?" when both may be empty ([C7](#c7)).
- Expecting `getline` to strip `"\r\n"` on Linux ([C8](#c8)).
- Replacing a fixed-width field with text of another width. Every later position moves ([C9](#c9)).
- A missing comma between two strings in an initialiser list. It compiles without a warning ([C10](#c10)).
- Relying on `npos + 1 == 0` instead of testing for `npos` ([C11](#c11)).
- `for (auto x : strings)` where `const auto&` was meant: a copy per element, and changes that go nowhere ([C12](#c12)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-11-08: the walkthrough of [PR 1](https://github.com/thomaswening/PartonForge/pull/1), in [`src/grid_diff.cpp`](https://github.com/thomaswening/PartonForge/blob/56b51e6d0d0d3f2c8c4b2b67de40aaa8c469347a/src/grid_diff.cpp) (`split_lines`, `trimmed`, `is_line_ending_only`, `same_value`, `PatternCollector::add`, `verdict`), [`src/fortran_io.cpp`](https://github.com/thomaswening/PartonForge/blob/56b51e6d0d0d3f2c8c4b2b67de40aaa8c469347a/src/fortran_io.cpp) and [`tests/test_gfortran_diff.cpp`](https://github.com/thomaswening/PartonForge/blob/56b51e6d0d0d3f2c8c4b2b67de40aaa8c469347a/tests/test_gfortran_diff.cpp) (`compare_batch`, `compare_all`).
- Claude session on PartonForge, 2026-11-09 and 2026-11-10, part 4 of the PR 1 walkthrough: `replace` in [`tests/test_units.cpp`](https://github.com/thomaswening/PartonForge/blob/56b51e6d0d0d3f2c8c4b2b67de40aaa8c469347a/tests/test_units.cpp#L234-L245), the split literal in `verdict`, `shape`'s `find_last_not_of(' ') + 1`, and the range-for loops. Source of [C9](#c9) to [C12](#c12).
- cppreference: [`std::all_of`, `any_of`, `none_of`](https://en.cppreference.com/w/cpp/algorithm/all_any_none_of), [`std::basic_string::find`](https://en.cppreference.com/w/cpp/string/basic_string/find), [`npos`](https://en.cppreference.com/w/cpp/string/basic_string/npos), [`substr`](https://en.cppreference.com/w/cpp/string/basic_string/substr), [`compare`](https://en.cppreference.com/w/cpp/string/basic_string/compare), [`std::map::try_emplace`](https://en.cppreference.com/w/cpp/container/map/try_emplace), [`std::map::operator[]`](https://en.cppreference.com/w/cpp/container/map/operator_at), [`std::optional` comparisons](https://en.cppreference.com/w/cpp/utility/optional/operator_cmp), [`std::getline`](https://en.cppreference.com/w/cpp/string/basic_string/getline), [`replace`](https://en.cppreference.com/w/cpp/string/basic_string/replace), [string literal concatenation](https://en.cppreference.com/w/cpp/language/string_literal), [range-based for](https://en.cppreference.com/w/cpp/language/range-for).
- .NET: [`Enumerable.All`](https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.all), [`Dictionary.TryAdd`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2.tryadd).
