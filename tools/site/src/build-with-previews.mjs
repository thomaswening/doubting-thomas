// Builds the published site: main at the root, and every open pull request of this
// repository as a preview under pr/<number>/. Needs git and an authenticated gh.
// Usage: node src/build-with-previews.mjs. Documented in ../README.md.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSite, DEFAULT_OUTPUT_FOLDER, reportMathErrors } from "./build.mjs";
import { PREVIEW_FOLDER, TOPICS_FOLDER } from "./links.mjs";
import { openPullRequestNumbers, run } from "./pull-requests.mjs";

const EXIT_MATH_ERRORS = 1;

function main() {
  const mainErrors = buildSite({ outputFolder: DEFAULT_OUTPUT_FOLDER });
  reportMathErrors(mainErrors);
  for (const number of openPullRequestNumbers()) buildPreview(number);
  return mainErrors.length === 0 ? 0 : EXIT_MATH_ERRORS;
}

/**
 * Builds one pull request's notes with this checkout's build code. A formula error
 * there is only a warning here: it fails that pull request's own check instead.
 */
function buildPreview(number) {
  const checkoutFolder = fs.mkdtempSync(path.join(os.tmpdir(), `pull-request-${number}-`));
  run("git", ["fetch", "--quiet", "origin", `refs/pull/${number}/head`]);
  run("git", ["worktree", "add", "--quiet", "--detach", checkoutFolder, "FETCH_HEAD"]);
  try {
    const errors = buildSite({
      topicsRoot: path.join(checkoutFolder, TOPICS_FOLDER),
      outputFolder: path.join(DEFAULT_OUTPUT_FOLDER, PREVIEW_FOLDER, String(number)),
      previewNumber: number,
    });
    reportMathErrors(errors, "warning");
  } finally {
    run("git", ["worktree", "remove", "--force", checkoutFolder]);
  }
}

process.exitCode = main();
