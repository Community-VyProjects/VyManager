"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PolicyInterfacesField } from "./PolicyInterfacesField";
import { AlertCircle } from "lucide-react";
import { routeService, type RouteCapabilitiesResponse, type RoutePolicyType } from "@/lib/api/route";
import {
  descriptionMaxLength,
  interfacesWithPending,
  policyProblem,
  type PolicyForm,
} from "@/lib/api/route-save-ops";
import type { ApiError } from "@/lib/types/api";
import { useTranslations } from "next-intl";

interface CreateRoutePolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  policyType: RoutePolicyType;
  /** Names the family already has. */
  existingNames: string[];
  capabilities: RouteCapabilitiesResponse | null;
}

export function CreateRoutePolicyModal({
  open,
  onOpenChange,
  onSuccess,
  policyType,
  existingNames,
  capabilities,
}: CreateRoutePolicyModalProps) {
  const t = useTranslations("routePolicy.createPolicy");
  const tp = useTranslations("routePolicy.policyErrors");
  const tc = useTranslations("common");
  const [form, setForm] = useState<PolicyForm>({ name: "", description: "", default_log: false, interfaces: [] });
  const [pattern, setPattern] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const family = policyType === "route" ? "IPv4" : "IPv6";

  const handleSubmit = async () => {
    const interfaces = interfacesWithPending(form.interfaces, pattern);
    if (!interfaces) {
      setError(tp("interfacePatternInvalid"));
      return;
    }
    const submitted = { ...form, interfaces };
    const problem = policyProblem(submitted, existingNames, capabilities);
    if (problem) {
      setError(tp(problem.key, { max: problem.max ?? "" }));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await routeService.createPolicy(policyType, submitted);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("createFailed"));
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
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title", { family })}</DialogTitle>
          <DialogDescription>{t("description", { policyType, family })}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="route-policy-name">{t("nameLabel")}</Label>
            <Input
              id="route-policy-name"
              placeholder={t("namePlaceholder", { example: "MY-POLICY" })}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="route-policy-description">{tc("description")}</Label>
            <Input
              id="route-policy-description"
              placeholder={t("descriptionPlaceholder")}
              value={form.description}
              maxLength={descriptionMaxLength(capabilities)}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              disabled={loading}
            />
          </div>

          <PolicyInterfacesField
            id="route-policy-interfaces"
            label={t("interfaces")}
            values={form.interfaces}
            onChange={(interfaces) => setForm((prev) => ({ ...prev, interfaces }))}
            pattern={pattern}
            onPatternChange={setPattern}
            disabled={loading}
          />

          <div className="flex items-center space-x-2">
            <Checkbox
              id="route-policy-default-log"
              checked={form.default_log}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, default_log: checked === true }))}
              disabled={loading}
            />
            <Label htmlFor="route-policy-default-log" className="text-sm font-normal cursor-pointer">
              {t("defaultLog")}
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? tc("creating") : t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
