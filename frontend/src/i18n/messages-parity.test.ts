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
// A counted noun outside a plural block still fails when another plural sits
// in the same string. Bolting "s" onto a placeholder is not a plural.
// "Timeout (s)" and "{seconds}s" are units, not this.
const RAW_PLACEHOLDER = /\{([A-Za-z0-9_]+)\}(?!,)/g;
const PAREN_PLURAL = /[A-Za-z]{2,}\((?:s|es)\)/;
const UNIT_NAMES = new Set(["seconds", "timeout", "value"]);
const REPEATED = /\{([A-Za-z][A-Za-z0-9_]*)\}\s+((?:[A-Za-z]+\s+){0,2}[A-Za-z]+)/g;
const COUNT_NOUN = /\{(count|total)\}\s+(?:[A-Za-z]+\s+){0,2}[a-z]{4,}s\b/;
const BOLT_S = /\{([A-Za-z0-9_]+)\}s\b/g;
const PACKET_ABBREV = /\{([A-Za-z]*[Pp]ackets)\}\s+pkts\b/;

function stripPluralBlocks(value: string): string {
  let result = "";
  let index = 0;
  while (index < value.length) {
    const marker = value.indexOf(", plural", index);
    if (marker === -1) {
      result += value.slice(index);
      break;
    }
    const open = value.lastIndexOf("{", marker);
    result += value.slice(index, open);
    let depth = 0;
    let cursor = open;
    for (; cursor < value.length; cursor++) {
      if (value[cursor] === "{") depth++;
      else if (value[cursor] === "}") {
        depth--;
        if (depth === 0) {
          cursor++;
          break;
        }
      }
    }
    index = cursor;
  }
  return result;
}

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
  for (const match of value.matchAll(BOLT_S)) {
    if (!UNIT_NAMES.has(match[1])) problems.push(`bolt:${match[1]}`);
  }
  const abbreviated = value.match(PACKET_ABBREV);
  if (abbreviated) problems.push(`repeated:${abbreviated[1]}`);
  const outside = stripPluralBlocks(value);
  for (const match of outside.matchAll(REPEATED)) {
    const name = match[1].toLowerCase();
    const words = match[2].trim().split(/\s+/);
    for (const rawWord of words) {
      if (!/[A-Za-z]{3,}s$/i.test(rawWord) && !/^[A-Za-z]{2,}s$/i.test(rawWord)) continue;
      const word = rawWord.toLowerCase();
      const stem = word.endsWith("s") ? word.slice(0, -1) : word;
      const related =
        word === name ||
        word === `${name}s` ||
        name === `${word}s` ||
        word === "pkts" ||
        (stem.length >= 3 && name.startsWith(stem.slice(0, 3)) && word.length < name.length);
      if (related) problems.push(`repeated:${match[1]}`);
    }
  }
  if (COUNT_NOUN.test(outside)) problems.push("count-noun");
  return problems;
}

export function proseParenPlurals(source: string): string[] {
  const pattern = /(?<![A-Za-z])((?:[A-Z]{2,}|[A-Z]?[a-z]{2,})\((?:s|es)\))(?!\.[A-Za-z])/g;
  const hits: string[] = [];
  const lines = source.split("\n");
  for (const line of lines) {
    if (/^\s*(\/\/|\*|{\/\*)/.test(line)) continue;
    const quoted = [...line.matchAll(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g)].map((match) => match[0]);
    const templates = [...line.matchAll(/`(?:[^`\\]|\\.)*`/g)].map((match) => match[0]);
    for (const chunk of [...quoted, ...templates]) {
      for (const match of chunk.matchAll(pattern)) hits.push(match[0]);
    }
  }
  const textLines = lines.map((line) => (/^\s*(\/\/|\*|{\/\*)/.test(line) ? "" : line));
  for (let index = 1; index < textLines.length; index++) {
    const previous = textLines[index - 1];
    if (!/(?<!=)>\s*$/.test(previous)) continue;
    const block: string[] = [];
    for (let cursor = index; cursor < textLines.length; cursor++) {
      const line = textLines[cursor];
      if (/^\s*</.test(line)) break;
      if (/^\s*$/.test(line)) continue;
      block.push(line);
    }
    for (const match of block.join(" ").matchAll(pattern)) hits.push(match[0]);
  }
  for (const line of textLines) {
    if (!/[<>]/.test(line) || /=>/.test(line)) continue;
    const text = line.replace(/<[^>\n]*>/g, " ");
    for (const match of text.matchAll(pattern)) hits.push(match[0]);
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
    assert.ok(pluralProblems("{packets} pkts").some((item) => item.startsWith("repeated")));
    assert.ok(
      pluralProblems(
        "{bytes} · {packets} packets · {drops, plural, one {# drop} other {# drops}}",
      ).some((item) => item.startsWith("repeated")),
    );
    assert.ok(pluralProblems("{count, plural, one {Showing # {label}} other {Showing # {label}s}}").includes("bolt:label"));
    assert.ok(
      pluralProblems("{count, plural, =1 {{n} flowtable} other {{n} flowtables}}").includes("exact-one"),
    );
    assert.ok(pluralProblems("{count, plural, one {{n} member} other {{n} members}}").includes("n-slot"));
    assert.equal(pluralProblems("Timeout (s)").length, 0);
    assert.ok(pluralProblems("{routes} active routes").some((item) => item.startsWith("repeated")));
    assert.ok(pluralProblems("{routes} routes via peers").some((item) => item.startsWith("repeated")));
    assert.ok(pluralProblems("{hours}s").includes("bolt:hours"));
    assert.equal(pluralProblems("{seconds}s").length, 0);
    assert.equal(canonicalize("Add interface"), canonicalize("Add Interface"));
    assert.deepEqual(proseParenPlurals("<span>Route(s)</span>"), ["Route(s)"]);
    assert.deepEqual(proseParenPlurals("<span>\nRoute(s)\n</span>"), ["Route(s)"]);
    assert.deepEqual(proseParenPlurals("<p>\nDelete the selected\nroute(s) now\n</p>"), ["route(s)"]);
    assert.deepEqual(proseParenPlurals("`${n} rule(s)`"), ["rule(s)"]);
    assert.deepEqual(proseParenPlurals('"Delete route(s)."'), ["route(s)"]);
    assert.deepEqual(proseParenPlurals("<span>VLAN(s)</span>"), ["VLAN(s)"]);
    assert.deepEqual(proseParenPlurals("<span>IP(s)</span>"), ["IP(s)"]);
    assert.deepEqual(proseParenPlurals("<p>\n<strong>{n}</strong> route(s)\n</p>"), ["route(s)"]);
    assert.deepEqual(
      proseParenPlurals("items.filter((s) =>\n  selected.includes(s))"),
      [],
    );
    assert.deepEqual(proseParenPlurals("`${m}:${String(s).padStart(2, \"0\")}`"), []);
    assert.deepEqual(proseParenPlurals("// remove the old row(s)"), []);
  });
});
