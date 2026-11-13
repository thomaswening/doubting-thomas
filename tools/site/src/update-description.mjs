// Writes a pull request's description with its "Read on the site" section, for the
// site workflow. Uses Node only, no npm packages, so the workflow needs no npm ci for it.
// Usage: node src/update-description.mjs --number <n> --site-url <url> --files <list> --body <file> --output <file>
// --files holds one repository path per line. --output is written only when the description changes.
// Documented in ../README.md.
import fs from "node:fs";
import { parseArgs } from "node:util";
import { previewSection, withPreviewSection } from "./pull-request-description.mjs";

const { values } = parseArgs({
  options: {
    number: { type: "string" },
    "site-url": { type: "string" },
    files: { type: "string" },
    body: { type: "string" },
    output: { type: "string" },
  },
});

const changedFiles = fs.readFileSync(values.files, "utf8").split(/\r?\n/).filter(Boolean);
const body = fs.readFileSync(values.body, "utf8").replace(/\r?\n$/, "");
const section = previewSection(Number(values.number), values["site-url"], changedFiles);
const updated = withPreviewSection(body, section);
if (updated !== body) fs.writeFileSync(values.output, updated);
console.log(updated === body ? "Description already up to date." : `Wrote ${values.output}.`);
