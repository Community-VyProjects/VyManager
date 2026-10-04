import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { locales } from "./config";

const messagesRoot = join(dirname(fileURLToPath(import.meta.url)), "../../messages");

// The same sentence everywhere. A new language translates these once.
const SHARED_CHROME = [
  "Save Changes",
  "Creating...",
  "Saving...",
  "Optional description",
  "Select interface",
  "Interface name is required",
  "Read Only",
  "Delete Interface",
  "Add Interface",
] as const;

function flatten(value: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      Object.assign(out, flatten(child, path));
    }
    return out;
  }
  if (typeof value === "string") out[prefix] = value;
  return out;
}

function loadLocale(locale: string): Map<string, Record<string, string>> {
  const dir = join(messagesRoot, locale);
  const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
  return new Map(files.map((name) => [name, flatten(JSON.parse(readFileSync(join(dir, name), "utf8")))]));
}

function canonicalize(value: string): string {
  return value.replaceAll("…", "...");
}

// English plural hacks a new language cannot fix. Seconds units such as
// "Timeout (s)" are not this. Counted nouns use ICU plural.
function isPluralHack(value: string): boolean {
  if (/[A-Za-z]\((?:s|es)\)/.test(value)) return true;
  if (value.includes("plural,")) return false;
  return /\{count\}\s+(?:sessions|features|rules|grants|records|drops|IPs|interfaces|members|subnets|ranges|joins|certs|tunnels)\b/.test(
    value,
  );
}

describe("message catalogs", () => {
  const catalogs = new Map(locales.map((locale) => [locale, loadLocale(locale)]));

  it("has a message directory for every locale and no extra directory", () => {
    const dirs = readdirSync(messagesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    assert.deepEqual(dirs, [...locales].sort());
  });

  it("gives every locale the same files and keys as English", () => {
    const english = catalogs.get("en");
    assert.ok(english);
    for (const locale of locales) {
      if (locale === "en") continue;
      const other = catalogs.get(locale);
      assert.ok(other);
      assert.deepEqual([...other.keys()].sort(), [...english.keys()].sort(), locale);
      for (const [file, keys] of english) {
        const translated = other.get(file);
        assert.ok(translated, `${locale}/${file}`);
        assert.deepEqual(Object.keys(translated).sort(), Object.keys(keys).sort(), `${locale}/${file}`);
      }
    }
  });

  it("keeps shared button text in common only", () => {
    const english = catalogs.get("en");
    assert.ok(english);
    const wanted = new Set<string>(SHARED_CHROME);
    const found = new Set<string>();
    const duplicates: string[] = [];
    for (const [file, keys] of english) {
      for (const [path, value] of Object.entries(keys)) {
        const sentence = canonicalize(value);
        if (!wanted.has(sentence) && !SHARED_CHROME.includes(value as (typeof SHARED_CHROME)[number])) continue;
        if (file !== "common.json") duplicates.push(`${file}:${path} = ${value}`);
        else found.add(sentence);
      }
    }
    assert.deepEqual(duplicates, []);
    for (const sentence of SHARED_CHROME) {
      assert.equal(found.has(sentence), true, sentence);
    }
  });

  it("uses one plural shape for counted nouns", () => {
    const english = catalogs.get("en");
    assert.ok(english);
    const hacks: string[] = [];
    for (const [file, keys] of english) {
      for (const [path, value] of Object.entries(keys)) {
        if (isPluralHack(value)) hacks.push(`${file}:${path} = ${value}`);
      }
    }
    assert.deepEqual(hacks, []);
  });
});
