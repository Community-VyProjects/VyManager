"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Server,
  Key,
  Clock,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  rpkiService,
  RpkiConfig,
  RpkiCapabilities,
  RpkiCacheServer,
} from "@/lib/api/rpki";
import {
  rpkiRange,
  rpkiTimerFields,
  rpkiTimerProblem,
  type RpkiCacheFields,
  type RpkiTimerFields,
  type RpkiTimerKey,
} from "@/lib/api/rpki-save-ops";
import { pkiService } from "@/lib/api/pki";
import type { ApiError } from "@/lib/types/api";
import { RpkiCacheServerModal } from "./RpkiCacheServerModal";
import { DeleteRpkiCacheServerModal, type RpkiDeleteKind } from "./DeleteRpkiCacheServerModal";
import { useRpkiProblemText } from "./rpki-problem-text";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

const TIMER_LABELS: Record<RpkiTimerKey, "settings.expireInterval" | "settings.pollingPeriod" | "settings.retryInterval"> = {
  expire_interval: "settings.expireInterval",
  polling_period: "settings.pollingPeriod",
  retry_interval: "settings.retryInterval",
};

// ============================================================================
// Main Component
// ============================================================================

export function RpkiContent() {
  const t = useTranslations("rpki");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.RPKI);

  const [config, setConfig] = useState<RpkiConfig | null>(null);
  const [capabilities, setCapabilities] = useState<RpkiCapabilities | null>(null);
  const [sshKeyNames, setSshKeyNames] = useState<string[]>([]);
  // Picker lists that failed to load (a 403 stays silent: the user may not read PKI).
  const [listErrors, setListErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // A re-read after a save; the page stays mounted and every write control waits.
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cache-servers" | "settings">("cache-servers");

  // Modal state. The subject stays set after close so the dialog keeps its
  // text while it animates out; modalKey remounts the modal on every open.
  const [modalKey, setModalKey] = useState(0);
  const [cacheModalOpen, setCacheModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<RpkiCacheServer | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: RpkiDeleteKind; address: string }>({
    kind: "cache",
    address: "",
  });

  // Settings inline-edit
  const [settingsEditing, setSettingsEditing] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [timers, setTimers] = useState<RpkiTimerFields>(() => rpkiTimerFields(null));

  // ============================================================================
  // Data Loading
  // ============================================================================

  const fetchData = useCallback(async (refresh: boolean) => {
    const [configData, capData] = await Promise.all([
      rpkiService.getConfig(refresh),
      rpkiService.getCapabilities(),
    ]);
    const failed: string[] = [];
    const keys = await pkiService.getConfig()
      .then((pki) => pki.openssh.map((k) => k.name))
      .catch((err: unknown) => {
        if ((err as ApiError).status !== 403) failed.push(t("errors.loadSshKeys"));
        return [] as string[];
      });
    setConfig(configData);
    setCapabilities(capData);
    setSshKeyNames(keys);
    setListErrors(failed);
    setError(null);
  }, [t]);

  useEffect(() => {
    fetchData(false)
      .catch((err) => setError((err as ApiError).message || t("errors.loadConfig")))
      .finally(() => setLoading(false));
  }, [fetchData, t]);

  const retry = () => {
    setLoading(true);
    fetchData(true)
      .catch((err) => setError((err as ApiError).message || t("errors.loadConfig")))
      .finally(() => setLoading(false));
  };

  const reload = async () => {
    setRefreshing(true);
    try {
      await fetchData(true);
    } catch (err) {
      setError((err as ApiError).message || t("errors.loadConfig"));
    } finally {
      setRefreshing(false);
    }
  };

  // ============================================================================
  // Derived data
  // ============================================================================

  const sourceAddressSupported = capabilities?.features.cache_source_address.supported ?? false;
  const cacheServers = config?.cache_servers ?? [];
  const cacheServerCount = cacheServers.length;
  const sshEnabledCount = cacheServers.filter((s) => s.ssh != null).length;
  const writeBusy = refreshing || settingsSaving;
  const problemText = useRpkiProblemText();

  const timerValue = (key: RpkiTimerKey) => {
    const value = config?.[key];
    if (value != null) return `${value}s`;
    const fallback = capabilities?.defaults?.[key];
    return fallback != null ? t("settings.defaultValue", { value: String(fallback) }) : "—";
  };

  // ============================================================================
  // CRUD Handlers
  // ============================================================================

  const openCache = (server: RpkiCacheServer | null) => {
    setEditingServer(server);
    setModalKey((k) => k + 1);
    setCacheModalOpen(true);
  };

  const submitCache = async (fields: RpkiCacheFields) => {
    if (editingServer) await rpkiService.updateCacheServer(editingServer, fields, capabilities);
    else await rpkiService.createCacheServer(fields, capabilities);
    await reload();
  };

  const openDelete = (kind: RpkiDeleteKind, address: string) => {
    setDeleteTarget({ kind, address });
    setModalKey((k) => k + 1);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTarget.kind === "all") await rpkiService.deleteRpki();
    else await rpkiService.deleteCacheServer(deleteTarget.address);
    // The commit runs before the close, so a failed commit leaves the dialog open.
    setDeleteOpen(false);
    void reload();
  };

  // ============================================================================
  // Settings Handler
  // ============================================================================

  const startSettingsEdit = () => {
    setTimers(rpkiTimerFields(config));
    setSettingsError(null);
    setSettingsEditing(true);
  };

  const handleSettingsSave = async () => {
    if (!config) return;
    const problem = rpkiTimerProblem(timers, capabilities);
    if (problem) {
      setSettingsError(problemText(problem));
      return;
    }

    setSettingsSaving(true);
    setSettingsError(null);
    try {
      await rpkiService.updateGlobalSettings(config, timers);
      await reload();
      setSettingsEditing(false);
    } catch (err) {
      setSettingsError((err as ApiError).message || t("errors.saveSettings"));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSettingsCancel = () => {
    setSettingsEditing(false);
    setSettingsError(null);
  };

  // ============================================================================
  // Render
  // ============================================================================

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
        <Button variant="outline" onClick={retry}>
          {tc("retry")}
        </Button>
      </div>
    );
  }

  const timerInput = (key: RpkiTimerKey) => {
    const range = rpkiRange(capabilities, key);
    const fallback = capabilities?.defaults?.[key];
    return (
      <div key={key} className="space-y-1.5">
        <Label htmlFor={`rpki-${key}`}>{t(TIMER_LABELS[key])}</Label>
        <Input
          id={`rpki-${key}`}
          type="number"
          min={range?.min}
          max={range?.max}
          value={timers[key]}
          onChange={(e) => setTimers((prev) => ({ ...prev, [key]: e.target.value }))}
          placeholder={fallback != null ? t("settings.defaultPlaceholder", { value: String(fallback) }) : undefined}
          disabled={settingsSaving}
        />
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">RPKI</h1>
                {!hasWritePermission && (
                  <Badge variant="secondary" className="text-xs">{tc("readOnly")}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("header.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasWritePermission && config?.configured && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => openDelete("all", "")}
                  disabled={writeBusy}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("deleteAll.title")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => void reload()} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2${refreshing ? " animate-spin" : ""}`} />
                {tc("refresh")}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {listErrors.length > 0 && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {listErrors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Server className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{cacheServerCount}</p>
                    <p className="text-xs text-muted-foreground">{t("cacheServers")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <Key className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{sshEnabledCount}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.sshEnabled")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <Clock className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-sm font-mono">{timerValue("polling_period")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.pollingPeriod")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-orange-500/10">
                    <Clock className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-sm font-mono">{timerValue("expire_interval")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.expireInterval")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "cache-servers"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("cache-servers")}
          >
            {t("cacheServers")}
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("settings")}
          >
            {t("tabs.settings")}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "cache-servers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("servers.description")}
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => openCache(null)} disabled={writeBusy}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("servers.add")}
                  </Button>
                )}
              </div>

              {cacheServerCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Server className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t("servers.empty")}</p>
                  <p className="text-sm mt-1">{t("servers.emptyHint")}</p>
                  {hasWritePermission && (
                    <Button className="mt-4" onClick={() => openCache(null)} disabled={writeBusy}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("servers.add")}
                    </Button>
                  )}
                </div>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("servers.address")}</TableHead>
                        <TableHead>{t("servers.port")}</TableHead>
                        <TableHead>{t("servers.preference")}</TableHead>
                        {sourceAddressSupported && (
                          <TableHead>{t("servers.sourceAddress")}</TableHead>
                        )}
                        <TableHead>SSH</TableHead>
                        {hasWritePermission && <TableHead className="w-20" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cacheServers.map((server) => (
                        <TableRow key={server.address}>
                          <TableCell className="font-mono">{server.address}</TableCell>
                          <TableCell>{server.port ?? "—"}</TableCell>
                          <TableCell>{server.preference ?? "—"}</TableCell>
                          {sourceAddressSupported && (
                            <TableCell className="font-mono">
                              {server.source_address ?? "—"}
                            </TableCell>
                          )}
                          <TableCell>
                            {server.ssh ? (
                              <Badge variant="secondary" className="font-mono text-xs">
                                {server.ssh.username ? server.ssh.username : t("servers.configured")}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          {hasWritePermission && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openCache(server)}
                                  disabled={writeBusy}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => openDelete("cache", server.address)}
                                  disabled={writeBusy}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <Card className="max-w-lg">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t("settings.globalTimers")}</CardTitle>
                {hasWritePermission && !settingsEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startSettingsEdit}
                    disabled={writeBusy}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {tc("edit")}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsEditing ? (
                  <>
                    {timerInput("expire_interval")}
                    {timerInput("polling_period")}
                    {timerInput("retry_interval")}

                    {settingsError && (
                      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive whitespace-pre-wrap">{settingsError}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={handleSettingsSave}
                        disabled={settingsSaving || refreshing}
                      >
                        {settingsSaving ? tc("saving") : tc("save")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSettingsCancel}
                        disabled={settingsSaving}
                      >
                        {tc("cancel")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 text-sm">
                    {(["expire_interval", "polling_period", "retry_interval"] as const).map((key, index, all) => (
                      <div
                        key={key}
                        className={`flex justify-between items-center py-1${index < all.length - 1 ? " border-b border-border" : ""}`}
                      >
                        <span className="text-muted-foreground">{t(TIMER_LABELS[key])}</span>
                        <span className={config?.[key] != null ? "font-mono" : "font-mono text-muted-foreground"}>
                          {timerValue(key)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <RpkiCacheServerModal
        key={`cache-${modalKey}`}
        open={cacheModalOpen}
        onOpenChange={setCacheModalOpen}
        onSubmit={submitCache}
        existingServer={editingServer}
        servers={cacheServers}
        capabilities={capabilities}
        sshKeyNames={sshKeyNames}
      />

      <DeleteRpkiCacheServerModal
        key={`delete-${modalKey}`}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        kind={deleteTarget.kind}
        serverAddress={deleteTarget.address}
        onConfirm={confirmDelete}
      />
    </>
  );
}
