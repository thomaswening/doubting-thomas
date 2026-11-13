// Turns a note's Markdown into HTML the way GitHub reads it, plus the
// textbook layout of the reading site. Documented in ../README.md.
import MarkdownIt from "markdown-it";
import katex from "katex";
import { rewriteLink } from "./links.mjs";

/** Labels that open a formal statement (AGENTS.md, "Mathematics and physics notes"). */
export const ENVIRONMENT_LABELS = ["Definition", "Proposition", "Theorem", "Lemma", "Corollary"];
const ENVIRONMENT_PATTERN = new RegExp(`^\\*\\*(${ENVIRONMENT_LABELS.join("|")})\\b`);
const PROOF_IDEA_PATTERN = /^\*Proof idea\.\*/;
const DISPLAY_STYLE_PATTERN = /^\s*\\displaystyle\b\s*/;
const FOLDED_BLOCK_PATTERN = /<details><summary>(Proof|Solution)<\/summary>/g;
const KEY_CLAIMS_HEADING_ID = "key-claims";
const MATH_FENCE = "math";
const MERMAID_FENCE = "mermaid";
const DOLLAR = "$";
const BACKTICK = "`";

/**
 * Creates a renderer for one note. Returns { html, headings, mathErrors }:
 * headings are the h2 and h3 headings as { level, id, html } for the contents
 * panel, mathErrors the formulas KaTeX could not render, as { formula, message }.
 * `sourcePath` is the note's path under topics/, which relative links resolve against.
 */
export function renderNote(markdownText, sourcePath) {
  const markdown = createMarkdown();
  const environment = { sourcePath, headings: [], mathErrors: [] };
  const html = markdown
    .render(markdownText, environment)
    .replace(FOLDED_BLOCK_PATTERN, (_, label) => `<details class="${label.toLowerCase()}"><summary>${label}</summary>`);
  return { html, headings: environment.headings, mathErrors: environment.mathErrors };
}

function createMarkdown() {
  const markdown = new MarkdownIt({ html: true });
  markdown.inline.ruler.before("escape", "github_math", parseInlineMath);
  markdown.core.ruler.after("inline", "display_paragraphs", markDisplayParagraphs);
  markdown.core.ruler.push("heading_ids", (state) => addHeadingIds(state));
  markdown.core.ruler.push("key_claims", markKeyClaims);
  markdown.core.ruler.push("environments", groupEnvironments);
  markdown.renderer.rules.math_inline = renderMathToken;
  markdown.renderer.rules.fence = renderFence(markdown.renderer.rules.fence);
  markdown.renderer.rules.link_open = renderLink(markdown.renderer.rules.link_open);
  return markdown;
}

// ---------- maths ----------

/** The three inline forms GitHub accepts: $`…`$, $$…$$ and $…$. */
function parseInlineMath(state, isValidationOnly) {
  const source = state.src;
  const start = state.pos;
  if (source[start] !== DOLLAR) return false;
  const formula = findFormula(source, start);
  if (!formula) return false;
  if (!isValidationOnly) {
    const token = state.push("math_inline", "math", 0);
    token.content = formula.content;
    token.meta = { isDisplay: formula.isDisplay };
  }
  state.pos = formula.end;
  return true;
}

function findFormula(source, start) {
  if (source[start + 1] === BACKTICK) return findDelimited(source, start, "$`", "`$", false);
  if (source[start + 1] === DOLLAR) return findDelimited(source, start, "$$", "$$", true);
  return findSingleDollar(source, start);
}

function findDelimited(source, start, opening, closing, isDisplay) {
  const closingPosition = source.indexOf(closing, start + opening.length);
  if (closingPosition < 0) return null;
  return {
    content: source.slice(start + opening.length, closingPosition),
    end: closingPosition + closing.length,
    isDisplay,
  };
}

/** As on GitHub, $ x$ and $x $ are not formulas: the dollars must touch the formula. */
function findSingleDollar(source, start) {
  const closingPosition = source.indexOf(DOLLAR, start + 1);
  if (closingPosition <= start + 1) return null;
  const content = source.slice(start + 1, closingPosition);
  if (content !== content.trim()) return null;
  return { content, end: closingPosition + 1, isDisplay: false };
}

/** AGENTS.md writes a displayed formula inside a list as a paragraph holding only $`\displaystyle …`$. */
function isDisplayParagraph(tokens, index) {
  if (tokens[index].type !== "paragraph_open") return false;
  const children = tokens[index + 1].children.filter((child) => !(child.type === "text" && !child.content.trim()));
  if (children.length !== 1 || children[0].type !== "math_inline") return false;
  return children[0].meta.isDisplay || DISPLAY_STYLE_PATTERN.test(children[0].content);
}

function markDisplayParagraphs(state) {
  const tokens = state.tokens;
  for (let index = 0; index < tokens.length; index++) {
    if (!isDisplayParagraph(tokens, index)) continue;
    const [opening, inline, closing] = tokens.slice(index, index + 3);
    opening.tag = closing.tag = "div";
    opening.attrSet("class", "math-block");
    inline.children.find((child) => child.type === "math_inline").meta.isDisplay = true;
  }
}

function renderMathToken(tokens, index, options, environment) {
  const token = tokens[index];
  return renderFormula(token.content, token.meta.isDisplay, environment);
}

function renderFormula(formula, isDisplay, environment) {
  const tex = isDisplay ? formula.replace(DISPLAY_STYLE_PATTERN, "") : formula;
  const options = { displayMode: isDisplay, strict: "ignore" };
  try {
    return katex.renderToString(tex, { ...options, throwOnError: true });
  } catch (error) {
    environment.mathErrors.push({ formula: tex, message: error.message });
    return katex.renderToString(tex, { ...options, throwOnError: false });
  }
}

function renderFence(defaultRule) {
  return (tokens, index, options, environment, renderer) => {
    const token = tokens[index];
    const language = token.info.trim();
    if (language === MATH_FENCE) {
      return `<div class="math-block">${renderFormula(token.content, true, environment)}</div>\n`;
    }
    if (language === MERMAID_FENCE) {
      // The source is kept in an attribute so reader.js can redraw the diagram when the theme changes.
      const source = MarkdownIt().utils.escapeHtml(token.content);
      return `<pre class="mermaid" data-source="${source}">${source}</pre>\n`;
    }
    return defaultRule(tokens, index, options, environment, renderer);
  };
}

// ---------- links and headings ----------

function renderLink(defaultRule) {
  return (tokens, index, options, environment, renderer) => {
    const token = tokens[index];
    token.attrSet("href", rewriteLink(token.attrGet("href"), environment.sourcePath));
    return defaultRule
      ? defaultRule(tokens, index, options, environment, renderer)
      : renderer.renderToken(tokens, index, options);
  };
}

/**
 * GitHub's heading anchors: lower case, characters other than letters, digits,
 * spaces and hyphens removed, spaces turned into hyphens, repeats numbered -1, -2.
 * The notes link to headings by these anchors, so the site must produce the same.
 */
export function githubSlug(headingText, usedSlugs) {
  const base = headingText
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M} _-]/gu, "")
    .replace(/ /g, "-");
  const repeatCount = usedSlugs.get(base) ?? 0;
  usedSlugs.set(base, repeatCount + 1);
  return repeatCount === 0 ? base : `${base}-${repeatCount}`;
}

const CONTENTS_LEVELS = ["h2", "h3"];

function addHeadingIds(state) {
  const usedSlugs = new Map();
  const tokens = state.tokens;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type !== "heading_open") continue;
    const inline = tokens[index + 1];
    const text = inline.children.map((child) => child.content).join("");
    const id = githubSlug(text, usedSlugs);
    token.attrSet("id", id);
    if (!CONTENTS_LEVELS.includes(token.tag)) continue;
    const html = state.md.renderer.renderInline(inline.children, state.md.options, state.env);
    state.env.headings.push({ level: token.tag, id, html });
  }
}

function markKeyClaims(state) {
  const tokens = state.tokens;
  const headingIndex = tokens.findIndex(
    (token) => token.type === "heading_open" && token.attrGet("id") === KEY_CLAIMS_HEADING_ID,
  );
  if (headingIndex < 0) return;
  const listIndex = tokens.findIndex((token, index) => index > headingIndex && token.type === "bullet_list_open");
  if (listIndex >= 0) tokens[listIndex].attrJoin("class", "claims");
}

// ---------- textbook environments ----------

/** Splits the top-level token stream into blocks: [first, last] index pairs. */
function topLevelBlocks(tokens) {
  const blocks = [];
  let first = 0;
  let depth = 0;
  for (let index = 0; index < tokens.length; index++) {
    depth += tokens[index].nesting;
    if (depth !== 0) continue;
    blocks.push([first, index]);
    first = index + 1;
  }
  return blocks;
}

function paragraphText(tokens, [first]) {
  return tokens[first].type === "paragraph_open" ? tokens[first + 1].content : null;
}

function isMathBlock(tokens, [first]) {
  const token = tokens[first];
  return (token.type === "fence" && token.info.trim() === MATH_FENCE) || isDisplayParagraph(tokens, first);
}

/**
 * A statement paragraph (**Definition …**, **Proposition …**) and the displayed
 * formulas right after it form one box: <div class="environment environment-definition">.
 * A *Proof idea.* paragraph gets the class proof-idea.
 */
function groupEnvironments(state) {
  const tokens = state.tokens;
  const blocks = topLevelBlocks(tokens);
  const grouped = [];
  const htmlToken = (content) => Object.assign(new state.Token("html_block", "", 0), { content });
  const tokensOf = ([first, last]) => tokens.slice(first, last + 1);

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const block = blocks[blockIndex];
    const text = paragraphText(tokens, block) ?? "";
    const label = text.match(ENVIRONMENT_PATTERN)?.[1];
    if (PROOF_IDEA_PATTERN.test(text)) tokens[block[0]].attrJoin("class", "proof-idea");
    if (!label) {
      grouped.push(...tokensOf(block));
      continue;
    }
    grouped.push(htmlToken(`<div class="environment environment-${label.toLowerCase()}">\n`), ...tokensOf(block));
    while (blockIndex + 1 < blocks.length && isMathBlock(tokens, blocks[blockIndex + 1])) {
      blockIndex++;
      grouped.push(...tokensOf(blocks[blockIndex]));
    }
    grouped.push(htmlToken("</div>\n"));
  }
  state.tokens = grouped;
}
