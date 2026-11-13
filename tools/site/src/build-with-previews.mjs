// Builds the published site: main at the root, and every open pull request of this
// repository as a preview under pr/<number>/. Needs git and an authenticated gh.
// Usage: node src/build-with-previews.mjs. Documented in ../README.md.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { buildSite, DEFAULT_OUTPUT_FOLDER, reportMathErrors, REPOSITORY_ROOT } from "./build.mjs";
import { PREVIEW_FOLDER, TOPICS_FOLDER } from "./links.mjs";

const OPEN_PULL_REQUEST_LIMIT = "100";
const EXIT_MATH_ERRORS = 1;

function main() {
  const mainErrors = buildSite({ outputFolder: DEFAULT_OUTPUT_FOLDER });
  reportMathErrors(mainErrors);
  for (const number of openPullRequestNumbers()) buildPreview(number);
  return mainErrors.length === 0 ? 0 : EXIT_MATH_ERRORS;
}

/** Open pull requests from branches of this repository; forks get no preview. */
function openPullRequestNumbers() {
  const listing = run("gh", ["pr", "list", "--state", "open", "--limit", OPEN_PULL_REQUEST_LIMIT, "--json", "number,isCrossRepository"]);
  return JSON.parse(listing)
    .filter((pullRequest) => !pullRequest.isCrossRepository)
    .map((pullRequest) => pullRequest.number);
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

function run(command, commandArguments) {
  return execFileSync(command, commandArguments, { cwd: REPOSITORY_ROOT, encoding: "utf8" });
}

process.exitCode = main();
