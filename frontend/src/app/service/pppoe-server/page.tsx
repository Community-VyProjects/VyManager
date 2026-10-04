"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Lock,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Server,
  Network,
  Key,
  User,
  Activity,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Save,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useColumnVisibility, type ColumnDef } from "@/hooks/useColumnVisibility";
import { ColumnToggleButton } from "@/components/column-toggle/ColumnToggleButton";
import { SessionLabelRegistryDialog } from "@/components/pppoe-server/SessionLabelRegistryDialog";
import {
  pppoeServerService,
  type PPPoEConfigResponse,
  type PPPoECapabilities,
  type PPPoEInterface,
  type PPPoELocalUser,
  type PPPoERadiusServer,
  type PPPoEIPv4Pool,
  type PPPoEIPv6Pool,
  type PPPoESession,
  type PPPoESessionLabelDefinition,
  type PPPoESessionLabelRule,
} from "@/lib/api/pppoe-server";
import { usePermissions } from "@/hooks/usePermissions";
import { useDashboardSSE } from "@/hooks/useDashboardSSE";
import { FeatureGroup } from "@/lib/api/user-management";
import {
  DeleteConfirmModal,
  GeneralSettingsModal,
  AuthSettingsModal,
  LocalUserModal,
  RadiusServerModal,
  RadiusSettingsModal,
  IPPoolModal,
  IPv6PoolModal,
  InterfaceModal,
  PPPOptionsModal,
  AdvancedSettingsModal,
  PPPoEStatsChart,
} from "@/components/pppoe-server";
import type { PPPoEStatsPoint } from "@/components/pppoe-server/PPPoEStatsChart";

function sessionMetricValue(session: SessionWithRates, field?: string): number {
  if (field === "tx_bytes") return session.tx_bytes ?? 0;
  if (field === "rx_bytes") return session.rx_bytes ?? 0;
  if (field === "txRate") return session.txRate ?? 0;
  if (field === "rxRate") return session.rxRate ?? 0;
  return 0;
}

function sessionLabelMatches(session: SessionWithRates, label: PPPoESessionLabelDefinition): boolean {
  const rules = label.rules;
  if (!rules || rules.type !== "ratio") return false;

  const lhs = sessionMetricValue(session, rules.numerator);
  const rhs = sessionMetricValue(session, rules.denominator);
  const factor = Number(rules.factor ?? 0.10);
  if (!Number.isFinite(factor)) return false;
  if (rhs === 0) return false;

  const ratio = lhs / rhs;
  if (rules.operator === ">") return ratio > factor;
  if (rules.operator === ">=") return ratio >= factor;
  if (rules.operator === "<") return ratio < factor;
  if (rules.operator === "<=") return ratio <= factor;
  return false;
}

function sessionRecognizedLabels(
  session: SessionWithRates,
  labels: PPPoESessionLabelDefinition[],
): PPPoESessionLabelDefinition[] {
  return labels
    .filter((label) => label.enabled !== false)
    .filter((label) => sessionLabelMatches(session, label));
}

function sessionLabelClass(severity?: string): string {
  if (severity === "danger") {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  if (severity === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

const PPPOE_SESSION_COLUMNS: ColumnDef[] = [
  { id: "username", label: "User" },
  { id: "interface", label: "Interface" },
  { id: "ip", label: "IP address" },
  { id: "mtu", label: "MTU" },
  { id: "calling_sid", label: "Calling SID" },
  { id: "uptime", label: "Uptime" },
  { id: "rxRate", label: "RX rate (upload)" },
  { id: "txRate", label: "TX rate (download)" },
  { id: "rx_bytes", label: "RX total (upload)" },
  { id: "tx_bytes", label: "TX total (download)" },
  { id: "labels", label: "Labels" },
];

function PPPoEPageInner() {
  const t = useTranslations("pppoeServer");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const { canRead, canWrite } = usePermissions();
  const hasRead = canRead(FeatureGroup.PPPOE);
  const hasWrite = canWrite(FeatureGroup.PPPOE);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PPPoEConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<PPPoECapabilities | null>(null);
  const [sessions, setSessions] = useState<SessionWithRates[]>([]);
  const [sessionLabels, setSessionLabels] = useState<PPPoESessionLabelDefinition[]>([]);
  const [showLabelEditor, setShowLabelEditor] = useState(false);
  const [labelDraft, setLabelDraft] = useState<PPPoESessionLabelDefinition[]>([]);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [labelSaving, setLabelSaving] = useState(false);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionRefreshing, setSessionRefreshing] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const previousSessionBytes = useRef<Record<string, { rx: number; tx: number; at: number }>>({});
  const [statsHistory, setStatsHistory] = useState<Record<string, PPPoEStatsPoint[]>>({});
  const [selectedStatsKey, setSelectedStatsKey] = useState<string | null>(null);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [minPps, setMinPps] = useState("");
  const [maxPps, setMaxPps] = useState("");
  const [ipv6Filter, setIpv6Filter] = useState<"all" | "yes" | "no">("all");
  const [mtuFilter, setMtuFilter] = useState("");
  const [minRxBytes, setMinRxBytes] = useState("");
  const [maxRxBytes, setMaxRxBytes] = useState("");
  const [minTxBytes, setMinTxBytes] = useState("");
  const [maxTxBytes, setMaxTxBytes] = useState("");
  const [sessionLabelFilter, setSessionLabelFilter] = useState("");
  const [sessionSortField, setSessionSortField] = useState<SessionSortField>("username");
  const [sessionSortDirection, setSessionSortDirection] = useState<"asc" | "desc">("asc");
  const [sessionPage, setSessionPage] = useState(1);
  const sessionPageSize = 50;
  const {
    visibleColumns,
    toggleColumn,
    orderedColumns,
    reorderColumns,
    resetToDefault,
  } = useColumnVisibility("pppoe-session-columns", PPPOE_SESSION_COLUMNS);
  const sessionColumnLabels: Record<string, string> = {
    username: t("sessionColumns.username"),
    interface: t("sessionColumns.interface"),
    ip: t("sessionColumns.ip"),
    mtu: t("sessionColumns.mtu"),
    calling_sid: t("sessionColumns.callingSid"),
    uptime: t("sessionColumns.uptime"),
    rxRate: t("sessionColumns.rxRate"),
    txRate: t("sessionColumns.txRate"),
    rx_bytes: t("sessionColumns.rxBytes"),
    tx_bytes: t("sessionColumns.txBytes"),
    labels: t("sessionColumns.labels"),
  };
  const translatedColumns = orderedColumns.map((column) => ({ ...column, label: sessionColumnLabels[column.id] ?? column.label }));
  const [activeTab, setActiveTab] = useState("overview");

  // Modal state
  const [showGeneralModal, setShowGeneralModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPPPOptionsModal, setShowPPPOptionsModal] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [showRadiusSettingsModal, setShowRadiusSettingsModal] = useState(false);

  const [showLocalUserModal, setShowLocalUserModal] = useState(false);
  const [editingLocalUser, setEditingLocalUser] = useState<PPPoELocalUser | null>(null);

  const [showRadiusServerModal, setShowRadiusServerModal] = useState(false);
  const [editingRadiusServer, setEditingRadiusServer] = useState<PPPoERadiusServer | null>(null);

  const [showIPPoolModal, setShowIPPoolModal] = useState(false);
  const [editingIPPool, setEditingIPPool] = useState<PPPoEIPv4Pool | null>(null);

  const [showIPv6PoolModal, setShowIPv6PoolModal] = useState(false);
  const [editingIPv6Pool, setEditingIPv6Pool] = useState<PPPoEIPv6Pool | null>(null);

  const [showInterfaceModal, setShowInterfaceModal] = useState(false);
  const [editingInterface, setEditingInterface] = useState<PPPoEInterface | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    name: string;
    onDelete: () => Promise<import("@/lib/api/pppoe-server").VyOSResponse>;
    warning?: string;
    actionLabel?: string;
    actionVerb?: string;
    isReset?: boolean;
  } | null>(null);

  const fetchConfig = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        pppoeServerService.getConfig(refresh),
        pppoeServerService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadPppoeConfig"));
    } finally {
      setLoading(false);
    }
  };

  const applySessions = (response: { sessions: PPPoESession[]; total: number }) => {
    const now = Date.now();
    const nextSessions = response.sessions.map((session) => {
      const key = `${session.interface}:${session.username}:${session.calling_sid ?? ""}`;
      const previous = previousSessionBytes.current[key];
      const elapsed = previous ? (now - previous.at) / 1000 : 0;
      const result: SessionWithRates = { ...session };
      if (previous && elapsed > 0) {
        result.rxRate = Math.max(0, (session.rx_bytes - previous.rx) * 8 / elapsed);
        result.txRate = Math.max(0, (session.tx_bytes - previous.tx) * 8 / elapsed);
      }
      result.rxPps = session.rx_pps ?? undefined;
      result.txPps = session.tx_pps ?? undefined;
      previousSessionBytes.current[key] = { rx: session.rx_bytes, tx: session.tx_bytes, at: now };
      return result;
    });
    setSessions(nextSessions);
    setSessionTotal(response.total);
    setStatsHistory((previous) => {
      const next = { ...previous };
      for (const session of nextSessions) {
        const key = `${session.interface}:${session.username}:${session.calling_sid ?? ""}`;
        const point: PPPoEStatsPoint = {
          timestamp: now,
          rxRate: session.rxRate ?? 0,
          txRate: session.txRate ?? 0,
          rxPps: session.rxPps ?? 0,
          txPps: session.txPps ?? 0,
          rxBytes: session.rx_bytes,
          txBytes: session.tx_bytes,
        };
        next[key] = [...(next[key] ?? []), point]
          .filter((item) => item.timestamp >= now - 120_000)
          .slice(-120);
      }
      return next;
    });
    setSessionPage((page) => Math.min(page, Math.max(1, Math.ceil(nextSessions.length / sessionPageSize))));
  };

  const fetchSessions = async () => {
    try {
      setSessionRefreshing(true);
      setSessionError(null);
      const response = await pppoeServerService.getSessions(500);
      applySessions(response);
      setSessionLoading(false);
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : t("errors.loadSessions"));
      setSessionLoading(false);
    } finally {
      setSessionRefreshing(false);
    }
  };

  const liveSessions = hasRead && !sessionPaused;
  const { data: sessionStream, error: sessionStreamError, status: sessionStreamStatus } = useDashboardSSE({
    interests: ["pppoe-sessions"],
    enabled: liveSessions,
  });

  useEffect(() => {
    if (!hasRead) return;
    fetchConfig();
    void pppoeServerService.getSessionLabelDefinitions()
      .then((labels) => {
        setSessionLabels(labels ?? []);
      })
      .catch(() => {
        setSessionLabels([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when read access is known; a language switch re-renders via router.refresh()
  }, [hasRead]);

  useEffect(() => {
    setActiveTab(searchParams.get("tab") ?? "overview");
  }, [searchParams]);

  useEffect(() => {
    if (liveSessions) {
      setSessionLoading(true);
    } else {
      setSessionLoading(false);
    }
  }, [liveSessions]);

  useEffect(() => {
    if (sessionStreamStatus === "error") {
      setSessionLoading(false);
    }
  }, [sessionStreamStatus]);

  useEffect(() => {
    if (!sessionStream.pppoeSessions) return;
    setSessionError(null);
    applySessions(sessionStream.pppoeSessions);
    setSessionLoading(false);
  }, [sessionStream.pppoeSessions]);

  useEffect(() => {
    if (!sessionStreamError || !sessionStreamError.startsWith("pppoe-sessions:")) return;
    setSessionError(sessionStreamError.replace(/^pppoe-sessions:\s*/, "") || t("errors.loadSessions"));
    setSessionLoading(false);
  }, [sessionStreamError, t]);

  const openLabelEditor = () => {
    setLabelDraft(sessionLabels.map((label) => ({ ...label, rules: label.rules ? { ...label.rules } : {} })));
    setLabelError(null);
    setShowLabelEditor(true);
  };

  const saveLabelEditor = async () => {
    try {
      setLabelSaving(true);
      setLabelError(null);
      const sanitized = labelDraft
        .filter((label) => label.code.trim() && label.name.trim())
        .map((label) => ({
          ...label,
          code: label.code.trim(),
          name: label.name.trim(),
          description: label.description?.trim() ?? "",
          severity: label.severity || "info",
          priority: Number(label.priority ?? 10),
          enabled: label.enabled !== false,
          rules: label.rules ?? {},
        }));
      const saved = await pppoeServerService.saveSessionLabelDefinitions(sanitized);
      setSessionLabels(saved ?? []);
      setLabelDraft(saved.map((label) => ({ ...label, rules: label.rules ? { ...label.rules } : {} })));
      setShowLabelEditor(false);
    } catch (err) {
      setLabelError(err instanceof Error ? err.message : t("errors.saveLabels"));
    } finally {
      setLabelSaving(false);
    }
  };

  const addLabelDraft = () => {
    const newLabel: PPPoESessionLabelDefinition = {
      code: `custom-label-${Date.now()}`,
      name: "New label",
      description: "",
      severity: "info",
      priority: 10,
      enabled: true,
      rules: { type: "ratio", numerator: "rx_bytes", denominator: "tx_bytes", operator: ">", factor: 2 },
    };
    setLabelDraft((current) => [...current, newLabel]);
  };

  const removeLabelDraft = (index: number) => {
    setLabelDraft((current) => current.filter((_, i) => i !== index));
  };

  const onSuccess = () => fetchConfig(true);
  const onSessionReset = () => { void fetchSessions(); };
  const sessionKey = (session: SessionWithRates) => `${session.interface}:${session.username}:${session.calling_sid ?? ""}`;

  const parseOptionalNumber = (value: string) => {
    const parsed = Number(value);
    return value.trim() === "" || !Number.isFinite(parsed) ? null : parsed;
  };

  const filteredSessions = sessions.filter((session) => {
    const search = sessionSearch.trim().toLowerCase();
    const haystack = `${session.username} ${session.interface} ${session.ip ?? ""} ${session.ipv6 ?? ""} ${session.calling_sid ?? ""}`.toLowerCase();
    const pps = Math.max(session.rxPps ?? 0, session.txPps ?? 0);
    const minimum = parseOptionalNumber(minPps);
    const maximum = parseOptionalNumber(maxPps);
    const minRx = parseOptionalNumber(minRxBytes);
    const maxRx = parseOptionalNumber(maxRxBytes);
    const minTx = parseOptionalNumber(minTxBytes);
    const maxTx = parseOptionalNumber(maxTxBytes);
    if (search && !haystack.includes(search)) return false;
    if (minimum !== null && pps < minimum) return false;
    if (maximum !== null && pps > maximum) return false;
    if (minRx !== null && session.rx_bytes < minRx) return false;
    if (maxRx !== null && session.rx_bytes > maxRx) return false;
    if (minTx !== null && session.tx_bytes < minTx) return false;
    if (maxTx !== null && session.tx_bytes > maxTx) return false;
    if (ipv6Filter === "yes" && !session.ipv6) return false;
    if (ipv6Filter === "no" && session.ipv6) return false;
    if (mtuFilter && String(session.mtu ?? "") !== mtuFilter.trim()) return false;
    if (sessionLabelFilter && !sessionRecognizedLabels(session, sessionLabels).some((label) => label.name === sessionLabelFilter)) return false;
    return true;
  });

  const sortedSessions = useMemo(() => {
    const dir = sessionSortDirection === "asc" ? 1 : -1;
    const rows = [...filteredSessions];
    rows.sort((a, b) => {
      const left = sessionValue(a, sessionSortField);
      const right = sessionValue(b, sessionSortField);
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * dir;
      }
      const textA = String(left ?? "").toLowerCase();
      const textB = String(right ?? "").toLowerCase();
      return textA.localeCompare(textB) * dir;
    });
    return rows;
  }, [filteredSessions, sessionSortDirection, sessionSortField]);

  const filteredPageCount = Math.max(1, Math.ceil(filteredSessions.length / sessionPageSize));

  const handleSessionSort = (field: SessionSortField) => {
    if (sessionSortField === field) {
      setSessionSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    } else {
      setSessionSortField(field);
      setSessionSortDirection("asc");
    }
  };

  const sessionSortLabel = (field: SessionSortField) => {
    const active = sessionSortField === field;
    return active ? (sessionSortDirection === "asc" ? "▲" : "▼") : "↕";
  };

  const authMode = config?.authentication.mode;
  const isLocalAuth = authMode === "local";
  const totals = config?.totals;

  if (loading && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">{t("loadingConfig")}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-destructive font-medium">{t("errors.loadConfig")}</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchConfig(true)}>
              <RefreshCw className="h-4 w-4 mr-2" /> {tc("retry")}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{t("title")}</h1>
                  {config?.configured ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("configured")}</Badge>
                  ) : (
                    <Badge variant="secondary">{t("notConfigured")}</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{t("subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasWrite && config?.configured && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget({
                    type: t("deleteTypes.pppoeServer"),
                    name: t("deleteServer.name"),
                    onDelete: () => pppoeServerService.deletePPPoEServer(),
                    warning: t("deleteServer.warning"),
                  })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("deleteServer.button")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => fetchConfig(true)} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                {tc("refresh")}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("stats.connectedClients")}</p>
                  <p className="font-semibold">{sessionTotal}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                {isLocalAuth ? (
                  <User className="h-4 w-4 text-orange-500" />
                ) : (
                  <Server className="h-4 w-4 text-purple-500" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground">{isLocalAuth ? t("stats.localUsers") : t("stats.radiusServers")}</p>
                  <p className="font-semibold">{isLocalAuth ? (totals?.local_users ?? 0) : (totals?.radius_servers ?? 0)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("stats.ipPools")}</p>
                  <p className="font-semibold">{totals?.client_ip_pools ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-cyan-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("stats.ipv6Pools")}</p>
                  <p className="font-semibold">{totals?.client_ipv6_pools ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("stats.interfaces")}</p>
                  <p className="font-semibold">{totals?.interfaces ?? 0}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="px-6 pt-4 border-b">
              <TabsList>
                <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
                <TabsTrigger value="sessions">{t("tabs.sessions")}</TabsTrigger>
                <TabsTrigger value="interfaces">{t("tabs.interfaces")}</TabsTrigger>
                <TabsTrigger value="auth">{t("tabs.authentication")}</TabsTrigger>
                <TabsTrigger value="pools">{t("tabs.ipPools")}</TabsTrigger>
                <TabsTrigger value="ipv6pools">{t("tabs.ipv6Pools")}</TabsTrigger>
                <TabsTrigger value="ppp-options">{t("tabs.pppOptions")}</TabsTrigger>
                <TabsTrigger value="advanced">{t("tabs.advanced")}</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="p-6">

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0">
                  <div className="grid grid-cols-2 gap-6">
                    <Card className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{t("overview.generalSettings")}</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowGeneralModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> {tc("edit")}
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <InfoRow label={tc("description")} value={config?.description} />
                        <InfoRow label={t("overview.accessConcentrator")} value={config?.access_concentrator} />
                        <InfoRow label={t("overview.serviceName")} value={config?.service_name} />
                        <InfoRow label={t("overview.gatewayAddresses")} value={(config?.gateway_addresses || []).join(", ")} />
                        <InfoRow label={t("overview.nameServers")} value={(config?.name_servers || []).join(", ")} />
                        <InfoRow label={t("overview.winsServers")} value={(config?.wins_servers || []).join(", ")} />
                        <InfoRow label="MTU" value={config?.mtu} />
                        <InfoRow label={t("overview.maxSessions")} value={config?.max_concurrent_sessions} />
                        <InfoRow label={t("overview.threads")} value={config?.thread_count} />
                        <InfoRow label={t("overview.defaultPool")} value={config?.default_pool} />
                        <InfoRow label={t("overview.defaultIpv6Pool")} value={config?.default_ipv6_pool} />
                        <InfoRow label={t("overview.sessionControl")} value={config?.session_control} />
                      </div>
                    </Card>

                    <Card className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{t("pppOptions.title")}</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowPPPOptionsModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> {tc("edit")}
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="IPv4" value={config?.ppp_options.ipv4} />
                        <InfoRow label="IPv6" value={config?.ppp_options.ipv6} />
                        <InfoRow label="MPPE" value={config?.ppp_options.mppe} />
                        <InfoRow label={t("pppOptions.minMtu")} value={config?.ppp_options.min_mtu} />
                        <InfoRow label="MRU" value={config?.ppp_options.mru} />
                        <InfoRow label={t("pppOptions.lcpFailure")} value={config?.ppp_options.lcp_echo_failure} />
                        <InfoRow label={t("pppOptions.lcpInterval")} value={config?.ppp_options.lcp_echo_interval} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("pppOptions.disableCcp")}</span>
                          <Badge variant={config?.ppp_options.disable_ccp ? "default" : "secondary"}>
                            {config?.ppp_options.disable_ccp ? t("yes") : t("no")}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="sessions" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{t("sessions.title")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {sessionPaused ? t("sessions.paused") : t("sessions.live")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t("sessions.count", { count: String(sessionTotal) })}</span>
                      <Button variant="outline" size="sm" onClick={() => setSessionPaused((paused) => !paused)}>
                        {sessionPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                        {sessionPaused ? t("sessions.resume") : t("sessions.pause")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void fetchSessions()} disabled={sessionRefreshing}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", sessionRefreshing && "animate-spin")} />
                        {tc("refresh")}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-4 rounded-md border bg-muted/20 p-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input value={sessionSearch} onChange={(event) => setSessionSearch(event.target.value)} placeholder={t("sessions.searchPlaceholder")} className="h-8 w-52 pl-8 text-xs" />
                    </div>
                    {hasWrite && (
                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={openLabelEditor}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> {t("sessions.labels")}
                      </Button>
                    )}
                    <Input value={minPps} onChange={(event) => setMinPps(event.target.value)} inputMode="numeric" placeholder={t("sessions.minPps")} className="h-8 w-24 text-xs" />
                    <Input value={maxPps} onChange={(event) => setMaxPps(event.target.value)} inputMode="numeric" placeholder={t("sessions.maxPps")} className="h-8 w-24 text-xs" />
                    <select value={ipv6Filter} onChange={(event) => setIpv6Filter(event.target.value as "all" | "yes" | "no")} className="h-8 rounded-md border bg-background px-2 text-xs">
                      <option value="all">{t("sessions.ipv6All")}</option>
                      <option value="yes">{t("sessions.ipv6Present")}</option>
                      <option value="no">{t("sessions.ipv6Absent")}</option>
                    </select>
                    <Input value={mtuFilter} onChange={(event) => setMtuFilter(event.target.value)} inputMode="numeric" placeholder="MTU" className="h-8 w-20 text-xs" />
                    <Input value={minRxBytes} onChange={(event) => setMinRxBytes(event.target.value)} inputMode="numeric" placeholder={t("sessions.minRxBytes")} className="h-8 w-32 text-xs" />
                    <Input value={maxRxBytes} onChange={(event) => setMaxRxBytes(event.target.value)} inputMode="numeric" placeholder={t("sessions.maxRxBytes")} className="h-8 w-32 text-xs" />
                    <Input value={minTxBytes} onChange={(event) => setMinTxBytes(event.target.value)} inputMode="numeric" placeholder={t("sessions.minTxBytes")} className="h-8 w-32 text-xs" />
                    <Input value={maxTxBytes} onChange={(event) => setMaxTxBytes(event.target.value)} inputMode="numeric" placeholder={t("sessions.maxTxBytes")} className="h-8 w-32 text-xs" />
                    <select value={sessionLabelFilter} onChange={(event) => setSessionLabelFilter(event.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
                      <option value="">{t("sessions.labelsAll")}</option>
                      {sessionLabels.map((label) => <option key={label.code} value={label.name}>{label.name}</option>)}
                    </select>
                    <ColumnToggleButton columns={translatedColumns} visibleColumns={visibleColumns} onToggle={toggleColumn} onReorder={reorderColumns} onReset={resetToDefault} />
                    {(sessionSearch || minPps || maxPps || ipv6Filter !== "all" || mtuFilter || minRxBytes || maxRxBytes || minTxBytes || maxTxBytes || sessionLabelFilter) && (
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setSessionSearch(""); setMinPps(""); setMaxPps(""); setIpv6Filter("all"); setMtuFilter(""); setMinRxBytes(""); setMaxRxBytes(""); setMinTxBytes(""); setMaxTxBytes(""); setSessionLabelFilter(""); }}>
                        <X className="h-3.5 w-3.5 mr-1" /> {t("sessions.clear")}
                      </Button>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">{t("sessions.matching", { count: String(filteredSessions.length) })}</span>
                  </div>
                  {sessionError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                      {sessionError}
                    </div>
                  ) : sessions.length === 0 ? (
                    <EmptyState icon={Activity} label={sessionLoading ? t("sessions.loading") : t("sessions.empty")} />
                  ) : filteredSessions.length === 0 ? (
                    <EmptyState icon={Search} label={t("sessions.noMatch")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {translatedColumns.filter((column) => visibleColumns.has(column.id)).map((column) => (
                            <TableHead key={column.id} className={column.id.includes("bytes") ? "text-right" : undefined}>
                              {column.id === "labels" ? column.label : <button className="font-medium" onClick={() => handleSessionSort(column.id as SessionSortField)}>{column.label} {sessionSortLabel(column.id as SessionSortField)}</button>}
                            </TableHead>
                          ))}
                          <TableHead className="text-right">{tc("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedSessions.slice((sessionPage - 1) * sessionPageSize, sessionPage * sessionPageSize).map((session) => {
                          return (
                            <TableRow key={`${session.interface}:${session.username}:${session.calling_sid ?? ""}`}>
                              {orderedColumns.filter((column) => visibleColumns.has(column.id)).map((column) => {
                                const labels = sessionRecognizedLabels(session, sessionLabels);
                                if (column.id === "username") return <TableCell key={column.id} className="font-medium">{session.username}</TableCell>;
                                if (column.id === "interface") return <TableCell key={column.id} className="font-mono">{session.interface}</TableCell>;
                                if (column.id === "ip") return <TableCell key={column.id} className="font-mono"><div>{session.ip || "-"}</div>{session.ipv6 && <div className="text-xs text-muted-foreground">{session.ipv6}</div>}{session.ipv6_delegated && <div className="text-xs text-muted-foreground">PD: {session.ipv6_delegated}</div>}</TableCell>;
                                if (column.id === "mtu") return <TableCell key={column.id}>{session.mtu || "-"}</TableCell>;
                                if (column.id === "calling_sid") return <TableCell key={column.id} className="font-mono text-xs">{session.calling_sid || "-"}</TableCell>;
                                if (column.id === "uptime") return <TableCell key={column.id}>{session.uptime || "-"}</TableCell>;
                                if (column.id === "rxRate") return <TableCell key={column.id}>{formatRate(session.rxRate)} <span className="text-xs text-muted-foreground">/ {formatPps(session.rxPps)}</span></TableCell>;
                                if (column.id === "txRate") return <TableCell key={column.id}>{formatRate(session.txRate)} <span className="text-xs text-muted-foreground">/ {formatPps(session.txPps)}</span></TableCell>;
                                if (column.id === "rx_bytes") return <TableCell key={column.id} className="text-right whitespace-nowrap">{formatBytes(session.rx_bytes)} RX</TableCell>;
                                if (column.id === "tx_bytes") return <TableCell key={column.id} className="text-right whitespace-nowrap">{formatBytes(session.tx_bytes)} TX</TableCell>;
                                return (
                                  <TableCell key={column.id}>
                                    {labels.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {labels.map((label) => (
                                          <span
                                            key={label.code}
                                            className={cn(
                                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                              sessionLabelClass(label.severity),
                                            )}
                                          >
                                            {label.name}
                                          </span>
                                        ))}
                                      </div>
                                    ) : "-"}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-right whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title={t("sessions.graphTitle", { username: session.username })}
                                  onClick={() => setSelectedStatsKey(sessionKey(session))}
                                >
                                  <Activity className="h-4 w-4" />
                                </Button>
                              {hasWrite && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-destructive/10"
                                    title={t("sessions.resetTitle", { username: session.username })}
                                    onClick={() => setDeleteTarget({
                                      type: t("deleteTypes.pppoeSession"),
                                      name: session.username,
                                      onDelete: () => pppoeServerService.resetSession(session.username),
                                      actionLabel: t("sessions.resetLabel"),
                                      actionVerb: t("sessions.resetVerb"),
                                      warning: t("sessions.resetWarning"),
                                      isReset: true,
                                    })}
                                  >
                                    <RotateCcw className="h-4 w-4 text-destructive" />
                                  </Button>
                              )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                  {filteredSessions.length > sessionPageSize && (
                    <div className="flex items-center justify-between border-t mt-3 pt-3">
                      <span className="text-xs text-muted-foreground">
                        {t("sessions.pageOf", { page: String(sessionPage), total: String(Math.max(1, Math.ceil(filteredSessions.length / sessionPageSize))) })}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSessionPage((page) => Math.max(1, page - 1))}
                          disabled={sessionPage === 1}
                          title={t("sessions.previousPage")}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSessionPage((page) => Math.min(filteredPageCount, page + 1))}
                          disabled={sessionPage === filteredPageCount}
                          title={t("sessions.nextPage")}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Interfaces Tab */}
                <TabsContent value="interfaces" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("interfaces.title")}</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingInterface(null); setShowInterfaceModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("interfaces.add")}
                      </Button>
                    )}
                  </div>
                  {(config?.interfaces.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label={t("interfaces.empty")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("interfaces.interface")}</TableHead>
                          <TableHead>{tc("shown.vlans")}</TableHead>
                          <TableHead>{t("interfaces.vlanMon")}</TableHead>
                          {(capabilities?.features.vpp_cp ?? false) && <TableHead>VPP-CP</TableHead>}
                          <TableHead>{t("interfaces.combined")}</TableHead>
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.interfaces.map((iface) => (
                          <TableRow key={iface.interface} className="group">
                            <TableCell className="font-medium font-mono">{iface.interface}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(iface.vlans || []).slice(0, 4).map((v) => (
                                  <Badge key={v} variant="secondary" className="text-xs font-mono">{v}</Badge>
                                ))}
                                {(iface.vlans || []).length > 4 && (
                                  <Badge variant="secondary" className="text-xs">+{(iface.vlans || []).length - 4}</Badge>
                                )}
                                {(iface.vlans || []).length === 0 && "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {iface.vlan_mon ? (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("yes")}</Badge>
                              ) : "-"}
                            </TableCell>
                            {(capabilities?.features.vpp_cp ?? false) && (
                              <TableCell>
                                {iface.vpp_cp ? (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("yes")}</Badge>
                                ) : "-"}
                              </TableCell>
                            )}
                            <TableCell>{iface.combined || "-"}</TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingInterface(iface); setShowInterfaceModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: t("deleteTypes.interface"),
                                    name: iface.interface,
                                    onDelete: () => pppoeServerService.deleteInterface(iface.interface),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* Authentication Tab */}
                <TabsContent value="auth" className="mt-0">
                  <div className="mb-6">
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium">{t("auth.mode")}</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowAuthModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> {tc("edit")}
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-sm">
                          {config?.authentication.mode || tc("notSet")}
                        </Badge>
                        {(config?.authentication.protocols || []).length > 0 && (
                          <div className="flex gap-1">
                            {(config?.authentication.protocols || []).map((p) => (
                              <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {isLocalAuth ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{t("auth.localUsers")}</h3>
                        {hasWrite && (
                          <Button size="sm" onClick={() => { setEditingLocalUser(null); setShowLocalUserModal(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> {t("auth.addUser")}
                          </Button>
                        )}
                      </div>
                      {(config?.authentication.local_users.length ?? 0) === 0 ? (
                        <EmptyState icon={User} label={t("auth.noLocalUsers")} />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("auth.username")}</TableHead>
                              <TableHead>{t("auth.staticIp")}</TableHead>
                              <TableHead>{t("auth.rateDown")}</TableHead>
                              <TableHead>{t("auth.rateUp")}</TableHead>
                              <TableHead>{tc("status")}</TableHead>
                              {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {config?.authentication.local_users.map((user) => (
                              <TableRow key={user.username} className="group">
                                <TableCell className="font-medium font-mono">{user.username}</TableCell>
                                <TableCell>
                                  {user.static_ip ? (
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{user.static_ip}</code>
                                  ) : "-"}
                                </TableCell>
                                <TableCell>{user.rate_limit?.download || "-"}</TableCell>
                                <TableCell>{user.rate_limit?.upload || "-"}</TableCell>
                                <TableCell>
                                  {user.disabled ? (
                                    <Badge variant="secondary" className="bg-red-500/10 text-red-600">{tc("disabled")}</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("auth.active")}</Badge>
                                  )}
                                </TableCell>
                                {hasWrite && (
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingLocalUser(user); setShowLocalUserModal(true); }}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                        type: t("deleteTypes.localUser"),
                                        name: user.username,
                                        onDelete: () => pppoeServerService.deleteLocalUser(user.username),
                                      })}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">{t("radius.settingsTitle")}</h3>
                          {hasWrite && (
                            <Button variant="outline" size="sm" onClick={() => setShowRadiusSettingsModal(true)}>
                              <Pencil className="h-3 w-3 mr-1" /> {t("radius.editSettings")}
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <Card className="p-4 space-y-2 text-sm">
                            <h4 className="text-sm font-medium mb-2">{t("radius.general")}</h4>
                            <InfoRow label={t("radius.sourceAddress")} value={config?.authentication.radius?.source_address} />
                            <InfoRow label={t("radius.timeout")} value={config?.authentication.radius?.timeout} />
                            <InfoRow label={t("radius.maxTry")} value={config?.authentication.radius?.max_try} />
                            <InfoRow label={t("radius.nasIdentifier")} value={config?.authentication.radius?.nas_identifier} />
                            <InfoRow label="NAS IP" value={config?.authentication.radius?.nas_ip_address} />
                            <InfoRow label={t("radius.calledSidFormat")} value={config?.authentication.radius?.called_sid_format} />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t("radius.preallocateVif")}</span>
                              <Badge variant={config?.authentication.radius?.preallocate_vif ? "default" : "secondary"}>
                                {config?.authentication.radius?.preallocate_vif ? t("yes") : t("no")}
                              </Badge>
                            </div>
                          </Card>
                          <Card className="p-4 space-y-2 text-sm">
                            <h4 className="text-sm font-medium mb-2">{t("radius.daeRateLimit")}</h4>
                            <InfoRow label={t("radius.daeServer")} value={config?.authentication.radius?.dynamic_author?.server} />
                            <InfoRow label={t("radius.daePort")} value={config?.authentication.radius?.dynamic_author?.port} />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t("radius.rateLimit")}</span>
                              <Badge variant={config?.authentication.radius?.rate_limit?.enable ? "default" : "secondary"}>
                                {config?.authentication.radius?.rate_limit?.enable ? tc("enabled") : tc("disabled")}
                              </Badge>
                            </div>
                            <InfoRow label={t("radius.attribute")} value={config?.authentication.radius?.rate_limit?.attribute} />
                            <InfoRow label={t("radius.multiplier")} value={config?.authentication.radius?.rate_limit?.multiplier} />
                          </Card>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{t("radius.serversTitle")}</h3>
                        {hasWrite && (
                          <Button size="sm" onClick={() => { setEditingRadiusServer(null); setShowRadiusServerModal(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> {t("radius.addServer")}
                          </Button>
                        )}
                      </div>
                      {(config?.authentication.radius?.servers?.length ?? 0) === 0 ? (
                        <EmptyState icon={Server} label={t("radius.noServers")} />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("radius.address")}</TableHead>
                              <TableHead>{t("radius.port")}</TableHead>
                              <TableHead>{t("radius.acctPort")}</TableHead>
                              <TableHead>{t("radius.priority")}</TableHead>
                              <TableHead>{tc("status")}</TableHead>
                              {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(config?.authentication.radius?.servers ?? []).map((srv) => (
                              <TableRow key={srv.address} className="group">
                                <TableCell>
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{srv.address}</code>
                                </TableCell>
                                <TableCell>{srv.port || "1812"}</TableCell>
                                <TableCell>{srv.acct_port || "1813"}</TableCell>
                                <TableCell>{srv.priority || "-"}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {srv.disabled ? (
                                      <Badge variant="secondary" className="bg-red-500/10 text-red-600">{tc("disabled")}</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("auth.active")}</Badge>
                                    )}
                                    {srv.backup && <Badge variant="outline">{t("radius.backup")}</Badge>}
                                  </div>
                                </TableCell>
                                {hasWrite && (
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRadiusServer(srv); setShowRadiusServerModal(true); }}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                        type: t("deleteTypes.radiusServer"),
                                        name: srv.address,
                                        onDelete: () => pppoeServerService.deleteRadiusServer(srv.address),
                                      })}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* IP Pools Tab */}
                <TabsContent value="pools" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("pools.ipv4Title")}</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingIPPool(null); setShowIPPoolModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("pools.addPool")}
                      </Button>
                    )}
                  </div>
                  {(config?.client_ip_pools.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label={t("pools.noIpv4Pools")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("pools.ranges")}</TableHead>
                          <TableHead>{t("pools.nextPool")}</TableHead>
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.client_ip_pools.map((pool) => (
                          <TableRow key={pool.name} className="group">
                            <TableCell className="font-medium">{pool.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(pool.ranges || []).map((r) => (
                                  <Badge key={r} variant="secondary" className="font-mono text-xs">{r}</Badge>
                                ))}
                                {(pool.ranges || []).length === 0 && "-"}
                              </div>
                            </TableCell>
                            <TableCell>{pool.next_pool || "-"}</TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingIPPool(pool); setShowIPPoolModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: t("deleteTypes.ipPool"),
                                    name: pool.name,
                                    onDelete: () => pppoeServerService.deleteIPPool(pool.name),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* IPv6 Pools Tab */}
                <TabsContent value="ipv6pools" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("pools.ipv6Title")}</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingIPv6Pool(null); setShowIPv6PoolModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("pools.addPool")}
                      </Button>
                    )}
                  </div>
                  {(config?.client_ipv6_pools.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label={t("pools.noIpv6Pools")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("pools.prefixes")}</TableHead>
                          <TableHead>{t("pools.delegates")}</TableHead>
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.client_ipv6_pools.map((pool) => (
                          <TableRow key={pool.name} className="group">
                            <TableCell className="font-medium">{pool.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(pool.prefixes || []).map((p, i) => (
                                  <Badge key={i} variant="outline" className="text-xs font-mono">
                                    {p.prefix}{p.mask ? ` /${p.mask}` : ""}
                                  </Badge>
                                ))}
                                {(!pool.prefixes || pool.prefixes.length === 0) && "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(pool.delegates || []).map((d, i) => (
                                  <Badge key={i} variant="outline" className="text-xs font-mono">
                                    {d.prefix}{d.delegation_prefix ? ` /${d.delegation_prefix}` : ""}
                                  </Badge>
                                ))}
                                {(!pool.delegates || pool.delegates.length === 0) && "-"}
                              </div>
                            </TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingIPv6Pool(pool); setShowIPv6PoolModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: t("deleteTypes.ipv6Pool"),
                                    name: pool.name,
                                    onDelete: () => pppoeServerService.deleteIPv6Pool(pool.name),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* PPP Options Tab */}
                <TabsContent value="ppp-options" className="mt-0">
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">{t("pppOptions.title")}</h4>
                      {hasWrite && (
                        <Button variant="ghost" size="sm" onClick={() => setShowPPPOptionsModal(true)}>
                          <Pencil className="h-3 w-3 mr-1" /> {tc("edit")}
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("pppOptions.ipNegotiation")}</h5>
                        <InfoRow label="IPv4" value={config?.ppp_options.ipv4} />
                        <InfoRow label="IPv6" value={config?.ppp_options.ipv6} />
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">{t("pppOptions.encryption")}</h5>
                        <InfoRow label="MPPE" value={config?.ppp_options.mppe} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("pppOptions.disableCcp")}</span>
                          <Badge variant={config?.ppp_options.disable_ccp ? "default" : "secondary"}>
                            {config?.ppp_options.disable_ccp ? t("yes") : t("no")}
                          </Badge>
                        </div>
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">MTU/MRU</h5>
                        <InfoRow label={t("pppOptions.minMtu")} value={config?.ppp_options.min_mtu} />
                        <InfoRow label="MRU" value={config?.ppp_options.mru} />
                        <InfoRow label={t("pppOptions.interfaceCache")} value={config?.ppp_options.interface_cache} />
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("pppOptions.lcpEcho")}</h5>
                        <InfoRow label={t("pppOptions.failure")} value={config?.ppp_options.lcp_echo_failure} />
                        <InfoRow label={t("pppOptions.interval")} value={config?.ppp_options.lcp_echo_interval} />
                        <InfoRow label={t("pppOptions.timeout")} value={config?.ppp_options.lcp_echo_timeout} />
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">{t("pppOptions.ipv6InterfaceIds")}</h5>
                        <InfoRow label={t("pppOptions.interfaceId")} value={config?.ppp_options.ipv6_interface_id} />
                        <InfoRow label={t("pppOptions.peerInterfaceId")} value={config?.ppp_options.ipv6_peer_interface_id} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("pppOptions.acceptPeerId")}</span>
                          <Badge variant={config?.ppp_options.ipv6_accept_peer_interface_id ? "default" : "secondary"}>
                            {config?.ppp_options.ipv6_accept_peer_interface_id ? t("yes") : t("no")}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* Advanced Tab */}
                <TabsContent value="advanced" className="mt-0">
                  <Card className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">{t("advanced.title")}</h4>
                      {hasWrite && (
                        <Button variant="ghost" size="sm" onClick={() => setShowAdvancedModal(true)}>
                          <Pencil className="h-3 w-3 mr-1" /> {tc("edit")}
                        </Button>
                      )}
                    </div>

                    {/* PADO Delays */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("advanced.padoDelays")}</h5>
                      {(config?.pado_delays || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("advanced.noPadoDelays")}</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("advanced.delay")}</TableHead>
                              <TableHead>{t("advanced.sessions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(config?.pado_delays || []).map((d) => (
                              <TableRow key={d.delay}>
                                <TableCell className="font-mono text-sm">{d.delay}</TableCell>
                                <TableCell>{d.sessions || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("advanced.limits")}</h5>
                        <InfoRow label={t("advanced.burst")} value={config?.limits?.burst} />
                        <InfoRow label={t("advanced.connLimit")} value={config?.limits?.connection_limit} />
                        <InfoRow label={t("advanced.timeout")} value={config?.limits?.timeout} />
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">{t("advanced.logShaper")}</h5>
                        <InfoRow label={t("advanced.logLevel")} value={config?.log?.level} />
                        <InfoRow label={t("advanced.shaperFwmark")} value={config?.shaper?.fwmark} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("advanced.snmpMasterAgent")}</span>
                          <Badge variant={config?.snmp?.master_agent ? "default" : "secondary"}>
                            {config?.snmp?.master_agent ? t("yes") : t("no")}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("advanced.extendedScripts")}</h5>
                        <InfoRow label={t("advanced.onChange")} value={config?.extended_scripts?.on_change} />
                        <InfoRow label={t("advanced.onDown")} value={config?.extended_scripts?.on_down} />
                        <InfoRow label={t("advanced.onPreUp")} value={config?.extended_scripts?.on_pre_up} />
                        <InfoRow label={t("advanced.onUp")} value={config?.extended_scripts?.on_up} />
                      </div>
                    </div>
                  </Card>
                </TabsContent>

              </div>
            </div>
          </Tabs>
        </div>
      </div>

      <Dialog open={!!selectedStatsKey && !!statsHistory[selectedStatsKey]} onOpenChange={(open) => { if (!open) setSelectedStatsKey(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("statsDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("statsDialog.description")}
            </DialogDescription>
          </DialogHeader>
          {selectedStatsKey && statsHistory[selectedStatsKey] && (
            <PPPoEStatsChart points={statsHistory[selectedStatsKey]} />
          )}
        </DialogContent>
      </Dialog>

      <SessionLabelRegistryDialog
        open={showLabelEditor}
        onOpenChange={(open) => {
          setShowLabelEditor(open);
          if (!open) setLabelError(null);
        }}
        draft={labelDraft}
        onDraftChange={setLabelDraft}
        onSave={() => void saveLabelEditor()}
        saving={labelSaving}
        error={labelError}
      />

      {false && <Dialog open={showLabelEditor} onOpenChange={(open) => {
        if (!open) {
          setShowLabelEditor(false);
          setLabelError(null);
        }
      }}>
        <DialogContent className="max-w-6xl border-0 p-0">
          <div className="rounded-xl border border-border/60 bg-background shadow-2xl">
            <DialogHeader className="flex items-center justify-between border-b px-6 py-4">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-semibold tracking-tight">{t("labelRegistry.title")}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {t("legacyLabelEditor.description")}
                </DialogDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowLabelEditor(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <div className="space-y-4 px-6 py-5">
              {labelError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {labelError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>{t("legacyLabelEditor.definitions")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-9 px-4" onClick={addLabelDraft}>
                    <Plus className="h-4 w-4 mr-2" /> {t("legacyLabelEditor.new")}
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 px-4" onClick={() => setShowLabelEditor(false)}>
                    {tc("cancel")}
                  </Button>
                  <Button size="sm" className="h-9 px-5" onClick={() => void saveLabelEditor()} disabled={labelSaving}>
                    {labelSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {labelSaving ? tc("saving") : t("labelRegistry.saveRegistry")}
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border/50 bg-muted/10">
                <div className="grid grid-cols-[minmax(110px,0.9fr)_minmax(140px,1.2fr)_minmax(180px,1.8fr)_minmax(75px,0.7fr)_minmax(110px,1fr)_minmax(80px,0.8fr)_minmax(105px,1fr)_minmax(105px,1fr)_minmax(82px,1fr)_minmax(62px,0.7fr)_52px] gap-2 border-b bg-muted/30 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>{t("labelRegistry.code")}</span>
                  <span>{tc("name")}</span>
                  <span>{tc("description")}</span>
                  <span>{t("labelRegistry.priority")}</span>
                  <span>{t("labelRegistry.severity")}</span>
                  <span>{tc("enabled")}</span>
                  <span>{t("labelRegistry.numerator")}</span>
                  <span>{t("labelRegistry.denominator")}</span>
                  <span>{t("labelRegistry.operator")}</span>
                  <span>{t("labelRegistry.factor")}</span>
                  <span className="text-right">{tc("actions")}</span>
                </div>

                {labelDraft.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-muted-foreground">{t("legacyLabelEditor.noLabels")}</div>
                ) : (
                  <div className="max-h-[55vh] overflow-auto">
                    {labelDraft.map((label, index) => (
                      <div key={`${label.code}-${index}`} className="grid grid-cols-[minmax(110px,0.9fr)_minmax(140px,1.2fr)_minmax(180px,1.8fr)_minmax(75px,0.7fr)_minmax(110px,1fr)_minmax(80px,0.8fr)_minmax(105px,1fr)_minmax(105px,1fr)_minmax(82px,1fr)_minmax(62px,0.7fr)_52px] gap-2 border-b border-border/30 px-4 py-3 last:border-b-0 hover:bg-muted/20">
                        <div className="min-w-0">
                          <Input value={label.code ?? ""} onChange={(event) => setLabelDraft((current) => current.map((item, i) => i === index ? { ...item, code: event.target.value } : item))} className="h-9 text-sm font-medium" />
                        </div>
                        <div className="min-w-0">
                          <Input value={label.name ?? ""} onChange={(event) => setLabelDraft((current) => current.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} className="h-9 text-sm" />
                        </div>
                        <div className="min-w-0">
                          <Input value={label.description ?? ""} onChange={(event) => setLabelDraft((current) => current.map((item, i) => i === index ? { ...item, description: event.target.value } : item))} className="h-9 text-sm" />
                        </div>
                        <div className="min-w-0">
                          <Input value={label.priority ?? 10} type="number" onChange={(event) => setLabelDraft((current) => current.map((item, i) => i === index ? { ...item, priority: Number(event.target.value) } : item))} className="h-9 text-sm" />
                        </div>
                        <div className="min-w-0">
                          <select value={label.severity ?? "info"} onChange={(event) => setLabelDraft((current) => current.map((item, i) => i === index ? { ...item, severity: event.target.value } : item))} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                            <option value="info">{tc("shown.info")}</option>
                            <option value="warning">{tc("shown.warning")}</option>
                            <option value="danger">{tc("shown.danger")}</option>
                          </select>
                        </div>
                        <div className="min-w-0">
                          <select value={label.enabled === false ? "false" : "true"} onChange={(event) => setLabelDraft((current) => current.map((item, i) => i === index ? { ...item, enabled: event.target.value === "true" } : item))} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                            <option value="true">{t("yes")}</option>
                            <option value="false">{t("no")}</option>
                          </select>
                        </div>
                        <div className="min-w-0">
                          <select value={label.rules?.numerator ?? "rx_bytes"} onChange={(event) => setLabelDraft((current) => current.map((item, i) => i === index ? { ...item, rules: { ...(item.rules ?? {}), type: "ratio", numerator: event.target.value as PPPoESessionLabelRule["numerator"] } } : item))} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                            <option value="rx_bytes">{t("legacyLabelEditor.rxBytes")}</option>
                            <option value="tx_bytes">{t("legacyLabelEditor.txBytes")}</option>
                            <option value="rxRate">{t("legacyLabelEditor.rxRate")}</option>
                            <option value="txRate">{t("legacyLabelEditor.txRate")}</option>
                          </select>
                        </div>
                        <div className="min-w-0">
                          <select value={label.rules?.denominator ?? "tx_bytes"} onChange={(event) => setLabelDraft((current) => current.map((item, i) => i === index ? { ...item, rules: { ...(item.rules ?? {}), type: "ratio", denominator: event.target.value as PPPoESessionLabelRule["denominator"] } } : item))} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                            <option value="rx_bytes">{t("legacyLabelEditor.rxBytes")}</option>
                            <option value="tx_bytes">{t("legacyLabelEditor.txBytes")}</option>
                            <option value="rxRate">{t("legacyLabelEditor.rxRate")}</option>
                            <option value="txRate">{t("legacyLabelEditor.txRate")}</option>
                          </select>
                        </div>
                        <div className="min-w-0">
                          <select value={label.rules?.operator ?? ">"} onChange={(event) => setLabelDraft((current) => current.map((item, i) => i === index ? { ...item, rules: { ...(item.rules ?? {}), type: "ratio", operator: event.target.value as PPPoESessionLabelRule["operator"] } } : item))} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                            <option value=">">&gt;</option>
                            <option value=">=">&ge;</option>
                            <option value="<">&lt;</option>
                            <option value="<=">&le;</option>
                          </select>
                        </div>
                        <div className="min-w-0">
                          <Input value={label.rules?.factor ?? 0.1} type="number" step="0.01" min="0" onChange={(event) => setLabelDraft((current) => current.map((item, i) => i === index ? { ...item, rules: { ...(item.rules ?? {}), type: "ratio", factor: Number(event.target.value) } } : item))} className="h-9 text-sm" />
                        </div>
                        <div className="flex items-center justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => removeLabelDraft(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>}

      {/* Modals */}
      {config && (
        <>
          <GeneralSettingsModal
            open={showGeneralModal}
            onOpenChange={setShowGeneralModal}
            onSuccess={onSuccess}
            config={config}
          />
          <AuthSettingsModal
            open={showAuthModal}
            onOpenChange={setShowAuthModal}
            onSuccess={onSuccess}
            currentAuth={config.authentication}
            capabilities={capabilities}
          />
          <PPPOptionsModal
            open={showPPPOptionsModal}
            onOpenChange={setShowPPPOptionsModal}
            onSuccess={onSuccess}
            config={config}
          />
          <AdvancedSettingsModal
            open={showAdvancedModal}
            onOpenChange={setShowAdvancedModal}
            onSuccess={onSuccess}
            config={config}
          />
          <RadiusSettingsModal
            open={showRadiusSettingsModal}
            onOpenChange={setShowRadiusSettingsModal}
            onSuccess={onSuccess}
            currentSettings={config.authentication.radius ?? { servers: [] }}
          />
        </>
      )}

      <LocalUserModal
        open={showLocalUserModal}
        onOpenChange={(open) => { setShowLocalUserModal(open); if (!open) setEditingLocalUser(null); }}
        onSuccess={onSuccess}
        existingUser={editingLocalUser}
      />
      <RadiusServerModal
        open={showRadiusServerModal}
        onOpenChange={(open) => { setShowRadiusServerModal(open); if (!open) setEditingRadiusServer(null); }}
        onSuccess={onSuccess}
        existingServer={editingRadiusServer}
      />
      <IPPoolModal
        open={showIPPoolModal}
        onOpenChange={(open) => { setShowIPPoolModal(open); if (!open) setEditingIPPool(null); }}
        onSuccess={onSuccess}
        existingPool={editingIPPool}
      />
      <IPv6PoolModal
        open={showIPv6PoolModal}
        onOpenChange={(open) => { setShowIPv6PoolModal(open); if (!open) setEditingIPv6Pool(null); }}
        onSuccess={onSuccess}
        existingPool={editingIPv6Pool}
      />
      <InterfaceModal
        open={showInterfaceModal}
        onOpenChange={(open) => { setShowInterfaceModal(open); if (!open) setEditingInterface(null); }}
        onSuccess={onSuccess}
        existingInterface={editingInterface}
        capabilities={capabilities}
      />
      {deleteTarget && (
        <DeleteConfirmModal
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          onSuccess={deleteTarget.isReset ? onSessionReset : onSuccess}
          itemType={deleteTarget.type}
          itemName={deleteTarget.name}
          onDelete={deleteTarget.onDelete}
          warning={deleteTarget.warning}
          actionLabel={deleteTarget.actionLabel}
          actionVerb={deleteTarget.actionVerb}
        />
      )}
    </AppLayout>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value || "-"}</span>
    </div>
  );
}

type SessionSortField =
  | "username"
  | "interface"
  | "ip"
  | "mtu"
  | "calling_sid"
  | "uptime"
  | "rxRate"
  | "txRate"
  | "rx_bytes"
  | "tx_bytes";

type SessionWithRates = PPPoESession & {
  rxRate?: number;
  txRate?: number;
  rxPps?: number;
  txPps?: number;
};

function sessionValue(session: SessionWithRates, field: SessionSortField): string | number {
  switch (field) {
    case "username":
      return session.username;
    case "interface":
      return session.interface;
    case "ip":
      return session.ip ?? "";
    case "mtu":
      return session.mtu ?? 0;
    case "calling_sid":
      return session.calling_sid ?? "";
    case "uptime":
      return session.uptime ?? "";
    case "rxRate":
      return session.rxRate ?? 0;
    case "txRate":
      return session.txRate ?? 0;
    case "rx_bytes":
      return session.rx_bytes ?? 0;
    case "tx_bytes":
      return session.tx_bytes ?? 0;
    default:
      return "";
  }
}

function formatBytes(value: number): string {
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GiB`;
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${value} B`;
}

function formatRate(value?: number): string {
  if (value === undefined) return "-";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} Mbit/s`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} kbit/s`;
  return `${Math.round(value)} bit/s`;
}

function formatPps(value?: number): string {
  return value === undefined ? "-" : `${Math.round(value)} pps`;
}

function EmptyState({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

export default function PPPoEServerPage() {
  return (
    <Suspense>
      <PPPoEPageInner />
    </Suspense>
  );
}
