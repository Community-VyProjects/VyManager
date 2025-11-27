"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import type { SourceNATRule, DestinationNATRule, StaticNATRule } from "@/lib/api/nat";
import { cn } from "@/lib/utils";

type RuleType = "source" | "destination" | "static";

interface NATRuleRowProps {
  rule: SourceNATRule | DestinationNATRule | StaticNATRule;
  ruleType: RuleType;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}

export function NATRuleRow({ rule, ruleType, onEdit, onDelete, isDragging }: NATRuleRowProps) {
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

      {/* Rule Type Specific Content */}
      {ruleType === "source" && <SourceNATContent rule={rule as SourceNATRule} />}
      {ruleType === "destination" && <DestinationNATContent rule={rule as DestinationNATRule} />}
      {ruleType === "static" && <StaticNATContent rule={rule as StaticNATRule} />}

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

function SourceNATContent({ rule }: { rule: SourceNATRule }) {
  const isMasquerade = rule.translation?.address === "masquerade";

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
        <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
          {rule.source?.address || "any"}
          {rule.source?.port && `:${rule.source.port}`}
        </code>
      </TableCell>
      <TableCell>
        <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
          {rule.destination?.address || "any"}
          {rule.destination?.port && `:${rule.destination.port}`}
        </code>
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
          {rule.outbound_interface?.name || "any"}
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

function DestinationNATContent({ rule }: { rule: DestinationNATRule }) {
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
        <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
          {rule.destination?.address || "any"}
          {rule.destination?.port && `:${rule.destination.port}`}
        </code>
      </TableCell>
      <TableCell>
        <code className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded font-mono">
          {rule.translation?.address || "-"}
          {rule.translation?.port && `:${rule.translation.port}`}
        </code>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono text-xs">
          {rule.inbound_interface?.name || "any"}
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
