---
title: Quality goals and their order
area: architecture
created: 2026-10-25
updated: 2026-10-25
prerequisites: []
related: [architecture/static-and-runtime-views]
projects: [tante]
tags: [quality-attributes, trade-offs, arc42, iso-25010, non-functional-requirements]
---

# Quality goals and their order

## TL;DR

- A **functional requirement** says *what* a system does ("factorise polynomials"). A **quality goal** says *how well* it must do all of it ("every result is exact").
- Quality goals cut across every feature, so they shape the architecture more than any single feature does.
- They conflict: speed against determinism, extensibility against simplicity. Every design decision trades one against another.
- **Ranking** the goals decides those trades in advance. When two conflict, the higher one wins, without arguing the case afresh.
- A useful ranking is short (three to six goals) and comes with a worked trade-off for each neighbouring pair.

## Key claims

- <a id="c1"></a>**C1.** A quality goal states how well a system must perform all of its functions (exactness, speed, portability), not which functions it has. It applies across every feature.
- <a id="c2"></a>**C2.** Quality goals conflict with one another, so most design decisions are trades between them. A list of goals without an order does not say which side wins.
- <a id="c3"></a>**C3.** Ranking the goals makes the rule "when two goals conflict, the higher one wins". A trade that the ranking covers needs no new discussion.
- <a id="c4"></a>**C4.** A ranking is tested by writing out one concrete trade for each neighbouring pair. If no believable conflict between two goals can be found, their relative order does not matter yet.
- <a id="c5"></a>**C5.** arc42 puts the top three to five quality goals in its first section, before constraints and context, because they drive the rest of the architecture. ISO/IEC 25010 (2011) is a standard catalogue of quality characteristics to choose them from, such as performance efficiency, maintainability and portability.
- <a id="c6"></a>**C6.** A goal ranked lower is not given up. It still decides among options that are equal on every higher goal.
- <a id="c7"></a>**C7.** The reason a project exists does not have to be its top quality goal. A goal that motivates the project can rank below a goal without which the product fails its users.

## Explanation

### What and how well

In a .NET project, the backlog lists features: export to PDF, log in with single sign-on. An API review checks other things on every pull request, whatever the feature: is it thread-safe, does it allocate on the hot path, does it break existing callers? Those cross-cutting properties are quality goals ([C1](#c1)). Requirements documents often call them non-functional requirements.

Features are mostly independent: adding PDF export rarely makes single sign-on worse. Quality goals are not independent ([C2](#c2)). Making the output identical whatever the number of threads costs speed, because results have to be merged in a fixed order rather than as they arrive. A plug-in interface makes the system extensible, but it is one more thing a new maintainer has to learn.

### Why an order

Without an order, every such trade is argued from scratch, and the answer depends on who argues best that day. With an order, the trade is already decided ([C3](#c3)). The order is written down once and then applied.

The order is only believable if each neighbouring pair has a real conflict written out ([C4](#c4)). For Tante, Thomas ranked six goals on 25 October 2026:

| Rank | Goal | The trade against the goal below it |
|---|---|---|
| 1 | Correctness | A faster algorithm whose output differs between runs is not used until its output is normalised. |
| 2 | Determinism | Terms from several threads are merged in a fixed order, even where merging them as they arrive would be faster. |
| 3 | Scale and speed | Built-in modules call the core directly rather than through the slower public C interface. |
| 4 | Extensibility | One plug-in interface with two implementations is more to learn than one internal interface. |
| 5 | Understandability | Platform-specific code stays in one place, even where a fix elsewhere would be shorter. |
| 6 | Portability | |

### Lower is not abandoned

Understandability ranks fifth in Tante, although it is the reason Tante exists: FORM, its predecessor, is hard to understand. That looks paradoxical. But an engine that is clear and too slow for real calculations fails its users, while a fast engine can still be documented ([C7](#c7)). Understandability then decides among options that are equally fast ([C6](#c6)).

### Where the goals are written

arc42, a widely used outline for architecture documents, puts the quality goals in section 1, next to the purpose ([C5](#c5)). Constraints, context and every later decision are read in their light. Its section 10 can refine them into concrete, measurable scenarios. ISO/IEC 25010 offers a vocabulary to pick goals from. Its 2011 edition lists eight characteristics: functional suitability, performance efficiency, compatibility, usability, reliability, security, maintainability and portability.

## Examples

A goal table in the shape arc42 suggests, with the requirements each goal stands for:

```markdown
| Priority | Quality goal | What it means here | Main requirements |
|---|---|---|---|
| 1 | Correctness | Exact arithmetic; equal results print identically | REQ-012, REQ-018 |
| 2 | Determinism | Byte-identical output for any thread count | REQ-074 |
```

Applying the ranking to a new question: a library offers a hash map that iterates in insertion order (deterministic) and one that iterates in hash order (faster). Determinism ranks above speed, so the first is chosen, unless the iteration order never reaches the output. In that case the two are equal on determinism, and speed decides ([C6](#c6)).

## Pitfalls

- **Listing goals without an order.** "We value correctness, speed and simplicity" decides nothing ([C2](#c2)).
- **Too many goals.** Ten ranked goals are not used. Three to six are.
- **Treating rank as importance in general.** Rank answers only "which wins when these two conflict?". Portability can be ranked sixth and still be a hard requirement that no design may break.
- **Putting the project's motivation first by reflex** ([C7](#c7)).

## Sources

- [Tante, `docs/architecture.md` §1](https://github.com/thomaswening/Tante/blob/main/docs/architecture.md#1-goals), [pull request #10](https://github.com/thomaswening/Tante/pull/10); Claude session on Tante, 2026-10-25.
- [arc42, section 1: Introduction and goals](https://docs.arc42.org/section-1/), and [section 10: Quality requirements](https://docs.arc42.org/section-10/).
- ISO/IEC 25010:2011, *Systems and software quality models*.
