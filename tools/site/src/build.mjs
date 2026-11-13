// Builds the reading site from topics/ into an output folder.
// Usage: node src/build.mjs [output folder, default _site]. Documented in ../README.md.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { renderNote } from "./markdown.mjs";
import { pageName, REPOSITORY_URL, TOPICS_FOLDER } from "./links.mjs";

const SITE_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPOSITORY_ROOT = path.resolve(SITE_FOLDER, "../..");
const TOPICS_ROOT = path.join(REPOSITORY_ROOT, TOPICS_FOLDER);
const TEMPLATE_PATH = path.join(SITE_FOLDER, "template.html");
const OWN_ASSETS_FOLDER = path.join(SITE_FOLDER, "assets");
const DEFAULT_OUTPUT_FOLDER = path.join(SITE_FOLDER, "_site");
const ASSETS_FOLDER_NAME = "assets";
const SITE_NAME = "doubting-thomas";
const INDEX_FILE = "index.md";
const EXIT_MATH_ERRORS = 1;

/** Font packages copied into assets/fonts, with the style sheets each page loads. */
const FONT_PACKAGES = [
  { name: "@fontsource-variable/literata", styleSheets: ["wght.css", "wght-italic.css"] },
  { name: "@fontsource-variable/source-serif-4", styleSheets: ["wght.css", "wght-italic.css"] },
  { name: "@fontsource/atkinson-hyperlegible", styleSheets: ["400.css", "400-italic.css", "700.css", "700-italic.css"] },
];

const require = createRequire(import.meta.url);
const packageFolder = (name) => path.dirname(require.resolve(`${name}/package.json`));

function main() {
  const outputFolder = path.resolve(process.argv[2] ?? DEFAULT_OUTPUT_FOLDER);
  fs.rmSync(outputFolder, { recursive: true, force: true });
  const notes = findNotes(TOPICS_ROOT).map(readNote);
  const areaTitles = new Map(notes.filter(isAreaIndex).map((note) => [areaOf(note.sourcePath), note.title]));
  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");

  const mathErrors = notes.flatMap((note) => writePage(note, template, areaTitles, outputFolder));
  copyAssets(path.join(outputFolder, ASSETS_FOLDER_NAME));
  console.log(`Built ${notes.length} pages into ${outputFolder}.`);
  reportMathErrors(mathErrors);
  return mathErrors.length === 0 ? 0 : EXIT_MATH_ERRORS;
}

// ---------- reading the notes ----------

function findNotes(folder) {
  return fs
    .readdirSync(folder, { recursive: true })
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.split(path.sep).join("/"))
    .sort();
}

const FRONT_MATTER_PATTERN = /^---\n([\s\S]*?)\n---\n/;
const TITLE_HEADING_PATTERN = /^# (.+)\n/m;

/** Reads a note: its front matter's title and updated date, or its # heading as the title. */
function readNote(sourcePath) {
  const text = fs.readFileSync(path.join(TOPICS_ROOT, sourcePath), "utf8").replace(/\r\n/g, "\n");
  const frontMatterMatch = text.match(FRONT_MATTER_PATTERN);
  const frontMatter = frontMatterMatch ? parseFrontMatter(frontMatterMatch[1]) : {};
  const withoutFrontMatter = frontMatterMatch ? text.slice(frontMatterMatch[0].length) : text;
  const titleMatch = withoutFrontMatter.match(TITLE_HEADING_PATTERN);
  return {
    sourcePath,
    title: frontMatter.title ?? titleMatch?.[1] ?? sourcePath,
    updated: frontMatter.updated,
    body: titleMatch ? withoutFrontMatter.replace(TITLE_HEADING_PATTERN, "") : withoutFrontMatter,
  };
}

/** The flat `key: value` lines of a note's front matter; lists stay strings. */
function parseFrontMatter(frontMatterText) {
  const entries = frontMatterText
    .split("\n")
    .map((line) => line.match(/^(\w+):\s*(.*)$/))
    .filter(Boolean)
    .map(([, key, value]) => [key, value.trim()]);
  return Object.fromEntries(entries);
}

const areaOf = (sourcePath) => (sourcePath.includes("/") ? sourcePath.split("/")[0] : null);
const isAreaIndex = (note) => note.sourcePath.endsWith(`/${INDEX_FILE}`);

// ---------- writing a page ----------

/** Writes one note's page and returns the formulas KaTeX could not render in it. */
function writePage(note, template, areaTitles, outputFolder) {
  const rendered = renderNote(note.body, note.sourcePath);
  const depth = note.sourcePath.split("/").length - 1;
  const rootPrefix = "../".repeat(depth);
  const hasDiagrams = rendered.html.includes('class="mermaid"');
  const replacements = {
    TITLE: escapeHtml(note.title),
    ROOT: rootPrefix,
    BREADCRUMBS: breadcrumbs(note, areaTitles, rootPrefix),
    DATELINE: note.updated ? `<p class="dateline">Updated ${formatDate(note.updated)}</p>` : "",
    CONTENTS: rendered.headings.map(contentsEntry).join("\n"),
    CONTENTS_HIDDEN: rendered.headings.length === 0 ? "hidden" : "",
    CONTENT: rendered.html,
    SOURCE_URL: `${REPOSITORY_URL}/blob/main/${TOPICS_FOLDER}/${note.sourcePath}`,
    DIAGRAM_SCRIPT: hasDiagrams ? `<script src="${rootPrefix}${ASSETS_FOLDER_NAME}/mermaid.min.js"></script>` : "",
    FONT_STYLESHEETS: fontStyleSheetLinks(rootPrefix),
  };
  const page = template.replace(/\{\{(\w+)\}\}/g, (placeholder, key) => replacements[key] ?? placeholder);
  const outputPath = path.join(outputFolder, pageName(note.sourcePath));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, page);
  return rendered.mathErrors.map((error) => ({ ...error, sourcePath: note.sourcePath }));
}

function breadcrumbs(note, areaTitles, rootPrefix) {
  const home = `<a href="${rootPrefix}index.html">${SITE_NAME}</a>`;
  const area = areaOf(note.sourcePath);
  if (!area || isAreaIndex(note)) return home;
  return `${home} <span aria-hidden="true">›</span> <a href="index.html">${escapeHtml(areaTitles.get(area) ?? area)}</a>`;
}

const LINK_TAG_PATTERN = /<\/?a\b[^>]*>/g;

function contentsEntry(heading) {
  return `<li class="contents-${heading.level}"><a href="#${heading.id}">${heading.html.replace(LINK_TAG_PATTERN, "")}</a></li>`;
}

function fontStyleSheetLinks(rootPrefix) {
  return FONT_PACKAGES.flatMap((font) =>
    font.styleSheets.map(
      (sheet) => `<link rel="stylesheet" href="${rootPrefix}${ASSETS_FOLDER_NAME}/fonts/${font.name}/${sheet}">`,
    ),
  ).join("\n");
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------- assets ----------

function copyAssets(assetsFolder) {
  fs.cpSync(OWN_ASSETS_FOLDER, assetsFolder, { recursive: true });
  const katexFolder = path.join(packageFolder("katex"), "dist");
  fs.cpSync(path.join(katexFolder, "katex.min.css"), path.join(assetsFolder, "katex", "katex.min.css"));
  fs.cpSync(path.join(katexFolder, "fonts"), path.join(assetsFolder, "katex", "fonts"), { recursive: true });
  fs.cpSync(path.join(packageFolder("mermaid"), "dist", "mermaid.min.js"), path.join(assetsFolder, "mermaid.min.js"));
  for (const font of FONT_PACKAGES) copyFontPackage(font, path.join(assetsFolder, "fonts", font.name));
}

function copyFontPackage(font, targetFolder) {
  const sourceFolder = packageFolder(font.name);
  fs.cpSync(path.join(sourceFolder, "files"), path.join(targetFolder, "files"), { recursive: true });
  for (const sheet of font.styleSheets) fs.cpSync(path.join(sourceFolder, sheet), path.join(targetFolder, sheet));
}

// ---------- report ----------

function reportMathErrors(mathErrors) {
  for (const error of mathErrors) {
    console.error(`error: topics/${error.sourcePath}: KaTeX cannot render ${JSON.stringify(error.formula)}: ${error.message}`);
  }
}

process.exitCode = main();
