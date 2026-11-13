---
title: Declarations, objects and initialisation
area: c
created: 2026-10-28
updated: 2026-10-28
prerequisites: [c/pointer-declarator-syntax, c/stack-and-heap]
related: [c/array-parameters, c/one-element-array-typedef, c/struct-tags-and-typedef]
projects: [tante]
tags: [c, declarator, declaration, definition, typedef, storage-duration, initialisation, pointer, struct, array]
---

# Declarations, objects and initialisation

## TL;DR

- A C declaration has a base type on the left and a declarator around the name. Read it from the name outwards: `int a[4];` is "`a` is an array of 4 `int`".
- `typedef` in front of a variable declaration turns the would-be variable name into a name for its type. `typedef int quad[4];` creates no object.
- A definition in a block, without `static`, reserves storage for the whole object until the block ends. It calls no `malloc` and initialises nothing.
- A pointer is an object of its own that holds only an address. Defining one creates nothing for it to point to.
- Brace lists initialise arrays and structs. Nested aggregates take nested braces: `frac_struct y[1] = {{1, 2}};`. Members left out become zero.

## Key claims

- <a id="c1"></a>**C1.** A C declaration consists of a base type and a declarator: the declarator surrounds the declared name and adds "array of", "pointer to" or "function returning", read from the name outwards, so `int a[4];` declares `a` as an array of four `int` and `int *p;` declares `p` as a pointer to `int`.

- <a id="c2"></a>**C2.** A `typedef` declaration has the form of a variable declaration with `typedef` in front, and makes the would-be variable name an alias for the would-be variable's type: `typedef int quad[4];` declares no object and makes `quad` mean "array of four `int`".

- <a id="c3"></a>**C3.** A declaration such as `int a[4];` inside a block, without `static`, defines an object with automatic storage duration: it reserves storage for the whole object, which lives until the block ends, but leaves its contents indeterminate unless an initialiser is given. Without an initialiser, an object defined at file scope or with `static` is zero-initialised instead. Neither kind of definition calls `malloc`: the implementation provides the storage itself. The C standard does not mention a stack; putting automatic objects on the stack is what implementations typically do.

- <a id="c4"></a>**C4.** Defining a pointer creates only the pointer, an object that holds an address: before `*p` or `p->m` may be used, `p` must point to an object with storage of its own, which may be automatic, static or allocated (for instance from `malloc`).

- <a id="c5"></a>**C5.** Arrays and structs are initialised with brace-enclosed lists whose values go to the elements, or to the members in declaration order; a nested aggregate takes its own pair of braces, as in `frac_struct y[1] = {{1, 2}};`, where the outer pair initialises the array and the inner pair its single struct element. C allows inner braces to be omitted (brace elision). Elements and members left out of a brace list are zero-initialised.

## Explanation

This note collects the vocabulary that [array parameters and array decay](array-parameters.md) and [the one-element array typedef](one-element-array-typedef.md) build on. It uses one small struct throughout, a fraction with a numerator and a denominator.

### Reading a declaration from the name outwards

In C#, the whole type stands on the left: `int[] a;`. In C, a declaration has a **base type** on the left and a **declarator** around the name ([C1](#c1)). The declarator adds "array of", "pointer to" or "function returning". You read it from the name outwards:

```
int n;                 n is an int
int a[4];              a is an array of 4 int
int *p;                p is a pointer to int
frac_struct x;         x is a frac_struct
frac_struct y[1];      y is an array of 1 frac_struct
```

The `[4]` belongs to the name, just as the `*` does in `int *p` ([where the * goes, C2](pointer-declarator-syntax.md#c2)). Longer declarators, such as `int (*p)[4]`, follow the same rule; they come up in [pointers to arrays](pointers-to-arrays.md#pointers-to-whole-arrays) and in [reading function-pointer declarations](function-pointer-declarations.md).

### Declaring, defining, storing and initialising

Four words describe what a line of C does. They are easy to blur, so here they are on one array:

- A **declaration** introduces a name and its type. `extern int a[4];` is only a declaration: it says that an array `a` exists somewhere else, and reserves nothing.
- A **definition** is a declaration that also creates the object, which reserves its storage. `int a[4];` inside a function is a definition: sixteen bytes (with 4-byte `int`) now belong to `a`.
- The object's **storage duration** says how long that storage lives ([C3](#c3)). Inside a block, without `static`, it is *automatic*: from the start of the block to its end. Implementations typically put such objects on the stack, but the C standard only speaks of automatic storage ([stack and heap, C1](stack-and-heap.md#c1)). At file scope, or with `static`, the object lives as long as the program. No `malloc` is involved in either case: the implementation provides automatic and static storage itself. Only *allocated* storage comes from `malloc`, which the section on pointers below contrasts.
- **Initialisation** gives the object a value as it is created: `int a[4] = {1, 2, 3, 4};`. Without an initialiser an automatic object's contents are indeterminate. Using them is a bug. A static object starts as zero. C# zeroes fields and array elements. It refuses to compile a read of an unassigned local.

### typedef names a type

A **typedef** declares a *type name* instead of an object. It reserves no storage ([C2](#c2)). It reuses ordinary declaration syntax. Write a variable declaration and put `typedef` in front. The would-be variable name then becomes a name for the would-be variable's type:

```c
int quad[4];            /* without typedef: a variable quad, an array of 4 int */
typedef int quad[4];    /* with typedef: quad names the type "array of 4 int" */
quad q;                 /* defines q exactly as  int q[4];  would */
```

The closest C# is a type alias such as `using Quad = SomeType;`, not a `class` declaration: the line defines nothing new. It only names a type.

The running example uses the same rule for a struct:

```c
typedef struct { long num, den; } frac_struct;
```

Without `typedef`, this would define a variable `frac_struct` of an unnamed struct type. With it, `frac_struct` is the struct's **typedef name**, and its only name, because the struct has no tag ([struct tags and typedef, C2](struct-tags-and-typedef.md#c2)).

### Objects, arrays and pointers

In C#, an `int[]` is an object on the heap. A variable holds a reference to it. The object knows its `Length`. A C array is nothing but its elements, one after the other, stored **inline**: directly in the array object's own storage, not somewhere else behind a pointer. There is no length, no header and no reference. C# has the same idea in a `fixed` buffer inside a struct, or an `[InlineArray]` struct.

Three definitions show the difference between holding an object and pointing to one:

```c
frac_struct x;          /* a frac_struct */
frac_struct y[1];       /* an array of one frac_struct */
frac_struct *p = &x;    /* a pointer, initialised with the address of x */
```

```
x:  [ num | den ]               16 bytes: a frac_struct object (8-byte long)
y:  [ y[0].num | y[0].den ]     16 bytes: an array whose one element is a frac_struct object
p:  [ address ] ──▶ x           8 bytes: a separate pointer object holding the address of x
```

- `x` is a `frac_struct` object. Its definition reserves the storage for one.
- `y` is an array that contains one `frac_struct` object. A one-element array of a struct occupies exactly the storage of the struct. [The one-element array typedef](one-element-array-typedef.md) is built on this.
- `p` is a third, separate object: a pointer. Its storage holds an address, typically 8 bytes, and nothing more. Defining `p` creates no `frac_struct`. It only lets you reach `x`.
- Neither `x` nor `y` needs `malloc`. Defined in a block, both have automatic storage ([C3](#c3)).

So a pointer always involves two pieces of storage: the pointer's own, and that of the object it points to, the **pointee**. Defining the pointer provides only the first ([C4](#c4)). Before `*p` or `p->num` may be used, `p` must point to a live object. That object can have any storage duration:

- automatic, like `x` above, so `frac_struct *p = &x;` needs no `malloc`;
- static, such as a variable defined at file scope;
- **allocated**, from `malloc`.

```c
frac_struct *q = malloc(sizeof *q);   /* room for one frac_struct, or NULL on failure */
/* ... use q->num ... */
free(q);
```

`malloc` ("memory allocate", from `<stdlib.h>`) is C's counterpart of `new`: it returns the address of a fresh, uninitialised block of the requested size. The pointer `q` itself is still an automatic local. The block it points to has allocated storage duration: it lives until it is passed to `free`. The code must do that exactly once, because C never frees such memory on its own ([stack and heap, C2](stack-and-heap.md#c2)).

Dynamic allocation pays off when an object must outlive the block that creates it, or when its size or number is known only at run time. Very large objects are a practical reason too, because implementations limit the stack. None of that applies to a small struct used within one function. A pointer does not imply the heap. An ordinary definition never implies `malloc`.

### Brace initialisation

A struct is initialised with a brace list. The values go to the members in the order in which the members are declared ([C5](#c5)):

```c
frac_struct h = {1, 2};      /* the first value to num, the second to den */
```

Members left out of the list are set to zero. C99 also lets you name the members, `{.num = 1, .den = 2}`, which is clearer when a struct has many.

When one aggregate contains another, each level takes its own pair of braces. A struct can contain an array:

```c
typedef struct { int values[3]; } triple;

triple s = {{1, 2, 3}};       /* outer braces: the struct; inner braces: its array member */
```

An array can contain structs, which is the other way round:

```c
frac_struct y[1] = {{1, 2}};  /* outer braces: the array; inner braces: its one frac_struct */
```

The outer braces initialise the array, whose only element is `y[0]`. The inner braces initialise that element member by member. C allows the inner braces to be left out (*brace elision*). `frac_struct y[1] = {1, 2};` means the same, although GCC and Clang may warn about missing braces with `-Wall`.

## Examples

Storage, pointers and brace lists in one program, on a platform with 8-byte `long` and 8-byte pointers:

```c
#include <stdio.h>

typedef struct { long num, den; } frac_struct;
typedef int quad[4];

static quad zeros;                    /* static: zero-initialised */

int main(void)
{
    quad q = {1, 2};                  /* q[2] and q[3] are zero */
    frac_struct y[1] = {{3}};         /* y[0].num = 3, y[0].den = 0 */
    frac_struct x = {.den = 5};       /* x.num = 0 */
    frac_struct *p = &x;              /* points to x; creates no frac_struct */

    printf("%d %d %d\n", q[1], q[2], zeros[3]);
    printf("%ld %ld\n", y[0].num, y[0].den);
    printf("%ld %ld %zu %zu\n", p->num, p->den, sizeof x, sizeof p);
    return 0;
}
```

Expected output (with `-Wextra`, GCC and Clang also warn that `{{3}}` leaves `den` out):

```
2 0 0
3 0
0 5 16 8
```

`sizeof x` is the struct, 16 bytes. `sizeof p` is only the pointer, 8 bytes, whatever it points to ([C4](#c4)).

## Pitfalls

- Reading an automatic object before giving it a value: `int a[4]; printf("%d", a[0]);` reads an indeterminate value ([C3](#c3)).
- Expecting a pointer to come with an object: after `frac_struct *w;`, `w->num = 1;` writes through an indeterminate address ([C4](#c4)).
- Calling `malloc` for every struct "because it is behind a pointer". A pointer to an automatic object needs none ([C4](#c4)).
- Reading `typedef int quad[4];` as defining an array. It only names a type ([C2](#c2)).

## Exercises

Try each one before opening its solution.

1. **Interpret.** Given `typedef int quad[4];`, what is `q` in `quad q;` at block scope? How many bytes does it take with 4-byte `int`, and what is its value? What changes if the same line is at file scope?

   <details><summary>Solution</summary>

   `quad q;` defines an array of four `int`, 16 bytes, with automatic storage and indeterminate contents ([C2](#c2), [C3](#c3)). At file scope it has static storage and starts as four zeros.

   </details>

2. **Interpret.** What does `frac_struct *w;` create inside a function? Name two ways to make `w->num = 1;` valid, one of them without `malloc`.

   <details><summary>Solution</summary>

   Only a pointer, with an indeterminate value. No `frac_struct` exists ([C4](#c4)). Either point it at an existing object, `frac_struct s; w = &s;`, or allocate one, `w = malloc(sizeof *w);`, and later `free(w)`.

   </details>

3. **Interpret.** What do the two pairs of braces in `frac_struct y[1] = {{1, 2}};` initialise? What are `y[0].num` and `y[0].den` after `frac_struct y[1] = {{2}};`?

   <details><summary>Solution</summary>

   The outer pair initialises the array, the inner pair its one `frac_struct`, member by member ([C5](#c5)). After `{{2}}`, `num` is 2 and `den` is 0, because members left out of a brace list are zero-initialised.

   </details>

## Sources

- Split from [array parameters and array decay](array-parameters.md) on 2026-10-28, after Thomas found that note too long. The material came from a second didactic review with ChatGPT, after a tutoring session, on 2026-10-27.
- cppreference: [declarations in C](https://en.cppreference.com/w/c/language/declarations), [typedef in C](https://en.cppreference.com/w/c/language/typedef), [storage duration in C](https://en.cppreference.com/w/c/language/storage_duration), [struct and array initialisation in C](https://en.cppreference.com/w/c/language/struct_initialization).
