"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import type { PrefixListRule } from "@/lib/api/prefix-list";
import { useTranslations } from "next-intl";

interface PrefixListRuleRowProps {
  rule: PrefixListRule;
  onEdit: (rule: PrefixListRule) => void;
  onDelete: (rule: PrefixListRule) => void;
  canWrite: boolean;
  /** Drag is off while a save or reload runs. */
  dragDisabled: boolean;
  /** Edit and delete are off while a reorder is pending or a save runs. */
  disabled: boolean;
}

const empty = <span className="text-muted-foreground text-sm">—</span>;

export function PrefixListRuleRow({ rule, onEdit, onDelete, canWrite, dragDisabled, disabled }: PrefixListRuleRowProps) {
  const t = useTranslations("prefixList");
  const tc = useTranslations("common");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.rule_number,
    disabled: !canWrite || dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="group">
      <TableCell>
        {canWrite && (
          <button
            {...attributes}
            {...listeners}
            type="button"
            aria-label={t("page.dragRule", { number: String(rule.rule_number) })}
            disabled={dragDisabled}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </TableCell>
      <TableCell className="font-mono font-semibold text-base">{rule.rule_number}</TableCell>
      <TableCell>
        {rule.action ? (
          <Badge
            variant="outline"
            className={
              rule.action === "permit"
                ? "bg-green-500/10 text-green-500 border-green-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20"
            }
          >
            {rule.action === "permit" ? t("form.permit") : rule.action === "deny" ? t("form.deny") : rule.action}
          </Badge>
        ) : (
          empty
        )}
      </TableCell>
      <TableCell>{rule.description || empty}</TableCell>
      <TableCell>
        {rule.prefix ? (
          <Badge variant="secondary" className="text-xs font-mono">
            {rule.prefix}
          </Badge>
        ) : (
          empty
        )}
      </TableCell>
      <TableCell>
        {rule.ge != null ? (
          <Badge variant="outline" className="text-xs font-mono">
            {rule.ge}
          </Badge>
        ) : (
          empty
        )}
      </TableCell>
      <TableCell>
        {rule.le != null ? (
          <Badge variant="outline" className="text-xs font-mono">
            {rule.le}
          </Badge>
        ) : (
          empty
        )}
      </TableCell>
      <TableCell className="text-right">
        {canWrite && (
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={() => onEdit(rule)} className="h-8" disabled={disabled}>
              <Pencil className="h-4 w-4 mr-1" />
              {tc("edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(rule)}
              className="h-8 text-destructive hover:text-destructive"
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {tc("delete")}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
