---
title: SL(2,ℂ) as the double cover of the Lorentz group
area: qft
created: 2026-11-12
updated: 2026-11-12
prerequisites: []
related: [qft/weyl-spinor-representations]
projects: []
tags: [lorentz-group, sl2c, su2, double-cover, spinors, spinor-helicity]
---

# SL(2,ℂ) as the double cover of the Lorentz group

## TL;DR

- **A four-vector is a Hermitian 2×2 matrix.** Write $x = (x^0, \vec x)$ as $X = x^0 I + \vec x \cdot \vec\sigma$. Then $\det X = (x^0)^2 - |\vec x|^2$ is the Minkowski square of $x$.
- **A complex 2×2 matrix with determinant 1 acts on it by $X \mapsto A X A^\dagger$.** The result is again Hermitian with the same determinant. So every $A \in SL(2,\mathbb{C})$ gives a Lorentz transformation $\Lambda(A)$.
- **The map $A \mapsto \Lambda(A)$ respects multiplication, hits every proper orthochronous Lorentz transformation, and sends exactly $A$ and $-A$ to the same one.** So $SO^+(1,3) \cong SL(2,\mathbb{C})/\{\pm I\}$ as groups.
- **Unitary $A$ give rotations, Hermitian $A$ give boosts.** $e^{-i\theta\sigma_3/2}$ rotates by $\theta$ about $z$. $e^{\eta\sigma_3/2}$ boosts along $z$ with rapidity $\eta$.
- **The rotation by $2\pi$ is $-I$ in SL(2,ℂ).** It is the identity on four-vectors but flips the sign of anything on which $A$ acts directly. Those objects are spinors, the subject of the [next note](weyl-spinor-representations.md).

## Key claims

Conventions: the metric is mostly minus, $x \cdot y = x^0 y^0 - \vec x \cdot \vec y$, as in Schwartz. $\sigma_1, \sigma_2, \sigma_3$ are the Pauli matrices and $\sigma_0 = I$.

- <a id="c1"></a>**C1.** The map $x \mapsto X(x) = x^0 I + x^1\sigma_1 + x^2\sigma_2 + x^3\sigma_3$ is a real-linear bijection from $\mathbb{R}^4$ to the Hermitian 2×2 matrices. Its inverse is $x^\mu = \frac12 \mathrm{tr}(\sigma_\mu X)$.
- <a id="c2"></a>**C2.** $\det X(x) = (x^0)^2 - |\vec x|^2 = x \cdot x$.
- <a id="c3"></a>**C3.** For $A \in SL(2,\mathbb{C})$, the map $X \mapsto A X A^\dagger$ sends Hermitian matrices to Hermitian matrices and keeps the determinant. It therefore defines a real-linear map $\Lambda(A)$ on $\mathbb{R}^4$ with $\Lambda(A)x \cdot \Lambda(A)x = x \cdot x$, that is a Lorentz transformation. Its matrix is $`\Lambda(A)^\mu{}_\nu = \frac12 \mathrm{tr}(\sigma_\mu A \sigma_\nu A^\dagger)`$.
- <a id="c4"></a>**C4.** $\Lambda(AB) = \Lambda(A)\Lambda(B)$ and $\Lambda(I) = 1$: the map $\Lambda : SL(2,\mathbb{C}) \to O(1,3)$ is a group homomorphism. It is continuous, since its entries are polynomials in the entries of $A$ and $\bar A$.
- <a id="c5"></a>**C5.** Every $\Lambda(A)$ is proper and orthochronous: $`\Lambda(A)^0{}_0 = \frac12 \mathrm{tr}(A A^\dagger) \ge 1`$, and $\det \Lambda(A) = 1$.
- <a id="c6"></a>**C6.** $\Lambda(A) = 1$ exactly for $A = \pm I$. Hence $\Lambda(A) = \Lambda(B)$ exactly when $B = \pm A$.
- <a id="c7"></a>**C7.** $\Lambda(e^{-i\theta\sigma_3/2})$ is the rotation by $\theta$ about the $z$-axis, and $\Lambda(e^{-i\theta\sigma_2/2})$ the rotation by $\theta$ about the $y$-axis. $\Lambda(e^{\eta\sigma_3/2})$ is the boost along $+z$ with rapidity $\eta$: $x^0 \pm x^3 \mapsto e^{\pm\eta}(x^0 \pm x^3)$. For unitary $A$, $\Lambda(A)$ fixes $x^0$ and is a rotation, so $\Lambda$ restricts to a homomorphism $SU(2) \to SO(3)$.
- <a id="c8"></a>**C8.** $\Lambda$ maps $SL(2,\mathbb{C})$ onto the proper orthochronous Lorentz group $SO^+(1,3)$. Together with [C4](#c4) and [C6](#c6): $SO^+(1,3) \cong SL(2,\mathbb{C})/\{\pm I\}$ as groups, and SL(2,ℂ) is a double cover of $SO^+(1,3)$.
- <a id="c9"></a>**C9.** The path $A(t) = e^{-it\sigma_3/2}$, $t \in [0, 2\pi]$, runs from $I$ to $A(2\pi) = -I$. Its image $\Lambda(A(t))$ is the full rotation about $z$, a closed loop in $SO^+(1,3)$. So a vector $\psi \in \mathbb{C}^2$ on which $A$ acts as $\psi \mapsto A\psi$ returns as $-\psi$ after a $2\pi$ rotation.

## Explanation

### Why look for a second group at all

The Lorentz group acts on four-vectors. The Dirac equation needs more: objects that transform under Lorentz transformations but change sign under a rotation by $2\pi$. No representation of $SO^+(1,3)$ itself can do that, because the $2\pi$ rotation *is* the identity there. The way out is a bigger group that maps onto the Lorentz group, two elements to one, so that the signs $+$ and $-$ survive upstairs. That group is SL(2,ℂ), the complex 2×2 matrices with determinant 1. This note builds the map. The [next note](weyl-spinor-representations.md) builds the spinors that live on SL(2,ℂ).

Rotations alone show the same pattern one level down, with SU(2) and SO(3). This note contains that case: restrict everything to unitary $A$ ([C7](#c7)).

### Four-vectors as Hermitian matrices

**Definition (the matrix of a four-vector).** For $x = (x^0, x^1, x^2, x^3) \in \mathbb{R}^4$, let

```math
X(x) = x^0 I + x^1 \sigma_1 + x^2 \sigma_2 + x^3 \sigma_3
     = \begin{pmatrix} x^0 + x^3 & x^1 - i x^2 \\ x^1 + i x^2 & x^0 - x^3 \end{pmatrix} .
```

In words: the time component sits on the diagonal as the average, $z$ as the difference of the diagonal entries, and $x$ and $y$ as the real and imaginary parts off the diagonal. The matrix is Hermitian, $X^\dagger = X$, because the diagonal is real and the off-diagonal entries are complex conjugates of each other.

Every Hermitian 2×2 matrix arises this way, exactly once ([C1](#c1)). A Hermitian 2×2 matrix has two real diagonal entries and one complex off-diagonal entry: four real numbers, matching $x^0, \dots, x^3$. To read them back, use $\mathrm{tr}(\sigma_\mu \sigma_\nu) = 2\delta_{\mu\nu}$ for $\mu, \nu \in \{0, 1, 2, 3\}$ with $\sigma_0 = I$. Multiplying $X$ by $\sigma_\mu$ and taking half the trace picks out $x^\mu$.

The determinant is the Minkowski square ([C2](#c2)):

```math
\det X = (x^0 + x^3)(x^0 - x^3) - (x^1 - i x^2)(x^1 + i x^2) = (x^0)^2 - (x^3)^2 - (x^1)^2 - (x^2)^2 .
```

This is the whole trick. Matrix multiplication keeps determinants under control, and the determinant here *is* the quantity that Lorentz transformations keep.

Two cases to picture:

- $x = (1, 0, 0, 0)$, a particle at rest: $X = I$, with $\det X = 1$.
- $x = (E, 0, 0, E)$, a massless particle moving along $z$: $X = \mathrm{diag}(2E, 0)$, with $\det X = 0$. The matrix of a light-like vector has rank 1. This observation is the seed of spinor helicity: a rank-1 matrix is a column times a row, so a light-like momentum factorises into two spinors ([next note, C7](weyl-spinor-representations.md#c7)).

### SL(2,ℂ) acts on four-vectors

**Definition.** $SL(2,\mathbb{C}) = \{ A \in \mathbb{C}^{2 \times 2} : \det A = 1 \}$, a group under matrix multiplication.

**Proposition ([C3](#c3)).** For $A \in SL(2,\mathbb{C})$, $X \mapsto A X A^\dagger$ maps Hermitian matrices to Hermitian matrices of the same determinant.

*Proof idea.* $(AXA^\dagger)^\dagger = A X^\dagger A^\dagger$, and determinants multiply.

<details><summary>Proof</summary>

Let $X$ be Hermitian. Then $(A X A^\dagger)^\dagger = (A^\dagger)^\dagger X^\dagger A^\dagger = A X A^\dagger$, so $AXA^\dagger$ is Hermitian. Its determinant is

```math
\det(A X A^\dagger) = \det A \cdot \det X \cdot \det A^\dagger = \det A \cdot \det X \cdot \overline{\det A} = |\det A|^2 \det X = \det X ,
```

since $\det A = 1$. The map is real-linear in $X$. By [C1](#c1), it defines a real-linear map $\Lambda(A)$ on $\mathbb{R}^4$ through $X(\Lambda(A) x) = A X(x) A^\dagger$. By [C2](#c2), $\Lambda(A)x \cdot \Lambda(A)x = \det(A X A^\dagger) = \det X = x \cdot x$. A linear map that keeps $x \cdot x$ for all $x$ keeps $x \cdot y$ for all $x, y$, by the polarisation identity $x \cdot y = \frac14[(x+y)\cdot(x+y) - (x-y)\cdot(x-y)]$, so $\Lambda(A) \in O(1,3)$. The matrix entries follow from the inverse in [C1](#c1): $`\Lambda(A)^\mu{}_\nu`$ is component $\mu$ of the image of the basis vector $e_\nu$, whose matrix is $\sigma_\nu$. That is $\frac12 \mathrm{tr}(\sigma_\mu A \sigma_\nu A^\dagger)$. ∎

</details>

**Why determinant 1 and not something simpler?** Only $|\det A| = 1$ is needed to keep $\det X$. But $A$ and $e^{i\varphi} A$ give the same map, since the phases cancel in $A X A^\dagger$. Fixing $\det A = 1$ removes this redundant phase, except for one leftover sign: $\det(-A) = \det A$ for 2×2 matrices. That leftover sign is the "double" in double cover ([C6](#c6)).

**Proposition ([C4](#c4)).** $\Lambda(AB) = \Lambda(A)\Lambda(B)$.

*Proof idea.* Acting with $B$ and then with $A$ gives $A(BXB^\dagger)A^\dagger = (AB)X(AB)^\dagger$.

<details><summary>Proof</summary>

$X(\Lambda(A)\Lambda(B)x) = A\, X(\Lambda(B)x)\, A^\dagger = A B X(x) B^\dagger A^\dagger = (AB) X(x) (AB)^\dagger = X(\Lambda(AB)x)$. Since $X(\cdot)$ is a bijection ([C1](#c1)), $\Lambda(A)\Lambda(B)x = \Lambda(AB)x$ for every $x$. $\Lambda(I) = 1$ because $I X I^\dagger = X$. Continuity: by [C3](#c3), each entry of $\Lambda(A)$ is a sum of products of one entry of $A$ and one entry of $\bar A$. ∎

</details>

### Which Lorentz transformations come out

The Lorentz group $O(1,3)$ has four pieces. A transformation can reverse time or not (the sign of $`\Lambda^0{}_0`$), and it can reverse orientation or not (the sign of $\det \Lambda$). The proper orthochronous piece $SO^+(1,3)$, with $`\Lambda^0{}_0 \ge 1`$ and $\det\Lambda = 1$, is the one connected to the identity: rotations, boosts and their products.

**Proposition ([C5](#c5)).** $\Lambda(A) \in SO^+(1,3)$ for every $A \in SL(2,\mathbb{C})$.

*Proof idea.* For the time direction, compute $`\Lambda^0{}_0`$ directly. For the orientation, use continuity: $\det\Lambda(A)$ is $\pm 1$, it is $+1$ at $A = I$, and SL(2,ℂ) is connected, so it cannot jump to $-1$.

<details><summary>Proof</summary>

*Time direction.* By [C3](#c3) with $\mu = \nu = 0$, $`\Lambda(A)^0{}_0 = \frac12 \mathrm{tr}(A A^\dagger) = \frac12(|a|^2 + |b|^2 + |c|^2 + |d|^2)`$ for $`A = \begin{pmatrix} a & b \\ c & d\end{pmatrix}`$. Since $1 = |ad - bc| \le |a||d| + |b||c| \le \frac12(|a|^2 + |d|^2) + \frac12(|b|^2 + |c|^2)$, using $uv \le \frac12(u^2 + v^2)$, we get $`\Lambda(A)^0{}_0 \ge 1`$.

*Orientation.* $\Lambda(A) \in O(1,3)$ ([C3](#c3)), so $\det \Lambda(A) = \pm 1$, because $\Lambda^T g \Lambda = g$ gives $(\det\Lambda)^2 = 1$. The function $A \mapsto \det\Lambda(A)$ is continuous ([C4](#c4)). SL(2,ℂ) is path-connected: by the polar decomposition *(cited)*, every $A \in SL(2,\mathbb{C})$ is $A = U e^{H}$ with $U \in SU(2)$ and $H$ Hermitian and traceless. The path $t \mapsto U e^{tH}$ connects $U$ to $A$ inside SL(2,ℂ), since $\det e^{tH} = e^{t \mathrm{tr} H} = 1$. SU(2) is the 3-sphere and is path-connected *(cited)*, so $U$ connects to $I$. A continuous function with values in $\{+1, -1\}$ on a path-connected space is constant. At $A = I$ it is $\det 1 = 1$. ∎

</details>

**Proposition ([C6](#c6)).** $\Lambda(A) = 1$ exactly for $A = \pm I$.

*Proof idea.* If $A X A^\dagger = X$ for every Hermitian $X$, take $X = I$: $A$ must be unitary. Then $A$ commutes with every Pauli matrix, so it is a multiple of $I$, and $\det A = 1$ leaves $\pm I$.

<details><summary>Proof</summary>

Suppose $AXA^\dagger = X$ for all Hermitian $X$. With $X = I$: $AA^\dagger = I$, so $A^\dagger = A^{-1}$, and the condition becomes $A X A^{-1} = X$, that is $AX = XA$. With $X = \sigma_3$: $A$ commutes with $\mathrm{diag}(1,-1)$, which forces $A$ to be diagonal. With $X = \sigma_1$: a diagonal $A = \mathrm{diag}(a, d)$ commutes with $\sigma_1$ only if $a = d$. So $A = aI$, and $\det A = a^2 = 1$ gives $a = \pm 1$. Conversely $(\pm I) X (\pm I)^\dagger = X$.

For the second statement: $\Lambda(A) = \Lambda(B)$ means $\Lambda(B^{-1}A) = 1$ by [C4](#c4), so $B^{-1}A = \pm I$. ∎

</details>

### Rotations and boosts

Now compute what specific matrices do ([C7](#c7)). Take $A = e^{-i\theta\sigma_3/2} = \mathrm{diag}(e^{-i\theta/2}, e^{i\theta/2})$. Then $A^\dagger = \mathrm{diag}(e^{i\theta/2}, e^{-i\theta/2})$, and multiplying out:

```math
A X A^\dagger = \begin{pmatrix} x^0 + x^3 & e^{-i\theta}(x^1 - i x^2) \\ e^{i\theta}(x^1 + i x^2) & x^0 - x^3 \end{pmatrix} .
```

The diagonal is untouched, so $x^0$ and $x^3$ stay. The combination $x^1 + i x^2$ is multiplied by $e^{i\theta}$: in the $xy$-plane, the point $(x^1, x^2)$ turns counterclockwise by $\theta$. That is the rotation by $\theta$ about $z$.

Now take $A = e^{\eta\sigma_3/2} = \mathrm{diag}(e^{\eta/2}, e^{-\eta/2})$, which is Hermitian, not unitary. Then

```math
A X A^\dagger = \begin{pmatrix} e^{\eta}(x^0 + x^3) & x^1 - i x^2 \\ x^1 + i x^2 & e^{-\eta}(x^0 - x^3) \end{pmatrix} .
```

The light-cone coordinates $x^0 \pm x^3$ are scaled by $e^{\pm\eta}$, and $x^1, x^2$ stay. That is a boost along $+z$ with rapidity $\eta$: the rest vector $(1, 0, 0, 0)$ goes to $(\cosh\eta, 0, 0, \sinh\eta)$.

The pattern holds in general. A unitary $A$ keeps $\mathrm{tr} X = 2x^0$, because $\mathrm{tr}(AXA^{-1}) = \mathrm{tr}X$, so $\Lambda(A)$ fixes time and is a rotation. Restricted to SU(2), $\Lambda$ is therefore a homomorphism onto rotations. The topological picture of this map, with SU(2) as the 3-sphere, is in the open pull request [doubting-thomas#40](https://github.com/thomaswening/doubting-thomas/pull/40). That pull request leaves $p(UV) = p(U)p(V)$ open. [C4](#c4) supplies it.

### Every proper orthochronous Lorentz transformation is reached

**Theorem ([C8](#c8)).** $\Lambda(SL(2,\mathbb{C})) = SO^+(1,3)$.

*Proof idea.* A Lorentz transformation is fixed by where it sends the time axis plus a rotation. A rotation and a $z$-boost can move the time axis anywhere on the future unit hyperboloid. What is left fixes the time axis, so it is a rotation. All rotations are reached by [C7](#c7) and Euler angles.

<details><summary>Proof</summary>

*Step 1: all rotations are in the image.* By [C7](#c7), rotations about $z$ and about $y$ by any angle are in the image. Every rotation is a product $R_z(\alpha) R_y(\beta) R_z(\gamma)$ by Euler's angle decomposition *(cited)*. The image of a homomorphism is closed under products ([C4](#c4)), so every rotation is in the image.

*Step 2: decomposition.* Let $\Lambda \in SO^+(1,3)$ and $u = \Lambda e_0$, where $e_0 = (1, 0, 0, 0)$. Then $u \cdot u = 1$ and $u^0 \ge 1$, so $u = (\cosh\eta, \sinh\eta\, \hat n)$ for some $\eta \ge 0$ and unit vector $\hat n$. Choose a rotation $R$ with $R\hat z = \hat n$ (step 1), and let $B$ be the $z$-boost with rapidity $\eta$ ([C7](#c7)). Then $RB e_0 = R(\cosh\eta, 0, 0, \sinh\eta) = u$. So $R' = (RB)^{-1}\Lambda$ fixes $e_0$. A Lorentz transformation that fixes $e_0$ maps the orthogonal complement $\{x^0 = 0\}$ to itself and keeps $|\vec x|^2$ there, so it is an orthogonal transformation of space. It has $\det R' = 1$, because $\det\Lambda = \det R = \det B = 1$. So $R'$ is a rotation, and $\Lambda = R B R'$.

*Step 3.* $R$, $B$ and $R'$ are in the image (steps 1 and 2, [C7](#c7)), and so is their product. ∎

</details>

So $\Lambda$ is a surjective homomorphism with kernel $\{\pm I\}$ ([C6](#c6)). By the first isomorphism theorem for groups *(cited)*, $SL(2,\mathbb{C})/\{\pm I\} \cong SO^+(1,3)$. "Double cover" means: two elements upstairs, $A$ and $-A$, for each Lorentz transformation downstairs, with the map continuous.

SL(2,ℂ) is moreover simply connected: by the polar decomposition, it is homeomorphic to $SU(2) \times \mathbb{R}^3 \cong S^3 \times \mathbb{R}^3$ *(cited)*. That makes it *the* universal cover of $SO^+(1,3)$. Nothing in the spinor-helicity course depends on this.

### The 2π rotation

Follow $A(t) = e^{-it\sigma_3/2}$ from $t = 0$ to $t = 2\pi$ ([C9](#c9)). Downstairs, $\Lambda(A(t))$ is the rotation by $t$ about $z$ ([C7](#c7)), which returns to the identity at $t = 2\pi$. Upstairs, $A(2\pi) = \mathrm{diag}(e^{-i\pi}, e^{i\pi}) = -I$. The path does not close.

On four-vectors this makes no difference, since $-I$ and $I$ act the same ([C6](#c6)). But a two-component object $\psi \in \mathbb{C}^2$ on which $A$ acts as $\psi \mapsto A\psi$ notices: it returns as $-\psi$. Such objects are spinors. They are not functions of the Lorentz transformation $\Lambda$, only of $A$, which is why the physics of spin-½ needs SL(2,ℂ) and not just $SO^+(1,3)$.

## Examples

**A boost, computed.** Take $A = e^{\eta\sigma_3/2}$ with $\eta = 0.4$ and the vector $x = (1, 0, 0, 0)$. Then $X = I$ and $A X A^\dagger = A^2 = \mathrm{diag}(e^{0.4}, e^{-0.4})$. Reading off with [C1](#c1): $x'^0 = \frac12(e^{0.4} + e^{-0.4}) = \cosh 0.4 \approx 1.0811$ and $x'^3 = \frac12(e^{0.4} - e^{-0.4}) = \sinh 0.4 \approx 0.4108$. Check: $\cosh^2 - \sinh^2 = 1$, as [C2](#c2) requires.

**Two matrices, one rotation.** $e^{-i\theta\sigma_3/2}$ and $-e^{-i\theta\sigma_3/2} = e^{-i(\theta + 2\pi)\sigma_3/2}$ both rotate by $\theta$ about $z$: the second is the rotation by $\theta + 2\pi$, which is the same rotation ([C6](#c6)).

**A light-like vector.** $p = (E, 0, 0, E)$ has $`P = \mathrm{diag}(2E, 0) = \begin{pmatrix}\sqrt{2E} \\ 0\end{pmatrix}\begin{pmatrix}\sqrt{2E} & 0\end{pmatrix}`$, a column times its conjugate transpose. Under $A$, $P \mapsto A P A^\dagger = (A\lambda)(A\lambda)^\dagger$ with $\lambda = (\sqrt{2E}, 0)^T$. So the momentum transforms because the spinor $\lambda$ does.

## Pitfalls

- **"SL(2,ℂ) is the Lorentz group."** It is not. It is twice as large: $A$ and $-A$ are different elements with the same Lorentz transformation ([C6](#c6)).
- **"Unitary means Lorentz."** Only unitary $A$ give rotations ([C7](#c7)). Boosts come from Hermitian $A$, which are not unitary. This is why the spinor representations of the Lorentz group cannot be unitary, unlike those of the rotation group.
- **Confusing $A X A^\dagger$ with $A X A^{-1}$.** For unitary $A$ they agree. For a boost they do not, and $A X A^{-1}$ would not keep $X$ Hermitian.
- **Forgetting that $\det(-A) = \det A$ only in even dimension.** For 2×2 matrices it holds, which is why the kernel is $\{\pm I\}$ and not just $\{I\}$.

## Exercises

1. **Read off.** Write the matrix $X$ of $x = (2, 1, 0, 1)$ and compute $\det X$. Is $x$ time-like, space-like or light-like? Practises [C1](#c1), [C2](#c2).

   <details><summary>Solution</summary>

   $`X = \begin{pmatrix} 3 & 1 \\ 1 & 1\end{pmatrix}`$, $\det X = 3 - 1 = 2 = 4 - 1 - 0 - 1$. Positive, so time-like ([C2](#c2)).

   </details>

2. **Which condition fails?** Let $A = 2I$. Does $X \mapsto AXA^\dagger$ give a Lorentz transformation? Practises [C3](#c3).

   <details><summary>Solution</summary>

   No. $AXA^\dagger = 4X$, and $\det(4X) = 16 \det X$. The determinant condition $\det A = 1$, or at least $|\det A| = 1$, is what keeps $x \cdot x$ ([C3](#c3)).

   </details>

3. **Boost along $x$.** Which $A$ boosts along $+x$ with rapidity $\eta$? Check it on $x = (1, 0, 0, 0)$. Practises [C7](#c7).

   <details><summary>Solution</summary>

   $A = e^{\eta\sigma_1/2} = \cosh\frac{\eta}{2} I + \sinh\frac{\eta}{2}\sigma_1$. Then $AIA^\dagger = A^2 = e^{\eta\sigma_1} = \cosh\eta\, I + \sinh\eta\, \sigma_1$, which by [C1](#c1) is $(\cosh\eta, \sinh\eta, 0, 0)$.

   </details>

4. **Reconstruct.** Reconstruct the proof of [C6](#c6) from its idea: why does $X = I$ make $A$ unitary, and why do $\sigma_3$ and $\sigma_1$ suffice to make it a multiple of $I$?

   <details><summary>Solution</summary>

   $AIA^\dagger = AA^\dagger = I$. Commuting with $\sigma_3 = \mathrm{diag}(1,-1)$ kills the off-diagonal entries: $`(A\sigma_3)_{12} = -A_{12}`$ but $`(\sigma_3 A)_{12} = A_{12}`$. Commuting with $\sigma_1$ swaps the diagonal entries of a diagonal matrix: $\sigma_1 \mathrm{diag}(a,d) \sigma_1 = \mathrm{diag}(d, a)$. So $a = d$.

   </details>

5. **2π and 4π.** What is $A(4\pi)$ for $A(t) = e^{-it\sigma_3/2}$? What does a spinor do under a $4\pi$ rotation? Practises [C9](#c9).

   <details><summary>Solution</summary>

   $A(4\pi) = \mathrm{diag}(e^{-2\pi i}, e^{2\pi i}) = I$. The spinor returns to itself.

   </details>

## Sources

- Claude session on the spinor-helicity course, 2026-11-12.
- Mark Srednicki, *Quantum Field Theory* (Cambridge, 2007), chapter 33, "Representations of the Lorentz Group", and chapter 2 for the Lorentz group itself. Srednicki uses the mostly-plus metric. The construction here is metric-independent, but signs in $x \cdot x$ flip.
- Matthew D. Schwartz, *Quantum Field Theory and the Standard Model* (Cambridge, 2014), chapter 10, "Spinors". Source of the mostly-minus conventions used here.
- Brian C. Hall, *Lie Groups, Lie Algebras, and Representations* (2nd ed., Springer, 2015), chapter 1, for the connectedness and simple connectedness of SL(n,ℂ) via the polar decomposition, and chapter 1's discussion of the SU(2) → SO(3) homomorphism.
- H. K. Dreiner, H. E. Haber, S. P. Martin, "Two-component spinor techniques and Feynman rules for quantum field theory and supersymmetry", [arXiv:0812.1594](https://arxiv.org/abs/0812.1594), section 2, for the same map in two-component notation.
