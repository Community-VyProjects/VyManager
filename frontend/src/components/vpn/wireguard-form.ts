/**
 * Draft-to-request logic for the unified WireGuard interface and peer modals.
 *
 * Create and update stay separate builders: create sends the fields the
 * operator filled in, update diffs the draft against the stored record so a
 * cleared field emits a delete (null) and an untouched one is not rewritten.
 * Keeping them here, outside the React components, makes the create-vs-edit
 * behaviour testable without rendering.
 */

import type { WireGuardInterface, WireGuardPeer } from "@/lib/api/wireguard";

/** Placeholder the API returns instead of a stored secret. */
export const MASKED_SECRET = "***";

const splitList = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

// ============================================================================
// Interface
// ============================================================================

export interface InterfaceDraft {
  name: string;
  description: string;
  addresses: string;
  port: string;
  privateKey: string;
  mtu: string;
  perClientThread: boolean;
  /** "off" | "auto" | "custom" */
  mssClamping: string;
  mssCustomValue: string;
  disabled: boolean;
}

export interface InterfaceCreateConfig {
  name: string;
  description?: string;
  addresses?: string[];
  port?: string;
  private_key?: string;
  mtu?: string;
  per_client_thread?: boolean;
  mss_clamping?: string | null;
}

export interface InterfaceUpdateConfig {
  description?: string | null;
  addresses?: string[];
  port?: string | null;
  private_key?: string | null;
  mtu?: string | null;
  per_client_thread?: boolean;
  mss_clamping?: string | null;
  disabled?: boolean;
}

const mssValue = (draft: InterfaceDraft): string | null => {
  if (draft.mssClamping === "auto") return "clamp-mss-to-pmtu";
  if (draft.mssClamping === "custom") return draft.mssCustomValue.trim() || null;
  return null;
};

/**
 * Create-only checks. The name is the interface identity and cannot change
 * after create, so the pattern and uniqueness rules never run on an edit.
 */
export function validateInterfaceCreate(
  draft: InterfaceDraft,
  existingInterfaces: string[],
): string | null {
  const name = draft.name.trim();
  if (!name) {
    return "Interface name is required";
  }
  if (!/^wg\d+$/.test(name)) {
    return "Interface name must be in format 'wg0', 'wg1', etc.";
  }
  if (existingInterfaces.includes(name)) {
    return `Interface ${draft.name} already exists`;
  }
  if (!draft.privateKey.trim()) {
    return "Private key is required. Use 'Generate Key' to create one.";
  }
  return null;
}

export function buildInterfaceCreateConfig(
  draft: InterfaceDraft,
  perClientThreadSupported: boolean,
): InterfaceCreateConfig {
  const config: InterfaceCreateConfig = {
    name: draft.name.trim(),
    private_key: draft.privateKey.trim(),
  };

  if (draft.description.trim()) config.description = draft.description.trim();
  if (draft.addresses.trim()) config.addresses = splitList(draft.addresses);
  if (draft.port.trim()) config.port = draft.port.trim();
  if (draft.mtu.trim()) config.mtu = draft.mtu.trim();
  if (draft.perClientThread && perClientThreadSupported) config.per_client_thread = true;

  const mss = mssValue(draft);
  if (mss) config.mss_clamping = mss;

  return config;
}

/**
 * Fields the operator actually changed. Returns null when nothing changed, so
 * the caller can close without sending a write.
 */
export function buildInterfaceUpdateConfig(
  draft: InterfaceDraft,
  current: WireGuardInterface,
): InterfaceUpdateConfig | null {
  const updated: InterfaceUpdateConfig = {};

  if (draft.description.trim() !== (current.description || "")) {
    updated.description = draft.description.trim() || null;
  }

  const newAddresses = splitList(draft.addresses);
  if (JSON.stringify(newAddresses) !== JSON.stringify(current.addresses || [])) {
    updated.addresses = newAddresses;
  }

  if (draft.port.trim() !== (current.port || "")) {
    updated.port = draft.port.trim() || null;
  }

  // A masked key was never shown to the operator, so it is never resent.
  if (draft.privateKey !== MASKED_SECRET && draft.privateKey.trim() !== "") {
    updated.private_key = draft.privateKey.trim();
  }

  if (draft.mtu.trim() !== (current.mtu || "")) {
    updated.mtu = draft.mtu.trim() || null;
  }

  if (draft.perClientThread !== current.per_client_thread) {
    updated.per_client_thread = draft.perClientThread;
  }

  const newMss = mssValue(draft);
  if (newMss !== (current.mss_clamping || null)) {
    updated.mss_clamping = newMss;
  }

  if (draft.disabled !== (current.disabled || false)) {
    updated.disabled = draft.disabled;
  }

  return Object.keys(updated).length === 0 ? null : updated;
}

/** Form state for an interface being edited, read off the stored record. */
export function interfaceDraftFrom(current: WireGuardInterface): InterfaceDraft {
  const mss = current.mss_clamping || "";
  const isPreset = !mss || mss === "clamp-mss-to-pmtu";
  return {
    name: current.name,
    description: current.description || "",
    addresses: current.addresses.join(", "),
    port: current.port || "",
    privateKey: current.private_key || "",
    mtu: current.mtu || "",
    perClientThread: current.per_client_thread,
    mssClamping: isPreset ? (mss ? "auto" : "off") : "custom",
    mssCustomValue: isPreset ? "" : mss,
    disabled: current.disabled || false,
  };
}

// ============================================================================
// Peer
// ============================================================================

export interface PeerDraft {
  name: string;
  publicKey: string;
  allowedIps: string;
  presharedKey: string;
  address: string;
  port: string;
  persistentKeepalive: string;
  description: string;
  disabled: boolean;
  hostName: string;
}

export interface PeerCreateConfig {
  name: string;
  public_key: string;
  allowed_ips: string[];
  preshared_key?: string;
  address?: string;
  port?: string;
  persistent_keepalive?: string;
  description?: string;
  disabled?: boolean;
  host_name?: string;
}

export interface PeerUpdateConfig {
  public_key?: string;
  allowed_ips?: string[];
  preshared_key?: string | null;
  address?: string | null;
  port?: string | null;
  persistent_keepalive?: string | null;
  description?: string | null;
  disabled?: boolean;
  host_name?: string | null;
}

/**
 * Public key and allowed IPs are required in both modes. The name rules are
 * create-only: on edit the name is locked to the stored peer, so checking it
 * against the interface's peers would reject the peer for being itself.
 */
export function validatePeer(
  draft: PeerDraft,
  options: { isCreate: boolean; existingPeerNames: string[] },
): string | null {
  const name = draft.name.trim();
  if (options.isCreate) {
    if (!name) {
      return "Peer name is required";
    }
    if (/\s/.test(name)) {
      return "Peer name cannot contain spaces";
    }
  }
  if (!draft.publicKey.trim()) {
    return "Public key is required";
  }
  if (!draft.allowedIps.trim()) {
    return "At least one allowed IP is required";
  }
  if (options.isCreate && options.existingPeerNames.includes(name)) {
    return `Peer '${draft.name}' already exists on this interface`;
  }
  return null;
}

export function buildPeerCreateConfig(draft: PeerDraft): PeerCreateConfig {
  const config: PeerCreateConfig = {
    name: draft.name.trim(),
    public_key: draft.publicKey.trim(),
    allowed_ips: splitList(draft.allowedIps),
  };

  if (draft.presharedKey.trim()) config.preshared_key = draft.presharedKey.trim();
  if (draft.address.trim()) config.address = draft.address.trim();
  if (draft.port.trim()) config.port = draft.port.trim();
  if (draft.persistentKeepalive.trim()) {
    config.persistent_keepalive = draft.persistentKeepalive.trim();
  }
  if (draft.description.trim()) config.description = draft.description.trim();
  if (draft.disabled) config.disabled = true;
  if (draft.hostName.trim()) config.host_name = draft.hostName.trim();

  return config;
}

/**
 * Fields the operator actually changed. Returns null when nothing changed, so
 * the caller can close without sending a write.
 */
export function buildPeerUpdateConfig(
  draft: PeerDraft,
  current: WireGuardPeer,
): PeerUpdateConfig | null {
  const updated: PeerUpdateConfig = {};

  if (draft.publicKey.trim() !== (current.public_key || "")) {
    updated.public_key = draft.publicKey.trim();
  }

  const newAllowedIps = splitList(draft.allowedIps);
  if (JSON.stringify(newAllowedIps) !== JSON.stringify(current.allowed_ips)) {
    updated.allowed_ips = newAllowedIps;
  }

  // A masked key was never shown to the operator, so it is never resent.
  if (draft.presharedKey !== MASKED_SECRET) {
    const storedPsk =
      current.preshared_key === MASKED_SECRET ? MASKED_SECRET : current.preshared_key || "";
    if (draft.presharedKey.trim() !== storedPsk) {
      updated.preshared_key = draft.presharedKey.trim() || null;
    }
  }

  if (draft.address.trim() !== (current.address || "")) {
    updated.address = draft.address.trim() || null;
  }

  if (draft.port.trim() !== (current.port || "")) {
    updated.port = draft.port.trim() || null;
  }

  if (draft.persistentKeepalive.trim() !== (current.persistent_keepalive || "")) {
    updated.persistent_keepalive = draft.persistentKeepalive.trim() || null;
  }

  if (draft.description.trim() !== (current.description || "")) {
    updated.description = draft.description.trim() || null;
  }

  if (draft.disabled !== (current.disabled || false)) {
    updated.disabled = draft.disabled;
  }

  if (draft.hostName.trim() !== (current.host_name || "")) {
    updated.host_name = draft.hostName.trim() || null;
  }

  return Object.keys(updated).length === 0 ? null : updated;
}

/** Form state for a peer being edited, read off the stored record. */
export function peerDraftFrom(current: WireGuardPeer): PeerDraft {
  return {
    name: current.name,
    publicKey: current.public_key || "",
    allowedIps: current.allowed_ips.join(", "),
    presharedKey: current.preshared_key || "",
    address: current.address || "",
    port: current.port || "",
    persistentKeepalive: current.persistent_keepalive || "",
    description: current.description || "",
    disabled: current.disabled || false,
    hostName: current.host_name || "",
  };
}
