// Run: node --test eslint-rules/
import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import rule from "./no-untranslated-text.mjs";

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
    '<input placeholder="Monday,Tuesday" />',
    "<span>vlt:</span>",
    // Props that aren't checked
    '<div className="Delete rule" />',
    // String expressions are a deliberate escape
    '<p>{"Kept as is"}</p>',
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
    invalid('<button title="Delete rule" />'),
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
