import { Settings } from "lucide-react";
import { buildHref, createSearchResult } from "./utils";
import type { SearchResult } from "./types";

export type UiFieldControlType = "select" | "toggle" | "input";

const CONTROL_WORD: Record<UiFieldControlType, string> = {
  select: "selector",
  toggle: "toggle",
  input: "field",
};

const systemField = (
  field: Omit<UiFieldDefinition, "feature" | "pageTitle" | "href">
): UiFieldDefinition => ({
  ...field,
  feature: "System",
  pageTitle: "System Settings",
  href: "/system/settings",
  searchParams: { tab: field.sectionId },
});

export interface UiFieldDefinition {
  id: string;
  label: string;
  controlType: UiFieldControlType;
  sectionId: string;
  sectionTitle: string;
  pageTitle: string;
  feature: string;
  href: string;
  searchParams?: Record<string, string>;
  aliases?: string[];
  hint?: string;
}

function fieldDescription(field: UiFieldDefinition): string {
  const control = CONTROL_WORD[field.controlType];
  return `${field.label} ${control} from ${field.sectionTitle} within ${field.pageTitle} from ${field.feature}`;
}

function fieldToResult(field: UiFieldDefinition): SearchResult {
  const subcategory = `${field.feature} · ${field.pageTitle} · ${field.sectionTitle}`;
  return createSearchResult({
    id: field.id,
    title: field.label,
    subtitle: subcategory,
    description: field.hint ? `${fieldDescription(field)} — ${field.hint}` : fieldDescription(field),
    kind: "ui-field",
    typeLabel: field.controlType === "select" ? "Selector" : field.controlType === "toggle" ? "Toggle" : "Setting",
    feature: field.feature,
    category: field.feature,
    subcategory,
    href: buildHref(field.href, field.searchParams),
    icon: Settings,
    keywords: [
      field.label,
      field.sectionTitle,
      field.pageTitle,
      field.feature,
      field.sectionId,
      ...(field.aliases ?? []),
    ],
  });
}

const fwGlobal = (
  field: Omit<UiFieldDefinition, "feature" | "pageTitle" | "href">
): UiFieldDefinition => ({
  ...field,
  feature: "Firewall",
  pageTitle: "Global Options",
  href: "/firewall/global-options",
  searchParams: { section: field.sectionId, field: field.id.replace(/^ui-fw-global-/, "") },
});

/** Declarative index of individual form controls for deep search */
export const uiFieldDefinitions: UiFieldDefinition[] = [
  // ICMP Settings
  fwGlobal({
    id: "ui-fw-global-all-ping",
    label: "All Ping",
    controlType: "select",
    sectionId: "icmp-settings",
    sectionTitle: "ICMP Settings",
    aliases: ["icmp echo", "ping"],
    hint: "Accept or reject all IPv4 ICMP echo requests",
  }),
  fwGlobal({
    id: "ui-fw-global-broadcast-ping",
    label: "Broadcast Ping",
    controlType: "select",
    sectionId: "icmp-settings",
    sectionTitle: "ICMP Settings",
    aliases: ["broadcast ping"],
  }),
  // Source Routing
  fwGlobal({
    id: "ui-fw-global-ipv4-source-routing",
    label: "IPv4 Source Routing",
    controlType: "select",
    sectionId: "source-routing",
    sectionTitle: "Source Routing",
    aliases: ["ip source route", "source route"],
  }),
  fwGlobal({
    id: "ui-fw-global-ipv6-source-routing",
    label: "IPv6 Source Routing",
    controlType: "select",
    sectionId: "source-routing",
    sectionTitle: "Source Routing",
    aliases: ["ipv6 source route"],
  }),
  // ICMP Redirects
  fwGlobal({
    id: "ui-fw-global-receive-redirects-ipv4",
    label: "Receive Redirects (IPv4)",
    controlType: "select",
    sectionId: "icmp-redirects",
    sectionTitle: "ICMP Redirects",
    aliases: ["receive redirects", "icmp redirect receive"],
  }),
  fwGlobal({
    id: "ui-fw-global-receive-redirects-ipv6",
    label: "Receive Redirects (IPv6)",
    controlType: "select",
    sectionId: "icmp-redirects",
    sectionTitle: "ICMP Redirects",
    aliases: ["ipv6 receive redirects"],
  }),
  fwGlobal({
    id: "ui-fw-global-send-redirects",
    label: "Send Redirects",
    controlType: "select",
    sectionId: "icmp-redirects",
    sectionTitle: "ICMP Redirects",
    aliases: ["send redirect", "send redirects", "icmp redirect send"],
    hint: "Enable or disable sending ICMP redirects",
  }),
  // Security Options
  fwGlobal({
    id: "ui-fw-global-log-martians",
    label: "Log Martians",
    controlType: "select",
    sectionId: "security-options",
    sectionTitle: "Security Options",
    aliases: ["martians", "impossible addresses"],
  }),
  fwGlobal({
    id: "ui-fw-global-source-validation",
    label: "Source Validation",
    controlType: "select",
    sectionId: "security-options",
    sectionTitle: "Security Options",
    aliases: ["rp filter", "reverse path"],
  }),
  fwGlobal({
    id: "ui-fw-global-syn-cookies",
    label: "SYN Cookies",
    controlType: "select",
    sectionId: "security-options",
    sectionTitle: "Security Options",
    aliases: ["syn flood", "syncookies"],
  }),
  fwGlobal({
    id: "ui-fw-global-twa-hazards",
    label: "TWA Hazards Protection",
    controlType: "select",
    sectionId: "security-options",
    sectionTitle: "Security Options",
    aliases: ["time wait", "rfc1337"],
  }),
  // State Policies — Established
  fwGlobal({
    id: "ui-fw-global-established-action",
    label: "Established Action",
    controlType: "select",
    sectionId: "state-policies",
    sectionTitle: "State Policies",
    aliases: ["established state", "state policy established"],
  }),
  fwGlobal({
    id: "ui-fw-global-established-log-level",
    label: "Established Log Level",
    controlType: "select",
    sectionId: "state-policies",
    sectionTitle: "State Policies",
    aliases: ["established log"],
  }),
  fwGlobal({
    id: "ui-fw-global-established-log",
    label: "Established Log",
    controlType: "toggle",
    sectionId: "state-policies",
    sectionTitle: "State Policies",
  }),
  // State Policies — Invalid
  fwGlobal({
    id: "ui-fw-global-invalid-action",
    label: "Invalid Action",
    controlType: "select",
    sectionId: "state-policies",
    sectionTitle: "State Policies",
    aliases: ["invalid state"],
  }),
  fwGlobal({
    id: "ui-fw-global-invalid-log-level",
    label: "Invalid Log Level",
    controlType: "select",
    sectionId: "state-policies",
    sectionTitle: "State Policies",
  }),
  fwGlobal({
    id: "ui-fw-global-invalid-log",
    label: "Invalid Log",
    controlType: "toggle",
    sectionId: "state-policies",
    sectionTitle: "State Policies",
  }),
  // State Policies — Related
  fwGlobal({
    id: "ui-fw-global-related-action",
    label: "Related Action",
    controlType: "select",
    sectionId: "state-policies",
    sectionTitle: "State Policies",
    aliases: ["related state"],
  }),
  fwGlobal({
    id: "ui-fw-global-related-log-level",
    label: "Related Log Level",
    controlType: "select",
    sectionId: "state-policies",
    sectionTitle: "State Policies",
  }),
  fwGlobal({
    id: "ui-fw-global-related-log",
    label: "Related Log",
    controlType: "toggle",
    sectionId: "state-policies",
    sectionTitle: "State Policies",
  }),
  // Bridged Traffic
  fwGlobal({
    id: "ui-fw-global-bridged-ipv4",
    label: "Apply to IPv4 Bridged Traffic",
    controlType: "toggle",
    sectionId: "bridged-traffic",
    sectionTitle: "Bridged Traffic",
    aliases: ["bridged traffic ipv4", "bridge firewall ipv4"],
  }),
  fwGlobal({
    id: "ui-fw-global-bridged-ipv6",
    label: "Apply to IPv6 Bridged Traffic",
    controlType: "toggle",
    sectionId: "bridged-traffic",
    sectionTitle: "Bridged Traffic",
    aliases: ["bridged traffic ipv6"],
  }),
  // Connection Timeouts
  fwGlobal({
    id: "ui-fw-global-timeout-icmp",
    label: "ICMP Timeout",
    controlType: "input",
    sectionId: "connection-timeouts",
    sectionTitle: "Connection Timeouts",
    aliases: ["icmp timeout", "timeout icmp"],
  }),
  fwGlobal({
    id: "ui-fw-global-timeout-other",
    label: "Other Timeout",
    controlType: "input",
    sectionId: "connection-timeouts",
    sectionTitle: "Connection Timeouts",
  }),
  fwGlobal({
    id: "ui-fw-global-timeout-tcp-established",
    label: "TCP Established Timeout",
    controlType: "input",
    sectionId: "connection-timeouts",
    sectionTitle: "Connection Timeouts",
    aliases: ["tcp established"],
  }),
  fwGlobal({
    id: "ui-fw-global-timeout-tcp-close",
    label: "TCP Close Timeout",
    controlType: "input",
    sectionId: "connection-timeouts",
    sectionTitle: "Connection Timeouts",
  }),
  fwGlobal({
    id: "ui-fw-global-timeout-tcp-close-wait",
    label: "TCP Close Wait Timeout",
    controlType: "input",
    sectionId: "connection-timeouts",
    sectionTitle: "Connection Timeouts",
  }),
  fwGlobal({
    id: "ui-fw-global-timeout-tcp-fin-wait",
    label: "TCP FIN Wait Timeout",
    controlType: "input",
    sectionId: "connection-timeouts",
    sectionTitle: "Connection Timeouts",
  }),
  fwGlobal({
    id: "ui-fw-global-timeout-tcp-last-ack",
    label: "TCP Last ACK Timeout",
    controlType: "input",
    sectionId: "connection-timeouts",
    sectionTitle: "Connection Timeouts",
  }),
  fwGlobal({
    id: "ui-fw-global-timeout-tcp-syn-recv",
    label: "TCP SYN Recv Timeout",
    controlType: "input",
    sectionId: "connection-timeouts",
    sectionTitle: "Connection Timeouts",
  }),
  fwGlobal({
    id: "ui-fw-global-timeout-tcp-syn-sent",
    label: "TCP SYN Sent Timeout",
    controlType: "input",
    sectionId: "connection-timeouts",
    sectionTitle: "Connection Timeouts",
  }),
  fwGlobal({
    id: "ui-fw-global-timeout-tcp-time-wait",
    label: "TCP TIME Wait Timeout",
    controlType: "input",
    sectionId: "connection-timeouts",
    sectionTitle: "Connection Timeouts",
  }),
  fwGlobal({
    id: "ui-fw-global-timeout-udp-stream",
    label: "UDP Stream Timeout",
    controlType: "input",
    sectionId: "connection-timeouts",
    sectionTitle: "Connection Timeouts",
  }),
  fwGlobal({
    id: "ui-fw-global-timeout-udp-other",
    label: "UDP Other Timeout",
    controlType: "input",
    sectionId: "connection-timeouts",
    sectionTitle: "Connection Timeouts",
  }),
  // System settings — commonly searched fields
  systemField({
    id: "ui-system-watchdog-timeout",
    label: "Watchdog Timeout",
    controlType: "input",
    sectionId: "watchdog",
    sectionTitle: "Watchdog",
    aliases: ["watchdog"],
  }),
  systemField({
    id: "ui-system-frr-profile",
    label: "FRR Profile",
    controlType: "select",
    sectionId: "frr-profile",
    sectionTitle: "FRR Profile",
    aliases: ["frr", "frrprofile"],
  }),
  systemField({
    id: "ui-system-config-commit-revisions",
    label: "Commit Revisions",
    controlType: "input",
    sectionId: "config-management",
    sectionTitle: "Config Management",
    aliases: ["commit revisions", "commit_revisions"],
  }),
  systemField({
    id: "ui-system-pre-login-banner",
    label: "Pre-Login Banner",
    controlType: "input",
    sectionId: "login",
    sectionTitle: "Login Settings",
    aliases: ["pre-login banner", "pre login banner"],
  }),
  systemField({
    id: "ui-system-post-login-banner",
    label: "Post-Login Banner",
    controlType: "input",
    sectionId: "login",
    sectionTitle: "Login Settings",
    aliases: ["post-login banner", "post login banner"],
  }),
];

export function buildUiFieldsSearchIndex(): SearchResult[] {
  return uiFieldDefinitions.map(fieldToResult);
}

export const uiFieldsSearchIndex = buildUiFieldsSearchIndex();
