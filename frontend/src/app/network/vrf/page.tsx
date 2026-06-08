"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { VrfContent } from "@/components/vrf/VrfContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Network,
  ChevronRight,
  Plus,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import {
  vrfService,
  VrfConfig,
  VrfCapabilities,
  VrfInstance,
} from "@/lib/api/vrf";
import { CreateVrfModal } from "@/components/vrf/CreateVrfModal";

export default function VRFPage() {
  const { canRead, canWrite, isLoading: permissionsLoading } = usePermissions();

  const [config, setConfig] = useState<VrfConfig | null>(null);
  const [capabilities, setCapabilities] = useState<VrfCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVrf, setSelectedVrf] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bindingToAll, setBindingToAll] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        vrfService.getConfig(refresh),
        vrfService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
      // Auto-select first VRF if none selected or current selection no longer exists
      if (configData.instances.length > 0) {
        if (!selectedVrf || !configData.instances.find((v) => v.name === selectedVrf)) {
          setSelectedVrf(configData.instances[0].name);
        }
      } else {
        setSelectedVrf(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load VRF configuration");
    } finally {
      setLoading(false);
    }
  }, [selectedVrf]);

  useEffect(() => {
    if (!permissionsLoading && canRead(FeatureGroup.VRF)) {
      loadData();
    }
  }, [permissionsLoading]);

  const handleToggleBindToAll = async () => {
    if (!config || bindingToAll) return;
    setBindingToAll(true);
    try {
      await vrfService.setBindToAll(!config.bind_to_all);
      await loadData(true);
    } catch {
      // Error handled by loadData
    } finally {
      setBindingToAll(false);
    }
  };

  const handleVrfCreated = async () => {
    setCreateModalOpen(false);
    await loadData(true);
  };

  const handleVrfDeleted = async () => {
    setSelectedVrf(null);
    await loadData(true);
  };

  // Permission check
  if (permissionsLoading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (!canRead(FeatureGroup.VRF)) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You do not have permission to view VRF configuration.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading && !config) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (error && !config) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Configuration</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => loadData(true)}>Retry</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const selectedInstance = config?.instances.find((v) => v.name === selectedVrf) ?? null;

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left Sidebar - VRF Instance Selector */}
        <div className="w-80 border-r border-border bg-card flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Network className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">VRF Instances</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Virtual Routing & Forwarding
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* VRF Instance List */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-3">
              {config && config.instances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Network className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">No VRF instances</p>
                  <p className="text-xs text-muted-foreground">
                    Create a VRF to get started
                  </p>
                </div>
              ) : (
                config?.instances.map((vrf) => {
                  const active = selectedVrf === vrf.name;
                  const protocolCount = vrf.protocols.length + vrf.services.length;
                  return (
                    <button
                      key={vrf.name}
                      onClick={() => setSelectedVrf(vrf.name)}
                      className={cn(
                        "w-full text-left rounded-lg px-3 py-3 transition-all",
                        active
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 rounded-md p-1.5",
                            active ? "bg-primary/10" : "bg-muted"
                          )}
                        >
                          <Network
                            className={cn(
                              "h-4 w-4",
                              active ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {vrf.name}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {vrf.disabled && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  off
                                </Badge>
                              )}
                              {active && (
                                <ChevronRight className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {vrf.table && <span>table {vrf.table}</span>}
                            {vrf.table && protocolCount > 0 && <span>&middot;</span>}
                            {protocolCount > 0 && (
                              <span>
                                {protocolCount} protocol{protocolCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          {vrf.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {vrf.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Global Settings + Actions */}
          <div className="p-3 space-y-2">
            {/* Bind to All toggle */}
            <button
              onClick={handleToggleBindToAll}
              disabled={!canWrite(FeatureGroup.VRF) || bindingToAll}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent/50 transition-all disabled:opacity-50"
            >
              {bindingToAll ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : config?.bind_to_all ? (
                <ToggleRight className="h-4 w-4 text-primary" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-muted-foreground">Bind to all VRFs</span>
              {bindingToAll ? (
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  applying…
                </Badge>
              ) : config?.bind_to_all ? (
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  on
                </Badge>
              ) : null}
            </button>

            {/* Create VRF button */}
            {canWrite(FeatureGroup.VRF) && (
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create VRF
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {selectedInstance && capabilities ? (
            <VrfContent
              vrf={selectedInstance}
              capabilities={capabilities}
              canWrite={canWrite(FeatureGroup.VRF)}
              onRefresh={() => loadData(true)}
              onVrfDeleted={handleVrfDeleted}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center max-w-md">
                <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  {config?.instances.length === 0
                    ? "No VRF Instances"
                    : "Select a VRF"}
                </h2>
                <p className="text-muted-foreground">
                  {config?.instances.length === 0
                    ? "Create a VRF instance to begin configuring virtual routing."
                    : "Choose a VRF from the sidebar to view and manage its configuration."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create VRF Modal */}
      <CreateVrfModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={handleVrfCreated}
        existingNames={config?.instances.map((v) => v.name) ?? []}
      />
    </AppLayout>
  );
}
