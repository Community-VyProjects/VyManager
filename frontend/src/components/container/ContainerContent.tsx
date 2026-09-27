"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { containerTabFromSearch, type ContainerTab } from "@/lib/query-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Box, RefreshCw, Network, Database } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { containerService, type ContainerConfig, type ContainerCapabilities } from "@/lib/api/container";
import { ContainersTab } from "./ContainersTab";
import { NetworksTab } from "./NetworksTab";
import { RegistriesTab } from "./RegistriesTab";
import { ImagesTab } from "./ImagesTab";
import { AppsTab } from "./AppsTab";
import { SetupDirectoryModal } from "./SetupDirectoryModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { SSHNotConfigured } from "@/components/console/SSHNotConfigured";

export function ContainerContent() {
  const t = useTranslations("containers");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.CONTAINER);
  const searchParams = useSearchParams();

  const [config, setConfig] = useState<ContainerConfig | null>(null);
  const [capabilities, setCapabilities] = useState<ContainerCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseDirExists, setBaseDirExists] = useState<boolean | null>(null);
  const [selectedTab, setSelectedTab] = useState<ContainerTab>("containers");

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData, baseDirData] = await Promise.all([
        containerService.getConfig(refresh),
        containerService.getCapabilities(),
        containerService.checkBaseDir(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
      setBaseDirExists(baseDirData.exists);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("content.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showNetworks = capabilities?.features.container_networks?.supported !== false;
  const showRegistries = capabilities?.features.container_registries?.supported !== false;

  useEffect(() => {
    const tab = containerTabFromSearch((key) => searchParams.get(key));
    if (!tab) return;
    if (tab === "networks" && !showNetworks) return;
    if (tab === "registries" && !showRegistries) return;
    setSelectedTab(tab);
  }, [searchParams, showNetworks, showRegistries]);

  const totalContainers = config?.containers.length ?? 0;
  const totalNetworks = config?.networks.length ?? 0;
  const totalRegistries = config?.registries.length ?? 0;

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
        {error === "SSH key not configured." ? <SSHNotConfigured /> : <p className="text-destructive">{error}</p>}
        {error !== "SSH key not configured." && <Button variant="outline" onClick={() => loadData()}>{tc("retry")}</Button>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2 bg-primary/10">
              <Box className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{t("content.title")}</h1>
                {!hasWritePermission && <Badge variant="secondary">{t("content.readOnly")}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("content.subtitle")}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadData(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />{tc("refresh")}
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md p-2 bg-primary/10">
                  <Box className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalContainers}</p>
                  <p className="text-xs text-muted-foreground">{t("content.containers")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md p-2 bg-blue-500/10">
                  <Network className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalNetworks}</p>
                  <p className="text-xs text-muted-foreground">{t("content.networks")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md p-2 bg-purple-500/10">
                  <Database className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalRegistries}</p>
                  <p className="text-xs text-muted-foreground">{t("content.registries")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 p-6 pt-4 overflow-auto">
        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as ContainerTab)}>
          <TabsList>
            <TabsTrigger value="containers">{t("content.containers")}</TabsTrigger>
            {showNetworks && <TabsTrigger value="networks">{t("content.networks")}</TabsTrigger>}
            {showRegistries && <TabsTrigger value="registries">{t("content.registries")}</TabsTrigger>}
            <TabsTrigger value="images">{t("content.images")}</TabsTrigger>
            <TabsTrigger value="apps">{t("content.apps")}</TabsTrigger>
          </TabsList>

          <TabsContent value="containers" className="mt-4">
            {config && (
              <ContainersTab
                config={config}
                capabilities={capabilities}
                hasWritePermission={hasWritePermission}
                onReload={() => loadData(true)}
              />
            )}
          </TabsContent>

          {showNetworks && (
            <TabsContent value="networks" className="mt-4">
              {config && (
                <NetworksTab
                  config={config}
                  capabilities={capabilities}
                  hasWritePermission={hasWritePermission}
                  onReload={() => loadData(true)}
                />
              )}
            </TabsContent>
          )}

          {showRegistries && (
            <TabsContent value="registries" className="mt-4">
              {config && (
                <RegistriesTab
                  config={config}
                  capabilities={capabilities}
                  hasWritePermission={hasWritePermission}
                  onReload={() => loadData(true)}
                />
              )}
            </TabsContent>
          )}

          <TabsContent value="images" className="mt-4">
            {config && (
              <ImagesTab
                config={config}
                hasWritePermission={hasWritePermission}
              />
            )}
          </TabsContent>

          <TabsContent value="apps" className="mt-4">
            {config && (
              <AppsTab
                config={config}
                capabilities={capabilities}
                hasWritePermission={hasWritePermission}
                onReload={() => loadData(true)}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SetupDirectoryModal
        open={baseDirExists === false && hasWritePermission}
        onCreated={() => setBaseDirExists(true)}
      />
    </div>
  );
}
