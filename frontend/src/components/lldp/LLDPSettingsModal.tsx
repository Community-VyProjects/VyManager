"use client";

import { useState, useRef, KeyboardEvent } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import {
  lldpService,
  LLDPConfig,
  LLDPCapabilities,
  LLDPLegacyProtocols,
} from "@/lib/api/lldp";

interface LLDPSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: LLDPConfig;
  capabilities: LLDPCapabilities;
  onSuccess: () => void;
}

function isValidIP(value: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  return ipv4.test(value) || ipv6.test(value);
}

export function LLDPSettingsModal({
  open,
  onOpenChange,
  config,
  onSuccess,
}: LLDPSettingsModalProps) {
  const t = useTranslations("lldp");
  const tc = useTranslations("common");
  const [managementAddresses, setManagementAddresses] = useState<string[]>(
    config.management_addresses
  );
  const [addrInput, setAddrInput] = useState("");
  const [addrError, setAddrError] = useState<string | null>(null);
  const [snmpEnabled, setSnmpEnabled] = useState(config.snmp_enabled);
  const [legacyProtocols, setLegacyProtocols] = useState<LLDPLegacyProtocols>({
    ...config.legacy_protocols,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addAddress = () => {
    const val = addrInput.trim();
    if (!val) return;
    if (!isValidIP(val)) {
      setAddrError(t("settings.invalidAddress"));
      return;
    }
    if (managementAddresses.includes(val)) {
      setAddrError(t("settings.addressExists"));
      return;
    }
    setManagementAddresses((prev) => [...prev, val]);
    setAddrInput("");
    setAddrError(null);
  };

  const removeAddress = (addr: string) => {
    setManagementAddresses((prev) => prev.filter((a) => a !== addr));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addAddress();
    }
  };

  const toggleProtocol = (proto: keyof LLDPLegacyProtocols) => {
    setLegacyProtocols((prev) => ({ ...prev, [proto]: !prev[proto] }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await lldpService.updateSettings(
        {
          original: config,
          managementAddresses,
          snmpEnabled,
          legacyProtocols,
        },
      );
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>
            {t("settings.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-1">
            {/* Management Addresses */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">{t("settings.managementAddresses")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("settings.managementAddressesHint")}
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder={t("settings.addressPlaceholder")}
                  value={addrInput}
                  onChange={(e) => {
                    setAddrInput(e.target.value);
                    setAddrError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button type="button" size="sm" variant="outline" onClick={addAddress}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {addrError && (
                <p className="text-xs text-destructive">{addrError}</p>
              )}
              {managementAddresses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {managementAddresses.map((addr) => (
                    <Badge key={addr} variant="secondary" className="font-mono gap-1 pr-1">
                      {addr}
                      <button
                        type="button"
                        onClick={() => removeAddress(addr)}
                        className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* SNMP */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="snmp"
                checked={snmpEnabled}
                onCheckedChange={(checked) => setSnmpEnabled(!!checked)}
              />
              <Label htmlFor="snmp" className="cursor-pointer">
                {t("settings.snmp")}
              </Label>
            </div>

            <Separator />

            {/* Legacy Protocols */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">{t("settings.legacyProtocols")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("settings.legacyProtocolsHint")}
                </p>
              </div>
              {/* eslint-disable vymanager/no-untranslated-text -- vendor discovery protocol names */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cdp"
                    checked={legacyProtocols.cdp}
                    onCheckedChange={() => toggleProtocol("cdp")}
                  />
                  <Label htmlFor="cdp" className="cursor-pointer">
                    <span className="font-medium">CDP</span>
                    <span className="block text-xs text-muted-foreground">
                      Cisco Discovery Protocol
                    </span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edp"
                    checked={legacyProtocols.edp}
                    onCheckedChange={() => toggleProtocol("edp")}
                  />
                  <Label htmlFor="edp" className="cursor-pointer">
                    <span className="font-medium">EDP</span>
                    <span className="block text-xs text-muted-foreground">
                      Extreme Discovery Protocol
                    </span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="fdp"
                    checked={legacyProtocols.fdp}
                    onCheckedChange={() => toggleProtocol("fdp")}
                  />
                  <Label htmlFor="fdp" className="cursor-pointer">
                    <span className="font-medium">FDP</span>
                    <span className="block text-xs text-muted-foreground">
                      Foundry Discovery Protocol
                    </span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sonmp"
                    checked={legacyProtocols.sonmp}
                    onCheckedChange={() => toggleProtocol("sonmp")}
                  />
                  <Label htmlFor="sonmp" className="cursor-pointer">
                    <span className="font-medium">SONMP</span>
                    <span className="block text-xs text-muted-foreground">
                      Nortel SONMP
                    </span>
                  </Label>
                </div>
              </div>
              {/* eslint-enable vymanager/no-untranslated-text */}
            </div>
          </div>
        </ScrollArea>

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
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
