---
title: RAII and ownership
area: cpp
created: 2026-10-20
updated: 2026-10-20
prerequisites: [c/stack-and-heap]
related: [cpp/sanitizers, c/opaque-handles]
projects: [tante]
tags: [cpp, memory, raii, destructor, unique-ptr, shared-ptr, ownership, move]
---

# RAII and ownership

## TL;DR

- Every resource in C++ (heap memory, a file, a library handle) needs an **owner**: the one object responsible for releasing it.
- **RAII** puts that responsibility in a class: the constructor acquires the resource and the destructor releases it. The destructor runs automatically at the end of the owner's scope.
- Ordinary code therefore does not call `new` and `delete` itself. It owns things through **values**, **standard containers** and **smart pointers**, whose destructors do the freeing.
- `std::unique_ptr` means one owner. It can be moved but not copied. `std::shared_ptr` means shared ownership by reference counting.
- A class that owns a resource forbids copying, or defines what a copy means, so that two objects never free the same thing.

## Key claims

- <a id="c1"></a>**C1.** The owner of a resource is the object whose destructor releases it; in well-written C++ every heap allocation has exactly one owner, or one group of `shared_ptr` owners.
- <a id="c2"></a>**C2.** RAII (resource acquisition is initialisation) means acquiring a resource in an object's constructor and releasing it in its destructor, so that the release happens automatically when the object goes out of scope, also when the scope is left by an exception.
- <a id="c3"></a>**C3.** A raw `new` must be paired with exactly one `delete` on every path out of the code, including early returns and exceptions; forgetting it leaks, and doing it twice or using the object afterwards is undefined behaviour. Wrapping the allocation in an owning object removes the need for a hand-written `delete`.
- <a id="c4"></a>**C4.** Any C++ class can be used as a plain value (`Poly p(ctx);`), not only small types: the object then lives in the enclosing scope and its destructor runs when that scope ends, with no `new` and no pointer.
- <a id="c5"></a>**C5.** Standard containers such as `std::vector` and `std::string` own their elements and their heap memory, and release them in their destructor.
- <a id="c6"></a>**C6.** `std::unique_ptr<T>` owns one heap object and deletes it in its destructor; it cannot be copied, only moved with `std::move`, which transfers ownership and leaves the source empty. It is created with `std::make_unique<T>(args...)`.
- <a id="c7"></a>**C7.** `std::shared_ptr<T>` keeps a reference count and deletes the object when the last `shared_ptr` to it is destroyed; two objects holding `shared_ptr`s to each other are never freed, a cycle that `std::weak_ptr` is used to break.
- <a id="c8"></a>**C8.** If a class owning a resource can be copied with the default copy, both copies free the same resource; such a class deletes its copy constructor and copy assignment (`= delete`) or defines them to copy the resource itself.
- <a id="c9"></a>**C9.** A function that returns a `std::unique_ptr<T>` or an owning value hands ownership to the caller, and the type says so; a function that returns a raw `T*` does not say whether the caller must free it, which only its documentation can tell.

## Explanation

### Owners instead of a garbage collector

In C#, nobody owns memory: the garbage collector frees an object at some unspecified time after nothing refers to it. C++ has no collector, so something must free each allocation, at a definite moment, exactly once. That something is the **owner** ([C1](#c1)). Ownership is a design decision you can read from the types: a `std::vector<Term>` owns its terms; a `Term&` or `const Term*` only looks at one.

### RAII

C++ guarantees that a local object's destructor runs when its scope ends ([C2](#c2)). It is like C#'s `using var x = …;` disposing `x` at the end of the block, except that it applies to every object without being asked for, and it covers memory as well as files and handles ([stack and heap](../c/stack-and-heap.md)).

RAII uses that guarantee: a class acquires the resource in its constructor and releases it in its destructor. Then the resource is released however the scope is left, by reaching the closing brace, by `return`, or by an exception.

### What "no raw new and delete" means

`new` allocates on the heap and returns a pointer, and `delete` frees it ([C3](#c3)). Writing both by hand means getting every path right, including the ones an exception takes. One mistake leaks memory or corrupts it.

So application code owns things in one of these ways instead:

1. **As a value** ([C4](#c4)): `Poly p(ctx);`. This is the default. In C#, only structs live "inline" like this; in C++, any class can.
2. **In a standard container** ([C5](#c5)): `std::vector<Poly>`, `std::string`, `std::map`. These are `List<T>`, `string` and `Dictionary` with deterministic freeing.
3. **Through `std::unique_ptr`** ([C6](#c6)), when an object must live on the heap, for example because its type is only known at run time or it must outlive the scope that made it. Copying is forbidden, because that would create two owners. Moving transfers ownership, as handing over a key does.
4. **Through `std::shared_ptr`** ([C7](#c7)), only when ownership is truly shared and no single owner can be named. It costs a reference count and can leak through cycles.

### Returning ownership

Returning something does not transfer ownership by itself; the return type decides ([C9](#c9)). A returned `std::unique_ptr<T>` hands the object to the caller, who now owns it, and the compiler enforces that only one owner exists. A returned value (`Poly`, `std::vector<Term>`) is the caller's too. A returned raw `T*` can mean either "you own this now, free it" (as `malloc` does) or "look, but don't touch" (as a getter does), and nothing in the type tells them apart. That ambiguity is the reason to return `unique_ptr` when ownership moves, and to keep raw pointers and references for looking only.

`new` and `delete` still happen, inside `std::vector`, `std::make_unique` and your own small owning classes. They are written once, reviewed and tested, and the rest of the code never repeats them.

### Wrapping a C library handle

C libraries hand out resources with an init function and expect a clear function ([opaque handles](../c/opaque-handles.md)). An RAII class pairs them, and forbids copying, so the clear function runs exactly once ([C8](#c8)).

## Examples

Wrapping a FLINT polynomial, as [Tante](https://github.com/thomaswening/Tante)'s build spike did:

```cpp
#include <flint/fmpz_mpoly.h>

class Poly {
public:
    explicit Poly(fmpz_mpoly_ctx_t ctx) : ctx_(ctx) { fmpz_mpoly_init(p_, ctx_); }
    ~Poly() { fmpz_mpoly_clear(p_, ctx_); }     // runs at end of scope, always

    // No copies: two copies of a Poly would both clear the same p_.
    Poly(const Poly&) = delete;                 // forbids  Poly b = a;  and  Poly b(a);
    Poly& operator=(const Poly&) = delete;      // forbids  b = a;

private:
    fmpz_mpoly_ctx_struct* ctx_;   // not owned: only used
    fmpz_mpoly_t p_;               // owned
};

void work(fmpz_mpoly_ctx_t ctx) {
    Poly a(ctx);
    Poly b(ctx);
    // ... may throw ...
}   // b's destructor, then a's, run here, also after an exception
```

Reading it, line by line:

- `fmpz_mpoly_init` and `fmpz_mpoly_clear` are plain C functions, declared in the header `<flint/fmpz_mpoly.h>` and defined in the compiled FLINT library, which the linker connects ([ABI and shared libraries](abi-and-shared-libraries.md)). They belong to no class: C has no classes, so a library's functions are global **free functions**, and the `fmpz_mpoly_` prefix does the job a namespace or class name would do. The nearest C# picture is a static method of a static class, called after `using static`.
- `explicit` stops this one-parameter constructor from acting as an implicit conversion. Without it, a function taking a `Poly` could be called with a bare `ctx`, and C++ would silently build a temporary `Poly` from it. `explicit` is not about constructors in general; it only matters for constructors callable with one argument (and for conversion operators).
- `: ctx_(ctx)` is a member initialiser list: it sets the field before the constructor body runs, like `_ctx = ctx;` at the start of a C# constructor.
- FLINT, like GMP, defines its `_t` types as **arrays of one struct**: `typedef fmpz_mpoly_ctx_struct fmpz_mpoly_ctx_t[1];`. In C and C++, a parameter declared with an array type is really a pointer, so the constructor's `fmpz_mpoly_ctx_t ctx` is an `fmpz_mpoly_ctx_struct* ctx`, and storing it in a field of that pointer type copies only the address. The member `fmpz_mpoly_t p_` is the other side of the trick: as a member it is a real one-element array, so the polynomial's struct lives inside the `Poly` object, and passing `p_` to a function passes its address without writing `&`.
- The two `= delete` lines remove the two ways of copying ([C8](#c8)). The **copy constructor** `Poly(const Poly&)` makes a *new* `Poly` from an existing one: `Poly b = a;` or `Poly b(a);`. The **copy assignment** `operator=(const Poly&)` overwrites an *existing* `Poly` with another: `b = a;`. Neither involves references being reassigned: in C++, `b = a` copies the object, as it would for a C# struct. The `Poly&` return type of `operator=` is a convention that lets `c = b = a;` chain.

Raw ownership compared with `unique_ptr`:

```cpp
#include <memory>

struct Big { /* ... */ };
void use(Big&);

void raw() {
    Big* b = new Big();
    use(*b);          // if this throws, the delete below never runs: leak
    delete b;
}

void owned() {
    auto b = std::make_unique<Big>();
    use(*b);          // if this throws, b's destructor still deletes the Big
}

std::unique_ptr<Big> make() {
    auto b = std::make_unique<Big>();
    return b;         // ownership moves to the caller; nothing is copied
}
```

In `make`, ownership passes to the caller because the return type is `std::unique_ptr` ([C9](#c9)), not because a heap object is returned. Returning the local `b` moves it automatically; `std::move` is not needed there.

## Pitfalls

- Treating `shared_ptr` as "the C# reference": it costs a reference count on every copy and leaks on cycles ([C7](#c7)). Prefer values and `unique_ptr`.
- Using a `unique_ptr` after `std::move` from it: it is empty, and dereferencing it is undefined behaviour ([C6](#c6)).
- Forgetting `= delete` on the copy operations of a class that owns a C handle: the first copy that goes out of scope frees the handle the other still uses ([C8](#c8)).
- An exception that is never caught ends the program through `std::terminate`, and whether destructors run on the way out is then up to the implementation. The guarantee of [C2](#c2) is for exceptions that are caught somewhere up the call stack.
- Assuming that a function returning a raw pointer hands over ownership, or that it doesn't. Freeing what you don't own is a double free; not freeing what you do own is a leak. Read the documentation, and in your own code return `unique_ptr` when ownership moves ([C9](#c9)).
- Keeping a reference or raw pointer to something after its owner is gone. RAII decides when things are freed; it does not stop you looking at them afterwards. AddressSanitizer finds this ([sanitizers](sanitizers.md)).

## Sources

- Claude session on [Tante](https://github.com/thomaswening/Tante), 2026-10-20, explaining "ownership by RAII" in [ADR-0001](https://github.com/thomaswening/Tante/blob/main/docs/adr/0001-cpp20-cmake-vcpkg-guardrails.md) §3, and the RAII classes of its [build spike](https://github.com/thomaswening/Tante/blob/main/docs/spikes/2026-10-16-native-arithmetic-build.md).
- [C++ Core Guidelines, R: Resource management](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource).
- [cppreference: RAII](https://en.cppreference.com/w/cpp/language/raii), [`std::unique_ptr`](https://en.cppreference.com/w/cpp/memory/unique_ptr), [`std::shared_ptr`](https://en.cppreference.com/w/cpp/memory/shared_ptr).
