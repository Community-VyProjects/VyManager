"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  prefixListService,
  type PrefixListCapabilitiesResponse,
  type PrefixListType,
} from "@/lib/api/prefix-list";
import {
  descriptionMaxLength,
  emptyRuleForm,
  prefixListProblem,
  prefixListRange,
  prefixListRuleProblem,
  type PrefixListForm,
  type PrefixListRuleForm,
} from "@/lib/api/prefix-list-save-ops";
import type { ApiError } from "@/lib/types/api";
import { PrefixListRuleFields } from "./PrefixListRuleFields";
import { nextRuleNumber } from "./prefix-list-rule-form";

interface CreatePrefixListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  listType: PrefixListType;
  /** Names this family already has. */
  existingNames: string[];
  capabilities: PrefixListCapabilitiesResponse | null;
}

/**
 * Create a list and its first rule. The list commit (list ops take no rule
 * number) runs first; when the rule commit then fails, the list stays created
 * and a retry sends only the rule.
 */
export function CreatePrefixListModal({
  open,
  onOpenChange,
  onSuccess,
  listType,
  existingNames,
  capabilities,
}: CreatePrefixListModalProps) {
  const t = useTranslations("prefixList");
  const tl = useTranslations("prefixList.listErrors");
  const tr = useTranslations("prefixList.ruleErrors");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [listForm, setListForm] = useState<PrefixListForm>({ name: "", description: "" });
  const [ruleForm, setRuleForm] = useState<PrefixListRuleForm>(() => ({
    ...emptyRuleForm(nextRuleNumber([], prefixListRange(capabilities, "rule"))),
    action: "permit",
  }));
  /** The list name once its commit succeeded. */
  const [created, setCreated] = useState<string | null>(null);
  const family = listType === "ipv4" ? "IPv4" : "IPv6";

  const handleSubmit = async () => {
    const listProblem = prefixListProblem(listForm, created ? null : existingNames, capabilities);
    if (listProblem) {
      setError(tl(listProblem.key, { max: listProblem.max ?? "" }));
      setActiveTab("basic");
      return;
    }
    const ruleProblem = prefixListRuleProblem(listType, null, ruleForm, capabilities, []);
    if (ruleProblem) {
      setError(
        tr(ruleProblem.key, {
          min: ruleProblem.min ?? "",
          max: ruleProblem.max ?? "",
          length: ruleProblem.length ?? "",
          rule: ruleProblem.rule ?? "",
        }),
      );
      setActiveTab("rule");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const name = created ?? listForm.name.trim();
      if (!created) {
        await prefixListService.createPrefixList(listType, listForm);
        setCreated(name);
      }
      await prefixListService.saveRule(listType, name, Number(ruleForm.rule_number.trim()), null, ruleForm);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("create.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
    // A list committed without its rule is on the device: show it.
    if (!next && created) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("create.title", { type: family })}</DialogTitle>
          <DialogDescription>{t("create.description")}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">{t("create.basic")}</TabsTrigger>
            <TabsTrigger value="rule">{t("create.firstRule")}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="prefix-list-name">{t("create.listName")} *</Label>
              <Input
                id="prefix-list-name"
                value={listForm.name}
                onChange={(e) => setListForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("form.example", { value: "MY-PREFIXES" })}
                disabled={loading || created !== null}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prefix-list-description">{tc("description")}</Label>
              <Input
                id="prefix-list-description"
                value={listForm.description}
                maxLength={descriptionMaxLength(capabilities)}
                onChange={(e) => setListForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t("create.descriptionPlaceholder")}
                disabled={loading || created !== null}
              />
            </div>
          </TabsContent>

          <TabsContent value="rule" className="mt-4">
            <PrefixListRuleFields
              idPrefix="prefix-list-create"
              listType={listType}
              form={ruleForm}
              onChange={setRuleForm}
              ruleNumberLocked={false}
              disabled={loading}
              capabilities={capabilities}
            />
          </TabsContent>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? tc("creating") : t("create.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
