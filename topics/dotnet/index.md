# .NET

- [Pointers and unsafe code in C#](unsafe-code-and-pointers.md): `unsafe`, typed pointers against `void*`, `nint` and pointers, `fixed`, and `Span` over native memory.
- [Keeping secrets in .NET memory](secrets-in-memory.md): why a `string` can't hold a secret, `SecureString`, pinned arrays, `ZeroMemory`, and a buffer that wipes itself on `Dispose`.
- [async void and event handlers](async-void-event-handlers.md): where an exception from `async Task` and from `async void` goes, why it ends the process, why event handlers are the one legitimate use, and the catch-all inside the handler.
