---
title: Ref-qualified member functions
area: cpp
created: 2026-11-08
updated: 2026-11-08
prerequisites: [cpp/copy-and-move]
related: [cpp/const-and-constexpr, cpp/references]
projects: [partonforge]
tags: [cpp, ref-qualifier, rvalue, lvalue, std-move, move-semantics, member-function]
---

# Ref-qualified member functions

## TL;DR

- A member function can say whether it may be called on an **lvalue** (a named object), an **rvalue** (a temporary, or an object passed through `std::move`), or both. The marker is a **ref-qualifier**, `&` or `&&`, after the parameter list.
- `take_items() &&` can only be called as `std::move(collector).take_items()` or on a temporary. The `std::move` at the call site tells the reader that `collector` is used up afterwards.
- `std::move(x)` still moves nothing. It only turns `x` into an rvalue, so that the `&&` overload is chosen. The function body does the moving.
- Inside a member function, members are lvalues even when the function is `&&`-qualified. So the body writes `return std::move(items_);`, or the vector is copied.
- A name is always an lvalue, even the name of an rvalue reference parameter. That is why `std::move` appears again inside functions that take `T&&`.
- C# has no ref-qualifiers. The closest relative is a method like `ImmutableArray<T>.Builder.MoveToImmutable()`, which empties its object, but nothing stops the caller from using the builder afterwards.

## Key claims

- <a id="c1"></a>**C1.** A non-static member function may end its declaration with a ref-qualifier: `&` makes it callable only on non-`const` lvalues, `&&` only on rvalues. `const&` is callable on both lvalues and rvalues, because a `const` lvalue reference also binds to rvalues.
- <a id="c2"></a>**C2.** Calling an `&&`-qualified member function on a named object, as in `collector.take_items()`, does not compile; `std::move(collector).take_items()` and `Collector{}.take_items()` do.
- <a id="c3"></a>**C3.** When a class has both a `const&` and a `&&` overload of a function, an rvalue picks the `&&` one and an lvalue, `const` or not, picks the `const&` one. This is overload resolution on the object the function is called on, in the same way as on an ordinary argument.
- <a id="c4"></a>**C4.** If one overload of a member function with a given parameter list has a ref-qualifier, all overloads with that parameter list must have one; a `text() const&` next to a plain `text()` is a compile error.
- <a id="c5"></a>**C5.** Inside a member function, members are lvalues whatever the ref-qualifier: in a `&&` function, `return items_;` copies the member and `return std::move(items_);` moves it. The automatic move on `return` applies to local variables and parameters, not to members.
- <a id="c6"></a>**C6.** An expression that is just a name is an lvalue, even when the name was declared as an rvalue reference: in `void sink(Tracer&& t)`, `Tracer kept = t;` copies and `Tracer kept = std::move(t);` moves.
- <a id="c7"></a>**C7.** `std::move` applied to a `const` object gives a `const T&&`, which cannot bind to the move constructor's `T&&` but binds to the copy constructor's `const T&`; so `std::move` on a `const` object copies.
- <a id="c8"></a>**C8.** The idiom `Result take() && { return std::move(member_); }` lets an object hand over what it built at the end of its life: the caller must write `std::move(builder).take()`, which marks the object as moved-from at the call site.

## Explanation

### What the object of a call is

A member function call `collector.add("a")` has a hidden argument: the object, which the body reaches through `this`. [Copy and move](copy-and-move.md#c3) showed that ordinary arguments come in two kinds. An **lvalue** has a name and lives on after the statement. An **rvalue** is a temporary or an object marked with `std::move` as expiring. A `T&` parameter accepts only lvalues and a `T&&` parameter only rvalues.

A **ref-qualifier** puts the same restriction on the hidden argument ([C1](#c1)). It is written where a `const` member function writes its `const`. The two can be combined:

```cpp
const std::string& text() const&;   // any object, lvalue or rvalue
std::string text() &&;              // only an rvalue
void reset() &;                     // only a non-const lvalue
```

Without a ref-qualifier, a member function accepts both kinds, which is what almost every member function wants.

### Why restrict the object

A function that **gives away** the object's contents should not run on an object the caller still uses. `take_items() &&` moves the vector out, so the collector is empty afterwards. The ref-qualifier makes that visible: `collector.take_items()` fails to compile ([C2](#c2)). The caller has to write `std::move(collector).take_items()`. The `std::move` at the call site says what a reader needs to know: after this line, `collector` is used up ([C8](#c8)).

This is the planned fix for `PatternCollector` in PartonForge (finding 3i of the PR 1 walkthrough). Today the collector holds a reference to `diff.patterns` and writes into it from outside, an out-parameter in disguise. With an owned vector and a `&&` getter, the result becomes a return value:

```cpp
diff.patterns = std::move(collector).take_patterns();
```

As in [copy and move](copy-and-move.md#c4), `std::move` itself moves nothing. It is a cast that makes `collector` an rvalue, so that the call matches `take_patterns() &&`. The moving happens in the body.

### Two overloads: borrow or take

A class can offer both versions ([C3](#c3)). A `const&` overload returns a reference to the member, so a named object lends its contents and keeps them. A `&&` overload returns the member by value and moves it out, because the object is about to disappear anyway. The standard library does this: `std::optional<T>::value()` has `&`, `const&`, `&&` and `const&&` overloads, so `std::move(opt).value()` moves the value out instead of copying it.

The compiler insists that such a set is consistent ([C4](#c4)). Either every overload with the same parameters has a ref-qualifier, or none has. A plain `text()` would accept every object, so a call could not be resolved against `text() const&`.

### Inside the body, everything with a name is an lvalue

The ref-qualifier says what the caller must pass. It does not change the body. Inside `take_items() &&`, `items_` is still a named member, so it is an lvalue ([C5](#c5)). `return items_;` copies the vector. The collector keeps its own copy until it is destroyed. The body needs its own `std::move(items_)`.

The same rule applies to parameters ([C6](#c6)). `void sink(Tracer&& t)` accepts only rvalues, but inside the function `t` has a name. It can be used several times, so the compiler does not move from it silently: the first use would empty it for the second. Each place that may give `t` away says so with `std::move(t)`. That is why `std::move` shows up twice in such code: once where the caller hands over, once where the callee passes on.

### The const trap

A `const` object cannot be moved from, because moving changes the source. `std::move(fixed)` on a `const Tracer` yields a `const Tracer&&` ([C7](#c7)). The move constructor takes `Tracer&&`, which cannot bind to a `const` object. The copy constructor takes `const Tracer&`, which can. So the code compiles and copies without a warning. A `const` local that is later moved is therefore a silent copy. clang-tidy's `performance-move-const-arg` reports it.

### Compared with C#

C# has no lvalues and rvalues in this sense. A class variable is a reference, so "handing over" contents is a matter of convention. `ImmutableArray<T>.Builder.MoveToImmutable()` is the nearest relative: it gives its internal array to the new `ImmutableArray<T>` without copying and leaves the builder empty. But nothing at the call site shows that. The builder can still be used afterwards, too. A C++ `&&` member function moves the same check to compile time.

## Examples

A collector that hands over its items:

```cpp
#include <iostream>
#include <string>
#include <utility>
#include <vector>

class Collector {
 public:
  void add(std::string item) { items_.push_back(std::move(item)); }

  // Callable only on an rvalue: hands the items over, leaving the collector used up.
  std::vector<std::string> take_items() && { return std::move(items_); }

 private:
  std::vector<std::string> items_;
};

int main() {
  Collector collector;
  collector.add("a");
  collector.add("b");
  std::vector<std::string> items = std::move(collector).take_items();
  std::cout << items.size() << '\n';
  std::cout << Collector{}.take_items().size() << '\n';
}
```

Output:

```text
2
0
```

Writing `auto items = collector.take_items();` instead fails ([C2](#c2)). Clang 18 says `'this' argument to member function 'take_items' is an lvalue, but function has rvalue ref-qualifier`. GCC 13's message is less clear: `passing 'Collector' as 'this' argument discards qualifiers`.

Borrow or take, chosen by the kind of object ([C3](#c3)):

```cpp
#include <iostream>
#include <string>
#include <utility>

class Label {
 public:
  explicit Label(std::string text) : text_(std::move(text)) {}
  const std::string& text() const& { std::cout << "const& "; return text_; }
  std::string text() && { std::cout << "&& "; return std::move(text_); }

 private:
  std::string text_;
};

Label make_label() { return Label("temporary"); }

int main() {
  Label label("named");
  const Label fixed("fixed");
  std::cout << label.text() << '\n';
  std::cout << fixed.text() << '\n';
  std::cout << make_label().text() << '\n';
  std::cout << std::move(label).text() << '\n';
}
```

Output:

```text
const& named
const& fixed
&& temporary
&& named
```

Where a copy happens although the code looks like a move ([C5](#c5), [C6](#c6), [C7](#c7)):

```cpp
#include <iostream>
#include <utility>

struct Tracer {
  Tracer() = default;
  Tracer(const Tracer&) { std::cout << "copy\n"; }
  Tracer(Tracer&&) noexcept { std::cout << "move\n"; }
};

struct Holder {
  Tracer member;
  Tracer take_copy() && { return member; }             // member is an lvalue: copies
  Tracer take_moved() && { return std::move(member); } // moves
};

void sink(Tracer&& t) { Tracer kept = t; }              // t has a name: an lvalue, copies
void sink_moved(Tracer&& t) { Tracer kept = std::move(t); }

int main() {
  Holder{}.take_copy();
  Holder{}.take_moved();
  sink(Tracer{});
  sink_moved(Tracer{});
  const Tracer fixed;
  Tracer from_const = std::move(fixed);                 // const Tracer&& binds to the copy constructor
}
```

Output:

```text
copy
move
copy
move
copy
```

All three snippets were compiled with GCC 13.3 and Clang 18.1 (`-std=c++20 -Wall -Wextra`) and gave the output shown.

## Pitfalls

- Writing `return items_;` in a `&&` function and expecting a move. Members are lvalues; the vector is copied ([C5](#c5)).
- Reading `T&& t` as "t is an rvalue". The parameter accepts rvalues, but `t` itself is an lvalue in the body ([C6](#c6)).
- Moving from a `const` object. It compiles and copies ([C7](#c7)).
- Using an object after `std::move(obj).take()`. It is in a moved-from state: a standard container is valid but its contents are unspecified ([copy and move](copy-and-move.md#c4)).
- Adding a `&&` overload next to an existing unqualified one. The compiler rejects the pair ([C4](#c4)); the old one needs `const&` or `&`.

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-11-08: the walkthrough of [PR 1](https://github.com/thomaswening/PartonForge/pull/1), finding 3i on [`PatternCollector`](https://github.com/thomaswening/PartonForge/blob/56b51e6d0d0d3f2c8c4b2b67de40aaa8c469347a/src/grid_diff.cpp#L165-L194) and the proposed `take_patterns() &&`.
- cppreference: [member functions with ref-qualifiers](https://en.cppreference.com/w/cpp/language/member_functions#ref-qualified_member_functions), [value categories](https://en.cppreference.com/w/cpp/language/value_category), [`std::move`](https://en.cppreference.com/w/cpp/utility/move), [`std::optional::value`](https://en.cppreference.com/w/cpp/utility/optional/value), [automatic move on return](https://en.cppreference.com/w/cpp/language/return#Automatic_move_from_local_variables_and_parameters).
- clang-tidy: [`performance-move-const-arg`](https://clang.llvm.org/extra/clang-tidy/checks/performance/move-const-arg.html).
- .NET: [`ImmutableArray<T>.Builder.MoveToImmutable`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.immutable.immutablearray-1.builder.movetoimmutable).
