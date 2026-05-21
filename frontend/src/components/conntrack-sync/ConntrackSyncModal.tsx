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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  Network,
  Layers,
  Settings2,
} from "lucide-react";
import { ConntrackSyncConfig, ConntrackSyncInterface } from "@/lib/api/conntrack-sync";
import { showService } from "@/lib/api/show";

interface ConntrackSyncModalProps {
  open: boolean;
  config: ConntrackSyncConfig;
  onClose: () => void;
  onSubmit: (updated: ConntrackSyncConfig) => Promise<void>;
}

const ACCEPT_PROTOCOLS = ["tcp", "udp", "icmp", "icmp6", "sctp", "dccp"] as const;
const EXPECT_SYNC_PROTOCOLS = ["all", "ftp", "sip", "h323", "nfs", "sqlnet"] as const;

interface IfaceRow extends ConntrackSyncInterface {
  key: number;
}

export function ConntrackSyncModal({ open, config, onClose, onSubmit }: ConntrackSyncModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available interfaces from VyOS
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);
  const [interfacesLoading, setInterfacesLoading] = useState(false);

  // Tab 1 — Interfaces
  const [ifaceRows, setIfaceRows] = useState<IfaceRow[]>([]);
  const [nextKey, setNextKey] = useState(0);

  // Tab 2 — Protocols & Failover
  const [acceptProtocols, setAcceptProtocols] = useState<string[]>([]);
  const [expectSync, setExpectSync] = useState<string[]>([]);
  const [vrrpSyncGroup, setVrrpSyncGroup] = useState("");

  // Tab 3 — Advanced
  const [eventListenQueueSize, setEventListenQueueSize] = useState("");
  const [syncQueueSize, setSyncQueueSize] = useState("");
  const [mcastGroup, setMcastGroup] = useState("");
  const [listenAddresses, setListenAddresses] = useState<string[]>([]);
  const [listenInput, setListenInput] = useState("");
  const [ignoreAddresses, setIgnoreAddresses] = useState<string[]>([]);
  const [ignoreInput, setIgnoreInput] = useState("");
  const [disableExternalCache, setDisableExternalCache] = useState(false);
  const [disableSyslog, setDisableSyslog] = useState(false);
  const [startupResync, setStartupResync] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);

    // Load available interfaces (non-critical)
    setInterfacesLoading(true);
    showService.getAllInterfaces()
      .then((res) => setAvailableInterfaces(res.interfaces.map((i) => i.name).sort()))
      .catch(() => {/* non-critical */})
      .finally(() => setInterfacesLoading(false));

    const rows: IfaceRow[] = config.interfaces.map((iface, i) => ({
      key: i,
      name: iface.name,
      peer: iface.peer ?? null,
      port: iface.port ?? null,
    }));
    setIfaceRows(rows);
    setNextKey(rows.length);

    setAcceptProtocols([...config.accept_protocols]);
    setExpectSync([...config.expect_sync]);
    setVrrpSyncGroup(config.failover_mechanism?.vrrp?.sync_group ?? "");

    setEventListenQueueSize(config.event_listen_queue_size != null ? String(config.event_listen_queue_size) : "");
    setSyncQueueSize(config.sync_queue_size != null ? String(config.sync_queue_size) : "");
    setMcastGroup(config.mcast_group ?? "");
    setListenAddresses([...config.listen_addresses]);
    setIgnoreAddresses([...config.ignore_addresses]);
    setListenInput("");
    setIgnoreInput("");
    setDisableExternalCache(config.disable_external_cache);
    setDisableSyslog(config.disable_syslog);
    setStartupResync(config.startup_resync);
  }, [open, config]);

  function addIfaceRow() {
    setIfaceRows((prev) => [...prev, { key: nextKey, name: "", peer: null, port: null }]);
    setNextKey((k) => k + 1);
  }

  function removeIfaceRow(key: number) {
    setIfaceRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateIfaceRow(key: number, field: keyof ConntrackSyncInterface, value: string) {
    setIfaceRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        if (field === "port") {
          const n = value === "" ? null : parseInt(value, 10);
          return { ...r, port: isNaN(n as number) ? null : n };
        }
        return { ...r, [field]: value || null };
      })
    );
  }

  function toggleProtocol(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((p) => p !== value) : [...list, value]);
  }

  function addListenAddress() {
    const addr = listenInput.trim();
    if (addr && !listenAddresses.includes(addr)) {
      setListenAddresses((prev) => [...prev, addr]);
    }
    setListenInput("");
  }

  function addIgnoreAddress() {
    const addr = ignoreInput.trim();
    if (addr && !ignoreAddresses.includes(addr)) {
      setIgnoreAddresses((prev) => [...prev, addr]);
    }
    setIgnoreInput("");
  }

  function validate(): string | null {
    for (const row of ifaceRows) {
      if (!row.name.trim()) return "All interface rows must have a name.";
      if (row.port != null && (row.port < 1 || row.port > 65535)) {
        return `Interface "${row.name}" port must be between 1 and 65535.`;
      }
    }
    const names = ifaceRows.map((r) => r.name.trim());
    if (new Set(names).size !== names.length) return "Duplicate interface names are not allowed.";
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const updated: ConntrackSyncConfig = {
        accept_protocols: acceptProtocols,
        disable_external_cache: disableExternalCache,
        disable_syslog: disableSyslog,
        event_listen_queue_size: eventListenQueueSize ? parseInt(eventListenQueueSize, 10) : null,
        expect_sync: expectSync,
        failover_mechanism: vrrpSyncGroup.trim()
          ? { vrrp: { sync_group: vrrpSyncGroup.trim() } }
          : null,
        ignore_addresses: ignoreAddresses,
        interfaces: ifaceRows
          .filter((r) => r.name.trim())
          .map((r) => ({ name: r.name.trim(), peer: r.peer || null, port: r.port ?? null })),
        listen_addresses: listenAddresses,
        mcast_group: mcastGroup.trim() || null,
        startup_resync: startupResync,
        sync_queue_size: syncQueueSize ? parseInt(syncQueueSize, 10) : null,
      };
      await onSubmit(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure Conntrack Sync</DialogTitle>
          <DialogDescription>
            Synchronize connection tracking tables between firewall nodes for high availability.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="interfaces" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="interfaces" className="flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5" />
              Interfaces
            </TabsTrigger>
            <TabsTrigger value="protocols" className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Protocols &amp; Failover
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Interfaces ── */}
          <TabsContent value="interfaces" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">
                  Configure the interface used to exchange conntrack updates. Leave{" "}
                  <span className="font-medium">Peer</span> empty to use multicast (default{" "}
                  <span className="font-mono text-xs">225.0.0.50</span>), or enter a unicast IPv4
                  address to bypass multicast.
                </p>

                {ifaceRows.length === 0 && (
                  <div className="border border-dashed rounded-md p-6 text-center text-sm text-muted-foreground">
                    No interfaces configured. Add one below.
                  </div>
                )}

                {ifaceRows.map((row) => (
                  <div key={row.key} className="grid grid-cols-[1fr_1fr_100px_32px] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Interface</Label>
                      <Select
                        value={row.name || undefined}
                        onValueChange={(val) => updateIfaceRow(row.key, "name", val)}
                        disabled={interfacesLoading}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={interfacesLoading ? "Loading..." : "Select interface"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableInterfaces
                            .filter(
                              (iface) =>
                                iface === row.name ||
                                !ifaceRows.some((r) => r.key !== row.key && r.name === iface)
                            )
                            .map((iface) => (
                              <SelectItem key={iface} value={iface}>
                                {iface}
                              </SelectItem>
                            ))}
                          {availableInterfaces.length === 0 && !interfacesLoading && (
                            <SelectItem value="" disabled>
                              No interfaces found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Peer IP (optional)</Label>
                      <Input
                        placeholder="e.g. 10.0.0.2"
                        value={row.peer ?? ""}
                        onChange={(e) => updateIfaceRow(row.key, "peer", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Port</Label>
                      <Input
                        type="number"
                        placeholder="3780"
                        min={1}
                        max={65535}
                        value={row.port ?? ""}
                        onChange={(e) => updateIfaceRow(row.key, "port", e.target.value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive mb-0"
                      onClick={() => removeIfaceRow(row.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button variant="outline" size="sm" className="mt-1" onClick={addIfaceRow}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Interface
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Tab 2: Protocols & Failover ── */}
          <TabsContent value="protocols" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-2">
                {/* Accept Protocols */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Accept Protocols</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Local conntrack entries for selected protocols will be synced to the peer.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {ACCEPT_PROTOCOLS.map((proto) => (
                      <div key={proto} className="flex items-center space-x-2">
                        <Checkbox
                          id={`accept-${proto}`}
                          checked={acceptProtocols.includes(proto)}
                          onCheckedChange={() =>
                            toggleProtocol(acceptProtocols, setAcceptProtocols, proto)
                          }
                        />
                        <Label htmlFor={`accept-${proto}`} className="font-mono text-sm cursor-pointer">
                          {proto}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expect Sync */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Expect Sync</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Synchronize helper-created expect entries for application-layer protocols.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {EXPECT_SYNC_PROTOCOLS.map((proto) => (
                      <div key={proto} className="flex items-center space-x-2">
                        <Checkbox
                          id={`expect-${proto}`}
                          checked={expectSync.includes(proto)}
                          onCheckedChange={() =>
                            toggleProtocol(expectSync, setExpectSync, proto)
                          }
                        />
                        <Label htmlFor={`expect-${proto}`} className="font-mono text-sm cursor-pointer">
                          {proto}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Failover Mechanism */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Failover Mechanism</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      VRRP sync-group used to determine active/backup state.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vrrp-sync-group" className="text-xs">
                      VRRP Sync Group
                    </Label>
                    <Input
                      id="vrrp-sync-group"
                      placeholder="e.g. VYOS"
                      value={vrrpSyncGroup}
                      onChange={(e) => setVrrpSyncGroup(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Tab 3: Advanced ── */}
          <TabsContent value="advanced" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-2">
                {/* Queue Sizes */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Queue Sizes</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="event-queue" className="text-xs">
                        Event Listen Queue (MB)
                      </Label>
                      <Input
                        id="event-queue"
                        type="number"
                        min={1}
                        placeholder="Default: 8"
                        value={eventListenQueueSize}
                        onChange={(e) => setEventListenQueueSize(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sync-queue" className="text-xs">
                        Sync Queue (MB)
                      </Label>
                      <Input
                        id="sync-queue"
                        type="number"
                        min={1}
                        placeholder="Default: 1"
                        value={syncQueueSize}
                        onChange={(e) => setSyncQueueSize(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Multicast Group */}
                <div className="space-y-1.5">
                  <Label htmlFor="mcast-group" className="text-sm font-medium">
                    Multicast Group
                  </Label>
                  <Input
                    id="mcast-group"
                    placeholder="Default: 225.0.0.50"
                    value={mcastGroup}
                    onChange={(e) => setMcastGroup(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    IPv4 multicast address used when no unicast peer is configured.
                  </p>
                </div>

                {/* Listen Addresses */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Listen Addresses</Label>
                  <p className="text-xs text-muted-foreground">
                    Local IPv4 addresses to listen on for incoming sync traffic.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 10.0.0.1"
                      value={listenInput}
                      onChange={(e) => setListenInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addListenAddress())}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addListenAddress}>
                      Add
                    </Button>
                  </div>
                  {listenAddresses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {listenAddresses.map((addr) => (
                        <Badge
                          key={addr}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground gap-1"
                          onClick={() => setListenAddresses((prev) => prev.filter((a) => a !== addr))}
                        >
                          {addr} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ignore Addresses */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ignore Addresses</Label>
                  <p className="text-xs text-muted-foreground">
                    IPv4/IPv6 addresses or prefixes excluded from synchronization.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 192.168.1.0/24"
                      value={ignoreInput}
                      onChange={(e) => setIgnoreInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIgnoreAddress())}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addIgnoreAddress}>
                      Add
                    </Button>
                  </div>
                  {ignoreAddresses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {ignoreAddresses.map((addr) => (
                        <Badge
                          key={addr}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground gap-1"
                          onClick={() => setIgnoreAddresses((prev) => prev.filter((a) => a !== addr))}
                        >
                          {addr} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Flags */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Options</Label>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2.5">
                      <Checkbox
                        id="disable-external-cache"
                        checked={disableExternalCache}
                        onCheckedChange={(v) => setDisableExternalCache(!!v)}
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="disable-external-cache" className="cursor-pointer font-normal">
                          Disable External Cache
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Directly inject flow-states into the kernel connection tracking system of the backup node.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <Checkbox
                        id="disable-syslog"
                        checked={disableSyslog}
                        onCheckedChange={(v) => setDisableSyslog(!!v)}
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="disable-syslog" className="cursor-pointer font-normal">
                          Disable Syslog
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Suppress connection tracking event logging via syslog.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <Checkbox
                        id="startup-resync"
                        checked={startupResync}
                        onCheckedChange={(v) => setStartupResync(!!v)}
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="startup-resync" className="cursor-pointer font-normal">
                          Startup Resync
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Request a full conntrack table resync from the peer at startup.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 shrink-0 mt-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive whitespace-pre-wrap font-mono">{error}</p>
          </div>
        )}

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
