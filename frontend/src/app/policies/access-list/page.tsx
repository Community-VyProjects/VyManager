"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ListFilter,
  Trash2,
  Pencil,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  accessListService,
  type AccessList,
  type AccessListConfigResponse,
  type AccessListRule,
  type AccessListCapabilitiesResponse,
} from "@/lib/api/access-list";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateAccessListModal } from "@/components/policies/CreateAccessListModal";
import { EditAccessListModal } from "@/components/policies/EditAccessListModal";
import { DeleteAccessListModal } from "@/components/policies/DeleteAccessListModal";
import { AddAccessListRuleModal } from "@/components/policies/AddAccessListRuleModal";
import { EditAccessListRuleModal } from "@/components/policies/EditAccessListRuleModal";
import { DeleteAccessListRuleModal } from "@/components/policies/DeleteAccessListRuleModal";
import { AccessListRuleRow } from "@/components/policies/AccessListRuleRow";
import { AccessListReorderBanner } from "@/components/policies/AccessListReorderBanner";

export default function AccessListPage() {
  const [config, setConfig] = useState<AccessListConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<AccessListCapabilitiesResponse | null>(null);
  const [selectedListType, setSelectedListType] = useState<"ipv4" | "ipv6">("ipv4");
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ruleSearchQuery, setRuleSearchQuery] = useState("");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<AccessList | null>(null);
  const [deletingList, setDeletingList] = useState<AccessList | null>(null);
  const [addRuleModalOpen, setAddRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AccessListRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<AccessListRule | null>(null);

  // Drag and drop states
  const [reorderedRules, setReorderedRules] = useState<AccessListRule[]>([]);
  const [originalRules, setOriginalRules] = useState<AccessListRule[]>([]);
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

  useEffect(() => {
    fetchConfig();
    fetchCapabilities();
  }, []);

  const fetchConfig = async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await accessListService.getConfig(refresh);
      setConfig(data);

      // Reset reorder state when new config is loaded
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);

      // Auto-select first list if none selected
      if (!selectedList) {
        const lists = selectedListType === "ipv4" ? data.ipv4_lists : data.ipv6_lists;
        if (lists.length > 0) {
          setSelectedList(lists[0].number);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load access-list configuration"
      );
      console.error("Error fetching access-list config:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCapabilities = async () => {
    try {
      const caps = await accessListService.getCapabilities();
      setCapabilities(caps);
    } catch (err) {
      console.error("Error fetching capabilities:", err);
    }
  };

  const currentLists = selectedListType === "ipv4" ? config?.ipv4_lists || [] : config?.ipv6_lists || [];
  const selectedListData = currentLists.find((list) => list.number === selectedList);

  // Get current rules (reordered or original)
  const currentRules = hasChanges && reorderedRules.length > 0
    ? reorderedRules
    : selectedListData?.rules || [];

  // Filter lists based on search
  const filteredLists = currentLists.filter((list) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      list.number.toLowerCase().includes(query) ||
      list.description?.toLowerCase().includes(query)
    );
  });

  // Filter rules based on search
  const filteredRules = currentRules.filter((rule) => {
    if (!ruleSearchQuery) return true;
    const query = ruleSearchQuery.toLowerCase();
    return (
      rule.rule_number.toString().includes(query) ||
      rule.description?.toLowerCase().includes(query) ||
      rule.action.toLowerCase().includes(query)
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
    if (!selectedList || reorderedRules.length === 0) return;

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

      await accessListService.reorderRules(selectedList, selectedListType, rulesWithNewNumbers);

      // Refresh config and reset state
      await fetchConfig(true);
    } catch (err) {
      console.error("Error saving reordered rules:", err);
      setError(err instanceof Error ? err.message : "Failed to save reordered rules");
    } finally {
      setSavingReorder(false);
    }
  };

  const handleListSelect = (number: string) => {
    // Reset reorder state when changing lists
    if (hasChanges) {
      setHasChanges(false);
      setReorderedRules([]);
      setOriginalRules([]);
    }
    setSelectedList(number);
    setRuleSearchQuery("");
  };

  const handleTabChange = (value: string) => {
    const newType = value as "ipv4" | "ipv6";
    setSelectedListType(newType);
    
    // Reset reorder state
    setHasChanges(false);
    setReorderedRules([]);
    setOriginalRules([]);
    
    // Select first list of new type
    const lists = newType === "ipv4" ? config?.ipv4_lists || [] : config?.ipv6_lists || [];
    if (lists.length > 0) {
      setSelectedList(lists[0].number);
    } else {
      setSelectedList(null);
    }
    setSearchQuery("");
    setRuleSearchQuery("");
  };

  const handleDeleteList = (list: AccessList) => {
    setDeletingList(list);
  };

  const handleListDeleted = () => {
    // If deleted list was selected, select another one
    if (selectedList === deletingList?.number) {
      const remaining = currentLists.filter((list) => list.number !== deletingList?.number);
      setSelectedList(remaining.length > 0 ? remaining[0].number : null);
    }
    fetchConfig(true);
  };

  const ruleIds = filteredRules.map((r) => r.rule_number);

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
            <h2 className="text-xl font-semibold text-foreground">Error Loading Access Lists</h2>
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
        {/* Left Sidebar - Access List List */}
        <div className="w-80 border-r border-border bg-card/50 flex flex-col">
          <div className="p-6 pb-4 shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ListFilter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Access Lists</h1>
                <p className="text-xs text-muted-foreground">
                  {config?.total_ipv4 || 0} IPv4 · {config?.total_ipv6 || 0} IPv6
                </p>
              </div>
            </div>

            {/* Tabs for IPv4/IPv6 */}
            <Tabs value={selectedListType} onValueChange={handleTabChange} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ipv4">IPv4</TabsTrigger>
                <TabsTrigger value="ipv6">IPv6</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search Lists */}
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
              onClick={() => setCreateModalOpen(true)}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Access List
            </Button>
          </div>

          <Separator className="shrink-0" />

          {/* Access List List */}
          <ScrollArea className="flex-1 px-3 min-h-0">
            <div className="space-y-1 py-3">
              {filteredLists.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No lists match your search" : "No access lists configured"}
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setCreateModalOpen(true)}
                      className="mt-2"
                    >
                      Create your first access list
                    </Button>
                  )}
                </div>
              ) : (
                filteredLists.map((list) => (
                  <div
                    key={list.number}
                    className={cn(
                      "group relative rounded-lg transition-all",
                      selectedList === list.number
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <button
                      onClick={() => handleListSelect(list.number)}
                      className="w-full text-left px-3 py-2.5 pr-10"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm font-mono truncate">
                          {list.number}
                        </span>
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {list.rules.length}
                        </Badge>
                      </div>
                      {list.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {list.description}
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
                          handleDeleteList(list);
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
          {selectedListData ? (
            <>
              {/* Header */}
              <div className="p-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-foreground font-mono">
                        {selectedListData.number}
                      </h2>
                      <Badge variant="outline">
                        {selectedListType.toUpperCase()}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingList(selectedListData)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedListData.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedListData.description}
                      </p>
                    )}
                    {capabilities && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedListType === "ipv4" 
                          ? `Valid ranges: ${capabilities.access_list_ranges.standard} (standard), ${capabilities.access_list_ranges.extended} (extended)`
                          : "IPv6 access lists use alphanumeric names"}
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
                <AccessListReorderBanner
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
                          : "Add rules to this access list to control traffic filtering"}
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
                              <TableHead>Source</TableHead>
                              {selectedListType === "ipv4" && <TableHead>Destination</TableHead>}
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext
                              items={ruleIds}
                              strategy={verticalListSortingStrategy}
                            >
                              {filteredRules.map((rule) => (
                                <AccessListRuleRow
                                  key={rule.rule_number}
                                  rule={rule}
                                  listType={selectedListType}
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
                <ListFilter className="h-16 w-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">
                  No Access List Selected
                </h2>
                <p className="text-muted-foreground max-w-md">
                  {currentLists.length === 0
                    ? "Create an access list to get started"
                    : "Select an access list from the sidebar to view its rules"}
                </p>
                {currentLists.length === 0 && (
                  <Button onClick={() => setCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Access List
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateAccessListModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => fetchConfig(true)}
        listType={selectedListType}
        existingLists={currentLists}
      />

      <EditAccessListModal
        open={editingList !== null}
        onOpenChange={(open) => !open && setEditingList(null)}
        onSuccess={() => fetchConfig(true)}
        accessList={editingList}
      />

      <DeleteAccessListModal
        open={deletingList !== null}
        onOpenChange={(open) => !open && setDeletingList(null)}
        onSuccess={handleListDeleted}
        accessList={deletingList}
      />

      {selectedListData && (
        <>
          <AddAccessListRuleModal
            open={addRuleModalOpen}
            onOpenChange={setAddRuleModalOpen}
            onSuccess={() => fetchConfig(true)}
            accessList={selectedListData}
          />

          <EditAccessListRuleModal
            open={editingRule !== null}
            onOpenChange={(open) => !open && setEditingRule(null)}
            onSuccess={() => fetchConfig(true)}
            rule={editingRule}
            listNumber={selectedList!}
            listType={selectedListType}
          />

          <DeleteAccessListRuleModal
            open={deletingRule !== null}
            onOpenChange={(open) => !open && setDeletingRule(null)}
            onSuccess={() => fetchConfig(true)}
            rule={deletingRule}
            listNumber={selectedList!}
            listType={selectedListType}
          />
        </>
      )}
    </AppLayout>
  );
}
