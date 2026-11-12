---
title: std::variant for a C# developer
area: cpp
created: 2026-11-10
updated: 2026-11-10
prerequisites: [cpp/references]
related: [cpp/standard-library-met-in-code]
projects: [partonforge]
tags: [cpp, variant, get-if, get, bad-variant-access, visit, sum-type, pattern-matching]
---

# std::variant for a C# developer

## TL;DR

- `std::variant<long long, double, std::string>` holds exactly one value, of one of those three types, and knows which. It lives inside the variant itself, with no heap allocation.
- `std::get_if<double>(&value)` gives a pointer to the `double`, or `nullptr` if the variant holds something else. `if (const auto* real = std::get_if<double>(&value))` is C#'s `if (value is double real)`.
- `std::get<double>(value)` gives a reference and throws `std::bad_variant_access` if the variant holds another type.
- `value.index()` says which alternative it holds, counting from 0. Assigning a value of another type switches it.
- `std::visit` calls one function with whatever the variant holds, like a C# `switch` on the type.
- PartonForge's `Steering::find` returns `const Value*`: a pointer is C++20's way to return "a reference, or nothing", since `std::optional<const Value&>` is not allowed before C++26.

## Key claims

- <a id="c1"></a>**C1.** A `std::variant<T1, T2, ...>` (C++17, `<variant>`) holds at every moment exactly one value of one of its alternative types and records which; the value is stored inside the variant object, so no heap allocation takes place and the variant is at least as large as its largest alternative.
- <a id="c2"></a>**C2.** `v.index()` returns the zero-based position of the alternative `v` holds, in the order of the template arguments, and `std::holds_alternative<T>(v)` returns whether `v` holds a `T`.
- <a id="c3"></a>**C3.** `std::get<T>(v)` returns a reference to the held `T` and throws `std::bad_variant_access` if `v` holds another alternative.
- <a id="c4"></a>**C4.** `std::get_if<T>(p)` takes a *pointer* to a variant and returns a pointer to the held `T`, or `nullptr` if the variant holds another alternative or `p` itself is `nullptr`; so `if (const auto* real = std::get_if<double>(&v))` tests and unpacks in one step, like C#'s `if (v is double real)`.
- <a id="c5"></a>**C5.** A default-constructed variant holds a value-initialised first alternative (0 for `long long`), and assigning a value of another alternative type destroys the old value and switches the variant to the new alternative.
- <a id="c6"></a>**C6.** When a variant is initialised from a value, the alternative is chosen as overload resolution would choose a function parameter, except that under the C++20 rules alternatives that would need a narrowing conversion are not considered: an `int` variable goes to `long long` rather than `double`, and a string literal goes to `std::string` rather than `bool`.
- <a id="c7"></a>**C7.** `std::visit(f, v)` calls `f` with the value `v` holds, as the alternative's type; with a generic lambda, `[](const auto& held) { ... }`, one body handles every alternative, and the code fails to compile if the body does not work for one of them.
- <a id="c8"></a>**C8.** A function that returns "a reference to an element, or nothing" returns a pointer in C++20, as `const Value* find(std::string_view key) const` does, with `nullptr` for "absent": `std::optional<const Value&>` does not compile before C++26, and `std::optional<Value>` would copy the element.

## Explanation

### One of a few types

PartonForge's steering file has three kinds of values: integers (`Nevents = 100`), reals (`zm_fixed = 0.99999`) and strings (`Output = 'grid.dat'`). Its parser stores each as

```cpp
using Value = std::variant<long long, double, std::string>;
```

A variant is a **tagged union**: storage for the largest alternative plus a small index that says which alternative is in it ([C1](#c1)). On 64-bit Linux, a `std::string` takes 32 bytes and this `Value` 40. Nothing is allocated, and copying a `Value` copies the value in it. The set of alternatives is closed: a `Value` cannot hold a `float` or a `bool`.

C# has no built-in closed union. The nearest shapes are an `object` that holds a boxed `long`, `double` or `string`, tested with `is`, or an abstract record with one subclass per case. Both put the value on the heap. Neither tells the compiler that there are exactly three cases.

### Asking what is inside

`index()` and `holds_alternative<T>` only ask ([C2](#c2)). The two `get` functions also hand out the value. They differ in what happens when the guess is wrong.

`std::get<T>(v)` returns a reference and throws `std::bad_variant_access` on a wrong guess ([C3](#c3)). It is the C# cast `(double)value`, which throws `InvalidCastException`. Use it where another alternative would be a bug.

`std::get_if<T>(&v)` returns a pointer, null on a wrong guess ([C4](#c4)). It is C#'s `value as double?`, or better, the type pattern `value is double real`, which tests and names the value in one go. In C++ the declaration goes into the `if`:

```cpp
if (const auto* real = std::get_if<double>(value)) std::cout << *real;
```

Inside the `if`, `real` is non-null and `*real` is the `double`. Outside it, `real` does not exist. Note that `get_if` takes a pointer to the variant. That fits `dump_steering`, which already has one from `find`. A null pointer goes in and a null pointer comes out, so a missing key and a wrong type both skip the branch.

PartonForge's `dump_steering` chains two `get_if`s and ends with a `get`:

```cpp
if (const auto* integer = std::get_if<long long>(value)) std::cout << *integer;
else if (const auto* real = std::get_if<double>(value)) std::cout << *real;
else std::cout << '\'' << std::get<std::string>(*value) << '\'';
```

After two failed guesses, only `std::string` is left. `get` says so: if a fourth alternative were ever added, this line would throw instead of printing nonsense.

### Changing what is inside

A variant always holds something ([C5](#c5)). A default-constructed one holds its first alternative, value-initialised. Assigning a value of another alternative destroys the old value and switches. There is no separate "set type" step.

Initialisation from a value picks the alternative the way a call picks an overload ([C6](#c6)). The C++20 rule adds one restriction: an alternative that would need a narrowing conversion is ignored. An `int` could become a `long long` or a `double`. The conversion to `double` counts as narrowing, so the `int` goes to `long long`. A string literal could become a `std::string`, or a `bool` through the pointer-to-`bool` conversion. Before C++20, `std::variant<bool, std::string> x = "text";` chose `bool`. That surprise was the motivation for the change.

### Visiting

A chain of `get_if`s works for a few alternatives. `std::visit` is the general tool ([C7](#c7)). It calls a function with the held value, already unpacked to its own type. With a generic lambda, the compiler builds one version of the body per alternative. A body that does not compile for one of them is a compile error. C#'s `switch` expression on a type only warns (CS8509) when it cannot see that every case is covered. On an `object` it can never see that, so it needs a `_` case.

### Why find returns a pointer

`Steering::find(key)` must give back the stored `Value` if the key is there and nothing if not ([C8](#c8)). Returning by value, `std::optional<Value>`, would copy a string each time. A reference cannot be empty, and `std::optional<const Value&>` does not compile in C++20: optional references arrive in C++26. A pointer can be null, refers to the stored value and costs nothing. That is the standard C++20 answer for "an optional reference", and the reason `find` returns `const Value*`. The caller must not keep the pointer longer than the `Steering` object lives.

## Examples

Asking, getting and switching ([C2](#c2) to [C5](#c5), [C7](#c7)):

```cpp
#include <iostream>
#include <string>
#include <variant>

using Value = std::variant<long long, double, std::string>;

void show(const Value& value) {
  if (const auto* integer = std::get_if<long long>(&value)) std::cout << "integer " << *integer;
  else if (const auto* real = std::get_if<double>(&value)) std::cout << "real " << *real;
  else std::cout << "text '" << std::get<std::string>(value) << '\'';
  std::cout << " (index " << value.index() << ")\n";
}

int main() {
  show(Value{100LL});
  show(Value{0.99999});
  show(Value{std::string("grid.dat")});

  Value value = 0.5;
  try {
    std::cout << std::get<long long>(value) << '\n';
  } catch (const std::bad_variant_access&) {
    std::cout << "bad_variant_access\n";
  }
  std::cout << std::boolalpha << std::holds_alternative<double>(value) << '\n';

  const Value* missing = nullptr;
  std::cout << (std::get_if<double>(missing) == nullptr) << '\n';   // a null pointer in, a null pointer out

  value = std::string("now text");                                   // assigning switches the alternative
  std::cout << value.index() << '\n';

  Value empty;                                                        // default: the first alternative, value-initialised
  std::cout << empty.index() << ' ' << std::get<long long>(empty) << '\n';

  std::visit([](const auto& held) { std::cout << "visit " << held << '\n'; }, value);
  std::cout << sizeof(std::string) << ' ' << sizeof(Value) << '\n';
}
```

Output on 64-bit Linux with GCC's standard library:

```text
integer 100 (index 0)
real 0.99999 (index 1)
text 'grid.dat' (index 2)
bad_variant_access
true
true
2
0 0
visit now text
32 40
```

Which alternative an initialiser picks ([C6](#c6)):

```cpp
#include <iostream>
#include <string>
#include <variant>

int main() {
  using Value = std::variant<long long, double, std::string>;
  int count = 5;
  Value from_int = count;          // int -> double would narrow, so long long is chosen
  Value from_double = 0.5;
  Value from_literal = "text";     // const char* -> std::string
  std::cout << from_int.index() << ' ' << from_double.index() << ' ' << from_literal.index() << '\n';

  std::variant<bool, std::string> flag_or_text = "text";   // C++20: std::string, not bool
  std::cout << flag_or_text.index() << '\n';
}
```

Output:

```text
0 1 2
1
```

Both snippets were compiled with GCC 13.3 and Clang 18.1 (`-std=c++20 -Wall -Wextra`) and gave the output shown.

## Pitfalls

- Passing the variant itself to `get_if`. It takes a pointer: `std::get_if<double>(&v)` ([C4](#c4)).
- Using `std::get` where another alternative is a normal case. It throws; `get_if` is the test ([C3](#c3)).
- Expecting a default-constructed variant to be empty. It holds its first alternative ([C5](#c5)).
- Assuming `Value v = 5;` could hold a `double`. It holds `long long` ([C6](#c6)).
- Keeping the pointer from `find` after the `Steering` object is gone. It dangles ([C8](#c8)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-11-08: the walkthrough of [PR 1](https://github.com/thomaswening/PartonForge/pull/1), [`dump_steering`](https://github.com/thomaswening/PartonForge/blob/56b51e6d0d0d3f2c8c4b2b67de40aaa8c469347a/apps/pf_grid.cpp#L57-L68) in `apps/pf_grid.cpp`, [`Steering::Value` and `find`](https://github.com/thomaswening/PartonForge/blob/56b51e6d0d0d3f2c8c4b2b67de40aaa8c469347a/include/partonforge/steering.hpp#L23-L31) and the [typed accessors](https://github.com/thomaswening/PartonForge/blob/56b51e6d0d0d3f2c8c4b2b67de40aaa8c469347a/src/steering.cpp#L167-L194).
- cppreference: [`std::variant`](https://en.cppreference.com/w/cpp/utility/variant), [its converting constructor](https://en.cppreference.com/w/cpp/utility/variant/variant), [`std::get_if`](https://en.cppreference.com/w/cpp/utility/variant/get_if), [`std::get`](https://en.cppreference.com/w/cpp/utility/variant/get), [`std::visit`](https://en.cppreference.com/w/cpp/utility/variant/visit), [`std::optional`](https://en.cppreference.com/w/cpp/utility/optional).
- [P0608R3](https://wg21.link/P0608R3), "A sane variant converting constructor", the C++20 change behind C6.
- C#: [type-testing operators and patterns](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns).
