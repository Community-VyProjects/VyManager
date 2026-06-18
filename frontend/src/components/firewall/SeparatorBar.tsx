"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { FirewallSeparator } from "@/lib/api/firewall-separators";

/** dnd-kit sortable id for a separator (string, vs numeric rule ids). */
export const separatorDragId = (id: string) => `sep:${id}`;

interface SeparatorBarProps {
  separator: FirewallSeparator;
  colSpan: number;
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * A full-width coloured bar rendered between firewall rule rows to visually
 * group them into sections. Pure UI metadata — it maps to no VyOS config.
 * When the user can edit, it can be dragged by its grip into another gap.
 */
export function SeparatorBar({
  separator,
  colSpan,
  canWrite,
  onEdit,
  onDelete,
}: SeparatorBarProps) {
  const color = separator.color;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: separatorDragId(separator.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn("border-0 hover:bg-transparent", isDragging && "opacity-50")}
    >
      <TableCell colSpan={colSpan} className="py-1">
        <div
          className="group flex items-center gap-1 rounded-md py-1.5 pr-2"
          // `${color}1a` appends ~10% alpha to the 6-digit hex for a subtle tint.
          style={{ backgroundColor: `${color}1a`, borderLeft: `3px solid ${color}` }}
        >
          {canWrite ? (
            <div
              {...attributes}
              {...listeners}
              aria-label="Drag separator"
              className="flex cursor-grab items-center self-stretch px-1.5 text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          ) : (
            <span className="pl-3" />
          )}
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color }}
          >
            {separator.label}
          </span>
          {canWrite && (
            <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={onEdit}
                aria-label="Edit separator"
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label="Delete separator"
                className="rounded p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
