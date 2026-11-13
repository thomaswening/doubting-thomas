# Instructions for AI assistants

This file is the single rulebook for any AI that reads or writes this repository: Claude, ChatGPT, Codex or another. Read it in full before writing anything. [README.md](README.md) is the same story told for a human reader.

**What this repository is.** Thomas's personal knowledge base. Every note records something he has learned, written so that he can read it as a reference and so that an AI can build exercises and quizzes from it. The `results/` folder logs how he did when tested, so that weak spots and topics to refresh can be found later.

<a id="what-makes-a-note"></a>**What makes a note.** A general concept Thomas learned, one he could be quizzed on outside the project where he met it: a piece of mathematics (greatest common divisor), a tool and how it works (what a GitHub Actions workflow is, and how its trigger, jobs and steps fit together). Not a working rule or a decision about how he works ("document every CI check as a rule with a table of cases"): that belongs in his Claude configuration or in the project's documents. Not a project fact either ("Tante pins FLINT 3.6.0"). Decided by Thomas, 25 October 2026.

**Who Thomas is**, for pitching explanations: a .NET (C#) developer with some C++20 and no Rust, working on research software with a mathematical and physics flavour. He has a master's degree in physics. He knows many mathematical concepts well, but not always their proofs and the smaller results they rest on: in topology, for example. Where a concept has a .NET counterpart, compare to it. Mathematics and physics notes follow [their own section](#mathematics-and-physics-notes).

**Language.** Always English.

## 1. Layout

```
README.md                 for the human reader
AGENTS.md                 this file
CLAUDE.md                 points Claude to this file
backlog.md                topics that could become notes (§8)
topics/index.md           every area, with a link to its index
topics/<area>/index.md    every note in that area, one line each
topics/<area>/<note>.md   one note per concept
results/README.md         how to read the results log
results/YYYY-MM-DD-<slug>.md   one file per test session
templates/note.md         copy this to start a note
templates/results.md      copy this to start a results file
tools/check_docs.py       the link check (§9)
.github/workflows/        CI: docs-check.yml runs the link check on every pull request
```

- `<area>` and `<note>` are lower-case kebab-case: `topics/numerics/ball-arithmetic.md`, `topics/cpp/move-semantics.md`.
- **One concept per note.** A note that needs two TL;DRs is two notes. Split a note as soon as it starts on a second concept, and that includes during review. Organise by concept, never by date, project or source.
- A new area gets its own `index.md` and a line in [topics/index.md](topics/index.md). A new note gets a line in its area's index: `- [Title](note.md): one-line summary.`

## 2. Notes

Start from [templates/note.md](templates/note.md). The sections, in this order:

1. **Front matter** (YAML): `title`, `area`, `created` and `updated` (ISO dates), `prerequisites` and `related` (lists of note ids, see §4; may be empty), `projects` (the projects of §5 where the concept came up or matters, as lower-case names: `[tante]`; may be empty), `tags`.
2. **`# Title`**
3. **`## TL;DR`**: three to six bullets. Someone who reads only this should get the gist.
4. **`## Key claims`**: the checkable core of the note (§3).
5. **`## Explanation`**: didactic prose that builds the idea up from what the reader already knows, in short paragraphs with subsections as needed. Say *why*, not only *what*. Link the claims it explains: `[C2](#c2)`.
6. **`## Examples`**: worked examples and code snippets, each with its language tag and the expected output or result. Prefer small, runnable snippets.
7. **`## Good habits`** (optional): what to write by default, for notes about writing code, such as constructors or error handling. Each habit is one imperative line that links the claim explaining why. It comes from an established source, such as the C++ Core Guidelines or a compiler's recommended warnings, not from taste. Pitfalls say what goes wrong; good habits say what to write instead. Leave the section out where the topic is understanding a mechanism, as for array decay.
8. **`## Pitfalls`** (optional): common mistakes and misreadings. These make good quiz questions.
9. **`## Exercises`** (optional): a few short tasks for active recall: predict what code does, interpret a declaration, explain a mechanism in your own words. Use it where the concept is a mechanism the reader must be able to rebuild, not for every note. Each exercise links the claims it practises. Its solution follows in a collapsed block, so that it is not read by accident:

   ```html
   <details><summary>Solution</summary>

   The answer, with links to the claims.

   </details>
   ```

   The empty lines inside `<details>` are needed for GitHub to render Markdown there.
10. **`## Sources`**: where this was learned and where to read more, as links (§5).

Style: plain, precise, short sentences. Define a term before using it. One idea per paragraph.

**Mathematics is written in LaTeX**, which GitHub and VS Code's Markdown preview render natively, and which an AI reads directly from the source:

- Inline: `$\gcd(p, q) = x - y$`. If the expression contains characters Markdown would interpret, such as `*`, `_` or `\`, use the backtick form `` $`a_1 * b_1`$ ``.
- Displayed: a ` ```math ` code block, or `$$ … $$` on lines of their own. Prefer the code block: it never collides with Markdown.
- **Inline formulas stay short**: a symbol, a name or a short relation, such as $`\Lambda(A)`$ or $`A \in SL(2,\mathbb{C})`$. A formula with a fraction, a trace, a sum or an integral, indices above and below, or more than about five symbols is displayed. Inline, such a formula stretches its line and is hard to pick out of the sentence. This holds in key claims and list items too. There, the formula gets a line of its own, indented to the item's text, with an empty line before and after it: `$$\displaystyle … $$` on one line. A ` ```math ` block doesn't work inside a list: as soon as any item of the list contains inline math, GitHub shows the block as LaTeX source code. `\displaystyle` keeps fractions at full size. Decided by Thomas, 13 November 2026. The list behaviour was found in [#50](https://github.com/thomaswening/doubting-thomas/pull/50).
- A literal dollar sign in prose is written `\$`.
- GitHub rejects some macros and shows "The following macros are not allowed" in place of the formula. `\operatorname` is one of them: write `\mathrm{tr}` instead of `\operatorname{tr}`. Found in [#43](https://github.com/thomaswening/doubting-thomas/pull/43), 12 November 2026.
- Don't put quotation marks directly around a formula: GitHub does not recognise `"$a \ge b$"` as math. Write `meaning $a \ge b$` instead.
- Write formulas in LaTeX everywhere a formula appears, key claims included. Code, identifiers and program output stay in backticks: `arb_t`, `x^2 - 1` as typed into a program.
- Check that the note renders on GitHub before asking for review (§9): in the pull request's *Files changed* tab, choose *Display the rich diff*, or open the file on its branch.

**Snippets use only what Thomas already knows:** C#/.NET, basic C++20, and the note's prerequisites. Any other feature in a snippet is either explained right there or left out. This includes keywords such as `explicit`, member initialiser lists, move constructors and `std::exchange`. Keep each example to the smallest code that shows the concept. An advanced version belongs in the note whose topic it is, with a link to it.

### Mathematics and physics notes

Thomas learns mathematics by speaking it. He wants each statement written as a textbook writes it, together with the idea behind it. Rigour without motivation doesn't work for him, and neither does intuition without rigour. A note in mathematics or physics follows the rules above, plus the ones in this section. Decided by Thomas, 12 November 2026, in the review of [#40](https://github.com/thomaswening/doubting-thomas/pull/40).

**Formal statements, each explained.** Definitions, propositions, lemmas and theorems appear in textbook form: a bold label, then the statement.

```markdown
**Definition (quotient space).** Let $X$ be a topological space and $\sim$ an equivalence relation on $X$. …
```

Right after each one, the text answers whichever of these questions apply:

- What does it say in words? What does each symbol stand for?
- What does it represent? What picture can you draw?
- What does it look like in a lower dimension, or in the simplest case?
- Why is it defined this way and not more simply?
- Which examples fit, and which non-examples don't? A non-example shows what a condition is there for. For example, $t \mapsto (\cos t, \sin t)$ from $[0, 2\pi)$ to the circle is a continuous bijection whose inverse is not continuous. It shows why a homeomorphism needs a continuous inverse.

Notation comes after the idea it names: first the operation is understood, then it gets its symbol.

**Full proofs, in two layers.** Every result that belongs to the note's concept is proved. The **proof idea** comes first, in the open text: the picture and the one trick the proof rests on. The **full proof** follows in a collapsed block, `<details><summary>Proof</summary>`, with the empty lines that §2 asks for. Each step that uses an earlier result links it: a claim, a note or a cited result.

**Every gap is labelled.** A result that the note uses but doesn't prove is **cited**. It is stated precisely and marked *(cited)*, with a link to its note or to a source with a theorem or page number, in the form "Author, *Title*, Theorem 4.2". Nothing is used without being either proved or cited, because a leap of faith Thomas doesn't notice is the error this rule prevents. How much a citation explains depends on how obvious the result is:

- An **intuitive** result gets its statement and the label, nothing more.
- A **non-obvious** result also gets a short motivation: a picture, a low-dimensional case, or why it can't be otherwise. This is not a proof. It makes the leap of faith a reasonable one.

**Rigour budget.** A note proves what belongs to its own concept and cites what lies below it. A cited result gets a note of its own when a second note needs it, or when Thomas asks about it. Until then it can wait in the backlog (§8). Foundations grow from questions, not as a course.

**Physics: derivations with their assumptions.** In physics, a derivation takes the place of a proof. It lists its assumptions and approximations up front, marks where each one enters, and says what changes without it. A heuristic argument is allowed when it is labelled *(heuristic)* and says what a rigorous version would need.

**Claims and exercises.** The key claims of such a note are mostly its definitions and results, stated precisely. A claim that has a proof links to it. Exercises include proofs: "prove C4", "reconstruct the proof of C2 from its idea", "which condition of the definition fails here?".

**Sources.** Prefer a standard textbook. Follow its notation and its proofs, and cite it by theorem or page number, so that Thomas can check a proof against the book. Paraphrase and cite; never copy passages. Thomas's university textbooks are in the `eBooks` folder of his Google Drive. If a Google Drive connector is available, look there before the web.

## 3. Key claims

Key claims are what makes a note testable: a quiz question is built from a claim, and an answer is graded against it.

- Each claim is one or two sentences that are **true on their own**, without the rest of the note, and **checkable**: a reader can say whether an answer agrees with them. "Ball arithmetic tracks errors" is not a claim; "If two balls overlap, `a < b` cannot be decided" is.
- Format, one per bullet, with an anchor:
  `- <a id="c3"></a>**C3.** If two balls overlap, …`
- An empty line separates two claims. GitHub then spaces the claims like paragraphs instead of packing them into one block. A claim's main formula follows the rule for displayed formulas (§2):

  ```markdown
  - <a id="c3"></a>**C3.** For $`A \in SL(2,\mathbb{C})`$, the map $`X \mapsto A X A^\dagger`$ defines a Lorentz transformation $`\Lambda(A)`$ with matrix

    $$\displaystyle \Lambda(A)^\mu{}_\nu = \frac12 \mathrm{tr}(\sigma_\mu A \sigma_\nu A^\dagger).$$

  - <a id="c4"></a>**C4.** …
  ```
- **IDs are stable and never renumbered or reused.** A new claim takes the next free number, wherever it sits in the list. A claim found to be wrong is not deleted: it keeps its ID and is marked `**C4.** *(withdrawn 2026-11-02: reason)*`, with a corrected claim under a new ID. The results log refers to claim IDs, so renumbering would corrupt it.
- Aim for four to ten claims per note. More means the note should be split.

## 4. Ids and links

- A **note id** is its path under `topics/` without `.md`: `numerics/ball-arithmetic`.
- A **claim id** is the note id, `#`, and the claim anchor: `numerics/ball-arithmetic#c3`.
- In Markdown, every reference to a note or claim is a real relative link: `[ball arithmetic](../numerics/ball-arithmetic.md)`, `[C3](../numerics/ball-arithmetic.md#c3)`. Ids in front matter and in results tables are plain ids, not links.

## 5. Projects, sources and confidentiality

**Thomas's projects** and their repositories:

| Name in `projects` | Repository |
|---|---|
| `tante` | [Tante](https://github.com/thomaswening/Tante): a symbolic math engine for physicists, successor to FORM |
| `partonforge` | [PartonForge](https://github.com/thomaswening/PartonForge): a C++20 reimplementation of the Parton Branching TMD evolution Monte Carlo |
| `crateedit` | [CrateEdit](https://github.com/thomaswening/CrateEdit): a tag editor for DJ music collections that never touches cue points |

- In a note's text, the **first mention of a project in each section** links to its repository: `[Tante](https://github.com/thomaswening/Tante)`. Later mentions in the same section are plain text. A project not yet in the table is added to it in the same pull request.
- `projects` records where a concept came up or matters; it is metadata, not organisation. Notes stay organised by concept (§1).

- Under `## Sources`, link where the knowledge came from (a pull request or ADR in one of Thomas's repositories, a book, a paper, documentation) and where to read further. Name the session if it came from a conversation: `Claude session on Tante, 2026-10-19`.
- **Confidential material never enters this repository.** Code, names, file paths and identifiers from an employer's or a client's codebase, or from any repository Thomas does not own, are not copied. **Before writing a note whose source is such code, ask Thomas.** If he agrees, explain the concept with a snippet rewritten from scratch in generic terms, and give no link to the confidential source.
- No secrets, keys, tokens, passwords or personal data, ever.

## 6. Writing to this repository

- **Notes and everything outside `results/` and `backlog.md`** change only through a pull request to `main`, one coherent batch per pull request, which Thomas reviews and merges. Never commit these directly to `main`, and never merge a pull request yourself. **A note on `main` has been reviewed by Thomas**: merging is his review.
- **At most three notes per pull request**, counting new notes and notes with substantial changes. A note split during review counts with all its parts. If the parts exceed the limit, they go into pull requests stacked on this one.
- **Prerequisites first.** Before writing a note, list what its explanation relies on. Each item must be something Thomas already knows (§2) or an existing note. A missing item is a note of its own: write it first, in its own pull request. Stack the note that needs it on that branch. A note whose explanation has to stop for background is a sign that this step was skipped.
- **A note that comes up while a pull request is under review goes into its own pull request**, never into the one under review. If it depends on the one under review, stack it on that branch. A topic that only *could* become a note goes into the backlog instead (§8).
- **Answer review questions in the note.** A question in a review shows where the note is unclear. Fix it in the note: clearer text, a comment in the snippet, or a new claim or pitfall. Then reply on the thread and say what changed. A reply on its own is lost once the pull request is merged.
- **Results** (`results/`) and **backlog lines** (`backlog.md`, §8) are the two exceptions: commit them directly to `main`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `docs(numerics): add ball arithmetic`, `docs(cpp): correct C4 in move semantics`, `chore(results): quiz on ball arithmetic`, `chore(backlog): add cpp/copy-elision`. The scope is the area, or `results`, or `backlog`, or `repo` for changes to the structure.
- When changing a note, update its `updated` date. Keep existing claim IDs (§3).
- **Before asking for review**, run the checks of §9 and report them in the pull request.

## 7. Testing Thomas and logging results

Any AI may quiz Thomas or set him exercises from this repository. The rules:

- **Ground every question in a key claim** and grade the answer against that claim, not against general knowledge. If a claim seems wrong to you, say so to Thomas instead of grading against it.
- Mix kinds: recall (state the claim), application (use it on a new case), explanation (say why), spotting errors (a pitfall). Exercises may ask for code.
- At the end of the session, **write one results file** as described in [results/README.md](results/README.md) and commit it directly to `main`. If you cannot write to the repository, give Thomas the complete file to commit himself.
- Never edit an earlier results file. A correction is a new file.

To find what Thomas should work on, read `results/` and the indexes:

- **Weak spots:** claims whose most recent outcome is `wrong` or `partial`.
- **Never tested:** notes in an area index that no results file mentions.
- **Due for a refresh:** notes not tested for 60 days or more.

## 8. Backlog

[backlog.md](backlog.md) lists topics that came up and could become notes, so that none is lost and open pull requests stay the notes Thomas has chosen to read now.

- **Add an entry only when Thomas asks for it** ("put X into the backlog"), for example for a review question that goes beyond the note under review or for a checkpoint candidate he wants kept for later. Candidates he doesn't mention are left alone. Before adding, check the area indexes and the open pull requests.
- **Format**: one line under its area's heading, `` - `<area>/<note>`: <the question or concept>. Came up in <where>, linked. `` The note id follows §1 and §4. A new area gets a new heading.
- **Commit backlog changes directly to `main`** (§6), as `chore(backlog): …`, never inside a pull request. A backlog line is a pointer, not knowledge: nothing is quizzed from it, so it needs no review. Thomas weeds it when entries are proposed.
- **When proposing notes**, read the backlog too, and list its entries in a group of their own, apart from the candidates of the current session, so that Thomas can tell what just came up from what has been waiting.
- **When Thomas rejects an entry**, at a proposal or whenever he goes through the backlog, remove it on `main`.
- **When a note is written from an entry**, remove the entry on `main` once the note's pull request is open, and name the entry in the pull request's description. The note's `## Sources` keeps where it came from. If Thomas closes the pull request without merging and wants the topic kept, put the entry back.

## 9. Checks before review

Run both checks before asking Thomas to review a pull request. A wrong claim or a dead link is cheaper to fix before review than after merging: the results log grades answers against the claims.

### Links and anchors

**Every relative link points at an existing file, and its `#fragment` at an anchor there**: a heading or a claim anchor `<a id="c3"></a>`. Splitting or renaming a note moves claims. A link to `[C3](../c/array-parameters.md#c3)` then lands on the wrong claim or nowhere.

```bash
python tools/check_docs.py . --markdown "topics/**/*.md" "templates/*.md" "*.md"
```

`tools/check_docs.py` is a copy of the docs check of Thomas's `project-docs` skill. Its first line names the version it was copied from (`head -1 tools/check_docs.py`). Its rules, messages and fixes are documented in [docs-check.md](https://github.com/thomaswening/claude-config/blob/main/skills/project-docs/references/docs-check.md), sections "Links and anchors" and "Mermaid". Here only those two checks apply: this repository has no `docs/` folder, so the requirement, ADR, roadmap and glossary checks are skipped.

- **When it runs:** on every pull request, in the `docs-check` workflow ([.github/workflows/docs-check.yml](.github/workflows/docs-check.yml)). A failure turns the pull request's check red. CI also renders every Mermaid block. Locally that needs Node's `npx`. Without it, the checker prints a note and skips them.
- **When it fails:** each `error:` line names the file, the line and the link. Point the link at the note or claim as it is now. Never renumber a claim to fix a link (§3).
- **Changing it:** the checker is changed in claude-config first, then copied here with its version line in a pull request of its own.

### Snippets

**Every snippet with an expected output, and every line marked as an error, is compiled and run with GCC and Clang before review.** A claim about what a compiler does is easy to get wrong from memory. In [#11](https://github.com/thomaswening/doubting-thomas/pull/11), passing `int[3][4]` as `int**` was claimed not to compile in C. GCC 13 and Clang 18 only warn.

- A snippet followed by "Expected output:" must print exactly that output with both compilers. Warnings the note mentions must appear. Warnings it does not mention are worth a sentence in the note if `-Wall -Wextra` gives them.
- A commented-out line marked `// error: …` must fail to compile with both compilers once it is uncommented, one such line at a time, for the reason the comment gives. If it only warns, or only fails with `-pedantic-errors`, the note says so.
- C uses `-std=c17 -Wall -Wextra`, C++ `-std=c++20 -Wall -Wextra`. On Thomas's PC, both compilers are in WSL (`Ubuntu-24.04`: GCC 13.3, Clang 18.1). From PowerShell:

  ```text
  wsl -d Ubuntu-24.04 -- bash -c "gcc -std=c17 -Wall -Wextra /mnt/c/path/snip.c -o /tmp/a && /tmp/a"
  wsl -d Ubuntu-24.04 -- bash -c "g++ -std=c++20 -Wall -Wextra /mnt/c/path/snip.cpp -o /tmp/a && /tmp/a"
  ```

  For Clang, use `clang` and `clang++` with the same flags.
- C# snippets and fragments without a `main` are not compiled. Say so in the pull request if a claim rests on one.

### Proofs

**Every proof is checked against its source before review.** Nothing compiles a proof, and a wrong step can read as smoothly as a right one.

- A proof that follows a textbook names the book and the theorem. Check each step against it.
- A proof without a textbook source is marked as such in the pull request, so that Thomas checks it line by line.
- Where a formula can be checked numerically (an identity, a matrix, a special case), do so with a throwaway script and report it.

### Verification in the pull request

The pull request's description ends with a short section `## Verification`: what was run, its result, and what was not checked. Example:

```markdown
## Verification

- `tools/check_docs.py`: 0 errors.
- Snippets: 6 C and 3 C++ snippets with GCC 13.3 and Clang 18.1, outputs as stated. The `// error` lines in constructors.md fail with both.
- Not checked: the C# comparison in copy-and-move.md (no `main`). Mermaid blocks (no Node locally; CI renders them).
```
