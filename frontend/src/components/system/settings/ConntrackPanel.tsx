"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Edit2, Plus, Trash2 } from "lucide-react";
import {
  systemSettingsService,
  type SystemConfig,
  type SystemCapabilities,
} from "@/lib/api/system-settings";
import { useToast } from "@/hooks/useToast";

interface Props {
  config: SystemConfig;
  capabilities: SystemCapabilities;
  isReadOnly: boolean;
  onRefresh: () => void;
}

export function ConntrackPanel({ config, capabilities, isReadOnly, onRefresh }: Props) {
  const { toast } = useToast();
  const availableModules = capabilities.conntrack.available_modules;

  // Module toggle
  const [togglingModule, setTogglingModule] = useState<string | null>(null);

  // Table sizes editing
  const [editingSizes, setEditingSizes] = useState(false);
  const [tableSize, setTableSize] = useState(
    config.conntrack.table_size ? String(config.conntrack.table_size) : ""
  );
  const [hashSize, setHashSize] = useState(
    config.conntrack.hash_size ? String(config.conntrack.hash_size) : ""
  );
  const [expectSize, setExpectSize] = useState(
    config.conntrack.expect_table_size ? String(config.conntrack.expect_table_size) : ""
  );
  const [sizesSaving, setSizesSaving] = useState(false);
  const [sizesError, setSizesError] = useState<string | null>(null);

  // TCP settings editing
  const [editingTcp, setEditingTcp] = useState(false);
  const [tcpLoose, setTcpLoose] = useState(config.conntrack.tcp_loose ?? "");
  const [tcpHalfOpen, setTcpHalfOpen] = useState(
    config.conntrack.tcp_half_open_connections ? String(config.conntrack.tcp_half_open_connections) : ""
  );
  const [tcpMaxRetrans, setTcpMaxRetrans] = useState(
    config.conntrack.tcp_max_retrans ? String(config.conntrack.tcp_max_retrans) : ""
  );
  const [tcpSaving, setTcpSaving] = useState(false);
  const [tcpError, setTcpError] = useState<string | null>(null);

  // Flow accounting
  const [addingFlowIface, setAddingFlowIface] = useState(false);
  const [flowIface, setFlowIface] = useState("");
  const [flowIfaceSaving, setFlowIfaceSaving] = useState(false);
  const [flowIfaceError, setFlowIfaceError] = useState<string | null>(null);
  const [deleteFlowIface, setDeleteFlowIface] = useState<string | null>(null);
  const [deletingFlowIface, setDeletingFlowIface] = useState(false);

  // Conntrack log
  const [addingLogEvent, setAddingLogEvent] = useState(false);
  const [logEvent, setLogEvent] = useState("new");
  const [logProtocol, setLogProtocol] = useState("all");
  const [logEventSaving, setLogEventSaving] = useState(false);
  const [logEventError, setLogEventError] = useState<string | null>(null);
  const [deleteLogEntry, setDeleteLogEntry] = useState<{ event: string; protocol: string } | null>(null);
  const [deletingLogEntry, setDeletingLogEntry] = useState(false);

  // Global timeouts
  const [editingGlobalTimeouts, setEditingGlobalTimeouts] = useState(false);
  const gt = config.conntrack_global_timeouts;
  const [gtIcmp, setGtIcmp] = useState(gt?.icmp ? String(gt.icmp) : "");
  const [gtOther, setGtOther] = useState(gt?.other ? String(gt.other) : "");
  const [gtTcpClose, setGtTcpClose] = useState(gt?.tcp?.close ? String(gt.tcp.close) : "");
  const [gtTcpCloseWait, setGtTcpCloseWait] = useState(gt?.tcp?.close_wait ? String(gt.tcp.close_wait) : "");
  const [gtTcpEstablished, setGtTcpEstablished] = useState(gt?.tcp?.established ? String(gt.tcp.established) : "");
  const [gtTcpFinWait, setGtTcpFinWait] = useState(gt?.tcp?.fin_wait ? String(gt.tcp.fin_wait) : "");
  const [gtTcpSynSent, setGtTcpSynSent] = useState(gt?.tcp?.syn_sent ? String(gt.tcp.syn_sent) : "");
  const [gtTcpTimeWait, setGtTcpTimeWait] = useState(gt?.tcp?.time_wait ? String(gt.tcp.time_wait) : "");
  const [gtUdpOther, setGtUdpOther] = useState(gt?.udp?.other ? String(gt.udp.other) : "");
  const [gtUdpStream, setGtUdpStream] = useState(gt?.udp?.stream ? String(gt.udp.stream) : "");
  const [gtSaving, setGtSaving] = useState(false);
  const [gtError, setGtError] = useState<string | null>(null);

  const handleAddFlowIface = async () => {
    if (!flowIface.trim()) { setFlowIfaceError("Interface name is required"); return; }
    setFlowIfaceSaving(true);
    setFlowIfaceError(null);
    try {
      const result = await systemSettingsService.addFlowAccountingInterface(flowIface.trim());
      if (!result.success) { setFlowIfaceError(result.error ?? "Failed to add interface"); return; }
      toast.success("Interface added to flow accounting");
      setAddingFlowIface(false);
      setFlowIface("");
      onRefresh();
    } catch { setFlowIfaceError("An unexpected error occurred"); }
    finally { setFlowIfaceSaving(false); }
  };

  const handleDeleteFlowIface = async () => {
    if (!deleteFlowIface) return;
    setDeletingFlowIface(true);
    try {
      const result = await systemSettingsService.deleteFlowAccountingInterface(deleteFlowIface);
      if (!result.success) toast.error("Delete failed", result.error ?? "Could not remove interface");
      else { toast.success("Interface removed"); onRefresh(); }
    } catch { toast.error("Error", "An unexpected error occurred"); }
    finally { setDeletingFlowIface(false); setDeleteFlowIface(null); }
  };

  const handleAddLogEvent = async () => {
    setLogEventSaving(true);
    setLogEventError(null);
    try {
      const result = await systemSettingsService.addConntrackLogEvent(logEvent, logProtocol);
      if (!result.success) { setLogEventError(result.error ?? "Failed to add log event"); return; }
      toast.success("Log event added");
      setAddingLogEvent(false);
      onRefresh();
    } catch { setLogEventError("An unexpected error occurred"); }
    finally { setLogEventSaving(false); }
  };

  const handleDeleteLogEntry = async () => {
    if (!deleteLogEntry) return;
    setDeletingLogEntry(true);
    try {
      const result = await systemSettingsService.deleteConntrackLogEvent(deleteLogEntry.event, deleteLogEntry.protocol);
      if (!result.success) toast.error("Delete failed", result.error ?? "Could not remove log event");
      else { toast.success("Log event removed"); onRefresh(); }
    } catch { toast.error("Error", "An unexpected error occurred"); }
    finally { setDeletingLogEntry(false); setDeleteLogEntry(null); }
  };

  const startEditGlobalTimeouts = () => {
    setGtIcmp(gt?.icmp ? String(gt.icmp) : "");
    setGtOther(gt?.other ? String(gt.other) : "");
    setGtTcpClose(gt?.tcp?.close ? String(gt.tcp.close) : "");
    setGtTcpCloseWait(gt?.tcp?.close_wait ? String(gt.tcp.close_wait) : "");
    setGtTcpEstablished(gt?.tcp?.established ? String(gt.tcp.established) : "");
    setGtTcpFinWait(gt?.tcp?.fin_wait ? String(gt.tcp.fin_wait) : "");
    setGtTcpSynSent(gt?.tcp?.syn_sent ? String(gt.tcp.syn_sent) : "");
    setGtTcpTimeWait(gt?.tcp?.time_wait ? String(gt.tcp.time_wait) : "");
    setGtUdpOther(gt?.udp?.other ? String(gt.udp.other) : "");
    setGtUdpStream(gt?.udp?.stream ? String(gt.udp.stream) : "");
    setGtError(null);
    setEditingGlobalTimeouts(true);
  };

  const handleSaveGlobalTimeouts = async () => {
    setGtSaving(true);
    setGtError(null);
    try {
      const ops: Promise<unknown>[] = [];
      if (gtIcmp) ops.push(systemSettingsService.setConntrackGlobalIcmpTimeout(parseInt(gtIcmp, 10)));
      if (gtOther) ops.push(systemSettingsService.setConntrackGlobalOtherTimeout(parseInt(gtOther, 10)));
      const tcpStates: [string, string][] = [
        ["close", gtTcpClose], ["close-wait", gtTcpCloseWait],
        ["established", gtTcpEstablished], ["fin-wait", gtTcpFinWait],
        ["syn-sent", gtTcpSynSent], ["time-wait", gtTcpTimeWait],
      ];
      for (const [state, val] of tcpStates) {
        if (val) ops.push(systemSettingsService.setConntrackGlobalTcpTimeout(state, parseInt(val, 10)));
      }
      if (gtUdpOther) ops.push(systemSettingsService.setConntrackGlobalUdpTimeout("other", parseInt(gtUdpOther, 10)));
      if (gtUdpStream) ops.push(systemSettingsService.setConntrackGlobalUdpTimeout("stream", parseInt(gtUdpStream, 10)));
      await Promise.all(ops);
      toast.success("Global timeouts saved");
      setEditingGlobalTimeouts(false);
      onRefresh();
    } catch { setGtError("An unexpected error occurred"); }
    finally { setGtSaving(false); }
  };

  const handleModuleToggle = async (module: string, enabled: boolean) => {
    if (isReadOnly) return;
    setTogglingModule(module);
    try {
      const result = enabled
        ? await systemSettingsService.addConntrackModule(module)
        : await systemSettingsService.deleteConntrackModule(module);
      if (!result.success) {
        toast.error("Failed", result.error ?? "Could not update module");
      } else {
        toast.success(enabled ? `${module} enabled` : `${module} disabled`);
        onRefresh();
      }
    } catch {
      toast.error("Error", "An unexpected error occurred");
    } finally {
      setTogglingModule(null);
    }
  };

  const handleSaveSizes = async () => {
    setSizesSaving(true);
    setSizesError(null);
    try {
      const result = await systemSettingsService.updateConntrackSizes(
        tableSize ? parseInt(tableSize, 10) : null,
        hashSize ? parseInt(hashSize, 10) : null,
        expectSize ? parseInt(expectSize, 10) : null,
      );
      if (!result.success) {
        setSizesError(result.error ?? "Failed to save sizes");
      } else {
        toast.success("Table sizes saved");
        setEditingSizes(false);
        onRefresh();
      }
    } catch {
      setSizesError("An unexpected error occurred");
    } finally {
      setSizesSaving(false);
    }
  };

  const handleSaveTcp = async () => {
    setTcpSaving(true);
    setTcpError(null);
    try {
      const result = await systemSettingsService.updateConntrackTcp(
        tcpLoose || null,
        tcpHalfOpen ? parseInt(tcpHalfOpen, 10) : null,
        tcpMaxRetrans ? parseInt(tcpMaxRetrans, 10) : null,
      );
      if (!result.success) {
        setTcpError(result.error ?? "Failed to save TCP settings");
      } else {
        toast.success("TCP settings saved");
        setEditingTcp(false);
        onRefresh();
      }
    } catch {
      setTcpError("An unexpected error occurred");
    } finally {
      setTcpSaving(false);
    }
  };

  const enabledModules = new Set(config.conntrack.modules);
  const flowIfaces = config.flow_accounting?.interfaces ?? [];
  const logEntries = config.conntrack_log?.entries ?? [];
  const LOG_EVENTS = ["destroy", "new", "update"];
  const LOG_PROTOCOLS = ["all", "icmp", "tcp", "udp"];

  return (
    <div className="space-y-6">
      {/* Conntrack Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Tracking Modules</CardTitle>
          <CardDescription>
            Enable or disable protocol-specific connection tracking helpers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {availableModules.map((module) => {
              const checked = enabledModules.has(module);
              const loading = togglingModule === module;
              return (
                <div key={module} className="flex items-center gap-2">
                  <Checkbox
                    id={`module-${module}`}
                    checked={checked}
                    disabled={isReadOnly || loading}
                    onCheckedChange={(val) => handleModuleToggle(module, !!val)}
                  />
                  <label
                    htmlFor={`module-${module}`}
                    className="text-sm font-medium cursor-pointer select-none"
                  >
                    {module}
                    {loading && <span className="text-muted-foreground text-xs ml-1">…</span>}
                  </label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Table Sizes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Table Sizes</CardTitle>
              <CardDescription>
                Configure conntrack table and hash sizes. Higher values require more memory.
              </CardDescription>
            </div>
            {!isReadOnly && !editingSizes && (
              <Button variant="outline" size="sm" onClick={() => {
                setTableSize(config.conntrack.table_size ? String(config.conntrack.table_size) : "");
                setHashSize(config.conntrack.hash_size ? String(config.conntrack.hash_size) : "");
                setExpectSize(config.conntrack.expect_table_size ? String(config.conntrack.expect_table_size) : "");
                setSizesError(null);
                setEditingSizes(true);
              }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {editingSizes && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingSizes(false); setSizesError(null); }} disabled={sizesSaving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveSizes} disabled={sizesSaving}>
                  {sizesSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sizesError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{sizesError}</pre>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Table Size</Label>
              {editingSizes ? (
                <Input type="number" min="0" value={tableSize} onChange={(e) => setTableSize(e.target.value)} placeholder="262144" />
              ) : (
                <p className="text-sm font-medium">
                  {config.conntrack.table_size?.toLocaleString() ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Hash Size</Label>
              {editingSizes ? (
                <Input type="number" min="0" value={hashSize} onChange={(e) => setHashSize(e.target.value)} placeholder="32768" />
              ) : (
                <p className="text-sm font-medium">
                  {config.conntrack.hash_size?.toLocaleString() ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Expect Table Size</Label>
              {editingSizes ? (
                <Input type="number" min="0" value={expectSize} onChange={(e) => setExpectSize(e.target.value)} placeholder="2048" />
              ) : (
                <p className="text-sm font-medium">
                  {config.conntrack.expect_table_size?.toLocaleString() ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TCP Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>TCP Settings</CardTitle>
              <CardDescription>
                Fine-tune TCP connection tracking behavior.
              </CardDescription>
            </div>
            {!isReadOnly && !editingTcp && (
              <Button variant="outline" size="sm" onClick={() => {
                setTcpLoose(config.conntrack.tcp_loose ?? "");
                setTcpHalfOpen(config.conntrack.tcp_half_open_connections ? String(config.conntrack.tcp_half_open_connections) : "");
                setTcpMaxRetrans(config.conntrack.tcp_max_retrans ? String(config.conntrack.tcp_max_retrans) : "");
                setTcpError(null);
                setEditingTcp(true);
              }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {editingTcp && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingTcp(false); setTcpError(null); }} disabled={tcpSaving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveTcp} disabled={tcpSaving}>
                  {tcpSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tcpError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{tcpError}</pre>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Loose Mode</Label>
              {editingTcp ? (
                <Select value={tcpLoose || "unset"} onValueChange={(v) => setTcpLoose(v === "unset" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not set</SelectItem>
                    <SelectItem value="enable">Enable</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium capitalize">
                  {config.conntrack.tcp_loose ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Half-Open Connections</Label>
              {editingTcp ? (
                <Input type="number" min="0" value={tcpHalfOpen} onChange={(e) => setTcpHalfOpen(e.target.value)} placeholder="512" />
              ) : (
                <p className="text-sm font-medium">
                  {config.conntrack.tcp_half_open_connections ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Max Retransmits</Label>
              {editingTcp ? (
                <Input type="number" min="0" value={tcpMaxRetrans} onChange={(e) => setTcpMaxRetrans(e.target.value)} placeholder="3" />
              ) : (
                <p className="text-sm font-medium">
                  {config.conntrack.tcp_max_retrans ?? <span className="text-muted-foreground">Default</span>}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Flow Accounting */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Flow Accounting</CardTitle>
              <CardDescription>Interfaces monitored for flow accounting (NetFlow/sFlow).</CardDescription>
            </div>
            {!isReadOnly && !addingFlowIface && (
              <Button size="sm" variant="outline" onClick={() => setAddingFlowIface(true)}>
                <Plus className="h-4 w-4 mr-2" />Add Interface
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {addingFlowIface && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              {flowIfaceError && (
                <div className="rounded border border-destructive/20 bg-destructive/10 p-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">{flowIfaceError}</pre>
                  </div>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Interface</Label>
                  <Input value={flowIface} onChange={(e) => setFlowIface(e.target.value)} placeholder="eth0" className="w-40" />
                </div>
                <Button size="sm" onClick={handleAddFlowIface} disabled={flowIfaceSaving}>{flowIfaceSaving ? "Adding…" : "Add"}</Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingFlowIface(false); setFlowIfaceError(null); }}>Cancel</Button>
              </div>
            </div>
          )}
          {flowIfaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interfaces configured for flow accounting.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {flowIfaces.map((iface) => (
                <div key={iface} className="flex items-center gap-1">
                  <Badge variant="secondary" className="font-mono">{iface}</Badge>
                  {!isReadOnly && (
                    <button
                      className="text-destructive hover:text-destructive/80 ml-1"
                      onClick={() => setDeleteFlowIface(iface)}
                      title={`Remove ${iface}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conntrack Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connection Log Events</CardTitle>
              <CardDescription>Log connection tracking events to syslog.</CardDescription>
            </div>
            {!isReadOnly && !addingLogEvent && (
              <Button size="sm" variant="outline" onClick={() => setAddingLogEvent(true)}>
                <Plus className="h-4 w-4 mr-2" />Add Event
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {addingLogEvent && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              {logEventError && (
                <div className="rounded border border-destructive/20 bg-destructive/10 p-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">{logEventError}</pre>
                  </div>
                </div>
              )}
              <div className="flex gap-3 items-end">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Event</span>
                  <Select value={logEvent} onValueChange={setLogEvent}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOG_EVENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Protocol</span>
                  <Select value={logProtocol} onValueChange={setLogProtocol}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOG_PROTOCOLS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleAddLogEvent} disabled={logEventSaving}>{logEventSaving ? "Adding…" : "Add"}</Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingLogEvent(false); setLogEventError(null); }}>Cancel</Button>
              </div>
            </div>
          )}
          {logEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No log events configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Protocol</TableHead>
                  {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {logEntries.map((e) => (
                  <TableRow key={`${e.event}-${e.protocol}`}>
                    <TableCell className="font-medium">{e.event}</TableCell>
                    <TableCell>{e.protocol}</TableCell>
                    {!isReadOnly && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteLogEntry(e)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Global Timeouts (1.4 only) */}
      {capabilities.conntrack.supports_global_timeouts && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Global Timeouts</CardTitle>
                <CardDescription>Default conntrack timeout values (seconds) for each protocol state.</CardDescription>
              </div>
              {!isReadOnly && (
                editingGlobalTimeouts ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingGlobalTimeouts(false); setGtError(null); }} disabled={gtSaving}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveGlobalTimeouts} disabled={gtSaving}>{gtSaving ? "Saving…" : "Save"}</Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={startEditGlobalTimeouts}>
                    <Edit2 className="h-4 w-4 mr-2" />Edit
                  </Button>
                )
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {gtError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{gtError}</pre>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">TCP</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { label: "Close", val: editingGlobalTimeouts ? gtTcpClose : (gt?.tcp?.close ? String(gt.tcp.close) : ""), set: setGtTcpClose },
                  { label: "Close Wait", val: editingGlobalTimeouts ? gtTcpCloseWait : (gt?.tcp?.close_wait ? String(gt.tcp.close_wait) : ""), set: setGtTcpCloseWait },
                  { label: "Established", val: editingGlobalTimeouts ? gtTcpEstablished : (gt?.tcp?.established ? String(gt.tcp.established) : ""), set: setGtTcpEstablished },
                  { label: "Fin Wait", val: editingGlobalTimeouts ? gtTcpFinWait : (gt?.tcp?.fin_wait ? String(gt.tcp.fin_wait) : ""), set: setGtTcpFinWait },
                  { label: "Syn Sent", val: editingGlobalTimeouts ? gtTcpSynSent : (gt?.tcp?.syn_sent ? String(gt.tcp.syn_sent) : ""), set: setGtTcpSynSent },
                  { label: "Time Wait", val: editingGlobalTimeouts ? gtTcpTimeWait : (gt?.tcp?.time_wait ? String(gt.tcp.time_wait) : ""), set: setGtTcpTimeWait },
                ].map(({ label, val, set }) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    {editingGlobalTimeouts ? (
                      <Input type="number" min="0" value={val} onChange={(e) => set(e.target.value)} placeholder="Default" />
                    ) : (
                      <p className="text-sm font-medium">{val ? `${val}s` : <span className="text-muted-foreground">Default</span>}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">UDP / ICMP / Other</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "UDP Other", val: editingGlobalTimeouts ? gtUdpOther : (gt?.udp?.other ? String(gt.udp.other) : ""), set: setGtUdpOther },
                  { label: "UDP Stream", val: editingGlobalTimeouts ? gtUdpStream : (gt?.udp?.stream ? String(gt.udp.stream) : ""), set: setGtUdpStream },
                  { label: "ICMP", val: editingGlobalTimeouts ? gtIcmp : (gt?.icmp ? String(gt.icmp) : ""), set: setGtIcmp },
                  { label: "Other", val: editingGlobalTimeouts ? gtOther : (gt?.other ? String(gt.other) : ""), set: setGtOther },
                ].map(({ label, val, set }) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    {editingGlobalTimeouts ? (
                      <Input type="number" min="0" value={val} onChange={(e) => set(e.target.value)} placeholder="Default" />
                    ) : (
                      <p className="text-sm font-medium">{val ? `${val}s` : <span className="text-muted-foreground">Default</span>}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete dialogs */}
      <AlertDialog open={!!deleteFlowIface} onOpenChange={(o) => { if (!o) setDeleteFlowIface(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Interface</AlertDialogTitle>
            <AlertDialogDescription>Remove <strong>{deleteFlowIface}</strong> from flow accounting?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingFlowIface}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFlowIface} disabled={deletingFlowIface} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingFlowIface ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteLogEntry} onOpenChange={(o) => { if (!o) setDeleteLogEntry(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Log Event</AlertDialogTitle>
            <AlertDialogDescription>Remove {deleteLogEntry?.event}/{deleteLogEntry?.protocol} log event?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingLogEntry}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLogEntry} disabled={deletingLogEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingLogEntry ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
