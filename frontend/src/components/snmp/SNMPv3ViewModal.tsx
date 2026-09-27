"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { snmpService, SNMPv3View, SNMPv3ViewOid } from "@/lib/api/snmp";
import { SNMPMultiValueField } from "./SNMPMultiValueField";

interface SNMPv3ViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPv3View | null;
  existingNames: string[];
  onSuccess: () => void;
}

interface EditableOid {
  oid: string;
  mask: string;
  exclude: string[];
}

function toEditable(oids: SNMPv3ViewOid[]): EditableOid[] {
  return oids.map((o) => ({ oid: o.oid, mask: o.mask ?? "", exclude: o.exclude }));
}

export function SNMPv3ViewModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  onSuccess,
}: SNMPv3ViewModalProps) {
  const t = useTranslations("snmp");
  const tc = useTranslations("common");
  const isEdit = existing !== null;
  const [name, setName] = useState(existing?.name ?? "");
  const [oids, setOids] = useState<EditableOid[]>(
    existing ? toEditable(existing.oids) : []
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOid = (index: number, patch: Partial<EditableOid>) => {
    setOids((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  };

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      setError(t("view.nameRequired"));
      return;
    }
    if (!isEdit && existingNames.includes(n)) {
      setError(t("view.exists", { name: n }));
      return;
    }
    const cleaned = oids
      .map((o) => ({ ...o, oid: o.oid.trim() }))
      .filter((o) => o.oid !== "");
    const keys = cleaned.map((o) => o.oid);
    if (new Set(keys).size !== keys.length) {
      setError(t("view.duplicateOid"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveV3View(existing, {
        name: n,
        oids: cleaned.map((o) => ({
          oid: o.oid,
          mask: o.mask.trim() || null,
          exclude: o.exclude,
        })),
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("view.editTitle") : t("view.addTitle")}</DialogTitle>
          <DialogDescription>
            {t("view.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="view-name">{t("view.name")}</Label>
              <Input
                id="view-name"
                placeholder={t("view.namePlaceholder")}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isEdit}
                className={isEdit ? "font-mono bg-muted" : "font-mono"}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t("content.oidSubtrees")}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setOids((prev) => [...prev, { oid: "", mask: "", exclude: [] }])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("view.addOid")}
                </Button>
              </div>

              {oids.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("view.noOids")}
                </p>
              ) : (
                oids.map((oid, index) => (
                  <div
                    key={index}
                    className="space-y-3 rounded-md border border-border p-3"
                  >
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs font-medium">OID</Label>
                        <Input
                          placeholder={t("view.oidPlaceholder")}
                          value={oid.oid}
                          onChange={(e) => updateOid(index, { oid: e.target.value })}
                          className="font-mono"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() =>
                          setOids((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t("view.mask")}</Label>
                      <Input
                        placeholder={t("view.maskPlaceholder")}
                        value={oid.mask}
                        onChange={(e) => updateOid(index, { mask: e.target.value })}
                        className="font-mono"
                      />
                    </div>

                    <SNMPMultiValueField
                      label={t("view.excludedOids")}
                      description={t("view.excludedOidsHelp")}
                      placeholder={t("view.excludedPlaceholder")}
                      values={oid.exclude}
                      onChange={(vals) => updateOid(index, { exclude: vals })}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? tc("save") : tc("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
