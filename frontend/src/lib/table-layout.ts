/**
 * Column layout sync. The table paints from localStorage. The account row is
 * the copy that follows the user to another computer.
 *
 * A read failure must not upload this browser's copy: the server may already
 * hold the other computer's layout. An edit that starts while the read is in
 * flight wins over that stale response.
 */

export interface ColumnDef {
  id: string;
  label: string;
  defaultVisible?: boolean;
}

export interface ColumnLayout {
  visible: string[];
  order: string[];
}

export interface TableLayoutsPayload {
  exists: boolean;
  layouts: Record<string, ColumnLayout>;
  revisions?: Record<string, string>;
  updatedAt?: string | null;
}

const CLEARED_SUFFIX = "-cleared";
const UNSYNCED_SUFFIX = "-unsynced";
const ORDER_SUFFIX = "-order";

export function clearedStorageKey(storageKey: string): string {
  return storageKey + CLEARED_SUFFIX;
}

const PUBLISHED_SUFFIX = "-published";

export function publishedStorageKey(storageKey: string): string {
  return storageKey + PUBLISHED_SUFFIX;
}

export function unsyncedStorageKey(storageKey: string): string {
  return storageKey + UNSYNCED_SUFFIX;
}

export function browserLayoutKey(userId: string, storageKey: string): string {
  return `${userId}:${storageKey}`;
}

const BROWSER_OWNER_PREFIX = "vymanager-column-layout-owner:";

function browserOwnerKey(storageKey: string): string {
  return BROWSER_OWNER_PREFIX + storageKey;
}

/**
 * A layout saved before it followed the account lives in an unscoped key.
 * Give it to this user for paint on this browser. Do not upload it: on a
 * shared computer the next account must not receive the previous person's
 * columns. The owner is per table, so claiming one table does not claim the
 * others. A different user leaves that table's unscoped keys alone.
 */
export function claimUnscopedBrowserLayout(
  userId: string,
  storageKey: string,
  columns: ColumnDef[],
  readItem: (key: string) => string | null,
  writeItem: (key: string, value: string) => void,
  removeItem: (key: string) => void,
): void {
  const ownerKey = browserOwnerKey(storageKey);
  const owner = readItem(ownerKey);
  if (owner && owner !== userId) return;
  const browserKey = browserLayoutKey(userId, storageKey);
  if (localColumnLayout(browserKey, columns, readItem)) {
    if (!owner) writeItem(ownerKey, userId);
    return;
  }
  const legacy = localColumnLayout(storageKey, columns, readItem);
  if (!legacy) return;
  cacheColumnLayout(browserKey, legacy, writeItem);
  removeItem(storageKey);
  removeItem(orderStorageKey(storageKey));
  writeItem(ownerKey, userId);
}

export function orderStorageKey(storageKey: string): string {
  return storageKey + ORDER_SUFFIX;
}

function parseIdList(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== "string")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function defaultColumnLayout(columns: ColumnDef[]): ColumnLayout {
  return {
    visible: columns.filter((column) => column.defaultVisible !== false).map((column) => column.id),
    order: columns.map((column) => column.id),
  };
}

/** Keep saved ids the table still knows, and append columns added since the save. New columns stay hidden, matching the hook's first-load merge. */
export function normalizeColumnLayout(
  saved: ColumnLayout,
  columns: ColumnDef[],
): ColumnLayout {
  const defaultIds = columns.map((column) => column.id);
  const known = new Set(defaultIds);
  const order = [
    ...saved.order.filter((id) => known.has(id)),
    ...defaultIds.filter((id) => !saved.order.includes(id)),
  ];
  return {
    visible: saved.visible.filter((id) => known.has(id)),
    order,
  };
}

/** null when this browser has never customized the table. Do not upload defaults. */
export function localColumnLayout(
  storageKey: string,
  columns: ColumnDef[],
  readItem: (key: string) => string | null,
): ColumnLayout | null {
  const visible = parseIdList(readItem(storageKey));
  const order = parseIdList(readItem(orderStorageKey(storageKey)));
  if (visible === null && order === null) return null;
  const defaults = defaultColumnLayout(columns);
  return normalizeColumnLayout(
    {
      visible: visible ?? defaults.visible,
      order: order ?? defaults.order,
    },
    columns,
  );
}

export interface HydrationPlan {
  /** Layout to paint. null leaves the current state alone. */
  paint: ColumnLayout | null;
  /** Write paint into localStorage so the next failed read still has the account copy. */
  cacheLocal: boolean;
  save: ColumnLayout | null;
  deleteRemote: boolean;
  clearUnsynced: boolean;
  clearTombstone: boolean;
  /** Drop this user's browser copy. Only after a layout we already saved is gone from the account, so a reset on another computer follows. An empty account does not drop a layout that was never saved. */
  clearLocal: boolean;
}

const EMPTY_PLAN: HydrationPlan = {
  paint: null,
  cacheLocal: false,
  save: null,
  deleteRemote: false,
  clearUnsynced: false,
  clearTombstone: false,
  clearLocal: false,
};

export function planTableLayoutHydration(input: {
  userId: string;
  storageKey: string;
  columns: ColumnDef[];
  remoteLayouts: Record<string, ColumnLayout> | null;
  revisions: Record<string, string> | null;
  basedOn: string | null;
  fetchFailed: boolean;
  dirty: boolean;
  readItem: (key: string) => string | null;
}): HydrationPlan {
  const browserKey = browserLayoutKey(input.userId, input.storageKey);
  const local = localColumnLayout(browserKey, input.columns, input.readItem);
  if (input.fetchFailed) {
    return { ...EMPTY_PLAN, paint: local };
  }
  if (input.dirty) return EMPTY_PLAN;

  const tombstone = input.readItem(clearedStorageKey(browserKey)) === "1";
  const unsynced = input.readItem(unsyncedStorageKey(browserKey)) === "1";
  const published = input.readItem(publishedStorageKey(browserKey)) === "1";
  const remote = input.remoteLayouts?.[input.storageKey];
  const remotePresent = remote !== undefined;
  const remoteRevision = input.revisions?.[input.storageKey] ?? null;
  const serverMoved = remotePresent && remoteRevision !== null && remoteRevision !== input.basedOn;
  const keyRemoved = input.basedOn !== null && !remotePresent;

  if (keyRemoved) {
    return {
      ...EMPTY_PLAN,
      paint: defaultColumnLayout(input.columns),
      clearUnsynced: true,
      clearTombstone: true,
      clearLocal: true,
    };
  }
  if ((tombstone || unsynced) && serverMoved && remote) {
    return {
      ...EMPTY_PLAN,
      paint: normalizeColumnLayout(remote, input.columns),
      cacheLocal: true,
      clearUnsynced: true,
      clearTombstone: true,
    };
  }
  if (tombstone) {
    return {
      ...EMPTY_PLAN,
      paint: defaultColumnLayout(input.columns),
      deleteRemote: remotePresent,
      clearTombstone: !remotePresent,
      clearLocal: true,
    };
  }
  if (unsynced && local) {
    return { ...EMPTY_PLAN, paint: local, save: local };
  }
  if (remotePresent && remote) {
    return {
      ...EMPTY_PLAN,
      paint: normalizeColumnLayout(remote, input.columns),
      cacheLocal: true,
      clearUnsynced: true,
      clearTombstone: true,
    };
  }
  if (local && !published) {
    return { ...EMPTY_PLAN, paint: local };
  }
  return {
    ...EMPTY_PLAN,
    paint: defaultColumnLayout(input.columns),
    clearLocal: published,
  };
}

export function isColumnLayout(value: unknown): value is ColumnLayout {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const layout = value as ColumnLayout;
  return (
    Array.isArray(layout.visible) &&
    Array.isArray(layout.order) &&
    layout.visible.every((id) => typeof id === "string") &&
    layout.order.every((id) => typeof id === "string")
  );
}

/** Garbage from the server is a failed read, not an empty account. Uploading over it would wipe the other computer. */
export function layoutsFromPayload(payload: unknown): Record<string, ColumnLayout> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const layouts = (payload as { layouts?: unknown }).layouts;
  if (!layouts || typeof layouts !== "object" || Array.isArray(layouts)) return null;
  const parsed: Record<string, ColumnLayout> = {};
  for (const [key, value] of Object.entries(layouts)) {
    if (!isColumnLayout(value)) return null;
    parsed[key] = { visible: value.visible, order: value.order };
  }
  return parsed;
}

export function basedOnStorageKey(storageKey: string): string {
  return storageKey + "-based-on";
}

export function payloadRevisions(payload: unknown): Record<string, string> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const value = (payload as { revisions?: unknown }).revisions;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const parsed: Record<string, string> = {};
  for (const [key, revision] of Object.entries(value)) {
    if (typeof revision === "string" && revision.length > 0) parsed[key] = revision;
  }
  return parsed;
}

/** FastAPI wraps the 409 body in detail. The account layout in that body wins. */
export function conflictPayload(error: unknown): TableLayoutsPayload | null {
  if (!error || typeof error !== "object") return null;
  const details = (error as { details?: unknown }).details;
  if (!details || typeof details !== "object") return null;
  const body = (details as { detail?: unknown }).detail;
  const layouts = layoutsFromPayload(body);
  if (!layouts) return null;
  return { exists: true, layouts, revisions: payloadRevisions(body) };
}

/** A 4xx is not retried. 409 means another computer wrote this table; that layout wins. */
export function writeFailureAction(status: number | undefined): "retry" | "drop" | "server-wins" {
  if (status === 409) return "server-wins";
  if (status !== undefined && status >= 400 && status < 500) return "drop";
  return "retry";
}

const epochs = new Map<string, number>();

export function layoutEpoch(storageKey: string): number {
  return epochs.get(storageKey) ?? 0;
}

export function bumpLayoutEpoch(storageKey: string): void {
  epochs.set(storageKey, layoutEpoch(storageKey) + 1);
}

export type LayoutWrite =
  | { kind: "save"; layout: ColumnLayout }
  | { kind: "delete" };

export interface LayoutTransport {
  save: (layout: ColumnLayout) => Promise<void>;
  remove: () => Promise<void>;
}

type QueuedWrite = { op: LayoutWrite; transport: LayoutTransport };

type WriteState = { latest: QueuedWrite | null; pumping: boolean };

const writeStates = new Map<string, WriteState>();

/** A save or reset is still in flight or queued. A read must not paint over it. */
export function layoutWritePending(key: string): boolean {
  const state = writeStates.get(key);
  return Boolean(state && (state.pumping || state.latest));
}

/** Drop a save or reset that was queued behind a request the account rejected. */
export function dropPendingLayoutWrites(key: string): void {
  const state = writeStates.get(key);
  if (state) state.latest = null;
}

async function pumpLayoutWrites(key: string, state: WriteState): Promise<void> {
  try {
    while (state.latest) {
      const queued = state.latest;
      state.latest = null;
      try {
        if (queued.op.kind === "delete") await queued.transport.remove();
        else await queued.transport.save(queued.op.layout);
      } catch {
        return;
      }
    }
  } finally {
    state.pumping = false;
    if (state.latest) {
      state.pumping = true;
      void pumpLayoutWrites(key, state);
    }
  }
}

/** Last write wins while a request is in flight. A later delete replaces a save that has not started. The transport is the one queued with that write, not the one that started the pump. */
export function enqueueTableLayoutWrite(
  key: string,
  op: LayoutWrite,
  transport: LayoutTransport,
): void {
  const state = writeStates.get(key) ?? { latest: null, pumping: false };
  writeStates.set(key, state);
  state.latest = { op, transport };
  if (state.pumping) return;
  state.pumping = true;
  void pumpLayoutWrites(key, state);
}

export interface HydrateArgs {
  userId: string;
  storageKey: string;
  columns: () => ColumnDef[];
  readItem: (key: string) => string | null;
  writeItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  getLayouts: () => Promise<unknown>;
  enqueueSave: (layout: ColumnLayout) => void;
  enqueueDelete: () => void;
}

export function cacheColumnLayout(
  storageKey: string,
  layout: ColumnLayout,
  writeItem: (key: string, value: string) => void,
): void {
  writeItem(storageKey, JSON.stringify(layout.visible));
  writeItem(orderStorageKey(storageKey), JSON.stringify(layout.order));
}

/**
 * Read the account row, then decide. Returns the layout to paint, or null
 * when an edit landed during the read and already painted itself.
 */
export async function hydrateTableLayout(args: HydrateArgs): Promise<ColumnLayout | null> {
  const scope = browserLayoutKey(args.userId, args.storageKey);
  const start = layoutEpoch(scope);
  let fetchFailed = false;
  let remoteLayouts: Record<string, ColumnLayout> | null = null;
  let payload: unknown = null;
  try {
    payload = await args.getLayouts();
    remoteLayouts = layoutsFromPayload(payload);
    if (remoteLayouts === null) fetchFailed = true;
  } catch {
    fetchFailed = true;
  }
  if (layoutEpoch(scope) !== start) return null;
  if (layoutWritePending(scope)) return null;
  const seenRevision = args.readItem(basedOnStorageKey(scope));
  const remoteRevision = payloadRevisions(payload)[args.storageKey] ?? null;
  if (seenRevision && remoteRevision && remoteRevision < seenRevision) return null;

  const plan = planTableLayoutHydration({
    userId: args.userId,
    storageKey: args.storageKey,
    columns: args.columns(),
    remoteLayouts,
    revisions: payloadRevisions(payload),
    basedOn: args.readItem(basedOnStorageKey(scope)),
    fetchFailed,
    dirty: false,
    readItem: args.readItem,
  });
  if (plan.clearLocal) {
    args.removeItem(scope);
    args.removeItem(orderStorageKey(scope));
    args.removeItem(publishedStorageKey(scope));
    args.removeItem(basedOnStorageKey(scope));
  }
  if (plan.cacheLocal && plan.paint) {
    cacheColumnLayout(scope, plan.paint, args.writeItem);
    args.writeItem(publishedStorageKey(scope), "1");
    const seen = payloadRevisions(payload)[args.storageKey];
    if (seen) args.writeItem(basedOnStorageKey(scope), seen);
  }
  if (plan.clearUnsynced) args.removeItem(unsyncedStorageKey(scope));
  if (plan.clearTombstone) args.removeItem(clearedStorageKey(scope));
  if (plan.save) args.enqueueSave(plan.save);
  if (plan.deleteRemote) args.enqueueDelete();
  return plan.paint;
}
