"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { PolicyRouteRule } from "@/lib/api/route";
import { useTranslations } from "next-intl";

interface RouteRuleRowProps {
  rule: PolicyRouteRule;
  onEdit: (rule: PolicyRouteRule) => void;
  onDelete: (rule: PolicyRouteRule) => void;
}

export function RouteRuleRow({ rule, onEdit, onDelete }: RouteRuleRowProps) {
  const t = useTranslations("routePolicy.ruleRow");
  const tc = useTranslations("common");
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
    source_address: t("match.sourceAddress"),
    destination_address: t("match.destinationAddress"),
    source_mac_address: t("match.sourceMac"),
    destination_mac_address: t("match.destinationMac"),
    source_geoip: t("match.sourceGeoip"),
    destination_geoip: t("match.destinationGeoip"),
    source_group_address: t("match.sourceGroupAddress"),
    source_group_domain: t("match.sourceGroupDomain"),
    source_group_mac: t("match.sourceGroupMac"),
    source_group_network: t("match.sourceGroupNetwork"),
    source_group_port: t("match.sourceGroupPort"),
    destination_group_address: t("match.destinationGroupAddress"),
    destination_group_domain: t("match.destinationGroupDomain"),
    destination_group_mac: t("match.destinationGroupMac"),
    destination_group_network: t("match.destinationGroupNetwork"),
    destination_group_port: t("match.destinationGroupPort"),
    source_port: t("match.sourcePort"),
    destination_port: t("match.destinationPort"),
    protocol: t("match.protocol"),
    tcp_flags: t("match.tcpFlags"),
    tcp_mss: "TCP MSS",
    icmp_code: t("match.icmpCode"),
    icmp_type: t("match.icmpType"),
    icmp_type_name: t("match.icmpTypeName"),
    icmpv6_code: t("match.icmpv6Code"),
    icmpv6_type: t("match.icmpv6Type"),
    icmpv6_type_name: t("match.icmpv6TypeName"),
    fragment: t("match.fragment"),
    packet_type: t("match.packetType"),
    packet_length: t("match.packetLength"),
    packet_length_exclude: t("match.packetLengthExclude"),
    dscp: "DSCP",
    dscp_exclude: t("match.dscpExclude"),
    state: t("match.state"),
    ipsec: "IPsec",
    ipsec_in: t("match.ipsecIn"),
    ipsec_out: t("match.ipsecOut"),
    mark: t("match.mark"),
    connection_mark: t("match.connectionMark"),
    ttl_eq: "TTL =",
    ttl_gt: "TTL >",
    ttl_lt: "TTL <",
    hop_limit_eq: t("match.hopLimitEq"),
    hop_limit_gt: t("match.hopLimitGt"),
    hop_limit_lt: t("match.hopLimitLt"),
    time_monthdays: t("match.monthDays"),
    time_startdate: t("match.startDate"),
    time_starttime: t("match.startTime"),
    time_stopdate: t("match.stopDate"),
    time_stoptime: t("match.stopTime"),
    time_utc: "UTC",
    time_weekdays: t("match.weekdays"),
    limit_burst: t("match.limitBurst"),
    limit_rate: t("match.limitRate"),
    recent_count: t("match.recentCount"),
    recent_time: t("match.recentTime"),
  };

  const SET_LABELS: Record<string, string> = {
    connection_mark: t("set.connectionMark"),
    dscp: "DSCP",
    mark: t("set.mark"),
    table: t("set.table"),
    tcp_mss: "TCP MSS",
    vrf: "VRF",
  };

  const formatMatchValue = (key: string, value: unknown): string => {
    if ((key === "source_geoip" || key === "destination_geoip") && value && typeof value === "object") {
      const geoip = value as { country_code?: string[] | null; inverse_match?: boolean | null };
      const codes = (geoip.country_code || []).join(",");
      return `${geoip.inverse_match ? "!" : ""}${codes}`;
    }
    if (Array.isArray(value)) {
      return value.join(",");
    }
    return String(value);
  };

  const activeMatchConditions = rule.match
    ? Object.entries(rule.match).filter(([, value]) => {
        if (value === null || value === undefined || value === false || value === "") return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === "object") {
          const geoip = value as { country_code?: string[] | null; inverse_match?: boolean | null };
          return Boolean((geoip.country_code && geoip.country_code.length > 0) || geoip.inverse_match);
        }
        return true;
      })
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
                  {t("conditions", { count: matchCount })}
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
                      <span className="text-xs font-mono truncate">{formatMatchValue(key, value)}</span>
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
          <Badge variant="destructive">{t("drop")}</Badge>
        ) : setCount > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20 cursor-help">
                  {t("actions", { count: setCount })}
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
          <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">{tc("disabled")}</Badge>
        ) : (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">{tc("enabled")}</Badge>
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
