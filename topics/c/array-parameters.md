---
title: Array parameters and array decay
area: c
created: 2026-10-20
updated: 2026-10-27
prerequisites: [c/pointer-declarator-syntax, c/stack-and-heap]
related: [cpp/raii-and-ownership, cpp/constructors, c/opaque-handles, c/struct-tags-and-typedef]
projects: [tante]
tags: [c, cpp, array, pointer, decay, parameter, declarator, typedef, gmp, flint]
---

# Array parameters and array decay

## TL;DR

- `typedef S T[1];` reads like a variable declaration with `typedef` in front. `T` becomes the name of the type "array of one `S`". No object is created.
- `T x;` defines an array object that holds one whole `S` inline, inside `x`'s own storage. It reserves the storage but does not initialise it.
- Two separate rules turn arrays into pointers. A parameter declared as an array is *adjusted* to a pointer: a rule about declarations. An array used in an expression *decays* to a pointer to its first element: a rule about expressions.
- Together they make `f(x)` pass the address of the caller's struct. `f` can therefore modify that struct. The caller writes no `&`.
- `typedef S* T;` would also spare the `&`. But a pointer variable holds only an address, so each struct would need storage of its own, usually from `malloc`. GMP's `mpz_t` and FLINT's `fmpz_mpoly_t` use the array form instead.

## Key claims

- <a id="c1"></a>**C1.** In C and C++, a function parameter declared with type "array of `T`" is adjusted to "pointer to `T`", and any size written in the brackets is ignored: `void f(int a[10]);`, `void f(int a[]);` and `void f(int* a);` declare the same function.
- <a id="c2"></a>**C2.** In the scope that declares an array, `sizeof` applied to it gives the size of the whole array; inside a function, `sizeof` applied to a parameter declared as an array gives the size of a pointer, not of the caller's array, so the function cannot find out the array's length, which must be passed separately.
- <a id="c3"></a>**C3.** An expression of array type is converted to a pointer to the array's first element (array-to-pointer conversion, or decay). In C17 the only exceptions are an array that is the operand of `sizeof` or unary `&`, and a string literal used to initialise an array. C23 adds the `typeof` operators; C++ adds a few more, such as binding the array to a reference.
- <a id="c4"></a>**C4.** An array cannot be assigned to, passed by value or returned from a function: `a = b;` with two arrays does not compile. A struct that contains an array can be assigned, passed and returned, and the array is copied with it.
- <a id="c5"></a>**C5.** For an array `int arr[4]`, `arr` used in an expression is an `int*` to the first element, while `&arr` is an `int (*)[4]`, a pointer to the whole array; both hold the same address but have different types.
- <a id="c6"></a>**C6.** Only the outermost array level of a parameter is adjusted: a parameter declared `int m[3][4]` has type `int (*)[4]`, a pointer to arrays of four `int`.
- <a id="c7"></a>**C7.** With `typedef S name_t[1];`, as GMP and FLINT define their `_t` types, a variable or struct member of type `name_t` is an array object that holds one `S` inline, with no separate allocation, while a parameter of type `name_t` is an `S*`; callers therefore pass such a variable without `&`, and the function works on the caller's object.
- <a id="c8"></a>**C8.** Because a parameter of type `name_t` from [C7](#c7) is an `S*`, it can be stored in a variable or member of type `S*`, which keeps only the address; it cannot initialise a variable or member of type `name_t`, because an array cannot be initialised from a pointer.
- <a id="c9"></a>**C9.** A pointer typedef such as `typedef S* name_t;` would also let callers pass without `&`, but a variable of that type holds only an address, so the `S` would have to be allocated separately, typically with `malloc`, and freed later; the one-element array of [C7](#c7) gives inline storage for the `S` and pass-by-pointer together.
- <a id="c10"></a>**C10.** In FLINT, `fmpz_mpoly_ctx_struct` and `fmpz_mpoly_struct` are typedef names for struct types and are written without the `struct` keyword; `fmpz_mpoly_ctx_t` (the context) and `fmpz_mpoly_t` (a polynomial) are two different types, each an array of one of its own struct, built by the same idiom.
- <a id="c11"></a>**C11.** A `typedef` declaration has the form of a variable declaration with `typedef` in front, and makes the would-be variable name an alias for the would-be variable's type: `typedef S name_t[1];` declares no object and makes `name_t` mean "array of one `S`".
- <a id="c12"></a>**C12.** A declaration such as `name_t x;` or `int a[4];` inside a block, without `static`, defines an object with automatic storage duration: it reserves storage for the whole object, which lives until the block ends, but leaves its contents indeterminate unless an initialiser is given. An object defined at file scope or with `static` is zero-initialised instead. The C standard does not mention a stack; putting automatic objects on the stack is what implementations typically do.
- <a id="c13"></a>**C13.** Parameter adjustment ([C1](#c1)) is a rule about declarations, applied once to the function's declared type, while array-to-pointer conversion ([C3](#c3)) is a rule about expressions, applied wherever an array is used as a value; passing an array to an array parameter involves both, and the decayed argument then has exactly the adjusted parameter's type.

## Explanation

The explanation builds up to one question: what does `typedef fmpz_mpoly_ctx_struct fmpz_mpoly_ctx_t[1];` in FLINT mean, and why is it written that way? The core sections use one small struct of our own throughout. The real FLINT types appear only at the end. A clearly marked advanced part follows; nothing in it is needed for the core.

### 1. Reading a declaration from the name outwards

In C#, the whole type stands on the left: `int[] a;`. In C, a declaration has a **base type** on the left and a **declarator** around the name, which adds "array of", "pointer to" or "function returning". You read it from the name outwards:

```
int n;                 n is an int
int a[4];              a is an array of 4 int
int *p;                p is a pointer to int
frac_struct x;         x is a frac_struct
frac_struct y[1];      y is an array of 1 frac_struct
```

The `[4]` belongs to the name, just as the `*` does in `int *p` ([where the * goes, C2](pointer-declarator-syntax.md#c2)). Longer declarators, such as `int (*p)[4]`, follow the same rule; they come up in the advanced part and in [reading function-pointer declarations](function-pointer-declarations.md).

### 2. Declaring, defining, storing and initialising

Four words describe what a line of C does. They are easy to blur, so here they are on one array:

- A **declaration** introduces a name and its type. `extern int a[4];` is only a declaration: it says that an array `a` exists somewhere else, and reserves nothing.
- A **definition** is a declaration that also creates the object, which reserves its storage. `int a[4];` inside a function is a definition: sixteen bytes (with 4-byte `int`) now belong to `a`.
- The object's **storage duration** says how long that storage lives ([C12](#c12)). Inside a block, without `static`, it is *automatic*: from the start of the block to its end. Implementations typically put such objects on the stack, but the C standard only speaks of automatic storage ([stack and heap, C1](stack-and-heap.md#c1)). At file scope, or with `static`, the object lives as long as the program.
- **Initialisation** gives the object a value as it is created: `int a[4] = {1, 2, 3, 4};`. Without an initialiser an automatic object's contents are indeterminate. Using them is a bug. A static object starts as zero. C# zeroes fields and array elements. It refuses to compile a read of an unassigned local.

A **typedef** declares a *type name* instead of an object. It reserves no storage ([C11](#c11)). It reuses ordinary declaration syntax. Write a variable declaration and put `typedef` in front. The would-be variable name then becomes a name for the would-be variable's type:

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

### 3. Arrays store their elements inline

In C#, an `int[]` is an object on the heap. A variable holds a reference to it. The object knows its `Length`. A C array is nothing but its elements, one after the other, stored **inline**: directly in the array object's own storage, not somewhere else behind a pointer. There is no length, no header and no reference.

```
int a[4];            a:  [ a[0] | a[1] | a[2] | a[3] ]      16 bytes, no length stored
frac_struct x;       x:  [ num  | den  ]                    16 bytes (8-byte long)
frac_struct y[1];    y:  [ y[0].num | y[0].den ]            16 bytes: the array is its one element
```

The last two lines are the heart of this note. A one-element array of a struct occupies exactly the storage of the struct.

C never copies such a block implicitly. An array cannot be assigned, passed by value or returned ([C4](#c4)). A struct that contains an array is different: its elements are part of the struct's own bytes, so copying the struct copies them. C# has the same idea in a `fixed` buffer inside a struct, or an `[InlineArray]` struct.

### 4. Rule one: an array used as a value decays to a pointer

Since an array cannot be copied as a value, C does something else whenever an array appears in an expression: it converts it to a pointer to its first element ([C3](#c3)). This is **array-to-pointer conversion**, or **decay**.

- `int *p = a;` compiles: `a` becomes `&a[0]`.
- `a[2]` is defined as `*(a + 2)`: take the pointer to the first element, move two **elements** further, read the `int` there. Pointer arithmetic counts in elements, so `a + 2` lies `2 * sizeof(int)`, 8 bytes, past the start.
- For the one-element array, `y` becomes `&y[0]`, a `frac_struct*`. So `y->num` means the same as `y[0].num`.

A few operators need the array itself and are the exceptions. `sizeof a` gives the size of the whole array, 16 bytes, in the scope that defines it ([C2](#c2)). `&a` takes the address of the whole array, which has a different type from `&a[0]` (see the advanced part). `char s[] = "abc";` copies the string literal into `s`.

### 5. Rule two: an array parameter is adjusted to a pointer

A function cannot receive an array by value ([C4](#c4)). So when C reads a function declaration with a parameter of array type, it rewrites that parameter's type to a pointer ([C1](#c1)). `void f(int a[10])` *is* `void f(int *a)`. The `10` is neither checked nor stored. The brackets only hint to the reader that several elements are expected.

The surprise comes once ([C2](#c2)): inside `f`, `sizeof a` is the size of a pointer, typically 8. The length is gone. C APIs pass it as a separate parameter, as in `void sum(const int *a, size_t n)`. C++ code passes a `std::span<int>`, which bundles pointer and length like C#'s `Span<int>`.

### 6. Two rules, one call

The two rules are easy to merge into one vague idea of "arrays are pointers". They are not the same rule ([C13](#c13)):

```c
void frac_set(frac_struct r[1], long n, long d)   /* adjustment: r has type frac_struct*  */
{
    r->num = n;
    r->den = d;
}

frac_struct y[1];
frac_set(y, 1, 2);                                 /* decay: the argument y becomes &y[0] */
```

- **Adjustment** belongs to the function's declaration. It happens once, when the compiler reads the declaration, whether or not anyone ever calls the function.
- **Decay** belongs to expressions. It happens at every use of an array as a value, in a call or not, as in `frac_struct *q = y;`.

At the call they meet: the decayed argument has exactly the adjusted parameter's type, so the call compiles.

That also explains why `frac_set` can change the caller's struct. C passes every argument by value, but the value copied here is the *address* of `y[0]`. `r->num = n` writes through that address into the caller's storage. It is the situation of a C# method that receives a reference to a class instance: the reference is a copy, the object is shared.

### 7. Building the GMP idiom in three steps

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

The storage is identical to step 1: one struct, inline (section 3). The `&` is gone, because decay produces the pointer (rule one). The function is unchanged.

**Step 3: give the array type a name.** One `typedef` saves writing `[1]` everywhere:

```c
typedef frac_struct frac_t[1];

frac_t z;                                   /* the same as  frac_struct z[1];  */
void frac_set(frac_t r, long n, long d);    /* the same as  frac_struct *r     */
```

Read the `typedef` as in section 2: without `typedef`, the line would define a variable `frac_t`, an array of one `frac_struct`. With it, `frac_t` names that type ([C11](#c11)). It is an array type, not a pointer type. It acts differently depending on where it is used ([C7](#c7)):

- **As a variable or struct member**, it defines an array. `frac_t z;` creates one `frac_struct`'s worth of storage inside `z`, with automatic storage duration if `z` is defined in a block ([C12](#c12)). No heap is involved.
- **As a parameter**, it is adjusted to `frac_struct*` (rule two).
- **At the call**, the caller writes `frac_set(z, 1, 2)`. `z` decays to `&z[0]` (rule one), which is the address of the caller's struct.

`frac_t z;` reserves storage but initialises nothing ([C12](#c12)). That is why GMP and FLINT require an init function before first use, such as `mpz_init(x)`. The matching clear function afterwards releases the heap memory the library attached to the struct.

```
                declaration          storage of the variable     call
step 1          frac_struct x;       one frac_struct, inline     frac_set(&x, 1, 2)
step 2          frac_struct y[1];    one frac_struct, inline     frac_set(y, 1, 2)
step 3          frac_t z;            one frac_struct, inline     frac_set(z, 1, 2)
```

### 8. Why not a pointer typedef?

A library could write `typedef frac_struct *frac_p;` instead ([C9](#c9)). Callers would still pass a `frac_p` without `&`. But `frac_p w;` defines only a pointer, with an indeterminate value. No `frac_struct` exists yet:

```
typedef frac_struct frac_t[1];   frac_t z;    the array: the struct itself is inline

  z:  [ num | den ]

typedef frac_struct *frac_p;     frac_p w;    the pointer: only an address is inline

  w:  [ address ] ───▶ heap:  [ num | den ]   allocated by an init function, freed by a clear function
```

The struct must then live somewhere else. It cannot be a local variable of the init function, because a local is destroyed when its function returns ([stack and heap, C5](stack-and-heap.md#c5)). So the init function would request heap memory with `malloc` ("memory allocate": C's counterpart of `new`, which returns the address of a fresh block of the requested size). A clear function would hand it back with `free`, because C never frees heap memory on its own ([stack and heap, C2](stack-and-heap.md#c2)). Every object would cost an allocation, an extra indirection and a `free` to forget.

The one-element array gives both at once: storage inline where the variable is defined, and a pointer wherever it is passed. The struct may still hold pointers to heap memory of its own, such as a polynomial's coefficients; only the struct itself is spared a `malloc`. The [GMP manual](https://gmplib.org/manual/Parameter-Conventions) gives the reason for the idiom: functions modify their arguments in place, and the array type gives call by reference without making the caller write `&`. It resembles a C# parameter that is always `ref`, without the `ref` at the call.

### 9. The real types in GMP and FLINT

FLINT's headers follow the three steps exactly ([C10](#c10)):

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

**The core ends here.** The five questions from the top of this note can now be answered: what `typedef S T[1]` means (sections 2 and 7), what `T x;` creates (sections 3 and 7), why a parameter `T x` is an `S*` (section 5), why passing `x` modifies the original (section 6), and why not `typedef S* T` (section 8).

### Advanced: pointers to whole arrays

`&a`, for `int a[4]`, is one of the exceptions to decay ([C5](#c5)). `&` is the ordinary address-of operator ([where the * goes, C4](pointer-declarator-syntax.md#c4)). The result points to the whole array. Its type is written `int (*)[4]`. With a name, read from the name outwards: `int (*p)[4] = &a;` makes `p` a pointer (`*p`) to an array of four (`[4]`) `int`. The parentheses matter, because `[]` binds tighter than `*`: `int *q[4]` is an array of four pointers to `int`.

`&a` and `a` decayed hold the same address. But `&a + 1` steps over all four elements, where `a + 1` steps over one. For a `frac_t z`, `&z` is a `frac_struct (*)[1]`, not a `frac_struct*`, which is why GMP and FLINT functions take `z`, not `&z`.

### Advanced: multidimensional array parameters

Adjustment applies once, to the outermost array level ([C6](#c6)). A two-dimensional array `int m[3][4]` is an array of three rows, each an array of four `int`, stored row after row:

```
int m[3][4]: twelve ints in a row, row after row (4-byte int)

byte offset   0    4    8    12   16   20   24   28   32   36   40   44
            [0,0][0,1][0,2][0,3][1,0][1,1][1,2][1,3][2,0][2,1][2,2][2,3]
            └────── m[0] ──────┘└────── m[1] ──────┘└────── m[2] ──────┘
            ▲                   ▲
            m decays to &m[0]   m + 1 points to m[1], 16 bytes on

m[1][2] = *(*(m + 1) + 2) is at byte 1*16 + 2*4 = 24
```

A parameter `int m[3][4]` becomes `int (*m)[4]`: a pointer to the first row. The row length stays part of the type, because one step of `m + 1` must skip a whole row. The number of rows, 3, is lost like any outermost length, so it must be passed separately. A pointer to the whole array, `int (*m)[3][4]`, would keep both lengths. But then the function would accept only arrays of exactly 3 by 4, which is why C APIs rarely use it.

### Advanced: const array parameters

A `const` on an array type applies to its elements. So a parameter `const frac_t a` is adjusted to `const frac_struct *a`: the function may read the caller's struct but not change it through `a` ([where the * goes, C6](pointer-declarator-syntax.md#c6)). This is how GMP and FLINT mark inputs, as in `frac_mul(frac_t r, const frac_t a, const frac_t b)` in the examples below. Passing a non-const `frac_t` there is fine: the decayed `frac_struct*` converts to `const frac_struct*` implicitly.

### Advanced: storing such a parameter in C++

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

The member `fmpz_mpoly_t p_` is the other side ([C7](#c7)). As a member it is a real array, so the polynomial's struct sits inside each `Poly` object. Passing `p_` to `fmpz_mpoly_init` passes its address without `&`. The [constructors note](../cpp/constructors.md) explains `explicit` and the initialiser list. [RAII and ownership](../cpp/raii-and-ownership.md) explains the destructor and the deleted copies, using a simpler library with plain pointer handles.

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

`x->num` works on a variable that is not declared as a pointer, because `x` decays to one. `sizeof x` is the size of one `frac_struct`, because `sizeof` does not decay ([C3](#c3)).

## Pitfalls

- Using `sizeof a / sizeof a[0]` to count the elements of an array parameter. It divides the size of a pointer by the size of an element ([C2](#c2)).
- Using an `mpz_t` or `fmpz_mpoly_t` before its init function has run. The definition reserved storage but initialised nothing ([C12](#c12)).
- Writing `x = y;` with two `mpz_t` or `fmpz_mpoly_t` variables. It does not compile, because they are arrays ([C4](#c4)). The library's set function (`mpz_set`, `fmpz_mpoly_set`) does the copy.
- Copying the struct directly, `*x = *y;`, or copying a C++ class that has such a member with the default copy. That copies only the struct, which holds pointers to the library's heap memory. Both copies then free the same memory ([RAII and ownership, C8](../cpp/raii-and-ownership.md#c8)).
- Returning an `fmpz_mpoly_t` from a function. Arrays cannot be returned ([C4](#c4)). The library convention is to pass the result as the first parameter, as `frac_mul` does.
- Taking `&ctx` of an `fmpz_mpoly_ctx_t` local and passing it where an `fmpz_mpoly_ctx_struct*` is expected. `&ctx` is a pointer to an array of one struct, which has a different type ([C5](#c5)). Pass `ctx`.
- Storing the parameter's pointer and letting the caller's struct die first: the stored pointer dangles ([C8](#c8)).

## Exercises

Try each one before opening its solution.

1. **Predict.** On a platform with 8-byte `double` and 8-byte pointers, what does this print?

   ```c
   void g(double d[8]) { printf("%zu\n", sizeof d); }

   int main(void) { double v[8]; printf("%zu\n", sizeof v); g(v); return 0; }
   ```

   <details><summary>Solution</summary>

   `64`, then `8`. In `main`, `v` is the array itself: 8 × 8 bytes. In `g`, the parameter was adjusted to `double *d`, so `sizeof d` is the size of a pointer ([C1](#c1), [C2](#c2)).

   </details>

2. **Interpret.** Given `typedef int quad[4];`, what is `q` in `quad q;` at block scope, how many bytes does it take with 4-byte `int`, and what is its value? What is the type of `q` in `void h(quad q);`?

   <details><summary>Solution</summary>

   `quad q;` defines an array of four `int`, 16 bytes, with automatic storage and indeterminate contents ([C11](#c11), [C12](#c12)). In `h`, the parameter is adjusted to `int *q` ([C1](#c1)).

   </details>

3. **Interpret.** Given `typedef frac_struct *frac_p;`, what does `frac_p w;` create? Can you call `frac_set(w, 1, 2)` straight away?

   <details><summary>Solution</summary>

   Only a pointer, with an indeterminate value. No `frac_struct` exists. The call compiles but writes through a garbage address, which is undefined behaviour. `w` must first point to a real struct, for example one from `malloc` ([C9](#c9)).

   </details>

4. **Explain.** C passes every argument by value. Why, then, does `frac_set(z, 1, 2)` change the caller's `frac_t z`?

   <details><summary>Solution</summary>

   The value passed is not the struct. `z` decays to `&z[0]`, the address of the caller's struct ([C3](#c3)). The parameter, adjusted to `frac_struct*` ([C1](#c1)), receives a copy of that address. Writing `r->num` goes through it into the caller's storage ([C7](#c7), [C13](#c13)).

   </details>

5. **Predict.** Does `frac_t a, b; a = b;` compile? After both are set, what would `a[0] = b[0];` do, and why is it fine for `frac_t` but wrong for `fmpz_mpoly_t`?

   <details><summary>Solution</summary>

   `a = b;` does not compile: arrays cannot be assigned ([C4](#c4)). `a[0] = b[0];` assigns one struct to another, copying `num` and `den`. For `frac_t` that is a complete copy. An `fmpz_mpoly_struct` holds pointers to heap memory owned by the library, so the same assignment would make both structs share it. Both would later free it. Use `fmpz_mpoly_set`.

   </details>

6. **Explain in your own words.** Why does GMP define `mpz_t` as an array of one struct rather than as a pointer to a struct?

   <details><summary>Solution</summary>

   An array of one struct gives the struct's storage inline in the variable, with no `malloc` and no `free` for the struct itself. It also gives pass-by-pointer at every call without `&`, because a parameter of that type is adjusted to a pointer and the argument decays to one. A pointer typedef gives only the second: the struct would need storage of its own ([C7](#c7), [C9](#c9)).

   </details>

## Sources

- Claude session on [Tante](https://github.com/thomaswening/Tante), 2026-10-20, answering Thomas's review questions on FLINT's `_t` types in the FLINT wrapper of [Tante](https://github.com/thomaswening/Tante)'s [build spike](https://github.com/thomaswening/Tante/blob/main/docs/spikes/2026-10-16-native-arithmetic-build.md) ([doubting-thomas PR #3](https://github.com/thomaswening/doubting-thomas/pull/3)).
- Didactic review of this note by Thomas with ChatGPT, 2026-10-27, which asked for the progressive structure, the separation of the two rules, and the exercises.
- cppreference: [arrays in C, with array-to-pointer conversion](https://en.cppreference.com/w/c/language/array), [function declarations in C](https://en.cppreference.com/w/c/language/function_declaration), [declarations in C](https://en.cppreference.com/w/c/language/declarations), [storage duration in C](https://en.cppreference.com/w/c/language/storage_duration), [array-to-pointer conversion in C++](https://en.cppreference.com/w/cpp/language/implicit_conversion#Array-to-pointer_conversion).
- [GMP manual: Parameter Conventions](https://gmplib.org/manual/Parameter-Conventions); [FLINT documentation: fmpz_mpoly](https://flintlib.org/doc/fmpz_mpoly.html).
- [comp.lang.c FAQ, section 6: arrays and pointers](https://c-faq.com/aryptr/index.html).
