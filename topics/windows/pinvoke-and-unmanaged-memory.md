---
title: P/Invoke and unmanaged memory
area: windows
created: 2026-11-18
updated: 2026-11-18
prerequisites: []
related: [c/opaque-handles, c/strings, c/stack-and-heap, cpp/raii-and-ownership, windows/dpapi]
projects: [ghostkey]
tags: [dotnet, interop, pinvoke, libraryimport, marshalling, safehandle, pinning, secrets, securestring]
---

# P/Invoke and unmanaged memory

## TL;DR

- **P/Invoke** (platform invoke) lets C# call a function exported by a native DLL, such as `kernel32.dll`. You declare the function's signature in C#. The runtime finds the DLL, converts the arguments and makes the call.

- There are two ways to declare it. **`[DllImport]`** converts arguments at run time. **`[LibraryImport]`** (.NET 7+) has a source generator write that conversion code at compile time, so you can read it, it works with Native AOT, and it refuses types whose conversion would be a guess.

- Native memory is outside the garbage collector. You free it yourself, best through a **`SafeHandle`**: the native counterpart of `IDisposable` plus a finaliser.

- The GC **moves** objects when it compacts the heap. A native function holding a pointer into a managed array needs that array **pinned**: for one statement with `fixed`, or for its whole life with `GC.AllocateArray<byte>(n, pinned: true)`.

- A `string` is a poor home for a secret. It can't be overwritten, the GC may leave old copies behind, and every operation on it makes new copies. Keep secrets in a pinned `byte[]` or `char[]` and wipe it with `CryptographicOperations.ZeroMemory`. `SecureString` is no way out: Microsoft advises against it for new code.

## Key claims

- <a id="c1"></a>**C1.** A P/Invoke declaration is a `static extern` (with `[DllImport]`) or `static partial` (with `[LibraryImport]`) method whose attribute names the DLL. The runtime loads the DLL on the first call and looks up the function by name.

- <a id="c2"></a>**C2.** **Marshalling** converts arguments and return values between managed and native representations. **Blittable** types, such as `int`, `uint`, `nint` and structs made only of them, have the same layout on both sides and are passed without conversion. Others, such as `string`, `bool` and `char`, need a conversion that must be specified.

- <a id="c3"></a>**C3.** With `[DllImport]`, the runtime builds the marshalling code when the method is first called. With `[LibraryImport]`, a source generator writes it at compile time into the `partial` method's body. `[LibraryImport]` requires the project to allow unsafe code, and it rejects a parameter whose marshalling is not stated, such as a `bool` without `[MarshalAs]` or a `char[]` without a `StringMarshalling`.

- <a id="c4"></a>**C4.** A Win32 function that fails usually returns `FALSE` or `NULL` and sets a thread-local error code. With `SetLastError = true` in the attribute, the marshaller saves that code right after the call, and `Marshal.GetLastPInvokeError()` returns it.

- <a id="c5"></a>**C5.** A `SafeHandle` subclass wraps a native handle and frees it in its `ReleaseHandle` override. That runs once: from `Dispose`, or from the finaliser if `Dispose` was never called. A P/Invoke method may return a `SafeHandle` subclass directly, so the handle is never a bare `IntPtr` that could leak.

- <a id="c6"></a>**C6.** The garbage collector may move a managed object to compact the heap. A pointer to a managed object is valid only while the object is **pinned**. `fixed` pins for the duration of a block. `GC.AllocateArray<T>(length, pinned: true)` allocates an array on the pinned object heap, where it never moves.

- <a id="c7"></a>**C7.** `CryptographicOperations.ZeroMemory(span)` overwrites memory with zeros in a way the compiler and JIT may not optimise away. A plain loop that writes zeros into a buffer that is never read again may be removed.

- <a id="c8"></a>**C8.** A .NET `string` can't safely hold a secret: it is immutable, so it can't be wiped; string literals are interned and live as long as the process; the GC may copy it while compacting; and every operation on it (`Substring`, concatenation, formatting, a `TextBox`) makes new copies outside your control.

- <a id="c9"></a>**C9.** Microsoft recommends against `SecureString` for new code (platform-compat diagnostic DE0001). It is encrypted only on Windows, and most APIs that consume it turn it into a `string` or plain memory anyway.

## Explanation

### Calling a native function

A Windows DLL such as `kernel32.dll` exports functions by name, the way a .NET assembly exposes public methods. C# can call them if you tell it the signature ([C1](#c1)):

```csharp
internal static partial class Native
{
    [LibraryImport("kernel32.dll")]
    public static partial uint GetCurrentProcessId();
}
```

On the first call, the runtime loads `kernel32.dll` (already loaded in every process), looks up `GetCurrentProcessId` and calls it. The C signature is `DWORD GetCurrentProcessId(void)`. A `DWORD` is a 32-bit unsigned integer, so the C# side returns `uint`.

The DLL is found by the Windows DLL search order. For system DLLs that are not on the protected "known DLLs" list, the application's own folder comes first. A DLL of the same name next to your `.exe` wins.

### Marshalling: when the two sides disagree

Managed and native code agree on what an `int` is: four bytes, same order. Such **blittable** types cross without conversion ([C2](#c2)). A struct of blittable fields does too, laid out sequentially as in C.

They disagree on others:

| C# type | Native counterpart | The problem |
|---|---|---|
| `bool` | Win32 `BOOL` (4 bytes) or C `bool` (1 byte) | which one? |
| `char` | `WCHAR` (UTF-16, 2 bytes) or `char` (1 byte, ANSI) | which encoding? |
| `string` | `const WCHAR*`, zero-terminated | needs a native copy with a terminator |
| `char[]` an API fills | `WCHAR*` buffer | copy back after the call? |

Marshalling is the code that converts these. You state the conversion with `[MarshalAs]` or `StringMarshalling`.

### DllImport against LibraryImport

The two attributes describe the same call. They differ in *when* the marshalling code is made ([C3](#c3)):

```csharp
// Run-time marshalling: the runtime makes an IL stub on the first call.
[DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
static extern bool GetUserNameW(char[] buffer, ref uint size);

// Compile-time marshalling: a source generator writes the body of this partial method.
[LibraryImport("advapi32.dll", SetLastError = true, StringMarshalling = StringMarshalling.Utf16)]
[return: MarshalAs(UnmanagedType.Bool)]
static partial bool GetUserNameW([Out] char[] buffer, ref uint size);
```

`[DllImport]` has defaults: a `bool` becomes a 4-byte `BOOL`, and `char` follows `CharSet`, which defaults to ANSI. Defaults are guesses. A wrong guess means a corrupted value at run time, not a build error.

`[LibraryImport]` makes no guesses. A `bool` without `[MarshalAs]` is a build error, and so is a `char[]` without `StringMarshalling`. The generated code is ordinary C# you can open in the IDE under *Analyzers*. It needs `<AllowUnsafeBlocks>true</AllowUnsafeBlocks>` in the project, because the generated body uses pointers. Prefer it in new code: the .NET analyzers even offer to convert `[DllImport]` declarations.

The analogy in .NET terms: `[DllImport]` is like reflection-based serialisation, `[LibraryImport]` like `System.Text.Json`'s source generator.

### Errors: the last-error code

Win32 functions report failure through their return value, usually `FALSE` or `NULL`, and leave the reason in a thread-local **last-error code**. The runtime itself calls Win32 functions too, which could overwrite that code before your next line runs. So `SetLastError = true` asks the marshaller to save the code right after the call. You read the saved value with `Marshal.GetLastPInvokeError()` ([C4](#c4)). `new Win32Exception(code)` turns it into a message.

### Native memory and SafeHandle

Memory that native code allocates is invisible to the GC. Nothing frees it unless you do. The same goes for handles: a window, a file, a block from `GlobalAlloc`.

In C++, a destructor would free it ([RAII](../cpp/raii-and-ownership.md)). In .NET, the tool is `SafeHandle` ([C5](#c5)). You subclass it and override `ReleaseHandle` with the native free call:

```csharp
internal sealed class SafeGlobalHandle : SafeHandleZeroOrMinusOneIsInvalid
{
    public SafeGlobalHandle() : base(ownsHandle: true) { }
    protected override bool ReleaseHandle() => Native.GlobalFree(handle) == 0;
}
```

Then the P/Invoke declaration returns it instead of an `nint`:

```csharp
[LibraryImport("kernel32.dll", SetLastError = true)]
public static partial SafeGlobalHandle GlobalAlloc(uint flags, nuint bytes);
```

What you get over a bare `nint` in a class with `Dispose` and a finaliser:

- The handle is wrapped *inside* the marshalling code, so no exception between the native call and your assignment can leak it.
- `ReleaseHandle` runs exactly once, from `Dispose` or from the finaliser.
- While a P/Invoke call is using the handle, the `SafeHandle` counts the use. If another thread calls `Dispose` meanwhile, `ReleaseHandle` is put off until the call returns, so native code never works on a freed handle.

The [note on opaque handles](../c/opaque-handles.md#c6) shows the same idea from the C side.

Two allocation functions appear in Win32 code, and they are not interchangeable:

| Function | What it gives | Use for |
|---|---|---|
| `Marshal.AllocHGlobal` / `FreeHGlobal` | a fixed block from `LocalAlloc` | scratch memory for a native call |
| `GlobalAlloc(GMEM_MOVEABLE, …)` / `GlobalFree` | a movable block, reached through `GlobalLock` | APIs that ask for an `HGLOBAL`, such as the clipboard |

### Pinning: the GC moves things

The GC compacts the heap: it copies live objects together to close the gaps, and updates every managed reference. It can't update a pointer that native code holds. So a pointer to a managed object is valid only while the object is **pinned**, meaning the GC promises not to move it ([C6](#c6)).

- **`fixed`** pins for one block. The P/Invoke marshaller does the same for a `byte[]` argument during the call.
- **`GC.AllocateArray<T>(n, pinned: true)`** (.NET 5+) allocates on the **pinned object heap**, a separate heap the GC never compacts. The array stays at one address for its whole life.

Pinning matters for secrets even when no native code is involved. When the GC moves an array, the bytes at the old address are not wiped. They stay in memory until something else overwrites them. A pinned array has exactly one copy, so one `ZeroMemory` really erases it.

```mermaid
flowchart LR
    subgraph soh["Ordinary heap: byte[] or string"]
        a1["'hunter2' at address A"] -->|"compacting GC copies it"| a2["'hunter2' at address B<br/>(the live object)"]
        a1 -.->|"left behind, not wiped"| a3["stale bytes at A"]
    end
    subgraph poh["Pinned object heap: GC.AllocateArray(n, pinned: true)"]
        p1["secret bytes at address P"] -->|"ZeroMemory"| p2["zeros at address P<br/>(no other copy exists)"]
    end
```

### Wiping: ZeroMemory

Writing zeros in a loop into a buffer that is never read again is a "dead store". An optimising compiler may delete it, because no observable behaviour changes. `CryptographicOperations.ZeroMemory` is guaranteed not to be removed ([C7](#c7)). It takes a `Span<byte>`, so it works on arrays and on native memory alike. For a `char[]`, pass `MemoryMarshal.AsBytes(chars.AsSpan())`.

### Why not a string?

Everything above is why a password tool keeps secrets out of `string` ([C8](#c8)):

- **Immutable.** There is no supported way to overwrite a string's characters. You can only drop the reference and wait.
- **Interned.** A string literal is shared and lives until the process ends.
- **Moved.** A string lives on the ordinary heap, so compaction can leave copies behind, as in the diagram.
- **Copied.** `Substring`, `+`, `$"…"`, `ToString`, a WPF `TextBox`, a log call: each makes a new string you can't wipe.

In memory, a string on 64-bit .NET is an object header (8 bytes), a method-table pointer (8 bytes), a 4-byte length, then the characters in UTF-16 and a terminating zero character. The password sits there as plain UTF-16 for anyone who can read the process memory or a crash dump.

`SecureString` was meant to fix this. Microsoft now advises against it ([C9](#c9)): on Linux and macOS it isn't encrypted at all, and to *use* the secret (send it, show it, hash it) you almost always convert it to a `string` or plain memory first. The guidance is to avoid holding credentials in the process where possible, and otherwise to keep the window short: plain bytes in a buffer you control, wiped right after use.

## Examples

All snippets were run in one console project (`net10.0-windows`, `AllowUnsafeBlocks` on), with the declarations at the end.

```csharp
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using Microsoft.Win32.SafeHandles;

// 1. A first call
Console.WriteLine(Native.GetCurrentProcessId() == Environment.ProcessId);

// 2. A buffer the native side fills, and the last-error code
char[] name = new char[256];
uint size = (uint)name.Length;
bool ok = Native.GetUserNameW(name, ref size);   // size now includes the terminating zero
Console.WriteLine($"{ok}, {new string(name, 0, (int)size - 1) == Environment.UserName}");

uint tooSmall = 1;
ok = Native.GetUserNameW(new char[1], ref tooSmall);
Console.WriteLine($"{ok}, error {Marshal.GetLastPInvokeError()}");

// 3. SafeHandle around GlobalAlloc
using (SafeGlobalHandle h = Native.GlobalAlloc(Native.GMEM_MOVEABLE, 16))
{
    Console.WriteLine($"invalid: {h.IsInvalid}, size: {Native.GlobalSize(h)}");
}   // GlobalFree runs here

// 4. A pinned secret, copied to native memory, both wiped
byte[] secret = GC.AllocateArray<byte>(8, pinned: true);
"s3cr3t!?"u8.CopyTo(secret);
nint p = Marshal.AllocHGlobal(secret.Length);
Marshal.Copy(secret, 0, p, secret.Length);
unsafe
{
    var native = new Span<byte>((void*)p, secret.Length);
    CryptographicOperations.ZeroMemory(native);
    Console.WriteLine($"native zeroed: {native.IndexOfAnyExcept((byte)0) < 0}");
}
Marshal.FreeHGlobal(p);
CryptographicOperations.ZeroMemory(secret);
Console.WriteLine($"managed zeroed: {secret.AsSpan().IndexOfAnyExcept((byte)0) < 0}");

// 5. fixed: a pointer into an ordinary array, valid only inside the block
byte[] movable = new byte[4];
unsafe
{
    fixed (byte* q = movable)
    {
        *q = 42;
    }
}
Console.WriteLine(movable[0]);

// 6. Strings: equal text, separate copies; the literal is interned
string a = "hunter2";
string b = string.Concat("hunter", "2".AsSpan());
Console.WriteLine($"{ReferenceEquals(a, b)}, {ReferenceEquals(a, string.IsInterned(b))}");

internal sealed class SafeGlobalHandle : SafeHandleZeroOrMinusOneIsInvalid
{
    public SafeGlobalHandle() : base(ownsHandle: true) { }
    protected override bool ReleaseHandle() => Native.GlobalFree(handle) == 0;
}

internal static partial class Native
{
    public const uint GMEM_MOVEABLE = 0x0002;

    [LibraryImport("kernel32.dll")]
    public static partial uint GetCurrentProcessId();

    [LibraryImport("advapi32.dll", SetLastError = true, StringMarshalling = StringMarshalling.Utf16)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool GetUserNameW([Out] char[] buffer, ref uint size);

    [LibraryImport("kernel32.dll", SetLastError = true)]
    public static partial SafeGlobalHandle GlobalAlloc(uint flags, nuint bytes);

    [LibraryImport("kernel32.dll")]
    public static partial nuint GlobalSize(SafeGlobalHandle mem);

    [LibraryImport("kernel32.dll")]
    public static partial nint GlobalFree(nint mem);
}
```

Expected output:

```text
True
True, True
False, error 122
invalid: False, size: 16
native zeroed: True
managed zeroed: True
42
False, True
```

- Error 122 is `ERROR_INSUFFICIENT_BUFFER`: the one-character buffer was too small ([C4](#c4)).
- Without `StringMarshalling = StringMarshalling.Utf16`, the build fails with `SYSLIB1051` on the `char[]` parameter ([C3](#c3)).
- In 6, `b` has the same text as `a` but is a separate object: a second copy of the "password" now exists. `string.IsInterned(b)` returns the literal's instance, which lives until the process ends ([C8](#c8)).

## Good habits

- Write new declarations with `[LibraryImport]`, not `[DllImport]` ([C3](#c3); Microsoft Learn, *P/Invoke source generation*).

- State every non-blittable conversion: `[MarshalAs(UnmanagedType.Bool)]` for `BOOL`, `StringMarshalling.Utf16` and the `W` variant of a function for text ([C2](#c2); Microsoft Learn, *Native interoperability best practices*).

- Set `SetLastError = true` on functions that report errors through the last-error code, and read it with `Marshal.GetLastPInvokeError()` straight after the call ([C4](#c4); same source).

- Return handles as `SafeHandle` subclasses, never as bare `nint` ([C5](#c5); same source).

- Keep secrets in a pinned `byte[]` or `char[]`, and wipe them with `CryptographicOperations.ZeroMemory` as soon as they are used ([C6](#c6), [C7](#c7), [C8](#c8); .NET documentation of `SecureString` and `ZeroMemory`).

## Pitfalls

- **Declaring a `BOOL` as `bool` with a 1-byte conversion**, or the other way round. Win32 `BOOL` is 4 bytes. The wrong size reads garbage or corrupts the stack ([C2](#c2)).

- **Calling the `A` function instead of `W`.** `GetUserNameA` returns ANSI text in the current code page. Use the `W` (wide, UTF-16) variant with `StringMarshalling.Utf16`.

- **Reading `Marshal.GetLastWin32Error()` without `SetLastError = true`.** The value is then whatever the last marshalled call left, not the error of your call ([C4](#c4)).

- **Keeping a pointer after `fixed` ends.** The GC may move the array right after the block, and the pointer then points at someone else's object ([C6](#c6)).

- **"Wiping" a string with unsafe code.** Writing into a string through a pointer breaks .NET's assumptions (interning, hash codes) and doesn't reach the copies already made ([C8](#c8)).

- **Converting a `SecureString` to a `string` to use it.** That undoes the whole point ([C9](#c9)).

- **Passing `Marshal.AllocHGlobal` memory where an API expects a `GlobalAlloc(GMEM_MOVEABLE)` handle.** The clipboard, for one, requires a movable global block.

## Exercises

1. **Interpret.** Why does this declaration fail to build, and what are the two possible fixes?

   ```csharp
   [LibraryImport("user32.dll")]
   public static partial bool OpenClipboard(nint owner);
   ```

   <details><summary>Solution</summary>

   `bool` is not blittable, and `[LibraryImport]` refuses to guess its size ([C2](#c2), [C3](#c3)). Win32 returns a 4-byte `BOOL`, so add `[return: MarshalAs(UnmanagedType.Bool)]`. Alternatively, declare the return type as `int` and compare with 0 yourself.

   </details>

2. **Explain.** A colleague keeps the master password in a `byte[]` from `new byte[32]` and calls `ZeroMemory` on it after use. Why can a copy of the password still be in memory, and what one change fixes that?

   <details><summary>Solution</summary>

   An ordinary array may be moved by a compacting GC, which leaves the old bytes unwiped at the old address ([C6](#c6)). Allocate it with `GC.AllocateArray<byte>(32, pinned: true)`, so there is only ever one copy to wipe.

   </details>

3. **Predict.** A `SafeGlobalHandle` is returned from `GlobalAlloc` and never disposed. Does the memory leak?

   <details><summary>Solution</summary>

   No, not permanently: the finaliser calls `ReleaseHandle`, which calls `GlobalFree` ([C5](#c5)). But it is freed only when the GC gets round to it, so dispose it with `using` anyway.

   </details>

4. **Explain.** List three ways a password typed into GhostKey could end up in memory you can't wipe if the code holds it in a `string`.

   <details><summary>Solution</summary>

   Any three of: the string itself can't be overwritten; the GC may have copied it during compaction; a `Substring`, concatenation or format call made another string; a WPF `TextBox.Text` holds its own copy; a literal (in a test) is interned for the process's lifetime ([C8](#c8)).

   </details>

## Sources

- Microsoft Learn, [Platform Invoke (P/Invoke)](https://learn.microsoft.com/en-us/dotnet/standard/native-interop/pinvoke).
- Microsoft Learn, [P/Invoke source generation](https://learn.microsoft.com/en-us/dotnet/standard/native-interop/pinvoke-source-generation): `[LibraryImport]`, its requirements and the differences from `[DllImport]`.
- Microsoft Learn, [Native interoperability best practices](https://learn.microsoft.com/en-us/dotnet/standard/native-interop/best-practices): `BOOL`, `W` functions, `SetLastError`, `SafeHandle`.
- Microsoft Learn, [Type marshalling](https://learn.microsoft.com/en-us/dotnet/standard/native-interop/type-marshalling) and [Blittable and non-blittable types](https://learn.microsoft.com/en-us/dotnet/framework/interop/blittable-and-non-blittable-types).
- Microsoft Learn, [`SafeHandle` class](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.safehandle).
- Microsoft Learn, [`GC.AllocateArray`](https://learn.microsoft.com/en-us/dotnet/api/system.gc.allocatearray) and [`CryptographicOperations.ZeroMemory`](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.zeromemory).
- Microsoft Learn, [`SecureString` class](https://learn.microsoft.com/en-us/dotnet/api/system.security.securestring), section *Remarks*, and [DE0001: SecureString shouldn't be used](https://github.com/dotnet/platform-compat/blob/master/docs/DE0001.md).
- Microsoft Learn, [Dynamic-link library search order](https://learn.microsoft.com/en-us/windows/win32/dlls/dynamic-link-library-search-order).
- Claude session on GhostKey, 2026-11-18: the snippets were run there with .NET 10.
