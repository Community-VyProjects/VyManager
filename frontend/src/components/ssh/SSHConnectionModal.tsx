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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { sshService, SSHConfig, SSHCapabilities } from "@/lib/api/ssh";
import { SSHMultiValueField, isValidIP } from "./SSHMultiValueField";

interface SSHConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SSHConfig;
  capabilities: SSHCapabilities;
  onSuccess: () => void;
}

const DEFAULT_LOGLEVEL = "__default__";

function isPort(v: string): boolean {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

export function SSHConnectionModal({
  open,
  onOpenChange,
  config,
  capabilities,
  onSuccess,
}: SSHConnectionModalProps) {
  const [ports, setPorts] = useState<string[]>(config.ports);
  const [listenAddresses, setListenAddresses] = useState<string[]>(config.listen_addresses);
  const [vrfs, setVrfs] = useState<string[]>(config.vrfs);
  const [loglevel, setLoglevel] = useState(config.loglevel ?? DEFAULT_LOGLEVEL);
  const [keepalive, setKeepalive] = useState(config.client_keepalive_interval ?? "");
  const [rekeyData, setRekeyData] = useState(config.rekey.data ?? "");
  const [rekeyTime, setRekeyTime] = useState(config.rekey.time ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const next: SSHConfig = {
      ...config,
      ports,
      listen_addresses: listenAddresses,
      vrfs,
      loglevel: loglevel === DEFAULT_LOGLEVEL ? null : loglevel,
      client_keepalive_interval: keepalive.trim() || null,
      rekey: { data: rekeyData.trim() || null, time: rekeyTime.trim() || null },
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
          <DialogTitle>Connection Settings</DialogTitle>
          <DialogDescription>
            Listening ports, bind addresses, VRFs, and session behaviour
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            <SSHMultiValueField
              label="Ports"
              description={`TCP ports the SSH service listens on (default ${capabilities.features.port.default}).`}
              placeholder="e.g. 22"
              values={ports}
              onChange={setPorts}
              validate={(v) => (isPort(v) ? null : "Port must be between 1 and 65535")}
            />

            <Separator />

            <SSHMultiValueField
              label="Listen Addresses"
              description="Local IP addresses to bind to. Leave empty to listen on all."
              placeholder="e.g. 192.0.2.1 or 2001:db8::1"
              values={listenAddresses}
              onChange={setListenAddresses}
              validate={(v) => (isValidIP(v) ? null : "Enter a valid IPv4 or IPv6 address")}
            />

            <Separator />

            <SSHMultiValueField
              label="VRFs"
              description='VRF instances to run the service in. Use "default" for the default VRF.'
              placeholder="e.g. mgmt or default"
              values={vrfs}
              onChange={setVrfs}
            />

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Log Level</Label>
              <Select value={loglevel} onValueChange={setLoglevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_LOGLEVEL}>
                    Default ({capabilities.features.loglevel.default})
                  </SelectItem>
                  {(capabilities.features.loglevel.values ?? []).map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ssh-keepalive" className="text-sm font-medium">
                Client Keepalive Interval
              </Label>
              <p className="text-xs text-muted-foreground">
                Seconds between server-to-client keepalives (1–65535). Empty disables.
              </p>
              <Input
                id="ssh-keepalive"
                type="number"
                min={1}
                max={65535}
                placeholder="e.g. 180"
                value={keepalive}
                onChange={(e) => setKeepalive(e.target.value)}
              />
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium">Session Rekey Limits</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Force renegotiation after a data volume and/or time threshold.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rekey-data" className="text-xs font-medium">
                    Data (MB)
                  </Label>
                  <Input
                    id="rekey-data"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder="e.g. 1024"
                    value={rekeyData}
                    onChange={(e) => setRekeyData(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rekey-time" className="text-xs font-medium">
                    Time (minutes)
                  </Label>
                  <Input
                    id="rekey-time"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder="e.g. 60"
                    value={rekeyTime}
                    onChange={(e) => setRekeyTime(e.target.value)}
                  />
                </div>
              </div>
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
