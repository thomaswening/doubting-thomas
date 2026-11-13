// Builds the reading site from a topics/ folder.
// Usage: node src/build.mjs [--topics <folder>] [--output <folder>] [--preview <pull request number>]
// Documented in ../README.md.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderNote } from "./markdown.mjs";
import { pageName, REPOSITORY_URL, TOPICS_FOLDER } from "./links.mjs";

export const SITE_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPOSITORY_ROOT = path.resolve(SITE_FOLDER, "../..");
export const DEFAULT_OUTPUT_FOLDER = path.join(SITE_FOLDER, "_site");
const DEFAULT_TOPICS_ROOT = path.join(REPOSITORY_ROOT, TOPICS_FOLDER);
const TEMPLATE_PATH = path.join(SITE_FOLDER, "template.html");
const OWN_ASSETS_FOLDER = path.join(SITE_FOLDER, "assets");
const ASSETS_FOLDER_NAME = "assets";
const SITE_NAME = "doubting-thomas";
const INDEX_FILE = "index.md";
const MAIN_BRANCH = "main";
const EXIT_MATH_ERRORS = 1;

/** Font packages copied into assets/fonts, with the style sheets each page loads. */
const FONT_PACKAGES = [
  { name: "@fontsource-variable/literata", styleSheets: ["wght.css", "wght-italic.css"] },
  { name: "@fontsource-variable/source-serif-4", styleSheets: ["wght.css", "wght-italic.css"] },
  { name: "@fontsource/atkinson-hyperlegible", styleSheets: ["400.css", "400-italic.css", "700.css", "700-italic.css"] },
];

const require = createRequire(import.meta.url);
const packageFolder = (name) => path.dirname(require.resolve(`${name}/package.json`));

/**
 * Builds the site from `topicsRoot` into `outputFolder` and returns the formulas
 * KaTeX could not render, as { sourcePath, formula, message }.
 * With `previewNumber`, the pages are pull request `previewNumber`'s preview:
 * they carry a banner, are kept out of search engines, and share the assets of
 * the site they sit in (outputFolder is <site>/pr/<number>), so none are copied.
 */
export function buildSite({ topicsRoot = DEFAULT_TOPICS_ROOT, outputFolder = DEFAULT_OUTPUT_FOLDER, previewNumber = null }) {
  fs.rmSync(outputFolder, { recursive: true, force: true });
  const notes = findNotes(topicsRoot).map((sourcePath) => readNote(topicsRoot, sourcePath));
  const areaTitles = new Map(notes.filter(isAreaIndex).map((note) => [areaOf(note.sourcePath), note.title]));
  const site = {
    template: fs.readFileSync(TEMPLATE_PATH, "utf8"),
    areaTitles,
    outputFolder,
    previewNumber,
    assetsFromRoot: previewNumber === null ? `${ASSETS_FOLDER_NAME}/` : `../../${ASSETS_FOLDER_NAME}/`,
  };
  const mathErrors = notes.flatMap((note) => writePage(note, site));
  if (previewNumber === null) copyAssets(path.join(outputFolder, ASSETS_FOLDER_NAME));
  console.log(`Built ${notes.length} pages into ${outputFolder}.`);
  return mathErrors;
}

/** Prints one error line per formula KaTeX could not render. */
export function reportMathErrors(mathErrors, severity = "error") {
  for (const error of mathErrors) {
    console.error(`${severity}: topics/${error.sourcePath}: KaTeX cannot render ${JSON.stringify(error.formula)}: ${error.message}`);
  }
}

function main() {
  const { values } = parseArgs({
    options: { topics: { type: "string" }, output: { type: "string" }, preview: { type: "string" } },
  });
  const mathErrors = buildSite({
    topicsRoot: values.topics ? path.resolve(values.topics) : undefined,
    outputFolder: values.output ? path.resolve(values.output) : undefined,
    previewNumber: values.preview ? Number(values.preview) : null,
  });
  reportMathErrors(mathErrors);
  return mathErrors.length === 0 ? 0 : EXIT_MATH_ERRORS;
}

// ---------- reading the notes ----------

function findNotes(topicsRoot) {
  return fs
    .readdirSync(topicsRoot, { recursive: true })
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.split(path.sep).join("/"))
    .sort();
}

const FRONT_MATTER_PATTERN = /^---\n([\s\S]*?)\n---\n/;
const TITLE_HEADING_PATTERN = /^# (.+)\n/m;

/** Reads a note: its front matter's title and updated date, or its # heading as the title. */
function readNote(topicsRoot, sourcePath) {
  const text = fs.readFileSync(path.join(topicsRoot, sourcePath), "utf8").replace(/\r\n/g, "\n");
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
function writePage(note, site) {
  const rendered = renderNote(note.body, note.sourcePath);
  const rootPrefix = "../".repeat(note.sourcePath.split("/").length - 1);
  const assetsPrefix = rootPrefix + site.assetsFromRoot;
  const hasDiagrams = rendered.html.includes('class="mermaid"');
  const isPreview = site.previewNumber !== null;
  const replacements = {
    TITLE: escapeHtml(note.title),
    ASSETS: assetsPrefix,
    ROBOTS: isPreview ? '<meta name="robots" content="noindex">' : "",
    PREVIEW_BANNER: isPreview ? previewBanner(site.previewNumber) : "",
    BREADCRUMBS: breadcrumbs(note, site, rootPrefix),
    DATELINE: note.updated ? `<p class="dateline">Updated ${formatDate(note.updated)}</p>` : "",
    CONTENTS: rendered.headings.map(contentsEntry).join("\n"),
    CONTENTS_HIDDEN: rendered.headings.length === 0 ? "hidden" : "",
    CONTENT: rendered.html,
    SOURCE_LINK: sourceLink(note, site.previewNumber),
    DIAGRAM_SCRIPT: hasDiagrams ? `<script src="${assetsPrefix}mermaid.min.js"></script>` : "",
    FONT_STYLESHEETS: fontStyleSheetLinks(assetsPrefix),
  };
  const page = site.template.replace(/\{\{(\w+)\}\}/g, (placeholder, key) => replacements[key] ?? placeholder);
  const outputPath = path.join(site.outputFolder, pageName(note.sourcePath));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, page);
  return rendered.mathErrors.map((error) => ({ ...error, sourcePath: note.sourcePath }));
}

function pullRequestUrl(previewNumber) {
  return `${REPOSITORY_URL}/pull/${previewNumber}`;
}

function previewBanner(previewNumber) {
  return `<div class="preview-banner">Preview of <a href="${pullRequestUrl(previewNumber)}">#${previewNumber}</a>, not merged yet</div>`;
}

function sourceLink(note, previewNumber) {
  if (previewNumber !== null) return `<a href="${pullRequestUrl(previewNumber)}/files">Changes in #${previewNumber} on GitHub</a>`;
  return `<a href="${REPOSITORY_URL}/blob/${MAIN_BRANCH}/${TOPICS_FOLDER}/${note.sourcePath}">Source on GitHub</a>`;
}

function breadcrumbs(note, site, rootPrefix) {
  const homeName = site.previewNumber === null ? SITE_NAME : `${SITE_NAME} #${site.previewNumber}`;
  const home = `<a href="${rootPrefix}index.html">${homeName}</a>`;
  const area = areaOf(note.sourcePath);
  if (!area || isAreaIndex(note)) return home;
  return `${home} <span aria-hidden="true">›</span> <a href="index.html">${escapeHtml(site.areaTitles.get(area) ?? area)}</a>`;
}

const LINK_TAG_PATTERN = /<\/?a\b[^>]*>/g;

function contentsEntry(heading) {
  return `<li class="contents-${heading.level}"><a href="#${heading.id}">${heading.html.replace(LINK_TAG_PATTERN, "")}</a></li>`;
}

function fontStyleSheetLinks(assetsPrefix) {
  return FONT_PACKAGES.flatMap((font) =>
    font.styleSheets.map((sheet) => `<link rel="stylesheet" href="${assetsPrefix}fonts/${font.name}/${sheet}">`),
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

const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isEntryPoint) process.exitCode = main();
