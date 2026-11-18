# Windows

- [DPAPI and ProtectedData](dpapi.md): encrypting secrets with a key Windows ties to your logon, the two scopes, entropy, and what it does not protect against.
- [P/Invoke and unmanaged memory](pinvoke-and-unmanaged-memory.md): calling native DLLs with `DllImport` and `LibraryImport`, marshalling, `SafeHandle`, pinning, wiping secrets, and why a `string` can't hold one.
- [The Win32 clipboard](clipboard.md): formats, the open–empty–set–close sequence, who owns the memory, the sequence number for clearing safely, and the formats that keep a password out of Win+V history.
- [SendInput and keeping a session awake](sendinput.md): synthetic keystrokes, the `INPUT` union, virtual keys against `KEYEVENTF_UNICODE`, UIPI, and why `SetThreadExecutionState` doesn't reset the input-idle timer.
