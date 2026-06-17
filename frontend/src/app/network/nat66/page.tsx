"use client";

import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  ArrowRightLeft,
  ArrowLeftRight,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  nat66Service,
  type NAT66ConfigResponse,
  type NAT66Capabilities,
  type NAT66SourceRule,
  type NAT66DestinationRule,
} from "@/lib/api/nat66";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import type { GroupsConfigResponse } from "@/lib/api/types/firewall-groups";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { NAT66RuleDialog } from "@/components/network/NAT66RuleDialog";
import { NAT66DeleteDialog } from "@/components/network/NAT66DeleteDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type RuleType = "source" | "destination";

export default function NAT66Page() {
  const { canRead, canWrite, isLoading: permissionsLoading } = usePermissions();
  const [selectedType, setSelectedType] = useState<RuleType>("source");
  const [config, setConfig] = useState<NAT66ConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<NAT66Capabilities | null>(null);
  const [groupsConfig, setGroupsConfig] = useState<GroupsConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NAT66SourceRule | NAT66DestinationRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRule, setDeletingRule] = useState<NAT66SourceRule | NAT66DestinationRule | null>(null);

  const fetchConfig = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await nat66Service.getConfig(refresh);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NAT66 configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    nat66Service.getCapabilities().then(setCapabilities).catch(console.error);
    firewallGroupsService.getConfig().then(setGroupsConfig).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sourceRules = config?.source_rules ?? [];
  const destinationRules = config?.destination_rules ?? [];
  const hasWriteAccess = canWrite(FeatureGroup.NAT66);
  const groupsSupported = capabilities?.features?.groups?.supported ?? false;

  const currentRules: (NAT66SourceRule | NAT66DestinationRule)[] =
    selectedType === "source" ? sourceRules : destinationRules;

  const getNextRuleNumber = () =>
    Math.max(...currentRules.map((r) => r.rule_number), 99) + 1;

  // Clear search on tab switch
  useEffect(() => {
    setSearchQuery("");
  }, [selectedType]);

  // Filter rules
  const filteredRules = currentRules.filter((rule) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    if (selectedType === "source") {
      const r = rule as NAT66SourceRule;
      return (
        r.rule_number.toString().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.protocol?.toLowerCase().includes(query) ||
        r.outbound_interface?.toLowerCase().includes(query) ||
        r.source?.prefix?.toLowerCase().includes(query) ||
        r.destination?.prefix?.toLowerCase().includes(query) ||
        r.translation?.address?.toLowerCase().includes(query)
      );
    } else {
      const r = rule as NAT66DestinationRule;
      return (
        r.rule_number.toString().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.protocol?.toLowerCase().includes(query) ||
        r.inbound_interface?.toLowerCase().includes(query) ||
        r.source?.address?.toLowerCase().includes(query) ||
        r.destination?.address?.toLowerCase().includes(query) ||
        r.translation?.address?.toLowerCase().includes(query)
      );
    }
  });


  // Look up firewall group members by name and type prefix
  const getGroupMembers = (groupName: string, groupType: "net" | "addr" | "port" | "mac" | "domain"): string[] => {
    if (!groupsConfig) return [];
    const typeToField: Record<string, keyof GroupsConfigResponse> = {
      net: "ipv6_network_groups",
      addr: "ipv6_address_groups",
      port: "port_groups",
      mac: "mac_groups",
      domain: "domain_groups",
    };
    const field = typeToField[groupType];
    if (!field) return [];
    const groups = groupsConfig[field];
    if (!Array.isArray(groups)) return [];
    const group = groups.find((g: { name: string; members: string[] }) => g.name === groupName);
    return group?.members ?? [];
  };

  const GroupBadgeWithTooltip = ({ label, groupName, groupType }: { label: string; groupName: string; groupType: "net" | "addr" | "port" | "mac" | "domain" }) => {
    const members = getGroupMembers(groupName, groupType);
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-xs h-5 cursor-help">
            {label}: {groupName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs">
            <p className="font-semibold mb-1">{groupName}</p>
            {members.length > 0 ? (
              <ul className="space-y-0.5">
                {members.map((m, i) => (
                  <li key={i} className="font-mono">{m}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No members found</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  // Permission checks
  if (permissionsLoading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (!canRead(FeatureGroup.NAT66)) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You do not have permission to view NAT66 configurations. Please contact your administrator for access.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">NAT66</h1>
              <p className="text-sm text-muted-foreground mt-1">
                IPv6-to-IPv6 Network Address Translation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchConfig(true)}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
              {hasWriteAccess && (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setEditingRule(null);
                    setRuleDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add Rule
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4">
            <button
              onClick={() => setSelectedType("source")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                selectedType === "source"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Source
              <Badge
                variant="outline"
                className={cn(
                  "ml-1 h-5 text-xs",
                  selectedType === "source"
                    ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {sourceRules.length}
              </Badge>
            </button>
            <button
              onClick={() => setSelectedType("destination")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                selectedType === "destination"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Destination
              <Badge
                variant="outline"
                className={cn(
                  "ml-1 h-5 text-xs",
                  selectedType === "destination"
                    ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {destinationRules.length}
              </Badge>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <LoadingSpinner message="Loading NAT66 rules..." />
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <Card className="border-destructive max-w-md">
                <CardContent className="flex items-center gap-4 py-8">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-destructive">Error Loading Configuration</h3>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                  <Button onClick={() => fetchConfig(true)} variant="outline">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-6 pt-4">
              <TooltipProvider delayDuration={200}>
              <div className="rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[80px]">Rule #</TableHead>
                      <TableHead className="w-[200px]">Description</TableHead>
                      <TableHead>
                        {selectedType === "source" ? "Source Prefix" : "Source Address"}
                      </TableHead>
                      <TableHead className="w-[90px]">Src Port</TableHead>
                      <TableHead>
                        {selectedType === "source" ? "Dest Prefix" : "Dest Address"}
                      </TableHead>
                      <TableHead className="w-[90px]">Dest Port</TableHead>
                      <TableHead>Translation</TableHead>
                      <TableHead className="w-[140px]">
                        {selectedType === "source" ? "Outbound Iface" : "Inbound Iface"}
                      </TableHead>
                      <TableHead className="w-[90px]">Protocol</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="h-32">
                          <div className="flex flex-col items-center justify-center text-center">
                            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm font-medium text-foreground">
                              {searchQuery
                                ? "No matching rules"
                                : `No ${selectedType} NAT66 rules`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {searchQuery
                                ? "Try adjusting your search"
                                : "Add a rule to get started"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRules.map((rule) => {
                        const isMasquerade =
                          selectedType === "source" &&
                          rule.translation?.address === "masquerade";

                        let sourceDisplay: string;
                        let destDisplay: string;
                        let ifaceDisplay: string;

                        if (selectedType === "source") {
                          const r = rule as NAT66SourceRule;
                          sourceDisplay = r.source?.prefix || "any";
                          destDisplay = r.destination?.prefix || "any";
                          ifaceDisplay = r.outbound_interface || "-";
                        } else {
                          const r = rule as NAT66DestinationRule;
                          sourceDisplay = r.source?.address || "any";
                          destDisplay = r.destination?.address || "any";
                          ifaceDisplay = r.inbound_interface || "-";
                        }

                        return (
                          <TableRow key={rule.rule_number} className="group">
                            <TableCell className="font-mono font-semibold">
                              {rule.rule_number}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {rule.description || "-"}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                                {sourceDisplay}
                              </code>
                              {groupsSupported && rule.source?.group && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {rule.source.group.network_group && (
                                    <GroupBadgeWithTooltip label="net" groupName={rule.source.group.network_group} groupType="net" />
                                  )}
                                  {rule.source.group.address_group && (
                                    <GroupBadgeWithTooltip label="addr" groupName={rule.source.group.address_group} groupType="addr" />
                                  )}
                                  {rule.source.group.mac_group && (
                                    <GroupBadgeWithTooltip label="mac" groupName={rule.source.group.mac_group} groupType="mac" />
                                  )}
                                  {rule.source.group.domain_group && (
                                    <GroupBadgeWithTooltip label="domain" groupName={rule.source.group.domain_group} groupType="domain" />
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {rule.source?.port ? (
                                <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                                  {rule.source.port}
                                </code>
                              ) : rule.source?.group?.port_group ? (
                                <GroupBadgeWithTooltip label="port" groupName={rule.source.group.port_group} groupType="port" />
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                                {destDisplay}
                              </code>
                              {groupsSupported && rule.destination?.group && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {rule.destination.group.network_group && (
                                    <GroupBadgeWithTooltip label="net" groupName={rule.destination.group.network_group} groupType="net" />
                                  )}
                                  {rule.destination.group.address_group && (
                                    <GroupBadgeWithTooltip label="addr" groupName={rule.destination.group.address_group} groupType="addr" />
                                  )}
                                  {rule.destination.group.mac_group && (
                                    <GroupBadgeWithTooltip label="mac" groupName={rule.destination.group.mac_group} groupType="mac" />
                                  )}
                                  {rule.destination.group.domain_group && (
                                    <GroupBadgeWithTooltip label="domain" groupName={rule.destination.group.domain_group} groupType="domain" />
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {rule.destination?.port ? (
                                <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                                  {rule.destination.port}
                                </code>
                              ) : rule.destination?.group?.port_group ? (
                                <GroupBadgeWithTooltip label="port" groupName={rule.destination.group.port_group} groupType="port" />
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isMasquerade ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                                >
                                  masquerade
                                </Badge>
                              ) : (
                                <div>
                                  <code className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded font-mono">
                                    {rule.translation?.address || "-"}
                                  </code>
                                  {rule.translation?.port && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      :{rule.translation.port}
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                                {ifaceDisplay}
                              </code>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium uppercase">
                                {rule.protocol || "all"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {rule.disable ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-500/10 text-gray-500 border-gray-500/20"
                                  >
                                    Disabled
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                                  >
                                    Enabled
                                  </Badge>
                                )}
                                {rule.exclude && (
                                  <Badge
                                    variant="outline"
                                    className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                                  >
                                    Exclude
                                  </Badge>
                                )}
                                {rule.log && (
                                  <Badge
                                    variant="outline"
                                    className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                  >
                                    Log
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {hasWriteAccess && (
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingRule(rule);
                                      setRuleDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      setDeletingRule(rule);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>

      {/* Rule Dialog */}
      <NAT66RuleDialog
        open={ruleDialogOpen}
        onOpenChange={(open) => {
          setRuleDialogOpen(open);
          if (!open) setEditingRule(null);
        }}
        ruleType={selectedType}
        editingRule={editingRule}
        capabilities={capabilities}
        nextRuleNumber={getNextRuleNumber()}
        onSuccess={() => fetchConfig(true)}
      />

      {/* Delete Dialog */}
      <NAT66DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeletingRule(null);
        }}
        rule={deletingRule}
        ruleType={selectedType}
        onSuccess={() => fetchConfig(true)}
      />
    </AppLayout>
  );
}
