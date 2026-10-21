"use client";

import { useLayoutEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { tableLayoutService } from "@/lib/api/table-layouts";
import {
  bumpLayoutEpoch,
  cacheColumnLayout,
  clearedStorageKey,
  defaultColumnLayout,
  enqueueTableLayoutWrite,
  hydrateTableLayout,
  localColumnLayout,
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

function transportFor() {
  return {
    save: async (key: string, layout: ColumnLayout) => {
      try {
        await tableLayoutService.save(key, layout);
        removeItem(unsyncedStorageKey(key));
      } catch (error) {
        writeItem(unsyncedStorageKey(key), "1");
        throw error;
      }
    },
    remove: async (key: string) => {
      await tableLayoutService.remove(key);
      removeItem(clearedStorageKey(key));
    },
  };
}

export function useColumnVisibility(storageKey: string, columns: ColumnDef[]) {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const local = localColumnLayout(storageKey, columns, readItem);
    return new Set((local ?? defaultColumnLayout(columns)).visible);
  });
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const local = localColumnLayout(storageKey, columns, readItem);
    return (local ?? defaultColumnLayout(columns)).order;
  });

  // Paint before the browser frame so a server-rendered default set does not
  // flash over the account layout (or this browser's cache, if the read fails).
  // Callers pass a stable column list (module constant or useMemo), so this
  // does not re-fetch on every render.
  useLayoutEffect(() => {
    let cancelled = false;
    const transport = transportFor();
    void hydrateTableLayout({
      storageKey,
      columns: () => columns,
      readItem,
      writeItem,
      removeItem,
      getLayouts: () => tableLayoutService.get(),
      enqueueSave: (layout) =>
        enqueueTableLayoutWrite(storageKey, { kind: "save", layout }, transport),
      enqueueDelete: () =>
        enqueueTableLayoutWrite(storageKey, { kind: "delete" }, transport),
    }).then((layout) => {
      if (cancelled || !layout) return;
      setVisibleColumns(new Set(layout.visible));
      setColumnOrder(layout.order);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey, columns]);

  const publish = (visible: string[], order: string[]) => {
    const layout = { visible, order };
    cacheColumnLayout(storageKey, layout, writeItem);
    removeItem(clearedStorageKey(storageKey));
    bumpLayoutEpoch(storageKey);
    enqueueTableLayoutWrite(storageKey, { kind: "save", layout }, transportFor());
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
    .map((id) => columns.find((column) => column.id === id))
    .filter(Boolean) as ColumnDef[];

  const visibleOrderedColumns = orderedColumns.filter((column) =>
    visibleColumns.has(column.id),
  );

  const resetToDefault = () => {
    const defaults = defaultColumnLayout(columns);
    setVisibleColumns(new Set(defaults.visible));
    setColumnOrder(defaults.order);
    removeItem(storageKey);
    removeItem(orderStorageKey(storageKey));
    removeItem(unsyncedStorageKey(storageKey));
    writeItem(clearedStorageKey(storageKey), "1");
    bumpLayoutEpoch(storageKey);
    enqueueTableLayoutWrite(storageKey, { kind: "delete" }, transportFor());
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
