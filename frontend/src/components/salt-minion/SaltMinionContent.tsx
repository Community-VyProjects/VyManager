"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot,
  RefreshCw,
  Pencil,
  Server,
  Tag,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Link,
  Network,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { saltMinionService, SaltMinionConfig } from "@/lib/api/salt-minion";
import { SaltMinionSettingsModal } from "./SaltMinionSettingsModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

function hashLabel(value: string | null): string {
  if (!value) return "sha256 (default)";
  return value.toUpperCase().replace("SHA", "SHA-");
}

export function SaltMinionContent() {
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.SALT_MINION);

  const [config, setConfig] = useState<SaltMinionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const cfg = await saltMinionService.getConfig(refresh);
      setConfig(cfg);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load Salt Minion configuration"
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

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">Salt Minion</h1>
                  {!hasWrite && <Badge variant="secondary">Read Only</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Configuration management agent — connects to a Salt master for automated state enforcement
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
              label="Masters"
              value={String(config?.masters.length ?? 0)}
            />
            <StatCard
              icon={<Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
              iconBg="bg-blue-500/10"
              label="Minion ID"
              value={config?.id ?? "Hostname"}
              mono
            />
            <StatCard
              icon={<Clock className="h-4 w-4 text-green-600 dark:text-green-400" />}
              iconBg="bg-green-500/10"
              label="Interval"
              value={config?.interval ? `${config.interval} min` : "60 min (default)"}
            />
            <StatCard
              icon={<ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
              iconBg="bg-purple-500/10"
              label="Hash"
              value={hashLabel(config?.hash ?? null)}
              mono
            />
          </div>

          {/* Masters card */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Server className="h-4 w-4" />
                  Master Servers
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {config && config.masters.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {config.masters.map((master) => (
                    <Badge key={master} variant="secondary" className="font-mono">
                      {master}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full p-3 bg-muted mb-3">
                    <Server className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium mb-1">No masters configured</p>
                  <p className="text-xs text-muted-foreground">
                    At least one master server is required for the minion to connect
                  </p>
                  {hasWrite && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit Settings
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration card */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Bot className="h-4 w-4" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-4">
                <ConfigRow
                  icon={<Link className="h-4 w-4 text-muted-foreground" />}
                  label="Master Key URL"
                  value={config?.master_key ?? null}
                  placeholder="Not configured"
                  mono
                />
                <ConfigRow
                  icon={<Network className="h-4 w-4 text-muted-foreground" />}
                  label="Source Interface"
                  value={config?.source_interface ?? null}
                  placeholder="Default route"
                  mono
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {config && settingsOpen && (
        <SaltMinionSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          config={config}
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

interface ConfigRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  placeholder: string;
  mono?: boolean;
}

function ConfigRow({ icon, label, value, placeholder, mono }: ConfigRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value ? (
          <p className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`} title={value}>
            {value}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{placeholder}</p>
        )}
      </div>
    </div>
  );
}
