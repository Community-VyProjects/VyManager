"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import type { PrefixListRule } from "@/lib/api/prefix-list";

interface PrefixListRuleRowProps {
  rule: PrefixListRule;
  onEdit: (rule: PrefixListRule) => void;
  onDelete: (rule: PrefixListRule) => void;
}

export function PrefixListRuleRow({ rule, onEdit, onDelete }: PrefixListRuleRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.rule_number });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="group">
      <TableCell>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-mono font-semibold text-base">
        {rule.rule_number}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={
            rule.action === "permit"
              ? "capitalize bg-green-500/10 text-green-500 border-green-500/20"
              : "capitalize bg-red-500/10 text-red-500 border-red-500/20"
          }
        >
          {rule.action}
        </Badge>
      </TableCell>
      <TableCell>
        {rule.description || (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        {rule.prefix ? (
          <Badge variant="secondary" className="text-xs font-mono">
            {rule.prefix}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        {rule.ge !== null && rule.ge !== undefined ? (
          <Badge variant="outline" className="text-xs font-mono">
            {rule.ge}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        {rule.le !== null && rule.le !== undefined ? (
          <Badge variant="outline" className="text-xs font-mono">
            {rule.le}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(rule)}
            className="h-8"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(rule)}
            className="h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
