---
date: 2026-11-06
tool: ChatGPT (GPT-6)
mode: quiz
notes: [cpp/arrays-and-containers]
---

# Quiz: C++ arrays, containers and spans

| # | Claim | Kind | Question | Outcome | Remark |
|---|-------|------|----------|---------|--------|
| 1 | cpp/arrays-and-containers#c6 | application | Does a span remain valid after vector push_back, and what changes with reserve(100)? | partial | Correct on span invalidation after reallocation and reserving before span construction; assumed push_back always reallocates and reserved capacity contains zero-initialized elements. |
| 2 | cpp/arrays-and-containers#c2 | explanation | How do passing std::array by value or reference and passing a built-in array differ? | partial | Correct on copies and references; incorrectly claimed pointer subscripting a[0] would fail to compile after array decay. |
| 3 | cpp/arrays-and-containers#c4 | application | Trace vector copy and span aliasing; explain ownership and lifetime. | correct | |
| 4 | cpp/arrays-and-containers#c1 | explanation | Explain sizeof and array decay in a function parameter and how to retain length. | correct | |
| 5 | cpp/arrays-and-containers#c3 | application | Compare partial array initialization, std::array, vector brace initialization and vector(5). | partial | Correct output and partial array zero initialization; conflated std::array fixed size with capacity and incorrectly said vector(5) reserves five slots without constructing elements. |

## Summary

Strong understanding of copy versus reference semantics, span ownership, array decay and initialization of partially specified built-in arrays. Revisit the distinction between vector size and capacity, especially reserve versus resize and vector(5), plus the fact that pointers support indexing. Also review when vector growth actually reallocates and how std::array has a fixed size rather than a capacity.
