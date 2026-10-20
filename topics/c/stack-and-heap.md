---
title: Stack, heap and who frees memory
area: c
created: 2026-10-20
updated: 2026-10-20
prerequisites: [c/pointer-declarator-syntax]
related: [c/opaque-handles]
tags: [c, cpp, memory, malloc, free, raii, destructor, garbage-collection]
---

# Stack, heap and who frees memory

## TL;DR

- C frees **local variables** automatically when their block ends, structs held by value included, just as C# does for locals.
- C never frees **heap memory** (from `malloc`) on its own: there is no garbage collector, and the code must call `free` exactly once.
- Forgetting `free` leaks memory; calling it twice, or using memory after it, is undefined behaviour.
- Memory goes on the heap when its size isn't known in advance or it must outlive the function that creates it, as an arbitrary-size number must.
- C++ adds **destructors**: objects such as `std::string` free their heap memory automatically at the end of their scope (RAII), so well-written C++ rarely calls `delete`.

## Key claims

- <a id="c1"></a>**C1.** In C, an object declared inside a block without `static` (automatic storage, usually on the stack) is destroyed automatically when the block is left; this includes structs and arrays held by value.
- <a id="c2"></a>**C2.** Memory obtained from `malloc`, `calloc` or `realloc` stays allocated until it is passed to `free`; C has no garbage collector and never frees it on its own.
- <a id="c3"></a>**C3.** Heap memory that is no longer reachable and was never freed is a memory leak; calling `free` twice on the same pointer, or reading or writing memory after it was freed, is undefined behaviour.
- <a id="c4"></a>**C4.** When a pointer variable goes out of scope, only the pointer is destroyed; the heap memory it pointed to remains allocated.
- <a id="c5"></a>**C5.** Returning a pointer to a function's local variable gives a dangling pointer, because the local is destroyed when the function returns.
- <a id="c6"></a>**C6.** In C++, an object's destructor runs automatically and deterministically when the object goes out of scope, including when the scope is left by an exception, so a class that frees its resource in its destructor cannot leak it (RAII).
- <a id="c7"></a>**C7.** The .NET garbage collector frees managed heap memory at an unspecified time after it becomes unreachable, whereas a C++ destructor runs at a known point, the end of the owner's scope; .NET's `using` and `Dispose` give deterministic release for non-memory resources only when the code asks for it.

## Explanation

### Two kinds of memory

C gives each object a **storage duration**. Two matter here:

- **Automatic**: ordinary local variables. They exist from their declaration to the end of their block, and the compiler arranges their release; in practice they live on the call stack ([C1](#c1)). An `int64_t`, a struct by value, a fixed-size array: all freed for you, as C# locals and value types are.
- **Allocated**: memory requested at run time with `malloc` and returned with `free` ([C2](#c2)). This is the heap. C# has a heap too, but its garbage collector reclaims what is no longer referenced. C does not, ever.

### Why use the heap at all

The stack is fast but has two limits: a local's size must be known when the function is compiled (variable-length arrays aside), and it disappears when the function returns ([C5](#c5)). Memory goes on the heap when it must outlive its creator, or when its size is only known at run time. A number with arbitrarily many digits, as in GMP or Tante, is both: it can grow to millions of digits, and it is created in one function and used in many others.

### What can go wrong

Every `malloc` needs exactly one matching `free` ([C3](#c3)):

- **Too few**: a leak. The program keeps working but grows; long runs eventually exhaust memory.
- **Too many** (double free) or **too late** (use after free): undefined behaviour. The program may crash, may corrupt unrelated data, or may appear to work. This is one of the main sources of security bugs in C.

A common misunderstanding is that leaving a scope frees "the thing". It frees the pointer variable, a small value holding an address, and nothing else ([C4](#c4)).

### What C++ adds

C++ attaches cleanup to scope. A class can define a **destructor**, `~Name()`, which the compiler calls automatically when an object of that class goes out of scope, whether by reaching the closing brace, by `return`, or by an exception unwinding the stack ([C6](#c6)). A class that acquires memory (or a file, or a library handle) in its constructor and releases it in its destructor is said to follow **RAII**, "resource acquisition is initialisation". `std::string`, `std::vector` and `std::unique_ptr` all do, so ordinary C++ code allocates heap memory all the time without ever writing `delete`.

The nearest .NET picture is a `using` block around an `IDisposable`, but applied automatically to every object and to memory as well ([C7](#c7)). The garbage collector, by contrast, frees memory eventually, at a moment you don't choose.

## Examples

### C: automatic versus allocated

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char* make_greeting(const char* name)
{
    char local[16] = "Hello, ";              /* array of 16 chars on the stack; gone when the function returns */
    char* result = malloc(strlen(local) + strlen(name) + 1);  /* ask the heap for that many bytes; survives */
    if (result == NULL) return NULL;         /* malloc returns NULL if no memory is left */
    strcpy(result, local);                   /* copy "Hello, " into the new memory */
    strcat(result, name);                    /* append the name after it */
    return result;                           /* fine; returning local would dangle */
}

int main(void)
{
    char* g = make_greeting("Thomas");
    if (g == NULL) return 1;
    printf("%s\n", g);
    free(g);                                 /* exactly once */
    return 0;
}
```

Expected output:

```
Hello, Thomas
```

**Reading it: strings in C.** C has no string type. A string is an array of `char` ending in a zero byte, `'\0'`, that marks where it stops; functions find the length by counting up to that byte.

- `char local[16] = "Hello, ";` declares an array of 16 chars on the stack and fills it with the 7 characters of `"Hello, "`, then the terminating `'\0'`, then zeros for the rest.
- A pointer has no length; it is only an address. The number passed to `malloc` is how many **bytes** to allocate: `strlen` counts the characters before the `'\0'` (7 for `"Hello, "`, 6 for `"Thomas"`), and the `+ 1` makes room for the terminator. `result` then points to the first of those 14 bytes, and remembering how many there are is the programmer's job.
- `strcpy(dest, src)` copies the string `src`, terminator included, into the memory at `dest`; `strcat(dest, src)` appends `src` after the string already in `dest`. Neither checks that `dest` is big enough. Here the size was computed exactly; getting it wrong writes past the end of the allocation, a buffer overflow, which is undefined behaviour and a classic security hole.

### C++: the destructor does the freeing

```cpp
#include <iostream>
#include <string>
#include <utility>

struct Tracer {
    std::string name;
    explicit Tracer(std::string n) : name(std::move(n)) { std::cout << "acquire " << name << '\n'; }
    ~Tracer() { std::cout << "release " << name << '\n'; }
};

int main()
{
    Tracer a("a");
    {
        Tracer b("b");
    }                       // b's destructor runs here
    std::cout << "end of main\n";
}                           // a's destructor runs here
```

Expected output:

```
acquire a
acquire b
release b
end of main
release a
```

## Pitfalls

- Believing a pointer going out of scope frees what it points to ([C4](#c4)).
- Returning the address of a local array or struct ([C5](#c5)); compilers often warn, but not always.
- Freeing memory with a different allocator than the one that allocated it: `free` for `malloc`, `delete` for `new`, and a library's own release function for what the library allocated. On Windows, freeing in one DLL what another DLL allocated can crash, because each may use its own heap.
- Expecting C++ RAII from a raw pointer: `T* p = new T;` has no destructor attached to `p`; `std::unique_ptr<T>` does.

## Sources

- Claude session on Tante, 2026-10-20, on why the module interface of [Tante ADR-0004](https://github.com/thomaswening/Tante/pull/1) needs a release function for every number handle.
- cppreference: [storage duration (C)](https://en.cppreference.com/w/c/language/storage_duration), [malloc](https://en.cppreference.com/w/c/memory/malloc), [free](https://en.cppreference.com/w/c/memory/free), [RAII](https://en.cppreference.com/w/cpp/language/raii), [destructors](https://en.cppreference.com/w/cpp/language/destructor).
- Microsoft Learn: [fundamentals of garbage collection](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals).
