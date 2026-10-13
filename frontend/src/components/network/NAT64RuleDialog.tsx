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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import { nat64Service, type NAT64SourceRule } from "@/lib/api/nat64";

interface NAT64RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: NAT64SourceRule | null;
  nextRuleNumber: number;
  onSuccess: () => void;
}

export function NAT64RuleDialog({
  open,
  onOpenChange,
  rule,
  nextRuleNumber,
  onSuccess,
}: NAT64RuleDialogProps) {
  const t = useTranslations("nat64");
  const tc = useTranslations("common");
  const isEditing = !!rule;
  const [description, setDescription] = useState("");
  const [sourcePrefix, setSourcePrefix] = useState("");
  const [matchMark, setMatchMark] = useState("");
  const [disable, setDisable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (rule) {
        setDescription(rule.description || "");
        setSourcePrefix(rule.source_prefix || "");
        setMatchMark(rule.match_mark || "");
        setDisable(rule.disable);
      } else {
        setDescription("");
        setSourcePrefix("");
        setMatchMark("");
        setDisable(false);
      }
    }
  }, [open, rule]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isEditing) {
        await nat64Service.updateRule(rule.rule_number, rule, {
          description,
          sourcePrefix,
          matchMark,
          disable,
        });
      } else {
        await nat64Service.createRule({
          ruleNumber: nextRuleNumber,
          description: description || undefined,
          sourcePrefix: sourcePrefix || undefined,
          matchMark: matchMark || undefined,
          disable,
        });
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("ruleDialog.editTitle", { number: String(rule.rule_number) }) : t("ruleDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("ruleDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("ruleDialog.ruleNumber")}</Label>
            <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 font-mono text-sm">
              {isEditing ? rule.rule_number : nextRuleNumber}
              <span className="ml-2 text-muted-foreground text-xs">{t("ruleDialog.autoAssigned")}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nat64-rule-desc">{tc("description")}</Label>
            <Input
              id="nat64-rule-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("ruleDialog.descriptionPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nat64-rule-prefix">{t("ruleDialog.sourcePrefix")}</Label>
            <Input
              id="nat64-rule-prefix"
              value={sourcePrefix}
              onChange={(e) => setSourcePrefix(e.target.value)}
              placeholder="64:ff9b::/96"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nat64-rule-mark">{t("ruleDialog.matchMark")}</Label>
            <Input
              id="nat64-rule-mark"
              value={matchMark}
              onChange={(e) => setMatchMark(e.target.value)}
              placeholder={t("ruleDialog.matchMarkPlaceholder")}
              className="font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="nat64-rule-disable"
              checked={disable}
              onCheckedChange={(checked) => setDisable(checked === true)}
            />
            <Label htmlFor="nat64-rule-disable" className="cursor-pointer">
              {t("ruleDialog.disableRule")}
            </Label>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
