---
title: Trailing lambdas and labelled returns
area: kotlin
created: 2026-11-10
updated: 2026-11-10
prerequisites: []
related: []
projects: [skip-the-fluff]
tags: [kotlin, lambda, trailing-lambda, return, label, elvis, inline]
---

# Trailing lambdas and labelled returns

## TL;DR

- When a function's last parameter is a function, the lambda may follow the parentheses: `f(a) { x -> … }` is the call `f(a, { x -> … })`.
- When the lambda is the only argument, the parentheses go too: `setContent { … }` is `setContent({ … })`.
- The call returns whatever the function returns, not the lambda. The lambda may run much later.
- `?:` (Elvis) is C#'s `??`. Its right side may also be `return` or `throw`.
- A bare `return` in a lambda is forbidden unless the lambda goes to an `inline` function. `return@f` leaves only the lambda, like C#'s `return;` inside a lambda.

## Key claims

- <a id="c1"></a>**C1.** If a function's last parameter has a function type, the lambda for it may be written after the closing parenthesis: `f(a) { x -> x + 1 }` and `f(a, { x -> x + 1 })` are the same call.
- <a id="c2"></a>**C2.** If that lambda is the only argument, the parentheses may be left out entirely: `setContent { … }` is `setContent({ … })`.
- <a id="c3"></a>**C3.** Only the last argument can trail. A lambda for any earlier parameter stays inside the parentheses: for `g(first: (Int) -> Int, n: Int)`, the call is `g({ it * 2 }, 5)`.
- <a id="c4"></a>**C4.** A Kotlin lambda `{ allowed -> body }` corresponds to C#'s `allowed => { body }`. A lambda with one parameter may leave it undeclared and call it `it`. Unless the lambda returns `Unit`, its last expression is its result, without a `return` keyword.
- <a id="c5"></a>**C5.** A call with a trailing lambda returns the called function's result, not the lambda. `registerForActivityResult(contract) { allowed -> … }` returns a launcher, an object whose `launch(…)` shows the dialog. The lambda runs later, when the answer arrives.
- <a id="c6"></a>**C6.** `a ?: b` (Elvis) is `a` if `a` is not `null`, otherwise `b`, like C#'s `a ?? b`. Because `return` and `throw` are expressions in Kotlin, the right side may be either: `val r = x ?: return`.
- <a id="c7"></a>**C7.** A bare `return` inside a lambda is forbidden, unless the lambda is passed to an `inline` function. There it returns from the function that contains the lambda (a *non-local return*).
- <a id="c8"></a>**C8.** `return@label` returns from the lambda only. A lambda's implicit label is the name of the function it is passed to, as in `return@registerForActivityResult`. A custom label is written before the brace: `answer@{ … return@answer }`.
- <a id="c9"></a>**C9.** C#'s plain `return;` inside a lambda already leaves only the lambda, so it corresponds to Kotlin's `return@label`. C# has no `x ?? return`: `return` is a statement there, so C# writes `if (x is null) return;`.

## Explanation

### Where this came from

[Skip the Fluff](https://github.com/thomaswening/skip-the-fluff) asks the learner for the microphone when a website wants it. The Android dialog is set up like this:

```kotlin
private val microphoneDialog = registerForActivityResult(ActivityResultContracts.RequestPermission()) { allowed ->
    val request = requestWaitingForLearner ?: return@registerForActivityResult
    requestWaitingForLearner = null
    answerWebsite(request, answerAfterDialog(learnerAllowedInDialog = allowed))
}
```

Three pieces of syntax meet here: a trailing lambda, the Elvis operator and a labelled return. Each is explained below.

### A lambda after the parentheses

Kotlin lets the last argument move out of the parentheses when it is a lambda ([C1](#c1)). The two calls below compile to the same thing:

```kotlin
registerForActivityResult(contract, { allowed -> println(allowed) })
registerForActivityResult(contract) { allowed -> println(allowed) }
```

The reason is readability. A lambda body of several lines looks like a block of code, not like an argument squeezed between `(` and `)`. Kotlin's own conventions prefer the trailing form.

When the lambda is the only argument, the empty `()` is dropped as well ([C2](#c2)). That is why Android code is full of calls that look like new keywords: `setContent { … }`, `apply { … }`, `forEach { … }`. Each is an ordinary function call with one lambda argument.

Only the *last* argument can trail ([C3](#c3)). A function whose lambda parameter comes first is called with the lambda inside the parentheses.

Strictly, the last parameter of `registerForActivityResult` is not a Kotlin function type but `ActivityResultCallback`, a Java interface with a single method. Kotlin accepts a lambda for such an interface. The trailing syntax and the label work the same way.

### The lambda itself

`{ allowed -> … }` is a lambda with one parameter, `allowed`. In C# it would be `allowed => { … }` ([C4](#c4)). The braces belong to the lambda. The arrow separates the parameters from the body. With one parameter, Kotlin also accepts `{ println(it) }`, where `it` is the implicit name.

A lambda's result is its last expression: `{ x -> x + 1 }` returns `x + 1`. No `return` is written, which matters for the next sections.

### What the call returns

The trailing lambda is an argument, so the call's value is whatever the function returns ([C5](#c5)). `registerForActivityResult` returns an `ActivityResultLauncher`: a handle that is kept in `microphoneDialog`. Later, `microphoneDialog.launch(Manifest.permission.RECORD_AUDIO)` shows Android's dialog. When the learner answers, Android calls the lambda with `allowed` set to `true` or `false`.

In C# terms, the lambda is a callback delegate handed to a constructor, and the call returns the object that owns it. The lambda does not run during the call.

### Elvis: `??` with exits

`requestWaitingForLearner ?: return@…` reads: take `requestWaitingForLearner` if it is not `null`, otherwise leave the lambda ([C6](#c6)). The left part is C#'s `??`. In Kotlin, `return` and `throw` are expressions of type `Nothing`, so they may stand on the right of `?:`. After that line, the compiler knows `request` is not `null`.

C# allows `?? throw new …` but not `?? return` ([C9](#c9)).

### Why a bare `return` is forbidden here

In Kotlin, a bare `return` means "return from the enclosing `fun`", even when it is written inside a lambda. For a lambda that is stored and called later, that cannot work: when Android calls the lambda, the code that created it finished long ago. So the compiler forbids a bare `return` in such a lambda ([C7](#c7)).

The exception is a lambda passed to an `inline` function, such as `forEach`. An inline function's body is copied into the caller at compile time, lambda included. The lambda then runs while the enclosing function is still running, so a bare `return` really can leave it. This is a *non-local return*:

```kotlin
fun firstNegative(numbers: List<Int>): Int? {
    numbers.forEach { n ->
        if (n < 0) return n      // leaves firstNegative, not only the lambda
    }
    return null
}
```

`registerForActivityResult` is not inline. Its lambda is kept and called later, so only a labelled return is allowed in it.

### Labelled returns

`return@registerForActivityResult` returns from the lambda and nothing else ([C8](#c8)). The label is the name of the function the lambda was passed to. A lambda can also be given its own name, `answer@{ … }`, and then left with `return@answer`. To return a value, the value follows the label: `return@map -1`.

In C#, a `return;` inside a lambda already means exactly this ([C9](#c9)). C# lambdas cannot leave the method that contains them, so C# needs no labels. Kotlin needs them because its bare `return` was given the other meaning.

## Examples

A stand-in for `registerForActivityResult`: `askLater` returns a launcher and keeps the lambda for later.

```kotlin
class Launcher(private val onAnswer: (Boolean) -> Unit) {
    fun launch(question: String) {
        println("Dialog: $question")
        onAnswer(true)          // pretend the learner tapped "Allow"
    }
}

fun askLater(question: String, onAnswer: (Boolean) -> Unit): Launcher {
    println("askLater returns a launcher")
    return Launcher(onAnswer)
}

var waitingRequest: String? = "microphone for example.com"

fun main() {
    val launcher = askLater("Allow?") { allowed ->
        val request = waitingRequest ?: return@askLater
        waitingRequest = null
        println("Answer for $request: $allowed")
    }
    println("Nothing answered yet")
    launcher.launch("Allow?")
    launcher.launch("Allow?")   // waitingRequest is null now: the lambda returns early
    println("main goes on")
}
```

Expected output:

```text
askLater returns a launcher
Nothing answered yet
Dialog: Allow?
Answer for microphone for example.com: true
Dialog: Allow?
main goes on
```

The second `launch` shows the labelled return: the lambda stops at the Elvis line, but `main` continues.

The same lambda in C#, with a delegate:

```csharp
var launcher = AskLater("Allow?", allowed =>
{
    var request = waitingRequest;
    if (request is null) return;   // leaves the lambda only
    waitingRequest = null;
    Console.WriteLine($"Answer for {request}: {allowed}");
});
```

A local return in an inline function behaves like `continue`, and `return@map value` gives the lambda's result:

```kotlin
fun main() {
    listOf(3, -2, 5).forEach { n ->
        if (n < 0) return@forEach   // skips -2, like continue
        println(n)
    }
    val lengths = listOf("a", "", "abc").map { word ->
        if (word.isEmpty()) return@map -1
        word.length
    }
    println(lengths)
}
```

Expected output:

```text
3
5
[1, -1, 3]
```

## Pitfalls

- Reading `f(a) { … }` as a function definition or a block statement. It is a call with two arguments ([C1](#c1)).
- Assuming the variable holds the lambda. `val microphoneDialog = registerForActivityResult(…) { … }` holds the launcher the function returns ([C5](#c5)).
- Writing a bare `return` in a lambda to leave the lambda, as in C#. In a non-inline lambda it does not compile. In an inline one, such as `forEach`, it compiles and leaves the whole enclosing function ([C7](#c7)).
- Expecting `return@forEach` to stop the loop. It skips the current element only, like `continue` ([C8](#c8)).
- Translating `x ?: return` to C# as `x ?? return`, which is not C# ([C9](#c9)).

## Exercises

1. **Rewrite.** Write `button.setOnClickListener { view -> println(view) }` and `f(a) { x -> x * 2 }` without trailing lambdas.

   <details><summary>Solution</summary>

   `button.setOnClickListener({ view -> println(view) })` and `f(a, { x -> x * 2 })`. The lambda moves back inside the parentheses as the last argument ([C1](#c1), [C2](#c2)).

   </details>

2. **Explain.** In the Skip the Fluff snippet, what does `return@registerForActivityResult` return from, and why does a bare `return` not compile there?

   <details><summary>Solution</summary>

   It returns from the lambda only, since the label names the function the lambda was passed to ([C8](#c8)). A bare `return` would mean "return from the enclosing function". It is forbidden because `registerForActivityResult` is not inline: the lambda runs later, when that code has long finished ([C7](#c7)).

   </details>

3. **Translate.** Give the C# equivalent of `val request = waiting ?: return@register` inside a lambda.

   <details><summary>Solution</summary>

   ```csharp
   var request = waiting;
   if (request is null) return;
   ```

   C# has no `?? return`. Its `return;` in a lambda leaves the lambda, like `return@register` ([C6](#c6), [C9](#c9)).

   </details>

4. **Predict.** What does `firstNegative(listOf(3, -2, 5))` return, with `firstNegative` as in the explanation? What if `return n` were `return@forEach`?

   <details><summary>Solution</summary>

   It returns `-2`: `forEach` is inline, so the bare `return n` leaves `firstNegative` ([C7](#c7)). With `return@forEach`, the lambda could not return `n`, since `forEach`'s lambda returns `Unit`. Written as a plain `return@forEach`, it would skip `-2`, finish the loop and return `null` ([C8](#c8)).

   </details>

## Sources

- Review of [Skip the Fluff PR 20](https://github.com/thomaswening/skip-the-fluff/pull/20), 10 November 2026: the microphone dialog in `MainActivity.kt`.
- Kotlin documentation: [Passing trailing lambdas](https://kotlinlang.org/docs/lambdas.html#passing-trailing-lambdas), [`it`](https://kotlinlang.org/docs/lambdas.html#it-implicit-name-of-a-single-parameter), [Returning a value from a lambda](https://kotlinlang.org/docs/lambdas.html#returning-a-value-from-a-lambda-expression).
- Kotlin documentation: [Return to labels](https://kotlinlang.org/docs/returns.html#return-to-labels).
- Kotlin documentation: [Non-local returns](https://kotlinlang.org/docs/inline-functions.html#returns) in inline functions.
- Kotlin documentation: [Elvis operator](https://kotlinlang.org/docs/null-safety.html#elvis-operator).
- Android documentation: [Get a result from an activity](https://developer.android.com/training/basics/intents/result) (`registerForActivityResult` and `ActivityResultLauncher`).
