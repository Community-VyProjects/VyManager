"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { vrfService, type VrfRpkiConfig } from "@/lib/api/vrf";
import {
  RPKI_RANGES,
  emptyVrfRpkiCache,
  vrfRpkiFields,
  vrfRpkiProblem,
  type RpkiRangeField,
  type VrfRpkiCacheFields,
  type VrfRpkiProblem,
} from "@/lib/api/vrf-rpki-save-ops";
import { pkiService } from "@/lib/api/pki";
import type { ApiError } from "@/lib/types/api";

interface RpkiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vrfName: string;
  rpki: VrfRpkiConfig | null | undefined;
  canWrite: boolean;
  onSaved: () => void;
}

const RANGE_LABEL: Record<RpkiRangeField, "expireInterval" | "pollingPeriod" | "retryInterval" | "port" | "preference"> = {
  expire: "expireInterval",
  polling: "pollingPeriod",
  retry: "retryInterval",
  port: "port",
  preference: "preference",
};

export function RpkiModal({ open, onOpenChange, vrfName, rpki, canWrite, onSaved }: RpkiModalProps) {
  const t = useTranslations("vrfProtocols");
  const tc = useTranslations("common");
  const initial = useMemo(() => vrfRpkiFields(rpki), [rpki]);

  const [expire, setExpire] = useState(initial.expire);
  const [polling, setPolling] = useState(initial.polling);
  const [retry, setRetry] = useState(initial.retry);
  const [caches, setCaches] = useState<VrfRpkiCacheFields[]>(initial.caches);
  const [opensshKeys, setOpensshKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seedKey = open ? JSON.stringify(initial) : "";
  const [seed, setSeed] = useState(seedKey);
  if (seedKey !== seed) {
    setSeed(seedKey);
    setExpire(initial.expire);
    setPolling(initial.polling);
    setRetry(initial.retry);
    setCaches(initial.caches);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    pkiService
      .getConfig()
      .then((pki) => {
        if (live) setOpensshKeys(pki.openssh.map((key) => key.name));
      })
      .catch(() => {
        if (live) setOpensshKeys([]);
      });
    return () => {
      live = false;
    };
  }, [open]);

  // A save in flight keeps the modal open so its result is shown.
  const handleOpenChange = (next: boolean) => {
    if (!next && saving) return;
    onOpenChange(next);
  };

  const updateCache = (i: number, patch: Partial<VrfRpkiCacheFields>) =>
    setCaches(caches.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const problemMessage = (problem: VrfRpkiProblem): string => {
    if (problem.key === "range") {
      const label = t(`rpki.${RANGE_LABEL[problem.field]}`);
      if (problem.name) return t("rpki.cacheRange", { name: problem.name, label, min: problem.min, max: problem.max });
      return t("rpki.range", { label, min: problem.min, max: problem.max });
    }
    if (problem.key === "cacheNameRequired") return t("rpki.cacheNameRequired");
    return t(`rpki.${problem.key}`, { name: problem.name });
  };

  const handleSave = async () => {
    const updated = { expire, polling, retry, caches };
    const problem = vrfRpkiProblem(updated);
    if (problem) {
      setError(problemMessage(problem));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await vrfService.saveRpki(vrfName, initial, updated);
      if (result && !result.success) {
        setError(result.error || tc("operationFailed"));
        return;
      }
      if (result) onSaved();
      onOpenChange(false);
    } catch (e) {
      setError((e as ApiError).message || tc("operationFailed"));
    } finally {
      setSaving(false);
    }
  };

  const disabled = !canWrite || saving;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh]">
        <DialogHeader>
          <DialogTitle>{t("rpki.modalTitle", { vrf: vrfName })}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[64vh] pr-4">
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-semibold mb-2">{t("rpki.intervals")}</h4>
              <div className="grid grid-cols-3 gap-3">
                <Field label={t("rpki.expireInterval")} value={expire} range="expire" disabled={disabled} onChange={setExpire} />
                <Field label={t("rpki.pollingPeriod")} value={polling} range="polling" disabled={disabled} onChange={setPolling} />
                <Field label={t("rpki.retryInterval")} value={retry} range="retry" disabled={disabled} onChange={setRetry} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{t("rpki.caches")}</h4>
                {!disabled && (
                  <Button size="sm" variant="outline" onClick={() => setCaches([...caches, emptyVrfRpkiCache()])}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t("rpki.addCache")}
                  </Button>
                )}
              </div>
              {caches.length === 0 && <p className="text-xs text-muted-foreground">{t("rpki.none")}</p>}
              {caches.map((c, i) => (
                <div key={i} className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input className="h-8 font-mono" placeholder={t("rpki.cacheNamePlaceholder")} value={c.name} disabled={disabled} onChange={(e) => updateCache(i, { name: e.target.value })} />
                    {!disabled && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCaches(caches.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label={t("rpki.port")} value={c.port} range="port" disabled={disabled} onChange={(v) => updateCache(i, { port: v })} />
                    <Field label={t("rpki.preference")} value={c.preference} range="preference" disabled={disabled} onChange={(v) => updateCache(i, { preference: v })} />
                    <Field label={t("rpki.sourceAddress")} value={c.sourceAddress} disabled={disabled} onChange={(v) => updateCache(i, { sourceAddress: v })} />
                    <Field label={t("rpki.sshUsername")} value={c.sshUsername} disabled={disabled} onChange={(v) => updateCache(i, { sshUsername: v })} />
                    <div className="space-y-1">
                      <Label className="text-[11px]">{t("rpki.sshKey")}</Label>
                      <NamedListSelect
                        value={c.sshKey}
                        names={opensshKeys}
                        disabled={disabled}
                        onValueChange={(v) => updateCache(i, { sshKey: v })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <pre className="whitespace-pre-wrap break-words font-mono text-xs">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={disabled}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  range,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  range?: RpkiRangeField;
}) {
  const bounds = range ? RPKI_RANGES[range] : undefined;
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <Input
        className="h-8"
        type={bounds ? "number" : "text"}
        min={bounds?.min}
        max={bounds?.max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
