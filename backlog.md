# Backlog

Topics that came up and could become notes, but have not been written yet. Any AI proposing notes picks from here first; Thomas decides which ones become pull requests. The rules are in [AGENTS.md §8](AGENTS.md#8-backlog).

Each entry is one line under its area: the proposed note id in backticks, the question or concept, and where it came up, as a link.

## cpp

- `cpp/references`: what `T&` and `const T&` are, how a reference differs from a pointer, and how both compare to C#'s `ref` and `in`. Came up in the review of [PR #3](https://github.com/thomaswening/doubting-thomas/pull/3) (`int& first`, `const Poly&`).
- `cpp/copy-elision`: when the compiler builds a returned object directly in the caller's variable instead of moving or copying it (RVO, NRVO; guaranteed for temporaries since C++17). Came up in the review of [PR #3](https://github.com/thomaswening/doubting-thomas/pull/3) (returning a `unique_ptr`).
- `cpp/vector-growth`: how `std::vector` grows (size, capacity, reallocation) and which references, pointers and iterators into it a `push_back` invalidates. Came up in the review of [PR #3](https://github.com/thomaswening/doubting-thomas/pull/3) (the use-after-free example in `cpp/sanitizers`).

## tools

- `tools/yaml`: the YAML that configuration files use: block scalars (`>` and `|`), anchors and aliases (`&`, `*`), and when a value must be quoted. Came up in the review of [PR #3](https://github.com/thomaswening/doubting-thomas/pull/3) (the `.clang-tidy` example).

## cmake

- `cmake/targets-and-usage-requirements`: targets and their include paths, compile definitions and dependencies; PRIVATE, PUBLIC and INTERFACE; private static-library dependencies needed for final linking. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).
- `cmake/installing-and-exporting-targets`: installing artifacts versus exporting target definitions; install(TARGETS ... EXPORT ...) and install(EXPORT ...); preserving public usage requirements without bundling dependencies. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).
- `cmake/cache-variables`: normal variables versus persistent cache entries; CACHE BOOL, FORCE, and setting dependency options before FetchContent_MakeAvailable. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).
- `cmake/finding-and-fetching-dependencies`: find_package versus FetchContent; package-search prefixes, compatible versions and Git references. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).
- `cmake/configure-build-install`: what configuration, compilation/linking and installation each do, and how failures in these phases differ; source and build directories (-S/-B), Ninja's role as the generated build system's executor, and selecting C++ and Fortran compilers. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).

## testing

- `testing/catch2-and-ctest`: testing framework versus test runner; CTest registrations versus Catch2 cases; discovery and process exit status. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).

## github-actions

- `github-actions/token-permissions`: GITHUB_TOKEN, workflow-level and job-level permissions, least privilege, and why token permissions do not control the runner's filesystem. Came up in the GitHub Actions workflow review for [PartonForge](https://github.com/thomaswening/PartonForge), recorded in the handover “Understanding a GitHub Actions Workflow”.

## bash

- `bash/exit-status-and-conditional-execution`: success/failure exit statuses, command -v, and conditional execution with ||. Came up in the GitHub Actions workflow review for [PartonForge](https://github.com/thomaswening/PartonForge), recorded in the handover “Understanding a GitHub Actions Workflow”.
- `bash/streams-redirection-and-pipes`: standard input, output and error; discarding output with >/dev/null; passing output through a pipe. Came up in the GitHub Actions workflow review for [PartonForge](https://github.com/thomaswening/PartonForge), recorded in the handover “Understanding a GitHub Actions Workflow”.
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
