"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import type { BridgeRule } from "@/lib/api/firewall-bridge";

interface BridgeRuleRowProps {
  rule: BridgeRule;
  onEdit: (rule: BridgeRule) => void;
  onDelete: (rule: BridgeRule) => void;
}

export function BridgeRuleRow({ rule, onEdit, onDelete }: BridgeRuleRowProps) {
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

  // Format action badge
  const getActionBadge = () => {
    const action = rule.action || "accept";
    const actionColors: Record<string, string> = {
      accept: "bg-green-500/10 text-green-500 border-green-500/20",
      drop: "bg-red-500/10 text-red-500 border-red-500/20",
      continue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      jump: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      notrack: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    };

    return (
      <Badge variant="outline" className={`capitalize ${actionColors[action] || ""}`}>
        {action}
      </Badge>
    );
  };

  // Format match criteria summary
  const formatMatchCriteria = () => {
    const criteria: string[] = [];

    if (rule.source_mac) {
      criteria.push(`Src: ${rule.source_mac}`);
    }
    if (rule.destination_mac) {
      criteria.push(`Dst: ${rule.destination_mac}`);
    }
    if (rule.vlan_id) {
      criteria.push(`VLAN: ${rule.vlan_id}`);
    }
    if (rule.inbound_interface) {
      criteria.push(`In: ${rule.inbound_interface}`);
    }
    if (rule.outbound_interface) {
      criteria.push(`Out: ${rule.outbound_interface}`);
    }
    if (rule.ethernet_type) {
      criteria.push(`Type: ${rule.ethernet_type}`);
    }

    if (criteria.length === 0) {
      return <span className="text-muted-foreground text-sm">Any</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {criteria.slice(0, 3).map((c, i) => (
          <Badge key={i} variant="secondary" className="text-xs font-mono">
            {c}
          </Badge>
        ))}
        {criteria.length > 3 && (
          <Badge variant="secondary" className="text-xs">
            +{criteria.length - 3} more
          </Badge>
        )}
      </div>
    );
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
        {getActionBadge()}
        {rule.disabled && (
          <Badge variant="outline" className="ml-2 text-xs bg-muted">
            Disabled
          </Badge>
        )}
        {rule.log && (
          <Badge variant="outline" className="ml-2 text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
            Log
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {rule.description || (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        {formatMatchCriteria()}
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
