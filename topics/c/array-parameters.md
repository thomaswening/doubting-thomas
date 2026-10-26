---
title: Array parameters and array decay
area: c
created: 2026-10-20
updated: 2026-10-26
prerequisites: [c/pointer-declarator-syntax, c/stack-and-heap]
related: [cpp/raii-and-ownership, cpp/constructors, c/opaque-handles, c/struct-tags-and-typedef]
projects: [tante]
tags: [c, cpp, array, pointer, decay, parameter, gmp, flint, typedef]
---

# Array parameters and array decay

## TL;DR

- A function parameter declared as an array, `void f(int a[10])`, is really a pointer, `void f(int* a)`. The size is ignored.
- In most expressions, an array turns into a pointer to its first element. This is called **decay**. `sizeof arr` and `&arr` are the main exceptions.
- So a C function never receives an array, only an address, and cannot know how long the array is. C# arrays carry their `Length`; C arrays do not.
- GMP and FLINT exploit both rules with `typedef fmpz_mpoly_ctx_struct fmpz_mpoly_ctx_t[1];`. A variable or member of that type holds the struct **inline**: the struct's bytes sit inside the variable itself, because an array stores its elements where it is declared. A parameter of that type is a pointer, so you pass it without `&`.
- A pointer typedef would also spare the `&`. But a pointer variable holds only an address, so the struct would need memory of its own on the heap, from `malloc`, C's counterpart of `new`. The one-element array gives inline storage and pass-by-pointer together. `fmpz_mpoly_t` (a polynomial) and `fmpz_mpoly_ctx_t` (its context) are two different types built this way.

## Key claims

- <a id="c1"></a>**C1.** In C and C++, a function parameter declared with type "array of `T`" is adjusted to "pointer to `T`", and any size written in the brackets is ignored: `void f(int a[10]);`, `void f(int a[]);` and `void f(int* a);` declare the same function.
- <a id="c2"></a>**C2.** In the scope that declares an array, `sizeof` applied to it gives the size of the whole array; inside a function, `sizeof` applied to a parameter declared as an array gives the size of a pointer, not of the caller's array, so the function cannot find out the array's length, which must be passed separately.
- <a id="c3"></a>**C3.** An expression of array type is converted to a pointer to the array's first element (array-to-pointer conversion, or decay) except when it is the operand of `sizeof` or unary `&`, or a string literal used to initialise an array; C++ adds a few more exceptions, such as binding the array to a reference.
- <a id="c4"></a>**C4.** An array cannot be assigned to, passed by value or returned from a function: `a = b;` with two arrays does not compile. A struct that contains an array can be assigned, passed and returned, and the array is copied with it.
- <a id="c5"></a>**C5.** For an array `int arr[4]`, `arr` used in an expression is an `int*` to the first element, while `&arr` is an `int (*)[4]`, a pointer to the whole array; both hold the same address but have different types.
- <a id="c6"></a>**C6.** Only the outermost array level of a parameter is adjusted: a parameter declared `int m[3][4]` has type `int (*)[4]`, a pointer to arrays of four `int`.
- <a id="c7"></a>**C7.** With `typedef S name_t[1];`, as GMP and FLINT define their `_t` types, a local variable or struct member of type `name_t` holds one `S` inline, with no heap allocation, while a parameter of type `name_t` is an `S*`; callers therefore pass such a variable without `&`, and the function works on the caller's object.
- <a id="c8"></a>**C8.** Because a parameter of type `name_t` from [C7](#c7) is an `S*`, it can be stored in a variable or member of type `S*`, which keeps only the address; it cannot initialise a variable or member of type `name_t`, because an array cannot be initialised from a pointer.
- <a id="c9"></a>**C9.** A pointer typedef such as `typedef S* name_t;` would also let callers pass without `&`, but a variable of that type holds only an address, so the `S` would have to be allocated separately, typically with `malloc`, and freed later; the one-element array of [C7](#c7) gives inline storage for the `S` and pass-by-pointer together.
- <a id="c11"></a>**C11.** A `typedef` declaration has the form of a variable declaration with `typedef` in front, and makes the would-be variable name an alias for the would-be variable's type: `typedef S name_t[1];` declares no object and makes `name_t` mean "array of one `S`".
- <a id="c10"></a>**C10.** In FLINT, `fmpz_mpoly_ctx_struct` and `fmpz_mpoly_struct` are typedef names for struct types and are written without the `struct` keyword; `fmpz_mpoly_ctx_t` (the context) and `fmpz_mpoly_t` (a polynomial) are two different types, each an array of one of its own struct, built by the same idiom.

## Explanation

### Arrays are not objects you can pass

In C#, an `int[]` is an object on the heap. A variable holds a reference to it, and the object knows its `Length`. Passing it to a method passes the reference.

A C array is just a block of elements in a row: `int arr[4]` is sixteen bytes on the stack, with no length stored anywhere and no object around it.

The elements are stored **inline**: directly where the array is declared, on the stack for a local variable or inside the enclosing struct for a member, not somewhere else behind a pointer. That is why a struct that contains an array carries the elements along when it is copied ([C4](#c4)): they are part of the struct's own bytes. C# has the same idea in a `fixed` buffer inside a struct, or an `[InlineArray]` struct.

C never copies such a block implicitly. You cannot assign one array to another or pass or return one by value ([C4](#c4)). Wrapping the array in a struct lifts the restriction, because structs can be copied.

### Decay

What happens instead is that almost any use of an array produces a pointer to its first element ([C3](#c3)). `int* p = arr;` compiles. `arr[2]` is defined as `*(arr + 2)`: take the decayed pointer to the first element, move two **elements** further, and read the `int` there. Pointer arithmetic counts in elements, not bytes, so `arr + 2` lies `2 * sizeof(int)`, 8 bytes, past the start. Passing `arr` to a function passes that pointer.

The main exceptions are the operators that need the array itself:

- `sizeof arr` gives the size of the whole array: `4 * sizeof(int)`.
- `&arr` takes the address of the array as a whole ([C5](#c5)). `&` is the ordinary address-of operator, as in `&x` ([where the * goes, C4](pointer-declarator-syntax.md#c4)). The result's type is written `int (*)[4]`: a pointer to an array of four `int`. With a name it reads `int (*p)[4] = &arr;`, from the name outwards: `p` is a pointer (`*p`) to an array of four (`[4]`) `int` ([reading declarations](function-pointer-declarations.md)). The brackets matter, because `[]` binds tighter than `*`: `int *q[4]` is an array of four pointers to `int`. `&arr` holds the same address as `arr` decayed, but `&arr + 1` steps over all four elements, where `arr + 1` steps over one.
- `char s[] = "abc";` copies the string literal into the array instead of decaying it.

### Array parameters are pointers

Since a function can only ever receive a pointer, C rewrites a parameter written as an array into a pointer ([C1](#c1)). The brackets are a hint to the reader that the pointer refers to the start of several elements. The `10` in `int a[10]` is not checked and not stored.

The consequence surprises everyone once ([C2](#c2)): inside `void f(int a[10])`, `sizeof a` is 8 on a 64-bit platform, the size of a pointer. The length is gone. C APIs pass it as a second parameter (`void sum(const int* a, size_t n)`), and C++ code passes `std::span<int>` or `std::vector<int>&`, which carry it along like a C# `Span<int>` does.

The rule is applied once, at the outermost level ([C6](#c6)). A two-dimensional array `int m[3][4]` is an array of three rows, each an array of four `int`, stored one row after the other:

```
int m[3][4]: twelve ints in a row, row after row (4-byte int)

byte offset   0    4    8    12   16   20   24   28   32   36   40   44
            [0,0][0,1][0,2][0,3][1,0][1,1][1,2][1,3][2,0][2,1][2,2][2,3]
            └────── m[0] ──────┘└────── m[1] ──────┘└────── m[2] ──────┘
            ▲                   ▲
            m decays to &m[0]   m + 1 points to m[1], 16 bytes on

m[1][2] = *(*(m + 1) + 2) is at byte 1*16 + 2*4 = 24
```

A parameter `int m[3][4]` becomes `int (*m)[4]`: a pointer to the first row, where a row is four `int`. The row length stays part of the type, because the function needs it to compute where `m[i][j]` lives: one step of `m + 1` must skip a whole row.

The number of rows, 3, is lost like any outermost length, so a function taking `int (*m)[4]` still needs the row count as a separate parameter. A pointer to the whole array, `int (*m)[3][4]`, would keep both lengths. Then the function would accept only arrays of exactly 3 by 4, which is why C APIs rarely use it.

### The GMP and FLINT idiom

GMP and FLINT combine the two rules into a trick ([C7](#c7)). FLINT's header declares the context type like this:

```c
typedef struct { /* fields */ } fmpz_mpoly_ctx_struct;
typedef fmpz_mpoly_ctx_struct fmpz_mpoly_ctx_t[1];   /* an array of one struct */
```

Read a `typedef` as a variable declaration with `typedef` in front ([C11](#c11)). Without `typedef`, the second line would declare a variable:

```c
fmpz_mpoly_ctx_struct fmpz_mpoly_ctx_t[1];   /* a variable: an array of one struct */
```

Here `fmpz_mpoly_ctx_struct` is the element type. The `[1]` belongs to the name, as the `*` does in `int *p` ([where the * goes, C2](pointer-declarator-syntax.md#c2)). With `typedef` in front, no variable is declared and nothing is initialised. Instead, the name becomes a new name for the type that the variable would have had. So `fmpz_mpoly_ctx_t` means "array of one `fmpz_mpoly_ctx_struct`", and a later `fmpz_mpoly_ctx_t ctx;` declares exactly such an array. The line defines nothing new; it only names a type. The closest C# is a type alias such as `using Ctx = SomeType;`, not a `class` declaration.

The first line works the same way. Without `typedef`, `struct { ... } fmpz_mpoly_ctx_struct;` would declare a variable of an unnamed struct type. With `typedef`, `fmpz_mpoly_ctx_struct` becomes the **typedef name** of that struct ([C10](#c10)). In [struct tags and typedef](struct-tags-and-typedef.md), `typedef struct point point;` had a tag, `point`, after `struct`, so `struct point` was a type name as well ([C2](struct-tags-and-typedef.md#c2)). This struct has no tag, so the typedef name is its only name. The word `struct` inside `fmpz_mpoly_ctx_struct` is just part of that name. Code writes `fmpz_mpoly_ctx_struct`, never `struct fmpz_mpoly_ctx_struct`.

The second line makes `fmpz_mpoly_ctx_t` an **array type**: an array of exactly one struct. It is not a pointer type. It only becomes a pointer where an array parameter is adjusted. That one element gives a different behaviour depending on where the type is used:

- **As a local variable or struct member**, it is a real array. `fmpz_mpoly_ctx_t ctx;` reserves room for one struct right there, on the stack or inside the enclosing object. Nothing is allocated on the heap, and there is no separate pointer to go wrong.
- **As a parameter**, it is adjusted to `fmpz_mpoly_ctx_struct*` ([C1](#c1)). The function receives the address of the caller's struct and can change it.
- **At the call**, the caller writes `fmpz_mpoly_ctx_init(ctx, ...)`, not `&ctx`: `ctx` decays to exactly the pointer the parameter expects ([C3](#c3)).

The polynomial type follows the same pattern: `typedef fmpz_mpoly_struct fmpz_mpoly_t[1];`. `fmpz_mpoly_t` and `fmpz_mpoly_ctx_t` are different types, one a polynomial and one the context that says how many variables it has and how they are ordered. Each is an array of one of its own struct ([C10](#c10)). GMP's `mpz_t` is built the same way.

The [GMP manual](https://gmplib.org/manual/Parameter-Conventions) gives the reason for the idiom: functions modify their arguments, and the idiom gives call by reference without making the caller write `&`. The effect resembles a C# parameter that is always `ref`, without the `ref` at the call. A `const fmpz_mpoly_ctx_t` parameter becomes `const fmpz_mpoly_ctx_struct*`, the read-only form.

### Why not a plain pointer?

A library could write `typedef fmpz_mpoly_ctx_struct* fmpz_mpoly_ctx_t;` instead. Callers would still pass `ctx` without `&`. But a variable of a pointer type holds only an address ([C9](#c9)). The struct itself would have to live somewhere else. It cannot be a local variable of the init function, because a local is destroyed when its function returns ([stack and heap, C5](stack-and-heap.md#c5)). So the library would request heap memory for it in an init function with `malloc` ("memory allocate": C's counterpart of `new`, which returns the address of a fresh block of the requested size). A clear function would hand the memory back with `free`, because C never frees heap memory on its own ([stack and heap, C2](stack-and-heap.md#c2)). Every object would cost an extra heap allocation and an extra indirection.

```
typedef S name_t[1];   name_t ctx;          one-element array: the struct is inline

  stack  [ ctx[0]: the whole struct S ............ ]

typedef S* name_t;     name_t ctx = ...;    pointer: only an address is inline

  stack  [ ctx: address ] ───▶ heap  [ the whole struct S ............ ]
                                      (allocated by an init function, freed by a clear function)
```

The one-element array gives both at once: the storage sits inline where the variable is declared, and the parameter is still a pointer. The struct usually holds pointers to heap memory of its own, such as a polynomial's coefficients. Only the struct itself is saved a `malloc`.

### Storing such a parameter

FLINT-style C++ wrappers, such as the one in [Tante](https://github.com/thomaswening/Tante)'s build spike, use both sides of the idiom:

```cpp
#include <flint/fmpz_mpoly.h>

class Poly {
public:
    // explicit and the ": ctx_(ctx)" initialiser list: see the constructors note
    explicit Poly(fmpz_mpoly_ctx_t ctx) : ctx_(ctx) { fmpz_mpoly_init(p_, ctx_); }
    ~Poly() { fmpz_mpoly_clear(p_, ctx_); }

    Poly(const Poly&) = delete;              // no copies, see RAII and ownership
    Poly& operator=(const Poly&) = delete;

private:
    fmpz_mpoly_ctx_struct* ctx_;   // a pointer: not owned, only used
    fmpz_mpoly_t p_;               // a one-element array: the struct lives inside the Poly
};
```

The constructor's parameter `fmpz_mpoly_ctx_t ctx` is a pointer, so initialising the pointer member `ctx_` from it copies an address ([C8](#c8)). The `Poly` does not own the context and does not copy it. The context must outlive every `Poly` that uses it. Declaring the member as `fmpz_mpoly_ctx_t ctx_;` instead would not compile, because an array member cannot be initialised from a pointer. That is the right outcome: it would have meant a second copy of the context struct, which FLINT does not expect.

The member `fmpz_mpoly_t p_` is the other side ([C7](#c7)). As a member it is a real array, so the polynomial's struct sits inside each `Poly` object, and passing `p_` to `fmpz_mpoly_init` passes its address without `&`. The [constructors note](../cpp/constructors.md) explains `explicit` and the initialiser list. [RAII and ownership](../cpp/raii-and-ownership.md) explains the destructor and the deleted copies, using a simpler library with plain pointer handles.

## Examples

Decay and adjustment, with sizes for a typical 64-bit platform (4-byte `int`, 8-byte pointers):

```c
#include <stdio.h>

void f(int a[10])                     /* really: void f(int* a) */
{
    printf("%zu\n", sizeof a);        /* size of a pointer */
}

int main(void)
{
    int arr[10];
    printf("%zu\n", sizeof arr);      /* size of the whole array: 10 * 4 */
    f(arr);                           /* arr decays to &arr[0] */
    int* p = arr;                     /* the same decay */
    printf("%d\n", p == &arr[0]);
    return 0;
}
```

Expected output (GCC and Clang also warn that `sizeof a` gives the size of a pointer):

```
40
8
1
```

The GMP and FLINT idiom on a small type of our own:

```c
#include <stdio.h>

typedef struct { long num, den; } frac_struct;
typedef frac_struct frac_t[1];

/* r, a and b are all frac_struct pointers */
void frac_set(frac_t r, long n, long d) { r->num = n; r->den = d; }
void frac_mul(frac_t r, const frac_t a, const frac_t b)
{
    r->num = a->num * b->num;
    r->den = a->den * b->den;
}

int main(void)
{
    frac_t x, y;                      /* two structs, inline on the stack */
    frac_set(x, 1, 2);                /* no & : x decays to a pointer */
    frac_set(y, 2, 3);
    frac_mul(x, x, y);                /* x = x * y, in place */
    printf("%ld/%ld %zu\n", x->num, x->den, sizeof x);
    return 0;
}
```

Expected output on a platform with 8-byte `long`:

```
2/6 16
```

`x->num` works on a variable that is not declared as a pointer, because `x` decays to one. `sizeof x` is the size of one `frac_struct`, because `sizeof` does not decay ([C3](#c3)).

## Pitfalls

- Using `sizeof a / sizeof a[0]` to count the elements of an array parameter. It divides the size of a pointer by the size of an element ([C2](#c2)).
- Writing `x = y;` with two `mpz_t` or `fmpz_mpoly_t` variables. It does not compile, because they are arrays ([C4](#c4)). The library's set function (`mpz_set`, `fmpz_mpoly_set`) does the copy.
- Copying the struct directly, `*x = *y;`, or copying a C++ class that has such a member with the default copy. That copies only the struct, which holds pointers to the library's heap memory. Both copies then free the same memory ([RAII and ownership, C8](../cpp/raii-and-ownership.md#c8)).
- Returning an `fmpz_mpoly_t` from a function. Arrays cannot be returned ([C4](#c4)). The library convention is to pass the result as the first parameter, as `frac_mul` does.
- Taking `&ctx` of an `fmpz_mpoly_ctx_t` local and passing it where an `fmpz_mpoly_ctx_struct*` is expected. `&ctx` is a pointer to an array of one struct, which has a different type ([C5](#c5)). Pass `ctx`.
- Storing the parameter's pointer and letting the caller's struct die first: the stored pointer dangles ([C8](#c8)).

## Sources

- Claude session on [Tante](https://github.com/thomaswening/Tante), 2026-10-20, answering Thomas's review questions on FLINT's `_t` types in the FLINT wrapper of [Tante](https://github.com/thomaswening/Tante)'s [build spike](https://github.com/thomaswening/Tante/blob/main/docs/spikes/2026-10-16-native-arithmetic-build.md) ([doubting-thomas PR #3](https://github.com/thomaswening/doubting-thomas/pull/3)).
- cppreference: [arrays in C, with array-to-pointer conversion](https://en.cppreference.com/w/c/language/array), [function declarations in C](https://en.cppreference.com/w/c/language/function_declaration), [array-to-pointer conversion in C++](https://en.cppreference.com/w/cpp/language/implicit_conversion#Array-to-pointer_conversion).
- [GMP manual: Parameter Conventions](https://gmplib.org/manual/Parameter-Conventions); [FLINT documentation: fmpz_mpoly](https://flintlib.org/doc/fmpz_mpoly.html).
- [comp.lang.c FAQ, section 6: arrays and pointers](https://c-faq.com/aryptr/index.html).
