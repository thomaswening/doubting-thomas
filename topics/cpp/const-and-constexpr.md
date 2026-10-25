---
title: const and constexpr
area: cpp
created: 2026-10-25
updated: 2026-10-25
prerequisites: [cpp/references]
related: [c/pointer-declarator-syntax, cpp/linkage-and-storage-duration]
projects: [partonforge]
tags: [cpp, const, constexpr, readonly, constant-expression, member-function]
---

# const and constexpr

## TL;DR

- `const` on a variable means it cannot be changed after it is initialised. Its value may come from the running program. It is C#'s `readonly`.
- `constexpr` on a variable means its value is computed by the compiler. Only such values can size an array or fill a template argument. It is C#'s `const`.
- A `constexpr` variable is also `const`. The reverse holds only for integer `const`s initialised with a compile-time value, which is why older code got away with `const int` for sizes.
- `const` after a member function's parameter list, as in `bool identical() const`, promises that the function does not change its object. Only such functions can be called on a `const` object or through a `const` reference.
- `const` on a returned value of a built-in type, as in `const bool f()`, means nothing. gcc warns about it.

## Key claims

- <a id="c1"></a>**C1.** A `const` variable must be initialised and can never be modified afterwards, but its initial value may be known only at run time: `const int count = argc;` is valid.
- <a id="c2"></a>**C2.** A `constexpr` variable must be initialised with a constant expression, which the compiler evaluates during compilation; every `constexpr` variable is implicitly `const`.
- <a id="c3"></a>**C3.** Only constant expressions may be used where the compiler needs a value, such as an array size or a template argument (`std::array<char, N>`). A `constexpr` variable can always be used in a constant expression. A `const` variable can be used in one only if it has integral or enumeration type and was initialised with a constant expression: `const int n = 5;` qualifies, `const double d = 2.5;` does not.
- <a id="c4"></a>**C4.** C++'s `const` variable corresponds to C#'s `readonly` (fixed after initialisation, value possibly computed at run time), and C++'s `constexpr` variable to C#'s `const` (value fixed at compile time).
- <a id="c5"></a>**C5.** A member function declared with `const` after its parameter list, such as `int get() const;`, may not modify the object's data members (other than those declared `mutable`), and it is the only kind of member function that can be called on a `const` object or through a `const T&` or `const T*`.
- <a id="c6"></a>**C6.** `const` on a return type returned by value has no effect for built-in types: `const bool f();` returns a plain `bool` that the caller may copy into a non-const variable. gcc warns with `-Wignored-qualifiers`, which `-Wextra` enables.
- <a id="c7"></a>**C7.** In `constexpr const char* names[] = {"g", "u"};` the `constexpr` applies to the array variable `names`, making it and its elements constant, while the `const` in `const char*` belongs to the element type and makes the characters the pointers point to read-only.

## Explanation

### Two questions about a variable

A constant can answer two separate questions. May it change after it is created? And is its value known before the program runs?

`const` answers only the first ([C1](#c1)). A `const` variable is set once, from anything, including a value computed at run time, and never changes. That is exactly C#'s `readonly` ([C4](#c4)).

`constexpr` answers both ([C2](#c2)). Its value is computed by the compiler, so it is fixed before the program starts. And since a value known at compile time cannot change, a `constexpr` variable is `const` too. That is C#'s `const`.

### Why the compiler cares

Some places in C++ need a value while compiling, because the value decides the program's layout: the size of an array, the `N` in `std::array<char, N>`, a `case` label. Only a *constant expression* may appear there ([C3](#c3)).

A `constexpr` variable always qualifies. A `const` variable usually does not, because its value might come from the running program. C++ keeps one historical exception from before `constexpr` existed: a `const` integer initialised with a compile-time value is itself usable as a constant. So `const int kColumns = 26;` can size an array, but `const double kHalf = 0.5;` cannot be used in another constant. Modern code writes `constexpr` for every compile-time constant, so that nobody has to remember the exception.

### const member functions

A member function can promise not to change its object by writing `const` after its parameter list ([C5](#c5)). Inside it, the object's members are read-only. The compiler then lets you call it on a `const` object, or through a `const` reference ([references](references.md)). A function without the promise cannot be called there, because it might change the object.

C# has the same idea in `readonly` members of a struct. In C++ it matters far more, because passing objects by `const&` is the normal way to pass them. A getter that forgets its `const` cannot be called on such an argument.

### What const does not do

`const` on a value that is returned by copy changes nothing ([C6](#c6)). The caller gets its own copy and may do what it likes with it. gcc warns that the qualifier is ignored.

`const` inside a pointer type follows the reading rules of [where the * goes](../c/pointer-declarator-syntax.md#c6). `constexpr` is different: it is not part of the type, it applies to the variable being declared ([C7](#c7)).

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
    // std::array<char, count> bad{};     // error: count is not a constant expression

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
    // counter.bump();                  // error: bump() is not const
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

## Pitfalls

- Writing `const` where a compile-time value is needed, then being surprised that it works for `int` and fails for `double` ([C3](#c3)). Write `constexpr`.
- Forgetting `const` on a member function that only reads. It then cannot be called on a `const` argument, and the error appears far from the function ([C5](#c5)).
- Reading `const bool identical()` as "a function that doesn't change the object". That promise is the `const` *after* the parameters; the one before the return type does nothing ([C6](#c6)).
- Assuming `const` means "known at compile time", as C#'s `const` does. In C++, that is `constexpr` ([C4](#c4)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-25: Thomas's review of [PR 1](https://github.com/thomaswening/PartonForge/pull/1), on `constexpr size_t kHeaderLines`, `constexpr const char*` and `bool identical() const` in `grid_diff`.
- [cppreference: `constexpr` specifier](https://en.cppreference.com/w/cpp/language/constexpr), [cv qualifiers](https://en.cppreference.com/w/cpp/language/cv), [constant expressions](https://en.cppreference.com/w/cpp/language/constant_expression) (usable in constant expressions), [const member functions](https://en.cppreference.com/w/cpp/language/member_functions#const-_and_volatile-qualified_member_functions).
