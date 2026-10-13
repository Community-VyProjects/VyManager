"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Network,
  RefreshCw,
  Pencil,
  CheckCircle2,
  Ban,
  Loader2,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { dhcpv6RelayService, DHCPv6RelayConfig } from "@/lib/api/dhcpv6-relay";
import { DHCPv6RelayModal } from "./DHCPv6RelayModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

function isConfigured(config: DHCPv6RelayConfig): boolean {
  return config.listen_interfaces.length > 0 || config.upstream_interfaces.length > 0;
}

export function DHCPv6RelayContent() {
  const t = useTranslations("dhcpv6Relay");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.DHCPV6_RELAY);

  const [config, setConfig] = useState<DHCPv6RelayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await dhcpv6RelayService.getConfig(refresh);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("content.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleDisable = async () => {
    if (!config || !hasWritePermission) return;
    setDisableLoading(true);
    setError(null);
    const result = await dhcpv6RelayService.setDisabled(!config.disabled);
    if (!result.success) {
      setError(result.error ?? t("content.statusFailed"));
    } else {
      await loadData(true);
    }
    setDisableLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>
          {tc("retry")}
        </Button>
      </div>
    );
  }

  const configured = config ? isConfigured(config) : false;

  const statusBadge = !configured ? (
    <Badge variant="secondary" className="bg-muted text-muted-foreground">{t("content.unconfigured")}</Badge>
  ) : config?.disabled ? (
    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">{tc("disabled")}</Badge>
  ) : (
    <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-500">{t("content.active")}</Badge>
  );

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{t("content.title")}</h1>
                  {statusBadge}
                  {!hasWritePermission && (
                    <Badge variant="secondary">{tc("readOnly")}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("content.subtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasWritePermission && configured && (
                <Button
                  variant={config?.disabled ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleDisable}
                  disabled={disableLoading}
                >
                  {disableLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {config?.disabled ? t("content.enableService") : t("content.disableService")}
                </Button>
              )}
              {hasWritePermission && (
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {configured ? t("content.editConfiguration") : t("content.configure")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {tc("refresh")}
              </Button>
            </div>
          </div>

          {/* Disabled warning banner */}
          {configured && config?.disabled && (
            <div className="mb-4 flex items-center gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">
                {t("content.disabledBanner")}
              </span>
              {hasWritePermission && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto border-amber-500/30 hover:bg-amber-500/10"
                  onClick={handleToggleDisable}
                  disabled={disableLoading}
                >
                  {t("content.reenable")}
                </Button>
              )}
            </div>
          )}

          {/* Inline error (e.g. toggle failure) */}
          {error && config && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm whitespace-pre-wrap font-mono">
              {error}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          {!configured ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full p-4 bg-muted mb-4">
                  <Network className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-base font-semibold mb-1">{t("content.emptyTitle")}</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                  {t("content.emptyDescription")}
                </p>
                {hasWritePermission && (
                  <Button onClick={() => setModalOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("content.configureRelay")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  icon={
                    config?.disabled
                      ? <Ban className="h-4 w-4 text-amber-500" />
                      : <CheckCircle2 className="h-4 w-4 text-green-500" />
                  }
                  iconBg={config?.disabled ? "bg-amber-500/10" : "bg-green-500/10"}
                  label={t("content.serviceStatus")}
                  value={config?.disabled ? tc("disabled") : t("content.active")}
                />
                <StatCard
                  icon={<Settings2 className="h-4 w-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label={t("content.maxHopCount")}
                  value={config?.max_hop_count != null ? String(config.max_hop_count) : t("content.defaultTen")}
                />
                <StatCard
                  icon={<ArrowDownToLine className="h-4 w-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label={t("content.listenInterfaces")}
                  value={String(config?.listen_interfaces.length ?? 0)}
                />
                <StatCard
                  icon={<ArrowUpFromLine className="h-4 w-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label={t("content.upstreamInterfaces")}
                  value={String(config?.upstream_interfaces.length ?? 0)}
                />
              </div>

              {/* Config detail grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column — Global Options */}
                <div className="space-y-4">
                  <DetailCard
                    title={t("content.globalOptions")}
                    icon={<Settings2 className="h-4 w-4 text-muted-foreground" />}
                  >
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("content.maxHopCount")}</dt>
                        <dd className="font-mono font-medium">
                          {config?.max_hop_count != null ? config.max_hop_count : t("defaultValue", { value: "10" })}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-muted-foreground">{t("content.interfaceIdOption")}</dt>
                        <dd>
                          {config?.use_interface_id_option ? (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-500 text-xs">
                              {tc("enabled")}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{tc("disabled")}</Badge>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </DetailCard>
                </div>

                {/* Right column — Interfaces */}
                <div className="space-y-4">
                  {config && config.listen_interfaces.length > 0 && (
                    <DetailCard
                      title={t("content.listenInterfaces")}
                      icon={<ArrowDownToLine className="h-4 w-4 text-muted-foreground" />}
                    >
                      <div className="space-y-1.5">
                        {config.listen_interfaces.map((li) => (
                          <div key={li.interface} className="flex items-center gap-2 text-sm">
                            <Badge variant="secondary" className="font-mono">{li.interface}</Badge>
                            {li.address ? (
                              <>
                                <span className="text-muted-foreground">→</span>
                                <Badge variant="outline" className="font-mono text-xs">{li.address}</Badge>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">{t("allAddresses")}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </DetailCard>
                  )}

                  {config && config.upstream_interfaces.length > 0 && (
                    <DetailCard
                      title={t("content.upstreamInterfaces")}
                      icon={<ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />}
                    >
                      <div className="space-y-2">
                        {config.upstream_interfaces.map((ui) => (
                          <div key={ui.interface} className="space-y-1">
                            <Badge variant="secondary" className="font-mono">{ui.interface}</Badge>
                            {ui.addresses.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 pl-2">
                                {ui.addresses.map((addr) => (
                                  <Badge key={addr} variant="outline" className="font-mono text-xs">{addr}</Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground pl-2">{t("content.noServerAddresses")}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </DetailCard>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <DHCPv6RelayModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => loadData(true)}
        config={config}
      />
    </>
  );
}

// ---- Helpers ----

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}

function StatCard({ icon, iconBg, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-md p-2 ${iconBg}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DetailCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function DetailCard({ title, icon, children }: DetailCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {children}
      </CardContent>
    </Card>
  );
}
