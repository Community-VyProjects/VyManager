import type {
  RipBatchOperation,
  RipConfig,
  RipDistributeListGlobal,
  RipDistributeListInterface,
  RipInterface,
  RipMd5Key,
  RipNetworkDistance,
  RipRedistribute,
} from "./rip";

/** Secrets load from GET /config as this mask. ripInterfaceOps never sends it back. */
export const MASKED_SECRET = "***";

/** Lab bounds for the interface authentication leaves (same on 1.4 and 1.5). */
export const MD5_KEY_ID_RANGE = { min: 1, max: 255 };
export const PASSWORD_MAX_LENGTH = 16;

type Op = RipBatchOperation;
type Scalar = string | number | null | undefined;

// ============================================================================
// Normalizers. The save checks and the emit read values through these.
// ============================================================================

export function ripText(value: Scalar): string {
  return value == null ? "" : String(value).trim();
}

function ripValue(value: Scalar): string | null {
  const text = ripText(value);
  return text === "" ? null : text;
}

function withTarget(target: string | undefined, value?: string): string | undefined {
  if (target === undefined) return value;
  return value === undefined ? target : `${target},${value}`;
}

/** Set a single-value leaf when it changed, delete it when it was cleared. */
function leaf(
  ops: Op[],
  setOp: string,
  deleteOp: string,
  target: string | undefined,
  before: Scalar,
  after: Scalar,
): void {
  const b = ripValue(before);
  const a = ripValue(after);
  if (a === b) return;
  if (a === null) {
    ops.push(target === undefined ? { op: deleteOp } : { op: deleteOp, value: target });
  } else {
    ops.push({ op: setOp, value: withTarget(target, a) });
  }
}

/** Set or delete a valueless leaf when the flag changed. */
function flag(ops: Op[], setOp: string, deleteOp: string, before: boolean, after: boolean): void {
  if (before === after) return;
  ops.push({ op: after ? setOp : deleteOp });
}

// ============================================================================
// Global settings and timers (one commit)
// ============================================================================

/** Timer fields as the overview form holds them (strings) or as GET /config returns them. */
export interface RipTimersDraft {
  update?: Scalar;
  timeout?: Scalar;
  garbage_collection?: Scalar;
}

export interface RipSettingsDraft {
  version: Scalar;
  default_distance: Scalar;
  default_metric: Scalar;
  route_map: Scalar;
  default_information_originate: boolean;
  timers: RipTimersDraft;
}

export function ripTimersOps(original: RipTimersDraft, updated: RipTimersDraft): Op[] {
  const ops: Op[] = [];
  const before = [original.update, original.timeout, original.garbage_collection].map(ripValue);
  const after = [updated.update, updated.timeout, updated.garbage_collection].map(ripValue);
  // Clearing every timer drops the ``timers`` node instead of leaving it bare.
  if (after.every((v) => v === null)) {
    if (before.some((v) => v !== null)) ops.push({ op: "delete_timers" });
    return ops;
  }
  leaf(ops, "set_timers_update", "delete_timers_update", undefined, original.update, updated.update);
  leaf(ops, "set_timers_timeout", "delete_timers_timeout", undefined, original.timeout, updated.timeout);
  leaf(
    ops,
    "set_timers_garbage_collection",
    "delete_timers_garbage_collection",
    undefined,
    original.garbage_collection,
    updated.garbage_collection,
  );
  return ops;
}

export function ripSettingsOps(original: RipConfig, updated: RipSettingsDraft): Op[] {
  const ops: Op[] = [];
  leaf(ops, "set_version", "delete_version", undefined, original.version, updated.version);
  leaf(ops, "set_default_distance", "delete_default_distance", undefined, original.default_distance, updated.default_distance);
  leaf(ops, "set_default_metric", "delete_default_metric", undefined, original.default_metric, updated.default_metric);
  leaf(ops, "set_route_map", "delete_route_map", undefined, original.route_map, updated.route_map);
  flag(
    ops,
    "set_default_information_originate",
    "delete_default_information_originate",
    original.default_information_originate,
    updated.default_information_originate,
  );
  ops.push(...ripTimersOps(original.timers, updated.timers));
  return ops;
}

// ============================================================================
// Interfaces
// ============================================================================

export type RipAuthMode = "" | "md5" | "plaintext";

/** Mode the stored node holds: md5 when it has keys, then plaintext. */
export function ripAuthMode(iface: Pick<RipInterface, "md5_keys" | "plaintext_password"> | null | undefined): RipAuthMode {
  if (!iface) return "";
  if ((iface.md5_keys || []).length > 0) return "md5";
  if (ripText(iface.plaintext_password)) return "plaintext";
  return "";
}

/** Rows with the id and password trimmed. A row the user never filled is dropped. */
export function ripMd5Rows(keys: RipMd5Key[] | null | undefined): RipMd5Key[] {
  return (keys || [])
    .map((key) => ({ key_id: ripText(key.key_id), password: ripText(key.password) }))
    .filter((key) => key.key_id !== "" || key.password !== "");
}

/** Next key id used by neither a draft row nor a stored key. */
export function ripNextKeyId(rows: RipMd5Key[], stored: RipMd5Key[] | null | undefined): string {
  const used = new Set([...rows, ...(stored || [])].map((key) => ripText(key.key_id)));
  for (let id = MD5_KEY_ID_RANGE.min; id <= MD5_KEY_ID_RANGE.max; id++) {
    if (!used.has(String(id))) return String(id);
  }
  return "";
}

export type RipInterfaceProblem =
  | "selectInterface"
  | "md5KeyRequired"
  | "md5KeyIdRequired"
  | "md5KeyIdRange"
  | "md5KeyIdDuplicate"
  | "md5PasswordRequired"
  | "md5PasswordInvalid"
  | "plaintextRequired"
  | "plaintextInvalid";

function passwordInvalid(value: string): boolean {
  return /\s/.test(value) || value.length > PASSWORD_MAX_LENGTH;
}

/** `validation.*` key for an interface the lab would reject, or null. */
export function ripInterfaceProblem(original: RipInterface | null, updated: RipInterface): RipInterfaceProblem | null {
  if (!ripText(updated.name)) return "selectInterface";
  const mode = (updated.authentication_type || "") as RipAuthMode;
  if (mode === "md5") {
    const rows = ripMd5Rows(updated.md5_keys);
    if (rows.length === 0) return "md5KeyRequired";
    const stored = new Map(ripMd5Rows(original?.md5_keys).map((key) => [key.key_id, key.password]));
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.key_id) return "md5KeyIdRequired";
      const id = Number(row.key_id);
      if (!/^[1-9]\d{0,2}$/.test(row.key_id) || id < MD5_KEY_ID_RANGE.min || id > MD5_KEY_ID_RANGE.max) {
        return "md5KeyIdRange";
      }
      if (seen.has(row.key_id)) return "md5KeyIdDuplicate";
      seen.add(row.key_id);
      if (!row.password) return "md5PasswordRequired";
      if (row.password === MASKED_SECRET) {
        // The mask keeps a stored password; on any other key it is not a password.
        if (stored.get(row.key_id) !== MASKED_SECRET) return "md5PasswordRequired";
      } else if (passwordInvalid(row.password)) {
        return "md5PasswordInvalid";
      }
    }
  }
  if (mode === "plaintext") {
    const password = ripText(updated.plaintext_password);
    if (!password) return "plaintextRequired";
    if (password === MASKED_SECRET) {
      if (ripText(original?.plaintext_password) !== MASKED_SECRET) return "plaintextRequired";
    } else if (passwordInvalid(password)) {
      return "plaintextInvalid";
    }
  }
  return null;
}

const SPLIT_HORIZON_SET: Record<string, string> = {
  disable: "set_interface_split_horizon_disable",
  "poison-reverse": "set_interface_split_horizon_poison_reverse",
};

/**
 * Ops for one interface; ``original`` is null on create. A masked secret is
 * neither set nor deleted while the mode stays; leaving a mode deletes every
 * stored leaf of that mode.
 */
export function ripInterfaceOps(original: RipInterface | null, updated: RipInterface): Op[] {
  const ops: Op[] = [];
  const name = ripText(updated.name);
  if (original === null) ops.push({ op: "set_interface", value: name });

  const mode = (updated.authentication_type || "") as RipAuthMode;
  const storedKeys = ripMd5Rows(original?.md5_keys);
  const storedPlaintext = ripText(original?.plaintext_password);
  if (mode === "") {
    if (storedKeys.length > 0 || storedPlaintext) ops.push({ op: "delete_interface_authentication", value: name });
  } else {
    if (mode !== "plaintext" && storedPlaintext) {
      ops.push({ op: "delete_interface_authentication_plaintext", value: name });
    }
    const rows = mode === "md5" ? ripMd5Rows(updated.md5_keys) : [];
    const kept = new Set(rows.map((row) => row.key_id));
    for (const key of storedKeys) {
      if (!kept.has(key.key_id)) {
        ops.push({ op: "delete_interface_authentication_md5", value: `${name},${key.key_id}` });
      }
    }
    for (const row of rows) {
      // A masked key is kept as stored; a mask on a new key is blocked by ripInterfaceProblem.
      if (row.password === MASKED_SECRET || row.password === "") continue;
      ops.push({ op: "set_interface_authentication_md5_key", value: `${name},${row.key_id},${row.password}` });
    }
    if (mode === "plaintext") {
      const password = ripText(updated.plaintext_password);
      if (password !== MASKED_SECRET && password !== "" && password !== storedPlaintext) {
        ops.push({ op: "set_interface_authentication_plaintext", value: `${name},${password}` });
      }
    }
  }

  leaf(ops, "set_interface_send_version", "delete_interface_send_version", name, original?.send_version, updated.send_version);
  leaf(
    ops,
    "set_interface_receive_version",
    "delete_interface_receive_version",
    name,
    original?.receive_version,
    updated.receive_version,
  );

  // disable and poison-reverse cannot both be set, so a switch deletes the old one in the same commit.
  const beforeSplit = ripText(original?.split_horizon);
  const afterSplit = ripText(updated.split_horizon);
  if (beforeSplit !== afterSplit) {
    if (beforeSplit) ops.push({ op: "delete_interface_split_horizon", value: name });
    if (afterSplit && SPLIT_HORIZON_SET[afterSplit]) ops.push({ op: SPLIT_HORIZON_SET[afterSplit], value: name });
  }
  return ops;
}

// ============================================================================
// Redistribute
// ============================================================================

export function ripRedistributeOps(original: RipRedistribute | null, updated: RipRedistribute): Op[] {
  const ops: Op[] = [];
  const proto = ripText(updated.protocol);
  if (original === null) ops.push({ op: "set_redistribute", value: proto });
  leaf(ops, "set_redistribute_metric", "delete_redistribute_metric", proto, original?.metric, updated.metric);
  leaf(ops, "set_redistribute_route_map", "delete_redistribute_route_map", proto, original?.route_map, updated.route_map);
  return ops;
}

// ============================================================================
// Network distance
// ============================================================================

export function ripNetworkDistanceOps(original: RipNetworkDistance | null, updated: RipNetworkDistance): Op[] {
  const ops: Op[] = [];
  const prefix = ripText(updated.prefix);
  if (original === null) ops.push({ op: "set_network_distance", value: prefix });
  // The screen requires a distance, so it is only ever replaced.
  const distance = ripValue(updated.distance);
  if (distance !== null && distance !== ripValue(original?.distance)) {
    ops.push({ op: "set_network_distance_value", value: `${prefix},${distance}` });
  }
  leaf(
    ops,
    "set_network_distance_access_list",
    "delete_network_distance_access_list",
    prefix,
    original?.access_list,
    updated.access_list,
  );
  return ops;
}

// ============================================================================
// Distribute lists
// ============================================================================

const LIST_FIELDS = ["access_list_in", "access_list_out", "prefix_list_in", "prefix_list_out"] as const;

export function ripDistributeListGlobalOps(original: RipDistributeListGlobal, updated: RipDistributeListGlobal): Op[] {
  const ops: Op[] = [];
  for (const field of LIST_FIELDS) {
    leaf(ops, `set_distribute_list_${field}`, `delete_distribute_list_${field}`, undefined, original[field], updated[field]);
  }
  return ops;
}

export function ripDistributeListInterfaceOps(
  original: RipDistributeListInterface | null,
  updated: RipDistributeListInterface,
): Op[] {
  const ops: Op[] = [];
  const iface = ripText(updated.interface);
  for (const field of LIST_FIELDS) {
    leaf(
      ops,
      `set_distribute_list_interface_${field}`,
      `delete_distribute_list_interface_${field}`,
      iface,
      original?.[field],
      updated[field],
    );
  }
  return ops;
}

/** True when the per-interface filter names no list, so a save would emit nothing. */
export function ripDistributeListInterfaceEmpty(entry: RipDistributeListInterface): boolean {
  return LIST_FIELDS.every((field) => ripValue(entry[field]) === null);
}
