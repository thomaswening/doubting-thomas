---
title: Compact to Hausdorff - when a continuous bijection is a homeomorphism
area: topology
created: 2026-11-12
updated: 2026-11-12
prerequisites: [topology/topological-spaces-and-continuity]
related: [topology/quotient-topology]
projects: []
tags: [topology, compactness, hausdorff, closed-map-lemma, homeomorphism]
---

# Compact to Hausdorff: when a continuous bijection is a homeomorphism

## TL;DR

- A space is **compact** if every cover by open sets has a finite subcover. In $\mathbb{R}^n$, compact means closed and bounded (Heine–Borel), so disks, balls and spheres are compact.
- A space is **Hausdorff** if any two different points have disjoint open neighbourhoods. Every metric space and every subspace of one is Hausdorff.
- Three small results combine: a closed subset of a compact space is compact; the continuous image of a compact space is compact; a compact subset of a Hausdorff space is closed.
- Together they give the **closed map lemma**: a continuous map from a compact space to a Hausdorff space sends closed sets to closed sets.
- So a **continuous bijection from a compact space to a Hausdorff space is a homeomorphism**: the inverse comes for free. This is the standard way to prove that a glued space is homeomorphic to a sphere.

## Key claims

- <a id="c1"></a>**C1.** A topological space $X$ is compact if every family of open sets whose union is $X$ (an open cover) contains finitely many sets whose union is already $X$ (a finite subcover). The open interval $(0, 1)$ is not compact: the cover by the sets $(\tfrac1n, 1)$, $n \ge 2$, has no finite subcover. ([Definition](#def-compact))
- <a id="c2"></a>**C2.** Heine–Borel: a subset of $\mathbb{R}^n$ is compact if and only if it is closed and bounded. So $[0, 1]$, the closed ball $B^n$ and the sphere $S^n$ are compact, and $[0, 2\pi)$ is not. ([Theorem](#thm-heine-borel), cited)
- <a id="c3"></a>**C3.** A space is Hausdorff if any two distinct points $x \ne y$ have open neighbourhoods $U \ni x$, $V \ni y$ with $U \cap V = \varnothing$. Metric spaces are Hausdorff, and every subspace of a Hausdorff space is Hausdorff. A set with at least two points and the indiscrete topology is not Hausdorff. ([Definition](#def-hausdorff), [Proposition](#prop-hausdorff))
- <a id="c4"></a>**C4.** A closed subset of a compact space is compact. ([Proposition](#prop-closed-in-compact))
- <a id="c5"></a>**C5.** A compact subset of a Hausdorff space is closed. ([Proposition](#prop-compact-in-hausdorff))
- <a id="c6"></a>**C6.** The image of a compact space under a continuous map is compact. A union of finitely many compact subsets is compact. ([Proposition](#prop-image))
- <a id="c7"></a>**C7.** Closed map lemma: a continuous map $f : X \to Y$ from a compact space to a Hausdorff space is closed, meaning $f(C)$ is closed in $Y$ for every closed $C \subseteq X$. ([Lemma](#lemma-closed-map))
- <a id="c8"></a>**C8.** A continuous bijection from a compact space to a Hausdorff space is a homeomorphism. Both conditions are needed: $[0, 2\pi) \to S^1$ fails because the domain is not compact, and the identity from $[0, 1]$ with its usual topology to $[0, 1]$ with the indiscrete topology fails because the target is not Hausdorff. ([Theorem](#thm-compact-hausdorff))

## Explanation

### Where this is going

To prove that two spaces are homeomorphic, you need a continuous bijection *and* a continuous inverse ([continuity C6](topological-spaces-and-continuity.md#c6)). The inverse is often hard to write down. For a glued space it is a map *into* the glued space, defined by cases. This note proves a theorem that makes the inverse unnecessary when the domain is compact and the target is Hausdorff ([C8](#c8)). Both conditions hold in every gluing construction of the SU(2) and SO(3) notes.

### Compactness: finiteness in disguise

<a id="def-compact"></a>**Definition (compact).** An **open cover** of a space $X$ is a family of open sets whose union is $X$. A **subcover** is a subfamily that still covers $X$. $X$ is **compact** if every open cover has a finite subcover. A subset $K \subseteq X$ is compact if it is compact in the subspace topology. Equivalently: every cover of $K$ by open sets of $X$ has a finite subcover. ([C1](#c1))

*What it means.* Finite sets have a lot of useful properties because you can handle their elements one at a time and then take the worst case: the minimum of finitely many positive numbers is positive. Compactness is the property that lets you do this on an infinite space. Each point gives you something local, such as a small neighbourhood or a bound. Compactness says finitely many of them suffice, so you can take the worst case. Every proof below follows this pattern.

*A non-example and why it fails.* The sets $(\tfrac1n, 1)$ for $n \ge 2$ cover $(0, 1)$: every $x > 0$ lies in one of them. Any finite subfamily has a largest $n$, so its union is $(\tfrac1n, 1)$, which misses the points near $0$. The interval escapes through its missing endpoint. In $[0, 1]$ the point $0$ is included, and an open set containing $0$ swallows a whole stretch $[0, \varepsilon)$. Then finitely many sets suffice.

*Why "every" open cover.* Every space has *some* finite open cover, namely $\{X\}$. The condition has teeth only because it must hold for all covers, including ones made of tiny sets.

<a id="thm-heine-borel"></a>**Theorem (Heine–Borel).** A subset of $\mathbb{R}^n$ is compact if and only if it is closed and bounded. *(cited: Laures & Szymik, Folgerung 4.13)* ([C2](#c2))

*Why it should hold (motivation, not a proof).* Two ways to escape a finite subcover are missing: escaping to infinity (cover $\mathbb{R}$ by the intervals $(-n, n)$) and escaping through a missing boundary point (as with $(0, 1)$). Boundedness closes off the first, closedness the second. The hard part is that nothing else can go wrong. For $[0, 1]$ the standard argument goes like this. Look at the largest $s$ such that $[0, s]$ is covered by finitely many sets of the cover. The open set containing $s$ reaches a bit beyond $s$, so $s$ can't be smaller than $1$. In higher dimensions, a box is a product of intervals, and a closed bounded set is a closed subset of a box ([C4](#c4)).

### Hausdorff: points can be separated

<a id="def-hausdorff"></a>**Definition (Hausdorff).** A space $X$ is Hausdorff if for any two points $x \ne y$ there are open sets $U \ni x$ and $V \ni y$ with $U \cap V = \varnothing$. ([C3](#c3))

*What it means.* Two different points can be told apart by open sets: each has a neighbourhood that stays away from the other. Without this, a sequence could converge to two different limits at once. Every space you meet in analysis is Hausdorff. Non-Hausdorff spaces appear naturally as quotients, which is why the condition has to be checked there ([quotient topology](quotient-topology.md#c6)).

<a id="prop-hausdorff"></a>**Proposition.** Every metric space is Hausdorff. Every subspace of a Hausdorff space is Hausdorff. ([C3](#c3))

<details><summary>Proof</summary>

Metric: for $x \ne y$, let $r = d(x, y)/2 > 0$. The balls $B(x, r)$ and $B(y, r)$ are open. They are disjoint, because a point $z$ in both would give $d(x, y) \le d(x, z) + d(z, y) < 2r = d(x, y)$.

Subspace: let $A \subseteq X$ and $x \ne y$ in $A$. Take disjoint open $U \ni x$, $V \ni y$ in $X$. Then $U \cap A$ and $V \cap A$ are open in $A$, contain $x$ and $y$, and are disjoint.

</details>

So $S^n \subseteq \mathbb{R}^{n+1}$ is Hausdorff. The indiscrete topology on a set with two points $x \ne y$ is not: the only open set containing $x$ is the whole space, which also contains $y$.

### Three small results

<a id="prop-closed-in-compact"></a>**Proposition.** A closed subset $A$ of a compact space $X$ is compact. ([C4](#c4); Laures & Szymik, Satz 4.1)

*Proof idea.* Cover $A$, then add the open set $X \setminus A$ to get a cover of all of $X$. Compactness of $X$ gives finitely many sets, and the extra set doesn't help cover $A$.

<details><summary>Proof</summary>

Let $\mathcal{U}$ be a cover of $A$ by open sets of $X$. Since $A$ is closed, $X \setminus A$ is open, so $\mathcal{U} \cup \{X \setminus A\}$ is an open cover of $X$. It has a finite subcover. Removing $X \setminus A$ from it, if present, leaves finitely many sets of $\mathcal{U}$, which cover $A$ because $X \setminus A$ contains no point of $A$.

</details>

<a id="prop-compact-in-hausdorff"></a>**Proposition.** A compact subset $K$ of a Hausdorff space $X$ is closed. ([C5](#c5); Laures & Szymik, Satz 4.2)

*Proof idea.* Fix a point $x$ outside $K$. Each point $k$ of $K$ can be separated from $x$ by a pair of disjoint open sets. Finitely many of them cover $K$, by compactness. The intersection of the finitely many partner sets around $x$ is still open, and it avoids $K$. "Compact sets behave like points": in a Hausdorff space, a point and a compact set can be separated just like two points.

<details><summary>Proof</summary>

We show that $X \setminus K$ is open. Let $x \in X \setminus K$. For each $k \in K$, the Hausdorff property gives disjoint open sets $`U_k \ni k`$ and $`V_k \ni x`$. The sets $`U_k`$ cover $K$, so finitely many of them, for $`k_1, \dots, k_m`$, already cover $K$. Then $`V = V_{k_1} \cap \dots \cap V_{k_m}`$ is open, as a finite intersection, and contains $x$. It doesn't meet $K$: a point of $K$ lies in some $`U_{k_i}`$, which is disjoint from $`V_{k_i} \supseteq V`$. So every point of $X \setminus K$ has an open neighbourhood inside $X \setminus K$, and $X \setminus K$ is a union of open sets, hence open.

</details>

Here finiteness is essential: an infinite intersection of open sets around $x$ could shrink to $\{x\}$, which is not open.

<a id="prop-image"></a>**Proposition.** If $X$ is compact and $f : X \to Y$ is continuous, then $f(X)$ is compact. A union $`K_1 \cup \dots \cup K_m`$ of finitely many compact subsets of a space is compact. ([C6](#c6); Laures & Szymik, Satz 4.3)

*Proof idea.* Pull a cover of $f(X)$ back to $X$ by taking preimages, take a finite subcover there, and push it forward again.

<details><summary>Proof</summary>

Let $\mathcal{V}$ be a cover of $f(X)$ by open sets of $Y$. The preimages $f^{-1}(V)$, $V \in \mathcal{V}$, are open by continuity and cover $X$, since every $f(x)$ lies in some $V$. Finitely many, $`f^{-1}(V_1), \dots, f^{-1}(V_m)`$, cover $X$. Then $`V_1, \dots, V_m`$ cover $f(X)$: for $`x \in f^{-1}(V_i)`$, $`f(x) \in V_i`$.

Finite unions: a cover of $`K_1 \cup \dots \cup K_m`$ covers each $`K_i`$, which needs finitely many sets. All of these together are still finitely many.

</details>

### The closed map lemma and the main theorem

<a id="lemma-closed-map"></a>**Lemma (closed map lemma).** A continuous map $f : X \to Y$ from a compact space $X$ to a Hausdorff space $Y$ is closed: $f(C)$ is closed for every closed $C \subseteq X$. ([C7](#c7); Laures & Szymik, Folgerung 4.4)

*Proof idea.* Closed → compact → compact → closed, using the three results in turn.

<details><summary>Proof</summary>

Let $C \subseteq X$ be closed. It is compact by [C4](#c4). The restriction of $f$ to $C$ is continuous, so $f(C)$ is compact by [C6](#c6). As a compact subset of the Hausdorff space $Y$, it is closed by [C5](#c5).

</details>

<a id="thm-compact-hausdorff"></a>**Theorem.** A continuous bijection $f : X \to Y$ from a compact space $X$ to a Hausdorff space $Y$ is a homeomorphism. ([C8](#c8); Laures & Szymik, Folgerung 4.5)

*Proof idea.* The inverse $g = f^{-1}$ is continuous if preimages of closed sets under $g$ are closed. The preimage of $C$ under $g$ is $f(C)$, which is closed by the closed map lemma.

<details><summary>Proof</summary>

Let $g = f^{-1} : Y \to X$. For $C \subseteq X$ closed, $g^{-1}(C) = f(C)$ because $f$ is a bijection. By the [closed map lemma](#lemma-closed-map), $f(C)$ is closed. So $g$ pulls closed sets back to closed sets and is continuous ([continuity C4](topological-spaces-and-continuity.md#c4)).

</details>

*Why both conditions.* Each condition blocks one way a continuous bijection can fail to have a continuous inverse:

- **Domain not compact.** $e : [0, 2\pi) \to S^1$ ([continuity C7](topological-spaces-and-continuity.md#c7)). The target is Hausdorff, but the interval is missing its endpoint $2\pi$, and the circle "needs" it. The closed set $[1, 2\pi)$ of the interval maps to an arc without its endpoint $(1, 0)$, which is not closed.
- **Target not Hausdorff.** The identity map from $[0, 1]$ with the usual topology to $[0, 1]$ with the indiscrete topology is continuous, since the only open sets of the target are $\varnothing$ and $[0, 1]$, whose preimages are open. The domain is compact. But the inverse, the identity in the other direction, is not continuous: $[0, \tfrac12)$ is open in the domain, but not in the target. The target has too few open sets to tell its points apart.

## Examples

**The circle from a closed interval.** The map $[0, 2\pi] \to S^1$, $t \mapsto (\cos t, \sin t)$, is continuous and surjective, but not injective: $0$ and $2\pi$ both go to $(1, 0)$. Identify them, and it becomes a continuous bijection from a compact space (as the [quotient topology](quotient-topology.md#c5) note shows) to a Hausdorff space, hence a homeomorphism. Compare with $[0, 2\pi)$: removing $2\pi$ instead of identifying it destroys compactness, and with it the theorem.

**Closed sets in a compact space.** $S^2 \cap \{z \ge 0\}$, the closed upper hemisphere, is the preimage of the closed set $[0, \infty)$ under the continuous map $(x, y, z) \mapsto z$ restricted to $S^2$. So it is closed in the compact space $S^2$, hence compact ([C4](#c4)).

## Pitfalls

- **"Compact means closed and bounded."** Only in $\mathbb{R}^n$ (and its subspaces). The definition is about open covers ([C1](#c1), [C2](#c2)).
- **"Some finite cover exists, so it's compact."** Every space has the finite cover $\{X\}$. The condition is about every cover ([C1](#c1)).
- **Forgetting Hausdorff.** Compact subsets of non-Hausdorff spaces need not be closed, and the theorem fails without Hausdorff ([C5](#c5), [C8](#c8)).
- **Using an infinite intersection of neighbourhoods.** The proof of [C5](#c5) works only because compactness makes the intersection finite.

## Exercises

1. **Prove.** Show from the definition that a finite topological space is compact.

   <details><summary>Solution</summary>

   A finite space has finitely many subsets, so every open cover is a finite family, and it is its own finite subcover ([C1](#c1)).

   </details>

2. **Find the failing condition.** Show that $\mathbb{R}$ is not compact by giving an open cover with no finite subcover. Which half of Heine–Borel does $\mathbb{R}$ violate?

   <details><summary>Solution</summary>

   The intervals $(-n, n)$, $n \ge 1$, cover $\mathbb{R}$. Finitely many of them have a largest $n$, and their union $(-n, n)$ misses $n$. $\mathbb{R}$ is closed but not bounded ([C1](#c1), [C2](#c2)).

   </details>

3. **Reconstruct.** Prove that a compact subset of a Hausdorff space is closed, starting from the idea "separate the point from each point of the compact set, then take finitely many". Where exactly is compactness used, and where Hausdorff?

   <details><summary>Solution</summary>

   For $x \notin K$: Hausdorff gives, for each $k \in K$, disjoint open $`U_k \ni k`$, $`V_k \ni x`$. Compactness picks finitely many $`U_k`$ covering $K$. The finite intersection of the corresponding $`V_k`$ is open, contains $x$, and misses $K$. So $X \setminus K$ is open ([C5](#c5)).

   </details>

4. **Prove.** Let $f : X \to Y$ be continuous, $X$ compact, $Y$ Hausdorff, and $f$ surjective. Show that a set $V \subseteq Y$ is open if and only if $f^{-1}(V)$ is open. (This says $Y$ carries the quotient topology of $f$.)

   <details><summary>Solution</summary>

   If $V$ is open, $f^{-1}(V)$ is open by continuity. Conversely, let $f^{-1}(V)$ be open. Its complement $X \setminus f^{-1}(V) = f^{-1}(Y \setminus V)$ is closed, so its image is closed by the closed map lemma. That image is $Y \setminus V$, because $f$ is surjective. So $V$ is open ([C7](#c7)).

   </details>

5. **Explain.** Why is the identity from $[0, 1]$ with the indiscrete topology to $[0, 1]$ with the usual topology *not* continuous, and what does that say about the example in [C8](#c8)?

   <details><summary>Solution</summary>

   $[0, \tfrac12)$ is open in the usual topology, but its preimage $[0, \tfrac12)$ is not open in the indiscrete topology. This is the inverse of the map in [C8](#c8), which is therefore a continuous bijection with a discontinuous inverse.

   </details>

## Sources

- Gerd Laures and Markus Szymik, *Grundkurs Topologie*, 2nd ed., Springer 2015, section 4.1: Satz 4.1, 4.2, 4.3, Folgerung 4.4, 4.5, and Folgerung 4.13 (Heine–Borel). The proofs here follow theirs. From Thomas's `eBooks` folder.
- Written as a foundation for [#40](https://github.com/thomaswening/doubting-thomas/pull/40), after the review conversation of 2026-11-12.
