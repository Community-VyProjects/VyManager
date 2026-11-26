"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  accessListService,
  type AccessList,
  type AccessListCapabilitiesResponse,
  type AccessListRule,
} from "@/lib/api/access-list";
import {
  accessListRuleProblem,
  emptyRuleForm,
  isExtendedList,
  ruleActions,
  ruleFormFrom,
  type AccessListRuleForm,
} from "@/lib/api/access-list-save-ops";
import type { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import { AccessListRuleFields } from "./AccessListRuleFields";
import { suggestedRuleNumber } from "./access-list-rule-form";

interface AccessListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  accessList: AccessList;
  existing?: AccessListRule | null;
  capabilities: AccessListCapabilitiesResponse | null;
}

export function AccessListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  accessList,
  existing,
  capabilities,
}: AccessListRuleModalProps) {
  const t = useTranslations("accessList");
  const tr = useTranslations("accessList.ruleErrors");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AccessListRuleForm>(() =>
    existing
      ? ruleFormFrom(existing)
      : emptyRuleForm(suggestedRuleNumber(accessList.rules, capabilities), ruleActions(capabilities)[0]),
  );
  const ruleNumber = lockedIdentity(existing, (r) => String(r.rule_number), form.rule_number);
  const extended = isExtendedList(capabilities, accessList.list_type, accessList.number);

  const handleSubmit = async () => {
    const problem = accessListRuleProblem(
      accessList.list_type,
      extended,
      existing ?? null,
      form,
      capabilities,
      accessList.rules,
    );
    if (problem) {
      setError(tr(problem.key, { min: problem.min ?? "", max: problem.max ?? "" }));
      return;
    }
    // The write target is the stored rule number on edit, never the form.
    const write = modalWriteKind(existing ? { name: String(existing.rule_number) } : null);
    const target = write.kind === "update" ? Number(write.name) : Number(form.rule_number.trim());
    setLoading(true);
    setError(null);
    try {
      await accessListService.saveRule(accessList.list_type, accessList.number, target, existing ?? null, form);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || (isEdit ? t("ruleModal.updateFailed") : t("ruleModal.addFailed")));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("ruleModal.editTitle", { number: ruleNumber.value })
              : t("ruleModal.addTitle", { list: accessList.number })}
          </DialogTitle>
          <DialogDescription>{isEdit ? t("ruleModal.editDescription") : t("ruleModal.addDescription")}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <AccessListRuleFields
            idPrefix="access-list-rule"
            listType={accessList.list_type}
            extended={extended}
            form={{ ...form, rule_number: ruleNumber.value }}
            onChange={setForm}
            ruleNumberLocked={ruleNumber.disabled}
            disabled={loading}
            capabilities={capabilities}
          />
        </div>

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
            {loading ? (isEdit ? tc("saving") : t("ruleModal.adding")) : isEdit ? tc("saveChanges") : t("ruleModal.addRule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
