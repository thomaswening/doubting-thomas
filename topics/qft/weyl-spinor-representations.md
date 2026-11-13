---
title: Left- and right-handed Weyl spinors
area: qft
created: 2026-11-12
updated: 2026-11-13
prerequisites: [qft/sl2c-double-cover-of-the-lorentz-group]
related: []
projects: []
tags: [lorentz-group, sl2c, weyl-spinors, chirality, parity, spinor-helicity]
---

# Left- and right-handed Weyl spinors

## TL;DR

- **SL(2,ℂ) acts on $`\mathbb{C}^2`$ in two inequivalent ways.** A left-handed Weyl spinor transforms as $`\psi \mapsto A\psi`$, a right-handed one as $`\chi \mapsto (A^\dagger)^{-1}\chi`$. They are the $`(\tfrac12, 0)`$ and $`(0, \tfrac12)`$ representations.

- **Rotations can't tell them apart, boosts can.** For unitary $A$ the two rules agree. For a boost they scale the spinor in opposite directions.

- **The antisymmetric product $`\psi^T \varepsilon \chi = \psi_1\chi_2 - \psi_2\chi_1`$ is Lorentz invariant**, because $`A^T \varepsilon A = \varepsilon`$ for $`\det A = 1`$. This is the future angle bracket $`\langle ij \rangle`$.

- **Complex conjugation turns left into right**, up to $`\varepsilon`$. **Parity swaps them.** So QED, which respects parity, needs both: the Dirac spinor is a left-handed and a right-handed Weyl spinor stacked.

- **A four-vector is one left-handed and one right-handed index.** A light-like vector is a single spinor times its conjugate, $`P = \lambda\lambda^\dagger`$. That is the starting point of spinor helicity.

## Key claims

Conventions as in [SL(2,ℂ) as the double cover of the Lorentz group](sl2c-double-cover-of-the-lorentz-group.md): mostly-minus metric, $`X(x) = x^0 I + \mathbf{x} \cdot \boldsymbol{\sigma}`$, and $`\Lambda(A)`$ defined by $`X \mapsto AXA^\dagger`$. The antisymmetric matrix $`\varepsilon`$ is

```math
\varepsilon = \begin{pmatrix} 0 & 1 \\ -1 & 0 \end{pmatrix} .
```

- <a id="c1"></a>**C1.** $`\rho_L(A) = A`$ and $`\rho_R(A) = (A^\dagger)^{-1}`$ are both representations of SL(2,ℂ) on $`\mathbb{C}^2`$. A **left-handed Weyl spinor** is a $`\psi \in \mathbb{C}^2`$ that transforms as $`\psi \mapsto A\psi`$. A **right-handed Weyl spinor** is a $`\chi \in \mathbb{C}^2`$ that transforms as $`\chi \mapsto (A^\dagger)^{-1}\chi`$. For unitary $A$, $`\rho_L(A) = \rho_R(A)`$.

- <a id="c2"></a>**C2.** For every complex 2×2 matrix $M$,

  $`\displaystyle M^T \varepsilon M = (\det M)\, \varepsilon.`$

  Hence for $`A \in SL(2,\mathbb{C})`$, $`A^T \varepsilon A = \varepsilon`$. The antisymmetric bilinear form of two left-handed spinors

  $`\displaystyle \langle \psi, \phi \rangle = \psi^T \varepsilon \phi = \psi_1 \phi_2 - \psi_2 \phi_1`$

  is invariant. The same holds for two right-handed spinors, since $`(A^\dagger)^{-1}`$ also has determinant 1.

- <a id="c3"></a>**C3.** $`\varepsilon \bar{A} \varepsilon^{-1} = (A^\dagger)^{-1}`$ for $`A \in SL(2,\mathbb{C})`$. So $`\rho_R`$ is equivalent to the complex-conjugate representation $`A \mapsto \bar{A}`$. In particular, if $`\psi`$ is left-handed, then $`\varepsilon\bar{\psi}`$ is right-handed.

- <a id="c4"></a>**C4.** $`\rho_L`$ and $`\rho_R`$ are not equivalent: there is no invertible $S$ with $`S A S^{-1} = (A^\dagger)^{-1}`$ for all $A$. For example,

  $`\displaystyle A = \mathrm{diag}\Big(2i, \frac{1}{2i}\Big): \qquad \mathrm{tr} A = \frac{3i}{2}, \qquad \mathrm{tr}(A^\dagger)^{-1} = -\frac{3i}{2}.`$

- <a id="c5"></a>**C5.** Write group elements near $I$ as $`e^{-i\boldsymbol{\theta}\cdot\mathbf{J} - i\boldsymbol{\eta}\cdot\mathbf{K}}`$, with $`\mathbf{J}`$ generating rotations and $`\mathbf{K}`$ boosts as in [C7 of the previous note](sl2c-double-cover-of-the-lorentz-group.md#c7). The generators are

  $`\displaystyle \text{left-handed: } \mathbf{J} = \frac{\boldsymbol{\sigma}}{2},\ \mathbf{K} = \frac{i\boldsymbol{\sigma}}{2}; \qquad \text{right-handed: } \mathbf{J} = \frac{\boldsymbol{\sigma}}{2},\ \mathbf{K} = -\frac{i\boldsymbol{\sigma}}{2}.`$

  Define

  $`\displaystyle \mathbf{N} = \frac12(\mathbf{J} - i\mathbf{K}), \qquad \mathbf{N}^\dagger = \frac12(\mathbf{J} + i\mathbf{K}).`$

  The left-handed spinor has $`\mathbf{N} = \boldsymbol{\sigma}/2`$ and $`\mathbf{N}^\dagger = 0`$: spin ½ under the first SU(2), spin 0 under the second, the representation $`(\frac12, 0)`$. The right-handed spinor is $`(0, \frac12)`$.

- <a id="c6"></a>**C6.** Let $`P = \mathrm{diag}(1, -1, -1, -1)`$ be parity. Then for all $`A \in SL(2,\mathbb{C})`$

  $`\displaystyle P\,\Lambda(A)\,P = \Lambda\big((A^\dagger)^{-1}\big).`$

  Conjugating by parity exchanges $`\rho_L`$ and $`\rho_R`$, so a parity-invariant theory with a left-handed spinor must also contain a right-handed one. The Dirac spinor is the pair: the representation $`(\frac12, 0) \oplus (0, \frac12)`$.

- <a id="c7"></a>**C7.** A Hermitian 2×2 matrix $`X \ne 0`$ has $`\det X = 0`$ if and only if $`X = \pm\lambda\lambda^\dagger`$ for some $`\lambda \in \mathbb{C}^2`$. The sign is $+$ exactly when $x^0 > 0$. So every future-pointing light-like vector is $`X(p) = \lambda\lambda^\dagger`$, with $`\lambda`$ fixed up to a phase. If $`\lambda`$ transforms as a left-handed spinor, $`\lambda \mapsto A\lambda`$, then $`\lambda\lambda^\dagger \mapsto A\lambda\lambda^\dagger A^\dagger`$: the momentum transforms as a four-vector.

## Explanation

### Two ways to act on $`\mathbb{C}^2`$

The [previous note](sl2c-double-cover-of-the-lorentz-group.md#c9) ended with objects in $`\mathbb{C}^2`$ on which SL(2,ℂ) acts by $`\psi \mapsto A\psi`$. That is the most direct choice. Is it the only one?

**Definition (representation).** A representation of a group $G$ on a vector space $V$ is a map $`\rho: G \to GL(V)`$ with $`\rho(gh) = \rho(g)\rho(h)`$. Two representations $`\rho, \rho'`$ on $V$ are **equivalent** if there is an invertible $S$ with $`\rho'(g) = S\rho(g)S^{-1}`$ for all $g$, that is, if they differ only by a change of basis.

In .NET terms: a representation is an implementation of an interface "act on $V$" for each group element, consistent with composition. Equivalent representations are the same implementation behind a different coordinate system.

There is a second natural choice ([C1](#c1)): $`\chi \mapsto (A^\dagger)^{-1}\chi`$. It is a representation because

```math
\big((AB)^\dagger\big)^{-1} = (B^\dagger A^\dagger)^{-1} = (A^\dagger)^{-1}(B^\dagger)^{-1} .
```

The inverse puts the factors back in the right order after the dagger reversed them.

**Why this second choice?** Because the pair $`(\psi, \chi)`$ then has a natural invariant: $`\chi^\dagger\psi \mapsto \chi^\dagger A^{-1} A \psi = \chi^\dagger\psi`$. A right-handed spinor is exactly what can be paired with a left-handed one by $`\chi^\dagger\psi`$ without changing under Lorentz transformations. This pairing is what the mass term of the Dirac Lagrangian is built from.

**What does it look like for rotations?** For unitary $A$, $`(A^\dagger)^{-1} = A`$. Both kinds of spinor rotate the same way, like a spin-½ state in quantum mechanics. **For a boost** $`A = e^{\eta\sigma_3/2}`$, which is Hermitian, $`(A^\dagger)^{-1} = e^{-\eta\sigma_3/2}`$. The left-handed spinor's upper component grows by $`e^{\eta/2}`$, the right-handed one's shrinks by the same factor. The two kinds differ only in how they respond to boosts.

### The invariant antisymmetric product

**Proposition ([C2](#c2)).** $`M^T\varepsilon M = (\det M)\,\varepsilon`$ for every 2×2 matrix $M$.

*Proof idea.* $`M^T\varepsilon M`$ is antisymmetric, so it is a multiple of $`\varepsilon`$, and the multiple is read off from one entry. Geometrically, $`\psi^T\varepsilon\phi = \psi_1\phi_2 - \psi_2\phi_1`$ is the determinant of the matrix with columns $`\psi`$ and $`\phi`$: the signed area of the parallelogram they span. A linear map scales signed areas by its determinant.

<details><summary>Proof</summary>

$`\psi^T\varepsilon\phi = \psi_1\phi_2 - \psi_2\phi_1 = \det(\psi \mid \phi)`$, the determinant of the matrix with columns $`\psi`$ and $`\phi`$. Then

$`\displaystyle (M\psi)^T\varepsilon(M\phi) = \det(M\psi \mid M\phi) = \det\big(M(\psi\mid\phi)\big) = \det M \cdot \det(\psi\mid\phi) = \det M \cdot \psi^T\varepsilon\phi .`$

Since this holds for all $`\psi, \phi`$, $`M^T\varepsilon M = (\det M)\varepsilon`$. For $`A \in SL(2,\mathbb{C})`$ the factor is 1. For the right-handed case, $`\det (A^\dagger)^{-1} = 1/\overline{\det A} = 1`$. ∎

</details>

So two spinors of the same kind have a Lorentz-invariant product. It is antisymmetric: $`\langle\psi,\psi\rangle = 0`$, and $`\langle\psi,\phi\rangle = -\langle\phi,\psi\rangle`$. Spinor helicity is built on exactly this. Given two massless momenta $`p_i`$ and $`p_j`$ with spinors $`\lambda_i, \lambda_j`$ ([C7](#c7)), the angle bracket $`\langle ij\rangle`$ is this invariant up to convention-dependent signs. The course note on spinor products will fix the convention.

Why antisymmetric and not a dot product like $`\psi^T\phi`$? Because $`\psi^T\phi`$ is only invariant under $A^TA = I$, the complex orthogonal matrices. Those are not SL(2,ℂ). The area form is invariant under every matrix of determinant 1, and nothing else is.

### Conjugation turns left into right

**Proposition ([C3](#c3)).** $`\varepsilon\bar{A}\varepsilon^{-1} = (A^\dagger)^{-1}`$.

*Proof idea.* Rearrange [C2](#c2) and take the complex conjugate.

<details><summary>Proof</summary>

From $`A^T\varepsilon A = \varepsilon`$: $`\varepsilon A = (A^T)^{-1}\varepsilon`$, so $`\varepsilon A\varepsilon^{-1} = (A^T)^{-1}`$. $`\varepsilon`$ is real, so conjugating gives $`\varepsilon\bar{A}\varepsilon^{-1} = (\bar{A}^T)^{-1} = (A^\dagger)^{-1}`$. For a left-handed $`\psi`$:

$`\displaystyle \varepsilon\bar{\psi} \mapsto \varepsilon\overline{A\psi} = \varepsilon\bar{A}\varepsilon^{-1}\,\varepsilon\bar{\psi} = (A^\dagger)^{-1}\varepsilon\bar{\psi} ,`$

so $`\varepsilon\bar{\psi}`$ is right-handed. ∎

</details>

So a right-handed spinor carries the same information as the complex conjugate of a left-handed one. In quantum field theory, this is why the Hermitian conjugate of a left-handed field is a right-handed field (Srednicki, eq. 34.11). In spinor helicity it is why, for real momenta, the square bracket $[ij]$ is the complex conjugate of $`\langle ij\rangle`$, up to a sign.

### Left and right are really different

**Proposition ([C4](#c4)).** $`\rho_L`$ and $`\rho_R`$ are not equivalent.

*Proof idea.* Equivalent representations have the same trace for every group element, since $`\mathrm{tr}(SAS^{-1}) = \mathrm{tr}A`$. For 2×2 matrices of determinant 1, $`\mathrm{tr}A^{-1} = \mathrm{tr}A`$, so $`\mathrm{tr}(A^\dagger)^{-1} = \overline{\mathrm{tr}A}`$. Any $A$ with non-real trace separates them.

<details><summary>Proof</summary>

Suppose $`SAS^{-1} = (A^\dagger)^{-1}`$ for all $`A \in SL(2,\mathbb{C})`$. Taking traces, $`\mathrm{tr}A = \mathrm{tr}(A^\dagger)^{-1}`$. For $ad - bc = 1$,

$`\displaystyle A = \begin{pmatrix} a & b \\ c & d\end{pmatrix} , \qquad A^{-1} = \begin{pmatrix} d & -b \\ -c & a\end{pmatrix} ,`$

so $`\mathrm{tr}A^{-1} = \mathrm{tr}A`$, and $`(A^\dagger)^{-1} = (A^{-1})^\dagger`$ has trace $`\overline{\mathrm{tr}A}`$. Then $`\mathrm{tr}A`$ would be real for every $A$. But

$`\displaystyle A = \mathrm{diag}\Big(2i, \frac{1}{2i}\Big) \quad \text{has} \quad \det A = 1 , \qquad \mathrm{tr}A = 2i - \frac{i}{2} = \frac{3i}{2} .`$

Contradiction. ∎

</details>

The counterexample is a boost combined with a rotation:

```math
\mathrm{diag}\Big(2i, \frac{1}{2i}\Big) = e^{\ln 2\,\sigma_3}\, e^{i\pi\sigma_3/2} .
```

For rotations alone the two representations are equal ([C1](#c1)), so no counterexample can come from SU(2).

### Generators and the $`(j_1, j_2)`$ labels

Physics books label representations of the Lorentz group by two spins, $`(j_1, j_2)`$. Here is where the labels come from, for the two cases at hand ([C5](#c5)).

A rotation by $`\theta`$ about $`\hat{n}`$ is $`A = e^{-i\theta\,\hat{n}\cdot\boldsymbol{\sigma}/2}`$, and a boost with rapidity $`\eta`$ along $`\hat{n}`$ is $`A = e^{\eta\,\hat{n}\cdot\boldsymbol{\sigma}/2}`$ ([previous note, C7](sl2c-double-cover-of-the-lorentz-group.md#c7)). Write both as $`e^{-i\theta\hat{n}\cdot\mathbf{J}}`$ and $`e^{-i\eta\hat{n}\cdot\mathbf{K}}`$. In $`\rho_L`$, comparing exponents gives $`\mathbf{J} = \boldsymbol{\sigma}/2`$ and $`\mathbf{K} = i\boldsymbol{\sigma}/2`$. In $`\rho_R`$, the boost becomes

```math
\big((e^{\eta\hat{n}\cdot\boldsymbol{\sigma}/2})^\dagger\big)^{-1} = e^{-\eta\hat{n}\cdot\boldsymbol{\sigma}/2} ,
```

so $`\mathbf{K} = -i\boldsymbol{\sigma}/2`$, while $`\mathbf{J}`$ is unchanged.

The matrices $`\mathbf{J}, \mathbf{K}`$ obey the commutation relations of the Lorentz algebra *(cited: Srednicki, eqs. 33.11–33.13)*:

```math
[J_i, J_j] = i\epsilon_{ijk}J_k, \qquad [J_i, K_j] = i\epsilon_{ijk}K_k, \qquad [K_i, K_j] = -i\epsilon_{ijk}J_k .
```

The minus sign in the last one says that two boosts in different directions combine into a rotation (Thomas precession). The relations mix $J$ and $K$. The combinations

```math
\mathbf{N} = \frac12(\mathbf{J} - i\mathbf{K}) , \qquad \mathbf{N}^\dagger = \frac12(\mathbf{J} + i\mathbf{K})
```

unmix them: each satisfies the angular momentum algebra, and they commute with each other *(cited: Srednicki, eqs. 33.16–33.20)*. So a representation of the Lorentz algebra is a pair of spins: $`j_1`$ for $`\mathbf{N}`$, $`j_2`$ for $`\mathbf{N}^\dagger`$. That every finite-dimensional irreducible representation arises this way is a theorem *(cited: Srednicki, ch. 33; Hall, ch. 4, for the representations of the Lie algebra of SL(2,ℂ))*.

For $`\rho_L`$:

```math
\mathbf{N} = \frac12\Big(\frac{\boldsymbol{\sigma}}{2} + \frac{\boldsymbol{\sigma}}{2}\Big) = \frac{\boldsymbol{\sigma}}{2} , \qquad \mathbf{N}^\dagger = 0 .
```

Spin ½ for $`\mathbf{N}`$, spin 0 for $`\mathbf{N}^\dagger`$: $`(\frac12, 0)`$. For $`\rho_R`$ it is the other way round: $`(0, \frac12)`$. Srednicki writes the same representations by their dimensions, $(2, 1)$ and $(1, 2)$, and calls $(2,1)$ left-handed (eq. 33.21). His generators on $(2,1)$, $`J = \sigma/2`$ and $`K = i\sigma/2`$ (eqs. 34.9, 34.10), match $`\rho_L`$ here.

Why call them left- and right-handed? For a massless particle, the field equation forces the spin of a $`(\frac12, 0)`$ particle to point against its momentum: negative helicity. Its antiparticle has positive helicity. That is shown in the course note on massless fermions, not here.

### Parity needs both

Parity $P$ flips space: $`(x^0, \mathbf{x}) \mapsto (x^0, -\mathbf{x})`$. It is a Lorentz transformation but not in $SO^+(1,3)$, since $`\det P = -1`$. So it has no preimage in SL(2,ℂ). What it does have is an action *on* SL(2,ℂ) ([C6](#c6)).

**Proposition.** $`P\,\Lambda(A)\,P = \Lambda\big((A^\dagger)^{-1}\big)`$.

*Proof idea.* Parity turns $`X = x^0 I + \mathbf{x}\cdot\boldsymbol{\sigma}`$ into $`x^0 I - \mathbf{x}\cdot\boldsymbol{\sigma} = (\mathrm{tr}X)I - X`$, which for 2×2 matrices is the adjugate $`\mathrm{adj}X`$, with $`X\mathrm{adj}X = \det X \cdot I`$. The adjugate reverses products and sends $A$ to $A^{-1}$ when $`\det A = 1`$.

<details><summary>Proof</summary>

For a 2×2 matrix $M$, the adjugate is

$`\displaystyle M = \begin{pmatrix} a & b \\ c & d\end{pmatrix} , \qquad \mathrm{adj}M = \begin{pmatrix} d & -b \\ -c & a\end{pmatrix} = (\mathrm{tr}M)I - M .`$

It satisfies $`\mathrm{adj}(MN) = \mathrm{adj}N\,\mathrm{adj}M`$, and $`\mathrm{adj}M = M^{-1}`$ when $`\det M = 1`$. Also $`\mathrm{adj}(M^\dagger) = (\mathrm{adj}M)^\dagger`$.

For Hermitian $X = X(x)$: $`\mathrm{adj}X = 2x^0 I - X = x^0 I - \mathbf{x}\cdot\boldsymbol{\sigma} = X(Px)`$. Then

$`\displaystyle X\big(P\Lambda(A)Px\big) = \mathrm{adj}\big(A\,X(Px)\,A^\dagger\big) = \mathrm{adj}(A^\dagger)\,\mathrm{adj}X(Px)\,\mathrm{adj}A = (A^\dagger)^{-1}\, X(x)\, A^{-1} .`$

With $`B = (A^\dagger)^{-1}`$, $`B^\dagger = A^{-1}`$, so the right-hand side is $`BX(x)B^\dagger = X(\Lambda(B)x)`$. ∎

</details>

In words: looking at a Lorentz transformation in a mirror is the same as replacing $A$ by $`(A^\dagger)^{-1}`$, which swaps the roles of $`\rho_L`$ and $`\rho_R`$. In the mirror, a left-handed spinor behaves like a right-handed one. A theory that is unchanged by the mirror, as QED is, must therefore contain both kinds with the same couplings. Stacking them gives the four-component Dirac spinor $`\Psi = (\psi_L, \psi_R)`$, on which $A$ acts as $`\mathrm{diag}\big(A, (A^\dagger)^{-1}\big)`$. In the chiral (Weyl) basis of the gamma matrices this block structure is visible directly. The weak interaction violates parity, and there the two halves couple differently.

### Four-vectors from two spinors

The vector rule $`X \mapsto AXA^\dagger`$ has an $A$ on the left and an $`A^\dagger`$ on the right. So $X$ behaves like a left-handed spinor times the conjugate transpose of another left-handed spinor: $`\psi\phi^\dagger \mapsto A\psi\phi^\dagger A^\dagger`$. In the $`(j_1, j_2)`$ labels, the vector is $`(\frac12, \frac12)`$: one index of each kind *(cited: Srednicki, eq. 33.21)*.

For a light-like vector, one spinor is enough ([C7](#c7)).

**Proposition.** A nonzero Hermitian 2×2 matrix $X$ has $`\det X = 0`$ if and only if $`X = \pm\lambda\lambda^\dagger`$, with $+$ exactly when $`x^0 = \frac12\mathrm{tr}X > 0`$.

*Proof idea.* A Hermitian matrix has real eigenvalues. Determinant 0 means one eigenvalue is 0. So $X$ is its other eigenvalue times the projector onto that eigenvector: a column times its conjugate.

<details><summary>Proof</summary>

$X$ is Hermitian, so

$`\displaystyle X = \mu_1 u_1u_1^\dagger + \mu_2 u_2u_2^\dagger`$

with real eigenvalues $`\mu_1, \mu_2`$ and orthonormal eigenvectors $`u_1, u_2`$ (spectral theorem, *cited*). $`\det X = \mu_1\mu_2 = 0`$ and $`X \ne 0`$ mean that exactly one eigenvalue, say $`\mu_1`$, is nonzero. Then $`X = \mu_1 u_1u_1^\dagger = \pm\lambda\lambda^\dagger`$ with $`\lambda = \sqrt{|\mu_1|}\,u_1`$ and the sign of $`\mu_1`$. Since $`\mathrm{tr}X = \mu_1 = 2x^0`$, the sign is the sign of $x^0$. Conversely, $`\lambda\lambda^\dagger`$ has rank at most 1, so its determinant is 0. If $`\lambda\lambda^\dagger = \lambda'\lambda'^\dagger`$, then $`\lambda' = e^{i\varphi}\lambda`$: both are eigenvectors for the only nonzero eigenvalue, with the same norm. ∎

</details>

This is the bridge to spinor helicity. A massless momentum $p$ with $p^0 > 0$ is $`X(p) = \lambda\lambda^\dagger`$. Its spinor $`\lambda`$ transforms as a left-handed spinor, and $`\varepsilon\bar{\lambda}`$ as a right-handed one ([C3](#c3)). Amplitudes can then be written in terms of the $`\lambda`$'s instead of the momenta. The phase of $`\lambda`$ is not fixed by $p$: that freedom is the little-group scaling of the course.

## Examples

**Boosting both kinds.** Take $`\psi = \chi = (1, 1)^T`$ and the $z$-boost $`A = e^{\eta\sigma_3/2}`$ with $`\eta = \ln 4`$, so $`e^{\eta/2} = 2`$. Then $`A\psi = (2, \frac12)^T`$, while $`(A^\dagger)^{-1}\chi = A^{-1}\chi = (\frac12, 2)^T`$. The same boost scales the two kinds in opposite directions ([C1](#c1)).

**The invariant product, computed.** $`\psi = (1, 0)^T`$ and $`\phi = (0, 1)^T`$ give $`\langle\psi,\phi\rangle = 1 \cdot 1 - 0 \cdot 0 = 1`$. After the boost above, $`A\psi = (2, 0)^T`$ and $`A\phi = (0, \frac12)^T`$, so $`\langle A\psi, A\phi\rangle = 2 \cdot \frac12 - 0 = 1`$. Unchanged ([C2](#c2)).

**A massless momentum as a spinor.** $p = (E, 0, 0, E)$ gives $`X(p) = \mathrm{diag}(2E, 0) = \lambda\lambda^\dagger`$ with $`\lambda = (\sqrt{2E}, 0)^T`$. For $p = (E, 0, 0, -E)$, $`X(p) = \mathrm{diag}(0, 2E)`$ and $`\lambda = (0, \sqrt{2E})^T`$. The invariant product of the two is $`\sqrt{2E}\cdot\sqrt{2E} - 0 = 2E`$, and $`|2E|^2 = 4E^2 = (p_1 + p_2)^2`$, the squared centre-of-mass energy. This is the first instance of $`|\langle ij\rangle|^2 = |s_{ij}|`$ ([C2](#c2), [C7](#c7)).

## Pitfalls

- **Pairing two left-handed spinors by $`\chi^\dagger\psi`$.** This product is not invariant: $`\chi^\dagger\psi \mapsto \chi^\dagger A^\dagger A\psi`$, and $`A^\dagger A \ne I`$ for a boost. The invariant pairings are $`\psi^T\varepsilon\phi`$ for two of the same kind ([C2](#c2)) and $`\chi^\dagger\psi`$ for one of each kind ([C1](#c1)).

- **"Left and right differ by a rotation of basis."** They don't: no change of basis turns one into the other ([C4](#c4)). Only complex conjugation does ([C3](#c3)), which is not a linear change of basis.

- **Sign conventions for $`\varepsilon`$.** Books differ on whether $`\varepsilon^{12}`$ or $`\varepsilon_{12}`$ is $+1$, and on whether indices are contracted with the first or second index of $`\varepsilon`$. Srednicki sets $`\varepsilon^{12} = \varepsilon_{21} = +1`$ and contracts with the second index (eq. 35.1). This note uses the matrix $`\varepsilon`$ only and avoids index positions. Spinor-helicity signs such as $`\langle ij\rangle[ji] = \pm s_{ij}`$ trace back to this choice.

- **$`\mathbf{N}`$ and $`\mathbf{N}^\dagger`$ are not Hermitian conjugates of each other as matrices in a given representation.** In $`\rho_L`$, $`\mathbf{N} = \boldsymbol{\sigma}/2`$ but $`\mathbf{N}^\dagger = 0`$. The names refer to the operators in a unitary representation of the full theory, where boosts are Hermitian. On finite-dimensional spinors, the boost generators $`\pm i\boldsymbol{\sigma}/2`$ are anti-Hermitian.

## Exercises

1. **Which is which?** A two-component object transforms under the $z$-boost $`e^{\eta\sigma_3/2}`$ as $`(\chi_1, \chi_2) \mapsto (e^{-\eta/2}\chi_1, e^{\eta/2}\chi_2)`$. Left- or right-handed? Practises [C1](#c1).

   <details><summary>Solution</summary>

   Right-handed: $`(A^\dagger)^{-1} = e^{-\eta\sigma_3/2} = \mathrm{diag}(e^{-\eta/2}, e^{\eta/2})`$ ([C1](#c1)).

   </details>

2. **Prove [C2](#c2) by components.** Compute $`M^T\varepsilon M`$ for $`M = \begin{pmatrix} a & b \\ c & d\end{pmatrix}`$ directly.

   <details><summary>Solution</summary>

   $`\displaystyle \varepsilon M = \begin{pmatrix} c & d \\ -a & -b\end{pmatrix},`$

   $`\displaystyle M^T\varepsilon M = \begin{pmatrix} a & c \\ b & d\end{pmatrix}\begin{pmatrix} c & d \\ -a & -b\end{pmatrix} = \begin{pmatrix} 0 & ad - bc \\ bc - ad & 0\end{pmatrix} = (\det M)\,\varepsilon.`$

   </details>

3. **Why do rotations not suffice?** Explain in two sentences why the proof of [C4](#c4) needs a matrix that is not unitary.

   <details><summary>Solution</summary>

   For unitary $A$, $`(A^\dagger)^{-1} = A`$, so the two representations agree on SU(2) and any test built from rotations alone finds no difference ([C1](#c1)). Only a boost, or a boost combined with a rotation, gives a non-real trace ([C4](#c4)).

   </details>

4. **Parity and the generators.** Using [C5](#c5), show that replacing $`\mathbf{K}`$ by $`-\mathbf{K}`$ turns the left-handed generators into the right-handed ones. Why does this match parity, which flips $`\mathbf{x}`$ and so flips the direction of a boost but not of a rotation? Practises [C5](#c5), [C6](#c6).

   <details><summary>Solution</summary>

   Left-handed, and with $`\mathbf{K}`$ flipped:

   $`\displaystyle (\mathbf{J}, \mathbf{K}) = \Big(\frac{\boldsymbol{\sigma}}{2}, \frac{i\boldsymbol{\sigma}}{2}\Big) \ \longrightarrow\ \Big(\frac{\boldsymbol{\sigma}}{2}, -\frac{i\boldsymbol{\sigma}}{2}\Big).`$

   The result is the right-handed generators. Under parity, a boost along $`\hat{n}`$ becomes a boost along $`-\hat{n}`$, so $`\mathbf{K} \to -\mathbf{K}`$. A rotation about $`\hat{n}`$ stays a rotation about $`\hat{n}`$, because angular momentum is an axial vector, so $`\mathbf{J} \to \mathbf{J}`$. This is [C6](#c6) at the level of generators.

   </details>

5. **A second light-like vector.** Find $`\lambda`$ with $`\lambda\lambda^\dagger = X(p)`$ for $p = (E, E, 0, 0)$. Practises [C7](#c7).

   <details><summary>Solution</summary>

   $`\displaystyle X(p) = E(I + \sigma_1) = E\begin{pmatrix} 1 & 1 \\ 1 & 1\end{pmatrix} = \lambda\lambda^\dagger`$

   with $`\lambda = \sqrt{E}\,(1, 1)^T`$, up to a phase.

   </details>

## Sources

- Claude session on the spinor-helicity course, 2026-11-12.
- Mark Srednicki, *Quantum Field Theory* (Cambridge, 2007): chapter 33 (eqs. 33.11–33.21: Lorentz algebra, $N$ and $`N^\dagger`$, the $(2,1)$ and $(1,2)$ representations); chapter 34 (eqs. 34.9–34.11: left-handed generators, hermitian conjugation swaps left and right); chapter 35 (eq. 35.1: the $`\varepsilon`$ symbols). Srednicki uses index notation and the mostly-plus metric.
- Matthew D. Schwartz, *Quantum Field Theory and the Standard Model* (Cambridge, 2014), chapter 10, "Spinors", for the same representations in mostly-minus conventions and the Dirac spinor as a Weyl pair.
- Brian C. Hall, *Lie Groups, Lie Algebras, and Representations* (2nd ed., Springer, 2015), chapter 4, for the classification of the finite-dimensional representations of the Lie algebra of SL(2,ℂ).
- H. K. Dreiner, H. E. Haber, S. P. Martin, [arXiv:0812.1594](https://arxiv.org/abs/0812.1594), section 2, for the same structure in dotted and undotted index notation.
