"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useSession } from "@/lib/auth-client";
import { tableLayoutService } from "@/lib/api/table-layouts";
import {
  basedOnStorageKey,
  browserLayoutKey,
  bumpLayoutEpoch,
  cacheColumnLayout,
  claimUnscopedBrowserLayout,
  clearedStorageKey,
  conflictPayload,
  defaultColumnLayout,
  enqueueTableLayoutWrite,
  hydrateTableLayout,
  layoutEpoch,
  localColumnLayout,
  orderStorageKey,
  publishedStorageKey,
  unsyncedStorageKey,
  writeFailureAction,
  type ColumnDef,
  type ColumnLayout,
} from "@/lib/table-layout";

export type { ColumnDef };

function readItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota and private-mode failures; the account row is the other copy
  }
}

function removeItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function transportFor(
  serverKey: string,
  browserKey: string,
  onServer: (layout: ColumnLayout | null) => void,
) {
  const basedOn = () => readItem(basedOnStorageKey(browserKey));
  const applyConflict = (error: unknown) => {
    const conflict = conflictPayload(error);
    const remote = conflict?.layouts[serverKey];
    removeItem(unsyncedStorageKey(browserKey));
    removeItem(clearedStorageKey(browserKey));
    bumpLayoutEpoch(browserKey);
    if (remote) {
      const layout = { visible: remote.visible, order: remote.order };
      cacheColumnLayout(browserKey, layout, writeItem);
      writeItem(publishedStorageKey(browserKey), "1");
      const revision = conflict?.revisions?.[serverKey];
      if (revision) writeItem(basedOnStorageKey(browserKey), revision);
      onServer(layout);
      return;
    }
    removeItem(browserKey);
    removeItem(orderStorageKey(browserKey));
    removeItem(publishedStorageKey(browserKey));
    removeItem(basedOnStorageKey(browserKey));
    onServer(null);
  };
  return {
    save: async (layout: ColumnLayout) => {
      try {
        const saved = await tableLayoutService.save(serverKey, layout, basedOn());
        removeItem(unsyncedStorageKey(browserKey));
        writeItem(publishedStorageKey(browserKey), "1");
        const revision = saved.revisions?.[serverKey];
        if (revision) writeItem(basedOnStorageKey(browserKey), revision);
      } catch (error) {
        const action = writeFailureAction((error as { status?: number }).status);
        if (action === "retry") {
          writeItem(unsyncedStorageKey(browserKey), "1");
          throw error;
        }
        if (action === "server-wins") {
          applyConflict(error);
          return;
        }
        removeItem(unsyncedStorageKey(browserKey));
      }
    },
    remove: async () => {
      try {
        const saved = await tableLayoutService.remove(serverKey, basedOn());
        removeItem(clearedStorageKey(browserKey));
        const revision = saved.revisions?.[serverKey];
        if (revision) writeItem(basedOnStorageKey(browserKey), revision);
      } catch (error) {
        const action = writeFailureAction((error as { status?: number }).status);
        if (action === "retry") throw error;
        if (action === "server-wins") {
          applyConflict(error);
          return;
        }
        removeItem(clearedStorageKey(browserKey));
      }
    },
  };
}

export function useColumnVisibility(
  storageKey: string,
  columns: ColumnDef[],
  userIdForTest?: string,
) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? userIdForTest ?? null;
  const browserKey = userId ? browserLayoutKey(userId, storageKey) : null;
  const cached = userId
    ? localColumnLayout(browserLayoutKey(userId, storageKey), columns, readItem)
    : null;

  // This user's browser copy, read synchronously. The account row may replace
  // it after the read. Do not read an unscoped key here: that belongs to
  // whoever used this computer last.
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set((cached ?? defaultColumnLayout(columns)).visible),
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(
    () => (cached ?? defaultColumnLayout(columns)).order,
  );

  const [paintedUser, setPaintedUser] = useState<string | null>(null);
  if (userId && userId !== paintedUser) {
    setPaintedUser(userId);
    claimUnscopedBrowserLayout(
      userId,
      storageKey,
      columns,
      readItem,
      writeItem,
      removeItem,
    );
    const local = localColumnLayout(browserLayoutKey(userId, storageKey), columns, readItem);
    if (local) {
      setVisibleColumns(new Set(local.visible));
      setColumnOrder(local.order);
    }
  }

  const paintServer = useCallback((layout: ColumnLayout | null) => {
    const next = layout ?? defaultColumnLayout(columns);
    setVisibleColumns(new Set(next.visible));
    setColumnOrder(next.order);
  }, [columns]);

  useLayoutEffect(() => {
    if (!userId || !browserKey) return;
    let cancelled = false;
    const seenEpoch = layoutEpoch(browserKey);
    const transport = transportFor(storageKey, browserKey, paintServer);
    void hydrateTableLayout({
      userId,
      storageKey,
      columns: () => columns,
      readItem,
      writeItem,
      removeItem,
      getLayouts: () => tableLayoutService.get(),
      enqueueSave: (layout) =>
        enqueueTableLayoutWrite(browserKey, { kind: "save", layout }, transport),
      enqueueDelete: () =>
        enqueueTableLayoutWrite(browserKey, { kind: "delete" }, transport),
    }).then((layout) => {
      if (cancelled || !layout) return;
      if (layoutEpoch(browserKey) !== seenEpoch) return;
      setVisibleColumns(new Set(layout.visible));
      setColumnOrder(layout.order);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey, columns, userId, browserKey, paintServer]);

  const publish = (visible: string[], order: string[]) => {
    if (!userId || !browserKey) return;
    const layout = { visible, order };
    cacheColumnLayout(browserKey, layout, writeItem);
    removeItem(clearedStorageKey(browserKey));
    bumpLayoutEpoch(browserKey);
    enqueueTableLayoutWrite(
      browserKey,
      { kind: "save", layout },
      transportFor(storageKey, browserKey, paintServer),
    );
  };

  const toggleColumn = (id: string) => {
    const next = new Set(visibleColumns);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setVisibleColumns(next);
    publish([...next], columnOrder);
  };

  const isVisible = (id: string) => visibleColumns.has(id);

  const reorderColumns = (activeId: string, overId: string) => {
    const next = arrayMove(columnOrder, columnOrder.indexOf(activeId), columnOrder.indexOf(overId));
    setColumnOrder(next);
    publish([...visibleColumns], next);
  };

  const orderedColumns = columnOrder
    .map((id) => columns.find((c) => c.id === id))
    .filter(Boolean) as ColumnDef[];

  const visibleOrderedColumns = orderedColumns.filter((c) => visibleColumns.has(c.id));

  const visibleColumnCount = visibleColumns.size;

  const resetToDefault = () => {
    const defaults = defaultColumnLayout(columns);
    setVisibleColumns(new Set(defaults.visible));
    setColumnOrder(defaults.order);
    if (!userId || !browserKey) return;
    removeItem(browserKey);
    removeItem(orderStorageKey(browserKey));
    removeItem(unsyncedStorageKey(browserKey));
    removeItem(publishedStorageKey(browserKey));
    writeItem(clearedStorageKey(browserKey), "1");
    bumpLayoutEpoch(browserKey);
    enqueueTableLayoutWrite(browserKey, { kind: "delete" }, transportFor(storageKey, browserKey, paintServer));
  };

  return {
    visibleColumns,
    toggleColumn,
    isVisible,
    visibleColumnCount,
    orderedColumns,
    visibleOrderedColumns,
    reorderColumns,
    resetToDefault,
  };
}
