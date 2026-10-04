"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
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
import { Network, RefreshCw, Pencil, Trash2, Plus, Radio, ShieldCheck, MapPin, AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  lldpService,
  LLDPConfig,
  LLDPCapabilities,
  LLDPInterface,
} from "@/lib/api/lldp";
import { LLDPSettingsModal } from "./LLDPSettingsModal";
import { LLDPInterfaceModal } from "./LLDPInterfaceModal";
import { DeleteLLDPInterfaceModal } from "./DeleteLLDPInterfaceModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type ModeKey = "rxTx" | "rx" | "tx" | "disable";

function modeLabel(mode: string, tr: (key: ModeKey) => string): string {
  switch (mode) {
    case "rx-tx": return tr("rxTx");
    case "rx": return tr("rx");
    case "tx": return tr("tx");
    case "disable": return tr("disable");
    default: return mode;
  }
}

type LocationKey = "elin" | "coord" | "coordinate";

function locationSummary(iface: LLDPInterface, tr: (key: LocationKey, value: string) => string): string {
  if (!iface.location) return "—";
  if (iface.location.elin) return tr("elin", iface.location.elin);
  const c = iface.location.coordinate_based;
  if (c) {
    const parts = [c.latitude, c.longitude].filter(Boolean);
    return parts.length > 0 ? tr("coord", parts.join(", ")) : tr("coordinate", "");
  }
  return "—";
}

function legacyProtocolBadges(config: LLDPConfig) {
  const active = (
    [
      { key: "cdp", label: "CDP" },
      { key: "edp", label: "EDP" },
      { key: "fdp", label: "FDP" },
      { key: "sonmp", label: "SONMP" },
    ] as const
  ).filter(({ key }) => config.legacy_protocols[key]);
  return active;
}

export function LLDPContent() {
  const t = useTranslations("lldp");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.LLDP);

  const [config, setConfig] = useState<LLDPConfig | null>(null);
  const [capabilities, setCapabilities] = useState<LLDPCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [interfaceModalOpen, setInterfaceModalOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<LLDPInterface | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [cfg, caps] = await Promise.all([
        lldpService.getConfig(refresh),
        lldpService.getCapabilities(),
      ]);
      setConfig(cfg);
      setCapabilities(caps);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("content.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

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
          {tc("retry")}
        </Button>
      </div>
    );
  }

  const protocols = config ? legacyProtocolBadges(config) : [];
  const activeProtocolCount = protocols.length;
  const existingNames = config?.interfaces.map((i) => i.name) ?? [];

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">LLDP</h1>
                  {!hasWrite && (
                    <Badge variant="secondary">{tc("readOnly")}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("content.subtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasWrite && (
                <Button size="sm" onClick={() => setSettingsOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t("content.editSettings")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {tc("refresh")}
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
              icon={<MapPin className="h-4 w-4 text-primary" />}
              iconBg="bg-primary/10"
              label={t("content.managementAddresses")}
              value={String(config?.management_addresses.length ?? 0)}
            />
            <StatCard
              icon={<Network className="h-4 w-4 text-primary" />}
              iconBg="bg-primary/10"
              label={t("content.configuredInterfaces")}
              value={String(config?.interfaces.length ?? 0)}
            />
            <StatCard
              icon={<ShieldCheck className="h-4 w-4 text-primary" />}
              iconBg="bg-primary/10"
              label="SNMP"
              value={config?.snmp_enabled ? tc("enabled") : tc("disabled")}
            />
            <StatCard
              icon={<Radio className="h-4 w-4 text-primary" />}
              iconBg="bg-primary/10"
              label={t("content.legacyProtocols")}
              value={`${activeProtocolCount} / 4`}
            />
          </div>

          {/* Global Settings card */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Network className="h-4 w-4" />
                {t("content.globalSettings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {t("content.managementAddresses")}
                </p>
                {config && config.management_addresses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {config.management_addresses.map((addr) => (
                      <Badge key={addr} variant="secondary" className="font-mono">
                        {addr}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("content.noneConfigured")}</p>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">SNMP</span>
                {config?.snmp_enabled ? (
                  <Badge
                    variant="secondary"
                    className="bg-green-500/10 text-green-600 dark:text-green-500"
                  >
                    {tc("enabled")}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    {tc("disabled")}
                  </Badge>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {t("content.legacyDiscoveryProtocols")}
                </p>
                {protocols.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {protocols.map(({ key, label }) => (
                      <Badge
                        key={key}
                        variant="secondary"
                        className="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("content.noneActive")}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Interface Overrides */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Network className="h-4 w-4" />
                  {t("content.interfaceOverrides")}
                </CardTitle>
                {hasWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingInterface(null);
                      setInterfaceModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("content.addOverride")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {config && config.interfaces.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("content.colInterface")}</TableHead>
                      <TableHead>{t("content.colMode")}</TableHead>
                      <TableHead>{t("content.colLocation")}</TableHead>
                      {hasWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.interfaces.map((iface) => (
                      <TableRow key={iface.name}>
                        <TableCell className="font-mono font-medium">
                          {iface.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              iface.disabled
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-green-500/10 text-green-600 dark:text-green-500"
                            }
                          >
                            {modeLabel(iface.mode, (k) => t(`mode.${k}`))}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {locationSummary(iface, (k, value) =>
                            k === "coordinate" ? t("location.coordinate") : t(`location.${k}`, { value })
                          )}
                        </TableCell>
                        {hasWrite && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingInterface(iface);
                                  setInterfaceModalOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(iface.name)}
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
                    <Network className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium mb-1">{t("content.emptyTitle")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("content.emptyHint")}
                  </p>
                  {hasWrite && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setEditingInterface(null);
                        setInterfaceModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("content.addOverride")}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {config && capabilities && settingsOpen && (
        <LLDPSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          config={config}
          capabilities={capabilities}
          onSuccess={() => loadData(true)}
        />
      )}

      {capabilities && interfaceModalOpen && (
        <LLDPInterfaceModal
          open={interfaceModalOpen}
          onOpenChange={setInterfaceModalOpen}
          existing={editingInterface}
          capabilities={capabilities}
          existingNames={existingNames}
          onSuccess={() => loadData(true)}
        />
      )}

      {deleteTarget && (
        <DeleteLLDPInterfaceModal
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          interfaceName={deleteTarget}
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
}

function StatCard({ icon, iconBg, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-md p-2 ${iconBg}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
