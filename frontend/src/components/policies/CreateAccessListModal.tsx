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
  accessListService,
  type AccessListCapabilitiesResponse,
  type AccessListType,
} from "@/lib/api/access-list";
import {
  accessListProblem,
  accessListRuleProblem,
  descriptionMaxLength,
  emptyRuleForm,
  isExtendedList,
  ruleActions,
  type AccessListForm,
  type AccessListRuleForm,
} from "@/lib/api/access-list-save-ops";
import type { ApiError } from "@/lib/types/api";
import { AccessListRuleFields } from "./AccessListRuleFields";
import { suggestedRuleNumber } from "./access-list-rule-form";
import { familyLabel } from "./prefix-list-rule-form";

interface CreateAccessListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  listType: AccessListType;
  /** Numbers (IPv4) or names (IPv6) this family already has. */
  existingNames: string[];
  capabilities: AccessListCapabilitiesResponse | null;
}

/**
 * Create a list and its first rule. The list commit (list ops take no rule
 * number) runs first; when the rule commit then fails, the list stays created
 * and a retry sends only the rule.
 */
export function CreateAccessListModal({
  open,
  onOpenChange,
  onSuccess,
  listType,
  existingNames,
  capabilities,
}: CreateAccessListModalProps) {
  const t = useTranslations("accessList");
  const tl = useTranslations("accessList.listErrors");
  const tr = useTranslations("accessList.ruleErrors");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [listForm, setListForm] = useState<AccessListForm>({ name: "", description: "" });
  const [ruleForm, setRuleForm] = useState<AccessListRuleForm>(() =>
    emptyRuleForm(suggestedRuleNumber([], capabilities), ruleActions(capabilities)[0]),
  );
  /** The list name once its commit succeeded. */
  const [created, setCreated] = useState<string | null>(null);
  const family = familyLabel(listType);
  const ipv4 = listType === "ipv4";
  const extended = isExtendedList(capabilities, listType, created ?? listForm.name);

  const handleSubmit = async () => {
    const listProblem = accessListProblem(listType, listForm, created ? null : existingNames, capabilities);
    if (listProblem) {
      setError(tl(listProblem.key, { min: listProblem.min ?? "", max: listProblem.max ?? "" }));
      setActiveTab("basic");
      return;
    }
    const ruleProblem = accessListRuleProblem(listType, extended, null, ruleForm, capabilities, []);
    if (ruleProblem) {
      setError(tr(ruleProblem.key, { min: ruleProblem.min ?? "", max: ruleProblem.max ?? "" }));
      setActiveTab("rule");
      return;
    }
    setLoading(true);
    setError(null);
    // The list commit may succeed in this call; `created` is the value at the click.
    let listCreated = created !== null;
    try {
      const name = created ?? listForm.name.trim();
      if (!created) {
        await accessListService.createAccessList(listType, listForm);
        listCreated = true;
        setCreated(name);
      }
      await accessListService.saveRule(listType, name, Number(ruleForm.rule_number.trim()), null, ruleForm);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || (listCreated ? t("ruleModal.addFailed") : t("create.failed")));
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
              <Label htmlFor="access-list-name">{ipv4 ? t("create.listNumber") : t("create.listName")} *</Label>
              <Input
                id="access-list-name"
                inputMode={ipv4 ? "numeric" : undefined}
                value={listForm.name}
                onChange={(e) => setListForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("form.example", { value: ipv4 ? "100" : "MY-ACL" })}
                disabled={loading || created !== null}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access-list-description">{tc("description")}</Label>
              <Input
                id="access-list-description"
                value={listForm.description}
                maxLength={descriptionMaxLength(capabilities)}
                onChange={(e) => setListForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t("create.descriptionPlaceholder")}
                disabled={loading || created !== null}
              />
            </div>
          </TabsContent>

          <TabsContent value="rule" className="mt-4">
            <AccessListRuleFields
              idPrefix="access-list-create"
              listType={listType}
              extended={extended}
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
