export const locales = ["en", "zh-CN"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Cookie holding a language picked manually in the language switcher. When
// present it takes precedence over the browser's Accept-Language header.
export const LOCALE_COOKIE = "NEXT_LOCALE";

// Shown in the switcher in the language itself, so it stays recognizable
// whatever language the UI is currently in.
export const localeNames: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
};

// Languages that must not collapse into each other. A tag matches a locale
// only when the script (or a region that implies that script) agrees.
// Add a row when a second locale shares a language, for example:
// { locale: "zh-TW", language: "zh", script: "hant", regions: ["tw", "hk", "mo"] }
export const localeFamilies: ReadonlyArray<{
  locale: string;
  language: string;
  script: string;
  regions: readonly string[];
}> = [
  { locale: "zh-CN", language: "zh", script: "hans", regions: ["cn", "sg", "my"] },
];

const SCRIPT_SUBTAGS = new Set(["hans", "hant", "latn", "cyrl"]);

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

type Range = { tag: string; q: number; index: number };

function parseAcceptLanguage(header: string): Range[] {
  return header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isNaN(q) ? 0 : q, index };
    })
    .filter((range) => range.tag && range.tag !== "*" && range.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
}

function matchTag(
  tag: string,
  supported: readonly string[],
  families: typeof localeFamilies,
): string | undefined {
  const exact = supported.find((locale) => locale.toLowerCase() === tag);
  if (exact) return exact;

  const parts = tag.split("-").filter(Boolean);
  const language = parts[0];
  if (!language) return undefined;
  const subtags = parts.slice(1);
  const sameLanguage = supported.filter((locale) => locale.toLowerCase().split("-")[0] === language);
  if (sameLanguage.length === 0) return undefined;

  const known = families.filter(
    (family) => family.language === language && supported.includes(family.locale),
  );
  if (known.length > 0) {
    const script = subtags.find((part) => SCRIPT_SUBTAGS.has(part));
    const region = subtags.find((part) => part.length === 2);
    if (script) return known.find((family) => family.script === script)?.locale;
    if (region) return known.find((family) => family.regions.includes(region))?.locale;
    // Bare "zh" follows the only Chinese locale. Two scripts must not guess.
    return known.length === 1 && subtags.length === 0 ? known[0].locale : undefined;
  }

  // en-GB follows en. A second locale for the same language must not guess.
  return sameLanguage.length === 1 ? sameLanguage[0] : undefined;
}

/**
 * Pick the best supported locale from an Accept-Language header.
 *
 * Exact tag, then script, then region. A bare language tag matches only when
 * that language has one supported locale. Traditional Chinese does not become
 * Simplified Chinese just because zh-CN is first in the list.
 *
 * `supported` and `families` are for tests of a future locale. Production
 * callers omit them.
 */
export function matchAcceptLanguage(header: string | null | undefined): Locale | undefined;
export function matchAcceptLanguage(
  header: string | null | undefined,
  supported: readonly string[],
  families?: typeof localeFamilies,
): string | undefined;
export function matchAcceptLanguage(
  header: string | null | undefined,
  supported: readonly string[] = locales,
  families: typeof localeFamilies = localeFamilies,
): string | undefined {
  if (!header) return undefined;
  for (const { tag } of parseAcceptLanguage(header)) {
    const match = matchTag(tag, supported, families);
    if (match) return match;
  }
  return undefined;
}
