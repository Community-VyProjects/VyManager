"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  Globe,
  ShieldCheck,
  AlertTriangle,
  Server,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ntpService, NTPConfig, NTPCapabilities, NTPServer } from "@/lib/api/ntp";
import { NTPGlobalSettingsModal } from "./NTPGlobalSettingsModal";
import { NTPServerModal } from "./NTPServerModal";
import { DeleteNTPServerModal } from "./DeleteNTPServerModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

function leapSecondLabel(value: string | null): string {
  switch (value) {
    case "ignore": return "Ignore";
    case "smear": return "Smear";
    case "system": return "System";
    case "timezone": return "Timezone";
    default: return "Default";
  }
}

function ServerFlagBadges({ server }: { server: NTPServer }) {
  return (
    <div className="flex flex-wrap gap-1">
      {server.prefer && (
        <Badge
          variant="secondary"
          className="text-xs bg-green-500/10 text-green-600 dark:text-green-400"
        >
          Preferred
        </Badge>
      )}
      {server.pool && (
        <Badge
          variant="secondary"
          className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400"
        >
          Pool
        </Badge>
      )}
      {server.nts && (
        <Badge
          variant="secondary"
          className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400"
        >
          NTS
        </Badge>
      )}
      {server.noselect && (
        <Badge
          variant="secondary"
          className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400"
        >
          No Select
        </Badge>
      )}
      {!server.prefer && !server.pool && !server.nts && !server.noselect && (
        <span className="text-sm text-muted-foreground">—</span>
      )}
    </div>
  );
}

export function NTPContent() {
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.NTP);

  const [config, setConfig] = useState<NTPConfig | null>(null);
  const [capabilities, setCapabilities] = useState<NTPCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<NTPServer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [cfg, caps] = await Promise.all([
        ntpService.getConfig(refresh),
        ntpService.getCapabilities(),
      ]);
      setConfig(cfg);
      setCapabilities(caps);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load NTP configuration"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const preferredServer = config?.servers.find((s) => s.prefer);
  const ntsCount = config?.servers.filter((s) => s.nts).length ?? 0;
  const existingNames = config?.servers.map((s) => s.name) ?? [];

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">NTP</h1>
                  {!hasWrite && <Badge variant="secondary">Read Only</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Network Time Protocol — synchronise system time with upstream servers
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasWrite && (
                <Button size="sm" onClick={() => setSettingsOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Settings
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {error && config && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 pt-4 overflow-auto space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={<Server className="h-4 w-4 text-primary" />}
              iconBg="bg-primary/10"
              label="Servers"
              value={String(config?.servers.length ?? 0)}
            />
            <StatCard
              icon={<Clock className="h-4 w-4 text-green-600 dark:text-green-400" />}
              iconBg="bg-green-500/10"
              label="Preferred"
              value={preferredServer?.name ?? "—"}
              mono
            />
            <StatCard
              icon={<ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
              iconBg="bg-purple-500/10"
              label="NTS Secured"
              value={String(ntsCount)}
            />
            <StatCard
              icon={<Globe className="h-4 w-4 text-primary" />}
              iconBg="bg-primary/10"
              label="Client Restrictions"
              value={
                (config?.allow_clients.length ?? 0) > 0
                  ? String(config!.allow_clients.length)
                  : "None"
              }
            />
          </div>

          {/* Servers card */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Server className="h-4 w-4" />
                  Servers
                </CardTitle>
                {hasWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingServer(null);
                      setServerModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Server
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {config && config.servers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Server</TableHead>
                      <TableHead>Flags</TableHead>
                      {hasWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.servers.map((server) => (
                      <TableRow key={server.name}>
                        <TableCell className="font-mono font-medium">
                          {server.name}
                        </TableCell>
                        <TableCell>
                          <ServerFlagBadges server={server} />
                        </TableCell>
                        {hasWrite && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingServer(server);
                                  setServerModalOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(server.name)}
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
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full p-3 bg-muted mb-3">
                    <Server className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium mb-1">No servers configured</p>
                  <p className="text-xs text-muted-foreground">
                    Add at least one upstream NTP server to synchronise time
                  </p>
                  {hasWrite && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setEditingServer(null);
                        setServerModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Server
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Global Settings card */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                Global Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              {/* Listen Addresses */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Listen Addresses
                </p>
                {config && config.listen_addresses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {config.listen_addresses.map((addr) => (
                      <Badge key={addr} variant="secondary" className="font-mono">
                        {addr}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">All interfaces</p>
                )}
              </div>

              {/* Allow Clients */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Allow Clients
                </p>
                {config && config.allow_clients.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {config.allow_clients.map((addr) => (
                      <Badge key={addr} variant="secondary" className="font-mono">
                        {addr}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Unrestricted</p>
                )}
              </div>

              {/* Interfaces */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Interfaces
                </p>
                {config && config.interfaces.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {config.interfaces.map((iface) => (
                      <Badge key={iface} variant="secondary" className="font-mono">
                        {iface}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">All interfaces</p>
                )}
              </div>

              {/* Leap Second + VRF in a row */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Leap Second</span>
                  <Badge variant="secondary">
                    {leapSecondLabel(config?.leap_second ?? null)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">VRF</span>
                  {config?.vrf ? (
                    <Badge variant="secondary" className="font-mono">
                      {config.vrf}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {config && settingsOpen && (
        <NTPGlobalSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          config={config}
          onSuccess={() => loadData(true)}
        />
      )}

      {serverModalOpen && (
        <NTPServerModal
          open={serverModalOpen}
          onOpenChange={setServerModalOpen}
          existing={editingServer}
          existingNames={existingNames}
          onSuccess={() => loadData(true)}
        />
      )}

      {deleteTarget && (
        <DeleteNTPServerModal
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          serverName={deleteTarget}
          onSuccess={() => loadData(true)}
        />
      )}
    </>
  );
}

// ---- Helpers ----

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  mono?: boolean;
}

function StatCard({ icon, iconBg, label, value, mono }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-md p-2 shrink-0 ${iconBg}`}>{icon}</div>
          <div className="min-w-0">
            <p
              className={`text-lg font-bold truncate ${mono ? "font-mono" : ""}`}
              title={value}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
