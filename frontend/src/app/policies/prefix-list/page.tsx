"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, RefreshCw, AlertCircle, ListFilter, Trash2, Pencil } from "lucide-react";
import { DndContext, type DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  prefixListService,
  type PrefixList,
  type PrefixListCapabilitiesResponse,
  type PrefixListRule,
  type PrefixListType,
} from "@/lib/api/prefix-list";
import { reorderMoveCount } from "@/lib/api/prefix-list-save-ops";
import { familyLabel } from "@/components/policies/prefix-list-rule-form";
import type { ApiError } from "@/lib/types/api";
import { FeatureGroup } from "@/lib/api/user-management";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreatePrefixListModal } from "@/components/policies/CreatePrefixListModal";
import { EditPrefixListModal } from "@/components/policies/EditPrefixListModal";
import { DeletePrefixListModal } from "@/components/policies/DeletePrefixListModal";
import { PrefixListRuleModal } from "@/components/policies/PrefixListRuleModal";
import { DeletePrefixListRuleModal } from "@/components/policies/DeletePrefixListRuleModal";
import { PrefixListRuleRow } from "@/components/policies/PrefixListRuleRow";
import { PrefixListReorderBanner } from "@/components/policies/PrefixListReorderBanner";

type ModalKind = "createList" | "editList" | "deleteList" | "createRule" | "editRule" | "deleteRule";

interface ModalState {
  kind: ModalKind;
  list: PrefixList | null;
  rule: PrefixListRule | null;
}

function PrefixListPageInner() {
  const t = useTranslations("prefixList");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.PREFIX_LIST);

  const [ipv4Lists, setIpv4Lists] = useState<PrefixList[]>([]);
  const [ipv6Lists, setIpv6Lists] = useState<PrefixList[]>([]);
  const [capabilities, setCapabilities] = useState<PrefixListCapabilitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedListType, setSelectedListType] = useState<PrefixListType>(() =>
    searchParams.get("section") === "ipv6" ? "ipv6" : "ipv4",
  );
  const [selectedListName, setSelectedListName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ruleSearchQuery, setRuleSearchQuery] = useState("");

  // One modal at a time; the subject stays set after close so the text does not flip.
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  const [reorderedRules, setReorderedRules] = useState<PrefixListRule[]>([]);
  const [savingReorder, setSavingReorder] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "ipv4" || section === "ipv6") setSelectedListType(section);
  }, [searchParams]);

  const applyConfig = useCallback(async (refresh: boolean) => {
    const [config, caps] = await Promise.all([prefixListService.getConfig(refresh), prefixListService.getCapabilities()]);
    setIpv4Lists(config.ipv4_lists);
    setIpv6Lists(config.ipv6_lists);
    setCapabilities(caps);
    setReorderedRules([]);
    setReorderError(null);
    setError(null);
  }, []);

  const loadData = useCallback(async () => {
    try {
      await applyConfig(false);
    } catch (err) {
      setError((err as ApiError).message || t("page.loadFailed"));
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
      setError((err as ApiError).message || t("page.loadFailed"));
    } finally {
      setRefreshing(false);
    }
  }, [applyConfig, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const lists = selectedListType === "ipv4" ? ipv4Lists : ipv6Lists;
  const selectedListData = lists.find((l) => l.name === selectedListName) ?? lists[0];
  const hasReorder = reorderedRules.length > 0;
  const currentRules = hasReorder ? reorderedRules : selectedListData?.rules || [];
  const writeDisabled = refreshing || savingReorder;

  const filteredLists = lists.filter((list) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return list.name.toLowerCase().includes(query) || (list.description ?? "").toLowerCase().includes(query);
  });

  const filteredRules = currentRules.filter((rule) => {
    const query = ruleSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      rule.rule_number.toString().includes(query) ||
      (rule.description ?? "").toLowerCase().includes(query) ||
      (rule.action ?? "").toLowerCase().includes(query) ||
      (rule.prefix ?? "").toLowerCase().includes(query)
    );
  });

  const openModal = (kind: ModalKind, list: PrefixList | null = null, rule: PrefixListRule | null = null) => {
    setModal({ kind, list, rule });
    setModalKey((key) => key + 1);
    setModalOpen(true);
  };

  const resetReorder = () => {
    setReorderedRules([]);
    setReorderError(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = currentRules.findIndex((r) => r.rule_number === active.id);
    const newIndex = currentRules.findIndex((r) => r.rule_number === over.id);
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const next = arrayMove(currentRules, oldIndex, newIndex);
      // Dragged back to the stored order: nothing left to save.
      if (reorderMoveCount(next.map((r) => r.rule_number)) === 0) resetReorder();
      else setReorderedRules(next);
    }
  };

  const handleSaveReorder = async () => {
    if (!selectedListData || !hasReorder) return;
    setSavingReorder(true);
    setReorderError(null);
    try {
      // Every rule of the list, in the new order.
      await prefixListService.reorderRules(
        selectedListType,
        selectedListData.name,
        reorderedRules.map((r) => r.rule_number),
      );
      resetReorder();
      void reload();
    } catch (err) {
      setReorderError((err as ApiError).message || t("page.reorderFailed"));
    } finally {
      setSavingReorder(false);
    }
  };

  const handleTabChange = (value: string) => {
    resetReorder();
    setSelectedListType(value as PrefixListType);
    setSelectedListName(null);
    setSearchQuery("");
    setRuleSearchQuery("");
  };

  const handleListSelect = (name: string) => {
    resetReorder();
    setSelectedListName(name);
    setRuleSearchQuery("");
  };

  const handleListDeleted = () => {
    if (selectedListData && modal?.list?.name === selectedListData.name) setSelectedListName(null);
    resetReorder();
    void reload();
  };

  const afterSave = () => {
    resetReorder();
    void reload();
  };

  const ruleIds = filteredRules.map((r) => r.rule_number);
  const family = familyLabel(selectedListType);

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
            <h2 className="text-xl font-semibold text-foreground">{t("page.errorLoading")}</h2>
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
        {/* Left Sidebar - Prefix Lists */}
        <div className="w-80 border-r border-border bg-card/50 flex flex-col">
          <div className="p-6 pb-4 shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ListFilter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{t("page.title")}</h1>
                <p className="text-xs text-muted-foreground">
                  {t("page.totals", { ipv4: ipv4Lists.length, ipv6: ipv6Lists.length })}
                </p>
              </div>
            </div>

            <Tabs value={selectedListType} onValueChange={handleTabChange} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ipv4" disabled={savingReorder}>
                  {familyLabel("ipv4")}
                </TabsTrigger>
                <TabsTrigger value="ipv6" disabled={savingReorder}>
                  {familyLabel("ipv6")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("page.searchLists")}
                aria-label={t("page.searchLists")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {hasWrite && (
              <Button
                onClick={() => openModal("createList")}
                className="w-full"
                size="sm"
                disabled={writeDisabled || hasReorder}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("page.createList")}
              </Button>
            )}
          </div>

          <Separator className="shrink-0" />

          <ScrollArea className="flex-1 px-3 min-h-0">
            <div className="space-y-1 py-3">
              {filteredLists.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery.trim() ? t("page.noListsMatch") : t("page.noListsConfigured")}
                  </p>
                  {!searchQuery.trim() && hasWrite && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => openModal("createList")}
                      className="mt-2"
                      disabled={writeDisabled}
                    >
                      {t("page.createFirst")}
                    </Button>
                  )}
                </div>
              ) : (
                filteredLists.map((list) => (
                  <div
                    key={list.name}
                    className={cn(
                      "group relative rounded-lg transition-all",
                      selectedListData?.name === list.name
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <button
                      onClick={() => handleListSelect(list.name)}
                      disabled={savingReorder}
                      className="w-full text-left px-3 py-2.5 pr-10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm font-mono truncate">{list.name}</span>
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {list.rules.length}
                        </Badge>
                      </div>
                      {list.description && (
                        <p className="text-xs text-muted-foreground truncate">{list.description}</p>
                      )}
                    </button>
                    {hasWrite && (
                      <div className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          aria-label={t("page.deleteList", { name: list.name })}
                          disabled={writeDisabled || hasReorder}
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal("deleteList", list);
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
          {selectedListData ? (
            <>
              <div className="p-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-foreground font-mono">{selectedListData.name}</h2>
                      <Badge variant="outline">{family}</Badge>
                      {hasWrite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("page.editList", { name: selectedListData.name })}
                          disabled={writeDisabled || hasReorder}
                          onClick={() => openModal("editList", selectedListData)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {selectedListData.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedListData.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => void reload()} variant="outline" size="sm" disabled={refreshing || savingReorder}>
                      <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                      {tc("refresh")}
                    </Button>
                    {hasWrite && (
                      <Button
                        onClick={() => openModal("createRule", selectedListData)}
                        size="sm"
                        disabled={writeDisabled || hasReorder}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("page.addRule")}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("page.searchRules")}
                    aria-label={t("page.searchRules")}
                    value={ruleSearchQuery}
                    onChange={(e) => setRuleSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {hasReorder && (
                <PrefixListReorderBanner
                  onSave={handleSaveReorder}
                  onCancel={resetReorder}
                  saving={savingReorder}
                  count={reorderMoveCount(reorderedRules.map((r) => r.rule_number))}
                  error={reorderError}
                />
              )}

              <div className="flex-1 p-6 pt-4 overflow-hidden">
                {filteredRules.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <ListFilter className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {ruleSearchQuery.trim() ? t("page.noRulesMatch") : t("page.noRulesConfigured")}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        {ruleSearchQuery.trim() ? t("page.adjustSearch") : t("page.addRulesHint")}
                      </p>
                      {!ruleSearchQuery.trim() && hasWrite && (
                        <Button onClick={() => openModal("createRule", selectedListData)} disabled={writeDisabled}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t("page.addFirstRule")}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <ScrollArea className="h-[calc(100vh-350px)]">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-12"></TableHead>
                              <TableHead>{t("page.colRule")}</TableHead>
                              <TableHead>{t("page.colAction")}</TableHead>
                              <TableHead>{tc("description")}</TableHead>
                              <TableHead>{t("page.colPrefix")}</TableHead>
                              <TableHead>{t("page.colGe")}</TableHead>
                              <TableHead>{t("page.colLe")}</TableHead>
                              <TableHead className="text-right">{tc("actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext items={ruleIds} strategy={verticalListSortingStrategy}>
                              {filteredRules.map((rule) => (
                                <PrefixListRuleRow
                                  key={rule.rule_number}
                                  rule={rule}
                                  onEdit={(r) => openModal("editRule", selectedListData, r)}
                                  onDelete={(r) => openModal("deleteRule", selectedListData, r)}
                                  canWrite={hasWrite}
                                  dragDisabled={writeDisabled || ruleSearchQuery.trim() !== ""}
                                  disabled={writeDisabled || hasReorder}
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
                <h2 className="text-xl font-semibold text-foreground">{t("page.noSelection")}</h2>
                <p className="text-muted-foreground max-w-md">
                  {lists.length === 0 ? t("page.createToStart") : t("page.selectFromSidebar")}
                </p>
                {lists.length === 0 && hasWrite && (
                  <Button onClick={() => openModal("createList")} disabled={writeDisabled}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("page.createList")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {modal?.kind === "createList" && (
        <CreatePrefixListModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          listType={selectedListType}
          existingNames={lists.map((l) => l.name)}
          capabilities={capabilities}
        />
      )}

      {modal?.kind === "editList" && modal.list && (
        <EditPrefixListModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          prefixList={modal.list}
          capabilities={capabilities}
        />
      )}

      {modal?.kind === "deleteList" && modal.list && (
        <DeletePrefixListModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={handleListDeleted}
          prefixList={modal.list}
        />
      )}

      {(modal?.kind === "createRule" || modal?.kind === "editRule") && modal.list && (
        <PrefixListRuleModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          prefixList={modal.list}
          existing={modal.kind === "editRule" ? modal.rule : null}
          capabilities={capabilities}
        />
      )}

      {modal?.kind === "deleteRule" && modal.list && modal.rule && (
        <DeletePrefixListRuleModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          rule={modal.rule}
          listName={modal.list.name}
          listType={modal.list.list_type}
        />
      )}
    </AppLayout>
  );
}

export default function PrefixListPage() {
  return (
    <Suspense>
      <PrefixListPageInner />
    </Suspense>
  );
}
