"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
    opacity: isDragging ? 0 : 1,
  };

  const MATCH_LABELS: Record<string, string> = {
    source_address: "Src Addr",
    destination_address: "Dst Addr",
    source_mac_address: "Src MAC",
    destination_mac_address: "Dst MAC",
    source_group_address: "Src Group Addr",
    source_group_domain: "Src Group Domain",
    source_group_mac: "Src Group MAC",
    source_group_network: "Src Group Net",
    source_group_port: "Src Group Port",
    destination_group_address: "Dst Group Addr",
    destination_group_domain: "Dst Group Domain",
    destination_group_mac: "Dst Group MAC",
    destination_group_network: "Dst Group Net",
    destination_group_port: "Dst Group Port",
    source_port: "Src Port",
    destination_port: "Dst Port",
    protocol: "Protocol",
    tcp_flags: "TCP Flags",
    icmp_code: "ICMP Code",
    icmp_type: "ICMP Type",
    icmp_type_name: "ICMP Name",
    icmpv6_code: "ICMPv6 Code",
    icmpv6_type: "ICMPv6 Type",
    icmpv6_type_name: "ICMPv6 Name",
    fragment: "Fragment",
    packet_type: "Pkt Type",
    packet_length: "Pkt Length",
    packet_length_exclude: "Pkt Len Excl",
    dscp: "DSCP",
    dscp_exclude: "DSCP Excl",
    state: "State",
    ipsec: "IPsec",
    mark: "Mark",
    connection_mark: "Conn Mark",
    ttl_eq: "TTL =",
    ttl_gt: "TTL >",
    ttl_lt: "TTL <",
    hop_limit_eq: "Hop Limit =",
    hop_limit_gt: "Hop Limit >",
    hop_limit_lt: "Hop Limit <",
    time_monthdays: "Month Days",
    time_startdate: "Start Date",
    time_starttime: "Start Time",
    time_stopdate: "Stop Date",
    time_stoptime: "Stop Time",
    time_utc: "UTC",
    time_weekdays: "Weekdays",
    limit_burst: "Limit Burst",
    limit_rate: "Limit Rate",
    recent_count: "Recent Count",
    recent_time: "Recent Time",
  };

  const SET_LABELS: Record<string, string> = {
    connection_mark: "Conn Mark",
    dscp: "DSCP",
    mark: "Mark",
    table: "Table",
    tcp_mss: "TCP MSS",
    vrf: "VRF",
  };

  const activeMatchConditions = rule.match
    ? Object.entries(rule.match).filter(
        ([, value]) => value !== null && value !== undefined && value !== false && value !== ""
      )
    : [];

  const activeSetActions = rule.set
    ? Object.entries(rule.set).filter(
        ([key, value]) => key !== "action_drop" && value !== null && value !== undefined && value !== false && value !== ""
      )
    : [];

  const matchCount = activeMatchConditions.length;
  const setCount = activeSetActions.length;

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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs cursor-help">
                  {matchCount} condition{matchCount !== 1 ? "s" : ""}
                </Badge>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                avoidCollisions
                collisionPadding={8}
                className="p-2 max-w-[260px]"
              >
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                  {activeMatchConditions.map(([key, value]) => (
                    <div key={key} className="contents">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{MATCH_LABELS[key] ?? key}:</span>
                      <span className="text-xs font-mono truncate">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        {rule.set?.action_drop ? (
          <Badge variant="destructive">Drop</Badge>
        ) : setCount > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20 cursor-help">
                  {setCount} action{setCount !== 1 ? "s" : ""}
                </Badge>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                avoidCollisions
                collisionPadding={8}
                className="p-2 max-w-[220px]"
              >
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                  {activeSetActions.map(([key, value]) => (
                    <div key={key} className="contents">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{SET_LABELS[key] ?? key}:</span>
                      <span className="text-xs font-mono truncate">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
