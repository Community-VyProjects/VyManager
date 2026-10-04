// Run: node --test eslint-rules/
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import rule, { loadTranslatedTokens } from "./no-untranslated-text.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const options = [{ allow: ["VyOS", "Forward", "Kbps"] }];
const invalid = (code) => ({ code, options, errors: [{ messageId: "text" }] });

ruleTester.run("no-untranslated-text", rule, {
  valid: [
    // Acronyms, numbers and separators
    "<span>VRF · MTU 1500 · IPv4</span>",
    "<span>TTL (ms)</span>",
    "<span>IPsec / WireGuard</span>",
    // Technical values in props
    '<input placeholder="192.168.1.1" />',
    '<input placeholder="example.com" />',
    '<input placeholder="level-1" />',
    '<input placeholder="@local-id" />',
    '<input placeholder="/health" />',
    '<input placeholder="https://vyos.example.com" />',
    '<input placeholder="user@host" />',
    "<span>vlt:</span>",
    "<span>NET</span>",
    "<span>mac</span>",
    // Lowercase keyword lists and rates
    "<span>rx/tx</span>",
    '<input placeholder="80,443,telnet,8080-8090" />',
    '<input placeholder="60/sec" />',
    // Props that aren't checked
    '<div className="Delete rule" />',
    // A bare string expression is the deliberate escape. A comparison string is not rendered.
    '<p>{"Kept as is"}</p>',
    '<input placeholder={"Kept as is"} />',
    '<span>{status === "up" ? t("sessionUp") : t("sessionDown")}</span>',
    '<span>{ready && t("loading")}</span>',
    // Untranslated config token. A translated label is not this.
    '<SelectItem value="ssh">ssh</SelectItem>',
    "<span>(vlt)</span>",
    "<span> · ssh</span>",
    // Allow list
    { code: "<p>VyOS</p>", options },
    { code: "<SelectItem>Forward</SelectItem>", options },
    { code: "<span>100 Kbps</span>", options },
  ],
  invalid: [
    invalid("<p>No rules configured</p>"),
    invalid("<p>Loading...</p>"),
    invalid("<p>Loading…</p>"),
    invalid('<input placeholder="Search..." />'),
    invalid('<input placeholder="search..." />'),
    invalid("<Badge>UP</Badge>"),
    invalid('<input placeholder="optional" />'),
    invalid('<input placeholder="groups" />'),
    invalid('<input placeholder="admin" />'),
    invalid('<input placeholder="OK" />'),
    invalid('<SelectItem value="unknown">unknown</SelectItem>'),
    invalid('<SelectItem value="Ethernet">Ethernet</SelectItem>'),
    invalid("<span>unknown:</span>"),
    invalid("<span>(unknown)</span>"),
    invalid("<span> · unknown</span>"),
    invalid("<span>shortcut</span>"),
    invalid('<SelectItem value="reject">reject</SelectItem>'),
    invalid('<SelectItem value="disable">disable</SelectItem>'),
    invalid('<span>{name || "unknown"}</span>'),
    invalid('<input placeholder={ready ? "secret" : name} />'),
    invalid("<span>{ok ? `Session down` : name}</span>"),
    invalid('<span>{ready && "Loading sessions"}</span>'),
    invalid('<span>{name || "Unknown peer"}</span>'),
    {
      code: '<span>{ready ? "Session up" : "Session down"}</span>',
      options,
      errors: [{ messageId: "text" }, { messageId: "text" }],
    },
    {
      code: '<input placeholder={ready ? "Search rules" : "Filter rules"} />',
      options,
      errors: [{ messageId: "text" }, { messageId: "text" }],
    },
    // Every checked prop
    invalid('<button title="Delete rule" />'),
    invalid('<img alt="VyManager Logo" />'),
    invalid('<button aria-label="Close dialog" />'),
    invalid('<Field label="Interface name" />'),
    invalid('<Card description="Firewall rules for this zone" />'),
    // "/" and "," between words are still prose
    invalid("<span>Enabled/Disabled</span>"),
    invalid('<input placeholder="Read/Write" />'),
    invalid("<span>Yes,No</span>"),
    invalid('<input placeholder="Monday,Tuesday" />'),
    // Short capitalized words
    invalid("<Badge>Up</Badge>"),
    invalid("<Badge>No</Badge>"),
    // Not on the allow list because it has a translation
    invalid("<SelectItem>Ethernet</SelectItem>"),
    {
      code: "<p>This is a very long sentence that keeps going past forty characters</p>",
      errors: [{ messageId: "text", data: { text: "This is a very long sentence that keeps …" } }],
    },
  ],
});

describe("loadTranslatedTokens", () => {
  it("reads every locale directory, not only zh-CN", () => {
    const root = mkdtempSync(join(tmpdir(), "i18n-tokens-"));
    mkdirSync(join(root, "en"));
    mkdirSync(join(root, "de"));
    writeFileSync(join(root, "en", "sample.json"), JSON.stringify({ widget: "Widget" }));
    writeFileSync(join(root, "de", "sample.json"), JSON.stringify({ widget: "Ding" }));
    try {
      const { tokens } = loadTranslatedTokens(root);
      assert.equal(tokens.has("widget"), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
