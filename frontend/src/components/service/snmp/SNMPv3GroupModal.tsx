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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { snmpService, SNMPv3Group, SNMPCapabilities } from "@/lib/api/snmp";

interface SNMPv3GroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPv3Group | null;
  existingNames: string[];
  viewNames: string[];
  capabilities: SNMPCapabilities;
  onSuccess: () => void;
}

const DEFAULT = "__default__";

const SECLEVEL_LABELS: Record<string, "group.seclevelNoauth" | "group.seclevelAuth" | "group.seclevelPriv"> = {
  noauth: "group.seclevelNoauth",
  auth: "group.seclevelAuth",
  priv: "group.seclevelPriv",
};

export function SNMPv3GroupModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  viewNames,
  capabilities,
  onSuccess,
}: SNMPv3GroupModalProps) {
  const t = useTranslations("snmp");
  const tc = useTranslations("common");
  const isEdit = existing !== null;
  const v3 = capabilities.features.v3;

  const [name, setName] = useState(existing?.name ?? "");
  const [mode, setMode] = useState(existing?.mode ?? DEFAULT);
  const [seclevel, setSeclevel] = useState(existing?.seclevel ?? DEFAULT);
  const [view, setView] = useState(existing?.view ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      setError(t("group.nameRequired"));
      return;
    }
    if (!isEdit && existingNames.includes(n)) {
      setError(t("group.exists", { name: n }));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveV3Group(existing, {
        name: n,
        mode: mode === DEFAULT ? "" : mode,
        seclevel: seclevel === DEFAULT ? "" : seclevel,
        view: view.trim(),
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("group.editTitle") : t("group.addTitle")}</DialogTitle>
          <DialogDescription>
            {t("group.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">{t("group.name")}</Label>
            <Input
              id="group-name"
              placeholder={t("group.namePlaceholder")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              disabled={isEdit}
              className={isEdit ? "font-mono bg-muted" : "font-mono"}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("group.accessMode")}</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT}>{t("group.defaultReadOnly")}</SelectItem>
                {v3.mode_values.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m === "ro" ? t("community.readOnlyRo") : t("community.readWriteRw")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("content.securityLevel")}</Label>
            <Select value={seclevel} onValueChange={setSeclevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT}>{t("group.defaultSeclevel")}</SelectItem>
                {v3.seclevel_values.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SECLEVEL_LABELS[s] ? t(SECLEVEL_LABELS[s]) : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("content.view")}</Label>
            {viewNames.length > 0 ? (
              <Select
                value={view === "" ? DEFAULT : view}
                onValueChange={(v) => setView(v === DEFAULT ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("group.selectView")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT}>{tc("none")}</SelectItem>
                  {viewNames.map((vn) => (
                    <SelectItem key={vn} value={vn}>
                      {vn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder={t("group.viewNamePlaceholder")}
                value={view}
                onChange={(e) => setView(e.target.value)}
                className="font-mono"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {t("group.viewHelp")}
            </p>
          </div>
        </div>

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
