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
import { AlertTriangle, Loader2 } from "lucide-react";
import { slaService, SLAConfig } from "@/lib/api/sla";

interface SLASettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SLAConfig;
  onSuccess: () => void;
}

export function SLASettingsModal({
  open,
  onOpenChange,
  config,
  onSuccess,
}: SLASettingsModalProps) {
  const [owampEnabled, setOwampEnabled] = useState(config.owamp_server.enabled);
  const [owampPort, setOwampPort] = useState(
    config.owamp_server.port !== null ? String(config.owamp_server.port) : ""
  );
  const [twampEnabled, setTwampEnabled] = useState(config.twamp_server.enabled);
  const [twampPort, setTwampPort] = useState(
    config.twamp_server.port !== null ? String(config.twamp_server.port) : ""
  );

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validatePort = (value: string): string | null => {
    if (!value) return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      return "Port must be a number between 1 and 65535";
    }
    return null;
  };

  const owampPortError = validatePort(owampPort);
  const twampPortError = validatePort(twampPort);
  const hasPortError = !!(owampPortError || twampPortError);

  const handleSubmit = async () => {
    if (hasPortError) return;
    setSubmitting(true);
    setApiError(null);
    try {
      await slaService.updateSettings(
        config,
        owampEnabled,
        owampPort,
        twampEnabled,
        twampPort
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>SLA Settings</DialogTitle>
          <DialogDescription>
            Configure OWAMP and TWAMP measurement server settings
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-1">
            {/* OWAMP Server */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="owamp-enabled"
                  checked={owampEnabled}
                  onCheckedChange={(checked) => {
                    setOwampEnabled(!!checked);
                    if (!checked) setOwampPort("");
                    setApiError(null);
                  }}
                />
                <Label htmlFor="owamp-enabled" className="cursor-pointer leading-tight">
                  <span className="font-medium">Enable OWAMP Server</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    One-Way Active Measurement Protocol — measures one-way delay and packet loss
                  </span>
                </Label>
              </div>

              <div className="space-y-1.5 pl-7">
                <Label
                  htmlFor="owamp-port"
                  className={!owampEnabled ? "text-muted-foreground" : ""}
                >
                  Port
                </Label>
                <Input
                  id="owamp-port"
                  type="number"
                  min={1}
                  max={65535}
                  placeholder="861 (default)"
                  value={owampPort}
                  onChange={(e) => {
                    setOwampPort(e.target.value);
                    setApiError(null);
                  }}
                  disabled={!owampEnabled}
                />
                {owampPortError && owampEnabled && (
                  <p className="text-xs text-destructive">{owampPortError}</p>
                )}
                {!owampPortError && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use the default port (861)
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* TWAMP Server */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="twamp-enabled"
                  checked={twampEnabled}
                  onCheckedChange={(checked) => {
                    setTwampEnabled(!!checked);
                    if (!checked) setTwampPort("");
                    setApiError(null);
                  }}
                />
                <Label htmlFor="twamp-enabled" className="cursor-pointer leading-tight">
                  <span className="font-medium">Enable TWAMP Server</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Two-Way Active Measurement Protocol — measures round-trip delay and packet loss
                  </span>
                </Label>
              </div>

              <div className="space-y-1.5 pl-7">
                <Label
                  htmlFor="twamp-port"
                  className={!twampEnabled ? "text-muted-foreground" : ""}
                >
                  Port
                </Label>
                <Input
                  id="twamp-port"
                  type="number"
                  min={1}
                  max={65535}
                  placeholder="862 (default)"
                  value={twampPort}
                  onChange={(e) => {
                    setTwampPort(e.target.value);
                    setApiError(null);
                  }}
                  disabled={!twampEnabled}
                />
                {twampPortError && twampEnabled && (
                  <p className="text-xs text-destructive">{twampPortError}</p>
                )}
                {!twampPortError && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use the default port (862)
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {apiError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{apiError}</span>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || hasPortError}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
