"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { bgpTabFromSearch } from "@/lib/query-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Network,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Users,
  Globe,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  bgpService,
  BgpConfig,
  BgpCapabilities,
  BgpNeighbor,
  BgpPeerGroup,
  BgpAddressFamily,
  BgpParameters,
  BgpBmpTarget,
} from "@/lib/api/bgp";
import { routeMapService } from "@/lib/api/route-map";
import { bfdService } from "@/lib/api/bfd";
import { staticRoutesService } from "@/lib/api/static-routes";
import { BgpNeighborModal } from "./BgpNeighborModal";
import { BgpPeerGroupModal } from "./BgpPeerGroupModal";
import { DeleteBgpNeighborModal } from "./DeleteBgpNeighborModal";
import { DeleteBgpPeerGroupModal } from "./DeleteBgpPeerGroupModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { afiNameKey, formatUnknownAfi } from "./afi-name";
import { thrownMessage } from "@/lib/api-error";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import {
  BMP_MAX_RETRY_RANGE,
  BMP_MIN_RETRY_RANGE,
  BMP_MIRROR_BUFFER_RANGE,
  BMP_TARGET_RANGES,
  canonicalPrefix,
  DISTANCE_RANGE,
  firstRangeProblem,
  HOLDTIME_RANGE,
  inRange,
  isIPAddress,
  isIPv4Address,
  KEEPALIVE_RANGE,
  LOCAL_PREF_RANGE,
  numberText,
  OVERVIEW_RANGES,
  PARAMETERS_RANGES,
  parametersProblem,
  PORT_RANGE,
  QUEUE_LIMIT_RANGE,
  REDISTRIBUTE_METRIC_RANGE,
  UPDATE_DELAY_ESTABLISH_WAIT_RANGE,
  UPDATE_DELAY_MAX_DELAY_RANGE,
  type BmpTargetRangeField,
  type OverviewRangeField,
  type ParametersRangeField,
} from "@/lib/api/bgp-ranges";

function failedSaveMessage(
  result: { success: boolean; error?: string | null } | null | undefined,
  fallback: string,
): string | null {
  if (!result || result.success !== false) return null;
  return result.error || fallback;
}

/** null clears the leaf. undefined is not an integer from 1 to 256. */
function maximumPathCount(raw: string): number | null | undefined {
  const text = raw.trim();
  if (!text) return null;
  if (!/^\d+$/.test(text)) return undefined;
  const n = Number(text);
  if (n < 1 || n > 256) return undefined;
  return n;
}

/** Label of each range-checked field, for the range error. */
const OVERVIEW_RANGE_LABEL_KEYS = {
  systemAs: "content.overview.systemAs",
  keepalive: "content.overview.keepalive",
  holdtime: "content.overview.holdTime",
} as const satisfies Record<OverviewRangeField, string>;

const BMP_RANGE_LABEL_KEYS = {
  port: "neighborModal.port",
  minRetry: "content.bmp.minRetry",
  maxRetry: "content.bmp.maxRetry",
} as const satisfies Record<BmpTargetRangeField, string>;

const PARAMETERS_RANGE_LABEL_KEYS = {
  defaultLocalPref: "content.params.defaultLocalPref",
  inputQueueLimit: "content.params.inputQueueLimit",
  outputQueueLimit: "content.params.outputQueueLimit",
  updateDelayEstablishWait: "content.params.updateDelayEstablishWait",
  updateDelayMaxDelay: "content.params.updateDelayMaxDelay",
  distanceExternal: "content.params.distance.external",
  distanceInternal: "content.params.distance.internal",
  distanceLocal: "content.params.distance.local",
} as const satisfies Record<ParametersRangeField, string>;

/** A number input's text as a number, or null when empty. */
function optionalNumber(raw: string): number | null {
  return raw.trim() ? Number(raw.trim()) : null;
}

export function BgpContent() {
  const t = useTranslations("bgp");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.BGP);
  const [config, setConfig] = useState<BgpConfig | null>(null);
  const [capabilities, setCapabilities] = useState<BgpCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const searchParams = useSearchParams();

  // Neighbor modal state
  const [neighborModalOpen, setNeighborModalOpen] = useState(false);
  const [editingNeighbor, setEditingNeighbor] = useState<BgpNeighbor | null>(null);
  const [deletingNeighbor, setDeletingNeighbor] = useState<string | null>(null);

  // Peer group modal state
  const [peerGroupModalOpen, setPeerGroupModalOpen] = useState(false);
  const [editingPeerGroup, setEditingPeerGroup] = useState<BgpPeerGroup | null>(null);
  const [deletingPeerGroup, setDeletingPeerGroup] = useState<{ name: string; members: number } | null>(null);

  // Overview edit state
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [systemAs, setSystemAs] = useState("");
  const [routerId, setRouterId] = useState("");
  const [keepalive, setKeepalive] = useState("");
  const [holdtime, setHoldtime] = useState("");
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Address Family state
  const [selectedAfi, setSelectedAfi] = useState<string>("");
  const [afNetworkPrefix, setAfNetworkPrefix] = useState("");
  const [afNetworkRouteMap, setAfNetworkRouteMap] = useState("");
  const [afRedistProto, setAfRedistProto] = useState("");
  const [afRedistRouteMap, setAfRedistRouteMap] = useState("");
  const [afRedistMetric, setAfRedistMetric] = useState("");
  const [afRedistTable, setAfRedistTable] = useState("");
  const [afAggPrefix, setAfAggPrefix] = useState("");
  const [afAggAsSet, setAfAggAsSet] = useState(false);
  const [afAggSummaryOnly, setAfAggSummaryOnly] = useState(false);
  const [afAggRouteMap, setAfAggRouteMap] = useState("");
  const [afSaving, setAfSaving] = useState(false);
  const [afError, setAfError] = useState<string | null>(null);
  const [afMaxEbgp, setAfMaxEbgp] = useState("");
  const [afMaxIbgp, setAfMaxIbgp] = useState("");

  // Route-map, BFD profile and static table names for dropdowns
  const [routeMapNames, setRouteMapNames] = useState<string[]>([]);
  const [bfdProfileNames, setBfdProfileNames] = useState<string[]>([]);
  const [staticTableIds, setStaticTableIds] = useState<string[]>([]);

  // Parameters state
  const [paramsEditing, setParamsEditing] = useState(false);
  const [paramsSaving, setParamsSaving] = useState(false);
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [bmpError, setBmpError] = useState<string | null>(null);
  const [bmpSaving, setBmpSaving] = useState(false);
  const [bmpName, setBmpName] = useState("");
  const [bmpAddress, setBmpAddress] = useState("");
  const [bmpPort, setBmpPort] = useState("");
  const [bmpMinRetry, setBmpMinRetry] = useState("");
  const [bmpMaxRetry, setBmpMaxRetry] = useState("");
  const [bmpBuffer, setBmpBuffer] = useState("");
  const [deletingBmpTarget, setDeletingBmpTarget] = useState<string | null>(null);
  const [bmpEdits, setBmpEdits] = useState<Record<string, { address?: string; port?: string; min_retry?: string; max_retry?: string }>>({});
  const [bmpConfirm, setBmpConfirm] = useState<null | (() => Promise<void>)>(null);
  const [pageConfirm, setPageConfirm] = useState<null | { label: string; run: () => Promise<boolean> }>(null);
  const [pageConfirmError, setPageConfirmError] = useState<string | null>(null);
  const [pageConfirmSaving, setPageConfirmSaving] = useState(false);
  const [editParams, setEditParams] = useState<BgpParameters | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        bgpService.getConfig(refresh),
        bgpService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);

      // Load auxiliary data for dropdowns - these require separate permissions
      // so we catch errors silently and default to empty arrays
      const [rmNames, bfdNames, tableIds] = await Promise.all([
        routeMapService.getConfig().then((c) => c.route_maps.map((rm) => rm.name)).catch(() => []),
        bfdService.getConfig().then((c) => c.profiles.map((p) => p.name)).catch(() => []),
        staticRoutesService.getConfig().then((c) => c.routing_tables.map((rt) => String(rt.table_id))).catch(() => []),
      ]);
      setRouteMapNames(rmNames);
      setBfdProfileNames(bfdNames);
      setStaticTableIds(tableIds);

      // Initialize selected AFI
      const firstAfi = capData.address_family_types.global[0];
      if (firstAfi) setSelectedAfi((prev) => prev || firstAfi);
    } catch (err) {
      setError(thrownMessage(err, t("content.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    setAfRedistProto("");
    setAfRedistTable("");
  }, [selectedAfi]);

  useEffect(() => {
    const af = config?.address_families.find((item) => item.afi === selectedAfi);
    setAfMaxEbgp(af?.maximum_paths_ebgp != null ? String(af.maximum_paths_ebgp) : "");
    setAfMaxIbgp(af?.maximum_paths_ibgp != null ? String(af.maximum_paths_ibgp) : "");
  }, [selectedAfi, config]);

  useEffect(() => {
    setBmpBuffer(config?.bmp?.mirror_buffer_limit != null ? String(config.bmp.mirror_buffer_limit) : "");
  }, [config?.bmp?.mirror_buffer_limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const tab = bgpTabFromSearch((key) => searchParams.get(key));
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Stats
  const neighborCount = config?.neighbors.length ?? 0;
  const activeNeighbors = config?.neighbors.filter((n) => !n.shutdown).length ?? 0;
  const peerGroupCount = config?.peer_groups.length ?? 0;
  const afCount = config?.address_families.length ?? 0;

  // ==========================================================================
  // Overview handlers
  // ==========================================================================

  const handleOverviewSave = async () => {
    if (!config) return;
    const range = firstRangeProblem({ systemAs, keepalive, holdtime }, OVERVIEW_RANGES);
    if (range) {
      setOverviewError(t("form.rangeInvalid", {
        field: t(OVERVIEW_RANGE_LABEL_KEYS[range.field]),
        min: range.range.min,
        max: range.range.max,
      }));
      return;
    }
    if (routerId.trim() && !isIPv4Address(routerId)) {
      setOverviewError(t("form.ipv4Invalid", { field: t("content.overview.routerId") }));
      return;
    }
    setOverviewSaving(true);
    setOverviewError(null);
    try {
      const result = await bgpService.saveOverview(config, systemAs.trim(), routerId.trim(), keepalive.trim(), holdtime.trim());
      const message = failedSaveMessage(result, t("content.saveOverviewFailed"));
      if (message) {
        setOverviewError(message);
        return;
      }
      await loadData(true);
      setOverviewEditing(false);
    } catch (err) {
      setOverviewError(thrownMessage(err, t("content.saveOverviewFailed")));
    } finally {
      setOverviewSaving(false);
    }
  };

  const handleOverviewEdit = () => {
    if (!config) return;
    // Seed the draft from the loaded config when editing starts, so a later reload does not wipe it.
    setSystemAs(config.system_as || "");
    setRouterId(config.parameters.router_id || "");
    setKeepalive(config.timers.keepalive?.toString() || "");
    setHoldtime(config.timers.holdtime?.toString() || "");
    setOverviewError(null);
    setOverviewEditing(true);
  };

  const handleOverviewCancel = () => {
    setOverviewEditing(false);
    setOverviewError(null);
  };

  // ==========================================================================
  // Neighbor handlers
  // ==========================================================================

  const handleCreateNeighbor = async (neighbor: BgpNeighbor) => {
    const result = await bgpService.createNeighbor(neighbor);
    const message = failedSaveMessage(result, t("content.saveFailed"));
    if (message) throw new Error(message);
    await loadData(true);
  };

  const handleUpdateNeighbor = async (neighbor: BgpNeighbor) => {
    if (!editingNeighbor) return;
    const result = await bgpService.updateNeighbor(editingNeighbor, neighbor);
    const message = failedSaveMessage(result, t("content.saveFailed"));
    if (message) throw new Error(message);
    await loadData(true);
  };

  const handleDeleteNeighbor = async () => {
    if (!deletingNeighbor) return;
    const result = await bgpService.deleteNeighbor(deletingNeighbor);
    const message = failedSaveMessage(result, t("content.saveFailed"));
    if (message) throw new Error(message);
    await loadData(true);
  };

  // ==========================================================================
  // Peer Group handlers
  // ==========================================================================

  const handleCreatePeerGroup = async (pg: BgpPeerGroup) => {
    const result = await bgpService.createPeerGroup(pg);
    const message = failedSaveMessage(result, t("content.saveFailed"));
    if (message) throw new Error(message);
    await loadData(true);
  };

  const handleUpdatePeerGroup = async (pg: BgpPeerGroup) => {
    if (!editingPeerGroup) return;
    const result = await bgpService.updatePeerGroup(editingPeerGroup, pg);
    const message = failedSaveMessage(result, t("content.saveFailed"));
    if (message) throw new Error(message);
    await loadData(true);
  };

  const handleDeletePeerGroup = async () => {
    if (!deletingPeerGroup) return;
    const result = await bgpService.deletePeerGroup(deletingPeerGroup.name);
    const message = failedSaveMessage(result, t("content.saveFailed"));
    if (message) throw new Error(message);
    await loadData(true);
  };

  // ==========================================================================
  // Address Family handlers
  // ==========================================================================

  const currentAf: BgpAddressFamily | undefined = config?.address_families.find(
    (af) => af.afi === selectedAfi
  );
  const isL2vpnEvpn = selectedAfi === "l2vpn-evpn";
  const evpnFlags = capabilities?.features.l2vpn_evpn_control_flags?.flags ?? [];
  const evpnFlagsSupported = Boolean(capabilities?.features.l2vpn_evpn_control_flags?.supported);

  const handleToggleEvpnFlag = async (flag: string, enabled: boolean) => {
    setAfSaving(true);
    setAfError(null);
    try {
      const result = await bgpService.setL2vpnEvpnFlag(flag, enabled);
      const message = failedSaveMessage(result, t("content.evpnFlagFailed"));
      if (message) {
        setAfError(message);
        setPageConfirmError(message);
        return false;
      }
      await loadData(true);
      return true;
    } catch (err) {
      const message = thrownMessage(err, t("content.evpnFlagFailed"));
      setAfError(message);
      setPageConfirmError(message);
      return false;
    } finally {
      setAfSaving(false);
    }
  };

  const handleAddNetwork = async () => {
    const prefix = afNetworkPrefix.trim();
    if (!prefix) return;
    if (currentAf?.networks.some((n) => canonicalPrefix(n.prefix) === canonicalPrefix(prefix))) {
      setAfError(t("content.networkExists", { prefix }));
      return;
    }
    setAfSaving(true);
    setAfError(null);
    try {
      const result = await bgpService.addNetwork(selectedAfi, prefix, afNetworkRouteMap.trim() || undefined);
      const message = failedSaveMessage(result, t("content.addNetworkFailed"));
      if (message) {
        setAfError(message);
        return;
      }
      setAfNetworkPrefix("");
      setAfNetworkRouteMap("");
      await loadData(true);
    } catch (err) {
      setAfError(thrownMessage(err, t("content.addNetworkFailed")));
    } finally {
      setAfSaving(false);
    }
  };

  const handleDeleteNetwork = async (prefix: string) => {
    setAfSaving(true);
    setAfError(null);
    try {
      const result = await bgpService.deleteNetwork(selectedAfi, prefix);
      const message = failedSaveMessage(result, t("content.deleteNetworkFailed"));
      if (message) {
        setAfError(message);
        setPageConfirmError(message);
        return false;
      }
      await loadData(true);
      return true;
    } catch (err) {
      const message = thrownMessage(err, t("content.deleteNetworkFailed"));
      setAfError(message);
      setPageConfirmError(message);
      return false;
    } finally {
      setAfSaving(false);
    }
  };

  /** Shows the range error and returns false when the redistribute metric is outside the lab range. */
  const redistributeMetricOk = (): boolean => {
    if (inRange(afRedistMetric, REDISTRIBUTE_METRIC_RANGE)) return true;
    setAfError(t("form.rangeInvalid", {
      field: t("content.af.metric"),
      min: REDISTRIBUTE_METRIC_RANGE.min,
      max: REDISTRIBUTE_METRIC_RANGE.max,
    }));
    return false;
  };

  /** Shows the error and returns false when a BMP target address or number is not one the lab accepts. */
  const bmpTargetOk = (address: string, values: Record<BmpTargetRangeField, string>): boolean => {
    if (address.trim() && !isIPAddress(address)) {
      setBmpError(t("form.ipAddressInvalid", { field: t("content.address") }));
      return false;
    }
    const range = firstRangeProblem(values, BMP_TARGET_RANGES);
    if (!range) return true;
    setBmpError(t("form.rangeInvalid", {
      field: t(BMP_RANGE_LABEL_KEYS[range.field]),
      min: range.range.min,
      max: range.range.max,
    }));
    return false;
  };

  const handleAddRedistribute = async () => {
    if (!afRedistProto) return;
    if (!redistributeMetricOk()) return;
    setAfSaving(true);
    setAfError(null);
    try {
      const result = await bgpService.addRedistribute(selectedAfi, afRedistProto, afRedistRouteMap.trim() || undefined, afRedistMetric.trim() || undefined);
      const message = failedSaveMessage(result, t("content.addRedistributeFailed"));
      if (message) {
        setAfError(message);
        return;
      }
      setAfRedistProto("");
      setAfRedistRouteMap("");
      setAfRedistMetric("");
      await loadData(true);
    } catch (err) {
      setAfError(thrownMessage(err, t("content.addRedistributeFailed")));
    } finally {
      setAfSaving(false);
    }
  };

  const handleDeleteRedistribute = async (protocol: string, table?: string) => {
    setAfSaving(true);
    setAfError(null);
    try {
      const result = protocol === "table" && table
        ? await bgpService.deleteRedistributeTable(selectedAfi, table)
        : await bgpService.deleteRedistribute(selectedAfi, protocol);
      const message = failedSaveMessage(result, t("content.deleteRedistributeFailed"));
      if (message) {
        setAfError(message);
        setPageConfirmError(message);
        return false;
      }
      await loadData(true);
      return true;
    } catch (err) {
      const message = thrownMessage(err, t("content.deleteRedistributeFailed"));
      setAfError(message);
      setPageConfirmError(message);
      return false;
    } finally {
      setAfSaving(false);
    }
  };

  const handleAddAggregate = async () => {
    const prefix = afAggPrefix.trim();
    if (!prefix) return;
    if (currentAf?.aggregate_addresses.some((a) => canonicalPrefix(a.prefix) === canonicalPrefix(prefix))) {
      setAfError(t("content.aggregateExists", { prefix }));
      return;
    }
    setAfSaving(true);
    setAfError(null);
    try {
      const result = await bgpService.addAggregateAddress(selectedAfi, prefix, afAggAsSet, afAggSummaryOnly, afAggRouteMap.trim() || undefined);
      const message = failedSaveMessage(result, t("content.addAggregateFailed"));
      if (message) {
        setAfError(message);
        return;
      }
      setAfAggPrefix("");
      setAfAggAsSet(false);
      setAfAggSummaryOnly(false);
      setAfAggRouteMap("");
      await loadData(true);
    } catch (err) {
      setAfError(thrownMessage(err, t("content.addAggregateFailed")));
    } finally {
      setAfSaving(false);
    }
  };

  const handleDeleteAggregate = async (prefix: string) => {
    setAfSaving(true);
    setAfError(null);
    try {
      const result = await bgpService.deleteAggregateAddress(selectedAfi, prefix);
      const message = failedSaveMessage(result, t("content.deleteAggregateFailed"));
      if (message) {
        setAfError(message);
        setPageConfirmError(message);
        return false;
      }
      await loadData(true);
      return true;
    } catch (err) {
      const message = thrownMessage(err, t("content.deleteAggregateFailed"));
      setAfError(message);
      setPageConfirmError(message);
      return false;
    } finally {
      setAfSaving(false);
    }
  };

  const handleSaveMaximumPaths = async () => {
    const ebgp = maximumPathCount(afMaxEbgp);
    const ibgp = maximumPathCount(afMaxIbgp);
    if (ebgp === undefined || ibgp === undefined) {
      setAfError(t("content.af.maximumPathsRange"));
      return;
    }
    const loaded = config?.address_families.find((item) => item.afi === selectedAfi);
    setAfSaving(true);
    setAfError(null);
    try {
      const result = await bgpService.saveMaximumPaths(
        selectedAfi,
        loaded?.maximum_paths_ebgp ?? null,
        loaded?.maximum_paths_ibgp ?? null,
        ebgp,
        ibgp,
      );
      const message = failedSaveMessage(result, t("content.saveFailed"));
      if (message) {
        setAfError(message);
        return;
      }
      await loadData(true);
    } catch (err) {
      setAfError(thrownMessage(err, t("content.saveFailed")));
    } finally {
      setAfSaving(false);
    }
  };

  // ==========================================================================
  // Parameters handlers
  // ==========================================================================

  const handleParamsEdit = () => {
    if (config) {
      setEditParams(JSON.parse(JSON.stringify(config.parameters)));
      setParamsEditing(true);
      setParamsError(null);
    }
  };

  const handleParamsSave = async () => {
    if (!config || !editParams) return;
    const range = firstRangeProblem(
      {
        defaultLocalPref: numberText(editParams.default_local_pref),
        inputQueueLimit: numberText(editParams.input_queue_limit),
        outputQueueLimit: numberText(editParams.output_queue_limit),
        updateDelayEstablishWait: numberText(editParams.update_delay_establish_wait),
        updateDelayMaxDelay: numberText(editParams.update_delay_max_delay),
        distanceExternal: numberText(editParams.distance_global?.external),
        distanceInternal: numberText(editParams.distance_global?.internal),
        distanceLocal: numberText(editParams.distance_global?.local),
      },
      PARAMETERS_RANGES,
    );
    if (range) {
      setParamsError(t("form.rangeInvalid", {
        field: t(PARAMETERS_RANGE_LABEL_KEYS[range.field]),
        min: range.range.min,
        max: range.range.max,
      }));
      return;
    }
    if (editParams.cluster_id?.trim() && !isIPv4Address(editParams.cluster_id)) {
      setParamsError(t("form.ipv4Invalid", { field: t("content.params.clusterId") }));
      return;
    }
    const problem = parametersProblem({
      distanceExternal: editParams.distance_global?.external,
      distanceInternal: editParams.distance_global?.internal,
      distanceLocal: editParams.distance_global?.local,
      updateDelayEstablishWait: editParams.update_delay_establish_wait,
      updateDelayMaxDelay: editParams.update_delay_max_delay,
    });
    if (problem) {
      setParamsError(t(`content.params.${problem}`));
      return;
    }
    setParamsSaving(true);
    setParamsError(null);
    try {
      const result = await bgpService.saveParameters(config.parameters, {
        ...editParams,
        cluster_id: editParams.cluster_id?.trim() || null,
      });
      const message = failedSaveMessage(result, t("content.saveParamsFailed"));
      if (message) {
        setParamsError(message);
        return;
      }
      await loadData(true);
      setParamsEditing(false);
    } catch (err) {
      setParamsError(thrownMessage(err, t("content.saveParamsFailed")));
    } finally {
      setParamsSaving(false);
    }
  };

  const handleParamsCancel = () => {
    setParamsEditing(false);
    setEditParams(null);
    setParamsError(null);
  };

  const updateParam = <K extends keyof BgpParameters>(key: K, value: BgpParameters[K]) => {
    if (!editParams) return;
    setEditParams({ ...editParams, [key]: value });
  };

  // ==========================================================================
  // Helpers
  // ==========================================================================

  const getMembersOfPeerGroup = (pgName: string): number => {
    return config?.neighbors.filter((n) => n.peer_group === pgName).length ?? 0;
  };

  const formatAfi = (afi: string): string => {
    const key = afiNameKey(afi);
    if (key) return t(`content.afiNames.${key}`);
    return formatUnknownAfi(afi);
  };

  const redistributeProtocols = (
    (selectedAfi === "ipv6-unicast"
      ? capabilities?.redistribute_protocols?.["ipv6-unicast"]
      : selectedAfi === "ipv4-unicast"
        ? capabilities?.redistribute_protocols?.["ipv4-unicast"]
        : []) ?? []
  ).filter((p) => !currentAf?.redistribute.some((r) => r.protocol === p));

  // ==========================================================================
  // Render
  // ==========================================================================

  if (loading && !config) {
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

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">BGP</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("content.subtitle")}
                {config?.system_as && (
                  <span className="ml-2 font-mono text-foreground">AS {config.system_as}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!hasWritePermission && (
                <Badge variant="secondary">{tc("readOnly")}</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData(true)}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {tc("refresh")}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{neighborCount}</p>
                    <p className="text-xs text-muted-foreground">{t("content.neighbors")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <Network className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeNeighbors}</p>
                    <p className="text-xs text-muted-foreground">{t("content.active")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{peerGroupCount}</p>
                    <p className="text-xs text-muted-foreground">{t("content.peerGroups")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-orange-500/10">
                    <Globe className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{afCount}</p>
                    <p className="text-xs text-muted-foreground">{t("content.addressFamilies")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">{t("content.overviewTab")}</TabsTrigger>
              <TabsTrigger value="neighbors">
                {t("content.neighbors")}
                {neighborCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{neighborCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="peer-groups">
                {t("content.peerGroups")}
                {peerGroupCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{peerGroupCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="address-families">
                {t("content.addressFamilies")}
                {afCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{afCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="parameters">{t("content.parametersTab")}</TabsTrigger>
              <TabsTrigger value="bmp">{t("content.bmpTab")}</TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Overview Tab */}
            {/* ============================================================ */}
            <TabsContent value="overview">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t("content.overview.description")}
                  </p>
                  {!hasWritePermission ? null : !overviewEditing ? (
                    <Button size="sm" variant="outline" onClick={handleOverviewEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {tc("edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleOverviewCancel} disabled={overviewSaving}>
                        <X className="h-4 w-4 mr-2" />
                        {tc("cancel")}
                      </Button>
                      <Button size="sm" onClick={handleOverviewSave} disabled={overviewSaving}>
                        {overviewSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {tc("save")}
                      </Button>
                    </div>
                  )}
                </div>

                {overviewError && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {overviewError}
                  </div>
                )}

                <Card>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="bgp-overview-system-as">{t("content.overview.systemAs")}</Label>
                        {overviewEditing ? (
                          <Input
                            id="bgp-overview-system-as"
                            value={systemAs}
                            onChange={(e) => setSystemAs(e.target.value)}
                            placeholder={t("eg", { value: "65001" })}
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.system_as || <span className="text-muted-foreground">{t("content.overview.notConfigured")}</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t("content.overview.systemAsHelp")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bgp-overview-router-id">{t("content.overview.routerId")}</Label>
                        {overviewEditing ? (
                          <Input
                            id="bgp-overview-router-id"
                            value={routerId}
                            onChange={(e) => setRouterId(e.target.value)}
                            placeholder={t("eg", { value: "10.0.0.1" })}
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.parameters.router_id || <span className="text-muted-foreground">{t("content.overview.autoDetect")}</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t("content.overview.routerIdHelp")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bgp-overview-keepalive">{t("content.overview.keepalive")}</Label>
                        {overviewEditing ? (
                          <Input
                            id="bgp-overview-keepalive"
                            min={KEEPALIVE_RANGE.min}
                            max={KEEPALIVE_RANGE.max}
                            type="number"
                            value={keepalive}
                            onChange={(e) => setKeepalive(e.target.value)}
                            placeholder="60"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.timers.keepalive ?? <span className="text-muted-foreground">{t("content.defaultValue", { value: "60" })}</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t("content.overview.keepaliveHelp")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bgp-overview-holdtime">{t("content.overview.holdTime")}</Label>
                        {overviewEditing ? (
                          <Input
                            id="bgp-overview-holdtime"
                            min={HOLDTIME_RANGE.min}
                            max={HOLDTIME_RANGE.max}
                            type="number"
                            value={holdtime}
                            onChange={(e) => setHoldtime(e.target.value)}
                            placeholder="180"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.timers.holdtime ?? <span className="text-muted-foreground">{t("content.defaultValue", { value: "180" })}</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t("content.overview.holdTimeHelp")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Listen Ranges */}
                {config?.listen && (config.listen.limit || config.listen.ranges.length > 0) && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-sm font-medium mb-4">{t("content.overview.listenTitle")}</h3>
                      {config.listen.limit && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {t("content.overview.connectionLimit")} <span className="font-mono">{config.listen.limit}</span>
                        </p>
                      )}
                      {config.listen.ranges.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("content.prefix")}</TableHead>
                              <TableHead>{t("content.peerGroup")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {config.listen.ranges.map((r) => (
                              <TableRow key={r.prefix}>
                                <TableCell className="font-mono">{r.prefix}</TableCell>
                                <TableCell>{r.peer_group || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Neighbors Tab */}
            {/* ============================================================ */}
            <TabsContent value="neighbors">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("content.neighborsTab.description")}
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingNeighbor(null); setNeighborModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("content.neighborsTab.add")}
                  </Button>
                )}
              </div>

              {neighborCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("content.neighborsTab.empty")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("content.neighborsTab.emptyHint")}
                    </p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingNeighbor(null); setNeighborModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("content.neighborsTab.add")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("content.address")}</TableHead>
                          <TableHead>{t("content.remoteAs")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead>{t("content.peerGroup")}</TableHead>
                          <TableHead>BFD</TableHead>
                          <TableHead>{t("content.addressFamilies")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.neighbors.map((neighbor) => (
                          <TableRow key={neighbor.address}>
                            <TableCell className="font-medium font-mono">
                              {neighbor.address}
                            </TableCell>
                            <TableCell className="font-mono">
                              {neighbor.remote_as || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {neighbor.description || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell>
                              {neighbor.shutdown ? (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                                  {t("content.shutdown")}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                  {t("content.active")}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {neighbor.peer_group ? (
                                <Badge variant="secondary">{neighbor.peer_group}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {neighbor.bfd.enabled ? (
                                <Badge variant="outline" className="text-xs">BFD</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {Object.keys(neighbor.address_families).length > 0 ? (
                                  Object.keys(neighbor.address_families).map((afi) => (
                                    <Badge key={afi} variant="outline" className="text-xs">
                                      {afi.replace(/_/g, " ")}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            {hasWritePermission && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    aria-label={tc("edit")}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingNeighbor(neighbor);
                                      setNeighborModalOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    aria-label={tc("delete")}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingNeighbor(neighbor.address)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* Peer Groups Tab */}
            {/* ============================================================ */}
            <TabsContent value="peer-groups">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("content.peerGroupsTab.description")}
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingPeerGroup(null); setPeerGroupModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("content.peerGroupsTab.add")}
                  </Button>
                )}
              </div>

              {peerGroupCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("content.peerGroupsTab.empty")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("content.peerGroupsTab.emptyHint")}
                    </p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingPeerGroup(null); setPeerGroupModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("content.peerGroupsTab.add")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("content.remoteAs")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead>BFD</TableHead>
                          <TableHead>{t("content.peerGroupsTab.members")}</TableHead>
                          <TableHead>{t("content.addressFamilies")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.peer_groups.map((pg) => {
                          const memberCount = getMembersOfPeerGroup(pg.name);
                          return (
                            <TableRow key={pg.name}>
                              <TableCell className="font-medium font-mono">{pg.name}</TableCell>
                              <TableCell className="font-mono">
                                {pg.remote_as || <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {pg.description || <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                {pg.shutdown ? (
                                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                                    {t("content.shutdown")}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                    {t("content.active")}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {pg.bfd.enabled ? (
                                  <Badge variant="outline" className="text-xs">BFD</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {memberCount > 0 ? (
                                  <Badge variant="secondary">
                                    {t("content.peerGroupsTab.memberCount", { count: memberCount })}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">{tc("none")}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Object.keys(pg.address_families).length > 0 ? (
                                    Object.keys(pg.address_families).map((afi) => (
                                      <Badge key={afi} variant="outline" className="text-xs">
                                        {afi.replace(/_/g, " ")}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </TableCell>
                              {hasWritePermission && (
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      aria-label={tc("edit")}
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setEditingPeerGroup(pg);
                                        setPeerGroupModalOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      aria-label={tc("delete")}
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => setDeletingPeerGroup({ name: pg.name, members: memberCount })}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* Address Families Tab */}
            {/* ============================================================ */}
            <TabsContent value="address-families">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t("content.af.description")}
                  </p>
                  <Select value={selectedAfi} onValueChange={setSelectedAfi}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder={t("content.af.selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {capabilities?.address_family_types.global.map((afi) => (
                        <SelectItem key={afi} value={afi}>
                          {formatAfi(afi)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {afError && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {afError}
                  </div>
                )}

                {selectedAfi && (
                  <div className="space-y-6">
                    {isL2vpnEvpn && evpnFlagsSupported && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-sm font-medium mb-4">{t("content.af.evpnTitle")}</h3>
                          <p className="text-xs text-muted-foreground mb-4">
                            {t("content.af.evpnDescription")}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {evpnFlags.map((flag) => {
                              const checked = currentAf?.evpn_flags?.includes(flag) ?? false;
                              return (
                                <div key={flag} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`evpn-flag-${flag}`}
                                    checked={checked}
                                    disabled={afSaving || !hasWritePermission}
                                    onCheckedChange={(c) => {
                                      setPageConfirmError(null);
                                      setPageConfirm({
                                        label: flag,
                                        run: () => handleToggleEvpnFlag(flag, c === true),
                                      });
                                    }}
                                  />
                                  <Label htmlFor={`evpn-flag-${flag}`} className="text-sm cursor-pointer">
                                    {flag.replace(/-/g, " ")}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {!isL2vpnEvpn && (
                    <>
                    {/* Networks */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-sm font-medium mb-4">{t("content.af.networks")}</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          {t("content.af.networksHelp")}
                        </p>

                        {currentAf && currentAf.networks.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("content.prefix")}</TableHead>
                                <TableHead>{t("content.routeMap")}</TableHead>
                                {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentAf.networks.map((net) => (
                                <TableRow key={net.prefix}>
                                  <TableCell className="font-mono">{net.prefix}</TableCell>
                                  <TableCell>{net.route_map || <span className="text-muted-foreground">-</span>}</TableCell>
                                  {hasWritePermission && (
                                    <TableCell className="text-right">
                                      <Button
                                        aria-label={tc("delete")}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => {
                                          setPageConfirmError(null);
                                          setPageConfirm({ label: net.prefix, run: () => handleDeleteNetwork(net.prefix) });
                                        }}
                                        disabled={afSaving}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}

                        {hasWritePermission && (
                          <div className="flex items-end gap-3 mt-4">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">{t("content.prefix")}</Label>
                              <Input
                                value={afNetworkPrefix}
                                onChange={(e) => setAfNetworkPrefix(e.target.value)}
                                placeholder={t("eg", { value: "10.0.0.0/24" })}
                                className="h-9"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label htmlFor="bgp-af-network-route-map" className="text-xs">{t("content.routeMapOptional")}</Label>
                              <NamedListSelect id="bgp-af-network-route-map" value={afNetworkRouteMap} names={routeMapNames} onValueChange={setAfNetworkRouteMap} />
                            </div>
                            <Button size="sm" onClick={handleAddNetwork} disabled={afSaving || !afNetworkPrefix.trim()}>
                              {afSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                              {tc("add")}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Redistribute */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-sm font-medium mb-4">{t("content.af.redistribute")}</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          {t("content.af.redistributeHelp")}
                        </p>

                        {currentAf && currentAf.redistribute.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("content.af.protocol")}</TableHead>
                                <TableHead>{t("content.routeMap")}</TableHead>
                                <TableHead>{t("content.af.metric")}</TableHead>
                                {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentAf.redistribute.map((rd) => (
                                <TableRow key={`${rd.protocol}-${rd.table ?? ""}`}>
                                  <TableCell className="font-mono">{rd.protocol === "table" ? `${t("content.af.table")} ${rd.table}` : rd.protocol}</TableCell>
                                  <TableCell>{rd.route_map || <span className="text-muted-foreground">-</span>}</TableCell>
                                  <TableCell className="font-mono">{rd.metric || <span className="text-muted-foreground">-</span>}</TableCell>
                                  {hasWritePermission && (
                                    <TableCell className="text-right">
                                      <Button
                                        aria-label={tc("delete")}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => {
                                          setPageConfirmError(null);
                                          setPageConfirm({
                                            label: rd.protocol === "table" ? `${t("content.af.table")} ${rd.table}` : rd.protocol,
                                            run: () => handleDeleteRedistribute(rd.protocol, rd.table ?? undefined),
                                          });
                                        }}
                                        disabled={afSaving}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}

                        {hasWritePermission && (
                          <div className="flex items-end gap-3 mt-4">
                            <div className="w-[160px] space-y-1">
                              <Label className="text-xs">{t("content.af.protocol")}</Label>
                              <Select value={afRedistProto} onValueChange={setAfRedistProto}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder={t("content.af.selectEllipsis")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {redistributeProtocols.map((p) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label htmlFor="bgp-af-redist-route-map" className="text-xs">{t("content.routeMapOptional")}</Label>
                              <NamedListSelect id="bgp-af-redist-route-map" value={afRedistRouteMap} names={routeMapNames} onValueChange={setAfRedistRouteMap} />
                            </div>
                            <div className="w-[100px] space-y-1">
                              <Label className="text-xs">{t("content.af.metric")}</Label>
                              <Input
                                type="number"
                                min={REDISTRIBUTE_METRIC_RANGE.min}
                                max={REDISTRIBUTE_METRIC_RANGE.max}
                                value={afRedistMetric}
                                onChange={(e) => setAfRedistMetric(e.target.value)}
                                placeholder={t("eg", { value: "100" })}
                                className="h-9"
                              />
                            </div>
                            <Button size="sm" onClick={handleAddRedistribute} disabled={afSaving || !afRedistProto}>
                              {afSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                              {tc("add")}
                            </Button>
                          </div>
                        )}
                        {hasWritePermission && (capabilities?.redistribute_table_afis ?? []).includes(selectedAfi) && (
                          <div className="flex items-end gap-3 mt-4">
                            <div className="w-[160px] space-y-1">
                              <Label htmlFor="bgp-af-redist-table" className="text-xs">{t("content.af.table")}</Label>
                              <NamedListSelect
                                id="bgp-af-redist-table"
                                value={afRedistTable}
                                names={staticTableIds.filter(
                                  (id) => !(currentAf?.redistribute ?? []).some((r) => r.protocol === "table" && r.table === id),
                                )}
                                onValueChange={setAfRedistTable}
                              />
                            </div>
                            <Button
                              size="sm"
                              disabled={afSaving || !afRedistTable}
                              onClick={async () => {
                                const table = afRedistTable;
                                if (!redistributeMetricOk()) return;
                                setAfSaving(true);
                                setAfError(null);
                                try {
                                  const result = await bgpService.addRedistributeTable(
                                    selectedAfi,
                                    table,
                                    afRedistRouteMap.trim() || undefined,
                                    afRedistMetric.trim() || undefined,
                                  );
                                  const message = failedSaveMessage(result, t("content.addRedistributeFailed"));
                                  if (message) {
                                    setAfError(message);
                                    return;
                                  }
                                  setAfRedistTable("");
                                  setAfRedistRouteMap("");
                                  setAfRedistMetric("");
                                  await loadData(true);
                                } catch (err) {
                                  setAfError(thrownMessage(err, t("content.addRedistributeFailed")));
                                } finally {
                                  setAfSaving(false);
                                }
                              }}
                            >
                              {tc("add")}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Aggregate Addresses */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-sm font-medium mb-4">{t("content.af.aggregate")}</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          {t("content.af.aggregateHelp")}
                        </p>

                        {currentAf && currentAf.aggregate_addresses.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("content.prefix")}</TableHead>
                                <TableHead>{t("content.af.asSet")}</TableHead>
                                <TableHead>{t("content.af.summaryOnly")}</TableHead>
                                <TableHead>{t("content.routeMap")}</TableHead>
                                {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentAf.aggregate_addresses.map((agg) => (
                                <TableRow key={agg.prefix}>
                                  <TableCell className="font-mono">{agg.prefix}</TableCell>
                                  <TableCell>{agg.as_set ? t("content.yes") : t("content.no")}</TableCell>
                                  <TableCell>{agg.summary_only ? t("content.yes") : t("content.no")}</TableCell>
                                  <TableCell>{agg.route_map || <span className="text-muted-foreground">-</span>}</TableCell>
                                  {hasWritePermission && (
                                    <TableCell className="text-right">
                                      <Button
                                        aria-label={tc("delete")}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => {
                                          setPageConfirmError(null);
                                          setPageConfirm({ label: agg.prefix, run: () => handleDeleteAggregate(agg.prefix) });
                                        }}
                                        disabled={afSaving}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}

                        {hasWritePermission && (
                          <div className="flex items-end gap-3 mt-4">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">{t("content.prefix")}</Label>
                              <Input
                                value={afAggPrefix}
                                onChange={(e) => setAfAggPrefix(e.target.value)}
                                placeholder={t("eg", { value: "10.0.0.0/8" })}
                                className="h-9"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label htmlFor="bgp-af-agg-route-map" className="text-xs">{t("content.routeMapOptional")}</Label>
                              <NamedListSelect id="bgp-af-agg-route-map" value={afAggRouteMap} names={routeMapNames} onValueChange={setAfAggRouteMap} />
                            </div>
                            <div className="flex items-center gap-3 pb-0.5">
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  id="agg-as-set"
                                  checked={afAggAsSet}
                                  onCheckedChange={(c) => setAfAggAsSet(c === true)}
                                />
                                <Label htmlFor="agg-as-set" className="text-xs cursor-pointer">{t("content.af.asSet")}</Label>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  id="agg-summary"
                                  checked={afAggSummaryOnly}
                                  onCheckedChange={(c) => setAfAggSummaryOnly(c === true)}
                                />
                                <Label htmlFor="agg-summary" className="text-xs cursor-pointer">{t("content.af.summaryOnly")}</Label>
                              </div>
                            </div>
                            <Button size="sm" onClick={handleAddAggregate} disabled={afSaving || !afAggPrefix.trim()}>
                              {afSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                              {tc("add")}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    </>
                    )}

                    {/* Maximum Paths */}
                    {(capabilities?.maximum_paths_afis ?? []).includes(selectedAfi) && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-sm font-medium mb-4">{t("content.af.maximumPaths")}</h3>
                          <div className="flex items-end gap-3">
                            <div className="w-[160px] space-y-1">
                              <Label className="text-xs">{t("content.af.ebgp")}</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={afMaxEbgp}
                                onChange={(e) => setAfMaxEbgp(e.target.value)}
                                className="h-9"
                                disabled={afSaving || !hasWritePermission}
                              />
                            </div>
                            <div className="w-[160px] space-y-1">
                              <Label className="text-xs">{t("content.af.ibgp")}</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={afMaxIbgp}
                                onChange={(e) => setAfMaxIbgp(e.target.value)}
                                className="h-9"
                                disabled={afSaving || !hasWritePermission}
                              />
                            </div>
                            {hasWritePermission && (
                              <Button
                                size="sm"
                                onClick={handleSaveMaximumPaths}
                                disabled={afSaving || (
                                  afMaxEbgp.trim() === (currentAf?.maximum_paths_ebgp != null ? String(currentAf.maximum_paths_ebgp) : "")
                                  && afMaxIbgp.trim() === (currentAf?.maximum_paths_ibgp != null ? String(currentAf.maximum_paths_ibgp) : "")
                                )}
                              >
                                {afSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                                {tc("save")}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Parameters Tab */}
            {/* ============================================================ */}
            <TabsContent value="parameters">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t("content.params.description")}
                  </p>
                  {!hasWritePermission ? null : !paramsEditing ? (
                    <Button size="sm" variant="outline" onClick={handleParamsEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {tc("edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleParamsCancel} disabled={paramsSaving}>
                        <X className="h-4 w-4 mr-2" />
                        {tc("cancel")}
                      </Button>
                      <Button size="sm" onClick={handleParamsSave} disabled={paramsSaving}>
                        {paramsSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {tc("save")}
                      </Button>
                    </div>
                  )}
                </div>

                {paramsError && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {paramsError}
                  </div>
                )}

                {/* General Settings */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium mb-4">{t("content.params.general")}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <Label className="text-xs">{t("content.params.clusterId")}</Label>
                        {paramsEditing && editParams ? (
                          <Input
                            value={editParams.cluster_id || ""}
                            onChange={(e) => updateParam("cluster_id", e.target.value || null)}
                            placeholder={t("eg", { value: "10.0.0.1" })}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.parameters.cluster_id || <span className="text-muted-foreground">{tc("notSet")}</span>}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{t("content.params.defaultLocalPref")}</Label>
                        {paramsEditing && editParams ? (
                          <Input
                            type="number"
                            min={LOCAL_PREF_RANGE.min}
                            max={LOCAL_PREF_RANGE.max}
                            value={editParams.default_local_pref ?? ""}
                            onChange={(e) => updateParam("default_local_pref", optionalNumber(e.target.value))}
                            placeholder="100"
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.parameters.default_local_pref ?? <span className="text-muted-foreground">{t("content.defaultValue", { value: "100" })}</span>}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Boolean flags */}
                    <h4 className="text-xs font-medium text-muted-foreground mb-3">{t("content.params.behaviorFlags")}</h4>
                    <div className="space-y-3 rounded-lg border p-4">
                      {([
                        { key: "log_neighbor_changes" as const },
                        { key: "always_compare_med" as const },
                        { key: "deterministic_med" as const },
                        { key: "ebgp_requires_policy" as const },
                        { key: "graceful_shutdown" as const },
                        { key: "no_client_to_client_reflection" as const },
                        { key: "no_fast_external_failover" as const },
                        { key: "allow_martian_nexthop" as const },
                        { key: "disable_ebgp_connected_route_check" as const },
                        { key: "fast_convergence" as const },
                        { key: "network_import_check" as const },
                        { key: "reject_as_sets" as const },
                        { key: "route_reflector_allow_outbound_policy" as const },
                        { key: "suppress_fib_pending" as const },
                        { key: "no_suppress_duplicates" as const },
                        { key: "no_ipv6_auto_ra" as const },
                        { key: "no_hard_administrative_reset" as const },
                        { key: "shutdown" as const, destructive: true },
                      ] as const).map((item) => {
                        const { key } = item;
                        const destructive = "destructive" in item;
                        const params = paramsEditing ? editParams : config?.parameters;
                        const checked = (params?.[key] as boolean) ?? false;
                        return (
                          <div key={key} className="flex items-center space-x-3">
                            <Checkbox
                              id={`param-${key}`}
                              checked={checked}
                              disabled={!paramsEditing}
                              onCheckedChange={(c) => {
                                if (paramsEditing && editParams) {
                                  updateParam(key, c === true);
                                }
                              }}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={`param-${key}`}
                                className={`cursor-pointer text-sm ${destructive ? "text-destructive" : ""}`}
                              >
                                {t(`content.params.flags.${key}.label`)}
                              </Label>
                              <p className="text-xs text-muted-foreground">{t(`content.params.flags.${key}.desc`)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Bestpath Selection */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium mb-4">{t("content.params.bestpathTitle")}</h3>
                    <div className="space-y-3 rounded-lg border p-4">
                      {([
                        { key: "as_path_confed" as const },
                        { key: "as_path_ignore" as const },
                        { key: "as_path_multipath_relax" as const },
                        { key: "compare_routerid" as const },
                        { key: "peer_type_multipath_relax" as const },
                      ] as const).map(({ key }) => {
                        const bp = paramsEditing ? editParams?.bestpath : config?.parameters.bestpath;
                        const checked = bp?.[key] ?? false;
                        return (
                          <div key={key} className="flex items-center space-x-3">
                            <Checkbox
                              id={`bp-${key}`}
                              checked={checked}
                              disabled={!paramsEditing}
                              onCheckedChange={(c) => {
                                if (paramsEditing && editParams) {
                                  setEditParams({
                                    ...editParams,
                                    bestpath: { ...editParams.bestpath, [key]: c === true },
                                  });
                                }
                              }}
                            />
                            <div className="flex-1">
                              <Label htmlFor={`bp-${key}`} className="cursor-pointer text-sm">{t(`content.params.bestpath.${key}.label`)}</Label>
                              <p className="text-xs text-muted-foreground">{t(`content.params.bestpath.${key}.desc`)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {(capabilities?.features.bestpath_bandwidth?.supported
                      || capabilities?.features.bestpath_med?.supported) && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {capabilities?.features.bestpath_bandwidth?.supported && (
                          <div className="space-y-2">
                            <Label className="text-xs">{t("content.params.bestpath.bandwidth.label")}</Label>
                            {paramsEditing && editParams ? (
                              <Select
                                value={editParams.bestpath.bandwidth || NONE_SENTINEL}
                                onValueChange={(v) => {
                                  setEditParams({
                                    ...editParams,
                                    bestpath: {
                                      ...editParams.bestpath,
                                      bandwidth: v === NONE_SENTINEL ? null : v,
                                    },
                                  });
                                }}
                              >
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NONE_SENTINEL}>{tc("none")}</SelectItem>
                                  {(capabilities.features.bestpath_bandwidth.values || []).map((value) => (
                                    <SelectItem key={value} value={value}>{value}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm font-mono p-2 bg-muted rounded-md">
                                {config?.parameters.bestpath.bandwidth || <span className="text-muted-foreground">{tc("notSet")}</span>}
                              </p>
                            )}
                          </div>
                        )}
                        {capabilities?.features.bestpath_med?.supported && (
                          <div className="space-y-2">
                            <Label className="text-xs">{t("content.params.bestpath.med.label")}</Label>
                            <div className="space-y-2 rounded-lg border p-4">
                              {(capabilities.features.bestpath_med.values || []).map((value) => {
                                const selected = new Set((paramsEditing ? editParams?.bestpath.med : config?.parameters.bestpath.med) || []);
                                return (
                                  <div key={value} className="flex items-center space-x-3">
                                    <Checkbox
                                      id={`bp-med-${value}`}
                                      checked={selected.has(value)}
                                      disabled={!paramsEditing}
                                      onCheckedChange={(c) => {
                                        if (!paramsEditing || !editParams) return;
                                        const next = new Set(editParams.bestpath.med || []);
                                        if (c === true) next.add(value);
                                        else next.delete(value);
                                        setEditParams({
                                          ...editParams,
                                          bestpath: {
                                            ...editParams.bestpath,
                                            med: next.size ? [...next] : null,
                                          },
                                        });
                                      }}
                                    />
                                    <Label htmlFor={`bp-med-${value}`} className="cursor-pointer text-sm">{value}</Label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {(capabilities?.features.as_notation?.supported
                  || capabilities?.features.input_queue_limit?.supported
                  || capabilities?.features.output_queue_limit?.supported
                  || capabilities?.features.update_delay?.supported) && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-sm font-medium mb-4">{t("content.params.sessionTitle")}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {capabilities?.features.as_notation?.supported && (
                          <div className="space-y-2">
                            <Label className="text-xs">{t("content.params.asNotation")}</Label>
                            {paramsEditing && editParams ? (
                              <Select
                                value={editParams.as_notation || NONE_SENTINEL}
                                onValueChange={(v) => updateParam("as_notation", v === NONE_SENTINEL ? null : v)}
                              >
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NONE_SENTINEL}>{tc("none")}</SelectItem>
                                  {(capabilities.features.as_notation.values || []).map((value) => (
                                    <SelectItem key={value} value={value}>{value}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm font-mono p-2 bg-muted rounded-md">{config?.parameters.as_notation || tc("notSet")}</p>
                            )}
                          </div>
                        )}
                        {capabilities?.features.input_queue_limit?.supported && (
                          <div className="space-y-2">
                            <Label className="text-xs">{t("content.params.inputQueueLimit")}</Label>
                            {paramsEditing && editParams ? (
                              <Input type="number" className="h-9" min={QUEUE_LIMIT_RANGE.min} max={QUEUE_LIMIT_RANGE.max} value={editParams.input_queue_limit ?? ""} onChange={(e) => updateParam("input_queue_limit", optionalNumber(e.target.value))} />
                            ) : (
                              <p className="text-sm font-mono p-2 bg-muted rounded-md">{config?.parameters.input_queue_limit ?? tc("notSet")}</p>
                            )}
                          </div>
                        )}
                        {capabilities?.features.output_queue_limit?.supported && (
                          <div className="space-y-2">
                            <Label className="text-xs">{t("content.params.outputQueueLimit")}</Label>
                            {paramsEditing && editParams ? (
                              <Input type="number" className="h-9" min={QUEUE_LIMIT_RANGE.min} max={QUEUE_LIMIT_RANGE.max} value={editParams.output_queue_limit ?? ""} onChange={(e) => updateParam("output_queue_limit", optionalNumber(e.target.value))} />
                            ) : (
                              <p className="text-sm font-mono p-2 bg-muted rounded-md">{config?.parameters.output_queue_limit ?? tc("notSet")}</p>
                            )}
                          </div>
                        )}
                        {capabilities?.features.update_delay?.supported && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-xs">{t("content.params.updateDelayEstablishWait")}</Label>
                              {paramsEditing && editParams ? (
                                <Input type="number" className="h-9" min={UPDATE_DELAY_ESTABLISH_WAIT_RANGE.min} max={UPDATE_DELAY_ESTABLISH_WAIT_RANGE.max} value={editParams.update_delay_establish_wait ?? ""} onChange={(e) => updateParam("update_delay_establish_wait", optionalNumber(e.target.value))} />
                              ) : (
                                <p className="text-sm font-mono p-2 bg-muted rounded-md">{config?.parameters.update_delay_establish_wait ?? tc("notSet")}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">{t("content.params.updateDelayMaxDelay")}</Label>
                              {paramsEditing && editParams ? (
                                <Input type="number" className="h-9" min={UPDATE_DELAY_MAX_DELAY_RANGE.min} max={UPDATE_DELAY_MAX_DELAY_RANGE.max} value={editParams.update_delay_max_delay ?? ""} onChange={(e) => updateParam("update_delay_max_delay", optionalNumber(e.target.value))} />
                              ) : (
                                <p className="text-sm font-mono p-2 bg-muted rounded-md">{config?.parameters.update_delay_max_delay ?? tc("notSet")}</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Administrative Distance */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium mb-4">{t("content.params.distanceTitle")}</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {([
                        { key: "external" as const, placeholder: "20" },
                        { key: "internal" as const, placeholder: "200" },
                        { key: "local" as const, placeholder: "200" },
                      ] as const).map(({ key, placeholder }) => {
                        const dg = paramsEditing ? editParams?.distance_global : config?.parameters.distance_global;
                        return (
                          <div key={key} className="space-y-2">
                            <Label className="text-xs">{t(`content.params.distance.${key}`)}</Label>
                            {paramsEditing && editParams ? (
                              <Input
                                type="number"
                                min={DISTANCE_RANGE.min}
                                max={DISTANCE_RANGE.max}
                                value={dg?.[key] ?? ""}
                                onChange={(e) => {
                                  setEditParams({
                                    ...editParams,
                                    distance_global: {
                                      ...editParams.distance_global,
                                      [key]: optionalNumber(e.target.value),
                                    },
                                  });
                                }}
                                placeholder={placeholder}
                                className="h-9"
                              />
                            ) : (
                              <p className="text-sm font-mono p-2 bg-muted rounded-md">
                                {dg?.[key] ?? <span className="text-muted-foreground">{t("content.defaultValue", { value: placeholder })}</span>}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="bmp">
              <div className="space-y-4">
                {bmpError && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{bmpError}</div>
                )}
                <div className="flex items-end gap-3">
                  <div className="w-[180px] space-y-1">
                    <Label className="text-xs">{t("content.bmp.mirrorBufferLimit")}</Label>
                    <Input
                      type="number"
                      min={BMP_MIRROR_BUFFER_RANGE.min}
                      max={BMP_MIRROR_BUFFER_RANGE.max}
                      value={bmpBuffer}
                      onChange={(e) => setBmpBuffer(e.target.value)}
                      className="h-9"
                      disabled={!hasWritePermission}
                    />
                  </div>
                  {hasWritePermission && (
                    <Button
                      size="sm"
                      disabled={bmpSaving}
                      onClick={async () => {
                        const loaded = config?.bmp?.mirror_buffer_limit != null ? String(config.bmp.mirror_buffer_limit) : "";
                        if (bmpBuffer.trim() === loaded) return;
                        if (!inRange(bmpBuffer, BMP_MIRROR_BUFFER_RANGE)) {
                          setBmpError(t("form.rangeInvalid", {
                            field: t("content.bmp.mirrorBufferLimit"),
                            min: BMP_MIRROR_BUFFER_RANGE.min,
                            max: BMP_MIRROR_BUFFER_RANGE.max,
                          }));
                          return;
                        }
                        setBmpSaving(true);
                        setBmpError(null);
                        try {
                          const result = await bgpService.setBmpMirrorBufferLimit(optionalNumber(bmpBuffer));
                          const message = failedSaveMessage(result, t("content.saveFailed"));
                          if (message) {
                            setBmpError(message);
                            return;
                          }
                          await loadData(true);
                        } catch (err) {
                          setBmpError(thrownMessage(err, t("content.saveFailed")));
                        } finally {
                          setBmpSaving(false);
                        }
                      }}
                    >
                      {tc("save")}
                    </Button>
                  )}
                </div>
                {hasWritePermission && (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-[140px] space-y-1">
                      <Label className="text-xs">{tc("name")}</Label>
                      <Input value={bmpName} onChange={(e) => setBmpName(e.target.value)} className="h-9" />
                    </div>
                    <div className="w-[160px] space-y-1">
                      <Label className="text-xs">{t("content.address")}</Label>
                      <Input value={bmpAddress} onChange={(e) => setBmpAddress(e.target.value)} className="h-9" />
                    </div>
                    <div className="w-[100px] space-y-1">
                      <Label className="text-xs">{t("neighborModal.port")}</Label>
                      <Input type="number" min={PORT_RANGE.min} max={PORT_RANGE.max} value={bmpPort} onChange={(e) => setBmpPort(e.target.value)} className="h-9" />
                    </div>
                    <div className="w-[100px] space-y-1">
                      <Label className="text-xs">{t("content.bmp.minRetry")}</Label>
                      <Input type="number" min={BMP_MIN_RETRY_RANGE.min} max={BMP_MIN_RETRY_RANGE.max} value={bmpMinRetry} onChange={(e) => setBmpMinRetry(e.target.value)} className="h-9" />
                    </div>
                    <div className="w-[100px] space-y-1">
                      <Label className="text-xs">{t("content.bmp.maxRetry")}</Label>
                      <Input type="number" min={BMP_MAX_RETRY_RANGE.min} max={BMP_MAX_RETRY_RANGE.max} value={bmpMaxRetry} onChange={(e) => setBmpMaxRetry(e.target.value)} className="h-9" />
                    </div>
                    <Button
                      size="sm"
                      disabled={bmpSaving || !bmpName.trim()}
                      onClick={async () => {
                        const targetName = bmpName.trim();
                        if (config?.bmp?.targets.some((target) => target.name === targetName)) {
                          setBmpError(t("content.bmpTargetExists", { name: targetName }));
                          return;
                        }
                        if (!bmpTargetOk(bmpAddress, { port: bmpPort, minRetry: bmpMinRetry, maxRetry: bmpMaxRetry })) return;
                        setBmpSaving(true);
                        setBmpError(null);
                        try {
                          const created: BgpBmpTarget = {
                            name: targetName,
                            address: bmpAddress.trim() || null,
                            port: optionalNumber(bmpPort),
                            min_retry: optionalNumber(bmpMinRetry),
                            max_retry: optionalNumber(bmpMaxRetry),
                            mirror: false,
                            source_interface: null,
                            monitors: [],
                          };
                          const result = await bgpService.saveBmpTarget(null, created);
                          const message = failedSaveMessage(result, t("content.saveFailed"));
                          if (message) {
                            setBmpError(message);
                            return;
                          }
                          setBmpName("");
                          setBmpAddress("");
                          setBmpPort("");
                          setBmpMinRetry("");
                          setBmpMaxRetry("");
                          await loadData(true);
                        } catch (err) {
                          setBmpError(thrownMessage(err, t("content.saveFailed")));
                        } finally {
                          setBmpSaving(false);
                        }
                      }}
                    >
                      {tc("add")}
                    </Button>
                  </div>
                )}
                {(config?.bmp?.targets ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">{tc("notSet")}</p>
                )}
                {(config?.bmp?.targets ?? []).map((target) => (
                  <Card key={target.name}>
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-mono">{target.name}</p>
                        {hasWritePermission && (
                          <Button size="sm" variant="ghost" aria-label={tc("delete")} disabled={bmpSaving} onClick={() => { setBmpError(null); setDeletingBmpTarget(target.name); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          ["address", t("content.address"), target.address ?? "", null],
                          ["port", t("neighborModal.port"), target.port ?? "", PORT_RANGE],
                          ["min_retry", t("content.bmp.minRetry"), target.min_retry ?? "", BMP_MIN_RETRY_RANGE],
                          ["max_retry", t("content.bmp.maxRetry"), target.max_retry ?? "", BMP_MAX_RETRY_RANGE],
                        ] as const).map(([key, label, current, range]) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-xs">{label}</Label>
                            <Input
                              type={range ? "number" : "text"}
                              min={range?.min}
                              max={range?.max}
                              value={String((bmpEdits[target.name]?.[key] ?? current) ?? "")}
                              onChange={(e) => setBmpEdits((prev) => ({
                                ...prev,
                                [target.name]: { ...prev[target.name], [key]: e.target.value },
                              }))}
                              className="h-9"
                              disabled={!hasWritePermission}
                            />
                          </div>
                        ))}
                      </div>
                      {hasWritePermission && (
                        <Button
                          size="sm"
                          disabled={bmpSaving}
                          onClick={async () => {
                            const draft = bmpEdits[target.name] ?? {};
                            const address = draft.address ?? (target.address ?? "");
                            const port = draft.port ?? numberText(target.port);
                            const minRetry = draft.min_retry ?? numberText(target.min_retry);
                            const maxRetry = draft.max_retry ?? numberText(target.max_retry);
                            if (!bmpTargetOk(address, { port, minRetry, maxRetry })) return;
                            setBmpSaving(true);
                            setBmpError(null);
                            try {
                              const updated: BgpBmpTarget = {
                                ...target,
                                address: address.trim() || null,
                                port: optionalNumber(port),
                                min_retry: optionalNumber(minRetry),
                                max_retry: optionalNumber(maxRetry),
                              };
                              const result = await bgpService.saveBmpTarget(target, updated);
                              const message = failedSaveMessage(result, t("content.saveFailed"));
                              if (message) {
                                setBmpError(message);
                                return;
                              }
                              setBmpEdits((prev) => {
                                const next = { ...prev };
                                delete next[target.name];
                                return next;
                              });
                              await loadData(true);
                            } catch (err) {
                              setBmpError(thrownMessage(err, t("content.saveFailed")));
                            } finally {
                              setBmpSaving(false);
                            }
                          }}
                        >
                          {tc("save")}
                        </Button>
                      )}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`bmp-mirror-${target.name}`}
                          checked={target.mirror}
                          disabled={!hasWritePermission || bmpSaving}
                          onCheckedChange={(checked) => {
                            setBmpError(null);
                            setBmpConfirm(() => async () => {
                              setBmpSaving(true);
                              setBmpError(null);
                              try {
                                const result = await bgpService.saveBmpTarget(target, { ...target, mirror: checked === true });
                                const message = failedSaveMessage(result, t("content.saveFailed"));
                                if (message) {
                                  setBmpError(message);
                                  return;
                                }
                                await loadData(true);
                                setBmpConfirm(null);
                              } catch (err) {
                                setBmpError(thrownMessage(err, t("content.saveFailed")));
                              } finally {
                                setBmpSaving(false);
                              }
                            });
                          }}
                        />
                        <Label htmlFor={`bmp-mirror-${target.name}`}>{t("content.bmp.mirror")}</Label>
                      </div>
                      {capabilities?.features.bmp?.source_interface && (
                        <div className="space-y-1">
                          <Label className="text-xs">{t("content.bmp.sourceInterface")}</Label>
                          <InterfaceSelect
                            value={target.source_interface || ""}
                            disabled={!hasWritePermission || bmpSaving}
                            noneOption={{ label: tc("none"), value: "" }}
                            onValueChange={(value) => {
                              setBmpError(null);
                              setBmpConfirm(() => async () => {
                                setBmpSaving(true);
                                setBmpError(null);
                                try {
                                  const result = await bgpService.setBmpSourceInterface(target.name, value || null);
                                  const message = failedSaveMessage(result, t("content.saveFailed"));
                                  if (message) {
                                    setBmpError(message);
                                    return;
                                  }
                                  await loadData(true);
                                  setBmpConfirm(null);
                                } catch (err) {
                                  setBmpError(thrownMessage(err, t("content.saveFailed")));
                                } finally {
                                  setBmpSaving(false);
                                }
                              });
                            }}
                          />
                        </div>
                      )}
                      {["ipv4-unicast", "ipv6-unicast"].map((afi) => (
                        <div key={afi} className="space-y-2">
                          <p className="text-xs text-muted-foreground">{formatAfi(afi)}</p>
                          <div className="flex flex-wrap gap-4">
                            {(capabilities?.features.bmp?.monitor_policies ?? []).map((policy) => (
                              <div key={`${afi}-${policy}`} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`bmp-${target.name}-${afi}-${policy}`}
                                  checked={target.monitors.some((item) => item.afi === afi && item.policy === policy)}
                                  disabled={!hasWritePermission || bmpSaving}
                                  onCheckedChange={(checked) => {
                                    setBmpError(null);
                                    setBmpConfirm(() => async () => {
                                      setBmpSaving(true);
                                      setBmpError(null);
                                      try {
                                        const result = await bgpService.setBmpMonitor(target.name, afi, policy, checked === true);
                                        const message = failedSaveMessage(result, t("content.saveFailed"));
                                        if (message) {
                                          setBmpError(message);
                                          return;
                                        }
                                        await loadData(true);
                                        setBmpConfirm(null);
                                      } catch (err) {
                                        setBmpError(thrownMessage(err, t("content.saveFailed")));
                                      } finally {
                                        setBmpSaving(false);
                                      }
                                    });
                                  }}
                                />
                                <Label htmlFor={`bmp-${target.name}-${afi}-${policy}`}>{policy}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <BgpNeighborModal
        open={neighborModalOpen}
        onOpenChange={(open) => {
          setNeighborModalOpen(open);
          if (!open) setEditingNeighbor(null);
        }}
        existingNeighbor={editingNeighbor}
        peerGroups={config?.peer_groups.map((pg) => pg.name) ?? []}
        configuredAddresses={config?.neighbors.map((n) => n.address) ?? []}
        capabilities={capabilities}
        routeMapNames={routeMapNames}
        bfdProfileNames={bfdProfileNames}
        onSubmit={editingNeighbor ? handleUpdateNeighbor : handleCreateNeighbor}
      />

      <DeleteBgpNeighborModal
        open={!!deletingNeighbor}
        onOpenChange={(open) => { if (!open) setDeletingNeighbor(null); }}
        neighborAddress={deletingNeighbor ?? ""}
        onConfirm={handleDeleteNeighbor}
      />

      <BgpPeerGroupModal
        open={peerGroupModalOpen}
        onOpenChange={(open) => {
          setPeerGroupModalOpen(open);
          if (!open) setEditingPeerGroup(null);
        }}
        existingPeerGroup={editingPeerGroup}
        configuredNames={config?.peer_groups.map((pg) => pg.name) ?? []}
        capabilities={capabilities}
        routeMapNames={routeMapNames}
        bfdProfileNames={bfdProfileNames}
        onSubmit={editingPeerGroup ? handleUpdatePeerGroup : handleCreatePeerGroup}
      />

      <DeleteBgpPeerGroupModal
        open={!!deletingPeerGroup}
        onOpenChange={(open) => { if (!open) setDeletingPeerGroup(null); }}
        peerGroupName={deletingPeerGroup?.name ?? ""}
        memberCount={deletingPeerGroup?.members ?? 0}
        onConfirm={handleDeletePeerGroup}
      />

      <AlertDialog open={!!pageConfirm} onOpenChange={(open) => { if (!open && !pageConfirmSaving) { setPageConfirm(null); setPageConfirmError(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.bmp.applyChange")}</AlertDialogTitle>
            <AlertDialogDescription>{pageConfirm?.label}</AlertDialogDescription>
          </AlertDialogHeader>
          {pageConfirmError && <p className="text-sm text-destructive">{pageConfirmError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pageConfirmSaving}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pageConfirmSaving}
              onClick={async (event) => {
                event.preventDefault();
                if (!pageConfirm) return;
                setPageConfirmSaving(true);
                setPageConfirmError(null);
                const ok = await pageConfirm.run();
                setPageConfirmSaving(false);
                if (ok) {
                  setPageConfirm(null);
                  setPageConfirmError(null);
                }
              }}
            >
              {tc("save")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bmpConfirm} onOpenChange={(open) => { if (!open && !bmpSaving) setBmpConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.bmp.applyChange")}</AlertDialogTitle>
          </AlertDialogHeader>
          {bmpError && <p className="text-sm text-destructive">{bmpError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bmpSaving}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={bmpSaving}
              onClick={async (event) => {
                event.preventDefault();
                const run = bmpConfirm;
                if (!run) return;
                await run();
              }}
            >
              {tc("save")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deletingBmpTarget} onOpenChange={(open) => { if (!open && !bmpSaving) setDeletingBmpTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.bmp.deleteTarget")}</AlertDialogTitle>
            <AlertDialogDescription>{deletingBmpTarget}</AlertDialogDescription>
          </AlertDialogHeader>
          {bmpError && <p className="text-sm text-destructive">{bmpError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bmpSaving}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={bmpSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (event) => {
                event.preventDefault();
                if (!deletingBmpTarget) return;
                setBmpSaving(true);
                setBmpError(null);
                try {
                  const result = await bgpService.deleteBmpTarget(deletingBmpTarget);
                  const message = failedSaveMessage(result, t("content.saveFailed"));
                  if (message) {
                    setBmpError(message);
                    return;
                  }
                  setDeletingBmpTarget(null);
                  await loadData(true);
                } catch (err) {
                  setBmpError(thrownMessage(err, t("content.saveFailed")));
                } finally {
                  setBmpSaving(false);
                }
              }}
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
