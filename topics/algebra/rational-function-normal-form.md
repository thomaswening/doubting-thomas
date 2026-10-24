---
title: Normal form of rational functions
area: algebra
created: 2026-10-20
updated: 2026-10-25
prerequisites: [algebra/content-and-primitive-part]
related: [algebra/irreducible-over-the-rationals]
projects: [tante]
tags: [rational-functions, gcd, canonical-form, computer-algebra]
---

# Normal form of rational functions

## TL;DR

- A **rational function** is a fraction of two polynomials, $p/q$. The same function can be written in infinitely many ways.
- To make equal functions look equal, a program **cancels the GCD** of numerator and denominator and then fixes the scale: denominator primitive, with a positive leading coefficient.
- This is exactly what you'd do for integer fractions, $6/(-4) \to -3/2$, with a polynomial GCD in place of the integer one.
- With a normal form, "are these equal?" and "is this zero?" become plain comparisons.

## Key claims

- <a id="c1"></a>**C1.** A rational function is a quotient $p/q$ of polynomials with $q \ne 0$. Two of them are equal, $p/q = r/s$, if and only if $ps = qr$ as polynomials.
- <a id="c2"></a>**C2.** Multiplying numerator and denominator by the same non-zero polynomial gives the same rational function, so every rational function has infinitely many representations, and comparing representations character by character does not decide equality.
- <a id="c3"></a>**C3.** Dividing $p$ and $q$ by $\gcd(p, q)$ gives a reduced fraction. Over the rationals, the reduced fraction is unique up to multiplying numerator and denominator by the same non-zero constant.
- <a id="c4"></a>**C4.** Requiring, in addition, that the denominator be primitive with a positive leading coefficient in a fixed monomial order makes the representation unique: a normal form. The numerator then carries any rational constants, for example $\dfrac{2x + 2}{-4y} = \dfrac{-\tfrac12 x - \tfrac12}{y}$.
- <a id="c5"></a>**C5.** A common factor can be invisible in the expanded form: $\dfrac{x^2 - 1}{x^2 + 2x + 1}$ reduces to $\dfrac{x - 1}{x + 1}$, which only a polynomial GCD finds.
- <a id="c6"></a>**C6.** In normal form, two rational functions are equal if and only if their numerators and their denominators are identical, and a rational function is zero if and only if its numerator is the zero polynomial.
- <a id="c7"></a>**C7.** Cancelling a common factor changes where the expression is defined but not the rational function: $\dfrac{x^2 - 1}{x - 1}$ and $x + 1$ are equal as rational functions, although the first expression can't be evaluated at $x = 1$.
- <a id="c8"></a>**C8.** Adding fractions without reducing makes them grow: $\frac{a}{b} + \frac{c}{d} = \frac{ad + bc}{bd}$ multiplies the denominators every time, so a long sum is normalised step by step, or put over the least common multiple of the denominators.

## Explanation

### Start with integer fractions

You know this from integer fractions. $\frac{6}{-4}$, $\frac{-3}{2}$ and $\frac{30}{-20}$ are the same number, but as pairs of integers they are different ([C2](#c2)). To make `Equals` work, a `Fraction` type normalises in its constructor: divide by the GCD, and move the sign into the numerator. After that, two fractions are equal exactly when their fields are equal ([C6](#c6)). The C# snippet below does exactly this.

### The same for polynomials

A rational function is a fraction of polynomials ([C1](#c1)), and the same recipe works with two changes.

**The GCD is a polynomial GCD.** Common factors can be hidden ([C5](#c5)): nothing in $\frac{x^2 - 1}{x^2 + 2x + 1}$ looks cancellable until you see that $x^2 - 1 = (x - 1)(x + 1)$ and $x^2 + 2x + 1 = (x + 1)^2$. Dividing both by their GCD, $x + 1$, gives the reduced fraction ([C3](#c3)).

**Fixing the scale needs a convention.** After cancelling, numerator and denominator can still both be multiplied by the same constant. Integer fractions fix this with "denominator positive". Polynomial fractions use the convention from [content and primitive part](content-and-primitive-part.md): the denominator is primitive and has a positive leading coefficient ([C4](#c4)). Whatever constant that takes is divided out of the numerator too, so the numerator may end up with fractional coefficients.

### Why physics needs this

Feynman-integral calculations produce huge sums of rational functions in kinematic variables ($s$, $t$, masses, the dimension $d$). Each sum has to be combined and reduced, or it grows without limit ([C8](#c8)). A term that is really zero is recognised as zero only when its numerator reduces to the zero polynomial ([C6](#c6)). This is why [Tante](https://github.com/thomaswening/Tante) lists normalisation of rational functions among the operations of its first release.

### Cancelling is allowed, even at the "holes"

$\frac{x^2 - 1}{x - 1}$ can't be evaluated at $x = 1$, while $x + 1$ can. They are still the same rational function ([C7](#c7)). A rational function is an algebraic object defined by [C1](#c1), not a function on points, and the two satisfy $(x^2 - 1)\cdot 1 = (x - 1)(x + 1)$. Computer-algebra systems cancel freely. If you need to know where the original expression was undefined, track that separately.

## Examples

### Integer fractions in C\#

```csharp
using System.Numerics;

static (BigInteger Num, BigInteger Den) Normalise(BigInteger num, BigInteger den)
{
    if (den == 0)
        throw new DivideByZeroException();
    var g = BigInteger.GreatestCommonDivisor(num, den);   // never negative
    if (den < 0)
        g = -g;                                            // convention: denominator positive
    return (num / g, den / g);
}

Console.WriteLine(Normalise(6, -4));
Console.WriteLine(Normalise(-3, 2));
Console.WriteLine(Normalise(6, -4) == Normalise(-3, 2));
Console.WriteLine((6, -4) == (-3, 2));
```

Output (run with `dotnet run fraction.cs`, .NET 10):

```text
(-3, 2)
(-3, 2)
True
False
```

The last line compares the raw pairs and says "different", although $\frac{6}{-4} = \frac{-3}{2}$. After normalising, plain tuple equality is correct.

### Polynomial fractions

Reducing with a hidden common factor ([C5](#c5)):

```math
\frac{x^2 - 1}{x^2 + 2x + 1} = \frac{(x - 1)(x + 1)}{(x + 1)^2} = \frac{x - 1}{x + 1}
```

Fixing the scale ([C4](#c4)). The GCD of $2x + 2$ and $-4y$ is a constant, so nothing cancels. The denominator $-4y$ has content $4$ and a negative sign, so divide both parts by $-4$:

```math
\frac{2x + 2}{-4y} = \frac{-\tfrac12 x - \tfrac12}{y}
```

A sum, put over the common denominator and reduced ([C8](#c8)):

```math
\frac{1}{x - 1} - \frac{1}{x + 1} = \frac{(x + 1) - (x - 1)}{(x - 1)(x + 1)} = \frac{2}{x^2 - 1}
```

The denominator $x^2 - 1$ is already primitive with a positive leading coefficient, so this is the normal form. Partial fractions, common in physics, run this example backwards.

## Pitfalls

- **Normalising only the numbers.** Making the denominator primitive but skipping the polynomial GCD leaves $\frac{x^2 - 1}{x^2 + 2x + 1}$ unreduced, and equal functions still compare unequal ([C5](#c5)).
- **Calling the normal form "the simplest form".** The normal form is unique, not necessarily short: $\frac{2}{x^2 - 1}$ is normal, while $\frac{1}{x - 1} - \frac{1}{x + 1}$ may be what a physicist wants to read.
- **Assuming cancelling keeps the domain** ([C7](#c7)).
- **Forgetting the variable order.** The sign of the denominator's leading coefficient depends on it, as in [content and primitive part, C8](content-and-primitive-part.md#c8).

## Sources

- Learned while reviewing [ADR-0003](https://github.com/thomaswening/Tante/blob/main/docs/adr/0003-flint-gmp-arb-behind-own-interfaces.md) §4 of [Tante](https://github.com/thomaswening/Tante) and [REQ-010](https://github.com/thomaswening/Tante/blob/main/docs/requirements.md#req-010); Claude session on Tante, 20 October 2026.
- Keith O. Geddes, Stephen R. Czapor, George Labahn, *Algorithms for Computer Algebra*, Kluwer, 1992, chapter 2 (rational functions and their canonical forms) and chapter 3 (normal and canonical forms).
