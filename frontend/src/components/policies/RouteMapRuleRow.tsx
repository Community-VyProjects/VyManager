"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import type { RouteMapRule } from "@/lib/api/route-map";
import { cn } from "@/lib/utils";
import {
  routeMapMatchOverviewBadges,
  routeMapRuleCounts,
  routeMapSetOverviewBadges,
  type RouteMapOverviewBadge,
  type RouteMapSetBadgeTone,
} from "./route-map-overview";

interface RouteMapRuleRowProps {
  rule: RouteMapRule;
  onEdit: (rule: RouteMapRule) => void;
  onDelete: (rule: RouteMapRule) => void;
  canWrite: boolean;
  /** Drag is off while a save or reload runs. */
  dragDisabled: boolean;
  /** Edit and delete are off while a reorder is pending or a save runs. */
  disabled: boolean;
}

const empty = <span className="text-muted-foreground text-sm">—</span>;

const TONES: Record<RouteMapSetBadgeTone, string> = {
  purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  yellow: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  green: "bg-green-500/10 text-green-500 border-green-500/20",
};

/**
 * The text of one overview badge (`{label}: {value}`). The row and the page's
 * rule search both use it, so a value the row shows is one the search finds.
 */
export function useOverviewBadgeText(): (badge: RouteMapOverviewBadge) => string {
  const t = useTranslations("routeMap");
  const tr = useTranslations("routeMapRuleModal");
  return ({ label, value }) =>
    t("row.badge", { label: label.catalog === "routeMap" ? t(label.key) : tr(label.key), value });
}

export function RouteMapRuleRow({ rule, onEdit, onDelete, canWrite, dragDisabled, disabled }: RouteMapRuleRowProps) {
  const t = useTranslations("routeMap");
  const tr = useTranslations("routeMapRuleModal");
  const tc = useTranslations("common");
  const badgeText = useOverviewBadgeText();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.rule_number,
    disabled: !canWrite || dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const counts = routeMapRuleCounts(rule);

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
      <TableCell>
        <Badge variant="outline" className="font-mono">
          {rule.rule_number}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={
            rule.action === "permit"
              ? "bg-green-500/10 text-green-500 border-green-500/20"
              : "bg-red-500/10 text-red-500 border-red-500/20"
          }
        >
          {rule.action === "permit" ? tr("permit") : rule.action === "deny" ? tr("deny") : rule.action}
        </Badge>
      </TableCell>
      <TableCell>{rule.description || empty}</TableCell>
      <TableCell>
        {counts.match > 0 ? (
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              {t("row.conditions", { count: counts.match })}
            </Badge>
            {routeMapMatchOverviewBadges(rule.match).map((badge) => (
              <Badge key={badge.label.key} variant="secondary" className="text-xs">
                {badgeText(badge)}
              </Badge>
            ))}
          </div>
        ) : (
          empty
        )}
      </TableCell>
      <TableCell>
        {counts.set > 0 ? (
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
              {t("row.actions", { count: counts.set })}
            </Badge>
            {routeMapSetOverviewBadges(rule.set).map((badge) => (
              <Badge key={badge.label.key} variant="secondary" className={cn("text-xs", TONES[badge.tone])}>
                {badgeText(badge)}
              </Badge>
            ))}
          </div>
        ) : (
          empty
        )}
      </TableCell>
      <TableCell className="text-right">
        {canWrite && (
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
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
