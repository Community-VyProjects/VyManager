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
import type { FirewallGroup } from "@/lib/api/types/firewall-groups";
import type { ColumnDef } from "@/hooks/useColumnVisibility";
import { cn } from "@/lib/utils";

const DEFAULT_BRIDGE_COLUMNS: ColumnDef[] = [
  { id: "source",      label: "Source" },
  { id: "destination", label: "Destination" },
  { id: "protocol",    label: "Protocol" },
  { id: "interface",   label: "Interface" },
];

interface BridgeRuleRowProps {
  rule: BridgeRule;
  isV15: boolean;
  onEdit: (rule: BridgeRule) => void;
  onDelete: (rule: BridgeRule) => void;
  visibleOrderedColumns?: ColumnDef[];
  groups?: FirewallGroup[];
}

export function BridgeRuleRow({ rule, isV15, onEdit, onDelete, visibleOrderedColumns = DEFAULT_BRIDGE_COLUMNS, groups = [] }: BridgeRuleRowProps) {
  const getGroupMembers = (groupName: string): string[] => {
    const cleanName = groupName.startsWith("!") ? groupName.substring(1) : groupName;
    return groups.find((g) => g.name === cleanName)?.members || [];
  };

  const renderGroupBadge = (name: string, isPort?: boolean) => {
    const inv = name.startsWith("!");
    const display = inv ? name.substring(1) : name;
    const members = getGroupMembers(name);
    return (
      <TooltipProvider key={name}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "text-xs cursor-help",
                inv && "bg-orange-500/10 text-orange-500 border-orange-500/20",
                !inv && isPort && "bg-blue-500/10 text-blue-500 border-blue-500/20"
              )}
            >
              {inv && "!"}{display}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="font-semibold text-xs mb-2">{inv ? `NOT ${display}` : display}</p>
              {members.length > 0 ? (
                <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                  {members.map((m, i) => (
                    <code key={i} className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted/60 whitespace-nowrap">{m}</code>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No members</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
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
        {action === "jump" && rule.jump_target ? (
          <span className="inline-flex items-center gap-1">
            {action}
            <ArrowRight className="h-3 w-3 shrink-0" />
            {rule.jump_target}
          </span>
        ) : (
          action
        )}
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

    if (rule.source_group_address) items.push(renderGroupBadge(rule.source_group_address));
    if (rule.source_group_network) items.push(renderGroupBadge(rule.source_group_network));
    if (rule.source_group_mac) items.push(renderGroupBadge(rule.source_group_mac));

    if (rule.source_port) {
      items.push(
        <div key="port" className="text-xs text-muted-foreground">
          Port: {rule.source_port}
        </div>
      );
    }

    if (rule.source_group_port) items.push(renderGroupBadge(rule.source_group_port, true));

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

    if (rule.destination_group_address) items.push(renderGroupBadge(rule.destination_group_address));
    if (rule.destination_group_network) items.push(renderGroupBadge(rule.destination_group_network));
    if (rule.destination_group_mac) items.push(renderGroupBadge(rule.destination_group_mac));

    if (rule.destination_port) {
      items.push(
        <div key="port" className="text-xs text-muted-foreground">
          Port: {rule.destination_port}
        </div>
      );
    }

    if (rule.destination_group_port) items.push(renderGroupBadge(rule.destination_group_port, true));

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
    const hasAny = rule.inbound_interface || rule.inbound_interface_group || rule.outbound_interface || rule.outbound_interface_group;
    if (!hasAny) {
      return <span className="text-muted-foreground text-sm">Any</span>;
    }

    const inbound = rule.inbound_interface_group
      ? renderGroupBadge(rule.inbound_interface_group)
      : <span className="font-mono">{rule.inbound_interface || "*"}</span>;

    const outbound = rule.outbound_interface_group
      ? renderGroupBadge(rule.outbound_interface_group)
      : <span className="font-mono">{rule.outbound_interface || "*"}</span>;

    return (
      <div className="flex items-center gap-1 text-xs">
        {inbound}
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        {outbound}
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
      {visibleOrderedColumns.map((col) => {
        switch (col.id) {
          case "source":
            return <TableCell key="source">{formatSource()}</TableCell>;
          case "destination":
            return <TableCell key="destination">{formatDestination()}</TableCell>;
          case "protocol":
            return isV15 ? <TableCell key="protocol">{formatProtocol()}</TableCell> : null;
          case "interface":
            return <TableCell key="interface">{formatInterfaces()}</TableCell>;
          case "description":
            return (
              <TableCell key="description">
                <span className="text-sm text-muted-foreground">{rule.description || "-"}</span>
              </TableCell>
            );
          case "status":
            return (
              <TableCell key="status">
                <Badge variant="outline" className={rule.disabled ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"}>
                  {rule.disabled ? "disabled" : "enabled"}
                </Badge>
              </TableCell>
            );
          case "log":
            return (
              <TableCell key="log">
                {rule.log ? (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">on</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">off</span>
                )}
              </TableCell>
            );
          case "vlan":
            return (
              <TableCell key="vlan">
                {rule.vlan_id ? (
                  <div className="flex flex-col gap-0.5 text-xs">
                    <code className="bg-muted/50 px-2 py-1 rounded font-mono">{rule.vlan_id}</code>
                    {rule.vlan_priority && <span className="text-muted-foreground">pri: {rule.vlan_priority}</span>}
                    {rule.vlan_ethernet_type && <span className="text-muted-foreground">{rule.vlan_ethernet_type}</span>}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
            );
          case "ethernetType":
            return (
              <TableCell key="ethernetType">
                {rule.ethernet_type ? (
                  <Badge variant="outline" className="text-xs font-mono uppercase">{rule.ethernet_type}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
            );
          case "connectionState":
            return (
              <TableCell key="connectionState">
                {rule.connection_status_established || rule.connection_status_new || rule.connection_status_related || rule.connection_status_invalid ? (
                  <div className="flex flex-wrap gap-1">
                    {rule.connection_status_established && <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">EST</Badge>}
                    {rule.connection_status_new && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">NEW</Badge>}
                    {rule.connection_status_related && <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20">REL</Badge>}
                    {rule.connection_status_invalid && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">INV</Badge>}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
            );
          case "limit":
            return (
              <TableCell key="limit">
                {rule.limit_rate ? (
                  <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                    {rule.limit_rate}{rule.limit_burst ? ` / ${rule.limit_burst}` : ""}
                  </code>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
            );
          case "time":
            return (
              <TableCell key="time">
                {rule.time_starttime || rule.time_stoptime || rule.time_weekdays ? (
                  <div className="flex flex-col gap-0.5 text-xs">
                    {(rule.time_starttime || rule.time_stoptime) && (
                      <span className="font-mono text-muted-foreground">
                        {rule.time_starttime || "00:00"}–{rule.time_stoptime || "23:59"}
                      </span>
                    )}
                    {rule.time_weekdays && <span className="text-muted-foreground">{rule.time_weekdays}</span>}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
            );
          case "icmpType":
            return (
              <TableCell key="icmpType">
                {rule.icmp_type_name || rule.icmpv6_type_name ? (
                  <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                    {rule.icmp_type_name || rule.icmpv6_type_name}
                  </code>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
            );
          case "tcpFlags":
            return (
              <TableCell key="tcpFlags">
                {rule.tcp_flags ? (
                  <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">{rule.tcp_flags}</code>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
            );
          default:
            return null;
        }
      })}
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
