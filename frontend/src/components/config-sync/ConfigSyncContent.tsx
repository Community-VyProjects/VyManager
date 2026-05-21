"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Pencil, RefreshCwOff, Key, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { configSyncService, ConfigSyncConfig, ConfigSyncSections } from "@/lib/api/config-sync";
import { ConfigSyncModal } from "./ConfigSyncModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

function hasSections(sections?: ConfigSyncSections): boolean {
  if (!sections) return false;
  return Object.values(sections).some(Boolean);
}

const SIMPLE_SECTION_LABELS: Record<string, string> = {
  firewall: "Firewall", nat: "NAT", nat66: "NAT66", pki: "PKI",
  policy: "Policy", vpn: "VPN", vrf: "VRF",
};

const SUB_SECTION_LABELS: Record<string, string> = {
  interfaces_bonding: "Bonding", interfaces_bridge: "Bridge", interfaces_dummy: "Dummy",
  interfaces_ethernet: "Ethernet", interfaces_geneve: "GENEVE", interfaces_input: "Input",
  interfaces_l2tpv3: "L2TPv3", interfaces_loopback: "Loopback", interfaces_macsec: "MACsec",
  interfaces_openvpn: "OpenVPN", interfaces_pppoe: "PPPoE", interfaces_pseudo_ethernet: "Pseudo-Ethernet",
  interfaces_sstpc: "SSTPC", interfaces_tunnel: "Tunnel", interfaces_virtual_ethernet: "Virtual Ethernet",
  interfaces_vti: "VTI", interfaces_vxlan: "VXLAN", interfaces_wireguard: "WireGuard",
  interfaces_wireless: "Wireless", interfaces_wwan: "WWAN",
  protocols_babel: "Babel", protocols_bfd: "BFD", protocols_bgp: "BGP", protocols_failover: "Failover",
  protocols_igmp_proxy: "IGMP Proxy", protocols_isis: "IS-IS", protocols_mpls: "MPLS",
  protocols_nhrp: "NHRP", protocols_ospf: "OSPF", protocols_ospfv3: "OSPFv3", protocols_pim: "PIM",
  protocols_pim6: "PIMv6", protocols_rip: "RIP", protocols_ripng: "RIPng", protocols_rpki: "RPKI",
  protocols_segment_routing: "Segment Routing", protocols_static: "Static Routes",
  qos_interface: "Interface", qos_policy: "Policy",
  service_console_server: "Console Server", service_dhcp_relay: "DHCP Relay",
  service_dhcp_server: "DHCP Server", service_dhcpv6_relay: "DHCPv6 Relay",
  service_dhcpv6_server: "DHCPv6 Server", service_dns: "DNS", service_lldp: "LLDP",
  service_mdns: "mDNS", service_monitoring: "Monitoring", service_ndp_proxy: "NDP Proxy",
  service_ntp: "NTP", service_snmp: "SNMP", service_tftp_server: "TFTP Server",
  service_webproxy: "Web Proxy",
  system_conntrack: "Conntrack", system_flow_accounting: "Flow Accounting", system_login: "Login",
  system_option: "Options", system_sflow: "sFlow", system_static_host_mapping: "Static Host Mapping",
  system_sysctl: "Sysctl", system_time_zone: "Time Zone",
};

interface SectionGroup {
  parent: string;
  label: string;
  parentKey: keyof ConfigSyncSections;
  subKeys: (keyof ConfigSyncSections)[];
}

const SECTION_GROUPS: SectionGroup[] = [
  { parent: "interfaces", label: "Interfaces", parentKey: "interfaces", subKeys: ["interfaces_bonding","interfaces_bridge","interfaces_dummy","interfaces_ethernet","interfaces_geneve","interfaces_input","interfaces_l2tpv3","interfaces_loopback","interfaces_macsec","interfaces_openvpn","interfaces_pppoe","interfaces_pseudo_ethernet","interfaces_sstpc","interfaces_tunnel","interfaces_virtual_ethernet","interfaces_vti","interfaces_vxlan","interfaces_wireguard","interfaces_wireless","interfaces_wwan"] },
  { parent: "protocols", label: "Protocols", parentKey: "protocols", subKeys: ["protocols_babel","protocols_bfd","protocols_bgp","protocols_failover","protocols_igmp_proxy","protocols_isis","protocols_mpls","protocols_nhrp","protocols_ospf","protocols_ospfv3","protocols_pim","protocols_pim6","protocols_rip","protocols_ripng","protocols_rpki","protocols_segment_routing","protocols_static"] },
  { parent: "qos", label: "QoS", parentKey: "qos", subKeys: ["qos_interface","qos_policy"] },
  { parent: "service", label: "Service", parentKey: "service", subKeys: ["service_console_server","service_dhcp_relay","service_dhcp_server","service_dhcpv6_relay","service_dhcpv6_server","service_dns","service_lldp","service_mdns","service_monitoring","service_ndp_proxy","service_ntp","service_snmp","service_tftp_server","service_webproxy"] },
  { parent: "system", label: "System", parentKey: "system", subKeys: ["system_conntrack","system_flow_accounting","system_login","system_option","system_sflow","system_static_host_mapping","system_sysctl","system_time_zone"] },
];

export function ConfigSyncContent() {
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
      setError(err instanceof Error ? err.message : "Failed to load config-sync configuration");
    } finally {
      setLoading(false);
    }
  }, []);

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
          Retry
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
                  <h1 className="text-2xl font-bold text-foreground">Config Sync</h1>
                  {!hasWritePermission && (
                    <Badge variant="secondary">Read Only</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Primary/secondary configuration synchronization
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {hasWritePermission && (
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {isConfigured ? "Edit Configuration" : "Configure"}
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
                <p className="text-sm text-muted-foreground mb-4">Config Sync is not configured</p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    Configure
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Connection Card */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm font-semibold">Connection</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">Mode</span>
                      {config?.mode ? (
                        <Badge variant="secondary" className="uppercase font-mono text-xs">
                          {config.mode}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">Address</span>
                      {config?.secondary?.address ? (
                        <span className="font-mono">{config.secondary.address}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">Port</span>
                      <span className="font-mono">{config?.secondary?.port ?? 443}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">Timeout</span>
                      <span className="font-mono">{config?.secondary?.timeout ?? 60}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">API Key</span>
                      {config?.secondary?.key ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Key Configured
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Key className="h-3.5 w-3.5" />
                          Not Set
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sections Card */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm font-semibold">Sync Sections</p>
                  <div className="space-y-2">
                    {/* Simple sections */}
                    {sections && (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(SIMPLE_SECTION_LABELS).map(([key, label]) =>
                          (sections as unknown as Record<string, boolean>)[key] ? (
                            <Badge key={key} variant="secondary" className="text-xs">{label}</Badge>
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
                          <span className="text-xs text-muted-foreground mr-1">{group.label}:</span>
                          {parentOn && activeSubs.length === 0 && (
                            <Badge variant="secondary" className="text-xs">All</Badge>
                          )}
                          {activeSubs.map((k) => (
                            <Badge key={k} variant="secondary" className="text-xs">
                              {SUB_SECTION_LABELS[k] ?? k}
                            </Badge>
                          ))}
                        </div>
                      );
                    })}

                    {sections && !hasSections(sections) && (
                      <p className="text-xs text-muted-foreground">No sections selected</p>
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
