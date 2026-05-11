"use client";

import { useState, useEffect, useCallback } from "react";
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

export function ContainerContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.CONTAINER);

  const [config, setConfig] = useState<ContainerConfig | null>(null);
  const [capabilities, setCapabilities] = useState<ContainerCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseDirExists, setBaseDirExists] = useState<boolean | null>(null);

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
      setError(err instanceof Error ? err.message : "Failed to load container configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showNetworks = capabilities?.features.container_networks?.supported !== false;
  const showRegistries = capabilities?.features.container_registries?.supported !== false;

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
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>Retry</Button>
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
                <h1 className="text-2xl font-bold text-foreground">Containers</h1>
                {!hasWritePermission && <Badge variant="secondary">Read Only</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage container instances, networks, and registries
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadData(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
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
                  <p className="text-xs text-muted-foreground">Containers</p>
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
                  <p className="text-xs text-muted-foreground">Networks</p>
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
                  <p className="text-xs text-muted-foreground">Registries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 p-6 pt-4 overflow-auto">
        <Tabs defaultValue="containers">
          <TabsList>
            <TabsTrigger value="containers">Containers</TabsTrigger>
            {showNetworks && <TabsTrigger value="networks">Networks</TabsTrigger>}
            {showRegistries && <TabsTrigger value="registries">Registries</TabsTrigger>}
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="apps">Apps</TabsTrigger>
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
