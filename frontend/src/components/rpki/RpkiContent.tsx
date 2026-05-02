"use client";

import { useState, useEffect, useCallback } from "react";
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
      setError(err instanceof Error ? err.message : "Failed to load RPKI configuration");
    } finally {
      setLoading(false);
    }
  }, []);

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
        setSettingsError("Expire interval must be between 600 and 172800 seconds");
        return;
      }
    }
    if (pollingPeriod) {
      const v = parseInt(pollingPeriod, 10);
      if (isNaN(v) || v < 1 || v > 86400) {
        setSettingsError("Polling period must be between 1 and 86400 seconds");
        return;
      }
    }
    if (retryInterval) {
      const v = parseInt(retryInterval, 10);
      if (isNaN(v) || v < 1 || v > 7200) {
        setSettingsError("Retry interval must be between 1 and 7200 seconds");
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
      setSettingsError(err instanceof Error ? err.message : "Failed to save settings");
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
          Retry
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
                  <Badge variant="secondary" className="text-xs">Read Only</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Resource Public Key Infrastructure
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadData(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
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
                    <p className="text-xs text-muted-foreground">Cache Servers</p>
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
                    <p className="text-xs text-muted-foreground">SSH-Enabled</p>
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
                    <p className="text-xs text-muted-foreground">Polling Period</p>
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
                    <p className="text-xs text-muted-foreground">Expire Interval</p>
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
            Cache Servers
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "cache-servers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Manage RPKI cache servers for BGP route origin validation.
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
                    Add Cache Server
                  </Button>
                )}
              </div>

              {cacheServerCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Server className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No cache servers configured</p>
                  <p className="text-sm mt-1">Add a cache server to enable route origin validation</p>
                  {hasWritePermission && (
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setEditingServer(null);
                        setCacheModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Cache Server
                    </Button>
                  )}
                </div>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Address</TableHead>
                        <TableHead>Port</TableHead>
                        <TableHead>Preference</TableHead>
                        <TableHead>Source Address</TableHead>
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
                                {server.ssh.username ? server.ssh.username : "configured"}
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
                <CardTitle className="text-base">Global Timers</CardTitle>
                {hasWritePermission && !settingsEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSettingsEditing(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsEditing ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="expire-interval">Expire Interval</Label>
                      <Input
                        id="expire-interval"
                        type="number"
                        value={expireInterval}
                        onChange={(e) => setExpireInterval(e.target.value)}
                        placeholder="Default: 7200"
                      />
                      <p className="text-xs text-muted-foreground">
                        Seconds before expiring cache data (600–172800)
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="polling-period">Polling Period</Label>
                      <Input
                        id="polling-period"
                        type="number"
                        value={pollingPeriod}
                        onChange={(e) => setPollingPeriod(e.target.value)}
                        placeholder="Default: 300"
                      />
                      <p className="text-xs text-muted-foreground">
                        Cache polling interval in seconds (1–86400)
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="retry-interval">Retry Interval</Label>
                      <Input
                        id="retry-interval"
                        type="number"
                        value={retryInterval}
                        onChange={(e) => setRetryInterval(e.target.value)}
                        placeholder="Default: 600"
                      />
                      <p className="text-xs text-muted-foreground">
                        Retry interval to reconnect to cache server (1–7200)
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
                        {settingsSaving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSettingsCancel}
                        disabled={settingsSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1 border-b border-border">
                      <span className="text-muted-foreground">Expire Interval</span>
                      <span className="font-mono">
                        {config?.expire_interval != null
                          ? `${config.expire_interval}s`
                          : <span className="text-muted-foreground">(default: 7200s)</span>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border">
                      <span className="text-muted-foreground">Polling Period</span>
                      <span className="font-mono">
                        {config?.polling_period != null
                          ? `${config.polling_period}s`
                          : <span className="text-muted-foreground">(default: 300s)</span>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground">Retry Interval</span>
                      <span className="font-mono">
                        {config?.retry_interval != null
                          ? `${config.retry_interval}s`
                          : <span className="text-muted-foreground">(default: 600s)</span>}
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
