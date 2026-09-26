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

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/**
 * Pick the best supported locale from an Accept-Language header.
 *
 * Tries an exact tag match first (case-insensitive), then a match on the
 * primary language subtag, so "zh", "zh-Hans" or "zh-SG" all resolve to
 * "zh-CN" and "en-GB" resolves to "en".
 */
export function matchAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;

  const ranges = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isNaN(q) ? 0 : q, index };
    })
    .filter((r) => r.tag && r.tag !== "*" && r.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);

  for (const { tag } of ranges) {
    const exact = locales.find((l) => l.toLowerCase() === tag);
    if (exact) return exact;
    const language = tag.split("-")[0];
    const partial = locales.find((l) => l.toLowerCase().split("-")[0] === language);
    if (partial) return partial;
  }
  return undefined;
}
