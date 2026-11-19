---
title: Win32 type names and Hungarian notation
area: windows
created: 2026-11-18
updated: 2026-11-18
prerequisites: [windows/pinvoke-and-unmanaged-memory]
related: [c/unions-and-struct-layout, windows/sendinput, windows/clipboard]
projects: []
tags: [windows, win32, interop, naming, hungarian-notation, dword, word]
---

# Win32 type names and Hungarian notation

## TL;DR

- The Win32 headers define their own names for C types: `BYTE` (8 bits), `WORD` (16 bits), `DWORD` (32 bits, a "double word"), `QWORD` (64 bits), `BOOL` (a 32-bit `int`), and pointer-sized types such as `HANDLE` and `ULONG_PTR`. Each has a fixed C# counterpart: `byte`, `ushort`, `uint`, `ulong`, `int` or `bool` with marshalling, `nint`, `nuint`.

- Field and parameter names start with a short prefix for their type or meaning, a convention called **Hungarian notation**: `dwFlags` is a `DWORD` of flags, `wVk` a `WORD` holding a virtual-key code, `cbSize` a count of bytes, `hWnd` a handle to a window.

- Constants carry a prefix for the API they belong to: `VK_` (virtual keys), `KEYEVENTF_` (key event flags), `CF_` (clipboard formats), `GMEM_` (global memory flags).

- Read a Win32 name by splitting off the prefix: the prefix says the type or unit, the rest says the meaning.

## Key claims

- <a id="c1"></a>**C1.** The Win32 integer types have fixed sizes, the same in 32-bit and 64-bit programs: `BYTE` is 8 bits, `WORD` 16 bits, `DWORD` 32 bits, `QWORD` and `DWORD64` 64 bits, all unsigned. `BOOL` is a 32-bit signed `int`. In C# they are `byte`, `ushort`, `uint`, `ulong` and `int` (or `bool` with `[MarshalAs(UnmanagedType.Bool)]`).

- <a id="c2"></a>**C2.** Pointer-precision types are as wide as a pointer: 32 bits in a 32-bit process, 64 bits in a 64-bit one. They include `HANDLE` and the other `H…` handle types, `PVOID`/`LPVOID`, and `ULONG_PTR`. In C# they are `nint` or `nuint`.

- <a id="c3"></a>**C3.** Hungarian notation prefixes a name with its type or meaning. In Win32 the common prefixes are `w` (`WORD`), `dw` (`DWORD`), `b` (`BOOL`), `h` (handle), `p` and `lp` (pointer), `sz` (zero-terminated string), `cb` (count of bytes) and `cch` (count of characters).

- <a id="c4"></a>**C4.** The `P` and `LP` prefixes come from 16-bit Windows, which had near and far ("long") pointers. Today they mean the same thing, an ordinary pointer.

- <a id="c5"></a>**C5.** Many Win32 structs begin with a `cbSize` field that the caller must set to the struct's size in bytes before the call. The function uses it to tell versions of the struct apart. Many such functions fail if the value is wrong.

## Explanation

### Type names with fixed sizes

C's own `int` and `long` have no fixed size: it depends on the compiler and the platform. An API that crosses DLL boundaries needs exact sizes, so the Win32 headers define their own names ([C1](#c1)):

| Win32 type | Size | C# type |
|---|---|---|
| `BYTE` | 8 bits | `byte` |
| `WORD` | 16 bits, unsigned | `ushort` |
| `DWORD` | 32 bits, unsigned | `uint` |
| `QWORD`, `DWORD64` | 64 bits, unsigned | `ulong` |
| `BOOL` | 32 bits, signed (`int`) | `int`, or `bool` with `[MarshalAs(UnmanagedType.Bool)]` |
| `WCHAR` | 16 bits, one UTF-16 code unit | `char` |
| `HANDLE`, `HWND`, `HGLOBAL`, … | pointer-sized | `nint` |
| `PVOID`, `LPVOID` | pointer-sized | `nint`, or `void*` in unsafe code |
| `ULONG_PTR` | pointer-sized, unsigned | `nuint` |

A `WORD` is 16 bits because the names date from 16-bit Windows, where the processor's natural unit, its word, was 16 bits. A `DWORD` is a "double word". The sizes stayed fixed when Windows moved to 32 and then 64 bits, so a `DWORD` is 32 bits in every Windows program today.

The pointer-sized types are the exception ([C2](#c2)). They grow with the process, which is why C# maps them to `nint` and `nuint`, the integers that do the same.

### Hungarian notation: the prefix tells the type

Win32 names their struct fields and parameters with a lowercase prefix ([C3](#c3)). The prefix tells you the type or unit, and the rest of the name tells you the meaning:

| Prefix | Means | Example | Read as |
|---|---|---|---|
| `w` | `WORD` | `wVk` | a 16-bit virtual-key code |
| `dw` | `DWORD` | `dwFlags` | 32 bits of flags |
| `b` | `BOOL` | `bInheritHandle` | a true/false value |
| `h` | handle | `hWnd` | a handle to a window |
| `p`, `lp` | pointer | `lpszClassName` | a pointer to a zero-terminated string |
| `sz` | zero-terminated string | `szPath` | text ending in a 0 character |
| `cb` | count of bytes | `cbSize` | a size in bytes |
| `cch` | count of characters | `cchTextMax` | a length in characters |
| `u` | unsigned int | `uMsg` | a message number |

The convention is named after its inventor, Charles Simonyi, who was Hungarian. In .NET you never see it, because the type is in the declaration and the IDE shows it. The Windows team no longer uses it internally. But the Win32 headers and their documentation keep it, so you meet it whenever you call Win32 from C#.

`LP` stands for "long pointer" ([C4](#c4)). 16-bit Windows had short "near" pointers and longer "far" pointers. There is only one kind now, so `LPVOID` and `PVOID` are the same type.

Some names don't follow the scheme. `time` in `KEYBDINPUT` is a `DWORD` without the `dw`. Mouse fields `dx` and `dy` mean "delta x" and "delta y", not a type. The prefix is a habit of the headers, not a rule enforced by anything.

### Constant prefixes

Constants are in capitals and start with a prefix for the API they belong to: `VK_SCROLL` (virtual key), `KEYEVENTF_KEYUP` (key event flag), `INPUT_KEYBOARD` (input type), `CF_UNICODETEXT` (clipboard format), `GMEM_MOVEABLE` (global memory flag), `ES_CONTINUOUS` (execution state). When you copy a constant into C#, look up its value in the documentation: the prefix tells you which page to search.

### cbSize: a struct that states its own size

A field called `cbSize` at the start of a struct means: before the call, set this to the struct's size in bytes ([C5](#c5)). Windows uses it to tell versions of the struct apart. A newer Windows may know a longer version of the struct, and the size says which one your program was built with.

The snippet calls `GetLastInputInfo` twice: once with `cbSize` set correctly, once with `cbSize` left at 0. It is a complete `Program.cs` for a console project with `AllowUnsafeBlocks`, run with .NET 10:

```csharp
using System.Runtime.InteropServices;

var info = new LASTINPUTINFO { cbSize = (uint)Marshal.SizeOf<LASTINPUTINFO>() };
Console.WriteLine($"cbSize = {info.cbSize}: {Native.GetLastInputInfo(ref info)}");

info = new LASTINPUTINFO { cbSize = 0 };
Console.WriteLine($"cbSize = 0: {Native.GetLastInputInfo(ref info)}, error {Marshal.GetLastPInvokeError()}");

struct LASTINPUTINFO
{
    public uint cbSize;   // DWORD cbSize: count of bytes, the size of this struct
    public uint dwTime;   // DWORD dwTime: tick count of the last input
}

static partial class Native
{
    [LibraryImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool GetLastInputInfo(ref LASTINPUTINFO info);
}
```

```text
cbSize = 8: True
cbSize = 0: False, error 87
```

The struct is 8 bytes, two `DWORD`s. With `cbSize = 0` the call fails with error 87, `ERROR_INVALID_PARAMETER`. Both C# fields are `uint` because both C fields are `DWORD` ([C1](#c1)).

## Good habits

- Map Win32 types to C# by size, from the table: `DWORD` to `uint`, `WORD` to `ushort`, handles to `nint` ([C1](#c1), [C2](#c2); Microsoft Learn, *Windows Data Types*).

- Keep the Win32 field names in C# copies of Win32 structs, so the declaration can be checked against the documentation line by line ([C3](#c3); Microsoft Learn, *Native interoperability best practices*).

- Set `cbSize` to `Marshal.SizeOf<T>()` before every call that takes such a struct ([C5](#c5)).

## Pitfalls

- **Mapping `WORD` to `int` or `DWORD` to `ulong`.** The struct's layout shifts, and every later field is read from the wrong bytes ([C1](#c1)).

- **Mapping a handle to `int`.** It works in a 32-bit process and truncates the value in a 64-bit one ([C2](#c2)).

- **Reading `dw` or `w` as "double" or "wide".** They are sizes: 32 and 16 bits ([C1](#c1), [C3](#c3)).

- **Forgetting `cbSize`.** The call fails, often with error 87 ([C5](#c5)).

## Exercises

1. **Translate.** Give the C# type of each field: `DWORD dwFlags`, `WORD wScan`, `HWND hWnd`, `ULONG_PTR dwExtraInfo`, `BOOL bVisible`.

   <details><summary>Solution</summary>

   `uint`, `ushort`, `nint`, `nuint`, and `int` (or `bool` with `[MarshalAs(UnmanagedType.Bool)]`) ([C1](#c1), [C2](#c2)). Note that `dwExtraInfo` is a `ULONG_PTR`, not a `DWORD`, despite its `dw` prefix: nothing checks that a prefix matches the type ([C3](#c3)).

   </details>

2. **Read.** What do `cchTextMax`, `lpszText` and `hMem` tell you before you look them up?

   <details><summary>Solution</summary>

   `cchTextMax`: a maximum text length, counted in characters. `lpszText`: a pointer to zero-terminated text. `hMem`: a handle to a memory block ([C3](#c3)).

   </details>

## Sources

- Microsoft Learn, [Windows Data Types](https://learn.microsoft.com/en-us/windows/win32/winprog/windows-data-types): the sizes of `BYTE`, `WORD`, `DWORD`, `QWORD`, `BOOL`, `HANDLE`, `ULONG_PTR` and `WCHAR`.
- Microsoft Learn, [Windows Coding Conventions](https://learn.microsoft.com/en-us/windows/win32/learnwin32/windows-coding-conventions): fixed sizes in 32-bit and 64-bit programs, pointer-precision types, Hungarian notation, the history of `P` and `LP`.
- Microsoft Learn, [`LASTINPUTINFO` structure](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-lastinputinfo) and [`KEYBDINPUT` structure](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-keybdinput).
- Claude session, 2026-11-18: the snippet was run there with .NET 10.
