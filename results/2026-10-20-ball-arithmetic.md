---
date: 2026-10-20
tool: ChatGPT (GPT-6)
mode: quiz
notes: [numerics/ball-arithmetic]
---

# Quiz: Ball arithmetic (paused after six answers)

| # | Claim | Kind | Question | Outcome | Remark |
|---|-------|------|----------|---------|--------|
| 1 | numerics/ball-arithmetic#c2 | exercise | For x = [2 ± 0.1] and y = [3 ± 0.2], what must the product ball guarantee, and how do you find a valid enclosure? | partial | Understood guaranteed enclosure, but omitted the cross term ΔxΔy; proposed [6 ± 0.7] instead of [6 ± 0.72]. |
| 2 | numerics/ball-arithmetic#c4 | application | Compare a = [1.0 ± 0.1] with b = [1.3 ± 0.1], then b' = [1.15 ± 0.1], using < and >=. | correct | Correctly explained universally valid comparisons and why overlapping balls make both predicates unproven. |
| 3 | numerics/ball-arithmetic#c5 | explanation | Which gives a tighter ball: x² − 4x + 4 or (x − 2)² for x = [2 ± 0.1], and why? | correct | Identified dependency loss from separately evaluated terms; minor imprecision in saying squaring shrinks the radius. |
| 4 | numerics/ball-arithmetic#c3 | error-spotting | Does the radius of [1.2345 ± 0.002] represent an expected error that can occasionally be exceeded? | correct | Correctly rejected the probabilistic interpretation and identified the radius as a conservative guaranteed bound. |
| 5 | numerics/ball-arithmetic#c6 | application | Does [1.23456 ± 0.00001] guarantee four significant decimal digits, and how do you check? | partial | Correctly checked interval endpoints, but confused common leading digits (1.234) with the correctly rounded four-digit result (1.235). |
| 6 | numerics/ball-arithmetic#c7 | explanation | If exp(10⁻⁵⁰) − 1 evaluates to zero at 30 and 38 decimal digits, is zero proven? How does ball arithmetic help? | correct | Understood shared precision limitations and that increasing working precision can eventually certify a positive lower bound. |

## Summary

Four correct and two partial answers across six completed questions. Strong grasp of guaranteed inclusion, comparisons, dependency, and the limitations of agreement across floating-point precisions. Revisit the product cross term in rigorous interval multiplication (C2) and the distinction between stable leading digits and correctly rounded significant digits (C6). The session was paused before answering the question on FLINT arb working precision (C8); C1 was not tested.
