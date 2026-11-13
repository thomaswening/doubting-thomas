---
title: Strings in C
area: c
created: 2026-10-20
updated: 2026-10-27
prerequisites: [c/pointer-declarator-syntax, c/stack-and-heap]
related: [c/array-parameters, c/format-strings]
projects: [tante, partonforge]
tags: [c, string, null-terminated, strlen, snprintf, buffer-overflow, utf-8, pointer-arithmetic, suffix]
---

# Strings in C

## TL;DR

- C has no string type. A string is an array of `char` ending in a zero byte, `'\0'`, and nothing records its length.

- `strlen` finds the length by counting up to the zero, so a string of $n$ characters needs $n + 1$ bytes.

- An array passed to a function becomes a pointer, so the function can't tell how big the buffer is; the caller has to say.

- `strcpy` and `strcat` never check sizes; writing past the end is a buffer overflow. `snprintf` is the portable safe choice.

- `==` on two strings compares addresses; use `strcmp`.

- A pointer into the middle of a string is a string too: the rest of it, without a copy. That is why `"abc" + 'E'` moves a pointer instead of appending.

## Key claims

- <a id="c1"></a>**C1.** A C string is a sequence of `char` ending in the first zero byte `'\0'`; the length is not stored anywhere, so functions find the end by searching for that byte.

- <a id="c2"></a>**C2.** `strlen(s)` returns the number of bytes before the first `'\0'`, not counting it, and takes time proportional to that length; storing a string of length $n$ takes $n + 1$ bytes.

- <a id="c3"></a>**C3.** A string literal such as `"abc"` is an array of 4 characters including the terminator (`char[4]` in C, `const char[4]` in C++); modifying a string literal is undefined behaviour.

- <a id="c4"></a>**C4.** `sizeof` applied to an array gives the array's total size in bytes, but an array passed to a function is converted to a pointer to its first element, and `sizeof` of that parameter gives the size of a pointer, so a function cannot find out the size of a buffer it was given.

- <a id="c5"></a>**C5.** `strcpy` and `strcat` write until the source's terminator without checking the destination's size; writing past the end of the destination is a buffer overflow and undefined behaviour.

- <a id="c6"></a>**C6.** `snprintf(buf, size, fmt, ...)` writes at most `size - 1` characters plus a terminating `'\0'`, and returns the number of characters the full output would have had, so a return value of `size` or more means the output was truncated.

- <a id="c7"></a>**C7.** `strncpy(dest, src, n)` does not write a terminator when `src` has `n` or more characters, so its result may not be a valid string.

- <a id="c8"></a>**C8.** `a == b` on two `char*` or `char` arrays compares their addresses, not their contents; `strcmp(a, b)` compares contents and returns 0 when they are equal.

- <a id="c9"></a>**C9.** `strlen` counts bytes, not characters: "ö" encoded in UTF-8 takes two bytes, so `strlen` of that string is 2.

- <a id="c10"></a>**C10.** If `p` points to the first character of a string, `p + k` points to its character at index `k`, and any function given `p + k` sees the rest of the string from there up to the same terminator; no characters are copied. In C++, `s.c_str() + k` does the same for a `std::string s`.

- <a id="c11"></a>**C11.** Adding a `char` to a string literal or a `char*` does not append: `"1.25" + 'E'` converts `'E'` to its code, 69, and moves the pointer 69 characters forward, past the end of the literal, which is undefined behaviour. The expression compiles; Clang warns, GCC 13 does not. `std::string("1.25") + 'E'` appends, because `std::string` defines `+`.

## Explanation

### A convention, not a type

A C# `string` is an object that knows its length and its characters (UTF-16). C has nothing of the kind. A string is just bytes in an array, with a zero byte after the last character to mark the end ([C1](#c1)). Every string function relies on that marker. `strlen` walks the bytes until it finds it ([C2](#c2)), which is why getting the length of a long string costs time, and why every buffer needs one byte more than the text. A literal includes the marker: `"Tante"` is six bytes ([C3](#c3)).

### Who knows how big the buffer is

When an array is passed to a function, C passes a pointer to its first element instead ([C4](#c4)). Inside the function, the size is gone. `sizeof` on the parameter gives the size of a pointer, 8 bytes on a 64-bit system, whatever the caller's array was. So any function that writes into a buffer must be told its size by the caller, and any function that isn't told can't protect itself.

`strcpy` and `strcat` are such functions ([C5](#c5)). They copy until the source ends, and if the destination is shorter, they write over whatever comes after it in memory. This is a **buffer overflow**, the origin of a long history of security holes. MSVC warns about these functions for that reason.

### Safer choices

`snprintf` takes the destination size and never writes beyond it ([C6](#c6)); it always terminates the string, and its return value tells you whether the output fit. It is standard C (since C99) on every platform. `strncpy` looks like the safe version of `strcpy` but isn't: when the source is too long it stops without writing the terminator ([C7](#c7)). C++ code avoids all of this with `std::string`, which stores its length and grows as needed, and `std::string_view`, a non-owning view like C#'s `ReadOnlySpan<char>`.

### Comparing and counting

Comparing with `==` compares the addresses of two arrays, so two equal strings in different places compare unequal ([C8](#c8)). `strcmp` compares character by character and returns 0 for equality (negative or positive for ordering, like C#'s `string.CompareOrdinal`). Finally, `char` is a byte. Text in UTF-8 uses several bytes for characters beyond ASCII, so `strlen` gives the number of bytes, not of characters ([C9](#c9)).

### Pointing into the middle

Because a string is just "characters up to the next zero" ([C1](#c1)), any pointer to one of its characters is the start of a string: the rest of it ([C10](#c10)). Adding `k` to a pointer moves it `k` characters forward, as `a[i]` means `*(a + i)` ([array parameters](array-parameters.md)). So `p + 4` is the text from index 4 to the end, and passing it to `printf` or `atoi` reads only that part. Nothing is copied. Both pointers share the same characters and the same terminator. C# needs `Substring`, which copies, or `AsSpan(4)`, which doesn't and so is the closer match.

The same rule makes `+` with a character a trap ([C11](#c11)). A `char` is a small integer, so `"1.25" + 'E'` is pointer arithmetic, not concatenation. The pointer lands 69 characters past the start of a five-byte array. In C++ the left side decides: if it is a `std::string`, `+` appends, and if it is a literal or a `char*`, `+` moves a pointer.

## Examples

```c
#include <stdio.h>
#include <string.h>

static size_t size_in_function(const char s[]) { return sizeof s; }  /* s is really a pointer */

int main(void)
{
    char word[] = "Tante";                 /* char[6]: 5 letters and '\0' */
    printf("%zu %zu %zu\n", strlen(word), sizeof word, size_in_function(word));

    char buf[8];
    int needed = snprintf(buf, sizeof buf, "%s-%s", "Hello", "Thomas");
    printf("%s %d\n", buf, needed);        /* truncated: needed >= sizeof buf */

    char copy[] = "Tante";                 /* equal contents, different array */
    printf("%d %d\n", word == copy, strcmp(word, copy) == 0);
    return 0;
}
```

Expected output on a 64-bit system:

```
5 6 8
Hello-T 12
0 1
```

`snprintf` had room for 7 characters plus the terminator, wrote `"Hello-T"`, and reports that the full text `"Hello-Thomas"` would have needed 12. Compilers warn about `sizeof` on an array parameter, which is the point of that line.

Reading it:

- `printf(format, ...)` prints its format string. It replaces each **conversion specification**, a `%` followed by a letter, with the next argument in turn. It is C's counterpart of C#'s `Console.Write("{0} {1}", a, b)`, except that the specification states the argument's type. Nothing checks that the argument has that type: a mismatch is undefined behaviour, which compilers warn about.
- `%s` prints a string (a `char*`, up to its terminator), `%d` an `int`, and `%zu` a `size_t`, the unsigned type that `strlen` and `sizeof` return. `\n` is a newline.
- `snprintf(buf, size, format, ...)` formats exactly like `printf` but writes into `buf` instead of the screen. `size` is the size of `buf` in bytes. Here it is `sizeof buf`, which is 8 because `buf` is a local array, not a parameter ([C4](#c4)). The return value is the length the full text would have had ([C6](#c6)).
- `word == copy` and `strcmp(word, copy) == 0` are comparisons. In C a comparison has type `int` with the value 0 for false or 1 for true, so `%d` prints it.

Reading the exponent of a number written in exponent notation, by pointing past the `E` ([C10](#c10)):

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void)
{
    const char text[] = "1.25E+03";
    const char* exponent = strchr(text, 'E');   /* pointer to the 'E', or NULL */
    printf("%s\n", exponent);
    printf("%s\n", exponent + 1);
    printf("%d\n", atoi(exponent + 1));
    printf("%d\n", (int)(exponent - text));
    return 0;
}
```

Expected output:

```
E+03
+03
3
4
```

- `strchr(text, 'E')` returns a pointer to the first `'E'` in `text`.
- `exponent` and `exponent + 1` are strings that start inside `text` and end at its terminator.
- `atoi` ("ASCII to integer") reads an optional sign and digits from the start of its string and stops at the first other character.
- Subtracting two pointers into the same array gives the distance between them, here the index of the `'E'`.

In C++, `std::string` appends with `+`, a literal doesn't ([C11](#c11)):

```cpp
#include <iostream>
#include <string>

int main() {
    const std::string significand = "1.25";
    std::cout << significand + 'E' << '\n';
    // const char* p = "1.25" + 'E';   // compiles, but points 69 characters past the start
}
```

Expected output:

```
1.25E
```

With the last line uncommented, it still compiles. Clang warns that adding a `char` to a string does not append (`-Wstring-plus-char`), GCC 13 gives no warning.

## Pitfalls

- Allocating `strlen(s)` bytes for a copy and forgetting the `+ 1` for the terminator ([C2](#c2)).

- Taking `sizeof` of a parameter to get its buffer size ([C4](#c4)).

- Treating `strncpy` as a safe `strcpy` ([C7](#c7)).

- Comparing strings with `==` ([C8](#c8)).

- Modifying a string literal through a `char*` that points to it ([C3](#c3)): `char* s = "abc"; s[0] = 'x';` is undefined behaviour, whereas `char s[] = "abc";` makes a modifiable copy.

- Writing `"text" + 'x'` or `ptr + 'x'` to append a character. It moves a pointer ([C11](#c11)); append to a `std::string` instead.

- Keeping a pointer into a `std::string`'s `c_str()` after the string is changed or destroyed. The pointer shares the string's characters ([C10](#c10)), so it dangles.

## Sources

- Claude session on [Tante](https://github.com/thomaswening/Tante), 2026-10-20, from Thomas's review of the [stack and heap note](https://github.com/thomaswening/doubting-thomas/pull/2).
- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-27: Thomas's walkthrough of `decimal_exponent` and `exponential_form` in `src/fortran_io.cpp` ([PR 1](https://github.com/thomaswening/PartonForge/pull/1)), which read an exponent with `std::atoi(s.c_str() + epos + 1)`. Source of [C10](#c10) and [C11](#c11).
- cppreference: [null-terminated byte strings (C)](https://en.cppreference.com/w/c/string/byte), [strlen](https://en.cppreference.com/w/c/string/byte/strlen), [snprintf](https://en.cppreference.com/w/c/io/fprintf), [strncpy](https://en.cppreference.com/w/c/string/byte/strncpy), [string literals (C)](https://en.cppreference.com/w/c/language/string_literal), [array to pointer conversion](https://en.cppreference.com/w/c/language/conversion#Array_to_pointer_conversion).
