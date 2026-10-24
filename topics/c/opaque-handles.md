---
title: Opaque handles
area: c
created: 2026-10-20
updated: 2026-10-20
prerequisites: [c/struct-tags-and-typedef, c/stack-and-heap]
related: [c/function-pointer-declarations, cpp/abi-and-shared-libraries, cpp/header-only-libraries, cpp/copy-and-move]
tags: [c, cpp, api-design, handle, incomplete-type, raii, safehandle]
---

# Opaque handles

## TL;DR

- An **opaque handle** is a pointer to a type whose definition the user never sees. The user can store it and pass it back, but not look inside, like an `IntPtr` from native code.
- The library declares the type without a body in its header and defines it only in its own source, so it can change the layout without breaking users.
- The hidden struct holds the library's **data**. The operations are ordinary functions of the library, declared next to it, which the user calls directly.
- Every handle comes with a **create** function and a **release** function, and the user must call the release function exactly once.
- A C++ wrapper class turns this into RAII: its destructor calls the release function. It must also forbid copying, or two copies would release the same handle twice.

## Key claims

- <a id="c1"></a>**C1.** An opaque handle type is declared in the public header as an incomplete struct (`typedef struct db db;`) and defined only in the library's source, so client code can hold `db*` pointers but cannot access fields, create objects of the type, or depend on its size.
- <a id="c2"></a>**C2.** Because clients never depend on the layout of an opaque type, the library can change its contents without clients having to be recompiled, which is why C libraries with stable binary interfaces use opaque handles.
- <a id="c3"></a>**C3.** All operations on an opaque type go through the library's functions; each function that returns a new handle transfers ownership to the caller, who must release it with the library's matching function exactly once.
- <a id="c4"></a>**C4.** A handle must be released by the library that created it, through its release function, never with the client's own `free`, because the client cannot know how or with which allocator the object was created.
- <a id="c5"></a>**C5.** A C++ class that wraps a handle and calls the release function in its destructor makes release automatic (RAII); it must also disable copying, or implement copying by asking the library for a new handle, because the compiler-generated copy would copy the pointer and release it twice.
- <a id="c6"></a>**C6.** .NET's `SafeHandle` plays the same role for native handles: it wraps an `IntPtr` and calls a release function from `Dispose` or, failing that, its finaliser.
- <a id="c7"></a>**C7.** In C++, `Database(const Database&) = delete;` removes the copy constructor, so any attempt to copy a `Database` is a compile-time error; `= delete` deletes a function from the class, not an object.
- <a id="c8"></a>**C8.** A function declared next to an opaque type in a C header, such as `db* db_open(const char* path);`, is a stand-alone function of the library (a non-member function), not part of the struct: the hidden struct holds only the library's data, and the client calls the functions directly by name.
- <a id="c9"></a>**C9.** An API uses a handle for an object the library manages: something with state that persists between calls, a lifetime that needs cleaning up, or contents the library keeps private; operations on plain values that keep no state, such as `sqrt(double)`, need no handle. Each function taking the handle acts as a method of that object, with the handle in the role of `this`.
- <a id="c10"></a>**C10.** A handle need not be a memory address: Win32's `HANDLE` and `HWND` values are identifiers that Windows looks up in its own tables, which the program never dereferences.
- <a id="c11"></a>**C11.** A plug-in that is not linked against its host typically receives both a table of function pointers, through which it calls the host, and opaque handles to the host's objects, which it passes back through that table; Tante's modules get `tante_host` (the table) and `tante_rational*` (handles to numbers).

## Explanation

### The problem a handle solves

A library wants to give its users objects (a database connection, a big number) without letting them depend on what is inside. If the header exposed the struct, users would compile its size and field offsets into their own code; changing the struct would silently break every program built against the old version.

### What a handle stands for

A handle stands for **one object the library manages**: something with state that lives from one call to the next, a lifetime with a beginning and an end, and contents that are the library's business ([C9](#c9)). An open database, a window, a file, an arbitrary-size number. It is C's way of writing object-oriented code: the handle is the object reference, and each function that takes it is a method, with the handle as its first parameter playing the role of `this`. `db_count(d)` in C is `d.Count()` in C#.

An API needs no handle for operations on plain values that keep no state: `sqrt(double)` takes a number and returns one. A handle appears as soon as the library has to remember something between calls on your behalf, or has to clean something up at the end.

A handle need not even be a memory address ([C10](#c10)). Win32's `HANDLE` and `HWND` are identifiers that Windows looks up in its own tables; the program could not read anything at that "address", and isn't meant to. What makes it a handle is that the user only stores it and passes it back.

### How it is built

The header declares the type and nothing more ([C1](#c1)), the [incomplete type](struct-tags-and-typedef.md#c5) of C:

```c
typedef struct db db;                    /* no body: users never see inside */
db*  db_open(const char* path);          /* create: caller now owns the handle */
int  db_count(const db* d);              /* use */
void db_close(db* d);                    /* release: exactly once */
```

Two different things are declared here, and they are easy to mix up:

- **The struct `db`** holds the library's data for one database: perhaps a file, a cache, a count. Only the library's `.c` file says what it contains.
- **The three functions** are separate, stand-alone functions of the library ([C8](#c8)), like `static` methods of a C# `static class`, but at the top level. They are not inside the struct: a C struct can't contain functions. The user's program calls them by name, and the linker connects those calls to the library's code, just as a C# project calls methods of a referenced assembly.

So the user holds pointers to data it can't see, and passes them to functions it can call ([C3](#c3)). The library is free to rearrange its struct in a new version ([C2](#c2)). SQLite's `sqlite3*`, Win32's `HANDLE` and Tante's `tante_rational*` work this way.

### Handles and function tables are different things

A [struct of function pointers](function-pointer-declarations.md#c6) is a separate idea that often appears next to handles. It is needed only when the user's code is **not linked** against the library and so can't call its functions by name. A plug-in loaded at run time is the usual case. The host then passes the plug-in a table of function pointers, and the plug-in calls through the table.

Tante's module interface uses both, for different jobs:

- `tante_rational*` is an opaque handle to a number: data the module can't see into.
- `tante_host` is a visible struct of function pointers, such as `rational_add`. Because modules don't link against the engine, the engine passes this table to each module when loading it.

This pairing is the standard shape of a plug-in interface ([C11](#c11)): the plug-in calls the host through the table it was given, and refers to the host's objects by handles it passes back through that table. SQLite's loadable extensions work the same way. The handle never contains the functions, and the table never contains the numbers. In the `db` example above there is no table at all, because the user links against the library and calls `db_open` directly.

### Ownership

C has no garbage collector, so the API must say who frees what ([C3](#c3)). The usual rule: a function that returns a new handle hands ownership to the caller, who must call the release function once. The release function belongs to the library ([C4](#c4)), because only the library knows how the object was made; it may be several allocations, a pooled object, or memory from the library's own heap.

### Making it safe in C++

Calling `db_close` on every path, including early returns and errors, is exactly the bookkeeping that goes wrong in C. A C++ wrapper class attaches it to scope ([C5](#c5)): its constructor opens, its destructor closes, and the destructor runs automatically when the object goes out of scope.

The one trap is copying. C# assigns references, so `var b = a;` gives two names for one object. C++ objects are values: `Database b = a;` makes a second `Database`, by default by copying every field. Both copies would then hold the same pointer, and both destructors would close it. So the wrapper forbids copying ([C7](#c7)). [Copy and move](../cpp/copy-and-move.md) explains C++'s value semantics in full.

.NET solves the same problem with `SafeHandle` ([C6](#c6)), which wraps an `IntPtr` and releases it in `Dispose` or, if you forget, in its finaliser.

## Examples

A minimal C++ wrapper over the C API above:

```cpp
extern "C" {                       // the library's C header, as above
    typedef struct db db;
    db*  db_open(const char* path);
    int  db_count(const db* d);
    void db_close(db* d);
}

class Database {
    db* handle_;                                   // the only field: the handle
public:
    Database(const char* path) { handle_ = db_open(path); }   // constructor
    ~Database() { db_close(handle_); }                         // destructor: runs at end of scope

    Database(const Database&) = delete;            // forbid  Database b = a;
    Database& operator=(const Database&) = delete; // forbid  b = a;

    int count() { return db_count(handle_); }
};

int main()
{
    Database d("data.db");
    int n = d.count();
    // Database e = d;   // would not compile: copying is deleted
    return n >= 0 ? 0 : 1;
}   // d's destructor runs here and calls db_close, even if count() had thrown
```

Reading it:

- `extern "C"` tells the C++ compiler that the functions inside are C functions, so it looks them up by their plain C names.
- The constructor has the class's name and no return type, as in C#. The destructor is the same name with `~` in front; the compiler calls it automatically when `d` goes out of scope.
- The two `= delete` lines remove the two ways of copying ([C7](#c7)): making a new object from an existing one (`Database e = d;`, the **copy constructor**) and overwriting an existing object with another (`e = d;`, the **copy assignment**). Writing either is now a compile error. Nothing is deleted at run time.

The equivalent in plain C, with the release written by hand on every path:

```c
db* d = db_open("data.db");
if (d == NULL) return 1;
int n = db_count(d);
db_close(d);            /* forget this, or call it twice, and the program is wrong */
```

(These snippets need an implementation of `db_open` and friends to link; they illustrate the shape of the API.)

A wrapper this simple can't be returned from a function or stored in a `std::vector`, since both need to copy or **move** it. Production wrappers add a move constructor for that; see [copy and move](../cpp/copy-and-move.md).

## Pitfalls

- Copying a handle-wrapping C++ class without defining what a copy means: two destructors, one handle, a double release ([C5](#c5)).
- Freeing a handle with `free` or `delete` instead of the library's release function ([C4](#c4)).
- Reading `= delete` as "deletes the object": it removes a member function from the class ([C7](#c7)).
- Thinking the hidden struct contains the library's functions, or a table of them: it holds data; the functions are separate ([C8](#c8)).
- Using a handle after releasing it: the pointer value still looks valid, but the object behind it is gone.
- Treating `FILE*` from `<stdio.h>` as a strictly opaque type: it is used as a handle, but most C libraries do define `FILE` in the header.

## Sources

- Claude session on Tante, 2026-10-19, on why numbers cross the module interface of [Tante ADR-0004](https://github.com/thomaswening/Tante/pull/1) as handles; simplified after Thomas's review of [doubting-thomas#2](https://github.com/thomaswening/doubting-thomas/pull/2).
- SQLite: [the database connection handle](https://www.sqlite.org/c3ref/sqlite3.html).
- Microsoft Learn: [SafeHandle](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.safehandle).
- cppreference: [rule of three/five/zero](https://en.cppreference.com/w/cpp/language/rule_of_three).
