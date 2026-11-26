"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, RefreshCw, AlertCircle, Map, Trash2, Pencil } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  type Announcements,
  type DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  routeMapService,
  type RouteMap,
  type RouteMapCapabilities,
  type RouteMapRule,
} from "@/lib/api/route-map";
import { reorderMoveCount } from "@/lib/api/prefix-list-save-ops";
import { asPathListService } from "@/lib/api/as-path-list";
import { communityListService, extcommunityListService, largeCommunityListService } from "@/lib/api/policy-list";
import { accessListService } from "@/lib/api/access-list";
import { prefixListService } from "@/lib/api/prefix-list";
import { bgpService } from "@/lib/api/bgp";
import { vrfService } from "@/lib/api/vrf";
import type { ApiError } from "@/lib/types/api";
import { FeatureGroup } from "@/lib/api/user-management";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateRouteMapModal } from "@/components/policies/CreateRouteMapModal";
import { EditRouteMapModal } from "@/components/policies/EditRouteMapModal";
import { DeleteRouteMapModal } from "@/components/policies/DeleteRouteMapModal";
import { RouteMapRuleModal } from "@/components/policies/RouteMapRuleModal";
import { DeleteRouteMapRuleModal } from "@/components/policies/DeleteRouteMapRuleModal";
import { RouteMapRuleRow, useOverviewBadgeText } from "@/components/policies/RouteMapRuleRow";
import { RouteMapReorderBanner } from "@/components/policies/RouteMapReorderBanner";
import {
  routeMapMatchOverviewBadges,
  routeMapRuleCounts,
  routeMapSetOverviewBadges,
} from "@/components/policies/route-map-overview";
import { NO_PICKERS, type RouteMapPickers } from "@/components/policies/route-map-rule-form";

type ModalKind = "createMap" | "editMap" | "deleteMap" | "createRule" | "editRule" | "deleteRule";

interface ModalState {
  kind: ModalKind;
  routeMap: RouteMap | null;
  rule: RouteMapRule | null;
}

type PickerLists = Omit<RouteMapPickers, "routeMaps">;

export default function RouteMapPage() {
  const t = useTranslations("routeMap");
  const tr = useTranslations("routeMapRuleModal");
  const tc = useTranslations("common");
  const badgeText = useOverviewBadgeText();
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.ROUTE_MAP);

  const [routeMaps, setRouteMaps] = useState<RouteMap[]>([]);
  const [capabilities, setCapabilities] = useState<RouteMapCapabilities | null>(null);
  const [lists, setLists] = useState<PickerLists | null>(null);
  const [pickerErrors, setPickerErrors] = useState<string[]>([]);
  const [selectedRouteMap, setSelectedRouteMap] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ruleSearchQuery, setRuleSearchQuery] = useState("");

  // One modal at a time; the subject stays set after close so the text does not flip.
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  const [reorderedRules, setReorderedRules] = useState<RouteMapRule[]>([]);
  const [savingReorder, setSavingReorder] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Lists the rule pickers name. A 403 leaves a picker empty without a message. */
  const loadPickerLists = useCallback(async (caps: RouteMapCapabilities) => {
    const failed: string[] = [];
    const names = (load: Promise<string[]>, message: string) =>
      load.catch((err: unknown) => {
        if ((err as ApiError).status !== 403) failed.push(message);
        return [] as string[];
      });
    const both = (load: Promise<{ ipv4: string[]; ipv6: string[] }>, message: string) =>
      load.catch((err: unknown) => {
        if ((err as ApiError).status !== 403) failed.push(message);
        return { ipv4: [] as string[], ipv6: [] as string[] };
      });
    const sourcePeers = caps.features?.match_source_peer?.supported === true;
    const NONE = Promise.resolve([] as string[]);
    const [asPathLists, communityLists, extcommunityLists, largeCommunityLists, accessLists, prefixLists, bgpPeers, vrfPeers] =
      await Promise.all([
        names(asPathListService.getConfig().then((c) => c.as_path_lists.map((l) => l.name)), t("page.loadAsPathListsFailed")),
        names(communityListService.getConfig().then((c) => c.community_lists.map((l) => l.name)), t("page.loadCommunityListsFailed")),
        names(
          extcommunityListService.getConfig().then((c) => c.extcommunity_lists.map((l) => l.name)),
          t("page.loadExtcommunityListsFailed"),
        ),
        names(
          largeCommunityListService.getConfig().then((c) => c.large_community_lists.map((l) => l.name)),
          t("page.loadLargeCommunityListsFailed"),
        ),
        both(
          accessListService
            .getConfig()
            .then((c) => ({ ipv4: c.ipv4_lists.map((l) => l.number), ipv6: c.ipv6_lists.map((l) => l.number) })),
          t("page.loadAccessListsFailed"),
        ),
        both(
          prefixListService
            .getConfig()
            .then((c) => ({ ipv4: c.ipv4_lists.map((l) => l.name), ipv6: c.ipv6_lists.map((l) => l.name) })),
          t("page.loadPrefixListsFailed"),
        ),
        // `match source-peer` (only where the device has it): neighbors, interface
        // neighbors and peer-groups of the global BGP instance and of every VRF.
        sourcePeers
          ? names(
              bgpService
                .getConfig()
                .then((c) => [...c.neighbors.map((n) => n.address), ...c.peer_groups.map((g) => g.name)]),
              t("page.loadBgpPeersFailed"),
            )
          : NONE,
        sourcePeers
          ? names(
              vrfService
                .getConfig()
                .then((c) => c.instances.flatMap((vrf) => [...(vrf.bgp?.neighbors ?? []), ...(vrf.bgp?.peer_groups ?? [])])),
              t("page.loadVrfBgpPeersFailed"),
            )
          : NONE,
      ]);
    setLists({
      asPathLists,
      communityLists,
      extcommunityLists,
      largeCommunityLists,
      ipv4AccessLists: accessLists.ipv4,
      ipv6AccessLists: accessLists.ipv6,
      ipv4PrefixLists: prefixLists.ipv4,
      ipv6PrefixLists: prefixLists.ipv6,
      bgpPeers: [...new Set([...bgpPeers, ...vrfPeers])].sort(),
    });
    setPickerErrors(failed);
  }, [t]);

  const applyConfig = useCallback(
    async (refresh: boolean) => {
      const [config, caps] = await Promise.all([routeMapService.getConfig(refresh), routeMapService.getCapabilities()]);
      setRouteMaps(config.route_maps);
      setCapabilities(caps);
      setReorderedRules([]);
      setReorderError(null);
      setError(null);
      await loadPickerLists(caps);
    },
    [loadPickerLists],
  );

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

  const selectedRouteMapData = routeMaps.find((rm) => rm.name === selectedRouteMap) ?? routeMaps[0];
  const hasReorder = reorderedRules.length > 0;
  const currentRules = hasReorder ? reorderedRules : selectedRouteMapData?.rules || [];
  const writeDisabled = refreshing || savingReorder;
  const totalRules = routeMaps.reduce((sum, rm) => sum + rm.rules.length, 0);

  const filteredRouteMaps = routeMaps.filter((rm) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return rm.name.toLowerCase().includes(query) || (rm.description ?? "").toLowerCase().includes(query);
  });

  /**
   * Every text the rules table shows for a rule (number, action, description,
   * the count badges and each match and set badge, through the row's own
   * badge text), plus the raw action keyword.
   */
  const ruleSearchText = (rule: RouteMapRule) => {
    const action = rule.action === "permit" ? tr("permit") : rule.action === "deny" ? tr("deny") : "";
    const counts = routeMapRuleCounts(rule);
    const badges = [...routeMapMatchOverviewBadges(rule.match), ...routeMapSetOverviewBadges(rule.set)].map(badgeText);
    return [
      String(rule.rule_number),
      rule.description ?? "",
      rule.action,
      action,
      counts.match > 0 ? t("row.conditions", { count: counts.match }) : "",
      counts.set > 0 ? t("row.actions", { count: counts.set }) : "",
      ...badges,
    ]
      .join("\n")
      .toLowerCase();
  };

  const filteredRules = currentRules.filter((rule) => {
    const query = ruleSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return ruleSearchText(rule).includes(query);
  });

  const openModal = (kind: ModalKind, routeMap: RouteMap | null = null, rule: RouteMapRule | null = null) => {
    setModal({ kind, routeMap, rule });
    setModalKey((key) => key + 1);
    setModalOpen(true);
  };

  const resetReorder = useCallback(() => {
    setReorderedRules([]);
    setReorderError(null);
  }, []);

  /** Screen-reader text for a keyboard or pointer reorder, naming the rules by number. */
  const dragAnnouncements: Announcements = {
    onDragStart: ({ active }) => t("dnd.start", { number: String(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t("dnd.over", { number: String(active.id), target: String(over.id) })
        : t("dnd.overNone", { number: String(active.id) }),
    onDragEnd: ({ active, over }) =>
      over
        ? t("dnd.end", { number: String(active.id), target: String(over.id) })
        : t("dnd.endNone", { number: String(active.id) }),
    onDragCancel: ({ active }) => t("dnd.cancel", { number: String(active.id) }),
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
    if (!selectedRouteMapData || !hasReorder) return;
    setSavingReorder(true);
    setReorderError(null);
    try {
      // Every rule of the route-map, in the new order.
      await routeMapService.reorderRules(
        selectedRouteMapData.name,
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

  const handleRouteMapSelect = (name: string) => {
    if (savingReorder) return;
    resetReorder();
    setSelectedRouteMap(name);
    setRuleSearchQuery("");
  };

  const handleRouteMapDeleted = () => {
    if (selectedRouteMapData && modal?.routeMap?.name === selectedRouteMapData.name) setSelectedRouteMap(null);
    resetReorder();
    void reload();
  };

  const afterSave = () => {
    resetReorder();
    void reload();
  };

  const pickersFor = (routeMapName: string | null): RouteMapPickers =>
    lists
      ? {
          asPathLists: lists.asPathLists,
          communityLists: lists.communityLists,
          extcommunityLists: lists.extcommunityLists,
          largeCommunityLists: lists.largeCommunityLists,
          ipv4AccessLists: lists.ipv4AccessLists,
          ipv6AccessLists: lists.ipv6AccessLists,
          ipv4PrefixLists: lists.ipv4PrefixLists,
          ipv6PrefixLists: lists.ipv6PrefixLists,
          bgpPeers: lists.bgpPeers,
          routeMaps: routeMaps.map((rm) => rm.name).filter((name) => name !== routeMapName),
        }
      : NO_PICKERS;

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
            <h2 className="text-xl font-semibold text-foreground">{t("page.errorTitle")}</h2>
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
        {/* Left Sidebar - Route Map List */}
        <div className="w-80 border-r border-border bg-card/50 flex flex-col">
          <div className="p-6 pb-4 shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Map className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{t("page.title")}</h1>
                <p className="text-xs text-muted-foreground">
                  {t("page.summary", { mapCount: routeMaps.length, ruleCount: totalRules })}
                </p>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("page.searchPlaceholder")}
                aria-label={t("page.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {hasWrite && (
              <Button
                onClick={() => openModal("createMap")}
                className="w-full"
                size="sm"
                disabled={writeDisabled || hasReorder}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("page.createRouteMap")}
              </Button>
            )}
          </div>

          <Separator className="shrink-0" />

          <ScrollArea className="flex-1 px-3 min-h-0">
            <div className="space-y-1 py-3">
              {filteredRouteMaps.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery.trim() ? t("page.noMatch") : t("page.noneConfigured")}
                  </p>
                  {!searchQuery.trim() && hasWrite && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => openModal("createMap")}
                      className="mt-2"
                      disabled={writeDisabled}
                    >
                      {t("page.createFirst")}
                    </Button>
                  )}
                </div>
              ) : (
                filteredRouteMaps.map((routeMap) => (
                  <div
                    key={routeMap.name}
                    className={cn(
                      "group relative rounded-lg transition-all",
                      selectedRouteMapData?.name === routeMap.name
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50",
                    )}
                  >
                    <button
                      onClick={() => handleRouteMapSelect(routeMap.name)}
                      disabled={savingReorder}
                      className="w-full text-left px-3 py-2.5 pr-10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm font-mono truncate">{routeMap.name}</span>
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {routeMap.rules.length}
                        </Badge>
                      </div>
                      {routeMap.description && (
                        <p className="text-xs text-muted-foreground truncate">{routeMap.description}</p>
                      )}
                    </button>
                    {hasWrite && (
                      <div className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          aria-label={t("page.deleteRouteMap", { name: routeMap.name })}
                          disabled={writeDisabled || hasReorder}
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal("deleteMap", routeMap);
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
          {selectedRouteMapData ? (
            <>
              <div className="p-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-foreground font-mono">{selectedRouteMapData.name}</h2>
                      {hasWrite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("page.editRouteMap", { name: selectedRouteMapData.name })}
                          disabled={writeDisabled || hasReorder}
                          onClick={() => openModal("editMap", selectedRouteMapData)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {selectedRouteMapData.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedRouteMapData.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => void reload()} variant="outline" size="sm" disabled={refreshing || savingReorder}>
                      <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                      {tc("refresh")}
                    </Button>
                    {hasWrite && (
                      <Button
                        onClick={() => openModal("createRule", selectedRouteMapData)}
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
                <RouteMapReorderBanner
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
                      <Map className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {ruleSearchQuery.trim() ? t("page.noRulesMatch") : t("page.noRules")}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        {ruleSearchQuery.trim() ? t("page.adjustSearch") : t("page.addRulesHint")}
                      </p>
                      {!ruleSearchQuery.trim() && hasWrite && (
                        <Button onClick={() => openModal("createRule", selectedRouteMapData)} disabled={writeDisabled}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t("page.addFirstRule")}
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
                        onDragEnd={handleDragEnd}
                        accessibility={{
                          screenReaderInstructions: { draggable: t("dnd.instructions") },
                          announcements: dragAnnouncements,
                        }}
                      >
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-12"></TableHead>
                              <TableHead>{t("page.colRule")}</TableHead>
                              <TableHead>{t("page.colAction")}</TableHead>
                              <TableHead>{tc("description")}</TableHead>
                              <TableHead>{t("page.colMatch")}</TableHead>
                              <TableHead>{t("page.colSet")}</TableHead>
                              <TableHead className="text-right">{tc("actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext items={ruleIds} strategy={verticalListSortingStrategy}>
                              {filteredRules.map((rule) => (
                                <RouteMapRuleRow
                                  key={rule.rule_number}
                                  rule={rule}
                                  onEdit={(r) => openModal("editRule", selectedRouteMapData, r)}
                                  onDelete={(r) => openModal("deleteRule", selectedRouteMapData, r)}
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
                <Map className="h-16 w-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">{t("page.noSelection")}</h2>
                <p className="text-muted-foreground max-w-md">
                  {routeMaps.length === 0 ? t("page.createToStart") : t("page.selectFromSidebar")}
                </p>
                {routeMaps.length === 0 && hasWrite && (
                  <Button onClick={() => openModal("createMap")} disabled={writeDisabled}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("page.createRouteMap")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {modal?.kind === "createMap" && (
        <CreateRouteMapModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          existingNames={routeMaps.map((rm) => rm.name)}
          capabilities={capabilities}
          pickers={pickersFor(null)}
          pickerErrors={pickerErrors}
        />
      )}

      {modal?.kind === "editMap" && modal.routeMap && (
        <EditRouteMapModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          routeMap={modal.routeMap}
          capabilities={capabilities}
        />
      )}

      {modal?.kind === "deleteMap" && modal.routeMap && (
        <DeleteRouteMapModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={handleRouteMapDeleted}
          routeMap={modal.routeMap}
        />
      )}

      {(modal?.kind === "createRule" || modal?.kind === "editRule") && modal.routeMap && (
        <RouteMapRuleModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          routeMap={modal.routeMap}
          existing={modal.kind === "editRule" ? modal.rule : null}
          capabilities={capabilities}
          pickers={pickersFor(modal.routeMap.name)}
          pickerErrors={pickerErrors}
        />
      )}

      {modal?.kind === "deleteRule" && modal.routeMap && modal.rule && (
        <DeleteRouteMapRuleModal
          key={modalKey}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={afterSave}
          routeMapName={modal.routeMap.name}
          rule={modal.rule}
        />
      )}
    </AppLayout>
  );
}
