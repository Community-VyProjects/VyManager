"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

interface RouteRuleRowProps {
  rule: any;
  onEdit: (rule: any) => void;
  onDelete: (rule: any) => void;
}

export function RouteRuleRow({ rule, onEdit, onDelete }: RouteRuleRowProps) {
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

  // Count match conditions
  const matchCount = rule.match
    ? Object.values(rule.match).filter(
        (value) => value !== null && value !== undefined && value !== false && value !== ""
      ).length
    : 0;

  // Count set actions
  const setCount = rule.set
    ? Object.values(rule.set).filter(
        (value) => value !== null && value !== undefined && value !== false && value !== ""
      ).length
    : 0;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className="group cursor-move hover:bg-accent/50"
    >
      <TableCell className="w-12">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-mono font-medium">{rule.rule_number}</TableCell>
      <TableCell>{rule.description || "-"}</TableCell>
      <TableCell>
        {matchCount > 0 ? (
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              {matchCount} condition{matchCount !== 1 ? "s" : ""}
            </Badge>
            {rule.match.source_address && (
              <Badge variant="secondary" className="text-xs">
                Src: {rule.match.source_address}
              </Badge>
            )}
            {rule.match.destination_address && (
              <Badge variant="secondary" className="text-xs">
                Dst: {rule.match.destination_address}
              </Badge>
            )}
            {rule.match.protocol && (
              <Badge variant="secondary" className="text-xs">
                Proto: {rule.match.protocol}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        {rule.set?.action_drop ? (
          <Badge variant="destructive">Drop</Badge>
        ) : setCount > 0 ? (
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
              {setCount} action{setCount !== 1 ? "s" : ""}
            </Badge>
            {rule.set.table && (
              <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20">
                Table: {rule.set.table}
              </Badge>
            )}
            {rule.set.vrf && (
              <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                VRF: {rule.set.vrf}
              </Badge>
            )}
            {rule.set.mark && (
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                Mark: {rule.set.mark}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        {rule.disable ? (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Disabled</Badge>
        ) : (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Enabled</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(rule)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(rule)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
