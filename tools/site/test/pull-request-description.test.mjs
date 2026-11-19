import { test } from "node:test";
import assert from "node:assert/strict";
import { previewSection, SECTION_END, SECTION_START, withPreviewSection } from "../src/pull-request-description.mjs";

const SITE_URL = "https://thomaswening.github.io/doubting-thomas/";
const NOTE_FILE = "topics/qft/weyl-spinor-representations.md";
const NOTE_PAGE = `${SITE_URL}pr/53/qft/weyl-spinor-representations.html`;

test("a changed note gets a link to its preview page", () => {
  // Act
  const section = previewSection(53, SITE_URL, [NOTE_FILE]);

  // Assert
  assert.match(section, new RegExp(`- \\[qft/weyl-spinor-representations.md\\]\\(${NOTE_PAGE}\\)`));
});

test("a changed file outside topics gets no link", () => {
  // Arrange
  const sectionWithoutNotes = previewSection(53, SITE_URL, []);

  // Act
  const section = previewSection(53, SITE_URL, ["AGENTS.md"]);

  // Assert
  assert.equal(section, sectionWithoutNotes);
});

test("the section always links the preview's home page", () => {
  // Act
  const section = previewSection(53, SITE_URL, []);

  // Assert
  assert.match(section, /\[All notes in this preview\]\(https:\/\/thomaswening.github.io\/doubting-thomas\/pr\/53\/index.html\)/);
});

test("a description without the section gets it on top", () => {
  // Act
  const body = withPreviewSection("Adds a note.", "SECTION");

  // Assert
  assert.equal(body, "SECTION\n\nAdds a note.");
});

test("a description with the section gets it replaced in place", () => {
  // Arrange
  const old = `${SECTION_START}\nold links\n${SECTION_END}\r\n\r\nAdds a note.`;

  // Act
  const body = withPreviewSection(old, `${SECTION_START}\nnew links\n${SECTION_END}`);

  // Assert
  assert.equal(body, `${SECTION_START}\nnew links\n${SECTION_END}\n\nAdds a note.`);
});

test("writing the same section again leaves the description unchanged", () => {
  // Arrange
  const section = previewSection(53, SITE_URL, [NOTE_FILE]);
  const once = withPreviewSection("Adds a note.", section);

  // Act
  const twice = withPreviewSection(once, section);

  // Assert
  assert.equal(twice, once);
});
