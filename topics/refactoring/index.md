# Refactoring

- [Seams](seams.md): places where a test can change what legacy code does without editing it there, and how to create one when there is none.
- [Characterization tests](characterization-tests.md): tests that pin down what legacy code does today, bugs included, before you change it; and the legacy code change algorithm around them.
- [Hotspot analysis](hotspot-analysis.md): where to refactor first, from change frequency in version control combined with code complexity.
- [Strangler Fig](strangler-fig.md): replace a legacy part piece by piece behind a facade that routes each call to the old or new code, until the old code can be deleted; Branch by Abstraction inside one codebase.
- [Mikado Method](mikado-method.md): make a change too big for one step as small green steps: try it, write down what breaks as prerequisites in a graph, revert, and work up from the leaves.
