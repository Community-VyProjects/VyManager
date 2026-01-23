"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { prefixListService, type PrefixListRule } from "@/lib/api/prefix-list";

interface EditPrefixListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  rule: PrefixListRule | null;
  listName: string | null;
  listType: "ipv4" | "ipv6";
}

export function EditPrefixListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  rule,
  listName,
  listType,
}: EditPrefixListRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [ruleDescription, setRuleDescription] = useState("");
  const [prefix, setPrefix] = useState("");
  const [ge, setGe] = useState("");
  const [le, setLe] = useState("");

  useEffect(() => {
    if (open && rule) {
      // Pre-populate form with existing rule data
      setAction(rule.action as "permit" | "deny");
      setRuleDescription(rule.description || "");
      setPrefix(rule.prefix || "");
      setGe(rule.ge !== null && rule.ge !== undefined ? rule.ge.toString() : "");
      setLe(rule.le !== null && rule.le !== undefined ? rule.le.toString() : "");
    }
  }, [open, rule]);

  const resetForm = () => {
    setAction("permit");
    setRuleDescription("");
    setPrefix("");
    setGe("");
    setLe("");
  };

  const handleClose = () => {
    setError(null);
    resetForm();
    onOpenChange(false);
  };

  // Validate CIDR notation
  const validateCIDR = (cidr: string): boolean => {
    if (!cidr) return false;

    const parts = cidr.split('/');
    if (parts.length !== 2) return false;

    const [ip, prefixLen] = parts;
    const prefixLength = parseInt(prefixLen, 10);

    if (listType === "ipv4") {
      // IPv4 validation
      const ipParts = ip.split('.');
      if (ipParts.length !== 4) return false;
      if (!ipParts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      })) return false;
      if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) return false;
    } else {
      // IPv6 validation (basic)
      if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 128) return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!rule || !listName) return;

    // Validation
    if (!prefix.trim()) {
      setError("Please enter a prefix in CIDR notation");
      return;
    }

    if (!validateCIDR(prefix)) {
      setError(`Invalid ${listType.toUpperCase()} CIDR notation. Format: ${listType === "ipv4" ? "192.168.1.0/24" : "2001:db8::/32"}`);
      return;
    }

    // Validate ge/le if provided
    if (ge && isNaN(parseInt(ge, 10))) {
      setError("GE must be a valid number");
      return;
    }

    if (le && isNaN(parseInt(le, 10))) {
      setError("LE must be a valid number");
      return;
    }

    // Get prefix length from CIDR
    const prefixLength = parseInt(prefix.split('/')[1], 10);
    const maxLength = listType === "ipv4" ? 32 : 128;

    if (ge) {
      const geNum = parseInt(ge, 10);
      if (geNum < prefixLength || geNum > maxLength) {
        setError(`GE must be between ${prefixLength} (prefix length) and ${maxLength}`);
        return;
      }
    }

    if (le) {
      const leNum = parseInt(le, 10);
      if (leNum < prefixLength || leNum > maxLength) {
        setError(`LE must be between ${prefixLength} (prefix length) and ${maxLength}`);
        return;
      }
    }

    if (ge && le) {
      const geNum = parseInt(ge, 10);
      const leNum = parseInt(le, 10);
      if (geNum > leNum) {
        setError("GE must be less than or equal to LE");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const updatedRule: any = {
        action,
        description: ruleDescription || null,
        prefix: prefix.trim(),
        ge: ge ? parseInt(ge, 10) : null,
        le: le ? parseInt(le, 10) : null,
      };

      await prefixListService.updateRule(
        listName,
        listType,
        rule.rule_number,
        updatedRule
      );
      handleClose();
      onSuccess();
    } catch (err: any) {
      console.error("Update rule error:", err);
      let errorMsg = "Failed to update rule";
      if (err.details?.detail) {
        if (Array.isArray(err.details.detail)) {
          errorMsg = err.details.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(", ");
        } else {
          errorMsg = err.details.detail;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Rule {rule.rule_number}</DialogTitle>
          <DialogDescription>
            Update this rule's configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rule-number">Rule Number</Label>
              <Input
                id="rule-number"
                type="number"
                value={rule.rule_number}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Rule number cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action *</Label>
              <Select value={action} onValueChange={(v) => setAction(v as "permit" | "deny")} disabled={loading}>
                <SelectTrigger id="action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permit">Permit</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-description">Rule Description</Label>
            <Input
              id="rule-description"
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="Enter rule description (optional)"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prefix">Prefix (CIDR) *</Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder={listType === "ipv4" ? "e.g., 192.168.1.0/24" : "e.g., 2001:db8::/32"}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Enter prefix in CIDR notation
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ge">GE (Greater-than-or-equal)</Label>
              <Input
                id="ge"
                type="number"
                value={ge}
                onChange={(e) => setGe(e.target.value)}
                placeholder="Optional"
                disabled={loading}
                min={prefix ? parseInt(prefix.split('/')[1] || "0", 10) : 0}
                max={listType === "ipv4" ? 32 : 128}
              />
              <p className="text-xs text-muted-foreground">
                Minimum prefix length to match
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="le">LE (Less-than-or-equal)</Label>
              <Input
                id="le"
                type="number"
                value={le}
                onChange={(e) => setLe(e.target.value)}
                placeholder="Optional"
                disabled={loading}
                min={prefix ? parseInt(prefix.split('/')[1] || "0", 10) : 0}
                max={listType === "ipv4" ? 32 : 128}
              />
              <p className="text-xs text-muted-foreground">
                Maximum prefix length to match
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">About GE/LE</p>
                <ul className="space-y-1 text-xs">
                  <li>• GE specifies the minimum prefix length to match</li>
                  <li>• LE specifies the maximum prefix length to match</li>
                  <li>• Both are optional and refine the prefix match</li>
                  <li>• Leave empty to remove GE/LE restrictions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
