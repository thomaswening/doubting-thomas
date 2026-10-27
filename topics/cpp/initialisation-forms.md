---
title: Initialisation forms
area: cpp
created: 2026-10-26
updated: 2026-10-26
prerequisites: []
related: [cpp/constructors, cpp/static-analysis]
projects: [partonforge]
tags: [cpp, initialisation, braces, narrowing, initializer-list, value-initialisation, most-vexing-parse]
---

# Initialisation forms

## TL;DR

- C++ can initialise a variable with `=`, with parentheses `( )` or with braces `{ }`. They mostly do the same thing, but not always.
- Braces reject **narrowing** conversions, such as `double` to `int`. `=` and parentheses accept them silently, unlike C#, which refuses them at compile time.
- `T name{};` gives zero or an empty object. `T name;` for a built-in type such as `int` leaves the value **indeterminate**. C# would not compile a read of such a local.
- For a container, braces mean "these elements": `std::vector<int>{3}` holds one element, the 3. `std::vector<int>(3)` holds three zeros.
- GCC only warns about narrowing from a variable in braces. Use `-pedantic-errors` or `-Werror=narrowing` to make it the error the standard requires.

## Key claims

- <a id="c1"></a>**C1.** A narrowing conversion is an implicit conversion that can lose information: floating point to integer, `double` to `float`, or an integer to a type that cannot hold all its values. The exception is a constant whose value fits in the target, such as `char letter{65};`.
- <a id="c2"></a>**C2.** The standard makes a narrowing conversion inside braces ill-formed, so `int count{3.7};` does not compile. `int count = 3.7;` and `int count(3.7);` compile and store 3.
- <a id="c3"></a>**C3.** GCC rejects narrowing in braces only when the value is a constant. For a variable, as in `int truncated{measured};`, it only gives a `-Wnarrowing` warning, which is on by default. `-pedantic-errors` or `-Werror=narrowing` makes it an error.
- <a id="c4"></a>**C4.** With `=`, GCC does not warn about a narrowing conversion such as `int truncated = measured;` even with `-Wall -Wextra`. Only `-Wconversion` reports it.
- <a id="c5"></a>**C5.** `T name{};` value-initialises. A built-in type becomes zero. A class with a default constructor gets that constructor. `T name;` default-initialises: a local of a built-in type then has an indeterminate value. Reading that value is undefined behaviour up to C++23. C++26 calls it erroneous behaviour instead.
- <a id="c6"></a>**C6.** When a class has a constructor taking a `std::initializer_list`, braces prefer that constructor. So `std::vector<int>{3, 5}` holds the two elements 3 and 5, while `std::vector<int>(3, 5)` holds three fives.
- <a id="c7"></a>**C7.** `std::string text();` declares a function named `text` that returns a `std::string`. It does not declare an empty string. This is the "most vexing parse". `std::string text{};` and `std::string text;` both declare an empty string.
- <a id="c8"></a>**C8.** Since C++17, `auto count{3};` deduces `int`, while `auto count = {3};` deduces `std::initializer_list<int>`.
- <a id="c9"></a>**C9.** C# refuses an implicit narrowing conversion such as `int truncated = 3.7;` (error CS0266) and the use of a local that was never assigned (error CS0165). C++ refuses neither for `=` or `T name;`.

## Explanation

### Three spellings

C# has one way to initialise a local: `var count = 3;` or `int count = 3;`. C++ inherited `=` from C, added parentheses for constructor calls, and added braces in C++11 as a "uniform" form. For a class type, all three usually call the same constructor (the constructors note, in review as [PR #11](https://github.com/thomaswening/doubting-thomas/pull/11)). For built-in types, the difference is what they let through.

### Narrowing

A narrowing conversion can lose information ([C1](#c1)): `3.7` becomes `3`, or a large `long long` loses its high bits. C# refuses these unless you write a cast ([C9](#c9)). C++ accepts them with `=` and parentheses, because C did. Braces restore the C# behaviour: the standard makes narrowing inside braces ill-formed ([C2](#c2)).

There is one exception. A constant whose value fits in the target is fine, because nothing is lost: `char letter{65};` is the letter A.

Compilers do not all enforce this equally. GCC treats a constant like `3.7` as an error. For a variable it only warns ([C3](#c3)), so a build that ignores warnings lets the narrowing through. With `=`, GCC says nothing even with `-Wall -Wextra` ([C4](#c4)). That is one reason projects compile with `-Werror` ([static analysis](static-analysis.md)).

### Zero or nothing

C# zeroes fields. It refuses to compile a read of a local that was never assigned. C++ does neither for a local of a built-in type: `int count;` has whatever bits were on the stack ([C5](#c5)). Reading it is undefined behaviour, the class of bug that [sanitizers](sanitizers.md) catch. Empty braces fix it: `int count{};` is 0, `double sum{};` is 0.0, `std::string name{};` is empty.

### Braces and containers

Braces have a second meaning for types that take a list of elements. If a class has a constructor taking `std::initializer_list<T>`, a brace initialiser goes to it whenever it can ([C6](#c6)). For `std::vector` that turns `{3}` into "one element, 3", where `(3)` means "size 3". This is the one place where parentheses are needed. A comment saying so helps the next reader.

### Why braces help elsewhere

Parentheses with nothing inside them are read as a function declaration whenever that is possible ([C7](#c7)). Braces cannot be read that way. `auto` with braces has its own small trap ([C8](#c8)), so `auto` usually goes with `=`.

### A rule that follows from this

[Thomas's coding guideline](https://github.com/thomaswening/claude-config/blob/main/skills/coding-guideline/references/cpp.md) uses `const auto name = expression;` when the expression already has the right type. It uses `Type name{arguments};` when constructing or converting, and `Type name{};` to start from zero. Parentheses are only for container sizes.

## Examples

What each form stores (GCC 13, `-std=c++20`):

```cpp
#include <iostream>
#include <vector>

int main() {
    const int from_equals = 3.7;      // copies, then silently truncates to 3
    const int from_parentheses(3.7);  // the same: truncates to 3
    const int zero{};                 // value-initialised: 0
    const char letter{65};            // constant that fits in a char: allowed

    std::vector<int> three_zeros(3);  // constructor taking a size
    std::vector<int> one_three{3};    // initializer_list: the elements themselves
    std::vector<int> two_elements{3, 5};
    std::vector<int> three_fives(3, 5);

    std::cout << from_equals << ' ' << from_parentheses << ' ' << zero << ' ' << letter << '\n'
              << three_zeros.size() << ' ' << one_three.size() << ' '
              << two_elements.size() << ' ' << three_fives.size() << '\n';
}
```

Expected output:

```text
3 3 0 A
3 1 2 3
```

What GCC says about narrowing in braces:

```cpp
int main() {
    const int braces{3.7};   // a constant: error
    double measured = 2.5;
    int truncated{measured}; // a variable: only a warning, unless -pedantic-errors
    return braces + truncated;
}
```

Expected output with `g++ -std=c++20` (shortened):

```text
error: narrowing conversion of '3.7000000000000002e+0' from 'double' to 'int' [-Wnarrowing]
warning: narrowing conversion of 'measured' from 'double' to 'int' [-Wnarrowing]
```

The same in C#, where both lines fail:

```csharp
int truncated = 3.7;      // error CS0266: Cannot implicitly convert type 'double' to 'int'
int unset;
Console.WriteLine(unset); // error CS0165: Use of unassigned local variable 'unset'
```

## Pitfalls

- Reading "braces forbid narrowing" as "my compiler will stop me". GCC only warns for a variable ([C3](#c3)).
- Writing `std::vector<int> values{count};` to make `count` zeros. It makes one element, the value of `count` ([C6](#c6)).
- Writing `Widget widget();` to call the default constructor. It declares a function ([C7](#c7)).
- Assuming `int total;` starts at 0 because a C# field would ([C5](#c5)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge) and [claude-config PR #9](https://github.com/thomaswening/claude-config/pull/9), 2026-10-25, choosing the initialisation rule for the C++ coding guideline.
- [cppreference: list-initialisation](https://en.cppreference.com/w/cpp/language/list_initialization) (narrowing, `initializer_list` preference), [value-initialisation](https://en.cppreference.com/w/cpp/language/value_initialization), [default-initialisation](https://en.cppreference.com/w/cpp/language/default_initialization).
- [P2795, erroneous behaviour for uninitialised reads](https://wg21.link/p2795), adopted for C++26.
- [C++ Core Guidelines, ES.23: prefer the `{}` initialiser syntax](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Res-list).
- [GCC warning options: `-Wnarrowing`, `-Wconversion`](https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html).
