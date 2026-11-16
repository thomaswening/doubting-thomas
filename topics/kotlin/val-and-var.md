---
title: val and var
area: kotlin
created: 2026-11-10
updated: 2026-11-10
prerequisites: [cpp/const-and-constexpr]
related: [kotlin/object-expressions]
projects: [skip-the-fluff]
tags: [kotlin, val, var, readonly, const, immutability, lateinit]
---

# val and var

## TL;DR

- `val` declares a variable or property that is assigned once and never reassigned. `var` can be reassigned.
- `val` fixes the reference, not the object: the object it points to can still change.
- So `val` is C#'s `readonly` field, or C++'s `T* const`, not C++'s `const T`.
- A compile-time constant is `const val`, which corresponds to C#'s `const`.
- `lateinit var` is a non-null `var` assigned after construction. Reading it too early throws.
- Kotlin's conventions say: `val` unless the variable really changes.

## Key claims

- <a id="c1"></a>**C1.** A `val` is assigned exactly once and cannot be reassigned afterwards; reassigning it is a compile error. A `var` can be reassigned any number of times.
- <a id="c2"></a>**C2.** `val` makes the variable read-only, not the object it refers to: through a `val`, the object's mutable properties can still be set and its mutating functions called.
- <a id="c3"></a>**C3.** A `val` property or field corresponds to a C# `readonly` field and to a C++ pointer that is itself `const` (`T* const`). It does not correspond to C++'s `const T`, which also forbids changing the object.
- <a id="c4"></a>**C4.** A `val` property with a custom getter, such as `val now get() = System.currentTimeMillis()`, can return a different value on every read: read-only means "no setter", not "never changes".
- <a id="c5"></a>**C5.** `const val` declares a compile-time constant. It is allowed only at top level or in an `object`, only for primitive types and `String`, and its value must be known at compile time, like C#'s `const` and C++'s `constexpr`.
- <a id="c6"></a>**C6.** `lateinit var` declares a non-null `var` that is assigned after construction; reading it before the first assignment throws `UninitializedPropertyAccessException`. It is not allowed on `val` or on primitive types such as `Int`.
- <a id="c7"></a>**C7.** Kotlin's coding conventions recommend declaring every local variable and property as `val` unless it is modified after initialisation.

## Explanation

### Two keywords instead of a modifier

C# and C++ add a modifier to make something unchangeable (`readonly`, `const`). Kotlin makes the choice part of every declaration: `val` (from *value*) for read-only, `var` (from *variable*) for changeable ([C1](#c1)).

```kotlin
val name = "Ada"
var count = 0
count = 1        // fine
// name = "Bob"  // error: val cannot be reassigned
```

### What exactly is read-only

Kotlin variables of class type hold references, as C# variables of reference type do. `val` freezes the reference: the variable will always point at the same object. It says nothing about the object ([C2](#c2)).

```kotlin
val list = mutableListOf(1, 2)
list.add(3)              // fine: the list changes, the reference does not
// list = mutableListOf()  // error
```

This is C#'s `readonly` field: `readonly List<int> list` can still be `Add`ed to. In C++ terms it is `T* const p` (the pointer is fixed, `*p` is not), not `const T x` (the object is fixed) ([C3](#c3)). The [const note](../cpp/const-and-constexpr.md) covers the C++ side.

Deep immutability comes from the type, not the keyword. Kotlin's `List` interface has no `add`, `MutableList` has. `val list: List<Int>` is therefore both a fixed reference and a read-only view. Even then, another reference typed `MutableList` to the same object can still change it.

### Read-only is not constant

A `val` property is a property without a setter. Its getter may compute a new value each time ([C4](#c4)), as a C# get-only property `int Now => Environment.TickCount;` does. A value fixed at compile time is `const val` ([C5](#c5)), which the compiler substitutes at each use, as C# does for `const`.

### Assigned later: `lateinit`

Kotlin requires a non-null property to have a value from construction on. Some objects get theirs later: an Android `Activity` creates its views in `onCreate`, not in its constructor. `lateinit var webView: WebView` promises the compiler that the property is set before it is read. Break the promise and the read throws ([C6](#c6)). It must be a `var`, because the assignment comes after construction.

### The default

Kotlin's conventions say to prefer `val` ([C7](#c7)). The reader then knows which names can change, and the compiler checks the promise. It is the same habit as `readonly` by default in C#.

## Examples

```kotlin
class Counter { var value = 0 }

const val LIMIT = 3   // compile-time constant (C5)

class Screen {
    lateinit var title: String   // set later (C6)
}

fun main() {
    val counter = Counter()      // fixed reference (C1)
    counter.value = LIMIT        // the object still changes (C2)
    println(counter.value)

    val screen = Screen()
    try {
        println(screen.title)
    } catch (e: UninitializedPropertyAccessException) {
        println("not set yet")
    }
    screen.title = "Lesson"
    println(screen.title)
}
```

Expected output:

```text
3
not set yet
Lesson
```

## Good habits

- Declare every variable and property `val`, and change it to `var` only when the code must reassign it ([C7](#c7); [Kotlin coding conventions](https://kotlinlang.org/docs/coding-conventions.html#immutability)).
- Expose read-only collection types (`List`, `Map`) from a class, and keep the `Mutable…` type private ([C2](#c2)).

## Pitfalls

- Believing a `val` object cannot change. Only the reference is fixed ([C2](#c2)).
- Mapping `val` to C++ `const T`: `const T` freezes the object, `val` only the variable ([C3](#c3)).
- Treating a `val` property as a constant. A custom getter can return something new on each read ([C4](#c4)).
- Using `lateinit` as a way around null checks. A read before assignment fails at run time, where a nullable type would have failed at compile time ([C6](#c6)).

## Exercises

1. **Predict.** `val ids = mutableListOf(1); ids.add(2); ids = mutableListOf(3)`. Which statement fails, and when?

   <details><summary>Solution</summary>

   The third, at compile time: `ids` is a `val` and cannot be reassigned ([C1](#c1)). `ids.add(2)` is fine, because it changes the list, not the reference ([C2](#c2)).

   </details>

2. **Translate.** Give the Kotlin for these C# members: `const int Max = 5;`, `readonly List<int> items = new();` and a field that a lifecycle method assigns after construction.

   <details><summary>Solution</summary>

   `const val MAX = 5` (in an `object` or at top level) ([C5](#c5)); `val items = mutableListOf<Int>()` ([C3](#c3)); `lateinit var field: SomeType` ([C6](#c6)).

   </details>

## Sources

- Claude session on [Skip the Fluff](https://github.com/thomaswening/skip-the-fluff), 2026-11-10: `val backInWebsite` and `lateinit var webView` in `MainActivity.kt` of [PR 17](https://github.com/thomaswening/skip-the-fluff/pull/17).
- Kotlin documentation: [Basic syntax, variables](https://kotlinlang.org/docs/basic-syntax.html#variables), [Properties](https://kotlinlang.org/docs/properties.html) (custom getters, `const`, `lateinit`).
- Kotlin documentation: [Coding conventions, immutability](https://kotlinlang.org/docs/coding-conventions.html#immutability).
