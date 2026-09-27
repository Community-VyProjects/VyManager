import { createTranslator, type Locale, type MessageKeys, type NestedKeyOf } from "next-intl";
import enSearchIndex from "../../../messages/en/searchIndex.json";
import { navTitleKey } from "@/i18n/nav-title";

type SearchIndexMessages = typeof enSearchIndex;
export type SearchIndexKey = MessageKeys<SearchIndexMessages, NestedKeyOf<SearchIndexMessages>>;
export type SearchTextValues = Record<string, string>;

/**
 * Translations used while building the search index. Builders stay pure: they
 * take this object instead of calling hooks, so SearchContext can build the
 * index once per locale and tests can build it for any locale.
 *
 * Result ids never depend on the locale (favorites are stored by id).
 */
export interface SearchI18n {
  locale: string;
  /** Sentence template from the `searchIndex` namespace. Pass numbers as strings. */
  t: (key: SearchIndexKey, values?: SearchTextValues) => string;
  /**
   * Fixed UI label ("Connection Timeouts", "Local AS") from `searchIndex.labels`,
   * keyed by navTitleKey(english). Unknown labels are returned unchanged.
   */
  label: (english: string) => string;
  /** Navigation title from the `navigation` namespace; unknown titles are returned unchanged. */
  nav: (title: string) => string;
  /** Plain string at a dynamic `searchIndex` path (e.g. `sections.<page>.<id>`), or the English fallback. */
  text: (path: string, fallback: string) => string;
  /**
   * English strings for the same index, set when the UI is not English. Builders
   * are run with both and the English strings are kept as extra keywords, so
   * English queries keep working in a translated UI.
   */
  en?: SearchI18n;
}

export interface SearchMessages {
  searchIndex?: Record<string, unknown>;
  navigation?: Record<string, unknown>;
}

interface LooseTranslator {
  (key: string, values?: SearchTextValues): string;
  has: (key: string) => boolean;
}

function lookup(root: unknown, path: string): string | undefined {
  let node = root;
  for (const part of path.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

function translator(locale: Locale, searchIndex: Record<string, unknown>): LooseTranslator {
  return createTranslator({ locale, messages: { searchIndex } }) as unknown as LooseTranslator;
}

const englishTranslator = translator("en", enSearchIndex);

/** English: templates come from messages/en, labels are the source strings themselves. */
export const englishSearchI18n: SearchI18n = {
  locale: "en",
  t: (key, values) => englishTranslator(`searchIndex.${key}`, values),
  label: (english) => english,
  nav: (title) => title,
  text: (_path, fallback) => fallback,
};

/** Build the index translations for a locale from its (English-merged) messages. */
export function createSearchI18n(locale: Locale, messages: SearchMessages): SearchI18n {
  if (locale === "en") return englishSearchI18n;

  const searchIndex = messages.searchIndex ?? {};
  const navigation = messages.navigation ?? {};
  const tr = translator(locale, searchIndex);

  return {
    locale,
    t: (key, values) =>
      tr.has(`searchIndex.${key}`) ? tr(`searchIndex.${key}`, values) : englishSearchI18n.t(key, values),
    label: (english) => lookup(searchIndex, `labels.${navTitleKey(english)}`) ?? english,
    nav: (title) => lookup(navigation, navTitleKey(title)) ?? title,
    text: (path, fallback) => lookup(searchIndex, path) ?? fallback,
    en: englishSearchI18n,
  };
}
