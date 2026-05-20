"use client";

import { useState, useEffect } from "react";
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
import { showService } from "@/lib/api/show";
import { useToast } from "@/hooks/useToast";

interface Props {
  config: SystemConfig;
  capabilities: SystemCapabilities;
  isReadOnly: boolean;
  onRefresh: () => void;
}

const NETFLOW_VERSIONS = ["5", "9", "10"];

export function FlowAccountingPanel({ config, capabilities, isReadOnly, onRefresh }: Props) {
  const { toast } = useToast();
  const supportsStandaloneSflow = capabilities.features.standalone_sflow.supported;

  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);

  useEffect(() => {
    showService
      .getAllInterfaces()
      .then((res) => setAvailableInterfaces(res.interfaces.map((i) => i.name).sort()))
      .catch(() => {});
  }, []);

  // ── Interfaces ────────────────────────────────────────────────────────────

  const flowIfaces = config.flow_accounting?.interfaces ?? [];
  const [addingIface, setAddingIface] = useState(false);
  const [ifaceValue, setIfaceValue] = useState("_none");
  const [ifaceSaving, setIfaceSaving] = useState(false);
  const [ifaceError, setIfaceError] = useState<string | null>(null);
  const [deleteIface, setDeleteIface] = useState<string | null>(null);
  const [deletingIface, setDeletingIface] = useState(false);

  const handleAddIface = async () => {
    if (!ifaceValue || ifaceValue === "_none") { setIfaceError("Select an interface"); return; }
    setIfaceSaving(true); setIfaceError(null);
    try {
      const result = await systemSettingsService.addFlowAccountingInterface(ifaceValue);
      if (!result.success) { setIfaceError(result.error ?? "Failed to add interface"); return; }
      toast.success("Interface added to flow accounting");
      setAddingIface(false); setIfaceValue("_none"); onRefresh();
    } catch { setIfaceError("An unexpected error occurred"); }
    finally { setIfaceSaving(false); }
  };

  const handleDeleteIface = async () => {
    if (!deleteIface) return;
    setDeletingIface(true);
    try {
      const result = await systemSettingsService.deleteFlowAccountingInterface(deleteIface);
      if (!result.success) toast.error("Delete failed", result.error ?? "Could not remove interface");
      else { toast.success("Interface removed"); onRefresh(); }
    } catch { toast.error("Error", "An unexpected error occurred"); }
    finally { setDeletingIface(false); setDeleteIface(null); }
  };

  // ── NetFlow Config ─────────────────────────────────────────────────────────

  const nf = config.flow_accounting?.netflow;
  const [editingNf, setEditingNf] = useState(false);
  const [nfVersion, setNfVersion] = useState(nf?.version ?? "");
  const [nfEngineId, setNfEngineId] = useState(nf?.engine_id != null ? String(nf.engine_id) : "");
  const [nfMaxFlows, setNfMaxFlows] = useState(nf?.max_flows != null ? String(nf.max_flows) : "");
  const [nfSamplingRate, setNfSamplingRate] = useState(nf?.sampling_rate != null ? String(nf.sampling_rate) : "");
  const [nfSourceAddr, setNfSourceAddr] = useState(nf?.source_address ?? "");
  const [nfSaving, setNfSaving] = useState(false);
  const [nfError, setNfError] = useState<string | null>(null);

  const startEditNf = () => {
    setNfVersion(nf?.version ?? "");
    setNfEngineId(nf?.engine_id != null ? String(nf.engine_id) : "");
    setNfMaxFlows(nf?.max_flows != null ? String(nf.max_flows) : "");
    setNfSamplingRate(nf?.sampling_rate != null ? String(nf.sampling_rate) : "");
    setNfSourceAddr(nf?.source_address ?? "");
    setNfError(null);
    setEditingNf(true);
  };

  const handleSaveNf = async () => {
    setNfSaving(true); setNfError(null);
    try {
      const result = await systemSettingsService.saveNetflowConfig({
        version: nfVersion || null,
        clearVersion: !nfVersion && !!nf?.version,
        engineId: nfEngineId ? parseInt(nfEngineId, 10) : null,
        clearEngineId: !nfEngineId && nf?.engine_id != null,
        maxFlows: nfMaxFlows ? parseInt(nfMaxFlows, 10) : null,
        clearMaxFlows: !nfMaxFlows && nf?.max_flows != null,
        samplingRate: nfSamplingRate ? parseInt(nfSamplingRate, 10) : null,
        clearSamplingRate: !nfSamplingRate && nf?.sampling_rate != null,
        sourceAddress: nfSourceAddr || null,
        clearSourceAddress: !nfSourceAddr && !!nf?.source_address,
      });
      if (!result.success) { setNfError(result.error ?? "Failed to save NetFlow config"); return; }
      toast.success("NetFlow config saved");
      setEditingNf(false); onRefresh();
    } catch { setNfError("An unexpected error occurred"); }
    finally { setNfSaving(false); }
  };

  // ── NetFlow Servers ────────────────────────────────────────────────────────

  const nfServers = nf?.servers ?? [];
  const [addingNfServer, setAddingNfServer] = useState(false);
  const [nfSrvIp, setNfSrvIp] = useState("");
  const [nfSrvPort, setNfSrvPort] = useState("");
  const [nfSrvSaving, setNfSrvSaving] = useState(false);
  const [nfSrvError, setNfSrvError] = useState<string | null>(null);
  const [deleteNfSrv, setDeleteNfSrv] = useState<string | null>(null);
  const [deletingNfSrv, setDeletingNfSrv] = useState(false);

  const handleAddNfServer = async () => {
    if (!nfSrvIp.trim()) { setNfSrvError("Server IP is required"); return; }
    setNfSrvSaving(true); setNfSrvError(null);
    try {
      const result = await systemSettingsService.addNetflowServer(
        nfSrvIp.trim(),
        nfSrvPort ? parseInt(nfSrvPort, 10) : null,
      );
      if (!result.success) { setNfSrvError(result.error ?? "Failed to add server"); return; }
      toast.success("NetFlow server added");
      setAddingNfServer(false); setNfSrvIp(""); setNfSrvPort(""); onRefresh();
    } catch { setNfSrvError("An unexpected error occurred"); }
    finally { setNfSrvSaving(false); }
  };

  const handleDeleteNfServer = async () => {
    if (!deleteNfSrv) return;
    setDeletingNfSrv(true);
    try {
      const result = await systemSettingsService.deleteNetflowServer(deleteNfSrv);
      if (!result.success) toast.error("Delete failed", result.error ?? "Could not remove server");
      else { toast.success("NetFlow server removed"); onRefresh(); }
    } catch { toast.error("Error", "An unexpected error occurred"); }
    finally { setDeletingNfSrv(false); setDeleteNfSrv(null); }
  };

  // ── sFlow Config ───────────────────────────────────────────────────────────

  const sfConfig = supportsStandaloneSflow ? config.sflow : config.flow_accounting?.sflow;
  const [editingSf, setEditingSf] = useState(false);
  const [sfAgentAddr, setSfAgentAddr] = useState(sfConfig?.agent_address ?? "");
  const [sfSamplingRate, setSfSamplingRate] = useState(sfConfig?.sampling_rate != null ? String(sfConfig.sampling_rate) : "");
  const [sfSaving, setSfSaving] = useState(false);
  const [sfError, setSfError] = useState<string | null>(null);

  const startEditSf = () => {
    setSfAgentAddr(sfConfig?.agent_address ?? "");
    setSfSamplingRate(sfConfig?.sampling_rate != null ? String(sfConfig.sampling_rate) : "");
    setSfError(null);
    setEditingSf(true);
  };

  const handleSaveSf = async () => {
    setSfSaving(true); setSfError(null);
    try {
      const result = await systemSettingsService.saveSflowConfig({
        agentAddress: sfAgentAddr || null,
        clearAgentAddress: !sfAgentAddr && !!sfConfig?.agent_address,
        samplingRate: sfSamplingRate ? parseInt(sfSamplingRate, 10) : null,
        clearSamplingRate: !sfSamplingRate && sfConfig?.sampling_rate != null,
      });
      if (!result.success) { setSfError(result.error ?? "Failed to save sFlow config"); return; }
      toast.success("sFlow config saved");
      setEditingSf(false); onRefresh();
    } catch { setSfError("An unexpected error occurred"); }
    finally { setSfSaving(false); }
  };

  // ── sFlow Servers ──────────────────────────────────────────────────────────

  const sfServers = sfConfig?.servers ?? [];
  const [addingSfServer, setAddingSfServer] = useState(false);
  const [sfSrvIp, setSfSrvIp] = useState("");
  const [sfSrvPort, setSfSrvPort] = useState("");
  const [sfSrvSaving, setSfSrvSaving] = useState(false);
  const [sfSrvError, setSfSrvError] = useState<string | null>(null);
  const [deleteSfSrv, setDeleteSfSrv] = useState<string | null>(null);
  const [deletingSfSrv, setDeletingSfSrv] = useState(false);

  const handleAddSfServer = async () => {
    if (!sfSrvIp.trim()) { setSfSrvError("Server IP is required"); return; }
    setSfSrvSaving(true); setSfSrvError(null);
    try {
      const result = await systemSettingsService.addSflowServer(
        sfSrvIp.trim(),
        sfSrvPort ? parseInt(sfSrvPort, 10) : null,
      );
      if (!result.success) { setSfSrvError(result.error ?? "Failed to add server"); return; }
      toast.success("sFlow server added");
      setAddingSfServer(false); setSfSrvIp(""); setSfSrvPort(""); onRefresh();
    } catch { setSfSrvError("An unexpected error occurred"); }
    finally { setSfSrvSaving(false); }
  };

  const handleDeleteSfServer = async () => {
    if (!deleteSfSrv) return;
    setDeletingSfSrv(true);
    try {
      const result = await systemSettingsService.deleteSflowServer(deleteSfSrv);
      if (!result.success) toast.error("Delete failed", result.error ?? "Could not remove server");
      else { toast.success("sFlow server removed"); onRefresh(); }
    } catch { toast.error("Error", "An unexpected error occurred"); }
    finally { setDeletingSfSrv(false); setDeleteSfSrv(null); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Interfaces */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Flow Accounting Interfaces</CardTitle>
              <CardDescription>Interfaces monitored for NetFlow/sFlow flow export.</CardDescription>
            </div>
            {!isReadOnly && !addingIface && (
              <Button size="sm" variant="outline" onClick={() => setAddingIface(true)}>
                <Plus className="h-4 w-4 mr-2" />Add Interface
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {addingIface && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              {ifaceError && (
                <div className="rounded border border-destructive/20 bg-destructive/10 p-2 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">{ifaceError}</pre>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Interface</Label>
                  <Select value={ifaceValue} onValueChange={setIfaceValue}>
                    <SelectTrigger className="w-48 font-mono text-sm">
                      <SelectValue placeholder="Select interface" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Select interface…</SelectItem>
                      {availableInterfaces.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleAddIface} disabled={ifaceSaving}>{ifaceSaving ? "Adding…" : "Add"}</Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingIface(false); setIfaceError(null); }}>Cancel</Button>
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
                    <button className="text-destructive hover:text-destructive/80 ml-1" onClick={() => setDeleteIface(iface)}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* NetFlow Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>NetFlow Configuration</CardTitle>
              <CardDescription>NetFlow/IPFIX export parameters.</CardDescription>
            </div>
            {!isReadOnly && (
              editingNf ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingNf(false); setNfError(null); }} disabled={nfSaving}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveNf} disabled={nfSaving}>{nfSaving ? "Saving…" : "Save"}</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={startEditNf}>
                  <Edit2 className="h-4 w-4 mr-2" />Edit
                </Button>
              )
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {nfError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{nfError}</pre>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Version</Label>
              {editingNf ? (
                <Select value={nfVersion || "_none"} onValueChange={(v) => setNfVersion(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Not set</SelectItem>
                    {NETFLOW_VERSIONS.map((v) => <SelectItem key={v} value={v}>v{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{nf?.version ? `v${nf.version}` : <span className="text-muted-foreground">Not set</span>}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Engine ID</Label>
              {editingNf ? (
                <Input type="number" min="0" value={nfEngineId} onChange={(e) => setNfEngineId(e.target.value)} placeholder="0" />
              ) : (
                <p className="text-sm font-medium">{nf?.engine_id != null ? nf.engine_id : <span className="text-muted-foreground">Not set</span>}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Max Flows</Label>
              {editingNf ? (
                <Input type="number" min="0" value={nfMaxFlows} onChange={(e) => setNfMaxFlows(e.target.value)} placeholder="8192" />
              ) : (
                <p className="text-sm font-medium">{nf?.max_flows != null ? nf.max_flows.toLocaleString() : <span className="text-muted-foreground">Default</span>}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Sampling Rate</Label>
              {editingNf ? (
                <Input type="number" min="0" value={nfSamplingRate} onChange={(e) => setNfSamplingRate(e.target.value)} placeholder="1000" />
              ) : (
                <p className="text-sm font-medium">{nf?.sampling_rate != null ? `1:${nf.sampling_rate}` : <span className="text-muted-foreground">Not set</span>}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">Source Address</Label>
              {editingNf ? (
                <Input value={nfSourceAddr} onChange={(e) => setNfSourceAddr(e.target.value)} placeholder="192.0.2.1" className="font-mono text-sm" />
              ) : (
                <p className="text-sm font-medium font-mono">{nf?.source_address ?? <span className="text-muted-foreground">Not set</span>}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NetFlow Servers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>NetFlow Collectors</CardTitle>
              <CardDescription>Servers that receive exported flow data.</CardDescription>
            </div>
            {!isReadOnly && !addingNfServer && (
              <Button size="sm" variant="outline" onClick={() => setAddingNfServer(true)}>
                <Plus className="h-4 w-4 mr-2" />Add Server
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {addingNfServer && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              {nfSrvError && (
                <div className="rounded border border-destructive/20 bg-destructive/10 p-2 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">{nfSrvError}</pre>
                </div>
              )}
              <div className="flex gap-2 items-end flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs">Server IP</Label>
                  <Input value={nfSrvIp} onChange={(e) => setNfSrvIp(e.target.value)} placeholder="203.0.113.1" className="w-44 font-mono text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Port</Label>
                  <Input type="number" value={nfSrvPort} onChange={(e) => setNfSrvPort(e.target.value)} placeholder="2055" className="w-24" />
                </div>
                <Button size="sm" onClick={handleAddNfServer} disabled={nfSrvSaving}>{nfSrvSaving ? "Adding…" : "Add"}</Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingNfServer(false); setNfSrvError(null); }}>Cancel</Button>
              </div>
            </div>
          )}
          {nfServers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No NetFlow collectors configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server</TableHead>
                  <TableHead>Port</TableHead>
                  {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {nfServers.map((srv) => (
                  <TableRow key={srv.server}>
                    <TableCell className="font-mono">{srv.server}</TableCell>
                    <TableCell>{srv.port ?? <span className="text-muted-foreground">Default</span>}</TableCell>
                    {!isReadOnly && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteNfSrv(srv.server)}>
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

      {/* sFlow — shown only when standalone sFlow is supported (1.5+) */}
      {supportsStandaloneSflow && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>sFlow Configuration</CardTitle>
                  <CardDescription>Standalone sFlow agent settings (VyOS 1.5+).</CardDescription>
                </div>
                {!isReadOnly && (
                  editingSf ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingSf(false); setSfError(null); }} disabled={sfSaving}>Cancel</Button>
                      <Button size="sm" onClick={handleSaveSf} disabled={sfSaving}>{sfSaving ? "Saving…" : "Save"}</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={startEditSf}>
                      <Edit2 className="h-4 w-4 mr-2" />Edit
                    </Button>
                  )
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {sfError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{sfError}</pre>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Agent Address</Label>
                  {editingSf ? (
                    <Input value={sfAgentAddr} onChange={(e) => setSfAgentAddr(e.target.value)} placeholder="192.0.2.1" className="font-mono text-sm" />
                  ) : (
                    <p className="text-sm font-medium font-mono">{sfConfig?.agent_address ?? <span className="text-muted-foreground">Not set</span>}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Sampling Rate</Label>
                  {editingSf ? (
                    <Input type="number" min="0" value={sfSamplingRate} onChange={(e) => setSfSamplingRate(e.target.value)} placeholder="1000" />
                  ) : (
                    <p className="text-sm font-medium">{sfConfig?.sampling_rate != null ? `1:${sfConfig.sampling_rate}` : <span className="text-muted-foreground">Not set</span>}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>sFlow Collectors</CardTitle>
                  <CardDescription>Servers that receive sFlow samples.</CardDescription>
                </div>
                {!isReadOnly && !addingSfServer && (
                  <Button size="sm" variant="outline" onClick={() => setAddingSfServer(true)}>
                    <Plus className="h-4 w-4 mr-2" />Add Server
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {addingSfServer && (
                <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                  {sfSrvError && (
                    <div className="rounded border border-destructive/20 bg-destructive/10 p-2 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">{sfSrvError}</pre>
                    </div>
                  )}
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="space-y-1">
                      <Label className="text-xs">Server IP</Label>
                      <Input value={sfSrvIp} onChange={(e) => setSfSrvIp(e.target.value)} placeholder="203.0.113.1" className="w-44 font-mono text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Port</Label>
                      <Input type="number" value={sfSrvPort} onChange={(e) => setSfSrvPort(e.target.value)} placeholder="6343" className="w-24" />
                    </div>
                    <Button size="sm" onClick={handleAddSfServer} disabled={sfSrvSaving}>{sfSrvSaving ? "Adding…" : "Add"}</Button>
                    <Button size="sm" variant="outline" onClick={() => { setAddingSfServer(false); setSfSrvError(null); }}>Cancel</Button>
                  </div>
                </div>
              )}
              {sfServers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sFlow collectors configured.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Server</TableHead>
                      <TableHead>Port</TableHead>
                      {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sfServers.map((srv) => (
                      <TableRow key={srv.server}>
                        <TableCell className="font-mono">{srv.server}</TableCell>
                        <TableCell>{srv.port ?? <span className="text-muted-foreground">Default</span>}</TableCell>
                        {!isReadOnly && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteSfSrv(srv.server)}>
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
        </>
      )}

      {/* Delete dialogs */}
      <AlertDialog open={!!deleteIface} onOpenChange={(o) => { if (!o) setDeleteIface(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Interface</AlertDialogTitle>
            <AlertDialogDescription>Remove <strong>{deleteIface}</strong> from flow accounting?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingIface}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIface} disabled={deletingIface} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingIface ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteNfSrv} onOpenChange={(o) => { if (!o) setDeleteNfSrv(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove NetFlow Collector</AlertDialogTitle>
            <AlertDialogDescription>Remove <strong>{deleteNfSrv}</strong> from NetFlow collectors?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingNfSrv}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNfServer} disabled={deletingNfSrv} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingNfSrv ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSfSrv} onOpenChange={(o) => { if (!o) setDeleteSfSrv(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove sFlow Collector</AlertDialogTitle>
            <AlertDialogDescription>Remove <strong>{deleteSfSrv}</strong> from sFlow collectors?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSfSrv}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSfServer} disabled={deletingSfSrv} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingSfSrv ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
