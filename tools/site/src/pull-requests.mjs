// Reads this repository's pull requests through git and gh. Uses Node only, no npm packages.
// Documented in ../README.md.
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OPEN_PULL_REQUEST_LIMIT = "100";

/** Runs a command in the repository and returns its output. */
export function run(command, commandArguments, input) {
  return execFileSync(command, commandArguments, { cwd: REPOSITORY_ROOT, encoding: "utf8", input });
}

/** Open pull requests from branches of this repository; forks get no preview. */
export function openPullRequestNumbers() {
  const listing = run("gh", ["pr", "list", "--state", "open", "--limit", OPEN_PULL_REQUEST_LIMIT, "--json", "number,isCrossRepository"]);
  return JSON.parse(listing)
    .filter((pullRequest) => !pullRequest.isCrossRepository)
    .map((pullRequest) => pullRequest.number);
}
