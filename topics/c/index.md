# C

- [Struct tags and typedef](struct-tags-and-typedef.md): why C writes `typedef struct x x;`, and what a type without a body is good for.
- [Reading function-pointer declarations](function-pointer-declarations.md): reading `R (*f)(P)` from the name outwards, and structs of function pointers as interfaces.
- [Tables of function pointers](function-tables.md): C's interfaces for plug-ins: the entry function, host and plug-in tables, growing a table safely, vtables and COM.
- [Where the * goes](pointer-declarator-syntax.md): `*` in declarations and expressions, `int* a, b;`, `->` and `const`.
- [Stack, heap and who frees memory](stack-and-heap.md): what C frees for you, what it never does, and how C++ destructors close the gap.
- [Strings in C](strings.md): zero-terminated char arrays, `strlen`, buffer sizes, and the unsafe and safe copy functions.
- [Opaque handles](opaque-handles.md): pointers to hidden types, their ownership rules, and wrapping them in C++.
