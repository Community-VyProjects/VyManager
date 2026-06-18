"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import type { FirewallSeparator } from "@/lib/api/firewall-separators";

interface SeparatorDividerProps {
  separator: FirewallSeparator;
  colSpan: number;
}

/**
 * Read-only coloured section divider. Used where separators are shown purely
 * for context (e.g. the zones "all policies" overview) — no grip, edit, delete,
 * or drag, and crucially no dnd-kit `useSortable` so it can live in a list that
 * isn't being sorted.
 */
export function SeparatorDivider({ separator, colSpan }: SeparatorDividerProps) {
  const color = separator.color;
  return (
    <TableRow className="border-0 hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-1">
        <div
          className="flex items-center rounded-md px-3 py-1"
          // `${color}1a` appends ~10% alpha to the 6-digit hex for a subtle tint.
          style={{ backgroundColor: `${color}1a`, borderLeft: `3px solid ${color}` }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color }}
          >
            {separator.label}
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}
