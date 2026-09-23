/**
 * Draft-to-request logic for the unified DHCP range and static mapping modals.
 *
 * Create sends the fields the operator filled in. Update diffs the draft
 * against the stored record so an unchanged record sends nothing and a
 * cleared optional leaf emits its delete. The write target is the stored
 * range id or mapping name, never a draft identity field.
 */

import {
  dhcpService,
  DHCPService,
  type DHCPRange,
  type DHCPSharedNetwork,
  type DHCPStaticMapping,
} from "@/lib/api/dhcp";
import type { VyOSResponse } from "@/lib/types/api";

const IP_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;
const MAC_PATTERN = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;
const MAPPING_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

function isValidIpv4(value: string): boolean {
  if (!IP_PATTERN.test(value)) return false;
  return value.split(".").map(Number).every((octet) => octet >= 0 && octet <= 255);
}

export interface RangeDraft {
  subnet: string;
  startIp: string;
  stopIp: string;
}

export const emptyRangeDraft = (): RangeDraft => ({
  subnet: "",
  startIp: "",
  stopIp: "",
});

export function rangeDraftFrom(subnet: string, range: DHCPRange): RangeDraft {
  return {
    subnet,
    startIp: range.start || "",
    stopIp: range.stop || "",
  };
}

export function nextRangeId(network: DHCPSharedNetwork, subnetCidr: string): string {
  const subnet = network.subnets.find((entry) => entry.subnet === subnetCidr);
  if (!subnet || subnet.ranges.length === 0) {
    return "0";
  }

  const existingIds = subnet.ranges
    .map((range) => parseInt(range.range_id, 10))
    .filter((id) => !isNaN(id));

  if (existingIds.length === 0) {
    return "0";
  }

  existingIds.sort((a, b) => a - b);
  for (let i = 0; i <= existingIds.length; i++) {
    if (!existingIds.includes(i)) {
      return i.toString();
    }
  }

  return (Math.max(...existingIds) + 1).toString();
}

export function validateRangeShared(draft: RangeDraft): string | null {
  if (!draft.startIp.trim()) {
    return "Start IP address is required";
  }
  if (!isValidIpv4(draft.startIp.trim())) {
    return IP_PATTERN.test(draft.startIp.trim())
      ? "Start IP address octets must be between 0 and 255"
      : "Invalid start IP address format";
  }

  if (!draft.stopIp.trim()) {
    return "Stop IP address is required";
  }
  if (!isValidIpv4(draft.stopIp.trim())) {
    return IP_PATTERN.test(draft.stopIp.trim())
      ? "Stop IP address octets must be between 0 and 255"
      : "Invalid stop IP address format";
  }

  return null;
}

export function validateRangeCreate(draft: RangeDraft): string | null {
  if (!draft.subnet) {
    return "Please select a subnet";
  }
  return validateRangeShared(draft);
}

export async function submitRangeCreate(
  networkName: string,
  draft: RangeDraft,
  rangeId: string,
  service: DHCPService = dhcpService,
): Promise<VyOSResponse> {
  return service.createRange(
    networkName,
    draft.subnet,
    rangeId,
    draft.startIp.trim(),
    draft.stopIp.trim(),
  );
}

export async function submitRangeUpdate(
  networkName: string,
  stored: { subnet: string; range: DHCPRange },
  draft: RangeDraft,
  service: DHCPService = dhcpService,
): Promise<VyOSResponse | null> {
  const start = draft.startIp.trim();
  const stop = draft.stopIp.trim();
  const previousStart = stored.range.start || "";
  const previousStop = stored.range.stop || "";
  if (start === previousStart && stop === previousStop) {
    return null;
  }

  await service.deleteRange(networkName, stored.subnet, stored.range.range_id);
  return service.createRange(
    networkName,
    stored.subnet,
    stored.range.range_id,
    start,
    stop,
  );
}

export interface MappingDraft {
  subnet: string;
  name: string;
  ipAddress: string;
  macAddress: string;
  duid: string;
  description: string;
  disabled: boolean;
}

export const emptyMappingDraft = (): MappingDraft => ({
  subnet: "",
  name: "",
  ipAddress: "",
  macAddress: "",
  duid: "",
  description: "",
  disabled: false,
});

export function mappingDraftFrom(
  subnet: string,
  mapping: DHCPStaticMapping,
): MappingDraft {
  return {
    subnet,
    name: mapping.name,
    ipAddress: mapping.ip_address || "",
    macAddress: mapping.mac_address || "",
    duid: mapping.duid || "",
    description: mapping.description ?? "",
    disabled: mapping.disable,
  };
}

export function validateMappingShared(draft: MappingDraft): string | null {
  if (draft.ipAddress.trim() && !isValidIpv4(draft.ipAddress.trim())) {
    return IP_PATTERN.test(draft.ipAddress.trim())
      ? "IP address octets must be between 0 and 255"
      : "Invalid IP address format";
  }

  if (draft.macAddress.trim() && !MAC_PATTERN.test(draft.macAddress.trim())) {
    return "Invalid MAC address format (expected: XX:XX:XX:XX:XX:XX)";
  }

  return null;
}

export function validateMappingCreate(
  draft: MappingDraft,
  canDuid: boolean,
): string | null {
  if (!draft.subnet) {
    return "Please select a subnet";
  }
  if (!draft.name.trim()) {
    return "Mapping name is required";
  }
  if (!MAPPING_NAME_PATTERN.test(draft.name.trim())) {
    return "Mapping name can only contain letters, numbers, hyphens, and underscores";
  }
  if (!draft.ipAddress.trim()) {
    return "IP address is required";
  }

  const shared = validateMappingShared(draft);
  if (shared) return shared;

  if (!draft.macAddress.trim() && !(canDuid && draft.duid.trim())) {
    return canDuid ? "MAC address or DUID is required" : "MAC address is required";
  }

  return null;
}

export interface MappingUpdateConfig {
  ip_address?: string;
  mac_address?: string;
  duid?: string;
  disable?: boolean;
  description?: string;
  delete_ip_address?: boolean;
  delete_mac_address?: boolean;
  delete_duid?: boolean;
  delete_description?: boolean;
}

export function buildMappingUpdateConfig(
  stored: DHCPStaticMapping,
  draft: MappingDraft,
): MappingUpdateConfig | null {
  const config: MappingUpdateConfig = {};

  const nextIp = draft.ipAddress.trim();
  const previousIp = stored.ip_address || "";
  if (nextIp !== previousIp) {
    if (nextIp) {
      config.ip_address = nextIp;
    } else if (previousIp) {
      config.delete_ip_address = true;
    }
  }

  const nextMac = draft.macAddress.trim().toLowerCase();
  const previousMac = (stored.mac_address || "").toLowerCase();
  if (nextMac !== previousMac) {
    if (nextMac) {
      config.mac_address = nextMac;
    } else if (previousMac) {
      config.delete_mac_address = true;
    }
  }

  const nextDuid = draft.duid.trim();
  const previousDuid = stored.duid || "";
  if (nextDuid !== previousDuid) {
    if (nextDuid) {
      config.duid = nextDuid;
    } else if (previousDuid) {
      config.delete_duid = true;
    }
  }

  if (draft.disabled !== stored.disable) {
    config.disable = draft.disabled;
  }

  const nextDescription = draft.description.trim();
  const previousDescription = stored.description ?? "";
  if (nextDescription !== previousDescription) {
    if (nextDescription) {
      config.description = nextDescription;
    } else if (previousDescription) {
      config.delete_description = true;
    }
  }

  return Object.keys(config).length === 0 ? null : config;
}

export async function submitMappingCreate(
  networkName: string,
  draft: MappingDraft,
  service: DHCPService = dhcpService,
): Promise<VyOSResponse> {
  return service.createStaticMapping(
    networkName,
    draft.subnet,
    draft.name.trim(),
    draft.ipAddress.trim(),
    draft.macAddress.trim(),
    draft.description.trim() || undefined,
    draft.duid.trim() || undefined,
  );
}

export async function submitMappingUpdate(
  stored: { network: string; subnet: string; mapping: DHCPStaticMapping },
  draft: MappingDraft,
  service: DHCPService = dhcpService,
): Promise<VyOSResponse | null> {
  const config = buildMappingUpdateConfig(stored.mapping, draft);
  if (!config) return null;
  return service.updateStaticMapping(
    stored.network,
    stored.subnet,
    stored.mapping.name,
    config,
  );
}
