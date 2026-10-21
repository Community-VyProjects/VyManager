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
  dropPendingLayoutWrites,
  enqueueTableLayoutWrite,
  hydrateTableLayout,
  layoutEpoch,
  layoutWriteQueued,
  localColumnLayout,
  normalizeColumnLayout,
  orderStorageKey,
  publishedStorageKey,
  savingStorageKey,
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

const layoutPainters = new Map<string, (layout: ColumnLayout | null) => void>();

function bindLayoutPainter(key: string, painter: (layout: ColumnLayout | null) => void) {
  layoutPainters.set(key, painter);
}

function unbindLayoutPainter(key: string, painter: (layout: ColumnLayout | null) => void) {
  if (layoutPainters.get(key) === painter) layoutPainters.delete(key);
}

function transportFor(serverKey: string, browserKey: string, userId: string, columns: ColumnDef[]) {
  const basedOn = () => readItem(basedOnStorageKey(browserKey));
  const applyConflict = (error: unknown) => {
    const conflict = conflictPayload(error);
    const remote = conflict?.layouts[serverKey];
    removeItem(unsyncedStorageKey(browserKey));
    removeItem(savingStorageKey(browserKey));
    removeItem(clearedStorageKey(browserKey));
    // A hydrate that started before this conflict must not paint over the account layout.
    // The painter is whoever is mounted now, not the instance that started the save.
    bumpLayoutEpoch(browserKey);
    dropPendingLayoutWrites(browserKey);
    const paint = layoutPainters.get(browserKey);
    if (remote) {
      const layout = normalizeColumnLayout(remote, columns);
      cacheColumnLayout(browserKey, layout, writeItem);
      writeItem(publishedStorageKey(browserKey), "1");
      const revision = conflict?.revisions?.[serverKey];
      if (revision) writeItem(basedOnStorageKey(browserKey), revision);
      paint?.(layout);
      return;
    }
    removeItem(browserKey);
    removeItem(orderStorageKey(browserKey));
    removeItem(publishedStorageKey(browserKey));
    removeItem(basedOnStorageKey(browserKey));
    paint?.(null);
  };
  return {
    save: async (layout: ColumnLayout) => {
      const remember = (saved: { revisions?: Record<string, string> }) => {
        removeItem(unsyncedStorageKey(browserKey));
        if (!layoutWriteQueued(browserKey)) removeItem(savingStorageKey(browserKey));
        writeItem(publishedStorageKey(browserKey), "1");
        const revision = saved.revisions?.[serverKey];
        if (revision) writeItem(basedOnStorageKey(browserKey), revision);
      };
      try {
        remember(await tableLayoutService.save(serverKey, layout, basedOn(), userId));
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 403) {
          writeItem(unsyncedStorageKey(browserKey), "1");
          removeItem(savingStorageKey(browserKey));
          dropPendingLayoutWrites(browserKey);
          return;
        }
        const action = writeFailureAction(status);
        if (action === "retry") {
          writeItem(unsyncedStorageKey(browserKey), "1");
          removeItem(savingStorageKey(browserKey));
          throw error;
        }
        if (action !== "server-wins") {
          removeItem(unsyncedStorageKey(browserKey));
          removeItem(savingStorageKey(browserKey));
          return;
        }
        if (conflictPayload(error)?.layouts[serverKey]) {
          applyConflict(error);
          return;
        }
        if (!layoutPainters.has(browserKey)) {
          writeItem(unsyncedStorageKey(browserKey), "1");
          removeItem(savingStorageKey(browserKey));
          return;
        }
        try {
          remember(await tableLayoutService.save(serverKey, layout, null, userId));
        } catch (retryError) {
          if (conflictPayload(retryError)?.layouts[serverKey]) {
            applyConflict(retryError);
            return;
          }
          writeItem(unsyncedStorageKey(browserKey), "1");
          removeItem(savingStorageKey(browserKey));
        }
      }
    },
    remove: async () => {
      try {
        await tableLayoutService.remove(serverKey, basedOn(), userId);
        removeItem(clearedStorageKey(browserKey));
        removeItem(basedOnStorageKey(browserKey));
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 403) {
          dropPendingLayoutWrites(browserKey);
          return;
        }
        const action = writeFailureAction(status);
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
    if (paintedUser) {
      const previousKey = browserLayoutKey(paintedUser, storageKey);
      layoutPainters.delete(previousKey);
      dropPendingLayoutWrites(previousKey);
    }
    setPaintedUser(userId);
    claimUnscopedBrowserLayout(
      userId,
      storageKey,
      columns,
      readItem,
      writeItem,
      removeItem,
    );
    const local = localColumnLayout(browserLayoutKey(userId, storageKey), columns, readItem)
      ?? defaultColumnLayout(columns);
    setVisibleColumns(new Set(local.visible));
    setColumnOrder(local.order);
  }

  const paintServer = useCallback((layout: ColumnLayout | null) => {
    const next = layout ?? defaultColumnLayout(columns);
    setVisibleColumns(new Set(next.visible));
    setColumnOrder(next.order);
  }, [columns]);

  useLayoutEffect(() => {
    if (!browserKey) return;
    bindLayoutPainter(browserKey, paintServer);
    return () => {
      unbindLayoutPainter(browserKey, paintServer);
    };
  }, [browserKey, paintServer]);

  useLayoutEffect(() => {
    if (!userId || !browserKey) return;
    let cancelled = false;
    const seenEpoch = layoutEpoch(browserKey);
    const transport = transportFor(storageKey, browserKey, userId, columns);
    void hydrateTableLayout({
      userId,
      storageKey,
      columns: () => columns,
      readItem,
      writeItem,
      removeItem,
      getLayouts: () => tableLayoutService.get(),
      enqueueSave: (layout) => {
        if (cancelled) return;
        enqueueTableLayoutWrite(browserKey, { kind: "save", layout }, transport);
      },
      enqueueDelete: () => {
        if (cancelled) return;
        enqueueTableLayoutWrite(browserKey, { kind: "delete" }, transport);
      },
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
    writeItem(savingStorageKey(browserKey), String(Date.now()));
    removeItem(clearedStorageKey(browserKey));
    bumpLayoutEpoch(browserKey);
    enqueueTableLayoutWrite(
      browserKey,
      { kind: "save", layout },
      transportFor(storageKey, browserKey, userId, columns),
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
    removeItem(savingStorageKey(browserKey));
    removeItem(publishedStorageKey(browserKey));
    writeItem(clearedStorageKey(browserKey), "1");
    bumpLayoutEpoch(browserKey);
    enqueueTableLayoutWrite(browserKey, { kind: "delete" }, transportFor(storageKey, browserKey, userId, columns));
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
