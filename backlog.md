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
- `cmake/configure-build-install`: what configuration, compilation/linking and installation each do, and how failures in these phases differ. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).

## testing

- `testing/catch2-and-ctest`: testing framework versus test runner; CTest registrations versus Catch2 cases; discovery and process exit status. Came up in the PartonForge CMake/CI review session, [Explain ctest summary script](https://chatgpt.com/c/6acf4765-8520-83eb-93d1-2474a6187073).
