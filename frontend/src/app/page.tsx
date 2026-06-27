"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Edit3, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Github, Globe, MessageCircle, Sparkles, ArrowUpCircle, Tag } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useSessionStore } from "@/store/session-store";
import { dashboardService, DashboardCard, DashboardLayout } from "@/lib/api/dashboard";
import {
  compactLayout,
  cardPixelHeight,
  DEFAULT_HEIGHT,
  GRID_COLUMNS,
  ROW_UNIT,
} from "@/lib/dashboard-layout";
import { versionService, VersionCheckResponse } from "@/lib/api/version";
import { InterfaceStatisticsCard } from "@/components/dashboard/InterfaceStatisticsCard";
import { SystemInfoCard } from "@/components/dashboard/SystemInfoCard";
import { WireGuardPeersCard } from "@/components/dashboard/WireGuardPeersCard";
import { NetworkSpeedCard } from "@/components/dashboard/NetworkSpeedCard";
import { QoSStatsCard } from "@/components/dashboard/QoSStatsCard";
import { OpenVpnCard } from "@/components/dashboard/OpenVpnCard";
import { VrrpStatusCard } from "@/components/dashboard/VrrpStatusCard";
import { BgpStatusCard } from "@/components/dashboard/BgpStatusCard";
import { IpsecCard } from "@/components/dashboard/IpsecCard";
import { AddCardModal } from "@/components/dashboard/AddCardModal";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ApiError } from "@/lib/types/api";
import { DashboardDataProvider } from "@/contexts/DashboardDataContext";

// Sortable card wrapper component
function SortableCard({ card, children }: { card: DashboardCard; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-full ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${
        isOver ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

// Droppable column overlay (for drag targeting only)
function DroppableColumnOverlay({
  columnId,
  editMode,
  isDragging,
}: {
  columnId: string;
  editMode: boolean;
  hasCards: boolean;
  isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  if (!editMode) return null;

  const columnNumber = parseInt(columnId.split("-")[1]) + 1;

  return (
    <div
      ref={setNodeRef}
      className={`relative h-full min-h-[800px] rounded-lg transition-all ${
        isOver
          ? "bg-primary/30 border-4 border-primary border-solid shadow-2xl"
          : isDragging
            ? "border-2 border-dashed border-primary/50 bg-primary/5"
            : "border-2 border-dashed border-border/20 bg-transparent"
      }`}
    >
      <div className={`flex flex-col items-center justify-center h-full text-lg font-bold pointer-events-none ${
        isDragging ? "opacity-100 text-primary" : "opacity-30 text-muted-foreground"
      }`}>
        <div>Column {columnNumber}</div>
        {isDragging && <div className="text-sm font-normal mt-2">Drop here</div>}
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const { data: session, isPending } = useSession();
  const { loadSession } = useSessionStore();

  // Dashboard state
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [addCardModalOpen, setAddCardModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [canEditDashboard, setCanEditDashboard] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionCheckResponse | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load dashboard layout
  const loadDashboard = async () => {
    try {
      const response = await dashboardService.getLayout();
      if (response.exists && response.layout) {
        // Backfill span/height for cards saved before those fields existed,
        // then compact so legacy row-index positions reflow into the row-unit grid.
        const normalized = (response.layout.cards || []).map((card) => {
          const span =
            card.span ??
            (card.type === "interface-statistics" || card.type === "network-speed" ? 2 : 1);
          const height = card.height ?? DEFAULT_HEIGHT;
          return { ...card, span, height };
        });
        setCards(compactLayout(normalized));
      } else {
        setCards([]);
      }
    } catch (err) {
      // Extract error message for logging
      const errorMessage = (err as ApiError).message || (err as ApiError).message || (err as ApiError).message || "Unknown error";
      console.error("Failed to load dashboard layout:", errorMessage);
    }
  };

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (isPending) {
        return;
      }

      if (!session?.user) {
        try {
          const response = await fetch(`/api/session/onboarding-status`, {
            method: "GET",
          });

          if (!response.ok) {
            console.error("[RootPage] Onboarding status check failed:", response.status);
            router.push("/login");
            return;
          }

          const data = await response.json();

          if (data.needs_onboarding) {
            console.log("[RootPage] Onboarding needed - redirecting to /onboarding");
            router.push("/onboarding");
          } else {
            console.log("[RootPage] Onboarding complete - redirecting to /login");
            router.push("/login");
          }
        } catch (err) {
          console.error("[RootPage] Failed to check onboarding status:", err);
          router.push("/login");
        }
        return;
      }

      await loadSession();
      // Always try to load dashboard - the API will return empty if no layout exists
      await loadDashboard();

      // Check for version updates
      versionService.checkVersion().then(setVersionInfo).catch(() => {});

      // Check if user has permission to edit the dashboard layout
      try {
        const perms = await fetch("/api/vyos/permissions", { credentials: "include" });
        if (perms.ok) {
          const data = await perms.json();
          setCanEditDashboard(data["DASHBOARD"] === "WRITE");
        }
      } catch {
        // If permissions check fails, default to no edit access
      }

      setIsChecking(false);
    };

    checkAndRedirect();
  }, [router, session, isPending, loadSession]);

  if (isPending || isChecking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handler functions
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over) {
      return;
    }

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) {
      return;
    }

    const cardSpan = activeCard.span || 1;
    let targetColumn = 0;
    // Tentative vertical position that steers compaction: a card dropped onto
    // another takes a slot just above it; a column-overlay drop goes to the top.
    let tentativePosition = 0;

    // Check if dropped on a column zone
    const columnMatch = over.id.toString().match(/^column-(\d+)$/);
    if (columnMatch) {
      targetColumn = parseInt(columnMatch[1]);
      tentativePosition = -1; // top of the column
    } else {
      // Check if dropped on another card
      const overCard = cards.find((c) => c.id === over.id);
      if (!overCard) {
        return;
      }

      // Don't do anything if dropping on itself
      if (activeCard.id === overCard.id) {
        return;
      }

      // Take the target card's column and insert just above its position.
      targetColumn = overCard.column;
      tentativePosition = overCard.position - 0.5;
    }

    // Clamp the start column so the card's span fits within the grid width.
    const maxStartColumn = GRID_COLUMNS - cardSpan;
    targetColumn = Math.min(Math.max(targetColumn, 0), maxStartColumn);

    const updatedCards = cards.map((c) =>
      c.id === activeCard.id ? { ...c, column: targetColumn, position: tentativePosition } : c
    );

    setCards(compactLayout(updatedCards));
    setHasUnsavedChanges(true);
  };

  const handleAddCard = (cardType: string) => {
    // Determine default span based on card type
    let defaultSpan = 1;
    if (cardType === "interface-statistics") {
      defaultSpan = 2;
    }
    if (cardType === "network-speed") {
      defaultSpan = 2;
    }
    if (cardType === "qos-statistics") {
      defaultSpan = 2;
    }
    if (cardType === "openvpn-status") {
      defaultSpan = 2;
    }
    if (cardType === "vrrp-status") {
      defaultSpan = 2;
    }
    if (cardType === "bgp-status") {
      defaultSpan = 2;
    }
    if (cardType === "ipsec-status") {
      defaultSpan = 2;
    }
    // system-info defaults to 1 column (already set above)

    // Append at the bottom of column 0 (large tentative position) and let
    // compaction settle it into the first free slot.
    const newCard: DashboardCard = {
      id: `card-${Date.now()}`,
      type: cardType,
      column: 0,
      position: Number.MAX_SAFE_INTEGER,
      span: defaultSpan,
      height: DEFAULT_HEIGHT,
    };

    setCards(compactLayout([...cards, newCard]));
    setHasUnsavedChanges(true);
  };

  const handleRemoveCard = (cardId: string) => {
    setCards(compactLayout(cards.filter((c) => c.id !== cardId)));
    setHasUnsavedChanges(true);
  };

  const handleCardSpanChange = (cardId: string, newSpan: number) => {
    setCards(
      compactLayout(
        cards.map((c) => (c.id === cardId ? { ...c, span: newSpan } : c))
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleCardHeightChange = (cardId: string, newHeight: number) => {
    setCards(
      compactLayout(
        cards.map((c) => (c.id === cardId ? { ...c, height: newHeight } : c))
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const layout: DashboardLayout = { cards };
      await dashboardService.saveLayout(layout);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Failed to save dashboard layout:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    // Reload the dashboard from the saved state, discarding changes
    await loadDashboard();
    setHasUnsavedChanges(false);
  };

  const handleCardConfigChange = (cardId: string, config: Record<string, unknown>) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, config } : c))
    );
    setHasUnsavedChanges(true);
  };

  const renderCard = (card: DashboardCard) => {
    const baseProps = {
      config: card.config,
      onRemove: editMode ? () => handleRemoveCard(card.id) : undefined,
      span: card.span || 1,
      onSpanChange: editMode ? (newSpan: number) => handleCardSpanChange(card.id, newSpan) : undefined,
      height: card.height ?? DEFAULT_HEIGHT,
      onHeightChange: editMode ? (newHeight: number) => handleCardHeightChange(card.id, newHeight) : undefined,
      onConfigChange: editMode
        ? (config: Record<string, unknown>) => handleCardConfigChange(card.id, config)
        : undefined,
    };

    switch (card.type) {
      case "interface-statistics":
        return <InterfaceStatisticsCard {...baseProps} />;
      case "system-info":
        return <SystemInfoCard {...baseProps} />;
      case "wireguard-peers":
        return <WireGuardPeersCard {...baseProps} />;
      case "network-speed":
        return <NetworkSpeedCard {...baseProps} />;
      case "qos-statistics":
        return <QoSStatsCard {...baseProps} />;
      case "openvpn-status":
        return <OpenVpnCard {...baseProps} />;
      case "vrrp-status":
        return <VrrpStatusCard {...baseProps} />;
      case "bgp-status":
        return <BgpStatusCard {...baseProps} />;
      case "ipsec-status":
        return <IpsecCard {...baseProps} />;
      default:
        return null;
    }
  };

  // Explicit grid placement: a card occupies a rectangle of columns × row-units.
  const getGridStyle = (card: DashboardCard) => {
    const span = card.span || 1;
    const height = card.height ?? DEFAULT_HEIGHT;
    return {
      gridColumn: `${card.column + 1} / span ${span}`,
      gridRow: `${card.position + 1} / span ${height}`,
    };
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Welcome to VyManager - Professional VyOS Management Interface
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canEditDashboard && (
                <>
                  {hasUnsavedChanges && (
                    <>
                      <Button variant="outline" onClick={handleCancel} disabled={saving}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : "Save Layout"}
                      </Button>
                    </>
                  )}
                  {editMode && (
                    <Button onClick={() => setAddCardModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Card
                    </Button>
                  )}
                  <Button
                    variant={editMode ? "default" : "outline"}
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Exit Edit
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Dashboard
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Beta Information Card */}
          <div className="mt-6 relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-cyan-500/5 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
            <div className="relative p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Open Beta</span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {versionInfo && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      v{versionInfo.current_version}
                    </span>
                    {versionInfo.environment === "dev" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                        dev
                      </span>
                    )}
                  </div>
                )}

                {versionInfo?.update_available && (
                  <a
                    href={versionInfo.release_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-medium transition-colors"
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    v{versionInfo.latest_version} available
                  </a>
                )}

                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Development by</span>
                  <a
                    href="https://github.com/Community-VyProjects/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 font-medium transition-colors underline decoration-primary/30 hover:decoration-primary/60"
                  >
                    VyProjects Org
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href="https://vyprojects.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 font-medium transition-colors underline decoration-primary/30 hover:decoration-primary/60"
                  >
                    Website
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Join our</span>
                  <a
                    href="https://discord.gg/4mE6QsZtKm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-500 hover:text-purple-400 font-medium transition-colors underline decoration-purple-500/30 hover:decoration-purple-500/60"
                  >
                    Discord
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <DashboardDataProvider>
        {cards.length === 0 && !editMode ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {canEditDashboard
                ? "Your dashboard is empty. Click \"Edit Dashboard\" to add cards."
                : "Your dashboard is empty."}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {/* Wrapper for grid and overlays */}
            <div className="relative">
              {/* Main grid with explicit card placement */}
              <div
                className="grid grid-cols-3 gap-6 relative z-0"
                style={{ gridAutoRows: `${ROW_UNIT}px` }}
              >
                <SortableContext
                  items={cards.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {/* Render cards with explicit grid placement */}
                  {cards.map((card) => {
                    const cardElement = editMode ? (
                      <SortableCard key={card.id} card={card}>
                        {renderCard(card)}
                      </SortableCard>
                    ) : (
                      <div key={card.id} className="h-full">{renderCard(card)}</div>
                    );

                    return (
                      <div
                        key={card.id}
                        style={getGridStyle(card)}
                      >
                        {cardElement}
                      </div>
                    );
                  })}
                </SortableContext>
              </div>

              {/* Droppable column overlays (always visible in edit mode) */}
              {editMode && (
                <div className={`absolute inset-0 grid grid-cols-3 gap-6 z-20 ${activeId ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                  <DroppableColumnOverlay
                    columnId="column-0"
                    editMode={editMode}
                    hasCards={cards.some(c => c.column === 0)}
                    isDragging={!!activeId}
                  />
                  <DroppableColumnOverlay
                    columnId="column-1"
                    editMode={editMode}
                    hasCards={cards.some(c => c.column === 1)}
                    isDragging={!!activeId}
                  />
                  <DroppableColumnOverlay
                    columnId="column-2"
                    editMode={editMode}
                    hasCards={cards.some(c => c.column === 2)}
                    isDragging={!!activeId}
                  />
                </div>
              )}
            </div>

            {/* Drag Overlay - Shows the card being dragged */}
            <DragOverlay>
              {activeId ? (
                <div
                  className="opacity-80 cursor-grabbing"
                  style={{
                    height: cardPixelHeight(
                      cards.find((c) => c.id === activeId)?.height ?? DEFAULT_HEIGHT
                    ),
                  }}
                >
                  {renderCard(cards.find((c) => c.id === activeId)!)}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Add Card Modal */}
        <AddCardModal
          open={addCardModalOpen}
          onOpenChange={setAddCardModalOpen}
          onAddCard={handleAddCard}
        />
        </DashboardDataProvider>
      </div>
    </AppLayout>
  );
}
