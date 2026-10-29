---
title: Constructors in C++
area: cpp
created: 2026-10-20
updated: 2026-10-28
prerequisites: []
related: [cpp/raii-and-ownership, cpp/copy-and-move, c/one-element-array-typedef]
projects: [tante]
tags: [cpp, constructor, explicit, conversion, initialiser-list, default, delete, delegating-constructor]
---

# Constructors in C++

## TL;DR

- A constructor that can be called with one argument is also an **implicit conversion** unless it is marked `explicit`. C# never converts through constructors; it only has `implicit operator` and `explicit operator`.
- The **member initialiser list** (`: x(1), y(2)`) initialises the fields before the body runs. Assigning in the body is too late for `const` and reference members, and does the work twice for the others.
- Members are always initialised in the order they are **declared in the class**, whatever order the initialiser list names them in.
- The compiler writes a default constructor only for a class that declares no constructor at all. `= default` asks for it back; `= delete` forbids a function outright.
- A **delegating constructor** hands the work to another constructor of the same class, like C#'s `: this(...)`.
- `T b = a;` is initialisation and calls a constructor; `b = a;` on an existing object is assignment and calls `operator=`.

## Key claims

- <a id="c1"></a>**C1.** A constructor that can be called with a single argument and is not marked `explicit` is a converting constructor: the compiler uses it on its own to turn a value of the argument's type into the class type, for example when passing `2.5` to a parameter of class type, though it applies at most one such user-defined conversion in a row.
- <a id="c2"></a>**C2.** On a constructor callable with one argument, `explicit` forbids its use as an implicit conversion, so the object must be created visibly, as in `Meters(3.0)` or `static_cast<Meters>(3.0)`. On a constructor that needs two or more arguments, `explicit` only forbids copy-list-initialisation such as `Point p = {1, 2};` or `f({1, 2})`.
- <a id="c3"></a>**C3.** C# never converts a value implicitly through a constructor; user-defined conversions exist only where the type declares `implicit operator` or `explicit operator`. A non-`explicit` one-argument C++ constructor plays the role of a C# `implicit operator`, and a C++ `explicit operator T()` corresponds to a C# `explicit operator` that needs a cast.
- <a id="c4"></a>**C4.** The member initialiser list initialises each member it names before the constructor body runs. A member it does not name, and that has no default member initialiser (`int n = 0;`), is default-initialised: a class-type member by its default constructor, a built-in member such as `int` or a pointer left with an indeterminate value.
- <a id="c5"></a>**C5.** Members are initialised in the order of their declaration in the class, after the base classes, regardless of the order in the member initialiser list, and are destroyed in the reverse order.
- <a id="c6"></a>**C6.** A `const` member, a reference member, and a member whose type has no default constructor must be initialised in the member initialiser list or by a default member initialiser; assigning to them in the constructor body does not compile. A C# `readonly` field, by contrast, may be assigned in the constructor body.
- <a id="c7"></a>**C7.** The compiler declares a default constructor implicitly only for a class that declares no constructors; declaring any constructor removes it, and `T() = default;` brings it back.
- <a id="c8"></a>**C8.** `= delete` can be applied to any function, constructors and copy operations included; the deleted function still takes part in overload resolution, and a call that selects it is a compile error.
- <a id="c9"></a>**C9.** A delegating constructor names another constructor of the same class as the only entry of its member initialiser list, as in `Point() : Point(0, 0) {}`; the target constructor runs completely, then the delegating constructor's body runs.
- <a id="c10"></a>**C10.** `T b = a;` and `T b(a);` initialise a new object and call a constructor, although the first is written with `=`; `b = a;` on an object that already exists calls the assignment operator `operator=`.

## Explanation

### Constructors that convert

In C#, `new Meters(3.0)` is the only way to get a `Meters` from a `double`, unless the type author writes `public static implicit operator Meters(double v)` ([C3](#c3)). C++ is more generous: any constructor that can be called with one argument doubles as a conversion ([C1](#c1)). If `void walk(Meters m);` exists and `Meters` has a constructor taking a `double`, then `walk(3.0)` compiles, and C++ quietly builds a temporary `Meters(3.0)` to pass.

That is sometimes what you want. `std::string` has a constructor taking a `const char*`, so a function taking a `std::string` accepts `"hello"` directly. More often it is a surprise: a `Poly` built from a context pointer, or a `Buffer` built from a size, should never appear just because an `int` was passed where a `Buffer` was expected.

`explicit` switches the conversion off ([C2](#c2)). The constructor still works when you call it by name; it just never runs behind your back. The [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-explicit) make `explicit` the default for one-argument constructors, and leave it off only where the conversion is meant, as for `std::string`.

"Callable with one argument" includes constructors with more parameters that all but one have defaults: `Buffer(int size, int fill = 0)` converts from `int` too.

A constructor that needs two or more arguments cannot convert a single value, so there `explicit` has a narrower effect: it forbids the brace form with `=`, as in `Point p = {1, 2};` or passing `{1, 2}` to a `Point` parameter. Writing `Point p{1, 2};` or `Point p(1, 2);` still works.

### Conversion operators

The other direction, from your class to another type, is a member function named after the target type: `operator double() const`. Without `explicit` it is the counterpart of a C# `implicit operator`; with `explicit` it needs a cast, like a C# `explicit operator` ([C3](#c3)). The common case is `explicit operator bool()`, which lets an object be tested in `if (x)` but stops it from being added to an `int` by accident. An `if`, `while` or `!` may use an explicit `operator bool` without a cast; other expressions may not.

### The member initialiser list

A C# constructor body starts with every field already zeroed, then assigns. A C++ constructor has a separate step before the body: the **member initialiser list**, written after a colon ([C4](#c4)).

```cpp
Person(const std::string& n) : name(n) { /* body */ }
```

`name(n)` constructs `name` from `n`. When the body starts, every member already exists. Members the list does not mention are default-initialised, and for built-in types such as `int`, `double` or a pointer that means *not initialised at all*: the value is garbage, and reading it is undefined behaviour. C# would have given you `0`. A **default member initialiser**, `int count = 0;` at the declaration, closes that gap for every constructor at once.

### Initialisation is not assignment

Writing `name = n;` in the body instead looks the same but is two steps: `name` is first default-constructed (an empty string), then overwritten by assignment. For a string that is wasted work. For some members it is impossible ([C6](#c6)):

- A `const` member can only receive its value when it is created.
- A reference member must be bound when it is created, and can never be rebound.
- A member whose type has no default constructor cannot be "first default-constructed".

C# draws the line elsewhere: a `readonly` field may be assigned anywhere in the constructor body. In C++, the body is already too late; the list is where members are born.

The same distinction appears outside constructors ([C10](#c10)). `Poly b = a;` creates `b`, so it calls the copy constructor even though it is written with `=`. `b = a;` on an existing `b` calls `operator=`. The two `= delete` lines in [RAII and ownership](raii-and-ownership.md#examples) forbid exactly these two. [Copy and move](copy-and-move.md#c1) explains both operations and their move counterparts.

### Why declaration order wins

Members are initialised in the order the class declares them, not the order the list names them ([C5](#c5)). There are two reasons. A class can have several constructors with lists in different orders, but the destructor is one function that must destroy members in the reverse of *one* order. And one member's initialiser may read another member, which only works if the order is fixed.

The trap is a list that reads one member while initialising an earlier-declared one. It looks fine in the list, but the member being read does not exist yet. GCC and Clang warn about a list whose order differs from the declaration order (`-Wreorder`, which Clang calls `-Wreorder-ctor`; both are part of `-Wall`). The habit that avoids the problem: write the list in declaration order.

### Default constructors, `= default` and `= delete`

A default constructor is one callable with no arguments. As in C#, the compiler supplies one only while you declare no constructor yourself ([C7](#c7)). Once you write `explicit Settings(int level)`, `Settings s;` stops compiling. `Settings() = default;` brings back the compiler-written version, which initialises each member from its default member initialiser or, failing that, default-initialises it.

`= delete` does the opposite: it declares a function and forbids every call to it ([C8](#c8)). It is how a class forbids copying ([RAII and ownership, C8](raii-and-ownership.md#c8)). It works on any function, not only on special members: `void set(int); void set(double) = delete;` makes `set(2.5)` a compile error instead of silently picking a conversion. That works because the deleted overload is still a candidate: the compiler picks it as the best match and then refuses.

### Delegating constructors

To avoid repeating initialisation, a constructor can hand off to another one ([C9](#c9)): `Point() : Point(0, 0) {}`. It is C#'s `: this(0, 0)`. The delegation must be the only thing in the list; you cannot delegate and also initialise members. The target runs to completion, then the delegating constructor's body runs. From that moment the object counts as constructed, so if the delegating body throws, the destructor runs.

## Examples

`explicit` against an implicit conversion:

```cpp
#include <iostream>

struct Seconds {
    Seconds(double v) : value(v) {}            // not explicit: converts from double
    double value;
};

struct Meters {
    explicit Meters(double v) : value(v) {}    // explicit: no implicit conversion
    double value;
};

void wait(Seconds s) { std::cout << s.value << " s\n"; }
void walk(Meters m)  { std::cout << m.value << " m\n"; }

int main() {
    wait(2.5);            // compiles: a temporary Seconds(2.5) is built
    // walk(3.0);         // error: could not convert 3.0 to Meters
    walk(Meters(3.0));    // fine: the conversion is written out
}
```

Expected output:

```
2.5 s
3 m
```

Declaration order decides, not the list:

```cpp
#include <iostream>

struct Tell {
    Tell(const char* name) { std::cout << name << ' '; }   // prints when constructed
};

struct Pair {
    Pair() : second("second"), first("first") {}   // list names second first...
    Tell first;                                    // ...but first is declared first
    Tell second;
};

int main() {
    Pair p;
    std::cout << '\n';
}
```

Expected output (and a `-Wreorder` warning):

```
first second
```

The dangerous form of the same mistake:

```cpp
struct Buffer {
    Buffer(int n) : size(n), capacity(size * 2) {}   // reads size before it is set
    int capacity;     // declared first, so initialised first
    int size;
};
```

`capacity` is initialised first, from `size`, which is still garbage. The result is undefined behaviour. `-Wall` catches it: GCC and Clang report both the reorder warning and `-Wuninitialized` here. Declaring `size` before `capacity`, or writing `capacity(n * 2)`, fixes it.

Default, defaulted, deleted and delegating constructors together:

```cpp
#include <iostream>

struct Point {
    Point() : Point(0, 0) {}                       // delegating, like C#'s : this(0, 0)
    Point(int x0, int y0) : x(x0), y(y0) {}
    int x;
    int y;
};

struct Settings {
    Settings() = default;                          // without this, Settings s; would not compile
    explicit Settings(int lvl) : level(lvl) {}
    void set(int lvl) { level = lvl; }
    void set(double) = delete;                     // set(2.5) is an error, not set(2)
    int level = 1;                                 // default member initialisers
    bool verbose = false;
};

int main() {
    Point p;
    Settings s;
    s.set(3);
    // s.set(2.5);                                 // error: use of deleted function
    std::cout << p.x << ',' << p.y << ' ' << s.level << ' ' << s.verbose << '\n';
}
```

Expected output:

```
0,0 3 0
```

Initialisation against assignment in the constructor:

```cpp
#include <string>

struct Named {
    // name is first constructed empty, then assigned: two steps
    Named(const std::string& n) { name = n; }
    std::string name;
};

struct Fixed {
    Fixed(int v) : id(v) {}         // the only way: id is const
    // Fixed(int v) { id = v; }     // error: assignment of read-only member
    const int id;
};
```

## Good habits

- Mark every constructor that can be called with one argument `explicit`. Leave it off only where the conversion is the point, as for `std::string` from `"hello"` ([C1](#c1), [C2](#c2); [Core Guidelines C.46](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-explicit)).
- Give every member of built-in type a default member initialiser, `int count = 0;`, so that no constructor can leave it indeterminate ([C4](#c4); [C.48](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-in-class-initializer)).
- Initialise members in the member initialiser list, not by assignment in the body ([C4](#c4), [C6](#c6); [C.49](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-initialize)).
- Write the list in declaration order. Initialise each member from the parameters, not from other members ([C5](#c5); [C.47](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-order)).
- Build with `-Wall -Wextra` (GCC, Clang) or `/W4` (MSVC). Turn warnings into errors with `-Werror` or `/WX`. The `Buffer` bug above then stops the build ([C5](#c5)).
- Forbid what must not happen with `= delete`: copies that would share a resource, or an overload such as `set(double)` that would convert silently ([C8](#c8); [C.81](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-delete)).
- Put shared initialisation in one constructor and delegate to it, instead of repeating the list or calling an `init()` member from every body ([C9](#c9); [C.51](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-delegating)).

## Pitfalls

- Leaving `explicit` off a one-argument constructor, then finding that an `int` was silently turned into a `Buffer` somewhere ([C1](#c1), [C2](#c2)).
- Believing `explicit` has nothing to do with constructors of two or more parameters: it still blocks `Point p = {1, 2};` ([C2](#c2)).
- Expecting members to be initialised in the order of the list ([C5](#c5)).
- Expecting an `int` member to start at `0`, as in C#. Without a default member initialiser or an entry in the list, its value is indeterminate ([C4](#c4)).
- Adding a constructor with parameters and finding that `T x;` or `std::vector<T>(10)` no longer compiles: the implicit default constructor is gone ([C7](#c7)).
- Writing `Point p();` to mean "a default-constructed `Point`". It declares a function named `p` that returns a `Point`. Write `Point p;` or `Point p{};`.
- Reading `T b = a;` as assignment. It is initialisation; `operator=` is not called ([C10](#c10)).

## Sources

- Claude session on [Tante](https://github.com/thomaswening/Tante), 2026-10-20, answering review questions on `explicit` and the member initialiser list in the `Poly` wrapper of [RAII and ownership](raii-and-ownership.md#examples) ([doubting-thomas PR #3](https://github.com/thomaswening/doubting-thomas/pull/3)).
- cppreference: [converting constructor](https://en.cppreference.com/w/cpp/language/converting_constructor), [`explicit` specifier](https://en.cppreference.com/w/cpp/language/explicit), [constructors and member initialiser lists](https://en.cppreference.com/w/cpp/language/constructor), [default constructors](https://en.cppreference.com/w/cpp/language/default_constructor), [deleted functions](https://en.cppreference.com/w/cpp/language/function#Deleted_functions), [copy-initialisation](https://en.cppreference.com/w/cpp/language/copy_initialization).
- C++ Core Guidelines: [C.46 explicit single-argument constructors](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-explicit), [C.47 initialise in declaration order](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-order), [C.49 prefer initialisation to assignment](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-initialize), [C.51 delegating constructors](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-delegating), [C.48 default member initialisers](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-in-class-initializer), [C.81 `= delete`](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rc-delete).
- Microsoft Learn: [user-defined conversion operators in C#](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/user-defined-conversion-operators).
