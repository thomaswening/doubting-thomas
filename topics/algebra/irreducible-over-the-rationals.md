---
title: Irreducible over the rationals
area: algebra
created: 2026-10-20
updated: 2026-10-25
prerequisites: [algebra/content-and-primitive-part]
related: [algebra/rational-function-normal-form]
projects: [tante]
tags: [polynomials, factorisation, irreducibility, computer-algebra]
---

# Irreducible over the rationals

## TL;DR

- A polynomial is **irreducible** over a set of numbers if it can't be written as a product of two non-constant polynomials whose coefficients come from that set.
- The answer depends on the numbers allowed: $x^2 - 2$ is irreducible over the rationals, but splits into $(x - \sqrt2)(x + \sqrt2)$ over the reals.
- Over the rationals, factorisation into irreducibles is **unique** up to the order of the factors and constant factors. That makes it suitable for a canonical form.
- **Multiplying the factors back** proves the factors are *correct*, not that they are *irreducible*.

## Key claims

- <a id="c1"></a>**C1.** A non-constant polynomial $p$ is irreducible over a field $K$ if $p = ab$ with $a, b$ having coefficients in $K$ implies that $a$ or $b$ is a constant.

- <a id="c2"></a>**C2.** Irreducibility depends on the field: $x^2 - 2$ is irreducible over $\mathbb{Q}$ but equals $(x - \sqrt2)(x + \sqrt2)$ over $\mathbb{R}$; $x^2 + 1$ is irreducible over $\mathbb{R}$ but equals $(x - i)(x + i)$ over $\mathbb{C}$.

- <a id="c3"></a>**C3.** Every non-constant polynomial in any number of variables with rational coefficients is a product of irreducible polynomials, and this factorisation is unique up to the order of the factors and multiplying factors by non-zero constants.

- <a id="c4"></a>**C4.** Every polynomial of degree 1 is irreducible. A polynomial of degree 2 or 3 in one variable is reducible over $\mathbb{Q}$ if and only if it has a rational root.

- <a id="c5"></a>**C5.** Rational root test: if $p/q$ in lowest terms is a root of $a_n x^n + \dots + a_1 x + a_0$ with integer coefficients, then $p$ divides $a_0$ and $q$ divides $a_n$.

- <a id="c6"></a>**C6.** By Gauss's lemma, a primitive polynomial with integer coefficients is irreducible over $\mathbb{Q}$ if and only if it can't be split into two non-constant factors with integer coefficients. So factoring over $\mathbb{Q}$ reduces to factoring the primitive part over $\mathbb{Z}$.

- <a id="c7"></a>**C7.** Checking that the product of the factors equals the input proves the factorisation is correct, but not that each factor is irreducible: $(x^2 - 1)(x + 2)$ multiplies back to $x^3 + 2x^2 - x - 2$, yet $x^2 - 1 = (x - 1)(x + 1)$ splits further.

- <a id="c8"></a>**C8.** In several variables, $x^2 - y^2 = (x - y)(x + y)$ is reducible over $\mathbb{Q}$, while $x^2 + y^2$ is irreducible over $\mathbb{Q}$ and $\mathbb{R}$ and only splits over $\mathbb{C}$, as $(x + iy)(x - iy)$.

## Explanation

### Like prime numbers, but relative to a choice

Irreducible polynomials play the role prime numbers play for integers. $12 = 2^2 \cdot 3$, and $2$ and $3$ can't be split further. Likewise $x^3 - x = x(x - 1)(x + 1)$, and none of $x$, $x - 1$, $x + 1$ can be split into non-constant pieces ([C1](#c1)).

The difference from primes: whether a polynomial splits depends on which coefficients you allow ([C2](#c2)). $x^2 - 2$ has roots $\pm\sqrt2$, so over the reals it factors as $(x - \sqrt2)(x + \sqrt2)$. Over the rationals those factors aren't allowed, because $\sqrt2$ is not a fraction, so $x^2 - 2$ is irreducible there. "Factorisation over the rationals" fixes the choice: coefficients must be fractions. That is the natural choice for exact symbolic computation, because the inputs have rational coefficients and no approximation is ever needed.

### Unique, up to the obvious

Over the rationals, factorisation is unique ([C3](#c3)), with two exceptions that don't count as different: the order of the factors, and constants moved between them. $6(x - y)(x + y)$ and $(-3)(y - x)\cdot 2(x + y)$ are the same factorisation. The normalisation in [content and primitive part](content-and-primitive-part.md) removes even those two freedoms: make every factor primitive with a positive leading coefficient, collect all constants in front, and sort the factors in a fixed order. Then any correct algorithm prints the same result, character for character. This is why [Tante](https://github.com/thomaswening/Tante) can compare its output across library versions and implementations.

Gauss's lemma ([C6](#c6)) is what lets a program factor over the rationals using only integers. Clear the denominators, take out the content, and factor the primitive integer polynomial. Any factorisation that works with fractions can be rescaled into one with integer coefficients.

### Small cases by hand

A factorisation of a degree-2 or degree-3 polynomial must contain a factor of degree 1, and a degree-1 factor means a root ([C4](#c4)). The rational root test ([C5](#c5)) gives a finite list of candidates, so in these degrees irreducibility over $\mathbb{Q}$ can be checked by hand. From degree 4 on this shortcut fails: $(x^2 + 1)^2$ has no rational root, but it is clearly reducible.

### What a check by multiplication does and does not show

FLINT's factorisation in Tante is checked by multiplying the factors back and comparing with the input. That proves nothing was lost or invented. It does not prove that the factors are as small as possible ([C7](#c7)). A buggy library could return $x^2 - 1$ as a "factor" and the product would still be right. Irreducibility is checked separately, against examples whose factorisation is known.

## Examples

### $x^3 - 2$ is irreducible over the rationals

By [C5](#c5), a rational root $p/q$ needs $p \mid 2$ and $q \mid 1$, so the candidates are $\pm1, \pm2$:

```csharp
// A rational root p/q of x^3 - 2 needs p to divide 2 and q to divide 1.
int[] candidates = [1, -1, 2, -2];
foreach (var r in candidates)
    Console.WriteLine($"p({r}) = {r * r * r - 2}");
```

Output (run with `dotnet run roots.cs`, .NET 10):

```text
p(1) = -1
p(-1) = -3
p(2) = 6
p(-2) = -10
```

No candidate is a root, so $x^3 - 2$ has no rational root, and by [C4](#c4) it is irreducible over $\mathbb{Q}$. Over $\mathbb{R}$ it splits, because $\sqrt[3]{2}$ is a real root.

### A multivariate factorisation

The build spike for Tante factorised

```math
6(x^2 - y^2)(1 + x + y + z)^3(xyz + 1)(x + 2y + 3z - 5)^2 .
```

Into irreducibles over $\mathbb{Q}$, with every factor primitive and starting with a positive coefficient for $x > y > z$:

```math
6 \cdot (x - y) \cdot (x + y) \cdot (x + y + z + 1)^3 \cdot (xyz + 1) \cdot (x + 2y + 3z - 5)^2
```

$x^2 - y^2$ splits ([C8](#c8)). The other factors were already irreducible. FLINT returned them in an order of its own, and a program that wants identical output sorts them.

## Pitfalls

- **"Has no rational root" means irreducible only up to degree 3** ([C4](#c4)). $(x^2 + 1)^2$ and $(x^2 - 2)(x^2 - 3)$ have no rational roots and are reducible.
- **Saying "irreducible" without saying over what.** $x^2 + 1$ is irreducible over $\mathbb{Q}$ and $\mathbb{R}$, not over $\mathbb{C}$ ([C2](#c2)).
- **Treating multiplication back as a full check** ([C7](#c7)). It proves correctness, not irreducibility.
- **Counting constants as factors.** $2x + 2 = 2(x + 1)$ is still "one irreducible factor" over $\mathbb{Q}$: the $2$ is a constant, a unit, and does not count ([C1](#c1)).

## Sources

- Learned while reviewing [ADR-0003](https://github.com/thomaswening/Tante/blob/main/docs/adr/0003-flint-gmp-arb-behind-own-interfaces.md) of [Tante](https://github.com/thomaswening/Tante) and [REQ-010](https://github.com/thomaswening/Tante/blob/main/docs/requirements.md#req-010); Claude session on Tante, 20 October 2026. The multivariate example is from the [native arithmetic build spike](https://github.com/thomaswening/Tante/blob/main/docs/spikes/2026-10-16-native-arithmetic-build.md).
- Joachim von zur Gathen, Jürgen Gerhard, *Modern Computer Algebra*, 3rd ed., Cambridge University Press, 2013, chapters 14 to 16 (factoring polynomials).
- [FLINT documentation, `fmpz_mpoly_factor`](https://flintlib.org/doc/fmpz_mpoly_factor.html): multivariate factorisation over the integers.
