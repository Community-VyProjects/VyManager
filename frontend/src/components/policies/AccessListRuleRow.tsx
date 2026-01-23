"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import type { AccessListRule } from "@/lib/api/access-list";

interface AccessListRuleRowProps {
  rule: AccessListRule;
  listType: string; // "ipv4" or "ipv6"
  onEdit: (rule: AccessListRule) => void;
  onDelete: (rule: AccessListRule) => void;
}

export function AccessListRuleRow({ rule, listType, onEdit, onDelete }: AccessListRuleRowProps) {
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

  // Convert inverse mask to CIDR prefix length
  const inverseMaskToCIDR = (inverseMask: string): number => {
    const parts = inverseMask.split('.').map(Number);
    let bits = 0;
    for (const part of parts) {
      // Count the number of 1s in binary representation
      bits += part.toString(2).split('1').length - 1;
    }
    return 32 - bits;
  };

  // Format source display
  const formatSource = () => {
    // IPv6 can have combinations: any + exact-match, any + network
    if (listType === "ipv6") {
      const parts: string[] = [];

      // Check for "any" flag
      if (rule.source_type === "any") {
        parts.push("Any");
      }

      // Check for exact-match flag
      if (rule.source_exact_match) {
        parts.push("Exact-Match");
      }

      // Check for network address
      if (rule.source_address) {
        parts.push(`Network:${rule.source_address}`);
      }

      if (parts.length > 0) {
        return (
          <Badge variant="secondary" className="text-xs font-mono">
            {parts.join(" ")}
          </Badge>
        );
      }

      return <span className="text-muted-foreground text-sm">—</span>;
    }

    // IPv4 logic
    if (!rule.source_type) return <span className="text-muted-foreground text-sm">—</span>;

    if (rule.source_type === "any") {
      return <Badge variant="secondary" className="text-xs">Any</Badge>;
    } else if (rule.source_type === "host" && rule.source_address) {
      return (
        <Badge variant="secondary" className="text-xs font-mono">
          Host: {rule.source_address}
        </Badge>
      );
    } else if (rule.source_type === "inverse-mask" && rule.source_address && rule.source_mask) {
      const cidr = inverseMaskToCIDR(rule.source_mask);
      return (
        <Badge variant="secondary" className="text-xs font-mono">
          Network: {rule.source_address}/{cidr}
        </Badge>
      );
    } else if (rule.source_type === "network" && rule.source_address) {
      return (
        <Badge variant="secondary" className="text-xs font-mono">
          Network: {rule.source_mask ? `${rule.source_address}/${rule.source_mask}` : rule.source_address}
        </Badge>
      );
    }

    return <span className="text-muted-foreground text-sm">—</span>;
  };

  // Format destination display
  const formatDestination = () => {
    if (!rule.destination_type) return <span className="text-muted-foreground text-sm">—</span>;

    if (rule.destination_type === "any") {
      return <Badge variant="secondary" className="text-xs">Any</Badge>;
    } else if (rule.destination_type === "host" && rule.destination_address) {
      return (
        <Badge variant="secondary" className="text-xs font-mono">
          Host: {rule.destination_address}
        </Badge>
      );
    } else if (rule.destination_type === "inverse-mask" && rule.destination_address && rule.destination_mask) {
      const cidr = inverseMaskToCIDR(rule.destination_mask);
      return (
        <Badge variant="secondary" className="text-xs font-mono">
          Network: {rule.destination_address}/{cidr}
        </Badge>
      );
    } else if (rule.destination_type === "network" && rule.destination_address) {
      return (
        <Badge variant="secondary" className="text-xs font-mono">
          Network: {rule.destination_mask ? `${rule.destination_address}/${rule.destination_mask}` : rule.destination_address}
        </Badge>
      );
    }

    return <span className="text-muted-foreground text-sm">—</span>;
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
        {formatSource()}
      </TableCell>
      {listType === "ipv4" && (
        <TableCell>
          {formatDestination()}
        </TableCell>
      )}
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
