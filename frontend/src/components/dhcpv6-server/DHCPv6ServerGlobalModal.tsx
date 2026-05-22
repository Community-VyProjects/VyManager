"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import {
  dhcpv6ServerService,
  DHCPv6ServerConfig,
  DHCPv6ServerCapabilities,
} from "@/lib/api/dhcpv6-server";

interface Props {
  open: boolean;
  config: DHCPv6ServerConfig;
  caps: DHCPv6ServerCapabilities;
  onClose: () => void;
  onSuccess: () => void;
}

export function DHCPv6ServerGlobalModal({ open, config, caps, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serverDisabled, setServerDisabled] = useState(false);
  const [preference, setPreference] = useState("");
  const [globalNameServers, setGlobalNameServers] = useState<string[]>([]);
  const [nsInput, setNsInput] = useState("");
  const [listenInterfaces, setListenInterfaces] = useState<string[]>([]);
  const [ifaceInput, setIfaceInput] = useState("");
  const [disableRouteAutoinstall, setDisableRouteAutoinstall] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setServerDisabled(config.disabled);
    setPreference(config.preference != null ? String(config.preference) : "");
    setGlobalNameServers([...config.global_name_servers]);
    setNsInput("");
    setListenInterfaces([...config.listen_interfaces]);
    setIfaceInput("");
    setDisableRouteAutoinstall(config.disable_route_autoinstall);
  }, [open, config]);

  function addNs() {
    const v = nsInput.trim();
    if (v && !globalNameServers.includes(v)) {
      setGlobalNameServers((prev) => [...prev, v]);
    }
    setNsInput("");
  }

  function removeNs(ns: string) {
    setGlobalNameServers((prev) => prev.filter((x) => x !== ns));
  }

  function addIface() {
    const v = ifaceInput.trim();
    if (v && !listenInterfaces.includes(v)) {
      setListenInterfaces((prev) => [...prev, v]);
    }
    setIfaceInput("");
  }

  function removeIface(iface: string) {
    setListenInterfaces((prev) => prev.filter((x) => x !== iface));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    const prefVal = preference.trim() !== "" ? parseInt(preference.trim(), 10) : null;

    const result = await dhcpv6ServerService.saveGlobalSettings(config, {
      disabled: serverDisabled,
      preference: prefVal,
      global_name_servers: globalNameServers,
      listen_interfaces: listenInterfaces,
      disable_route_autoinstall: disableRouteAutoinstall,
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Operation failed");
      return;
    }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Global DHCPv6 Server Settings</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-5 py-1">
            {/* Disable Server */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="server-disabled"
                checked={serverDisabled}
                onCheckedChange={(v) => setServerDisabled(Boolean(v))}
              />
              <Label htmlFor="server-disabled" className="cursor-pointer">Disable DHCPv6 Server</Label>
            </div>

            {/* Preference */}
            <div className="space-y-1.5">
              <Label htmlFor="preference">Server Preference (0–255)</Label>
              <Input
                id="preference"
                type="number"
                min={0}
                max={255}
                placeholder="Optional (default 0)"
                value={preference}
                onChange={(e) => setPreference(e.target.value)}
              />
            </div>

            {/* Global Name Servers */}
            <div className="space-y-1.5">
              <Label>Global Name Servers</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="2001:db8::1"
                  value={nsInput}
                  onChange={(e) => setNsInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNs())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addNs}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {globalNameServers.length > 0 && (
                <div className="space-y-1 mt-1">
                  {globalNameServers.map((ns) => (
                    <div key={ns} className="flex items-center justify-between px-2 py-1 rounded bg-muted/50 text-sm font-mono">
                      <span>{ns}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeNs(ns)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Listen Interfaces (1.5 only) */}
            {caps.features.listen_interface.supported && (
              <div className="space-y-1.5">
                <Label>Listen Interfaces</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="eth0"
                    value={ifaceInput}
                    onChange={(e) => setIfaceInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIface())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addIface}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {listenInterfaces.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {listenInterfaces.map((iface) => (
                      <div key={iface} className="flex items-center justify-between px-2 py-1 rounded bg-muted/50 text-sm font-mono">
                        <span>{iface}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeIface(iface)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Disable Route Autoinstall (1.5 only) */}
            {caps.features.disable_route_autoinstall.supported && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="disable-route-autoinstall"
                  checked={disableRouteAutoinstall}
                  onCheckedChange={(v) => setDisableRouteAutoinstall(Boolean(v))}
                />
                <Label htmlFor="disable-route-autoinstall" className="cursor-pointer">
                  Disable Route Autoinstall
                  <span className="ml-1 text-xs text-muted-foreground">(do not install delegated-prefix routes)</span>
                </Label>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
