"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { natService } from "@/lib/api/nat";
import type { SourceNATRule, DestinationNATRule, StaticNATRule } from "@/lib/api/nat";

interface DeleteNATModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: SourceNATRule | DestinationNATRule | StaticNATRule | null;
  ruleType: "source" | "destination" | "static";
  onSuccess: () => void;
}

export function DeleteNATModal({ open, onOpenChange, rule, ruleType, onSuccess }: DeleteNATModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!rule) return;

    setLoading(true);
    setError(null);

    try {
      switch (ruleType) {
        case "source":
          await natService.deleteSourceRule(rule.rule_number);
          break;
        case "destination":
          await natService.deleteDestinationRule(rule.rule_number);
          break;
        case "static":
          await natService.deleteStaticRule(rule.rule_number);
          break;
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete NAT rule");
    } finally {
      setLoading(false);
    }
  };

  const getRuleTypeLabel = () => {
    switch (ruleType) {
      case "source":
        return "Source NAT";
      case "destination":
        return "Destination NAT";
      case "static":
        return "Static NAT";
    }
  };

  const getRuleDetails = () => {
    if (!rule) return null;

    const details = [];

    details.push({
      label: "Rule Number",
      value: rule.rule_number.toString(),
      mono: true,
    });

    if (rule.description) {
      details.push({
        label: "Description",
        value: rule.description,
        mono: false,
      });
    }

    if (ruleType === "source" || ruleType === "destination") {
      const r = rule as SourceNATRule | DestinationNATRule;

      // Source
      if (r.source?.address) {
        details.push({
          label: "Source Address",
          value: r.source.address,
          mono: true,
        });
      }
      if (r.source?.group) {
        const groupType = Object.keys(r.source.group)[0];
        const groupName = r.source.group[groupType];
        details.push({
          label: "Source Group",
          value: `${groupType}: ${groupName}`,
          mono: true,
        });
      }
      if (r.source?.port) {
        details.push({
          label: "Source Port",
          value: r.source.port,
          mono: true,
        });
      }

      // Destination
      if (r.destination?.address) {
        details.push({
          label: "Destination Address",
          value: r.destination.address,
          mono: true,
        });
      }
      if (r.destination?.group) {
        const groupType = Object.keys(r.destination.group)[0];
        const groupName = r.destination.group[groupType];
        details.push({
          label: "Destination Group",
          value: `${groupType}: ${groupName}`,
          mono: true,
        });
      }
      if (r.destination?.port) {
        details.push({
          label: "Destination Port",
          value: r.destination.port,
          mono: true,
        });
      }

      // Interface
      if (ruleType === "source") {
        const sourceRule = r as SourceNATRule;
        if (sourceRule.outbound_interface) {
          const ifaceType = Object.keys(sourceRule.outbound_interface)[0];
          const ifaceValue = sourceRule.outbound_interface[ifaceType];
          details.push({
            label: "Outbound Interface",
            value: `${ifaceType}: ${ifaceValue}`,
            mono: true,
          });
        }
      } else {
        const destRule = r as DestinationNATRule;
        if (destRule.inbound_interface) {
          const ifaceType = Object.keys(destRule.inbound_interface)[0];
          const ifaceValue = destRule.inbound_interface[ifaceType];
          details.push({
            label: "Inbound Interface",
            value: `${ifaceType}: ${ifaceValue}`,
            mono: true,
          });
        }
      }

      // Protocol
      if (r.protocol) {
        details.push({
          label: "Protocol",
          value: r.protocol,
          mono: true,
        });
      }

      // Translation
      if (r.translation?.address) {
        details.push({
          label: "Translation Address",
          value: r.translation.address,
          mono: true,
        });
      }
      if (ruleType === "destination") {
        const destRule = r as DestinationNATRule;
        if (destRule.translation?.port) {
          details.push({
            label: "Translation Port",
            value: destRule.translation.port,
            mono: true,
          });
        }
      }

      // Flags
      const flags = [];
      if (r.disable) flags.push("Disabled");
      if (r.exclude) flags.push("Excluded");
      if (r.log) flags.push("Logging");
      if (flags.length > 0) {
        details.push({
          label: "Flags",
          value: flags.join(", "),
          mono: false,
        });
      }
    } else {
      // Static NAT
      const staticRule = rule as StaticNATRule;

      if (staticRule.destination?.address) {
        details.push({
          label: "Destination Address",
          value: staticRule.destination.address,
          mono: true,
        });
      }

      if (staticRule.inbound_interface) {
        details.push({
          label: "Inbound Interface",
          value: staticRule.inbound_interface,
          mono: true,
        });
      }

      if (staticRule.translation?.address) {
        details.push({
          label: "Translation Address",
          value: staticRule.translation.address,
          mono: true,
        });
      }
    }

    return details;
  };

  if (!rule) return null;

  const ruleDetails = getRuleDetails();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete {getRuleTypeLabel()} Rule
          </DialogTitle>
          <DialogDescription>
            Permanently remove this NAT rule. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Rule Details */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
            <p className="text-sm text-foreground">
              Are you sure you want to delete this {getRuleTypeLabel()} rule?
            </p>

            <div className="space-y-2 text-sm">
              {ruleDetails?.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-muted-foreground font-semibold min-w-[120px]">
                    {detail.label}:
                  </span>
                  <span className={detail.mono ? "font-mono text-foreground" : "text-foreground"}>
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-sm text-yellow-600 dark:text-yellow-500">
              <strong>Warning:</strong> This action cannot be undone. Deleting this NAT rule may affect network traffic routing and translation.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
