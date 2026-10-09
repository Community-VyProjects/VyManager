/**
 * Draft, validation, and submit for the unified DHCP server modal.
 *
 * Create sends the fields the operator filled in. Update diffs the draft
 * against the stored subnet so an unchanged save sends nothing, a cleared
 * optional leaf emits its delete, and an unchanged list is left alone.
 * The write target is the stored network and subnet, never the draft.
 */

import {
  dhcpService,
  DHCPService,
  type DHCPBatchOperation,
  type DHCPCapabilitiesResponse,
  type DHCPRange,
  type DHCPSubnet,
  type CreateSubnetConfig,
  type UpdateSubnetConfig,
} from "@/lib/api/dhcp";
import type { VyOSResponse } from "@/lib/types/api";

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const DOMAIN = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

export interface ServerDraft {
  mode: "new" | "existing";
  networkName: string;
  selectedNetwork: string;
  description: string;
  subnet: string;
  subnetId: string;
  defaultRouter: string;
  domainName: string;
  lease: string;
  nameServers: string[];
  domainSearch: string[];
  ranges: DHCPRange[];
  excludes: string[];
  bootfileName: string;
  bootfileServer: string;
  tftpServerName: string;
  timeServers: string[];
  ntpServers: string[];
  winsServers: string[];
  timeOffset: string;
  clientPrefixLength: string;
  wpadUrl: string;
  pingCheck: boolean;
  enableFailover: boolean;
  disabled: boolean;
}

export interface ServerFieldSupport {
  hasSubnetId: boolean;
  pingCheck: boolean;
  enableFailover: boolean;
  bootfileName: boolean;
  bootfileServer: boolean;
  tftpServerName: boolean;
  timeServers: boolean;
  ntpServers: boolean;
  winsServers: boolean;
  timeOffset: boolean;
  clientPrefixLength: boolean;
  wpadUrl: boolean;
  subnetDisable: boolean;
}

export interface ServerEditTarget {
  network: string;
  subnet: DHCPSubnet;
}

export function serverFieldSupport(
  capabilities: DHCPCapabilitiesResponse | null | undefined,
): ServerFieldSupport {
  const fields = capabilities?.fields;
  return {
    hasSubnetId: capabilities?.has_subnet_id ?? false,
    pingCheck: fields?.ping_check.supported ?? false,
    enableFailover: fields?.enable_failover.supported ?? false,
    bootfileName: fields?.bootfile_name.supported ?? false,
    bootfileServer: fields?.bootfile_server.supported ?? false,
    tftpServerName: fields?.tftp_server_name.supported ?? false,
    timeServers: fields?.time_servers.supported ?? false,
    ntpServers: fields?.ntp_servers.supported ?? false,
    winsServers: fields?.wins_servers.supported ?? false,
    timeOffset: fields?.time_offset.supported ?? false,
    clientPrefixLength: fields?.client_prefix_length.supported ?? false,
    wpadUrl: fields?.wpad_url.supported ?? false,
    subnetDisable: fields?.subnet_disable.supported ?? false,
  };
}

export function emptyServerDraft(): ServerDraft {
  return {
    mode: "new",
    networkName: "",
    selectedNetwork: "",
    description: "",
    subnet: "",
    subnetId: "",
    defaultRouter: "",
    domainName: "",
    lease: "86400",
    nameServers: [""],
    domainSearch: [],
    ranges: [{ range_id: "0", start: "", stop: "" }],
    excludes: [],
    bootfileName: "",
    bootfileServer: "",
    tftpServerName: "",
    timeServers: [],
    ntpServers: [],
    winsServers: [],
    timeOffset: "",
    clientPrefixLength: "",
    wpadUrl: "",
    pingCheck: false,
    enableFailover: false,
    disabled: false,
  };
}

export function serverDraftFrom(network: string, subnet: DHCPSubnet): ServerDraft {
  return {
    mode: "existing",
    networkName: network,
    selectedNetwork: network,
    description: subnet.description ?? "",
    subnet: subnet.subnet,
    subnetId: subnet.subnet_id != null ? String(subnet.subnet_id) : "",
    defaultRouter: subnet.default_router || "",
    domainName: subnet.domain_name || "",
    lease: subnet.lease || "",
    nameServers: subnet.name_servers.length > 0 ? [...subnet.name_servers] : [""],
    domainSearch: [...subnet.domain_search],
    ranges:
      subnet.ranges.length > 0
        ? subnet.ranges.map((range) => ({
            range_id: range.range_id,
            start: range.start,
            stop: range.stop,
          }))
        : [{ range_id: "0", start: "", stop: "" }],
    excludes: [...subnet.excludes],
    bootfileName: subnet.bootfile_name || "",
    bootfileServer: subnet.bootfile_server || "",
    tftpServerName: subnet.tftp_server_name || "",
    timeServers: [...subnet.time_servers],
    ntpServers: [...subnet.ntp_servers],
    winsServers: [...subnet.wins_servers],
    timeOffset: subnet.time_offset || "",
    clientPrefixLength: subnet.client_prefix_length || "",
    wpadUrl: subnet.wpad_url || "",
    pingCheck: subnet.ping_check,
    enableFailover: subnet.enable_failover,
    disabled: subnet.disable ?? false,
  };
}

function isValidIPv4(ip: string): boolean {
  const match = ip.match(IPV4);
  if (!match) return false;
  return match.slice(1).every((octet) => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

function isValidCIDR(cidr: string): boolean {
  const parts = cidr.split("/");
  if (parts.length !== 2) return false;
  const [ip, prefix] = parts;
  if (!isValidIPv4(ip)) return false;
  const prefixNum = parseInt(prefix, 10);
  return prefixNum >= 0 && prefixNum <= 32;
}

function isValidDomain(domain: string): boolean {
  return DOMAIN.test(domain) && domain.length <= 253;
}

function ipToNumber(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isIPInSubnet(ip: string, subnet: string): boolean {
  if (!isValidIPv4(ip) || !isValidCIDR(subnet)) return false;
  const [subnetIP, prefixStr] = subnet.split("/");
  const prefix = parseInt(prefixStr, 10);
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (ipToNumber(ip) & mask) === (ipToNumber(subnetIP) & mask);
}

function isValidIPRange(start: string, stop: string, subnet: string): boolean {
  if (!isValidIPv4(start) || !isValidIPv4(stop)) return false;
  if (!isIPInSubnet(start, subnet) || !isIPInSubnet(stop, subnet)) return false;
  return ipToNumber(start) <= ipToNumber(stop);
}

function filled(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function validateServerShared(draft: ServerDraft, subnetCidr: string): string | null {
  if (!draft.defaultRouter.trim()) {
    return "Default router (gateway) is required";
  }
  if (!isValidIPv4(draft.defaultRouter.trim())) {
    return "Invalid default router IP address";
  }
  if (!isIPInSubnet(draft.defaultRouter.trim(), subnetCidr)) {
    return "Default router must be within the subnet";
  }

  const nameServers = filled(draft.nameServers);
  if (nameServers.length === 0) {
    return "At least one name server is required";
  }
  for (const ns of nameServers) {
    if (!isValidIPv4(ns)) {
      return `Invalid name server IP address: ${ns}`;
    }
  }

  if (!draft.domainName.trim()) {
    return "Domain name is required";
  }
  if (!isValidDomain(draft.domainName.trim())) {
    return "Invalid domain name format";
  }

  for (const ds of filled(draft.domainSearch)) {
    if (!isValidDomain(ds)) {
      return `Invalid domain search format: ${ds}`;
    }
  }

  if (!draft.lease.trim()) {
    return "Lease time is required";
  }
  const leaseNum = parseInt(draft.lease, 10);
  if (isNaN(leaseNum) || leaseNum <= 0) {
    return "Lease time must be a positive number";
  }

  const ranges = draft.ranges.filter((range) => (range.start ?? "").trim() && (range.stop ?? "").trim());
  if (ranges.length === 0) {
    return "At least one DHCP range with start and stop addresses is required";
  }
  for (const range of ranges) {
    const start = (range.start ?? "").trim();
    const stop = (range.stop ?? "").trim();
    if (!isValidIPRange(start, stop, subnetCidr)) {
      return `Invalid DHCP range: ${start} - ${stop}. Both IPs must be valid, within subnet, and start must be <= stop`;
    }
  }

  for (const exclude of filled(draft.excludes)) {
    if (!isValidIPv4(exclude)) {
      return `Invalid exclude IP address: ${exclude}`;
    }
    if (!isIPInSubnet(exclude, subnetCidr)) {
      return `Exclude address ${exclude} must be within the subnet`;
    }
  }

  for (const ts of filled(draft.timeServers)) {
    if (!isValidIPv4(ts)) {
      return `Invalid time server IP address: ${ts}`;
    }
  }
  for (const ntp of filled(draft.ntpServers)) {
    if (!isValidIPv4(ntp)) {
      return `Invalid NTP server IP address: ${ntp}. NTP servers must be IP addresses, not hostnames`;
    }
  }
  for (const wins of filled(draft.winsServers)) {
    if (!isValidIPv4(wins)) {
      return `Invalid WINS server IP address: ${wins}`;
    }
  }

  return null;
}

export function validateServerCreate(draft: ServerDraft): string | null {
  if (draft.mode === "new") {
    if (!draft.networkName.trim()) {
      return "Network name is required";
    }
  } else if (!draft.selectedNetwork) {
    return "Please select an existing network";
  }

  if (!draft.subnet.trim()) {
    return "Subnet is required";
  }
  if (!isValidCIDR(draft.subnet.trim())) {
    return "Invalid subnet CIDR format. Use format like 192.168.1.0/24";
  }
  return validateServerShared(draft, draft.subnet.trim());
}

function filledRanges(ranges: DHCPRange[]): DHCPRange[] {
  return ranges
    .filter((range) => (range.start ?? "").trim() && (range.stop ?? "").trim())
    .map((range) => ({
      range_id: range.range_id,
      start: (range.start ?? "").trim(),
      stop: (range.stop ?? "").trim(),
    }));
}

function sameList(draft: string[], stored: string[] | undefined): boolean {
  const next = filled(draft);
  const prev = stored ?? [];
  return next.length === prev.length && next.every((value, index) => value === prev[index]);
}

function sameRanges(draft: DHCPRange[], stored: DHCPRange[]): boolean {
  const next = filledRanges(draft);
  const prev = filledRanges(stored);
  return (
    next.length === prev.length &&
    next.every(
      (range, index) =>
        range.range_id === prev[index].range_id &&
        range.start === (prev[index].start ?? "") &&
        range.stop === (prev[index].stop ?? ""),
    )
  );
}

function changedText(
  draft: string,
  stored: string | null | undefined,
): { set?: string; delete: boolean } | null {
  const next = draft.trim();
  const prev = (stored ?? "").trim();
  if (next === prev) return null;
  if (next) return { set: next, delete: false };
  return { delete: true };
}

function assignText(
  payload: UpdateSubnetConfig,
  supported: boolean,
  draft: string,
  stored: string | null | undefined,
  setKey: "bootfile_name" | "bootfile_server" | "tftp_server_name" | "time_offset" | "client_prefix_length" | "wpad_url",
  deleteKey:
    | "delete_bootfile_name"
    | "delete_bootfile_server"
    | "delete_tftp_server_name"
    | "delete_time_offset"
    | "delete_client_prefix_length"
    | "delete_wpad_url",
) {
  if (!supported) return;
  const change = changedText(draft, stored);
  if (!change) return;
  if (change.set) payload[setKey] = change.set;
  if (change.delete) payload[deleteKey] = true;
}

function assignList(
  payload: UpdateSubnetConfig,
  supported: boolean,
  draft: string[],
  stored: string[] | undefined,
  key: "time_servers" | "ntp_servers" | "wins_servers",
) {
  if (!supported || sameList(draft, stored)) return;
  payload[key] = filled(draft);
}

export function buildServerCreate(
  draft: ServerDraft,
  support: ServerFieldSupport,
  subnetId: number | undefined,
  catalogOperations: DHCPBatchOperation[],
): CreateSubnetConfig {
  const config: CreateSubnetConfig = {
    network_name: draft.mode === "new" ? draft.networkName.trim() : draft.selectedNetwork,
    subnet: draft.subnet.trim(),
    default_router: draft.defaultRouter.trim(),
    name_servers: filled(draft.nameServers),
    domain_name: draft.domainName.trim(),
    lease: draft.lease.trim(),
    ranges: filledRanges(draft.ranges),
  };
  if (support.hasSubnetId && subnetId !== undefined) {
    config.subnet_id = subnetId;
  }
  const description = draft.description.trim();
  if (description) config.description = description;
  const excludes = filled(draft.excludes);
  if (excludes.length > 0) config.excludes = excludes;
  const domainSearch = filled(draft.domainSearch);
  if (domainSearch.length > 0) config.domain_search = domainSearch;
  if (support.pingCheck && draft.pingCheck) config.ping_check = true;
  if (support.enableFailover && draft.enableFailover) config.enable_failover = true;
  if (support.bootfileName && draft.bootfileName.trim()) config.bootfile_name = draft.bootfileName.trim();
  if (support.bootfileServer && draft.bootfileServer.trim()) config.bootfile_server = draft.bootfileServer.trim();
  if (support.tftpServerName && draft.tftpServerName.trim()) config.tftp_server_name = draft.tftpServerName.trim();
  const timeServers = support.timeServers ? filled(draft.timeServers) : [];
  if (timeServers.length > 0) config.time_servers = timeServers;
  const ntpServers = support.ntpServers ? filled(draft.ntpServers) : [];
  if (ntpServers.length > 0) config.ntp_servers = ntpServers;
  const winsServers = support.winsServers ? filled(draft.winsServers) : [];
  if (winsServers.length > 0) config.wins_servers = winsServers;
  if (support.timeOffset && draft.timeOffset.trim()) config.time_offset = draft.timeOffset.trim();
  if (support.clientPrefixLength && draft.clientPrefixLength.trim()) {
    config.client_prefix_length = draft.clientPrefixLength.trim();
  }
  if (support.wpadUrl && draft.wpadUrl.trim()) config.wpad_url = draft.wpadUrl.trim();
  if (catalogOperations.length > 0) config.catalog_operations = catalogOperations;
  return config;
}

export function buildServerUpdate(
  existing: ServerEditTarget,
  draft: ServerDraft,
  support: ServerFieldSupport,
  catalogOperations: DHCPBatchOperation[],
): UpdateSubnetConfig | null {
  const stored = existing.subnet;
  const payload: UpdateSubnetConfig = {
    network_name: existing.network,
    subnet: stored.subnet,
  };

  const router = draft.defaultRouter.trim();
  if (router && router !== (stored.default_router || "")) {
    payload.default_router = router;
  }
  const domain = draft.domainName.trim();
  if (domain && domain !== (stored.domain_name || "")) {
    payload.domain_name = domain;
  }
  const lease = draft.lease.trim();
  if (lease && lease !== (stored.lease || "")) {
    payload.lease = lease;
  }
  if (!sameList(draft.nameServers, stored.name_servers)) {
    payload.name_servers = filled(draft.nameServers);
  }
  if (!sameRanges(draft.ranges, stored.ranges)) {
    payload.ranges = filledRanges(draft.ranges);
  }
  if (!sameList(draft.excludes, stored.excludes)) {
    payload.excludes = filled(draft.excludes);
  }
  if (!sameList(draft.domainSearch, stored.domain_search)) {
    payload.domain_search = filled(draft.domainSearch);
  }

  const description = changedText(draft.description, stored.description);
  if (description?.set) payload.description = description.set;
  if (description?.delete) payload.delete_description = true;

  assignText(payload, support.bootfileName, draft.bootfileName, stored.bootfile_name, "bootfile_name", "delete_bootfile_name");
  assignText(payload, support.bootfileServer, draft.bootfileServer, stored.bootfile_server, "bootfile_server", "delete_bootfile_server");
  assignText(payload, support.tftpServerName, draft.tftpServerName, stored.tftp_server_name, "tftp_server_name", "delete_tftp_server_name");
  assignText(payload, support.timeOffset, draft.timeOffset, stored.time_offset, "time_offset", "delete_time_offset");
  assignText(
    payload,
    support.clientPrefixLength,
    draft.clientPrefixLength,
    stored.client_prefix_length,
    "client_prefix_length",
    "delete_client_prefix_length",
  );
  assignText(payload, support.wpadUrl, draft.wpadUrl, stored.wpad_url, "wpad_url", "delete_wpad_url");

  assignList(payload, support.timeServers, draft.timeServers, stored.time_servers, "time_servers");
  assignList(payload, support.ntpServers, draft.ntpServers, stored.ntp_servers, "ntp_servers");
  assignList(payload, support.winsServers, draft.winsServers, stored.wins_servers, "wins_servers");

  if (support.pingCheck && draft.pingCheck !== stored.ping_check) {
    if (draft.pingCheck) payload.ping_check = true;
    else payload.delete_ping_check = true;
  }
  if (support.enableFailover && draft.enableFailover !== stored.enable_failover) {
    if (draft.enableFailover) payload.enable_failover = true;
    else payload.delete_enable_failover = true;
  }
  if (support.subnetDisable && draft.disabled !== (stored.disable ?? false)) {
    payload.disable = draft.disabled;
  }
  if (catalogOperations.length > 0) {
    payload.catalog_operations = catalogOperations;
  }

  const changed = Object.keys(payload).some((key) => key !== "network_name" && key !== "subnet");
  return changed ? payload : null;
}

export async function submitServerCreate(
  draft: ServerDraft,
  support: ServerFieldSupport,
  subnetId: number | undefined,
  catalogOperations: DHCPBatchOperation[],
  service: DHCPService = dhcpService,
): Promise<VyOSResponse> {
  return service.createSubnet(buildServerCreate(draft, support, subnetId, catalogOperations));
}

export async function submitServerUpdate(
  existing: ServerEditTarget,
  draft: ServerDraft,
  support: ServerFieldSupport,
  catalogOperations: DHCPBatchOperation[],
  service: DHCPService = dhcpService,
): Promise<VyOSResponse | null> {
  const payload = buildServerUpdate(existing, draft, support, catalogOperations);
  if (!payload) return null;
  return service.updateSubnet(payload);
}
