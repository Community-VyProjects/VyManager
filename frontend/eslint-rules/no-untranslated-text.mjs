/**
 * Flags user-visible English that is hardcoded in JSX instead of coming from
 * next-intl messages (see messages/README.md).
 *
 * Reported:
 *   - JSX text:                    <p>No rules configured</p>
 *   - string literals in props:    placeholder="Search..."  title="Delete rule"
 *   - a string rendered from a branch:
 *       {ready ? "Down" : name}   placeholder={q ? "Search" : "Filter"}
 *       {ready && "Loading"}      {name || "Unknown"}
 *
 * Not reported: text without a natural-language word (acronyms such as "VRF",
 * "MTU", "IPv4", numbers, punctuation like "·" or "—"), product/protocol names
 * listed in `allow`, a config token that has no translation ("disable",
 * "masquerade", "rx/tx"), and a bare string expression {"…"} or {`…`} (the
 * deliberate escape for a value that must not be translated).
 *
 * A single lowercase word is reported when messages/ already translates it
 * ("unknown") or when trailing punctuation is the only extra ("search...",
 * "vlt:"). Punctuation does not turn a word into a keyword.
 *
 * A string used only as a condition (`status === "up" ? t("a") : t("b")`) is
 * not rendered, so it is not reported.
 *
 * Silence a legitimate case with:
 *   // eslint-disable-next-line vymanager/no-untranslated-text -- <reason>
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PROPS = ["placeholder", "title", "alt", "aria-label", "label", "description"];

// English message values whose zh-CN text differs. A hardcoded copy of one of
// these is the same hole as "unknown" (bfd.json renders it as 未知).
function loadTranslatedTokens() {
  const tokens = new Set();
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "messages");
  const flatten = (value, path, out) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, child] of Object.entries(value)) {
        flatten(child, path ? `${path}.${key}` : key, out);
      }
      return;
    }
    if (typeof value === "string") out.set(path, value);
  };
  let enNames;
  try {
    enNames = readdirSync(join(root, "en")).filter((name) => name.endsWith(".json"));
  } catch {
    return tokens;
  }
  for (const name of enNames) {
    const en = new Map();
    const zh = new Map();
    flatten(JSON.parse(readFileSync(join(root, "en", name), "utf8")), "", en);
    try {
      flatten(JSON.parse(readFileSync(join(root, "zh-CN", name), "utf8")), "", zh);
    } catch {
      continue;
    }
    for (const [path, english] of en) {
      const chinese = zh.get(path);
      if (chinese && chinese !== english) tokens.add(english);
    }
  }
  return tokens;
}

const translatedTokens = loadTranslatedTokens();

// A "word" is a capitalized two-letter word ("Up", "No", "On") or a letter
// followed by at least two lowercase letters ("Rule", "delete"). All-caps
// acronyms ("IP", "VRF"), mixed-case identifiers ("WireGuard", "IPsec") and
// lowercase two-letter units/abbreviations ("ms", "rx") don't match.
const WORD = /^(?:[A-Z][a-z]|[A-Za-z][a-z]{2,})$/;

// A single token is a technical value, not prose, when it
//   - has a separator *between* letters/digits: "example.com", "a=b", "user@host", "snake_case";
//   - starts with @ / ~ or contains "://": "@local-id", "/health", "https://...";
//   - is a lowercase config token: "disable", "client-identifier", "rx/tx", "80,443,https".
// A single lowercase word is still a token only when no locale translates it.
// Trailing punctuation does not make one ("search...", "vlt:"). "Search..." and
// "Loading…" are prose either way, and "/" or "," between words doesn't either
// ("Enabled/Disabled", "Yes,No").
const INNER_SEPARATOR = /[A-Za-z0-9][.:_@=]+[A-Za-z0-9]/;
const LEADING_SYMBOL = /^[@/~]|:\/\//;
const LOWERCASE_KEYWORD = /^[a-z0-9]+(?:[-/,][a-z0-9]+)*$/;

function isTechnicalValue(text) {
  const trimmed = text.trim();
  const colonless = trimmed.replace(/:$/, "");
  const paren = colonless.match(/^\(([a-z0-9]+(?:[-/,][a-z0-9]+)*)\)$/);
  if (paren) return !translatedTokens.has(paren[1]);
  // " · ssh" is a protocol flag, not a sentence.
  const flagged = trimmed.match(/^[·•\s-]+([a-z0-9]+(?:[-/,][a-z0-9]+)*)$/);
  if (flagged) return !translatedTokens.has(flagged[1]);
  // A domain inside a sentence must not exempt the sentence.
  // A URL example ("https://...") stays technical even with a trailing ellipsis.
  if (!/\s/.test(text) && (INNER_SEPARATOR.test(text) || LEADING_SYMBOL.test(text))) return true;
  if (/[.…]+$/.test(trimmed)) return false;
  if (/\s/.test(text)) return false;
  if (!colonless) return false;
  return LOWERCASE_KEYWORD.test(colonless);
}

function hasWords(text, allow) {
  if (allow.has(text) || isTechnicalValue(text)) return false;
  return text
    .split(/[\s/()[\]{}.,:;!?…"'`·—–-]+/)
    .filter(Boolean)
    .some((token) => WORD.test(token) && !allow.has(token));
}

function isBareStringEscape(expr) {
  if (!expr) return false;
  if (expr.type === "Literal" && typeof expr.value === "string") return true;
  // A template that is the whole expression is the same escape, including
  // command text with ${} interpolation. A template in a branch is not.
  return expr.type === "TemplateLiteral";
}

// Strings that can actually be rendered. Do not walk the test of a ternary:
// `status === "up"` is not shown to the operator.
function displayedStrings(expr, out = []) {
  if (!expr || typeof expr !== "object") return out;
  switch (expr.type) {
    case "Literal":
      if (typeof expr.value === "string") out.push({ node: expr, raw: expr.value });
      break;
    case "ConditionalExpression":
      displayedStrings(expr.consequent, out);
      displayedStrings(expr.alternate, out);
      break;
    case "LogicalExpression":
      if (expr.operator === "&&") displayedStrings(expr.right, out);
      else {
        displayedStrings(expr.left, out);
        displayedStrings(expr.right, out);
      }
      break;
    case "BinaryExpression":
      if (expr.operator === "+") {
        displayedStrings(expr.left, out);
        displayedStrings(expr.right, out);
      }
      break;
    case "ParenthesizedExpression":
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression":
    case "TSTypeAssertion":
    case "ChainExpression":
      displayedStrings(expr.expression, out);
      break;
    default:
      break;
  }
  return out;
}

const noUntranslatedText = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow hardcoded user-visible text in JSX; use next-intl messages" },
    schema: [
      {
        type: "object",
        properties: {
          props: { type: "array", items: { type: "string" } },
          allow: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      text: "Hardcoded UI text \"{{text}}\". Move it to messages/<locale>/<namespace>.json and use t().",
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const props = new Set(options.props ?? DEFAULT_PROPS);
    const allow = new Set(options.allow ?? []);

    const report = (node, raw) => {
      const text = raw.replace(/\s+/g, " ").trim();
      if (text && hasWords(text, allow)) {
        context.report({ node, messageId: "text", data: { text: text.length > 40 ? `${text.slice(0, 40)}…` : text } });
      }
    };

    // JSX text and placeholders: a word the catalogs already translate is not a
    // config token. A SelectItem whose value is that same token still is
    // ("reject" next to "drop"). Branch fallbacks stay on hasWords, so
    // {addr || "any"} is not a second copy of this check.
    const reportVisible = (node, raw, selectToken) => {
      const text = raw.replace(/\s+/g, " ").trim();
      if (
        !selectToken &&
        text &&
        LOWERCASE_KEYWORD.test(text) &&
        translatedTokens.has(text) &&
        !allow.has(text)
      ) {
        context.report({
          node,
          messageId: "text",
          data: { text: text.length > 40 ? `${text.slice(0, 40)}…` : text },
        });
        return;
      }
      report(node, raw);
    };

    const isConfigSelectToken = (textNode) => {
      const el = textNode.parent;
      if (!el || el.type !== "JSXElement") return false;
      const id = el.openingElement?.name;
      const tag = id && id.type === "JSXIdentifier" ? id.name : null;
      if (tag !== "SelectItem" && tag !== "option") return false;
      const text = textNode.value.replace(/\s+/g, " ").trim();
      if (!LOWERCASE_KEYWORD.test(text)) return false;
      for (const attr of el.openingElement.attributes) {
        if (attr.type !== "JSXAttribute" || attr.name?.name !== "value") continue;
        return attr.value?.type === "Literal" && attr.value.value === text;
      }
      return false;
    };

    const reportRendered = (expr) => {
      if (isBareStringEscape(expr)) return;
      for (const hit of displayedStrings(expr)) report(hit.node, hit.raw);
    };

    const reportChildExpressions = (node) => {
      for (const child of node.children) {
        if (child.type === "JSXExpressionContainer") reportRendered(child.expression);
      }
    };

    return {
      JSXText(node) {
        reportVisible(node, node.value, isConfigSelectToken(node));
      },
      JSXElement: reportChildExpressions,
      JSXFragment: reportChildExpressions,
      JSXAttribute(node) {
        const name = node.name.type === "JSXIdentifier" ? node.name.name : null;
        if (!name || !props.has(name) || !node.value) return;
        if (node.value.type === "Literal" && typeof node.value.value === "string") {
          reportVisible(node.value, node.value.value, false);
          return;
        }
        if (node.value.type === "JSXExpressionContainer") reportRendered(node.value.expression);
      },
    };
  },
};

export default noUntranslatedText;
