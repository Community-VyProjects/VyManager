"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { type AccessList, type AccessListRule } from "@/lib/api/access-list";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  accessListRuleDraftFrom,
  nextRuleNumber,
  submitAccessListCreate,
  submitAccessListUpdate,
  validateAccessListRule,
  type AccessListRuleDraft,
} from "./access-list-rule-form";

interface AccessListRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  accessList: AccessList | null;
  existing?: AccessListRule | null;
}

export function AccessListRuleModal({
  open,
  onOpenChange,
  onSuccess,
  accessList,
  existing,
}: AccessListRuleModalProps) {
  const t = useTranslations("accessList");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [ruleNumber, setRuleNumber] = useState(100);

  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [ruleDescription, setRuleDescription] = useState("");
  const [sourceType, setSourceType] = useState<"any" | "host" | "network">("any");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceMask, setSourceMask] = useState("");
  // IPv6 specific fields
  const [sourceAny, setSourceAny] = useState(false);
  const [sourceExactMatch, setSourceExactMatch] = useState(false);
  const [sourceNetwork, setSourceNetwork] = useState("");
  const [destinationType, setDestinationType] = useState<"any" | "host" | "network">("any");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationMask, setDestinationMask] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (existing && accessList) {
      const d = accessListRuleDraftFrom(existing, accessList.list_type);
      setRuleNumber(d.ruleNumber);
      setAction(d.action);
      setRuleDescription(d.description);
      setSourceType((d.sourceType as "any" | "host" | "network") || "any");
      setSourceAddress(d.sourceAddress);
      setSourceMask(d.sourceMask);
      setSourceAny(d.sourceAny);
      setSourceExactMatch(d.sourceExactMatch);
      setSourceNetwork(d.sourceNetwork);
      setDestinationType((d.destinationType as "any" | "host" | "network") || "any");
      setDestinationAddress(d.destinationAddress);
      setDestinationMask(d.destinationMask);
    } else {
      setAction("permit");
      setRuleDescription("");
      setSourceType("any");
      setSourceAddress("");
      setSourceMask("");
      setSourceAny(false);
      setSourceExactMatch(false);
      setSourceNetwork("");
      setDestinationType("any");
      setDestinationAddress("");
      setDestinationMask("");
      setRuleNumber(nextRuleNumber(accessList?.rules ?? []));
    }
  }, [open, existing, accessList]);

  // Clear source fields when type changes
  useEffect(() => {
    if (sourceType === "any") {
      setSourceAddress("");
      setSourceMask("");
    } else if (sourceType === "host") {
      setSourceMask("");
    }
  }, [sourceType]);

  // Clear destination fields when type changes
  useEffect(() => {
    if (destinationType === "any") {
      setDestinationAddress("");
      setDestinationMask("");
    } else if (destinationType === "host") {
      setDestinationMask("");
    }
  }, [destinationType]);

  // Mutual exclusivity for IPv6: exact-match and network are mutually exclusive
  // But "any" can coexist with either
  useEffect(() => {
    if (sourceNetwork.trim() && sourceExactMatch) {
      setSourceExactMatch(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mutual-exclusivity guard keyed to the field that changed
  }, [sourceNetwork]);

  useEffect(() => {
    if (sourceExactMatch && sourceNetwork.trim()) {
      setSourceNetwork("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mutual-exclusivity guard keyed to the field that changed
  }, [sourceExactMatch]);

  const resetForm = () => {
    setRuleNumber(100);
    setAction("permit");
    setRuleDescription("");
    setSourceType("any");
    setSourceAddress("");
    setSourceMask("");
    setSourceAny(false);
    setSourceExactMatch(false);
    setSourceNetwork("");
    setDestinationType("any");
    setDestinationAddress("");
    setDestinationMask("");
  };

  const handleClose = () => {
    setError(null);
    resetForm();
    onOpenChange(false);
  };

  const collectDraft = (): AccessListRuleDraft => ({
    ruleNumber,
    action,
    description: ruleDescription,
    sourceType,
    sourceAddress,
    sourceMask,
    sourceAny,
    sourceExactMatch,
    sourceNetwork,
    destinationType,
    destinationAddress,
    destinationMask,
  });

  const handleSubmit = async () => {
    if (!accessList) return;
    const listType = accessList.list_type as "ipv4" | "ipv6";
    const draft = collectDraft();
    const validationError = validateAccessListRule(draft, listType);
    if (validationError) {
      setError(t(`validation.${validationError}`));
      return;
    }
    const write = modalWriteKind(existing ? { name: String(existing.rule_number) } : null);
    setLoading(true);
    setError(null);
    try {
      const result =
        write.kind === "update" && existing
          ? await submitAccessListUpdate(accessList.number, listType, existing, draft)
          : await submitAccessListCreate(accessList.number, listType, draft);
      if (result && result.success === false) {
        setError(result.error || tc("operationFailed"));
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? t("ruleModal.updateFailed") : t("ruleModal.addFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!accessList) return null;

  const listType = accessList.list_type as "ipv4" | "ipv6";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("ruleModal.editTitle", { number: lockedIdentity(existing, (r) => String(r.rule_number), String(ruleNumber)).value }) : t("ruleModal.addTitle", { list: accessList.number })}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("ruleModal.editDescription") : t("ruleModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rule-number">{t("form.ruleNumber")}</Label>
              <Input
                id="rule-number"
                type="number"
                value={ruleNumber}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">{t("ruleModal.autoCalculated")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">{t("form.action")} *</Label>
              <Select value={action} onValueChange={(v) => setAction(v as "permit" | "deny")} disabled={loading}>
                <SelectTrigger id="action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permit">{t("form.permit")}</SelectItem>
                  <SelectItem value="deny">{t("form.deny")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-description">{t("form.ruleDescription")}</Label>
            <Input
              id="rule-description"
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder={t("form.ruleDescriptionPlaceholder")}
              disabled={loading}
            />
          </div>

          {/* Source Configuration */}
          <div className="space-y-3 border rounded-lg p-4">
            <Label>{t("form.source")}</Label>

            {listType === "ipv4" ? (
              /* IPv4 Source - Radio Buttons */
              <>
                <RadioGroup value={sourceType} onValueChange={(v) => setSourceType(v as "any" | "host" | "network")} disabled={loading}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="any" id="source-any" />
                    <Label htmlFor="source-any" className="font-normal cursor-pointer">{t("form.any")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="host" id="source-host" />
                    <Label htmlFor="source-host" className="font-normal cursor-pointer">{t("form.host")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="network" id="source-network" />
                    <Label htmlFor="source-network" className="font-normal cursor-pointer">{t("form.network")}</Label>
                  </div>
                </RadioGroup>

                {sourceType === "host" && (
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="source-address">{t("form.hostAddress")} *</Label>
                    <Input
                      id="source-address"
                      value={sourceAddress}
                      onChange={(e) => setSourceAddress(e.target.value)}
                      placeholder={t("form.example", { value: "192.168.1.1" })}
                      disabled={loading}
                    />
                  </div>
                )}

                {sourceType === "network" && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="source-address-net">{t("form.networkAddress")} *</Label>
                      <Input
                        id="source-address-net"
                        value={sourceAddress}
                        onChange={(e) => setSourceAddress(e.target.value)}
                        placeholder={t("form.example", { value: "192.168.1.0" })}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="source-mask-net">{t("form.inverseMask")} *</Label>
                      <Input
                        id="source-mask-net"
                        value={sourceMask}
                        onChange={(e) => setSourceMask(e.target.value)}
                        placeholder={t("form.example", { value: "0.0.0.255" })}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* IPv6 Source - Checkboxes for Any/Exact-Match, separate Network field */
              <>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source-any-v6"
                      checked={sourceAny}
                      onCheckedChange={(checked) => setSourceAny(checked as boolean)}
                      disabled={loading}
                    />
                    <Label htmlFor="source-any-v6" className="font-normal cursor-pointer">{t("form.any")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="source-exact-match"
                      checked={sourceExactMatch}
                      onCheckedChange={(checked) => setSourceExactMatch(checked as boolean)}
                      disabled={loading || !!sourceNetwork.trim()}
                    />
                    <Label htmlFor="source-exact-match" className="font-normal cursor-pointer">{t("ruleModal.exactMatch")}</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("ruleModal.ipv6SourceHelp")}
                  </p>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="source-network-v6">{t("form.networkCidr")}</Label>
                  <Input
                    id="source-network-v6"
                    value={sourceNetwork}
                    onChange={(e) => setSourceNetwork(e.target.value)}
                    placeholder={t("form.example", { value: "2001:db8::/32" })}
                    disabled={loading || sourceExactMatch}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("ruleModal.ipv6NetworkHelp")}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Destination Configuration (IPv4 only) */}
          {listType === "ipv4" && (
            <div className="space-y-3 border rounded-lg p-4">
              <Label>{t("form.destination")}</Label>
            <RadioGroup value={destinationType} onValueChange={(v) => setDestinationType(v as "any" | "host" | "network")} disabled={loading}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="any" id="dest-any" />
                <Label htmlFor="dest-any" className="font-normal cursor-pointer">{t("form.any")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="host" id="dest-host" />
                <Label htmlFor="dest-host" className="font-normal cursor-pointer">{t("form.host")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="network" id="dest-network" />
                <Label htmlFor="dest-network" className="font-normal cursor-pointer">{t("form.network")}</Label>
              </div>
            </RadioGroup>

            {destinationType === "host" && (
              <div className="space-y-2 mt-3">
                <Label htmlFor="dest-address">{t("form.hostAddress")} *</Label>
                <Input
                  id="dest-address"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder={listType === "ipv4" ? t("form.example", { value: "10.0.0.1" }) : t("form.example", { value: "2001:db8::2" })}
                  disabled={loading}
                />
              </div>
            )}

            {destinationType === "network" && (
              <div className="space-y-3 mt-3">
                {listType === "ipv4" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dest-address-net">{t("form.networkAddress")} *</Label>
                      <Input
                        id="dest-address-net"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        placeholder={t("form.example", { value: "10.0.0.0" })}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dest-mask-net">{t("form.inverseMask")} *</Label>
                      <Input
                        id="dest-mask-net"
                        value={destinationMask}
                        onChange={(e) => setDestinationMask(e.target.value)}
                        placeholder={t("form.example", { value: "0.0.0.255" })}
                        disabled={loading}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="dest-address-net6">{t("form.networkCidr")} *</Label>
                    <Input
                      id="dest-address-net6"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      placeholder={t("form.example", { value: "2001:db8:1::/48" })}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (isEdit ? tc("saving") : t("ruleModal.adding")) : isEdit ? tc("saveChanges") : t("ruleModal.addRule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
