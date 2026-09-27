"use client";

import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PPPoESessionLabelDefinition, PPPoESessionLabelRule } from "@/lib/api/pppoe-server";

const METRIC_OPTIONS: { value: NonNullable<PPPoESessionLabelRule["numerator"]>; label: "rxBytes" | "txBytes" | "rxRate" | "txRate" }[] = [
  { value: "rx_bytes", label: "rxBytes" },
  { value: "tx_bytes", label: "txBytes" },
  { value: "rxRate", label: "rxRate" },
  { value: "txRate", label: "txRate" },
];

interface SessionLabelRegistryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: PPPoESessionLabelDefinition[];
  onDraftChange: (next: PPPoESessionLabelDefinition[]) => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}

export function SessionLabelRegistryDialog({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  onSave,
  saving,
  error,
}: SessionLabelRegistryDialogProps) {
  const t = useTranslations("pppoeServer.labelRegistry");
  const tc = useTranslations("common");
  const updateAt = (index: number, patch: Partial<PPPoESessionLabelDefinition>) => {
    onDraftChange(draft.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const updateRuleAt = (index: number, patch: Partial<PPPoESessionLabelRule>) => {
    onDraftChange(
      draft.map((item, i) =>
        i === index
          ? { ...item, rules: { type: "ratio", ...(item.rules ?? {}), ...patch } }
          : item
      )
    );
  };

  const addLabel = () => {
    onDraftChange([
      ...draft,
      {
        code: `custom-label-${Date.now()}`,
        name: "New label",
        description: "",
        severity: "info",
        priority: 10,
        enabled: true,
        rules: {
          type: "ratio",
          numerator: "rx_bytes",
          denominator: "tx_bytes",
          operator: ">",
          factor: 0.1,
        },
      },
    ]);
  };

  const removeAt = (index: number) => {
    onDraftChange(draft.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {draft.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("empty")}
            </p>
          ) : (
            draft.map((label, index) => (
              <div
                key={`${label.code}-${index}`}
                className="rounded-lg border bg-muted/10 p-4 space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="grid gap-3 sm:grid-cols-2 flex-1">
                    <div className="space-y-1.5">
                      <Label htmlFor={`label-code-${index}`}>{t("code")}</Label>
                      <Input
                        id={`label-code-${index}`}
                        value={label.code ?? ""}
                        onChange={(e) => updateAt(index, { code: e.target.value })}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`label-name-${index}`}>{t("displayName")}</Label>
                      <Input
                        id={`label-name-${index}`}
                        value={label.name ?? ""}
                        onChange={(e) => updateAt(index, { name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor={`label-desc-${index}`}>{tc("description")}</Label>
                      <Input
                        id={`label-desc-${index}`}
                        value={label.description ?? ""}
                        onChange={(e) => updateAt(index, { description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`label-priority-${index}`}>{t("priority")}</Label>
                      <Input
                        id={`label-priority-${index}`}
                        type="number"
                        value={label.priority ?? 10}
                        onChange={(e) => updateAt(index, { priority: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`label-severity-${index}`}>{t("severity")}</Label>
                        <Select
                          value={label.severity ?? "info"}
                          onValueChange={(value) => updateAt(index, { severity: value })}
                        >
                          <SelectTrigger id={`label-severity-${index}`} className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">{t("severityInfo")}</SelectItem>
                            <SelectItem value="warning">{t("severityWarning")}</SelectItem>
                            <SelectItem value="danger">{t("severityDanger")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`label-enabled-${index}`}>{tc("enabled")}</Label>
                        <Select
                          value={label.enabled === false ? "false" : "true"}
                          onValueChange={(value) => updateAt(index, { enabled: value === "true" })}
                        >
                          <SelectTrigger id={`label-enabled-${index}`} className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">{t("yes")}</SelectItem>
                            <SelectItem value="false">{t("no")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 hover:bg-destructive/10"
                    onClick={() => removeAt(index)}
                    title={t("removeLabel")}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="rounded-md border border-dashed p-3 space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("ratioRule")}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label>{t("numerator")}</Label>
                      <Select
                        value={label.rules?.numerator ?? "rx_bytes"}
                        onValueChange={(value) =>
                          updateRuleAt(index, {
                            numerator: value as PPPoESessionLabelRule["numerator"],
                          })
                        }
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {METRIC_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{t(`metrics.${opt.label}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("denominator")}</Label>
                      <Select
                        value={label.rules?.denominator ?? "tx_bytes"}
                        onValueChange={(value) =>
                          updateRuleAt(index, {
                            denominator: value as PPPoESessionLabelRule["denominator"],
                          })
                        }
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {METRIC_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{t(`metrics.${opt.label}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("operator")}</Label>
                      <Select
                        value={label.rules?.operator ?? ">"}
                        onValueChange={(value) =>
                          updateRuleAt(index, {
                            operator: value as PPPoESessionLabelRule["operator"],
                          })
                        }
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">&gt;</SelectItem>
                          <SelectItem value=">=">&ge;</SelectItem>
                          <SelectItem value="<">&lt;</SelectItem>
                          <SelectItem value="<=">&le;</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("factor")}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={label.rules?.factor ?? 0.1}
                        onChange={(e) => updateRuleAt(index, { factor: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-6 py-4 shrink-0">
          <Button variant="outline" size="sm" onClick={addLabel}>
            <Plus className="h-4 w-4 mr-2" /> {t("newLabel")}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" /> {tc("cancel")}
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? t("saving") : t("saveRegistry")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
