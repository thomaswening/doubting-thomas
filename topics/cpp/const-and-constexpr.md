---
title: const and constexpr
area: cpp
created: 2026-10-25
updated: 2026-11-10
prerequisites: [cpp/references]
related: [c/pointer-declarator-syntax, cpp/linkage-and-storage-duration, cpp/arrays-and-containers]
projects: [partonforge]
tags: [cpp, const, constexpr, readonly, constant-expression, member-function, constexpr-function, string-view]
---

# const and constexpr

## TL;DR

- `const` on a variable means it cannot be changed after it is initialised. Its value may come from the running program. It is C#'s `readonly`.

- `constexpr` on a variable means its value is computed by the compiler. Only such values can size an array or fill a template argument. It is C#'s `const`.

- A `constexpr` variable is also `const`. The reverse holds only for integer `const`s initialised with a compile-time value, which is why older code got away with `const int` for sizes.

- `const` after a member function's parameter list, as in `bool identical() const`, promises that the function does not change its object. Only such functions can be called on a `const` object or through a `const` reference.

- `const` on a returned value of a built-in type, as in `const bool f()`, means nothing. gcc warns about it.
- A `constexpr` function can be run by the compiler when its arguments are constants. Otherwise it runs like any function.
- A `std::vector` or a long `std::string` cannot be a `constexpr` variable. A fixed list of names is a `constexpr std::array<std::string_view, N>`.

## Key claims

- <a id="c1"></a>**C1.** A `const` variable must be initialised and can never be modified afterwards, but its initial value may be known only at run time: `const int count = argc;` is valid.

- <a id="c2"></a>**C2.** A `constexpr` variable must be initialised with a constant expression, which the compiler evaluates during compilation; every `constexpr` variable is implicitly `const`.

- <a id="c3"></a>**C3.** Only constant expressions may be used where the compiler needs a value, such as an array size or a template argument (`std::array<char, N>`). A `constexpr` variable can always be used in a constant expression. A `const` variable can be used in one only if it has integral or enumeration type and was initialised with a constant expression: `const int n = 5;` qualifies, `const double d = 2.5;` does not.

- <a id="c4"></a>**C4.** C++'s `const` variable corresponds to C#'s `readonly` (fixed after initialisation, value possibly computed at run time), and C++'s `constexpr` variable to C#'s `const` (value fixed at compile time).

- <a id="c5"></a>**C5.** A member function declared with `const` after its parameter list, such as `int get() const;`, may not modify the object's data members (other than those declared `mutable`), and it is the only kind of member function that can be called on a `const` object or through a `const T&` or `const T*`.

- <a id="c6"></a>**C6.** `const` on a return type returned by value has no effect for built-in types: `const bool f();` returns a plain `bool` that the caller may copy into a non-const variable. gcc warns with `-Wignored-qualifiers`, which `-Wextra` enables.

- <a id="c7"></a>**C7.** In `constexpr const char* names[] = {"g", "u"};` the `constexpr` applies to the array variable `names`, making it and its elements constant, while the `const` in `const char*` belongs to the element type and makes the characters the pointers point to read-only.
- <a id="c8"></a>**C8.** A `constexpr` function may be called in a constant expression, such as the initialiser of a `constexpr` variable, when all its arguments are constant expressions; the compiler then evaluates the call. Called with a value known only at run time, it runs as an ordinary function. So `constexpr` on a function means "can be computed at compile time", not "is always".
- <a id="c9"></a>**C9.** Inside a `constexpr` function, a local variable computed from a parameter cannot itself be `constexpr`, because the parameter is not a constant expression: `constexpr int twice(int x) { constexpr int y = 2 * x; return y; }` does not compile.
- <a id="c10"></a>**C10.** Memory allocated during a constant evaluation must be freed before the evaluation ends (C++20). So a `std::vector` that holds elements cannot be a `constexpr` variable, while a `constexpr` function may use a local `std::vector` that is destroyed before it returns.
- <a id="c11"></a>**C11.** Whether a `std::string` can be a `constexpr` variable depends on the standard library: GCC 13's library accepts a short one such as `"ab"`, which fits its small-string buffer without allocating, and rejects a long one. A list of names fixed at compile time is therefore written `constexpr std::array<std::string_view, N>`, whose `std::string_view` elements point into the string literals and allocate nothing.

## Explanation

### Two questions about a variable

A constant can answer two separate questions. May it change after it is created? And is its value known before the program runs?

`const` answers only the first ([C1](#c1)). A `const` variable is set once, from anything, including a value computed at run time, and never changes. That is exactly C#'s `readonly` ([C4](#c4)).

`constexpr` answers both ([C2](#c2)). Its value is computed by the compiler, so it is fixed before the program starts. And since a value known at compile time cannot change, a `constexpr` variable is `const` too. That is C#'s `const`.

### Why the compiler cares

Some places in C++ need a value while compiling, because the value decides the program's layout: the size of an array, the `N` in `std::array<char, N>`, a `case` label. Only a *constant expression* may appear there ([C3](#c3)).

A `constexpr` variable always qualifies. A `const` variable usually does not, because its value might come from the running program. C++ keeps one historical exception from before `constexpr` existed: a `const` integer initialised with a compile-time value is itself usable as a constant. So `const int kColumns = 26;` can size an array, but `const double kHalf = 0.5;` cannot be used in another constant. Modern code writes `constexpr` for every compile-time constant, so that nobody has to remember the exception.

### const member functions

A member function can promise not to change its object by writing `const` after its parameter list ([C5](#c5)). Inside it, the object's members are read-only. The compiler then lets you call it on a `const` object, or through a `const` reference ([references](references.md)). A function without the promise cannot be called there, because it might change the object. What counts is the object the function is called on, not the function that makes the call: in `void show(const Counter& counter)`, `show` itself is not a member function, but `counter` is `const`, so `counter.bump()` is refused.

C# has the same idea in `readonly` members of a struct. In C++ it matters far more, because passing objects by `const&` is the normal way to pass them. A getter that forgets its `const` cannot be called on such an argument.

### What const does not do

`const` on a value that is returned by copy changes nothing ([C6](#c6)). The caller gets its own copy and may do what it likes with it. gcc warns that the qualifier is ignored.

`const` inside a pointer type follows the reading rules of [where the * goes](../c/pointer-declarator-syntax.md#c6). `constexpr` is different: it is not part of the type, it applies to the variable being declared ([C7](#c7)).

### constexpr functions

A function marked `constexpr` makes a weaker promise than a `constexpr` variable. It says the compiler *can* compute a call, not that it always does ([C8](#c8)). Where a constant expression is needed and the arguments are constants, the compiler runs the function while compiling. Anywhere else it is an ordinary function. C# has no counterpart: its `const` takes only literals and other constants, never a method call.

So one function serves both uses. `fields_per_row(GridKind::Tmd)` can size an array. `fields_per_row(kind)`, with a `kind` read from a file, works at run time. The price is that the body may only do what the compiler can do while compiling. Inside the body, a parameter is not a constant, because the same body must also work when it is called at run time. A local computed from it cannot be `constexpr` either ([C9](#c9)). It can be a plain `const`.

### Containers at compile time

C++20 lets a constant evaluation allocate memory, on one condition: it must free that memory before it ends ([C10](#c10)). A `constexpr` function may therefore build a `std::vector` to compute a result, as long as the vector is gone when the function returns. A `constexpr` *variable* of type `std::vector` with elements is impossible. Its memory would have to survive into the running program, and memory from the compiler's evaluation cannot.

`std::string` is the same with a twist ([C11](#c11)). Many libraries store a short string inside the string object itself, in a small buffer, and allocate only for longer ones. GCC 13's library therefore accepts `constexpr std::string s = "ab";` but rejects a long string. That depends on the library, so portable code does not rely on it.

The portable form of a fixed list of names is a `std::array` of `std::string_view`. A `std::string_view` is a pointer and a length that view characters stored elsewhere, like C#'s `ReadOnlySpan<char>`. It owns nothing and allocates nothing. Pointed at string literals, which live for the whole program, it is safe to keep. `std::to_array` (C++20) counts the elements, so the size need not be written out:

```cpp
constexpr auto kKnownKeys = std::to_array<std::string_view>({"output", "Ipdf", "q_g"});
```

## Examples

A compile-time and a run-time constant, compiled with `g++ -std=c++20` and run without arguments:

```cpp
#include <array>
#include <iostream>

constexpr int kColumns = 26;     // computed by the compiler

int main(int argc, char** argv) {
    const int count = argc;      // fixed from now on, but known only at run time

    // std::array<T, N> is a fixed-size array whose size N is part of its type,
    // so N must be a constant expression.
    std::array<char, kColumns> field{};   // OK: kColumns is constexpr
    // std::array<char, count> bad{};     // error: count is a const int, but its initialiser
    //                                    // argc is known only at run time (C3)

    std::cout << field.size() << ' ' << count << '\n';
}
```

Output:

```text
26 1
```

A `const` member function, called through a `const` reference:

```cpp
#include <iostream>

struct Counter {
    int value = 0;
    int get() const { return value; }   // promises not to change the Counter
    void bump() { ++value; }            // no promise
};

void show(const Counter& counter) {
    std::cout << counter.get() << '\n'; // OK
    // counter.bump();                  // error: counter is a const reference, so only
    //                                  // const member functions may be called on it
}

int main() {
    Counter c;
    c.bump();
    show(c);
}
```

Output:

```text
1
```

From the review of [PartonForge](https://github.com/thomaswening/PartonForge) PR 1, the line that prompted [C7](#c7):

```cpp
constexpr const char* kSpeciesNames[18] = {"tbar", "bbar", /* ... */ "H"};
```

`kSpeciesNames` is an array of 18 pointers. Each points to a string literal whose characters are read-only (`const char`). The `constexpr` makes the array itself a compile-time constant, so its pointers cannot be changed either.

A `constexpr` function used at compile time and at run time, and a fixed list of names, compiled with `g++ -std=c++20` and run without arguments:

```cpp
#include <array>
#include <iostream>
#include <string_view>

enum class Kind { Integrated, Tmd };

constexpr int fields_per_row(Kind kind) {
    const int coordinate_count = kind == Kind::Tmd ? 3 : 2;   // const, not constexpr (C9)
    return coordinate_count + 18;
}

// A list fixed at compile time, without allocation (C11).
constexpr auto kKeys = std::to_array<std::string_view>({"output", "Ipdf", "q_g"});

int main(int argc, char**) {
    std::array<double, fields_per_row(Kind::Tmd)> row{};      // computed by the compiler (C8)
    const Kind kind = argc > 1 ? Kind::Tmd : Kind::Integrated;
    std::cout << row.size() << ' ' << fields_per_row(kind) << ' ' << kKeys.size() << '\n';  // at run time

    // constexpr int fields = fields_per_row(kind);  // error: kind is known only at run time (C8)
}
```

Output:

```text
21 20 3
```

A `std::vector` inside a `constexpr` function, and as a `constexpr` variable:

```cpp
#include <vector>

constexpr int count() {
    std::vector<int> values = {1, 2, 3};    // allocated and freed during the evaluation (C10)
    return static_cast<int>(values.size());
}

constexpr int kCount = count();             // OK: 3
// constexpr std::vector<int> kValues = {1, 2, 3};  // error: the memory would outlive the evaluation (C10)

int main() { return kCount == 3 ? 0 : 1; }
```

This compiles and exits with 0.

## Pitfalls

- Writing `const` where a compile-time value is needed, then being surprised that it works for `int` and fails for `double` ([C3](#c3)). Write `constexpr`.

- Forgetting `const` on a member function that only reads. It then cannot be called on a `const` argument, and the error appears far from the function ([C5](#c5)).

- Reading `const bool identical()` as "a function that doesn't change the object". That promise is the `const` *after* the parameters; the one before the return type does nothing ([C6](#c6)).

- Assuming `const` means "known at compile time", as C#'s `const` does. In C++, that is `constexpr` ([C4](#c4)).
- Reading `constexpr` on a function as a guarantee that it runs at compile time. It only can ([C8](#c8)). C++20's `consteval` is the keyword for a function that must.
- Writing `static const std::vector<std::string> kNames = {...};` for a list known at compile time. It allocates on first use. `constexpr std::array<std::string_view, N>` does not ([C10](#c10), [C11](#c11)).
- Keeping a `std::string_view` to a temporary `std::string`. The view points at characters the string owns, and they disappear with it. Views of string literals are safe, because literals live for the whole program ([C11](#c11)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-25: Thomas's review of [PR 1](https://github.com/thomaswening/PartonForge/pull/1), on `constexpr size_t kHeaderLines`, `constexpr const char*` and `bool identical() const` in `grid_diff`.
- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-11-10: Thomas's review of [PR 6](https://github.com/thomaswening/PartonForge/pull/6), asking why `fields_per_row` ([comment](https://github.com/thomaswening/PartonForge/pull/6#discussion_r4524341850)) and the list of steering keys ([comment](https://github.com/thomaswening/PartonForge/pull/6#discussion_r4524546422)) were not `constexpr`.
- [cppreference: `constexpr` specifier](https://en.cppreference.com/w/cpp/language/constexpr), [cv qualifiers](https://en.cppreference.com/w/cpp/language/cv), [constant expressions](https://en.cppreference.com/w/cpp/language/constant_expression) (usable in constant expressions, and transient allocation), [`std::to_array`](https://en.cppreference.com/w/cpp/container/array/to_array), [`std::basic_string_view`](https://en.cppreference.com/w/cpp/string/basic_string_view), [const member functions](https://en.cppreference.com/w/cpp/language/member_functions#const-_and_volatile-qualified_member_functions).
