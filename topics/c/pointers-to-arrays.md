---
title: Pointers to arrays and multidimensional arrays
area: c
created: 2026-10-27
updated: 2026-10-28
prerequisites: [c/array-parameters, c/pointer-declarator-syntax]
related: [c/function-pointer-declarations]
projects: [tante]
tags: [c, cpp, array, pointer, declarator, multidimensional-array, const]
---

# Pointers to arrays and multidimensional arrays

## TL;DR

- `&a`, for an array `int a[4]`, is a pointer to the whole array. Its type is `int (*)[4]`. It holds the same address as `a` decayed, but `+ 1` on it skips all four elements.
- `int (*p)[4]` is a pointer to an array of four `int`. `int *q[4]` is an array of four pointers. The parentheses decide, because `[]` binds tighter than `*`.
- `int m[3][4]` is three rows of four `int`, stored row after row with no pointers in between. It is not an array of pointers, so passing it as an `int**` is wrong.
- As a parameter, only the outermost level is adjusted: `int m[3][4]` becomes `int (*m)[4]`. The row length stays in the type; the row count must be passed separately.
- `const` on an array type applies to its elements, so a parameter `const frac_t a` becomes `const frac_struct *a`.

## Key claims

- <a id="c1"></a>**C1.** For an array `int arr[4]`, `arr` used in an expression is an `int*` to the first element, while `&arr` is an `int (*)[4]`, a pointer to the whole array; both hold the same address but have different types.
- <a id="c2"></a>**C2.** `int (*p)[4]` declares `p` as a pointer to an array of four `int`, while `int *q[4]` declares `q` as an array of four pointers to `int`, because in a declarator `[]` binds tighter than `*` unless parentheses group the `*` with the name first.
- <a id="c3"></a>**C3.** Adding 1 to a pointer moves it by the size of the type it points to: for `int arr[4]` with 4-byte `int`, `arr + 1` lies 4 bytes past `arr`, while `&arr + 1` lies 16 bytes past it.
- <a id="c4"></a>**C4.** Only the outermost array level of a parameter is adjusted: a parameter declared `int m[3][4]` has type `int (*)[4]`, a pointer to arrays of four `int`.
- <a id="c5"></a>**C5.** A multidimensional array such as `int m[3][4]` is an array of three arrays of four `int`, stored contiguously row after row (row-major order), so `m[i][j]` lies `(i * 4 + j) * sizeof(int)` bytes from the start.
- <a id="c6"></a>**C6.** A function taking `int (*m)[4]` knows the row length but not the number of rows, which must be passed separately; a parameter of type `int (*m)[3][4]` keeps both lengths but accepts only arrays of exactly three rows of four.
- <a id="c7"></a>**C7.** Passing an `int m[3][4]` where an `int**` is expected is a constraint violation in C and an error in C++: `m` contains no pointers, and the decayed `int (*)[4]` is a different type from `int**`. GCC 14 and later reject it in C by default; GCC 13 only warns, and the resulting program reads `int` values as addresses.
- <a id="c8"></a>**C8.** A `const` qualifier applied to an array type qualifies its elements, so with `typedef S name_t[1];` a parameter declared `const name_t a` is adjusted to `const S *a`, a pointer through which the caller's `S` can be read but not changed.

## Explanation

This note continues [array parameters and array decay](array-parameters.md), which explains decay, parameter adjustment and the GMP `typedef S T[1]` idiom. Everything here builds on those two rules.

### Pointers to whole arrays

Decay turns `a`, for `int a[4]`, into `&a[0]`: a pointer to one `int`. Unary `&` is an exception to decay ([array parameters, C3](array-parameters.md#c3)), so `&a` takes the address of the array as a whole ([C1](#c1)). `&` is the ordinary address-of operator ([where the * goes, C4](pointer-declarator-syntax.md#c4)).

The result's type is written `int (*)[4]`. With a name, read it from the name outwards ([reading function-pointer declarations](function-pointer-declarations.md)):

```
int (*p)[4];     p is a pointer (*p) to an array of 4 (...[4]) int
int *q[4];       q is an array of 4 (q[4]) pointers to int (int *)
```

The parentheses matter ([C2](#c2)). Without them, `[]` binds to the name first, because suffixes bind tighter than the prefix `*`.

`&a` and `a` decayed hold the same address: the array starts where its first element starts. They differ in what they point to, so pointer arithmetic differs ([C3](#c3)):

```
int a[4];  (4-byte int)

byte offset   0      4      8      12     16
             [a[0] ][a[1] ][a[2] ][a[3] ]
             ▲      ▲                     ▲
             a      a + 1                 &a + 1
             &a
```

For a `frac_t z` from the GMP idiom, `&z` is a `frac_struct (*)[1]`, not a `frac_struct*`. That is why GMP and FLINT functions take `z`, not `&z`.

### Multidimensional arrays

`int m[3][4]` reads, from the name outwards, as "an array of 3 arrays of 4 `int`". The elements of `m` are rows. Each row is an `int[4]`. They are stored contiguously, row after row ([C5](#c5)):

```
int m[3][4]: twelve ints in a row, row after row (4-byte int)

byte offset   0    4    8    12   16   20   24   28   32   36   40   44
            [0,0][0,1][0,2][0,3][1,0][1,1][1,2][1,3][2,0][2,1][2,2][2,3]
            └────── m[0] ──────┘└────── m[1] ──────┘└────── m[2] ──────┘
            ▲                   ▲
            m decays to &m[0]   m + 1 points to m[1], 16 bytes on

m[1][2] = *(*(m + 1) + 2) is at byte (1*4 + 2)*4 = 24
```

`m` decays to `&m[0]`, a pointer to the first row, of type `int (*)[4]`. `m + 1` skips one whole row. `*(m + 1)` is the row `m[1]`, which decays in turn to a pointer to its first `int`. Adding 2 and dereferencing gives `m[1][2]`.

This is unlike C#'s jagged array `int[][]`, an array of references to separate arrays. It is the layout of C#'s rectangular `int[,]`, minus the object header and the stored lengths. Since there are no pointers inside `m`, passing it where an `int**` is expected is wrong ([C7](#c7)). An `int**` would expect an array of pointers to follow, which does not exist. The C standard requires a diagnostic. Some C compilers, such as GCC 13, give only a warning and build the program anyway, so treat that warning as an error.

### Multidimensional array parameters

Parameter adjustment applies once, to the outermost level ([C4](#c4)). A parameter `int m[3][4]` becomes `int (*m)[4]`: a pointer to the first row. The row length stays part of the type, because the function needs it to compute where `m[i][j]` lives: one step of `m + 1` must skip a whole row.

The number of rows, 3, is lost like any outermost length, so it must be passed separately ([C6](#c6)). A pointer to the whole array, `int (*m)[3][4]`, would keep both lengths. But then the function would accept only arrays of exactly three rows of four, which is why C APIs rarely use it.

### const on array types

A `const` on an array type applies to its elements ([C8](#c8)). So with `typedef frac_struct frac_t[1];`, a parameter `const frac_t a` means "array of one `const frac_struct`", which is adjusted to `const frac_struct *a`. The function may read the caller's struct but not change it through `a` ([where the * goes, C6](pointer-declarator-syntax.md#c6)). This is how GMP and FLINT mark inputs, as in `frac_mul(frac_t r, const frac_t a, const frac_t b)` in [array parameters](array-parameters.md#examples). Passing a non-const `frac_t` there is fine: the decayed `frac_struct*` converts to `const frac_struct*` implicitly.

## Examples

Pointers to arrays and a two-dimensional parameter, with 4-byte `int`:

```c
#include <stdio.h>

void print_rows(int (*m)[4], size_t rows)     /* same as: int m[][4] */
{
    for (size_t i = 0; i < rows; i++)
        for (size_t j = 0; j < 4; j++)
            printf("%d%c", m[i][j], j == 3 ? '\n' : ' ');
}

int main(void)
{
    int a[4] = {1, 2, 3, 4};
    int (*pa)[4] = &a;                        /* pointer to the whole array */

    printf("%zu %td %td\n",
           sizeof *pa,                        /* the array: 16 */
           (char*)(pa + 1) - (char*)pa,       /* one whole array further: 16 */
           (char*)(a + 1) - (char*)a);        /* one int further: 4 */
    printf("%d\n", (*pa)[2]);                 /* first *pa gives the array, then [2] */

    int m[2][4] = {{1, 2, 3, 4}, {5, 6, 7, 8}};
    print_rows(m, 2);                         /* m decays to int (*)[4] */
    return 0;
}
```

Expected output:

```
16 16 4
3
1 2 3 4
5 6 7 8
```

`(*pa)[2]` needs its parentheses for the same reason as the declaration: `*pa[2]` would mean `*(pa[2])`, the array two places after `a`, which does not exist.

## Pitfalls

- Passing an `int m[3][4]` to a function that takes `int**`. C++ and GCC 14 or later reject it. GCC 13 compiles it with only a warning. A cast silences even that. The function then reads `int` values as addresses ([C7](#c7)).
- Writing `int *p[4]` when a pointer to an array was meant. That is an array of four pointers ([C2](#c2)).
- Taking `&z` of a GMP or FLINT `_t` variable. It has type pointer-to-array, not pointer-to-struct ([C1](#c1)). Pass `z`.
- Expecting a function taking `int (*m)[4]` to know how many rows there are ([C6](#c6)).

## Exercises

Try each one before opening its solution.

1. **Interpret.** What are `x` and `y` in `double (*x)[3];` and `double *y[3];`? With 8-byte `double` and 8-byte pointers, what is `sizeof *x` and `sizeof y`?

   <details><summary>Solution</summary>

   `x` is a pointer to an array of three `double`; `sizeof *x` is the array, 24 bytes. `y` is an array of three pointers to `double`; `sizeof y` is 24 bytes too, but for a different reason: three 8-byte pointers ([C2](#c2)).

   </details>

2. **Predict.** For `int m[3][4]` starting at byte 0 with 4-byte `int`, at which byte does `m[2][1]` lie? What is the type of `m + 1`?

   <details><summary>Solution</summary>

   At $(2 \cdot 4 + 1) \cdot 4 = 36$. `m + 1` is an `int (*)[4]` pointing to the row `m[1]`, at byte 16 ([C3](#c3), [C5](#c5)).

   </details>

3. **Explain.** Why can a function take `int (*m)[4]` but not `int (*m)[]` and still index `m[i][j]`?

   <details><summary>Solution</summary>

   To find `m[i][j]`, the function must skip `i` whole rows, so it must know the row length. `int (*m)[4]` carries it. With an unknown row length, `m + 1` cannot be computed ([C4](#c4), [C5](#c5)).

   </details>

## Sources

- Split from [array parameters and array decay](array-parameters.md) on 2026-10-27, after Thomas's didactic review with ChatGPT asked for the advanced material to come after the core idiom.
- cppreference: [arrays in C](https://en.cppreference.com/w/c/language/array), [pointer declaration in C](https://en.cppreference.com/w/c/language/pointer), [function declarations in C](https://en.cppreference.com/w/c/language/function_declaration), [const type qualifier in C](https://en.cppreference.com/w/c/language/const).
- [comp.lang.c FAQ, section 6: arrays and pointers](https://c-faq.com/aryptr/index.html), especially questions 6.18 and 6.19 on passing two-dimensional arrays.
