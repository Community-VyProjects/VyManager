"use client";

import { useTranslations } from "next-intl";
import type { IsisLabel, IsisProblem } from "@/lib/api/isis-save-ops";

/** Message key of the label each save check names. */
const LABEL_KEYS = {
  metric: "fields.metric",
  helloInterval: "interfaceModal.helloInterval",
  helloMultiplier: "interfaceModal.helloMultiplier",
  priority: "interfaceModal.priorityDr",
  psnpInterval: "interfaceModal.psnpInterval",
  ldpSyncHolddown: "fields.ldpSyncHolddown",
  lspMtu: "advanced.lspMtu",
  lspGenInterval: "advanced.lspGenInterval",
  lspRefreshInterval: "advanced.lspRefreshInterval",
  maxLspLifetime: "advanced.maxLspLifetime",
  spfInterval: "advanced.spfInterval",
  initDelay: "advanced.initDelay",
  shortDelay: "advanced.shortDelay",
  longDelay: "advanced.longDelay",
  holddown: "advanced.holddown",
  timeToLearn: "advanced.timeToLearn",
  globalBlock: "segmentRouting.globalBlock",
  localBlock: "segmentRouting.localBlock",
  maximumLabelDepth: "segmentRouting.maximumLabelDepth",
  prefixIndex: "segmentRouting.indexValue",
  prefixAbsolute: "segmentRouting.absoluteValue",
  nodeMsd: "segmentRouting.nodeMsd",
  remoteLfaMaxMetric: "interfaceModal.maxMetric",
  tiebreakerIndex: "advanced.index",
  areaPassword: "password.area",
  domainPassword: "password.domain",
  interfacePassword: "password.value",
} as const satisfies Record<IsisLabel, string>;

/** Turns a save-check result into its translated message. */
export function useIsisProblemText(): (problem: IsisProblem) => string {
  const t = useTranslations("isis");
  return (problem) =>
    t(`errors.${problem.key}`, {
      label: problem.label ? t(LABEL_KEYS[problem.label]) : "",
      name: problem.name ?? "",
      level: problem.level ?? "",
      min: problem.min ?? 0,
      max: problem.max ?? 0,
    });
}
