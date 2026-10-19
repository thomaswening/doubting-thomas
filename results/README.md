# Results log

One file per test session, written by whichever AI ran the session (or by Thomas from what it gave him) and committed directly to `main`. The rules for testing are in [AGENTS.md §7](../AGENTS.md#7-testing-thomas-and-logging-results).

## File name

`YYYY-MM-DD-<slug>.md`, where the date is the day of the session and the slug names what was tested: `2026-10-21-ball-arithmetic.md`, `2026-10-22-cpp-mixed.md`. If the name is taken, append `-2`, `-3`.

## Contents

Start from [templates/results.md](../templates/results.md).

```markdown
---
date: 2026-10-21
tool: ChatGPT
mode: quiz
notes: [numerics/ball-arithmetic]
---

# Quiz: ball arithmetic

| # | Claim | Kind | Question | Outcome | Remark |
|---|-------|------|----------|---------|--------|
| 1 | numerics/ball-arithmetic#c3 | application | Is [1 ± 0.1] < [1.15 ± 0.1]? | correct | |
| 2 | numerics/ball-arithmetic#c5 | explanation | Why is x − x not exactly 0? | partial | Named the radius but not why it doubles. |

## Summary

Solid on comparisons; the dependency problem (C5) needs another look.
```

- **Front matter:** `date` (ISO), `tool` (the AI, with model if known), `mode` (`quiz`, `exercise`, `flashcards`, `oral` or another short word), `notes` (the note ids tested, see [AGENTS.md §4](../AGENTS.md#4-ids-and-links)).
- **One row per question.** `Claim` is a claim id, or a note id when a question covers a whole note. `Kind` is `recall`, `application`, `explanation`, `error-spotting` or `exercise`. `Outcome` is exactly one of `correct`, `partial`, `wrong` or `skipped`. `Remark` says what was missing or wrong, briefly; leave it empty for a clean `correct`.
- **Summary:** two or three sentences on strengths, weak spots and what to revisit.
- Keep table cells on one line, and escape `|` inside a cell as `\|`.
