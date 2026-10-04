"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Pencil, RefreshCwOff, Key, CheckCircle2 } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { configSyncService, ConfigSyncConfig, ConfigSyncSections } from "@/lib/api/config-sync";
import { ConfigSyncModal } from "./ConfigSyncModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

function hasSections(sections?: ConfigSyncSections): boolean {
  if (!sections) return false;
  return Object.values(sections).some(Boolean);
}

const SIMPLE_SECTION_KEYS = ["firewall", "nat", "nat66", "pki", "policy", "vpn", "vrf"] as const;

interface SectionGroup {
  parent: string;
  parentKey: keyof ConfigSyncSections;
  subKeys: (keyof ConfigSyncSections)[];
}

const SECTION_GROUPS: SectionGroup[] = [
  { parent: "interfaces", parentKey: "interfaces", subKeys: ["interfaces_bonding","interfaces_bridge","interfaces_dummy","interfaces_ethernet","interfaces_geneve","interfaces_input","interfaces_l2tpv3","interfaces_loopback","interfaces_macsec","interfaces_openvpn","interfaces_pppoe","interfaces_pseudo_ethernet","interfaces_sstpc","interfaces_tunnel","interfaces_virtual_ethernet","interfaces_vti","interfaces_vxlan","interfaces_wireguard","interfaces_wireless","interfaces_wwan"] },
  { parent: "protocols", parentKey: "protocols", subKeys: ["protocols_babel","protocols_bfd","protocols_bgp","protocols_failover","protocols_igmp_proxy","protocols_isis","protocols_mpls","protocols_nhrp","protocols_ospf","protocols_ospfv3","protocols_pim","protocols_pim6","protocols_rip","protocols_ripng","protocols_rpki","protocols_segment_routing","protocols_static"] },
  { parent: "qos", parentKey: "qos", subKeys: ["qos_interface","qos_policy"] },
  { parent: "service", parentKey: "service", subKeys: ["service_console_server","service_dhcp_relay","service_dhcp_server","service_dhcpv6_relay","service_dhcpv6_server","service_dns","service_lldp","service_mdns","service_monitoring","service_ndp_proxy","service_ntp","service_snmp","service_tftp_server","service_webproxy"] },
  { parent: "system", parentKey: "system", subKeys: ["system_conntrack","system_flow_accounting","system_option","system_sflow","system_static_host_mapping","system_sysctl","system_time_zone"] },
];

export function ConfigSyncContent() {
  const t = useTranslations("configSync");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.CONFIG_SYNC);

  const [config, setConfig] = useState<ConfigSyncConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await configSyncService.getConfig(refresh);
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

  const handleSave = async (updated: ConfigSyncConfig) => {
    await configSyncService.saveConfig(config, updated);
    await loadData(true);
  };

  const isConfigured = !!(config?.mode || config?.secondary?.address || hasSections(config?.sections));

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

  const sections = config?.sections;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{t("content.title")}</h1>
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
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {tc("refresh")}
              </Button>
              {hasWritePermission && (
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {isConfigured ? t("content.editConfiguration") : t("content.configure")}
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-auto">
          {!isConfigured ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <RefreshCwOff className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">{t("content.notConfigured")}</p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    {t("content.configure")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Connection Card */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm font-semibold">{t("content.connection")}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">{t("content.mode")}</span>
                      {config?.mode ? (
                        <Badge variant="secondary" className="uppercase font-mono text-xs">
                          {config.mode}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">{t("content.address")}</span>
                      {config?.secondary?.address ? (
                        <span className="font-mono">{config.secondary.address}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">{t("content.port")}</span>
                      <span className="font-mono">{config?.secondary?.port ?? 443}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">{t("content.timeout")}</span>
                      <span className="font-mono">{config?.secondary?.timeout ?? 60}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">{t("content.apiKey")}</span>
                      {config?.secondary?.key ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t("content.keyConfigured")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Key className="h-3.5 w-3.5" />
                          {t("content.notSetKey")}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sections Card */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm font-semibold">{t("content.syncSections")}</p>
                  <div className="space-y-2">
                    {/* Simple sections */}
                    {sections && (
                      <div className="flex flex-wrap gap-1">
                        {SIMPLE_SECTION_KEYS.map((key) =>
                          (sections as unknown as Record<string, boolean>)[key] ? (
                            <Badge key={key} variant="secondary" className="text-xs">{t(`sections.${key}`)}</Badge>
                          ) : null
                        )}
                      </div>
                    )}

                    {/* Grouped sections */}
                    {sections && SECTION_GROUPS.map((group) => {
                      const parentOn = (sections as unknown as Record<string, boolean>)[group.parentKey];
                      const activeSubs = group.subKeys.filter(
                        (k) => (sections as unknown as Record<string, boolean>)[k]
                      );
                      if (!parentOn && activeSubs.length === 0) return null;
                      return (
                        <div key={group.parent} className="flex flex-wrap gap-1 items-center">
                          <span className="text-xs text-muted-foreground mr-1">{t(`sections.${group.parentKey}`)}:</span>
                          {parentOn && activeSubs.length === 0 && (
                            <Badge variant="secondary" className="text-xs">{t("content.all")}</Badge>
                          )}
                          {activeSubs.map((k) => (
                            <Badge key={k} variant="secondary" className="text-xs">
                              {t(`sections.${k}`)}
                            </Badge>
                          ))}
                        </div>
                      );
                    })}

                    {sections && !hasSections(sections) && (
                      <p className="text-xs text-muted-foreground">{t("content.noSections")}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <ConfigSyncModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        config={isConfigured ? config : null}
        onSuccess={() => {}}
        onSubmit={handleSave}
      />
    </>
  );
}
