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
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useColumnVisibility, type ColumnDef } from "@/hooks/useColumnVisibility";
import { ColumnToggleButton } from "@/components/column-toggle/ColumnToggleButton";
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
  type PPPoESessionsResponse,
  DEFAULT_LABEL_FACTOR,
  DEFAULT_LABEL_PRIORITY,
  labelFactorValid,
  labelPriorityValid,
  PPPOE_LABEL_LIMITS,
  type VyOSResponse,
} from "@/lib/api/pppoe-server";
import type { ApiError } from "@/lib/types/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useDashboardSSE } from "@/hooks/useDashboardSSE";
import { FeatureGroup } from "@/lib/api/user-management";
import {
  DeleteConfirmModal,
  GeneralSettingsModal,
  AuthSettingsModal,
  authModeLabels,
  LocalUserModal,
  RadiusServerModal,
  RadiusSettingsModal,
  IPPoolModal,
  IPv6PoolModal,
  InterfaceModal,
  PPPOptionsModal,
  AdvancedSettingsModal,
  PPPoEStatsChart,
  SessionLabelRegistryDialog,
} from "@/components/service/pppoe-server";
import type { PPPoEStatsPoint } from "@/components/service/pppoe-server/PPPoEStatsChart";

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
  // A stored factor the editor would reject (rows saved before the check) matches nothing.
  if (!labelFactorValid(rules.factor)) return false;
  const factor = rules.factor ?? DEFAULT_LABEL_FACTOR;
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
  const ts = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const { canRead, canWrite } = usePermissions();
  const hasRead = canRead(FeatureGroup.PPPOE);
  const hasWrite = canWrite(FeatureGroup.PPPOE);

  // `loading` covers the first load and Retry; `refreshing` covers the reload
  // after a save, so open dialogs stay mounted while it runs.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PPPoEConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<PPPoECapabilities | null>(null);
  const [sessions, setSessions] = useState<SessionWithRates[]>([]);
  const [sessionLabels, setSessionLabels] = useState<PPPoESessionLabelDefinition[]>([]);
  const [showLabelEditor, setShowLabelEditor] = useState(false);
  const [labelDraft, setLabelDraft] = useState<PPPoESessionLabelDefinition[]>([]);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [labelSaving, setLabelSaving] = useState(false);
  // The registry editor saves the whole catalog, so it opens only after a successful load.
  const [labelsLoad, setLabelsLoad] = useState<{ state: "loading" | "loaded" | "failed"; error: string | null }>({
    state: "loading",
    error: null,
  });
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionRefreshing, setSessionRefreshing] = useState(false);
  /**
   * Session feed bookkeeping. Every change of the stream error or payload gets
   * the next sequence number, so an error is shown only while nothing newer
   * (a stream payload or a successful manual fetch) has arrived since.
   */
  const [sessionFeed, setSessionFeed] = useState<{
    streamError: string | null;
    streamPayload: PPPoESessionsResponse | null;
    seq: number;
    streamErrorSeq: number;
    payloadSeq: number;
    fetchedSeq: number;
    fetchError: string | null;
    fetchErrorSeq: number;
    fetchStartSeq: number;
  }>({
    streamError: null,
    streamPayload: null,
    seq: 0,
    streamErrorSeq: 0,
    payloadSeq: 0,
    fetchedSeq: -1,
    fetchError: null,
    fetchErrorSeq: 0,
    fetchStartSeq: 0,
  });
  const previousSessionBytes = useRef<Record<string, { rx: number; tx: number; at: number }>>({});
  const fetchToken = useRef(0);
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
  // The tab follows ?tab= until the user picks one for that URL.
  const tabParam = searchParams.get("tab") ?? "overview";
  const [tabChoice, setTabChoice] = useState<{ param: string; tab: string } | null>(null);
  const activeTab = tabChoice && tabChoice.param === tabParam ? tabChoice.tab : tabParam;

  // Modal state. Each open bumps `modalKey`, which remounts the modal so its
  // form seeds from the current config; the edited subject stays set after
  // close so the dialog does not switch to Add mode while it animates out.
  const [modalKey, setModalKey] = useState(0);
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
    onDelete: () => Promise<VyOSResponse>;
    warning?: string;
    actionLabel?: string;
    actionVerb?: string;
    isReset?: boolean;
  } | null>(null);

  const openModal = (show: (open: boolean) => void) => {
    setModalKey((key) => key + 1);
    show(true);
  };

  /** Read config and capabilities; state is set only after the await. */
  const loadData = async (refresh = false) => {
    try {
      const [configData, capsData] = await Promise.all([
        pppoeServerService.getConfig(refresh),
        pppoeServerService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
      setError(null);
    } catch (err) {
      setError((err as ApiError).message || "");
    } finally {
      setLoading(false);
    }
  };

  /** Re-read the device after a save without unmounting the open dialogs. */
  const reload = async () => {
    setRefreshing(true);
    try {
      await loadData(true);
    } finally {
      setRefreshing(false);
    }
  };

  const retry = () => {
    setLoading(true);
    void loadData(true);
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
    // Only the newest request applies its result: an older response that lands
    // later (a refresh overlapping the reset dialog's re-read) is dropped.
    const token = ++fetchToken.current;
    // Stamp the result with the sequence at request start (read from state, not
    // a closure that may be stale): a stream payload or error that arrives while
    // the request runs is newer than its result.
    setSessionFeed((feed) => ({ ...feed, fetchStartSeq: feed.seq }));
    setSessionRefreshing(true);
    try {
      const response = await pppoeServerService.getSessions(500);
      if (token !== fetchToken.current) return;
      applySessions(response);
      setSessionFeed((feed) => ({ ...feed, fetchError: null, fetchedSeq: feed.fetchStartSeq }));
    } catch (err) {
      if (token !== fetchToken.current) return;
      const message = (err as ApiError).message || t("errors.loadSessions");
      setSessionFeed((feed) => ({ ...feed, fetchError: message, fetchErrorSeq: feed.fetchStartSeq }));
    } finally {
      if (token === fetchToken.current) setSessionRefreshing(false);
    }
  };

  const liveSessions = hasRead && !sessionPaused;
  const { data: sessionStream, channelErrors, status: sessionStreamStatus } = useDashboardSSE({
    interests: ["pppoe-sessions"],
    enabled: liveSessions,
  });
  const sessionStreamError = channelErrors["pppoe-sessions"] ?? null;

  const loadSessionLabels = async () => {
    try {
      const labels = await pppoeServerService.getSessionLabelDefinitions();
      setSessionLabels(labels ?? []);
      setLabelsLoad({ state: "loaded", error: null });
    } catch (err) {
      setSessionLabels([]);
      setLabelsLoad({ state: "failed", error: (err as ApiError).message || null });
    }
  };

  const retryLabels = () => {
    setLabelsLoad({ state: "loading", error: null });
    void loadSessionLabels();
  };

  useEffect(() => {
    if (!hasRead) return;
    void loadData();
    void loadSessionLabels();
  }, [hasRead]);

  useEffect(() => {
    if (!sessionStream.pppoeSessions) return;
    applySessions(sessionStream.pppoeSessions);
  }, [sessionStream.pppoeSessions]);

  // Number each stream change while rendering (no effect): a payload or error
  // that differs from the last one seen takes the next sequence number.
  const streamErrorChanged = sessionFeed.streamError !== sessionStreamError;
  const streamPayloadChanged = sessionFeed.streamPayload !== sessionStream.pppoeSessions;
  if (streamErrorChanged || streamPayloadChanged) {
    const seq = sessionFeed.seq + 1;
    setSessionFeed({
      ...sessionFeed,
      streamError: sessionStreamError,
      streamPayload: sessionStream.pppoeSessions,
      seq,
      streamErrorSeq: streamErrorChanged ? seq : sessionFeed.streamErrorSeq,
      payloadSeq: streamPayloadChanged && sessionStream.pppoeSessions ? seq : sessionFeed.payloadSeq,
    });
  }
  const newestData = Math.max(sessionFeed.payloadSeq, sessionFeed.fetchedSeq);
  const streamError = sessionStreamError !== null && sessionFeed.streamErrorSeq > newestData
    ? sessionStreamError || t("errors.loadSessions")
    : null;
  const fetchError = sessionFeed.fetchError && sessionFeed.fetchErrorSeq >= sessionFeed.payloadSeq
    ? sessionFeed.fetchError
    : null;
  const shownSessionError = fetchError ?? streamError;
  const sessionLoading = liveSessions && sessionStreamStatus !== "error" && !sessionStream.pppoeSessions && !shownSessionError;
  const labelsReady = labelsLoad.state === "loaded";

  const openLabelEditor = () => {
    if (!labelsReady) return;
    setLabelDraft(sessionLabels.map((label) => ({ ...label, rules: label.rules ? { ...label.rules } : {} })));
    setLabelError(null);
    setShowLabelEditor(true);
  };

  const saveLabelEditor = async () => {
    // Saving replaces the whole catalog: never from a draft seeded by a failed load.
    if (!labelsReady) return;
    // A row with a cleared code or name is an error, never dropped: removing a
    // label goes through its remove action.
    const incomplete = labelDraft.find((label) => !label.code.trim() || !label.name.trim());
    if (incomplete) {
      const named = incomplete.code.trim() || incomplete.name.trim();
      setLabelError(named ? t("errors.labelIncomplete", { label: named }) : t("errors.labelUnnamed"));
      return;
    }
    const codes = labelDraft.map((label) => label.code.trim());
    const duplicate = codes.find((code, index) => codes.indexOf(code) !== index);
    if (duplicate) {
      setLabelError(t("errors.labelDuplicateCode", { code: duplicate }));
      return;
    }
    const badFactor = labelDraft.find((label) => !labelFactorValid(label.rules?.factor));
    if (badFactor) {
      setLabelError(t("errors.labelFactor", { label: badFactor.code.trim() }));
      return;
    }
    const badPriority = labelDraft.find((label) => !labelPriorityValid(label.priority));
    if (badPriority) {
      setLabelError(t("errors.labelPriority", {
        label: badPriority.code.trim(),
        min: String(PPPOE_LABEL_LIMITS.priorityMin),
        max: String(PPPOE_LABEL_LIMITS.priorityMax),
      }));
      return;
    }
    try {
      setLabelSaving(true);
      setLabelError(null);
      const sanitized = labelDraft
        .map((label) => ({
          ...label,
          code: label.code.trim(),
          name: label.name.trim(),
          description: label.description?.trim() ?? "",
          severity: label.severity || "info",
          priority: Number(label.priority ?? DEFAULT_LABEL_PRIORITY),
          enabled: label.enabled !== false,
          rules: label.rules ?? {},
        }));
      const saved = (await pppoeServerService.saveSessionLabelDefinitions(sanitized)) ?? [];
      setSessionLabels(saved);
      setLabelDraft(saved.map((label) => ({ ...label, rules: label.rules ? { ...label.rules } : {} })));
      setShowLabelEditor(false);
    } catch (err) {
      setLabelError((err as ApiError).message || t("errors.saveLabels"));
    } finally {
      setLabelSaving(false);
    }
  };

  const onSuccess = () => { void reload(); };
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

  // An unset authentication mode is the lab default, local.
  const isLocalAuth = (config?.authentication.mode || "local") === "local";
  const modeLabels = authModeLabels(ts);
  const authModeLabel = (mode: string | null | undefined) =>
    mode ? modeLabels[mode] ?? mode : tc("default");
  const vlanMonSupported = capabilities?.features.vlan_mon ?? false;
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

  if (error !== null && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-destructive font-medium">{t("errors.loadConfig")}</p>
            {error && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{error}</p>}
            <Button onClick={retry}>
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
                  disabled={refreshing}
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
              <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading || refreshing}>
                <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                {tc("refresh")}
              </Button>
            </div>
          </div>

          {error !== null && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{t("errors.loadConfig")}</p>
                {error && <p className="whitespace-pre-wrap">{error}</p>}
              </div>
            </div>
          )}

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
          <Tabs value={activeTab} onValueChange={(tab) => setTabChoice({ param: tabParam, tab })} className="flex flex-col h-full">
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
                          <Button variant="ghost" size="sm" disabled={refreshing} onClick={() => openModal(setShowGeneralModal)}>
                            <Pencil className="h-3 w-3 mr-1" /> {tc("edit")}
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <InfoRow label={tc("description")} value={config?.description} />
                        <InfoRow label={t("overview.accessConcentrator")} value={config?.access_concentrator} />
                        <InfoRow label={ts("general.serviceNames")} value={(config?.service_names || []).join(", ")} />
                        <InfoRow label={ts("general.gatewayAddress")} value={config?.gateway_address} />
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
                          <Button variant="ghost" size="sm" disabled={refreshing} onClick={() => openModal(setShowPPPOptionsModal)}>
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
                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={openLabelEditor} disabled={!labelsReady}>
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
                  {labelsLoad.state === "failed" && (
                    <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">{t("errors.loadLabels")}</p>
                        {labelsLoad.error && <p className="whitespace-pre-wrap">{labelsLoad.error}</p>}
                      </div>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={retryLabels}>
                        {tc("retry")}
                      </Button>
                    </div>
                  )}
                  {shownSessionError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive whitespace-pre-wrap">
                      {shownSessionError}
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
                      <Button size="sm" disabled={refreshing} onClick={() => { setEditingInterface(null); openModal(setShowInterfaceModal); }}>
                        <Plus className="h-4 w-4 mr-1" /> {tc("addInterface")}
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
                          {vlanMonSupported && <TableHead>{t("interfaces.vlanMon")}</TableHead>}
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
                                {iface.vlans.slice(0, 4).map((v) => (
                                  <Badge key={v} variant="secondary" className="text-xs font-mono">{v}</Badge>
                                ))}
                                {iface.vlans.length > 4 && (
                                  <Badge variant="secondary" className="text-xs">+{iface.vlans.length - 4}</Badge>
                                )}
                                {iface.vlans.length === 0 && "-"}
                              </div>
                            </TableCell>
                            {vlanMonSupported && (
                              <TableCell>
                                {iface.vlan_mon ? (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("yes")}</Badge>
                                ) : "-"}
                              </TableCell>
                            )}
                            <TableCell>
                              {iface.combined ? (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("yes")}</Badge>
                              ) : "-"}
                            </TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={refreshing} onClick={() => { setEditingInterface(iface); openModal(setShowInterfaceModal); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" disabled={refreshing} onClick={() => setDeleteTarget({
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
                          <Button variant="ghost" size="sm" disabled={refreshing} onClick={() => openModal(setShowAuthModal)}>
                            <Pencil className="h-3 w-3 mr-1" /> {tc("edit")}
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-sm">
                          {authModeLabel(config?.authentication.mode)}
                        </Badge>
                        {(config?.authentication.protocols || []).length > 0 && (
                          <div className="flex gap-1">
                            {(config?.authentication.protocols || []).map((p) => (
                              <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>
                            ))}
                          </div>
                        )}
                        {capabilities?.features.auth_any_login && config?.authentication.any_login && (
                          <Badge variant="secondary">{ts("auth.anyLogin")}</Badge>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Both lists stay reachable: a mode switch needs its users or servers first. */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("auth.localUsers")}</h3>
                    {hasWrite && (
                      <Button size="sm" disabled={refreshing} onClick={() => { setEditingLocalUser(null); openModal(setShowLocalUserModal); }}>
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
                            <TableCell>{user.rate_limit.download || "-"}</TableCell>
                            <TableCell>{user.rate_limit.upload || "-"}</TableCell>
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
                                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={refreshing} onClick={() => { setEditingLocalUser(user); openModal(setShowLocalUserModal); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" disabled={refreshing} onClick={() => setDeleteTarget({
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

                  <div className="mt-8 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{t("radius.settingsTitle")}</h3>
                      {hasWrite && (
                        <Button variant="outline" size="sm" disabled={refreshing} onClick={() => openModal(setShowRadiusSettingsModal)}>
                          <Pencil className="h-3 w-3 mr-1" /> {t("radius.editSettings")}
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <Card className="p-4 space-y-2 text-sm">
                        <h4 className="text-sm font-medium mb-2">{t("radius.general")}</h4>
                        <InfoRow label={t("radius.sourceAddress")} value={config?.authentication.radius.source_address} />
                        <InfoRow label={t("radius.timeout")} value={config?.authentication.radius.timeout} />
                        <InfoRow label={t("radius.maxTry")} value={config?.authentication.radius.max_try} />
                        <InfoRow label={t("radius.nasIdentifier")} value={config?.authentication.radius.nas_identifier} />
                        <InfoRow label={ts("radiusSettings.nasIpAddress")} value={config?.authentication.radius.nas_ip_address} />
                        <InfoRow label={t("radius.calledSidFormat")} value={config?.authentication.radius.called_sid_format} />
                        <YesNoRow label={t("radius.preallocateVif")} value={config?.authentication.radius.preallocate_vif} yes={t("yes")} no={t("no")} />
                      </Card>
                      <Card className="p-4 space-y-2 text-sm">
                        <h4 className="text-sm font-medium mb-2">{t("radius.daeRateLimit")}</h4>
                        <InfoRow label={t("radius.daeServer")} value={config?.authentication.radius.dynamic_author.server} />
                        <InfoRow label={t("radius.daePort")} value={config?.authentication.radius.dynamic_author.port} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("radius.rateLimit")}</span>
                          <Badge variant={config?.authentication.radius.rate_limit.enable ? "default" : "secondary"}>
                            {config?.authentication.radius.rate_limit.enable ? tc("enabled") : tc("disabled")}
                          </Badge>
                        </div>
                        <InfoRow label={t("radius.attribute")} value={config?.authentication.radius.rate_limit.attribute} />
                        <InfoRow label={ts("radiusSettings.vendor")} value={config?.authentication.radius.rate_limit.vendor} />
                        <InfoRow label={t("radius.multiplier")} value={config?.authentication.radius.rate_limit.multiplier} />
                      </Card>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("radius.serversTitle")}</h3>
                    {hasWrite && (
                      <Button size="sm" disabled={refreshing} onClick={() => { setEditingRadiusServer(null); openModal(setShowRadiusServerModal); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("radius.addServer")}
                      </Button>
                    )}
                  </div>
                  {(config?.authentication.radius.servers.length ?? 0) === 0 ? (
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
                        {(config?.authentication.radius.servers ?? []).map((srv) => (
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
                                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={refreshing} onClick={() => { setEditingRadiusServer(srv); openModal(setShowRadiusServerModal); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" disabled={refreshing} onClick={() => setDeleteTarget({
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
                </TabsContent>

                {/* IP Pools Tab */}
                <TabsContent value="pools" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("pools.ipv4Title")}</h3>
                    {hasWrite && (
                      <Button size="sm" disabled={refreshing} onClick={() => { setEditingIPPool(null); openModal(setShowIPPoolModal); }}>
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
                                {pool.ranges.map((r) => (
                                  <Badge key={r} variant="secondary" className="font-mono text-xs">{r}</Badge>
                                ))}
                                {pool.ranges.length === 0 && "-"}
                              </div>
                            </TableCell>
                            <TableCell>{pool.next_pool || "-"}</TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={refreshing} onClick={() => { setEditingIPPool(pool); openModal(setShowIPPoolModal); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" disabled={refreshing} onClick={() => setDeleteTarget({
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
                      <Button size="sm" disabled={refreshing} onClick={() => { setEditingIPv6Pool(null); openModal(setShowIPv6PoolModal); }}>
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
                                {pool.prefixes.map((p) => (
                                  <Badge key={p.prefix} variant="outline" className="text-xs font-mono">
                                    {p.prefix}{p.mask ? ` /${p.mask}` : ""}
                                  </Badge>
                                ))}
                                {pool.prefixes.length === 0 && "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {pool.delegates.map((d) => (
                                  <Badge key={d.prefix} variant="outline" className="text-xs font-mono">
                                    {d.prefix}{d.delegation_prefix ? ` /${d.delegation_prefix}` : ""}
                                  </Badge>
                                ))}
                                {pool.delegates.length === 0 && "-"}
                              </div>
                            </TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={refreshing} onClick={() => { setEditingIPv6Pool(pool); openModal(setShowIPv6PoolModal); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" disabled={refreshing} onClick={() => setDeleteTarget({
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
                        <Button variant="ghost" size="sm" disabled={refreshing} onClick={() => openModal(setShowPPPOptionsModal)}>
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
                        <Button variant="ghost" size="sm" disabled={refreshing} onClick={() => openModal(setShowAdvancedModal)}>
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
                        <YesNoRow label={ts("advanced.connectionLimits")} value={config?.limits.enabled} yes={t("yes")} no={t("no")} />
                        <InfoRow label={t("advanced.burst")} value={config?.limits.burst} />
                        <InfoRow label={t("advanced.connLimit")} value={config?.limits.connection_limit} />
                        <InfoRow label={t("advanced.timeout")} value={config?.limits.timeout} />
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">{t("advanced.logShaper")}</h5>
                        <InfoRow label={t("advanced.logLevel")} value={config?.log.level} />
                        <YesNoRow label={ts("advanced.shaper")} value={config?.shaper.enabled} yes={t("yes")} no={t("no")} />
                        <InfoRow label={t("advanced.shaperFwmark")} value={config?.shaper.fwmark} />
                        <YesNoRow label={ts("advanced.snmp")} value={config?.snmp.enabled} yes={t("yes")} no={t("no")} />
                        <YesNoRow label={t("advanced.snmpMasterAgent")} value={config?.snmp.master_agent} yes={t("yes")} no={t("no")} />
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("advanced.extendedScripts")}</h5>
                        <YesNoRow label={tc("enabled")} value={config?.extended_scripts.enabled} yes={t("yes")} no={t("no")} />
                        <InfoRow label={t("advanced.onChange")} value={config?.extended_scripts.on_change} />
                        <InfoRow label={t("advanced.onDown")} value={config?.extended_scripts.on_down} />
                        <InfoRow label={t("advanced.onPreUp")} value={config?.extended_scripts.on_pre_up} />
                        <InfoRow label={t("advanced.onUp")} value={config?.extended_scripts.on_up} />
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
        canSave={labelsReady}
        saving={labelSaving}
        error={labelError}
      />

      {/* Modals */}
      {config && (
        <>
          <GeneralSettingsModal
            key={`general-${modalKey}`}
            open={showGeneralModal}
            onOpenChange={setShowGeneralModal}
            onSuccess={onSuccess}
            config={config}
            capabilities={capabilities}
          />
          <AuthSettingsModal
            key={`auth-${modalKey}`}
            open={showAuthModal}
            onOpenChange={setShowAuthModal}
            onSuccess={onSuccess}
            currentAuth={config.authentication}
            capabilities={capabilities}
          />
          <PPPOptionsModal
            key={`ppp-${modalKey}`}
            open={showPPPOptionsModal}
            onOpenChange={setShowPPPOptionsModal}
            onSuccess={onSuccess}
            current={config.ppp_options}
            capabilities={capabilities}
          />
          <AdvancedSettingsModal
            key={`advanced-${modalKey}`}
            open={showAdvancedModal}
            onOpenChange={setShowAdvancedModal}
            onSuccess={onSuccess}
            config={config}
            capabilities={capabilities}
          />
          <RadiusSettingsModal
            key={`radius-${modalKey}`}
            open={showRadiusSettingsModal}
            onOpenChange={setShowRadiusSettingsModal}
            onSuccess={onSuccess}
            currentSettings={config.authentication.radius}
            capabilities={capabilities}
          />
          <LocalUserModal
            key={`user-${modalKey}`}
            open={showLocalUserModal}
            onOpenChange={setShowLocalUserModal}
            onSuccess={onSuccess}
            existingUser={editingLocalUser}
            configuredUsers={config.authentication.local_users.map((user) => user.username)}
          />
          <RadiusServerModal
            key={`server-${modalKey}`}
            open={showRadiusServerModal}
            onOpenChange={setShowRadiusServerModal}
            onSuccess={onSuccess}
            existingServer={editingRadiusServer}
            configuredServers={config.authentication.radius.servers.map((srv) => srv.address)}
          />
          <IPPoolModal
            key={`pool-${modalKey}`}
            open={showIPPoolModal}
            onOpenChange={setShowIPPoolModal}
            onSuccess={onSuccess}
            existingPool={editingIPPool}
            poolNames={config.client_ip_pools.map((pool) => pool.name)}
          />
          <IPv6PoolModal
            key={`pool6-${modalKey}`}
            open={showIPv6PoolModal}
            onOpenChange={setShowIPv6PoolModal}
            onSuccess={onSuccess}
            existingPool={editingIPv6Pool}
            poolNames={config.client_ipv6_pools.map((pool) => pool.name)}
          />
          <InterfaceModal
            key={`iface-${modalKey}`}
            open={showInterfaceModal}
            onOpenChange={setShowInterfaceModal}
            onSuccess={onSuccess}
            existingInterface={editingInterface}
            capabilities={capabilities}
            configuredInterfaces={config.interfaces.map((iface) => iface.interface)}
          />
        </>
      )}
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

function YesNoRow({ label, value, yes, no }: { label: string; value?: boolean; yes: string; no: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={value ? "default" : "secondary"}>{value ? yes : no}</Badge>
    </div>
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
