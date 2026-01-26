"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BridgeRule } from "@/lib/api/firewall-bridge";

interface BridgeRuleRowProps {
  rule: BridgeRule;
  isV15: boolean;
  onEdit: (rule: BridgeRule) => void;
  onDelete: (rule: BridgeRule) => void;
}

export function BridgeRuleRow({ rule, isV15, onEdit, onDelete }: BridgeRuleRowProps) {
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
        {action === "jump" && rule.jump_target && ` → ${rule.jump_target}`}
      </Badge>
    );
  };

  // Format source info (MAC and/or IP)
  const formatSource = () => {
    const items: React.ReactNode[] = [];

    if (rule.source_mac) {
      items.push(
        <div key="mac" className="font-mono text-xs">
          {rule.source_mac}
        </div>
      );
    }

    if (rule.source_address) {
      const isNegated = rule.source_address.startsWith("!");
      const addr = isNegated ? rule.source_address.slice(1) : rule.source_address;
      items.push(
        <div key="ip" className="font-mono text-xs flex items-center gap-1">
          {isNegated && <span className="text-red-500 font-bold">!</span>}
          <span>{addr}</span>
        </div>
      );
    }

    if (rule.source_port) {
      items.push(
        <div key="port" className="text-xs text-muted-foreground">
          Port: {rule.source_port}
        </div>
      );
    }

    if (rule.vlan_id) {
      items.push(
        <Badge key="vlan" variant="secondary" className="text-xs">
          VLAN {rule.vlan_id}
        </Badge>
      );
    }

    if (items.length === 0) {
      return <span className="text-muted-foreground text-sm">Any</span>;
    }

    return <div className="flex flex-col gap-0.5">{items}</div>;
  };

  // Format destination info (MAC and/or IP)
  const formatDestination = () => {
    const items: React.ReactNode[] = [];

    if (rule.destination_mac) {
      items.push(
        <div key="mac" className="font-mono text-xs">
          {rule.destination_mac}
        </div>
      );
    }

    if (rule.destination_address) {
      const isNegated = rule.destination_address.startsWith("!");
      const addr = isNegated ? rule.destination_address.slice(1) : rule.destination_address;
      items.push(
        <div key="ip" className="font-mono text-xs flex items-center gap-1">
          {isNegated && <span className="text-red-500 font-bold">!</span>}
          <span>{addr}</span>
        </div>
      );
    }

    if (rule.destination_port) {
      items.push(
        <div key="port" className="text-xs text-muted-foreground">
          Port: {rule.destination_port}
        </div>
      );
    }

    if (items.length === 0) {
      return <span className="text-muted-foreground text-sm">Any</span>;
    }

    return <div className="flex flex-col gap-0.5">{items}</div>;
  };

  // Format protocol
  const formatProtocol = () => {
    if (!rule.protocol) {
      return <span className="text-muted-foreground text-sm">Any</span>;
    }
    return (
      <Badge variant="outline" className="text-xs uppercase">
        {rule.protocol}
      </Badge>
    );
  };

  // Format interfaces
  const formatInterfaces = () => {
    if (!rule.inbound_interface && !rule.outbound_interface) {
      return <span className="text-muted-foreground text-sm">Any</span>;
    }

    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="font-mono">{rule.inbound_interface || "*"}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono">{rule.outbound_interface || "*"}</span>
      </div>
    );
  };

  // Build tooltip content with description and extra info
  const getTooltipContent = () => {
    const items: string[] = [];

    if (rule.description) {
      items.push(rule.description);
    }

    if (rule.limit_rate) {
      items.push(`Rate limit: ${rule.limit_rate}${rule.limit_burst ? ` (burst: ${rule.limit_burst})` : ""}`);
    }

    if (rule.time_starttime || rule.time_stoptime) {
      items.push(`Time: ${rule.time_starttime || "00:00:00"} - ${rule.time_stoptime || "23:59:59"}`);
    }

    if (rule.time_weekdays) {
      items.push(`Days: ${rule.time_weekdays}`);
    }

    if (rule.ethernet_type) {
      items.push(`Ethernet: ${rule.ethernet_type}`);
    }

    return items.length > 0 ? items.join("\n") : null;
  };

  const tooltipContent = getTooltipContent();

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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono font-semibold text-sm cursor-default">
                {rule.rule_number}
              </span>
            </TooltipTrigger>
            {tooltipContent && (
              <TooltipContent side="right" className="max-w-xs">
                <pre className="whitespace-pre-wrap text-xs">{tooltipContent}</pre>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {getActionBadge()}
          <div className="flex gap-1 flex-wrap">
            {rule.disabled && (
              <Badge variant="outline" className="text-[10px] bg-muted">
                Off
              </Badge>
            )}
            {rule.log && (
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/20">
                Log
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>{formatSource()}</TableCell>
      <TableCell>{formatDestination()}</TableCell>
      {isV15 && <TableCell>{formatProtocol()}</TableCell>}
      <TableCell>{formatInterfaces()}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(rule)}
            className="h-7 px-2"
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(rule)}
            className="h-7 px-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
