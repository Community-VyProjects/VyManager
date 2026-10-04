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
  return value.replaceAll("…", "...").toLowerCase();
}

// One plural shape: the number and the noun live inside `{name, plural, ...}`.
// A split `{count} {count, plural, ...}`, a repeated `{drops} drops`, a
// `{count}`/`{total}` followed by a plural noun, or `route(s)` all fail.
// "Timeout (s)" is a unit, not this.
const SPLIT_PLURAL = /\{([A-Za-z0-9_]+)\}\s+\{\1,\s*plural/;
const PAREN_PLURAL = /[A-Za-z]{2,}\((?:s|es)\)/;
const REPEATED_NOUN = /\{([A-Za-z][A-Za-z0-9_]*s)\}\s+(?:[A-Za-z]+\s+){0,2}\1\b/;
const COUNT_NOUN = /\{(count|total)\}\s+(?:[A-Za-z]+\s+){0,2}[a-z]{4,}s\b/;
const PROSE_PAREN_PLURAL = /(?<=\s)[A-Za-z]{3,}\((?:s|es)\)/;

function pluralProblems(value: string): string[] {
  const problems: string[] = [];
  if (PAREN_PLURAL.test(value)) problems.push("paren");
  if (SPLIT_PLURAL.test(value)) problems.push("split");
  if (!value.includes("plural,") || SPLIT_PLURAL.test(value)) {
    if (REPEATED_NOUN.test(value)) problems.push("repeated");
    if (COUNT_NOUN.test(value) && !value.includes("plural,")) problems.push("count-noun");
  }
  return problems;
}

function walkFiles(dir: string, suffix: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(path, suffix, out);
    else if (entry.name.endsWith(suffix)) out.push(path);
  }
  return out;
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
    const wanted = new Set(SHARED_CHROME.map((sentence) => canonicalize(sentence)));
    const found = new Set<string>();
    const duplicates: string[] = [];
    for (const [file, keys] of english) {
      for (const [path, value] of Object.entries(keys)) {
        const sentence = canonicalize(value);
        if (!wanted.has(sentence)) continue;
        if (file !== "common.json") duplicates.push(`${file}:${path} = ${value}`);
        else found.add(value);
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
        const problems = pluralProblems(value);
        if (problems.length > 0) hacks.push(`${file}:${path} [${problems.join(",")}] ${value}`);
      }
    }
    const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
    for (const file of walkFiles(srcRoot, ".tsx")) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("{/*")) return;
        if (PROSE_PAREN_PLURAL.test(line)) hacks.push(`${file}:${index + 1} ${trimmed}`);
      });
    }
    assert.deepEqual(hacks, []);
  });
});
