import { test } from "node:test";
import assert from "node:assert/strict";
import { rewriteLink, REPOSITORY_URL } from "../src/links.mjs";

const NOTE = "qft/sl2c-double-cover-of-the-lorentz-group.md";

const CASES = [
  ["a note in the same area", "weyl-spinor-representations.md", "weyl-spinor-representations.html"],
  ["a claim in another note", "../cpp/copy-and-move.md#c2", "../cpp/copy-and-move.html#c2"],
  ["an area index", "index.md", "index.html"],
  ["an anchor on the same page", "#c4", "#c4"],
  ["a web address", "https://arxiv.org/abs/0812.1594", "https://arxiv.org/abs/0812.1594"],
  ["a file outside topics", "../../AGENTS.md#3-key-claims", `${REPOSITORY_URL}/blob/main/AGENTS.md#3-key-claims`],
  ["a file that is not a note", "diagram.svg", "diagram.svg"],
];

for (const [description, href, expected] of CASES) {
  test(`a link to ${description} becomes ${expected}`, () => {
    // Act
    const rewritten = rewriteLink(href, NOTE);

    // Assert
    assert.equal(rewritten, expected);
  });
}
