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

// One plural shape: `{name, plural, one {# noun} other {# nouns}}`.
// A raw `{name}` next to `{name, plural`, `=1`, `{n}`, or `{packets} pkts`
// is another shape. `route(s)` is the same hole in source text.
// "Timeout (s)" is a unit, not this.
const RAW_PLACEHOLDER = /\{([A-Za-z0-9_]+)\}(?!,)/g;
const PAREN_PLURAL = /[A-Za-z]{2,}\((?:s|es)\)/;
const PACKET_ABBREV = /\{[A-Za-z]*[Pp]ackets\}\s+pkts/;

export function pluralProblems(value: string): string[] {
  const problems: string[] = [];
  if (PAREN_PLURAL.test(value)) problems.push("paren");
  const raw = [...value.matchAll(RAW_PLACEHOLDER)].map((match) => match[1]);
  for (const name of new Set(raw)) {
    if (value.includes(`{${name}, plural`) || value.includes(`{${name},plural`)) {
      problems.push(`split:${name}`);
    }
  }
  if (value.includes("plural") && value.includes("=1")) problems.push("exact-one");
  if (value.includes("plural") && value.includes("{n}")) problems.push("n-slot");
  if (PACKET_ABBREV.test(value)) problems.push("packet-abbrev");
  if (!value.includes("plural")) {
    const repeated = /\{([A-Za-z][A-Za-z0-9_]*s)\}\s+(?:[A-Za-z]+\s+){0,2}\1\b/;
    const countNoun = /\{(count|total)\}\s+(?:[A-Za-z]+\s+){0,2}[a-z]{4,}s\b/;
    if (repeated.test(value)) problems.push("repeated");
    if (countNoun.test(value)) problems.push("count-noun");
  }
  return problems;
}

export function proseParenPlurals(source: string): string[] {
  const pattern = /[A-Za-z]{3,}\((?:s|es)\)/g;
  const hits: string[] = [];
  for (const line of source.split("\n")) {
    const quoted = [...line.matchAll(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g)].map((match) => match[0]);
    const jsx = [...line.matchAll(/>([^<]*)</g)].map((match) => match[1]);
    const comment = /^\s*(\/\/|\*|{\/\*)/.test(line) ? [line] : [];
    for (const chunk of [...quoted, ...jsx, ...comment]) {
      for (const match of chunk.matchAll(pattern)) hits.push(match[0]);
    }
  }
  return hits;
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
    const hacks: string[] = [];
    for (const [locale, catalog] of catalogs) {
      for (const [file, keys] of catalog) {
        for (const [path, value] of Object.entries(keys)) {
          const problems = pluralProblems(value);
          if (problems.length > 0) hacks.push(`${locale}/${file}:${path} [${problems.join(",")}] ${value}`);
        }
      }
    }
    const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
    for (const suffix of [".tsx", ".ts"]) {
      for (const file of walkFiles(srcRoot, suffix)) {
        if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
        const hits = proseParenPlurals(readFileSync(file, "utf8"));
        for (const hit of hits) hacks.push(`${file} ${hit}`);
      }
    }
    assert.deepEqual(hacks, []);
  });

  it("rejects the plural shapes a catalog scan used to miss", () => {
    assert.ok(
      pluralProblems(
        "Warning: This interface has {count} VLAN-to-VNI {count, plural, one {mapping} other {mappings}} configured.",
      ).includes("split:count"),
    );
    assert.ok(pluralProblems("{packets} pkts").includes("packet-abbrev"));
    assert.ok(
      pluralProblems("{count, plural, =1 {{n} flowtable} other {{n} flowtables}}").includes("exact-one"),
    );
    assert.ok(pluralProblems("{count, plural, one {{n} member} other {{n} members}}").includes("n-slot"));
    assert.equal(pluralProblems("Timeout (s)").length, 0);
    assert.equal(canonicalize("Add interface"), canonicalize("Add Interface"));
    assert.deepEqual(proseParenPlurals("<span>Route(s)</span>"), ["Route(s)"]);
    assert.deepEqual(proseParenPlurals('const label = "Tunnel(s)"'), ["Tunnel(s)"]);
    assert.deepEqual(proseParenPlurals("sources.includes(s)"), []);
  });
});
