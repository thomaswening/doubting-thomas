// The "Read on the site" section that the site workflow keeps at the top of a
// pull request's description. Documented in ../README.md.
import { pageName, PREVIEW_FOLDER, TOPICS_FOLDER } from "./links.mjs";

export const SECTION_START = "<!-- reading-site-preview: written by the site workflow; edits inside are overwritten -->";
export const SECTION_END = "<!-- /reading-site-preview -->";
const SECTION_PATTERN = new RegExp(`${escapeRegExp(SECTION_START)}[\\s\\S]*?${escapeRegExp(SECTION_END)}\\s*`);
const NOTE_PATTERN = new RegExp(`^${TOPICS_FOLDER}/.+\\.md$`);

/**
 * Returns the section linking the preview pages of the notes a pull request adds or
 * changes. `changedFiles` are repository paths of files that still exist after it;
 * `siteUrl` is the site's address and ends with a slash.
 */
export function previewSection(number, siteUrl, changedFiles) {
  const previewUrl = `${siteUrl}${PREVIEW_FOLDER}/${number}/`;
  const notePaths = changedFiles.filter((file) => NOTE_PATTERN.test(file)).map((file) => file.slice(TOPICS_FOLDER.length + 1));
  const noteLines = notePaths.map((notePath) => `- [${notePath}](${previewUrl}${pageName(notePath)})`);
  return [
    SECTION_START,
    "**Read on the site:** the preview is rebuilt on every push and ready a minute or two after the `site` workflow finishes.",
    "",
    ...noteLines,
    `- [All notes in this preview](${previewUrl}index.html)`,
    SECTION_END,
  ].join("\n");
}

/** Returns `body` with its preview section replaced by `section`, or with `section` put on top. */
export function withPreviewSection(body, section) {
  const text = body ?? "";
  if (SECTION_PATTERN.test(text)) return text.replace(SECTION_PATTERN, `${section}\n\n`);
  return `${section}\n\n${text}`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
