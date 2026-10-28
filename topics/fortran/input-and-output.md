---
title: Fortran input and output
area: fortran
created: 2026-10-29
updated: 2026-10-29
prerequisites: [fortran/program-structure]
related: [bash/streams-redirection-and-pipes, numerics/double-encoding]
projects: [partonforge]
tags: [fortran, read, write, print, unit, format, edit-descriptor, list-directed, iostat, iostat-end, open, newunit, z-editing, transfer]
---

# Fortran input and output

## TL;DR

- `read (unit, format) list` and `write (unit, format) list` move data. Unit `*` is standard input for `read` and standard output for `write`. `print format, list` is short for `write (*, format) list`.
- The format is either `*`, **list-directed**, where the compiler chooses the layout, or a string of **edit descriptors** such as `'(I5, F8.3)'`, much like a `printf` format.
- Every `write` produces one line (a *record*), and every `read` starts on a new one.
- `iostat=` turns a failed read into a status code instead of a crash: 0 is success, `iostat_end` (negative) is end of file, a positive value is an error.
- Files are connected with `open (newunit=u, file=...)` and released with `close (u)`.
- `Z` reads and writes an integer's bits in hexadecimal. `transfer` reinterprets bits as another type, like C++'s `std::bit_cast`.

## Key claims

- <a id="c1"></a>**C1.** `read (u, fmt) list` and `write (u, fmt) list` transfer data through unit `u` with format `fmt`; the unit `*` means standard input in a `read` and standard output in a `write`, and `print fmt, list` is equivalent to `write (*, fmt) list`.
- <a id="c2"></a>**C2.** With the format `*` (list-directed), the compiler chooses the layout; gfortran 13 writes a `real(real64)` with 17 significant digits, starting with a blank, in fixed-point form for 0.1 ≤ |x| < 10¹⁷ and in exponent form otherwise. Other compilers lay it out differently, so list-directed output is not portable text.
- <a id="c3"></a>**C3.** An explicit format is a parenthesised list of edit descriptors: `Iw` an integer in w columns (`I0` as narrow as possible), `Fw.d` a real with d decimals, `Ew.d` exponent form with the point before the first digit, `ESw.d` scientific form with one non-zero digit before the point, `Aw` characters, `Zw` hexadecimal, `nX` n blanks, and a quoted string literal text; a value that does not fit its width is written as w asterisks.
- <a id="c4"></a>**C4.** Each `write` statement writes one record, which on a terminal or text file is one line, and each `read` statement starts reading at the beginning of the next record; `advance='no'` on a formatted `read` or `write` keeps the current record open.
- <a id="c5"></a>**C5.** `iostat=status` on a `read` or `write` stores 0 on success, the negative value `iostat_end` from `iso_fortran_env` at end of file, and a positive, compiler-specific value on an error (5010 for an invalid hexadecimal digit with gfortran 13); without `iostat=` (or `end=`/`err=`), end of file or an error stops the program.
- <a id="c6"></a>**C6.** `open (newunit=u, file='name', status=..., action=...)` connects a file and stores a free unit number in `u`; `close (u)` disconnects it. `status='old'` requires the file to exist, `'replace'` creates or empties it, and `close (u, status='delete')` deletes it. Older code chooses unit numbers itself, such as 10, and must avoid those already in use.
- <a id="c7"></a>**C7.** The `Z` edit descriptor reads or writes an integer as hexadecimal digits of its bit pattern; `Zw.m` writes at least m digits, padding with leading zeros. With gfortran, reading `8000000000000000` with `Z16` into an `integer(int64)` sets the sign bit, so every 64-bit pattern can be read.
- <a id="c8"></a>**C8.** `transfer(source, mold)` returns the bits of `source` reinterpreted as the type of `mold`, without numeric conversion; `transfer(bits, 1.0_real64)` with `bits` = `Z'3FF0000000000000'` gives 1.0. It corresponds to C++'s `std::bit_cast` and C#'s `BitConverter.Int64BitsToDouble`.

## Explanation

### Units and formats

Every Fortran I/O statement answers two questions: where to, and in what layout ([C1](#c1)). The *unit* is a number that stands for a connected file, or `*` for the program's standard input or output. The *format* is either `*` or a format string.

Since `*` reads standard input and writes standard output, a program like PartonForge's reference formatter needs no file names at all. The shell connects the files, as in `gfortran_ref < bits.txt > out.txt` ([bash/streams-redirection-and-pipes](../bash/streams-redirection-and-pipes.md)).

### List-directed I/O

With format `*`, the compiler decides the layout ([C2](#c2)). That is convenient for quick output and for reading. On input it accepts numbers in any reasonable form, separated by blanks or commas. On output it is a trap for anyone who needs exact text. The standard leaves the layout to the compiler, and gfortran, Intel Fortran and NAG differ in widths, digits and blanks. A program that must reproduce such files byte for byte, as PartonForge does for uPDFevolv2's grids, has to reproduce one compiler's choices exactly.

### Format strings

An explicit format spells out each field ([C3](#c3)), like a `printf` format with different letters:

| Fortran | prints 1234.5 or 42 as | `printf` counterpart |
|---|---|---|
| `I5` | `   42` | `%5d` |
| `I0` | `42` | `%d` |
| `F8.3` | `1234.500` | `%8.3f` |
| `E12.4` | `  0.1234E+04` (1234.5 rounds to even) | none: point before the first digit |
| `ES12.4` | `  1.2345E+03` | `%12.4E` |
| `Z16.16` | 16 hex digits | `%016llX` |

Two differences from `printf` matter. `E` puts the point before the first digit (0.1235 × 10⁴), where C's `%E` puts one digit before it. `ES` is the C form. And a value too wide for its field is not widened: Fortran fills the field with asterisks.

### Records

A `write` statement writes one *record*, which is one line of text ([C4](#c4)). Writing three values on one line means one `write` with three items. A `read` statement consumes at least one whole line, even if it only needs the first value on it. That is why a loop of `read` statements reads a file line by line.

### End of file and errors

By default, reaching the end of the input stops the program with a run-time error ([C5](#c5)). `iostat=` hands the decision to the program. `iostat_end` from `iso_fortran_env` is the portable name for end of file. A positive value means the input was malformed. Its number depends on the compiler, so test only `> 0`.

The common read loop is an endless `do` that exits when `iostat` reports the end. A loop that exits on any non-zero status also stops silently at a malformed line. The caller then sees fewer output lines than input lines, with no error message.

### Files

`open` connects a file to a unit ([C6](#c6)). `newunit=` asks the runtime for a free number, so two parts of a program cannot collide. FORTRAN 77 code picks numbers by hand. Units 5 and 6 are traditionally standard input and output, so hand-picked numbers start at 10 or so. `close` disconnects. Leaving a file open until the program ends also works, but the output is then flushed only at the end.

### Bits in hexadecimal

`Z` editing works on bit patterns, not values ([C7](#c7)). Together with `transfer` ([C8](#c8)), it gives an exact text form for a `double`. The program reads 16 hexadecimal digits into a 64-bit integer, then reinterprets the integer as a real. No decimal rounding happens on the way, so `-0.0`, subnormals and every last bit arrive unchanged. The second argument of `transfer` is only a *mold*: its value is ignored, only its type counts.

## Examples

Edit descriptors, including a field that is too narrow:

```fortran
program edit_descriptors
  use, intrinsic :: iso_fortran_env, only: int64, real64
  implicit none
  integer(int64) :: bits
  write (*, '(I5, "|", I0, "|")') 42, 42           ! width 5, and as narrow as possible
  write (*, '(F8.3, "|", F4.1, "|")') 3.14159_real64, 12345.0_real64   ! too narrow: asterisks
  write (*, '(E12.4, "|", ES12.4, "|")') 1234.5_real64, 1234.5_real64  ! 0.1234E+04 vs 1.2345E+03
  write (*, '(A, 3X, A)') 'left', 'right'           ! 3X: three blanks
  bits = transfer(1.0_real64, bits)
  write (*, '(Z16.16)') bits                        ! 16 hexadecimal digits, leading zeros kept
  write (*, '(Z16.16)') transfer(5e-324_real64, bits)
end program edit_descriptors
```

Expected output:

```
   42|42|
   3.142|****|
  0.1234E+04|  1.2345E+03|
left   right
3FF0000000000000
0000000000000001
```

List-directed output with gfortran 13:

```fortran
program list_directed
  use, intrinsic :: iso_fortran_env, only: real64
  implicit none
  write (*, *) 1.0_real64
  write (*, *) -0.0_real64
  write (*, *) 0.09_real64
  write (*, *) 1.0e17_real64
  write (*, *) 42
  write (*, *) 'text', 42, .true.
end program list_directed
```

Expected output (the first two lines end in five blanks, which make them as wide as the exponent-form lines):

```
   1.0000000000000000     
  -0.0000000000000000     
   8.9999999999999997E-002
   1.0000000000000000E+017
          42
 text          42 T
```

Reading bit patterns from standard input until it ends:

```fortran
program bits_to_values
  use, intrinsic :: iso_fortran_env, only: int64, real64, iostat_end
  implicit none
  integer(int64) :: bits
  real(real64)   :: value
  integer        :: status

  do
    read (*, '(Z16)', iostat=status) bits
    if (status == iostat_end) exit           ! end of input
    if (status /= 0) then                    ! anything else is a read error
      write (*, '(A, I0)') 'read error, iostat = ', status
      exit
    end if
    value = transfer(bits, value)            ! the same 64 bits as a real64
    write (*, '(ES24.16E3)') value
  end do
end program bits_to_values
```

Run as `printf '3FF0000000000000\n8000000000000000\n0000000000000001\nXYZ\n' | ./bits_to_values`. Expected output:

```
 1.0000000000000000E+000
-0.0000000000000000E+000
 4.9406564584124654E-324
read error, iostat = 5010
```

Writing and reading a file:

```fortran
program files
  use, intrinsic :: iso_fortran_env, only: iostat_end
  implicit none
  integer :: unit, status, number, total

  open (newunit=unit, file='numbers.txt', status='replace', action='write')
  write (unit, '(I0)') 3
  write (unit, '(I0)') 4
  close (unit)

  total = 0
  open (newunit=unit, file='numbers.txt', status='old', action='read')
  do
    read (unit, *, iostat=status) number
    if (status == iostat_end) exit
    total = total + number
  end do
  close (unit, status='delete')
  print '(A, I0)', 'total = ', total
end program files
```

Expected output:

```
total = 7
```

## Pitfalls

- Expecting list-directed output to look the same with another compiler, or another version. Its layout is the compiler's choice ([C2](#c2)).
- Reading `E` like C's `%E`. Fortran's `E` puts the point before the first digit, `ES` matches C ([C3](#c3)).
- A format too narrow for its value. The field fills with asterisks instead of growing ([C3](#c3)).
- A read loop without `iostat=`. End of file then stops the program with an error ([C5](#c5)).
- Exiting a read loop on any non-zero `iostat` without a message. A malformed line looks like the end of the input ([C5](#c5)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-29: reading `tests/gfortran_ref.f90` in [PR 1](https://github.com/thomaswening/PartonForge/pull/1), which reads `Z16` bit patterns, converts them with `transfer` and writes them list-directed.
- [fortran-lang.org: Quickstart tutorial](https://fortran-lang.org/learn/quickstart/), section on input and output.
- gfortran documentation: [`ISO_FORTRAN_ENV`](https://gcc.gnu.org/onlinedocs/gfortran/ISO_005fFORTRAN_005fENV.html), [`TRANSFER`](https://gcc.gnu.org/onlinedocs/gfortran/TRANSFER.html).
