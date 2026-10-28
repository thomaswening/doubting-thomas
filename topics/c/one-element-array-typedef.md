---
title: The one-element array typedef in GMP and FLINT
area: c
created: 2026-10-28
updated: 2026-10-28
prerequisites: [c/array-parameters, c/declarations-and-objects]
related: [c/pointers-to-arrays, c/opaque-handles, c/struct-tags-and-typedef, cpp/raii-and-ownership, cpp/copy-and-move, cpp/constructors]
projects: [tante]
tags: [c, cpp, array, pointer, typedef, decay, parameter, gmp, flint]
---

# The one-element array typedef in GMP and FLINT

## TL;DR

- GMP and FLINT define their `_t` types as `typedef S T[1];`: "array of one `S`".
- As a variable or struct member, `T x;` holds one whole `S` inline, with no `malloc`.
- As a parameter, `T x` is adjusted to `S*`. At a call, `x` decays to `&x[0]`. So `f(x)` passes the address of the caller's struct without `&`. `f` works on that struct.
- The same spelling `T` is a pointer inside the function and an array outside. A parameter can therefore be stored in an `S*`, but cannot initialise another `T`.
- A plain `S x;` needs `&x` at every call. `typedef S* T;` creates no `S`. The array form gives inline storage *and* calls without `&`.

## Key claims

- <a id="c1"></a>**C1.** With `typedef S name_t[1];`, as GMP and FLINT define their `_t` types, a variable or struct member of type `name_t` is an array object that holds one `S` inline, with no separate allocation, while a parameter of type `name_t` is an `S*`; callers therefore pass such a variable without `&`, and the function works on the caller's object.
- <a id="c2"></a>**C2.** Because a parameter of type `name_t` from [C1](#c1) is an `S*`, it can be stored in a variable or member of type `S*`, which keeps only the address; it cannot initialise a variable or member of type `name_t`, because an array can only be initialised from a brace-enclosed list (or, for a character array, a string literal). C does not dereference the pointer to copy the `S` implicitly either.
- <a id="c3"></a>**C3.** A pointer typedef such as `typedef S* name_t;` would also let callers pass without `&`, but a variable of that type holds only an address and creates no `S`; before it is dereferenced it must point to an `S` with storage of its own, which may be automatic, static or allocated (for instance from `malloc`). The one-element array of [C1](#c1) gives the `S` its storage in the variable itself, and still passes a pointer at every call.
- <a id="c4"></a>**C4.** In FLINT, `fmpz_mpoly_ctx_struct` and `fmpz_mpoly_struct` are typedef names for struct types and are written without the `struct` keyword; `fmpz_mpoly_ctx_t` (the context) and `fmpz_mpoly_t` (a polynomial) are two different types, each an array of one of its own struct, built by the same idiom.
- <a id="c5"></a>**C5.** Defining a GMP or FLINT `_t` variable reserves storage for its struct but initialises nothing: the library's init function, such as `mpz_init`, must run before first use, and its clear function, such as `mpz_clear`, after last use. The clear function frees the memory the library attached to the struct, not the struct itself.

## Explanation

This note answers one question: what does `typedef fmpz_mpoly_ctx_struct fmpz_mpoly_ctx_t[1];` in FLINT mean, and why is it written that way? It builds on two earlier notes. [Declarations, objects and initialisation](declarations-and-objects.md) explains typedef, storage and brace lists. [Array parameters and array decay](array-parameters.md) explains the two rules that turn arrays into pointers: *adjustment* of parameters and *decay* of expressions. The core sections use one small struct of our own:

```c
typedef struct { long num, den; } frac_struct;
```

The real FLINT types appear only at the end. A final section shows the idiom in a C++ class; it is not needed for the core.

### Building the idiom in three steps

Each step changes one thing.

**Step 1: a struct and a pointer parameter.** This is ordinary C:

```c
void frac_set(frac_struct *r, long n, long d);

frac_struct x;
frac_set(&x, 1, 2);
```

`x` holds the struct. The caller must write `&` to pass its address. Forgetting it is a compile error, because a `frac_struct` is not a `frac_struct*`.

**Step 2: a one-element array.** Only the variable changes:

```c
frac_struct y[1];
frac_set(y, 1, 2);      /* the same frac_set: y decays to &y[0] */
```

The storage is identical to step 1: one struct, inline ([declarations and objects](declarations-and-objects.md#objects-arrays-and-pointers)). The `&` is gone, because decay produces the pointer ([array parameters, C3](array-parameters.md#c3)). The function is unchanged.

**Step 3: give the array type a name.** One `typedef` saves writing `[1]` everywhere:

```c
typedef frac_struct frac_t[1];

frac_t z;                                   /* the same as  frac_struct z[1];  */
void frac_set(frac_t r, long n, long d);    /* the same as  frac_struct *r     */
```

Without `typedef`, the line would define a variable `frac_t`, an array of one `frac_struct`. With it, `frac_t` names that type ([declarations and objects, C2](declarations-and-objects.md#c2)). It is an array type, not a pointer type. It acts differently depending on where it is used ([C1](#c1)):

- **As a variable or struct member**, it defines an array. `frac_t z;` creates one `frac_struct`'s worth of storage inside `z`, with automatic storage duration if `z` is defined in a block. No heap is involved.
- **As a parameter**, it is adjusted to `frac_struct*` ([array parameters, C1](array-parameters.md#c1)).
- **At the call**, the caller writes `frac_set(z, 1, 2)`. `z` decays to `&z[0]`, which is the address of the caller's struct.

```
                declaration          storage of the variable     call
step 1          frac_struct x;       one frac_struct, inline     frac_set(&x, 1, 2)
step 2          frac_struct y[1];    one frac_struct, inline     frac_set(y, 1, 2)
step 3          frac_t z;            one frac_struct, inline     frac_set(z, 1, 2)
```

C passes every argument by value. Here the value copied is the *address* of `z[0]`, so `frac_set` writes into the caller's struct. It resembles a C# parameter that is always `ref`, without the `ref` at the call.

### Initialising a `_t` variable

`frac_t z;` reserves storage but initialises nothing ([declarations and objects, C3](declarations-and-objects.md#c3)). That is why GMP and FLINT require an init function before first use, such as `mpz_init(x)` ([C5](#c5)). The init function sets up the struct. It often attaches heap memory to it, such as a polynomial's coefficients. The matching clear function, such as `mpz_clear(x)`, frees that memory. The struct itself lives in the variable, so nobody frees it.

Our own `frac_t` holds no library memory. It can be given an initialiser like any array of structs, with two levels of braces ([declarations and objects, C5](declarations-and-objects.md#c5)):

```c
frac_t z = {{1, 2}};      /* outer braces: the array; inner braces: its one frac_struct */
```

GMP and FLINT objects are never initialised this way: their structs point to memory the library manages, so they must go through the init functions.

### Inside the function: what the parameter can initialise

The same spelling, `frac_t`, means a pointer in one place and an array in another. That matters as soon as a function wants to keep or copy its parameter:

```c
void frac_keep(frac_t r)
{
    frac_struct *ptr = r;    /* valid */
    frac_t copy = r;         /* error */
}
```

Expand the typedefs to see why:

```c
void frac_keep(frac_struct *r)       /* the parameter was adjusted */
{
    frac_struct *ptr = r;            /* a pointer initialised from a pointer: copies the address */
    frac_struct copy[1] = r;         /* an array initialised from an address */
}
```

`r` is a parameter, so it is a `frac_struct*`, although it is spelled `frac_t`. `copy` is a local variable, so the same spelling makes it a real array ([C1](#c1)). The first line copies an address into a pointer ([C2](#c2)). The second asks for an array to be initialised from an address. C does not allow that: an array's initialiser must be a brace list ([array parameters, C4](array-parameters.md#c4)).

C also does not quietly follow `r` and copy the struct it points to. It dereferences a pointer only where the code writes `*`, `->` or `[]`. Copying the struct has to be written out:

```c
frac_t copy;
copy[0] = r[0];        /* struct assignment: copies num and den */
```

`r` is a pointer, yet `r[0]` works. Subscripting is defined on pointers: `r[0]` means `*(r + 0)`, the struct `r` points to ([array parameters, C15](array-parameters.md#c15)). So `r[0]` is the caller's struct and `copy[0]` the local one. `*r` would mean the same as `r[0]`.

For `frac_t` this is a complete copy. For a GMP or FLINT type it is legal C but wrong. Their structs hold pointers to memory the library manages, such as a polynomial's coefficients. After the assignment both structs point to the same memory. Both would later free it ([copy and move, C2](../cpp/copy-and-move.md#c2) shows the same problem in C++). The libraries' own copy functions, such as `mpz_set` or `fmpz_mpoly_set`, copy that memory too.

### Why not a plain struct, or a pointer typedef?

Compare three ways to give a function access to a `frac_struct`:

```c
frac_struct x;      frac_set(&x, 1, 2);     /* the struct, inline; the caller writes & */
frac_struct y[1];   frac_set(y, 1, 2);      /* the struct, inline; no &, thanks to decay */
frac_struct *w;                             /* only a pointer: no frac_struct exists yet */
```

`x` and `y` both contain a `frac_struct`. Neither needs `malloc`. So the one-element array does not save an allocation that the plain struct would need: there is none to save. Its only advantage over `x` is the missing `&`, which decay supplies at every call.

A library could also write `typedef frac_struct *frac_p;` ([C3](#c3)). Callers would then pass a `frac_p` without `&` as well. But `frac_p w;` defines only a pointer, with an indeterminate value ([declarations and objects, C4](declarations-and-objects.md#c4)). Before anything is done through it, it must point to a `frac_struct` with storage of its own. That storage need not come from `malloc`:

```c
frac_struct storage;          /* automatic storage for the struct */
frac_p w = &storage;          /* a pointer to it */
```

But now each object needs two variables. The typedef saves nothing over step 1. Libraries that hand out pointers therefore usually allocate the struct inside their init function. It cannot be a local variable of that function, because a local is destroyed when its function returns ([stack and heap, C5](stack-and-heap.md#c5)). So the init function calls `malloc`. A clear function calls `free`. Each object then costs an allocation, an extra indirection and a `free` to forget. [Opaque handles](opaque-handles.md) work this way on purpose, because there the caller must not know the struct's size.

```
frac_t z;                  z:  [ num | den ]                             the struct itself, inline

frac_p w = &storage;       w:  [ address ] ──▶ storage:  [ num | den ]   automatic, static or allocated

frac_p w = <init call>;    w:  [ address ] ──▶ heap:     [ num | den ]   from malloc in an init function,
                                                                          freed by a clear function
```

The GMP idiom combines the two conveniences. The storage comes with the variable, as for `x`. The call needs no `&`, as for `w`. The struct may still point to heap memory of its own, such as a polynomial's coefficients; the idiom only decides where the struct itself lives. The [GMP manual](https://gmplib.org/manual/Parameter-Conventions) gives the reason for it: functions modify their arguments in place.

### The real types in GMP and FLINT

FLINT's headers follow the three steps exactly ([C4](#c4)):

```c
typedef struct { /* fields */ } fmpz_mpoly_ctx_struct;
typedef fmpz_mpoly_ctx_struct fmpz_mpoly_ctx_t[1];

typedef struct { /* fields */ } fmpz_mpoly_struct;
typedef fmpz_mpoly_struct fmpz_mpoly_t[1];
```

| Running example | FLINT context | FLINT polynomial | GMP integer |
|---|---|---|---|
| `frac_struct` | `fmpz_mpoly_ctx_struct` | `fmpz_mpoly_struct` | `__mpz_struct` |
| `frac_t` | `fmpz_mpoly_ctx_t` | `fmpz_mpoly_t` | `mpz_t` |

The word `struct` in `fmpz_mpoly_ctx_struct` is just part of a typedef name. Code writes `fmpz_mpoly_ctx_struct`, never `struct fmpz_mpoly_ctx_struct`. `fmpz_mpoly_ctx_t` and `fmpz_mpoly_t` are different types built by the same idiom: the context says how many variables a polynomial has and how its terms are ordered, while an `fmpz_mpoly_t` is one polynomial in that context.

```c
fmpz_mpoly_ctx_t ctx;                  /* one context struct, inline, not yet initialised */
fmpz_mpoly_ctx_init(ctx, 2, ORD_LEX);  /* two variables, lexicographic order */

fmpz_mpoly_t p;                        /* one polynomial struct, inline */
fmpz_mpoly_init(p, ctx);
/* ... use p ... */
fmpz_mpoly_clear(p, ctx);              /* frees the coefficients the library allocated */
fmpz_mpoly_ctx_clear(ctx);
```

### Beyond the core: storing such a parameter in C++

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

The constructor's parameter `fmpz_mpoly_ctx_t ctx` is a pointer, so initialising the pointer member `ctx_` from it copies an address ([C2](#c2)). The `Poly` does not own the context and does not copy it. The context must outlive every `Poly` that uses it. Declaring the member as `fmpz_mpoly_ctx_t ctx_;` instead would not compile, because an array member cannot be initialised from a pointer. That is the right outcome: it would have meant a second copy of the context struct, which FLINT does not expect.

The member `fmpz_mpoly_t p_` is the other side ([C1](#c1)). As a member it is a real array, so the polynomial's struct sits inside each `Poly` object. Passing `p_` to `fmpz_mpoly_init` passes its address without `&`. The [constructors note](../cpp/constructors.md) explains `explicit` and the initialiser list. [RAII and ownership](../cpp/raii-and-ownership.md) explains the destructor and the deleted copies, using a simpler library with plain pointer handles.

## Examples

The running example as one program:

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
    frac_t x, y;                      /* two structs, inline */
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

`x->num` works on a variable that is not declared as a pointer, because `x` decays to one. `sizeof x` is the size of one `frac_struct`, because `sizeof` does not decay ([array parameters, C3](array-parameters.md#c3)). The `const frac_t` parameters are explained in [pointers to arrays](pointers-to-arrays.md#const-on-array-types).

## Pitfalls

- Using an `mpz_t` or `fmpz_mpoly_t` before its init function has run. The definition reserved storage but initialised nothing ([C5](#c5)).
- Expecting a pointer typedef to come with an object: after `frac_p w;`, `w->num = 1;` writes through an indeterminate address ([C3](#c3)).
- Writing `x = y;` with two `mpz_t` or `fmpz_mpoly_t` variables. It does not compile, because they are arrays ([array parameters, C4](array-parameters.md#c4)). The library's set function (`mpz_set`, `fmpz_mpoly_set`) does the copy.
- Copying the struct directly, `*x = *y;`, or copying a C++ class that has such a member with the default copy. That copies only the struct, which holds pointers to the library's heap memory. Both copies then free the same memory ([copy and move, C2](../cpp/copy-and-move.md#c2); [RAII and ownership, C8](../cpp/raii-and-ownership.md#c8)).
- Returning an `fmpz_mpoly_t` from a function. Arrays cannot be returned ([array parameters, C4](array-parameters.md#c4)). The library convention is to pass the result as the first parameter, as `frac_mul` does.
- Taking `&ctx` of an `fmpz_mpoly_ctx_t` local and passing it where an `fmpz_mpoly_ctx_struct*` is expected. `&ctx` is a pointer to an array of one struct, which has a different type ([pointers to arrays, C1](pointers-to-arrays.md#c1)). Pass `ctx`.
- Storing the parameter's pointer and letting the caller's struct die first: the stored pointer dangles ([C2](#c2)).

## Exercises

Try each one before opening its solution.

1. **Interpret.** Given `typedef frac_struct *frac_p;`, what does `frac_p w;` create? Can you call `frac_set(w, 1, 2)` straight away?

   <details><summary>Solution</summary>

   Only a pointer, with an indeterminate value. No `frac_struct` exists. The call compiles but writes through a garbage address, which is undefined behaviour. `w` must first point to a real struct: `&s` for some `frac_struct s`, or a block from `malloc` ([C3](#c3)).

   </details>

2. **Explain.** C passes every argument by value. Why, then, does `frac_set(z, 1, 2)` change the caller's `frac_t z`?

   <details><summary>Solution</summary>

   The value passed is not the struct. `z` decays to `&z[0]`, the address of the caller's struct ([array parameters, C3](array-parameters.md#c3)). The parameter, adjusted to `frac_struct*` ([array parameters, C1](array-parameters.md#c1)), receives a copy of that address. Writing `r->num` goes through it into the caller's storage ([C1](#c1)).

   </details>

3. **Predict.** Does `frac_t a, b; a = b;` compile? After both are set, what would `a[0] = b[0];` do, and why is it fine for `frac_t` but wrong for `fmpz_mpoly_t`?

   <details><summary>Solution</summary>

   `a = b;` does not compile: arrays cannot be assigned ([array parameters, C4](array-parameters.md#c4)). `a[0] = b[0];` assigns one struct to another, copying `num` and `den`. For `frac_t` that is a complete copy. An `fmpz_mpoly_struct` holds pointers to heap memory owned by the library, so the same assignment would make both structs share it. Both would later free it. Use `fmpz_mpoly_set`.

   </details>

4. **Explain in your own words.** Why does GMP define `mpz_t` as an array of one struct rather than as a pointer to a struct?

   <details><summary>Solution</summary>

   A plain struct variable would give inline storage, but every call would need `&x`. A pointer typedef would spare the `&`, but it creates no struct: each object would need storage provided separately, in practice allocated by an init function. An array of one struct gives both. The storage comes with the variable. A call passes a pointer without `&`, because the parameter is adjusted and the argument decays ([C1](#c1), [C3](#c3)).

   </details>

5. **Explain.** Inside `void f(frac_t r)`, why does `frac_struct *ptr = r;` compile while `frac_t copy = r;` does not? How would you copy the struct?

   <details><summary>Solution</summary>

   `r` is a parameter, so it was adjusted to `frac_struct*`. `ptr` is a pointer, so initialising it from `r` copies an address. `copy` is a local, so it is a real array. An array can only be initialised from a brace list ([C2](#c2)). C does not follow the pointer on its own. Write `frac_t copy; copy[0] = r[0];`, a struct assignment. `r[0]` works on the pointer `r` because subscripting means `*(r + 0)` ([array parameters, C15](array-parameters.md#c15)). For GMP and FLINT types, use their set function instead.

   </details>

## Sources

- Claude session on [Tante](https://github.com/thomaswening/Tante), 2026-10-20, answering Thomas's review questions on FLINT's `_t` types in the FLINT wrapper of [Tante](https://github.com/thomaswening/Tante)'s [build spike](https://github.com/thomaswening/Tante/blob/main/docs/spikes/2026-10-16-native-arithmetic-build.md) ([doubting-thomas PR #3](https://github.com/thomaswening/doubting-thomas/pull/3)).
- Split from [array parameters and array decay](array-parameters.md) on 2026-10-28, after Thomas found that note too long.
- [GMP manual: Parameter Conventions](https://gmplib.org/manual/Parameter-Conventions); [FLINT documentation: fmpz_mpoly](https://flintlib.org/doc/fmpz_mpoly.html).
