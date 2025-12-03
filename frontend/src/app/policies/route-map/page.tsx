"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Map,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  routeMapService,
  type RouteMap,
  type RouteMapConfigResponse,
  type RouteMapRule,
} from "@/lib/api/route-map";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateRouteMapModal } from "@/components/policies/CreateRouteMapModal";
import { EditRouteMapModal } from "@/components/policies/EditRouteMapModal";
import { DeleteRouteMapModal } from "@/components/policies/DeleteRouteMapModal";
import { AddRouteMapRuleModal } from "@/components/policies/AddRouteMapRuleModal";
import { EditRouteMapRuleModal } from "@/components/policies/EditRouteMapRuleModal";
import { DeleteRouteMapRuleModal } from "@/components/policies/DeleteRouteMapRuleModal";
import { RouteMapRuleRow } from "@/components/policies/RouteMapRuleRow";
import { RouteMapReorderBanner } from "@/components/policies/RouteMapReorderBanner";

export default function RouteMapPage() {
  const [config, setConfig] = useState<RouteMapConfigResponse | null>(null);
  const [selectedRouteMap, setSelectedRouteMap] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ruleSearchQuery, setRuleSearchQuery] = useState("");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRouteMap, setEditingRouteMap] = useState<RouteMap | null>(null);
  const [deletingRouteMap, setDeletingRouteMap] = useState<RouteMap | null>(null);
  const [addRuleModalOpen, setAddRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RouteMapRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<RouteMapRule | null>(null);

  // Drag and drop states
  const [reorderedRules, setReorderedRules] = useState<RouteMapRule[]>([]);
  const [originalRules, setOriginalRules] = useState<RouteMapRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [savingReorder, setSavingReorder] = useState(false);

  // Drag and drop sensors - require 8px movement before drag starts
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchConfig = async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await routeMapService.getConfig(refresh);
      setConfig(data);

      // Reset reorder state when new config is loaded
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);

      // Auto-select first route-map if none selected
      if (!selectedRouteMap && data.route_maps.length > 0) {
        setSelectedRouteMap(data.route_maps[0].name);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load route-map configuration"
      );
      console.error("Error fetching route-map config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const routeMaps = config?.route_maps || [];
  const selectedRouteMapData = routeMaps.find((rm) => rm.name === selectedRouteMap);

  // Get current rules (reordered or original)
  const currentRules = hasChanges && reorderedRules.length > 0
    ? reorderedRules
    : selectedRouteMapData?.rules || [];

  // Filter route-maps based on search
  const filteredRouteMaps = routeMaps.filter((rm) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      rm.name.toLowerCase().includes(query) ||
      rm.description?.toLowerCase().includes(query)
    );
  });

  // Filter rules based on search
  const filteredRules = currentRules.filter((rule) => {
    if (!ruleSearchQuery) return true;
    const query = ruleSearchQuery.toLowerCase();
    return (
      rule.rule_number.toString().includes(query) ||
      rule.description?.toLowerCase().includes(query)
    );
  });

  // Drag and drop handlers
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = currentRules.findIndex((r) => r.rule_number === active.id);
    const newIndex = currentRules.findIndex((r) => r.rule_number === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newRules = arrayMove(currentRules, oldIndex, newIndex);

    // Store original rules if this is the first change
    if (!hasChanges) {
      setOriginalRules([...currentRules]);
    }

    setReorderedRules(newRules);
    setHasChanges(true);
  };

  const handleCancelReorder = () => {
    setReorderedRules([]);
    setOriginalRules([]);
    setHasChanges(false);
  };

  const handleSaveReorder = async () => {
    if (!selectedRouteMap || reorderedRules.length === 0) return;

    setSavingReorder(true);
    try {
      // Find the minimum rule number to preserve the starting point
      const minRuleNumber = Math.min(...originalRules.map(r => r.rule_number));

      // Calculate new rule numbers (renumber sequentially starting from original minimum)
      const rulesWithNewNumbers = reorderedRules.map((rule, index) => ({
        old_number: rule.rule_number,
        new_number: minRuleNumber + index,
        rule_data: rule,
      }));

      await routeMapService.reorderRules(selectedRouteMap, rulesWithNewNumbers);

      // Refresh config and reset state
      await fetchConfig(true);
    } catch (err) {
      console.error("Error saving reordered rules:", err);
      setError(err instanceof Error ? err.message : "Failed to save reordered rules");
    } finally {
      setSavingReorder(false);
    }
  };

  const handleRouteMapSelect = (name: string) => {
    // Reset reorder state when changing route-maps
    if (hasChanges) {
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
    }
    setSelectedRouteMap(name);
    setRuleSearchQuery("");
  };

  const handleDeleteRouteMap = (routeMap: RouteMap) => {
    setDeletingRouteMap(routeMap);
  };

  const handleRouteMapDeleted = () => {
    // If deleted route-map was selected, select another one
    if (selectedRouteMap === deletingRouteMap?.name) {
      const remaining = routeMaps.filter((rm) => rm.name !== deletingRouteMap?.name);
      setSelectedRouteMap(remaining.length > 0 ? remaining[0].name : null);
    }
    fetchConfig(true);
  };

  const ruleIds = filteredRules.map((r) => r.rule_number);
  const totalRules = routeMaps.reduce((sum, rm) => sum + rm.rules.length, 0);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Error Loading Route Maps</h2>
            <p className="text-muted-foreground max-w-md">{error}</p>
            <Button onClick={() => fetchConfig(true)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left Sidebar - Route Map List */}
        <div className="w-80 border-r border-border bg-card/50 flex flex-col">
          <div className="p-6 pb-4 shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Map className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Route Maps</h1>
                <p className="text-xs text-muted-foreground">
                  {routeMaps.length} map{routeMaps.length !== 1 ? "s" : ""} · {totalRules} rule{totalRules !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Search Route Maps */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search route-maps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button
              onClick={() => setCreateModalOpen(true)}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Route Map
            </Button>
          </div>

          <Separator className="shrink-0" />

          {/* Route Map List */}
          <ScrollArea className="flex-1 px-3 min-h-0">
            <div className="space-y-1 py-3">
              {filteredRouteMaps.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No route-maps match your search" : "No route-maps configured"}
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setCreateModalOpen(true)}
                      className="mt-2"
                    >
                      Create your first route-map
                    </Button>
                  )}
                </div>
              ) : (
                filteredRouteMaps.map((routeMap) => (
                  <div
                    key={routeMap.name}
                    className={cn(
                      "group relative rounded-lg transition-all",
                      selectedRouteMap === routeMap.name
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <button
                      onClick={() => handleRouteMapSelect(routeMap.name)}
                      className="w-full text-left px-3 py-2.5 pr-10"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm font-mono truncate">
                          {routeMap.name}
                        </span>
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {routeMap.rules.length}
                        </Badge>
                      </div>
                      {routeMap.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {routeMap.description}
                        </p>
                      )}
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRouteMap(routeMap);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area - Rules Table */}
        <div className="flex-1 flex flex-col">
          {selectedRouteMapData ? (
            <>
              {/* Header */}
              <div className="p-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-foreground font-mono">
                        {selectedRouteMapData.name}
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRouteMap(selectedRouteMapData)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedRouteMapData.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedRouteMapData.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => fetchConfig(true)} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button onClick={() => setAddRuleModalOpen(true)} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rule
                    </Button>
                  </div>
                </div>

                {/* Search Rules */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rules..."
                    value={ruleSearchQuery}
                    onChange={(e) => setRuleSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Reorder Banner */}
              {hasChanges && (
                <RouteMapReorderBanner
                  onSave={handleSaveReorder}
                  onCancel={handleCancelReorder}
                  saving={savingReorder}
                  count={reorderedRules.length}
                />
              )}

              {/* Rules Table */}
              <div className="flex-1 p-6 pt-4 overflow-hidden">
                {filteredRules.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Map className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {ruleSearchQuery ? "No Rules Match Search" : "No Rules Configured"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        {ruleSearchQuery
                          ? "Try adjusting your search criteria"
                          : "Add rules to this route-map to control route matching and modification"}
                      </p>
                      {!ruleSearchQuery && (
                        <Button onClick={() => setAddRuleModalOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Rule
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <ScrollArea className="h-[calc(100vh-350px)]">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      >
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Rule</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Match Conditions</TableHead>
                              <TableHead>Set Actions</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext
                              items={ruleIds}
                              strategy={verticalListSortingStrategy}
                            >
                              {filteredRules.map((rule) => (
                                <RouteMapRuleRow
                                  key={rule.rule_number}
                                  rule={rule}
                                  onEdit={setEditingRule}
                                  onDelete={setDeletingRule}
                                />
                              ))}
                            </SortableContext>
                          </TableBody>
                        </Table>
                      </DndContext>
                    </ScrollArea>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Map className="h-16 w-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">
                  No Route Map Selected
                </h2>
                <p className="text-muted-foreground max-w-md">
                  {routeMaps.length === 0
                    ? "Create a route-map to get started"
                    : "Select a route-map from the sidebar to view its rules"}
                </p>
                {routeMaps.length === 0 && (
                  <Button onClick={() => setCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Route Map
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateRouteMapModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => fetchConfig(true)}
      />

      <EditRouteMapModal
        open={editingRouteMap !== null}
        onOpenChange={(open) => !open && setEditingRouteMap(null)}
        onSuccess={() => fetchConfig(true)}
        routeMap={editingRouteMap}
      />

      <DeleteRouteMapModal
        open={deletingRouteMap !== null}
        onOpenChange={(open) => !open && setDeletingRouteMap(null)}
        onSuccess={handleRouteMapDeleted}
        routeMap={deletingRouteMap}
      />

      {selectedRouteMapData && (
        <>
          <AddRouteMapRuleModal
            open={addRuleModalOpen}
            onOpenChange={setAddRuleModalOpen}
            onSuccess={() => fetchConfig(true)}
            routeMapName={selectedRouteMapData.name}
            existingRules={selectedRouteMapData.rules}
          />

          <EditRouteMapRuleModal
            open={editingRule !== null}
            onOpenChange={(open) => !open && setEditingRule(null)}
            onSuccess={() => fetchConfig(true)}
            routeMapName={selectedRouteMapData.name}
            rule={editingRule}
          />

          <DeleteRouteMapRuleModal
            open={deletingRule !== null}
            onOpenChange={(open) => !open && setDeletingRule(null)}
            onSuccess={() => fetchConfig(true)}
            routeMapName={selectedRouteMapData.name}
            rule={deletingRule}
          />
        </>
      )}
    </AppLayout>
  );
}
