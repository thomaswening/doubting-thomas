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
- [Linkage and storage duration](linkage-and-storage-duration.md): translation units, unnamed namespaces, the three meanings of `static`, and `inline` variables such as `inline constexpr` header constants.
- [Arrays, std::array, std::vector and std::span](arrays-and-containers.md): built-in arrays against `std::array`, `std::vector` as `List<T>`, and `std::span` as `Span<T>`.
- [main, its arguments and exit codes](program-entry-and-exit-codes.md): `argc` and `argv` against C#'s `args`, the exit status, and the 0 / 1 / 2 convention.
- [Ref-qualified member functions](ref-qualified-member-functions.md): `&` and `&&` after a member function's parameters, `take() &&` for handing contents over, and why names are lvalues.
- [Iterators and half-open ranges](iterators-and-ranges.md): `begin` and one-past-the-end `end`, algorithms on iterator pairs, and C++20 `std::ranges` and views.
- [Standard library functions met in code](standard-library-met-in-code.md): a growing list of functions and constructs with their traps: `all_of` on empty, `npos`, `substr`, `compare`, `try_emplace`, `getline`, `replace`, joined literals, range-for copies.
- [std::variant for a C# developer](variant.md): one value of one of a few types, `get_if` against `get`, `std::visit`, and why `find` returns a pointer.
