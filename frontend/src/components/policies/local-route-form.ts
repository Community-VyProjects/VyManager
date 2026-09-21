/**
 * Draft, validation and submit logic for the unified local-route modal.
 *
 * Create sends the fields the operator filled in. Update diffs the draft
 * against the stored record so a cleared field emits null (delete) and an
 * untouched one is not rewritten. The write target is the stored rule
 * number, never the draft. __none__ on the interface select is empty.
 */

import {
  localRouteService,
  LocalRouteService,
  type LocalRouteRule,
} from "@/lib/api/local-route";
import type { VyOSResponse } from "@/lib/types/api";

export interface LocalRouteDraft {
  ruleNumber: number;
  source: string;
  destination: string;
  inboundInterface: string;
  fwmark: string;
  protocol: string;
  sourcePort: string;
  destinationPort: string;
  routingType: "table" | "vrf";
  table: string;
  vrf: string;
}

export const emptyLocalRouteDraft = (): LocalRouteDraft => ({
  ruleNumber: 100,
  source: "",
  destination: "",
  inboundInterface: "",
  fwmark: "",
  protocol: "",
  sourcePort: "",
  destinationPort: "",
  routingType: "table",
  table: "",
  vrf: "",
});

const ifaceValue = (value: string): string =>
  value === "__none__" ? "" : value;

export function localRouteDraftFrom(current: LocalRouteRule): LocalRouteDraft {
  const draft = emptyLocalRouteDraft();
  draft.ruleNumber = current.rule_number;
  draft.source = current.source ?? "";
  draft.destination = current.destination ?? "";
  draft.inboundInterface = current.inbound_interface ?? "";
  draft.fwmark = current.fwmark ?? "";
  draft.protocol = current.protocol ?? "";
  draft.sourcePort = current.source_port ?? "";
  draft.destinationPort = current.destination_port ?? "";
  if (current.vrf) {
    draft.routingType = "vrf";
    draft.vrf = current.vrf;
  } else {
    draft.routingType = "table";
    draft.table = current.table ?? "";
  }
  return draft;
}

export function nextRuleNumber(rules: { rule_number: number }[]): number {
  if (rules.length === 0) return 100;
  return Math.max(...rules.map((r) => r.rule_number)) + 1;
}

const validateIPv4 = (value: string): boolean => {
  if (!value) return true;
  if (value.includes("/")) {
    const parts = value.split("/");
    if (parts.length !== 2) return false;
    const prefixNum = parseInt(parts[1], 10);
    if (isNaN(prefixNum) || prefixNum < 0 || prefixNum > 32) return false;
    const ipParts = parts[0].split(".");
    if (ipParts.length !== 4) return false;
    return ipParts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }
  const ipParts = value.split(".");
  if (ipParts.length !== 4) return false;
  return ipParts.every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
};

const validateIPv6 = (value: string): boolean => {
  if (!value) return true;
  if (value.includes("/")) {
    const parts = value.split("/");
    if (parts.length !== 2) return false;
    const prefixNum = parseInt(parts[1], 10);
    if (isNaN(prefixNum) || prefixNum < 0 || prefixNum > 128) return false;
    return parts[0].includes(":");
  }
  return value.includes(":");
};

export function validateLocalRoute(
  draft: LocalRouteDraft,
  ruleType: "ipv4" | "ipv6",
): string | null {
  if (draft.routingType === "table") {
    if (!draft.table) {
      return "Table is required. Please enter 'main' or a table number (1-200).";
    }
    if (draft.table !== "main") {
      const tableNum = parseInt(draft.table, 10);
      if (isNaN(tableNum) || tableNum < 1 || tableNum > 200) {
        return "Table must be 'main' or a number between 1-200";
      }
    }
  } else if (!draft.vrf) {
    return "VRF is required. Please enter a VRF name or 'default'.";
  }

  const iface = ifaceValue(draft.inboundInterface);
  if (
    !draft.source &&
    !draft.destination &&
    !iface &&
    !draft.fwmark &&
    !draft.protocol &&
    !draft.sourcePort &&
    !draft.destinationPort
  ) {
    return "At least one matching criterion is required (source, destination, interface, protocol, port, or fwmark)";
  }

  if (draft.source) {
    const isValid = ruleType === "ipv4" ? validateIPv4(draft.source) : validateIPv6(draft.source);
    if (!isValid) return `Invalid ${ruleType.toUpperCase()} source address format`;
  }
  if (draft.destination) {
    const isValid = ruleType === "ipv4" ? validateIPv4(draft.destination) : validateIPv6(draft.destination);
    if (!isValid) return `Invalid ${ruleType.toUpperCase()} destination address format`;
  }
  if (draft.fwmark) {
    const mark = parseInt(draft.fwmark, 10);
    if (isNaN(mark) || mark < 1 || mark > 2147483647) {
      return "Fwmark must be a number between 1 and 2147483647";
    }
  }
  if (draft.sourcePort) {
    const port = parseInt(draft.sourcePort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return "Source port must be a number between 1 and 65535";
    }
  }
  if (draft.destinationPort) {
    const port = parseInt(draft.destinationPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return "Destination port must be a number between 1 and 65535";
    }
  }
  return null;
}

const optional = (value: string): string | undefined => value.trim() || undefined;
const nullable = (value: string): string | null => value.trim() || null;

export function buildLocalRouteCreate(draft: LocalRouteDraft): Partial<LocalRouteRule> {
  const iface = ifaceValue(draft.inboundInterface);
  return {
    source: optional(draft.source),
    destination: optional(draft.destination),
    inbound_interface: optional(iface),
    fwmark: optional(draft.fwmark),
    protocol: optional(draft.protocol),
    source_port: optional(draft.sourcePort),
    destination_port: optional(draft.destinationPort),
    table: draft.routingType === "table" ? optional(draft.table) : undefined,
    vrf: draft.routingType === "vrf" ? optional(draft.vrf) : undefined,
  };
}

export function buildLocalRouteUpdate(
  draft: LocalRouteDraft,
  current: LocalRouteRule,
): Partial<LocalRouteRule> | null {
  const updated: Partial<LocalRouteRule> = {};
  const iface = ifaceValue(draft.inboundInterface);
  if (draft.source.trim() !== (current.source || "")) updated.source = nullable(draft.source);
  if (draft.destination.trim() !== (current.destination || "")) updated.destination = nullable(draft.destination);
  if (iface !== (current.inbound_interface || "")) updated.inbound_interface = nullable(iface);
  if (draft.fwmark.trim() !== (current.fwmark || "")) updated.fwmark = nullable(draft.fwmark);
  if (draft.protocol.trim() !== (current.protocol || "")) updated.protocol = nullable(draft.protocol);
  if (draft.sourcePort.trim() !== (current.source_port || "")) updated.source_port = nullable(draft.sourcePort);
  if (draft.destinationPort.trim() !== (current.destination_port || "")) {
    updated.destination_port = nullable(draft.destinationPort);
  }
  const nextTable = draft.routingType === "table" ? draft.table.trim() : "";
  const nextVrf = draft.routingType === "vrf" ? draft.vrf.trim() : "";
  if (nextTable !== (current.table || "")) updated.table = nextTable || null;
  if (nextVrf !== (current.vrf || "")) updated.vrf = nextVrf || null;
  return Object.keys(updated).length > 0 ? updated : null;
}

export function submitLocalRouteCreate(
  draft: LocalRouteDraft,
  ruleType: "ipv4" | "ipv6",
  service: LocalRouteService = localRouteService,
): Promise<VyOSResponse> {
  return service.createRule(draft.ruleNumber, ruleType, buildLocalRouteCreate(draft));
}

export async function submitLocalRouteUpdate(
  current: LocalRouteRule,
  draft: LocalRouteDraft,
  ruleType: "ipv4" | "ipv6",
  service: LocalRouteService = localRouteService,
): Promise<VyOSResponse | null> {
  const config = buildLocalRouteUpdate(draft, current);
  if (!config) return null;
  return service.updateRule(current.rule_number, ruleType, config);
}
