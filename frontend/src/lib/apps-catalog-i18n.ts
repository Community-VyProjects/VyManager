import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { AppDef, AppField, AppInstallConfig } from "./apps-catalog";

// Localized display text for the app catalog (messages/<locale>/appsCatalog.json).
//
// APP_CATALOG stays the source of truth for ids, images, env vars, defaults and
// option values; only human-readable text is looked up here, by stable ids:
//
//   categories.<categoryKey>                       e.g. categories.networkMonitoring
//   apps.<appId>.name | tagline | description
//   apps.<appId>.fields.<fieldName>.label | description | placeholder
//   apps.<appId>.fields.<fieldName>.options.<optionValue>
//   apps.<appId>.files.<labelKey>                  editableFiles labels
//
// A missing key falls back to the English text in the catalog, so new apps work
// without translations and product names that read the same need no key.

/** "Network Monitoring" → "networkMonitoring", "IPS Rules" → "ipsRules". */
export function catalogKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""));
}

export type LocalizedAppField = AppField & { optionLabels?: Record<string, string> };
export type LocalizedInstallConfig = Omit<AppInstallConfig, "fields"> & { fields?: LocalizedAppField[] };

export function useAppsCatalogText() {
  const t = useTranslations("appsCatalog");

  return useMemo(() => {
    // Keys are built from catalog ids at runtime, so they can't be checked
    // against the message types. t.raw skips ICU parsing: catalog text is plain
    // (it contains apostrophes and "<user>"), never a message format.
    const text = (key: string, fallback: string): string => {
      if (!t.has(key as never)) return fallback;
      const value: unknown = t.raw(key as never);
      return typeof value === "string" ? value : fallback;
    };
    const optionalText = (key: string, fallback: string | undefined) =>
      fallback === undefined ? undefined : text(key, fallback);
    const fieldKey = (app: AppDef, f: AppField) => `apps.${app.id}.fields.${f.name}`;

    const api = {
      appName: (app: AppDef) => text(`apps.${app.id}.name`, app.name),
      appTagline: (app: AppDef) => text(`apps.${app.id}.tagline`, app.tagline),
      appDescription: (app: AppDef) => text(`apps.${app.id}.description`, app.description),
      category: (category: string) => text(`categories.${catalogKey(category)}`, category),
      fieldLabel: (app: AppDef, f: AppField) => text(`${fieldKey(app, f)}.label`, f.label),
      fieldDescription: (app: AppDef, f: AppField) =>
        optionalText(`${fieldKey(app, f)}.description`, f.description),
      fieldPlaceholder: (app: AppDef, f: AppField) =>
        optionalText(`${fieldKey(app, f)}.placeholder`, f.placeholder),
      optionLabel: (app: AppDef, f: AppField, option: string) =>
        text(`${fieldKey(app, f)}.options.${option}`, option),
      editableFileLabel: (app: AppDef, label: string) =>
        text(`apps.${app.id}.files.${catalogKey(label)}`, label),
      /** Lower-cased localized name, description and category, for search. */
      searchText: (app: AppDef) =>
        [api.appName(app), api.appDescription(app), api.category(app.category)].join("\n").toLowerCase(),
    };
    return api;
  }, [t]);
}

/**
 * app.installConfig with localized field labels, descriptions, placeholders and
 * option labels (optionLabels[value]). Everything that becomes container config
 * (names, defaults, option values, env vars, ...) is returned unchanged.
 */
export function useLocalizedInstallConfig(app: AppDef): LocalizedInstallConfig {
  const text = useAppsCatalogText();

  return useMemo(() => {
    const ic = app.installConfig ?? {};
    if (!ic.fields) return ic;
    return {
      ...ic,
      fields: ic.fields.map((f) => ({
        ...f,
        label: text.fieldLabel(app, f),
        description: text.fieldDescription(app, f),
        placeholder: text.fieldPlaceholder(app, f),
        optionLabels: f.options
          ? Object.fromEntries(f.options.map((o) => [o, text.optionLabel(app, f, o)]))
          : undefined,
      })),
    };
  }, [app, text]);
}
