"use client";

import { useState, useEffect, useCallback } from "react";
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
      setError(err instanceof Error ? err.message : "Failed to load DHCPv6 relay configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleDisable = async () => {
    if (!config || !hasWritePermission) return;
    setDisableLoading(true);
    setError(null);
    const result = await dhcpv6RelayService.setDisabled(!config.disabled);
    if (!result.success) {
      setError(result.error ?? "Failed to update service status");
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
          Retry
        </Button>
      </div>
    );
  }

  const configured = config ? isConfigured(config) : false;

  const statusBadge = !configured ? (
    <Badge variant="secondary" className="bg-muted text-muted-foreground">Unconfigured</Badge>
  ) : config?.disabled ? (
    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">Disabled</Badge>
  ) : (
    <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-500">Active</Badge>
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
                  <h1 className="text-2xl font-bold text-foreground">DHCPv6 Relay</h1>
                  {statusBadge}
                  {!hasWritePermission && (
                    <Badge variant="secondary">Read Only</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Forward DHCPv6 requests from clients to a centralized DHCPv6 server
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
                  {config?.disabled ? "Enable Service" : "Disable Service"}
                </Button>
              )}
              {hasWritePermission && (
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {configured ? "Edit Configuration" : "Configure"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Disabled warning banner */}
          {configured && config?.disabled && (
            <div className="mb-4 flex items-center gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">
                DHCPv6 relay is disabled. Client requests will not be forwarded.
              </span>
              {hasWritePermission && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto border-amber-500/30 hover:bg-amber-500/10"
                  onClick={handleToggleDisable}
                  disabled={disableLoading}
                >
                  Re-enable
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
                <h3 className="text-base font-semibold mb-1">DHCPv6 Relay is not configured</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                  Configure the DHCPv6 relay agent to forward client requests to a centralized
                  DHCPv6 server. Define listen interfaces (client-facing) and upstream interfaces
                  (server-facing) with their server addresses.
                </p>
                {hasWritePermission && (
                  <Button onClick={() => setModalOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Configure DHCPv6 Relay
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
                  label="Service Status"
                  value={config?.disabled ? "Disabled" : "Active"}
                />
                <StatCard
                  icon={<Settings2 className="h-4 w-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="Max Hop Count"
                  value={config?.max_hop_count != null ? String(config.max_hop_count) : "Default (10)"}
                />
                <StatCard
                  icon={<ArrowDownToLine className="h-4 w-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="Listen Interfaces"
                  value={String(config?.listen_interfaces.length ?? 0)}
                />
                <StatCard
                  icon={<ArrowUpFromLine className="h-4 w-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="Upstream Interfaces"
                  value={String(config?.upstream_interfaces.length ?? 0)}
                />
              </div>

              {/* Config detail grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column — Global Options */}
                <div className="space-y-4">
                  <DetailCard
                    title="Global Options"
                    icon={<Settings2 className="h-4 w-4 text-muted-foreground" />}
                  >
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Max Hop Count</dt>
                        <dd className="font-mono font-medium">
                          {config?.max_hop_count != null ? config.max_hop_count : "10 (default)"}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-muted-foreground">Interface-ID Option</dt>
                        <dd>
                          {config?.use_interface_id_option ? (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-500 text-xs">
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Disabled</Badge>
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
                      title="Listen Interfaces"
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
                              <span className="text-xs text-muted-foreground">all addresses</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </DetailCard>
                  )}

                  {config && config.upstream_interfaces.length > 0 && (
                    <DetailCard
                      title="Upstream Interfaces"
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
                              <p className="text-xs text-muted-foreground pl-2">No server addresses</p>
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
