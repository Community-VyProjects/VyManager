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
      setError("An interface is required");
      return;
    }
    if (!ingress.trim() && !egress.trim()) {
      setError("Set at least one of ingress or egress policy");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await qosService.saveInterface(isEdit, { name: ifname, ingress, egress });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Interface Binding" : "Add Interface Binding"}</DialogTitle>
          <DialogDescription>Attach QoS policies to an interface</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Interface</Label>
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
            <Label>Egress Policy</Label>
            <Select value={egress === "" ? NONE : egress} onValueChange={(v) => setEgress(v === NONE ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an outbound policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {egressPolicies.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="font-mono">{p}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Applied to outbound (egress) traffic.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Ingress Policy</Label>
            <Select value={ingress === "" ? NONE : ingress} onValueChange={(v) => setIngress(v === NONE ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a limiter policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {ingressPolicies.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="font-mono">{p}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Inbound (ingress) accepts limiter policies only.</p>
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
