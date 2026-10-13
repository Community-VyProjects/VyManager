"use client";

import { useTranslations } from "next-intl";
import { EntityGroupSpec, FieldSpec, SectionSpec, SelectOption } from "./types";
import { fieldSegment, groupScope, optionSegment, sectionSegment } from "./messageKeys";

type GroupText = "label" | "plural" | "add" | "newItem" | "empty" | "idPlaceholder";

/**
 * Translates schema labels at render time (see messageKeys.ts for the key
 * layout). Every lookup falls back to the English text from the schema.
 */
export function useSchemaText() {
  const t = useTranslations("vrfProtocols");
  type Key = Parameters<typeof t>[0];
  const lookup = (keys: string[], fallback: string): string => {
    for (const k of keys) {
      if (t.has(k as Key)) return t(k as Key);
    }
    return fallback;
  };

  return {
    field: (scope: string | undefined, f: FieldSpec): string => {
      const seg = fieldSegment(f);
      return lookup(
        [...(scope ? [`schema.${scope}.${seg}.label`] : []), `schema.fields.${seg}.label`],
        f.label
      );
    },
    fieldHelp: (scope: string | undefined, f: FieldSpec): string | undefined => {
      if (!f.help) return undefined;
      const seg = fieldSegment(f);
      return lookup(
        [...(scope ? [`schema.${scope}.${seg}.help`] : []), `schema.fields.${seg}.help`],
        f.help
      );
    },
    section: (s: SectionSpec): string => lookup([`schema.sections.${sectionSegment(s)}`], s.title),
    sectionDescription: (s: SectionSpec): string | undefined =>
      s.description
        ? lookup([`schema.sectionDescriptions.${sectionSegment(s)}`], s.description)
        : undefined,
    // Options whose label is the raw config value are shown as-is.
    option: (o: SelectOption): string =>
      o.label === o.value ? o.label : lookup([`schema.options.${optionSegment(o.value)}`], o.label),
    group: (g: EntityGroupSpec, part: GroupText, fallback: string): string =>
      lookup([`schema.${groupScope(g)}.group.${part}`], fallback),
  };
}
