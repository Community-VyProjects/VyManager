"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { qosService, QoSInterface, QoSPolicy } from "@/lib/api/qos";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface QoSInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: QoSInterface | null;
  existingNames: string[];
  policies: QoSPolicy[];
  onSuccess: () => void;
}

const NONE = "__none__";

export function QoSInterfaceModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  policies,
  onSuccess,
}: QoSInterfaceModalProps) {
  const t = useTranslations("qos");
  const tc = useTranslations("common");
  const isEdit = existing !== null;
  const [name, setName] = useState(existing?.name ?? "");
  const [ingress, setIngress] = useState(existing?.ingress ?? "");
  const [egress, setEgress] = useState(existing?.egress ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ingress accepts only limiter policies; egress accepts all others.
  const ingressPolicies = policies.filter((p) => p.type === "limiter").map((p) => p.name);
  const egressPolicies = policies.filter((p) => p.type !== "limiter").map((p) => p.name);

  const handleSubmit = async () => {
    const ifname = name.trim();
    if (!ifname) {
      setError(t("interfaceModal.interfaceRequired"));
      return;
    }
    if (!ingress.trim() && !egress.trim()) {
      setError(t("interfaceModal.policyRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await qosService.saveInterface(isEdit, { name: ifname, ingress, egress });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("interfaceModal.editTitle") : t("interfaceModal.addTitle")}</DialogTitle>
          <DialogDescription>{t("interfaceModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>{t("interface")}</Label>
            {isEdit ? (
              <Input value={name} disabled className="font-mono bg-muted" />
            ) : (
              <InterfaceSelect
                value={name}
                onValueChange={setName}
                filter={(i) => !existingNames.includes(i.name)}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("interfaceModal.egressPolicy")}</Label>
            <Select value={egress === "" ? NONE : egress} onValueChange={(v) => setEgress(v === NONE ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("interfaceModal.egressPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{tc("none")}</SelectItem>
                {egressPolicies.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="font-mono">{p}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{t("interfaceModal.egressHelp")}</p>
          </div>

          <div className="space-y-1.5">
            <Label>{t("interfaceModal.ingressPolicy")}</Label>
            <Select value={ingress === "" ? NONE : ingress} onValueChange={(v) => setIngress(v === NONE ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("interfaceModal.ingressPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{tc("none")}</SelectItem>
                {ingressPolicies.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="font-mono">{p}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{t("interfaceModal.ingressHelp")}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? tc("save") : tc("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
