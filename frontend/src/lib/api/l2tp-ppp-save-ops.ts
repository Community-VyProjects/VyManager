import type { BatchOperation, L2TPPPPOptions } from "./l2tp";

/** Lab `syntax:expression` of ppp-options ipv6-peer-interface-id-secret (1.5). */
const PEER_ID_SECRET_PATTERN = /^[!-~]{16,128}$/;

/** ipv6-peer-interface-id value whose 1.5 commit requires the secret. */
const CALLING_SID = "calling-sid";

export interface L2TPPPPOptionsUpdate {
  ipv4?: string;
  ipv6?: string;
  mppe?: string;
  disable_ccp?: boolean;
  lcp_echo_failure?: string;
  lcp_echo_interval?: string;
  lcp_echo_timeout?: string;
  min_mtu?: string;
  mru?: string;
  interface_cache?: string;
  ipv6_interface_id?: string;
  ipv6_peer_interface_id?: string;
  /** Left undefined while the loaded mask is untouched: the stored secret stays. */
  ipv6_peer_interface_id_secret?: string;
  ipv6_accept_peer_interface_id?: boolean;
}

export type L2TPPPPProblem = "peerInterfaceIdSecretRequired" | "peerInterfaceIdSecretInvalid";

/** Text leaf as both the save check and the emit read it. */
function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Secret as both the save check and the emit read it; never trimmed. */
function secret(value: string | null | undefined): string {
  return value ?? "";
}

/**
 * Field value after the first edit of a password input that shows the loaded
 * mask. `selection` is the caret range inside the mask just before the edit.
 * The edit replaces the whole mask with only the text it inserted, wherever
 * the caret was; a deletion clears the field; a value that no longer holds
 * the mask around the caret (autofill) is all new text.
 */
export function firstMaskEdit(mask: string, value: string, selection: [number, number]): string {
  const start = Math.max(0, Math.min(selection[0], mask.length));
  const end = Math.max(start, Math.min(selection[1], mask.length));
  const before = mask.slice(0, start);
  const after = mask.slice(end);
  if (value.length < before.length + after.length) return "";
  if (!value.startsWith(before) || !value.endsWith(after)) return value;
  return value.slice(before.length, value.length - after.length);
}

/**
 * Text pasted or dropped onto the loaded mask, with the line breaks a
 * single-line input drops; null when there is none, so the mask stays.
 */
export function maskTransferText(text: string): string | null {
  const value = text.replace(/[\r\n]/g, "");
  return value ? value : null;
}

/** A save the lab commit would reject, or null. */
export function pppOptionsProblem(
  current: L2TPPPPOptions,
  updated: L2TPPPPOptionsUpdate,
  secretSupported: boolean,
): L2TPPPPProblem | null {
  if (!secretSupported) return null;
  const typed = updated.ipv6_peer_interface_id_secret;
  if (typed !== undefined && typed !== "" && !PEER_ID_SECRET_PATTERN.test(secret(typed))) {
    return "peerInterfaceIdSecretInvalid";
  }
  const kept = typed === undefined ? secret(current.ipv6_peer_interface_id_secret) : secret(typed);
  const peerId = updated.ipv6_peer_interface_id === undefined
    ? text(current.ipv6_peer_interface_id)
    : text(updated.ipv6_peer_interface_id);
  if (peerId === CALLING_SID && !kept) return "peerInterfaceIdSecretRequired";
  return null;
}

type TextKey = Exclude<
  keyof L2TPPPPOptionsUpdate,
  "disable_ccp" | "ipv6_accept_peer_interface_id" | "ipv6_peer_interface_id_secret"
>;

const TEXT_LEAVES: Array<[TextKey, string]> = [
  ["ipv4", "ppp_ipv4"],
  ["ipv6", "ppp_ipv6"],
  ["mppe", "ppp_mppe"],
  ["lcp_echo_failure", "ppp_lcp_echo_failure"],
  ["lcp_echo_interval", "ppp_lcp_echo_interval"],
  ["lcp_echo_timeout", "ppp_lcp_echo_timeout"],
  ["min_mtu", "ppp_min_mtu"],
  ["mru", "ppp_mru"],
  ["interface_cache", "ppp_interface_cache"],
  ["ipv6_interface_id", "ppp_ipv6_interface_id"],
  ["ipv6_peer_interface_id", "ppp_ipv6_peer_interface_id"],
];

const FLAG_LEAVES: Array<["disable_ccp" | "ipv6_accept_peer_interface_id", string]> = [
  ["disable_ccp", "ppp_disable_ccp"],
  ["ipv6_accept_peer_interface_id", "ppp_ipv6_accept_peer_interface_id"],
];

/** Single-value leaf: a set replaces the value, a cleared field deletes it. */
function leaf(ops: BatchOperation[], name: string, before: string, after: string): void {
  if (after === before) return;
  if (after) ops.push({ op: `set_${name}`, value: after });
  else ops.push({ op: `delete_${name}` });
}

/** Valueless leaf: present or absent. */
function flag(ops: BatchOperation[], name: string, before: boolean, after: boolean): void {
  if (after === before) return;
  ops.push({ op: after ? `set_${name}` : `delete_${name}` });
}

/** Ops for one PPP options save; fields left undefined are not touched. */
export function buildPPPOptionsOps(
  current: L2TPPPPOptions,
  updated: L2TPPPPOptionsUpdate,
  secretSupported: boolean,
): BatchOperation[] {
  const ops: BatchOperation[] = [];
  for (const [key, name] of TEXT_LEAVES) {
    if (updated[key] === undefined) continue;
    leaf(ops, name, text(current[key]), text(updated[key]));
  }
  for (const [key, name] of FLAG_LEAVES) {
    if (updated[key] === undefined) continue;
    flag(ops, name, !!current[key], !!updated[key]);
  }
  if (secretSupported && updated.ipv6_peer_interface_id_secret !== undefined) {
    const after = secret(updated.ipv6_peer_interface_id_secret);
    if (after) {
      ops.push({ op: "set_ppp_ipv6_peer_interface_id_secret", value: after });
    } else if (secret(current.ipv6_peer_interface_id_secret)) {
      ops.push({ op: "delete_ppp_ipv6_peer_interface_id_secret" });
    }
  }
  return ops;
}
