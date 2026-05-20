"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SourceNATRule, DestinationNATRule, StaticNATRule } from "@/lib/api/nat";
import type { FirewallGroup } from "@/lib/api/types/firewall-groups";
import { cn } from "@/lib/utils";

type RuleType = "source" | "destination" | "static";

interface NATRuleRowProps {
  rule: SourceNATRule | DestinationNATRule | StaticNATRule;
  ruleType: RuleType;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  canWrite?: boolean;
  groups?: FirewallGroup[];
}

export function NATRuleRow({ rule, ruleType, onEdit, onDelete, isDragging, canWrite = true, groups = [] }: NATRuleRowProps) {
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
          {...(canWrite ? attributes : {})}
          {...(canWrite ? listeners : {})}
          className={cn(
            "h-full flex items-center justify-center px-2",
            canWrite && "cursor-grab active:cursor-grabbing hover:bg-primary/10 group/drag",
            !canWrite && "cursor-not-allowed opacity-50"
          )}
        >
          <GripVertical className={cn(
            "h-4 w-4 text-muted-foreground transition-colors",
            canWrite && "group-hover/drag:text-primary"
          )} />
        </div>
      </TableCell>

      {/* Rule Number */}
      <TableCell className="font-mono font-semibold text-base">
        {rule.rule_number}
      </TableCell>

      {/* Rule Type Specific Content */}
      {ruleType === "source" && <SourceNATContent rule={rule as SourceNATRule} groups={groups} />}
      {ruleType === "destination" && <DestinationNATContent rule={rule as DestinationNATRule} groups={groups} />}
      {ruleType === "static" && <StaticNATContent rule={rule as StaticNATRule} />}

      {/* Actions */}
      <TableCell>
        {canWrite && (
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
        )}
      </TableCell>
    </TableRow>
  );
}

function GroupTooltipBadge({ name, inv, members, isPort }: { name: string; inv: boolean; members: string[]; isPort?: boolean }) {
  return (
    <TooltipProvider>
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
            {inv && "!"}{name}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-semibold text-xs mb-2">{inv ? `NOT ${name}` : name}</p>
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
}

interface NATEndpointCellProps {
  address?: string | null;
  port?: string | null;
  group?: Record<string, string> | null;
  getGroupMembers: (name: string) => string[];
}

function NATEndpointCell({ address, port, group, getGroupMembers }: NATEndpointCellProps) {
  const addressGroups = group ? Object.entries(group).filter(([t]) => t !== "port-group") : [];
  const portGroupEntry = group?.["port-group"];
  const hasAnything = address || addressGroups.length > 0 || port || portGroupEntry;

  if (!hasAnything) {
    return <span className="text-sm text-muted-foreground">any</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {address && (
        <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">{address}</code>
      )}
      {addressGroups.map(([t, name]) => {
        const inv = name.startsWith("!");
        const display = inv ? name.substring(1) : name;
        return <GroupTooltipBadge key={t} name={display} inv={inv} members={getGroupMembers(name)} />;
      })}
      {port && (
        <code className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded font-mono">{port}</code>
      )}
      {portGroupEntry && (() => {
        const inv = portGroupEntry.startsWith("!");
        const display = inv ? portGroupEntry.substring(1) : portGroupEntry;
        return <GroupTooltipBadge name={display} inv={inv} members={getGroupMembers(portGroupEntry)} isPort />;
      })()}
    </div>
  );
}

function SourceNATContent({ rule, groups }: { rule: SourceNATRule; groups: FirewallGroup[] }) {
  const isMasquerade = rule.translation?.address === "masquerade";

  const getGroupMembers = (groupName: string): string[] => {
    const cleanName = groupName.startsWith("!") ? groupName.substring(1) : groupName;
    return groups.find((g) => g.name === cleanName)?.members || [];
  };

  return (
    <>
      <TableCell>
        {rule.protocol ? (
          <span className="text-sm font-medium text-foreground uppercase">
            {rule.protocol}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">all</span>
        )}
      </TableCell>
      <TableCell>
        <NATEndpointCell
          address={rule.source?.address}
          port={rule.source?.port}
          group={rule.source?.group}
          getGroupMembers={getGroupMembers}
        />
      </TableCell>
      <TableCell>
        <NATEndpointCell
          address={rule.destination?.address}
          port={rule.destination?.port}
          group={rule.destination?.group}
          getGroupMembers={getGroupMembers}
        />
      </TableCell>
      <TableCell>
        {isMasquerade ? (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            masquerade
          </Badge>
        ) : (
          <code className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded font-mono">
            {rule.translation?.address || "-"}
            {rule.translation?.port && `:${rule.translation.port}`}
          </code>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono text-xs">
          {rule.outbound_interface?.name || rule.outbound_interface?.group || "any"}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {rule.description || "-"}
        </span>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={
            rule.disable
              ? "bg-gray-500/10 text-gray-500 border-gray-500/20"
              : "bg-green-500/10 text-green-500 border-green-500/20"
          }
        >
          {rule.disable ? "disabled" : "enabled"}
        </Badge>
      </TableCell>
    </>
  );
}

function DestinationNATContent({ rule, groups }: { rule: DestinationNATRule; groups: FirewallGroup[] }) {
  const getGroupMembers = (groupName: string): string[] => {
    const cleanName = groupName.startsWith("!") ? groupName.substring(1) : groupName;
    return groups.find((g) => g.name === cleanName)?.members || [];
  };

  return (
    <>
      <TableCell>
        {rule.protocol ? (
          <span className="text-sm font-medium text-foreground uppercase">
            {rule.protocol}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">all</span>
        )}
      </TableCell>
      <TableCell>
        <NATEndpointCell
          address={rule.source?.address}
          port={rule.source?.port}
          group={rule.source?.group}
          getGroupMembers={getGroupMembers}
        />
      </TableCell>
      <TableCell>
        <NATEndpointCell
          address={rule.destination?.address}
          port={rule.destination?.port}
          group={rule.destination?.group}
          getGroupMembers={getGroupMembers}
        />
      </TableCell>
      <TableCell>
        <code className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded font-mono">
          {rule.translation?.address || "-"}
          {rule.translation?.port && `:${rule.translation.port}`}
        </code>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono text-xs">
          {rule.inbound_interface?.name || rule.inbound_interface?.group || "any"}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {rule.description || "-"}
        </span>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={
            rule.disable
              ? "bg-gray-500/10 text-gray-500 border-gray-500/20"
              : "bg-green-500/10 text-green-500 border-green-500/20"
          }
        >
          {rule.disable ? "disabled" : "enabled"}
        </Badge>
      </TableCell>
    </>
  );
}

function StaticNATContent({ rule }: { rule: StaticNATRule }) {
  return (
    <>
      <TableCell>
        <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
          {rule.destination?.address || "-"}
        </code>
      </TableCell>
      <TableCell>
        <code className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded font-mono">
          {rule.translation?.address || "-"}
        </code>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono text-xs">
          {rule.inbound_interface || "any"}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {rule.description || "-"}
        </span>
      </TableCell>
    </>
  );
}
