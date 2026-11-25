"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InterfaceMultiSelect } from "@/components/ui/interface-multi-select";
import { AlertCircle, Loader2 } from "lucide-react";
import { routeService, type PolicyRoute } from "@/lib/api/route";
import { policyFormFrom, policyUpdateOps } from "@/lib/api/route-save-ops";
import type { ApiError } from "@/lib/types/api";
import { useTranslations } from "next-intl";

interface ManagePolicyInterfacesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: PolicyRoute;
  onSuccess: () => void;
}

export function ManagePolicyInterfacesModal({
  open,
  onOpenChange,
  policy,
  onSuccess,
}: ManagePolicyInterfacesModalProps) {
  const t = useTranslations("routePolicy.manageInterfaces");
  const tc = useTranslations("common");
  const [interfaces, setInterfaces] = useState<string[]>(() => [...policy.interfaces]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = { ...policyFormFrom(policy), interfaces };
  const hasChanges = policyUpdateOps(policy, form).length > 0;

  const handleSubmit = async () => {
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
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { policyName: policy.name })}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="route-policy-manage-interfaces">{t("interfaces")}</Label>
          <InterfaceMultiSelect
            id="route-policy-manage-interfaces"
            values={interfaces}
            onChange={setInterfaces}
            disabled={loading}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !hasChanges}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? tc("saving") : tc("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
