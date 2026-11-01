# C and C++ quiz results

Recorded: 2026-11-01

These are the latest saved responses for four rounds covering material from PRs #11, #16 and #17. A question counts as correct only when the entire answer is correct, including every selection in multiple-select questions.

| Round | Correct | Answered | Total questions | Status |
| --- | ---: | ---: | ---: | --- |
| 1 | 5 | 5 | 5 | Complete |
| 2 | 3 | 5 | 5 | Complete |
| 3 | 1 | 3 | 5 | Incomplete: only three answers saved |
| 4 | 2 | 5 | 5 | Complete |
| **Total** | **11** | **18** | **20** | **11/18 saved answers correct** |

The total is **11/18**, not 11/20: two questions in Round 3 have no saved answers and must not be counted as incorrect.

## Round 1: 5/5

All five saved answers were correct.

Topics: one-element array typedef and parameter adjustment, reference and `auto` value deduction, `std::array` and vector copies, `constexpr` array bounds, and `std::exit` versus automatic-object destruction.

## Round 2: 3/5

**Q1, incorrect.** For a function parameter declared `int a[5]`, `sizeof(a)` inside the function measures the adjusted pointer parameter, not the original array. On the stated platform, the answer is **8 bytes**, not the selected 4 bytes.

**Q2, correct.** A const reference bound to `b` observes its new value, 9.

**Q3, correct.** Pointer-to-array arithmetic differs from pointer-to-element arithmetic.

**Q4, correct.** A namespace-scope `static` variable has internal linkage.

**Q5, incorrect.** `std::vector<int> v(3)` has **size 3**, with three value-initialized zeros. The selected claim that size is zero and capacity is three is false.

## Round 3: 1/3 saved answers (2 unanswered)

**Q1, correct.** `std::vector<Counter> v(3)` constructs three counters; `reserve(10)` does not change size or construct additional elements. Output: `3 3`.

**Q2, incorrect.** A reference does not rebind when assigned to. Given `int& r = a; r = b; increment(r);`, the result is **`a = 9, b = 8`**, not the selected `8 8`.

**Q3, incorrect multiple selection.** Copying a struct containing a built-in array is valid and copies its array members. Correct selections: `b.values[1] == 2` and `a.values[0] == 1`. The additional selected assertion that `Data b = a` is invalid was incorrect.

**Q4 and Q5:** No saved answers. No scores or topics inferred.

## Round 4: 2/5

**Q1, incorrect.** `std::vector<int> a{4, 7}` contains two elements. `std::vector<int> b(4, 7)` contains four elements, each equal to 7. Output: **`2 4 7`**, not the selected `2 2 7`. In follow-up discussion, the learner explained that the mistake was overlooking the parentheses, rather than misunderstanding the constructor distinction.

**Q2, incorrect.** After `p = &b; r = *p; *p = 10;`, reference `r` still refers to `a`. Final values: **`a = 6, b = 10`**, not the selected `a = 6, b = 6`.

**Q3, incorrect multiple selection.** For `int values[4] = {3, 5}; int *p = values + 1;`, `*(p + 1)` and `values[2]` are zero. The additional selected claim `p[0] == 3` is false: `p[0] == 5`.

**Q4, correct.** The assertion that an uninitialized local `int b;` necessarily prints zero is false.

**Q5, correct.** After moving a vector into `b` and setting `b[0] = 9`, printing `b[0]` yields 9, not 1.

## Follow-up discussion and progress

The following concepts were subsequently discussed; these are **learning notes, not rescored quiz answers**.

* `std::move` is a cast producing an xvalue. Moving behavior is supplied by initialization or assignment operations of the type. Fundamental types, including raw pointers, are copied when initialized from such expressions.
* Raw pointer copies do not transfer ownership or null the source. `std::unique_ptr` move construction transfers ownership and leaves the source empty.
* Ordinary `std::vector` move construction transfers its underlying allocation without relocating the elements. An existing pointer to an element then refers to an element of the destination vector.
* `push_back` can invalidate element pointers if vector reallocation occurs. Size and capacity are different, and initial capacity need not equal size.
* `new` and `malloc` both provide dynamic storage; `delete` and `free` must be matched with their respective allocation mechanisms. Local variables ordinarily have automatic storage duration.
* A double delete is undefined behavior. After deletion, the object lifetime has ended and the allocation has been released, regardless of whether the old bytes remain physically unchanged.
* Brace initialization gives viable `std::initializer_list` constructors special priority and rejects narrowing conversions; otherwise other constructors may be considered.

## Suggested revision priorities

1. References: assignment through a reference versus rebinding.
2. Array-to-pointer adjustment, pointer indexing and pointer arithmetic.
3. Vector initialization, size, capacity and invalidation.
4. Struct copying with array members.
5. Constructor overload resolution for parentheses versus braces.
