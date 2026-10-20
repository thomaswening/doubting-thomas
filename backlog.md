# Backlog

Topics that came up and could become notes, but have not been written yet. Any AI proposing notes picks from here first; Thomas decides which ones become pull requests. The rules are in [AGENTS.md §8](AGENTS.md#8-backlog).

Each entry is one line under its area: the proposed note id in backticks, the question or concept, and where it came up, as a link.

## cpp

- `cpp/references`: what `T&` and `const T&` are, how a reference differs from a pointer, and how both compare to C#'s `ref` and `in`. Came up in the review of [PR #3](https://github.com/thomaswening/doubting-thomas/pull/3) (`int& first`, `const Poly&`).
- `cpp/copy-elision`: when the compiler builds a returned object directly in the caller's variable instead of moving or copying it (RVO, NRVO; guaranteed for temporaries since C++17). Came up in the review of [PR #3](https://github.com/thomaswening/doubting-thomas/pull/3) (returning a `unique_ptr`).
- `cpp/vector-growth`: how `std::vector` grows (size, capacity, reallocation) and which references, pointers and iterators into it a `push_back` invalidates. Came up in the review of [PR #3](https://github.com/thomaswening/doubting-thomas/pull/3) (the use-after-free example in `cpp/sanitizers`).

## tools

- `tools/yaml`: the YAML that configuration files use: block scalars (`>` and `|`), anchors and aliases (`&`, `*`), and when a value must be quoted. Came up in the review of [PR #3](https://github.com/thomaswening/doubting-thomas/pull/3) (the `.clang-tidy` example).
