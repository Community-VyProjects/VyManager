"use client";

import { useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";

export interface ColumnDef {
  id: string;
  label: string;
  defaultVisible?: boolean;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return fallback;
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function useColumnVisibility(storageKey: string, columns: ColumnDef[]) {
  const defaultIds = columns.map((c) => c.id);

  // --- Visibility ---
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const saved = readStorage<string[] | null>(storageKey, null);
    return new Set(
      columns
        .filter((c) => (saved !== null ? saved.includes(c.id) : c.defaultVisible !== false))
        .map((c) => c.id)
    );
  });

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      writeStorage(storageKey, [...next]);
      return next;
    });
  };

  const isVisible = (id: string) => visibleColumns.has(id);

  // --- Order ---
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = readStorage<string[] | null>(storageKey + "-order", null);
    if (!saved) return defaultIds;
    // Merge: keep saved order, append any new columns not yet in saved order
    const extra = defaultIds.filter((id) => !saved.includes(id));
    return [...saved.filter((id) => defaultIds.includes(id)), ...extra];
  });

  const reorderColumns = (activeId: string, overId: string) => {
    setColumnOrder((prev) => {
      const next = arrayMove(prev, prev.indexOf(activeId), prev.indexOf(overId));
      writeStorage(storageKey + "-order", next);
      return next;
    });
  };

  // Columns in user order
  const orderedColumns = columnOrder
    .map((id) => columns.find((c) => c.id === id))
    .filter(Boolean) as ColumnDef[];

  // Only visible columns, in user order
  const visibleOrderedColumns = orderedColumns.filter((c) => visibleColumns.has(c.id));

  const visibleColumnCount = visibleColumns.size;

  const resetToDefault = () => {
    const defaultVisible = new Set(
      columns.filter((c) => c.defaultVisible !== false).map((c) => c.id)
    );
    const defaultOrder = columns.map((c) => c.id);
    setVisibleColumns(defaultVisible);
    setColumnOrder(defaultOrder);
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(storageKey + "-order");
    } catch {
      // ignore
    }
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
