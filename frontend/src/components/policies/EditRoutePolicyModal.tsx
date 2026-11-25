"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import { routeService, type PolicyRoute, type RouteCapabilitiesResponse } from "@/lib/api/route";
import {
  descriptionMaxLength,
  policyFormFrom,
  policyProblem,
  type PolicyForm,
} from "@/lib/api/route-save-ops";
import type { ApiError } from "@/lib/types/api";
import { useTranslations } from "next-intl";

interface EditRoutePolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  policy: PolicyRoute;
  capabilities: RouteCapabilitiesResponse | null;
}

export function EditRoutePolicyModal({
  open,
  onOpenChange,
  onSuccess,
  policy,
  capabilities,
}: EditRoutePolicyModalProps) {
  const t = useTranslations("routePolicy.editPolicy");
  const tp = useTranslations("routePolicy.policyErrors");
  const tc = useTranslations("common");
  const [form, setForm] = useState<PolicyForm>(() => policyFormFrom(policy));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const problem = policyProblem(form, null, capabilities);
    if (problem) {
      setError(tp(problem.key, { max: problem.max ?? "" }));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await routeService.updatePolicy(policy, form);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("updateFailed"));
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { name: policy.name })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="route-policy-edit-description">{tc("description")}</Label>
            <Input
              id="route-policy-edit-description"
              placeholder={t("descriptionPlaceholder")}
              value={form.description}
              maxLength={descriptionMaxLength(capabilities)}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="route-policy-edit-default-log"
              checked={form.default_log}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, default_log: checked === true }))}
              disabled={loading}
            />
            <Label htmlFor="route-policy-edit-default-log" className="text-sm font-normal cursor-pointer">
              {t("defaultLog")}
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("updating") : t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
