"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle, Activity, ArrowLeftRight, Globe, Loader2, Network,
  Pencil, Plus, RefreshCw, Search, Settings2, Trash2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  lbService, LBConfig, LBCapabilities, WANInterfaceHealth, WANRule,
} from "@/lib/api/load-balancing";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { WANInterfaceModal } from "./WANInterfaceModal";
import { WANRuleModal } from "./WANRuleModal";

// ============================================================================
// Delete Dialog
// ============================================================================

function DeleteDialog({
  open, onOpenChange, title, description, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("wanLoadBalancing");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) setError(null); }, [open]);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <div className="flex gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Global Settings Dialog
// ============================================================================

function GlobalSettingsDialog({
  open, onOpenChange, config, onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  config: LBConfig | null;
  onSuccess: () => void;
}) {
  const t = useTranslations("wanLoadBalancing");
  const tc = useTranslations("common");
  const wan = config?.wan;
  const [disableSourceNat, setDisableSourceNat] = useState(false);
  const [enableLocalTraffic, setEnableLocalTraffic] = useState(false);
  const [flushConnections, setFlushConnections] = useState(false);
  const [stickyInbound, setStickyInbound] = useState(false);
  const [hook, setHook] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && wan) {
      setDisableSourceNat(wan.disable_source_nat);
      setEnableLocalTraffic(wan.enable_local_traffic);
      setFlushConnections(wan.flush_connections);
      setStickyInbound(wan.sticky_connections.inbound);
      setHook(wan.hook ?? "");
      setError(null);
    }
  }, [open, wan]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await lbService.updateWANGlobals({
        disable_source_nat: disableSourceNat,
        enable_local_traffic: enableLocalTraffic,
        flush_connections: flushConnections,
        sticky_inbound: stickyInbound,
        hook: hook.trim() || null,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("globals.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("globals.title")}</DialogTitle>
          <DialogDescription>
            {t("globals.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={disableSourceNat}
              onCheckedChange={(c) => setDisableSourceNat(!!c)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium">{t("disableSourceNat")}</p>
              <p className="text-xs text-muted-foreground">
                {t("globals.disableSourceNatHelp")}
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={enableLocalTraffic}
              onCheckedChange={(c) => setEnableLocalTraffic(!!c)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium">{t("globals.enableLocalTraffic")}</p>
              <p className="text-xs text-muted-foreground">
                {t("globals.enableLocalTrafficHelp")}
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={flushConnections}
              onCheckedChange={(c) => setFlushConnections(!!c)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium">{t("globals.flushConnections")}</p>
              <p className="text-xs text-muted-foreground">
                {t("globals.flushConnectionsHelp")}
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={stickyInbound}
              onCheckedChange={(c) => setStickyInbound(!!c)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium">{t("globals.stickyInbound")}</p>
              <p className="text-xs text-muted-foreground">
                {t("globals.stickyInboundHelp")}
              </p>
            </div>
          </label>

          <div className="space-y-1.5">
            <Label>{t("globals.hookScript")}</Label>
            <Input
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="/config/scripts/wan-lb"
            />
            <p className="text-xs text-muted-foreground">
              {t("globals.hookScriptHelp")}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("globals.saveSettings")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main content
// ============================================================================

export function WANContent() {
  const t = useTranslations("wanLoadBalancing");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const canEdit = canWrite(FeatureGroup.LOAD_BALANCING);

  const [config, setConfig] = useState<LBConfig | null>(null);
  const [capabilities, setCapabilities] = useState<LBCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [ifaceSearch, setIfaceSearch] = useState("");
  const [ruleSearch, setRuleSearch] = useState("");

  // Modal state
  const [ifaceModalOpen, setIfaceModalOpen] = useState(false);
  const [editIface, setEditIface] = useState<WANInterfaceHealth | null>(null);
  const [deleteIfaceTarget, setDeleteIfaceTarget] = useState<WANInterfaceHealth | null>(null);

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editRule, setEditRule] = useState<WANRule | null>(null);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<WANRule | null>(null);

  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      const [cap, cfg] = await Promise.all([
        lbService.getCapabilities(),
        lbService.getConfig(refresh),
      ]);
      setCapabilities(cap);
      setConfig(cfg);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const wan = config?.wan;
  const interfaceHealth = wan?.interface_health ?? [];
  const rules = wan?.rules ?? [];

  const filteredIfaces = interfaceHealth.filter((i) =>
    i.interface.toLowerCase().includes(ifaceSearch.toLowerCase()) ||
    i.nexthop?.toLowerCase().includes(ifaceSearch.toLowerCase())
  );

  const filteredRules = rules.filter((r) =>
    r.rule_id.includes(ruleSearch) ||
    r.description?.toLowerCase().includes(ruleSearch.toLowerCase()) ||
    r.inbound_interface?.toLowerCase().includes(ruleSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setGlobalSettingsOpen(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              {t("globalSettings")}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {tc("refresh")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Global settings summary */}
      {wan && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: t("disableSourceNat"), active: wan.disable_source_nat },
            { label: t("summary.localTraffic"), active: wan.enable_local_traffic },
            { label: t("summary.flushOnFailover"), active: wan.flush_connections },
            { label: t("summary.stickyConnections"), active: wan.sticky_connections.inbound },
          ].map(({ label, active }) => (
            <div
              key={label}
              className={`rounded-lg border p-3 text-xs ${active
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              <div className={`h-1.5 w-1.5 rounded-full mb-1.5 ${active ? "bg-primary" : "bg-muted-foreground/30"}`} />
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Network className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{interfaceHealth.length}</p>
                <p className="text-xs text-muted-foreground">{t("stats.monitoredInterfaces")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <Activity className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {interfaceHealth.reduce((sum, i) => sum + i.tests.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">{t("healthTests")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
                <ArrowLeftRight className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rules.length}</p>
                <p className="text-xs text-muted-foreground">{t("stats.lbRules")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Interface Health section */}
      {/* -------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{t("interfaces.title")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("interfaces.subtitle")}
            </p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => { setEditIface(null); setIfaceModalOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> {tc("addInterface")}
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="p-4 border-b border-border">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-sm"
                placeholder={t("interfaces.search")}
                value={ifaceSearch}
                onChange={(e) => setIfaceSearch(e.target.value)}
              />
            </div>
          </div>

          {filteredIfaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <Network className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{t("interfaces.empty")}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {t("interfaces.emptyHint")}
              </p>
              {canEdit && (
                <Button
                  size="sm" variant="outline"
                  onClick={() => { setEditIface(null); setIfaceModalOpen(true); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> {tc("addInterface")}
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("interface")}</TableHead>
                    <TableHead>{t("nexthopGateway")}</TableHead>
                    <TableHead>{t("interfaces.failureSuccessCount")}</TableHead>
                    <TableHead>{t("healthTests")}</TableHead>
                    {canEdit && <TableHead className="w-20" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIfaces.map((iface) => (
                    <TableRow key={iface.interface}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-sm font-mono">{iface.interface}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">{iface.nexthop ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {iface.failure_count ?? "5"} / {iface.success_count ?? "5"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {iface.tests.length === 0 ? (
                            <span className="text-xs text-muted-foreground">{tc("none")}</span>
                          ) : (
                            iface.tests.map((test) => (
                              <Badge key={test.test_id} variant="secondary" className="text-xs">
                                {test.type === "user-defined"
                                  ? t("interfaceModal.userDefined")
                                  : test.type && test.type !== "ping"
                                    ? test.type
                                    : t("interfaceModal.testPing")}
                                {test.target ? ` → ${test.target}` : ""}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => { setEditIface(iface); setIfaceModalOpen(true); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteIfaceTarget(iface)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Rules section */}
      {/* -------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{t("rules.title")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("rules.subtitle")}
            </p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => { setEditRule(null); setRuleModalOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> {t("addRule")}
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="p-4 border-b border-border">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-sm"
                placeholder={t("rules.search")}
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
              />
            </div>
          </div>

          {filteredRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{t("rules.empty")}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {t("rules.emptyHint")}
              </p>
              {canEdit && (
                <Button
                  size="sm" variant="outline"
                  onClick={() => { setEditRule(null); setRuleModalOpen(true); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t("addRule")}
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{t("rules.rule")}</TableHead>
                    <TableHead>{tc("description")}</TableHead>
                    <TableHead>{t("rules.inbound")}</TableHead>
                    <TableHead>{t("outboundInterfaces")}</TableHead>
                    <TableHead>{t("rules.flags")}</TableHead>
                    {canEdit && <TableHead className="w-20" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.rule_id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{rule.rule_id}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {rule.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">{rule.inbound_interface ?? t("rules.any")}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rule.interfaces.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            rule.interfaces.map((i) => (
                              <Badge key={i.interface} variant="secondary" className="text-xs font-mono">
                                {i.interface}{i.weight ? ` (w:${i.weight})` : ""}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rule.failover && <Badge variant="outline" className="text-xs">{t("rules.flagFailover")}</Badge>}
                          {rule.per_packet_balancing && <Badge variant="outline" className="text-xs">{t("rules.flagPerPacket")}</Badge>}
                          {rule.exclude && <Badge variant="outline" className="text-xs text-orange-500">{t("rules.flagExclude")}</Badge>}
                          {rule.protocol && <Badge variant="outline" className="text-xs">{rule.protocol}</Badge>}
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => { setEditRule(rule); setRuleModalOpen(true); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteRuleTarget(rule)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Modals */}
      <WANInterfaceModal
        open={ifaceModalOpen}
        onOpenChange={setIfaceModalOpen}
        iface={editIface}
        onSuccess={() => loadData(true)}
      />

      <WANRuleModal
        open={ruleModalOpen}
        onOpenChange={setRuleModalOpen}
        rule={editRule}
        interfaceHealth={interfaceHealth}
        capabilities={capabilities}
        onSuccess={() => loadData(true)}
      />

      <GlobalSettingsDialog
        open={globalSettingsOpen}
        onOpenChange={setGlobalSettingsOpen}
        config={config}
        onSuccess={() => loadData(true)}
      />

      <DeleteDialog
        open={!!deleteIfaceTarget}
        onOpenChange={(o) => !o && setDeleteIfaceTarget(null)}
        title={t("interfaces.removeTitle", { name: String(deleteIfaceTarget?.interface) })}
        description={t("interfaces.removeDescription")}
        onConfirm={async () => {
          await lbService.deleteInterfaceHealth(deleteIfaceTarget!.interface);
          setDeleteIfaceTarget(null);
          await loadData(true);
        }}
      />

      <DeleteDialog
        open={!!deleteRuleTarget}
        onOpenChange={(o) => !o && setDeleteRuleTarget(null)}
        title={t("rules.deleteTitle", { id: String(deleteRuleTarget?.rule_id) })}
        description={t("rules.deleteDescription")}
        onConfirm={async () => {
          await lbService.deleteWANRule(deleteRuleTarget!.rule_id);
          setDeleteRuleTarget(null);
          await loadData(true);
        }}
      />
    </div>
  );
}
