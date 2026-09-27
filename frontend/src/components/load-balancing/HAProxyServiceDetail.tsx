"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle, ArrowLeft, Globe, Loader2, Pencil, Plus, RefreshCw,
  Shield, Trash2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { lbService, LBConfig, LBCapabilities, LBServiceRule } from "@/lib/api/load-balancing";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { HAProxyServiceModal } from "./HAProxyServiceModal";
import { HAProxyRuleModal } from "./HAProxyRuleModal";

// ============================================================================
// Helpers
// ============================================================================

function ruleMatchSummary(rule: LBServiceRule): string {
  const parts: string[] = [];
  if (rule.domain_name.length > 0)
    parts.push(rule.domain_name.join(", "));
  if (rule.wildcard_domain.length > 0)
    parts.push(rule.wildcard_domain.map((d) => `*.${d}`).join(", "));
  if (rule.ssl)
    parts.push(`ssl:${rule.ssl}`);
  if (rule.url_path.begin.length > 0)
    parts.push(rule.url_path.begin.map((p) => `${p}*`).join(", "));
  if (rule.url_path.end.length > 0)
    parts.push(rule.url_path.end.map((p) => `*${p}`).join(", "));
  if (rule.url_path.exact.length > 0)
    parts.push(rule.url_path.exact.map((p) => `=${p}`).join(", "));
  return parts.join("  ·  ") || "—";
}

// label null = no action (translated at render time)
function ruleActionSummary(rule: LBServiceRule): { label: string | null; variant: "default" | "secondary" | "outline" } {
  if (rule.set.backend)
    return { label: `→ ${rule.set.backend}`, variant: "secondary" };
  if (rule.set.redirect_location)
    return { label: `↪ ${rule.set.redirect_location}`, variant: "outline" };
  return { label: null, variant: "outline" };
}

// ============================================================================
// Delete dialog
// ============================================================================

function DeleteRuleDialog({
  open, onOpenChange, ruleId, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ruleId: string;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("haproxy");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) setError(null); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("deleteRuleTitle", { id: ruleId })}</DialogTitle>
          <DialogDescription>{t("deleteRuleDescription")}</DialogDescription>
        </DialogHeader>
        {error && (
          <div className="flex gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button variant="destructive" disabled={loading} onClick={async () => {
            setLoading(true);
            setError(null);
            try { await onConfirm(); onOpenChange(false); }
            catch (err) { setError(err instanceof Error ? err.message : t("deleteFailed")); }
            finally { setLoading(false); }
          }}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main component
// ============================================================================

interface Props { serviceName: string }

export function HAProxyServiceDetail({ serviceName }: Props) {
  const t = useTranslations("haproxy");
  const tc = useTranslations("common");
  const router = useRouter();
  const { canWrite } = usePermissions();
  const canEdit = canWrite(FeatureGroup.LOAD_BALANCING);

  const [config, setConfig] = useState<LBConfig | null>(null);
  const [capabilities, setCapabilities] = useState<LBCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [editConfigOpen, setEditConfigOpen] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editRule, setEditRule] = useState<LBServiceRule | null>(null);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<LBServiceRule | null>(null);

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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const service = config?.reverse_proxy.services.find((s) => s.name === serviceName);
  const allBackends = config?.reverse_proxy.backends ?? [];

  if (!service) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/load-balancing/haproxy")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> HAProxy
        </Button>
        <div className="flex gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {t("serviceDetail.notFound", { name: serviceName })}
        </div>
      </div>
    );
  }

  const rules = [...service.rules].sort((a, b) => Number(a.rule_id) - Number(b.rule_id));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground"
          onClick={() => router.push("/load-balancing/haproxy")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> HAProxy
        </Button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Globe className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{service.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {service.mode && <Badge variant="outline" className="text-xs uppercase">{service.mode}</Badge>}
                {service.port && <span className="text-sm text-muted-foreground">:{service.port}</span>}
                {service.ssl && <Shield className="h-3.5 w-3.5 text-green-500" />}
                {service.description && (
                  <span className="text-sm text-muted-foreground">{service.description}</span>
                )}
              </div>
            </div>
          </div>
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

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">{t("configuration")}</TabsTrigger>
          <TabsTrigger value="rules">
            {t("rules")}
            {rules.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{rules.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- */}
        {/* Configuration tab                                                */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="config" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t("mode")}</p>
                <p className="font-semibold">{service.mode ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t("port")}</p>
                <p className="font-semibold font-mono">{service.port ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SSL</p>
                <p className="font-semibold">
                  {service.ssl ? t("serviceDetail.certCount", { count: service.ssl.certificates.length }) : tc("none")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">HTTP→HTTPS</p>
                <p className="font-semibold">{service.redirect_http_to_https ? t("yes") : t("no")}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t("serviceDetail.details")}</p>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => setEditConfigOpen(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> {t("editConfiguration")}
                  </Button>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex gap-8">
                  <div className="w-36 text-muted-foreground shrink-0">{t("serviceDetail.listenAddresses")}</div>
                  <div>
                    {service.listen_addresses.length > 0
                      ? service.listen_addresses.map((la) => (
                          <Badge key={la.address} variant="secondary" className="text-xs font-mono mr-1">{la.address}</Badge>
                        ))
                      : <span className="text-muted-foreground">{t("serviceDetail.allInterfaces")}</span>
                    }
                  </div>
                </div>

                <div className="flex gap-8">
                  <div className="w-36 text-muted-foreground shrink-0">{t("backends")}</div>
                  <div>
                    {service.backends.length > 0
                      ? service.backends.map((be) => (
                          <Badge key={be} variant="outline" className="text-xs mr-1">{be}</Badge>
                        ))
                      : <span className="text-muted-foreground">{tc("none")}</span>
                    }
                  </div>
                </div>

                {service.ssl && (
                  <div className="flex gap-8">
                    <div className="w-36 text-muted-foreground shrink-0">{t("serviceDetail.sslCertificates")}</div>
                    <div>
                      {service.ssl.certificates.map((c) => (
                        <Badge key={c} variant="secondary" className="text-xs mr-1">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {service.http_compression && (
                  <div className="flex gap-8">
                    <div className="w-36 text-muted-foreground shrink-0">{t("serviceDetail.compression")}</div>
                    <div className="text-sm">{service.http_compression.algorithm ?? t("serviceDetail.compressionEnabled")}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Rules tab                                                        */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="rules" className="mt-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold">{t("routingRules")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("rulesEvaluatedInOrder")}
                </p>
              </div>
              {canEdit && (
                <Button size="sm" onClick={() => { setEditRule(null); setRuleModalOpen(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t("addRule")}
                </Button>
              )}
            </div>

            {rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <p className="text-sm font-medium">{t("noRoutingRules")}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {t("serviceDetail.noRulesHint")}
                </p>
                {canEdit && (
                  <Button size="sm" onClick={() => { setEditRule(null); setRuleModalOpen(true); }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> {t("addFirstRule")}
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">{t("ruleId")}</TableHead>
                    <TableHead>{t("matchConditions")}</TableHead>
                    <TableHead className="w-56">{t("action")}</TableHead>
                    {canEdit && <TableHead className="w-20" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => {
                    const action = ruleActionSummary(rule);
                    return (
                      <TableRow key={rule.rule_id}>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">{rule.rule_id}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{ruleMatchSummary(rule)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={action.variant} className="text-xs font-mono">
                            {action.label ?? t("noAction")}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={() => { setEditRule(rule); setRuleModalOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => setDeleteRuleTarget(rule)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <HAProxyServiceModal
        open={editConfigOpen}
        onOpenChange={setEditConfigOpen}
        service={service}
        backends={allBackends}
        capabilities={capabilities}
        onSuccess={() => loadData(true)}
      />

      <HAProxyRuleModal
        open={ruleModalOpen}
        onOpenChange={setRuleModalOpen}
        type="service"
        entityName={service.name}
        rule={editRule}
        entityOptions={allBackends.map((b) => b.name)}
        capabilities={capabilities}
        nextRuleId={rules.length + 10}
        onSuccess={() => loadData(true)}
      />

      <DeleteRuleDialog
        open={!!deleteRuleTarget}
        onOpenChange={(o) => !o && setDeleteRuleTarget(null)}
        ruleId={deleteRuleTarget?.rule_id ?? ""}
        onConfirm={async () => {
          await lbService.deleteServiceRule(service.name, deleteRuleTarget!.rule_id, service.rules);
          setDeleteRuleTarget(null);
          await loadData(true);
        }}
      />
    </div>
  );
}
