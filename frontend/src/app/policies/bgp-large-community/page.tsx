"use client";

import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  ListFilter,
  Trash2,
  Pencil,
  GripVertical,
} from "lucide-react";
import { DndContext, type DragStartEvent, type DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { largeCommunityListService, LargeCommunityList, LargeCommunityListRule, LargeCommunityListCapabilities } from "@/lib/api/large-community-list";
import { CreateLargeCommunityListModal } from "@/components/policies/CreateLargeCommunityListModal";
import { EditLargeCommunityListModal } from "@/components/policies/EditLargeCommunityListModal";
import { DeleteLargeCommunityListModal } from "@/components/policies/DeleteLargeCommunityListModal";
import { LargeCommunityListRuleModal } from "@/components/policies/LargeCommunityListRuleModal";
import { DeleteLargeCommunityListRuleModal } from "@/components/policies/DeleteLargeCommunityListRuleModal";
import { LargeCommunityListReorderBanner } from "@/components/policies/LargeCommunityListReorderBanner";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Sortable row component
function LargeCommunityListRuleRow({ rule, onEdit, onDelete }: { rule: LargeCommunityListRule; onEdit: (rule: LargeCommunityListRule) => void; onDelete: (rule: LargeCommunityListRule) => void }) {
  const t = useTranslations("bgpLists");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.rule_number,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={cn(isDragging && "bg-accent")}>
      <TableCell className="w-12">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-mono font-medium">{rule.rule_number}</TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">{rule.description || "—"}</span>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={
            rule.action === "permit"
              ? "capitalize bg-green-500/10 text-green-500 border-green-500/20"
              : "capitalize bg-red-500/10 text-red-500 border-red-500/20"
          }
        >
          {rule.action === "permit" ? t("shared.permit") : rule.action === "deny" ? t("shared.deny") : rule.action}
        </Badge>
      </TableCell>
      <TableCell>
        <code className="text-xs bg-muted px-2 py-1 rounded">{rule.regex || "—"}</code>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(rule)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(rule)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function BGPLargeCommunityPage() {
  const t = useTranslations("bgpLists");
  const tc = useTranslations("common");
  const [largeCommunityLists, setLargeCommunityLists] = useState<LargeCommunityList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<LargeCommunityListCapabilities | null>(null);

  const [selectedLargeCommunityList, setSelectedLargeCommunityList] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ruleSearchQuery, setRuleSearchQuery] = useState("");

  // Modal states
  const [showCreateLargeCommunityListModal, setShowCreateLargeCommunityListModal] = useState(false);
  const [showEditLargeCommunityListModal, setShowEditLargeCommunityListModal] = useState(false);
  const [showDeleteLargeCommunityListModal, setShowDeleteLargeCommunityListModal] = useState(false);
  const [selectedLargeCommunityListObj, setSelectedLargeCommunityListObj] = useState<LargeCommunityList | null>(null);

  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [showEditRuleModal, setShowEditRuleModal] = useState(false);
  const [showDeleteRuleModal, setShowDeleteRuleModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<LargeCommunityListRule | null>(null);

  // Drag and drop states
  const [reorderedRules, setReorderedRules] = useState<LargeCommunityListRule[]>([]);
  const [, setOriginalRules] = useState<LargeCommunityListRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [, setActiveId] = useState<number | null>(null);
  const [savingReorder, setSavingReorder] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchData = useCallback(async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const [config, caps] = await Promise.all([
        largeCommunityListService.getConfig(refresh),
        largeCommunityListService.getCapabilities(),
      ]);
      setLargeCommunityLists(config.large_community_lists);
      setCapabilities(caps);

      // Reset reorder state
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);

      // Auto-select first large community list if none selected
      if (config.large_community_lists.length > 0) {
        setSelectedLargeCommunityList((prev) => prev ?? config.large_community_lists[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("largeCommunity.failedToLoad"));
      console.error("Error fetching large community list config:", err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedLargeCommunityListData = largeCommunityLists.find((cl) => cl.name === selectedLargeCommunityList);

  // Get current rules (reordered or original)
  const currentRules = hasChanges && reorderedRules.length > 0
    ? reorderedRules
    : selectedLargeCommunityListData?.rules || [];

  // Filter large community lists based on search
  const filteredLargeCommunityLists = largeCommunityLists.filter((cl) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cl.name.toLowerCase().includes(query) ||
      cl.description?.toLowerCase().includes(query)
    );
  });

  // Filter rules based on search
  const filteredRules = currentRules.filter((rule) => {
    if (!ruleSearchQuery) return true;
    const query = ruleSearchQuery.toLowerCase();
    return (
      rule.rule_number.toString().includes(query) ||
      rule.description?.toLowerCase().includes(query) ||
      rule.regex?.toLowerCase().includes(query)
    );
  });

  // Drag and drop handlers
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
    if (!selectedLargeCommunityList || reorderedRules.length === 0) return;

    setSavingReorder(true);
    try {
      // Calculate new sequential rule numbers starting from the lowest existing number
      const startingNumber = Math.min(...reorderedRules.map(r => r.rule_number));

      await largeCommunityListService.reorderRules(
        selectedLargeCommunityList,
        reorderedRules.map((r, index) => ({
          old_number: r.rule_number,
          new_number: startingNumber + index,
          rule_data: r,
        }))
      );

      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
      await fetchData(true);
    } catch (err) {
      console.error("Failed to save rule order:", err);
      setError(err instanceof Error ? err.message : t("shared.failedToSaveOrder"));
    } finally {
      setSavingReorder(false);
    }
  };

  const handleCancelReorder = () => {
    setReorderedRules([]);
    setHasChanges(false);
    setOriginalRules([]);
  };

  const handleLargeCommunityListSelect = (name: string) => {
    // Reset reorder state when changing large community lists
    if (hasChanges) {
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
    }
    setSelectedLargeCommunityList(name);
    setRuleSearchQuery("");
  };

  const handleDeleteLargeCommunityList = (largeCommunityList: LargeCommunityList) => {
    setSelectedLargeCommunityListObj(largeCommunityList);
    setShowDeleteLargeCommunityListModal(true);
  };

  const handleLargeCommunityListDeleted = () => {
    // If deleted large community list was selected, select another one
    if (selectedLargeCommunityList === selectedLargeCommunityListObj?.name) {
      const remaining = largeCommunityLists.filter((cl) => cl.name !== selectedLargeCommunityListObj?.name);
      setSelectedLargeCommunityList(remaining.length > 0 ? remaining[0].name : null);
    }
    fetchData(true);
  };

  const handleEditRule = (rule: LargeCommunityListRule) => {
    setSelectedRule(rule);
    setShowEditRuleModal(true);
  };

  const handleDeleteRule = (rule: LargeCommunityListRule) => {
    setSelectedRule(rule);
    setShowDeleteRuleModal(true);
  };

  const ruleIds = filteredRules.map((r) => r.rule_number);
  const totalRules = largeCommunityLists.reduce((sum, cl) => sum + cl.rules.length, 0);

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
            <h2 className="text-xl font-semibold text-foreground">{t("largeCommunity.errorLoading")}</h2>
            <p className="text-muted-foreground max-w-md">{error}</p>
            <Button onClick={() => fetchData(true)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
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
        {/* Left Sidebar - Large Community Lists */}
        <div className="w-80 border-r border-border bg-card/50 flex flex-col">
          <div className="p-6 pb-4 shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ListFilter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{t("largeCommunity.pageTitle")}</h1>
                <p className="text-xs text-muted-foreground">
                  {t("shared.listSummary", { lists: largeCommunityLists.length, rules: totalRules })}
                </p>
              </div>
            </div>

            {/* Search Large Community Lists */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("shared.searchLists")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button
              onClick={() => setShowCreateLargeCommunityListModal(true)}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("shared.createList", { listType: t("types.largeCommunity.title") })}
            </Button>
          </div>

          <Separator className="shrink-0" />

          {/* Large Community List List */}
          <ScrollArea className="flex-1 px-3 min-h-0">
            <div className="space-y-1 py-3">
              {filteredLargeCommunityLists.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? t("largeCommunity.noMatch") : t("largeCommunity.noneConfigured")}
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowCreateLargeCommunityListModal(true)}
                      className="mt-2"
                    >
                      {t("shared.createFirst", { listType: t("types.largeCommunity.name") })}
                    </Button>
                  )}
                </div>
              ) : (
                filteredLargeCommunityLists.map((largeCommunityList) => (
                  <div
                    key={largeCommunityList.name}
                    className={cn(
                      "group relative rounded-lg transition-all",
                      selectedLargeCommunityList === largeCommunityList.name
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <button
                      onClick={() => handleLargeCommunityListSelect(largeCommunityList.name)}
                      className="w-full text-left px-3 py-2.5 pr-10"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm font-mono truncate">
                          {largeCommunityList.name}
                        </span>
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {largeCommunityList.rules.length}
                        </Badge>
                      </div>
                      {largeCommunityList.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {largeCommunityList.description}
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
                          handleDeleteLargeCommunityList(largeCommunityList);
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
          {selectedLargeCommunityListData ? (
            <>
              {/* Header */}
              <div className="p-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-foreground font-mono">
                        {selectedLargeCommunityListData.name}
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLargeCommunityListObj(selectedLargeCommunityListData);
                          setShowEditLargeCommunityListModal(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedLargeCommunityListData.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedLargeCommunityListData.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => fetchData(true)} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {tc("refresh")}
                    </Button>
                    <Button onClick={() => setShowCreateRuleModal(true)} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      {t("shared.addRule")}
                    </Button>
                  </div>
                </div>

                {/* Search Rules */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("shared.searchRules")}
                    value={ruleSearchQuery}
                    onChange={(e) => setRuleSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Reorder Banner */}
              {hasChanges && (
                <LargeCommunityListReorderBanner
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
                      <ListFilter className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {ruleSearchQuery ? t("shared.noRulesMatch") : t("shared.noRulesConfigured")}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        {ruleSearchQuery
                          ? t("shared.adjustSearch")
                          : t("shared.addRulesHint", { listType: t("types.largeCommunity.name") })}
                      </p>
                      {!ruleSearchQuery && (
                        <Button onClick={() => setShowCreateRuleModal(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t("shared.addFirstRule")}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <ScrollArea className="h-[calc(100vh-300px)]">
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
                              <TableHead>{t("shared.colRule")}</TableHead>
                              <TableHead>{tc("description")}</TableHead>
                              <TableHead>{t("shared.colAction")}</TableHead>
                              <TableHead>{t("shared.colRegex")}</TableHead>
                              <TableHead className="text-right">{tc("actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext
                              items={ruleIds}
                              strategy={verticalListSortingStrategy}
                            >
                              {filteredRules.map((rule) => (
                                <LargeCommunityListRuleRow
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
                <ListFilter className="h-16 w-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">
                  {t("shared.noneSelected", { listType: t("types.largeCommunity.title") })}
                </h2>
                <p className="text-muted-foreground max-w-md">
                  {largeCommunityLists.length === 0
                    ? t("largeCommunity.createToStart")
                    : t("largeCommunity.selectFromSidebar")}
                </p>
                {largeCommunityLists.length === 0 && (
                  <Button onClick={() => setShowCreateLargeCommunityListModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("shared.createList", { listType: t("types.largeCommunity.title") })}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Large Community List Modals */}
      <CreateLargeCommunityListModal
        open={showCreateLargeCommunityListModal}
        onOpenChange={setShowCreateLargeCommunityListModal}
        onSuccess={() => fetchData(true)}
      />

      {selectedLargeCommunityListObj && (
        <>
          <EditLargeCommunityListModal
            open={showEditLargeCommunityListModal}
            onOpenChange={setShowEditLargeCommunityListModal}
            onSuccess={() => fetchData(true)}
            largeCommunityList={selectedLargeCommunityListObj}
          />

          <DeleteLargeCommunityListModal
            open={showDeleteLargeCommunityListModal}
            onOpenChange={setShowDeleteLargeCommunityListModal}
            onSuccess={handleLargeCommunityListDeleted}
            largeCommunityList={selectedLargeCommunityListObj}
          />
        </>
      )}

      {/* Rule Modals */}
      {selectedLargeCommunityList && (
        <>
          <LargeCommunityListRuleModal
            open={showCreateRuleModal || (showEditRuleModal && !!selectedRule)}
            onOpenChange={(open) => {
              if (!open) {
                setShowCreateRuleModal(false);
                setShowEditRuleModal(false);
              }
            }}
            onSuccess={() => fetchData(true)}
            largeCommunityListName={selectedLargeCommunityList}
            existing={showEditRuleModal ? selectedRule : null}
            capabilities={capabilities}
          />

          {selectedRule && (
            <>
              <DeleteLargeCommunityListRuleModal
                open={showDeleteRuleModal}
                onOpenChange={setShowDeleteRuleModal}
                onSuccess={() => fetchData(true)}
                largeCommunityListName={selectedLargeCommunityList}
                rule={selectedRule}
              />
            </>
          )}
        </>
      )}
    </AppLayout>
  );
}
