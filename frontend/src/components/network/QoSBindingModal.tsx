"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Network } from "lucide-react";
import { qosService, type QoSPolicy, type InterfaceBinding } from "@/lib/api/qos";
import { useToast } from "@/hooks/useToast";

interface QoSBindingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  policies: QoSPolicy[];
  existingBindings: InterfaceBinding[];
}

export function QoSBindingModal({
  open,
  onOpenChange,
  onSuccess,
  policies,
  existingBindings,
}: QoSBindingModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [interfaceName, setInterfaceName] = useState("");
  const [direction, setDirection] = useState<"egress" | "ingress">("egress");
  const [selectedPolicy, setSelectedPolicy] = useState("");

  useEffect(() => {
    if (open) {
      setInterfaceName("");
      setDirection("egress");
      setSelectedPolicy("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!interfaceName.trim()) {
      toast.error("Validation Error", "Interface name is required");
      return;
    }
    if (!selectedPolicy) {
      toast.error("Validation Error", "Please select a policy");
      return;
    }

    setLoading(true);
    try {
      const result = direction === "egress"
        ? await qosService.bindEgress(interfaceName.trim(), selectedPolicy)
        : await qosService.bindIngress(interfaceName.trim(), selectedPolicy);

      if (result.success) {
        toast.success(
          "Policy Bound",
          `Policy "${selectedPolicy}" bound to ${interfaceName} ${direction}`
        );
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error("Failed", result.error || "Failed to bind policy");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  // Get policies that can be used for ingress (only limiter)
  const ingressPolicies = policies.filter((p) => p.type === "limiter");
  const egressPolicies = policies;

  const availablePolicies = direction === "ingress" ? ingressPolicies : egressPolicies;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Bind Policy to Interface
          </DialogTitle>
          <DialogDescription>
            Apply a QoS policy to an interface for traffic shaping
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Interface Name */}
          <div className="grid gap-2">
            <Label htmlFor="interface">Interface Name *</Label>
            <Input
              id="interface"
              value={interfaceName}
              onChange={(e) => setInterfaceName(e.target.value)}
              placeholder="e.g., eth0, eth1, bond0"
            />
          </div>

          {/* Direction */}
          <div className="grid gap-2">
            <Label>Direction</Label>
            <RadioGroup
              value={direction}
              onValueChange={(v) => {
                setDirection(v as "egress" | "ingress");
                setSelectedPolicy(""); // Reset policy when direction changes
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="egress" id="egress" />
                <Label htmlFor="egress" className="cursor-pointer">
                  Egress (Outbound)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ingress" id="ingress" />
                <Label htmlFor="ingress" className="cursor-pointer">
                  Ingress (Inbound)
                </Label>
              </div>
            </RadioGroup>
            {direction === "ingress" && (
              <p className="text-xs text-muted-foreground">
                Note: Only limiter policies can be applied to ingress traffic
              </p>
            )}
          </div>

          {/* Policy Selection */}
          <div className="grid gap-2">
            <Label htmlFor="policy">Policy *</Label>
            <Select value={selectedPolicy} onValueChange={setSelectedPolicy}>
              <SelectTrigger>
                <SelectValue placeholder="Select a policy" />
              </SelectTrigger>
              <SelectContent>
                {availablePolicies.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No policies available
                  </SelectItem>
                ) : (
                  availablePolicies.map((policy) => (
                    <SelectItem key={`${policy.type}-${policy.name}`} value={policy.name}>
                      <div className="flex items-center gap-2">
                        <span>{policy.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({policy.type})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Existing bindings warning */}
          {interfaceName && existingBindings.find((b) => b.interface === interfaceName) && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
              <p className="text-amber-600 dark:text-amber-400">
                This interface already has a {direction} binding. It will be replaced.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedPolicy}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bind Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
