"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Loader2, Info, Eye } from "lucide-react";
import { extcommunityListService, type ExtCommunityListCapabilities, type ExtCommunityListRule } from "@/lib/api/extcommunity-list";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  extCommunityRuleDraftFrom,
  nextRuleNumber,
  submitExtCommunityRuleCreate,
  submitExtCommunityRuleUpdate,
  validateExtCommunityRule,
  type ExtCommunityRuleDraft,
} from "./policy-list-rule-form";

interface ExtCommunityListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  extcommunityListName: string;
  capabilities: ExtCommunityListCapabilities | null;
  existing?: ExtCommunityListRule | null;
}

export function ExtCommunityListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  extcommunityListName,
  existing,
}: ExtCommunityListRuleModalProps) {
  const t = useTranslations("bgpLists");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [ruleNumber, setRuleNumber] = useState<number>(100);

  const [description, setDescription] = useState("");
  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [matchType, setMatchType] = useState<"rt" | "soo" | "regex">("rt");

  // Separate fields for the three-part format aa:nn:nn
  const [adminField, setAdminField] = useState("");      // First part (aa) - AS number or IP
  const [assignedNum1, setAssignedNum1] = useState("");  // Second part (nn)
  const [assignedNum2, setAssignedNum2] = useState("");  // Third part (nn)

  // Raw regex for advanced mode
  const [rawRegex, setRawRegex] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (existing) {
      const d = extCommunityRuleDraftFrom(existing);
      setRuleNumber(d.ruleNumber);
      setDescription(d.description);
      setAction(d.action);
      setMatchType(d.matchType);
      setAdminField(d.adminField);
      setAssignedNum1(d.assignedNum1);
      setAssignedNum2(d.assignedNum2);
      setRawRegex(d.rawRegex);
    } else {
      resetForm();
      extcommunityListService.getConfig().then((config) => {
        const list = config.extcommunity_lists.find((ecl) => ecl.name === extcommunityListName);
        setRuleNumber(nextRuleNumber(list?.rules ?? []));
      }).catch((err) => {
        console.error("Failed to calculate next rule number:", err);
        setRuleNumber(100);
      });
    }
  }, [open, existing, extcommunityListName]);

  const resetForm = () => {
    setDescription("");
    setAction("permit");
    setMatchType("rt");
    setAdminField("");
    setAssignedNum1("");
    setAssignedNum2("");
    setRawRegex("");
    setError(null);
  };

  const getPreview = (): string => {
    if (matchType === "regex") {
      return rawRegex.trim() || t("extCommunity.enterPattern");
    }
    const admin = adminField.trim() || "?";
    const num1 = assignedNum1.trim() || "?";
    const num2 = assignedNum2.trim() || "?";
    return `${matchType} ${admin}:${num1}:${num2}`;
  };

  const collectDraft = (): ExtCommunityRuleDraft => ({
    ruleNumber,
    description,
    action,
    matchType,
    adminField,
    assignedNum1,
    assignedNum2,
    rawRegex,
  });

  const handleSubmit = async () => {
    const draft = collectDraft();
    const validationError = validateExtCommunityRule(draft);
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
          ? await submitExtCommunityRuleUpdate(extcommunityListName, existing, draft)
          : await submitExtCommunityRuleCreate(extcommunityListName, draft);
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

  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("shared.editRuleTitle", { number: lockedIdentity(existing, (r) => String(r.rule_number), String(ruleNumber)).value }) : t("extCommunity.addRuleTitle")}</DialogTitle>
          <DialogDescription>
            {t.rich(isEdit ? "shared.editingRuleInNamed" : "shared.addRuleToNamed", {
              listType: t("types.extCommunity.modalName"),
              name: extcommunityListName,
              b: (chunks) => <span className="font-medium">{chunks}</span>,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Action Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("extCommunity.ruleAction")}</Label>
            <RadioGroup
              value={action}
              onValueChange={(v) => setAction(v as "permit" | "deny")}
              className="flex gap-4"
              disabled={loading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="permit" id="permit" />
                <Label htmlFor="permit" className="font-normal cursor-pointer">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {t("shared.permit")}
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="deny" id="deny" />
                <Label htmlFor="deny" className="font-normal cursor-pointer">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    {t("shared.deny")}
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Match Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("extCommunity.communityType")}</Label>
            <RadioGroup
              value={matchType}
              onValueChange={(v) => setMatchType(v as "rt" | "soo" | "regex")}
              className="grid grid-cols-1 gap-2"
              disabled={loading}
            >
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="rt" id="rt" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="rt" className="font-medium cursor-pointer">{t("extCommunity.rtLabel")}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("extCommunity.rtHelp")}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="soo" id="soo" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="soo" className="font-medium cursor-pointer">{t("extCommunity.sooLabel")}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("extCommunity.sooHelp")}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="regex" id="regex" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="regex" className="font-medium cursor-pointer">{t("extCommunity.advancedLabel")}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("extCommunity.advancedHelp")}
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Community Value Fields */}
          {matchType !== "regex" ? (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <Info className="h-4 w-4" />
                {t("extCommunity.enterValues", { kind: matchType })}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="adminField">{t("extCommunity.asNumber")}</Label>
                  <Input
                    id="adminField"
                    placeholder="65000"
                    value={adminField}
                    onChange={(e) => setAdminField(e.target.value)}
                    disabled={loading}
                    type="number"
                    min="1"
                    max="4294967295"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("extCommunity.administrator")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedNum1">{t("extCommunity.value1")}</Label>
                  <Input
                    id="assignedNum1"
                    placeholder="100"
                    value={assignedNum1}
                    onChange={(e) => setAssignedNum1(e.target.value)}
                    disabled={loading}
                    type="number"
                    min="0"
                    max="65535"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("extCommunity.assigned1")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedNum2">{t("extCommunity.value2")}</Label>
                  <Input
                    id="assignedNum2"
                    placeholder="200"
                    value={assignedNum2}
                    onChange={(e) => setAssignedNum2(e.target.value)}
                    disabled={loading}
                    type="number"
                    min="0"
                    max="65535"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("extCommunity.assigned2")}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t.rich("extCommunity.example", {
                  matchType,
                  code: (chunks) => <code className="bg-muted px-1 rounded">{chunks}</code>,
                })}
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <Info className="h-4 w-4" />
                {t("extCommunity.enterRegex")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rawRegex">{t("extCommunity.regexPattern")}</Label>
                <Input
                  id="rawRegex"
                  placeholder={t("shared.eg", { value: "rt 65000:100:200 or soo 65000:.*:.*" })}
                  value={rawRegex}
                  onChange={(e) => setRawRegex(e.target.value)}
                  disabled={loading}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t.rich("extCommunity.regexExamples", {
                    code: (chunks) => <code className="bg-muted px-1 rounded">{chunks}</code>,
                    code2: (chunks) => <code className="bg-muted px-1 rounded ml-1">{chunks}</code>,
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
            <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t("extCommunity.configPreview")}</p>
              <p className="text-sm font-mono truncate mt-0.5">
                {action} extended-community: <span className="font-semibold">{getPreview()}</span>
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("extCommunity.descriptionOptional")}</Label>
            <Input
              id="description"
              placeholder={t("extCommunity.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
          <Button variant="outline" onClick={handleClose} disabled={loading}>
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
