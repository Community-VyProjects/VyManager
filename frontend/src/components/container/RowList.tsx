"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface Props<R> {
  title: string;
  rows: R[];
  onChange: (rows: R[]) => void;
  newRow: () => R;
  addLabel: string;
  removeLabel: string;
  disabled?: boolean;
  /** Renders one row's fields; `update` patches that row. */
  children: (row: R, index: number, update: (patch: Partial<R>) => void) => ReactNode;
}

/**
 * Editor for a list of named entries (devices, ports, volumes, ...). Rows are
 * keyed by index so typing a name keeps focus; the save check rejects blank
 * and duplicate names.
 */
export function RowList<R>({ title, rows, onChange, newRow, addLabel, removeLabel, disabled, children }: Props<R>) {
  const update = (index: number) => (patch: Partial<R>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{title}</p>
      {rows.map((row, index) => (
        <div key={index} className="flex items-start gap-2 rounded-md border p-2">
          <div className="flex-1 grid grid-cols-2 gap-2">{children(row, index, update(index))}</div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={removeLabel}
            title={removeLabel}
            disabled={disabled}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange([...rows, newRow()])}>
        <Plus className="h-4 w-4 mr-1" />
        {addLabel}
      </Button>
    </div>
  );
}
