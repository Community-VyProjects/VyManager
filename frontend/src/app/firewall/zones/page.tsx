"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Ban,
  Lock,
  Info,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  Shield,
  Plus,
  GripVertical,
  ArrowUpDown,
  Globe,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { firewallZonesService, resolveChainName } from "@/lib/api/firewall-zones";
import { firewallGroupsService, type FirewallGroup } from "@/lib/api/firewall-groups";
import { firewallIPv4Service } from "@/lib/api/firewall-ipv4";
import { firewallIPv6Service } from "@/lib/api/firewall-ipv6";
import type { FirewallZone, ZonesCapabilities } from "@/lib/api/types/firewall-zones";
import type { FirewallConfigResponse, FirewallRule, FirewallCapabilitiesResponse } from "@/lib/api/firewall-ipv4";
import { CreateZoneModal } from "@/components/firewall/zones/CreateZoneModal";
import { EditZoneModal } from "@/components/firewall/zones/EditZoneModal";
import { ZoneRulePanel } from "@/components/firewall/zones/ZoneRulePanel";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============================================================================
// Types
// ============================================================================

interface MatrixPair {
  source: string;
  dest: string;
}

interface PolicyRow {
  sourceZone: string;
  destZone: string;
  ipVersion: "IPv4" | "IPv6";
  rule: FirewallRule;
  chainName: string;
}

// ============================================================================
// Sortable row wrapper for drag-and-drop reordering
// ============================================================================

function SortableRuleRow({
  id,
  row,
  onClick,
  isReordering,
  groups,
}: {
  id: string;
  row: PolicyRow;
  onClick: () => void;
  isReordering: boolean;
  groups: FirewallGroup[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function getGroupMembers(name: string): string[] {
    const cleanName = name.startsWith("!") ? name.substring(1) : name;
    return groups.find((g) => g.name === cleanName)?.members ?? [];
  }

  type AddrObj = { address?: string | null; group?: Record<string, string> | null; geoip?: { country_code?: string[] | null; inverse_match?: boolean | null } | null; mac_address?: string | null } | null | undefined;
  type PortObj = { port?: string | null; group?: Record<string, string> | null } | null | undefined;

  function renderAddr(obj: AddrObj) {
    if (!obj) return <span className="text-muted-foreground">Any</span>;
    const nonPortGroups = obj.group ? Object.entries(obj.group).filter(([k]) => k !== "port-group") : [];
    const hasContent = obj.address || nonPortGroups.length > 0 || (obj.geoip?.country_code?.length ?? 0) > 0 || obj.mac_address;
    if (!hasContent) return <span className="text-muted-foreground">Any</span>;
    return (
      <div className="flex flex-col gap-1">
        {obj.address && (
          <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">{obj.address}</code>
        )}
        {obj.mac_address && (
          <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">{obj.mac_address}</code>
        )}
        {nonPortGroups.map(([, name]) => {
          const inverted = name.startsWith("!");
          const displayName = inverted ? name.substring(1) : name;
          const members = getGroupMembers(name);
          return (
            <Tooltip key={name}>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("text-xs cursor-help w-fit", inverted && "bg-orange-500/10 text-orange-500 border-orange-500/20")}>
                  {inverted && "!"}{displayName}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold text-xs mb-1">{inverted ? `NOT ${displayName}` : displayName}</p>
                <p className="text-xs">{members.length > 0 ? members.join(", ") : "No members"}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {(obj.geoip?.country_code?.length ?? 0) > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs cursor-help gap-1 w-fit",
                  obj.geoip!.inverse_match
                    ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                    : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                )}
              >
                <Globe className="h-3 w-3" />
                {obj.geoip!.inverse_match && "!"}
                {obj.geoip!.country_code!.length === 1
                  ? obj.geoip!.country_code![0].toUpperCase()
                  : `Countries (${obj.geoip!.country_code!.length})`}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold text-xs mb-1">{obj.geoip!.inverse_match ? "Excluded Countries" : "Countries"}</p>
              <p className="text-xs">{obj.geoip!.country_code!.map((c) => c.toUpperCase()).join(", ")}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  function renderPort(obj: PortObj) {
    if (!obj) return <span className="text-muted-foreground">Any</span>;
    if (obj.port) return <span className="font-mono text-xs">{obj.port}</span>;
    if (obj.group?.["port-group"]) {
      const name = obj.group["port-group"];
      const inverted = name.startsWith("!");
      const displayName = inverted ? name.substring(1) : name;
      const members = getGroupMembers(name);
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn("text-xs cursor-help", inverted ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20")}>
              {inverted && "!"}{displayName}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold text-xs mb-1">{inverted ? `NOT ${displayName}` : displayName}</p>
            <p className="text-xs">{members.length > 0 ? members.join(", ") : "No ports"}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return <span className="text-muted-foreground">Any</span>;
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "text-xs",
        row.rule.disable && "opacity-50",
        !isReordering && "cursor-pointer hover:bg-muted/50",
        isDragging && "opacity-40 bg-primary/5"
      )}
      onClick={isReordering ? undefined : onClick}
    >
      {/* Drag handle (only in reorder mode) */}
      <TableCell className="w-8 px-2">
        {isReordering ? (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        ) : (
          <div className="w-5" />
        )}
      </TableCell>

      <TableCell className="font-mono text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-3 shrink-0 flex items-center justify-center">
            {row.rule.disable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Ban className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Disabled</TooltipContent>
              </Tooltip>
            )}
          </span>
          {row.rule.rule_number}
        </div>
      </TableCell>

      <TableCell className="max-w-28 truncate">
        {row.rule.description ?? ""}
      </TableCell>

      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            "uppercase text-xs",
            row.rule.action === "accept" && "bg-green-500/10 text-green-500 border-green-500/20",
            row.rule.action === "drop" && "bg-red-500/10 text-red-500 border-red-500/20",
            row.rule.action === "reject" && "bg-orange-500/10 text-orange-500 border-orange-500/20",
            row.rule.action === "jump" && "bg-blue-500/10 text-blue-500 border-blue-500/20"
          )}
        >
          {row.rule.action ?? "—"}
        </Badge>
      </TableCell>

      <TableCell>
        <Badge variant="secondary" className="text-[10px]">{row.ipVersion}</Badge>
      </TableCell>

      <TableCell className="font-mono">{row.rule.protocol ?? "Any"}</TableCell>

      <TableCell>
        <Badge variant="outline" className="font-mono text-[10px]">{row.sourceZone}</Badge>
      </TableCell>

      <TableCell>{renderAddr(row.rule.source)}</TableCell>
      <TableCell>{renderPort(row.rule.source)}</TableCell>

      <TableCell>
        <Badge variant="outline" className="font-mono text-[10px]">{row.destZone}</Badge>
      </TableCell>

      <TableCell>{renderAddr(row.rule.destination)}</TableCell>
      <TableCell>{renderPort(row.rule.destination)}</TableCell>
    </TableRow>
  );
}

// ============================================================================
// Cell color logic
// ============================================================================

function getCellInfo(
  sourceZone: string,
  destZone: string,
  zones: FirewallZone[],
  ipv4Config: FirewallConfigResponse | null,
  ipv6Config: FirewallConfigResponse | null
): { bgClass: string; textClass: string; label: string; count: number } {
  const ACCEPT = { bgClass: "bg-green-800", textClass: "text-green-50" };
  const DROP = { bgClass: "bg-red-800/40", textClass: "text-white" };
  const REJECT = { bgClass: "bg-orange-800/40", textClass: "text-white" };
  const MUTED = { bgClass: "bg-muted/40", textClass: "text-muted-foreground" };
  const WARN = { bgClass: "bg-amber-900", textClass: "text-amber-100" };

  if (sourceZone === destZone) {
    const zoneObj = zones.find((z) => z.name === sourceZone);
    if (!zoneObj || zoneObj.local_zone) return { ...MUTED, label: "—", count: 0 };
    const intra = zoneObj.intra_zone_filtering;
    if (!intra || (!intra.firewall_name && !intra.firewall_ipv6_name)) {
      return { ...MUTED, label: "Intra-zone", count: 0 };
    }
    const ipv4Chain = ipv4Config?.custom_chains.find((c) => c.name === intra.firewall_name);
    const ipv6Chain = ipv6Config?.custom_chains.find((c) => c.name === intra.firewall_ipv6_name);
    const count = (ipv4Chain?.rules.length ?? 0) + (ipv6Chain?.rules.length ?? 0);
    const label = intra.firewall_name ?? intra.firewall_ipv6_name ?? "Intra-zone";
    const action = ipv4Chain?.default_action ?? ipv6Chain?.default_action;
    if (action === "accept") return { ...ACCEPT, label, count };
    if (action === "drop") return { ...DROP, label, count };
    if (action === "reject") return { ...REJECT, label, count };
    return { bgClass: "bg-slate-700", textClass: "text-slate-100", label, count };
  }

  const destZoneObj = zones.find((z) => z.name === destZone);
  const fromEntry = destZoneObj?.from_zones.find((f) => f.from_zone === sourceZone);

  if (!fromEntry || (!fromEntry.firewall_name && !fromEntry.firewall_ipv6_name)) {
    const action = destZoneObj?.default_action ?? "drop";
    if (action === "reject") return { ...REJECT, label: `Default: ${action}`, count: 0 };
    return { ...DROP, label: `Default: ${action}`, count: 0 };
  }

  const ipv4Chain = ipv4Config?.custom_chains.find((c) => c.name === fromEntry.firewall_name);
  const ipv6Chain = ipv6Config?.custom_chains.find((c) => c.name === fromEntry.firewall_ipv6_name);
  const count = (ipv4Chain?.rules.length ?? 0) + (ipv6Chain?.rules.length ?? 0);
  const label = fromEntry.firewall_name ?? fromEntry.firewall_ipv6_name ?? "";
  const action = ipv4Chain?.default_action ?? ipv6Chain?.default_action;

  if (action === "accept") return { ...ACCEPT, label, count };
  if (action === "drop") return { ...DROP, label, count };
  if (action === "reject") return { ...REJECT, label, count };
  if (!ipv4Chain && !ipv6Chain) return { ...WARN, label: `⚠ ${label}`, count: 0 };
  return { bgClass: "bg-slate-700", textClass: "text-slate-100", label, count };
}

// ============================================================================
// Page component
// ============================================================================

export default function FirewallZonesPage() {
  const { canWrite } = usePermissions();
  const canEdit = canWrite(FeatureGroup.FIREWALL_ZONES);

  const [zones, setZones] = useState<FirewallZone[]>([]);
  const [capabilities, setCapabilities] = useState<ZonesCapabilities | null>(null);
  const [ipv4Config, setIpv4Config] = useState<FirewallConfigResponse | null>(null);
  const [ipv6Config, setIpv6Config] = useState<FirewallConfigResponse | null>(null);
  const [firewallCaps, setFirewallCaps] = useState<FirewallCapabilitiesResponse | null>(null);
  const [groups, setGroups] = useState<FirewallGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Zone selection
  const [selectedZone, setSelectedZone] = useState<FirewallZone | null>(null);
  const [selectedPair, setSelectedPair] = useState<MatrixPair | "all">("all");

  // Filter state — exclusive IPv4/IPv6
  const [ipVersion, setIpVersion] = useState<"ipv4" | "ipv6">("ipv4");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Rule panel state
  const [rulePanelOpen, setRulePanelOpen] = useState(false);
  const [rulePanelMode, setRulePanelMode] = useState<"create" | "edit">("create");
  const [selectedRow, setSelectedRow] = useState<PolicyRow | null>(null);

  // Reorder state
  const [isReordering, setIsReordering] = useState(false);
  const [reorderedRows, setReorderedRows] = useState<PolicyRow[]>([]);
  const [savingReorder, setSavingReorder] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [caps, zonesData, v4, v6, fwCaps, groupsData] = await Promise.all([
        firewallZonesService.getCapabilities(),
        firewallZonesService.getConfig(refresh),
        firewallIPv4Service.getConfig(refresh),
        firewallIPv6Service.getConfig(refresh),
        firewallIPv4Service.getCapabilities(),
        firewallGroupsService.getConfig(refresh),
      ]);
      setCapabilities(caps);
      setZones(zonesData.zones);
      setIpv4Config(v4);
      setIpv6Config(v6);
      setFirewallCaps(fwCaps);
      setGroups([
        ...groupsData.address_groups,
        ...groupsData.ipv6_address_groups,
        ...groupsData.network_groups,
        ...groupsData.ipv6_network_groups,
        ...groupsData.port_groups,
        ...groupsData.interface_groups,
        ...groupsData.mac_groups,
        ...groupsData.domain_groups,
        ...groupsData.remote_groups,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load firewall zones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSuccess = () => {
    loadData(true);
    setSelectedZone(null);
    setIsReordering(false);
    setReorderedRows([]);
  };

  // ── Chain rules resolver (passed to ZoneRulePanel) ────────────────────────

  const getChainRules = useCallback(
    (chainName: string, ver: "ipv4" | "ipv6"): FirewallRule[] => {
      const config = ver === "ipv4" ? ipv4Config : ipv6Config;
      return config?.custom_chains.find((c) => c.name === chainName)?.rules ?? [];
    },
    [ipv4Config, ipv6Config]
  );

  // ── Policy table construction ─────────────────────────────────────────────

  const buildPolicyRows = useCallback((): PolicyRow[] => {
    const rows: PolicyRow[] = [];
    const showIpv4 = ipVersion === "ipv4";
    const showIpv6 = ipVersion === "ipv6";

    for (const destZone of zones) {
      for (const fromEntry of destZone.from_zones) {
        if (showIpv4 && fromEntry.firewall_name) {
          const chain = ipv4Config?.custom_chains.find((c) => c.name === fromEntry.firewall_name);
          for (const rule of chain?.rules ?? []) {
            rows.push({ sourceZone: fromEntry.from_zone, destZone: destZone.name, ipVersion: "IPv4", rule, chainName: fromEntry.firewall_name });
          }
        }
        if (showIpv6 && fromEntry.firewall_ipv6_name) {
          const chain = ipv6Config?.custom_chains.find((c) => c.name === fromEntry.firewall_ipv6_name);
          for (const rule of chain?.rules ?? []) {
            rows.push({ sourceZone: fromEntry.from_zone, destZone: destZone.name, ipVersion: "IPv6", rule, chainName: fromEntry.firewall_ipv6_name });
          }
        }
      }
    }

    // Intra-zone rows
    for (const zone of zones) {
      if (zone.local_zone) continue;
      const intra = zone.intra_zone_filtering;
      if (!intra) continue;
      if (showIpv4 && intra.firewall_name) {
        const chain = ipv4Config?.custom_chains.find((c) => c.name === intra.firewall_name);
        for (const rule of chain?.rules ?? []) {
          rows.push({ sourceZone: zone.name, destZone: zone.name, ipVersion: "IPv4", rule, chainName: intra.firewall_name });
        }
      }
      if (showIpv6 && intra.firewall_ipv6_name) {
        const chain = ipv6Config?.custom_chains.find((c) => c.name === intra.firewall_ipv6_name);
        for (const rule of chain?.rules ?? []) {
          rows.push({ sourceZone: zone.name, destZone: zone.name, ipVersion: "IPv6", rule, chainName: intra.firewall_ipv6_name });
        }
      }
    }

    let filtered = rows;
    if (selectedPair !== "all") {
      filtered = rows.filter(
        (r) => r.sourceZone === selectedPair.source && r.destZone === selectedPair.dest
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.rule.description?.toLowerCase().includes(q) ||
          r.chainName.toLowerCase().includes(q) ||
          r.sourceZone.toLowerCase().includes(q) ||
          r.destZone.toLowerCase().includes(q) ||
          String(r.rule.rule_number).includes(q)
      );
    }
    return filtered;
  }, [zones, ipVersion, ipv4Config, ipv6Config, selectedPair, searchQuery]);

  // Total rule count across all pairs (unfiltered)
  const totalAllRules = (() => {
    let count = 0;
    for (const zone of zones) {
      for (const fromEntry of zone.from_zones) {
        if (fromEntry.firewall_name) count += ipv4Config?.custom_chains.find((c) => c.name === fromEntry.firewall_name)?.rules.length ?? 0;
        if (fromEntry.firewall_ipv6_name) count += ipv6Config?.custom_chains.find((c) => c.name === fromEntry.firewall_ipv6_name)?.rules.length ?? 0;
      }
      if (!zone.local_zone) {
        const intra = zone.intra_zone_filtering;
        if (intra?.firewall_name) count += ipv4Config?.custom_chains.find((c) => c.name === intra.firewall_name)?.rules.length ?? 0;
        if (intra?.firewall_ipv6_name) count += ipv6Config?.custom_chains.find((c) => c.name === intra.firewall_ipv6_name)?.rules.length ?? 0;
      }
    }
    return count;
  })();

  const allPolicyRows = buildPolicyRows();
  const displayRows = isReordering ? reorderedRows : allPolicyRows;

  // ── Reorder handlers ──────────────────────────────────────────────────────

  const handleEnterReorder = () => {
    setReorderedRows([...allPolicyRows]);
    setIsReordering(true);
  };

  const handleCancelReorder = () => {
    setIsReordering(false);
    setReorderedRows([]);
    setActiveId(null);
  };

  const handleDragStart = (event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setReorderedRows((prev) => {
      const oldIdx = prev.findIndex((r) => `${r.chainName}-${r.rule.rule_number}` === active.id);
      const newIdx = prev.findIndex((r) => `${r.chainName}-${r.rule.rule_number}` === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const handleSaveReorder = async () => {
    if (!reorderedRows.length) return;
    setSavingReorder(true);
    const chainName = reorderedRows[0].chainName;
    const service = ipVersion === "ipv4" ? firewallIPv4Service : firewallIPv6Service;
    const reorderItems = reorderedRows.map((row, index) => ({
      old_number: row.rule.rule_number,
      new_number: 10 + index,
      rule_data: row.rule,
    }));
    try {
      await service.reorderRules({ chain: chainName, is_custom_chain: true, rules: reorderItems });
      setIsReordering(false);
      setReorderedRows([]);
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rule order");
    } finally {
      setSavingReorder(false);
    }
  };

  // ── Rule panel helpers ────────────────────────────────────────────────────

  const openCreatePanel = () => {
    setSelectedRow(null);
    setRulePanelMode("create");
    setRulePanelOpen(true);
  };

  const openEditPanel = (row: PolicyRow) => {
    setSelectedRow(row);
    setRulePanelMode("edit");
    setRulePanelOpen(true);
  };

  // Derive context for the rule panel
  const panelSourceZone = selectedPair !== "all" ? selectedPair.source : (selectedRow?.sourceZone ?? undefined);
  const panelDestZone = selectedPair !== "all" ? selectedPair.dest : (selectedRow?.destZone ?? undefined);
  const panelChainName = (panelSourceZone && panelDestZone)
    ? (resolveChainName(panelSourceZone, panelDestZone, ipVersion, zones) ?? undefined)
    : undefined;
  const panelExistingRules = panelChainName ? getChainRules(panelChainName, ipVersion) : [];

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const canReorder = selectedPair !== "all";

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Firewall Zones</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage zone-based firewall policies</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadData(true)} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Read-only banner */}
          {!canEdit && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
              <Shield className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                You have read-only access to Firewall Zones. Contact an administrator to make changes.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {/* ================================================================
              Zone Table
          ================================================================ */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Zone Name</TableHead>
                    <TableHead>Networks / Interfaces</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                        No zones configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    zones.map((zone) => (
                      <TableRow
                        key={zone.name}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedZone?.name === zone.name && "bg-primary/5 ring-1 ring-inset ring-primary/30"
                        )}
                        onClick={() => setSelectedZone(selectedZone?.name === zone.name ? null : zone)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {zone.local_zone && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock className="h-4 w-4 text-blue-500 shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>Local Zone</TooltipContent>
                              </Tooltip>
                            )}
                            <span className="font-mono font-medium">{zone.name}</span>
                            {zone.description && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>{zone.description}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {zone.local_zone ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-300">Router (local)</Badge>
                            ) : zone.interfaces.length === 0 && zone.vrfs.length === 0 ? (
                              <span className="text-xs text-muted-foreground">No members</span>
                            ) : (
                              <>
                                {[...zone.interfaces, ...zone.vrfs].slice(0, 4).map((iface) => (
                                  <Badge key={iface} variant="secondary" className="font-mono text-xs">{iface}</Badge>
                                ))}
                                {zone.interfaces.length + zone.vrfs.length > 4 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{zone.interfaces.length + zone.vrfs.length - 4} more
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center gap-3 px-4 py-3 border-t bg-muted/20">
                {canEdit && (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>Create Zone</Button>
                )}
                {canEdit && selectedZone && (
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                    Manage: {selectedZone.name}
                  </Button>
                )}
                {!selectedZone && (
                  <span className="text-xs text-muted-foreground">
                    {canEdit ? "Select a zone to manage it" : "Click a zone to view details"}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ================================================================
              Zone Policy Matrix
          ================================================================ */}
          {zones.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">Zone Policy Matrix</p>

                <div className="overflow-x-auto">
                  <div className="flex items-stretch gap-0 inline-flex">
                    <div className="flex items-center justify-center shrink-0 pr-2 self-stretch">
                      <span
                        className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest select-none"
                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      >
                        Source
                      </span>
                    </div>

                    <div className="rounded-xl overflow-hidden ring-1 ring-border">
                      <table className="text-xs" style={{ borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th rowSpan={2} className="p-0" style={{ minWidth: "7rem" }}>
                              <button
                                onClick={() => setSelectedPair("all")}
                                className={cn(
                                  "w-full h-full flex items-center justify-center px-3 py-2 text-xs font-semibold border border-border transition-colors",
                                  selectedPair === "all"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                )}
                              >
                                All Policies ({totalAllRules})
                              </button>
                            </th>
                            <th
                              colSpan={zones.length}
                              className="border border-border py-1 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20"
                            >
                              Destination
                            </th>
                          </tr>
                          <tr>
                            {zones.map((z) => (
                              <th
                                key={z.name}
                                className="border border-border px-4 py-2 text-center font-mono font-semibold bg-muted/50"
                                style={{ minWidth: "7rem" }}
                              >
                                {z.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {zones.map((srcZone) => (
                            <tr key={srcZone.name}>
                              <td className="border border-border px-3 py-0 font-mono font-semibold whitespace-nowrap bg-muted/50 h-10">
                                {srcZone.name}
                              </td>
                              {zones.map((dstZone) => {
                                const cell = getCellInfo(srcZone.name, dstZone.name, zones, ipv4Config, ipv6Config);
                                const isLocalSelf = srcZone.name === dstZone.name && srcZone.local_zone;
                                const isSelected =
                                  selectedPair !== "all" &&
                                  selectedPair.source === srcZone.name &&
                                  selectedPair.dest === dstZone.name;

                                return (
                                  <td
                                    key={dstZone.name}
                                    className={cn(cell.bgClass, "p-0 border border-black/20", !isLocalSelf && "cursor-pointer")}
                                    onClick={() => {
                                      if (isLocalSelf) return;
                                      const pair = { source: srcZone.name, dest: dstZone.name };
                                      setSelectedPair(isSelected ? "all" : pair);
                                      // Cancel reorder when changing pair
                                      if (isReordering) handleCancelReorder();
                                    }}
                                  >
                                    <div
                                      className={cn(
                                        "h-10 flex items-center justify-between gap-2 px-3 transition-all",
                                        isSelected && "ring-2 ring-inset ring-white/60",
                                        !isLocalSelf && "hover:brightness-125"
                                      )}
                                    >
                                      <span className={cn("text-xs font-medium truncate", cell.textClass)}>{cell.label}</span>
                                      {cell.count > 0 && (
                                        <span className="text-xs text-cyan-400 font-semibold shrink-0">({cell.count})</span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ================================================================
              Reorder banner — shown inline above the policy table
          ================================================================ */}
          {isReordering && (
            <div className="flex items-center gap-4 bg-card border-2 border-primary rounded-lg px-5 py-3 shadow-sm">
              <p className="text-sm font-semibold">Reorder Pending</p>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={handleCancelReorder} disabled={savingReorder} className="gap-1.5">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveReorder} disabled={savingReorder} className="gap-1.5">
                  {savingReorder ? (
                    <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Saving...</>
                  ) : (
                    <>Save Order</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ================================================================
              Firewall Policy Table
          ================================================================ */}
          <Card>
            <CardContent className="p-0">
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap">
                {/* Exclusive IPv4/IPv6 toggle */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={ipVersion === "ipv4" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setIpVersion("ipv4"); if (isReordering) handleCancelReorder(); }}
                    className="text-xs h-7"
                  >
                    IPv4
                  </Button>
                  <Button
                    variant={ipVersion === "ipv6" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setIpVersion("ipv6"); if (isReordering) handleCancelReorder(); }}
                    className="text-xs h-7"
                  >
                    IPv6
                  </Button>
                </div>

                {/* New Rule button */}
                {canEdit && !isReordering && (
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={openCreatePanel}>
                    <Plus className="h-3.5 w-3.5" />
                    New Rule
                  </Button>
                )}

                {/* Search */}
                {!isReordering && (
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search rules..."
                      className="pl-7 h-7 text-xs"
                    />
                  </div>
                )}

                {/* Active pair filter indicator */}
                {!isReordering && selectedPair !== "all" && (
                  <div className="flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-mono">
                      {selectedPair.source} → {selectedPair.dest}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPair("all")}
                      className="h-6 px-1 text-xs"
                    >
                      ×
                    </Button>
                  </div>
                )}

                {/* Reorder button */}
                {canEdit && !isReordering && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={!canReorder}
                          onClick={handleEnterReorder}
                        >
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          Reorder
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canReorder && (
                      <TooltipContent side="bottom" className="text-xs max-w-48 text-center">
                        Select a specific zone pair in the matrix to reorder rules
                      </TooltipContent>
                    )}
                  </Tooltip>
                )}

                {/* Reorder mode label */}
                {isReordering && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    Drag rows to reorder — changes apply on save
                  </span>
                )}
              </div>

              {/* Rule table */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-8" />
                      <TableHead className="w-8"><span className="pl-4">#</span></TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Src. Zone</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Src. Port</TableHead>
                      <TableHead>Dst. Zone</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Dst. Port</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground text-sm">
                          {selectedPair !== "all"
                            ? `No firewall rules for ${selectedPair.source} → ${selectedPair.dest}`
                            : "No firewall rules found for any zone pair"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <SortableContext
                        items={displayRows.map((r) => `${r.chainName}-${r.rule.rule_number}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {displayRows.map((row, idx) => {
                          const id = `${row.chainName}-${row.rule.rule_number}`;
                          return (
                            <SortableRuleRow
                              key={`${id}-${idx}`}
                              id={id}
                              row={row}
                              isReordering={isReordering}
                              onClick={() => openEditPanel(row)}
                              groups={groups}
                            />
                          );
                        })}
                      </SortableContext>
                    )}
                  </TableBody>
                </Table>

                {/* Drag overlay — ghost of the row being dragged */}
                <DragOverlay>
                  {activeId && (() => {
                    const row = displayRows.find((r) => `${r.chainName}-${r.rule.rule_number}` === activeId);
                    if (!row) return null;
                    return (
                      <div className="bg-background border rounded text-xs px-3 py-2 shadow-lg font-mono opacity-90">
                        Rule #{row.rule.rule_number}
                        {row.rule.description ? ` — ${row.rule.description}` : ""}
                      </div>
                    );
                  })()}
                </DragOverlay>
              </DndContext>

              {displayRows.length > 0 && (
                <div className="px-4 py-2 border-t text-xs text-muted-foreground">
                  {displayRows.length} rule{displayRows.length !== 1 ? "s" : ""}
                  {selectedPair !== "all" && ` for ${selectedPair.source} → ${selectedPair.dest}`}
                  {isReordering && (
                    <span className="ml-2 text-primary font-medium">• reorder mode</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ================================================================
            Modals & Panels
        ================================================================ */}
        <CreateZoneModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={handleSuccess}
          capabilities={capabilities}
          existingZones={zones}
        />

        {selectedZone && (() => {
          const nonLocalZones = zones.filter((z) => !z.local_zone);
          const peerZones = nonLocalZones.filter((z) => z.name !== selectedZone.name).map((z) => z.name);
          const isLastNonLocalZone = nonLocalZones.length === 1 && nonLocalZones[0]?.name === selectedZone.name;
          return (
            <EditZoneModal
              open={editOpen}
              onOpenChange={(open) => {
                setEditOpen(open);
                if (!open) setSelectedZone(null);
              }}
              onSuccess={handleSuccess}
              zone={selectedZone}
              capabilities={capabilities}
              peerZones={peerZones}
              isLastNonLocalZone={isLastNonLocalZone}
            />
          );
        })()}

        <ZoneRulePanel
          open={rulePanelOpen}
          onOpenChange={setRulePanelOpen}
          onSuccess={handleSuccess}
          mode={rulePanelMode}
          rule={rulePanelMode === "edit" ? selectedRow?.rule : undefined}
          sourceZone={panelSourceZone}
          destZone={panelDestZone}
          chainName={panelChainName}
          ipVersion={ipVersion}
          zones={zones}
          existingRules={panelExistingRules}
          getChainRules={getChainRules}
          capabilities={firewallCaps}
          canEdit={canEdit}
        />

      </TooltipProvider>
    </AppLayout>
  );
}
