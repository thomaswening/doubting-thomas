---
title: main, its arguments and exit codes
area: cpp
created: 2026-10-25
updated: 2026-10-25
prerequisites: [c/strings, c/array-parameters]
related: [cpp/raii-and-ownership, cpp/arrays-and-containers]
projects: [partonforge]
tags: [cpp, main, argc, argv, exit-code, exit-status, shell, ci]
---

# main, its arguments and exit codes

## TL;DR

- `int main(int argc, char** argv)` receives the command line as C strings. `argc` counts them. `argv[0]` is the program's own name and `argv[1]` the first real argument.
- C#'s `Main(string[] args)` leaves the program name out, so `args[0]` there is `argv[1]` here.
- There is no `main(std::vector<std::string>)`. Convert with `std::vector<std::string> args(argv, argv + argc);`.
- The value `main` returns is the program's **exit status**. Falling off the end of `main` returns 0.
- By convention 0 means success and anything else failure. `diff` and `grep` refine it: 1 for a negative answer, 2 for trouble.
- Shells, CTest and CI all read this number. A non-zero exit fails a test or a CI step.

## Key claims

- <a id="c1"></a>**C1.** The two standard forms are `int main()` and `int main(int argc, char* argv[])`, the latter also written `char** argv`; `argc` is the number of entries in `argv`, and `argv[argc]` is a null pointer.
- <a id="c2"></a>**C2.** `argv[0]` holds the name the program was started with (or an empty string), so the first real argument is `argv[1]`; C#'s `Main(string[] args)` excludes the program name, so the first argument is `args[0]`.
- <a id="c3"></a>**C3.** `std::vector<std::string> args(argv, argv + argc);` copies all command-line arguments, program name included, into a vector of strings.
- <a id="c4"></a>**C4.** The value returned from `main` becomes the process's exit status; if control reaches the end of `main` without a `return`, the effect is `return 0;`, a rule that applies to `main` only.
- <a id="c5"></a>**C5.** By convention exit status 0 means success and any other value failure; `diff` and `grep` return 1 for a negative result (the files differ, nothing matched) and 2 for an error such as a missing file or wrong usage.
- <a id="c6"></a>**C6.** On Linux and other POSIX systems only the low 8 bits of the exit status reach the parent process, so a program that exits with 256 is seen as having exited with 0.
- <a id="c7"></a>**C7.** `std::exit(code)` ends the program without destroying the local objects of the functions still running, so their destructors do not run; returning from `main` destroys `main`'s locals first.
- <a id="c8"></a>**C8.** Bash stores the last command's exit status in `$?`, PowerShell stores a native program's in `$LASTEXITCODE`, and CTest and CI systems such as GitHub Actions count a test or step as failed when its process exits with a non-zero status.

## Explanation

### Arguments arrive as C strings

C++ inherits `main` from C, and the operating system passes the command line as an array of C strings ([strings in C](../c/strings.md)). `argc` is how many there are. `argv` is an array of `argc` pointers, each to a zero-terminated `char` array, with a null pointer after the last ([C1](#c1)). As a parameter, `char* argv[]` is the same as `char** argv` ([array parameters](../c/array-parameters.md#c1)).

The first entry is the program's own name ([C2](#c2)). This differs from C#, where `args` holds only the arguments. An off-by-one here is the classic mistake when moving between the two.

Most programs want strings, not `char*`. The vector constructor that takes a range copies every entry into a `std::string` ([C3](#c3)). Pointers into an array work as that range's begin and end, as iterators do.

### The exit status

When `main` returns, its value becomes the process's **exit status** ([C4](#c4)), as `return 1;` from C#'s `static int Main` does. A `main` without `return` returns 0. For any other function with a non-`void` return type, reaching the end without a `return` is undefined behaviour.

The shell that started the program, or the CI runner, receives that number ([C8](#c8)). By convention 0 means success ([C5](#c5)). Some tools use the other values to say more. `diff` returns 0 if the files are equal, 1 if they differ and 2 if something went wrong. A script can then tell "the answer is no" from "the question could not be asked". [PartonForge](https://github.com/thomaswening/PartonForge)'s `pf_grid` follows the same scheme: 1 when a round-trip differs, 2 for wrong usage.

On Linux the parent sees only the low 8 bits ([C6](#c6)), so portable exit codes stay between 0 and 255. Windows passes a full 32-bit value.

### std::exit skips your destructors

`std::exit` ends the program immediately ([C7](#c7)). The functions that are still running never return, so their local objects are never destroyed. Destructors that flush a file or remove a temporary directory do not run. Returning from `main` instead destroys `main`'s locals first. Prefer `return` from `main`, and let errors travel there as exceptions or return values ([RAII and ownership](raii-and-ownership.md#c2)).

## Examples

Printing the command line, compiled with `g++ -std=c++20` and run as `./args one two`:

```cpp
#include <iostream>
#include <string>
#include <vector>

int main(int argc, char** argv) {
    std::vector<std::string> args(argv, argv + argc);
    std::cout << argc << ':';
    for (const std::string& arg : args) std::cout << ' ' << arg;   // C#'s foreach
    std::cout << '\n';
}
```

Output:

```text
3: ./args one two
```

Exit codes seen from Bash:

```bash
diff a.txt a.txt; echo $?      # 0: equal
diff a.txt b.txt; echo $?      # 1: different
diff a.txt missing; echo $?    # 2: trouble
```

The `main` of PartonForge's `pf_grid`, with named exit codes. `int main(…) try { … } catch (…) { … }` is a *function-try-block*: the `try` covers the whole body, so an exception from any command ends in the `catch`, which prints it and returns 1:

```cpp
constexpr int kExitSuccess = 0;
constexpr int kExitFailure = 1;
constexpr int kExitUsage = 2;

int main(int argc, char** argv) try {
    if (argc < 3) return usage();                // returns kExitUsage
    const std::string command = argv[1];
    if (command == "info") return show_info(argv[2]);
    // ...
    return usage();
} catch (const std::exception& error) {
    std::cerr << "error: " << error.what() << '\n';
    return kExitFailure;
}
```

## Pitfalls

- Taking `argv[0]` as the first argument, out of C# habit ([C2](#c2)).
- Returning 256, or −1, to signal an error on Linux. The parent sees 0 and 255 ([C6](#c6)).
- Calling `std::exit` deep inside the program to stop on an error, and losing what destructors would have written or removed ([C7](#c7)).
- A test program that prints "FAILED" but returns 0. CTest and CI only look at the exit status ([C8](#c8)).

## Sources

- Claude session on [PartonForge](https://github.com/thomaswening/PartonForge), 2026-10-25: Thomas's review of [PR 1](https://github.com/thomaswening/PartonForge/pull/1) asked why `usage()` returns 2, and what `int argc, char** argv` are.
- [cppreference: main function](https://en.cppreference.com/w/cpp/language/main_function), [`std::exit`](https://en.cppreference.com/w/cpp/utility/program/exit), [function-try-block](https://en.cppreference.com/w/cpp/language/function-try-block).
- [GNU diffutils: invoking diff](https://www.gnu.org/software/diffutils/manual/html_node/Invoking-diff.html) (exit status), [GNU grep: exit status](https://www.gnu.org/software/grep/manual/grep.html#Exit-Status).
