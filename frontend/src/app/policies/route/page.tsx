"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, RefreshCw, AlertCircle, Route as RouteIcon, Trash2, Pencil, Network } from "lucide-react";
import { DndContext, type DragStartEvent, type DragEndEvent, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  routeService,
  type PolicyRoute,
  type PolicyRouteRule,
  type RouteCapabilitiesResponse,
  type RoutePolicyType,
} from "@/lib/api/route";
import type { ApiError } from "@/lib/types/api";
import { FeatureGroup } from "@/lib/api/user-management";
import { usePermissions } from "@/hooks/usePermissions";
import { CreateRoutePolicyModal } from "@/components/policies/CreateRoutePolicyModal";
import { EditRoutePolicyModal } from "@/components/policies/EditRoutePolicyModal";
import { DeleteRoutePolicyModal } from "@/components/policies/DeleteRoutePolicyModal";
import { RouteRuleModal } from "@/components/policies/RouteRuleModal";
import { DeleteRouteRuleModal } from "@/components/policies/DeleteRouteRuleModal";
import { RouteRuleRow } from "@/components/policies/RouteRuleRow";
import { RouteReorderBanner } from "@/components/policies/RouteReorderBanner";
import { ManagePolicyInterfacesModal } from "@/components/policies/ManagePolicyInterfacesModal";
import { activeMatchEntries } from "@/components/policies/route-rule-form";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type ModalKind =
  | "createPolicy"
  | "editPolicy"
  | "deletePolicy"
  | "interfaces"
  | "createRule"
  | "editRule"
  | "deleteRule";

interface ModalState {
  kind: ModalKind;
  policy: PolicyRoute | null;
  rule: PolicyRouteRule | null;
}

function RoutePageInner() {
  const t = useTranslations("routePolicy.page");
  const tr = useTranslations("routePolicy.ruleRow");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.ROUTE_POLICY);

  const [ipv4Policies, setIpv4Policies] = useState<PolicyRoute[]>([]);
  const [ipv6Policies, setIpv6Policies] = useState<PolicyRoute[]>([]);
  const [capabilities, setCapabilities] = useState<RouteCapabilitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPolicyType, setSelectedPolicyType] = useState<RoutePolicyType>(() =>
    searchParams.get("section") === "route6" ? "route6" : "route",
  );
  const [selectedPolicyName, setSelectedPolicyName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ruleSearchQuery, setRuleSearchQuery] = useState("");

  // One modal at a time; the subject stays set after close so the text does not flip.
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  // Drag and drop
  const [reorderedRules, setReorderedRules] = useState<PolicyRouteRule[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [savingReorder, setSavingReorder] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const applyConfig = useCallback(async (refresh: boolean) => {
    const [config, caps] = await Promise.all([routeService.getConfig(refresh), routeService.getCapabilities()]);
    setIpv4Policies(config.ipv4_policies);
    setIpv6Policies(config.ipv6_policies);
    setCapabilities(caps);
    setReorderedRules([]);
    setReorderError(null);
    setError(null);
  }, []);

  const loadData = useCallback(async () => {
    try {
      await applyConfig(false);
    } catch (err) {
      setError((err as ApiError).message || t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [applyConfig, t]);

  /** Re-read after a save without swapping the page (and open dialogs) for the spinner. */
  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      await applyConfig(true);
    } catch (err) {
      setError((err as ApiError).message || t("loadFailed"));
    } finally {
      setRefreshing(false);
    }
  }, [applyConfig, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const policies = selectedPolicyType === "route" ? ipv4Policies : ipv6Policies;
  const selectedPolicyData = policies.find((p) => p.name === selectedPolicyName) ?? policies[0];
  const hasReorder = reorderedRules.length > 0;
  const currentRules = hasReorder ? reorderedRules : selectedPolicyData?.rules || [];
  const writeDisabled = refreshing || savingReorder;

  const filteredPolicies = policies.filter((p) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return p.name.toLowerCase().includes(query) || (p.description ?? "").toLowerCase().includes(query);
  });

  const filteredRules = currentRules.filter((rule) => {
    const query = ruleSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return rule.rule_number.toString().includes(query) || (rule.description ?? "").toLowerCase().includes(query);
  });

  const openModal = (kind: ModalKind, policy: PolicyRoute | null = null, rule: PolicyRouteRule | null = null) => {
    setModal({ kind, policy, rule });
    setModalKey((key) => key + 1);
    setModalOpen(true);
  };

  const resetReorder = () => {
    setReorderedRules([]);
    setReorderError(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = currentRules.findIndex((r) => r.rule_number === active.id);
    const newIndex = currentRules.findIndex((r) => r.rule_number === over.id);
    if (oldIndex !== newIndex) {
      setReorderedRules(arrayMove(currentRules, oldIndex, newIndex));
    }
  };

  const handleSaveReorder = async () => {
    if (!selectedPolicyData || !hasReorder) return;
    setSavingReorder(true);
    setReorderError(null);
    try {
      // Every rule of the policy, in the new order.
      await routeService.reorderRules(
        selectedPolicyType,
        selectedPolicyData.name,
        reorderedRules.map((r) => r.rule_number),
      );
      resetReorder();
      void reload();
    } catch (err) {
      setReorderError((err as ApiError).message || t("saveOrderFailed"));
    } finally {
      setSavingReorder(false);
    }
  };

  const handlePolicyTypeChange = (type: RoutePolicyType) => {
    resetReorder();
    setSelectedPolicyType(type);
    setSelectedPolicyName(null);
    setSearchQuery("");
    setRuleSearchQuery("");
  };

  const handlePolicySelect = (name: string) => {
    resetReorder();
    setSelectedPolicyName(name);
    setRuleSearchQuery("");
  };

  const handlePolicyDeleted = () => {
    if (selectedPolicyData && modal?.policy?.name === selectedPolicyData.name) {
      setSelectedPolicyName(null);
    }
    resetReorder();
    void reload();
  };

  const afterSave = () => {
    resetReorder();
    void reload();
  };

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
            <h2 className="text-xl font-semibold text-foreground">{t("errorTitle")}</h2>
            <p className="text-muted-foreground max-w-md whitespace-pre-wrap">{error}</p>
            <Button onClick={() => void reload()} variant="outline" disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              {tc("retry")}
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
                <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
                <p className="text-xs text-muted-foreground">
                  {t("summary", { policies: policies.length, rules: totalRules })}
                </p>
              </div>
            </div>

            {/* IPv4/IPv6 Tabs */}
            <Tabs value={selectedPolicyType} onValueChange={(v) => handlePolicyTypeChange(v as RoutePolicyType)} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="route">IPv4</TabsTrigger>
                <TabsTrigger value="route6">IPv6</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search Policies */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPolicies")}
                aria-label={t("searchPolicies")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {hasWrite && (
              <Button
                onClick={() => openModal("createPolicy")}
                className="w-full"
                size="sm"
                disabled={writeDisabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("createPolicy")}
              </Button>
            )}
          </div>

          <Separator className="shrink-0" />

          {/* Policy List */}
          <ScrollArea className="flex-1 px-3 min-h-0">
            <div className="space-y-1 py-3">
              {filteredPolicies.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery.trim() ? t("noPoliciesMatch") : t("noPoliciesConfigured", { family: selectedPolicyType === "route" ? "IPv4" : "IPv6" })}
                  </p>
                  {!searchQuery.trim() && hasWrite && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => openModal("createPolicy")}
                      className="mt-2"
                      disabled={writeDisabled}
                    >
                      {t("createFirstPolicy")}
                    </Button>
                  )}
                </div>
              ) : (
                filteredPolicies.map((policy) => (
                  <div
                    key={policy.name}
                    className={cn(
                      "group relative rounded-lg transition-all",
                      selectedPolicyData?.name === policy.name
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
                    {hasWrite && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          aria-label={tc("delete")}
                          disabled={writeDisabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal("deletePolicy", policy);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
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
                      {hasWrite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={tc("edit")}
                          disabled={writeDisabled}
                          onClick={() => openModal("editPolicy", selectedPolicyData)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {selectedPolicyData.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedPolicyData.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => void reload()} variant="outline" size="sm" disabled={refreshing || savingReorder}>
                      <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                      {tc("refresh")}
                    </Button>
                    {hasWrite && (
                      <Button onClick={() => openModal("createRule", selectedPolicyData)} size="sm" disabled={writeDisabled}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("addRule")}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Search Rules */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("searchRules")}
                    aria-label={t("searchRules")}
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
                        <h3 className="font-semibold text-sm">{t("appliedInterfaces")}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {selectedPolicyData.interfaces.length}
                        </Badge>
                      </div>
                      {hasWrite && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal("interfaces", selectedPolicyData)}
                          disabled={writeDisabled}
                        >
                          <Network className="h-4 w-4 mr-2" />
                          {t("manageInterfaces")}
                        </Button>
                      )}
                    </div>

                    {selectedPolicyData.interfaces.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                          {t("noInterfaces")}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedPolicyData.interfaces.map((iface) => (
                          <Badge
                            key={iface}
                            variant="outline"
                            className="px-3 py-1.5 flex items-center gap-2 bg-background"
                          >
                            <Network className="h-3 w-3" />
                            <span className="font-mono text-sm">{iface}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Reorder Banner */}
              {hasReorder && (
                <RouteReorderBanner
                  onSave={handleSaveReorder}
                  onCancel={resetReorder}
                  saving={savingReorder}
                  count={reorderedRules.length}
                  error={reorderError}
                />
              )}

              {/* Rules Table */}
              <div className="flex-1 p-6 pt-4 overflow-hidden">
                {filteredRules.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <RouteIcon className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {ruleSearchQuery.trim() ? t("noRulesMatch") : t("noRules")}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        {ruleSearchQuery.trim()
                          ? t("adjustSearch")
                          : t("addRulesHint")}
                      </p>
                      {!ruleSearchQuery.trim() && hasWrite && (
                        <Button onClick={() => openModal("createRule", selectedPolicyData)} disabled={writeDisabled}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t("addFirstRule")}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <Card>
                      <ScrollArea className="h-[calc(100vh-350px)]">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-12"></TableHead>
                              <TableHead>{t("ruleNumber")}</TableHead>
                              <TableHead>{tc("description")}</TableHead>
                              <TableHead>{t("matchConditions")}</TableHead>
                              <TableHead>{t("setActions")}</TableHead>
                              <TableHead>{tc("status")}</TableHead>
                              <TableHead className="text-right">{tc("actions")}</TableHead>
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
                                  onEdit={(r) => openModal("editRule", selectedPolicyData, r)}
                                  onDelete={(r) => openModal("deleteRule", selectedPolicyData, r)}
                                  canWrite={hasWrite}
                                  dragDisabled={writeDisabled}
                                  disabled={writeDisabled || hasReorder}
                                />
                              ))}
                            </SortableContext>
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </Card>
                    <DragOverlay
                      dropAnimation={{
                        duration: 200,
                        easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                      }}
                    >
                      {activeId !== null ? (() => {
                        const draggedRule = currentRules.find((r) => r.rule_number === activeId);
                        if (!draggedRule) return null;
                        const matchCount = activeMatchEntries(draggedRule.match).length;
                        return (
                          <div className="bg-card border-2 border-primary shadow-2xl rounded-lg overflow-hidden opacity-95">
                            <Table>
                              <TableBody>
                                <TableRow className="hover:bg-transparent">
                                  <TableCell className="w-12 text-muted-foreground">
                                    ⠿
                                  </TableCell>
                                  <TableCell className="font-mono font-medium">{draggedRule.rule_number}</TableCell>
                                  <TableCell>{draggedRule.description || "-"}</TableCell>
                                  <TableCell>
                                    {matchCount > 0 ? (
                                      <Badge variant="secondary" className="text-xs">
                                        {tr("conditions", { count: matchCount })}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell></TableCell>
                                  <TableCell>
                                    {draggedRule.disable ? (
                                      <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">{tc("disabled")}</Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">{tc("enabled")}</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })() : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <RouteIcon className="h-16 w-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">
                  {t("noPolicySelected")}
                </h2>
                <p className="text-muted-foreground max-w-md">
                  {policies.length === 0
                    ? t("createToStart")
                    : t("selectFromSidebar")}
                </p>
                {policies.length === 0 && hasWrite && (
                  <Button onClick={() => openModal("createPolicy")} disabled={writeDisabled}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("createPolicy")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {modal?.kind === "createPolicy" && (
        <CreateRoutePolicyModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          policyType={selectedPolicyType}
          existingNames={policies.map((p) => p.name)}
          capabilities={capabilities}
        />
      )}

      {modal?.kind === "editPolicy" && modal.policy && (
        <EditRoutePolicyModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          policy={modal.policy}
          capabilities={capabilities}
        />
      )}

      {modal?.kind === "deletePolicy" && modal.policy && (
        <DeleteRoutePolicyModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={handlePolicyDeleted}
          policy={modal.policy}
        />
      )}

      {modal?.kind === "interfaces" && modal.policy && (
        <ManagePolicyInterfacesModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          policy={modal.policy}
        />
      )}

      {(modal?.kind === "createRule" || modal?.kind === "editRule") && modal.policy && (
        <RouteRuleModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          policyType={modal.policy.policy_type}
          policyName={modal.policy.name}
          capabilities={capabilities}
          existing={modal.kind === "editRule" ? modal.rule : null}
          existingRuleNumbers={modal.policy.rules.map((r) => r.rule_number)}
        />
      )}

      {modal?.kind === "deleteRule" && modal.policy && modal.rule && (
        <DeleteRouteRuleModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          policyType={modal.policy.policy_type}
          policyName={modal.policy.name}
          rule={modal.rule}
        />
      )}
    </AppLayout>
  );
}

export default function RoutePage() {
  return (
    <Suspense>
      <RoutePageInner />
    </Suspense>
  );
}
