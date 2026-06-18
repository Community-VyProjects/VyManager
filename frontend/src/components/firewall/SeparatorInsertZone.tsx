"use client";

import { Plus } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";

interface SeparatorInsertZoneProps {
  colSpan: number;
  onInsert: () => void;
}

/**
 * A thin gap rendered between two firewall rule rows. On hover it reveals a
 * line and a "+ Separator" button so a separator can be dropped exactly into
 * that gap.
 */
export function SeparatorInsertZone({ colSpan, onInsert }: SeparatorInsertZoneProps) {
  return (
    <TableRow className="group/ins border-0 hover:bg-transparent">
      <TableCell colSpan={colSpan} className="relative h-2 p-0">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-transparent transition-colors group-hover/ins:bg-primary/40" />
        <button
          type="button"
          onClick={onInsert}
          aria-label="Insert separator here"
          className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground opacity-0 shadow-sm transition-opacity hover:border-primary hover:text-foreground group-hover/ins:opacity-100"
        >
          <Plus className="h-3 w-3" />
          Separator
        </button>
      </TableCell>
    </TableRow>
  );
}
