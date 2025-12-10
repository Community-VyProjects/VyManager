"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Route as RouteIcon,
  Trash2,
  Pencil,
  X,
  Network,
} from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { routeService, PolicyRoute, RouteCapabilitiesResponse } from "@/lib/api/route";
import { CreateRoutePolicyModal } from "@/components/policies/CreateRoutePolicyModal";
import { EditRoutePolicyModal } from "@/components/policies/EditRoutePolicyModal";
import { DeleteRoutePolicyModal } from "@/components/policies/DeleteRoutePolicyModal";
import { CreateRouteRuleModal } from "@/components/policies/CreateRouteRuleModal";
import { EditRouteRuleModal } from "@/components/policies/EditRouteRuleModal";
import { DeleteRouteRuleModal } from "@/components/policies/DeleteRouteRuleModal";
import { RouteRuleRow } from "@/components/policies/RouteRuleRow";
import { RouteReorderBanner } from "@/components/policies/RouteReorderBanner";
import { ManagePolicyInterfacesModal } from "@/components/policies/ManagePolicyInterfacesModal";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { apiClient } from "@/lib/api/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RoutePage() {
  const [ipv4Policies, setIpv4Policies] = useState<PolicyRoute[]>([]);
  const [ipv6Policies, setIpv6Policies] = useState<PolicyRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<RouteCapabilitiesResponse | null>(null);

  const [selectedPolicyType, setSelectedPolicyType] = useState<"route" | "route6">("route");
  const [selectedPolicyName, setSelectedPolicyName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ruleSearchQuery, setRuleSearchQuery] = useState("");

  // Modal states
  const [showCreatePolicyModal, setShowCreatePolicyModal] = useState(false);
  const [showEditPolicyModal, setShowEditPolicyModal] = useState(false);
  const [showDeletePolicyModal, setShowDeletePolicyModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyRoute | null>(null);

  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [showEditRuleModal, setShowEditRuleModal] = useState(false);
  const [showDeleteRuleModal, setShowDeleteRuleModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  const [showManageInterfacesModal, setShowManageInterfacesModal] = useState(false);

  // Drag and drop states
  const [reorderedRules, setReorderedRules] = useState<any[]>([]);
  const [originalRules, setOriginalRules] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [savingReorder, setSavingReorder] = useState(false);

  // Interface management states
  const [policyInterfaces, setPolicyInterfaces] = useState<Array<{name: string, type: string}>>([]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchData = async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const [config, caps] = await Promise.all([
        routeService.getConfig(refresh),
        routeService.getCapabilities(),
      ]);
      setIpv4Policies(config.ipv4_policies);
      setIpv6Policies(config.ipv6_policies);
      setCapabilities(caps);

      // Reset reorder state
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);

      // Auto-select first policy if none selected
      if (!selectedPolicyName) {
        const policies = selectedPolicyType === "route" ? config.ipv4_policies : config.ipv6_policies;
        if (policies.length > 0) {
          setSelectedPolicyName(policies[0].name);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load route policies");
      console.error("Error fetching route config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const policies = selectedPolicyType === "route" ? ipv4Policies : ipv6Policies;
  const selectedPolicyData = policies.find((p) => p.name === selectedPolicyName);

  // Get current rules (reordered or original)
  const currentRules = hasChanges && reorderedRules.length > 0
    ? reorderedRules
    : selectedPolicyData?.rules || [];

  // Filter policies based on search
  const filteredPolicies = policies.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
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

    if (oldIndex !== newIndex) {
      const newOrder = arrayMove(currentRules, oldIndex, newIndex);

      // Initialize states on first reorder
      if (!hasChanges) {
        setOriginalRules([...currentRules]);
      }

      setReorderedRules(newOrder);
      setHasChanges(true);
    }
  };

  const handleSaveReorder = async () => {
    if (!selectedPolicyName || reorderedRules.length === 0) return;

    setSavingReorder(true);
    try {
      await routeService.reorderRules(
        selectedPolicyType,
        selectedPolicyName,
        reorderedRules.map((r) => r.rule_number)
      );

      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
      await fetchData(true);
    } catch (err) {
      console.error("Failed to save rule order:", err);
      setError(err instanceof Error ? err.message : "Failed to save rule order");
    } finally {
      setSavingReorder(false);
    }
  };

  const handleCancelReorder = () => {
    setReorderedRules([]);
    setHasChanges(false);
    setOriginalRules([]);
  };

  const handlePolicyTypeChange = (type: "route" | "route6") => {
    // Reset reorder state when changing policy type
    if (hasChanges) {
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
    }
    setSelectedPolicyType(type);
    setSearchQuery("");
    setRuleSearchQuery("");

    // Auto-select first policy of new type
    const newPolicies = type === "route" ? ipv4Policies : ipv6Policies;
    if (newPolicies.length > 0) {
      setSelectedPolicyName(newPolicies[0].name);
    } else {
      setSelectedPolicyName(null);
    }
  };

  const handlePolicySelect = (name: string) => {
    // Reset reorder state when changing policies
    if (hasChanges) {
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
    }
    setSelectedPolicyName(name);
    setRuleSearchQuery("");
  };

  const handleDeletePolicy = (policy: PolicyRoute) => {
    setSelectedPolicy(policy);
    setShowDeletePolicyModal(true);
  };

  const handlePolicyDeleted = () => {
    // If deleted policy was selected, select another one
    if (selectedPolicyName === selectedPolicy?.name) {
      const remaining = policies.filter((p) => p.name !== selectedPolicy?.name);
      setSelectedPolicyName(remaining.length > 0 ? remaining[0].name : null);
    }
    fetchData(true);
  };

  const handleEditRule = (rule: any) => {
    setSelectedRule(rule);
    setShowEditRuleModal(true);
  };

  const handleDeleteRule = (rule: any) => {
    setSelectedRule(rule);
    setShowDeleteRuleModal(true);
  };

  // Interface management functions
  const loadPolicyInterfaces = async () => {
    if (!selectedPolicyName) {
      setPolicyInterfaces([]);
      return;
    }

    try {
      const config = await routeService.getConfig(true);
      const policies = selectedPolicyType === "route" ? config.ipv4_policies : config.ipv6_policies;
      const policy = policies.find(p => p.name === selectedPolicyName);

      if (policy && policy.interfaces) {
        setPolicyInterfaces(policy.interfaces);
      } else {
        setPolicyInterfaces([]);
      }
    } catch (err) {
      console.error("Failed to load policy interfaces:", err);
      setPolicyInterfaces([]);
    }
  };

  // Load policy interfaces when selected policy changes
  useEffect(() => {
    loadPolicyInterfaces();
  }, [selectedPolicyName, selectedPolicyType]);

  const ruleIds = filteredRules.map((r) => r.rule_number);
  const totalRules = policies.reduce((sum, p) => sum + p.rules.length, 0);

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
            <h2 className="text-xl font-semibold text-foreground">Error Loading Route Policies</h2>
            <p className="text-muted-foreground max-w-md">{error}</p>
            <Button onClick={() => fetchData(true)} variant="outline">
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
        {/* Left Sidebar - Policy List */}
        <div className="w-80 border-r border-border bg-card/50 flex flex-col">
          <div className="p-6 pb-4 shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <RouteIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Policy Route</h1>
                <p className="text-xs text-muted-foreground">
                  {policies.length} {policies.length !== 1 ? "policies" : "policy"} · {totalRules} rule{totalRules !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* IPv4/IPv6 Tabs */}
            <Tabs value={selectedPolicyType} onValueChange={(v) => handlePolicyTypeChange(v as "route" | "route6")} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="route">IPv4</TabsTrigger>
                <TabsTrigger value="route6">IPv6</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search Policies */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button
              onClick={() => setShowCreatePolicyModal(true)}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Policy
            </Button>
          </div>

          <Separator className="shrink-0" />

          {/* Policy List */}
          <ScrollArea className="flex-1 px-3 min-h-0">
            <div className="space-y-1 py-3">
              {filteredPolicies.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No policies match your search" : `No ${selectedPolicyType === "route" ? "IPv4" : "IPv6"} policies configured`}
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowCreatePolicyModal(true)}
                      className="mt-2"
                    >
                      Create your first policy
                    </Button>
                  )}
                </div>
              ) : (
                filteredPolicies.map((policy) => (
                  <div
                    key={policy.name}
                    className={cn(
                      "group relative rounded-lg transition-all",
                      selectedPolicyName === policy.name
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <button
                      onClick={() => handlePolicySelect(policy.name)}
                      className="w-full text-left px-3 py-2.5 pr-10"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm font-mono truncate">
                          {policy.name}
                        </span>
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {policy.rules.length}
                        </Badge>
                      </div>
                      {policy.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {policy.description}
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
                          handleDeletePolicy(policy);
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
          {selectedPolicyData ? (
            <>
              {/* Header */}
              <div className="p-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-foreground font-mono">
                        {selectedPolicyData.name}
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPolicy(selectedPolicyData);
                          setShowEditPolicyModal(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedPolicyData.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedPolicyData.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => fetchData(true)} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button onClick={() => setShowCreateRuleModal(true)} size="sm">
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

              {/* Applied Interfaces Section */}
              <div className="px-6 pt-4 pb-2">
                <Card className="border-2 border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm">Applied Interfaces</h3>
                        <Badge variant="secondary" className="text-xs">
                          {policyInterfaces.length}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowManageInterfacesModal(true)}
                        disabled={!selectedPolicyName}
                      >
                        <Network className="h-4 w-4 mr-2" />
                        Manage Interfaces
                      </Button>
                    </div>

                    {policyInterfaces.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                          No interfaces configured. Click "Manage Interfaces" to assign interfaces.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {policyInterfaces.map((iface) => (
                          <Badge
                            key={iface.name}
                            variant="outline"
                            className="px-3 py-1.5 flex items-center gap-2 bg-background"
                          >
                            <Network className="h-3 w-3" />
                            <span className="font-mono text-sm">{iface.name}</span>
                            <span className="text-muted-foreground text-xs">({iface.type})</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Reorder Banner */}
              {hasChanges && (
                <RouteReorderBanner
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
                      <RouteIcon className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {ruleSearchQuery ? "No Rules Match Search" : "No Rules Configured"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        {ruleSearchQuery
                          ? "Try adjusting your search criteria"
                          : "Add rules to this policy to control routing behavior"}
                      </p>
                      {!ruleSearchQuery && (
                        <Button onClick={() => setShowCreateRuleModal(true)}>
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
                              <TableHead>Rule #</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Match Conditions</TableHead>
                              <TableHead>Set Actions</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext
                              items={ruleIds}
                              strategy={verticalListSortingStrategy}
                            >
                              {filteredRules.map((rule) => (
                                <RouteRuleRow
                                  key={rule.rule_number}
                                  rule={rule}
                                  onEdit={handleEditRule}
                                  onDelete={handleDeleteRule}
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
                <RouteIcon className="h-16 w-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">
                  No Policy Selected
                </h2>
                <p className="text-muted-foreground max-w-md">
                  {policies.length === 0
                    ? "Create a policy to get started"
                    : "Select a policy from the sidebar to view its rules"}
                </p>
                {policies.length === 0 && (
                  <Button onClick={() => setShowCreatePolicyModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Policy
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Policy Modals */}
      <CreateRoutePolicyModal
        open={showCreatePolicyModal}
        onOpenChange={setShowCreatePolicyModal}
        onSuccess={() => fetchData(true)}
        policyType={selectedPolicyType}
      />

      {selectedPolicy && (
        <>
          <EditRoutePolicyModal
            open={showEditPolicyModal}
            onOpenChange={setShowEditPolicyModal}
            onSuccess={() => fetchData(true)}
            policy={selectedPolicy}
          />

          <DeleteRoutePolicyModal
            open={showDeletePolicyModal}
            onOpenChange={setShowDeletePolicyModal}
            onSuccess={handlePolicyDeleted}
            policy={selectedPolicy}
          />
        </>
      )}

      {/* Rule Modals */}
      {selectedPolicyName && (
        <>
          <CreateRouteRuleModal
            open={showCreateRuleModal}
            onOpenChange={setShowCreateRuleModal}
            onSuccess={() => fetchData(true)}
            policyType={selectedPolicyType}
            policyName={selectedPolicyName}
            capabilities={capabilities}
          />

          {selectedRule && (
            <>
              <EditRouteRuleModal
                open={showEditRuleModal}
                onOpenChange={setShowEditRuleModal}
                onSuccess={() => fetchData(true)}
                policyType={selectedPolicyType}
                policyName={selectedPolicyName}
                rule={selectedRule}
                capabilities={capabilities}
              />

              <DeleteRouteRuleModal
                open={showDeleteRuleModal}
                onOpenChange={setShowDeleteRuleModal}
                onSuccess={() => fetchData(true)}
                policyType={selectedPolicyType}
                policyName={selectedPolicyName}
                rule={selectedRule}
              />
            </>
          )}

          <ManagePolicyInterfacesModal
            open={showManageInterfacesModal}
            onOpenChange={setShowManageInterfacesModal}
            policyType={selectedPolicyType}
            policyName={selectedPolicyName || ""}
            onSuccess={() => {
              loadPolicyInterfaces();
              fetchData(true);
            }}
          />
        </>
      )}
    </AppLayout>
  );
}
