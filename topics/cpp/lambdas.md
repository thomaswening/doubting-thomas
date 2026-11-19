---
title: Lambdas in C++
area: cpp
created: 2026-11-10
updated: 2026-11-10
prerequisites: [cpp/references, cpp/arrays-and-containers]
related: [cpp/const-and-constexpr]
projects: [partonforge]
tags: [cpp, lambda, closure, capture, std-function, algorithm, delegate]
---

# Lambdas in C++

## TL;DR

- `[captures](parameters) { body }` creates an object that can be called like a function. Its type has no name, so it is stored with `auto`.
- A lambda sees only the local variables it captures. `[x]` copies `x` when the lambda is created. `[&x]` refers to `x` itself, as every C# lambda does.
- A copy captured by `[x]` cannot be changed inside the lambda unless the lambda is `mutable`.
- A reference capture of a local that has gone out of scope dangles, which is undefined behaviour.
- Algorithms such as `std::ranges::sort` take a lambda as it is. `std::function` is the C# delegate: a holder of a fixed type for any callable.

## Key claims

- <a id="c1"></a>**C1.** A lambda expression `[captures](parameters) { body }` creates an object of a unique, unnamed class type that has a call operator, so the object is called like a function: `const auto twice = [](int x) { return 2 * x; };` then `twice(3)` gives 6. Because the type has no name, a variable that holds a lambda is declared with `auto`.
- <a id="c2"></a>**C2.** A lambda can use a local variable of the enclosing function only if it captures it: `int x = 1; auto f = [] { return x; };` does not compile. One exception is a `const` integer initialised with a constant expression, whose value may be used without a capture.
- <a id="c3"></a>**C3.** `[x]` captures `x` by copy: the lambda stores its own copy, taken when the lambda is created, and does not see later changes to `x`. `[&x]` captures `x` by reference: the lambda reads and writes the variable itself and sees every change.
- <a id="c4"></a>**C4.** A C# lambda captures the variable itself, so it always sees the variable's current value, like a C++ `[&x]` capture. C# has no counterpart of C++'s capture by copy, apart from copying into a fresh local first.
- <a id="c5"></a>**C5.** `[=]` captures by copy, and `[&]` by reference, every local variable that the body uses; `[=, &total]` copies all except `total`, which it captures by reference.
- <a id="c6"></a>**C6.** A variable captured by copy is `const` inside the lambda: `[x] { ++x; }` does not compile. A lambda declared `mutable`, as in `[x]() mutable { return ++x; }`, may change its own copy, and the change persists from one call of that lambda object to the next.
- <a id="c7"></a>**C7.** A lambda that captures a local by reference and is called after that local's scope has ended reads a destroyed object, which is undefined behaviour. This happens most easily when a function returns a lambda that captures one of its own locals with `&`.
- <a id="c8"></a>**C8.** An algorithm such as `std::ranges::sort(values, comparator)` is a template that takes the lambda with its own type, so the compiler sees the body and can inline it. `std::function<R(Args...)>` from `<functional>` holds any callable with that signature behind one fixed type, like a C# `Func<...>` delegate, at the cost of an indirect call. It is the type for a lambda stored in a member or passed through a non-template interface.
- <a id="c9"></a>**C9.** A lambda whose parameter is declared `auto`, as in `[](const auto& value) { ... }`, is a generic lambda: the compiler builds one version of the call operator for each argument type it is called with, like a function template.

## Explanation

### An object that can be called

In C#, a lambda becomes a delegate: an object of a known type such as `Func<int, int>` that wraps a method. A C++ lambda is simpler and more direct. The compiler writes a small class with one member function, the call operator `operator()`, and the lambda expression creates an object of that class ([C1](#c1)). Calling the object calls that operator. C++ calls such an object a *closure*, and any type with a call operator a *function object*.

The class has no name you could write, so a variable that holds a lambda is declared `auto`. Two lambdas with identical text still have two different types.

### Captures say what the lambda keeps

A C# lambda may use any local variable in scope. A C++ lambda may use only what it captures, listed in the square brackets ([C2](#c2)). A capture becomes a data member of the lambda's class, and the capture list decides what kind of member:

- `[x]` copies `x` into the lambda when the lambda is created ([C3](#c3)). Later changes to `x` do not reach the copy.
- `[&x]` stores a reference to `x`. The lambda sees `x` as it is at each call.
- `[=]` and `[&]` do the same for every local the body names ([C5](#c5)).

C# always does the second ([C4](#c4)). Its compiler moves a captured local into a hidden object shared by the method and the lambda, so both see the same variable. That is why a C# lambda created in a loop over `i` sees the last value of `i` unless the loop copies `i` into a fresh local. In C++, `[i]` makes that copy explicitly.

The square brackets also explain the one exception in [C2](#c2). A `const` integer with a compile-time value is a constant, like a literal. The lambda can use its value without storing anything.

### Copies are read-only, references can dangle

The call operator of a lambda is a `const` member function, so the lambda cannot change its copied members ([C6](#c6), see [const member functions](const-and-constexpr.md#c5)). `mutable` removes that `const`. The lambda then keeps its own changed copy across calls, which turns it into a small object with state, such as a counter.

A reference capture is a reference like any other ([references](references.md)). It is only valid while the variable lives ([C7](#c7)). C# never has this problem, because its garbage collector keeps a captured variable alive as long as any lambda needs it. In C++, a lambda that outlives its scope must capture by copy.

### Passing a lambda on

The standard algorithms are templates. `std::ranges::sort(values, comparator)` takes the comparator with its exact type, so the compiler knows the body and can compile it into the sorting loop ([C8](#c8)). Nothing is wrapped and nothing is allocated.

A data member or a parameter of an ordinary function needs one type that fits every lambda. That is `std::function`, the C++ counterpart of a C# delegate. It costs an indirect call and possibly an allocation, so code uses it only where a fixed type is needed.

A lambda with an `auto` parameter works for any argument type that its body accepts ([C9](#c9)). The compiler builds a separate call operator for each type the lambda is called with.

### Name the lambda

A lambda written inline inside an algorithm call is hard to read once it spans several lines. Storing it in a variable gives it a name that says what it decides, as in [PartonForge](https://github.com/thomaswening/PartonForge)'s grid code:

```cpp
const auto is_closer = [target](double left, double right) {
    return std::fabs(left - target) < std::fabs(right - target);
};
```

`[target]` copies the value to compare against into the lambda. The algorithm that calls `is_closer` passes the two values to compare.

## Examples

Capture by copy against capture by reference, compiled with `g++ -std=c++20`:

```cpp
#include <iostream>

int main() {
    int count = 1;
    const auto by_copy = [count] { return count; };      // copies 1 now (C3)
    const auto by_reference = [&count] { return count; }; // refers to count (C3)
    count = 5;
    std::cout << by_copy() << ' ' << by_reference() << '\n';
}
```

Output:

```text
1 5
```

The C# version prints `5 5`, because both lambdas see the variable itself ([C4](#c4)):

```csharp
int count = 1;
Func<int> first = () => count;
Func<int> second = () => count;
count = 5;
Console.WriteLine($"{first()} {second()}");   // 5 5
```

A named comparator passed to an algorithm, and a `mutable` counter:

```cpp
#include <algorithm>
#include <cmath>
#include <iostream>
#include <vector>

int main() {
    std::vector<double> values = {0.0, 1.0, 0.5, 0.8};
    const double target = 0.6;

    // Orders the values by their distance to target (C8).
    const auto is_closer = [target](double left, double right) {
        return std::fabs(left - target) < std::fabs(right - target);
    };
    std::ranges::sort(values, is_closer);
    std::cout << "closest " << values.front() << ", farthest " << values.back() << '\n';

    auto next_id = [id = 0]() mutable { return ++id; };   // its own counter (C6)
    std::cout << next_id() << ' ' << next_id() << ' ' << next_id() << '\n';
}
```

Output:

```text
closest 0.5, farthest 0
1 2 3
```

`[id = 0]` is an init-capture (C++14): it creates a member `id` initialised with `0` that copies nothing from outside.

What does not compile:

```cpp
int main() {
    int x = 1;
    // auto read = [] { return x; };     // error: x is not captured (C2)
    // auto bump = [x] { ++x; };         // error: the copy of x is const (C6)
    return x;
}
```

## Good habits

- Name a lambda that does not fit on the line of the call it is passed to ([C1](#c1); the coding guideline Thomas follows, from the review of PartonForge PR 6).
- Capture by copy when the lambda may outlive the current scope ([C7](#c7); C++ Core Guidelines [F.53](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rf-value-capture)).
- Capture each variable by name rather than with `[=]` or `[&]`, so the capture list shows what the lambda depends on ([C5](#c5)).
- Pass a lambda to an algorithm as it is. Reach for `std::function` only where a fixed type is needed ([C8](#c8)).

## Pitfalls

- Expecting C# behaviour from `[x]`: the lambda keeps the value from the moment it was created ([C3](#c3), [C4](#c4)).
- Returning a lambda that captures a local with `&`. The local is gone before the lambda is called ([C7](#c7)).
- Writing `[x] { ++x; }` to count calls. The copy is `const`. Use `mutable`, or capture a variable outside by reference ([C6](#c6)).
- Storing every lambda in a `std::function` "to be safe". It costs an indirect call that a template parameter avoids ([C8](#c8)).

## Exercises

1. **Predict.** What does this print?

   ```cpp
   int total = 10;
   auto add = [total](int amount) mutable { total += amount; return total; };
   std::cout << add(1) << ' ' << add(1) << ' ' << total << '\n';
   ```

   <details><summary>Solution</summary>

   `11 12 10`. The lambda holds its own copy of `total`, taken when it was created ([C3](#c3)). `mutable` lets it change that copy, and the change persists between calls ([C6](#c6)). The outer `total` stays 10.

   </details>

2. **Explain.** Why does C# need no rule like [C7](#c7)?

   <details><summary>Solution</summary>

   A C# lambda captures the variable itself, which the compiler moves into an object on the heap ([C4](#c4)). The garbage collector keeps that object alive as long as a lambda refers to it. A C++ reference capture refers to a variable in its original place, which ends with its scope ([C7](#c7)).

   </details>

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-11-10: Thomas's review of [PR 6](https://github.com/thomaswening/PartonForge/pull/6) asked to name the comparator in `Grid::momentum_sum_rule` ([comment](https://github.com/thomaswening/PartonForge/pull/6#discussion_r4524390645)), then how the named `is_closer` gets its arguments.
- cppreference: [lambda expressions](https://en.cppreference.com/w/cpp/language/lambda), [`std::function`](https://en.cppreference.com/w/cpp/utility/functional/function), [`std::ranges::sort`](https://en.cppreference.com/w/cpp/algorithm/ranges/sort).
- Microsoft Learn: [Lambda expressions and anonymous functions](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/lambda-expressions) (capture of outer variables in C#).
- C++ Core Guidelines: [F.50 to F.54](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rf-capture-vs-overload) on lambdas and captures.
