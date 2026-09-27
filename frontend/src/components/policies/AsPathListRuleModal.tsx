"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { asPathListService, type AsPathListCapabilities, type AsPathListRule } from "@/lib/api/as-path-list";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyRegexListRuleDraft,
  nextRuleNumber,
  regexListRuleDraftFrom,
  submitAsPathRuleCreate,
  submitAsPathRuleUpdate,
  validateRegexListRule,
  type RegexListRuleDraft,
} from "./policy-list-rule-form";

interface AsPathListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asPathListName: string;
  existing?: AsPathListRule | null;
  capabilities: AsPathListCapabilities | null;
}

export function AsPathListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  asPathListName,
  existing,
}: AsPathListRuleModalProps) {
  const t = useTranslations("bgpLists");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RegexListRuleDraft>(emptyRegexListRuleDraft());

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft(regexListRuleDraftFrom(existing));
    } else {
      setDraft(emptyRegexListRuleDraft());
      asPathListService.getConfig().then((config) => {
        const list = config.as_path_lists.find((apl) => apl.name === asPathListName);
        setDraft((d) => ({ ...d, ruleNumber: nextRuleNumber(list?.rules ?? []) }));
      }).catch((err) => {
        console.error("Failed to calculate next rule number:", err);
      });
    }
    setError(null);
  }, [open, existing, asPathListName]);

  const patch = (fields: Partial<RegexListRuleDraft>) => setDraft((d) => ({ ...d, ...fields }));
  const lockedRule = lockedIdentity(existing, (r) => String(r.rule_number), String(draft.ruleNumber));

  const handleSubmit = async () => {
    const validationError = validateRegexListRule(draft);
    if (validationError) {
      setError(t(`validation.${validationError}`));
      return;
    }

    const write = modalWriteKind(existing ? { name: String(existing.rule_number) } : null);
    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitAsPathRuleUpdate(asPathListName, existing, draft)
          : await submitAsPathRuleCreate(asPathListName, draft);
      if (result && result.success === false) {
        setError(result.error || tc("operationFailed"));
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? t("shared.failedToUpdateRule") : t("shared.failedToCreateRule"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !loading) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("shared.editRuleTitle", { number: lockedRule.value }) : t("shared.addRule")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("shared.editingRuleIn", { listType: t("types.asPath.name"), name: asPathListName })
              : t("shared.addRuleTo", { listType: t("types.asPath.name"), name: asPathListName, number: String(draft.ruleNumber) })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="action">{t("shared.actionRequired")}</Label>
            <Select value={draft.action} onValueChange={(v) => patch({ action: v as "permit" | "deny" })} disabled={loading}>
              <SelectTrigger id="action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permit">{t("shared.permit")}</SelectItem>
                <SelectItem value="deny">{t("shared.deny")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="regex">{t("shared.regexPatternRequired")}</Label>
            <Input
              id="regex"
              placeholder={t("shared.eg", { value: "^65000_" })}
              value={draft.regex}
              onChange={(e) => patch({ regex: e.target.value })}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {t("asPath.regexHelp")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tc("description")}</Label>
            <Input
              id="description"
              placeholder={t("shared.descriptionPlaceholder")}
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? (isEdit ? tc("saving") : t("shared.creating")) : isEdit ? t("shared.saveChanges") : t("shared.createRule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
