---
title: Static analysis for C++
area: cpp
created: 2026-10-20
updated: 2026-10-20
prerequisites: []
related: [cpp/sanitizers]
projects: [tante]
tags: [cpp, static-analysis, clang-tidy, sonarqube, ci, warnings, core-guidelines]
---

# Static analysis for C++

## TL;DR

- **Static analysis** reads source code without running it and reports likely bugs and style problems. Sanitizers do the opposite: they check the running program.
- C++ has three layers: **compiler warnings** (made errors with `-Werror` or `/WX`), a **linter** such as **clang-tidy**, and IDE plugins such as **SonarQube for IDE** or Visual Studio's Code Analysis.
- clang-tidy is free, open source, needs no server or account, runs the same on Windows, macOS and Linux, and can fail a CI build. That makes it a good gate for every change.
- IDE plugins give feedback while typing. They are a useful addition, not a substitute for a check that CI enforces.

## Key claims

- <a id="c1"></a>**C1.** Static analysis examines source code without executing it, so it can flag problems on code paths no test runs; dynamic tools such as sanitizers only see the paths that actually execute.

- <a id="c2"></a>**C2.** Compiler warnings are the first layer of static analysis; flags such as `-Werror` (GCC, Clang) and `/WX` (MSVC) turn every warning into an error, so that code with warnings does not build.

- <a id="c3"></a>**C3.** clang-tidy is the linter of the LLVM project: open source, run from the command line or CI with a committed `.clang-tidy` file that selects its checks, and able to return a failing exit code on findings.

- <a id="c4"></a>**C4.** clang-tidy's check groups include `bugprone-*` (likely bugs), `cppcoreguidelines-*` (rules from the C++ Core Guidelines), `modernize-*` (replacing older idioms with modern C++) and `performance-*`.

- <a id="c5"></a>**C5.** The C++ Core Guidelines are a public set of rules for writing safe, modern C++, edited by Bjarne Stroustrup and Herb Sutter; tools such as clang-tidy and Visual Studio's Code Analysis enforce parts of them.

- <a id="c6"></a>**C6.** Static analysis reports possible problems and can give false positives, and it does not prove a program free of bugs; a project chooses which checks to enable and suppresses individual findings explicitly.

## Explanation

### Static and dynamic

A **static** tool reads the code. A **dynamic** tool watches the program run. Static analysis can look at every line, including error paths that tests rarely reach ([C1](#c1)). But it reasons about what *might* happen, so it misses some bugs and reports some non-bugs ([C6](#c6)). Sanitizers ([sanitizers](sanitizers.md)) see only what actually happens, and are almost never wrong about it. Projects use both.

### Layer 1: compiler warnings

The compiler already warns about many mistakes: an unused variable, a comparison between signed and unsigned numbers, a narrowing conversion from 64 to 32 bits. Warnings are easy to ignore, so projects make them errors ([C2](#c2)). It is the C++ equivalent of `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` in a `.csproj`.

### Layer 2: clang-tidy

clang-tidy is a separate program that parses the code with the Clang compiler and runs a few hundred checks ([C3](#c3), [C4](#c4)). A `.clang-tidy` file in the repository names the enabled checks, so every developer and CI run the same set. It works on code that is compiled with MSVC or GCC too. It plays the role that Roslyn analyzers play in .NET.

### Layer 3: IDE plugins and dashboards

- **SonarQube for IDE** (formerly SonarLint) is a free plugin for Visual Studio, VS Code and others. It analyses C and C++ while you type. Its server products (SonarQube Server, SonarQube Cloud) add a dashboard and history. SonarQube Cloud is free for public repositories.
- **Visual Studio's Code Analysis** is built in. It includes a C++ Core Guidelines checker ([C5](#c5)).

These give quick feedback while learning, and they are worth installing. A project's rule, though, is best enforced by something every build runs. For a cross-platform open-source project, that is the compiler warnings plus clang-tidy in CI.

## Examples

A `.clang-tidy` file selecting check groups, with warnings treated as errors:

```yaml
Checks: >
  bugprone-*,
  cppcoreguidelines-*,
  modernize-*,
  performance-*,
  -modernize-use-trailing-return-type
WarningsAsErrors: '*'
```

Reading it:

- `>` is YAML for "join the indented lines below into one string, with spaces". `Checks` is therefore a single comma-separated string; the line breaks are only for reading.
- `*` is a wildcard over check names: `bugprone-*` enables every check whose name starts with `bugprone-`.
- The leading `-` disables one check that the project does not want.
- `'*'` means "every enabled check". It is quoted because a bare `*` at the start of a YAML value means something else (a reference to another part of the file), and the file would not parse.

Code that clang-tidy flags:

```cpp
int* make() {
    int* p = new int(42);   // cppcoreguidelines-owning-memory: raw owning new
    return p;
}
```

The fix is to return a `std::unique_ptr<int>`. The returned `int*` is only an address: when the caller's pointer goes out of scope, nothing happens, and the caller has to know from documentation that it must `delete` the `int`. A `std::unique_ptr<int>` says in its type that the caller now owns the `int`, and its destructor deletes the `int` when the caller's `unique_ptr` goes out of scope ([RAII and ownership, C9](raii-and-ownership.md#c9)).

Running it on one file, with the compile commands that CMake generates (`CMAKE_EXPORT_COMPILE_COMMANDS=ON`):

```bash
clang-tidy -p build src/term.cpp
```

## Pitfalls

- Turning on every check at once. Some checks contradict each other or the project's style; choose groups and switch off single checks deliberately ([C6](#c6)).
- Treating a clean analysis as proof of correctness. It is a filter, not a proof ([C6](#c6)).
- Relying on an IDE plugin as the project's rule. Only checks that CI runs are enforced for everyone.

## Sources

- Claude session on [Tante](https://github.com/thomaswening/Tante), 2026-10-20, on the static-analysis guardrail of [ADR-0001](https://github.com/thomaswening/Tante/blob/main/docs/adr/0001-cpp20-cmake-vcpkg-guardrails.md) §3 and whether SonarQube could replace clang-tidy.
- [clang-tidy documentation](https://clang.llvm.org/extra/clang-tidy/) and [list of checks](https://clang.llvm.org/extra/clang-tidy/checks/list.html).
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines).
- [SonarQube for IDE](https://www.sonarsource.com/products/sonarqube/ide/).
