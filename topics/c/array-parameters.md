---
title: Array parameters and array decay
area: c
created: 2026-10-20
updated: 2026-10-28
prerequisites: [c/declarations-and-objects, c/pointer-declarator-syntax]
related: [c/one-element-array-typedef, c/pointers-to-arrays, c/strings, cpp/constructors]
projects: [tante]
tags: [c, cpp, array, pointer, decay, parameter, subscript, pointer-arithmetic]
---

# Array parameters and array decay

## TL;DR

- Two separate rules turn arrays into pointers. An array used in an expression *decays* to a pointer to its first element: a rule about expressions. A parameter declared as an array is *adjusted* to a pointer: a rule about declarations.

- `a[i]` is defined as `*(a + i)`: pointer arithmetic, then a dereference. So `[]` works on any pointer. On an array it works only because the array decays first.

- Inside a function, `sizeof` of an array parameter is the size of a pointer. The length must be passed separately.

- Arrays cannot be copied, assigned, passed or returned by value. A struct that contains an array can.

- Together, decay and adjustment make `f(a)` pass the address of the caller's first element. `f` can therefore change the caller's array. The [one-element array typedef](one-element-array-typedef.md) of GMP and FLINT is built on exactly this.

## Key claims

- <a id="c1"></a>**C1.** In C and C++, a function parameter declared with type "array of `T`" is adjusted to "pointer to `T`", and any size written in the brackets is ignored: `void f(int a[10]);`, `void f(int a[]);` and `void f(int* a);` declare the same function.

- <a id="c2"></a>**C2.** In the scope that declares an array, `sizeof` applied to it gives the size of the whole array; inside a function, `sizeof` applied to a parameter declared as an array gives the size of a pointer, not of the caller's array, so the function cannot find out the array's length, which must be passed separately.

- <a id="c3"></a>**C3.** An expression of array type is converted to a pointer to the array's first element (array-to-pointer conversion, or decay). In C17 the only exceptions are an array that is the operand of `sizeof` or unary `&`, and a string literal used to initialise an array. C23 adds the `typeof` operators; C++ adds a few more, such as binding the array to a reference.

- <a id="c4"></a>**C4.** An array cannot be initialised from another array, assigned to, passed by value or returned from a function: with two arrays, `int b[3] = a;` and `b = a;` do not compile. A struct that contains an array can be initialised from another struct of its type, assigned, passed and returned; the array is copied with it.

- <a id="c5"></a>**C5.** *(moved 2026-10-27 to [pointers to arrays, C1](pointers-to-arrays.md#c1), with the rest of the advanced material)*

- <a id="c6"></a>**C6.** *(moved 2026-10-27 to [pointers to arrays, C4](pointers-to-arrays.md#c4))*

- <a id="c7"></a>**C7.** *(moved 2026-10-28 to [the one-element array typedef, C1](one-element-array-typedef.md#c1))*

- <a id="c8"></a>**C8.** *(moved 2026-10-28 to [the one-element array typedef, C2](one-element-array-typedef.md#c2))*

- <a id="c9"></a>**C9.** *(moved 2026-10-28 to [the one-element array typedef, C3](one-element-array-typedef.md#c3))*

- <a id="c10"></a>**C10.** *(moved 2026-10-28 to [the one-element array typedef, C4](one-element-array-typedef.md#c4))*

- <a id="c11"></a>**C11.** *(moved 2026-10-28 to [declarations, objects and initialisation, C2](declarations-and-objects.md#c2))*

- <a id="c12"></a>**C12.** *(moved 2026-10-28 to [declarations, objects and initialisation, C3](declarations-and-objects.md#c3))*

- <a id="c13"></a>**C13.** Parameter adjustment ([C1](#c1)) is a rule about declarations, applied once to the function's declared type, while array-to-pointer conversion ([C3](#c3)) is a rule about expressions, applied wherever an array is used as a value; passing an array to an array parameter involves both, and the decayed argument then has exactly the adjusted parameter's type.

- <a id="c14"></a>**C14.** *(moved 2026-10-28 to [declarations, objects and initialisation, C5](declarations-and-objects.md#c5), generalised to any array of structs)*

- <a id="c15"></a>**C15.** In C, the subscript expression `E1[E2]` is defined as `*((E1) + (E2))`: pointer arithmetic followed by a dereference, so it applies to any pointer, not only to arrays. For an array `a`, `a[i]` works because `a` first decays to `&a[0]`; for a pointer `p`, `p[0]` is the same as `*p`; `p[i]` is the object `i` elements after the one `p` points to.

## Explanation

In C#, an array is an object that knows its length. A method receives a reference to it. A C array is only its elements, stored inline ([declarations and objects](declarations-and-objects.md#objects-arrays-and-pointers)). C cannot copy such an array as a value. Two rules decide what happens instead, one for expressions and one for parameters. This note explains both, and why `[]` works on pointers.

The examples use the struct from [declarations and objects](declarations-and-objects.md):

```c
typedef struct { long num, den; } frac_struct;
```

### Rule one: an array used as a value decays to a pointer

Whenever an array appears in an expression, C converts it to a pointer to its first element ([C3](#c3)). This is **array-to-pointer conversion**, or **decay**.

- `int *p = a;` compiles: `a` becomes `&a[0]`.
- For a one-element array `frac_struct y[1];`, `y` becomes `&y[0]`, a `frac_struct*`.

A few operators need the array itself and are the exceptions. `sizeof a` gives the size of the whole array, 16 bytes for `int a[4]`, in the scope that defines it ([C2](#c2)). `&a` takes the address of the whole array, which has a different type from `&a[0]` ([pointers to arrays, C1](pointers-to-arrays.md#c1)). `char s[] = "abc";` copies the string literal into `s`.

### Subscripting is pointer arithmetic

C# has a separate indexer for arrays. C has none. `[]` is defined through pointers ([C15](#c15)):

```
E1[E2]   means   *((E1) + (E2))
```

Read `p[i]` in two steps. First, `p + i` is **pointer arithmetic**: it moves `i` *elements* further, not `i` bytes. For an `int*` with 4-byte `int`, `p + 2` lies 8 bytes past `p`. Second, the `*` dereferences the result: it yields the object at that address.

So `[]` needs a pointer. Any pointer will do:

```c
int a[4] = {10, 20, 30, 40};
int *p = a + 1;                 /* points to a[1] */
```

```
byte offset    0     4     8     12
             [ 10 ][ 20 ][ 30 ][ 40 ]
               a[0]  a[1]  a[2]  a[3]
                     ▲
                     p           p[0] = *(p + 0) = 20
                                 p[2] = *(p + 2) = 40
                                 p[-1] = *(p - 1) = 10
```

On the array itself, `a[2]` works only because of rule one: `a` decays to `&a[0]`, then `+ 2` and `*` do the rest. There is no separate "array indexing".

Three consequences follow:

- **`p[0]` is `*p`.** For a pointer to a single struct, `r[0]` is that struct. This is why `copy[0] = r[0];` in [the one-element array typedef](one-element-array-typedef.md#inside-the-function-what-the-parameter-can-initialise) copies the struct `r` points to.
- **`p->m` is `p[0].m`.** Both mean `(*p).m` ([where the * goes, C5](pointer-declarator-syntax.md#c5)). For `frac_struct y[1];`, `y->num` and `y[0].num` are the same member.
- **The brackets do not check bounds.** `p[i]` computes an address and reads it. `p[3]` above would read `a[4]`, which does not exist. That is undefined behaviour, not an exception as in C#. Because addition commutes, `2[a]` even means `a[2]`. It compiles, but nobody should write it.

### Arrays cannot be copied; structs can

Decay also explains why C has no array copy ([C4](#c4)):

```c
int a[3] = {1, 2, 3};
int b[3] = a;      /* error: an array needs a brace list as its initialiser */
b = a;             /* error: an array cannot be assigned */
```

In `int b[3] = a;`, `a` is an expression, so it has already decayed to an `int*`. An array can only be initialised from a brace-enclosed list, or a character array from a string literal. An address is neither. Assignment is ruled out separately: an array is not something C lets you assign to. To copy one array into another, call `memcpy(b, a, sizeof a)` from `<string.h>`.

A struct is different. Initialising or assigning a struct from another struct of the same type copies all its members. An array inside the struct is one of those members, so it is copied along:

```c
typedef struct { int values[3]; } triple;

triple s = {{1, 2, 3}};   /* brace initialisation: see declarations and objects */
triple t = s;             /* valid: copies all three ints */
```

### Rule two: an array parameter is adjusted to a pointer

A function cannot receive an array by value ([C4](#c4)). So when C reads a function declaration with a parameter of array type, it rewrites that parameter's type to a pointer ([C1](#c1)). `void f(int a[10])` *is* `void f(int *a)`. The `10` is neither checked nor stored. The brackets only hint to the reader that several elements are expected.

The surprise comes once ([C2](#c2)): inside `f`, `sizeof a` is the size of a pointer, typically 8. The length is gone. C APIs pass it as a separate parameter, as in `void sum(const int *a, size_t n)`. C++ code passes a `std::span<int>`, which bundles pointer and length like C#'s `Span<int>`.

### Two rules, one call

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

With a `typedef` name for `frac_struct[1]`, this call becomes GMP's and FLINT's calling convention. [The one-element array typedef](one-element-array-typedef.md) builds that idiom step by step. Pointers to whole arrays, multidimensional arrays and `const` array parameters are in [pointers to arrays and multidimensional arrays](pointers-to-arrays.md).

## Examples

Decay, adjustment and subscripting, with sizes for a typical 64-bit platform (4-byte `int`, 8-byte pointers):

```c
#include <stdio.h>

void f(int a[10])                     /* really: void f(int* a) */
{
    printf("%zu\n", sizeof a);        /* size of a pointer */
}

int main(void)
{
    int arr[10] = {0};
    printf("%zu\n", sizeof arr);      /* size of the whole array: 10 * 4 */
    f(arr);                           /* arr decays to &arr[0] */
    int* p = arr;                     /* the same decay */
    printf("%d\n", p == &arr[0]);
    p[3] = 7;                         /* *(p + 3): writes arr[3] */
    printf("%d %d\n", arr[3], *(arr + 3));
    return 0;
}
```

Expected output (GCC and Clang also warn that `sizeof a` gives the size of a pointer):

```
40
8
1
7 7
```

## Pitfalls

- Using `sizeof a / sizeof a[0]` to count the elements of an array parameter. It divides the size of a pointer by the size of an element ([C2](#c2)).

- Writing `b = a;` to copy an array. It does not compile ([C4](#c4)). Use `memcpy`, or wrap the array in a struct.

- Returning a local array from a function. Arrays cannot be returned ([C4](#c4)). Pass the destination as a parameter instead.

- Trusting `[]` to check bounds. `p[i]` only computes an address. Reading past the end is undefined behaviour ([C15](#c15)).

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

2. **Interpret.** Given `typedef int quad[4];`, what is the type of `q` in `void h(quad q);`? Can `h` find out that the caller passed four `int`?

   <details><summary>Solution</summary>

   `int *q`: the parameter's array type is adjusted to a pointer ([C1](#c1)). The 4 is lost, so `h` cannot find out the length. `sizeof q` is the size of a pointer ([C2](#c2)).

   </details>

3. **Predict.** Given `int a[4] = {10, 20, 30, 40};` and `int *p = a + 1;`, what are `p[0]`, `p[2]` and `p[-1]`? What does `p[3]` do?

   <details><summary>Solution</summary>

   `p[0]` is `*(p + 0)`, which is `a[1]`, 20. `p[2]` is `a[3]`, 40. `p[-1]` is `a[0]`, 10. `p[3]` would be `a[4]`, past the end of the array: undefined behaviour, with no bounds check ([C15](#c15)).

   </details>

4. **Explain.** Why does `int b[3] = a;` fail for an array `a`, while `triple t = s;` copies an array that sits inside the struct `s`?

   <details><summary>Solution</summary>

   `a` in an expression decays to an `int*`. An array can only be initialised from a brace list ([C3](#c3), [C4](#c4)). A struct may be initialised from another struct of its type. That copies all its members, including an array member ([C4](#c4)).

   </details>

## Sources

- Claude session on [Tante](https://github.com/thomaswening/Tante), 2026-10-20, answering Thomas's review questions on FLINT's `_t` types in the FLINT wrapper of [Tante](https://github.com/thomaswening/Tante)'s [build spike](https://github.com/thomaswening/Tante/blob/main/docs/spikes/2026-10-16-native-arithmetic-build.md) ([doubting-thomas PR #3](https://github.com/thomaswening/doubting-thomas/pull/3)).
- Didactic review of this note by Thomas with ChatGPT, 2026-10-27, which asked for the progressive structure, the separation of the two rules, and the exercises. The advanced material moved to [pointers to arrays and multidimensional arrays](pointers-to-arrays.md) the same day. On 2026-10-28 Thomas found the note too long: the groundwork moved to [declarations, objects and initialisation](declarations-and-objects.md) and the GMP idiom to [the one-element array typedef](one-element-array-typedef.md). His question about `r[0]` on a pointer added [C15](#c15).
- cppreference: [arrays in C, with array-to-pointer conversion](https://en.cppreference.com/w/c/language/array), [member access and subscript operators in C](https://en.cppreference.com/w/c/language/operator_member_access), [function declarations in C](https://en.cppreference.com/w/c/language/function_declaration), [array-to-pointer conversion in C++](https://en.cppreference.com/w/cpp/language/implicit_conversion#Array-to-pointer_conversion).
- [comp.lang.c FAQ, section 6: arrays and pointers](https://c-faq.com/aryptr/index.html).
