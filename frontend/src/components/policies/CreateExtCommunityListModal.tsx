"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Loader2, Info, Eye } from "lucide-react";
import { extcommunityListService } from "@/lib/api/extcommunity-list";

interface CreateExtCommunityListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateExtCommunityListModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateExtCommunityListModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleNumber, setRuleNumber] = useState("100");
  const [ruleDescription, setRuleDescription] = useState("");
  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [matchType, setMatchType] = useState<"rt" | "soo" | "regex">("rt");

  // Separate fields for the three-part format aa:nn:nn
  const [adminField, setAdminField] = useState("");
  const [assignedNum1, setAssignedNum1] = useState("");
  const [assignedNum2, setAssignedNum2] = useState("");

  // Raw regex for advanced mode
  const [rawRegex, setRawRegex] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
    setRuleNumber("100");
    setRuleDescription("");
    setAction("permit");
    setMatchType("rt");
    setAdminField("");
    setAssignedNum1("");
    setAssignedNum2("");
    setRawRegex("");
    setError(null);
  };

  const buildRegexPattern = (): string => {
    if (matchType === "regex") {
      return rawRegex.trim();
    }
    return `${matchType} ${adminField.trim()}:${assignedNum1.trim()}:${assignedNum2.trim()}`;
  };

  const getPreview = (): string => {
    if (matchType === "regex") {
      return rawRegex.trim() || "(enter pattern)";
    }
    const admin = adminField.trim() || "?";
    const num1 = assignedNum1.trim() || "?";
    const num2 = assignedNum2.trim() || "?";
    return `${matchType} ${admin}:${num1}:${num2}`;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("ExtCommunity list name is required");
      return;
    }

    if (!ruleNumber || isNaN(Number(ruleNumber))) {
      setError("Valid rule number is required");
      return;
    }

    // Validation for pattern
    if (matchType === "regex") {
      if (!rawRegex.trim()) {
        setError("Regex pattern is required");
        return;
      }
    } else {
      if (!adminField.trim()) {
        setError("Administrator field (AS Number) is required");
        return;
      }
      if (!assignedNum1.trim()) {
        setError("Assigned Number 1 is required");
        return;
      }
      if (!assignedNum2.trim()) {
        setError("Assigned Number 2 is required");
        return;
      }
      if (!/^\d+$/.test(adminField.trim())) {
        setError("Administrator field must be a valid number (e.g., 65000)");
        return;
      }
      if (!/^\d+$/.test(assignedNum1.trim())) {
        setError("Assigned Number 1 must be a valid number");
        return;
      }
      if (!/^\d+$/.test(assignedNum2.trim())) {
        setError("Assigned Number 2 must be a valid number");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const regexValue = buildRegexPattern();

      await extcommunityListService.createExtCommunityList(
        name.trim(),
        description.trim() || null,
        {
          rule_number: Number(ruleNumber),
          description: ruleDescription.trim() || null,
          action,
          regex: regexValue,
        }
      );

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ExtCommunity list");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Extended Community List</DialogTitle>
          <DialogDescription>
            Create a new BGP Extended Community list with an initial rule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* ExtCommunity List Name */}
          <div className="space-y-2">
            <Label htmlFor="name">List Name *</Label>
            <Input
              id="name"
              placeholder="e.g., DATACENTER_RT or VPN_SOO"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              A unique name to identify this extended community list
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">List Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="e.g., Route targets for datacenter VPN"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={2}
            />
          </div>

          {/* Initial Rule Section */}
          <div className="pt-4 border-t">
            <h3 className="font-semibold text-sm mb-4">Initial Rule Configuration</h3>

            {/* Action Selection */}
            <div className="space-y-3 mb-4">
              <Label className="text-sm font-medium">Rule Action</Label>
              <RadioGroup
                value={action}
                onValueChange={(v) => setAction(v as "permit" | "deny")}
                className="flex gap-4"
                disabled={loading}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="permit" id="permit" />
                  <Label htmlFor="permit" className="font-normal cursor-pointer">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Permit
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="deny" id="deny" />
                  <Label htmlFor="deny" className="font-normal cursor-pointer">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Deny
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Match Type Selection */}
            <div className="space-y-3 mb-4">
              <Label className="text-sm font-medium">Community Type</Label>
              <RadioGroup
                value={matchType}
                onValueChange={(v) => setMatchType(v as "rt" | "soo" | "regex")}
                className="grid grid-cols-1 gap-2"
                disabled={loading}
              >
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="rt" id="rt" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="rt" className="font-medium cursor-pointer">Route Target (RT)</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Used for VPN route distribution between VRFs
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="soo" id="soo" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="soo" className="font-medium cursor-pointer">Site of Origin (SoO)</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Used to prevent routing loops in multi-homed sites
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="regex" id="regex" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="regex" className="font-medium cursor-pointer">Advanced (Regex Pattern)</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enter a custom regex pattern for complex matching
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Community Value Fields */}
            {matchType !== "regex" ? (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <Info className="h-4 w-4" />
                  Enter the {matchType === "rt" ? "Route Target" : "Site of Origin"} values (format: aa:nn:nn)
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="adminField">AS Number</Label>
                    <Input
                      id="adminField"
                      placeholder="65000"
                      value={adminField}
                      onChange={(e) => setAdminField(e.target.value)}
                      disabled={loading}
                      type="number"
                      min="1"
                      max="4294967295"
                    />
                    <p className="text-xs text-muted-foreground">
                      Administrator
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignedNum1">Value 1</Label>
                    <Input
                      id="assignedNum1"
                      placeholder="100"
                      value={assignedNum1}
                      onChange={(e) => setAssignedNum1(e.target.value)}
                      disabled={loading}
                      type="number"
                      min="0"
                      max="65535"
                    />
                    <p className="text-xs text-muted-foreground">
                      Assigned #1
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignedNum2">Value 2</Label>
                    <Input
                      id="assignedNum2"
                      placeholder="200"
                      value={assignedNum2}
                      onChange={(e) => setAssignedNum2(e.target.value)}
                      disabled={loading}
                      type="number"
                      min="0"
                      max="65535"
                    />
                    <p className="text-xs text-muted-foreground">
                      Assigned #2
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Example: <code className="bg-muted px-1 rounded">65000:100:200</code> creates {matchType} 65000:100:200
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <Info className="h-4 w-4" />
                  Enter a regex pattern to match extended communities
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rawRegex">Regex Pattern</Label>
                  <Input
                    id="rawRegex"
                    placeholder="e.g., rt 65000:100:200 or soo 65000:.*:.*"
                    value={rawRegex}
                    onChange={(e) => setRawRegex(e.target.value)}
                    disabled={loading}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: <code className="bg-muted px-1 rounded">rt 65000:.*:.*</code> (all RTs from AS 65000),
                    <code className="bg-muted px-1 rounded ml-1">soo .*:100:.*</code> (all SoOs with value 100)
                  </p>
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg mb-4">
              <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Configuration Preview</p>
                <p className="text-sm font-mono truncate mt-0.5">
                  {action} extended-community: <span className="font-semibold">{getPreview()}</span>
                </p>
              </div>
            </div>

            {/* Rule Description */}
            <div className="space-y-2">
              <Label htmlFor="ruleDescription">Rule Description (Optional)</Label>
              <Input
                id="ruleDescription"
                placeholder="e.g., Allow route targets from datacenter"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Creating..." : "Create List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
