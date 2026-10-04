"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { type PrefixList, type PrefixListRule } from "@/lib/api/prefix-list";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  nextRuleNumber,
  prefixListRuleDraftFrom,
  submitPrefixListCreate,
  submitPrefixListUpdate,
  validatePrefixListRule,
  type PrefixListRuleDraft,
} from "./prefix-list-rule-form";

interface PrefixListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefixList: PrefixList | null;
  existing?: PrefixListRule | null;
}

export function PrefixListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  prefixList,
  existing,
}: PrefixListRuleModalProps) {
  const t = useTranslations("prefixList");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [ruleNumber, setRuleNumber] = useState(100);

  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [ruleDescription, setRuleDescription] = useState("");
  const [prefix, setPrefix] = useState("");
  const [ge, setGe] = useState("");
  const [le, setLe] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (existing) {
      const d = prefixListRuleDraftFrom(existing);
      setRuleNumber(d.ruleNumber);
      setAction(d.action);
      setRuleDescription(d.description);
      setPrefix(d.prefix);
      setGe(d.ge);
      setLe(d.le);
    } else {
      resetForm();
      setRuleNumber(nextRuleNumber(prefixList?.rules ?? []));
    }
  }, [open, existing, prefixList]);

  const resetForm = () => {
    setRuleNumber(100);
    setAction("permit");
    setRuleDescription("");
    setPrefix("");
    setGe("");
    setLe("");
  };

  const handleClose = () => {
    setError(null);
    resetForm();
    onOpenChange(false);
  };

  const collectDraft = (): PrefixListRuleDraft => ({
    ruleNumber,
    action,
    description: ruleDescription,
    prefix,
    ge,
    le,
  });

  const handleSubmit = async () => {
    if (!prefixList) return;
    const draft = collectDraft();
    const validationError = validatePrefixListRule(draft, prefixList.list_type);
    if (validationError) {
      setError(t(`validation.${validationError.key}`, "values" in validationError ? validationError.values : undefined));
      return;
    }
    const write = modalWriteKind(existing ? { name: String(existing.rule_number) } : null);
    setLoading(true);
    setError(null);
    try {
      const result =
        write.kind === "update" && existing
          ? await submitPrefixListUpdate(prefixList.name, prefixList.list_type, existing, draft)
          : await submitPrefixListCreate(prefixList.name, prefixList.list_type, draft);
      if (result && result.success === false) {
        setError(result.error || tc("operationFailed"));
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? t("ruleModal.updateFailed") : t("ruleModal.addFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!prefixList) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("ruleModal.editTitle", { number: lockedIdentity(existing, (r) => String(r.rule_number), String(ruleNumber)).value }) : t("ruleModal.addTitle", { list: prefixList.name })}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("ruleModal.editDescription") : t("ruleModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rule-number">{t("form.ruleNumber")}</Label>
              <Input
                id="rule-number"
                type="number"
                value={ruleNumber}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">{t("ruleModal.autoCalculated")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">{t("form.action")} *</Label>
              <Select value={action} onValueChange={(v) => setAction(v as "permit" | "deny")} disabled={loading}>
                <SelectTrigger id="action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permit">{t("form.permit")}</SelectItem>
                  <SelectItem value="deny">{t("form.deny")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-description">{t("form.ruleDescription")}</Label>
            <Input
              id="rule-description"
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder={t("form.ruleDescriptionPlaceholder")}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prefix">{t("form.prefixCidr")} *</Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder={prefixList.list_type === "ipv4" ? t("form.example", { value: "192.168.1.0/24" }) : t("form.example", { value: "2001:db8::/32" })}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {t("form.prefixHelp")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ge">{t("form.geLabel")}</Label>
              <Input
                id="ge"
                type="number"
                value={ge}
                onChange={(e) => setGe(e.target.value)}
                placeholder={tc("optional")}
                disabled={loading}
                min={prefix ? parseInt(prefix.split('/')[1] || "0", 10) : 0}
                max={prefixList.list_type === "ipv4" ? 32 : 128}
              />
              <p className="text-xs text-muted-foreground">
                {t("form.geHelp")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="le">{t("form.leLabel")}</Label>
              <Input
                id="le"
                type="number"
                value={le}
                onChange={(e) => setLe(e.target.value)}
                placeholder={tc("optional")}
                disabled={loading}
                min={prefix ? parseInt(prefix.split('/')[1] || "0", 10) : 0}
                max={prefixList.list_type === "ipv4" ? 32 : 128}
              />
              <p className="text-xs text-muted-foreground">
                {t("form.leHelp")}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">{t("form.aboutTitle")}</p>
                <ul className="space-y-1 text-xs">
                  <li>• {t("form.aboutGe")}</li>
                  <li>• {t("form.aboutLe")}</li>
                  <li>• {t("form.aboutOptional")}</li>
                  <li>• {t("form.aboutExample")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (isEdit ? tc("saving") : t("ruleModal.adding")) : isEdit ? tc("saveChanges") : t("ruleModal.addRule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
