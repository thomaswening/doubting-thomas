import { test } from "node:test";
import assert from "node:assert/strict";
import { githubSlug, renderNote } from "../src/markdown.mjs";

const NOTE = "qft/example.md";
const render = (markdownText) => renderNote(markdownText, NOTE);

test("$`…`$ inside a sentence renders as inline maths", () => {
  // Act
  const { html } = render("The map $`X \\mapsto A X A^\\dagger`$ keeps determinants.");

  // Assert
  assert.match(html, /<p>The map <span class="katex">/);
});

test("a single-dollar formula renders as inline maths", () => {
  // Act
  const { html } = render("Take $x = 1$ here.");

  // Assert
  assert.match(html, /Take <span class="katex">/);
});

test("dollars with a space inside are not a formula", () => {
  // Act
  const { html } = render("It costs $ 5 and $ 6.");

  // Assert
  assert.doesNotMatch(html, /katex/);
});

test("a math fence renders as a display block", () => {
  // Act
  const { html } = render("```math\nx \\cdot y\n```\n");

  // Assert
  assert.match(html, /<div class="math-block"><span class="katex-display">/);
});

test("a paragraph holding only $`\\displaystyle …`$ renders as a display block", () => {
  // Act
  const { html } = render("- Claim:\n\n  $`\\displaystyle \\frac{a}{b}`$\n");

  // Assert
  assert.match(html, /<div class="math-block"><span class="katex-display">/);
});

test("a formula KaTeX cannot render is reported", () => {
  // Act
  const { mathErrors } = render("Broken: $`\\frac{a`$.");

  // Assert
  assert.equal(mathErrors.length, 1);
});

test("a proposition and the display maths after it share one box", () => {
  // Arrange
  const markdownText = "**Proposition (C3).** It holds that\n\n```math\na = b\n```\n\nIn words: …\n";

  // Act
  const { html } = render(markdownText);

  // Assert
  assert.match(html, /<div class="environment environment-proposition">\n<p><strong>Proposition[\s\S]*math-block[\s\S]*<\/div>\n<p>In words/);
});

test("a proof idea paragraph is marked", () => {
  // Act
  const { html } = render("*Proof idea.* Determinants multiply.\n");

  // Assert
  assert.match(html, /<p class="proof-idea">/);
});

test("a folded proof gets the proof class", () => {
  // Act
  const { html } = render("<details><summary>Proof</summary>\n\nBy C1.\n\n</details>\n");

  // Assert
  assert.match(html, /<details class="proof"><summary>Proof<\/summary>/);
});

test("the list under Key claims gets the claims class", () => {
  // Act
  const { html } = render("## Key claims\n\n- **C1.** One.\n");

  // Assert
  assert.match(html, /<ul class="claims">/);
});

test("a link to another note points at its page", () => {
  // Act
  const { html } = render("See [C7](weyl-spinor-representations.md#c7).");

  // Assert
  assert.match(html, /href="weyl-spinor-representations.html#c7"/);
});

test("a Mermaid fence keeps its source for redrawing", () => {
  // Act
  const { html } = render("```mermaid\nflowchart LR\n  a --> b\n```\n");

  // Assert
  assert.match(html, /<pre class="mermaid" data-source="flowchart LR\n  a --&gt; b\n">/);
});

const SLUG_CASES = [
  ["Key claims", "key-claims"],
  ["3. Key claims", "3-key-claims"],
  ["Why look for a second group at all", "why-look-for-a-second-group-at-all"],
  ["The 2π rotation", "the-2π-rotation"],
  ["C++ and C#", "c-and-c"],
];

for (const [heading, expected] of SLUG_CASES) {
  test(`the heading "${heading}" gets GitHub's anchor ${expected}`, () => {
    // Act
    const slug = githubSlug(heading, new Map());

    // Assert
    assert.equal(slug, expected);
  });
}

test("a repeated heading gets a numbered anchor, as on GitHub", () => {
  // Arrange
  const usedSlugs = new Map([["examples", 1]]);

  // Act
  const slug = githubSlug("Examples", usedSlugs);

  // Assert
  assert.equal(slug, "examples-1");
});
