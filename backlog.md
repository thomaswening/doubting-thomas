# Backlog

Topics that came up and could become notes, but have not been written yet. Any AI proposing notes picks from here first; Thomas decides which ones become pull requests. The rules are in [AGENTS.md §8](AGENTS.md#8-backlog).

Each entry is one line under its area: the proposed note id in backticks, the question or concept, and where it came up, as a link.

## cpp

- `cpp/comparators-and-projections`: what the function passed to `std::min_element` or `std::sort` decides (an order, "does `a` come before `b`", not a distance), how the algorithm supplies its two arguments, the iterator it returns, and C++20 projections such as `std::ranges::min(values, {}, projection)` as C#'s `MinBy`. Builds on `cpp/iterators-and-ranges` ([#30](https://github.com/thomaswening/doubting-thomas/pull/30)) and `cpp/lambdas` ([#38](https://github.com/thomaswening/doubting-thomas/pull/38)). Came up in the review of [PartonForge PR 6](https://github.com/thomaswening/PartonForge/pull/6#discussion_r4524390645) (`nearest()` in `src/grid.cpp`).
- `cpp/structured-bindings`: `auto [a, b] = ...` (C++17), which names the elements of an array, a struct or a pair at once, like C#'s tuple deconstruction `var (a, b) = ...`; with `const auto&` the names refer to the elements without a copy. Came up in the review of [PartonForge PR 6](https://github.com/thomaswening/PartonForge/pull/6#discussion_r4524327765) (the four header lines in `src/grid.cpp`).
- `cpp/copy-elision`: when the compiler builds a returned object directly in the caller's variable instead of moving or copying it (RVO, NRVO; guaranteed for temporaries since C++17). Came up in the review of [PR #3](https://github.com/thomaswening/doubting-thomas/pull/3) (returning a `unique_ptr`).
- `cpp/vector-growth`: how `std::vector` grows (size, capacity, reallocation) and which references, pointers and iterators into it a `push_back` invalidates. Came up in the review of [PR #3](https://github.com/thomaswening/doubting-thomas/pull/3) (the use-after-free example in `cpp/sanitizers`).
- `cpp/string-view`: `std::string_view` (C++17) as a read-only, non-owning view of characters (a pointer and a length, like `std::span<const char>`, plus string operations such as `substr` and `find`), its C# counterpart `ReadOnlySpan<char>`, and why the string must outlive the view. Came up in the review of [PR #17](https://github.com/thomaswening/doubting-thomas/pull/17#discussion_r4418372048) (`std::span` in `cpp/arrays-and-containers`).
- `cpp/static-analysis` (update): the four parts of a `.clang-tidy` file (`Checks`, `WarningsAsErrors`, `HeaderFilterRegex`, `CheckOptions`) and their .NET counterparts (enabled analyser rules, `TreatWarningsAsErrors`, `.editorconfig` settings). Came up in the review of [claude-config PR #10](https://github.com/thomaswening/claude-config/pull/10) (the clang-tidy template of the `coding-guideline` skill).
- `cpp/static-analysis` (update): why clang-tidy needs `compile_commands.json`: it parses each file like the compiler, so it needs the same include paths, defines and language standard. Came up in the review of [claude-config PR #10](https://github.com/thomaswening/claude-config/pull/10) (the clang-tidy template of the `coding-guideline` skill).

## tools

- `tools/suppression-scope`: why a check's exemption should cover as little as possible (one paragraph or line rather than a whole file or project), since a wide exemption hides later real findings; compare `#pragma warning disable` around one line with a project-wide `NoWarn`. Came up in Thomas's review of [claude-config PR #3](https://github.com/thomaswening/claude-config/pull/3) (the glossary exemption).
- `tools/yaml`: the YAML that configuration files use: block scalars (`>` and `|`), anchors and aliases (`&`, `*`), and when a value must be quoted. Came up in the review of [PR #3](https://github.com/thomaswening/doubting-thomas/pull/3) (the `.clang-tidy` example).

## cmake

- `cmake/targets-and-usage-requirements`: targets and their include paths, compile definitions and dependencies; PRIVATE, PUBLIC and INTERFACE; private static-library dependencies needed for final linking. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).
- `cmake/installing-and-exporting-targets`: installing artifacts versus exporting target definitions; install(TARGETS ... EXPORT ...) and install(EXPORT ...); preserving public usage requirements without bundling dependencies. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).
- `cmake/cache-variables`: normal variables versus persistent cache entries; CACHE BOOL, FORCE, and setting dependency options before FetchContent_MakeAvailable. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).
- `cmake/finding-and-fetching-dependencies`: find_package versus FetchContent; package-search prefixes, compatible versions and Git references. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).
- `cmake/configure-build-install`: what configuration, compilation/linking and installation each do, and how failures in these phases differ; source and build directories (-S/-B), Ninja's role as the generated build system's executor, and selecting C++ and Fortran compilers. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).

## testing

- `testing/catch2-and-ctest`: testing framework versus test runner; CTest registrations versus Catch2 cases; discovery and process exit status. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).
- `testing/arrange-act-assert`: the arrange, act and assert structure of a unit test, and why one behaviour and one act per test makes a failure readable. Came up in the Claude session on [CrateEdit PR #21](https://github.com/thomaswening/CrateEdit/pull/21) (the test style guide).

## documentation

- `documentation/github-heading-anchors`: how GitHub turns a heading into a link anchor (rendered text, lower case, punctuation dropped, spaces to hyphens, `-1` for a duplicate), and when a stable `<a id>` is the better target. Came up in [claude-config PR #3](https://github.com/thomaswening/claude-config/pull/3) (`check_docs.py` resolving `requirements.md#requirement-conventions`).

## github-actions

- `github-actions/token-permissions`: GITHUB_TOKEN, workflow-level and job-level permissions, least privilege, and why token permissions do not control the runner's filesystem. Came up in the GitHub Actions workflow review for [PartonForge](https://github.com/thomaswening/PartonForge), recorded in the handover “Understanding a GitHub Actions Workflow”.

## bash

- `bash/exit-status-and-conditional-execution`: success/failure exit statuses, command -v, and conditional execution with ||. Came up in the GitHub Actions workflow review for [PartonForge](https://github.com/thomaswening/PartonForge), recorded in the handover “Understanding a GitHub Actions Workflow”.
- `bash/command-substitution`: how $(...) inserts a command's output into another command, including inside double quotes. Came up in the GitHub Actions workflow review for [PartonForge](https://github.com/thomaswening/PartonForge), recorded in the handover “Understanding a GitHub Actions Workflow”.

## python

- `python/script-entry-points`: direct execution versus importing, __name__, sys.argv, and process exit codes. Came up in the Python walkthrough of `.github/scripts/ctest_summary.py` in [PartonForge PR #1](https://github.com/thomaswening/PartonForge/pull/1), recorded in the handover “Python Walkthrough of ctest_summary.py”.
- `python/elementtree-navigation`: parsing XML into memory, traversing descendants, finding children, reading attributes and text, and handling missing elements. Came up in the Python walkthrough of `.github/scripts/ctest_summary.py` in [PartonForge PR #1](https://github.com/thomaswening/PartonForge/pull/1), recorded in the handover “Python Walkthrough of ctest_summary.py”.
- `python/truthiness-and-fallbacks`: None, is not None, empty collections and strings, operand-returning or, and conditional expressions. Came up in the Python walkthrough of `.github/scripts/ctest_summary.py` in [PartonForge PR #1](https://github.com/thomaswening/PartonForge/pull/1), recorded in the handover “Python Walkthrough of ctest_summary.py”.
- `python/lists-and-tuples`: lists versus tuples, append(), extending lists with +=, and tuple indexing. Came up in the Python walkthrough of `.github/scripts/ctest_summary.py` in [PartonForge PR #1](https://github.com/thomaswening/PartonForge/pull/1), recorded in the handover “Python Walkthrough of ctest_summary.py”.
- `python/list-comprehensions`: filtering and projecting into a list, compared with LINQ's Where, Select, and ToList. Came up in the Python walkthrough of `.github/scripts/ctest_summary.py` in [PartonForge PR #1](https://github.com/thomaswening/PartonForge/pull/1), recorded in the handover “Python Walkthrough of ctest_summary.py”.
- `python/generator-expressions`: deferred iteration, materialization, source changes, consumption and exhaustion, compared with reusable LINQ queries. Came up in the Python walkthrough of `.github/scripts/ctest_summary.py` in [PartonForge PR #1](https://github.com/thomaswening/PartonForge/pull/1), recorded in the handover “Python Walkthrough of ctest_summary.py”.

## binary

- `binary/bit-masks-and-shifts`: testing flag bits, extracting bit fields and combining them with &, |, << and >>; C#'s promotion of byte operands to int. Came up while reading [CrateEdit's ID3 guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/id3.md).
- `binary/endianness`: how byte order represents multibyte integers; reading big-endian ID3 and little-endian RIFF examples. Came up while reading [CrateEdit's ID3 guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/id3.md) and the [WAV guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/wav.md).
- `binary/synchsafe-integers`: packing integers into seven bits per byte; why ID3 reserves the top bits; encoding, decoding and validating the stored representation. Came up while reading [CrateEdit's ID3 guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/id3.md).
- `binary/length-prefixed-records`: walking records using identifiers and lengths; header size versus body size; skipping unknown records, using ID3 frames and RIFF chunks. Came up while reading [CrateEdit's ID3 guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/id3.md) and the [WAV guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/wav.md).
- `binary/text-encodings-and-terminators`: encoding markers, UTF-8 versus UTF-16, byte-order marks and terminators; why scanning for a zero byte is insufficient for UTF-16. Came up while reading [CrateEdit's ID3 guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/id3.md).
- `binary/padding-and-alignment`: reserved space for future growth versus alignment bytes; ID3 padding and RIFF's odd-sized chunk padding as distinct uses. Came up while reading [CrateEdit's ID3 guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/id3.md) and the [WAV guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/wav.md).

## formats

- `formats/preserving-unknown-data`: editing selected metadata while copying unfamiliar frames, chunks and audio unchanged; why parsing and reserializing everything can lose information. Came up while reading [CrateEdit's ID3 guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/id3.md) and the [WAV guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/wav.md).
- `formats/conservative-writing`: why a reader may display a file that an editor should refuse to modify; unsupported flags, ambiguous duplicates and incomplete parsing. Came up while reading [CrateEdit's ID3 guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/id3.md) and the [WAV guide](https://github.com/thomaswening/CrateEdit/blob/main/docs/formats/wav.md).

## regex

- `regex/capturing-groups`: how capturing groups are numbered (by opening parenthesis, group 0 the whole match), and non-capturing groups `(?:...)`. Came up in the Claude session on [CrateEdit PR #21](https://github.com/thomaswening/CrateEdit/pull/21) (`RequirementTagTests`).

## dotnet

- `dotnet/linq-query-syntax`: LINQ query syntax read as nested loops; `from ... from ...` as `SelectMany`, and when it reads better than method syntax. Came up in the Claude session on [CrateEdit PR #21](https://github.com/thomaswening/CrateEdit/pull/21) (`RequirementTagTests`).
- `dotnet/single-versus-first`: `Single` versus `First` as a stated assumption, and xUnit's `Assert.Single` as an assertion that also returns the element. Came up in the Claude session on [CrateEdit PR #21](https://github.com/thomaswening/CrateEdit/pull/21) (`AppCommandsTests`, `DiagnosticLogTests`).

## github

- `github/reviewing-existing-code`: GitHub's three-dot pull request diff, and reviewing code already on `main` through a draft PR against a base branch without it. Came up in [CrateEdit PR #22](https://github.com/thomaswening/CrateEdit/pull/22).

## physics

- `physics/ordering-in-parton-branching`: what angular and virtuality ordering mean in the Parton Branching method, which part is a scale choice (the argument of α_s) and which is kinematics (the resolution scale z_M, the transverse recoil), and why colour coherence motivates angular ordering. Start from arXiv:1704.01757. Came up in the review of [PartonForge PR #2](https://github.com/thomaswening/PartonForge/pull/2) (REQ-009).
- `physics/parton-branching-splitting`: how the PB method splits a splitting function into resolvable real emissions (z below z_M, a probability density at leading order) and the Sudakov form factor (the probability of no resolvable branching), and why the full P(z) is not a density. Write it when PartonForge implements the LO kernels (REQ-010). Came up in the review of [PartonForge PR #2](https://github.com/thomaswening/PartonForge/pull/2) (REQ-010).

## numerics

- `numerics/monte-carlo-integration-versus-sampling`: Monte Carlo integration works for signed functions, sampling needs a positive density; importance sampling with a positive proposal and signed weights f/g, and the sign problem it costs. Write it for the spike on PartonForge's OPEN-E. Came up in the review of [PartonForge PR #2](https://github.com/thomaswening/PartonForge/pull/2) (REQ-010, OPEN-E).
- `numerics/uncertainty-of-an-estimated-sigma`: why a sigma estimated from N samples is itself uncertain (about 1/sqrt(2(N-1))), the Student t-distribution as the correction, and why a few seeds cannot support a 5 sigma claim. Write it when PartonForge designs REQ-086. Came up in the review of [PartonForge PR #2](https://github.com/thomaswening/PartonForge/pull/2) (REQ-086).
