# C++

- [Static libraries, shared libraries and the C++ ABI](abi-and-shared-libraries.md): why C++ types can't safely cross a DLL boundary and C functions can.
- [Header-only libraries](header-only-libraries.md): shipping code as headers compiled by the user, `inline` and the one-definition rule.
- [Copy and move](copy-and-move.md): C++ objects as values, copy and move constructors, `std::move`, and the rules of zero and five.
- [Sanitizers and undefined behaviour](sanitizers.md): run-time checks (ASan, UBSan, TSan) that turn silent memory and arithmetic errors into reports.
- [RAII and ownership](raii-and-ownership.md): every resource has one owner whose destructor frees it, so code avoids raw `new` and `delete`.
- [Constructors in C++](constructors.md): `explicit` and implicit conversions, member initialiser lists, declaration order, `= default`, `= delete` and delegation.
- [Static analysis for C++](static-analysis.md): compiler warnings, clang-tidy and IDE plugins such as SonarQube for IDE.
- [const and constexpr](const-and-constexpr.md): `const` is C#'s `readonly`, `constexpr` is C#'s `const`, and `const` member functions.
- [References and pointers](references.md): `T&` and `const T&` against `T*`, compared with C#'s `ref` and `in`, and why `auto` copies.
- [Linkage and storage duration](linkage-and-storage-duration.md): translation units, unnamed namespaces, the three meanings of `static`, and `inline` variables.
- [Arrays, std::array, std::vector and std::span](arrays-and-containers.md): built-in arrays against `std::array`, `std::vector` as `List<T>`, and `std::span` as `Span<T>`.
- [main, its arguments and exit codes](program-entry-and-exit-codes.md): `argc` and `argv` against C#'s `args`, the exit status, and the 0 / 1 / 2 convention.
- [Pimpl (pointer to implementation)](pimpl.md): hiding a C library's type behind a `unique_ptr` to a struct defined only in the `.cpp`, and the rule of five it brings.
- [Three-way comparison (operator<=>)](three-way-comparison.md): C++20's `<=>` and `==`, the operators derived from them, and strong, weak and partial orderings.
