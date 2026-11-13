---
title: Ball arithmetic
area: numerics
created: 2026-10-19
updated: 2026-10-20
prerequisites: []
related: []
projects: [tante]
tags: [arbitrary-precision, error-bounds, flint, arb]
---

# Ball arithmetic

## TL;DR

- A **ball** $[m \pm r]$ is a number written as a midpoint $m$ and a radius $r$: the true value is somewhere in $[m - r, m + r]$.
- Every operation on balls returns a ball that is **guaranteed** to contain the true result, rounding errors included.
- That makes digits **provable**: if the whole ball rounds to the same digits, those digits are right.
- The price: comparisons can answer "don't know", and the radius can come out larger than the real error.
- In C and C++ it is provided by FLINT's `arb` module (formerly the Arb library), which [Tante](https://github.com/thomaswening/Tante) uses for numerical evaluation.

## Key claims

- <a id="c1"></a>**C1.** A ball $[m \pm r]$ represents every real number $x$ with $|x - m| \le r$; the value it stands for is guaranteed to be one of them.

- <a id="c2"></a>**C2.** Ball arithmetic guarantees inclusion: for any operation, the exact result for any inputs inside the input balls lies inside the output ball, including the rounding error of computing the midpoint.

- <a id="c3"></a>**C3.** The radius is an upper bound on the error, never an estimate: it may overstate the error, but it never understates it.

- <a id="c4"></a>**C4.** A ball comparison such as `a < b` returns true only if it holds for every pair of points in the two balls. When the balls overlap, both `a < b` and `a ≥ b` return false, so false means "not proven", not "no".

- <a id="c5"></a>**C5.** Ball arithmetic does not know when two operands are the same quantity: for $x = [m \pm r]$, computing $x - x$ as a subtraction of two balls gives $[0 \pm 2r]$, not exactly $0$ (the dependency problem).

- <a id="c6"></a>**C6.** If every number in a result ball rounds to the same n significant digits, those n digits are proven correct. If not, the usual remedy is to repeat the computation at higher working precision.

- <a id="c7"></a>**C7.** Agreement between two floating-point evaluations at different precisions does not prove any digits: $e^{10^{-50}} - 1$ evaluates to $0$ at both 30 and 38 digits, while its true value is about $10^{-50}$. Ball arithmetic at 30 digits returns roughly $[0 \pm 10^{-30}]$, which shows that no digit is known yet.

- <a id="c8"></a>**C8.** In FLINT's `arb`, the working precision is given in bits and passed to each operation, not stored with the number; $n$ decimal digits need about $3.32\,n$ bits ($\log_2 10 \approx 3.32$).

## Explanation

### The problem: floating point forgets its own error

A C# `double` holds about 16 significant decimal digits. Each operation rounds, and the rounding errors pile up, but the `double` keeps no record of how far it may have drifted. After a long computation you have a number and no idea how many of its digits are right. `decimal` doesn't fix this: it is exact only for numbers that fit in base 10 and its 28–29 digits, and it rounds silently too.

Raising the precision (MPFR, or `BigInteger`-based fractions) makes errors smaller, but still does not tell you how large they are. Running twice at two precisions and checking that the results agree looks like a test, but it can be fooled ([C7](#c7)): if both precisions are too low to see the effect, both give the same wrong answer.

### The idea: carry the error bar along

A physicist writes a measurement as $9.81 \pm 0.02\ \mathrm{m/s^2}$. Ball arithmetic does the same for every intermediate number: it keeps a midpoint `m` and a radius `r` ([C1](#c1)), and every operation computes a new midpoint and a new radius large enough to cover two things: the uncertainty already in the inputs, and the rounding error made while computing the new midpoint ([C2](#c2)).

For addition this is easy to see. If $x = [1 \pm 0.1]$ and $y = [2 \pm 0.1]$, every possible $x + y$ lies within $[3 \pm 0.2]$, plus whatever rounding computing `1 + 2` introduced. For functions like `exp` or `sin`, the library uses bounds on the function's derivatives to find a safe radius.

The radius is always a bound you can rely on, never a best guess ([C3](#c3)). Bounds are deliberately pessimistic, so the radius can grow faster than the true error. That is the trade: you sometimes get less precision than you could have, but you never get a wrong digit presented as right.

### Proving digits

Since the true value is guaranteed to be inside the ball, $n$ digits are proven once every number in the ball rounds to the same $n$ digits ([C6](#c6)). $[3.14159265 \pm 10^{-9}]$ proves 3.14159265 to nine digits, because everything from 3.141592649 to 3.141592651 rounds to that. $[2.71 \pm 0.01]$ proves only two digits, 2.7: the ball runs from 2.70 to 2.72, which agree at two digits but not at three. If the ball is too wide for the digits you want, you repeat the computation at a higher working precision ([C8](#c8)), and the radius shrinks. [Tante](https://github.com/thomaswening/Tante)'s evaluator does exactly this: it doubles the precision until the requested digits are proven, and stops with a message at a limit rather than print an unproven digit.

### The price

- **Comparisons can be undecidable** ([C4](#c4)). Is $[1 \pm 0.1]$ less than $[1.15 \pm 0.1]$? The first ball covers $[0.9, 1.1]$ and the second $[1.05, 1.25]$. They overlap, so some pairs of points say yes and some say no. A ball library answers "not proven" to *both* `<` and `≥`. Code that reads `if (!(a < b))` as meaning $a \ge b$ is wrong.
- **The dependency problem** ([C5](#c5)). If $x = [1 \pm 0.1]$, then $x - x$ is mathematically $0$. But the subtraction only sees two balls, each covering $[0.9, 1.1]$, and the worst case of one minus the other is $\pm 0.2$. The answer is a correct but wasteful $[0 \pm 0.2]$. Rewriting an expression so a quantity appears once (`x * (1 − y)` instead of `x − x * y`) often gives tighter balls.

## Examples

### Floating point is fooled

```csharp
double y = Math.Exp(1e-50) - 1.0;
Console.WriteLine(y);   // 0
```

`Math.Exp(1e-50)` is 1.000…0001 with the 1 in the 50th decimal place, far past the 16 digits a `double` holds, so it rounds to exactly 1.0, and the subtraction gives 0. Nothing in the result warns you. The true value is about $10^{-50}$.

### Ball arithmetic is honest about it

FLINT's `arb` is a C library and is called the same way from C++:

```cpp
#include <flint/arb.h>
#include <cstdio>

int main()
{
    arb_t x, y;
    arb_init(x);
    arb_init(y);

    for (slong prec : {100, 256})        // bits: about 30, then about 77 digits
    {
        arb_set_str(x, "1e-50", prec);   // a ball enclosing 10^-50
        arb_exp(y, x, prec);             // exp(10^-50)
        arb_sub_ui(y, y, 1, prec);       // exp(10^-50) - 1
        arb_printn(y, 10, 0);
        std::printf("\n");
    }

    arb_clear(x);
    arb_clear(y);
}
```

At 100 bits the output is a ball around 0 with a radius near $10^{-30}$, printed in a form like `[+/- 7.9e-31]` (the exact digits of the radius may differ): "the answer is somewhere within $10^{-30}$ of zero", which is true and admits that nothing is known yet. At 256 bits the ball is centred on about 1.000000000e-50 with a tiny radius, and those ten digits are proven.

### An undecidable comparison

```cpp
arb_t a, b;
arb_init(a);
arb_init(b);
arb_set_str(a, "[1 +/- 0.1]", 64);
arb_set_str(b, "[1.15 +/- 0.1]", 64);

std::printf("%d %d\n", arb_lt(a, b), arb_ge(a, b));   // 0 0: neither is proven

arb_clear(a);
arb_clear(b);
```

## Pitfalls

- **Reading false as "no".** A false comparison means "not proven" ([C4](#c4)). Branch on what was proven, and handle the third case, overlap, explicitly.
- **Testing equality.** Two balls can be proven unequal (disjoint) but almost never proven equal: that needs both to be exact, with radius 0. Use `arb_overlaps` or `arb_contains` for "could these be the same number?".
- **Digits versus bits.** Precision is in bits ([C8](#c8)). 30 digits need about 100 bits, not 30.
- **Long loops.** Each step adds a little radius. Over thousands of steps the ball can become too wide to prove anything, even when the true error is small ([C3](#c3)). Raise the precision, or reformulate to reduce the dependency problem ([C5](#c5)).

## Sources

- Learned while designing numerical evaluation for [Tante](https://github.com/thomaswening/Tante): [ADR-0003](https://github.com/thomaswening/Tante/blob/main/docs/adr/0003-flint-gmp-arb-behind-own-interfaces.md) and [REQ-101](https://github.com/thomaswening/Tante/blob/main/docs/requirements.md#req-101); Claude session on Tante, 16 October 2026.
- Fredrik Johansson, [Arb: Efficient Arbitrary-Precision Midpoint-Radius Interval Arithmetic](https://arxiv.org/abs/1611.02831), IEEE Transactions on Computers, 2017: the design of the library, with the arguments for midpoint–radius over lower–upper intervals.
- [FLINT documentation, `arb.h`](https://flintlib.org/doc/arb.html): the functions used above, including the exact meaning of each comparison.
