---
title: enum and enum class
area: cpp
created: 2026-10-29
updated: 2026-10-29
prerequisites: []
related: [cpp/integer-types, cpp/static-analysis]
projects: [partonforge]
tags: [cpp, enum, enum-class, scoped-enumeration, underlying-type, switch, wswitch, using-enum]
---

# enum and enum class

## TL;DR

- C++ has two kinds of enumeration. The plain `enum` comes from C. `enum class` (a *scoped* enumeration) was added in C++11.
- A plain `enum` puts its names into the surrounding scope and converts to `int` on its own. An `enum class` keeps its names inside (`Light::Red`) and converts only with a cast.
- A C# `enum` behaves like `enum class`. The word `class` here only means "scoped": an `enum class` has no members or methods.
- An `enum class` can hold any value of its underlying type, `int` by default, including values that match no enumerator.
- C++20 cannot count an enumeration's values or list their names. A last enumerator `Count` is the usual workaround.
- `-Wswitch`, part of `-Wall`, warns about a `switch` that misses an enumerator, unless it has a `default`.

## Key claims

- <a id="c1"></a>**C1.** The enumerators of a plain (unscoped) `enum` are declared in the enclosing scope, so two unscoped enumerations in the same scope cannot both have an enumerator `Red`, and `Red` can clash with a variable or function of that name.
- <a id="c2"></a>**C2.** The enumerators of an `enum class` are declared only inside the enumeration and must be written qualified, as `Light::Red`; two `enum class` types may use the same enumerator names.
- <a id="c3"></a>**C3.** An unscoped enumerator converts implicitly to an integer, so `int shade = Green;` compiles; an `enum class` value does not, so `int signal = Light::Amber;` is an error and needs `static_cast<int>(Light::Amber)`. The other direction, integer to enumeration, needs a `static_cast` for both kinds.
- <a id="c4"></a>**C4.** An `enum class` always has a fixed underlying type, `int` unless another is given as in `enum class Kind : std::uint8_t`; a value of that type converted with `static_cast` is a valid value of the enumeration even if no enumerator has it.
- <a id="c5"></a>**C5.** A C# `enum` corresponds to `enum class`: its members are written qualified, and conversion to and from the underlying type needs an explicit cast (except the constant `0`, which converts implicitly to any C# enum). C# can also hold values that match no member.
- <a id="c6"></a>**C6.** C++20 has no way to ask an enumeration how many enumerators it has or what they are called, unlike C#'s `Enum.GetValues` and `Enum.GetNames`. A common workaround is a last enumerator, often `Count`, whose value is the number of enumerators before it.
- <a id="c7"></a>**C7.** GCC and Clang warn with `-Wswitch` (part of `-Wall`) when a `switch` over an enumeration has no `case` for some enumerator and no `default` label; a `default` label silences the warning.
- <a id="c8"></a>**C8.** C++20's `using enum Light;` makes the enumerators of `Light` usable without qualification in the current scope, for example inside a `switch`.

## Explanation

### Two kinds, one keyword

C's `enum` is a list of named integer constants. The names live in the surrounding scope ([C1](#c1)), as if each were declared on its own. Two enumerations that both want a `Red` collide, and so does any variable called `Red`. The names also turn into integers wherever an integer fits ([C3](#c3)). `Colour::Red + 1` compiles and means 1.

C++11 added `enum class` to fix both ([C2](#c2), [C3](#c3)). The names belong to the enumeration, so `Light::Red` and `Colour::Red` can coexist. And a `Light` is a type of its own: comparing it with an `int`, or passing it where an `int` is expected, needs a visible `static_cast`. The keyword `class` was reused only to say "scoped". There are no methods.

In C# terms, `enum class` is the enum you know ([C5](#c5)). The plain `enum` has no C# counterpart. The [C++ Core Guidelines (Enum.3)](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#enum3-prefer-class-enums-over-plain-enums) recommend `enum class` for new code.

### Underlying type and values without a name

Every enumeration is stored as some integer type. For `enum class` that type is fixed: `int`, or whatever the declaration names ([C4](#c4)). Any value of that type can be stored, through a `static_cast`, even one that no enumerator names. `static_cast<Light>(7)` is a valid `Light`. A `switch` that handles every named case can still be reached with such a value, so code after the `switch` needs a fallback. C# has the same property: `(DayOfWeek)42` is a valid `DayOfWeek`.

### Counting enumerators

C# can list an enum's members at run time. C++20 cannot ([C6](#c6)). Code that needs the number, for example to size an array with one counter per kind, either writes it by hand or adds a sentinel:

```cpp
enum class Kind { RandomBits, LogUniform, Special, Count };
constexpr std::size_t kKinds = static_cast<std::size_t>(Kind::Count);   // 3
```

The sentinel updates itself when a kind is added before it. A hand-written constant does not, and a forgotten update goes unnoticed. The price is that `Count` is a value of `Kind` that is not a real kind, so a `switch` must handle it too. C++26 adds reflection, which can list enumerators.

### switch and the compiler's help

A `switch` over an enumeration without a `default` gets checked by the compiler ([C7](#c7)). Add an enumerator, and every `switch` that misses it gets a warning. A `default` label turns that check off, because the compiler can no longer tell a forgotten case from a deliberate one. For an enumeration that will grow, listing every case and putting the fallback *after* the `switch` keeps the warning working.

Inside such a `switch`, `using enum Light;` saves writing `Light::` on every label ([C8](#c8)).

## Examples

Scoping and conversions:

```cpp
#include <cstddef>
#include <iostream>

enum Colour { Red, Green };                  // unscoped: Red and Green join the enclosing scope
enum class Light { Red, Amber, Green };      // scoped: Light::Red, Light::Amber, Light::Green

int main() {
    int shade = Green;                       // unscoped converts to int on its own
    // int signal = Light::Amber;            // error: no implicit conversion
    const int signal = static_cast<int>(Light::Amber);
    const auto light = static_cast<Light>(2); // int to enum always needs a cast
    std::cout << shade << ' ' << signal << ' ' << (light == Light::Green) << '\n';
}
```

Expected output:

```
1 1 1
```

Two unscoped enumerations with the same names do not compile:

```cpp
enum Colour { Red, Green };
enum Light { Red, Amber, Green };   // error: Red and Green are already declared
```

A sentinel for the count, and a value no enumerator names:

```cpp
#include <cstddef>
#include <iostream>

enum class Kind { RandomBits, LogUniform, Special, Count };   // Count is not a kind: it counts them
constexpr std::size_t kKinds = static_cast<std::size_t>(Kind::Count);

const char* name(Kind kind) {
    switch (kind) {
        case Kind::RandomBits: return "random-bits";
        case Kind::LogUniform: return "log-uniform";
        case Kind::Special:    return "special";
        case Kind::Count:      break;
    }
    return "?";                              // reached by Count and by unnamed values
}

int main() {
    std::cout << kKinds << ' ' << name(static_cast<Kind>(1)) << ' ' << name(static_cast<Kind>(7)) << '\n';
}
```

Expected output:

```
3 log-uniform ?
```

Leave out `case Kind::Count:` and GCC and Clang both warn: `enumeration value 'Count' not handled in switch [-Wswitch]`.

`using enum` in a `switch`:

```cpp
#include <iostream>

enum class Light { Red, Amber, Green };

const char* say(Light light) {
    using enum Light;                        // C++20: Red, Amber, Green usable unqualified here
    switch (light) {
        case Red:   return "stop";
        case Amber: return "wait";
        case Green: return "go";
    }
    return "?";
}

int main() { std::cout << say(Light::Amber) << '\n'; }
```

Expected output:

```
wait
```

## Pitfalls

- Reading `enum class` as "a class with an enum inside". It is just a scoped enumeration ([C2](#c2)).
- Assuming a `switch` that covers every enumerator covers every value. `static_cast` can produce values no enumerator names ([C4](#c4)).
- Keeping an enumerator count in a separate constant. Adding a value without updating it goes unnoticed ([C6](#c6)).
- Adding `default:` to a `switch` over an enumeration that will grow. It switches off the warning that would find the missing case ([C7](#c7)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-28: the walkthrough of `tests/test_gfortran_diff.cpp` in [PR 1](https://github.com/thomaswening/PartonForge/pull/1) (`enum class ValueKind` and the hand-written `kValueKinds`).
- cppreference: [enumeration declaration](https://en.cppreference.com/w/cpp/language/enum) (scoped, unscoped, fixed underlying type, `using enum`).
- C++ Core Guidelines: [Enum.3, prefer class enums over plain enums](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#enum3-prefer-class-enums-over-plain-enums).
- GCC: [`-Wswitch`](https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html#index-Wswitch).
- C#: [enumeration types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/enum).
