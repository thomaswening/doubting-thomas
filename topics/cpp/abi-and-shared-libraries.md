---
title: Static libraries, shared libraries and the C++ ABI
area: cpp
created: 2026-10-20
updated: 2026-10-20
prerequisites: []
related: [c/opaque-handles, cpp/header-only-libraries]
tags: [cpp, c, abi, linking, dll, shared-library, static-library, extern-c, pinvoke]
---

# Static libraries, shared libraries and the C++ ABI

## TL;DR

- A **static library** (`.lib`, `.a`) is compiled code the linker copies into the executable at build time; nothing of it exists separately at run time.
- A **shared library** (`.dll`, `.so`, `.dylib`) is a separate file loaded at run time, like a .NET assembly.
- Code built separately has to agree on a binary contract, the **ABI**: how functions are named and called, and how types are laid out in memory.
- C++ has no ABI shared by all compilers: classes, `std::string` and exceptions may be laid out differently by MSVC and GCC, or even by one compiler's Debug and Release builds. Plain C has one per platform.
- So the safe boundary between separately compiled pieces is C (`extern "C"`, C types). .NET avoids the problem because assemblies carry IL and metadata, not machine code.

## Key claims

- <a id="c1"></a>**C1.** A static library is an archive of compiled object files; at link time the linker copies the code the program needs into the executable, so the library file is not needed to run the program.
- <a id="c2"></a>**C2.** A shared library is loaded when the program starts or on request at run time (`LoadLibrary` on Windows, `dlopen` on Linux and macOS), and the program needs the file to be present when it runs.
- <a id="c3"></a>**C3.** An ABI (application binary interface) is the contract between separately compiled code at the machine level: calling convention, the names of symbols (name mangling), the size and layout of types, and how exceptions propagate.
- <a id="c4"></a>**C4.** The C++ standard does not define an ABI. Different compilers, or different standard libraries, may lay out classes and standard types differently and mangle names differently, so C++ types passed between binaries built with different toolchains or settings can break; MSVC's Debug and Release builds of `std::vector` and `std::string`, for example, differ in layout.
- <a id="c5"></a>**C5.** Each platform has one C ABI that its compilers follow for C functions and C types, so a function declared `extern "C"` and using only C types can be called across compilers.
- <a id="c6"></a>**C6.** `extern "C"` in C++ gives a function C linkage: its symbol is not name-mangled, so a C program, another compiler, or .NET's P/Invoke can find and call it by its plain name.
- <a id="c7"></a>**C7.** A .NET assembly contains IL and metadata describing its types (any pre-compiled native code, as in ReadyToRun images, comes alongside the IL rather than replacing it), and the runtime decides type layout and compiles IL on the target machine, so assemblies can be used across .NET languages and compilers without an ABI problem of the C++ kind.

## Explanation

### Two ways to package compiled code

When C++ is compiled, each source file becomes an object file of machine code. A **static library** bundles object files; when you build a program, the linker copies in the parts the program uses ([C1](#c1)). The result runs on its own. The nearest .NET picture is merging every referenced assembly into one executable.

A **shared library** is linked as a separate file and loaded at run time ([C2](#c2)), as .NET loads an assembly. Several programs can share one copy, and a plug-in can be loaded by path while the program runs, which is how compiled modules are added to an application without rebuilding it.

### Why C++ across a shared library is risky

Separately compiled pieces only work together if they agree on the details at machine level, the ABI ([C3](#c3)). For C++ that agreement is weak ([C4](#c4)):

- **Name mangling.** C++ encodes namespaces, classes and parameter types into symbol names, and each compiler family has its own scheme. MSVC's differ from GCC's and Clang's.
- **Layout.** How big a `std::string` is and where its fields sit is the standard library's private choice. MSVC's Debug build adds checking fields, so a Debug program passing a `std::vector` to a Release library passes something the library misreads.
- **Exceptions and memory.** An exception thrown in one binary and caught in another, or memory allocated in one and freed in another, needs both to share the same runtime.

Some toolchains keep compatibility on purpose: GCC and Clang on Linux follow the same Itanium C++ ABI, and Microsoft keeps MSVC binary-compatible across Visual Studio 2015 to 2022. But nothing guarantees it across compilers in general, so a library meant for users with any compiler can't promise C++ at its boundary.

### C as the common language

C's ABI is fixed per platform ([C5](#c5)): how an `int64_t` is passed, how a struct of plain fields is laid out, how a function is named. `extern "C"` tells a C++ compiler to give a function C linkage, with no mangling ([C6](#c6)), so it can be called from C, from code built by another compiler, or from .NET through P/Invoke. Libraries that want a stable binary interface therefore expose C functions, often with [opaque handles](../c/opaque-handles.md), and keep C++ inside. Python, Lua and PostgreSQL load compiled extensions this way.

### Why .NET doesn't have this problem

An assembly ships IL plus metadata describing every type ([C7](#c7)). The runtime turns IL into machine code on the machine that runs it, and type layout is the runtime's business, not the compiler's. That is why a C# library works from F# or VB without anyone thinking about binary compatibility, and why P/Invoke, the one place .NET meets native code, uses the C ABI.

## Examples

A C++ library function exposed with C linkage:

```cpp
// sum.cpp, built into a shared library
#include <cstdint>
#include <vector>

extern "C" std::int64_t sum_squares(const std::int64_t* values, std::int64_t count)
{
    std::vector<std::int64_t> v(values, values + count);  // C++ inside is fine
    std::int64_t total = 0;
    for (auto x : v) total += x * x;
    return total;                                         // only C types cross the boundary
}
```

Called from C# through P/Invoke:

```csharp
using System.Runtime.InteropServices;

static class Native
{
    [DllImport("sum")]
    public static extern long sum_squares(long[] values, long count);
}

// Native.sum_squares(new long[] { 1, 2, 3 }, 3) returns 14
```

What not to export (the C++ type's layout depends on the compiler and settings):

```cpp
// fragile: works only if the caller uses the same compiler, standard library and build settings
__declspec(dllexport) std::string greet(const std::string& name);
```

## Pitfalls

- Mixing Debug and Release builds of libraries that pass standard C++ types to each other on MSVC ([C4](#c4)).
- Forgetting `extern "C"` on a function meant to be found by name: its symbol is mangled, and `GetProcAddress`, `dlsym` or P/Invoke cannot find it ([C6](#c6)).
- Letting a C++ exception escape an `extern "C"` function: the caller has no idea what to do with it. Catch everything at the boundary and return an error code.
- Using `long` in a C interface meant for all platforms: it is 32 bits on 64-bit Windows and 64 bits on 64-bit Linux and macOS. Use `int64_t`.

## Sources

- Claude session on Tante, 2026-10-19, on why the engine's C++ libraries are static and modules connect through C, in [Tante ADR-0004](https://github.com/thomaswening/Tante/pull/1).
- Microsoft Learn: [C++ binary compatibility between Visual Studio versions](https://learn.microsoft.com/en-us/cpp/porting/binary-compat-2015-2017), [platform invoke](https://learn.microsoft.com/en-us/dotnet/standard/native-interop/pinvoke).
- [Itanium C++ ABI](https://itanium-cxx-abi.github.io/cxx-abi/abi.html), followed by GCC and Clang.
- cppreference: [language linkage](https://en.cppreference.com/w/cpp/language/language_linkage).
