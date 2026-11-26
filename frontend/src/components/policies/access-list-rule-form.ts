/**
 * Form-only helpers of the access-list modals. Every emit and save check
 * lives in `@/lib/api/access-list-save-ops`.
 */

import type { AccessListCapabilitiesResponse, AccessListRule } from "@/lib/api/access-list";
import { accessListRange } from "@/lib/api/access-list-save-ops";
import { nextRuleNumber } from "./route-rule-form";

type Caps = AccessListCapabilitiesResponse | null;

/** A free rule number inside the served rule range. */
export function suggestedRuleNumber(rules: AccessListRule[], caps: Caps): string {
  return nextRuleNumber(
    rules.map((r) => r.rule_number),
    accessListRange(caps, "rule"),
  );
}

/** One displayed source or destination leaf; `key` is the `accessList.row` message. */
export type EndpointPart =
  | { key: "any" }
  | { key: "host"; address: string }
  | { key: "network"; address: string }
  | { key: "networkMask"; address: string; mask: string }
  | { key: "exactMatch" };

/**
 * Every source or destination leaf the device holds, in the order FRR reads
 * them (a rule may hold `any` beside a host or network).
 */
export function endpointParts(rule: AccessListRule, endpoint: "source" | "destination"): EndpointPart[] {
  const any = endpoint === "source" ? rule.source_any : rule.destination_any;
  const host = endpoint === "source" ? rule.source_host : rule.destination_host;
  const network = endpoint === "source" ? rule.source_network : rule.destination_network;
  const mask = endpoint === "source" ? rule.source_inverse_mask : rule.destination_inverse_mask;
  const parts: EndpointPart[] = [];
  if (any) parts.push({ key: "any" });
  if (host) parts.push({ key: "host", address: host });
  if (network) parts.push(mask ? { key: "networkMask", address: network, mask } : { key: "network", address: network });
  if (endpoint === "source" && rule.source_exact_match) parts.push({ key: "exactMatch" });
  return parts;
}
