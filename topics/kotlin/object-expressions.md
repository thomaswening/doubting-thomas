---
title: Object expressions (anonymous subclasses)
area: kotlin
created: 2026-11-10
updated: 2026-11-10
prerequisites: []
related: [kotlin/val-and-var]
projects: [skip-the-fluff]
tags: [kotlin, object-expression, anonymous-class, inheritance, override, closure, sam-conversion]
---

# Object expressions (anonymous subclasses)

## TL;DR

- `object : Base(args) { override … }` declares a class without a name that extends `Base`, and creates its one instance, in a single expression.
- The arguments in the parentheses go to `Base`'s constructor. Everything `Base` declares and the expression does not override is inherited as usual.
- Like a lambda, the body can use the variables and members of the code around it.
- C# has nothing like it: its anonymous types cannot inherit or override. The C# version is a named private nested class plus one instance.
- A lambda can stand in for an object expression only when the type is an interface with one abstract method, never for a class.

## Key claims

- <a id="c1"></a>**C1.** An object expression `object : Base(args) { … }` declares an unnamed class that extends `Base` and creates exactly one instance of it, in one expression whose value is that instance.
- <a id="c2"></a>**C2.** The arguments after the base class name are passed to the base class's constructor, like `: base(args)` in C#. An interface has no constructor, so it is named without parentheses: `object : Runnable { … }`.
- <a id="c3"></a>**C3.** The instance has every member of the base class that the expression does not override. A property the base class declares, such as `isEnabled` of Android's `OnBackPressedCallback`, can be read and set on the instance without appearing in the expression.
- <a id="c4"></a>**C4.** The body of an object expression can read and change the variables and members in scope where it is written, as a lambda's body can.
- <a id="c5"></a>**C5.** C# has no counterpart: an anonymous type (`new { Name = "x" }`) cannot inherit from a class, implement an interface or override a method. The C# equivalent is a named (usually private nested) class and one instance of it.
- <a id="c6"></a>**C6.** A lambda can replace an object expression only when the expected type is a functional interface: a Kotlin `fun interface` or a Java interface with exactly one abstract method (SAM conversion). For an abstract class, even one with a single abstract method, only an object expression works.
- <a id="c7"></a>**C7.** An object *declaration*, `object Name { … }` at top level or in a class, is a different thing: a named singleton, created the first time it is used. An object *expression* creates a new instance each time it is evaluated.

## Explanation

### The problem it solves

Android's back gesture is handled by an `OnBackPressedCallback`. It is an abstract class with an abstract method `handleOnBackPressed()` and a property `isEnabled`, which the system checks before calling the method. To use it, you need a subclass that overrides the method, and one instance of that subclass.

In C#, that is two steps: declare a class, then create an instance.

```csharp
private sealed class BackCallback : OnBackPressedCallback
{
    private readonly MainActivity _owner;
    public BackCallback(MainActivity owner) : base(false) => _owner = owner;
    public override void HandleOnBackPressed() => _owner.GoBack();
}

private readonly BackCallback _back = new BackCallback(this);
```

Kotlin does both in one expression ([C1](#c1)):

```kotlin
private val back = object : OnBackPressedCallback(false) {
    override fun handleOnBackPressed() = goBack()
}
```

Read it as: "an object of a class that extends `OnBackPressedCallback(false)` and overrides `handleOnBackPressed` like this". The value of the expression is that object, stored in `back`. Java calls the same construct an anonymous class, and that is the best mental model: the class version of an anonymous method.

### The parts

- `object :` starts the expression. The colon means "extends", as in a Kotlin class declaration (`class B : A()`).
- `OnBackPressedCallback(false)` names the base class and calls its constructor with `false`, the initial value of `isEnabled` ([C2](#c2)).
- The braces hold the class body: overrides, and if needed new properties or functions.

### Where `isEnabled` comes from

The expression declares only `handleOnBackPressed`. The instance still has `isEnabled`, because the base class declares it ([C3](#c3)). This is plain inheritance, as a WinForms `Button` subclass has `Enabled` without declaring it. Code elsewhere can then write `back.isEnabled = true`.

### Access to the surrounding code

In the C# version, the nested class needs a reference to its owner (`_owner`) to call `GoBack()`. In Kotlin, the body simply calls `goBack()`, a member of the enclosing class, because an object expression captures its surroundings like a lambda does ([C4](#c4)). It can also change a local `var` declared around it, which a Java anonymous class cannot.

### Why not a lambda?

A lambda can implement a type only if that type has one abstract method and nothing else to say: a functional interface ([C6](#c6)). `OnBackPressedCallback` is a class, and it also carries state (`isEnabled`) that the system reads. So it needs an object, not a function. For a functional interface, Kotlin accepts either:

```kotlin
val task1 = object : Runnable { override fun run() = println("hi") }
val task2 = Runnable { println("hi") }   // SAM conversion: same effect
```

## Examples

A complete, runnable example with an abstract class standing in for `OnBackPressedCallback`:

```kotlin
abstract class Callback(enabled: Boolean) {
    var isEnabled: Boolean = enabled
    abstract fun handle()
}

fun main() {
    var presses = 0
    val callback = object : Callback(false) {
        override fun handle() { presses++ }   // changes a local variable around it (C4)
    }

    println(callback.isEnabled)   // inherited, set by the constructor argument (C2, C3)
    callback.isEnabled = true
    callback.handle()
    callback.handle()
    println("${callback.isEnabled} $presses")
}
```

Expected output:

```text
false
true 2
```

Each evaluation creates a new object, unlike an object declaration ([C7](#c7)):

```kotlin
interface Greeter { fun greet(): String }

object Singleton : Greeter { override fun greet() = "same" }

fun makeGreeter(): Greeter = object : Greeter { override fun greet() = "new" }

fun main() {
    println(makeGreeter() === makeGreeter())   // === compares references, like ReferenceEquals
    println(Singleton === Singleton)
}
```

Expected output:

```text
false
true
```

## Pitfalls

- Reading `object : X(false)` as "an object named X". `X` is the base class, and the object has no class name of its own ([C1](#c1)).
- Looking for `isEnabled` in the expression and concluding it is undeclared. It comes from the base class ([C3](#c3)).
- Writing a lambda where an abstract class is expected, e.g. `OnBackPressedCallback { … }`. That does not compile: SAM conversion works only for interfaces ([C6](#c6)).
- Confusing `object : X() { … }` (expression, new instance each time) with `object Name : X() { … }` (declaration, one singleton) ([C7](#c7)).

## Exercises

1. **Interpret.** What does `val timer = object : CountDownTimer(30_000, 1_000) { override fun onTick(ms: Long) {}; override fun onFinish() = done() }` create, and what do the two numbers do?

   <details><summary>Solution</summary>

   One instance of an unnamed subclass of `CountDownTimer` that overrides `onTick` and `onFinish`, stored in `timer` ([C1](#c1)). The two numbers are passed to `CountDownTimer`'s constructor ([C2](#c2)), here 30 seconds in total and a tick every second. `done()` is a function of the surrounding code, which the body can call ([C4](#c4)).

   </details>

2. **Translate.** How would you write `object : Comparator<String> { override fun compare(a: String, b: String) = a.length - b.length }` in C#?

   <details><summary>Solution</summary>

   `Comparator` is a Java interface with one abstract method, so C# would use a delegate or a lambda: `Comparer<string>.Create((a, b) => a.Length - b.Length)`. In Kotlin, a lambda works here too: `Comparator<String> { a, b -> a.length - b.length }` ([C6](#c6)). For a class base, C# would need a named nested class ([C5](#c5)).

   </details>

## Sources

- Claude session on [Skip the Fluff](https://github.com/thomaswening/skip-the-fluff), 2026-11-10: the back gesture in `MainActivity.kt` of [PR 17](https://github.com/thomaswening/skip-the-fluff/pull/17).
- Kotlin documentation: [Object declarations and expressions](https://kotlinlang.org/docs/object-declarations.html).
- Kotlin documentation: [Functional (SAM) interfaces](https://kotlinlang.org/docs/fun-interfaces.html).
- C# documentation: [Anonymous types](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/anonymous-types).
