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
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { extcommunityListService, ExtCommunityList, ExtCommunityListCapabilities } from "@/lib/api/extcommunity-list";
import { CreateExtCommunityListModal } from "@/components/policies/CreateExtCommunityListModal";
import { EditExtCommunityListModal } from "@/components/policies/EditExtCommunityListModal";
import { DeleteExtCommunityListModal } from "@/components/policies/DeleteExtCommunityListModal";
import { CreateExtCommunityListRuleModal } from "@/components/policies/CreateExtCommunityListRuleModal";
import { EditExtCommunityListRuleModal } from "@/components/policies/EditExtCommunityListRuleModal";
import { DeleteExtCommunityListRuleModal } from "@/components/policies/DeleteExtCommunityListRuleModal";
import { ExtCommunityListReorderBanner } from "@/components/policies/ExtCommunityListReorderBanner";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Sortable row component
function ExtCommunityListRuleRow({ rule, onEdit, onDelete }: any) {
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
          {rule.action}
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

export default function BGPExtCommunityPage() {
  const [extcommunityLists, setExtCommunityLists] = useState<ExtCommunityList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<ExtCommunityListCapabilities | null>(null);

  const [selectedExtCommunityList, setSelectedExtCommunityList] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ruleSearchQuery, setRuleSearchQuery] = useState("");

  // Modal states
  const [showCreateExtCommunityListModal, setShowCreateExtCommunityListModal] = useState(false);
  const [showEditExtCommunityListModal, setShowEditExtCommunityListModal] = useState(false);
  const [showDeleteExtCommunityListModal, setShowDeleteExtCommunityListModal] = useState(false);
  const [selectedExtCommunityListObj, setSelectedExtCommunityListObj] = useState<ExtCommunityList | null>(null);

  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [showEditRuleModal, setShowEditRuleModal] = useState(false);
  const [showDeleteRuleModal, setShowDeleteRuleModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  // Drag and drop states
  const [reorderedRules, setReorderedRules] = useState<any[]>([]);
  const [originalRules, setOriginalRules] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [savingReorder, setSavingReorder] = useState(false);

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
        extcommunityListService.getConfig(refresh),
        extcommunityListService.getCapabilities(),
      ]);
      setExtCommunityLists(config.extcommunity_lists);
      setCapabilities(caps);

      // Reset reorder state
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);

      // Auto-select first extcommunity list if none selected
      if (!selectedExtCommunityList) {
        if (config.extcommunity_lists.length > 0) {
          setSelectedExtCommunityList(config.extcommunity_lists[0].name);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load extcommunity lists");
      console.error("Error fetching extcommunity list config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedExtCommunityListData = extcommunityLists.find((cl) => cl.name === selectedExtCommunityList);

  // Get current rules (reordered or original)
  const currentRules = hasChanges && reorderedRules.length > 0
    ? reorderedRules
    : selectedExtCommunityListData?.rules || [];

  // Filter extcommunity lists based on search
  const filteredExtCommunityLists = extcommunityLists.filter((cl) => {
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
    if (!selectedExtCommunityList || reorderedRules.length === 0) return;

    setSavingReorder(true);
    try {
      // Calculate new sequential rule numbers starting from the lowest existing number
      const startingNumber = Math.min(...reorderedRules.map(r => r.rule_number));

      await extcommunityListService.reorderRules(
        selectedExtCommunityList,
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

  const handleExtCommunityListSelect = (name: string) => {
    // Reset reorder state when changing extcommunity lists
    if (hasChanges) {
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
    }
    setSelectedExtCommunityList(name);
    setRuleSearchQuery("");
  };

  const handleDeleteExtCommunityList = (extcommunityList: ExtCommunityList) => {
    setSelectedExtCommunityListObj(extcommunityList);
    setShowDeleteExtCommunityListModal(true);
  };

  const handleExtCommunityListDeleted = () => {
    // If deleted extcommunity list was selected, select another one
    if (selectedExtCommunityList === selectedExtCommunityListObj?.name) {
      const remaining = extcommunityLists.filter((cl) => cl.name !== selectedExtCommunityListObj?.name);
      setSelectedExtCommunityList(remaining.length > 0 ? remaining[0].name : null);
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

  const ruleIds = filteredRules.map((r) => r.rule_number);
  const totalRules = extcommunityLists.reduce((sum, cl) => sum + cl.rules.length, 0);

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
            <h2 className="text-xl font-semibold text-foreground">Error Loading ExtCommunity Lists</h2>
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
        {/* Left Sidebar - ExtCommunity Lists */}
        <div className="w-80 border-r border-border bg-card/50 flex flex-col">
          <div className="p-6 pb-4 shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ListFilter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">BGP Extended Community</h1>
                <p className="text-xs text-muted-foreground">
                  {extcommunityLists.length} {extcommunityLists.length !== 1 ? "lists" : "list"} · {totalRules} rule{totalRules !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Search ExtCommunity Lists */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button
              onClick={() => setShowCreateExtCommunityListModal(true)}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create ExtCommunity List
            </Button>
          </div>

          <Separator className="shrink-0" />

          {/* ExtCommunity List List */}
          <ScrollArea className="flex-1 px-3 min-h-0">
            <div className="space-y-1 py-3">
              {filteredExtCommunityLists.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No extcommunity lists match your search" : "No extcommunity lists configured"}
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowCreateExtCommunityListModal(true)}
                      className="mt-2"
                    >
                      Create your first extcommunity list
                    </Button>
                  )}
                </div>
              ) : (
                filteredExtCommunityLists.map((extcommunityList) => (
                  <div
                    key={extcommunityList.name}
                    className={cn(
                      "group relative rounded-lg transition-all",
                      selectedExtCommunityList === extcommunityList.name
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <button
                      onClick={() => handleExtCommunityListSelect(extcommunityList.name)}
                      className="w-full text-left px-3 py-2.5 pr-10"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm font-mono truncate">
                          {extcommunityList.name}
                        </span>
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {extcommunityList.rules.length}
                        </Badge>
                      </div>
                      {extcommunityList.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {extcommunityList.description}
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
                          handleDeleteExtCommunityList(extcommunityList);
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
          {selectedExtCommunityListData ? (
            <>
              {/* Header */}
              <div className="p-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-foreground font-mono">
                        {selectedExtCommunityListData.name}
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedExtCommunityListObj(selectedExtCommunityListData);
                          setShowEditExtCommunityListModal(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedExtCommunityListData.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedExtCommunityListData.description}
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

              {/* Reorder Banner */}
              {hasChanges && (
                <ExtCommunityListReorderBanner
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
                        {ruleSearchQuery ? "No Rules Match Search" : "No Rules Configured"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        {ruleSearchQuery
                          ? "Try adjusting your search criteria"
                          : "Add rules to this extcommunity list to filter BGP routes"}
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
                              <TableHead>Rule #</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Regex</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext
                              items={ruleIds}
                              strategy={verticalListSortingStrategy}
                            >
                              {filteredRules.map((rule) => (
                                <ExtCommunityListRuleRow
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
                  No ExtCommunity List Selected
                </h2>
                <p className="text-muted-foreground max-w-md">
                  {extcommunityLists.length === 0
                    ? "Create a extcommunity list to get started"
                    : "Select a extcommunity list from the sidebar to view its rules"}
                </p>
                {extcommunityLists.length === 0 && (
                  <Button onClick={() => setShowCreateExtCommunityListModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create ExtCommunity List
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ExtCommunity List Modals */}
      <CreateExtCommunityListModal
        open={showCreateExtCommunityListModal}
        onOpenChange={setShowCreateExtCommunityListModal}
        onSuccess={() => fetchData(true)}
      />

      {selectedExtCommunityListObj && (
        <>
          <EditExtCommunityListModal
            open={showEditExtCommunityListModal}
            onOpenChange={setShowEditExtCommunityListModal}
            onSuccess={() => fetchData(true)}
            extcommunityList={selectedExtCommunityListObj}
          />

          <DeleteExtCommunityListModal
            open={showDeleteExtCommunityListModal}
            onOpenChange={setShowDeleteExtCommunityListModal}
            onSuccess={handleExtCommunityListDeleted}
            extcommunityList={selectedExtCommunityListObj}
          />
        </>
      )}

      {/* Rule Modals */}
      {selectedExtCommunityList && (
        <>
          <CreateExtCommunityListRuleModal
            open={showCreateRuleModal}
            onOpenChange={setShowCreateRuleModal}
            onSuccess={() => fetchData(true)}
            extcommunityListName={selectedExtCommunityList}
            capabilities={capabilities}
          />

          {selectedRule && (
            <>
              <EditExtCommunityListRuleModal
                open={showEditRuleModal}
                onOpenChange={setShowEditRuleModal}
                onSuccess={() => fetchData(true)}
                extcommunityListName={selectedExtCommunityList}
                rule={selectedRule}
                capabilities={capabilities}
              />

              <DeleteExtCommunityListRuleModal
                open={showDeleteRuleModal}
                onOpenChange={setShowDeleteRuleModal}
                onSuccess={() => fetchData(true)}
                extcommunityListName={selectedExtCommunityList}
                rule={selectedRule}
              />
            </>
          )}
        </>
      )}
    </AppLayout>
  );
}
