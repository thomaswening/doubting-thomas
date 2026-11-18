---
title: Pointers and unsafe code in C#
area: dotnet
created: 2026-11-18
updated: 2026-11-18
prerequisites: [c/pointer-declarator-syntax]
related: [windows/pinvoke-and-unmanaged-memory, dotnet/secrets-in-memory, c/stack-and-heap]
projects: []
tags: [csharp, unsafe, pointers, void-pointer, fixed, span, nint]
---

# Pointers and unsafe code in C#

## TL;DR

- C# has C-style pointers: `int* p`, `*p`, `p[2]`, `p + 1`. They are allowed only inside **`unsafe`** code, and only if the project sets `<AllowUnsafeBlocks>true</AllowUnsafeBlocks>`. `unsafe` marks code whose memory safety the compiler can't check.

- A typed pointer `T*` knows what it points at, so it can be dereferenced and moved by whole elements. A **`void*`** is just an address: it can't be dereferenced until it is cast to a typed pointer. Every typed pointer converts to `void*` on its own, the way every object converts to `object`.

- An `nint` and a pointer hold the same number. `nint` is the number, `byte*` is the same number read as "the address of a byte". Casts convert between them.

- The GC moves managed objects, so taking the address of an array element needs **`fixed`**, which pins the array for one block. A local variable doesn't move and needs no `fixed`.

- `new Span<T>(pointer, length)` wraps raw memory in a bounds-checked view. It is the safe way to work on native memory once you have its address.

## Key claims

- <a id="c1"></a>**C1.** Pointer types, `&`, `*` and `->` may be used only in an `unsafe` context: an `unsafe` block, method or type. Using them elsewhere fails with `CS0214`. An `unsafe` context compiles only if the project allows unsafe code (`AllowUnsafeBlocks`); otherwise the build fails with `CS0227`.

- <a id="c2"></a>**C2.** A typed pointer `T*` exists for every unmanaged type `T`. It supports `*p`, `p[i]`, `p->field` and arithmetic, with arithmetic in units of `sizeof(T)`: `p + 1` is `sizeof(T)` bytes further, as in C.

- <a id="c3"></a>**C3.** `void*` is a pointer without an element type. It can't be dereferenced (`CS0242`). Any `T*` converts to `void*` implicitly; a `void*` converts to a `T*` only with an explicit cast.

- <a id="c4"></a>**C4.** `nint` and pointer types convert into each other with explicit casts and hold the same address. APIs such as `Marshal.AllocHGlobal` return an `nint`; reading or writing through it needs a cast to a typed pointer, or a `Span` built from one.

- <a id="c5"></a>**C5.** Taking the address of something the GC may move, such as an array element or a field of a class, requires a `fixed` statement, which pins the object for the statement's block (`CS0212` otherwise). The pointer must not be used after the block. The address of a local variable can be taken without `fixed`, because locals don't move.

- <a id="c6"></a>**C6.** `new Span<T>(void* pointer, int length)` creates a span over memory the GC doesn't manage, with bounds checks: an index outside `0 … length - 1` throws `IndexOutOfRangeException`. The span doesn't own the memory: freeing it is still the caller's job, and the span must not be used after the memory is freed.

## Explanation

Each snippet below is a complete `Program.cs` for a console project with `<AllowUnsafeBlocks>true</AllowUnsafeBlocks>`, run with .NET 10.

### unsafe: code the compiler can't check

C# normally guarantees memory safety: every array access is bounds-checked, every reference points at a live object, nothing reads memory it doesn't own. Pointers break that guarantee. A pointer can point anywhere, including past the end of an array or at freed memory, and the compiler can't tell.

So C# puts pointers behind two gates ([C1](#c1)). The project must opt in with `<AllowUnsafeBlocks>true</AllowUnsafeBlocks>`, and the code that uses them must sit in an `unsafe` block or member. The keyword doesn't make the code run differently. It marks the place where you, not the compiler, vouch for memory safety. A reviewer knows where to look.

| Missing | Error |
|---|---|
| a pointer outside `unsafe` | `CS0214`: pointers may only be used in an unsafe context |
| `unsafe` without `AllowUnsafeBlocks` | `CS0227`: unsafe code may only appear if compiling with /unsafe |

### Typed pointers work as in C

Inside `unsafe`, the syntax is C's ([C2](#c2)). The [note on where the `*` goes](../c/pointer-declarator-syntax.md) covers the C side; one difference is that C# writes `int* a, b;` to declare *two* pointers. The snippet takes the address of an array's first element, reads through it, and moves it on by one element:

```csharp
int[] numbers = [10, 20, 30];
unsafe
{
    fixed (int* p = numbers)
    {
        Console.WriteLine(*p);
        Console.WriteLine(p[2]);
        int* second = p + 1;
        Console.WriteLine(*second);
        Console.WriteLine((nint)second - (nint)p);
    }
}
```

```text
10
30
20
4
```

`p + 1` moved by four bytes, the size of one `int`: arithmetic counts in elements, not bytes. The `fixed` is explained [below](#fixed-pinning-for-one-block).

### void*: an address without a type

A `void*` is a pointer that doesn't say what it points at ([C3](#c3)). It is the C# form of C's `void*`. Without an element type, the compiler doesn't know how many bytes to read, so `*v` is an error (`CS0242`). To use the memory, you cast the `void*` to a typed pointer.

The closest .NET comparison is `object`. Every reference converts to `object` on its own, and you cast back to use it as something specific. In the same way every typed pointer converts to `void*` on its own, and a cast turns it back into a typed one. APIs that accept "any memory" take a `void*` for that reason. `Span<T>`'s constructor is one of them: it serves `Span<byte>`, `Span<int>` and every other `T` with one parameter type.

The snippet takes the address of an `int`, loses the type by converting to `void*`, and reads the first byte through a `byte*`:

```csharp
unsafe
{
    int x = 0x01020304;
    void* v = &x;          // int* converts to void* on its own
    byte* b = (byte*)v;    // a cast gives it an element type again
    Console.WriteLine(b[0]);
}
```

```text
4
```

The first byte of `x` in memory is `0x04`, its lowest byte: x86 and x64 store integers little-endian. And `&x` needed no `fixed`: `x` is a local variable, which doesn't move ([C5](#c5)).

### nint and pointers: the same number

`Marshal.AllocHGlobal` and most interop APIs hand out addresses as `nint`, the integer the size of a pointer. An `nint` and a pointer hold the same bits ([C4](#c4)). The difference is what the compiler lets you do with them:

| | `nint` | `byte*` |
|---|---|---|
| What it is | a number | the address of a byte |
| Arithmetic | `+ 1` adds 1 | `+ 1` moves one element (`sizeof(byte)` = 1) |
| Read or write the memory | no | yes, inside `unsafe` |
| Allowed outside `unsafe` | yes | no |

`(byte*)p` turns the number into a pointer, and `(nint)ptr` turns it back. The cast doesn't check anything: if the number isn't a valid address, reading through the pointer crashes the process or reads garbage.

### Span over native memory

Raw pointer access has no bounds checks: `p[100]` on a four-byte block reads whatever lies there. `Span<T>` adds them back ([C6](#c6)). Build a span from the pointer and the length, and every access is checked, as for an array. Methods such as `Fill`, `CopyTo` and `CryptographicOperations.ZeroMemory` take spans, so they work on native memory unchanged.

The snippet allocates four bytes of native memory, fills them through a span, reads one back through the pointer, and then tries to write past the end:

```csharp
using System.Runtime.InteropServices;

nint p = Marshal.AllocHGlobal(4);
unsafe
{
    var span = new Span<byte>((byte*)p, 4);
    span.Fill(0xAB);
    Console.WriteLine(((byte*)p)[3]);
    try { span[4] = 1; }
    catch (IndexOutOfRangeException) { Console.WriteLine("span[4]: IndexOutOfRangeException"); }
}
Marshal.FreeHGlobal(p);
```

```text
171
span[4]: IndexOutOfRangeException
```

`0xAB` is 171. The out-of-range write was caught instead of corrupting memory. The span doesn't own the block: `FreeHGlobal` still has to run, and after it the span must not be used. The `unsafe` block is needed only for the cast to `byte*`; once the span exists, code that uses it needs no `unsafe`.

### fixed: pinning for one block

The GC compacts the heap: it moves objects to close gaps, and updates every managed reference to them. It can't update a raw pointer. So C# refuses to give you the address of something the GC may move, such as an array element, unless you pin it first ([C5](#c5)). Without `fixed`, `&a[0]` fails with `CS0212`.

`fixed (int* p = numbers) { … }` pins the array for the block and gives you the address of its first element. When the block ends, the pin is released and the array may move again. A copy of `p` kept beyond the block then points at whatever the GC puts there later.

For memory that must stay put for longer, `GC.AllocateArray<T>(length, pinned: true)` allocates on the pinned object heap, where objects never move. The note on [keeping secrets in .NET memory](secrets-in-memory.md) uses that.

## Good habits

- Keep `unsafe` blocks as small as possible: one cast to build a `Span`, then work with the span ([C1](#c1), [C6](#c6); Microsoft Learn, *Unsafe code, pointer types, and function pointers*).

- Prefer `Span<T>` over pointer arithmetic for reading and writing native memory ([C6](#c6); same source).

- Never keep a pointer from `fixed` beyond its block ([C5](#c5); C# language reference, `fixed` statement).

## Pitfalls

- **Dereferencing a `void*`.** It has no element type; cast it first ([C3](#c3)).

- **Treating `nint` arithmetic as pointer arithmetic.** `nint + 1` adds one, whatever the element size; `int* + 1` adds four bytes ([C2](#c2), [C4](#c4)).

- **Storing a pointer from `fixed` in a field.** The array may move as soon as the block ends ([C5](#c5)).

- **Using a span after freeing its memory.** The span still has its pointer and length, and the bounds check passes, but the memory belongs to someone else now ([C6](#c6)).

- **Expecting `int* a, b;` to mean what it means in C.** In C# both are pointers; in C only `a` is.

## Exercises

1. **Predict.** `long* p` points at the start of an array of `long`. How many bytes past `p` is `p + 3`? And `(nint)p + 3`?

   <details><summary>Solution</summary>

   `p + 3` is 24 bytes further: three elements of 8 bytes ([C2](#c2)). `(nint)p + 3` is 3 bytes further: `nint` arithmetic counts plain numbers ([C4](#c4)).

   </details>

2. **Explain.** Why does `Span<T>` take a `void*` and not a `T*` in its constructor, and why can you pass a `byte*` to it without a cast?

   <details><summary>Solution</summary>

   One parameter type serves every `T`, and for "any memory" C uses `void*` too. Every typed pointer converts to `void*` implicitly ([C3](#c3)), so `byte*` needs no cast. The element type comes from the type argument of `Span<T>`, not from the pointer.

   </details>

3. **Find the bug.** A class stores `byte* _cursor` in a field, set inside `fixed (byte* p = _buffer) { _cursor = p; }`, and reads through `_cursor` in later method calls. What can go wrong, and what are two fixes?

   <details><summary>Solution</summary>

   After the `fixed` block, `_buffer` is no longer pinned and may be moved by the GC; `_cursor` then points at stale memory ([C5](#c5)). Fixes: keep an index into `_buffer` instead of a pointer, or allocate `_buffer` with `GC.AllocateArray<byte>(n, pinned: true)` so it never moves.

   </details>

## Sources

- Microsoft Learn, [Unsafe code, pointer types, and function pointers](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/unsafe-code): `unsafe`, pointer types, `void*`, conversions, the address-of operator and `fixed`.
- Microsoft Learn, [`fixed` statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/fixed).
- Microsoft Learn, [`AllowUnsafeBlocks` compiler option](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/language#allowunsafeblocks).
- Microsoft Learn, [`Span<T>(Void*, Int32)` constructor](https://learn.microsoft.com/en-us/dotnet/api/system.span-1.-ctor#system-span-1-ctor(system-void*-system-int32)).
- Claude session, 2026-11-18: every snippet and compiler error was checked there with .NET 10.
