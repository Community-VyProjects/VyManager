"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("systemFlowArchive");
  const tc = useTranslations("common");
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
    if (!ifaceValue || ifaceValue === "_none") { setIfaceError(t("flow.selectInterfaceRequired")); return; }
    setIfaceSaving(true); setIfaceError(null);
    try {
      const result = await systemSettingsService.addFlowAccountingInterface(ifaceValue);
      if (!result.success) { setIfaceError(result.error ?? t("flow.addInterfaceFailed")); return; }
      toast.success(t("flow.interfaceAdded"));
      setAddingIface(false); setIfaceValue("_none"); onRefresh();
    } catch { setIfaceError(t("unexpectedError")); }
    finally { setIfaceSaving(false); }
  };

  const handleDeleteIface = async () => {
    if (!deleteIface) return;
    setDeletingIface(true);
    try {
      const result = await systemSettingsService.deleteFlowAccountingInterface(deleteIface);
      if (!result.success) toast.error(t("deleteFailed"), result.error ?? t("flow.removeInterfaceFailed"));
      else { toast.success(t("flow.interfaceRemoved")); onRefresh(); }
    } catch { toast.error(t("error"), t("unexpectedError")); }
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
      if (!result.success) { setNfError(result.error ?? t("flow.saveNetflowFailed")); return; }
      toast.success(t("flow.netflowSaved"));
      setEditingNf(false); onRefresh();
    } catch { setNfError(t("unexpectedError")); }
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
    if (!nfSrvIp.trim()) { setNfSrvError(t("flow.serverIpRequired")); return; }
    setNfSrvSaving(true); setNfSrvError(null);
    try {
      const result = await systemSettingsService.addNetflowServer(
        nfSrvIp.trim(),
        nfSrvPort ? parseInt(nfSrvPort, 10) : null,
      );
      if (!result.success) { setNfSrvError(result.error ?? t("flow.addServerFailed")); return; }
      toast.success(t("flow.netflowServerAdded"));
      setAddingNfServer(false); setNfSrvIp(""); setNfSrvPort(""); onRefresh();
    } catch { setNfSrvError(t("unexpectedError")); }
    finally { setNfSrvSaving(false); }
  };

  const handleDeleteNfServer = async () => {
    if (!deleteNfSrv) return;
    setDeletingNfSrv(true);
    try {
      const result = await systemSettingsService.deleteNetflowServer(deleteNfSrv);
      if (!result.success) toast.error(t("deleteFailed"), result.error ?? t("flow.removeServerFailed"));
      else { toast.success(t("flow.netflowServerRemoved")); onRefresh(); }
    } catch { toast.error(t("error"), t("unexpectedError")); }
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
      if (!result.success) { setSfError(result.error ?? t("flow.saveSflowFailed")); return; }
      toast.success(t("flow.sflowSaved"));
      setEditingSf(false); onRefresh();
    } catch { setSfError(t("unexpectedError")); }
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
    if (!sfSrvIp.trim()) { setSfSrvError(t("flow.serverIpRequired")); return; }
    setSfSrvSaving(true); setSfSrvError(null);
    try {
      const result = await systemSettingsService.addSflowServer(
        sfSrvIp.trim(),
        sfSrvPort ? parseInt(sfSrvPort, 10) : null,
      );
      if (!result.success) { setSfSrvError(result.error ?? t("flow.addServerFailed")); return; }
      toast.success(t("flow.sflowServerAdded"));
      setAddingSfServer(false); setSfSrvIp(""); setSfSrvPort(""); onRefresh();
    } catch { setSfSrvError(t("unexpectedError")); }
    finally { setSfSrvSaving(false); }
  };

  const handleDeleteSfServer = async () => {
    if (!deleteSfSrv) return;
    setDeletingSfSrv(true);
    try {
      const result = await systemSettingsService.deleteSflowServer(deleteSfSrv);
      if (!result.success) toast.error(t("deleteFailed"), result.error ?? t("flow.removeServerFailed"));
      else { toast.success(t("flow.sflowServerRemoved")); onRefresh(); }
    } catch { toast.error(t("error"), t("unexpectedError")); }
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
              <CardTitle>{t("flow.interfacesTitle")}</CardTitle>
              <CardDescription>{t("flow.interfacesDescription")}</CardDescription>
            </div>
            {!isReadOnly && !addingIface && (
              <Button size="sm" variant="outline" onClick={() => setAddingIface(true)}>
                <Plus className="h-4 w-4 mr-2" />{tc("addInterface")}
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
                  <Label className="text-xs">{t("flow.interface")}</Label>
                  <Select value={ifaceValue} onValueChange={setIfaceValue}>
                    <SelectTrigger className="w-48 font-mono text-sm">
                      <SelectValue placeholder={tc("selectInterface")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{t("flow.selectInterfaceEllipsis")}</SelectItem>
                      {availableInterfaces.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleAddIface} disabled={ifaceSaving}>{ifaceSaving ? t("adding") : tc("add")}</Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingIface(false); setIfaceError(null); }}>{tc("cancel")}</Button>
              </div>
            </div>
          )}
          {flowIfaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("flow.noInterfaces")}</p>
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
              <CardTitle>{t("flow.netflowTitle")}</CardTitle>
              <CardDescription>{t("flow.netflowDescription")}</CardDescription>
            </div>
            {!isReadOnly && (
              editingNf ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingNf(false); setNfError(null); }} disabled={nfSaving}>{tc("cancel")}</Button>
                  <Button size="sm" onClick={handleSaveNf} disabled={nfSaving}>{nfSaving ? tc("saving") : tc("save")}</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={startEditNf}>
                  <Edit2 className="h-4 w-4 mr-2" />{tc("edit")}
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
              <Label className="text-xs">{t("flow.version")}</Label>
              {editingNf ? (
                <Select value={nfVersion || "_none"} onValueChange={(v) => setNfVersion(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={tc("notSet")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{tc("notSet")}</SelectItem>
                    {NETFLOW_VERSIONS.map((v) => <SelectItem key={v} value={v}>v{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{nf?.version ? `v${nf.version}` : <span className="text-muted-foreground">{tc("notSet")}</span>}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t("flow.engineId")}</Label>
              {editingNf ? (
                <Input type="number" min="0" value={nfEngineId} onChange={(e) => setNfEngineId(e.target.value)} placeholder="0" />
              ) : (
                <p className="text-sm font-medium">{nf?.engine_id != null ? nf.engine_id : <span className="text-muted-foreground">{tc("notSet")}</span>}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t("flow.maxFlows")}</Label>
              {editingNf ? (
                <Input type="number" min="0" value={nfMaxFlows} onChange={(e) => setNfMaxFlows(e.target.value)} placeholder="8192" />
              ) : (
                <p className="text-sm font-medium">{nf?.max_flows != null ? nf.max_flows.toLocaleString() : <span className="text-muted-foreground">{tc("default")}</span>}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t("flow.samplingRate")}</Label>
              {editingNf ? (
                <Input type="number" min="0" value={nfSamplingRate} onChange={(e) => setNfSamplingRate(e.target.value)} placeholder="1000" />
              ) : (
                <p className="text-sm font-medium">{nf?.sampling_rate != null ? `1:${nf.sampling_rate}` : <span className="text-muted-foreground">{tc("notSet")}</span>}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">{t("flow.sourceAddress")}</Label>
              {editingNf ? (
                <Input value={nfSourceAddr} onChange={(e) => setNfSourceAddr(e.target.value)} placeholder="192.0.2.1" className="font-mono text-sm" />
              ) : (
                <p className="text-sm font-medium font-mono">{nf?.source_address ?? <span className="text-muted-foreground">{tc("notSet")}</span>}</p>
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
              <CardTitle>{t("flow.netflowCollectors")}</CardTitle>
              <CardDescription>{t("flow.netflowCollectorsDescription")}</CardDescription>
            </div>
            {!isReadOnly && !addingNfServer && (
              <Button size="sm" variant="outline" onClick={() => setAddingNfServer(true)}>
                <Plus className="h-4 w-4 mr-2" />{t("flow.addServer")}
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
                  <Label className="text-xs">{t("flow.serverIp")}</Label>
                  <Input value={nfSrvIp} onChange={(e) => setNfSrvIp(e.target.value)} placeholder="203.0.113.1" className="w-44 font-mono text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("port")}</Label>
                  <Input type="number" value={nfSrvPort} onChange={(e) => setNfSrvPort(e.target.value)} placeholder="2055" className="w-24" />
                </div>
                <Button size="sm" onClick={handleAddNfServer} disabled={nfSrvSaving}>{nfSrvSaving ? t("adding") : tc("add")}</Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingNfServer(false); setNfSrvError(null); }}>{tc("cancel")}</Button>
              </div>
            </div>
          )}
          {nfServers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("flow.noNetflowCollectors")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("flow.server")}</TableHead>
                  <TableHead>{t("port")}</TableHead>
                  {!isReadOnly && <TableHead className="text-right">{tc("actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {nfServers.map((srv) => (
                  <TableRow key={srv.server}>
                    <TableCell className="font-mono">{srv.server}</TableCell>
                    <TableCell>{srv.port ?? <span className="text-muted-foreground">{tc("default")}</span>}</TableCell>
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

      {/* sFlow — shown only when standalone sFlow is supported */}
      {supportsStandaloneSflow && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("flow.sflowTitle")}</CardTitle>
                  <CardDescription>{t("flow.sflowDescription")}</CardDescription>
                </div>
                {!isReadOnly && (
                  editingSf ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingSf(false); setSfError(null); }} disabled={sfSaving}>{tc("cancel")}</Button>
                      <Button size="sm" onClick={handleSaveSf} disabled={sfSaving}>{sfSaving ? tc("saving") : tc("save")}</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={startEditSf}>
                      <Edit2 className="h-4 w-4 mr-2" />{tc("edit")}
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
                  <Label className="text-xs">{t("flow.agentAddress")}</Label>
                  {editingSf ? (
                    <Input value={sfAgentAddr} onChange={(e) => setSfAgentAddr(e.target.value)} placeholder="192.0.2.1" className="font-mono text-sm" />
                  ) : (
                    <p className="text-sm font-medium font-mono">{sfConfig?.agent_address ?? <span className="text-muted-foreground">{tc("notSet")}</span>}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("flow.samplingRate")}</Label>
                  {editingSf ? (
                    <Input type="number" min="0" value={sfSamplingRate} onChange={(e) => setSfSamplingRate(e.target.value)} placeholder="1000" />
                  ) : (
                    <p className="text-sm font-medium">{sfConfig?.sampling_rate != null ? `1:${sfConfig.sampling_rate}` : <span className="text-muted-foreground">{tc("notSet")}</span>}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("flow.sflowCollectors")}</CardTitle>
                  <CardDescription>{t("flow.sflowCollectorsDescription")}</CardDescription>
                </div>
                {!isReadOnly && !addingSfServer && (
                  <Button size="sm" variant="outline" onClick={() => setAddingSfServer(true)}>
                    <Plus className="h-4 w-4 mr-2" />{t("flow.addServer")}
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
                      <Label className="text-xs">{t("flow.serverIp")}</Label>
                      <Input value={sfSrvIp} onChange={(e) => setSfSrvIp(e.target.value)} placeholder="203.0.113.1" className="w-44 font-mono text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("port")}</Label>
                      <Input type="number" value={sfSrvPort} onChange={(e) => setSfSrvPort(e.target.value)} placeholder="6343" className="w-24" />
                    </div>
                    <Button size="sm" onClick={handleAddSfServer} disabled={sfSrvSaving}>{sfSrvSaving ? t("adding") : tc("add")}</Button>
                    <Button size="sm" variant="outline" onClick={() => { setAddingSfServer(false); setSfSrvError(null); }}>{tc("cancel")}</Button>
                  </div>
                </div>
              )}
              {sfServers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("flow.noSflowCollectors")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("flow.server")}</TableHead>
                      <TableHead>{t("port")}</TableHead>
                      {!isReadOnly && <TableHead className="text-right">{tc("actions")}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sfServers.map((srv) => (
                      <TableRow key={srv.server}>
                        <TableCell className="font-mono">{srv.server}</TableCell>
                        <TableCell>{srv.port ?? <span className="text-muted-foreground">{tc("default")}</span>}</TableCell>
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
            <AlertDialogTitle>{t("flow.removeInterfaceTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t.rich("flow.removeInterfaceConfirm", { name: deleteIface ?? "", strong: (chunks) => <strong>{chunks}</strong> })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingIface}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIface} disabled={deletingIface} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingIface ? t("removing") : t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteNfSrv} onOpenChange={(o) => { if (!o) setDeleteNfSrv(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("flow.removeNetflowTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t.rich("flow.removeNetflowConfirm", { name: deleteNfSrv ?? "", strong: (chunks) => <strong>{chunks}</strong> })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingNfSrv}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNfServer} disabled={deletingNfSrv} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingNfSrv ? t("removing") : t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSfSrv} onOpenChange={(o) => { if (!o) setDeleteSfSrv(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("flow.removeSflowTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t.rich("flow.removeSflowConfirm", { name: deleteSfSrv ?? "", strong: (chunks) => <strong>{chunks}</strong> })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSfSrv}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSfServer} disabled={deletingSfSrv} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingSfSrv ? t("removing") : t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
