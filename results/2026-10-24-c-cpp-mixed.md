---
date: 2026-10-24
tool: Codex
mode: quiz
notes: [c/function-tables, c/strings, cpp/copy-and-move]
---

# Quiz: function tables, C strings, and copy and move

Nine multiple-choice questions, three options each, answered by clicking. Feedback followed each answer. Outcomes measure recognition among supplied options, rather than unaided recall.

| # | Claim | Kind | Question | Outcome | Remark |
|---|-------|------|----------|---------|--------|
| 1 | c/function-tables#c4 | application | How should a host extend a published API table while preserving compatibility? | correct | |
| 2 | c/strings#c2 | application | What is the smallest buffer for Hello as a valid C string? | correct | |
| 3 | cpp/copy-and-move#c4 | recall | What does std::move(x) itself do? | correct | |
| 4 | c/function-tables#c8 | application | Can the host call a static plug-in function through its supplied function pointer? | correct | |
| 5 | c/strings#c4 | application | What does sizeof(text) give inside a function with a char text[] parameter? | correct | |
| 6 | cpp/copy-and-move#c2 | application | What does a compiler-generated copy do with an owning raw pointer member? | correct | |
| 7 | c/function-tables#c5 | application | What must a caller check before calling an optional function pointer? | correct | |
| 8 | c/strings#c6 | application | snprintf receives an 8-byte buffer and size 8, and returns 12. What happened? | wrong | Chose eight text characters without a terminator. Correct: at most seven text characters plus a zero terminator; 12 is the full text length excluding the terminator. |
| 9 | cpp/copy-and-move#c7 | explanation | Why does vector copy copyable elements during reallocation when their move might throw? | correct | |

## Summary

Scored 8/9: function tables 3/3, C strings 2/3, and copy and move 3/3. Correctly recognized table compatibility, internal linkage, null checks, pointer copying, std::move, and vector exception safety. Revisit snprintf's size-minus-one text limit, terminating zero, and return value (c/strings#c6).
