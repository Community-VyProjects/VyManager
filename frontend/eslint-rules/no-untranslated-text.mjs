/**
 * Flags user-visible English that is hardcoded in JSX instead of coming from
 * next-intl messages (see messages/README.md).
 *
 * Reported:
 *   - JSX text:                    <p>No rules configured</p>
 *   - string literals in props:    placeholder="Search..."  title="Delete rule"
 *
 * Not reported: text without a natural-language word (acronyms such as "VRF",
 * "MTU", "IPv4", numbers, punctuation like "·" or "—"), product/protocol names
 * listed in `allow`, and string expressions such as {"…"} or {`…`} (use them
 * deliberately for values that must not be translated).
 *
 * Silence a legitimate case with:
 *   // eslint-disable-next-line vymanager/no-untranslated-text -- <reason>
 */

const DEFAULT_PROPS = ["placeholder", "title", "alt", "aria-label", "label", "description"];

// A "word" is a run of letters starting with a letter and containing at least
// two further lowercase letters, e.g. "Rule", "delete", "Configured".
// Mixed-case identifiers like "WireGuard", "IPsec", "OpenVPN" don't match.
const WORD = /^[A-Za-z][a-z]{2,}$/;

// A single token containing - . / : _ @ , or = is a technical value (example
// hostnames, paths, config keys, "level-1", "Monday,Tuesday"), not prose.
const TECHNICAL_VALUE = /^\S*[-./:_@,=]\S*$/;
// A single all-lowercase word is almost always a config keyword shown as-is
// ("disable", "strict", "masquerade", "udp").
const KEYWORD = /^[a-z][a-z0-9]*$/;

function hasWords(text, allow) {
  if (allow.has(text) || TECHNICAL_VALUE.test(text) || KEYWORD.test(text)) return false;
  return text
    .split(/[\s/()[\]{}.,:;!?…"'`·—–-]+/)
    .filter(Boolean)
    .some((token) => WORD.test(token) && !allow.has(token));
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

    return {
      JSXText(node) {
        report(node, node.value);
      },
      JSXAttribute(node) {
        const name = node.name.type === "JSXIdentifier" ? node.name.name : null;
        if (!name || !props.has(name) || !node.value) return;
        if (node.value.type === "Literal" && typeof node.value.value === "string") {
          report(node.value, node.value.value);
        }
      },
    };
  },
};

export default noUntranslatedText;
