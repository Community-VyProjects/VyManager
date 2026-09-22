/**
 * Draft, validation and submit logic for the unified site and instance modals.
 *
 * Create sends the fields the operator filled in. Update diffs the draft
 * against the stored record so an unchanged record sends nothing, a cleared
 * optional field is sent as null, and an already-empty one is omitted. The
 * write target is the stored id, never a draft identity field. Name is a
 * mutable label, not identity. A blank API key on edit is omitted so the
 * stored secret is never resent.
 */

import {
  sessionService,
  SessionService,
  type Instance,
  type InstanceCreateRequest,
  type InstanceUpdateRequest,
  type Site,
  type SiteCreateRequest,
  type SiteUpdateRequest,
} from "@/lib/api/session";

const emptyToNull = (value: string): string | null => value.trim() || null;

const storedText = (value: string | null | undefined): string => value ?? "";

const parsePort = (value: string): number | null => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) return null;
  return parsed;
};

// ============================================================================
// Site
// ============================================================================

export interface SiteDraft {
  name: string;
  description: string;
}

export const emptySiteDraft = (): SiteDraft => ({
  name: "",
  description: "",
});

export function siteDraftFrom(site: Site): SiteDraft {
  return {
    name: site.name,
    description: storedText(site.description),
  };
}

export function validateSiteDraft(draft: SiteDraft): string | null {
  if (!draft.name.trim()) return "Site name is required";
  return null;
}

export function buildSiteCreate(draft: SiteDraft): SiteCreateRequest {
  return {
    name: draft.name.trim(),
    description: emptyToNull(draft.description),
  };
}

export function buildSiteUpdate(existing: Site, draft: SiteDraft): SiteUpdateRequest | null {
  const data: SiteUpdateRequest = {};
  const name = draft.name.trim();
  if (name !== existing.name) data.name = name;

  const nextDescription = emptyToNull(draft.description);
  const previousDescription = emptyToNull(storedText(existing.description));
  if (nextDescription !== previousDescription) data.description = nextDescription;

  return Object.keys(data).length === 0 ? null : data;
}

export async function submitSiteCreate(
  draft: SiteDraft,
  service: SessionService = sessionService,
): Promise<Site> {
  return service.createSite(buildSiteCreate(draft));
}

export async function submitSiteUpdate(
  existing: Site,
  draft: SiteDraft,
  service: SessionService = sessionService,
): Promise<Site | null> {
  const data = buildSiteUpdate(existing, draft);
  if (!data) return null;
  return service.updateSite(existing.id, data);
}

// ============================================================================
// Instance
// ============================================================================

export interface InstanceDraft {
  name: string;
  description: string;
  host: string;
  port: string;
  apiKey: string;
  vyosVersion: string;
  protocol: string;
  verifySsl: boolean;
  isActive: boolean;
  sshPort: string;
  sshUsername: string;
  commitConfirmEnabled: boolean;
  commitConfirmMinutes: string;
  timeout: string;
  siteId: string;
}

export const emptyInstanceDraft = (): InstanceDraft => ({
  name: "",
  description: "",
  host: "",
  port: "443",
  apiKey: "",
  vyosVersion: "1.5",
  protocol: "https",
  verifySsl: false,
  isActive: true,
  sshPort: "22",
  sshUsername: "",
  commitConfirmEnabled: false,
  commitConfirmMinutes: "5",
  timeout: "10",
  siteId: "",
});

export function instanceDraftFrom(instance: Instance): InstanceDraft {
  return {
    name: instance.name,
    description: storedText(instance.description),
    host: instance.host,
    port: instance.port.toString(),
    apiKey: "",
    vyosVersion: instance.vyos_version || "1.5",
    protocol: instance.protocol || "https",
    verifySsl: instance.verify_ssl ?? false,
    isActive: instance.is_active,
    sshPort: (instance.ssh_port ?? 22).toString(),
    sshUsername: storedText(instance.ssh_username),
    commitConfirmEnabled: instance.commit_confirm_enabled ?? false,
    commitConfirmMinutes: (instance.commit_confirm_minutes ?? 5).toString(),
    timeout: (instance.timeout ?? 10).toString(),
    siteId: instance.site_id,
  };
}

export function validateInstanceShared(draft: InstanceDraft): string | null {
  if (!draft.name.trim()) return "Instance name is required";
  if (!draft.host.trim()) return "Host is required";
  if (parsePort(draft.port) == null) return "Port must be between 1 and 65535";
  if (parsePort(draft.sshPort) == null) return "SSH port must be between 1 and 65535";
  return null;
}

export function validateInstanceCreate(draft: InstanceDraft, siteId: string | undefined): string | null {
  const shared = validateInstanceShared(draft);
  if (shared) return shared;
  if (!siteId) return "Site is required";
  if (!draft.apiKey.trim()) return "API Key is required";
  return null;
}

export function buildInstanceCreate(draft: InstanceDraft, siteId: string): InstanceCreateRequest {
  const port = parsePort(draft.port) ?? 443;
  const sshPort = parsePort(draft.sshPort) ?? 22;
  return {
    site_id: siteId,
    name: draft.name.trim(),
    description: emptyToNull(draft.description),
    host: draft.host.trim(),
    port,
    api_key: draft.apiKey.trim(),
    vyos_version: draft.vyosVersion,
    protocol: draft.protocol,
    verify_ssl: draft.verifySsl,
    is_active: draft.isActive,
    ssh_port: sshPort,
    ssh_username: draft.sshUsername.trim() || undefined,
    commit_confirm_enabled: draft.commitConfirmEnabled,
    commit_confirm_minutes: parseInt(draft.commitConfirmMinutes, 10) || 5,
    timeout: parseInt(draft.timeout, 10) || 10,
  };
}

export function buildInstanceUpdate(
  existing: Instance,
  draft: InstanceDraft,
): InstanceUpdateRequest | null {
  const data: InstanceUpdateRequest = {};
  const name = draft.name.trim();
  if (name !== existing.name) data.name = name;

  const nextDescription = emptyToNull(draft.description);
  const previousDescription = emptyToNull(storedText(existing.description));
  if (nextDescription !== previousDescription) data.description = nextDescription;

  const host = draft.host.trim();
  if (host !== existing.host) data.host = host;

  const port = parsePort(draft.port) ?? existing.port;
  if (port !== existing.port) data.port = port;

  if (draft.protocol !== (existing.protocol || "https")) data.protocol = draft.protocol;
  if (draft.vyosVersion !== (existing.vyos_version || "1.5")) data.vyos_version = draft.vyosVersion;
  if (draft.isActive !== existing.is_active) data.is_active = draft.isActive;
  if (draft.verifySsl !== (existing.verify_ssl ?? false)) data.verify_ssl = draft.verifySsl;

  const sshPort = parsePort(draft.sshPort) ?? existing.ssh_port;
  if (sshPort !== (existing.ssh_port ?? 22)) data.ssh_port = sshPort;

  const nextUsername = emptyToNull(draft.sshUsername);
  const previousUsername = emptyToNull(storedText(existing.ssh_username));
  if (nextUsername !== previousUsername) data.ssh_username = nextUsername;

  if (draft.commitConfirmEnabled !== (existing.commit_confirm_enabled ?? false)) {
    data.commit_confirm_enabled = draft.commitConfirmEnabled;
  }
  const minutes = parseInt(draft.commitConfirmMinutes, 10) || 5;
  if (minutes !== (existing.commit_confirm_minutes ?? 5)) {
    data.commit_confirm_minutes = minutes;
  }
  const timeout = parseInt(draft.timeout, 10) || 10;
  if (timeout !== (existing.timeout ?? 10)) data.timeout = timeout;

  if (draft.apiKey.trim()) data.api_key = draft.apiKey.trim();
  if (draft.siteId && draft.siteId !== existing.site_id) data.site_id = draft.siteId;

  return Object.keys(data).length === 0 ? null : data;
}

export async function submitInstanceCreate(
  draft: InstanceDraft,
  siteId: string,
  service: SessionService = sessionService,
): Promise<Instance> {
  return service.createInstance(buildInstanceCreate(draft, siteId));
}

export async function submitInstanceUpdate(
  existing: Instance,
  draft: InstanceDraft,
  service: SessionService = sessionService,
): Promise<Instance | null> {
  const data = buildInstanceUpdate(existing, draft);
  if (!data) return null;
  return service.updateInstance(existing.id, data);
}
