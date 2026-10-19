---
title: Where the * goes
area: c
created: 2026-10-20
updated: 2026-10-20
prerequisites: []
related: [c/function-pointer-declarations]
tags: [c, cpp, pointer, declarator, const, dereference]
---

# Where the * goes

## TL;DR

- In a **declaration**, `*` means "pointer to". `int* p` and `int *p` are the same declaration; spacing is style.
- The `*` binds to each declared name, not to the type: `int* a, b;` makes `a` a pointer and `b` a plain `int`. C# does the opposite.
- In an **expression**, `*p` follows the pointer to what it points to (dereferencing), `&x` takes an address, and `a * b` is multiplication.
- `p->x` is shorthand for `(*p).x`.
- `const` applies to what is on its left (or, at the start, to what is on its right): `const int* p` protects the int, `int* const p` protects the pointer.

## Key claims

- <a id="c1"></a>**C1.** In a C or C++ declaration, whitespace around `*` has no meaning: `int* p;`, `int *p;` and `int * p;` all declare `p` as a pointer to `int`.
- <a id="c2"></a>**C2.** In C and C++, `int* a, b;` declares `a` as a pointer to `int` and `b` as an `int`, because the `*` is part of each name's declarator, not of the shared type.
- <a id="c3"></a>**C3.** In C# unsafe code, `int* a, b;` declares both `a` and `b` as pointers to `int`, unlike C and C++.
- <a id="c4"></a>**C4.** In an expression, unary `*p` (dereference) yields the object `p` points to, unary `&x` yields the address of `x`, and binary `a * b` is multiplication; the meaning of `*` depends on whether it appears in a declaration or an expression, and on whether it has one operand or two.
- <a id="c5"></a>**C5.** `p->m` is equivalent to `(*p).m`: it accesses member `m` of the struct that `p` points to.
- <a id="c6"></a>**C6.** In `const int* p` (equivalently `int const* p`) the pointed-to `int` cannot be changed through `p` but `p` can be re-pointed; in `int* const p` the pointer cannot be re-pointed but the `int` can be changed through it.

## Explanation

### Two contexts, two meanings

The same character does different jobs depending on where it stands ([C4](#c4)):

- In a declaration, `int* p` says what `p` **is**: a pointer to an int.
- In an expression, `*p` **does** something: it goes to the address in `p` and gives you the int there.
- With two operands, `a * b` is multiplication.

C# unsafe code uses the same three meanings, so the syntax may look familiar.

### Spacing is style, binding is not

Where you put the space is a matter of style ([C1](#c1)). C programmers tend to write `int *p`, C++ programmers `int* p`. The C style reflects how the grammar actually works: the `*` belongs to the name being declared. That is what bites in a multi-name declaration ([C2](#c2)): `int* a, b;` reads as if both are pointers, but only `a` is. C# chose the other rule, so the same line declares two pointers there ([C3](#c3)). The safe habit in C and C++ is one declaration per line.

### Getting at members

`(*p).x` dereferences `p` and then takes member `x`. The brackets are needed because `.` binds tighter than `*`. Since this is so common, C has the shorthand `p->x` ([C5](#c5)). In C# `.` does both jobs for references, and unsafe code uses `->` the same way C does.

### const

`const` makes something read-only, and its position says what ([C6](#c6)). Read the declaration from right to left:

- `const int* p`: p is a pointer to an int that is const. You can't change the int through `p`; you can point `p` elsewhere. This is the common form for read-only parameters, close to C#'s `in` or `ReadOnlySpan<T>`.
- `int* const p`: p is a const pointer to an int. `p` always points to the same place, but the int there can change.
- `const int* const p`: neither.

## Examples

```c
#include <stdio.h>

typedef struct { int x, y; } point;

int main(void)
{
    int value = 5;
    int* a, b;            /* a is int*, b is int */
    a = &value;           /* & takes the address */
    b = *a * 2;           /* * dereferences, then * multiplies */

    point pt = {1, 2};
    point* pp = &pt;
    pp->x = 10;           /* same as (*pp).x = 10 */

    const int* ro = &value;
    /* *ro = 7;   error: assignment of read-only location */
    ro = &b;              /* fine: the pointer itself may change */

    printf("%d %d %d %d\n", *a, b, pt.x, *ro);
    return 0;
}
```

Expected output:

```
5 10 10 10
```

## Pitfalls

- Writing `int* a, b;` and expecting two pointers ([C2](#c2)), especially when coming from C# ([C3](#c3)).
- Writing `*p.x` meaning `(*p).x`: it parses as `*(p.x)`. Use `p->x` ([C5](#c5)).
- Reading `const int* p` as "a constant pointer"; it is a pointer to a constant ([C6](#c6)).
- Dereferencing a pointer that is null or no longer points to a live object: undefined behaviour in C, where C# would throw.

## Sources

- Claude session on Tante, 2026-10-20, discussing the C module interface of [Tante ADR-0004](https://github.com/thomaswening/Tante/pull/1).
- cppreference: [pointer declaration (C)](https://en.cppreference.com/w/c/language/pointer), [member access operators (C)](https://en.cppreference.com/w/c/language/operator_member_access), [const type qualifier (C)](https://en.cppreference.com/w/c/language/const).
- Microsoft Learn: [pointer types in C#](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/unsafe-code#pointer-types).
