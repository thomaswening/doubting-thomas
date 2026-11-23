---
title: Unions, and C struct layout in C#
area: c
created: 2026-11-18
updated: 2026-11-18
prerequisites: [c/struct-tags-and-typedef, windows/pinvoke-and-unmanaged-memory]
related: [windows/sendinput, windows/win32-types-and-hungarian-notation, dotnet/unsafe-code-and-pointers]
projects: []
tags: [c, csharp, interop, union, structlayout, fieldoffset, alignment, padding]
---

# Unions, and C struct layout in C#

## TL;DR

- A C **union** looks like a struct, but all its members start at the same address and share the same bytes. It holds one of them at a time. Its size is the size of its largest member.

- A union doesn't record which member is in use. C code usually puts it in a struct next to a field that says so, a **tag**. Win32's `INPUT` is such a tagged union: `type` says whether the union holds mouse, keyboard or hardware input.

- To pass a C struct to native code, the C# struct must have the same bytes at the same offsets. `[StructLayout(LayoutKind.Sequential)]` lays fields out in declaration order with C's alignment and padding. It is already the default for a C# `struct`.

- C# has no union. `[StructLayout(LayoutKind.Explicit)]` with `[FieldOffset(0)]` on every field gives the same effect: all fields start at byte 0 and overlap.

## Key claims

- <a id="c1"></a>**C1.** All members of a C union start at offset 0 and share their bytes. Writing one member overwrites the start of the others. The union's size is at least the size of its largest member, rounded up to its alignment.

- <a id="c2"></a>**C2.** A union doesn't store which member was written last. Code that needs to know keeps a separate field, a tag, usually in the same struct; such a struct is called a **tagged union**. Setting the tag is the program's job, not the compiler's.

- <a id="c3"></a>**C3.** With `LayoutKind.Sequential`, fields are laid out in declaration order, each at an offset that is a multiple of its alignment, with padding bytes in between where needed, as a C compiler does. C# applies `Sequential` to structs by default; classes need it stated.

- <a id="c4"></a>**C4.** With `LayoutKind.Explicit`, every field needs a `[FieldOffset(n)]` attribute that gives its byte offset. Fields with the same offset overlap. All fields at `[FieldOffset(0)]` make a C# struct behave like a C union.

- <a id="c5"></a>**C5.** `Marshal.SizeOf<T>()` and `Marshal.OffsetOf<T>(fieldName)` report a struct's size and a field's offset as passed to native code. They check whether a C# declaration matches the C one.

## Explanation

Where a snippet shows output, it was printed with .NET 10 in a 64-bit process.

### A union: several members in the same bytes

A C struct puts its members one after another: a struct with an `int` and a `double` holds both at once. A **union** puts them on top of each other ([C1](#c1)):

```c
union number {
    int  as_int;       /* bytes 0 to 3 */
    char first_byte;   /* byte 0, the same byte as the start of as_int */
};
```

Both members start at byte 0. The union is 4 bytes, the size of `as_int`. It is one piece of memory with two ways to read it, like the same `byte[]` read once through `BitConverter.ToInt32` and once by index.

C# has no `union` keyword. The equivalent is a struct with `LayoutKind.Explicit` in which every field sits at `[FieldOffset(0)]` ([C4](#c4)). The snippet writes an `int`, reads its first byte, then changes that byte and reads the `int` again:

```csharp
using System.Runtime.InteropServices;

var n = new Number { AsInt = 0x01020304 };
Console.WriteLine($"size: {Marshal.SizeOf<Number>()} bytes");
Console.WriteLine($"as int: 0x{n.AsInt:X8}, first byte: {n.FirstByte}");
n.FirstByte = 0xFF;
Console.WriteLine($"after writing the byte, as int: 0x{n.AsInt:X8}");

[StructLayout(LayoutKind.Explicit)]
struct Number
{
    [FieldOffset(0)] public int AsInt;
    [FieldOffset(0)] public byte FirstByte;
}
```

```text
size: 4 bytes
as int: 0x01020304, first byte: 4
after writing the byte, as int: 0x010203FF
```

`FirstByte` is byte 0 of `AsInt`: its lowest byte, because x86 and x64 store integers lowest byte first. Writing `FirstByte` changed `AsInt`. The two fields are one piece of memory.

### Tagged unions: which member is in use?

The union in the example above can't tell you whether it holds a number or a byte. It just has 4 bytes ([C2](#c2)). Code that uses a union for "one of several kinds of thing" therefore keeps a **tag** next to it. Win32's `INPUT` is the classic case:

```c
typedef struct tagINPUT {
    DWORD type;                      /* the tag: INPUT_MOUSE (0), INPUT_KEYBOARD (1) or INPUT_HARDWARE (2) */
    union {
        MOUSEINPUT    mi;            /* 32 bytes in a 64-bit process */
        KEYBDINPUT    ki;            /* 24 bytes */
        HARDWAREINPUT hi;            /*  8 bytes */
    } DUMMYUNIONNAME;
} INPUT;
```

An `INPUT` holds one mouse event, one key event or one hardware event, never two. The union is as large as its largest member, `MOUSEINPUT`, so every `INPUT` has room for any of them. When the program writes a key event into `ki`, it also sets `type` to `INPUT_KEYBOARD`, and `SendInput` reads `type` to know which member to look at. Nothing sets the tag automatically. The program writes both, and a wrong tag makes Windows read the bytes as the wrong kind of event. `DUMMYUNIONNAME` is a macro that gives the union a name for old compilers. In modern C it stays anonymous, so you write `input.ki`.

In C# terms, a tagged union is what an abstract base class with three subclasses does with a type check, squeezed into fixed-size memory. C# itself has no union. The C# declaration needs one struct for the outer `INPUT` and one explicit-layout struct for the union:

```csharp
using System.Runtime.InteropServices;

Console.WriteLine($"INPUT {Marshal.SizeOf<INPUT>()}, data at {Marshal.OffsetOf<INPUT>(nameof(INPUT.data))}");
Console.WriteLine($"MOUSEINPUT {Marshal.SizeOf<MOUSEINPUT>()}, KEYBDINPUT {Marshal.SizeOf<KEYBDINPUT>()}, HARDWAREINPUT {Marshal.SizeOf<HARDWAREINPUT>()}");

var input = new INPUT { type = 2, data = new InputUnion { hi = new HARDWAREINPUT { uMsg = 0x11223344 } } };
Console.WriteLine($"hi.uMsg written, read as mi.dx: 0x{input.data.mi.dx:X8}, mi.dy: {input.data.mi.dy}");

struct INPUT { public uint type; public InputUnion data; }

[StructLayout(LayoutKind.Explicit)]
struct InputUnion
{
    [FieldOffset(0)] public MOUSEINPUT mi;
    [FieldOffset(0)] public KEYBDINPUT ki;
    [FieldOffset(0)] public HARDWAREINPUT hi;
}

struct MOUSEINPUT { public int dx, dy; public uint mouseData, dwFlags, time; public nuint dwExtraInfo; }
struct KEYBDINPUT { public ushort wVk, wScan; public uint dwFlags, time; public nuint dwExtraInfo; }
struct HARDWAREINPUT { public uint uMsg; public ushort wParamL, wParamH; }
```

```text
INPUT 40, data at 8
MOUSEINPUT 32, KEYBDINPUT 24, HARDWAREINPUT 8
hi.uMsg written, read as mi.dx: 0x11223344, mi.dy: 0
```

What the output shows:

- `INPUT` is 40 bytes: the 4-byte tag, 4 bytes of padding, and the 32-byte union. The padding is there because `MOUSEINPUT` contains an 8-byte field (`dwExtraInfo`), so the union must start at a multiple of 8 ([C3](#c3)).
- The example wrote a hardware event: 8 bytes, with the tag `type = 2`. Reading the same memory as a mouse event finds those bytes in `dx` and `dy`. The other 24 bytes of the union are untouched, here zero.
- The C# field names `mi`, `ki` and `hi` are copied from the C header. `data` is a name this note chose: the C union has none. The [note on Win32 type names](../windows/win32-types-and-hungarian-notation.md) explains the field names inside.

### Sequential layout: matching a C struct

When a struct crosses into native code, the native side reads it by offset: "the length is at byte 4". The C# struct must put each field at exactly that offset. `LayoutKind.Sequential` does what a C compiler does ([C3](#c3)):

1. The fields go in declaration order.
2. Each field starts at a multiple of its own alignment, which is normally its size: a `byte` anywhere, an `int` at a multiple of 4, an 8-byte `nint` at a multiple of 8.
3. Where the next field can't start right after the previous one, padding bytes fill the gap.
4. The whole struct is padded to a multiple of its largest alignment, so arrays of it stay aligned.

The snippet declares a struct of a `byte`, an `int` and an `nint`, and asks for each field's offset ([C5](#c5)):

```csharp
using System.Runtime.InteropServices;

Console.WriteLine($"Header: size {Marshal.SizeOf<Header>()}, " +
    $"Flag at {Marshal.OffsetOf<Header>(nameof(Header.Flag))}, " +
    $"Length at {Marshal.OffsetOf<Header>(nameof(Header.Length))}, " +
    $"Pointer at {Marshal.OffsetOf<Header>(nameof(Header.Pointer))}");

struct Header            // no attribute: a C# struct is laid out sequentially by default
{
    public byte Flag;    // 1 byte at offset 0
    public int Length;   // 4 bytes, aligned to 4: offset 4 after 3 bytes of padding
    public nint Pointer; // 8 bytes, aligned to 8: offset 8
}
```

```text
Header: size 16, Flag at 0, Length at 4, Pointer at 8
```

One byte of data, three bytes of padding, then the `int`. C would lay out the same struct the same way.

`Sequential` is already the default for a C# `struct`, so the attribute is optional there ([C3](#c3)). Interop code often writes it anyway, as documentation that the layout matters. A `class` passed to native code needs it stated. The attribute goes on the *C# copy* of a native struct: the C side has no attributes. It has its layout from the compiler.

### Explicit layout: you give every offset

`LayoutKind.Explicit` turns the rules off. You give every field its offset with `[FieldOffset(n)]` ([C4](#c4)), and the compiler checks nothing about alignment. That is how the union above works: three fields, all at offset 0. Explicit layout also mirrors a C struct whose fields sit at offsets that `Sequential` wouldn't produce, for example one compiled with `#pragma pack(1)`.

## Good habits

- Declare every member of a native union in the C# copy, the largest one included, so the size matches ([C1](#c1); Microsoft Learn, `INPUT` structure).

- Check a C# copy of a native struct with `Marshal.SizeOf` and `Marshal.OffsetOf` against the sizes the C documentation gives ([C5](#c5); Microsoft Learn, *Customizing structure marshalling*).

- Write the tag together with the union member, every time ([C2](#c2)).

## Pitfalls

- **Leaving out a union member you don't use.** The union shrinks to the largest member you declared, and the struct no longer matches the native one ([C1](#c1)).

- **Reading a union member that wasn't written.** You get the bytes of another member reinterpreted: no error, just a wrong value ([C1](#c1), [C2](#c2)).

- **Forgetting the tag.** The union holds a key event, but `type` still says mouse: native code reads the wrong layout ([C2](#c2)).

- **Reordering fields in a sequential struct for readability.** The offsets change, and native code reads the wrong fields ([C3](#c3)).

## Exercises

1. **Predict.** A union has members `short a` (2 bytes), `int b` (4 bytes) and `byte c[6]` (6 bytes). What is its size, before and after rounding to its alignment of 4?

   <details><summary>Solution</summary>

   The largest member is 6 bytes. Rounded up to a multiple of the alignment 4, the union is 8 bytes ([C1](#c1)).

   </details>

2. **Predict.** A sequential C# struct has `byte A; long B; byte C;`. Give the offsets and the size in a 64-bit process.

   <details><summary>Solution</summary>

   `A` at 0, then 7 bytes of padding, `B` at 8, `C` at 16, then 7 bytes of padding to round the size to a multiple of 8: 24 bytes ([C3](#c3)). Reordering to `long B; byte A; byte C;` would give 16 bytes, but only if the native struct is declared in that order too.

   </details>

3. **Explain.** Why does `INPUT` need its `type` field, and what happens if a program writes `ki` but leaves `type` at `INPUT_MOUSE`?

   <details><summary>Solution</summary>

   The union itself doesn't record which member it holds ([C2](#c2)). `SendInput` reads `type` to decide. With the wrong tag it reads the key event's bytes as a mouse event: `wVk` and `wScan` become part of `dx`, and the mouse moves instead of a key being pressed ([C1](#c1)).

   </details>

## Sources

- B. W. Kernighan, D. M. Ritchie, *The C Programming Language*, 2nd ed., section 6.8 (unions).
- Microsoft Learn, [`StructLayoutAttribute`](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.structlayoutattribute) and [`LayoutKind`](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.layoutkind): the default layout for structs, explicit layout and `FieldOffset`.
- Microsoft Learn, [Customizing structure marshalling](https://learn.microsoft.com/en-us/dotnet/standard/native-interop/customize-struct-marshalling).
- Microsoft Learn, [`INPUT` structure](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-input).
- Microsoft Learn, [`Marshal.SizeOf`](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.marshal.sizeof) and [`Marshal.OffsetOf`](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.marshal.offsetof).
- Claude session, 2026-11-18: every snippet was run there with .NET 10.
