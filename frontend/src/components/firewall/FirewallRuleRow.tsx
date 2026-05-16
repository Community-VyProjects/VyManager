"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, ArrowRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FirewallRule } from "@/lib/api/firewall-ipv4";
import type { FirewallGroup } from "@/lib/api/types/firewall-groups";
import type { ColumnDef } from "@/hooks/useColumnVisibility";
import { cn } from "@/lib/utils";

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: "protocol" },
  { id: "source" },
  { id: "srcPort" },
  { id: "destination" },
  { id: "dstPort" },
  { id: "state" },
  { id: "description" },
  { id: "status" },
].map((c) => ({ ...c, label: c.id }));

interface FirewallRuleRowProps {
  rule: FirewallRule;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  groups?: FirewallGroup[];
  visibleOrderedColumns?: ColumnDef[];
}

export function FirewallRuleRow({
  rule,
  onEdit,
  onDelete,
  isDragging,
  groups = [],
  visibleOrderedColumns = DEFAULT_COLUMNS,
}: FirewallRuleRowProps) {
  const getGroupMembers = (groupName: string): string[] => {
    const cleanName = groupName.startsWith("!") ? groupName.substring(1) : groupName;
    const group = groups.find((g) => g.name === cleanName);
    return group?.members || [];
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
    isOver,
  } = useSortable({ id: rule.rule_number });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActuallyDragging = isDragging || isSortableDragging;

  const renderCell = (id: string): React.ReactNode => {
    switch (id) {
      case "protocol":
        return (
          <TableCell key="protocol">
            {rule.protocol ? (
              <span className="text-sm font-medium text-foreground uppercase">{rule.protocol}</span>
            ) : (
              <span className="text-sm text-muted-foreground">all</span>
            )}
          </TableCell>
        );

      case "source":
        return (
          <TableCell key="source">
            {rule.source?.address ||
            (rule.source?.group && Object.entries(rule.source.group).some(([t]) => t !== "port-group")) ||
            rule.source?.geoip?.country_code ? (
              <div className="flex flex-col gap-1">
                {rule.source.address && (
                  <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                    {rule.source.address}
                  </code>
                )}
                {rule.source.group &&
                  Object.entries(rule.source.group)
                    .filter(([t]) => t !== "port-group")
                    .map(([t, name]) => {
                      const inv = name.startsWith("!");
                      const display = inv ? name.substring(1) : name;
                      const members = getGroupMembers(name);
                      return (
                        <TooltipProvider key={t}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className={cn("text-xs cursor-help", inv && "bg-orange-500/10 text-orange-500 border-orange-500/20")}>
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
                    })}
                {rule.source.geoip?.country_code && rule.source.geoip.country_code.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={cn("text-xs cursor-help gap-1.5", rule.source.geoip.inverse_match ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-purple-500/10 text-purple-500 border-purple-500/20")}>
                          <Globe className="h-3 w-3" />
                          <span>
                            {rule.source.geoip.inverse_match && "!"}
                            {rule.source.geoip.country_code.length === 1
                              ? rule.source.geoip.country_code[0].toUpperCase()
                              : `Countries (${rule.source.geoip.country_code.length})`}
                          </span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs">
                          <p className="font-semibold text-xs mb-2">
                            {rule.source.geoip.inverse_match ? "Excluded Countries" : "Source Countries"}
                          </p>
                          <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                            {rule.source.geoip.country_code.map((c, i) => (
                              <code key={i} className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted/60 whitespace-nowrap">{c.toUpperCase()}</code>
                            ))}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">any</span>
            )}
          </TableCell>
        );

      case "srcPort":
        return (
          <TableCell key="srcPort">
            {rule.source?.port || rule.source?.group?.["port-group"] ? (
              <div className="flex flex-col gap-1">
                {rule.source.port && (
                  <code className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded font-mono">
                    {rule.source.port}
                  </code>
                )}
                {rule.source.group?.["port-group"] &&
                  (() => {
                    const pg = rule.source.group["port-group"];
                    const inv = pg.startsWith("!");
                    const display = inv ? pg.substring(1) : pg;
                    const members = getGroupMembers(pg);
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={cn("text-xs cursor-help", inv ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20")}>
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
                                <p className="text-xs text-muted-foreground">No ports</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })()}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">any</span>
            )}
          </TableCell>
        );

      case "destination":
        return (
          <TableCell key="destination">
            {rule.destination?.address ||
            (rule.destination?.group && Object.entries(rule.destination.group).some(([t]) => t !== "port-group")) ||
            rule.destination?.geoip?.country_code ? (
              <div className="flex flex-col gap-1">
                {rule.destination.address && (
                  <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                    {rule.destination.address}
                  </code>
                )}
                {rule.destination.group &&
                  Object.entries(rule.destination.group)
                    .filter(([t]) => t !== "port-group")
                    .map(([t, name]) => {
                      const inv = name.startsWith("!");
                      const display = inv ? name.substring(1) : name;
                      const members = getGroupMembers(name);
                      return (
                        <TooltipProvider key={t}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className={cn("text-xs cursor-help", inv && "bg-orange-500/10 text-orange-500 border-orange-500/20")}>
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
                    })}
                {rule.destination.geoip?.country_code && rule.destination.geoip.country_code.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={cn("text-xs cursor-help gap-1.5", rule.destination.geoip.inverse_match ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-purple-500/10 text-purple-500 border-purple-500/20")}>
                          <Globe className="h-3 w-3" />
                          <span>
                            {rule.destination.geoip.inverse_match && "!"}
                            {rule.destination.geoip.country_code.length === 1
                              ? rule.destination.geoip.country_code[0].toUpperCase()
                              : `Countries (${rule.destination.geoip.country_code.length})`}
                          </span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs">
                          <p className="font-semibold text-xs mb-2">
                            {rule.destination.geoip.inverse_match ? "Excluded Countries" : "Destination Countries"}
                          </p>
                          <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                            {rule.destination.geoip.country_code.map((c, i) => (
                              <code key={i} className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted/60 whitespace-nowrap">{c.toUpperCase()}</code>
                            ))}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">any</span>
            )}
          </TableCell>
        );

      case "dstPort":
        return (
          <TableCell key="dstPort">
            {rule.destination?.port || rule.destination?.group?.["port-group"] ? (
              <div className="flex flex-col gap-1">
                {rule.destination.port && (
                  <code className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded font-mono">
                    {rule.destination.port}
                  </code>
                )}
                {rule.destination.group?.["port-group"] &&
                  (() => {
                    const pg = rule.destination.group["port-group"];
                    const inv = pg.startsWith("!");
                    const display = inv ? pg.substring(1) : pg;
                    const members = getGroupMembers(pg);
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={cn("text-xs cursor-help", inv ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20")}>
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
                                <p className="text-xs text-muted-foreground">No ports</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })()}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">any</span>
            )}
          </TableCell>
        );

      case "state":
        return (
          <TableCell key="state">
            {rule.state ? (
              <div className="flex flex-wrap gap-1">
                {rule.state.established && <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">EST</Badge>}
                {rule.state.new && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">NEW</Badge>}
                {rule.state.related && <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20">REL</Badge>}
                {rule.state.invalid && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">INV</Badge>}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case "description":
        return (
          <TableCell key="description">
            <span className="text-sm text-muted-foreground">{rule.description || "-"}</span>
          </TableCell>
        );

      case "status":
        return (
          <TableCell key="status">
            <Badge variant="outline" className={rule.disable ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"}>
              {rule.disable ? "disabled" : "enabled"}
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

      case "interface":
        return (
          <TableCell key="interface">
            {rule.interface?.inbound || rule.interface?.outbound ? (
              <div className="flex items-center gap-1 text-xs font-mono">
                <span>{rule.interface.inbound || "*"}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span>{rule.interface.outbound || "*"}</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">any</span>
            )}
          </TableCell>
        );

      case "limit":
        return (
          <TableCell key="limit">
            {rule.limit?.rate ? (
              <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                {rule.limit.rate}{rule.limit.burst ? ` / ${rule.limit.burst}` : ""}
              </code>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case "time":
        return (
          <TableCell key="time">
            {rule.time?.starttime || rule.time?.stoptime || rule.time?.weekdays ? (
              <div className="flex flex-col gap-0.5 text-xs">
                {(rule.time.starttime || rule.time.stoptime) && (
                  <span className="font-mono text-muted-foreground">
                    {rule.time.starttime || "00:00"}–{rule.time.stoptime || "23:59"}
                  </span>
                )}
                {rule.time.weekdays && (
                  <span className="text-muted-foreground">{rule.time.weekdays}</span>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case "icmpType":
        return (
          <TableCell key="icmpType">
            {rule.icmp_type_name ? (
              <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">{rule.icmp_type_name}</code>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case "tcpFlags":
        return (
          <TableCell key="tcpFlags">
            {Array.isArray(rule.tcp_flags) && rule.tcp_flags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {(rule.tcp_flags as string[]).map((flag) => (
                  <Badge key={flag} variant="outline" className="text-xs font-mono uppercase">{flag}</Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case "mark":
        return (
          <TableCell key="mark">
            {rule.connection_mark || rule.mark_match ? (
              <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                {rule.connection_mark || rule.mark_match}
              </code>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case "packetLength":
        return (
          <TableCell key="packetLength">
            {rule.packet_length ? (
              <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">{rule.packet_length}</code>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case "recent":
        return (
          <TableCell key="recent">
            {rule.recent?.count ? (
              <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                {rule.recent.count}{rule.recent.time ? ` / ${rule.recent.time}s` : ""}
              </code>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      default:
        return null;
    }
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isActuallyDragging && "opacity-50 bg-primary/5",
        isOver && !isActuallyDragging && "border-t-4 border-t-primary bg-primary/5"
      )}
    >
      {/* Drag Handle — fixed */}
      <TableCell className="w-[40px] p-0">
        <div
          {...attributes}
          {...listeners}
          className="h-full flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-primary/10 transition-colors px-2 group/drag"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground group-hover/drag:text-primary transition-colors" />
        </div>
      </TableCell>

      {/* Rule Number — fixed, not reorderable */}
      <TableCell className="font-mono font-semibold text-base">
        {rule.rule_number}
      </TableCell>

      {/* Action — fixed */}
      <TableCell>
        {rule.action === "jump" && rule.jump_target ? (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="uppercase text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
              {rule.action}
            </Badge>
            <ArrowRight className="h-3 w-3 text-blue-500" />
            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20 font-mono">
              {rule.jump_target}
            </Badge>
          </div>
        ) : (
          <Badge
            variant="outline"
            className={cn(
              "uppercase text-xs",
              rule.action === "accept" && "bg-green-500/10 text-green-500 border-green-500/20",
              rule.action === "drop" && "bg-red-500/10 text-red-500 border-red-500/20",
              rule.action === "reject" && "bg-orange-500/10 text-orange-500 border-orange-500/20",
              rule.action === "jump" && "bg-blue-500/10 text-blue-500 border-blue-500/20"
            )}
          >
            {rule.action || "accept"}
          </Badge>
        )}
      </TableCell>

      {/* User-ordered, user-visible columns */}
      {visibleOrderedColumns.map((col) => renderCell(col.id))}

      {/* Actions — fixed */}
      <TableCell>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
