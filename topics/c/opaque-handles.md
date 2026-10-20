---
title: Opaque handles
area: c
created: 2026-10-20
updated: 2026-10-20
prerequisites: [c/struct-tags-and-typedef, c/stack-and-heap]
related: [cpp/abi-and-shared-libraries, cpp/header-only-libraries, cpp/copy-and-move]
tags: [c, cpp, api-design, handle, incomplete-type, raii, safehandle]
---

# Opaque handles

## TL;DR

- An **opaque handle** is a pointer to a type whose definition the user never sees. The user can store it and pass it back, but not look inside, like an `IntPtr` from native code.
- The library declares the type without a body in its header and defines it only in its own source, so it can change the layout without breaking users.
- Every handle comes with a **create** function and a **release** function, and the user must call the release function exactly once.
- A C++ wrapper class turns this into RAII: its destructor calls the release function, so release can't be forgotten.
- The wrapper must also decide what copying means; the default copy would release the same handle twice.

## Key claims

- <a id="c1"></a>**C1.** An opaque handle type is declared in the public header as an incomplete struct (`typedef struct db db;`) and defined only in the library's source, so client code can hold `db*` pointers but cannot access fields, create objects of the type, or depend on its size.
- <a id="c2"></a>**C2.** Because clients never depend on the layout of an opaque type, the library can change its contents without clients having to be recompiled, which is why C libraries with stable binary interfaces use opaque handles.
- <a id="c3"></a>**C3.** All operations on an opaque type go through the library's functions; each function that returns a new handle transfers ownership to the caller, who must release it with the library's matching function exactly once.
- <a id="c4"></a>**C4.** A handle must be released by the library that created it, through its release function, never with the client's own `free`, because the client cannot know how or with which allocator the object was created.
- <a id="c5"></a>**C5.** A C++ class that wraps a handle and calls the release function in its destructor makes release automatic (RAII); it must also disable copying, or implement copying by asking the library for a new handle, because the compiler-generated copy would copy the pointer and release it twice.
- <a id="c6"></a>**C6.** .NET's `SafeHandle` plays the same role for native handles: it wraps an `IntPtr` and calls a release function from `Dispose` or, failing that, its finaliser.
- <a id="c7"></a>**C7.** In C++, `Database(const Database&) = delete;` removes the copy constructor, so any attempt to copy a `Database` is a compile-time error; `= delete` deletes a function from the class, not an object.
- <a id="c8"></a>**C8.** A function declared next to an opaque type in a C header, such as `db* db_open(const char* path);`, is a free function of the library, not a member of the struct: the struct has no visible members at all, and the client needs only the function declarations to call them.

## Explanation

### The problem a handle solves

A library wants to give its users objects (a database connection, a big number) without letting them depend on what is inside. If the header exposed the struct, users would compile its size and field offsets into their own code; changing the struct would silently break every program built against the old version.

### How it is built

The header declares the type and nothing more ([C1](#c1)), the [incomplete type](struct-tags-and-typedef.md#c5) of C:

```c
typedef struct db db;                    /* no body: users never see inside */
db*  db_open(const char* path);          /* create: caller now owns the handle */
int  db_count(const db* d);              /* use */
void db_close(db* d);                    /* release: exactly once */
```

The three functions are ordinary free functions of the library, declared next to the type, not members of it ([C8](#c8)): C structs can't contain functions, and this one has no visible members at all. Only the library's `.c` file says what `struct db` contains. Users pass the pointer back to the library's functions and that is all they can do with it ([C3](#c3)). The library is free to rearrange its struct in a new version ([C2](#c2)). SQLite's `sqlite3*`, Win32's `HANDLE` and Tante's `tante_rational*` work this way.

### Ownership

C has no garbage collector, so the API must say who frees what ([C3](#c3)). The usual rule: a function that returns a new handle hands ownership to the caller, who must call the release function once. The release function belongs to the library ([C4](#c4)), because only the library knows how the object was made; it may be several allocations, a pooled object, or memory from the library's own heap.

### Making it safe in C++

Calling `db_close` on every path, including early returns and errors, is exactly the bookkeeping that goes wrong in C. A C++ wrapper attaches it to scope ([C5](#c5)). The one trap is copying: by default C++ copies an object member by member, so two wrappers would hold the same pointer and both destructors would release it. The wrapper therefore forbids copying (and allows moving, which transfers ownership), or implements copy by asking the library for a duplicate.

.NET solves the same problem with `SafeHandle` ([C6](#c6)), which wraps an `IntPtr` and releases it in `Dispose` or, if you forget, in its finaliser.

## Examples

A C++ wrapper over the C API above:

```cpp
#include <utility>

// The library's C header: one opaque type and three free functions (not members of db).
// extern "C" tells the C++ compiler these are C functions, named the C way.
extern "C" {
    typedef struct db db;
    db*  db_open(const char* path);
    int  db_count(const db* d);
    void db_close(db* d);
}

class Database {
    db* handle_;                                      // the only field: the handle
public:
    // Constructor. ": handle_(db_open(path))" initialises the field with the result of
    // calling the free function db_open; "explicit" forbids implicit conversion from a string.
    explicit Database(const char* path) : handle_(db_open(path)) {}

    // Destructor: runs automatically at the end of the owner's scope.
    // "if (handle_)" is false for a null pointer, as after a move (below).
    ~Database() { if (handle_) db_close(handle_); }

    // Copy constructor and copy assignment, removed: copying a Database is a compile error.
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

    // Move constructor: takes over other's handle and leaves other holding null.
    Database(Database&& other) noexcept : handle_(std::exchange(other.handle_, nullptr)) {}

    int count() const { return db_count(handle_); }   // const: does not change the object
};

int main()
{
    Database d("data.db");
    return d.count() >= 0 ? 0 : 1;
}   // db_close runs here, even if count() had thrown
```

The equivalent in plain C, with the release written by hand on every path:

```c
db* d = db_open("data.db");
if (d == NULL) return 1;
int n = db_count(d);
db_close(d);            /* forget this, or call it twice, and the program is wrong */
```

(These snippets need an implementation of `db_open` and friends to link; they illustrate the shape of the API.)

### Reading the wrapper, for a C# developer

- **`explicit`.** A C++ constructor with one parameter also acts as an implicit conversion: without `explicit`, `Database d = "data.db";` would compile and silently open a database. `explicit` forbids that, much as not defining an `implicit operator` does in C#.
- **`: handle_(db_open(path))`** is a member initialiser list. It sets the field `handle_` to the result of calling the free function `db_open(path)`, before the constructor body runs. In C# you would write `_handle = DbOpen(path);` in the constructor body.
- **`if (handle_)`.** A pointer used as a condition is false when it is null and true otherwise, so this means `if (handle_ != nullptr)`. It matters after a move, which leaves the old object holding null.
- **Copy constructor and copy assignment.** C# has nothing like them: assigning a class variable copies the reference, and both variables share one object. In C++, `Database b = a;` creates a second object by calling the **copy constructor** `Database(const Database&)`, and `b = a;` between existing objects calls the **copy assignment** `operator=`. By default both copy every field, which here would copy the handle and later close it twice. `= delete` removes them ([C7](#c7)): it deletes the function, not an object, so writing a copy becomes a compile error. More in [copy and move](../cpp/copy-and-move.md).
- **Move constructor**, `Database(Database&& other)`. `&&` marks a reference to an object that is about to be discarded, such as a temporary returned from a function. Instead of copying, the new object takes over `other`'s handle: `std::exchange(other.handle_, nullptr)` sets `other`'s handle to null and returns the old value in one step, so only the new object will close it. `noexcept` promises that this never throws, which lets standard containers move instead of copy. This is how a `Database` can still be returned from a function or stored in a `std::vector`.
- **`int count() const`.** The trailing `const` promises that the method doesn't modify the object, so it can be called on a `const Database&`. C# has no direct equivalent; `readonly` members of a struct come closest.

## Pitfalls

- Copying a handle-wrapping C++ class without defining what a copy means: two destructors, one handle, a double release ([C5](#c5)).
- Freeing a handle with `free` or `delete` instead of the library's release function ([C4](#c4)).
- Reading `= delete` as "deletes the object": it removes a member function from the class ([C7](#c7)).
- Using a handle after releasing it: the pointer value still looks valid, but the object behind it is gone.
- Treating `FILE*` from `<stdio.h>` as a strictly opaque type: it is used as a handle, but most C libraries do define `FILE` in the header.

## Sources

- Claude session on Tante, 2026-10-19, on why numbers cross the module interface of [Tante ADR-0004](https://github.com/thomaswening/Tante/pull/1) as handles.
- SQLite: [the database connection handle](https://www.sqlite.org/c3ref/sqlite3.html).
- Microsoft Learn: [SafeHandle](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.safehandle).
- cppreference: [rule of three/five/zero](https://en.cppreference.com/w/cpp/language/rule_of_three).
