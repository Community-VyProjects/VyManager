"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import type { RouteMapRule } from "@/lib/api/route-map";

interface RouteMapRuleRowProps {
  rule: RouteMapRule;
  onEdit: (rule: RouteMapRule) => void;
  onDelete: (rule: RouteMapRule) => void;
}

export function RouteMapRuleRow({ rule, onEdit, onDelete }: RouteMapRuleRowProps) {
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

  // Helper to check if match conditions exist
  const hasMatchConditions = Object.values(rule.match).some(
    (value) => value !== null && value !== undefined && value !== false && value !== ""
  );

  // Helper to check if set actions exist
  const hasSetActions = Object.values(rule.set).some(
    (value) => value !== null && value !== undefined && value !== false && value !== ""
  );

  // Count active match conditions
  const matchCount = Object.values(rule.match).filter(
    (value) => value !== null && value !== undefined && value !== false && value !== ""
  ).length;

  // Count active set actions
  const setCount = Object.values(rule.set).filter(
    (value) => value !== null && value !== undefined && value !== false && value !== ""
  ).length;

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
      <TableCell>
        <Badge variant="outline" className="font-mono">
          {rule.rule_number}
        </Badge>
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
        {hasMatchConditions ? (
          <div className="flex flex-wrap gap-1">
            {matchCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {matchCount} condition{matchCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {rule.match.as_path && (
              <Badge variant="secondary" className="text-xs">
                AS Path: {rule.match.as_path}
              </Badge>
            )}
            {rule.match.community_list && (
              <Badge variant="secondary" className="text-xs">
                Community: {rule.match.community_list}
              </Badge>
            )}
            {rule.match.ip_address_prefix_list && (
              <Badge variant="secondary" className="text-xs">
                IP Prefix: {rule.match.ip_address_prefix_list}
              </Badge>
            )}
            {rule.match.protocol && (
              <Badge variant="secondary" className="text-xs">
                Protocol: {rule.match.protocol}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        {hasSetActions ? (
          <div className="flex flex-wrap gap-1">
            {setCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                {setCount} action{setCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {rule.set.local_preference !== null && rule.set.local_preference !== undefined && (
              <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20">
                Local Pref: {rule.set.local_preference}
              </Badge>
            )}
            {rule.set.metric && (
              <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                Metric: {rule.set.metric}
              </Badge>
            )}
            {rule.set.as_path_prepend && (
              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                AS Prepend: {rule.set.as_path_prepend}
              </Badge>
            )}
            {(rule.set.community_add_values && rule.set.community_add_values.length > 0) && (
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                Community: {rule.set.community_add_values.join(", ")}
              </Badge>
            )}
          </div>
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
