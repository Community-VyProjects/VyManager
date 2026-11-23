"use client";

import { useState } from "react";
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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { Loader2, AlertCircle } from "lucide-react";
import type { IsisCapabilities, IsisRedistributeEntry } from "@/lib/api/isis";
import type { ApiError } from "@/lib/types/api";
import {
  ISIS_FAMILIES,
  ISIS_ROUTE_METRIC,
  isisRedistributeAllowedLevels,
  isisRedistributeForm,
  isisRedistributeFreeLevels,
  isisRedistributeFreeProtocols,
  isisRedistributeProblem,
  type IsisFamily,
  type IsisProblem,
  type IsisRedistributeForm,
} from "@/lib/api/isis-save-ops";
import { useIsisProblemText } from "./useIsisProblemText";
import { useTranslations } from "next-intl";

interface IsisRedistributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (family: IsisFamily, original: IsisRedistributeEntry | null, form: IsisRedistributeForm) => Promise<void>;
  /** The entry being edited, or null to add one. */
  existing: { family: IsisFamily; entry: IsisRedistributeEntry } | null;
  entries: Record<IsisFamily, IsisRedistributeEntry[]>;
  routeMapNames: string[];
  capabilities: IsisCapabilities | null;
  /** Global ``level``; verify rejects redistribute at the other single level. */
  globalLevel: string | null;
  /** Blocks the save while IS-IS is not configured (the Add button is hidden then too). */
  setupProblem: IsisProblem | null;
}

/** Mount with a fresh ``key`` per open: the form is read once from ``existing``. */
export function IsisRedistributeModal({
  open,
  onOpenChange,
  onSubmit,
  existing,
  entries,
  routeMapNames,
  capabilities,
  globalLevel,
  setupProblem,
}: IsisRedistributeModalProps) {
  const t = useTranslations("isis");
  const tc = useTranslations("common");
  const problemText = useIsisProblemText();
  const isEdit = !!existing;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [family, setFamily] = useState<IsisFamily>(existing?.family ?? "ipv4");
  const [form, setForm] = useState<IsisRedistributeForm>(() => isisRedistributeForm(existing?.entry ?? null));

  const protocols = capabilities?.redistribute_protocols[family] ?? [];
  // Add offers only combinations that are not configured yet and that the global level allows.
  const protocolOptions = isEdit
    ? [form.protocol]
    : isisRedistributeFreeProtocols(entries[family], protocols, globalLevel);
  const levelOptions: readonly string[] = isEdit
    ? [form.level]
    : form.protocol
      ? isisRedistributeFreeLevels(entries[family], form.protocol, globalLevel)
      : isisRedistributeAllowedLevels(globalLevel);

  const handleSubmit = async () => {
    const original = existing?.entry ?? null;
    const problem = setupProblem ?? isisRedistributeProblem(original, form, entries[family], globalLevel);
    if (problem) {
      setError(problemText(problem));
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSubmit(family, original, form);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || t("redistributeModal.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("redistributeModal.titleEdit") : t("redistributeModal.title")}</DialogTitle>
          <DialogDescription>{t("redistributeModal.description")}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="isis-redist-family">{t("fields.addressFamily")}</Label>
            <Select
              value={family}
              disabled={isEdit}
              onValueChange={(v) => { setFamily(v as IsisFamily); setForm({ ...form, protocol: "", level: "" }); }}
            >
              <SelectTrigger id="isis-redist-family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISIS_FAMILIES.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="isis-redist-protocol">{t("fields.protocol")}</Label>
            <Select value={form.protocol} disabled={isEdit} onValueChange={(v) => setForm({ ...form, protocol: v, level: "" })}>
              <SelectTrigger id="isis-redist-protocol">
                <SelectValue placeholder={t("fields.selectProtocol")} />
              </SelectTrigger>
              <SelectContent>
                {protocolOptions.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="isis-redist-level">{t("fields.isisLevel")}</Label>
            <Select value={form.level} disabled={isEdit} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger id="isis-redist-level">
                <SelectValue placeholder={t("fields.selectLevel")} />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="isis-redist-metric">{t("fields.metricOptional")}</Label>
            <Input
              id="isis-redist-metric"
              type="number"
              value={form.metric}
              onChange={(e) => setForm({ ...form, metric: e.target.value })}
              placeholder={tc("default")}
              min={ISIS_ROUTE_METRIC.min}
              max={ISIS_ROUTE_METRIC.max}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="isis-redist-route-map">{t("fields.routeMapOptional")}</Label>
            <NamedListSelect
              id="isis-redist-route-map"
              value={form.route_map}
              names={routeMapNames}
              onValueChange={(v) => setForm({ ...form, route_map: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? tc("saveChanges") : t("fields.addRedistribute")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
