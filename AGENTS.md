# Instructions for AI assistants

This file is the single rulebook for any AI that reads or writes this repository: Claude, ChatGPT, Codex or another. Read it in full before writing anything. [README.md](README.md) is the same story told for a human reader.

**What this repository is.** Thomas's personal knowledge base. Every note records something he has learned, written so that he can read it as a reference and so that an AI can build exercises and quizzes from it. The `results/` folder logs how he did when tested, so that weak spots and topics to refresh can be found later.

**Who Thomas is**, for pitching explanations: a .NET (C#) developer with some C++20 and no Rust, working on research software with a mathematical and physics flavour. Where a concept has a .NET counterpart, compare to it.

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
7. **`## Pitfalls`** (optional): common mistakes and misreadings. These make good quiz questions.
8. **`## Sources`**: where this was learned and where to read more, as links (§5).

Style: plain, precise, short sentences. Define a term before using it. One idea per paragraph.

**Mathematics is written in LaTeX**, which GitHub and VS Code's Markdown preview render natively, and which an AI reads directly from the source:

- Inline: `$\gcd(p, q) = x - y$`. If the expression contains characters Markdown would interpret, such as `*`, `_` or `\`, use the backtick form `` $`a_1 * b_1`$ ``.
- Displayed: a ` ```math ` code block, or `$$ … $$` on lines of their own. Prefer the code block: it never collides with Markdown.
- A literal dollar sign in prose is written `\$`.
- Don't put quotation marks directly around a formula: GitHub does not recognise `"$a \ge b$"` as math. Write `meaning $a \ge b$` instead.
- Write formulas in LaTeX everywhere a formula appears, key claims included. Code, identifiers and program output stay in backticks: `arb_t`, `x^2 - 1` as typed into a program.
- Check that the note renders on GitHub before asking for review: in the pull request's *Files changed* tab, choose *Display the rich diff*, or open the file on its branch.

**Snippets use only what Thomas already knows:** C#/.NET, basic C++20, and the note's prerequisites. Any other feature in a snippet is either explained right there or left out. This includes keywords such as `explicit`, member initialiser lists, move constructors and `std::exchange`. Keep each example to the smallest code that shows the concept. An advanced version belongs in the note whose topic it is, with a link to it.

## 3. Key claims

Key claims are what makes a note testable: a quiz question is built from a claim, and an answer is graded against it.

- Each claim is one or two sentences that are **true on their own**, without the rest of the note, and **checkable**: a reader can say whether an answer agrees with them. "Ball arithmetic tracks errors" is not a claim; "If two balls overlap, `a < b` cannot be decided" is.
- Format, one per bullet, with an anchor:
  `- <a id="c3"></a>**C3.** If two balls overlap, …`
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

- **Notes and everything outside `results/`** change only through a pull request to `main`, one coherent batch per pull request, which Thomas reviews and merges. Never commit these directly to `main`, and never merge a pull request yourself. **A note on `main` has been reviewed by Thomas**: merging is his review.
- **At most three notes per pull request**, counting new notes and notes with substantial changes.
- **A note that comes up while a pull request is under review goes into its own pull request**, never into the one under review. If it depends on the one under review, stack it on that branch. A topic that only *could* become a note goes into the backlog instead (§8).
- **Answer review questions in the note.** A question in a review shows where the note is unclear. Fix it in the note: clearer text, a comment in the snippet, or a new claim or pitfall. Then reply on the thread and say what changed. A reply on its own is lost once the pull request is merged.
- **Results** (`results/`) are the one exception: commit them directly to `main`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `docs(numerics): add ball arithmetic`, `docs(cpp): correct C4 in move semantics`, `chore(results): quiz on ball arithmetic`. The scope is the area, or `results`, or `repo` for changes to the structure.
- When changing a note, update its `updated` date. Keep existing claim IDs (§3).

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

- **Add an entry** when a question or concept comes up that no note or open pull request covers and that Thomas does not want written up yet: a review question that goes beyond the note under review, or a candidate Thomas did not pick at a checkpoint. Check the area indexes and the open pull requests first.
- **Format**: one line under its area's heading, `` - `<area>/<note>`: <the question or concept>. Came up in <where>, linked. `` The note id follows §1 and §4. A new area gets a new heading.
- An entry may be added in **any pull request**, including one under review: a backlog line is not a note, so the rules of §6 on notes per pull request do not count it. It still never goes directly to `main`.
- **When proposing notes**, look in the backlog first, and say which candidates come from it.
- **When a note is written from an entry**, remove the entry in the same pull request. The note's `## Sources` keeps where it came from.
