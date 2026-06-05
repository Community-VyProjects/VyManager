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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import { sshService, SSHConfig, SSHCapabilities } from "@/lib/api/ssh";
import { SSHMultiValueField, isValidIP } from "./SSHMultiValueField";

interface SSHProtectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SSHConfig;
  capabilities: SSHCapabilities;
  onSuccess: () => void;
}

export function SSHProtectionModal({
  open,
  onOpenChange,
  config,
  capabilities,
  onSuccess,
}: SSHProtectionModalProps) {
  const defaults = capabilities.features.dynamic_protection.defaults;

  const [disableHostValidation, setDisableHostValidation] = useState(config.disable_host_validation);
  const [dpEnabled, setDpEnabled] = useState(config.dynamic_protection.enabled);
  const [allowFrom, setAllowFrom] = useState<string[]>(config.dynamic_protection.allow_from);
  const [blockTime, setBlockTime] = useState(config.dynamic_protection.block_time ?? "");
  const [detectTime, setDetectTime] = useState(config.dynamic_protection.detect_time ?? "");
  const [threshold, setThreshold] = useState(config.dynamic_protection.threshold ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const next: SSHConfig = {
      ...config,
      disable_host_validation: disableHostValidation,
      dynamic_protection: {
        enabled: dpEnabled,
        allow_from: allowFrom,
        block_time: blockTime.trim() || null,
        detect_time: detectTime.trim() || null,
        threshold: threshold.trim() || null,
      },
    };
    try {
      await sshService.updateConfig(config, next);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Protection &amp; Hardening</DialogTitle>
          <DialogDescription>
            Brute-force protection and host lookup behaviour
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            <div className="flex items-start gap-3">
              <Checkbox
                id="disable-host-validation"
                checked={disableHostValidation}
                onCheckedChange={(c) => setDisableHostValidation(!!c)}
              />
              <Label htmlFor="disable-host-validation" className="cursor-pointer leading-tight">
                <span className="font-medium">Disable host validation</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Skip reverse DNS (IP → hostname) lookups for connecting clients
                </span>
              </Label>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <Checkbox
                id="dynamic-protection"
                checked={dpEnabled}
                onCheckedChange={(c) => setDpEnabled(!!c)}
              />
              <Label htmlFor="dynamic-protection" className="cursor-pointer leading-tight">
                <span className="font-medium">Enable dynamic protection</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Track and temporarily block IPs that exceed an attack score
                </span>
              </Label>
            </div>

            {dpEnabled && (
              <div className="space-y-4 pl-7">
                <SSHMultiValueField
                  label="Allow From"
                  description="Addresses/subnets that are never blocked"
                  placeholder="e.g. 192.0.2.0/24 or 2001:db8::1"
                  values={allowFrom}
                  onChange={setAllowFrom}
                  validate={(v) =>
                    isValidIP(v, true) ? null : "Enter a valid IP address or network"
                  }
                />

                <div className="space-y-1.5">
                  <Label htmlFor="dp-threshold" className="text-xs font-medium">
                    Threshold
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cumulative attack score before blocking (default {defaults.threshold}).
                  </p>
                  <Input
                    id="dp-threshold"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder={defaults.threshold}
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dp-block" className="text-xs font-medium">
                    Block Time (seconds)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Initial block duration; subsequent blocks grow ×1.5 (default {defaults.block_time}).
                  </p>
                  <Input
                    id="dp-block"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder={defaults.block_time}
                    value={blockTime}
                    onChange={(e) => setBlockTime(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dp-detect" className="text-xs font-medium">
                    Detect Time (seconds)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    How long a source IP&apos;s score is remembered before reset (default {defaults.detect_time}).
                  </p>
                  <Input
                    id="dp-detect"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder={defaults.detect_time}
                    value={detectTime}
                    onChange={(e) => setDetectTime(e.target.value)}
                  />
                </div>
              </div>
            )}
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
