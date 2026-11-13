// Rewrites the notes' relative links for the reading site. Documented in ../README.md.
import path from "node:path";

/** The repository on GitHub; links that leave topics/ point there. */
export const REPOSITORY_URL = "https://github.com/thomaswening/doubting-thomas";
export const TOPICS_FOLDER = "topics";
/** Where a pull request's preview lives inside the site: pr/52/. */
export const PREVIEW_FOLDER = "pr";
const MARKDOWN_EXTENSION = ".md";
const PAGE_EXTENSION = ".html";
const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Returns the href a link in the note at `sourcePath` (relative to topics/) needs on the site:
 * - a link to another note becomes a link to its page (`x.md#c3` becomes `x.html#c3`);
 * - a link that leaves topics/ goes to the file on GitHub;
 * - absolute URLs, anchors on the same page and other files stay as they are.
 */
export function rewriteLink(href, sourcePath) {
  if (!href || href.startsWith("#") || URL_SCHEME_PATTERN.test(href)) return href;
  const fragmentPosition = href.indexOf("#");
  const target = fragmentPosition < 0 ? href : href.slice(0, fragmentPosition);
  const fragment = fragmentPosition < 0 ? "" : href.slice(fragmentPosition);
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), target));

  if (resolved.startsWith("../")) {
    const repositoryPath = path.posix.normalize(path.posix.join(TOPICS_FOLDER, resolved));
    return `${REPOSITORY_URL}/blob/main/${repositoryPath}${fragment}`;
  }
  if (target.endsWith(MARKDOWN_EXTENSION)) return pageName(target) + fragment;
  return href;
}

/** The page a note becomes: `qft/index.md` is published as `qft/index.html`. */
export function pageName(notePath) {
  return notePath.slice(0, -MARKDOWN_EXTENSION.length) + PAGE_EXTENSION;
}
