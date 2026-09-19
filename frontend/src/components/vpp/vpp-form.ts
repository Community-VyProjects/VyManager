/**
 * Draft, validation and submit logic for the unified VPP interface modal.
 *
 * CreateVppModal and EditVppModal held the same form twice. The form state is
 * now one draft shape, and create and update are two builders over it: create
 * sends the fields for the chosen sub-type, update sends the same fields for
 * the stored record so the service can diff them into set and delete ops.
 * Keeping all of it here, outside the React component, makes the create vs
 * edit behaviour testable without rendering.
 */

import {
  vppService,
  VppService,
  type CreateBondingInput,
  type CreateBridgeInput,
  type CreateLoopbackInput,
  type VppAnyConfig,
  type VppBondingConfig,
  type VppBridgeConfig,
  type VppBridgeMember,
  type VppBridgeMemberInput,
  type VppGreConfig,
  type VppIpipConfig,
  type VppLoopbackConfig,
  type VppSubType,
  type VppVif,
  type VppVifInput,
  type VppVxlanConfig,
  type VppXconnectConfig,
  type VyOSResponse,
} from "@/lib/api/vpp";

// ============================================================================
// Sub-type metadata
// ============================================================================

export const ALL_VPP_SUB_TYPES: VppSubType[] = [
  "bonding",
  "bridge",
  "gre",
  "ipip",
  "loopback",
  "vxlan",
  "xconnect",
];

export const VPP_NAME_PATTERNS: Record<VppSubType, RegExp> = {
  bonding: /^vppbond\d+$/,
  bridge: /^vppbr(?!0$)\d+$/,
  gre: /^vppgre\d+$/,
  ipip: /^vppipip\d+$/,
  loopback: /^vpplo\d+$/,
  vxlan: /^vppvxlan\d+$/,
  xconnect: /^vppxcon\d+$/,
};

export const VPP_NAME_EXAMPLES: Record<VppSubType, string> = {
  bonding: "vppbond0",
  bridge: "vppbr1",
  gre: "vppgre0",
  ipip: "vppipip0",
  loopback: "vpplo0",
  vxlan: "vppvxlan0",
  xconnect: "vppxcon0",
};

export const VPP_SUB_TYPE_LABELS: Record<VppSubType, string> = {
  bonding: "Bonding",
  bridge: "Bridge",
  gre: "GRE",
  ipip: "IPIP",
  loopback: "Loopback",
  vxlan: "VXLAN",
  xconnect: "XConnect",
};

export const VPP_SUB_TYPE_DESCRIPTIONS: Record<VppSubType, string> = {
  bonding: "Bond/LAG interfaces for link aggregation",
  bridge: "Bridge domain interfaces (vppbr0 reserved)",
  gre: "GRE tunnel interfaces",
  ipip: "IP-in-IP tunnel interfaces",
  loopback: "Loopback interfaces",
  vxlan: "VXLAN tunnel interfaces",
  xconnect: "Layer 2 cross-connect interfaces",
};

/** Which tabs a sub-type renders. Shared so create and edit cannot drift. */
export const vppTabs = (subType: VppSubType) => ({
  addresses: subType !== "bridge" && subType !== "xconnect",
  members: subType === "bonding" || subType === "xconnect",
  bridgeMembers: subType === "bridge",
  vif: subType === "bonding" || subType === "loopback",
});

// ============================================================================
// Draft
// ============================================================================

export interface VppVifDraft {
  vlan_id: string;
  description: string;
  disabled: boolean;
  addresses: string[];
  addressInput: string;
  mtu: string;
}

export const emptyVppVifDraft = (): VppVifDraft => ({
  vlan_id: "",
  description: "",
  disabled: false,
  addresses: [],
  addressInput: "",
  mtu: "",
});

export interface VppDraft {
  name: string;
  description: string;
  disabled: boolean;
  mtu: string;
  addresses: string[];

  bondMode: string;
  bondHashPolicy: string;
  bondMac: string;

  greRemote: string;
  greSource: string;
  greTunnelType: string;
  greKey: string;

  ipipRemote: string;
  ipipSource: string;

  vxlanRemote: string;
  vxlanSource: string;
  vxlanVni: string;

  members: string[];
  bridgeMembers: VppBridgeMemberInput[];
  vifs: VppVifDraft[];
}

export const emptyVppDraft = (name = ""): VppDraft => ({
  name,
  description: "",
  disabled: false,
  mtu: "",
  addresses: [],
  bondMode: "802.3ad",
  bondHashPolicy: "layer2",
  bondMac: "",
  greRemote: "",
  greSource: "",
  greTunnelType: "l3",
  greKey: "",
  ipipRemote: "",
  ipipSource: "",
  vxlanRemote: "",
  vxlanSource: "",
  vxlanVni: "",
  members: [],
  bridgeMembers: [],
  vifs: [],
});

const vifDraftsFrom = (vif: VppVif[]): VppVifDraft[] =>
  vif.map((v) => ({
    vlan_id: v.vlan_id,
    description: v.description ?? "",
    disabled: v.disabled,
    addresses: [...v.addresses],
    addressInput: "",
    mtu: v.mtu ?? "",
  }));

/**
 * Form state for a stored interface. Every field the sub-type does not use is
 * left at its empty default, so reopening the modal on another record cannot
 * leak the previous one's values.
 */
export function vppDraftFrom(current: VppAnyConfig, subType: VppSubType): VppDraft {
  const draft = emptyVppDraft(current.name);
  draft.description = current.description ?? "";

  switch (subType) {
    case "bonding": {
      const d = current as VppBondingConfig;
      draft.disabled = d.disabled;
      draft.mtu = d.mtu ?? "";
      draft.addresses = [...d.addresses];
      draft.bondMode = d.mode ?? "802.3ad";
      draft.bondHashPolicy = d.hash_policy ?? "layer2";
      draft.bondMac = d.mac ?? "";
      draft.members = [...d.members];
      draft.vifs = vifDraftsFrom(d.vif);
      return draft;
    }
    case "bridge": {
      const d = current as VppBridgeConfig;
      draft.bridgeMembers = d.members.map((m) => ({ interface: m.interface, bvi: m.bvi }));
      return draft;
    }
    case "gre": {
      const d = current as VppGreConfig;
      draft.disabled = d.disabled;
      draft.mtu = d.mtu ?? "";
      draft.addresses = [...d.addresses];
      draft.greRemote = d.remote ?? "";
      draft.greSource = d.source_address ?? "";
      draft.greTunnelType = d.tunnel_type ?? "l3";
      draft.greKey = d.key ?? "";
      return draft;
    }
    case "ipip": {
      const d = current as VppIpipConfig;
      draft.disabled = d.disabled;
      draft.mtu = d.mtu ?? "";
      draft.addresses = [...d.addresses];
      draft.ipipRemote = d.remote ?? "";
      draft.ipipSource = d.source_address ?? "";
      return draft;
    }
    case "loopback": {
      const d = current as VppLoopbackConfig;
      draft.disabled = d.disabled;
      draft.mtu = d.mtu ?? "";
      draft.addresses = [...d.addresses];
      draft.vifs = vifDraftsFrom(d.vif);
      return draft;
    }
    case "vxlan": {
      const d = current as VppVxlanConfig;
      draft.disabled = d.disabled;
      draft.mtu = d.mtu ?? "";
      draft.addresses = [...d.addresses];
      draft.vxlanRemote = d.remote ?? "";
      draft.vxlanSource = d.source_address ?? "";
      draft.vxlanVni = d.vni ?? "";
      return draft;
    }
    case "xconnect": {
      const d = current as VppXconnectConfig;
      draft.disabled = d.disabled;
      draft.members = [...d.members];
      return draft;
    }
  }
}

// ============================================================================
// Validation
// ============================================================================

const mtuError = (mtu: string): string | null => {
  if (!mtu) return null;
  const m = Number(mtu);
  if (!Number.isInteger(m) || m < 68 || m > 16000) return "MTU must be between 68 and 16000.";
  return null;
};

const vniError = (vni: string): string | null => {
  const n = Number(vni);
  if (!Number.isInteger(n) || n < 0 || n > 16777214) return "VNI must be between 0 and 16777214.";
  return null;
};

/**
 * Checks that hold in both modes: value ranges, and the leaves a sub-type
 * cannot commit without. Requiredness runs on edit too, so clearing a
 * mandatory endpoint is refused here instead of reaching the router.
 */
function validateVppFields(draft: VppDraft, subType: VppSubType): string | null {
  const mtu = mtuError(draft.mtu.trim());
  if (mtu) return mtu;

  if (subType === "gre") {
    if (!draft.greRemote.trim()) return "Remote IP is required for GRE.";
    if (!draft.greSource.trim()) return "Source address is required for GRE.";
  }
  if (subType === "ipip") {
    if (!draft.ipipRemote.trim()) return "Remote IP is required for IPIP.";
    if (!draft.ipipSource.trim()) return "Source address is required for IPIP.";
  }
  if (subType === "vxlan") {
    if (!draft.vxlanRemote.trim()) return "Remote IP is required for VXLAN.";
    if (!draft.vxlanSource.trim()) return "Source address is required for VXLAN.";
    if (!draft.vxlanVni.trim()) return "VNI is required for VXLAN.";
    const vni = vniError(draft.vxlanVni.trim());
    if (vni) return vni;
  }
  return null;
}

/** Create-only rules: the name and sub-type are identity and never change. */
export function validateVppCreate(
  draft: VppDraft,
  subType: VppSubType | null,
  existingNames: string[],
): string | null {
  if (!subType) return "Please select an interface type.";
  const n = draft.name.trim();
  if (!n) return "Interface name is required.";
  if (!VPP_NAME_PATTERNS[subType].test(n)) {
    return `Interface name must match pattern ${VPP_NAME_PATTERNS[subType]} (e.g., ${VPP_NAME_EXAMPLES[subType]}).`;
  }
  if (existingNames.includes(n)) return `Interface '${n}' already exists.`;
  return validateVppFields(draft, subType);
}

/** Edit-mode rules. Identity is locked, so the name rules do not run again. */
export function validateVppEdit(draft: VppDraft, subType: VppSubType): string | null {
  return validateVppFields(draft, subType);
}

// ============================================================================
// Submit
// ============================================================================

const vifInputs = (draft: VppDraft): VppVifInput[] =>
  draft.vifs.map((v) => ({
    vlan_id: v.vlan_id,
    description: v.description || undefined,
    disabled: v.disabled,
    addresses: v.addresses,
    mtu: v.mtu || undefined,
  }));

// ---- Diff helpers ----------------------------------------------------------
//
// Each returns the single-key object to spread into the update payload, or an
// empty object when the leaf is unchanged. The stored value is normalised to
// "" so a null the API never set and an empty form field compare equal, and
// clearing a field that was already empty emits nothing.

const changedText = <K extends string>(
  key: K,
  draftValue: string,
  storedValue: string | null,
): Partial<Record<K, string>> => {
  const next = draftValue.trim();
  return next === (storedValue ?? "") ? {} : ({ [key]: next } as Record<K, string>);
};

const changedFlag = <K extends string>(
  key: K,
  draftValue: boolean,
  storedValue: boolean,
): Partial<Record<K, boolean>> =>
  draftValue === storedValue ? {} : ({ [key]: draftValue } as Record<K, boolean>);

const changedList = <K extends string>(
  key: K,
  draftValue: string[],
  storedValue: string[],
): Partial<Record<K, string[]>> =>
  draftValue.length === storedValue.length && draftValue.every((v, i) => v === storedValue[i])
    ? {}
    : ({ [key]: draftValue } as Record<K, string[]>);

const vifsChanged = (draftVifs: VppVifDraft[], stored: VppVif[]): boolean => {
  if (draftVifs.length !== stored.length) return true;
  return draftVifs.some((v, i) => {
    const s = stored[i];
    return (
      v.vlan_id !== s.vlan_id ||
      v.description !== (s.description ?? "") ||
      v.disabled !== s.disabled ||
      v.mtu !== (s.mtu ?? "") ||
      v.addresses.length !== s.addresses.length ||
      v.addresses.some((a, j) => a !== s.addresses[j])
    );
  });
};

const bridgeMembersChanged = (
  draftMembers: VppBridgeMemberInput[],
  stored: VppBridgeMember[],
): boolean => {
  if (draftMembers.length !== stored.length) return true;
  return draftMembers.some(
    (m, i) => m.interface !== stored[i].interface || !!m.bvi !== stored[i].bvi,
  );
};

/**
 * Creates the interface the draft describes. The service is injectable so the
 * emitted operations can be asserted without a running backend.
 */
export function submitVppCreate(
  subType: VppSubType,
  draft: VppDraft,
  service: VppService = vppService,
): Promise<VyOSResponse> {
  const name = draft.name.trim();
  const description = draft.description.trim() || undefined;
  const mtu = draft.mtu.trim() || undefined;
  const { disabled, addresses } = draft;

  switch (subType) {
    case "bonding":
      return service.createBonding({
        name, description, disabled,
        mode: draft.bondMode, hash_policy: draft.bondHashPolicy,
        mac: draft.bondMac.trim() || undefined, mtu,
        addresses, members: draft.members, vif: vifInputs(draft),
      });
    case "bridge":
      return service.createBridge({ name, description, members: draft.bridgeMembers });
    case "gre":
      return service.createGre({
        name, description, disabled,
        remote: draft.greRemote.trim(), source_address: draft.greSource.trim(),
        tunnel_type: draft.greTunnelType, key: draft.greKey.trim() || undefined,
        mtu, addresses,
      });
    case "ipip":
      return service.createIpip({
        name, description, disabled,
        remote: draft.ipipRemote.trim(), source_address: draft.ipipSource.trim(),
        mtu, addresses,
      });
    case "loopback":
      return service.createLoopback({
        name, description, disabled, mtu, addresses, vif: vifInputs(draft),
      });
    case "vxlan":
      return service.createVxlan({
        name, description, disabled,
        remote: draft.vxlanRemote.trim(), source_address: draft.vxlanSource.trim(),
        vni: draft.vxlanVni.trim(), mtu, addresses,
      });
    case "xconnect":
      return service.createXconnect({ name, description, disabled, members: draft.members });
  }
}

/**
 * Updates the stored interface with the fields the operator actually changed.
 *
 * The service reads a present key as set-or-delete and an absent one as leave
 * alone, so the diff matters twice: an untouched leaf is never rewritten, and
 * a leaf that was already empty never produces a delete for a node the router
 * does not have. This is the same shape the WireGuard modal uses.
 *
 * The target name comes from the stored record, never from the draft, so a
 * locked identity field cannot retarget the write.
 */
export function submitVppUpdate(
  subType: VppSubType,
  name: string,
  current: VppAnyConfig,
  draft: VppDraft,
  service: VppService = vppService,
): Promise<VyOSResponse> {
  switch (subType) {
    case "bonding": {
      const d = current as VppBondingConfig;
      const updated: Partial<CreateBondingInput> = {
        ...changedText("description", draft.description, d.description),
        ...changedFlag("disabled", draft.disabled, d.disabled),
        ...changedText("mode", draft.bondMode, d.mode),
        ...changedText("hash_policy", draft.bondHashPolicy, d.hash_policy),
        ...changedText("mac", draft.bondMac, d.mac),
        ...changedText("mtu", draft.mtu, d.mtu),
        ...changedList("addresses", draft.addresses, d.addresses),
        ...changedList("members", draft.members, d.members),
      };
      if (vifsChanged(draft.vifs, d.vif)) updated.vif = vifInputs(draft);
      return service.updateBonding(name, d, updated);
    }
    case "bridge": {
      const d = current as VppBridgeConfig;
      const updated: Partial<CreateBridgeInput> = {
        ...changedText("description", draft.description, d.description),
      };
      if (bridgeMembersChanged(draft.bridgeMembers, d.members)) {
        updated.members = draft.bridgeMembers;
      }
      return service.updateBridge(name, d, updated);
    }
    case "gre": {
      const d = current as VppGreConfig;
      return service.updateGre(name, d, {
        ...changedText("description", draft.description, d.description),
        ...changedFlag("disabled", draft.disabled, d.disabled),
        ...changedText("remote", draft.greRemote, d.remote),
        ...changedText("source_address", draft.greSource, d.source_address),
        ...changedText("tunnel_type", draft.greTunnelType, d.tunnel_type),
        ...changedText("key", draft.greKey, d.key),
        ...changedText("mtu", draft.mtu, d.mtu),
        ...changedList("addresses", draft.addresses, d.addresses),
      });
    }
    case "ipip": {
      const d = current as VppIpipConfig;
      return service.updateIpip(name, d, {
        ...changedText("description", draft.description, d.description),
        ...changedFlag("disabled", draft.disabled, d.disabled),
        ...changedText("remote", draft.ipipRemote, d.remote),
        ...changedText("source_address", draft.ipipSource, d.source_address),
        ...changedText("mtu", draft.mtu, d.mtu),
        ...changedList("addresses", draft.addresses, d.addresses),
      });
    }
    case "loopback": {
      const d = current as VppLoopbackConfig;
      const updated: Partial<CreateLoopbackInput> = {
        ...changedText("description", draft.description, d.description),
        ...changedFlag("disabled", draft.disabled, d.disabled),
        ...changedText("mtu", draft.mtu, d.mtu),
        ...changedList("addresses", draft.addresses, d.addresses),
      };
      if (vifsChanged(draft.vifs, d.vif)) updated.vif = vifInputs(draft);
      return service.updateLoopback(name, d, updated);
    }
    case "vxlan": {
      const d = current as VppVxlanConfig;
      return service.updateVxlan(name, d, {
        ...changedText("description", draft.description, d.description),
        ...changedFlag("disabled", draft.disabled, d.disabled),
        ...changedText("remote", draft.vxlanRemote, d.remote),
        ...changedText("source_address", draft.vxlanSource, d.source_address),
        ...changedText("vni", draft.vxlanVni, d.vni),
        ...changedText("mtu", draft.mtu, d.mtu),
        ...changedList("addresses", draft.addresses, d.addresses),
      });
    }
    case "xconnect": {
      const d = current as VppXconnectConfig;
      return service.updateXconnect(name, d, {
        ...changedText("description", draft.description, d.description),
        ...changedFlag("disabled", draft.disabled, d.disabled),
        ...changedList("members", draft.members, d.members),
      });
    }
  }
}
