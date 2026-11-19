---
title: Three-way comparison (operator<=>)
area: cpp
created: 2026-11-12
updated: 2026-11-12
prerequisites: [cpp/constructors, cpp/references]
related: [cpp/pimpl, cpp/copy-and-move]
projects: [tante]
tags: [cpp, cpp20, operator-overloading, spaceship-operator, three-way-comparison, strong-ordering, weak-ordering, partial-ordering, icomparable]
---

# Three-way comparison (`operator<=>`)

## TL;DR

- C++20's `a <=> b` (the "spaceship operator") answers less, equal or greater in one call, like C#'s `a.CompareTo(b)`.
- Write `<=>` and `==`. The compiler derives `<`, `<=`, `>` and `>=` from `<=>`, and `!=` from `==`. In C# you would overload all six.
- `auto operator<=>(const T&) const = default;` compares the members one after another, in declaration order, and also gives you `==`.
- The result type says what kind of order it is: `std::strong_ordering` (integers), `std::weak_ordering` (case-insensitive strings), `std::partial_ordering` (floating point, where NaN compares with nothing).
- Wrapping a C function that returns negative, zero or positive, such as GMP's `mpz_cmp`: `return mpz_cmp(a, b) <=> 0;`.

## Key claims

- <a id="c1"></a>**C1.** `a <=> b` returns a comparison category object that compares with the literal `0`: `(a <=> b) < 0` means `a` is less than `b`, `== 0` equal, `> 0` greater.
- <a id="c2"></a>**C2.** If a type has `operator<=>`, the compiler rewrites `a < b`, `a <= b`, `a > b` and `a >= b` as `(a <=> b) < 0` and so on. If it has `operator==`, the compiler rewrites `a != b` as `!(a == b)`. `<` and the others are never rewritten to use `==`, and `==` is never rewritten to use `<=>`.
- <a id="c3"></a>**C3.** A defaulted `operator<=>` compares the base classes and then the members, in declaration order, and returns the first result that is not equal. Declaring it `= default` also declares a defaulted `operator==`. A hand-written `operator<=>` declares no `==`: without one, `a == b` does not compile.
- <a id="c4"></a>**C4.** `std::strong_ordering` means equal values are interchangeable, as for integers. `std::weak_ordering` allows values that compare equal yet differ, such as `"Tante"` and `"tante"` under a case-insensitive order. `std::partial_ordering` adds a fourth result, `unordered`, for values that can't be compared, such as NaN with any `double`.
- <a id="c5"></a>**C5.** `<=>` on two `int`s returns `std::strong_ordering`, and on two `double`s `std::partial_ordering`. A defaulted `<=>` declared with return type `auto` returns the weakest category among its members' comparisons. A strong result converts implicitly to weak or partial, not the other way round.
- <a id="c6"></a>**C6.** A C comparison function that returns any negative, zero or positive `int`, such as GMP's `mpz_cmp`, becomes a `std::strong_ordering` with `return cmp(a, b) <=> 0;`. Returning the `int` directly does not compile, since `int` does not convert to a comparison category.
- <a id="c7"></a>**C7.** The compiler also tries each comparison with its operands swapped: `5 < x` can use `x.operator<=>(5)` and becomes `0 < (x <=> 5)`, and `5 == x` can use `x.operator==(5)`. So one member `operator<=>(long)` and one `operator==(long)` make `x` comparable with integers on either side.
- <a id="c8"></a>**C8.** C#'s `IComparable<T>.CompareTo` returns an `int` and doesn't make the operators: a C# type overloads `<`, `>`, `<=` and `>=` in pairs and `==` and `!=` together. C#'s `double.CompareTo` sorts NaN below every other value and equal to itself, while C++'s `<=>` returns `unordered` for NaN.

## Explanation

### One function instead of six

In C#, a type that wants `<` writes `CompareTo` and then five or six operators, each calling `CompareTo` ([C8](#c8)):

```csharp
public readonly struct Version : IComparable<Version>
{
    public int Major { get; init; }
    public int Minor { get; init; }

    public int CompareTo(Version other) =>
        Major != other.Major ? Major.CompareTo(other.Major) : Minor.CompareTo(other.Minor);

    public static bool operator <(Version a, Version b) => a.CompareTo(b) < 0;
    public static bool operator >(Version a, Version b) => a.CompareTo(b) > 0;
    public static bool operator <=(Version a, Version b) => a.CompareTo(b) <= 0;
    public static bool operator >=(Version a, Version b) => a.CompareTo(b) >= 0;
}
```

C++20 builds the four ordering operators itself ([C2](#c2)). `<=>` plays the role of `CompareTo`. Its result is not an `int` but a small object that you compare with `0` ([C1](#c1)). When the compiler meets `a < b` and finds no `operator<`, it tries `(a <=> b) < 0`. `!=` works the same way through `==`.

Equality stays separate. For many types, equality has a faster answer than ordering: two strings of different lengths are unequal without looking at a character. So `==` is never derived from `<=>` ([C2](#c2)).

### `= default`

For a type whose order is "compare the first member, then the second", the compiler writes `<=>` for you ([C3](#c3)):

```cpp
struct Version {
    int major;
    int minor;
    auto operator<=>(const Version& other) const = default;   // also declares ==
};
```

That is the order of a dictionary, called **lexicographic**: the first member that differs decides. `= default` on `<=>` also declares `==`, comparing member by member. A hand-written `<=>` does not. Then `==` must be written or declared `= default` on its own.

Member-by-member order is not always the type's order. A fraction held as numerator and denominator, compared member by member, puts $\tfrac{1}{2}$ before $\tfrac{1}{3}$: the numerators tie, then $2 < 3$ decides. [Tante](https://github.com/thomaswening/Tante)'s `Rational` therefore defaults `==`, which is correct because it always stores lowest terms. It writes `<=>` by hand, comparing $a \cdot d$ with $c \cdot b$ for $\tfrac{a}{b}$ and $\tfrac{c}{d}$.

### Three kinds of order

The return type says how strong the order is ([C4](#c4)):

| Category | Results | Equal means | Example |
|---|---|---|---|
| `std::strong_ordering` | `less`, `equal`, `greater` | the same value: either can replace the other | `int`, Tante's `Integer` |
| `std::weak_ordering` | `less`, `equivalent`, `greater` | in the same place in the order, but possibly different | strings compared ignoring case: `"Tante"` and `"tante"` |
| `std::partial_ordering` | `less`, `equivalent`, `greater`, `unordered` | as for weak, and some pairs can't be compared at all | `double`: NaN is neither less, equal nor greater than `1.0` |

The built-in types already return the right one ([C5](#c5)): `1 <=> 2` is `strong_ordering::less`, `1.0 <=> NaN` is `partial_ordering::unordered`. For an `unordered` result, `< 0`, `> 0` and `== 0` are all false. That is the C++ way of saying what IEEE 754 says about NaN.

A defaulted `<=>` with return type `auto` takes the weakest category of its members. A struct with a `double` member gets `partial_ordering`. A stronger category converts to a weaker one, so a weak `<=>` can return the strong result of comparing two characters.

C# has no categories. Its `CompareTo` must return a total order, so `double.CompareTo` puts NaN below everything ([C8](#c8)). The operator `<` on `double` still returns `false` for NaN, as in C++.

### Wrapping a C comparison function

GMP compares two numbers with `int mpz_cmp(const mpz_t a, const mpz_t b)`. It promises only the sign of the result: negative, zero or positive, not necessarily $-1$, $0$, $1$. Comparing that `int` with `0` by `<=>` turns it into a `strong_ordering` ([C6](#c6)). This is Tante's `Integer`:

```cpp
std::strong_ordering Integer::operator<=>(const Integer& right) const {
  return mpz_cmp(impl_->value, right.impl_->value) <=> 0;
}

bool Integer::operator==(const Integer& right) const {
  return mpz_cmp(impl_->value, right.impl_->value) == 0;
}
```

`-7 <=> 0` is `less`, `3 <=> 0` is `greater`. `return mpz_cmp(…);` alone would not compile: there is no conversion from `int` to `strong_ordering`, which protects against returning $-1$ by habit. The `==` is needed because the `<=>` is hand-written ([C3](#c3)). Integers are strongly ordered: two equal `Integer`s are the same number.

### Comparing with another type

Tante's `Integer` has an `explicit` constructor from an integer ([constructors C2](constructors.md#c2)). So `x < 5` does not compile: no `<=>` takes an `Integer` and an `int`, and the compiler may not convert `5` to an `Integer` on its own. Two more members fix that:

```cpp
std::strong_ordering operator<=>(long right) const;
bool operator==(long right) const;
```

They also cover the other order of operands ([C7](#c7)). For `5 < x`, the compiler also tries the comparison with its operands swapped. It finds `x.operator<=>(5)` and rewrites `5 < x` as `0 < (x <=> 5)`. In C#, an operator with the `int` on the left is a second overload. In C++20 one member covers both sides.

## Examples

What the compiler derives from a defaulted `<=>`:

```cpp
#include <compare>
#include <iostream>

struct Version {
    int major;
    int minor;
    auto operator<=>(const Version& other) const = default;   // also declares ==
};

int main()
{
    Version a{1, 2};
    Version b{1, 10};
    std::cout << std::boolalpha
              << (a < b) << ' '      // rewritten as (a <=> b) < 0
              << (a >= b) << ' '     // rewritten as (a <=> b) >= 0
              << (a == b) << ' '     // the defaulted ==
              << (a != b) << '\n';   // rewritten as !(a == b)
}
```

Expected output:

```
true false false true
```

The categories of the built-in types:

```cpp
#include <cmath>
#include <compare>
#include <iostream>

int main()
{
    double nan = std::nan("");
    std::strong_ordering  i = 1 <=> 2;
    std::partial_ordering d = 1.0 <=> nan;
    std::cout << std::boolalpha
              << (i == std::strong_ordering::less) << ' '
              << (d == std::partial_ordering::unordered) << ' '
              << (d < 0) << ' ' << (d > 0) << ' ' << (d == 0) << '\n';
}
```

Expected output:

```
true true false false false
```

A weak order, hand-written: names compared ignoring case.

```cpp
#include <algorithm>
#include <cctype>
#include <compare>
#include <iostream>
#include <string>

struct CaselessName {
    std::string text;

    std::weak_ordering operator<=>(const CaselessName& other) const
    {
        std::size_t common = std::min(text.size(), other.text.size());
        for (std::size_t i = 0; i < common; ++i) {
            int left  = std::tolower(static_cast<unsigned char>(text[i]));
            int right = std::tolower(static_cast<unsigned char>(other.text[i]));
            if (left != right)
                return left <=> right;            // strong_ordering converts to weak_ordering
        }
        return text.size() <=> other.text.size();
    }
    bool operator==(const CaselessName& other) const { return (*this <=> other) == 0; }
};

int main()
{
    CaselessName a{"Tante"};
    CaselessName b{"tante"};
    std::cout << std::boolalpha << (a == b) << ' ' << (a.text == b.text) << '\n';
}
```

Expected output:

```
true false
```

`a` and `b` are equivalent in the order, yet their texts differ: that is what weak means ([C4](#c4)). The cast to `unsigned char` is needed because `std::tolower` is undefined for negative `char` values other than `EOF`.

A class over a C comparison function, comparable with itself and with `long` on either side. `num_cmp` stands in for `mpz_cmp`:

```cpp
#include <compare>
#include <iostream>

// Stand-in for a C comparison such as mpz_cmp: negative, zero or positive,
// not necessarily -1, 0 or 1.
extern "C" int num_cmp(long a, long b) { return a < b ? -7 : a > b ? 3 : 0; }

class Integer {
public:
    explicit Integer(long value) : value_(value) {}

    std::strong_ordering operator<=>(const Integer& other) const
    {
        return num_cmp(value_, other.value_) <=> 0;     // int <=> int is a strong_ordering
    }
    bool operator==(const Integer& other) const      // not generated: <=> is hand-written
    {
        return num_cmp(value_, other.value_) == 0;
    }

    std::strong_ordering operator<=>(long other) const { return num_cmp(value_, other) <=> 0; }
    bool operator==(long other) const { return num_cmp(value_, other) == 0; }

private:
    long value_;
};

int main()
{
    Integer two(2);
    Integer three(3);
    std::cout << std::boolalpha
              << (two < three) << ' ' << (two != three) << ' '
              << (two < 5) << ' '        // (two <=> 5) < 0
              << (5 < two) << ' '        // reversed: 0 < (two <=> 5)
              << (2 == two) << '\n';     // reversed: two == 2
}
```

Expected output:

```
true true true false true
```

What does not compile, one line at a time:

```cpp
return num_cmp(value_, other.value_);   // error: no conversion from int to std::strong_ordering (C6)
a == b;                                  // error without operator==, if <=> is hand-written (C3)
two < 5;                                 // error without operator<=>(long): the constructor is explicit (C7)
```

## Good habits

- Write `<=>` and `==` and let the compiler derive the other four ([C2](#c2); C++ Core Guidelines C.161 asks for symmetric comparison operators, which the rewriting provides).
- Use `= default` when member-by-member order is the type's order, and write it by hand when it isn't ([C3](#c3)).
- Return the strongest category that is true, and spell it out (`std::strong_ordering`) in a hand-written `<=>` ([C4](#c4)).
- Wrap a C comparison with `<=> 0`, never by returning or comparing with $-1$ and $1$ ([C6](#c6)).

## Pitfalls

- Expecting a hand-written `<=>` to give `==` as well: only `= default` does ([C3](#c3)).
- Defaulting `<=>` on a type whose members don't compare in the type's order, such as a fraction ([C3](#c3)).
- Testing a C comparison result with `== -1`: `mpz_cmp` may return $-7$ ([C6](#c6)).
- Comparing a comparison result with anything but the literal `0`, as in `(a <=> b) == -1`: it does not compile ([C1](#c1)).
- Claiming `strong_ordering` for a type with values that compare equal but differ, such as case-insensitive strings ([C4](#c4)).
- Assuming C++ sorts NaN like C#'s `CompareTo`: `<=>` returns `unordered`, and `std::sort` on data with NaN breaks its precondition ([C8](#c8)).

## Exercises

1. **Predict.** `struct P { int x; double y; auto operator<=>(const P&) const = default; };` What type does `P{} <=> P{}` have?

   <details><summary>Solution</summary>

   `std::partial_ordering`: the weakest category among the members, `int` giving strong and `double` partial ([C5](#c5)).

   </details>

2. **Rewrite.** Which function calls does the compiler use for `3 >= x`, if `x`'s class has only `operator<=>(long) const`?

   <details><summary>Solution</summary>

   It swaps the operands and calls `x.operator<=>(3)`, then evaluates `0 >= (x <=> 3)` ([C2](#c2), [C7](#c7)).

   </details>

3. **Choose.** Points in the plane, ordered by their distance from the origin. Which category?

   <details><summary>Solution</summary>

   `std::weak_ordering`: $(1, 0)$ and $(0, 1)$ are equivalent in the order but different points ([C4](#c4)). With `double` coordinates and NaN possible it would be `partial_ordering`.

   </details>

## Sources

- Claude session on [Tante](https://github.com/thomaswening/Tante), 2026-11-12: the primer before the review of slice 2, where `Integer` compares through `mpz_cmp` and `Rational` writes `<=>` by hand.
- cppreference: [default comparisons](https://en.cppreference.com/w/cpp/language/default_comparisons), [comparison operators](https://en.cppreference.com/w/cpp/language/operator_comparison) (three-way comparison and rewritten candidates), [std::strong_ordering](https://en.cppreference.com/w/cpp/utility/compare/strong_ordering), [std::weak_ordering](https://en.cppreference.com/w/cpp/utility/compare/weak_ordering), [std::partial_ordering](https://en.cppreference.com/w/cpp/utility/compare/partial_ordering).
- GMP manual: [Integer Comparisons](https://gmplib.org/manual/Integer-Comparisons) (`mpz_cmp` returns a positive, zero or negative value).
- Microsoft Learn: [IComparable&lt;T&gt;.CompareTo](https://learn.microsoft.com/en-us/dotnet/api/system.icomparable-1.compareto), [Double.CompareTo](https://learn.microsoft.com/en-us/dotnet/api/system.double.compareto), [operator overloading](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/operator-overloading) (comparison operators must be overloaded in pairs).
- Barry Revzin, [Comparisons in C++20](https://brevzin.github.io/c++/2019/07/28/comparisons-cpp20/).
