// Keeps the "Read on the site" section in pull request descriptions up to date, for the
// site workflow. Uses Node only, no npm packages, so it runs without npm ci.
// Usage: node src/describe-pull-requests.mjs --site-url <url> [--number <n>] [--dry-run]
// Without --number, it updates every open pull request of this repository.
// Documented in ../README.md.
import { parseArgs } from "node:util";
import { previewSection, withPreviewSection } from "./pull-request-description.mjs";
import { openPullRequestNumbers, run } from "./pull-requests.mjs";

const { values } = parseArgs({
  options: {
    "site-url": { type: "string" },
    number: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});
const siteUrl = values["site-url"];
const isDryRun = values["dry-run"];
const numbers = values.number ? [Number(values.number)] : openPullRequestNumbers();
for (const number of numbers) describe(number);

/** Writes the section into one pull request's description, unless it is there already. */
function describe(number) {
  const endpoint = `repos/{owner}/{repo}/pulls/${number}`;
  const changedFiles = run("gh", ["api", `${endpoint}/files`, "--paginate", "--jq", '.[] | select(.status != "removed") | .filename'])
    .split("\n")
    .filter(Boolean);
  const body = run("gh", ["api", endpoint, "--jq", '.body // ""']).replace(/\r?\n$/, "");
  const updated = withPreviewSection(body, previewSection(number, siteUrl, changedFiles));
  if (updated === body) {
    console.log(`#${number}: already up to date.`);
    return;
  }
  if (!isDryRun) run("gh", ["api", "--method", "PATCH", endpoint, "-F", "body=@-", "--silent"], updated);
  console.log(`#${number}: ${isDryRun ? "would update" : "updated"} the description.`);
}
