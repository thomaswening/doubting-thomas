---
title: The structure of a Fortran program
area: fortran
created: 2026-10-29
updated: 2026-10-29
prerequisites: []
related: [numerics/double-encoding]
projects: [partonforge]
tags: [fortran, program-unit, module, subroutine, function, implicit-none, kind, iso-fortran-env, free-form, fixed-form, do-loop, column-major]
---

# The structure of a Fortran program

## TL;DR

- A Fortran program is built from **program units**: one main `program`, plus `module`s, `subroutine`s and `function`s. The main program plays the role of `main`.
- Every unit has a **specification part** (`use`, `implicit none`, declarations) followed by an **execution part** (statements). Declarations never come after a statement.
- `implicit none` switches off implicit typing, under which an undeclared name starting with I–N is an integer and any other a real. Modern code always writes it.
- Types carry a **kind**: `real(real64)` is a `double`. A literal needs its kind too. `0.1` alone is single precision, `0.1_real64` is double.
- Arguments are passed by reference: a subroutine can change the caller's variable. `intent(in)`, `intent(out)` and `intent(inout)` say which way the data flows.
- Arrays start at index 1 and are stored column by column: in `a(i, j)`, the first index varies fastest. C and C++ do it the other way round.

## Key claims

- <a id="c1"></a>**C1.** A Fortran program consists of program units: exactly one main program (`program name … end program name`), and any number of modules, external subroutines and external functions. A subroutine is invoked with `call name(args)` and returns no value; a function is used inside an expression and returns one.
- <a id="c2"></a>**C2.** A program unit has a specification part (`use` statements first, then `implicit none`, then declarations) followed by an execution part; a declaration after the first executable statement is an error.
- <a id="c3"></a>**C3.** Without `implicit none`, an undeclared name whose first letter is I, J, K, L, M or N is an `integer` and any other is a `real`; with `implicit none`, an undeclared name is a compile error.
- <a id="c4"></a>**C4.** `use, intrinsic :: iso_fortran_env, only: int64, real64` imports kind constants from the module the compiler provides; `real(real64)` is a 64-bit IEEE real (C++'s `double`), `integer(int64)` a 64-bit integer. Older code writes `double precision` or `real*8`.
- <a id="c5"></a>**C5.** A real literal without a kind suffix has the default kind, which is single precision with gfortran, so `x = 0.1` assigns the single-precision value 0.100000001490116… even when `x` is `real(real64)`; `0.1_real64` or `0.1d0` is the double-precision literal.
- <a id="c6"></a>**C6.** A module groups declarations and procedures (`module m … contains … end module m`); `use m` makes its public names available and `use m, only: a, b` only the listed ones. `private` as the first statement hides everything not listed with `public`.
- <a id="c7"></a>**C7.** Arguments are passed by reference, so assigning to a dummy argument changes the caller's variable; `intent(in)` forbids that, `intent(out)` and `intent(inout)` declare that the procedure writes the argument.
- <a id="c8"></a>**C8.** Arrays are indexed from 1 by default and stored in column-major order: the elements of `a(2, 3)` lie in memory as `a(1,1), a(2,1), a(1,2), a(2,2), a(1,3), a(2,3)`. C and C++ store a two-dimensional array row by row.
- <a id="c9"></a>**C9.** Free-form source (`.f90`) has no column rules, `!` starts a comment and `&` at the end of a line continues the statement. Fixed-form source (`.f`, the FORTRAN 77 layout) puts statements in columns 7–72, labels in columns 1–5 and a continuation mark in column 6, and a `C` or `*` in column 1 makes the line a comment. Fortran is case-insensitive in both.
- <a id="c10"></a>**C10.** `do i = 1, n … end do` runs with i = 1, 2, …, n, both bounds included; a `do … end do` without a control runs until an `exit`; `exit` leaves the loop like `break`, `cycle` starts the next iteration like `continue`. `/=` means "not equal", and the older spellings `.eq.`, `.ne.`, `.lt.` mean `==`, `/=`, `<`.

## Explanation

### Program units

C# puts everything in classes. C++ has free functions and a `main`. Fortran has *program units* ([C1](#c1)). The main program is the entry point. Modules hold shared declarations and procedures, like a C# static class or a C++ namespace with its functions. A *procedure* is either a subroutine, which is called for its effect, or a function, which returns a value.

`subroutine scale_by(factor, value)` is C#'s `void ScaleBy(double factor, ref double value)`. `function circle_area(radius) result(area)` returns `area`. The `result` clause names the variable whose final value is returned.

### Declarations first

Every unit is split into two parts ([C2](#c2)). First the specification part: what it uses, `implicit none`, and every variable with its type. Then the execution part: the statements. C++ lets you declare a variable anywhere. Fortran does not, so all of a routine's variables are at its top.

### implicit none

Early Fortran had no declarations at all. A name's first letter decided its type: I to N for integers, after the mathematician's habit of using i, j, k, n for indices, everything else real ([C3](#c3)). The rule is still in the language. A typo then silently creates a new variable. `implicit none` turns that into a compile error, which is why every modern unit starts with it.

### Kinds

Fortran types take a *kind* parameter that selects the precision ([C4](#c4)). The standard module `iso_fortran_env` names them: `real64` for a 64-bit real, `int64` for a 64-bit integer. `use, intrinsic` says "the module that comes with the compiler", not a user module of the same name.

Literals have kinds too, and the default is single precision ([C5](#c5)). `x = 0.1` first rounds 0.1 to single precision and only then widens it to `real64`. Seven digits are right, the rest are noise. `0.1_real64` is the double-precision literal. FORTRAN 77 code writes `0.1d0`, where the `d` means "double precision exponent".

### Modules and use

A module is Fortran's unit of sharing ([C6](#c6)). `use geometry` is like `using` a namespace in C#. `only:` lists exactly what is imported, which keeps it clear where a name comes from. Inside the module, `private` followed by `public :: circle_area, scale_by` gives the module a small public interface, as `private` does on a C# class member.

### Arguments by reference

Fortran passes arguments by reference ([C7](#c7)). Every argument behaves like a C# `ref` parameter unless its `intent` says otherwise. `intent(in)` makes it read-only: the compiler rejects an assignment to it. `intent(out)` and `intent(inout)` document that the procedure writes to it. FORTRAN 77 code has no `intent`, so any routine may change any argument.

### Arrays

Fortran arrays start at 1 and store the *first* index contiguously ([C8](#c8)). That decides which loop order is fast: the inner loop should run over the first index. When porting to C++, either swap the indices or keep the Fortran order explicitly. An unnoticed swap reads the right numbers in the wrong places.

### Two source layouts

FORTRAN 77 code is written in *fixed form*, a layout from punched cards ([C9](#c9)). Statement labels go in columns 1–5. A character in column 6 continues the previous line, and code goes in columns 7–72. Anything beyond column 72 is ignored, a classic source of silent bugs. Fortran 90 introduced *free form*, with `!` comments and `&` for continuation. Both are case-insensitive: `PROGRAM`, `program` and `Program` are the same.

### Control flow

Loops and conditions read like a more verbose C ([C10](#c10)). The bounds of `do i = 1, n` are both included, unlike C++'s `i < n`. An endless `do` with an `exit` is the idiom for "read until the input ends". `if (cond) then … else if … else … end if` is the block form. `if (cond) statement` is the one-line form.

## Examples

A module with a function and a subroutine, and a main program that uses them:

```fortran
! A main program, a module, a subroutine and a function.
module geometry
  use, intrinsic :: iso_fortran_env, only: real64
  implicit none
  private                       ! everything hidden unless listed as public
  public :: circle_area, scale_by

contains

  function circle_area(radius) result(area)
    real(real64), intent(in) :: radius
    real(real64) :: area
    area = 3.141592653589793_real64 * radius**2
  end function circle_area

  subroutine scale_by(factor, value)
    real(real64), intent(in)    :: factor
    real(real64), intent(inout) :: value    ! changes the caller's variable
    value = factor * value
  end subroutine scale_by

end module geometry

program demo
  use geometry, only: circle_area, scale_by
  use, intrinsic :: iso_fortran_env, only: real64
  implicit none
  real(real64) :: length
  integer :: i

  length = 2.0_real64
  call scale_by(3.0_real64, length)        ! subroutines are called with call
  print '(F6.2)', length                   ! 6.00
  print '(F6.2)', circle_area(1.0_real64)  ! functions are used in expressions

  do i = 1, 3                              ! bounds are inclusive: 1, 2, 3
    if (i == 2) cycle                      ! cycle = continue
    print '(I0)', i
  end do
end program demo
```

Expected output (`'(F6.2)'` and `'(I0)'` are format strings: 6 columns with 2 decimals, and an integer in as few columns as needed):

```
  6.00
  3.14
1
3
```

The single-precision literal:

```fortran
program kinds
  use, intrinsic :: iso_fortran_env, only: real64
  implicit none
  real(real64) :: from_default, from_real64
  from_default = 0.1              ! 0.1 is a default (single-precision) real
  from_real64  = 0.1_real64       ! the same digits as a double-precision literal
  print '(F20.17)', from_default
  print '(F20.17)', from_real64
end program kinds
```

Expected output:

```
 0.10000000149011612
 0.10000000000000001
```

Column-major storage (printing a whole array writes it in memory order):

```fortran
program layout
  implicit none
  integer :: grid(2, 3), i, j
  do j = 1, 3
    do i = 1, 2
      grid(i, j) = 10 * i + j
    end do
  end do
  print '(6I4)', grid            ! memory order: the first index varies fastest
end program layout
```

Expected output:

```
  11  21  12  22  13  23
```

Implicit typing at work:

```fortran
program implicit_typing
  ! no implicit none: undeclared names get a type from their first letter
  count = 7.9          ! starts with c: REAL
  number = 7.9         ! starts with n: INTEGER, so 7.9 is truncated to 7
  print '(F4.1, 1X, I0)', count, number
end program implicit_typing
```

Expected output, with a `-Wconversion` warning from `gfortran -Wall` about the change of value:

```
 7.9 7
```

With `implicit none` added, the same assignment to `number` fails: `Symbol 'number' at (1) has no IMPLICIT type`.

## Pitfalls

- Writing `0.1` in double-precision code. It is a single-precision literal, accurate to about seven digits ([C5](#c5)).
- Leaving out `implicit none`. A misspelt variable becomes a new one, typed by its first letter ([C3](#c3)).
- Assuming a subroutine cannot change its arguments. Without `intent(in)`, it can ([C7](#c7)).
- Porting `a(i, j)` to C++ as `a[i][j]` with the loops unchanged. The memory order is transposed ([C8](#c8)).
- Code beyond column 72 in fixed-form source. The compiler ignores it ([C9](#c9)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-29: reading `tests/gfortran_ref.f90` in [PR 1](https://github.com/thomaswening/PartonForge/pull/1), the reference program of the differential test; PartonForge reimplements the FORTRAN 77 program uPDFevolv2.
- [fortran-lang.org: Quickstart tutorial](https://fortran-lang.org/learn/quickstart/), sections on variables, arrays, operators and control flow, and organising code.
- [gfortran documentation](https://gcc.gnu.org/onlinedocs/gfortran/): `ISO_FORTRAN_ENV`, fixed and free form.
