"use client";

export const dynamic = 'force-dynamic';

import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, RefreshCw, AlertCircle, Server, Network, Clock, Pencil, Trash2, MapPin, Activity, Wifi, Monitor, Globe, Settings2, Loader2, Power, PowerOff } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  dhcpService,
  type DHCPConfigResponse,
  type DHCPSubnet,
  type DHCPCapabilitiesResponse,
  type DHCPLease,
  type DHCPStaticMapping,
  type DHCPRange,
} from "@/lib/api/dhcp";
import { cn } from "@/lib/utils";
import { ClickableSubnet } from "@/components/ui/clickable-items";
import { CreateDHCPServerModal } from "@/components/services/CreateDHCPServerModal";
import { EditDHCPServerModal } from "@/components/services/EditDHCPServerModal";
import { DeleteDHCPModal } from "@/components/services/DeleteDHCPModal";
import { DeleteStaticMappingModal } from "@/components/services/DeleteStaticMappingModal";
import { AddLeaseToStaticMappingModal } from "@/components/services/AddLeaseToStaticMappingModal";
import { RangeModal } from "@/components/services/RangeModal";
import { StaticMappingModal } from "@/components/services/StaticMappingModal";
import { DHCPServerSettingsModal } from "@/components/services/DHCPServerSettingsModal";
import { DHCPFailoverModal } from "@/components/services/DHCPFailoverModal";
import { DHCPDdnsModal } from "@/components/services/DHCPDdnsModal";
import { ChevronRight } from "lucide-react";

function formatLease(
  seconds: string,
  format: (unit: "days" | "hours" | "minutes", count: number) => string,
): string {
  const secs = parseInt(seconds);
  const hours = Math.floor(secs / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) return format("days", days);
  if (hours > 0) return format("hours", hours);
  return format("minutes", Math.floor(secs / 60));
}

// Helper function to check if an IP address is within a CIDR subnet
function isIpInSubnet(ip: string, cidr: string): boolean {
  const [subnetIp, maskBits] = cidr.split("/");
  const mask = parseInt(maskBits);

  const ipParts = ip.split(".").map(Number);
  const subnetParts = subnetIp.split(".").map(Number);

  // Convert to 32-bit integers
  const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const subnetInt = (subnetParts[0] << 24) | (subnetParts[1] << 16) | (subnetParts[2] << 8) | subnetParts[3];

  // Create mask
  const maskInt = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;

  // Check if IP is in subnet
  return ((ipInt >>> 0) & maskInt) === ((subnetInt >>> 0) & maskInt);
}

function DHCPPageInner() {
  const t = useTranslations("dhcpServer");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<DHCPConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<DHCPCapabilitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected network state
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("subnets");

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [rangeSubnetFilter, setRangeSubnetFilter] = useState<string>("all");
  const [staticSubnetFilter, setStaticSubnetFilter] = useState<string>("all");
  const [leaseStateFilter, setLeaseStateFilter] = useState<string>("all");
  const [leaseSubnetFilter, setLeaseSubnetFilter] = useState<string>("all");

  // Lease states
  const [leases, setLeases] = useState<DHCPLease[]>([]);
  const [leasesLoading, setLeasesLoading] = useState(false);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [failoverModalOpen, setFailoverModalOpen] = useState(false);
  const [ddnsModalOpen, setDdnsModalOpen] = useState(false);
  const [addingSubnetToNetwork, setAddingSubnetToNetwork] = useState<string | null>(null);
  const [editingSubnet, setEditingSubnet] = useState<{
    network: string;
    subnet: DHCPSubnet;
  } | null>(null);
  const [deletingSubnet, setDeletingSubnet] = useState<{
    network: string;
    subnet: DHCPSubnet;
  } | null>(null);
  const [deletingNetwork, setDeletingNetwork] = useState<string | null>(null);

  // Static mapping modal states
  const [editingStaticMapping, setEditingStaticMapping] = useState<{
    network: string;
    subnet: string;
    mapping: DHCPStaticMapping;
  } | null>(null);
  const [deletingStaticMapping, setDeletingStaticMapping] = useState<{
    network: string;
    subnet: string;
    mapping: DHCPStaticMapping;
  } | null>(null);

  // Lease to static mapping modal state
  const [addingLeaseToStatic, setAddingLeaseToStatic] = useState<DHCPLease | null>(null);

  // Clear (release) lease confirmation state
  const [clearLeaseTarget, setClearLeaseTarget] = useState<DHCPLease | null>(null);
  const [clearLeaseLoading, setClearLeaseLoading] = useState(false);
  const [clearLeaseError, setClearLeaseError] = useState<string | null>(null);

  // Range modal state
  const [addingRange, setAddingRange] = useState(false);
  const [editingRange, setEditingRange] = useState<{
    subnet: string;
    range: DHCPRange;
  } | null>(null);

  // Static mapping modal state
  const [addingStaticMapping, setAddingStaticMapping] = useState(false);

  // Disable/enable confirmation modal state
  type DisableConfirm =
    | { kind: "network"; networkName: string; currentlyDisabled: boolean }
    | { kind: "global"; currentlyDisabled: boolean };
  const [disableConfirm, setDisableConfirm] = useState<DisableConfirm | null>(null);
  const [disableConfirmLoading, setDisableConfirmLoading] = useState(false);
  const [disableConfirmError, setDisableConfirmError] = useState<string | null>(null);

  const requestToggleNetworkDisable = (networkName: string, currentlyDisabled: boolean) => {
    if (!currentlyDisabled) {
      // Guard before even showing the modal
      const enabledCount = config?.shared_networks.filter(n => !n.disable).length ?? 0;
      if (enabledCount <= 1) {
        setDisableConfirm({ kind: "network", networkName, currentlyDisabled });
        setDisableConfirmError(t("page.errors.lastNetwork"));
        return;
      }
    }
    setDisableConfirmError(null);
    setDisableConfirm({ kind: "network", networkName, currentlyDisabled });
  };

  const requestToggleGlobalDisable = () => {
    const globallyDisabled = config?.global_config.disable ?? false;
    setDisableConfirmError(null);
    setDisableConfirm({ kind: "global", currentlyDisabled: globallyDisabled });
  };

  const handleConfirmDisableToggle = async () => {
    if (!disableConfirm) return;
    setDisableConfirmLoading(true);
    setDisableConfirmError(null);
    try {
      if (disableConfirm.kind === "network") {
        if (disableConfirm.currentlyDisabled) {
          await dhcpService.deleteSharedNetworkDisable(disableConfirm.networkName);
        } else {
          await dhcpService.setSharedNetworkDisable(disableConfirm.networkName);
        }
      } else {
        if (disableConfirm.currentlyDisabled) {
          await dhcpService.deleteGlobalDisable();
        } else {
          await dhcpService.setGlobalDisable();
        }
      }
      setDisableConfirm(null);
      fetchConfig(true);
    } catch (err) {
      setDisableConfirmError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setDisableConfirmLoading(false);
    }
  };

  const handleConfirmClearLease = async () => {
    if (!clearLeaseTarget) return;
    setClearLeaseLoading(true);
    setClearLeaseError(null);
    try {
      await dhcpService.clearLease(clearLeaseTarget.ip_address);
      setClearLeaseTarget(null);
      fetchLeases();
    } catch (err) {
      setClearLeaseError(err instanceof Error ? err.message : t("page.errors.clearLeaseFailed"));
    } finally {
      setClearLeaseLoading(false);
    }
  };


  const fetchLeases = async () => {
    try {
      setLeasesLoading(true);
      const leasesData = await dhcpService.getLeases();
      setLeases(leasesData.leases);
    } catch (err) {
      console.error("Error fetching leases:", err);
      setLeases([]);
    } finally {
      setLeasesLoading(false);
    }
  };

  const handleDeleteRange = async (subnet: string, rangeId: string) => {
    if (!currentNetwork) return;
    try {
      await dhcpService.deleteRange(currentNetwork.name, subnet, rangeId);
      fetchConfig(true);
    } catch (err) {
      console.error("Error deleting range:", err);
    }
  };

  const fetchConfig = useCallback(async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        dhcpService.getConfig(refresh),
        dhcpService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);

      // Auto-select first network if none selected
      if (configData.shared_networks.length > 0) {
        setSelectedNetwork((prev) => prev ?? configData.shared_networks[0].name);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("page.errors.loadFailed")
      );
      console.error("Error fetching DHCP config:", err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchConfig();
    fetchLeases();
  }, [fetchConfig]);

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "subnets" || section === "ranges" || section === "static" || section === "leases") {
      setActiveTab(section);
    }
  }, [searchParams]);

  // Get currently selected network data
  const currentNetwork = config?.shared_networks.find(n => n.name === selectedNetwork) || null;

  // Get lease count for a subnet by checking if lease IP falls within subnet CIDR
  const getSubnetLeaseCount = (subnet: string): number => {
    return leases.filter((l) => l.state === "active" && isIpInSubnet(l.ip_address, subnet)).length;
  };

  // Get total active leases for a network

  // Get all static mappings for current network
  const getAllStaticMappings = (): Array<DHCPStaticMapping & { subnet: string }> => {
    if (!currentNetwork) return [];
    const mappings: Array<DHCPStaticMapping & { subnet: string }> = [];
    currentNetwork.subnets.forEach(subnet => {
      subnet.static_mappings.forEach(mapping => {
        mappings.push({ ...mapping, subnet: subnet.subnet });
      });
    });
    return mappings;
  };

  // Get all ranges for current network
  const getAllRanges = (): Array<DHCPRange & { subnet: string }> => {
    if (!currentNetwork) return [];
    const ranges: Array<DHCPRange & { subnet: string }> = [];
    currentNetwork.subnets.forEach(subnet => {
      subnet.ranges.forEach(range => {
        ranges.push({ ...range, subnet: subnet.subnet });
      });
    });
    return ranges;
  };

  // Check if a MAC address has a static mapping in the current network
  const hasStaticMapping = (macAddress: string): boolean => {
    if (!currentNetwork) return false;
    const normalizedMac = macAddress.toLowerCase();
    return currentNetwork.subnets.some(subnet =>
      subnet.static_mappings.some(mapping =>
        mapping.mac_address?.toLowerCase() === normalizedMac
      )
    );
  };

  // Filter subnets based on search
  const filteredSubnets = currentNetwork?.subnets.filter(subnet =>
    subnet.subnet.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subnet.default_router?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subnet.domain_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Filter ranges based on subnet filter
  const filteredRanges = getAllRanges().filter(range =>
    rangeSubnetFilter === "all" || range.subnet === rangeSubnetFilter
  );

  // Filter static mappings based on search and subnet filter
  const filteredStaticMappings = getAllStaticMappings().filter(mapping => {
    const matchesSubnet = staticSubnetFilter === "all" || mapping.subnet === staticSubnetFilter;
    const matchesSearch = searchQuery === "" ||
      mapping.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mapping.ip_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mapping.mac_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mapping.duid?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubnet && matchesSearch;
  });

  // Filter leases for current network
  // VyOS pool field can be either the shared network name OR the subnet CIDR
  const networkLeases = leases.filter(lease =>
    currentNetwork?.name === lease.pool ||
    currentNetwork?.subnets.some(s => s.subnet === lease.pool)
  );

  const filteredLeases = networkLeases.filter(lease => {
    const matchesState = leaseStateFilter === "all" || lease.state === leaseStateFilter;
    const matchesSubnet = leaseSubnetFilter === "all" || lease.pool === leaseSubnetFilter;
    const matchesSearch = searchQuery === "" ||
      lease.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lease.mac_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lease.hostname?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesState && matchesSubnet && matchesSearch;
  });

  const totalSubnets = config?.total_subnets || 0;
  const totalStatic = config?.total_static_mappings || 0;
  const totalNetworks = config?.shared_networks.length || 0;
  const totalActiveLeases = leases.filter((l) => l.state === "active").length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">{t("page.loading")}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">{t("page.errorTitle")}</h2>
            <p className="text-muted-foreground max-w-md">{error}</p>
            <Button onClick={() => fetchConfig(true)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {tc("retry")}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r border-border bg-card/50 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">{t("page.sidebarTitle")}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  fetchConfig(true);
                  fetchLeases();
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="w-full"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("page.newServer")}
            </Button>
            <Button
              className="w-full mt-2"
              size="sm"
              variant="outline"
              onClick={() => setSettingsModalOpen(true)}
              disabled={!config}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {t("page.serverSettings")}
            </Button>
            <Button
              className="w-full mt-2"
              size="sm"
              variant="outline"
              onClick={() => setFailoverModalOpen(true)}
              disabled={!config}
            >
              {t("page.highAvailability")}
            </Button>
            {(capabilities?.fields.dynamic_dns_update_leaf?.supported ||
              capabilities?.fields.dynamic_dns_update_kea?.supported) && (
              <Button
                className="w-full mt-2"
                size="sm"
                variant="outline"
                onClick={() => setDdnsModalOpen(true)}
                disabled={!config}
              >
                {t("page.dynamicDns")}
              </Button>
            )}
          </div>

          {/* Network List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {config?.shared_networks.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <Server className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t("page.noServersShort")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("page.noServersHint")}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {config?.shared_networks.map((network) => {
                    const isSelected = selectedNetwork === network.name;
                    const isDisabled = network.disable ?? false;

                    return (
                      <div
                        key={network.name}
                        className={cn(
                          "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer",
                          isSelected
                            ? "bg-accent text-accent-foreground shadow-sm"
                            : "hover:bg-accent/50 text-foreground",
                          isDisabled && "opacity-60"
                        )}
                        onClick={() => setSelectedNetwork(network.name)}
                      >
                        <div className="p-1.5 rounded-md bg-blue-500/10 flex-shrink-0">
                          <Server className={cn("h-4 w-4", isDisabled ? "text-muted-foreground" : "text-blue-500")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("font-medium truncate", isDisabled && "text-muted-foreground")}>{network.name}</div>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestToggleNetworkDisable(network.name, isDisabled);
                          }}
                          title={isDisabled ? t("page.enableNetwork") : t("page.disableNetwork")}
                        >
                          {isDisabled
                              ? <Power className="h-4 w-4 text-green-500" />
                              : <PowerOff className="h-4 w-4 text-muted-foreground" />
                          }
                        </button>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingNetwork(network.name);
                          }}
                          title={t("page.deleteNetwork")}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Sidebar Stats */}
          <div className="p-4 border-t border-border bg-card/30">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">{t("page.stats.networks")}</span>
                <span className="font-medium">{totalNetworks}</span>
              </div>
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">{t("page.stats.subnets")}</span>
                <span className="font-medium">{totalSubnets}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span className="text-muted-foreground">{t("page.stats.leases")}</span>
                <span className="font-medium">{totalActiveLeases}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-purple-500" />
                <span className="text-muted-foreground">{t("page.stats.static")}</span>
                <span className="font-medium">{totalStatic}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentNetwork ? (
            <>
              {/* Global disable warning banner */}
              {config?.global_config.disable && (
                <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{t("page.globallyDisabled")}</span>
                </div>
              )}

              {/* Network Header */}
              <div className="border-b border-border bg-card/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <span>DHCP</span>
                      <ChevronRight className="h-4 w-4" />
                      <span className="text-foreground font-medium">{currentNetwork.name}</span>
                      {currentNetwork.authoritative && (
                        <Badge variant="outline" className="ml-2 bg-blue-500/5 border-blue-500/20 text-blue-500">
                          {t("page.authoritative")}
                        </Badge>
                      )}
                      {currentNetwork.disable && (
                        <Badge variant="outline" className="ml-2 bg-red-500/10 text-red-500 border-red-500/20">
                          {tc("disabled")}
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{currentNetwork.name}</h2>
                    {currentNetwork.domain_name && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                        {currentNetwork.domain_name}
                      </div>
                    )}
                    {currentNetwork.description && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                        {currentNetwork.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={requestToggleGlobalDisable}
                      className={cn(
                        config?.global_config.disable
                          ? "border-green-500/50 text-green-600 hover:bg-green-500/10"
                          : "border-muted text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {config?.global_config.disable
                        ? <><Power className="h-4 w-4 mr-1.5" />{t("page.enableDhcp")}</>
                        : <><PowerOff className="h-4 w-4 mr-1.5" />{t("page.disableDhcp")}</>
                      }
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b border-border px-6">
                  <TabsList className="bg-transparent h-12">
                    <TabsTrigger value="subnets" className="data-[state=active]:bg-accent">
                      <Network className="h-4 w-4 mr-2" />
                      {t("page.tabs.subnets")}
                      <Badge variant="secondary" className="ml-2">
                        {currentNetwork.subnets.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="ranges" className="data-[state=active]:bg-accent">
                      <Settings2 className="h-4 w-4 mr-2" />
                      {t("page.tabs.ranges")}
                      <Badge variant="secondary" className="ml-2">
                        {getAllRanges().length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="static" className="data-[state=active]:bg-accent">
                      <MapPin className="h-4 w-4 mr-2" />
                      {t("page.tabs.static")}
                      <Badge variant="secondary" className="ml-2">
                        {getAllStaticMappings().length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="leases" className="data-[state=active]:bg-accent">
                      <Activity className="h-4 w-4 mr-2" />
                      {t("page.tabs.leases")}
                      {networkLeases.filter(l => l.state === "active").length > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-emerald-500/10 text-emerald-500">
                          {networkLeases.filter(l => l.state === "active").length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Subnets Tab */}
                <TabsContent value="subnets" className="flex-1 mt-0 overflow-hidden">
                  <div className="p-6 h-full flex flex-col">
                    {/* Search and Add Button */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t("page.searchSubnets")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setAddingSubnetToNetwork(currentNetwork.name)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("page.addSubnet")}
                      </Button>
                      <div className="text-sm text-muted-foreground ml-auto">
                        {t("page.subnetCount", { count: filteredSubnets.length })}
                      </div>
                    </div>

                    {/* Subnets Table */}
                    <Card className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                        {filteredSubnets.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Network className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              {t("page.noSubnets")}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              {searchQuery ? t("page.noSubnetsMatch") : t("page.noSubnetsHint")}
                            </p>
                            {!searchQuery && (
                              <Button onClick={() => setAddingSubnetToNetwork(currentNetwork.name)}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t("page.addSubnet")}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>{t("subnet")}</TableHead>
                                <TableHead>{t("page.columns.gateway")}</TableHead>
                                <TableHead>{t("page.columns.dnsServers")}</TableHead>
                                <TableHead>{t("page.columns.leaseTime")}</TableHead>
                                <TableHead>{t("page.tabs.ranges")}</TableHead>
                                <TableHead>{t("page.active")}</TableHead>
                                <TableHead>{t("page.columns.static")}</TableHead>
                                <TableHead>{tc("status")}</TableHead>
                                <TableHead className="text-right">{tc("actions")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredSubnets.map((subnet) => {
                                const activeCount = getSubnetLeaseCount(subnet.subnet);

                                return (
                                  <TableRow key={subnet.subnet} className="group">
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <Network className="h-4 w-4 text-muted-foreground" />
                                        <ClickableSubnet
                                          subnet={subnet.subnet}
                                          networkName={currentNetwork.name}
                                          data={{ network: currentNetwork, subnet }}
                                          variant="link"
                                          size="sm"
                                          showIcon={false}
                                        >
                                          {subnet.subnet}
                                        </ClickableSubnet>
                                        {capabilities?.has_subnet_id && subnet.subnet_id && (
                                          <Badge variant="outline" className="text-xs ml-1">
                                            ID: {subnet.subnet_id}
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {subnet.default_router || (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {subnet.name_servers.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {subnet.name_servers.slice(0, 2).map((ns) => (
                                            <Badge key={ns} variant="secondary" className="text-xs">
                                              {ns}
                                            </Badge>
                                          ))}
                                          {subnet.name_servers.length > 2 && (
                                            <Badge variant="secondary" className="text-xs">
                                              +{subnet.name_servers.length - 2}
                                            </Badge>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {subnet.lease ? formatLease(subnet.lease, (unit, count) => t(`page.leaseDuration.${unit}`, { count })) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{subnet.ranges.length}</Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          activeCount > 0 && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                        )}
                                      >
                                        {activeCount}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {subnet.static_mappings.length}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          subnet.disable
                                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                                            : "bg-green-500/10 text-green-500 border-green-500/20"
                                        )}
                                      >
                                        {subnet.disable ? tc("disabled") : t("page.active")}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => setEditingSubnet({
                                            network: currentNetwork.name,
                                            subnet,
                                          })}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 hover:bg-destructive/10"
                                          onClick={() => setDeletingSubnet({
                                            network: currentNetwork.name,
                                            subnet,
                                          })}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </ScrollArea>
                    </Card>
                  </div>
                </TabsContent>

                {/* Ranges Tab */}
                <TabsContent value="ranges" className="flex-1 mt-0 overflow-hidden">
                  <div className="p-6 h-full flex flex-col">
                    {/* Filters and Add Button */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{t("subnetLabel")}</span>
                        <Select value={rangeSubnetFilter} onValueChange={setRangeSubnetFilter}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder={t("page.allSubnets")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("page.allSubnets")}</SelectItem>
                            {currentNetwork.subnets.map((subnet) => (
                              <SelectItem key={subnet.subnet} value={subnet.subnet}>
                                {subnet.subnet}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setAddingRange(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("subnetForm.addRange")}
                      </Button>
                      <div className="text-sm text-muted-foreground ml-auto">
                        {t("page.rangeCount", { count: filteredRanges.length })}
                      </div>
                    </div>

                    {/* Ranges Table */}
                    <Card className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                        {filteredRanges.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              {t("page.noRanges")}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {t("page.noRangesHint")}
                            </p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>{t("subnet")}</TableHead>
                                <TableHead>{t("range.rangeId")}</TableHead>
                                <TableHead>{t("subnetForm.startIp")}</TableHead>
                                <TableHead>{t("subnetForm.stopIp")}</TableHead>
                                <TableHead>{t("page.columns.poolSize")}</TableHead>
                                <TableHead className="text-right">{tc("actions")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredRanges.map((range, idx) => {
                                // Calculate pool size
                                let poolSize = "—";
                                if (range.start && range.stop) {
                                  const startParts = range.start.split(".").map(Number);
                                  const stopParts = range.stop.split(".").map(Number);
                                  const startNum = (startParts[0] << 24) + (startParts[1] << 16) + (startParts[2] << 8) + startParts[3];
                                  const stopNum = (stopParts[0] << 24) + (stopParts[1] << 16) + (stopParts[2] << 8) + stopParts[3];
                                  poolSize = String((stopNum - startNum + 1) >>> 0);
                                }

                                return (
                                  <TableRow key={`${range.subnet}-${range.range_id}-${idx}`} className="group">
                                    <TableCell>
                                      <Badge variant="outline">{range.subnet}</Badge>
                                    </TableCell>
                                    <TableCell className="font-mono">{range.range_id}</TableCell>
                                    <TableCell className="font-mono">{range.start || "—"}</TableCell>
                                    <TableCell className="font-mono">{range.stop || "—"}</TableCell>
                                    <TableCell>
                                      <Badge variant="secondary">{t("page.poolSizeIps", { count: poolSize })}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => setEditingRange({
                                            subnet: range.subnet,
                                            range: {
                                              range_id: range.range_id,
                                              start: range.start,
                                              stop: range.stop,
                                            },
                                          })}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 hover:bg-destructive/10"
                                          onClick={() => handleDeleteRange(range.subnet, range.range_id)}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </ScrollArea>
                    </Card>

                    {/* Excluded Addresses Section */}
                    {currentNetwork.subnets.some(s => s.excludes.length > 0) && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-foreground mb-2">{t("subnetForm.excludedAddresses")}</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentNetwork.subnets.flatMap(subnet =>
                            subnet.excludes.map(ip => (
                              <Badge key={`${subnet.subnet}-${ip}`} variant="outline" className="font-mono">
                                {ip}
                                <span className="text-muted-foreground ml-1 text-xs">({subnet.subnet})</span>
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Static Mappings Tab */}
                <TabsContent value="static" className="flex-1 mt-0 overflow-hidden">
                  <div className="p-6 h-full flex flex-col">
                    {/* Search and Filters */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t("page.searchMappings")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{t("subnetLabel")}</span>
                        <Select value={staticSubnetFilter} onValueChange={setStaticSubnetFilter}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder={t("page.allSubnets")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("page.allSubnets")}</SelectItem>
                            {currentNetwork.subnets.map((subnet) => (
                              <SelectItem key={subnet.subnet} value={subnet.subnet}>
                                {subnet.subnet}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setAddingStaticMapping(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("mapping.addTitle")}
                      </Button>
                      <div className="text-sm text-muted-foreground ml-auto">
                        {t("page.mappingCount", { count: filteredStaticMappings.length })}
                      </div>
                    </div>

                    {/* Static Mappings Table */}
                    <Card className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                        {filteredStaticMappings.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              {t("page.noMappings")}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {searchQuery ? t("page.noMappingsMatch") : t("page.noMappingsHint")}
                            </p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>{tc("name")}</TableHead>
                                <TableHead>{t("mapping.macAddress")}</TableHead>
                                <TableHead>{t("mapping.ipAddress")}</TableHead>
                                <TableHead>{t("subnet")}</TableHead>
                                <TableHead>{tc("status")}</TableHead>
                                <TableHead className="text-right">{tc("actions")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredStaticMappings.map((mapping) => (
                                <TableRow key={`${mapping.subnet}-${mapping.name}`} className="group">
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <Monitor className="h-4 w-4 text-muted-foreground" />
                                      {mapping.name}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {mapping.mac_address || mapping.duid || <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell className="font-mono">
                                    {mapping.ip_address || <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{mapping.subnet}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        mapping.disable
                                          ? "bg-red-500/10 text-red-500 border-red-500/20"
                                          : "bg-green-500/10 text-green-500 border-green-500/20"
                                      )}
                                    >
                                      {mapping.disable ? tc("disabled") : tc("enabled")}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                          setEditingStaticMapping({
                                            network: currentNetwork.name,
                                            subnet: mapping.subnet,
                                            mapping: {
                                              name: mapping.name,
                                              ip_address: mapping.ip_address,
                                              mac_address: mapping.mac_address,
                                              disable: mapping.disable,
                                            },
                                          });
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-destructive/10"
                                        onClick={() => {
                                          setDeletingStaticMapping({
                                            network: currentNetwork.name,
                                            subnet: mapping.subnet,
                                            mapping: {
                                              name: mapping.name,
                                              ip_address: mapping.ip_address,
                                              mac_address: mapping.mac_address,
                                              disable: mapping.disable,
                                            },
                                          });
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </ScrollArea>
                    </Card>
                  </div>
                </TabsContent>

                {/* Leases Tab */}
                <TabsContent value="leases" className="flex-1 mt-0 overflow-hidden">
                  <div className="p-6 h-full flex flex-col">
                    {/* Search and Filters */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t("page.searchLeases")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{t("page.stateLabel")}</span>
                        <Select value={leaseStateFilter} onValueChange={setLeaseStateFilter}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder={t("page.all")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("page.all")}</SelectItem>
                            <SelectItem value="active">{t("page.active")}</SelectItem>
                            <SelectItem value="expired">{t("page.expired")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{t("subnetLabel")}</span>
                        <Select value={leaseSubnetFilter} onValueChange={setLeaseSubnetFilter}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder={t("page.allSubnets")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("page.allSubnets")}</SelectItem>
                            {currentNetwork.subnets.map((subnet) => (
                              <SelectItem key={subnet.subnet} value={subnet.subnet}>
                                {subnet.subnet}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchLeases}
                        disabled={leasesLoading}
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-2", leasesLoading && "animate-spin")} />
                        {tc("refresh")}
                      </Button>
                      <div className="text-sm text-muted-foreground ml-auto">
                        {t("page.leaseCount", { count: filteredLeases.length })}
                      </div>
                    </div>

                    {/* Leases Table */}
                    <Card className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                        {leasesLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t("page.loadingLeases")}
                            </div>
                          </div>
                        ) : filteredLeases.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Wifi className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              {t("page.noLeases")}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {searchQuery ? t("page.noLeasesMatch") : t("page.noLeasesHint")}
                            </p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>{t("mapping.ipAddress")}</TableHead>
                                <TableHead>{t("mapping.macAddress")}</TableHead>
                                <TableHead>{t("page.columns.hostname")}</TableHead>
                                <TableHead>{t("subnet")}</TableHead>
                                <TableHead>{t("page.columns.state")}</TableHead>
                                <TableHead>{t("page.columns.expires")}</TableHead>
                                <TableHead className="w-[100px]">{tc("actions")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredLeases.map((lease) => (
                                <TableRow key={`${lease.ip_address}-${lease.mac_address}`}>
                                  <TableCell className="font-mono">{lease.ip_address}</TableCell>
                                  <TableCell className="font-mono text-sm">{lease.mac_address}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Monitor className="h-4 w-4 text-muted-foreground" />
                                      {lease.hostname || <span className="text-muted-foreground">{t("page.unknown")}</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{lease.pool}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        lease.state === "active" && "bg-green-500/10 text-green-500 border-green-500/20",
                                        lease.state === "expired" && "bg-red-500/10 text-red-500 border-red-500/20"
                                      )}
                                    >
                                      {lease.state}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                      {lease.remaining}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      {hasStaticMapping(lease.mac_address) ? (
                                        <Badge
                                          variant="outline"
                                          className="bg-green-500/10 text-green-500 border-green-500/20"
                                        >
                                          {t("page.staticAssigned")}
                                        </Badge>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setAddingLeaseToStatic(lease)}
                                          title={t("page.addToStaticMapping")}
                                        >
                                          <Plus className="h-4 w-4 mr-1" />
                                          {t("page.addStatic")}
                                        </Button>
                                      )}
                                      {(lease.state === "active" || capabilities?.fields.clear_inactive_lease?.supported) && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => { setClearLeaseError(null); setClearLeaseTarget(lease); }}
                                          title={t("page.releaseLease")}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </ScrollArea>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            /* No Network Selected State */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Server className="h-16 w-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">{t("page.noServers")}</h2>
                <p className="text-muted-foreground max-w-md">
                  {t("page.noServersDescription")}
                </p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("create.submit")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <CreateDHCPServerModal
          open={createModalOpen || !!addingSubnetToNetwork}
          onOpenChange={(open) => {
            if (!open) {
              setCreateModalOpen(false);
              setAddingSubnetToNetwork(null);
            }
          }}
          onSuccess={() => {
            fetchConfig(true);
            fetchLeases();
          }}
          capabilities={capabilities}
          existingNetwork={addingSubnetToNetwork || undefined}
        />

        {config && (
          <DHCPServerSettingsModal
            open={settingsModalOpen}
            onOpenChange={setSettingsModalOpen}
            onSuccess={() => {
              fetchConfig(true);
            }}
            globalConfig={config.global_config}
            capabilities={capabilities}
          />
        )}

        {config && (
          <DHCPFailoverModal
            open={failoverModalOpen}
            onOpenChange={setFailoverModalOpen}
            onSuccess={() => {
              fetchConfig(true);
            }}
            failover={config.failover}
            capabilities={capabilities}
          />
        )}

        {config && (
          <DHCPDdnsModal
            open={ddnsModalOpen}
            onOpenChange={setDdnsModalOpen}
            onSuccess={() => {
              fetchConfig(true);
            }}
            ddns={config.ddns ?? { present: false, tsig_keys: [], forward_domains: [], reverse_domains: [] }}
            capabilities={capabilities}
          />
        )}

        {editingSubnet && (
          <EditDHCPServerModal
            open={!!editingSubnet}
            onOpenChange={(open) => !open && setEditingSubnet(null)}
            networkName={editingSubnet.network}
            subnet={editingSubnet.subnet}
            onSuccess={() => {
              fetchConfig(true);
              fetchLeases();
            }}
            capabilities={capabilities}
          />
        )}

        {deletingSubnet && (
          <DeleteDHCPModal
            open={!!deletingSubnet}
            onOpenChange={(open) => !open && setDeletingSubnet(null)}
            networkName={deletingSubnet.network}
            subnet={deletingSubnet.subnet.subnet}
            onSuccess={() => {
              fetchConfig(true);
              fetchLeases();
            }}
          />
        )}

        {deletingNetwork && (
          <DeleteDHCPModal
            open={!!deletingNetwork}
            onOpenChange={(open) => !open && setDeletingNetwork(null)}
            networkName={deletingNetwork}
            deleteEntireNetwork={true}
            onSuccess={() => {
              setSelectedNetwork(null);
              fetchConfig(true);
              fetchLeases();
            }}
          />
        )}

        {/* Static Mapping Modals */}
        {currentNetwork && (
          <StaticMappingModal
            open={addingStaticMapping || !!editingStaticMapping}
            onOpenChange={(open) => {
              if (!open) {
                setAddingStaticMapping(false);
                setEditingStaticMapping(null);
              }
            }}
            network={currentNetwork}
            existing={editingStaticMapping}
            capabilities={capabilities}
            onSuccess={() => {
              fetchConfig(true);
              fetchLeases();
              if (!editingStaticMapping) {
                setActiveTab("static");
              }
            }}
          />
        )}

        {deletingStaticMapping && (
          <DeleteStaticMappingModal
            open={!!deletingStaticMapping}
            onOpenChange={(open) => !open && setDeletingStaticMapping(null)}
            networkName={deletingStaticMapping.network}
            subnet={deletingStaticMapping.subnet}
            mapping={deletingStaticMapping.mapping}
            onSuccess={() => {
              fetchConfig(true);
              fetchLeases();
            }}
          />
        )}

        {/* Lease to Static Mapping Modal */}
        {addingLeaseToStatic && currentNetwork && (
          <AddLeaseToStaticMappingModal
            open={!!addingLeaseToStatic}
            onOpenChange={(open) => !open && setAddingLeaseToStatic(null)}
            lease={addingLeaseToStatic}
            network={currentNetwork}
            onSuccess={() => {
              fetchConfig(true);
              fetchLeases();
              // Switch to Static Mappings tab to show the new mapping
              setActiveTab("static");
            }}
          />
        )}

        {currentNetwork && (
          <RangeModal
            open={addingRange || !!editingRange}
            onOpenChange={(open) => {
              if (!open) {
                setAddingRange(false);
                setEditingRange(null);
              }
            }}
            network={currentNetwork}
            existing={editingRange}
            onSuccess={() => {
              fetchConfig(true);
            }}
          />
        )}

        {/* Disable / Enable Confirmation Modal */}
        <Dialog
          open={!!disableConfirm}
          onOpenChange={(open) => {
            if (!open && !disableConfirmLoading) {
              setDisableConfirm(null);
              setDisableConfirmError(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {disableConfirm?.kind === "global"
                  ? disableConfirm.currentlyDisabled
                    ? t("toggle.enableGlobalTitle")
                    : t("toggle.disableGlobalTitle")
                  : disableConfirm?.currentlyDisabled
                    ? t("toggle.enableNetworkTitle", { name: disableConfirm.networkName })
                    : t("toggle.disableNetworkTitle", { name: disableConfirm?.kind === "network" ? disableConfirm.networkName : "" })
                }
              </DialogTitle>
              <DialogDescription>
                {disableConfirm?.kind === "global"
                  ? disableConfirm.currentlyDisabled
                    ? t("toggle.enableGlobalDescription")
                    : t("toggle.disableGlobalDescription")
                  : disableConfirm?.currentlyDisabled
                    ? t("toggle.enableNetworkDescription", { name: disableConfirm.networkName })
                    : t("toggle.disableNetworkDescription", { name: disableConfirm?.kind === "network" ? disableConfirm.networkName : "" })
                }
              </DialogDescription>
            </DialogHeader>

            {disableConfirmError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{disableConfirmError}</p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setDisableConfirm(null); setDisableConfirmError(null); }}
                disabled={disableConfirmLoading}
              >
                {tc("cancel")}
              </Button>
              <Button
                variant={disableConfirm?.currentlyDisabled ? "default" : "destructive"}
                onClick={handleConfirmDisableToggle}
                disabled={disableConfirmLoading || !!disableConfirmError}
              >
                {disableConfirmLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("toggle.processing")}</>
                  : disableConfirm?.currentlyDisabled ? t("toggle.enable") : t("toggle.disable")
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Release Lease Confirmation Modal */}
        <Dialog
          open={!!clearLeaseTarget}
          onOpenChange={(open) => {
            if (!open && !clearLeaseLoading) {
              setClearLeaseTarget(null);
              setClearLeaseError(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>{t("releaseLease.title")}</DialogTitle>
              <DialogDescription>
                {t.rich("releaseLease.description", {
                  ip: clearLeaseTarget?.ip_address ?? "",
                  host: clearLeaseTarget?.hostname ? ` (${clearLeaseTarget.hostname})` : "",
                  mono: (chunks) => <span className="font-mono">{chunks}</span>,
                })}
              </DialogDescription>
            </DialogHeader>

            {clearLeaseError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{clearLeaseError}</p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setClearLeaseTarget(null); setClearLeaseError(null); }}
                disabled={clearLeaseLoading}
              >
                {tc("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmClearLease}
                disabled={clearLeaseLoading}
              >
                {clearLeaseLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("releaseLease.releasing")}</>
                  : t("releaseLease.confirm")
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default function DHCPPage() {
  return (
    <Suspense>
      <DHCPPageInner />
    </Suspense>
  );
}
