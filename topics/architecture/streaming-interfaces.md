---
title: Streaming interfaces and data larger than memory
area: architecture
created: 2026-10-25
updated: 2026-10-25
prerequisites: []
related: [architecture/static-and-runtime-views]
projects: [tante]
tags: [streaming, external-sorting, merge-sort, ienumerable, interfaces, scalability]
---

# Streaming interfaces and data larger than memory

## TL;DR

- Whether data can later live on disk is decided by the **interface**, not by the storage behind it.
- An interface that offers only "append", "sort" and "read the next item" can be backed by memory today and by disk tomorrow, with no change to the code that uses it.
- One "give me the whole collection", "how many items?" or "item number *i*" in the interface ties every caller to memory.
- Sorting more data than fits in memory works by **external merge sort**: sort chunks that fit, write them to disk as runs, then merge the runs.
- In .NET terms: design against `IEnumerable<T>`, not `IList<T>`. Even then, some LINQ operators such as `OrderBy` buffer everything.

## Key claims

- <a id="c1"></a>**C1.** If no operation of an interface needs the whole collection at once, an implementation can keep the data on disk without any change to the code that uses the interface.
- <a id="c2"></a>**C2.** Random access by index, a cheap count, or returning the whole collection in one piece each assume the data is in memory. A single such operation in an interface makes a later move to disk a change to every caller that uses it.
- <a id="c3"></a>**C3.** External merge sort sorts data larger than memory in two phases: it sorts chunks that fit in memory and writes each to disk as a sorted run, then it merges the runs by repeatedly taking the smallest head among them.
- <a id="c4"></a>**C4.** A merge of sorted runs needs memory only for one buffer per run, not for the data. Equal items arrive next to each other during the merge, so they can be combined there.
- <a id="c5"></a>**C5.** In .NET, `IEnumerable<T>` is a forward-only stream: `Select` and `Where` pass items through one at a time. `OrderBy` and `ToList` read the whole sequence into memory before producing anything.
- <a id="c6"></a>**C6.** Items that must be written to disk and read back without translation should contain no pointers, since an address means nothing in another process or after a restart.

## Explanation

### The interface decides

Suppose a calculation's intermediate result fits in memory today but may reach a billion items next year. The tempting design is a class that holds a `List<T>`. Everything that uses it soon calls `list.Count`, `list[i]` or `list.Sort()`. When the data outgrows memory, every one of those calls must be rewritten ([C2](#c2)).

The alternative is to give the storage an interface with only the operations a stream can support ([C1](#c1)):

1. **append** an item;
2. **sort**, combining equal items;
3. **read** the items in order, one at a time.

A memory implementation keeps a list and sorts it. A disk implementation writes and merges files. Callers cannot tell the difference, because they never asked for anything only memory can give. Tante's expression store has exactly these three phases, so an expression larger than memory can be added later behind the same interface.

### External merge sort

Sorting on disk is the step that looks impossible: how do you sort what you cannot load? The answer is old and simple ([C3](#c3)):

```
Memory holds 3 items. Input: 7 2 9 4 1 8 6 3 5

Phase 1: sort chunks of 3, write each as a run
  run A: 2 7 9
  run B: 1 4 8
  run C: 3 5 6

Phase 2: merge, always taking the smallest head
  heads 2 1 3  -> output 1   (from B)
  heads 2 4 3  -> output 2   (from A)
  heads 7 4 3  -> output 3   (from C)
  ...
  result: 1 2 3 4 5 6 7 8 9
```

The merge holds only the current head of each run ([C4](#c4)). Since equal items meet during the merge, it is also where duplicates are combined. In a computer-algebra system, $3xy$ from one run and $2xy$ from another become $5xy$ there. FORM, the system Tante succeeds, handles expressions of billions of terms this way.

### Items that survive the trip

Writing an item to disk and reading it back is only a copy if the item is self-contained ([C6](#c6)). An object graph with references can't be copied as bytes: a .NET reference is meaningless once the process ends, so the graph has to be serialised and rebuilt. Tante encodes each term as a flat block of 32-bit words with no pointers for this reason.

### The same idea in .NET

`IEnumerable<T>` is the .NET stream interface. It has `MoveNext` and `Current`, nothing else, so a method that takes it cannot assume memory. LINQ keeps most operators streaming ([C5](#c5)). But a stream cannot be sorted without seeing all of it, so `OrderBy` reads everything first. The example below shows when each item is read. `Count()` on a plain `IEnumerable<T>` walks the whole sequence, which shows why "how many?" does not belong in a streaming interface.

## Examples

A file-based C# program, run with `dotnet run stream.cs` (.NET 10):

```csharp
IEnumerable<int> Source()
{
    for (int i = 1; i <= 3; i++)
    {
        Console.WriteLine($"read {i}");
        yield return i;
    }
}

foreach (var x in Source().Select(v => v * 10))
    Console.WriteLine($"got {x}");

Console.WriteLine("--- OrderByDescending:");
foreach (var x in Source().OrderByDescending(v => v))
    Console.WriteLine($"got {x}");
```

Output:

```
read 1
got 10
read 2
got 20
read 3
got 30
--- OrderByDescending:
read 1
read 2
read 3
got 3
got 2
got 1
```

`Select` interleaves reading and producing: one item in memory at a time. `OrderByDescending` reads all three before it can produce the first.

## Pitfalls

- **"It's an interface, so it's swappable."** An interface with `Count` or an indexer is swappable only between in-memory implementations ([C2](#c2)).
- **A streaming signature with a buffering body.** A method that takes `IEnumerable<T>` and calls `ToList()` first is in-memory again ([C5](#c5)).
- **Sorting as an afterthought.** Every "sorted output" requirement forces a full pass. In a streaming design, sorting is an explicit phase with its own disk-backed implementation ([C3](#c3)).
- **Pointers in stored items** ([C6](#c6)).

## Sources

- [Tante, `docs/architecture.md` §6 and §7.3](https://github.com/thomaswening/Tante/blob/main/docs/architecture.md#73-expressions-larger-than-memory-req-054), and [ADR-0005](https://github.com/thomaswening/Tante/blob/main/docs/adr/0005-term-representation.md) point 5; [pull request #10](https://github.com/thomaswening/Tante/pull/10); Claude session on Tante, 2026-10-25.
- D. E. Knuth, *The Art of Computer Programming*, vol. 3, *Sorting and Searching*, §5.4 (external sorting).
- J. Kuipers, T. Ueda, J. A. M. Vermaseren, J. Vollinga, "FORM version 4.0", arXiv:1203.6543 (FORM's terms and its sorting on disk).
- [Enumerable.OrderBy, .NET documentation](https://learn.microsoft.com/dotnet/api/system.linq.enumerable.orderby) (deferred execution, which buffers when enumerated).
