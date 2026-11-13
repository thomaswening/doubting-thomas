---
title: Diátaxis
area: documentation
created: 2026-10-25
updated: 2026-10-25
prerequisites: []
related: [documentation/glossary-and-ontology]
projects: [tante]
tags: [diataxis, user-documentation, tutorials, how-to, reference, explanation]
---

# Diátaxis

## TL;DR

- **Diátaxis** sorts user documentation into four kinds by what the reader needs at that moment: **tutorials**, **how-to guides**, **reference** and **explanation**.
- The four kinds come from two questions. Is the reader **doing** something or **thinking** about it? Are they **learning** or **working**?
- Each kind is written differently. **Mixing them is the usual failure**: a tutorial that lists every option loses the beginner.
- The scheme is for documentation of a product's *use*. Project records such as requirements and ADRs are a different layer.
- Daniele Procida created it. Django's documentation is organised this way. NumPy adopted it in NEP 44.

## Key claims

- <a id="c1"></a>**C1.** Diátaxis divides user documentation into four kinds: tutorials, how-to guides, reference and explanation.

- <a id="c2"></a>**C2.** The four kinds come from two distinctions: action versus cognition (doing versus knowing), and acquisition versus application (learning versus working).

- <a id="c3"></a>**C3.** A tutorial is action for acquisition, a how-to guide action for application, reference cognition for application, explanation cognition for acquisition.

- <a id="c4"></a>**C4.** A tutorial is a lesson. The author chooses the path and guarantees it works. The reader learns by doing it, not by being told about every alternative.

- <a id="c5"></a>**C5.** A how-to guide assumes the reader already knows what they want to achieve. It gives the steps towards one goal and leaves teaching to the tutorials.

- <a id="c6"></a>**C6.** Reference describes the product accurately and completely, structured like the product itself, e.g. one entry per function. It describes and does not instruct or explain.

- <a id="c7"></a>**C7.** Explanation answers "why": background, design reasons and alternatives. It is the only kind that is read away from the product rather than while using it.

- <a id="c8"></a>**C8.** Content of one kind placed in a document of another kind serves neither reader. The fix is to move it into a document of its own kind and link to it.

## Explanation

### Two questions, four kinds

A reader opens the documentation in one of four situations ([C1](#c1)). Diátaxis finds them by asking two questions ([C2](#c2)):

- **Action or cognition?** Is the reader at the keyboard doing something, or trying to know or understand something?
- **Acquisition or application?** Are they building up skill (studying), or applying skill they have to real work?

Each combination is one kind ([C3](#c3)):

|  | **Acquisition** (learning) | **Application** (working) |
|---|---|---|
| **Action** (doing) | Tutorial | How-to guide |
| **Cognition** (knowing) | Explanation | Reference |

You know all four from Microsoft Learn. A "Get started" walkthrough is a tutorial. "How to configure logging in ASP.NET Core" is a how-to guide. The API browser entry for `List<T>.Add` is reference. "Dependency injection in .NET" with its reasons is explanation.

### Why each kind is written differently

A **tutorial** ([C4](#c4)) is like a driving lesson. The instructor picks the route and makes sure it works. A learner who is offered every alternative at every junction learns nothing. So a tutorial skips options and leaves the reasons for later. It must work every time: a beginner can't recover from a broken step.

A **how-to guide** ([C5](#c5)) is like a recipe. The cook already knows what they want for dinner. They need the steps, not a lesson on heat transfer. It can assume competence and may skip the basics.

**Reference** ([C6](#c6)) is like a map. It has to be accurate and complete, and its structure follows the territory: one entry per statement, function or option, in a consistent format. It doesn't tell the reader what to do with it.

**Explanation** ([C7](#c7)) is like a book on the history of cooking. Nobody reads it at the stove. It may discuss alternatives, history and opinion, which would be noise anywhere else.

### Why mixing fails

Each kind serves one reader in one situation. Content of another kind is noise to that reader ([C8](#c8)). A tutorial that stops to explain the design loses the beginner's momentum. A reference entry that teaches makes the expert scroll. A how-to guide that tries to cover every case turns into reference. The remedy is to move the misplaced part into its own document and link to it: a tutorial step can end with "Why this works: see …".

### What Diátaxis does not cover

Diátaxis is about documentation of a product's use. A project's own records are a different kind of document. Requirements say what the product must do. ADRs record decisions. Spike reports record measurements. Their reader is the maintainer, not the user. In [Tante](https://github.com/thomaswening/Tante), these records stay in `docs/`. User documentation goes in `docs/user/`, one subfolder per kind.

## Examples

### One topic, four documents

The same topic in Tante, rational functions, as each kind would treat it. Tante's language doesn't exist yet, so the input and the function `normalise` are invented.

| Kind | Title | Its first line |
|---|---|---|
| Tutorial | Your first rational function | "Type `(x^2 - 1)/(x + 1)` and press Enter. Tante prints `x - 1`." |
| How-to | Cancel common factors in a large result | "To normalise a result read from a file, …" |
| Reference | `normalise` | "`normalise(e)`: returns `e` with numerator and denominator coprime. Arguments: …" |
| Explanation | Why rational functions are a coefficient kind | "FORM stores them in a reserved function, `PolyRatFun`. Tante makes them a coefficient instead, because …" |

### Repairing a mixed tutorial

A tutorial step that has slipped into reference and explanation:

```text
3. Normalise the result with `normalise(e)`. `normalise` also accepts
   `mode = "full" | "fast"` and `order = [...]`. Internally it calls FLINT's
   multivariate GCD, because a naive Euclidean algorithm explodes on
   multivariate input.
```

Repaired, with each part where it belongs:

```text
3. Normalise the result with `normalise(e)`. Tante prints `x - 1`.
   (All options: reference, `normalise`. Why Tante uses FLINT: explanation,
   "Polynomial arithmetic".)
```

## Pitfalls

- **"Tutorial" and "how-to" are not synonyms.** A tutorial is for someone who doesn't yet know what to ask. A how-to guide is for someone with a goal.
- **Reference generated from code is not enough on its own.** It covers the reference kind only. Users still need the other three.
- **Diátaxis is not a folder structure.** Folders help, but the point is that each page has one kind. A page in `tutorials/` that explains design reasons is still mixed.
- **Not every document is user documentation.** Forcing ADRs or requirements into the four kinds misreads them.

## Sources

- Claude session on Tante, 2026-10-25: decisions W2 and W3 on documentation layout, recorded in [Tante's development.md](https://github.com/thomaswening/Tante/blob/docs/glossary/docs/development.md) (pull request [#7](https://github.com/thomaswening/Tante/pull/7)).
- Daniele Procida, [Diátaxis](https://diataxis.fr/), especially [the compass](https://diataxis.fr/compass/).
- NumPy, [NEP 44: Restructuring the NumPy documentation](https://numpy.org/neps/nep-0044-restructuring-numpy-docs.html) (accepted 2020).
- [Django documentation](https://docs.djangoproject.com/), organised into tutorials, topic guides, reference and how-to guides.
