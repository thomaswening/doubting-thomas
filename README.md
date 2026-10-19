# doubting-thomas

What I've learned, written down so I can look it up, and so any AI can test me on it. Every note states its key claims so that they can be checked, which is the point of the name.

## Reading

Start at [topics/index.md](topics/index.md). Each area has an index, and each note covers one concept:

- **TL;DR**: the gist in a few bullets.
- **Key claims**: numbered statements (C1, C2, …) that are true on their own. These are what a quiz is built from and graded against.
- **Explanation**, **Examples** with snippets, **Pitfalls** and **Sources**.

## Getting tested

Point any AI with access to this repository (ChatGPT with the GitHub connector, Claude, Codex) at it and ask, for example:

> Read AGENTS.md in my doubting-thomas repository, then quiz me on `numerics/ball-arithmetic`: eight questions, one at a time, mixed kinds. Afterwards write the results file as results/README.md describes.

Or: "Look at my results and quiz me on my weak spots", or "What haven't I been tested on yet?". [AGENTS.md](AGENTS.md) tells the AI how to ask, grade and log; [results/README.md](results/README.md) describes the log.

## How notes get here

Claude proposes notes at natural checkpoints in a working session, and I pick which ones to keep. Notes arrive as pull requests, and merging one is my review: everything on `main` I have read. Quiz results are the exception and go straight to `main`. Nothing from an employer's or client's code goes in; see [AGENTS.md §5](AGENTS.md#5-sources-and-confidentiality).

## Layout

```
topics/<area>/<note>.md   the notes
results/                  how I did when tested
templates/                starting points for a note and a results file
AGENTS.md                 the rules for any AI working here
```
