"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2 } from "lucide-react";
import type { VrrpSyncGroup, VrrpGroup, HACapabilities } from "@/lib/api/high-availability";

interface SyncGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingGroup?: VrrpSyncGroup | null;
  vrrpGroups: VrrpGroup[];
  capabilities?: HACapabilities | null;
  onSubmit: (group: VrrpSyncGroup) => Promise<void>;
}

interface FormState {
  name: string;
  members: string[];
  hc_failure_count: string;
  hc_interval: string;
  hc_ping: string;
  hc_script: string;
  hc_timeout: string;
}

const emptyForm = (): FormState => ({
  name: "",
  members: [],
  hc_failure_count: "",
  hc_interval: "",
  hc_ping: "",
  hc_script: "",
  hc_timeout: "",
});

function groupToForm(g: VrrpSyncGroup): FormState {
  return {
    name: g.name,
    members: [...g.members],
    hc_failure_count: g.health_check.failure_count ?? "",
    hc_interval: g.health_check.interval ?? "",
    hc_ping: g.health_check.ping ?? "",
    hc_script: g.health_check.script ?? "",
    hc_timeout: g.health_check.timeout ?? "",
  };
}

export function SyncGroupModal({
  open,
  onOpenChange,
  existingGroup,
  vrrpGroups,
  capabilities,
  onSubmit,
}: SyncGroupModalProps) {
  const t = useTranslations("highAvailability");
  const tc = useTranslations("common");
  const isEdit = !!existingGroup;
  const timeoutSupported = capabilities?.features.health_check_timeout?.supported ?? false;
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(existingGroup ? groupToForm(existingGroup) : emptyForm());
      setError(null);
    }
  }, [open, existingGroup]);

  const toggleMember = (name: string) => {
    setForm((prev) => ({
      ...prev,
      members: prev.members.includes(name)
        ? prev.members.filter((m) => m !== name)
        : [...prev.members, name],
    }));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!form.name.trim()) { setError(t("syncModal.nameRequired")); return; }
    if (form.members.length === 0) { setError(t("syncModal.membersRequired")); return; }

    setLoading(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        members: form.members,
        health_check: {
          failure_count: form.hc_failure_count.trim() || null,
          interval: form.hc_interval.trim() || null,
          ping: form.hc_ping.trim() || null,
          script: form.hc_script.trim() || null,
          timeout: timeoutSupported ? (form.hc_timeout.trim() || null) : null,
        },
        transition_script: existingGroup?.transition_script ?? {
          backup: null, fault: null, master: null, stop: null,
        },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? t("syncModal.editTitle") : t("sync.add")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("syncModal.editingDescription", { name: existingGroup!.name })
              : t("syncModal.addDescription")}
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
              <Label>{t("syncModal.name")} <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                disabled={isEdit}
                placeholder={t("syncModal.namePlaceholder")}
                className={isEdit ? "opacity-60" : ""}
              />
              {isEdit && <p className="text-xs text-muted-foreground">{t("nameCannotChange")}</p>}
            </div>

            <Separator />

            {/* Members */}
            <div className="space-y-3">
              <div>
                <Label>{t("syncModal.members")} <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("syncModal.membersHelp")}
                </p>
              </div>

              {vrrpGroups.length === 0 ? (
                <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                  {t("syncModal.noVrrpGroups")}
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {vrrpGroups.map((g) => (
                    <div
                      key={g.name}
                      className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer"
                      onClick={() => toggleMember(g.name)}
                    >
                      <Checkbox
                        id={`member-${g.name}`}
                        checked={form.members.includes(g.name)}
                        onCheckedChange={() => toggleMember(g.name)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{g.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("syncModal.memberSummary", { vrid: g.vrid ?? "?", iface: g.interface ?? "?", count: g.addresses.length })}
                        </p>
                      </div>
                      {g.disabled && <Badge variant="secondary" className="text-xs">{tc("disabled")}</Badge>}
                    </div>
                  ))}
                </div>
              )}

              {form.members.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("syncModal.membersSelected", { count: form.members.length })}
                </p>
              )}
            </div>

            <Separator />

            {/* Health Check */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("healthCheckOptional")}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("pingTarget")}</Label>
                  <Input
                    value={form.hc_ping}
                    onChange={(e) => setForm((p) => ({ ...p, hc_ping: e.target.value }))}
                    placeholder={t("pingPlaceholder")}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("intervalSeconds")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.hc_interval}
                    onChange={(e) => setForm((p) => ({ ...p, hc_interval: e.target.value }))}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("failureCount")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.hc_failure_count}
                    onChange={(e) => setForm((p) => ({ ...p, hc_failure_count: e.target.value }))}
                    placeholder="3"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("scriptPath")}</Label>
                  <Input
                    value={form.hc_script}
                    onChange={(e) => setForm((p) => ({ ...p, hc_script: e.target.value }))}
                    placeholder="/path/to/script.sh"
                    className="font-mono"
                  />
                </div>
                {timeoutSupported && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("scriptTimeout")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.hc_timeout}
                      onChange={(e) => setForm((p) => ({ ...p, hc_timeout: e.target.value }))}
                      placeholder="5"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? t("saveChanges") : t("syncModal.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
