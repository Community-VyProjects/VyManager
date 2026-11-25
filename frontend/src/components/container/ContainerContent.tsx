"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { containerTabFromSearch, type ContainerTab } from "@/lib/query-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Box, Database, Loader2, Network, RefreshCw, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { containerService, type ContainerCapabilities, type ContainerConfig } from "@/lib/api/container";
import type { ApiError } from "@/lib/types/api";
import { ContainersTab } from "./ContainersTab";
import { NetworksTab } from "./NetworksTab";
import { RegistriesTab } from "./RegistriesTab";
import { ImagesTab } from "./ImagesTab";
import { AppsTab } from "./AppsTab";
import { SetupDirectoryModal } from "./SetupDirectoryModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { SSHNotConfigured } from "@/components/console/SSHNotConfigured";
import { useSessionStore } from "@/store/session-store";

/** The router's text when the instance has no SSH key; it opens the set-up screen. */
const SSH_KEY_NOT_CONFIGURED = "SSH key not configured.";

export function ContainerContent() {
  const t = useTranslations("containers");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.CONTAINER);
  const appliance = useSessionStore((s) => s.appliance);
  const searchParams = useSearchParams();

  const [config, setConfig] = useState<ContainerConfig | null>(null);
  const [capabilities, setCapabilities] = useState<ContainerCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseDirExists, setBaseDirExists] = useState<boolean | null>(null);
  const [pickedTab, setPickedTab] = useState<{ search: string; tab: ContainerTab } | null>(null);
  const [rootOpen, setRootOpen] = useState(false);
  const [rootSaving, setRootSaving] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);

  // State is set only after the requests return, so the mount effect sets none synchronously.
  const load = useCallback(async (refresh: boolean) => {
    try {
      const [configData, capsData, baseDirData] = await Promise.all([
        containerService.getConfig(refresh),
        containerService.getCapabilities(),
        containerService.checkBaseDir(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
      setBaseDirExists(baseDirData.exists);
      setError(null);
    } catch (err: unknown) {
      setError((err as ApiError).message || t("content.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  /** Re-read the device config after a save without swapping the page for the spinner. */
  const reload = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const retry = () => {
    setLoading(true);
    void load(true);
  };

  // A tab from the URL applies until the user picks one for that URL.
  const searchKey = searchParams.toString();
  const searchTab = containerTabFromSearch((key) => searchParams.get(key));
  const selectedTab = pickedTab && pickedTab.search === searchKey ? pickedTab.tab : searchTab ?? "containers";

  const handleRootOpenChange = (next: boolean) => {
    if (!next && rootSaving) return;
    if (!next) setRootError(null);
    setRootOpen(next);
  };

  const deleteRoot = async (event: MouseEvent) => {
    event.preventDefault();
    setRootSaving(true);
    setRootError(null);
    try {
      await containerService.deleteContainerRoot();
      setRootOpen(false);
      void reload();
    } catch (err: unknown) {
      setRootError((err as ApiError).message || t("content.deleteAllFailed"));
    } finally {
      setRootSaving(false);
    }
  };

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

  if (error && (!config || !capabilities)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        {error === SSH_KEY_NOT_CONFIGURED ? <SSHNotConfigured /> : <p className="text-destructive whitespace-pre-wrap">{error}</p>}
        {error !== SSH_KEY_NOT_CONFIGURED && <Button variant="outline" onClick={retry}>{tc("retry")}</Button>}
      </div>
    );
  }

  if (!config || !capabilities) return null;

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
                {!hasWritePermission && <Badge variant="secondary">{tc("readOnly")}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{t("content.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.configured && hasWritePermission && !appliance && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={refreshing}
                onClick={() => setRootOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />{t("content.deleteAll")}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => void reload()} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />{tc("refresh")}
            </Button>
          </div>
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
                  <p className="text-xs text-muted-foreground">{t("content.title")}</p>
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
                  <p className="text-xs text-muted-foreground">{t("tab.networks")}</p>
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
        <Tabs value={selectedTab} onValueChange={(value) => setPickedTab({ search: searchKey, tab: value as ContainerTab })}>
          <TabsList>
            <TabsTrigger value="containers">{t("content.title")}</TabsTrigger>
            <TabsTrigger value="networks">{t("tab.networks")}</TabsTrigger>
            <TabsTrigger value="registries">{t("content.registries")}</TabsTrigger>
            <TabsTrigger value="images">{t("content.images")}</TabsTrigger>
            <TabsTrigger value="apps">{t("content.apps")}</TabsTrigger>
          </TabsList>

          <TabsContent value="containers" className="mt-4">
            <ContainersTab
              config={config}
              capabilities={capabilities}
              hasWritePermission={hasWritePermission}
              refreshing={refreshing}
              onReload={reload}
            />
          </TabsContent>

          <TabsContent value="networks" className="mt-4">
            <NetworksTab
              config={config}
              capabilities={capabilities}
              hasWritePermission={hasWritePermission}
              refreshing={refreshing}
              onReload={reload}
            />
          </TabsContent>

          <TabsContent value="registries" className="mt-4">
            <RegistriesTab
              config={config}
              capabilities={capabilities}
              hasWritePermission={hasWritePermission}
              refreshing={refreshing}
              onReload={reload}
            />
          </TabsContent>

          <TabsContent value="images" className="mt-4">
            <ImagesTab config={config} hasWritePermission={hasWritePermission} onReload={reload} />
          </TabsContent>

          <TabsContent value="apps" className="mt-4">
            <AppsTab
              config={config}
              capabilities={capabilities}
              hasWritePermission={hasWritePermission}
              refreshing={refreshing}
              onReload={reload}
            />
          </TabsContent>
        </Tabs>
      </div>

      <SetupDirectoryModal
        open={baseDirExists === false && hasWritePermission}
        onCreated={() => setBaseDirExists(true)}
      />

      <AlertDialog open={rootOpen} onOpenChange={handleRootOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.deleteAll")}</AlertDialogTitle>
            <AlertDialogDescription>{t("content.deleteAllConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          {rootError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{rootError}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rootSaving}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteRoot}
              disabled={rootSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rootSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("deleting")}</>
              ) : (
                t("tab.apply")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
