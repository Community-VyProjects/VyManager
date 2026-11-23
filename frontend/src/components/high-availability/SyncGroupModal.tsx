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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ApiError } from "@/lib/types/api";
import type { VrrpSyncGroup, VrrpGroup, HACapabilities } from "@/lib/api/high-availability";
import {
  vrrpSyncGroupDraft,
  vrrpSyncGroupProblem,
  type HAProblem,
  type VrrpSyncGroupDraft,
  type VrrpSyncGroupProblemKey,
} from "@/lib/api/high-availability-save-ops";
import { HA_FIELD_LABELS } from "./ha-field-labels";
import { HealthCheckFields, TransitionScriptFields } from "./HaSectionFields";

interface SyncGroupModalProps {
  onOpenChange: (open: boolean) => void;
  existingGroup?: VrrpSyncGroup | null;
  existingNames: string[];
  vrrpGroups: VrrpGroup[];
  capabilities?: HACapabilities | null;
  onSubmit: (draft: VrrpSyncGroupDraft) => Promise<void>;
}

function hasHealthCheck(group: VrrpGroup): boolean {
  return Object.values(group.health_check).some(Boolean);
}

/** Rendered only while open, so the draft starts from the group each time. */
export function SyncGroupModal({
  onOpenChange,
  existingGroup,
  existingNames,
  vrrpGroups,
  capabilities,
  onSubmit,
}: SyncGroupModalProps) {
  const t = useTranslations("highAvailability");
  const tc = useTranslations("common");
  const isEdit = !!existingGroup;
  const timeoutSupported = capabilities?.features.sync_group_health_check_timeout?.supported ?? false;
  const [draft, setDraft] = useState<VrrpSyncGroupDraft>(() => vrrpSyncGroupDraft(existingGroup));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMember = (name: string) => {
    setDraft((prev) => ({
      ...prev,
      members: prev.members.includes(name)
        ? prev.members.filter((m) => m !== name)
        : [...prev.members, name],
    }));
  };

  const problemText = (problem: HAProblem<VrrpSyncGroupProblemKey>): string => {
    if (problem.key === "outOfRange") {
      return t("outOfRange", {
        field: t(HA_FIELD_LABELS[problem.field!]),
        min: problem.min!,
        max: problem.max!,
      });
    }
    if (problem.key === "healthCheckPingAndScript") return t("healthCheckPingAndScript");
    return t(`syncModal.${problem.key}`, { name: problem.name ?? "" });
  };

  const close = (open: boolean) => {
    if (!loading) onOpenChange(open);
  };

  const handleSubmit = async () => {
    setError(null);
    const problem = vrrpSyncGroupProblem(
      existingGroup ?? null,
      draft,
      existingNames,
      vrrpGroups.filter(hasHealthCheck).map((group) => group.name),
    );
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
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                disabled={isEdit}
                placeholder={t("syncModal.namePlaceholder")}
                className={isEdit ? "opacity-60" : ""}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>{t("syncModal.members")} <span className="text-destructive">*</span></Label>

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
                        checked={draft.members.includes(g.name)}
                        onCheckedChange={() => toggleMember(g.name)}
                        onClick={(e) => e.stopPropagation()}
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

              {draft.members.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("syncModal.membersSelected", { count: draft.members.length })}
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("healthCheckOptional")}</Label>
              <HealthCheckFields
                value={draft.health_check}
                onChange={(health_check) => setDraft((p) => ({ ...p, health_check }))}
                timeoutSupported={timeoutSupported}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("transitionScripts")}</Label>
              <TransitionScriptFields
                value={draft.transition_script}
                onChange={(transition_script) => setDraft((p) => ({ ...p, transition_script }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => close(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? tc("saveChanges") : t("syncModal.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
