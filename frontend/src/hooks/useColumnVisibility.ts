"use client";

import { useLayoutEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useSession } from "@/lib/auth-client";
import { tableLayoutService } from "@/lib/api/table-layouts";
import {
  browserLayoutKey,
  bumpLayoutEpoch,
  cacheColumnLayout,
  clearedStorageKey,
  defaultColumnLayout,
  enqueueTableLayoutWrite,
  hydrateTableLayout,
  orderStorageKey,
  unsyncedStorageKey,
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

function transportFor(serverKey: string, browserKey: string) {
  return {
    save: async (layout: ColumnLayout) => {
      try {
        await tableLayoutService.save(serverKey, layout);
        removeItem(unsyncedStorageKey(browserKey));
      } catch (error) {
        writeItem(unsyncedStorageKey(browserKey), "1");
        throw error;
      }
    },
    remove: async () => {
      await tableLayoutService.remove(serverKey);
      removeItem(clearedStorageKey(browserKey));
    },
  };
}

export function useColumnVisibility(storageKey: string, columns: ColumnDef[]) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const browserKey = userId ? browserLayoutKey(userId, storageKey) : null;

  // Do not paint an unscoped browser cache. On a shared computer that cache
  // belongs to whoever used the machine last, not to the signed-in user.
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(defaultColumnLayout(columns).visible),
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(
    () => defaultColumnLayout(columns).order,
  );

  // Paint before the browser frame so a server-rendered default set does not
  // flash over the account layout (or this user's cache, if the read fails).
  // Callers pass a stable column list (module constant or useMemo).
  useLayoutEffect(() => {
    if (!userId || !browserKey) return;
    let cancelled = false;
    const transport = transportFor(storageKey, browserKey);
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
      setVisibleColumns(new Set(layout.visible));
      setColumnOrder(layout.order);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey, columns, userId, browserKey]);

  const publish = (visible: string[], order: string[]) => {
    if (!userId || !browserKey) return;
    const layout = { visible, order };
    cacheColumnLayout(browserKey, layout, writeItem);
    removeItem(clearedStorageKey(browserKey));
    bumpLayoutEpoch(browserKey);
    enqueueTableLayoutWrite(
      browserKey,
      { kind: "save", layout },
      transportFor(storageKey, browserKey),
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
    const next = arrayMove(
      columnOrder,
      columnOrder.indexOf(activeId),
      columnOrder.indexOf(overId),
    );
    setColumnOrder(next);
    publish([...visibleColumns], next);
  };

  const orderedColumns = columnOrder
    .map((id) => columns.find((column) => column.id === id))
    .filter(Boolean) as ColumnDef[];

  const visibleOrderedColumns = orderedColumns.filter((column) =>
    visibleColumns.has(column.id),
  );

  const resetToDefault = () => {
    const defaults = defaultColumnLayout(columns);
    setVisibleColumns(new Set(defaults.visible));
    setColumnOrder(defaults.order);
    if (!userId || !browserKey) return;
    removeItem(browserKey);
    removeItem(orderStorageKey(browserKey));
    removeItem(unsyncedStorageKey(browserKey));
    writeItem(clearedStorageKey(browserKey), "1");
    bumpLayoutEpoch(browserKey);
    enqueueTableLayoutWrite(browserKey, { kind: "delete" }, transportFor(storageKey, browserKey));
  };

  return {
    visibleColumns,
    toggleColumn,
    isVisible,
    visibleColumnCount: visibleColumns.size,
    orderedColumns,
    visibleOrderedColumns,
    reorderColumns,
    resetToDefault,
  };
}
