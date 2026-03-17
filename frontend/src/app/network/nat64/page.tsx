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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  RefreshCw,
  AlertCircle,
  Globe,
  ChevronRight,
  Pencil,
  Trash2,
  Power,
} from "lucide-react";
import {
  nat64Service,
  type NAT64ConfigResponse,
  type NAT64Capabilities,
  type NAT64SourceRule,
  type NAT64TranslationPool,
} from "@/lib/api/nat64";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { NAT64RuleDialog } from "@/components/network/NAT64RuleDialog";
import { NAT64PoolDialog } from "@/components/network/NAT64PoolDialog";
import { NAT64DeleteDialog } from "@/components/network/NAT64DeleteDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export default function NAT64Page() {
  const { canRead, canWrite, isLoading: permissionsLoading } = usePermissions();
  const [config, setConfig] = useState<NAT64ConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<NAT64Capabilities | null>(null);
  const [selectedRule, setSelectedRule] = useState<NAT64SourceRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NAT64SourceRule | null>(null);
  const [poolDialogOpen, setPoolDialogOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<NAT64TranslationPool | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "rule" | "pool";
    rule: NAT64SourceRule;
    pool?: NAT64TranslationPool;
  } | null>(null);

  const fetchConfig = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await nat64Service.getConfig(refresh);
      setConfig(data);
      // Update selectedRule with fresh data
      if (selectedRule) {
        const updated = data.source_rules.find(
          (r) => r.rule_number === selectedRule.rule_number
        );
        setSelectedRule(updated || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NAT64 configuration");
    } finally {
      setLoading(false);
    }
  }, [selectedRule]);

  useEffect(() => {
    fetchConfig();
    nat64Service.getCapabilities().then(setCapabilities).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rules = config?.source_rules ?? [];
  const hasWriteAccess = canWrite(FeatureGroup.NAT64);

  const getNextRuleNumber = () =>
    Math.max(...rules.map((r) => r.rule_number), 99) + 1;

  const getNextPoolNumber = (rule: NAT64SourceRule) =>
    Math.max(...rule.translation_pools.map((p) => p.pool_number), 0) + 1;

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

  if (!canRead(FeatureGroup.NAT64)) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You do not have permission to view NAT64 configurations. Please contact your administrator for access.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left Sidebar - Rule List */}
        <div className="w-80 border-r border-border bg-card flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">NAT64</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {rules.length} {rules.length === 1 ? "rule" : "rules"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchConfig(true)}
                  disabled={loading}
                  className="h-8 w-8"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
            </div>
            {hasWriteAccess && (
              <Button
                className="w-full gap-2"
                size="sm"
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

          <Separator />

          <ScrollArea className="flex-1 px-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner message="" size="sm" />
              </div>
            ) : error ? (
              <div className="p-4">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to load</span>
                </div>
              </div>
            ) : rules.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No NAT64 rules configured. Add a rule to get started.
              </div>
            ) : (
              <div className="space-y-1 py-3">
                {rules.map((rule) => (
                  <button
                    key={rule.rule_number}
                    onClick={() => setSelectedRule(rule)}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-3 transition-all",
                      selectedRule?.rule_number === rule.rule_number
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 rounded-md p-1.5",
                          selectedRule?.rule_number === rule.rule_number
                            ? "bg-primary/10"
                            : "bg-muted"
                        )}
                      >
                        <Globe
                          className={cn(
                            "h-4 w-4",
                            selectedRule?.rule_number === rule.rule_number
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-sm">
                            Rule {rule.rule_number}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {rule.disable && (
                              <Badge
                                variant="outline"
                                className="text-xs h-5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                              >
                                disabled
                              </Badge>
                            )}
                            {selectedRule?.rule_number === rule.rule_number && (
                              <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {rule.description && (
                            <span className="text-xs text-muted-foreground truncate block">
                              {rule.description}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {rule.translation_pools.length}{" "}
                            {rule.translation_pools.length === 1 ? "pool" : "pools"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Main Area - Rule Detail */}
        <div className="flex-1 flex flex-col overflow-auto">
          {selectedRule ? (
            <div className="flex-1 flex flex-col">
              {/* Rule Header */}
              <div className="p-6 pb-4 border-b border-border">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-foreground">
                        Rule {selectedRule.rule_number}
                      </h1>
                      {selectedRule.disable && (
                        <Badge
                          variant="outline"
                          className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                        >
                          Disabled
                        </Badge>
                      )}
                    </div>
                    {selectedRule.description && (
                      <p className="text-sm text-muted-foreground">
                        {selectedRule.description}
                      </p>
                    )}
                  </div>
                  {hasWriteAccess && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          nat64Service
                            .toggleRuleDisable(
                              selectedRule.rule_number,
                              selectedRule.disable
                            )
                            .then(() => fetchConfig(true))
                            .catch((err) =>
                              setError(
                                err instanceof Error ? err.message : "Toggle failed"
                              )
                            )
                        }
                      >
                        <Power className="h-4 w-4" />
                        {selectedRule.disable ? "Enable" : "Disable"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setEditingRule(selectedRule);
                          setRuleDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setDeleteTarget({ type: "rule", rule: selectedRule });
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>

                {/* Rule Info Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground mb-1">Source Prefix</p>
                      <code className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">
                        {selectedRule.source_prefix || "not set"}
                      </code>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground mb-1">Match Mark</p>
                      <code className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">
                        {selectedRule.match_mark || "none"}
                      </code>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground mb-1">
                        Translation Pools
                      </p>
                      <p className="text-2xl font-bold">
                        {selectedRule.translation_pools.length}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Translation Pools Table */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold">Translation Pools</h3>
                  {hasWriteAccess && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingPool(null);
                        setPoolDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Pool
                    </Button>
                  )}
                </div>
                <div className="rounded-lg border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Pool #</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Port</TableHead>
                        <TableHead>Protocol</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        {hasWriteAccess && (
                          <TableHead className="w-[100px]" />
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRule.translation_pools.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={hasWriteAccess ? 7 : 6}
                            className="text-center text-muted-foreground py-8"
                          >
                            No translation pools configured
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedRule.translation_pools.map((pool) => (
                          <TableRow key={pool.pool_number} className="group">
                            <TableCell className="font-mono font-semibold">
                              {pool.pool_number}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                                {pool.address || "-"}
                              </code>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                                {pool.port || "-"}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {pool.protocol?.tcp && (
                                  <Badge variant="outline" className="text-xs">
                                    TCP
                                  </Badge>
                                )}
                                {pool.protocol?.udp && (
                                  <Badge variant="outline" className="text-xs">
                                    UDP
                                  </Badge>
                                )}
                                {pool.protocol?.icmp && (
                                  <Badge variant="outline" className="text-xs">
                                    ICMP
                                  </Badge>
                                )}
                                {!pool.protocol?.tcp &&
                                  !pool.protocol?.udp &&
                                  !pool.protocol?.icmp && (
                                    <span className="text-muted-foreground text-sm">
                                      all
                                    </span>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {pool.description || "-"}
                            </TableCell>
                            <TableCell>
                              {pool.disable ? (
                                <Badge
                                  variant="outline"
                                  className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                                >
                                  disabled
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                                >
                                  enabled
                                </Badge>
                              )}
                            </TableCell>
                            {hasWriteAccess && (
                              <TableCell>
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingPool(pool);
                                      setPoolDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      setDeleteTarget({
                                        type: "pool",
                                        rule: selectedRule,
                                        pool,
                                      });
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <Globe className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  NAT64 Translation
                </h3>
                <p className="text-sm text-muted-foreground">
                  {rules.length === 0
                    ? "No rules configured. Add a NAT64 source rule to translate IPv6 traffic to IPv4 destinations."
                    : "Select a rule from the sidebar to view its details and translation pools."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rule Dialog */}
      <NAT64RuleDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        rule={editingRule}
        nextRuleNumber={getNextRuleNumber()}
        onSuccess={() => fetchConfig(true)}
      />

      {/* Pool Dialog */}
      {selectedRule && (
        <NAT64PoolDialog
          open={poolDialogOpen}
          onOpenChange={setPoolDialogOpen}
          ruleNumber={selectedRule.rule_number}
          pool={editingPool}
          nextPoolNumber={getNextPoolNumber(selectedRule)}
          onSuccess={() => fetchConfig(true)}
        />
      )}

      {/* Delete Dialog */}
      <NAT64DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        target={deleteTarget}
        onSuccess={() => {
          if (deleteTarget?.type === "rule") {
            setSelectedRule(null);
          }
          fetchConfig(true);
        }}
      />
    </AppLayout>
  );
}
