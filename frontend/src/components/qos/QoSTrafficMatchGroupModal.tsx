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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import {
  qosService,
  QoSCapabilities,
  QoSTrafficMatchGroup,
  TmgDraft,
  tmgToDraft,
  emptyMatchDraft,
} from "@/lib/api/qos";
import { QoSMatchRuleEditor } from "./QoSMatchRuleEditor";
import { MatchGroupSelect } from "./MatchGroupSelect";

interface QoSTrafficMatchGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capabilities: QoSCapabilities;
  existing: QoSTrafficMatchGroup | null;
  existingNames: string[];
  availableMatchGroups: string[];
  onSuccess: () => void;
}

export function QoSTrafficMatchGroupModal({
  open,
  onOpenChange,
  capabilities,
  existing,
  existingNames,
  availableMatchGroups,
  onSuccess,
}: QoSTrafficMatchGroupModalProps) {
  const t = useTranslations("qos");
  const tc = useTranslations("common");
  const isEdit = existing !== null;
  const [draft, setDraft] = useState<TmgDraft>(
    existing ? tmgToDraft(existing) : { name: "", description: "", matchGroups: [], matches: [] }
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dscpNames = capabilities.features.enums.dscp_names;

  const handleSubmit = async () => {
    const name = draft.name.trim();
    if (!name) {
      setError(t("tmgModal.nameRequired"));
      return;
    }
    if (!isEdit && existingNames.includes(name)) {
      setError(t("tmgModal.exists", { name }));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await qosService.saveTmg(isEdit, { ...draft, name });
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("tmgModal.editTitle") : t("tmgModal.addTitle")}</DialogTitle>
          <DialogDescription>{t("tmgModal.description")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[68vh] pr-4">
          <div className="space-y-5 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tmg-name" className="text-sm font-medium">{tc("name")}</Label>
                <Input
                  id="tmg-name"
                  placeholder={t("example", { value: "voip" })}
                  value={draft.name}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, name: e.target.value }));
                    setError(null);
                  }}
                  disabled={isEdit}
                  className={isEdit ? "font-mono bg-muted" : "font-mono"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tmg-desc" className="text-sm font-medium">{tc("description")}</Label>
                <Input
                  id="tmg-desc"
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            <MatchGroupSelect
              label={t("tmgModal.nestedMatchGroups")}
              available={availableMatchGroups}
              selected={draft.matchGroups}
              onChange={(matchGroups) => setDraft((d) => ({ ...d, matchGroups }))}
            />

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t("matchRules")}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft((d) => ({ ...d, matches: [...d.matches, emptyMatchDraft("")] }))}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("addMatch")}
                </Button>
              </div>
              {draft.matches.map((m, i) => (
                <QoSMatchRuleEditor
                  key={i}
                  rule={m}
                  dscpNames={dscpNames}
                  idPrefix={`tmg-m${i}`}
                  onChange={(r) => setDraft((d) => ({ ...d, matches: d.matches.map((x, idx) => (idx === i ? r : x)) }))}
                  onRemove={() => setDraft((d) => ({ ...d, matches: d.matches.filter((_, idx) => idx !== i) }))}
                />
              ))}
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
            {isEdit ? tc("save") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
