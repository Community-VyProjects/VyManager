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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { l2tpService, L2TPConfigResponse, L2TPCapabilities } from "@/lib/api/l2tp";
import { ApiError } from "@/lib/types/api";

interface AdvancedSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: L2TPConfigResponse;
  capabilities: L2TPCapabilities | null;
}

export function AdvancedSettingsModal({
  open,
  onOpenChange,
  onSuccess,
  config,
  capabilities,
}: AdvancedSettingsModalProps) {
  const [lnsHostName, setLnsHostName] = useState("");
  const [lnsSharedSecret, setLnsSharedSecret] = useState("");
  const [limitsConnLimit, setLimitsConnLimit] = useState("");
  const [limitsBurst, setLimitsBurst] = useState("");
  const [limitsTimeout, setLimitsTimeout] = useState("");
  const [logLevel, setLogLevel] = useState("");
  const [shaperFwmark, setShaperFwmark] = useState("");
  const [snmpMasterAgent, setSnmpMasterAgent] = useState(false);
  const [scriptsOnChange, setScriptsOnChange] = useState("");
  const [scriptsOnDown, setScriptsOnDown] = useState("");
  const [scriptsOnPreUp, setScriptsOnPreUp] = useState("");
  const [scriptsOnUp, setScriptsOnUp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLnsHostName(config.lns?.host_name || "");
      setLnsSharedSecret("");
      setLimitsConnLimit(config.limits?.connection_limit || "");
      setLimitsBurst(config.limits?.burst || "");
      setLimitsTimeout(config.limits?.timeout || "");
      setLogLevel(config.log?.level || "");
      setShaperFwmark(config.shaper?.fwmark || "");
      setSnmpMasterAgent(config.snmp?.master_agent || false);
      setScriptsOnChange(config.extended_scripts?.on_change || "");
      setScriptsOnDown(config.extended_scripts?.on_down || "");
      setScriptsOnPreUp(config.extended_scripts?.on_pre_up || "");
      setScriptsOnUp(config.extended_scripts?.on_up || "");
      setError(null);
    }
  }, [open, config]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await l2tpService.updateAdvancedSettings(config, {
        lns_host_name: lnsHostName,
        lns_shared_secret: lnsSharedSecret || undefined,
        limits_connection_limit: limitsConnLimit,
        limits_burst: limitsBurst,
        limits_timeout: limitsTimeout,
        log_level: logLevel === "__clear__" ? "" : logLevel,
        shaper_fwmark: shaperFwmark,
        snmp_master_agent: snmpMasterAgent,
        scripts_on_change: scriptsOnChange,
        scripts_on_down: scriptsOnDown,
        scripts_on_pre_up: scriptsOnPreUp,
        scripts_on_up: scriptsOnUp,
      });
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update advanced settings");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update advanced settings");
    } finally {
      setLoading(false);
    }
  };

  const logLevels = capabilities?.features.log.levels || ["0", "1", "2", "3", "4", "5"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Advanced Settings
          </DialogTitle>
          <DialogDescription>Configure LNS, limits, logging, and more.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h4 className="text-sm font-medium">LNS Settings</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Host Name</Label>
              <Input value={lnsHostName} onChange={(e) => setLnsHostName(e.target.value)} placeholder="l2tp-server" />
            </div>
            <div className="space-y-2">
              <Label>Shared Secret</Label>
              <Input type="password" value={lnsSharedSecret} onChange={(e) => setLnsSharedSecret(e.target.value)} placeholder={config.lns?.shared_secret ? "Keep current" : "Enter secret"} />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">Connection Limits</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Conn. Limit</Label>
              <Input value={limitsConnLimit} onChange={(e) => setLimitsConnLimit(e.target.value)} placeholder="100" />
            </div>
            <div className="space-y-2">
              <Label>Burst</Label>
              <Input value={limitsBurst} onChange={(e) => setLimitsBurst(e.target.value)} placeholder="10" />
            </div>
            <div className="space-y-2">
              <Label>Timeout</Label>
              <Input value={limitsTimeout} onChange={(e) => setLimitsTimeout(e.target.value)} placeholder="60" />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">Logging & Misc</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Log Level</Label>
              <Select value={logLevel} onValueChange={setLogLevel}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__clear__">Default</SelectItem>
                  {logLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shaper FWMark</Label>
              <Input value={shaperFwmark} onChange={(e) => setShaperFwmark(e.target.value)} placeholder="0x1000" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="snmp-agent" checked={snmpMasterAgent} onCheckedChange={(v) => setSnmpMasterAgent(!!v)} />
            <Label htmlFor="snmp-agent" className="cursor-pointer">SNMP Master Agent</Label>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">Extended Scripts</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>On Change</Label>
              <Input value={scriptsOnChange} onChange={(e) => setScriptsOnChange(e.target.value)} placeholder="/path/to/script" />
            </div>
            <div className="space-y-2">
              <Label>On Down</Label>
              <Input value={scriptsOnDown} onChange={(e) => setScriptsOnDown(e.target.value)} placeholder="/path/to/script" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>On Pre-Up</Label>
              <Input value={scriptsOnPreUp} onChange={(e) => setScriptsOnPreUp(e.target.value)} placeholder="/path/to/script" />
            </div>
            <div className="space-y-2">
              <Label>On Up</Label>
              <Input value={scriptsOnUp} onChange={(e) => setScriptsOnUp(e.target.value)} placeholder="/path/to/script" />
            </div>
          </div>
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
