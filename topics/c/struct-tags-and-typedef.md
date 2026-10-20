---
title: Struct tags and typedef
area: c
created: 2026-10-20
updated: 2026-10-20
prerequisites: []
related: [c/opaque-handles]
tags: [c, struct, typedef, incomplete-type, forward-declaration]
---

# Struct tags and typedef

## TL;DR

- In C, the name after `struct` is a **tag**, not a type name: the type is called `struct point`, and you must write both words.
- `typedef struct point point;` adds the short name `point` as an alias for `struct point`. That is why the name appears twice.
- The two can share a spelling because C keeps tags and ordinary names in **separate name spaces**.
- In C++ a struct's name is a type name by itself, so the typedef is unnecessary there but harmless; headers meant for both languages keep it.
- `typedef struct x x;` without a body also **forward-declares** an incomplete type, which is the basis of opaque handles.

## Key claims

- <a id="c1"></a>**C1.** In C, `struct point { int x, y; };` declares a type whose name is `struct point`; a later declaration `point p;` is an error unless a typedef named `point` exists.
- <a id="c2"></a>**C2.** `typedef struct point point;` makes the identifier `point` an alias for the type `struct point`; it does not create a new, distinct type.
- <a id="c3"></a>**C3.** C keeps struct, union and enum tags in a name space separate from ordinary identifiers (variables, functions, typedef names), so a tag and a typedef may have the same spelling without conflict.
- <a id="c4"></a>**C4.** In C++, the name of a class or struct is usable as a type name without the `struct` keyword, and a `typedef struct point point;` that names the same type is allowed, so a header using this idiom compiles as both C and C++.
- <a id="c5"></a>**C5.** A struct declared without a body, as in `struct x;` or `typedef struct x x;`, is an incomplete type: code may declare and pass pointers to it, but may not create an object of it, access its members, or apply `sizeof` to it.
- <a id="c6"></a>**C6.** An anonymous struct given a name only by typedef, `typedef struct { int x, y; } point;`, has no tag, so it cannot be forward-declared and cannot contain a pointer to its own type by name.

## Explanation

### Why C makes you write `struct`

In C# a `struct Point` is simply the type `Point`. C is older and treats the word after `struct` as a label for that particular struct, a **tag**, that only means something together with the keyword ([C1](#c1)). The type is `struct point`, two words, and every declaration has to say so:

```c
struct point p;
```

Typing `struct` everywhere is tedious, so C programmers give the type a one-word name with `typedef`, C's way of declaring a type alias, like `using Point = ...;` in C# ([C2](#c2)).

### Why the same name can appear twice

C looks names up in different **name spaces** depending on the context. After the keyword `struct` it looks among tags; elsewhere it looks among ordinary identifiers ([C3](#c3)). So in

```c
typedef struct point point;
```

the first `point` is the tag and the second is the new ordinary name. They never collide, and using the same spelling for both is the usual convention.

### C++

C++ dropped the need for the keyword: a struct's name is a type name on its own ([C4](#c4)). A C++ programmer never needs the typedef. It survives in headers that must compile as both C and C++, such as a library's C interface, because C++ accepts it as a harmless re-declaration of the same name.

### Declaring a type without its contents

`typedef struct x x;` with no `{ ... }` says that a type exists without saying what is inside it. Such a type is **incomplete** ([C5](#c5)): the compiler doesn't know its size, so it can't create one, but a pointer to it has a known size, so pointers can be declared, stored and passed around. A library uses this to hide its data structure from its users entirely; see [opaque handles](opaque-handles.md).

## Examples

```c
#include <stdio.h>

struct point { int x, y; };          /* the type is "struct point" */
typedef struct point point;          /* now "point" works too */

typedef struct node node;            /* forward declaration with typedef */
struct node { int value; node* next; };  /* the struct can refer to itself */

int main(void)
{
    struct point a = {1, 2};
    point b = {3, 4};                /* same type as a */
    node n = {42, NULL};
    printf("%d %d %d\n", a.x + b.x, a.y + b.y, n.value);
    return 0;
}
```

Expected output:

```
4 6 42
```

Errors the compiler gives for incomplete types ([C5](#c5)):

```c
typedef struct secret secret;
secret* p = NULL;      /* fine: a pointer to an incomplete type */
secret s;              /* error: storage size of 's' isn't known */
size_t n = sizeof(secret);  /* error: invalid application of sizeof to incomplete type */
```

## Pitfalls

- Reading `typedef struct point point;` as declaring two things called `point` of different kinds that might clash. They live in different name spaces ([C3](#c3)).
- Using the anonymous form `typedef struct { ... } point;` for a type that must be forward-declared or must point to itself, such as a list node ([C6](#c6)).
- Assuming a typedef creates a distinct type that the compiler checks: an alias and the original are interchangeable ([C2](#c2)).

## Sources

- Claude session on Tante, 2026-10-19, discussing the C module interface of [Tante ADR-0004](https://github.com/thomaswening/Tante/pull/1).
- cppreference: [struct declaration (C)](https://en.cppreference.com/w/c/language/struct), [typedef (C)](https://en.cppreference.com/w/c/language/typedef), [lookup and name spaces (C)](https://en.cppreference.com/w/c/language/name_space).
