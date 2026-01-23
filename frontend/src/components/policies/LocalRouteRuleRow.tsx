"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LocalRouteRule } from "@/lib/api/local-route";

interface LocalRouteRuleRowProps {
  rule: LocalRouteRule;
  onEdit: (rule: LocalRouteRule) => void;
  onDelete: (rule: LocalRouteRule) => void;
}

export function LocalRouteRuleRow({ rule, onEdit, onDelete }: LocalRouteRuleRowProps) {
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
      {/* Drag Handle */}
      <TableCell>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>

      {/* Rule Number */}
      <TableCell className="font-mono font-semibold text-base">
        {rule.rule_number}
      </TableCell>

      {/* Source */}
      <TableCell>
        {rule.source ? (
          <span className="font-mono text-sm">{rule.source}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>

      {/* Destination */}
      <TableCell>
        {rule.destination ? (
          <span className="font-mono text-sm">{rule.destination}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>

      {/* Inbound Interface */}
      <TableCell>
        {rule.inbound_interface ? (
          <Badge variant="outline" className="font-mono">
            {rule.inbound_interface}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>

      {/* Table */}
      <TableCell>
        {rule.table ? (
          <Badge
            variant="secondary"
            className={rule.table === "main" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : ""}
          >
            {rule.table}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>

      {/* VRF */}
      <TableCell>
        {rule.vrf ? (
          <Badge
            variant="secondary"
            className={rule.vrf === "default" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : ""}
          >
            {rule.vrf}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(rule)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(rule)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
