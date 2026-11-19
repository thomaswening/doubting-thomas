---
title: Standard streams, redirection and pipes
area: bash
created: 2026-10-29
updated: 2026-10-29
prerequisites: []
related: []
projects: [partonforge]
tags: [bash, shell, stdin, stdout, stderr, file-descriptor, redirection, pipe, dev-null, pipefail, std-system]
---

# Standard streams, redirection and pipes

## TL;DR

- Every process starts with three open streams: standard input (0), standard output (1) and standard error (2). In C# they are `Console.In`, `Console.Out` and `Console.Error`; in C++, `std::cin`, `std::cout` and `std::cerr`.
- `cmd < file` reads standard input from a file. `cmd > file` writes standard output to a file, emptying it first, and `>>` appends. `2>` does the same for standard error.
- The **shell** sets up the redirections before the program starts. The program just reads and writes its streams and never learns that a file is involved.
- Redirections are applied left to right. That matters only when one refers to another: `> out 2>&1` sends both streams to `out`, while `2>&1 > out` does not.
- `a | b` connects a's standard output to b's standard input. Both run at the same time. A pipeline's exit status is that of its last command, unless `set -o pipefail` is on.

## Key claims

- <a id="c1"></a>**C1.** A process starts with three open file descriptors: 0 standard input, 1 standard output and 2 standard error. In a terminal all three are connected to the terminal; C++'s `std::cin`, `std::cout` and `std::cerr` and C#'s `Console.In`, `Console.Out` and `Console.Error` use them.
- <a id="c2"></a>**C2.** `cmd < file` opens `file` for reading as cmd's standard input; `cmd > file` creates `file`, or empties it if it exists, as cmd's standard output; `cmd >> file` appends instead of emptying; `cmd 2> file` redirects standard error.
- <a id="c3"></a>**C3.** The shell performs the redirections before it starts the program, and removes them from the command line, so the program does not receive them as arguments and reads and writes its standard streams as usual.
- <a id="c4"></a>**C4.** Redirections are applied from left to right, and `2>&1` makes descriptor 2 a copy of what descriptor 1 is at that moment; so `cmd > out 2>&1` sends both streams to `out`, while `cmd 2>&1 > out` sends standard error to where standard output pointed before, usually the terminal, and only standard output to `out`.
- <a id="c5"></a>**C5.** `a | b` connects a's standard output to b's standard input and runs both programs at the same time; a's standard error is not passed through the pipe.
- <a id="c6"></a>**C6.** `/dev/null` discards everything written to it and is empty when read, so `cmd 2> /dev/null` hides cmd's error messages but keeps its exit status.
- <a id="c7"></a>**C7.** In bash, the exit status of a pipeline is that of its last command, so `false | true` succeeds; with `set -o pipefail` it is that of the last command that failed.
- <a id="c8"></a>**C8.** C and C++'s `std::system(command)` passes the string to a shell (`/bin/sh -c` on POSIX systems, `cmd.exe /c` on Windows), so redirections written in the string take effect as they would at a prompt.

## Explanation

### Three streams every program has

A program does not open its input and output by name. It inherits three already open channels, numbered 0, 1 and 2 ([C1](#c1)). Standard error exists so that messages stay visible when the output goes to a file: a program can write its results to 1 and its complaints to 2.

### Redirection is the shell's work

`sort < fruit.txt > sorted.txt` does not pass `<` or `fruit.txt` to `sort` ([C3](#c3)). Before starting `sort`, the shell opens `fruit.txt` and makes it descriptor 0. It creates `sorted.txt` and makes it descriptor 1. Then it starts `sort` with no arguments. `sort` reads standard input and writes standard output, as it always does ([C2](#c2)).

So there is no "first run, then feed in, then collect". The files are connected first. The program then reads and writes as it goes, line by line if it likes. The order in which `<` and `>` appear on the line does not matter, because neither refers to the other.

### When order matters

`2>&1` means "make descriptor 2 point where descriptor 1 points *now*" ([C4](#c4)). It copies a connection, not a name. In `cmd > out 2>&1`, descriptor 1 already points at `out` when the copy is made, so both streams go there. In `cmd 2>&1 > out`, the copy is made while descriptor 1 still points at the terminal. Descriptor 2 keeps pointing there, and only descriptor 1 moves to `out`.

### Pipes

A pipe connects two programs instead of a program and a file ([C5](#c5)). `printf ... | sort | head -n 2` starts all three at once. Each reads what the previous one writes as soon as it arrives. The data is never stored in a file. Error messages bypass the pipe and still reach the terminal.

A pipeline reports only its last command's exit status ([C7](#c7)). A failing first stage goes unnoticed unless `set -o pipefail` is on. That is why CI scripts often start with `set -euo pipefail`.

### Throwing output away

`/dev/null` is a device that accepts everything and keeps nothing ([C6](#c6)). Redirecting to it silences a stream, but the exit status still reports success or failure. On Windows, `cmd.exe` calls it `NUL`.

### From inside a program

A C++ program can run another program through `std::system`, which hands the whole string to a shell ([C8](#c8)). Redirections in that string work as they do at a prompt. `std::system("\"./tool\" < in.txt > out.txt")` runs `tool` with `in.txt` as its input and its output in `out.txt`.

## Examples

Input and output redirection:

```bash
cd "$(mktemp -d)"
printf 'banana\napple\ncherry\n' > fruit.txt   # > creates fruit.txt and sends printf's output there
sort < fruit.txt                              # < makes fruit.txt sort's standard input
sort < fruit.txt > sorted.txt                 # both at once: nothing appears on screen
cat sorted.txt
echo "date" >> sorted.txt                     # >> appends
tail -n 1 sorted.txt
```

Expected output:

```
apple
banana
cherry
apple
banana
cherry
date
```

Standard error, and why the order of `2>&1` matters:

```bash
cd "$(mktemp -d)"
ls missing-file > out.txt 2> err.txt          # stdout and stderr to separate files
echo "out: $(wc -c < out.txt) bytes"
echo "err: $(cat err.txt)"
ls missing-file > both.txt 2>&1               # stderr goes where stdout goes: both.txt
echo "both: $(cat both.txt)"
ls missing-file 2>&1 > only-out.txt           # stderr goes where stdout went *before*: the screen
echo "only-out: $(wc -c < only-out.txt) bytes"
```

Expected output (the fourth line is the error message from the last `ls`, printed on the terminal):

```
out: 0 bytes
err: ls: cannot access 'missing-file': No such file or directory
both: ls: cannot access 'missing-file': No such file or directory
ls: cannot access 'missing-file': No such file or directory
only-out: 0 bytes
```

Pipes, `/dev/null` and exit statuses:

```bash
printf 'banana\napple\ncherry\n' | sort | head -n 2   # each | connects stdout to the next stdin
ls missing-file 2> /dev/null; echo "exit status $?"   # error message discarded, status kept
false | true; echo "pipeline status $?"               # the last command decides
set -o pipefail
false | true; echo "with pipefail $?"
```

Expected output:

```
apple
banana
exit status 2
pipeline status 0
with pipefail 1
```

Redirections are not arguments:

```bash
cd "$(mktemp -d)"
printf '#!/bin/bash\necho "arguments: $#"\n' > count.sh
bash count.sh < /dev/null > result.txt        # redirections are not arguments
cat result.txt
```

Expected output:

```
arguments: 0
```

## Pitfalls

- `cmd 2>&1 > out` to capture everything in `out`. Standard error still goes to the terminal ([C4](#c4)).
- `> file` on a file you meant to extend. It empties the file first; `>>` appends ([C2](#c2)).
- `sort < data.txt > data.txt`. The shell empties `data.txt` before `sort` starts, so `sort` reads an empty file.
- Trusting a pipeline's success when an early stage can fail. Without `pipefail`, only the last command counts ([C7](#c7)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-28: the walkthrough of `run_reference` in `tests/test_gfortran_diff.cpp`, [PR 1](https://github.com/thomaswening/PartonForge/pull/1), which runs the Fortran reference program as `"prog" < bits.txt > gfortran.txt` through `std::system`. The backlog entry came from the GitHub Actions workflow review for PartonForge.
- GNU Bash manual: [Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html), [Pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html).
- cppreference: [`std::system`](https://en.cppreference.com/w/cpp/utility/program/system).
