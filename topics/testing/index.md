# Testing

- [Golden results and dependency updates](golden-results-and-dependency-updates.md): a changed snapshot after an update means investigate, and the expected result changes only on independent evidence.
- [Testing timer-driven code without sleeping](timer-driven-code.md): waiting for a signal with `TaskCompletionSource` and `WaitAsync`, a fake clock with `TimeProvider` and `FakeTimeProvider`, and passing a check count, with when each pays off.
