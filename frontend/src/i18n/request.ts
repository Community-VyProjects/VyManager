import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import english from "../../messages/en";
import { defaultLocale, isLocale, LOCALE_COOKIE, matchAcceptLanguage, type Locale } from "./config";

type Messages = Record<string, unknown>;

/**
 * Locale resolution (no URL prefixes):
 *   1. language picked manually in the switcher (cookie)
 *   2. browser preference (Accept-Language header)
 *   3. English
 * This works the same on unauthenticated pages such as /login.
 */
async function resolveLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return matchAcceptLanguage((await headers()).get("accept-language")) ?? defaultLocale;
}

// Keys missing from a translation fall back to English, so partially
// translated locales are safe to ship.
function withFallback(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = base[key];
    result[key] =
      value && typeof value === "object" && baseValue && typeof baseValue === "object"
        ? withFallback(baseValue as Messages, value as Messages)
        : value;
  }
  return result;
}

// Load messages/<locale>/<namespace>.json for every English namespace. A
// namespace that has no file for this locale yet stays English.
async function loadLocale(locale: Locale): Promise<Messages> {
  const entries = await Promise.all(
    Object.keys(english).map(async (namespace) => {
      try {
        const file = await import(`../../messages/${locale}/${namespace}.json`);
        return [namespace, file.default as Messages] as const;
      } catch {
        return null;
      }
    })
  );
  return Object.fromEntries(entries.filter((e) => e !== null));
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages =
    locale === defaultLocale ? english : withFallback(english, await loadLocale(locale));

  return { locale, messages };
});
