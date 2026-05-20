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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Edit2, GripVertical, Plus, Trash2 } from "lucide-react";
import {
  systemSettingsService,
  type SystemConfig,
  type SystemCapabilities,
  type ConntrackIgnoreRule,
  type ConntrackTimeoutCustomRule,
} from "@/lib/api/system-settings";
import { showService } from "@/lib/api/show";
import { useToast } from "@/hooks/useToast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FirewallReorderBanner } from "@/components/firewall/FirewallReorderBanner";

interface Props {
  config: SystemConfig;
  capabilities: SystemCapabilities;
  isReadOnly: boolean;
  onRefresh: () => void;
}

function ConntrackIgnoreSortableRow({
  rule,
  isReadOnly,
  onDelete,
}: {
  rule: ConntrackIgnoreRule;
  isReadOnly: boolean;
  onDelete: (r: ConntrackIgnoreRule) => void;
}) {
  const id = `${rule.ip_version}-${rule.rule_id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isOver } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <TableRow ref={setNodeRef} style={style} className={isOver ? "border-t-4 border-t-primary" : undefined}>
      {!isReadOnly && (
        <TableCell className="w-8 text-muted-foreground cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </TableCell>
      )}
      <TableCell className="font-mono">{rule.rule_id}</TableCell>
      <TableCell><Badge variant="outline" className="text-xs">{rule.ip_version}</Badge></TableCell>
      <TableCell>{rule.protocol ?? <span className="text-muted-foreground">any</span>}</TableCell>
      <TableCell className="font-mono text-xs">
        {[rule.source_address, rule.source_port ? `:${rule.source_port}` : ""].filter(Boolean).join("") || <span className="text-muted-foreground">any</span>}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {[rule.destination_address, rule.destination_port ? `:${rule.destination_port}` : ""].filter(Boolean).join("") || <span className="text-muted-foreground">any</span>}
      </TableCell>
      <TableCell className="font-mono text-xs">{rule.inbound_interface ?? <span className="text-muted-foreground">—</span>}</TableCell>
      {!isReadOnly && (
        <TableCell className="text-right">
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(rule)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

function ConntrackTimeoutSortableRow({
  rule,
  isReadOnly,
  onDelete,
}: {
  rule: ConntrackTimeoutCustomRule;
  isReadOnly: boolean;
  onDelete: (r: ConntrackTimeoutCustomRule) => void;
}) {
  const id = `${rule.ip_version}-${rule.rule_id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isOver } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <TableRow ref={setNodeRef} style={style} className={isOver ? "border-t-4 border-t-primary" : undefined}>
      {!isReadOnly && (
        <TableCell className="w-8 text-muted-foreground cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </TableCell>
      )}
      <TableCell className="font-mono">{rule.rule_id}</TableCell>
      <TableCell><Badge variant="outline" className="text-xs">{rule.ip_version}</Badge></TableCell>
      <TableCell>{rule.protocol ?? <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell className="font-mono text-xs">{rule.source_address ?? <span className="text-muted-foreground">any</span>}</TableCell>
      <TableCell className="font-mono text-xs">{rule.destination_address ?? <span className="text-muted-foreground">any</span>}</TableCell>
      <TableCell className="text-xs">
        {rule.tcp ? (
          <span>{Object.entries(rule.tcp).filter(([, v]) => v != null).map(([k, v]) => `${k}:${v}s`).join(", ") || "—"}</span>
        ) : <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-xs">
        {rule.udp ? (
          <span>{Object.entries(rule.udp).filter(([, v]) => v != null).map(([k, v]) => `${k}:${v}s`).join(", ") || "—"}</span>
        ) : <span className="text-muted-foreground">—</span>}
      </TableCell>
      {!isReadOnly && (
        <TableCell className="text-right">
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(rule)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
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

  // Interface list for inbound interface dropdown
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);

  // Ignore rules
  const [ignoreModalOpen, setIgnoreModalOpen] = useState(false);
  const [ignRuleId, setIgnRuleId] = useState("");
  const [ignIpVersion, setIgnIpVersion] = useState("ipv4");
  const [ignProtocol, setIgnProtocol] = useState("");
  const [ignSrcAddr, setIgnSrcAddr] = useState("");
  const [ignSrcPort, setIgnSrcPort] = useState("");
  const [ignDstAddr, setIgnDstAddr] = useState("");
  const [ignDstPort, setIgnDstPort] = useState("");
  const [ignInboundIface, setIgnInboundIface] = useState("");
  const [ignSaving, setIgnSaving] = useState(false);
  const [ignError, setIgnError] = useState<string | null>(null);
  const [deleteIgnoreTarget, setDeleteIgnoreTarget] = useState<ConntrackIgnoreRule | null>(null);
  const [deletingIgnore, setDeletingIgnore] = useState(false);

  // Custom timeout rules
  const [ctModalOpen, setCtModalOpen] = useState(false);
  const [ctRuleId, setCtRuleId] = useState("");
  const [ctIpVersion, setCtIpVersion] = useState("ipv4");
  const [ctSrcAddr, setCtSrcAddr] = useState("");
  const [ctDstAddr, setCtDstAddr] = useState("");
  const [ctTcpEstablished, setCtTcpEstablished] = useState("");
  const [ctTcpClose, setCtTcpClose] = useState("");
  const [ctTcpFinWait, setCtTcpFinWait] = useState("");
  const [ctTcpCloseWait, setCtTcpCloseWait] = useState("");
  const [ctTcpSynSent, setCtTcpSynSent] = useState("");
  const [ctTcpTimeWait, setCtTcpTimeWait] = useState("");
  const [ctUdpOther, setCtUdpOther] = useState("");
  const [ctUdpStream, setCtUdpStream] = useState("");
  const [ctSaving, setCtSaving] = useState(false);
  const [ctError, setCtError] = useState<string | null>(null);
  const [deleteCtTarget, setDeleteCtTarget] = useState<ConntrackTimeoutCustomRule | null>(null);
  const [deletingCt, setDeletingCt] = useState(false);

  // Reorder state — ignore rules
  const [localIgnoreRules, setLocalIgnoreRules] = useState<ConntrackIgnoreRule[]>([]);
  const [hasIgnoreReorderChanges, setHasIgnoreReorderChanges] = useState(false);
  const [savingIgnoreReorder, setSavingIgnoreReorder] = useState(false);

  // Reorder state — custom timeout rules
  const [localCtRules, setLocalCtRules] = useState<ConntrackTimeoutCustomRule[]>([]);
  const [hasCtReorderChanges, setHasCtReorderChanges] = useState(false);
  const [savingCtReorder, setSavingCtReorder] = useState(false);

  const ignoreSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const ctSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const displayIgnoreRules = hasIgnoreReorderChanges ? localIgnoreRules : (config.conntrack_ignore ?? []);
  const displayCtRules = hasCtReorderChanges ? localCtRules : (config.conntrack_timeout_custom ?? []);

  const nextIgnoreRuleId = (ipVersion: string) => {
    const existing = (config.conntrack_ignore ?? []).filter((r) => r.ip_version === ipVersion);
    return existing.length === 0 ? 1 : Math.max(...existing.map((r) => r.rule_id)) + 1;
  };

  const openIgnoreModal = async () => {
    setIgnIpVersion("ipv4");
    setIgnRuleId(String(nextIgnoreRuleId("ipv4")));
    setIgnProtocol("");
    setIgnSrcAddr(""); setIgnSrcPort(""); setIgnDstAddr(""); setIgnDstPort("");
    setIgnInboundIface(""); setIgnError(null);
    setIgnoreModalOpen(true);
    setLoadingInterfaces(true);
    try {
      const res = await showService.getAllInterfaces();
      setAvailableInterfaces(res.interfaces.map((i) => i.name).sort());
    } catch {
      setAvailableInterfaces([]);
    } finally {
      setLoadingInterfaces(false);
    }
  };

  const handleSaveIgnoreRule = async () => {
    setIgnSaving(true); setIgnError(null);
    try {
      const result = await systemSettingsService.createIgnoreRule(
        ignIpVersion, parseInt(ignRuleId, 10),
        {
          protocol: ignProtocol || undefined,
          srcAddress: ignSrcAddr || undefined,
          srcPort: ignSrcPort || undefined,
          dstAddress: ignDstAddr || undefined,
          dstPort: ignDstPort || undefined,
          inboundInterface: ignInboundIface || undefined,
        },
      );
      if (!result.success) { setIgnError(result.error ?? "Failed to create rule"); return; }
      toast.success("Ignore rule created");
      setIgnoreModalOpen(false);
      onRefresh();
    } catch { setIgnError("An unexpected error occurred"); }
    finally { setIgnSaving(false); }
  };

  const handleDeleteIgnoreRule = async () => {
    if (!deleteIgnoreTarget) return;
    setDeletingIgnore(true);
    try {
      const result = await systemSettingsService.deleteIgnoreRuleAndRenumber(
        deleteIgnoreTarget.ip_version,
        deleteIgnoreTarget.rule_id,
        config.conntrack_ignore ?? [],
      );
      if (!result.success) toast.error("Delete failed", result.error ?? "Could not delete rule");
      else { toast.success("Ignore rule deleted"); onRefresh(); }
    } catch { toast.error("Error", "An unexpected error occurred"); }
    finally { setDeletingIgnore(false); setDeleteIgnoreTarget(null); }
  };

  const nextCtRuleId = (ipVersion: string) => {
    const existing = (config.conntrack_timeout_custom ?? []).filter((r) => r.ip_version === ipVersion);
    return existing.length === 0 ? 1 : Math.max(...existing.map((r) => r.rule_id)) + 1;
  };

  const openCtModal = () => {
    setCtIpVersion("ipv4");
    setCtRuleId(String(nextCtRuleId("ipv4")));
    setCtSrcAddr(""); setCtDstAddr("");
    setCtTcpEstablished(""); setCtTcpClose(""); setCtTcpFinWait(""); setCtTcpCloseWait("");
    setCtTcpSynSent(""); setCtTcpTimeWait(""); setCtUdpOther(""); setCtUdpStream("");
    setCtError(null);
    setCtModalOpen(true);
  };

  const handleSaveCtRule = async () => {
    setCtSaving(true); setCtError(null);
    const tcpStates: Record<string, number> = {};
    if (ctTcpEstablished) tcpStates["established"] = parseInt(ctTcpEstablished, 10);
    if (ctTcpClose) tcpStates["close"] = parseInt(ctTcpClose, 10);
    if (ctTcpFinWait) tcpStates["fin-wait"] = parseInt(ctTcpFinWait, 10);
    if (ctTcpCloseWait) tcpStates["close-wait"] = parseInt(ctTcpCloseWait, 10);
    if (ctTcpSynSent) tcpStates["syn-sent"] = parseInt(ctTcpSynSent, 10);
    if (ctTcpTimeWait) tcpStates["time-wait"] = parseInt(ctTcpTimeWait, 10);
    const udpStates: Record<string, number> = {};
    if (ctUdpOther) udpStates["other"] = parseInt(ctUdpOther, 10);
    if (ctUdpStream) udpStates["stream"] = parseInt(ctUdpStream, 10);
    try {
      const result = await systemSettingsService.createTimeoutCustomRule(
        ctIpVersion, parseInt(ctRuleId, 10),
        {
          srcAddress: ctSrcAddr || undefined,
          dstAddress: ctDstAddr || undefined,
          tcpStates: Object.keys(tcpStates).length ? tcpStates : undefined,
          udpStates: Object.keys(udpStates).length ? udpStates : undefined,
        },
      );
      if (!result.success) { setCtError(result.error ?? "Failed to create rule"); return; }
      toast.success("Timeout rule created");
      setCtModalOpen(false);
      onRefresh();
    } catch { setCtError("An unexpected error occurred"); }
    finally { setCtSaving(false); }
  };

  const handleDeleteCtRule = async () => {
    if (!deleteCtTarget) return;
    setDeletingCt(true);
    try {
      const result = await systemSettingsService.deleteTimeoutCustomRuleAndRenumber(
        deleteCtTarget.ip_version,
        deleteCtTarget.rule_id,
        config.conntrack_timeout_custom ?? [],
      );
      if (!result.success) toast.error("Delete failed", result.error ?? "Could not delete rule");
      else { toast.success("Timeout rule deleted"); onRefresh(); }
    } catch { toast.error("Error", "An unexpected error occurred"); }
    finally { setDeletingCt(false); setDeleteCtTarget(null); }
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

  const handleIgnoreDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const source = hasIgnoreReorderChanges ? localIgnoreRules : (config.conntrack_ignore ?? []);
    const oldIdx = source.findIndex((r) => `${r.ip_version}-${r.rule_id}` === String(active.id));
    const newIdx = source.findIndex((r) => `${r.ip_version}-${r.rule_id}` === String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    setLocalIgnoreRules(arrayMove(source, oldIdx, newIdx));
    setHasIgnoreReorderChanges(true);
  };

  const handleCtDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const source = hasCtReorderChanges ? localCtRules : (config.conntrack_timeout_custom ?? []);
    const oldIdx = source.findIndex((r) => `${r.ip_version}-${r.rule_id}` === String(active.id));
    const newIdx = source.findIndex((r) => `${r.ip_version}-${r.rule_id}` === String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    setLocalCtRules(arrayMove(source, oldIdx, newIdx));
    setHasCtReorderChanges(true);
  };

  const handleSaveIgnoreReorder = async () => {
    setSavingIgnoreReorder(true);
    try {
      const byVersion: Record<string, ConntrackIgnoreRule[]> = {};
      for (const r of localIgnoreRules) {
        if (!byVersion[r.ip_version]) byVersion[r.ip_version] = [];
        byVersion[r.ip_version].push(r);
      }
      await Promise.all(
        Object.entries(byVersion).map(([ver, rules]) =>
          systemSettingsService.reorderIgnoreRules(ver, rules),
        ),
      );
      toast.success("Rule order saved");
      setHasIgnoreReorderChanges(false);
      onRefresh();
    } catch {
      toast.error("Error", "Failed to save rule order");
    } finally {
      setSavingIgnoreReorder(false);
    }
  };

  const handleSaveCtReorder = async () => {
    setSavingCtReorder(true);
    try {
      const byVersion: Record<string, ConntrackTimeoutCustomRule[]> = {};
      for (const r of localCtRules) {
        if (!byVersion[r.ip_version]) byVersion[r.ip_version] = [];
        byVersion[r.ip_version].push(r);
      }
      await Promise.all(
        Object.entries(byVersion).map(([ver, rules]) =>
          systemSettingsService.reorderTimeoutCustomRules(ver, rules),
        ),
      );
      toast.success("Rule order saved");
      setHasCtReorderChanges(false);
      onRefresh();
    } catch {
      toast.error("Error", "Failed to save rule order");
    } finally {
      setSavingCtReorder(false);
    }
  };

  const enabledModules = new Set(config.conntrack.modules);
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

      {/* Conntrack Ignore Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ignore Rules</CardTitle>
              <CardDescription>
                Bypass connection tracking for matching traffic. Rules apply per IP version.
              </CardDescription>
            </div>
            {!isReadOnly && (
              <Button size="sm" variant="outline" onClick={openIgnoreModal}>
                <Plus className="h-4 w-4 mr-2" />Add Rule
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {!isReadOnly && <TableHead className="w-8" />}
                <TableHead className="w-16">ID</TableHead>
                <TableHead className="w-16">IP</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Inbound Iface</TableHead>
                {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <DndContext sensors={ignoreSensors} collisionDetection={closestCenter} onDragEnd={handleIgnoreDragEnd}>
              <SortableContext items={displayIgnoreRules.map((r) => `${r.ip_version}-${r.rule_id}`)} strategy={verticalListSortingStrategy}>
                <TableBody>
                  {displayIgnoreRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isReadOnly ? 6 : 8} className="text-center text-muted-foreground py-6">
                        No ignore rules configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayIgnoreRules.map((r) => (
                      <ConntrackIgnoreSortableRow
                        key={`${r.ip_version}-${r.rule_id}`}
                        rule={r}
                        isReadOnly={isReadOnly}
                        onDelete={setDeleteIgnoreTarget}
                      />
                    ))
                  )}
                </TableBody>
              </SortableContext>
            </DndContext>
          </Table>
        </CardContent>
      </Card>

      {/* Custom Timeout Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Timeout Rules</CardTitle>
              <CardDescription>
                Override default conntrack timeouts for specific traffic patterns.
              </CardDescription>
            </div>
            {!isReadOnly && (
              <Button size="sm" variant="outline" onClick={openCtModal}>
                <Plus className="h-4 w-4 mr-2" />Add Rule
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {!isReadOnly && <TableHead className="w-8" />}
                <TableHead className="w-16">ID</TableHead>
                <TableHead className="w-16">IP</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>TCP Timeouts</TableHead>
                <TableHead>UDP Timeouts</TableHead>
                {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <DndContext sensors={ctSensors} collisionDetection={closestCenter} onDragEnd={handleCtDragEnd}>
              <SortableContext items={displayCtRules.map((r) => `${r.ip_version}-${r.rule_id}`)} strategy={verticalListSortingStrategy}>
                <TableBody>
                  {displayCtRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isReadOnly ? 7 : 9} className="text-center text-muted-foreground py-6">
                        No custom timeout rules configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayCtRules.map((r) => (
                      <ConntrackTimeoutSortableRow
                        key={`${r.ip_version}-${r.rule_id}`}
                        rule={r}
                        isReadOnly={isReadOnly}
                        onDelete={setDeleteCtTarget}
                      />
                    ))
                  )}
                </TableBody>
              </SortableContext>
            </DndContext>
          </Table>
        </CardContent>
      </Card>

      {/* Add Ignore Rule Modal */}
      <Dialog open={ignoreModalOpen} onOpenChange={(o) => { if (!o) setIgnoreModalOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Ignore Rule</DialogTitle>
            <DialogDescription>Traffic matching this rule will bypass connection tracking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {ignError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{ignError}</pre>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rule ID <span className="text-muted-foreground">(auto-assigned)</span></Label>
                <Input type="number" value={ignRuleId} disabled className="bg-muted text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">IP Version</Label>
                <Select value={ignIpVersion} onValueChange={(v) => {
                  setIgnIpVersion(v);
                  setIgnRuleId(String(nextIgnoreRuleId(v)));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ipv4">IPv4</SelectItem>
                    <SelectItem value="ipv6">IPv6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Protocol</Label>
              <Select value={ignProtocol || "any"} onValueChange={(v) => setIgnProtocol(v === "any" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="udp">UDP</SelectItem>
                  <SelectItem value="icmp">ICMP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Source Address</Label>
                <Input value={ignSrcAddr} onChange={(e) => setIgnSrcAddr(e.target.value)} placeholder="10.0.0.0/8" className="font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Source Port</Label>
                <Input value={ignSrcPort} onChange={(e) => setIgnSrcPort(e.target.value)} placeholder="80" className="font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destination Address</Label>
                <Input value={ignDstAddr} onChange={(e) => setIgnDstAddr(e.target.value)} placeholder="192.168.0.0/16" className="font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destination Port</Label>
                <Input value={ignDstPort} onChange={(e) => setIgnDstPort(e.target.value)} placeholder="443" className="font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Inbound Interface</Label>
              <Select
                value={ignInboundIface || "_any"}
                onValueChange={(v) => setIgnInboundIface(v === "_any" ? "" : v)}
                disabled={loadingInterfaces}
              >
                <SelectTrigger className="font-mono text-sm">
                  <SelectValue placeholder={loadingInterfaces ? "Loading…" : "Any"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_any">Any</SelectItem>
                  {availableInterfaces.map((iface) => (
                    <SelectItem key={iface} value={iface}>{iface}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIgnoreModalOpen(false)} disabled={ignSaving}>Cancel</Button>
            <Button onClick={handleSaveIgnoreRule} disabled={ignSaving}>{ignSaving ? "Creating…" : "Create Rule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Timeout Rule Modal */}
      <Dialog open={ctModalOpen} onOpenChange={(o) => { if (!o) setCtModalOpen(false); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Custom Timeout Rule</DialogTitle>
            <DialogDescription>Override conntrack timeouts for specific traffic. Set TCP or UDP timeouts (seconds).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {ctError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{ctError}</pre>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rule ID <span className="text-muted-foreground">(auto-assigned)</span></Label>
                <Input type="number" value={ctRuleId} disabled className="bg-muted text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">IP Version</Label>
                <Select value={ctIpVersion} onValueChange={(v) => {
                  setCtIpVersion(v);
                  setCtRuleId(String(nextCtRuleId(v)));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ipv4">IPv4</SelectItem>
                    <SelectItem value="ipv6">IPv6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Source Address</Label>
                <Input value={ctSrcAddr} onChange={(e) => setCtSrcAddr(e.target.value)} placeholder="10.0.0.0/8" className="font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destination Address</Label>
                <Input value={ctDstAddr} onChange={(e) => setCtDstAddr(e.target.value)} placeholder="192.168.0.0/16" className="font-mono text-sm" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">TCP Timeouts (seconds)</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Established", val: ctTcpEstablished, set: setCtTcpEstablished },
                  { label: "Close", val: ctTcpClose, set: setCtTcpClose },
                  { label: "Fin Wait", val: ctTcpFinWait, set: setCtTcpFinWait },
                  { label: "Close Wait", val: ctTcpCloseWait, set: setCtTcpCloseWait },
                  { label: "Syn Sent", val: ctTcpSynSent, set: setCtTcpSynSent },
                  { label: "Time Wait", val: ctTcpTimeWait, set: setCtTcpTimeWait },
                ].map(({ label, val, set }) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input type="number" min="0" value={val} onChange={(e) => set(e.target.value)} placeholder="—" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">UDP Timeouts (seconds)</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Other", val: ctUdpOther, set: setCtUdpOther },
                  { label: "Stream", val: ctUdpStream, set: setCtUdpStream },
                ].map(({ label, val, set }) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input type="number" min="0" value={val} onChange={(e) => set(e.target.value)} placeholder="—" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCtModalOpen(false)} disabled={ctSaving}>Cancel</Button>
            <Button onClick={handleSaveCtRule} disabled={ctSaving}>{ctSaving ? "Creating…" : "Create Rule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete ignore rule */}
      <AlertDialog open={!!deleteIgnoreTarget} onOpenChange={(o) => { if (!o) setDeleteIgnoreTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ignore Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {deleteIgnoreTarget?.ip_version} ignore rule <strong>{deleteIgnoreTarget?.rule_id}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingIgnore}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIgnoreRule} disabled={deletingIgnore} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingIgnore ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete custom timeout rule */}
      <AlertDialog open={!!deleteCtTarget} onOpenChange={(o) => { if (!o) setDeleteCtTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timeout Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {deleteCtTarget?.ip_version} timeout rule <strong>{deleteCtTarget?.rule_id}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCt}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCtRule} disabled={deletingCt} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingCt ? "Deleting…" : "Delete"}
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

      {hasIgnoreReorderChanges && (
        <FirewallReorderBanner
          changesCount={localIgnoreRules.length}
          onSave={handleSaveIgnoreReorder}
          onCancel={() => setHasIgnoreReorderChanges(false)}
          saving={savingIgnoreReorder}
        />
      )}
      {hasCtReorderChanges && (
        <FirewallReorderBanner
          changesCount={localCtRules.length}
          onSave={handleSaveCtReorder}
          onCancel={() => setHasCtReorderChanges(false)}
          saving={savingCtReorder}
        />
      )}
    </div>
  );
}
