---
date: 2026-11-01
tool: ChatGPT (GPT-6)
mode: oral
notes: [cpp/references, cpp/copy-and-move, cpp/arrays-and-containers]
---

# Oral review: C++ lifetime, ownership and initialization

| # | Claim | Kind | Question | Outcome | Remark |
|---|-------|------|----------|---------|--------|
| 1 | cpp/references#c5 | explanation | Why is dereferencing an alias after deleting its dynamically allocated pointee undefined behaviour? Is overwriting required? | correct | Explained that deletion releases the allocation and the bytes need not be overwritten. |
| 2 | cpp/arrays-and-containers | application | Which constructor is selected for Number a(4, 7) and Number b{4, 7} when both a two-int and an initializer-list constructor exist? | correct | Correctly distinguished parentheses from braces and their constructor selection. |
| 3 | cpp/arrays-and-containers | application | Does Number n{4, 7} compile and select Number(int, int) when no initializer-list constructor exists? | correct | Correctly reasoned that the ordinary two-argument constructor is selected. |

## Summary

Correctly explained that accessing an object after deletion is undefined regardless of whether its old bytes remain. Also correctly reasoned about constructor selection with parentheses and braces, including fallback to a regular constructor when no initializer-list constructor exists. Revisit narrowing conversions and the behavior of a viable initializer-list constructor with narrowing arguments.

This log records only questions and answers visible in the current oral-review transcript. Earlier multiple-choice rounds were not included because their complete original question and answer transcripts were not available to independently verify the reported scores.
