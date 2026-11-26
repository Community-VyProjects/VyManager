"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { routeMapService, type RouteMap, type RouteMapCapabilities, type RouteMapRule } from "@/lib/api/route-map";
import {
  emptyRuleForm,
  routeMapRuleProblem,
  ruleActions,
  ruleFormFrom,
  type RouteMapRuleForm,
} from "@/lib/api/route-map-save-ops";
import type { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import { RouteMapRuleFields } from "./RouteMapRuleFields";
import {
  problemTab,
  ruleProblemArgs,
  suggestedRuleNumber,
  type RouteMapPickers,
  type RouteMapRuleTab,
} from "./route-map-rule-form";

interface RouteMapRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeMap: RouteMap;
  /** The stored rule on edit; null on create. */
  existing?: RouteMapRule | null;
  capabilities: RouteMapCapabilities | null;
  pickers: RouteMapPickers;
  /** One message per picker list the page could not load. */
  pickerErrors: string[];
}

export function RouteMapRuleModal({
  open,
  onOpenChange,
  onSuccess,
  routeMap,
  existing,
  capabilities,
  pickers,
  pickerErrors,
}: RouteMapRuleModalProps) {
  const t = useTranslations("routeMapRuleModal");
  const tm = useTranslations("routeMap");
  const tc = useTranslations("common");
  const tr = useTranslations("routeMapRuleModal.errors");
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<RouteMapRuleTab>("basic");
  const [form, setForm] = useState<RouteMapRuleForm>(() =>
    existing
      ? ruleFormFrom(existing)
      : emptyRuleForm(suggestedRuleNumber(routeMap.rules, capabilities), ruleActions(capabilities)[0]),
  );
  const ruleNumber = lockedIdentity(existing, (r) => String(r.rule_number), form.rule_number);

  const handleSubmit = async () => {
    const problem = routeMapRuleProblem(
      existing ?? null,
      form,
      capabilities,
      routeMap.rules.map((r) => r.rule_number),
    );
    if (problem) {
      setError(tr(problem.key, ruleProblemArgs(problem)));
      setTab(problemTab(problem.key));
      return;
    }
    // The write target is the stored rule number on edit, never the form.
    const write = modalWriteKind(existing ? { name: String(existing.rule_number) } : null);
    const target = write.kind === "update" ? Number(write.name) : Number(form.rule_number.trim());
    setLoading(true);
    setError(null);
    try {
      await routeMapService.saveRule(routeMap.name, target, existing ?? null, form, capabilities);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || (isEdit ? t("updateFailed") : t("addFailed")));
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("titleEdit", { number: ruleNumber.value }) : t("titleAdd", { name: routeMap.name })}
          </DialogTitle>
          <DialogDescription>{isEdit ? t("descriptionEdit") : t("descriptionAdd")}</DialogDescription>
        </DialogHeader>

        {pickerErrors.map((message) => (
          <p key={message} className="text-sm text-destructive whitespace-pre-wrap">
            {message}
          </p>
        ))}

        <RouteMapRuleFields
          idPrefix="route-map-rule"
          form={{ ...form, rule_number: ruleNumber.value }}
          onChange={setForm}
          ruleNumberLocked={ruleNumber.disabled}
          disabled={loading}
          capabilities={capabilities}
          pickers={pickers}
          tab={tab}
          onTabChange={setTab}
        />

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
            {loading ? (isEdit ? tc("saving") : t("adding")) : isEdit ? tc("saveChanges") : tm("page.addRule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
