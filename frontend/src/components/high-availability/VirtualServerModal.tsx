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
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import type { ApiError } from "@/lib/types/api";
import type { HACapabilities, VirtualServer } from "@/lib/api/high-availability";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import {
  HA_RANGES,
  virtualServerDraft,
  virtualServerProblem,
  type HAProblem,
  type HARealServerDraft,
  type VirtualServerDraft,
  type VirtualServerProblemKey,
} from "@/lib/api/high-availability-save-ops";
import { HA_FIELD_LABELS } from "./ha-field-labels";

interface VirtualServerModalProps {
  onOpenChange: (open: boolean) => void;
  existingServer?: VirtualServer | null;
  existingNames: string[];
  capabilities?: HACapabilities | null;
  onSubmit: (draft: VirtualServerDraft) => Promise<void>;
}

const emptyRealServer = (): HARealServerDraft => ({
  address: "",
  port: "",
  connection_timeout: "",
  health_check_script: "",
});

/** A Select of capability values with a default item that clears the leaf. */
function ValueSelect({
  value,
  onChange,
  options,
  noneLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  noneLabel: string;
}) {
  return (
    <Select value={value || NONE_SENTINEL} onValueChange={(v) => onChange(v === NONE_SENTINEL ? "" : v)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_SENTINEL}>{noneLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>{option}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Rendered only while open, so the draft starts from the server each time. */
export function VirtualServerModal({
  onOpenChange,
  existingServer,
  existingNames,
  capabilities,
  onSubmit,
}: VirtualServerModalProps) {
  const t = useTranslations("highAvailability");
  const tc = useTranslations("common");
  const isEdit = !!existingServer;
  const persistence = capabilities?.persistence_timeout ?? { min: 1, max: 86400 };
  const [draft, setDraft] = useState<VirtualServerDraft>(() => virtualServerDraft(existingServer));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof VirtualServerDraft>(field: K) => (value: VirtualServerDraft[K]) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const setRealServer = (idx: number, field: keyof HARealServerDraft, value: string) => {
    setDraft((prev) => {
      const real_servers = [...prev.real_servers];
      real_servers[idx] = { ...real_servers[idx], [field]: value };
      return { ...prev, real_servers };
    });
  };

  const problemText = (problem: HAProblem<VirtualServerProblemKey>): string => {
    if (problem.key === "outOfRange") {
      const values = {
        field: t(HA_FIELD_LABELS[problem.field!]),
        min: problem.min!,
        max: problem.max!,
      };
      return problem.address
        ? t("realServerOutOfRange", { ...values, address: problem.address })
        : t("outOfRange", values);
    }
    return t(`vsModal.${problem.key}`, { address: problem.address ?? "" });
  };

  const close = (open: boolean) => {
    if (!loading) onOpenChange(open);
  };

  const handleSubmit = async () => {
    setError(null);
    const problem = virtualServerProblem(existingServer ?? null, draft, existingNames, persistence);
    if (problem) {
      setError(problemText(problem));
      return;
    }
    setLoading(true);
    try {
      await onSubmit(draft);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? t("vsModal.editTitle") : t("vs.add")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("vsModal.editingDescription", { name: existingServer!.name })
              : t("vsModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="space-y-5 py-2">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive whitespace-pre-wrap font-mono leading-relaxed">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{t("vsModal.serverName")} <span className="text-destructive">*</span></Label>
              <Input
                value={draft.name}
                onChange={(e) => set("name")(e.target.value)}
                disabled={isEdit}
                placeholder={t("example", { value: "web-lb" })}
                className={isEdit ? "opacity-60" : ""}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>{t("vsModal.virtualIpAddress")}</Label>
                <Input
                  value={draft.address}
                  onChange={(e) => set("address")(e.target.value)}
                  placeholder="10.0.0.100"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("port")}</Label>
                <Input
                  type="number"
                  {...HA_RANGES.port}
                  value={draft.port}
                  onChange={(e) => set("port")(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("vsModal.fwMark")}</Label>
                <Input
                  type="number"
                  {...HA_RANGES.fwmark}
                  value={draft.fwmark}
                  onChange={(e) => set("fwmark")(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>{t("protocol")}</Label>
                <ValueSelect
                  value={draft.protocol}
                  onChange={set("protocol")}
                  options={capabilities?.protocols || []}
                  noneLabel={tc("default")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("algorithm")}</Label>
                <ValueSelect
                  value={draft.algorithm}
                  onChange={set("algorithm")}
                  options={capabilities?.algorithms || []}
                  noneLabel={tc("default")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("vsModal.forwardMethod")}</Label>
                <ValueSelect
                  value={draft.forward_method}
                  onChange={set("forward_method")}
                  options={capabilities?.forward_methods || []}
                  noneLabel={tc("default")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("vsModal.delayLoop")}</Label>
                <Input
                  type="number"
                  {...HA_RANGES.delay_loop}
                  value={draft.delay_loop}
                  onChange={(e) => set("delay_loop")(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("vsModal.persistenceTimeout")}</Label>
                <Input
                  type="number"
                  min={persistence.min}
                  max={persistence.max}
                  value={draft.persistence_timeout}
                  onChange={(e) => set("persistence_timeout")(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t("realServers")} <span className="text-destructive">*</span></Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => set("real_servers")([...draft.real_servers, emptyRealServer()])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t("vsModal.addServer")}
                </Button>
              </div>

              {draft.real_servers.length === 0 ? (
                <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                  {t("vsModal.noRealServers")}
                </div>
              ) : (
                <div className="space-y-3">
                  {draft.real_servers.map((rs, idx) => (
                    <div key={idx} className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {t("vsModal.serverN", { n: idx + 1 })}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => set("real_servers")(draft.real_servers.filter((_, i) => i !== idx))}
                          aria-label={t("remove")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            {t("vsModal.ipAddress")} <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={rs.address}
                            onChange={(e) => setRealServer(idx, "address", e.target.value)}
                            placeholder="10.0.0.10"
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            {t("port")} <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            {...HA_RANGES.port}
                            value={rs.port}
                            onChange={(e) => setRealServer(idx, "port", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{t("vsModal.connectionTimeout")}</Label>
                          <Input
                            type="number"
                            {...HA_RANGES.connection_timeout}
                            value={rs.connection_timeout}
                            onChange={(e) => setRealServer(idx, "connection_timeout", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{t("vsModal.healthCheckScript")}</Label>
                          <Input
                            value={rs.health_check_script}
                            onChange={(e) => setRealServer(idx, "health_check_script", e.target.value)}
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => close(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? tc("saveChanges") : t("vsModal.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
