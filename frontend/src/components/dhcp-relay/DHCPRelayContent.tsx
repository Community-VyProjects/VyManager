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
  Server,
  ArrowDownToLine,
  ArrowUpFromLine,
  Radio,
  Settings2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { dhcpRelayService, DHCPRelayConfig } from "@/lib/api/dhcp-relay";
import { DHCPRelayModal } from "./DHCPRelayModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

function isConfigured(config: DHCPRelayConfig): boolean {
  return (
    config.servers.length > 0 ||
    config.interfaces.length > 0 ||
    config.listen_interfaces.length > 0 ||
    config.upstream_interfaces.length > 0
  );
}

export function DHCPRelayContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.DHCP_RELAY);

  const [config, setConfig] = useState<DHCPRelayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await dhcpRelayService.getConfig(refresh);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DHCP relay configuration");
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
    const result = await dhcpRelayService.setDisabled(!config.disabled);
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
                  <h1 className="text-2xl font-bold text-foreground">DHCP Relay</h1>
                  {statusBadge}
                  {!hasWritePermission && (
                    <Badge variant="secondary">Read Only</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Forward DHCP requests from clients to a centralized DHCP server
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
                DHCP relay is disabled. Client requests will not be forwarded.
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
            /* Empty state */
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full p-4 bg-muted mb-4">
                  <Network className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-base font-semibold mb-1">DHCP Relay is not configured</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                  Configure the DHCP relay agent to forward client broadcast requests to a
                  centralized DHCP server on a different subnet.
                </p>
                {hasWritePermission && (
                  <Button onClick={() => setModalOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Configure DHCP Relay
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  icon={config?.disabled
                    ? <Ban className="h-4 w-4 text-amber-500" />
                    : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  iconBg={config?.disabled ? "bg-amber-500/10" : "bg-green-500/10"}
                  label="Service Status"
                  value={config?.disabled ? "Disabled" : "Active"}
                />
                <StatCard
                  icon={<Server className="h-4 w-4 text-primary" />}
                  iconBg="bg-primary/10"
                  label="DHCP Servers"
                  value={String(config?.servers.length ?? 0)}
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
                {/* Left column */}
                <div className="space-y-4">
                  {/* DHCP Servers */}
                  <DetailCard
                    title="DHCP Servers"
                    icon={<Server className="h-4 w-4 text-muted-foreground" />}
                  >
                    {config && config.servers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {config.servers.map((s) => (
                          <Badge key={s} variant="secondary" className="font-mono">{s}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No servers configured</p>
                    )}
                  </DetailCard>

                  {/* Relay Options */}
                  <DetailCard
                    title="Relay Options"
                    icon={<Settings2 className="h-4 w-4 text-muted-foreground" />}
                  >
                    {config && (
                      config.relay_options.hop_count != null ||
                      config.relay_options.max_size != null ||
                      config.relay_options.relay_agents_packets != null
                    ) ? (
                      <dl className="space-y-2 text-sm">
                        {config.relay_options.hop_count != null && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Hop Count</dt>
                            <dd className="font-mono font-medium">{config.relay_options.hop_count}</dd>
                          </div>
                        )}
                        {config.relay_options.max_size != null && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Max Packet Size</dt>
                            <dd className="font-mono font-medium">{config.relay_options.max_size} bytes</dd>
                          </div>
                        )}
                        {config.relay_options.relay_agents_packets != null && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Relay Agents Policy</dt>
                            <dd className="font-mono font-medium capitalize">{config.relay_options.relay_agents_packets}</dd>
                          </div>
                        )}
                      </dl>
                    ) : (
                      <p className="text-sm text-muted-foreground">Using VyOS defaults</p>
                    )}
                  </DetailCard>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  {config && config.listen_interfaces.length > 0 && (
                    <DetailCard
                      title="Listen Interfaces"
                      icon={<ArrowDownToLine className="h-4 w-4 text-muted-foreground" />}
                    >
                      <div className="flex flex-wrap gap-2">
                        {config.listen_interfaces.map((i) => (
                          <Badge key={i} variant="secondary" className="font-mono">{i}</Badge>
                        ))}
                      </div>
                    </DetailCard>
                  )}

                  {config && config.upstream_interfaces.length > 0 && (
                    <DetailCard
                      title="Upstream Interfaces"
                      icon={<ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />}
                    >
                      <div className="flex flex-wrap gap-2">
                        {config.upstream_interfaces.map((i) => (
                          <Badge key={i} variant="secondary" className="font-mono">{i}</Badge>
                        ))}
                      </div>
                    </DetailCard>
                  )}

                  {config && config.interfaces.length > 0 && (
                    <DetailCard
                      title="Broadcast Interfaces"
                      icon={<Radio className="h-4 w-4 text-muted-foreground" />}
                    >
                      <div className="flex flex-wrap gap-2">
                        {config.interfaces.map((i) => (
                          <Badge key={i} variant="secondary" className="font-mono">{i}</Badge>
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

      <DHCPRelayModal
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
