import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { parse, isArgumentElement, isNumberElement, isPluralElement, isPoundElement, isSelectElement, isTagElement } from "@formatjs/icu-messageformat-parser";
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
  const outside = stripPluralBlocks(value);
  for (const match of outside.matchAll(REPEATED)) {
    const name = match[1].toLowerCase();
    const words = match[2].trim().split(/\s+/);
    for (const rawWord of words) {
      if (!/^[A-Za-z]{3,}s$/i.test(rawWord) && rawWord.toLowerCase() !== "pkts") continue;
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

// Chinese (and any locale whose plural rules never select `one`) always shows
// `other`, even when the count is 1. A different `one` branch is dead text.
export function pluralBranches(value: string): Array<Record<string, string>> {
  const found: Array<Record<string, string>> = [];
  let index = 0;
  while (index < value.length) {
    const marker = value.slice(index).search(/,\s*plural/);
    if (marker === -1) break;
    const at = index + marker;
    const open = value.lastIndexOf("{", at);
    let depth = 0;
    let end = open;
    for (let cursor = open; cursor < value.length; cursor++) {
      if (value[cursor] === "{") depth++;
      else if (value[cursor] === "}") {
        depth--;
        if (depth === 0) {
          end = cursor;
          break;
        }
      }
    }
    const body = value.slice(open + 1, end).split("plural,")[1] ?? "";
    const selectors: Record<string, string> = {};
    const selector = /\s*(=\d+|one|other|zero|two|few|many)\s*\{/g;
    for (const match of body.matchAll(selector)) {
      const name = match[1];
      let depth = 1;
      let cursor = match.index + match[0].length;
      const start = cursor;
      for (; cursor < body.length && depth > 0; cursor++) {
        if (body[cursor] === "{") depth++;
        else if (body[cursor] === "}") depth--;
      }
      selectors[name] = body.slice(start, cursor - 1);
    }
    if (Object.keys(selectors).length > 0) found.push(selectors);
    index = end + 1;
  }
  return found;
}

// Values the user actually sees. A plural selector with no # is only choosing
// words, so a number-neutral translation may omit it. A name or a printed
// count may not disappear.
export function shownValues(value: string): { names: string[]; counts: string[] } {
  const names = new Set<string>();
  const counts = new Set<string>();
  const walk = (nodes: ReturnType<typeof parse>, pluralName?: string) => {
    for (const node of nodes) {
      if (isPoundElement(node) && pluralName) counts.add(pluralName);
      else if (isArgumentElement(node) || isNumberElement(node)) names.add(node.value);
      else if (isTagElement(node)) walk(node.children, pluralName);
      else if (isPluralElement(node)) {
        for (const option of Object.values(node.options)) walk(option.value, node.value);
      } else if (isSelectElement(node)) {
        for (const option of Object.values(node.options)) walk(option.value, pluralName);
      }
    }
  };
  walk(parse(value));
  return { names: [...names].sort(), counts: [...counts].sort() };
}

export function missingShown(source: string, translated: string): string[] {
  const from = shownValues(source);
  const to = shownValues(translated);
  const missing = from.names.filter((name) => !to.names.includes(name));
  for (const count of from.counts) {
    if (!to.counts.includes(count) && !to.names.includes(count)) missing.push(`#${count}`);
  }
  return missing;
}

// appsCatalog is plain text read with t.raw. "<user>" is not an ICU tag there.
const RAW_MESSAGE_FILES = new Set(["appsCatalog.json"]);

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
  const pieces: string[] = [];
  let elementDepth = 0;
  let expressionDepth = 0;
  const expressionStack: number[] = [];
  const elementStack: number[] = [];
  for (const line of textLines) {
    let index = 0;
    let text = "";
    while (index < line.length) {
      const rest = line.slice(index);
      if (expressionDepth > 0) {
        if (rest.startsWith("{")) expressionDepth++;
        else if (rest.startsWith("}")) {
          expressionDepth = Math.max(0, expressionDepth - 1);
          if (expressionDepth === 0 && elementStack.length > 0) elementDepth = elementStack.pop() ?? 0;
        }
        else if (rest.startsWith("<") && /[A-Za-z/]/.test(rest[1] ?? "") && /\s|[=({\[]/.test(line[index - 1] ?? " ")) {
          expressionStack.push(expressionDepth);
          expressionDepth = 0;
          elementDepth = 1;
          const name = /^[A-Za-z][A-Za-z0-9.-]*/.exec(rest.slice(1));
          index += 1 + (name ? name[0].length : 0);
          continue;
        }
        index++;
        continue;
      }
      if (elementDepth === 0 && /(?:^|[\s=({\[])<[A-Za-z]/.test(index === 0 ? ` ${rest}` : rest)) {
        const start = rest.search(/<[A-Za-z]/);
        if (start >= 0 && (index + start === 0 || /\s|[=({\[]/.test(line[index + start - 1]))) {
          const name = /^[A-Za-z][A-Za-z0-9.-]*/.exec(rest.slice(start + 1));
          index += start + 1 + (name ? name[0].length : 0);
          elementDepth = 1;
          continue;
        }
      }
      if (elementDepth > 0 && rest.startsWith("/>")) {
        elementDepth = Math.max(0, elementDepth - 1);
        index += 2;
        text += " ";
        if (elementDepth === 0 && expressionStack.length > 0) expressionDepth = expressionStack.pop() ?? 0;
        continue;
      }
      if (elementDepth > 0 && rest.startsWith("</")) {
        elementDepth = Math.max(0, elementDepth - 1);
        const close = /^<\/[A-Za-z][A-Za-z0-9.-]*>/.exec(rest);
        index += close ? close[0].length : 2;
        text += " ";
        if (elementDepth === 0 && expressionStack.length > 0) expressionDepth = expressionStack.pop() ?? 0;
        continue;
      }
      if (elementDepth > 0 && /^<[A-Za-z]/.test(rest)) {
        elementDepth++;
        index++;
        continue;
      }
      if (elementDepth > 0 && rest.startsWith(">")) {
        const before = line[index - 1] ?? "";
        if (before === "=") {
          elementDepth = 0;
          index++;
          continue;
        }
        index++;
        text += " ";
        continue;
      }
      if (elementDepth > 0 && rest.startsWith("{")) {
        expressionDepth = 1;
        elementStack.push(elementDepth);
        index++;
        text += " ";
        continue;
      }
      if (elementDepth > 0) text += line[index];
      index++;
    }
    if (text.trim()) pieces.push(text);
  }
  for (const piece of pieces) {
    for (const match of piece.matchAll(pattern)) hits.push(match[0]);
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
    assert.ok(pluralProblems("{vrfs} VRFs").some((item) => item.startsWith("repeated")));
    assert.equal(pluralProblems("{ips} ips").length, 0);
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
    assert.deepEqual(proseParenPlurals("<p>\n<strong>{n}</strong>\nroute(s)\n</p>"), ["route(s)"]);
    assert.deepEqual(
      proseParenPlurals("  <Button\n    variant=\"ghost\"\n  >\n    Delete route(s)\n  </Button>"),
      ["route(s)"],
    );
    assert.deepEqual(proseParenPlurals("{items.map((r) => <span>route(s)</span>)}"), ["route(s)"]);
    assert.deepEqual(proseParenPlurals("<Row onChange={(s) => pick(s)} />"), []);
    assert.deepEqual(proseParenPlurals("if (count > 0 && sources.includes(s)) {"), []);
    assert.deepEqual(proseParenPlurals("items.length >\n  selected.includes(s)"), []);
    assert.deepEqual(
      proseParenPlurals("async getConfig(): Promise<ContainerConfig> {\n  return sources.includes(s);\n}"),
      [],
    );
    assert.deepEqual(proseParenPlurals("<p>\n<br />\nroute(s)\n</p>"), ["route(s)"]);
    assert.deepEqual(proseParenPlurals("<ul>{items.map((r) => <li>route(s)</li>)}</ul>"), ["route(s)"]);
    assert.deepEqual(proseParenPlurals("<div>{ready && (\n<p>Delete route(s)</p>\n)}</div>"), ["route(s)"]);
    assert.deepEqual(proseParenPlurals("const f = <T>(x: T) => x;\nreturn sources.includes(s);"), []);
    assert.deepEqual(proseParenPlurals("<span>{x < y ? fmt(s) : b}</span>"), []);
    assert.deepEqual(proseParenPlurals("<span>{ok ? <Icon /> : format(s)}</span>"), []);
    assert.deepEqual(proseParenPlurals("<span>{format(s)}</span>"), []);
    assert.deepEqual(proseParenPlurals("<Button>{saving ? <Loader2 /> : <Save />} Delete route(s)</Button>"), ["route(s)"]);
    assert.deepEqual(proseParenPlurals("<p>{a && <b>{x}</b>} route(s)</p>"), ["route(s)"]);
    assert.deepEqual(proseParenPlurals("<p>{ok ? <Icon /> : b} route(s)</p>"), ["route(s)"]);
    assert.deepEqual(proseParenPlurals("<Row onChange={handle(s)} />\nif (sources.includes(s)) {"), []);
    assert.deepEqual(proseParenPlurals("<Row onChange={(s) => pick(s)} />\nif (sources.includes(s)) {"), []);
    assert.deepEqual(proseParenPlurals("`${m}:${String(s).padStart(2, \"0\")}`"), []);
    assert.deepEqual(proseParenPlurals("// remove the old row(s)"), []);
  });

  it("does not use a singular branch a language never selects", () => {
    const mismatches: string[] = [];
    for (const [locale, catalog] of catalogs) {
      const language = locale.split("-")[0];
      if (new Intl.PluralRules(language).select(1) === "one") continue;
      for (const [file, keys] of catalog) {
        for (const [path, value] of Object.entries(keys)) {
          for (const selectors of pluralBranches(value)) {
            if (selectors.one !== undefined && selectors.one !== selectors.other) {
              mismatches.push(`${locale}/${file}:${path}`);
            }
          }
        }
      }
    }
    assert.deepEqual(mismatches, []);
    const description = catalogs.get("zh-CN")?.get("twoFactor.json")?.["activeSession.description"];
    assert.equal(description, "你已在其他设备上登录。要退出其他会话并在此继续吗？");
    assert.deepEqual(
      pluralBranches("{count,plural,one {另一台设备} other {其他设备}}").map((item) => item.one),
      ["另一台设备"],
    );
    assert.deepEqual(shownValues("Delete {name}").names, ["name"]);
    assert.deepEqual(missingShown("{count, plural, other {# items}}", "items"), ["#count"]);
    assert.deepEqual(missingShown("{count, plural, other {# items}}", "{count} 条"), []);
    assert.deepEqual(missingShown("Delete {name}", "Delete"), ["name"]);
    assert.deepEqual(missingShown("{count, number} pkts", "pkts"), ["count"]);
    assert.deepEqual(missingShown("{count, number} pkts", "{count} pkts"), []);
    assert.throws(() => parse("create --user <user>"));
  });

  it("parses every rendered message and keeps the values English shows", () => {
    const parseErrors: string[] = [];
    const dropped: string[] = [];
    const english = catalogs.get("en");
    assert.ok(english);
    for (const [locale, catalog] of catalogs) {
      for (const [file, keys] of catalog) {
        for (const [path, value] of Object.entries(keys)) {
          if (RAW_MESSAGE_FILES.has(file)) continue;
          try {
            parse(value);
          } catch (err) {
            parseErrors.push(`${locale}/${file}:${path} ${err instanceof Error ? err.message : err}`);
            continue;
          }
          if (locale === "en") continue;
          const source = english.get(file)?.[path];
          if (source === undefined) continue;
          const missing = missingShown(source, value);
          if (missing.length > 0) dropped.push(`${locale}/${file}:${path} ${missing.join(",")}`);
        }
      }
    }
    assert.deepEqual(parseErrors, []);
    assert.deepEqual(dropped, []);
  });
});
