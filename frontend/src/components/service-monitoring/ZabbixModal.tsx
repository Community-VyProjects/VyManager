"use client";

import { useState, KeyboardEvent } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  ZabbixConfig,
  ZabbixServerActive,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";

interface ZabbixModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: ZabbixConfig | null;
  caps: ServiceMonitoringCapabilities;
  onSuccess: () => void;
}

export function ZabbixModal({ open, onOpenChange, original, caps, onSuccess }: ZabbixModalProps) {
  const [hostName, setHostName] = useState(original?.host_name ?? "");
  const [port, setPort] = useState(original?.port ? String(original.port) : "");
  const [directory, setDirectory] = useState(original?.directory ?? "");
  const [timeout, setTimeout] = useState(original?.timeout ? String(original.timeout) : "");

  const [listenAddresses, setListenAddresses] = useState<string[]>(original?.listen_addresses ?? []);
  const [listenInput, setListenInput] = useState("");

  const [servers, setServers] = useState<string[]>(original?.servers ?? []);
  const [serverInput, setServerInput] = useState("");

  const [serversActive, setServersActive] = useState<ZabbixServerActive[]>(
    original?.servers_active ?? []
  );
  const [activeAddrInput, setActiveAddrInput] = useState("");
  const [activePortInput, setActivePortInput] = useState("");

  const [authMode, setAuthMode] = useState(original?.authentication?.mode ?? "");
  const [pskId, setPskId] = useState(original?.authentication?.psk_id ?? "");
  const [pskSecret, setPskSecret] = useState(original?.authentication?.psk_secret ?? "");

  const [bufferFlushInterval, setBufferFlushInterval] = useState(
    original?.limits?.buffer_flush_interval ? String(original.limits.buffer_flush_interval) : ""
  );
  const [bufferSize, setBufferSize] = useState(
    original?.limits?.buffer_size ? String(original.limits.buffer_size) : ""
  );

  const [debugLevel, setDebugLevel] = useState(original?.log?.debug_level ?? "");
  const [logSize, setLogSize] = useState(
    original?.log?.size ? String(original.log.size) : ""
  );
  const [remoteCommands, setRemoteCommands] = useState(original?.log?.remote_commands ?? false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authModes = caps.features.zabbix_agent.auth_modes;
  const debugLevels = caps.features.zabbix_agent.log_debug_levels;

  const addListenAddress = () => {
    const val = listenInput.trim();
    if (!val || listenAddresses.includes(val)) return;
    setListenAddresses((prev) => [...prev, val]);
    setListenInput("");
  };

  const addServer = () => {
    const val = serverInput.trim();
    if (!val || servers.includes(val)) return;
    setServers((prev) => [...prev, val]);
    setServerInput("");
  };

  const addActiveServer = () => {
    const addr = activeAddrInput.trim();
    if (!addr || serversActive.some((s) => s.address === addr)) return;
    setServersActive((prev) => [
      ...prev,
      { address: addr, port: activePortInput ? parseInt(activePortInput, 10) : null },
    ]);
    setActiveAddrInput("");
    setActivePortInput("");
  };

  const removeActiveServer = (addr: string) => {
    setServersActive((prev) => prev.filter((s) => s.address !== addr));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await serviceMonitoringService.saveZabbix(original, {
        host_name: hostName || null,
        port: port ? parseInt(port, 10) : null,
        listen_addresses: listenAddresses,
        directory: directory || null,
        timeout: timeout ? parseInt(timeout, 10) : null,
        servers,
        servers_active: serversActive,
        authentication: {
          mode: authMode || null,
          psk_id: pskId || null,
          psk_secret: pskSecret || null,
        },
        limits: {
          buffer_flush_interval: bufferFlushInterval ? parseInt(bufferFlushInterval, 10) : null,
          buffer_size: bufferSize ? parseInt(bufferSize, 10) : null,
        },
        log: {
          debug_level: debugLevel || null,
          size: logSize ? parseInt(logSize, 10) : null,
          remote_commands: remoteCommands,
        },
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const kd = (fn: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); fn(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{original ? "Edit Zabbix Agent" : "Configure Zabbix Agent"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 py-1">
            {/* Identity */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Identity</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="z-hostname">Host Name</Label>
                  <Input id="z-hostname" value={hostName} onChange={(e) => setHostName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="z-port">Port</Label>
                  <Input id="z-port" type="number" placeholder="10050" value={port} onChange={(e) => setPort(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="z-dir">Directory</Label>
                <Input id="z-dir" placeholder="/etc/zabbix" value={directory} onChange={(e) => setDirectory(e.target.value)} />
              </div>
            </div>

            <Separator />

            {/* Timeout */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Timeout</p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  placeholder="3"
                  min={caps.features.zabbix_agent.timeout.min}
                  max={caps.features.zabbix_agent.timeout.max}
                  value={timeout}
                  onChange={(e) => setTimeout(e.target.value)}
                  className="max-w-[120px]"
                />
                <span className="text-sm text-muted-foreground">seconds (1–30)</span>
              </div>
            </div>

            <Separator />

            {/* Listen Addresses */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Listen Addresses</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 0.0.0.0"
                  value={listenInput}
                  onChange={(e) => setListenInput(e.target.value)}
                  onKeyDown={kd(addListenAddress)}
                />
                <Button type="button" size="sm" variant="outline" onClick={addListenAddress}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {listenAddresses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {listenAddresses.map((a) => (
                    <Badge key={a} variant="secondary" className="font-mono gap-1 pr-1">
                      {a}
                      <button type="button" onClick={() => setListenAddresses((p) => p.filter((x) => x !== a))} className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Passive Servers */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Passive Servers</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 192.168.1.10"
                  value={serverInput}
                  onChange={(e) => setServerInput(e.target.value)}
                  onKeyDown={kd(addServer)}
                />
                <Button type="button" size="sm" variant="outline" onClick={addServer}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {servers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {servers.map((s) => (
                    <Badge key={s} variant="secondary" className="font-mono gap-1 pr-1">
                      {s}
                      <button type="button" onClick={() => setServers((p) => p.filter((x) => x !== s))} className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Active Servers */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Active Servers</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Address"
                  value={activeAddrInput}
                  onChange={(e) => setActiveAddrInput(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Port (optional)"
                  type="number"
                  value={activePortInput}
                  onChange={(e) => setActivePortInput(e.target.value)}
                  className="w-32"
                />
                <Button type="button" size="sm" variant="outline" onClick={addActiveServer}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {serversActive.length > 0 && (
                <div className="space-y-1">
                  {serversActive.map((s) => (
                    <div key={s.address} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                      <span className="font-mono">{s.address}{s.port ? `:${s.port}` : ""}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeActiveServer(s.address)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Authentication */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Authentication</p>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={authMode} onValueChange={setAuthMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {authModes.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {authMode === "pre-shared-secret" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="z-psk-id">PSK ID</Label>
                    <Input id="z-psk-id" value={pskId} onChange={(e) => setPskId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="z-psk-secret">PSK Secret</Label>
                    <Input id="z-psk-secret" type="password" value={pskSecret} onChange={(e) => setPskSecret(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Buffer Limits */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Buffer Limits</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="z-flush">Flush Interval (s)</Label>
                  <Input
                    id="z-flush"
                    type="number"
                    placeholder={String(caps.features.zabbix_agent.limits.buffer_flush_interval.default)}
                    value={bufferFlushInterval}
                    onChange={(e) => setBufferFlushInterval(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="z-buf-size">Buffer Size</Label>
                  <Input
                    id="z-buf-size"
                    type="number"
                    placeholder={String(caps.features.zabbix_agent.limits.buffer_size.default)}
                    value={bufferSize}
                    onChange={(e) => setBufferSize(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Logging */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Logging</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Debug Level</Label>
                  <Select value={debugLevel} onValueChange={setDebugLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      {debugLevels.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="z-log-size">Log Size (MB)</Label>
                  <Input
                    id="z-log-size"
                    type="number"
                    value={logSize}
                    onChange={(e) => setLogSize(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="z-remote-commands"
                  checked={remoteCommands}
                  onCheckedChange={(c) => setRemoteCommands(!!c)}
                />
                <Label htmlFor="z-remote-commands" className="cursor-pointer">
                  Allow remote commands from Zabbix server
                </Label>
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
