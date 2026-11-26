"use client";

import { useTranslations } from "next-intl";
import type { TeProblem } from "@/lib/api/traffic-engineering-save-ops";

/** Translated text for a Traffic Engineering save-check problem (group and interface dialogs). */
export function useTeProblemText(): (problem: TeProblem) => string {
  const t = useTranslations("trafficEngineering");
  return (problem) => {
    switch (problem.key) {
      case "range":
        return t(`validation.range.${problem.field}`, { min: String(problem.min), max: String(problem.max) });
      case "numberInvalid":
        return t(`validation.numberInvalid.${problem.field}`);
      case "groupExists":
      case "bitTaken":
      case "interfaceExists":
        return t(`validation.${problem.key}`, { name: problem.name });
      default:
        return t(`validation.${problem.key}`);
    }
  };
}
