---
title: References and pointers
area: cpp
created: 2026-10-25
updated: 2026-10-29
prerequisites: [c/pointer-declarator-syntax]
related: [cpp/const-and-constexpr, cpp/copy-and-move, c/stack-and-heap]
projects: [partonforge]
tags: [cpp, reference, pointer, const-reference, ref, in, dangling]
---

# References and pointers

## TL;DR

- A **reference** `T&` is a second name for an object that already exists. It must be set when declared, always refers to the same object, and cannot be null.
- A **pointer** `T*` holds an address. It can be null, be pointed elsewhere, and must be followed with `*` or `->`.
- `const T&` is the normal way to pass an object a function only reads: no copy is made and the function cannot change it. It is C#'s `in` parameter.
- `T&` as a parameter lets the function change the caller's object, like C#'s `ref`.
- Prefer a reference when an object must be there. Use a pointer only where "no object" is a valid answer.
- `auto` copies: `auto h = grid.header();` makes a copy, `const auto& h = grid.header();` does not.

## Key claims

- <a id="c1"></a>**C1.** A reference must be initialised when it is declared and refers to that same object for its whole life; assigning to a reference assigns to the object it refers to and never makes the reference refer to another object.
- <a id="c2"></a>**C2.** A valid reference always refers to an object, while a pointer may be null (`nullptr`); a parameter that must receive an object is therefore declared as a reference, and a pointer is used where "no object" is a meaningful value.
- <a id="c3"></a>**C3.** Passing an argument by `const T&` neither copies it nor allows the function to modify it; a `const T&` parameter also accepts temporaries, such as a string literal passed to a `const std::string&`.
- <a id="c4"></a>**C4.** A non-const reference `T&` cannot bind to a temporary: with `void shout(std::string& s);`, the call `shout("hello")` does not compile.
- <a id="c5"></a>**C5.** A reference does not keep its object alive: a reference to a local variable returned from a function, or a reference to a member of an object that is later destroyed, dangles, and using it is undefined behaviour.
- <a id="c6"></a>**C6.** As parameters, C++'s `T&` corresponds to C#'s `ref T`, and `const T&` to C#'s `in T`; a `const auto&` local bound to a member corresponds to a C# `ref readonly` local.
- <a id="c7"></a>**C7.** `auto` deduces a type without its reference and top-level `const`, so `auto x = f();` makes a copy even if `f` returns a reference; `const auto& x = f();` refers to the returned object without copying it.

## Explanation

### Another name, not another object

In C#, a variable of class type already holds a reference, and assigning it copies the reference. In C++ every variable holds its object directly, and assignment copies the object ([copy and move](copy-and-move.md)). A reference is how C++ says "not a copy: that one".

`T& alias = word;` makes `alias` a second name for `word` ([C1](#c1)). From then on, everything done to `alias` is done to `word`, including assignment. A reference cannot later be pointed at something else. That is the main difference from a pointer, which is a variable of its own holding an address that can change.

### References or pointers

A pointer can be null; a reference cannot ([C2](#c2)). So the choice says something to the reader. `void print(const Grid& grid)` means "give me a grid". `void print(const Grid* grid)` means "give me a grid, or nothing", and the function must check. Pointers are also needed where an object is re-pointed, as when walking a linked list. Otherwise references are the default.

The syntax differs at the call and in the body. A reference is used like the object itself: `grid.header()`. A pointer needs `*grid` or `grid->header()` ([where the * goes](../c/pointer-declarator-syntax.md)).

### const references as parameters

Passing a `std::vector` or `std::string` by value copies it, which can be expensive. `const T&` passes the object itself, read-only ([C3](#c3)). It is C#'s `in` parameter ([C6](#c6)).

A `const T&` parameter also accepts a temporary, such as `"temporary"` passed where a `const std::string&` is expected: C++ builds a temporary string for the call. A plain `T&` refuses that ([C4](#c4)), on purpose. A function takes `T&` in order to change the caller's object. A change to a temporary would be lost when the call ends, which is almost certainly a bug, so the compiler stops it. Reading a temporary during the call is harmless, so `const T&` accepts one.

### Dangling references

A reference is only a name. It does not keep its object alive ([C5](#c5)). Returning a reference to a local variable hands out a name for something destroyed at the function's end. Keeping a reference to a member of an object, then destroying the object, does the same. C# cannot have this bug for objects, because the garbage collector keeps them alive while anything refers to them. AddressSanitizer finds it in C++ ([sanitizers](sanitizers.md)).

### auto drops the reference

`auto` takes the type of its initialiser, but without a reference and without top-level `const` ([C7](#c7)). If a getter returns `const Header&`, then `auto header = grid.header();` declares a `Header` and copies into it. To refer to the original, write `const auto& header = grid.header();`.

## Examples

Compiled with `g++ -std=c++20`:

```cpp
#include <iostream>
#include <string>

void shout(std::string& text) { text += "!"; }                  // changes the caller's string
std::size_t length(const std::string& text) { return text.size(); }  // reads only, no copy

int main() {
    std::string word = "hello";
    std::string& alias = word;   // a second name for word
    alias = "bye";               // assigns to word; alias still names word
    shout(word);

    std::cout << word << ' ' << length("temporary") << '\n';
    // shout("temporary");       // error: cannot bind non-const lvalue reference to a temporary
}
```

Output:

```text
bye! 9
```

From [PartonForge](https://github.com/thomaswening/PartonForge)'s `pf_grid`. The header is small, so a copy would cost almost nothing here. `const auto&` is written anyway, as a habit: it never costs more than a copy, and for a large object it saves one ([C7](#c7)). It is safe because `grid` outlives `header` ([C5](#c5)):

```cpp
const auto grid = pf::Grid::read(grid_path);
const auto& header = grid.header();   // refers to the header inside grid
std::cout << header.qg0 << '\n';
```

A pointer where "nothing" is a valid answer:

```cpp
const std::string* find_name(int id);   // returns nullptr if there is no such id

// Declares name, then runs the block only if it is not null.
if (const std::string* name = find_name(7)) {
    std::cout << *name << '\n';
}
```

## Pitfalls

- Expecting `alias = other;` to make `alias` refer to `other`. It copies `other` into the object `alias` names ([C1](#c1)).
- Returning a reference to one of the function's own local variables, as in `const std::string& f() { std::string s = "x"; return s; }`. `s` is destroyed when `f` returns, so the caller receives a reference to an object that no longer exists. It compiles, with only a warning ([C5](#c5)). A reference to an object that is still alive, as in `const auto& b = a;` with `a` in the same scope, is fine.
- Writing `auto x = obj.big_member();` and modifying `x`, expecting `obj` to change. `auto` made a copy ([C7](#c7)).
- Using a pointer parameter "to avoid a copy". A `const T&` does that and cannot be null ([C2](#c2), [C3](#c3)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-25: Thomas's review of [PR 1](https://github.com/thomaswening/PartonForge/pull/1), on `const auto& h = g.header();` and `const std::filesystem::path&` parameters.
- Backlog entry `cpp/references`, from the review of [doubting-thomas PR #3](https://github.com/thomaswening/doubting-thomas/pull/3) (`int& first`, `const Poly&`).
- [cppreference: reference declaration](https://en.cppreference.com/w/cpp/language/reference), [`auto`](https://en.cppreference.com/w/cpp/language/auto), [C++ Core Guidelines F.16 and F.60](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rf-in).
