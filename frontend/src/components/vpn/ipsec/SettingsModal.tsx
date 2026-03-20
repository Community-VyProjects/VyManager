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
import { AlertCircle, Loader2, Settings } from "lucide-react";
import {
  ipsecService,
  IPSecOptions,
  IPSecLog,
  IPSecCapabilities,
  BatchOperation,
} from "@/lib/api/ipsec";
import { showService, InterfaceName } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: IPSecCapabilities | null;
  currentOptions: IPSecOptions;
  currentLog: IPSecLog;
  currentInterfaces: string[];
  disableUniqreqids: boolean;
}

const LOG_LEVELS = ["0", "1", "2", "3", "4"];
const LOG_SUBSYSTEMS = ["dmn", "mgr", "ike", "chd", "job", "cfg", "knl", "net", "asn", "enc", "lib", "esp", "tls"];

export function SettingsModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  currentOptions,
  currentLog,
  currentInterfaces,
  disableUniqreqids: currentDisableUniqreqids,
}: SettingsModalProps) {
  const [allInterfaces, setAllInterfaces] = useState<InterfaceName[]>([]);

  // Options
  const [disableRouteAutoinstall, setDisableRouteAutoinstall] = useState(false);
  const [flexvpn, setFlexvpn] = useState(false);
  const [virtualIp, setVirtualIp] = useState(false);
  const [disableUniqreqids, setDisableUniqreqids] = useState(false);
  const [interfaces, setInterfaces] = useState("");

  // Logging
  const [logLevel, setLogLevel] = useState("");
  const [logSubsystems, setLogSubsystems] = useState<string[]>([]);

  // Retransmission (1.5 only)
  const [retransmissionAttempts, setRetransmissionAttempts] = useState("");
  const [retransmissionBase, setRetransmissionBase] = useState("");
  const [retransmissionTimeout, setRetransmissionTimeout] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    showService.getAllInterfaces().then((res) => setAllInterfaces(res.interfaces)).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setDisableRouteAutoinstall(currentOptions.disable_route_autoinstall || false);
      setFlexvpn(currentOptions.flexvpn || false);
      setVirtualIp(currentOptions.virtual_ip || false);
      setDisableUniqreqids(currentDisableUniqreqids);
      setInterfaces(currentInterfaces.join(", "));
      setLogLevel(currentLog.level || "");
      setLogSubsystems(currentLog.subsystems || []);
      setRetransmissionAttempts(currentOptions.retransmission_attempts || "");
      setRetransmissionBase(currentOptions.retransmission_base || "");
      setRetransmissionTimeout(currentOptions.retransmission_timeout || "");
      setError(null);
    }
  }, [open, currentOptions, currentLog, currentInterfaces, currentDisableUniqreqids]);

  const toggleSubsystem = (sub: string) => {
    setLogSubsystems((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build operations for boolean toggles
      // These use a dummy item_name since the builder methods take 0 params
      const toggleOps: Array<{ itemName: string; ops: BatchOperation[] }> = [];

      // Disable route autoinstall
      if (disableRouteAutoinstall !== (currentOptions.disable_route_autoinstall || false)) {
        toggleOps.push({
          itemName: "_settings",
          ops: [{ op: disableRouteAutoinstall ? "set_options_disable_route_autoinstall" : "delete_options_disable_route_autoinstall" }],
        });
      }

      // FlexVPN
      if (flexvpn !== (currentOptions.flexvpn || false)) {
        toggleOps.push({
          itemName: "_settings",
          ops: [{ op: flexvpn ? "set_options_flexvpn" : "delete_options_flexvpn" }],
        });
      }

      // Virtual IP
      if (virtualIp !== (currentOptions.virtual_ip || false)) {
        toggleOps.push({
          itemName: "_settings",
          ops: [{ op: virtualIp ? "set_options_virtual_ip" : "delete_options_virtual_ip" }],
        });
      }

      // Disable unique req IDs
      if (disableUniqreqids !== currentDisableUniqreqids) {
        toggleOps.push({
          itemName: "_settings",
          ops: [{ op: disableUniqreqids ? "set_disable_uniqreqids" : "delete_disable_uniqreqids" }],
        });
      }

      // Interfaces - delete old, set new
      const newInterfaces = interfaces.split(",").map((i) => i.trim()).filter(Boolean);
      for (const oldIface of currentInterfaces) {
        if (!newInterfaces.includes(oldIface)) {
          toggleOps.push({
            itemName: oldIface,
            ops: [{ op: "delete_interface" }],
          });
        }
      }
      for (const newIface of newInterfaces) {
        if (!currentInterfaces.includes(newIface)) {
          toggleOps.push({
            itemName: newIface,
            ops: [{ op: "set_interface" }],
          });
        }
      }

      // Log level
      const currentLevel = currentLog.level || "";
      if (logLevel !== currentLevel) {
        if (currentLevel) {
          toggleOps.push({ itemName: currentLevel, ops: [{ op: "delete_log_level" }] });
        }
        if (logLevel) {
          toggleOps.push({ itemName: logLevel, ops: [{ op: "set_log_level" }] });
        }
      }

      // Log subsystems - delete removed, add new
      const currentSubs = currentLog.subsystems || [];
      for (const oldSub of currentSubs) {
        if (!logSubsystems.includes(oldSub)) {
          toggleOps.push({ itemName: oldSub, ops: [{ op: "delete_log_subsystem" }] });
        }
      }
      for (const newSub of logSubsystems) {
        if (!currentSubs.includes(newSub)) {
          toggleOps.push({ itemName: newSub, ops: [{ op: "set_log_subsystem" }] });
        }
      }

      // Retransmission (1.5 only)
      if (capabilities?.features.retransmission_options.supported) {
        const curAttempts = currentOptions.retransmission_attempts || "";
        if (retransmissionAttempts !== curAttempts) {
          if (curAttempts) toggleOps.push({ itemName: curAttempts, ops: [{ op: "delete_options_retransmission_attempts" }] });
          if (retransmissionAttempts) toggleOps.push({ itemName: retransmissionAttempts, ops: [{ op: "set_options_retransmission_attempts" }] });
        }
        const curBase = currentOptions.retransmission_base || "";
        if (retransmissionBase !== curBase) {
          if (curBase) toggleOps.push({ itemName: curBase, ops: [{ op: "delete_options_retransmission_base" }] });
          if (retransmissionBase) toggleOps.push({ itemName: retransmissionBase, ops: [{ op: "set_options_retransmission_base" }] });
        }
        const curTimeout = currentOptions.retransmission_timeout || "";
        if (retransmissionTimeout !== curTimeout) {
          if (curTimeout) toggleOps.push({ itemName: curTimeout, ops: [{ op: "delete_options_retransmission_timeout" }] });
          if (retransmissionTimeout) toggleOps.push({ itemName: retransmissionTimeout, ops: [{ op: "set_options_retransmission_timeout" }] });
        }
      }

      if (toggleOps.length === 0) {
        onOpenChange(false);
        return;
      }

      // Execute all operations
      for (const batch of toggleOps) {
        const result = await ipsecService.executeBatch(batch.itemName, batch.ops);
        if (!result.success) {
          setError(result.error || "Failed to update settings");
          setLoading(false);
          return;
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to update settings");
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
            IPSec Global Settings
          </DialogTitle>
          <DialogDescription>
            Configure global IPSec options, logging, and interfaces.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Options</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="disableRouteAutoinstall" checked={disableRouteAutoinstall} onCheckedChange={(c) => setDisableRouteAutoinstall(c === true)} />
                <Label htmlFor="disableRouteAutoinstall" className="cursor-pointer text-sm">Disable Route Auto-install</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="flexvpn" checked={flexvpn} onCheckedChange={(c) => setFlexvpn(c === true)} />
                <Label htmlFor="flexvpn" className="cursor-pointer text-sm">FlexVPN</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="virtualIp" checked={virtualIp} onCheckedChange={(c) => setVirtualIp(c === true)} />
                <Label htmlFor="virtualIp" className="cursor-pointer text-sm">Virtual IP</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="disableUniqreqids" checked={disableUniqreqids} onCheckedChange={(c) => setDisableUniqreqids(c === true)} />
                <Label htmlFor="disableUniqreqids" className="cursor-pointer text-sm">Disable Unique Request IDs</Label>
              </div>
            </div>
          </div>

          {/* Interfaces */}
          <div className="space-y-2">
            <Label>Interfaces</Label>
            {allInterfaces.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {allInterfaces.map((iface) => {
                  const selected = interfaces.split(",").map((i) => i.trim()).filter(Boolean);
                  const isChecked = selected.includes(iface.name);
                  return (
                    <div key={iface.name} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`iface-${iface.name}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setInterfaces([...selected, iface.name].join(", "));
                          } else {
                            setInterfaces(selected.filter((i) => i !== iface.name).join(", "));
                          }
                        }}
                      />
                      <Label htmlFor={`iface-${iface.name}`} className="cursor-pointer text-xs font-mono">{iface.name}</Label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No interfaces available</p>
            )}
            <p className="text-xs text-muted-foreground">Select interfaces to listen on</p>
          </div>

          {/* Logging */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Logging</Label>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Log Level</Label>
              <Select value={logLevel || "_default"} onValueChange={(v) => setLogLevel(v === "_default" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_default">Default</SelectItem>
                  {LOG_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Subsystems</Label>
              <div className="grid grid-cols-4 gap-2">
                {LOG_SUBSYSTEMS.map((sub) => (
                  <div key={sub} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`sub-${sub}`}
                      checked={logSubsystems.includes(sub)}
                      onCheckedChange={() => toggleSubsystem(sub)}
                    />
                    <Label htmlFor={`sub-${sub}`} className="cursor-pointer text-xs font-mono">{sub}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Retransmission (1.5 only) */}
          {capabilities?.features.retransmission_options.supported && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Retransmission</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Attempts</Label>
                  <Input value={retransmissionAttempts} onChange={(e) => setRetransmissionAttempts(e.target.value)} placeholder="Default" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Base</Label>
                  <Input value={retransmissionBase} onChange={(e) => setRetransmissionBase(e.target.value)} placeholder="Default" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Timeout</Label>
                  <Input value={retransmissionTimeout} onChange={(e) => setRetransmissionTimeout(e.target.value)} placeholder="Default" />
                </div>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
