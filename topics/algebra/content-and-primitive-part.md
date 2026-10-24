---
title: Content, primitive part and the polynomial GCD
area: algebra
created: 2026-10-20
updated: 2026-10-25
prerequisites: []
related: [algebra/irreducible-over-the-rationals, algebra/rational-function-normal-form]
projects: [tante]
tags: [polynomials, gcd, canonical-form, computer-algebra]
---

# Content, primitive part and the polynomial GCD

## TL;DR

- The **content** of a polynomial with integer coefficients is the GCD of its coefficients. The **primitive part** is what is left after dividing by it: $6x + 4 = 2(3x + 2)$.
- The GCD of two polynomials over the rationals is only fixed **up to a non-zero constant factor**: $x - y$, $y - x$ and $2x - 2y$ are all valid answers to the same question.
- A program that must print one answer picks a **convention**: the primitive representative with a positive leading coefficient.
- "Leading" depends on a fixed **order of the variables and monomials**. Change the order and the "positive" representative can flip sign.

## Key claims

- <a id="c1"></a>**C1.** The content $\mathrm{cont}(p)$ of a non-zero polynomial $p$ with integer coefficients is the GCD of its coefficients, and its primitive part is $\mathrm{pp}(p) = p / \mathrm{cont}(p)$. A polynomial is primitive when its content is $1$ (up to sign).
- <a id="c2"></a>**C2.** A polynomial with rational coefficients also has a content: the rational number $c$, unique up to sign, for which $p / c$ has integer coefficients with GCD $1$. For example, $\tfrac12 x + \tfrac13 = \tfrac16(3x + 2)$, so the content is $\tfrac16$ (or $-\tfrac16$).
- <a id="c3"></a>**C3.** Over the rationals, if $g$ is a GCD of $p$ and $q$, then so is $cg$ for every non-zero rational $c$, and every GCD has this form. The GCD is unique only up to a constant factor.
- <a id="c4"></a>**C4.** Gauss's lemma: the product of two primitive integer polynomials is primitive. Consequently $\mathrm{cont}(pq) = \mathrm{cont}(p) \cdot \mathrm{cont}(q)$ and $\mathrm{pp}(pq) = \mathrm{pp}(p) \cdot \mathrm{pp}(q)$, up to sign.
- <a id="c5"></a>**C5.** Over the integers, the GCD splits into a number part and a polynomial part: $\gcd(p, q) = \gcd(\mathrm{cont} p, \mathrm{cont} q) \cdot \gcd(\mathrm{pp} p, \mathrm{pp} q)$, up to sign.
- <a id="c6"></a>**C6.** In several variables, the leading term is defined by a fixed monomial order. In lexicographic order with $x > y$, a term with a higher power of $x$ comes first, and powers of $y$ only break ties; so the leading term of $3xy^2 - 5x^2 + y$ is $-5x^2$.
- <a id="c7"></a>**C7.** "Primitive, with a positive leading coefficient in a fixed monomial order" selects exactly one polynomial from each family $\{cg : c \ne 0\}$, so it turns "a GCD" into "the GCD". This is a canonical form.
- <a id="c8"></a>**C8.** The sign convention depends on the variable order: with $x > y$ the normalised GCD of $x^2 - y^2$ and $x^2 - 2xy + y^2$ is $x - y$; with $y > x$ it is $y - x$.

## Explanation

### The integer case you already know

`BigInteger.GreatestCommonDivisor(-4, 6)` returns `2`, not `-2`. Both $2$ and $-2$ divide $-4$ and $6$, and every common divisor divides both. So mathematically both are "a greatest common divisor". .NET returns the non-negative one by convention. Polynomials have the same situation, only with more choices.

### Content and primitive part

A polynomial's coefficients can share a factor: in $6x + 4$ both coefficients are even. Pulling the shared factor out gives the **content** and the **primitive part** ([C1](#c1)):

```math
6x + 4 = \underbrace{2}_{\text{content}} \cdot \underbrace{(3x + 2)}_{\text{primitive part}}
```

With rational coefficients, first clear the denominators, then pull out the GCD. The content is then a fraction ([C2](#c2)):

```math
\tfrac12 x + \tfrac13 = \tfrac16(3x + 2)
```

Splitting off the content is useful because the two parts behave independently. Gauss's lemma ([C4](#c4)) says a product of primitive polynomials stays primitive. Contents multiply with contents, primitive parts with primitive parts, and neither leaks into the other. So a GCD can be computed in two separate halves ([C5](#c5)): an ordinary integer GCD of the contents, and a polynomial GCD of the primitive parts.

### Why a polynomial GCD is not unique

Over the rationals every non-zero number can be divided by, so constants are invisible to divisibility. If $x - y$ divides both $p$ and $q$, so does $2x - 2y$, and so does $-(x - y) = y - x$. All of these are greatest common divisors ([C3](#c3)). A computer-algebra library may return any of them, and different libraries, or different versions of one library, do.

### Choosing one: the canonical form

To print the same answer every time, a program fixes a convention ([C7](#c7)). The convention [Tante](https://github.com/thomaswening/Tante) uses is the usual one:

1. Divide by the content, so the result is primitive. This removes the scaling: $2x - 2y$ becomes $x - y$.
2. If the leading coefficient is negative, multiply by $-1$. This removes the sign: $y - x$ becomes $x - y$, *if* $x$ comes first.

Step 2 needs "leading", and in several variables that needs a **monomial order** ([C6](#c6)). The most common one is lexicographic: fix an order of the variables, say $x > y > z$, and compare terms like words in a dictionary, by the power of $x$ first, then $y$, then $z$. The choice matters ([C8](#c8)). With $x > y$, the leading term of $x - y$ is $x$ (coefficient $+1$), so $x - y$ is already normal. With $y > x$, the leading term is $-y$ (coefficient $-1$), so the normal form is $y - x$. A program that wants identical output must fix the variable order too. Tante fixes it by its canonical order of symbols, never by the order in which symbols first appear.

## Examples

### Three polynomials, worked through

Take $x > y$ and three polynomials with their factorisations:

```math
p_1 = 6x^2 - 6y^2 = 6(x - y)(x + y)
```

```math
p_2 = 4x^2 - 8xy + 4y^2 = 4(x - y)^2
```

```math
p_3 = -\tfrac12 x^2 - \tfrac12 xy = -\tfrac12 x(x + y)
```

**Content and primitive part** ([C1](#c1), [C2](#c2)). Each is unique up to sign. The convention picks the sign that leaves the primitive part with a positive leading coefficient. The last column is the other choice, which is just as valid mathematically.

| Polynomial | Content | Primitive part | Also valid: content, primitive part |
|---|---|---|---|
| $p_1$ | $6$ | $x^2 - y^2$ | $-6$, $-x^2 + y^2$ |
| $p_2$ | $4$ | $x^2 - 2xy + y^2$ | $-4$, $-x^2 + 2xy - y^2$ |
| $p_3$ | $-\tfrac12$ | $x^2 + xy$ | $\tfrac12$, $-x^2 - xy$ |

**GCDs over the rationals** ([C3](#c3), [C7](#c7)). A GCD is unique only up to a non-zero constant factor, so each pair has infinitely many correct answers. Three of them, and the one the convention picks:

| Pair | Three correct GCDs | Normalised |
|---|---|---|
| $p_1, p_2$ | $x - y$, $y - x$, $\tfrac12 x - \tfrac12 y$ | $x - y$ |
| $p_1, p_3$ | $x + y$, $-x - y$, $2x + 2y$ | $x + y$ |
| $p_2, p_3$ | $1$, $-1$, $7$ | $1$ |

$p_2$ and $p_3$ share no non-constant factor, so their GCD is a constant, and every non-zero constant is a correct answer. The normalised GCD of two such polynomials is $1$. Over the integers, $\gcd(p_1, p_2)$ would be $2(x - y)$: the integer GCD of the contents, $\gcd(6, 4) = 2$, comes along ([C5](#c5)).

### Content and primitive part in C\#

```csharp
using System.Numerics;

BigInteger[] coeffs = [-6, 4, 10];   // -6x^2 + 4x + 10, highest power first

BigInteger content = 0;
foreach (var c in coeffs)
    content = BigInteger.GreatestCommonDivisor(content, c);   // never negative
if (coeffs[0] < 0)
    content = -content;               // convention: primitive part has a positive leading coefficient

var primitive = coeffs.Select(c => c / content).ToArray();
Console.WriteLine($"content {content}, primitive part [{string.Join(", ", primitive)}]");
```

Output (run with `dotnet run content.cs`, .NET 10):

```text
content -2, primitive part [3, -2, -5]
```

So $-6x^2 + 4x + 10 = -2(3x^2 - 2x - 5)$. The sign went into the content so that the primitive part starts positive.

### Normalising a GCD

With $x > y$:

```math
\gcd(x^2 - y^2,\; x^2 - 2xy + y^2):\quad
x - y,\;\; y - x,\;\; 2x - 2y,\;\; \tfrac12(x - y)\;\;\longrightarrow\;\; x - y
```

All four candidates on the left are correct. The normalisation maps each of them to $x - y$.

### Leading term in two variables

With lexicographic order and $x > y$, sort the terms of $3xy^2 - 5x^2 + y$ by the power of $x$ first:

```math
-5x^2 \;>\; 3xy^2 \;>\; y
```

The leading coefficient is $-5$, the content is $\gcd(5, 3, 1) = 1$, and the normal form is $5x^2 - 3xy^2 - y$.

## Pitfalls

- **Total degree is not the leading term.** $3xy^2$ has total degree 3 and $-5x^2$ only 2, yet in lexicographic order $-5x^2$ leads ([C6](#c6)). Other monomial orders (graded ones) compare total degree first. Say which order you mean.
- **"The" GCD over the integers versus over the rationals.** Over the integers $\gcd(6x + 6, 4x + 4) = 2(x + 1)$, because the integer content $2$ is part of it ([C5](#c5)). Over the rationals the normalised answer is $x + 1$: constants don't count there ([C3](#c3)).
- **Forgetting the variable order.** Two programs with the same convention but different variable orders print $x - y$ and $y - x$ ([C8](#c8)).

## Sources

- Learned while reviewing [ADR-0003](https://github.com/thomaswening/Tante/blob/main/docs/adr/0003-flint-gmp-arb-behind-own-interfaces.md) §4 of [Tante](https://github.com/thomaswening/Tante) (normalisation after every library call); Claude session on Tante, 20 October 2026.
- Keith O. Geddes, Stephen R. Czapor, George Labahn, *Algorithms for Computer Algebra*, Kluwer, 1992, chapter 2 (content, primitive part, Gauss's lemma) and chapter 7 (polynomial GCD).
- Joachim von zur Gathen, Jürgen Gerhard, *Modern Computer Algebra*, 3rd ed., Cambridge University Press, 2013, chapter 6 (GCDs and Gauss's lemma) and chapter 21 (monomial orders).
