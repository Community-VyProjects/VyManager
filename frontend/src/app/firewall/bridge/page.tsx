"use client";

import { AppLayout } from "@/components/layout/AppLayout";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Network,
  ChevronRight,
  Trash2,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  bridgeFirewallService,
  type BridgeConfigResponse,
  type BridgeCapabilities,
  type BridgeRule,
  type BridgeChain,
} from "@/lib/api/firewall-bridge";
import { cn } from "@/lib/utils";
import { CreateBridgeRuleModal } from "@/components/firewall/CreateBridgeRuleModal";
import { EditBridgeRuleModal } from "@/components/firewall/EditBridgeRuleModal";
import { DeleteBridgeRuleModal } from "@/components/firewall/DeleteBridgeRuleModal";
import { CreateCustomBridgeChainModal } from "@/components/firewall/CreateCustomBridgeChainModal";
import { DeleteCustomBridgeChainModal } from "@/components/firewall/DeleteCustomBridgeChainModal";
import { BridgeRuleRow } from "@/components/firewall/BridgeRuleRow";
import { BridgeReorderBanner } from "@/components/firewall/BridgeReorderBanner";

export default function BridgeFirewallPage() {
  const [config, setConfig] = useState<BridgeConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<BridgeCapabilities | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>("forward");
  const [isCustomChain, setIsCustomChain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<{ chain: string; rule: BridgeRule } | null>(null);
  const [deletingRule, setDeletingRule] = useState<{ chain: string; rule: BridgeRule } | null>(null);
  const [createChainModalOpen, setCreateChainModalOpen] = useState(false);
  const [deletingChain, setDeletingChain] = useState<BridgeChain | null>(null);

  // Default action save state
  const [savingDefaultAction, setSavingDefaultAction] = useState(false);

  // Reorder state
  const [reorderedRules, setReorderedRules] = useState<BridgeRule[]>([]);
  const [originalRules, setOriginalRules] = useState<BridgeRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [savingReorder, setSavingReorder] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadData = useCallback(async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capabilitiesData] = await Promise.all([
        bridgeFirewallService.getConfig(refresh),
        bridgeFirewallService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capabilitiesData);
      // Reset reorder state when data is loaded
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bridge firewall configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isV15 = capabilities?.version_notes.full_support || false;

  // Get chain data
  const getChainByName = (name: string): BridgeChain | undefined => {
    if (!config) return undefined;
    return config.chains.find((c) => c.name === name);
  };

  const getCustomChainByName = (name: string): BridgeChain | undefined => {
    if (!config) return undefined;
    return config.custom_chains.find((c) => c.name === name);
  };

  const getCurrentChain = (): BridgeChain | undefined => {
    if (isCustomChain) {
      return getCustomChainByName(selectedChain);
    }
    return getChainByName(selectedChain);
  };

  const getFilteredRules = (): BridgeRule[] => {
    // Use reordered rules if we have pending changes
    const rules = hasChanges ? reorderedRules : (getCurrentChain()?.rules || []);

    if (!searchQuery.trim()) return rules;

    const query = searchQuery.toLowerCase();
    return rules.filter((rule) => {
      return (
        rule.rule_number.toString().includes(query) ||
        rule.action?.toLowerCase().includes(query) ||
        rule.description?.toLowerCase().includes(query) ||
        rule.source_mac?.toLowerCase().includes(query) ||
        rule.destination_mac?.toLowerCase().includes(query) ||
        rule.vlan_id?.includes(query)
      );
    });
  };

  const getDefaultAction = (chainName: string, custom: boolean): string | null => {
    if (custom) {
      const chain = getCustomChainByName(chainName);
      return chain?.default_action || null;
    }
    const chain = getChainByName(chainName);
    return chain?.default_action || null;
  };

  const getDefaultActionBadgeClass = (action: string | null): string => {
    if (!action) return "";
    if (action === "accept") return "bg-green-500/10 text-green-500 border-green-500/20";
    if (action === "drop") return "bg-red-500/10 text-red-500 border-red-500/20";
    return "";
  };

  const handleChainSelect = (chain: string, custom: boolean = false) => {
    // Reset reorder state when switching chains
    setHasChanges(false);
    setReorderedRules([]);
    setOriginalRules([]);
    setSelectedChain(chain);
    setIsCustomChain(custom);
  };

  const handleDefaultActionChange = async (action: string) => {
    if (!selectedChain || action === "not_set") return;

    setSavingDefaultAction(true);
    try {
      const response = await bridgeFirewallService.setChainDefaultAction(selectedChain, action);
      if (response.success) {
        setSuccessMessage("Default action updated");
        await loadData(true);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.error || "Failed to update default action");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update default action");
    } finally {
      setSavingDefaultAction(false);
    }
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    setSuccessMessage("Rule created successfully");
    loadData(true);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleEditSuccess = () => {
    setEditingRule(null);
    setSuccessMessage("Rule updated successfully");
    loadData(true);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteSuccess = () => {
    setDeletingRule(null);
    setSuccessMessage("Rule deleted successfully");
    loadData(true);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreateChainSuccess = () => {
    setCreateChainModalOpen(false);
    setSuccessMessage("Custom chain created successfully");
    loadData(true);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteChainSuccess = () => {
    setDeletingChain(null);
    // Switch to forward chain since the current chain was deleted
    setSelectedChain("forward");
    setIsCustomChain(false);
    setSuccessMessage("Custom chain deleted successfully");
    loadData(true);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as number);

    // Initialize reorder state if not already
    if (!hasChanges) {
      const currentRules = getCurrentChain()?.rules || [];
      setOriginalRules([...currentRules]);
      setReorderedRules([...currentRules]);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setReorderedRules((items) => {
        const oldIndex = items.findIndex((item) => item.rule_number === active.id);
        const newIndex = items.findIndex((item) => item.rule_number === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newItems;
      });
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
      // Calculate new rule numbers starting from 100, increment by 1
      const minRuleNumber = 100;
      const rules = reorderedRules.map((rule, index) => ({
        old_number: rule.rule_number,
        new_number: minRuleNumber + index, // 100, 101, 102, etc.
        rule_data: rule,
      }));

      const response = await bridgeFirewallService.reorderRules(selectedChain, rules);

      if (response.success) {
        setSuccessMessage("Rules reordered successfully");
        setHasChanges(false);
        setReorderedRules([]);
        setOriginalRules([]);
        await loadData(true);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.error || "Failed to reorder rules");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder rules");
    } finally {
      setSavingReorder(false);
    }
  };

  const currentChain = getCurrentChain();
  const filteredRules = getFilteredRules();
  const customChains = config?.custom_chains || [];
  const totalRules = config?.total_rules || 0;

  // Get existing rule numbers for auto-assign
  const existingRuleNumbers = (currentChain?.rules || []).map((r) => r.rule_number);

  // Loading state
  if (loading && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-72 border-r border-border bg-card/50 flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Bridge Firewall</h1>
                <p className="text-xs text-muted-foreground">
                  {totalRules} rule{totalRules !== 1 ? "s" : ""} total
                </p>
              </div>
            </div>

            {/* Version Notice */}
            {!isV15 && capabilities && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    VyOS 1.4: Only forward chain available
                  </p>
                </div>
              </div>
            )}

            <Separator className="mb-3" />

            <ScrollArea className="flex-1">
              <div className="space-y-1 py-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-2">
                  Base Chains
                </div>

                {/* Forward chain - always available */}
                <button
                  onClick={() => handleChainSelect("forward", false)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                    selectedChain === "forward" && !isCustomChain
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50 text-foreground"
                  )}
                >
                  <span className="font-medium">Forward</span>
                  <div className="flex items-center gap-1.5">
                    {getDefaultAction("forward", false) && (
                      <Badge
                        variant="outline"
                        className={cn("uppercase text-xs", getDefaultActionBadgeClass(getDefaultAction("forward", false)))}
                      >
                        {getDefaultAction("forward", false)}
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      {getChainByName("forward")?.rule_count || 0}
                    </Badge>
                  </div>
                </button>

                {/* VyOS 1.5+ chains */}
                {isV15 && (
                  <>
                    <button
                      onClick={() => handleChainSelect("input", false)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChain === "input" && !isCustomChain
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Input</span>
                      <div className="flex items-center gap-1.5">
                        {getDefaultAction("input", false) && (
                          <Badge
                            variant="outline"
                            className={cn("uppercase text-xs", getDefaultActionBadgeClass(getDefaultAction("input", false)))}
                          >
                            {getDefaultAction("input", false)}
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {getChainByName("input")?.rule_count || 0}
                        </Badge>
                      </div>
                    </button>

                    <button
                      onClick={() => handleChainSelect("output", false)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChain === "output" && !isCustomChain
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Output</span>
                      <div className="flex items-center gap-1.5">
                        {getDefaultAction("output", false) && (
                          <Badge
                            variant="outline"
                            className={cn("uppercase text-xs", getDefaultActionBadgeClass(getDefaultAction("output", false)))}
                          >
                            {getDefaultAction("output", false)}
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {getChainByName("output")?.rule_count || 0}
                        </Badge>
                      </div>
                    </button>

                    <button
                      onClick={() => handleChainSelect("prerouting", false)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                        selectedChain === "prerouting" && !isCustomChain
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      <span className="font-medium">Prerouting</span>
                      <div className="flex items-center gap-1.5">
                        {getDefaultAction("prerouting", false) && (
                          <Badge
                            variant="outline"
                            className={cn("uppercase text-xs", getDefaultActionBadgeClass(getDefaultAction("prerouting", false)))}
                          >
                            {getDefaultAction("prerouting", false)}
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {getChainByName("prerouting")?.rule_count || 0}
                        </Badge>
                      </div>
                    </button>
                  </>
                )}

                {/* Custom Chains */}
                {capabilities?.features.custom_chains.supported && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between px-2 py-1 mb-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Custom Chains
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setCreateChainModalOpen(true)}
                        title="Create custom chain"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {customChains.length === 0 ? (
                      <div className="px-2 py-4 text-center">
                        <p className="text-xs text-muted-foreground">No custom chains</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs mt-1"
                          onClick={() => setCreateChainModalOpen(true)}
                        >
                          Create one
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {customChains.map((chain) => (
                          <div
                            key={chain.name}
                            className={cn(
                              "group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                              selectedChain === chain.name && isCustomChain
                                ? "bg-accent text-accent-foreground shadow-sm"
                                : "hover:bg-accent/50 text-foreground"
                            )}
                          >
                            <button
                              onClick={() => handleChainSelect(chain.name, true)}
                              className="flex-1 text-left font-medium truncate"
                            >
                              {chain.name}
                            </button>
                            <div className="flex items-center gap-1.5">
                              {chain.default_action && (
                                <Badge
                                  variant="outline"
                                  className={cn("uppercase text-xs", getDefaultActionBadgeClass(chain.default_action))}
                                >
                                  {chain.default_action}
                                </Badge>
                              )}
                              <Badge variant="secondary">
                                {chain.rule_count}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingChain(chain);
                                }}
                                title="Delete chain"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Reorder Banner */}
          {hasChanges && (
            <BridgeReorderBanner
              onSave={handleSaveReorder}
              onCancel={handleCancelReorder}
              saving={savingReorder}
              count={reorderedRules.length}
            />
          )}

          {/* Header */}
          <div className="border-b border-border bg-card/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <span>Firewall</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>Bridge</span>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-foreground font-medium capitalize">
                    {selectedChain}
                  </span>
                  {isCustomChain && (
                    <Badge variant="outline" className="ml-2">
                      Custom Chain
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-foreground capitalize">
                  {selectedChain} Chain
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => loadData(true)}
                  disabled={loading || hasChanges}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
                {isCustomChain && currentChain && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDeletingChain(currentChain)}
                    className="text-destructive hover:text-destructive"
                    title="Delete chain"
                    disabled={hasChanges}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button onClick={() => setCreateModalOpen(true)} disabled={hasChanges}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </div>

            {/* Alerts */}
            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2 flex items-center gap-2 mt-4">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
              </div>
            )}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 flex items-center gap-2 mt-4">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 px-2"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* Search and Default Action */}
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredRules.length} rule{filteredRules.length !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">Default Action:</span>
                <Select
                  value={currentChain?.default_action || "not_set"}
                  onValueChange={handleDefaultActionChange}
                  disabled={savingDefaultAction || hasChanges}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Not Set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_set">Not Set</SelectItem>
                    <SelectItem value="accept">Accept</SelectItem>
                    <SelectItem value="drop">Drop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Rules Table with Drag and Drop */}
          <div className="flex-1 overflow-auto p-6 pt-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead className="w-32">Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Match Criteria</TableHead>
                      <TableHead className="w-28 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32">
                          <div className="flex flex-col items-center justify-center text-center">
                            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm font-medium text-foreground">
                              {searchQuery ? "No matching rules" : "No rules configured"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {searchQuery ? "Try adjusting your search" : "Add a rule to get started"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <SortableContext
                        items={filteredRules.map((r) => r.rule_number)}
                        strategy={verticalListSortingStrategy}
                      >
                        {filteredRules.map((rule) => (
                          <BridgeRuleRow
                            key={rule.rule_number}
                            rule={rule}
                            onEdit={(r) => setEditingRule({ chain: selectedChain, rule: r })}
                            onDelete={(r) => setDeletingRule({ chain: selectedChain, rule: r })}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </TableBody>
                </Table>
              </div>
            </DndContext>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateBridgeRuleModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        chain={selectedChain}
        capabilities={capabilities}
        existingRuleNumbers={existingRuleNumbers}
        onSuccess={handleCreateSuccess}
      />

      {editingRule && (
        <EditBridgeRuleModal
          open={!!editingRule}
          onOpenChange={(open) => !open && setEditingRule(null)}
          chain={editingRule.chain}
          rule={editingRule.rule}
          capabilities={capabilities}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingRule && (
        <DeleteBridgeRuleModal
          open={!!deletingRule}
          onOpenChange={(open) => !open && setDeletingRule(null)}
          chain={deletingRule.chain}
          rule={deletingRule.rule}
          onSuccess={handleDeleteSuccess}
        />
      )}

      <CreateCustomBridgeChainModal
        open={createChainModalOpen}
        onOpenChange={setCreateChainModalOpen}
        onSuccess={handleCreateChainSuccess}
      />

      {deletingChain && (
        <DeleteCustomBridgeChainModal
          open={!!deletingChain}
          onOpenChange={(open) => !open && setDeletingChain(null)}
          chain={deletingChain}
          onSuccess={handleDeleteChainSuccess}
        />
      )}
    </AppLayout>
  );
}
