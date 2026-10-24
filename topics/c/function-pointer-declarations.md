---
title: Reading function-pointer declarations
area: c
created: 2026-10-20
updated: 2026-10-20
prerequisites: [c/pointer-declarator-syntax]
related: [c/opaque-handles]
projects: [tante]
tags: [c, cpp, function-pointer, declarator, delegate]
---

# Reading function-pointer declarations

## TL;DR

- A **function pointer** holds the address of a function and can be called like one. Its closest C# counterpart is a delegate such as `Func<long, IntPtr>`.
- Read a declaration **from the name outwards**: right while you can, left when you hit a closing bracket.
- `int (*f)(double)` reads "f is a pointer to a function taking a double and returning an int".
- The brackets around `*f` matter: without them, `int *f(double)` declares a function returning `int*`.
- A struct whose fields are function pointers is how C expresses an interface or a table of services.

## Key claims

- <a id="c1"></a>**C1.** `R (*name)(P1, P2)` declares `name` as a pointer to a function that takes parameters of types `P1` and `P2` and returns `R`.
- <a id="c2"></a>**C2.** `R *name(P)`, without brackets around `*name`, declares a function named `name` that takes `P` and returns `R*`; it is not a pointer variable.
- <a id="c3"></a>**C3.** A C declaration is read starting at the declared name, moving right through `(...)` (function) and `[...]` (array) until a closing bracket or the end, then left through `*` (pointer to) and the type, and outwards bracket by bracket (the right-left rule).
- <a id="c4"></a>**C4.** A function's name used as a value converts to a pointer to that function, so `fp = square;` and `fp = &square;` are equivalent, as are the calls `fp(3)` and `(*fp)(3)`.
- <a id="c5"></a>**C5.** `typedef int (*unary_fn)(int);` in C, or `using unary_fn = int (*)(int);` in C++, names the function-pointer type so that later declarations read as `unary_fn fp;`.
- <a id="c6"></a>**C6.** A struct of function pointers that a library fills in and hands to client code plays the role of an interface instance: the client calls through the fields without linking against, or knowing, the functions behind them.

## Explanation

### What a function pointer is

Compiled functions live at addresses in memory. A function pointer stores such an address, and calling through it calls that function. In C# the same job is done by a delegate: `Func<long, IntPtr>` is a reference to some method taking a `long` and returning an `IntPtr`. C's version is lower-level (no captured `this`, no multicast) but the idea is the same.

### Reading the declaration

C's rule is that a declaration looks like a use: `int (*f)(double)` says that the expression `(*f)(2.0)` has type `int`. That is precise but hard to read from left to right. Instead, start at the name and spiral outwards ([C3](#c3)):

```c
int (*f)(double);
```

1. Start at `f`.
2. To the right is `)`, so turn left: `*`, **f is a pointer**…
3. Leave the brackets; to the right is `(double)`: …**to a function taking a double**…
4. Nothing more to the right; to the left is `int`: …**returning int** ([C1](#c1)).

The brackets around `*f` force step 2 to happen before step 3. Remove them and `f` binds to `(double)` first, so `int *f(double)` is a function returning `int*` ([C2](#c2)), not a variable at all.

### A larger example

The field from [Tante](https://github.com/thomaswening/Tante)'s module interface:

```c
tante_rational* (*rational_from_int64)(int64_t value);
```

`rational_from_int64` → `*`: a pointer → `(int64_t value)`: to a function taking an `int64_t` → `tante_rational*`: returning a pointer to `tante_rational`. In C#: `Func<long, IntPtr> RationalFromInt64`. The parameter name `value` is documentation only.

### Naming the type

Writing the full syntax every time is error-prone, so code usually names the type once ([C5](#c5)). After `using unary_fn = int (*)(int);` a variable is just `unary_fn fp;`, much like declaring a delegate type in C#.

### Tables of functions

A struct whose fields are function pointers is C's interface ([C6](#c6)). A library fills one in with its own functions and passes a pointer to it to the client. The client calls `host->rational_add(a, b)` without knowing which function is behind the field, and without linking against the library. In .NET terms this is an object implementing an interface, handed over by dependency injection. C++'s virtual functions are implemented with essentially the same thing, a hidden table of function pointers per class (the vtable).

## Examples

```c
#include <stdio.h>

int square(int x) { return x * x; }
int negate(int x) { return -x; }

typedef int (*unary_fn)(int);

typedef struct {
    unary_fn first;
    unary_fn second;
} ops;

int main(void)
{
    int (*fp)(int) = square;          /* full syntax */
    unary_fn gp = &negate;            /* & is optional */
    ops table = { square, negate };

    printf("%d %d %d %d\n", fp(3), (*gp)(3), table.first(4), table.second(4));
    return 0;
}
```

Expected output:

```
9 -3 16 -4
```

More declarations to practise on:

| Declaration | Reads as |
|---|---|
| `int *(*f)(double)` | f is a pointer to a function taking a double, returning a pointer to int |
| `int (*ops[4])(int, int)` | ops is an array of 4 pointers to functions taking two ints, returning int |
| `void (*on_done)(void)` | on_done is a pointer to a function taking nothing, returning nothing |

## Pitfalls

- Dropping the brackets around `*name` and declaring a function instead of a pointer ([C2](#c2)). The compiler may only complain later, when the "variable" is assigned.
- Reading left to right: `int (*f)(double)` does not "start with int"; the name is the starting point ([C3](#c3)).
- Calling a null function pointer: like invoking a null delegate, but in C it is undefined behaviour rather than an exception.

## Sources

- Claude session on [Tante](https://github.com/thomaswening/Tante), 2026-10-19, explaining the engine function table of [Tante ADR-0004](https://github.com/thomaswening/Tante/pull/1).
- cppreference: [pointer declaration (C), pointers to functions](https://en.cppreference.com/w/c/language/pointer), [function declaration (C)](https://en.cppreference.com/w/c/language/function_declaration).
