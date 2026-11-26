"use client";

import { useTranslations } from "next-intl";
import type { RpkiProblem } from "@/lib/api/rpki-save-ops";

/** Translated text for an RPKI save-check problem (cache dialog and timers card). */
export function useRpkiProblemText(): (problem: RpkiProblem) => string {
  const t = useTranslations("rpki");
  return (problem) => {
    switch (problem.key) {
      case "range":
        return t(`validation.range.${problem.field}`, { min: String(problem.min), max: String(problem.max) });
      case "numberInvalid":
        return t(`validation.numberInvalid.${problem.field}`);
      case "addressExists":
      case "preferenceTaken":
        return t(`validation.${problem.key}`, { name: problem.name });
      default:
        return t(`validation.${problem.key}`);
    }
  };
}
