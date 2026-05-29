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
import { AlertCircle, Loader2, Plus, Settings, Trash2 } from "lucide-react";
import { pppoeServerService, PPPoEConfigResponse, PPPoEPadoDelay } from "@/lib/api/pppoe-server";
import { ApiError } from "@/lib/types/api";

interface AdvancedSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: PPPoEConfigResponse;
}

export function AdvancedSettingsModal({ open, onOpenChange, onSuccess, config }: AdvancedSettingsModalProps) {
  const [logLevel, setLogLevel] = useState("__clear__");
  const [limitsBurst, setLimitsBurst] = useState("");
  const [limitsConnLimit, setLimitsConnLimit] = useState("");
  const [limitsTimeout, setLimitsTimeout] = useState("");
  const [padoDelays, setPadoDelays] = useState<PPPoEPadoDelay[]>([]);
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
      setLogLevel(config.log?.level || "__clear__");
      setLimitsBurst(config.limits?.burst || "");
      setLimitsConnLimit(config.limits?.connection_limit || "");
      setLimitsTimeout(config.limits?.timeout || "");
      setPadoDelays(config.pado_delays ? [...config.pado_delays] : []);
      setShaperFwmark(config.shaper?.fwmark || "");
      setSnmpMasterAgent(config.snmp?.master_agent || false);
      setScriptsOnChange(config.extended_scripts?.on_change || "");
      setScriptsOnDown(config.extended_scripts?.on_down || "");
      setScriptsOnPreUp(config.extended_scripts?.on_pre_up || "");
      setScriptsOnUp(config.extended_scripts?.on_up || "");
      setError(null);
    }
  }, [open, config]);

  const updatePadoDelay = (i: number, field: keyof PPPoEPadoDelay, value: string) => {
    const updated = [...padoDelays];
    updated[i] = { ...updated[i], [field]: value };
    setPadoDelays(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pppoeServerService.updateAdvancedSettings(config, {
        log_level: logLevel === "__clear__" ? "" : logLevel,
        shaper_fwmark: shaperFwmark,
        snmp_master_agent: snmpMasterAgent,
        limits_burst: limitsBurst,
        limits_connection_limit: limitsConnLimit,
        limits_timeout: limitsTimeout,
        scripts_on_change: scriptsOnChange,
        scripts_on_down: scriptsOnDown,
        scripts_on_pre_up: scriptsOnPreUp,
        scripts_on_up: scriptsOnUp,
        pado_delays: padoDelays,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Advanced Settings
          </DialogTitle>
          <DialogDescription>Configure logging, PADO delays, limits, shaper, SNMP, and scripts.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Log Level</Label>
            <Select value={logLevel} onValueChange={setLogLevel}>
              <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">Default (unset)</SelectItem>
                <SelectItem value="0">0 — Off</SelectItem>
                <SelectItem value="1">1 — Errors</SelectItem>
                <SelectItem value="2">2 — Warnings</SelectItem>
                <SelectItem value="3">3 — Info</SelectItem>
                <SelectItem value="4">4 — Full Info</SelectItem>
                <SelectItem value="5">5 — Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">PADO Delays</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPadoDelays([...padoDelays, { delay: "", sessions: "" }])}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {padoDelays.length === 0 && (
            <p className="text-xs text-muted-foreground">No PADO delays configured.</p>
          )}
          {padoDelays.map((d, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="flex-1 space-y-1">
                <Input
                  value={d.delay}
                  onChange={(e) => updatePadoDelay(i, "delay", e.target.value)}
                  placeholder="delay (ms or 'disable')"
                  className="font-mono text-sm"
                />
              </div>
              <div className="w-32 space-y-1">
                <Input
                  value={d.sessions || ""}
                  onChange={(e) => updatePadoDelay(i, "sessions", e.target.value)}
                  placeholder="sessions"
                  className="text-sm"
                />
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setPadoDelays(padoDelays.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          <Separator />
          <h4 className="text-sm font-medium">Connection Limits</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Burst</Label>
              <Input value={limitsBurst} onChange={(e) => setLimitsBurst(e.target.value)} placeholder="10" />
            </div>
            <div className="space-y-2">
              <Label>Conn. Limit</Label>
              <Input value={limitsConnLimit} onChange={(e) => setLimitsConnLimit(e.target.value)} placeholder="60/sec" />
            </div>
            <div className="space-y-2">
              <Label>Timeout</Label>
              <Input value={limitsTimeout} onChange={(e) => setLimitsTimeout(e.target.value)} placeholder="seconds" />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">Shaper</h4>
          <div className="space-y-2">
            <Label>FWMark</Label>
            <Input value={shaperFwmark} onChange={(e) => setShaperFwmark(e.target.value)} placeholder="0x1000" />
          </div>

          <Separator />
          <h4 className="text-sm font-medium">SNMP</h4>
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
