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
import { cn } from "@/lib/utils";

interface FirewallRuleRowProps {
  rule: FirewallRule;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  groups?: FirewallGroup[];
}

export function FirewallRuleRow({ rule, onEdit, onDelete, isDragging, groups = [] }: FirewallRuleRowProps) {
  // Helper function to find group members for tooltip
  const getGroupMembers = (groupName: string): string[] => {
    const group = groups.find((g) => g.name === groupName);
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
      {/* Drag Handle */}
      <TableCell className="w-[40px] p-0">
        <div
          {...attributes}
          {...listeners}
          className="h-full flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-primary/10 transition-colors px-2 group/drag"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground group-hover/drag:text-primary transition-colors" />
        </div>
      </TableCell>

      {/* Rule Number */}
      <TableCell className="font-mono font-semibold text-base">
        {rule.rule_number}
      </TableCell>

      {/* Action */}
      <TableCell>
        {rule.action === "jump" && rule.jump_target ? (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="uppercase text-xs bg-blue-500/10 text-blue-500 border-blue-500/20"
            >
              {rule.action}
            </Badge>
            <ArrowRight className="h-3 w-3 text-blue-500" />
            <Badge
              variant="outline"
              className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20 font-mono"
            >
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

      {/* Protocol */}
      <TableCell>
        {rule.protocol ? (
          <span className="text-sm font-medium text-foreground uppercase">
            {rule.protocol}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">all</span>
        )}
      </TableCell>

      {/* Source */}
      <TableCell>
        {rule.source?.address || (rule.source?.group && Object.entries(rule.source.group).some(([type]) => type !== "port-group")) || rule.source?.geoip?.country_code ? (
          <div className="flex flex-col gap-1">
            {rule.source.address && (
              <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                {rule.source.address}
              </code>
            )}
            {rule.source.group && Object.entries(rule.source.group)
              .filter(([type]) => type !== "port-group")
              .map(([type, name]) => {
                const members = getGroupMembers(name);
                return (
                  <TooltipProvider key={type}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-help">
                          {name}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs">
                          <p className="font-semibold text-xs mb-1">{name}</p>
                          {members.length > 0 ? (
                            <p className="text-xs">{members.join(", ")}</p>
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
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs cursor-help gap-1.5",
                        rule.source.geoip.inverse_match
                          ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                          : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                      )}
                    >
                      <Globe className="h-3 w-3" />
                      <span>
                        {rule.source.geoip.inverse_match && "!"}
                        {rule.source.geoip.country_code.length === 1
                          ? rule.source.geoip.country_code[0].toUpperCase()
                          : `Countries (${rule.source.geoip.country_code.length})`
                        }
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-xs">
                      <p className="font-semibold text-xs mb-1">
                        {rule.source.geoip.inverse_match ? "Excluded Countries" : "Source Countries"}
                      </p>
                      <p className="text-xs">
                        {rule.source.geoip.country_code.map((code) => code.toUpperCase()).join(", ")}
                      </p>
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

      {/* Source Port */}
      <TableCell>
        {rule.source?.port || (rule.source?.group?.["port-group"]) ? (
          <div className="flex flex-col gap-1">
            {rule.source.port && (
              <code className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded font-mono">
                {rule.source.port}
              </code>
            )}
            {rule.source.group?.["port-group"] && (() => {
              const portGroupName = rule.source.group["port-group"];
              const members = getGroupMembers(portGroupName);
              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20 cursor-help">
                        {portGroupName}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-semibold text-xs mb-1">{portGroupName}</p>
                        {members.length > 0 ? (
                          <p className="text-xs">{members.join(", ")}</p>
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

      {/* Destination */}
      <TableCell>
        {rule.destination?.address || (rule.destination?.group && Object.entries(rule.destination.group).some(([type]) => type !== "port-group")) || rule.destination?.geoip?.country_code ? (
          <div className="flex flex-col gap-1">
            {rule.destination.address && (
              <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                {rule.destination.address}
              </code>
            )}
            {rule.destination.group && Object.entries(rule.destination.group)
              .filter(([type]) => type !== "port-group")
              .map(([type, name]) => {
                const members = getGroupMembers(name);
                return (
                  <TooltipProvider key={type}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-help">
                          {name}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs">
                          <p className="font-semibold text-xs mb-1">{name}</p>
                          {members.length > 0 ? (
                            <p className="text-xs">{members.join(", ")}</p>
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
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs cursor-help gap-1.5",
                        rule.destination.geoip.inverse_match
                          ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                          : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                      )}
                    >
                      <Globe className="h-3 w-3" />
                      <span>
                        {rule.destination.geoip.inverse_match && "!"}
                        {rule.destination.geoip.country_code.length === 1
                          ? rule.destination.geoip.country_code[0].toUpperCase()
                          : `Countries (${rule.destination.geoip.country_code.length})`
                        }
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-xs">
                      <p className="font-semibold text-xs mb-1">
                        {rule.destination.geoip.inverse_match ? "Excluded Countries" : "Destination Countries"}
                      </p>
                      <p className="text-xs">
                        {rule.destination.geoip.country_code.map((code) => code.toUpperCase()).join(", ")}
                      </p>
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

      {/* Destination Port */}
      <TableCell>
        {rule.destination?.port || (rule.destination?.group?.["port-group"]) ? (
          <div className="flex flex-col gap-1">
            {rule.destination.port && (
              <code className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded font-mono">
                {rule.destination.port}
              </code>
            )}
            {rule.destination.group?.["port-group"] && (() => {
              const portGroupName = rule.destination.group["port-group"];
              const members = getGroupMembers(portGroupName);
              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20 cursor-help">
                        {portGroupName}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-semibold text-xs mb-1">{portGroupName}</p>
                        {members.length > 0 ? (
                          <p className="text-xs">{members.join(", ")}</p>
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

      {/* State */}
      <TableCell>
        {rule.state ? (
          <div className="flex flex-wrap gap-1">
            {rule.state.established && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                EST
              </Badge>
            )}
            {rule.state.new && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                NEW
              </Badge>
            )}
            {rule.state.related && (
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20">
                REL
              </Badge>
            )}
            {rule.state.invalid && (
              <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">
                INV
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Description */}
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {rule.description || "-"}
        </span>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge
          variant="outline"
          className={
            rule.disable
              ? "bg-red-500/10 text-red-500 border-red-500/20"
              : "bg-green-500/10 text-green-500 border-green-500/20"
          }
        >
          {rule.disable ? "disabled" : "enabled"}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onEdit}
          >
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
