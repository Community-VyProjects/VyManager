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
  Lock,
  Info,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  Shield,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect, useCallback } from "react";
import { firewallZonesService } from "@/lib/api/firewall-zones";
import { firewallIPv4Service } from "@/lib/api/firewall-ipv4";
import { firewallIPv6Service } from "@/lib/api/firewall-ipv6";
import type { FirewallZone, ZonesCapabilities } from "@/lib/api/types/firewall-zones";
import type { FirewallConfigResponse, FirewallRule } from "@/lib/api/firewall-ipv4";
import { CreateZoneModal } from "@/components/firewall/zones/CreateZoneModal";
import { EditZoneModal } from "@/components/firewall/zones/EditZoneModal";
import { ZonePolicyModal } from "@/components/firewall/zones/ZonePolicyModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { cn } from "@/lib/utils";

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
// Cell color logic
// ============================================================================

function getCellInfo(
  sourceZone: string,
  destZone: string,
  zones: FirewallZone[],
  ipv4Config: FirewallConfigResponse | null,
  ipv6Config: FirewallConfigResponse | null
): { colorClass: string; bgClass: string; label: string; count: number } {
  if (sourceZone === destZone) {
    return { colorClass: "text-muted-foreground", bgClass: "bg-muted/30", label: "—", count: 0 };
  }

  const destZoneObj = zones.find((z) => z.name === destZone);
  const fromEntry = destZoneObj?.from_zones.find((f) => f.from_zone === sourceZone);

  if (!fromEntry || (!fromEntry.firewall_name && !fromEntry.firewall_ipv6_name)) {
    const action = destZoneObj?.default_action ?? "drop";
    return {
      colorClass: action === "drop" ? "text-destructive" : "text-orange-600 dark:text-orange-400",
      bgClass: action === "drop" ? "bg-destructive/10" : "bg-orange-500/10",
      label: `Default: ${action}`,
      count: 0,
    };
  }

  const ipv4Chain = ipv4Config?.custom_chains.find((c) => c.name === fromEntry.firewall_name);
  const ipv6Chain = ipv6Config?.custom_chains.find((c) => c.name === fromEntry.firewall_ipv6_name);
  const count = (ipv4Chain?.rules.length ?? 0) + (ipv6Chain?.rules.length ?? 0);
  const label = fromEntry.firewall_name ?? fromEntry.firewall_ipv6_name ?? "";
  const action = ipv4Chain?.default_action ?? ipv6Chain?.default_action;

  if (action === "accept") {
    return { colorClass: "text-emerald-700 dark:text-emerald-400", bgClass: "bg-emerald-500/10", label, count };
  }
  if (action === "drop" || action === "reject") {
    return { colorClass: "text-destructive", bgClass: "bg-destructive/10", label, count };
  }
  if (!ipv4Chain && !ipv6Chain && (fromEntry.firewall_name || fromEntry.firewall_ipv6_name)) {
    return { colorClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500/10", label: `⚠ ${label}`, count: 0 };
  }
  return { colorClass: "text-blue-600 dark:text-blue-400", bgClass: "bg-blue-500/10", label, count };
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedZone, setSelectedZone] = useState<FirewallZone | null>(null);
  const [selectedPair, setSelectedPair] = useState<MatrixPair | "all">("all");

  // Filter state
  const [showIpv4, setShowIpv4] = useState(true);
  const [showIpv6, setShowIpv6] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [policyPair, setPolicyPair] = useState<{ source: string; dest: string } | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [caps, zonesData, v4, v6] = await Promise.all([
        firewallZonesService.getCapabilities(),
        firewallZonesService.getConfig(refresh),
        firewallIPv4Service.getConfig(refresh),
        firewallIPv6Service.getConfig(refresh),
      ]);
      setCapabilities(caps);
      setZones(zonesData.zones);
      setIpv4Config(v4);
      setIpv6Config(v6);
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
  };

  // ============================================================================
  // Policy table construction
  // ============================================================================

  function buildPolicyRows(): PolicyRow[] {
    const rows: PolicyRow[] = [];
    for (const destZone of zones) {
      for (const fromEntry of destZone.from_zones) {
        if (showIpv4 && fromEntry.firewall_name) {
          const chain = ipv4Config?.custom_chains.find((c) => c.name === fromEntry.firewall_name);
          for (const rule of chain?.rules ?? []) {
            rows.push({
              sourceZone: fromEntry.from_zone,
              destZone: destZone.name,
              ipVersion: "IPv4",
              rule,
              chainName: fromEntry.firewall_name,
            });
          }
        }
        if (showIpv6 && fromEntry.firewall_ipv6_name) {
          const chain = ipv6Config?.custom_chains.find((c) => c.name === fromEntry.firewall_ipv6_name);
          for (const rule of chain?.rules ?? []) {
            rows.push({
              sourceZone: fromEntry.from_zone,
              destZone: destZone.name,
              ipVersion: "IPv6",
              rule,
              chainName: fromEntry.firewall_ipv6_name,
            });
          }
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
  }

  const totalRules = buildPolicyRows().length;
  const allPolicyRows = buildPolicyRows();

  // Total rule count across all pairs (unfiltered)
  const totalAllRules = (() => {
    let count = 0;
    for (const destZone of zones) {
      for (const fromEntry of destZone.from_zones) {
        if (fromEntry.firewall_name) {
          count += ipv4Config?.custom_chains.find((c) => c.name === fromEntry.firewall_name)?.rules.length ?? 0;
        }
        if (fromEntry.firewall_ipv6_name) {
          count += ipv6Config?.custom_chains.find((c) => c.name === fromEntry.firewall_ipv6_name)?.rules.length ?? 0;
        }
      }
    }
    return count;
  })();

  // ============================================================================
  // Address helpers
  // ============================================================================

  function getAddr(obj: { address?: string | null; group?: Record<string, string> | null } | null | undefined): string {
    if (!obj) return "Any";
    if (obj.address) return obj.address;
    if (obj.group) {
      const [, val] = Object.entries(obj.group)[0] ?? [];
      return val ?? "Any";
    }
    return "Any";
  }

  function getPort(obj: { port?: string | null } | null | undefined): string {
    return obj?.port ?? "Any";
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Firewall Zones</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage zone-based firewall policies
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              className="gap-2"
            >
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
                        onClick={() =>
                          setSelectedZone(selectedZone?.name === zone.name ? null : zone)
                        }
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
                              <Badge variant="outline" className="text-blue-600 border-blue-300">
                                Router (local)
                              </Badge>
                            ) : zone.interfaces.length === 0 && zone.vrfs.length === 0 ? (
                              <span className="text-xs text-muted-foreground">No members</span>
                            ) : (
                              <>
                                {[...zone.interfaces, ...zone.vrfs].slice(0, 4).map((iface) => (
                                  <Badge key={iface} variant="secondary" className="font-mono text-xs">
                                    {iface}
                                  </Badge>
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

              {/* Zone table actions */}
              <div className="flex items-center gap-3 px-4 py-3 border-t bg-muted/20">
                {canEdit && (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    Create Zone
                  </Button>
                )}
                {canEdit && selectedZone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                  >
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
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Zone Policy Matrix</p>
                    <p className="text-xs text-muted-foreground">
                      Click a cell to select a zone pair, then use the button to configure its firewall policy
                    </p>
                  </div>
                </div>

                {/* Toolbar: reset + configure selected pair */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={selectedPair === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPair("all")}
                    className="text-xs"
                  >
                    All Policies ({totalAllRules})
                  </Button>

                  {selectedPair !== "all" && (
                    <>
                      <span className="text-muted-foreground text-xs">—</span>
                      <span className="text-xs font-mono font-medium">
                        {selectedPair.source} → {selectedPair.dest}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => setPolicyPair({ source: selectedPair.source, dest: selectedPair.dest })}
                        className="text-xs"
                      >
                        Configure Policy
                      </Button>
                    </>
                  )}
                </div>

                {/* Axis labels */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold">Rows = Source zone</span>
                  <span>·</span>
                  <span className="font-semibold">Columns = Destination zone</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="border-collapse text-xs">
                    <thead>
                      <tr>
                        {/* corner label */}
                        <th className="p-0 min-w-28">
                          <div className="text-left pb-1 pl-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Source / Destination
                          </div>
                        </th>
                        {zones.map((z) => (
                          <th
                            key={z.name}
                            className="p-1 pb-2 text-center font-mono font-semibold min-w-28 text-xs"
                          >
                            {z.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {zones.map((srcZone) => (
                        <tr key={srcZone.name}>
                          <td className="pr-3 whitespace-nowrap">
                            <span className="font-mono font-semibold text-xs">{srcZone.name}</span>
                          </td>
                          {zones.map((dstZone) => {
                            const cell = getCellInfo(srcZone.name, dstZone.name, zones, ipv4Config, ipv6Config);
                            const isSelf = srcZone.name === dstZone.name;
                            const isSelected =
                              selectedPair !== "all" &&
                              selectedPair.source === srcZone.name &&
                              selectedPair.dest === dstZone.name;

                            return (
                              <td
                                key={dstZone.name}
                                className={cn(
                                  "p-1 text-center",
                                  !isSelf && "cursor-pointer"
                                )}
                                onClick={() => {
                                  if (isSelf) return;
                                  if (isSelected) {
                                    setSelectedPair("all");
                                  } else {
                                    setSelectedPair({ source: srcZone.name, dest: dstZone.name });
                                  }
                                }}
                              >
                                <div
                                  className={cn(
                                    "rounded-md px-2 py-1.5 min-h-10 flex flex-col items-center justify-center gap-0.5",
                                    cell.bgClass,
                                    isSelected && "ring-2 ring-primary ring-offset-1",
                                    !isSelf && "hover:opacity-80 transition-opacity"
                                  )}
                                >
                                  <span className={cn("text-[10px] font-medium truncate max-w-24", cell.colorClass)}>
                                    {cell.label}
                                  </span>
                                  {cell.count > 0 && (
                                    <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                      {cell.count} rules
                                    </Badge>
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
              </CardContent>
            </Card>
          )}

          {/* ================================================================
              Firewall Policy Table
          ================================================================ */}
          <Card>
            <CardContent className="p-0">
              {/* Table toolbar */}
              <div className="flex items-center gap-3 px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <Button
                    variant={showIpv4 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowIpv4(!showIpv4)}
                    className="text-xs h-7"
                  >
                    IPv4
                  </Button>
                  <Button
                    variant={showIpv6 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowIpv6(!showIpv6)}
                    className="text-xs h-7"
                  >
                    IPv6
                  </Button>
                </div>
                <div className="relative flex-1 max-w-xs ml-auto">
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search rules..."
                    className="pl-7 h-7 text-xs"
                  />
                </div>
                {selectedPair !== "all" && (
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
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Name</TableHead>
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
                  {allPolicyRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground text-sm">
                        {selectedPair !== "all"
                          ? `No firewall policies found for ${selectedPair.source} → ${selectedPair.dest}`
                          : "No firewall policies found for any zone pair"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    allPolicyRows.map((row, idx) => (
                      <TableRow
                        key={`${row.sourceZone}-${row.destZone}-${row.ipVersion}-${row.rule.rule_number}-${idx}`}
                        className={cn("text-xs", row.rule.disable && "opacity-50")}
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {row.rule.disable && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>Disabled</TooltipContent>
                              </Tooltip>
                            )}
                            {row.rule.rule_number}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-28 truncate">
                          {row.rule.description || (
                            <span className="text-muted-foreground font-mono">#{row.rule.rule_number}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] capitalize",
                              row.rule.action === "accept" && "text-emerald-600 border-emerald-300",
                              (row.rule.action === "drop" || row.rule.action === "reject") && "text-destructive border-destructive/30"
                            )}
                          >
                            {row.rule.action ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {row.ipVersion}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{row.rule.protocol ?? "Any"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {row.sourceZone}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {getAddr(row.rule.source)}
                        </TableCell>
                        <TableCell className="font-mono">{getPort(row.rule.source)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {row.destZone}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {getAddr(row.rule.destination)}
                        </TableCell>
                        <TableCell className="font-mono">{getPort(row.rule.destination)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {allPolicyRows.length > 0 && (
                <div className="px-4 py-2 border-t text-xs text-muted-foreground">
                  {allPolicyRows.length} rule{allPolicyRows.length !== 1 ? "s" : ""}
                  {selectedPair !== "all" && ` for ${selectedPair.source} → ${selectedPair.dest}`}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ================================================================
            Modals
        ================================================================ */}
        <CreateZoneModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={handleSuccess}
          capabilities={capabilities}
          existingZones={zones}
        />

        {selectedZone && (
          <EditZoneModal
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open);
              if (!open) setSelectedZone(null);
            }}
            onSuccess={handleSuccess}
            zone={selectedZone}
            capabilities={capabilities}
          />
        )}

        {policyPair && (
          <ZonePolicyModal
            open={!!policyPair}
            onOpenChange={(open) => { if (!open) setPolicyPair(null); }}
            onSuccess={handleSuccess}
            sourceZone={policyPair.source}
            destZone={policyPair.dest}
            zones={zones}
            canEdit={canEdit}
          />
        )}
      </TooltipProvider>
    </AppLayout>
  );
}
