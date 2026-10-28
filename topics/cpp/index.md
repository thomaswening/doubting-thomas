# C++

- [Static libraries, shared libraries and the C++ ABI](abi-and-shared-libraries.md): why C++ types can't safely cross a DLL boundary and C functions can.
- [Header-only libraries](header-only-libraries.md): shipping code as headers compiled by the user, `inline` and the one-definition rule.
- [Copy and move](copy-and-move.md): C++ objects as values, copy and move constructors, `std::move`, and the rules of zero and five.
- [Sanitizers and undefined behaviour](sanitizers.md): run-time checks (ASan, UBSan, TSan) that turn silent memory and arithmetic errors into reports.
- [RAII and ownership](raii-and-ownership.md): every resource has one owner whose destructor frees it, so code avoids raw `new` and `delete`.
- [Constructors in C++](constructors.md): `explicit` and implicit conversions, member initialiser lists, declaration order, `= default`, `= delete` and delegation.
- [Static analysis for C++](static-analysis.md): compiler warnings, clang-tidy and IDE plugins such as SonarQube for IDE.
- [Choosing an integer type in C++](integer-types.md): platform-dependent widths, `long` on Windows and Linux, `<cstdint>`, `size_t`, and why unsigned is for bits and sizes.
- [enum and enum class](scoped-enums.md): scoped and unscoped enumerations, conversions, values without a name, counting enumerators, and `-Wswitch`.
- [std::optional](optional.md): a value that may be missing, checked and unchecked access, and C#'s `Nullable<T>`.
