"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Waypoints,
  MapPin,
  Network,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  AlertCircle,
  Info,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  segmentRoutingService,
  SegmentRoutingConfig,
  SegmentRoutingCapabilities,
  Srv6Locator,
} from "@/lib/api/segment-routing";
import { LocatorModal } from "./LocatorModal";
import { DeleteLocatorModal } from "./DeleteLocatorModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

// ============================================================================
// Main Component
// ============================================================================

export function SegmentRoutingContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.SEGMENT_ROUTING);

  const [config, setConfig] = useState<SegmentRoutingConfig | null>(null);
  const [capabilities, setCapabilities] = useState<SegmentRoutingCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [locatorModalOpen, setLocatorModalOpen] = useState(false);
  const [editingLocator, setEditingLocator] = useState<Srv6Locator | null>(null);
  const [deletingLocator, setDeletingLocator] = useState<string | null>(null);

  const requiresRecreate =
    capabilities?.version_info.modify_requires_recreate === true;
  const treeIsEmpty =
    (config?.locators.length ?? 0) === 0 && (config?.interfaces.length ?? 0) === 0;
  const hasSrv6Interface = (config?.interfaces.length ?? 0) > 0;

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        segmentRoutingService.getConfig(refresh),
        segmentRoutingService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Segment Routing configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================================
  // Stats
  // ============================================================================

  const locatorCount = config?.locators.length ?? 0;
  const usidCount = config?.locators.filter((l) => l.behavior_usid).length ?? 0;
  const srv6InterfaceCount = config?.interfaces.length ?? 0;

  // ============================================================================
  // CRUD Handlers
  // ============================================================================

  const handleCreateLocator = async (locator: Srv6Locator, enableInterface?: string) => {
    if (requiresRecreate && !treeIsEmpty && config) {
      // VyOS 1.4 cannot modify an existing tree in place: rebuild the whole
      // desired state (current config + the new locator) via delete+recreate.
      const desired: SegmentRoutingConfig = {
        locators: [...config.locators, locator],
        interfaces: enableInterface
          ? [...config.interfaces, { name: enableInterface, hmac: null }]
          : config.interfaces,
      };
      await segmentRoutingService.applyViaRecreate(desired);
    } else {
      await segmentRoutingService.createLocator(locator, enableInterface);
    }
    await loadData(true);
  };

  const handleUpdateLocator = async (locator: Srv6Locator) => {
    if (!editingLocator || !config) return;
    if (requiresRecreate) {
      const desired: SegmentRoutingConfig = {
        locators: config.locators.map((l) =>
          l.name === editingLocator.name ? locator : l
        ),
        interfaces: config.interfaces,
      };
      await segmentRoutingService.applyViaRecreate(desired);
    } else {
      await segmentRoutingService.updateLocator(editingLocator, locator);
    }
    setEditingLocator(null);
    await loadData(true);
  };

  const handleDeleteLocator = async () => {
    if (!deletingLocator || !config) return;
    if (requiresRecreate) {
      const desired: SegmentRoutingConfig = {
        locators: config.locators.filter((l) => l.name !== deletingLocator),
        interfaces: config.interfaces,
      };
      await segmentRoutingService.applyViaRecreate(desired);
    } else {
      await segmentRoutingService.deleteLocator(deletingLocator);
    }
    setDeletingLocator(null);
    await loadData(true);
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
                <Waypoints className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Segment Routing</h1>
                {!hasWritePermission && (
                  <Badge variant="secondary" className="text-xs">Read Only</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                SRv6 locators and interface configuration
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

          {requiresRecreate && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-blue-500/10 border border-blue-500/20 p-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                VyOS 1.4 cannot modify existing Segment Routing configuration in
                place. Changes on this router are applied by removing and
                recreating the whole segment-routing tree in two commits.
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{locatorCount}</p>
                    <p className="text-xs text-muted-foreground">SRv6 Locators</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <Waypoints className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{usidCount}</p>
                    <p className="text-xs text-muted-foreground">uSID Behavior</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <Network className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{srv6InterfaceCount}</p>
                    <p className="text-xs text-muted-foreground">SRv6 Interfaces</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Locators Section */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Locators define the IPv6 prefix a router advertises for SRv6
                segments. IGPs such as IS-IS allocate SIDs from them.
              </p>
              {hasWritePermission && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingLocator(null);
                    setLocatorModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Locator
                </Button>
              )}
            </div>

            {locatorCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <MapPin className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No SRv6 locators configured</p>
                <p className="text-sm mt-1">Add a locator to start using Segment Routing over IPv6</p>
                {hasWritePermission && (
                  <Button
                    className="mt-4"
                    onClick={() => {
                      setEditingLocator(null);
                      setLocatorModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Locator
                  </Button>
                )}
              </div>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Prefix</TableHead>
                        <TableHead>Block Len</TableHead>
                        <TableHead>Node Len</TableHead>
                        <TableHead>Func Bits</TableHead>
                        <TableHead>uSID</TableHead>
                        {hasWritePermission && <TableHead className="w-20" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config?.locators.map((locator) => (
                        <TableRow key={locator.name}>
                          <TableCell className="font-medium">{locator.name}</TableCell>
                          <TableCell className="font-mono">{locator.prefix ?? "—"}</TableCell>
                          <TableCell>{locator.block_len ?? <span className="text-muted-foreground">40 (default)</span>}</TableCell>
                          <TableCell>{locator.node_len ?? <span className="text-muted-foreground">24 (default)</span>}</TableCell>
                          <TableCell>{locator.func_bits ?? <span className="text-muted-foreground">16 (default)</span>}</TableCell>
                          <TableCell>
                            {locator.behavior_usid ? (
                              <Badge variant="secondary" className="text-xs">uSID</Badge>
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
                                    setEditingLocator(locator);
                                    setLocatorModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeletingLocator(locator.name)}
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
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <LocatorModal
        open={locatorModalOpen}
        onOpenChange={(open) => {
          setLocatorModalOpen(open);
          if (!open) setEditingLocator(null);
        }}
        onSubmit={editingLocator ? handleUpdateLocator : handleCreateLocator}
        existingLocator={editingLocator}
        existingNames={config?.locators.map((l) => l.name) ?? []}
        needsInterfaceEnable={!hasSrv6Interface}
        requiresRecreate={requiresRecreate}
      />

      <DeleteLocatorModal
        open={deletingLocator !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingLocator(null);
        }}
        locatorName={deletingLocator ?? ""}
        requiresRecreate={requiresRecreate}
        onConfirm={handleDeleteLocator}
      />
    </>
  );
}
