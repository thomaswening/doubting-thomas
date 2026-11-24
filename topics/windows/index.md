# Windows

- [DPAPI and ProtectedData](dpapi.md): encrypting secrets with a key Windows ties to your logon, the two scopes, entropy, and what it does not protect against.
- [P/Invoke and unmanaged memory](pinvoke-and-unmanaged-memory.md): calling native DLLs with `DllImport` and `LibraryImport`, `nint`, marshalling and blittable types, the last-error code, `SafeHandle`, and pinning during a call.
- [The Win32 clipboard](clipboard.md): formats, the open–empty–set–close sequence, who owns the memory, the sequence number for clearing safely, and the formats that keep a password out of Win+V history.
- [SendInput and synthetic keyboard input](sendinput.md): the `INPUT` struct, key down and up, virtual keys against `KEYEVENTF_UNICODE`, UIPI, and why `SetThreadExecutionState` doesn't reset the last-input time.
- [Win32 type names and Hungarian notation](win32-types-and-hungarian-notation.md): `WORD`, `DWORD` and handle types with their C# counterparts, prefixes such as `dw`, `w` and `cb`, and `cbSize`.
- [Shared and per-user application data folders](app-data-folders.md): `ProgramData`, `LocalAppData` and Roaming `AppData`, `Environment.SpecialFolder`, permission rules passed down from folders, and why a file one user creates in `ProgramData` is read-only for the others.
