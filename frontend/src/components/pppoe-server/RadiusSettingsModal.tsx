"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { pppoeServerService, PPPoERadiusSettings } from "@/lib/api/pppoe-server";
import { ApiError } from "@/lib/types/api";

interface RadiusSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentSettings: PPPoERadiusSettings;
}

export function RadiusSettingsModal({ open, onOpenChange, onSuccess, currentSettings }: RadiusSettingsModalProps) {
  const [sourceAddress, setSourceAddress] = useState("");
  const [timeout, setTimeout] = useState("");
  const [maxTry, setMaxTry] = useState("");
  const [nasIdentifier, setNasIdentifier] = useState("");
  const [nasIpAddress, setNasIpAddress] = useState("");
  const [preallocateVif, setPreallocateVif] = useState(false);
  const [acctInterval, setAcctInterval] = useState("");
  const [acctJitter, setAcctJitter] = useState("");
  const [acctTimeout, setAcctTimeout] = useState("");
  const [calledSidFormat, setCalledSidFormat] = useState("__none__");
  const [daeServer, setDaeServer] = useState("");
  const [daePort, setDaePort] = useState("");
  const [daeKey, setDaeKey] = useState("");
  const [rateLimitEnable, setRateLimitEnable] = useState(false);
  const [rateLimitAttribute, setRateLimitAttribute] = useState("");
  const [rateLimitVendor, setRateLimitVendor] = useState("");
  const [rateLimitMultiplier, setRateLimitMultiplier] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSourceAddress(currentSettings.source_address || "");
      setTimeout(currentSettings.timeout || "");
      setMaxTry(currentSettings.max_try || "");
      setNasIdentifier(currentSettings.nas_identifier || "");
      setNasIpAddress(currentSettings.nas_ip_address || "");
      setPreallocateVif(currentSettings.preallocate_vif || false);
      setAcctInterval(currentSettings.accounting_interim_interval || "");
      setAcctJitter(currentSettings.acct_interim_jitter || "");
      setAcctTimeout(currentSettings.acct_timeout || "");
      setCalledSidFormat(currentSettings.called_sid_format || "__none__");
      setDaeServer(currentSettings.dynamic_author?.server || "");
      setDaePort(currentSettings.dynamic_author?.port || "");
      setDaeKey("");
      setRateLimitEnable(currentSettings.rate_limit?.enable || false);
      setRateLimitAttribute(currentSettings.rate_limit?.attribute || "");
      setRateLimitVendor(currentSettings.rate_limit?.vendor || "");
      setRateLimitMultiplier(currentSettings.rate_limit?.multiplier || "");
      setError(null);
    }
  }, [open, currentSettings]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pppoeServerService.updateRadiusSettings(currentSettings, {
        source_address: sourceAddress,
        timeout,
        max_try: maxTry,
        nas_identifier: nasIdentifier,
        nas_ip_address: nasIpAddress,
        preallocate_vif: preallocateVif,
        accounting_interim_interval: acctInterval,
        acct_interim_jitter: acctJitter,
        acct_timeout: acctTimeout,
        called_sid_format: calledSidFormat === "__none__" ? "" : calledSidFormat,
        dae_server: daeServer,
        dae_port: daePort,
        dae_key: daeKey || undefined,
        rate_limit_enable: rateLimitEnable,
        rate_limit_attribute: rateLimitAttribute,
        rate_limit_vendor: rateLimitVendor,
        rate_limit_multiplier: rateLimitMultiplier,
      });
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update RADIUS settings");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update RADIUS settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            RADIUS Global Settings
          </DialogTitle>
          <DialogDescription>Configure global RADIUS parameters.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h4 className="text-sm font-medium">General</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source Address</Label>
              <Input value={sourceAddress} onChange={(e) => setSourceAddress(e.target.value)} placeholder="10.0.0.1" />
            </div>
            <div className="space-y-2">
              <Label>Timeout</Label>
              <Input value={timeout} onChange={(e) => setTimeout(e.target.value)} placeholder="3" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Try</Label>
              <Input value={maxTry} onChange={(e) => setMaxTry(e.target.value)} placeholder="3" />
            </div>
            <div className="space-y-2">
              <Label>NAS Identifier</Label>
              <Input value={nasIdentifier} onChange={(e) => setNasIdentifier(e.target.value)} placeholder="vyos-pppoe" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>NAS IP Address</Label>
            <Input value={nasIpAddress} onChange={(e) => setNasIpAddress(e.target.value)} placeholder="10.0.0.1" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="preallocate-vif" checked={preallocateVif} onCheckedChange={(v) => setPreallocateVif(!!v)} />
            <Label htmlFor="preallocate-vif" className="cursor-pointer">Preallocate VIF</Label>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">Accounting</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Interim Interval</Label>
              <Input value={acctInterval} onChange={(e) => setAcctInterval(e.target.value)} placeholder="60" />
            </div>
            <div className="space-y-2">
              <Label>Interim Jitter</Label>
              <Input value={acctJitter} onChange={(e) => setAcctJitter(e.target.value)} placeholder="10" />
            </div>
            <div className="space-y-2">
              <Label>Acct Timeout</Label>
              <Input value={acctTimeout} onChange={(e) => setAcctTimeout(e.target.value)} placeholder="3" />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">Called Station</h4>
          <div className="space-y-2">
            <Label>Called SID Format</Label>
            <Select value={calledSidFormat} onValueChange={setCalledSidFormat}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                <SelectItem value="ifname">ifname</SelectItem>
                <SelectItem value="ifname:mac">ifname:mac</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">Dynamic Authorization (DAE)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>DAE Server</Label>
              <Input value={daeServer} onChange={(e) => setDaeServer(e.target.value)} placeholder="10.0.0.100" />
            </div>
            <div className="space-y-2">
              <Label>DAE Port</Label>
              <Input value={daePort} onChange={(e) => setDaePort(e.target.value)} placeholder="3799" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>DAE Key</Label>
            <Input type="password" value={daeKey} onChange={(e) => setDaeKey(e.target.value)} placeholder={currentSettings.dynamic_author?.key ? "Leave blank to keep" : "Enter DAE key"} />
          </div>

          <Separator />
          <h4 className="text-sm font-medium">Rate Limiting</h4>
          <div className="flex items-center gap-2">
            <Checkbox id="rate-limit-enable" checked={rateLimitEnable} onCheckedChange={(v) => setRateLimitEnable(!!v)} />
            <Label htmlFor="rate-limit-enable" className="cursor-pointer">Enable Rate Limiting</Label>
          </div>
          {rateLimitEnable && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Attribute</Label>
                <Input value={rateLimitAttribute} onChange={(e) => setRateLimitAttribute(e.target.value)} placeholder="Filter-Id" />
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input value={rateLimitVendor} onChange={(e) => setRateLimitVendor(e.target.value)} placeholder="Vendor" />
              </div>
              <div className="space-y-2">
                <Label>Multiplier</Label>
                <Input value={rateLimitMultiplier} onChange={(e) => setRateLimitMultiplier(e.target.value)} placeholder="1" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
