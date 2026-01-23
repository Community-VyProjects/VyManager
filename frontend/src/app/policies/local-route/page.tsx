"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  RefreshCw,
  Route,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { localRouteService, type LocalRouteRule, type LocalRouteConfigResponse, type LocalRouteCapabilitiesResponse } from "@/lib/api/local-route";
import { CreateLocalRouteModal } from "@/components/policies/CreateLocalRouteModal";
import { EditLocalRouteModal } from "@/components/policies/EditLocalRouteModal";
import { DeleteLocalRouteModal } from "@/components/policies/DeleteLocalRouteModal";
import { LocalRouteReorderBanner } from "@/components/policies/LocalRouteReorderBanner";
import { LocalRouteRuleRow } from "@/components/policies/LocalRouteRuleRow";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

export default function LocalRoutePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<LocalRouteConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<LocalRouteCapabilitiesResponse | null>(null);
  const [selectedTab, setSelectedTab] = useState<"ipv4" | "ipv6">("ipv4");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LocalRouteRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<LocalRouteRule | null>(null);

  // Drag-and-drop reorder state
  const [hasChanges, setHasChanges] = useState(false);
  const [reorderedRules, setReorderedRules] = useState<LocalRouteRule[]>([]);
  const [originalRules, setOriginalRules] = useState<LocalRouteRule[]>([]);
  const [savingReorder, setSavingReorder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchCapabilities();
    fetchConfig();
  }, []);

  const fetchCapabilities = async () => {
    try {
      const data = await localRouteService.getCapabilities();
      setCapabilities(data);
    } catch (err) {
      console.error("Error fetching capabilities:", err);
    }
  };

  const fetchConfig = async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await localRouteService.getConfig(refresh);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load local route rules");
    } finally {
      setLoading(false);
    }
  };

  const currentRules = selectedTab === "ipv4" ? config?.ipv4_rules || [] : config?.ipv6_rules || [];

  // Filter rules based on search
  const filteredRules = currentRules.filter((rule) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      rule.rule_number.toString().includes(query) ||
      rule.source?.toLowerCase().includes(query) ||
      rule.destination?.toLowerCase().includes(query) ||
      rule.inbound_interface?.toLowerCase().includes(query) ||
      rule.table?.toLowerCase().includes(query)
    );
  });

  const displayedRules = hasChanges ? reorderedRules : filteredRules;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      if (!hasChanges) {
        // First reorder - save original state
        setOriginalRules([...filteredRules]);
        setHasChanges(true);
      }

      const oldIndex = displayedRules.findIndex((r) => r.rule_number === active.id);
      const newIndex = displayedRules.findIndex((r) => r.rule_number === over.id);

      const newOrder = arrayMove(displayedRules, oldIndex, newIndex);
      setReorderedRules(newOrder);
    }
  };

  const handleCancelReorder = () => {
    setHasChanges(false);
    setReorderedRules([]);
    setOriginalRules([]);
  };

  const handleSaveReorder = async () => {
    if (!hasChanges || reorderedRules.length === 0) return;

    setSavingReorder(true);
    setError(null);

    try {
      // Calculate minimum rule number
      const minRuleNumber = Math.min(...reorderedRules.map((r) => r.rule_number));

      // Build reorder request
      const rulesWithNewNumbers = reorderedRules.map((rule, index) => ({
        old_number: rule.rule_number,
        new_number: minRuleNumber + index,
        rule_data: rule,
      }));

      await localRouteService.reorderRules(selectedTab, rulesWithNewNumbers);

      // Refresh config and reset state
      await fetchConfig(true);
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
    } catch (err) {
      console.error("Error saving reordered rules:", err);
      setError(err instanceof Error ? err.message : "Failed to save reordered rules");
    } finally {
      setSavingReorder(false);
    }
  };

  const handleTabChange = (value: string) => {
    const newTab = value as "ipv4" | "ipv6";
    setSelectedTab(newTab);

    // Reset reorder state when changing tabs
    setHasChanges(false);
    setReorderedRules([]);
    setOriginalRules([]);
    setSearchQuery("");
  };

  const handleRuleCreated = () => {
    fetchConfig(true);
  };

  const handleRuleUpdated = () => {
    fetchConfig(true);
  };

  const handleRuleDeleted = () => {
    fetchConfig(true);
  };

  const ruleIds = displayedRules.map((r) => r.rule_number);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (error && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Error Loading Local Route Rules</h2>
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
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border bg-card/30 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Route className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Local Route</h1>
                <p className="text-sm text-muted-foreground">
                  Policy-based routing for IPv4 and IPv6 traffic
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => fetchConfig(true)} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setCreateModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </div>
          </div>

          <Tabs value={selectedTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="ipv4" className="flex items-center gap-2">
                IPv4
                {config && (
                  <Badge variant="secondary" className="ml-1">
                    {config.total_ipv4}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ipv6" className="flex items-center gap-2">
                IPv6
                {config && (
                  <Badge variant="secondary" className="ml-1">
                    {config.total_ipv6}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Reorder Banner */}
        {hasChanges && (
          <LocalRouteReorderBanner
            ruleCount={reorderedRules.length}
            onSave={handleSaveReorder}
            onCancel={handleCancelReorder}
            saving={savingReorder}
          />
        )}

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <Tabs value={selectedTab}>
            <TabsContent value="ipv4" className="mt-0">
              {/* Search */}
              <div className="mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    disabled={hasChanges}
                  />
                </div>
              </div>

              {displayedRules.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                  <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {searchQuery ? "No rules match your search" : "No IPv4 local route rules configured"}
                  </h3>
                  {!searchQuery && (
                    <p className="text-sm text-muted-foreground mb-6">
                      Create your first rule to start policy-based routing
                    </p>
                  )}
                  {!searchQuery && (
                    <Button onClick={() => setCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create IPv4 Rule
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead className="w-24">Rule</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Interface</TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead>VRF</TableHead>
                          <TableHead className="w-24 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SortableContext items={ruleIds} strategy={verticalListSortingStrategy}>
                          {displayedRules.map((rule) => (
                            <LocalRouteRuleRow
                              key={rule.rule_number}
                              rule={rule}
                              onEdit={(rule) => setEditingRule(rule)}
                              onDelete={(rule) => setDeletingRule(rule)}
                            />
                          ))}
                        </SortableContext>
                      </TableBody>
                    </Table>
                  </DndContext>
                </div>
              )}
            </TabsContent>

            <TabsContent value="ipv6" className="mt-0">
              {/* Search */}
              <div className="mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    disabled={hasChanges}
                  />
                </div>
              </div>

              {displayedRules.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                  <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {searchQuery ? "No rules match your search" : "No IPv6 local route rules configured"}
                  </h3>
                  {!searchQuery && (
                    <p className="text-sm text-muted-foreground mb-6">
                      Create your first rule to start policy-based routing
                    </p>
                  )}
                  {!searchQuery && (
                    <Button onClick={() => setCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create IPv6 Rule
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead className="w-24">Rule</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Interface</TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead>VRF</TableHead>
                          <TableHead className="w-24 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SortableContext items={ruleIds} strategy={verticalListSortingStrategy}>
                          {displayedRules.map((rule) => (
                            <LocalRouteRuleRow
                              key={rule.rule_number}
                              rule={rule}
                              onEdit={(rule) => setEditingRule(rule)}
                              onDelete={(rule) => setDeletingRule(rule)}
                            />
                          ))}
                        </SortableContext>
                      </TableBody>
                    </Table>
                  </DndContext>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <CreateLocalRouteModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleRuleCreated}
        ruleType={selectedTab}
      />

      {editingRule && (
        <EditLocalRouteModal
          open={!!editingRule}
          onOpenChange={(open) => !open && setEditingRule(null)}
          onSuccess={handleRuleUpdated}
          rule={editingRule}
          ruleType={selectedTab}
        />
      )}

      {deletingRule && (
        <DeleteLocalRouteModal
          open={!!deletingRule}
          onOpenChange={(open) => !open && setDeletingRule(null)}
          onSuccess={handleRuleDeleted}
          rule={deletingRule}
          ruleType={selectedTab}
        />
      )}
    </AppLayout>
  );
}
