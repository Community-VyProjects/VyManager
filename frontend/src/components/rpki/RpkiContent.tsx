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
import { RpkiCacheServerModal } from "./RpkiCacheServerModal";
import { DeleteRpkiCacheServerModal } from "./DeleteRpkiCacheServerModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

// ============================================================================
// Main Component
// ============================================================================

export function RpkiContent() {
  const t = useTranslations("rpki");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.RPKI);

  const [config, setConfig] = useState<RpkiConfig | null>(null);
  const [, setCapabilities] = useState<RpkiCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cache-servers" | "settings">("cache-servers");

  // Cache server modals
  const [cacheModalOpen, setCacheModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<RpkiCacheServer | null>(null);
  const [deletingServer, setDeletingServer] = useState<string | null>(null);

  // Settings inline-edit
  const [settingsEditing, setSettingsEditing] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [expireInterval, setExpireInterval] = useState("");
  const [pollingPeriod, setPollingPeriod] = useState("");
  const [retryInterval, setRetryInterval] = useState("");

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        rpkiService.getConfig(refresh),
        rpkiService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadConfig"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync settings form fields when config loads
  useEffect(() => {
    if (config) {
      setExpireInterval(config.expire_interval != null ? String(config.expire_interval) : "");
      setPollingPeriod(config.polling_period != null ? String(config.polling_period) : "");
      setRetryInterval(config.retry_interval != null ? String(config.retry_interval) : "");
    }
  }, [config]);

  // ============================================================================
  // Stats
  // ============================================================================

  const cacheServerCount = config?.cache_servers.length ?? 0;
  const sshEnabledCount = config?.cache_servers.filter((s) => s.ssh != null).length ?? 0;

  // ============================================================================
  // CRUD Handlers
  // ============================================================================

  const handleCreateServer = async (server: RpkiCacheServer) => {
    await rpkiService.createCacheServer(server);
    await loadData(true);
  };

  const handleUpdateServer = async (server: RpkiCacheServer) => {
    await rpkiService.updateCacheServer(editingServer!, server);
    setEditingServer(null);
    await loadData(true);
  };

  const handleDeleteServer = async () => {
    await rpkiService.deleteCacheServer(deletingServer!);
    setDeletingServer(null);
    await loadData(true);
  };

  // ============================================================================
  // Settings Handler
  // ============================================================================

  const handleSettingsSave = async () => {
    if (!config) return;

    // Client-side range validation
    if (expireInterval) {
      const v = parseInt(expireInterval, 10);
      if (isNaN(v) || v < 600 || v > 172800) {
        setSettingsError(t("errors.expireRange"));
        return;
      }
    }
    if (pollingPeriod) {
      const v = parseInt(pollingPeriod, 10);
      if (isNaN(v) || v < 1 || v > 86400) {
        setSettingsError(t("errors.pollingRange"));
        return;
      }
    }
    if (retryInterval) {
      const v = parseInt(retryInterval, 10);
      if (isNaN(v) || v < 1 || v > 7200) {
        setSettingsError(t("errors.retryRange"));
        return;
      }
    }

    setSettingsSaving(true);
    setSettingsError(null);

    try {
      await rpkiService.updateGlobalSettings(
        {
          expire_interval: config.expire_interval,
          polling_period: config.polling_period,
          retry_interval: config.retry_interval,
        },
        {
          expire_interval: expireInterval ? parseInt(expireInterval, 10) : null,
          polling_period: pollingPeriod ? parseInt(pollingPeriod, 10) : null,
          retry_interval: retryInterval ? parseInt(retryInterval, 10) : null,
        }
      );
      setSettingsEditing(false);
      await loadData(true);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : t("errors.saveSettings"));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSettingsCancel = () => {
    if (config) {
      setExpireInterval(config.expire_interval != null ? String(config.expire_interval) : "");
      setPollingPeriod(config.polling_period != null ? String(config.polling_period) : "");
      setRetryInterval(config.retry_interval != null ? String(config.retry_interval) : "");
    }
    setSettingsEditing(false);
    setSettingsError(null);
  };

  // ============================================================================
  // Render
  // ============================================================================

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
            <Button variant="outline" size="sm" onClick={() => loadData(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {tc("refresh")}
            </Button>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
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
                    <p className="text-2xl font-bold text-sm font-mono">
                      {config?.polling_period != null
                        ? `${config.polling_period}s`
                        : "300s"}
                    </p>
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
                    <p className="text-2xl font-bold text-sm font-mono">
                      {config?.expire_interval != null
                        ? `${config.expire_interval}s`
                        : "7200s"}
                    </p>
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
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingServer(null);
                      setCacheModalOpen(true);
                    }}
                  >
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
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setEditingServer(null);
                        setCacheModalOpen(true);
                      }}
                    >
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
                        <TableHead>{t("servers.sourceAddress")}</TableHead>
                        <TableHead>SSH</TableHead>
                        {hasWritePermission && <TableHead className="w-20" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config?.cache_servers.map((server) => (
                        <TableRow key={server.address}>
                          <TableCell className="font-mono">{server.address}</TableCell>
                          <TableCell>{server.port ?? "—"}</TableCell>
                          <TableCell>{server.preference ?? "—"}</TableCell>
                          <TableCell className="font-mono">
                            {server.source_address ?? "—"}
                          </TableCell>
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
                                  onClick={() => {
                                    setEditingServer(server);
                                    setCacheModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeletingServer(server.address)}
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
                    onClick={() => setSettingsEditing(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {tc("edit")}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsEditing ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="expire-interval">{t("settings.expireInterval")}</Label>
                      <Input
                        id="expire-interval"
                        type="number"
                        value={expireInterval}
                        onChange={(e) => setExpireInterval(e.target.value)}
                        placeholder={t("settings.expirePlaceholder")}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("settings.expireHelp")}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="polling-period">{t("settings.pollingPeriod")}</Label>
                      <Input
                        id="polling-period"
                        type="number"
                        value={pollingPeriod}
                        onChange={(e) => setPollingPeriod(e.target.value)}
                        placeholder={t("settings.pollingPlaceholder")}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("settings.pollingHelp")}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="retry-interval">{t("settings.retryInterval")}</Label>
                      <Input
                        id="retry-interval"
                        type="number"
                        value={retryInterval}
                        onChange={(e) => setRetryInterval(e.target.value)}
                        placeholder={t("settings.retryPlaceholder")}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("settings.retryHelp")}
                      </p>
                    </div>

                    {settingsError && (
                      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">{settingsError}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={handleSettingsSave}
                        disabled={settingsSaving}
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
                    <div className="flex justify-between items-center py-1 border-b border-border">
                      <span className="text-muted-foreground">{t("settings.expireInterval")}</span>
                      <span className="font-mono">
                        {config?.expire_interval != null
                          ? `${config.expire_interval}s`
                          : <span className="text-muted-foreground">{t("settings.expireDefault")}</span>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border">
                      <span className="text-muted-foreground">{t("settings.pollingPeriod")}</span>
                      <span className="font-mono">
                        {config?.polling_period != null
                          ? `${config.polling_period}s`
                          : <span className="text-muted-foreground">{t("settings.pollingDefault")}</span>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground">{t("settings.retryInterval")}</span>
                      <span className="font-mono">
                        {config?.retry_interval != null
                          ? `${config.retry_interval}s`
                          : <span className="text-muted-foreground">{t("settings.retryDefault")}</span>}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <RpkiCacheServerModal
        open={cacheModalOpen}
        onOpenChange={(open) => {
          setCacheModalOpen(open);
          if (!open) setEditingServer(null);
        }}
        onSubmit={editingServer ? handleUpdateServer : handleCreateServer}
        existingServer={editingServer}
      />

      <DeleteRpkiCacheServerModal
        open={deletingServer !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingServer(null);
        }}
        serverAddress={deletingServer ?? ""}
        onConfirm={handleDeleteServer}
      />
    </>
  );
}
