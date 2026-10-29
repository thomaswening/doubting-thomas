---
title: Linkage and storage duration
area: cpp
created: 2026-10-25
updated: 2026-10-30
prerequisites: [cpp/header-only-libraries]
related: [cpp/const-and-constexpr, c/stack-and-heap, cpp/abi-and-shared-libraries]
projects: [partonforge]
tags: [cpp, linkage, translation-unit, static, unnamed-namespace, storage-duration, inline-variable]
---

# Linkage and storage duration

## TL;DR

- A **translation unit** is one `.cpp` file with its `#include`s pasted in. Each is compiled on its own, and the linker joins them.
- **Linkage** says whether a name in one translation unit means the same thing as that name in another. **External** linkage: shared by the whole program. **Internal** linkage: private to its translation unit.
- An **unnamed namespace**, `namespace { … }`, gives everything in it internal linkage. It is the C++ way to write file-local helpers, like a `file class` in C#.
- An unnamed namespace usually sits **inside** the project's namespace. Linkage is the same either way, but code in that namespace then finds the helpers first, and the helpers can use the namespace's names without a prefix.
- **Storage duration** says when an object is created and destroyed. Locals have automatic duration; globals and `static` locals live for the whole program.
- The keyword `static` means three different things: internal linkage at namespace scope (outside any function or class, including the global scope outside every namespace), static duration on a local, and "shared by all objects" on a class member.
- A `static` variable defined in a header gives every file that includes it a copy of its own. An `inline` variable gives one, shared.

## Key claims

- <a id="c1"></a>**C1.** A translation unit is a source file after preprocessing, with the contents of every `#include` inserted; the compiler compiles each translation unit separately, and the linker combines the results into one program.
- <a id="c2"></a>**C2.** A name with external linkage refers to the same entity in every translation unit; functions and non-`const` variables declared at namespace scope have external linkage by default, so two translation units that both define the same such function cause a multiple-definition error at link time.
- <a id="c3"></a>**C3.** Everything declared in an unnamed namespace, `namespace { … }`, has internal linkage: it is visible only in its own translation unit, and another translation unit may define something with the same name without a clash. Declaring a namespace-scope function or variable `static` has the same effect, but works only for functions and variables, not for types.
- <a id="c4"></a>**C4.** In C++, a namespace-scope variable declared `const` or `constexpr`, and not `inline` or `extern`, has internal linkage by default; in C, a `const` variable at file scope has external linkage.
- <a id="c5"></a>**C5.** A namespace-scope `static` variable defined in a header is a separate object in every translation unit that includes the header, so a change made in one file is not seen in another; an `inline` variable (C++17), such as `inline int shared = 0;`, is a single object for the whole program.
- <a id="c6"></a>**C6.** A local variable declared `static` has static storage duration: it is initialised the first time control passes through its declaration, keeps its value between calls, and is destroyed when the program ends. Since C++11 that initialisation is thread-safe.
- <a id="c7"></a>**C7.** Linkage and storage duration are independent: a `static` local has static storage duration but no linkage, a variable in an unnamed namespace has static storage duration and internal linkage, and an ordinary local has automatic storage duration and no linkage.
- <a id="c8"></a>**C8.** A `static` data member or member function of a class belongs to the class, not to any object, like a `static` member in C#.
- <a id="c9"></a>**C9.** An unnamed namespace behaves like a namespace with a unique name plus a `using` directive for it in the enclosing namespace. So an unnamed namespace inside `namespace pf` gives the same internal linkage as one at global scope, but its names are found as if declared in `pf`: code in `pf` finds them before any global function of the same name, and the helpers use `pf`'s names without `pf::`. At global scope, a helper with the same name and parameters as a global function makes an unqualified call ambiguous.

## Explanation

### Translation units and the linker

C# compiles a whole project at once, so every file sees every other. C++ compiles each `.cpp` file alone, after pasting in its headers ([C1](#c1)). The compiler leaves references to functions defined elsewhere unresolved, and the linker fills them in ([ABI and shared libraries](abi-and-shared-libraries.md)).

For that to work, a name must mean the same thing in every file that uses it. That is **external linkage** ([C2](#c2)), the default for functions and global variables. It also means the program may contain only one definition of each such function. That is why a function defined in a header needs `inline` ([header-only libraries](header-only-libraries.md#c3)).

### File-local code

A **named** namespace such as `pf` does not change linkage. It only adds a prefix to the name: `pf::diff_grid_files` is one function for the whole program, just as a global `diff_grid_files` would be. *Namespace scope* means anywhere outside a function or class, in a named namespace or in the global scope.

Helpers that only one file needs should not be visible to the linker at all. Two files might each have a helper called `trimmed`, and with external linkage the link would fail. **Internal linkage** makes a name private to its translation unit ([C3](#c3)).

C++ offers two ways to get it. The modern one is an unnamed namespace: everything inside `namespace { … }` is file-local, types included. It works because the compiler gives each unnamed namespace a hidden name that is different in every translation unit. A helper in it is then, say, `__unique_a::trimmed` in one file and `__unique_b::trimmed` in another, so no other file can name it. The older one is `static` in front of a function or variable at namespace scope. It cannot be applied to a class, which is one reason the unnamed namespace is preferred. The nearest C# feature is the `file` access modifier of C# 11, which makes a type visible only in its source file.

### Inside or outside the project's namespace

Where should the unnamed namespace go: at the top of the file, or inside the project's namespace, as in `namespace pf { namespace { … } }`? For linkage it doesn't matter. Both make the helpers file-local ([C9](#c9)).

It matters for **name lookup**, the compiler's search for what an unqualified name like `trimmed(x)` refers to. The compiler treats an unnamed namespace as if it had a unique name and the enclosing namespace said `using namespace` for it. Inside `pf`, the helpers are therefore found as if they were declared in `pf`. A function in `pf` searches `pf` first and stops there, so a global function `trimmed` from some header never competes. And the helpers can name `pf`'s types and constants without the `pf::` prefix. At global scope, the helpers compete with every global function of the same name, and an identical one makes the call ambiguous. So the convention is to put the unnamed namespace inside the project's namespace. It is a convention, not a rule: a file whose helpers use only `std` names and clash with nothing works either way.

`const` and `constexpr` globals are file-local by default in C++ ([C4](#c4)). That is why a header can define `const int kColumns = 26;` without a link error. C differs here.

To remember it, picture C++ writing an invisible `static` in front of every namespace-scope `const`. C++ made that choice so that a constant could move into a header and replace a `#define`, with every file getting its own copy and no clash at link time. C is older and kept the ordinary rule. To share one `const` object across files in C++, write `inline const` (C++17) or `extern const`.

### static in a header

A header is pasted into each file that includes it. So `static int per_file = 0;` in a header defines one `per_file` *per translation unit* ([C5](#c5)). Code in `a.cpp` that increments it changes `a.cpp`'s copy, and `main.cpp` still sees 0. If one shared variable is meant, C++17's `inline` variable is the tool: every translation unit sees the same object. `inline constexpr` does the same for constants, which is how [PartonForge](https://github.com/thomaswening/PartonForge) declares `kColumnsPerValue` in a header.

### Storage duration

Storage duration is a different question: *when* an object exists ([C7](#c7)). An ordinary local is created when its declaration runs and destroyed at the end of its block: **automatic** duration ([stack and heap](../c/stack-and-heap.md)). Globals, and anything in a namespace, exist for the whole run: **static** duration. Objects made with `new` exist until `delete`: **dynamic** duration.

A `static` local combines a local's visibility with a global's lifetime ([C6](#c6)). It is initialised once, the first time the function reaches it, and keeps its value between calls. C# has no static locals; the nearest is a `static` field of the class. A static local fits a small table that should be built once, such as the coordinate names in PartonForge's `field_name`.

### Three meanings of static

| Where | Meaning |
|---|---|
| A function or variable at namespace scope | internal linkage ([C3](#c3)) |
| A local variable | static storage duration ([C6](#c6)) |
| A class member | belongs to the class, not to an object ([C8](#c8)) |

## Examples

A header with a `static` and an `inline` variable, included by two files:

```cpp
// counter.hpp
static int per_file = 0;   // one per translation unit
inline int shared = 0;     // one for the whole program
void bump();
```

```cpp
// a.cpp
#include "counter.hpp"
void bump() { ++per_file; ++shared; }
```

```cpp
// main.cpp
#include <iostream>
#include "counter.hpp"
int main() {
    bump();
    std::cout << per_file << ' ' << shared << '\n';
}
```

Built with `g++ -std=c++20 a.cpp main.cpp` and run, it prints:

```text
0 1
```

`bump` incremented `a.cpp`'s `per_file`, not `main.cpp`'s.

A `static` local keeps its value between calls:

```cpp
#include <iostream>

int next_id() {
    static int id = 0;   // initialised once, on the first call
    return ++id;
}

int main() {
    std::cout << next_id() << next_id() << next_id() << '\n';
}
```

Output:

```text
123
```

File-local helpers, as in PartonForge's `grid_diff.cpp`:

```cpp
namespace pf {
namespace {                     // internal linkage: only this file sees these
std::string trimmed(const std::string& field) { /* ... */ }
}  // namespace

GridDiff diff_grid_files(/* ... */) { /* uses trimmed */ }   // external: part of the library
}  // namespace pf
```

Why inside `pf` ([C9](#c9)): a function in `pf` finds the file-local helper before a global one of the same name.

```cpp
#include <iostream>

int helper() { return 1; }   // a global function, say from some header

namespace pf {
namespace {
int helper() { return 2; }   // file-local, inside pf
}  // namespace

int answer() { return helper(); }
}  // namespace pf

int main() { std::cout << pf::answer() << '\n'; }
```

Output:

```text
2
```

The same helper in an unnamed namespace at global scope clashes:

```cpp
int helper() { return 1; }

namespace {
int helper() { return 2; }
}  // namespace

int main() { return helper(); }   // error: call of overloaded 'helper()' is ambiguous
```

The clash comes from name lookup, which sees only the declarations in the current translation unit. So it depends on whether this file can see the global `helper()`, not on where that function is defined. Checked with GCC 13.3, with the unnamed-namespace `helper()` in `main.cpp`:

| The global `helper()` | Result |
|---|---|
| Defined in `a.cpp`, not declared in `main.cpp` | Compiles, links and prints `2`. Lookup in `main.cpp` does not see the global function, and the linker sees no clash because the unnamed one has internal linkage. |
| Defined in `a.cpp`, declared in `main.cpp`, for example through a header | `error: call of overloaded 'helper()' is ambiguous` |

A function from another file is normally used through its header, so the second row is the usual case.

## Pitfalls

- Putting `static int counter;` in a header to share it. Every file gets its own ([C5](#c5)). Use `inline int counter;`.
- Reading `static` on a local as "compile-time constant". It is about lifetime ([C6](#c6)); a compile-time constant is `constexpr` ([const and constexpr](const-and-constexpr.md)).
- Giving file-local helpers external linkage. It works until another file has a helper with the same name, then the link fails ([C2](#c2), [C3](#c3)).
- Assuming C's rule for `const` globals in C++, or the reverse ([C4](#c4)).
- Thinking an unnamed namespace inside `pf` makes its helpers visible to other files that use `pf`. It doesn't: linkage stays internal, and only lookup within this file changes ([C9](#c9)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-25: Thomas's review of [PR 1](https://github.com/thomaswening/PartonForge/pull/1), on the unnamed namespace in `grid_diff.cpp` and on `static const char* two[]`.
- Claude session on PartonForge, 2026-10-27: Thomas's question why `src/fortran_io.cpp` puts its unnamed namespace inside `namespace pf`. Source of [C9](#c9).
- Backlog entry `cpp/linkage-and-storage-duration`, from C++ Intermediate Quiz: Round 3, question 3 (2026-10-21).
- [cppreference: storage class specifiers](https://en.cppreference.com/w/cpp/language/storage_duration) (linkage and storage duration), [namespaces](https://en.cppreference.com/w/cpp/language/namespace#Unnamed_namespaces), [`inline` specifier](https://en.cppreference.com/w/cpp/language/inline).
