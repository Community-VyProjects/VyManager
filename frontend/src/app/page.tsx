"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Edit3, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Github, Globe, MessageCircle, Sparkles } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useSessionStore } from "@/store/session-store";
import { dashboardService, DashboardCard, DashboardLayout } from "@/lib/api/dashboard";
import { InterfaceStatisticsCard } from "@/components/dashboard/InterfaceStatisticsCard";
import { AddCardModal } from "@/components/dashboard/AddCardModal";
import {
  DndContext,
  DragEndEvent,
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
      className={`${isDragging ? "cursor-grabbing" : "cursor-grab"} ${
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
  hasCards,
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
  const { activeSession, loadSession } = useSessionStore();

  // Dashboard state
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [addCardModalOpen, setAddCardModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

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
        // Ensure all cards have a span property (backward compatibility)
        const cardsWithSpan = (response.layout.cards || []).map((card) => {
          if (card.span === undefined) {
            // Set default span based on card type
            if (card.type === "interface-statistics") {
              return { ...card, span: 2 };
            }
            return { ...card, span: 1 };
          }
          return card;
        });
        setCards(cardsWithSpan);
      } else {
        setCards([]);
      }
    } catch (err) {
      console.error("Failed to load dashboard layout:", err);
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

      const sessionLoaded = await loadSession();
      // Always try to load dashboard - the API will return empty if no layout exists
      await loadDashboard();
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
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
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
    let targetPosition = 0;

    // Check if dropped on a column zone
    const columnMatch = over.id.toString().match(/^column-(\d+)$/);
    if (columnMatch) {
      targetColumn = parseInt(columnMatch[1]);
      console.log(`[Drag] Dropped on Column ${targetColumn + 1} overlay`);
    } else {
      // Check if dropped on another card
      const overCard = cards.find((c) => c.id === over.id);
      if (!overCard) {
        console.log(`[Drag] Dropped on unknown target: ${over.id}`);
        return;
      }

      // Don't do anything if dropping on itself
      if (activeCard.id === overCard.id) {
        return;
      }

      // Use the overCard's column and position as target
      targetColumn = overCard.column;
      targetPosition = overCard.position;
      console.log(`[Drag] Dropped on card at column=${targetColumn}, position=${targetPosition}`);
    }

    // SMART VALIDATION: Adjust column if span would overflow
    // A card can only start at a column where it won't exceed column 2
    const maxStartColumn = 3 - cardSpan; // span 1: max col 2, span 2: max col 1, span 3: max col 0
    if (targetColumn > maxStartColumn) {
      targetColumn = maxStartColumn;
    }

    // Build occupancy map from all existing cards (excluding the one being moved)
    const rowOccupancy: Map<number, Set<number>> = new Map();
    for (const card of cards) {
      if (card.id === activeCard.id) continue;

      const span = card.span || 1;
      const startCol = card.column;
      const endCol = Math.min(startCol + span - 1, 2);

      if (!rowOccupancy.has(card.position)) {
        rowOccupancy.set(card.position, new Set());
      }

      for (let col = startCol; col <= endCol; col++) {
        rowOccupancy.get(card.position)!.add(col);
      }
    }

    // If dropped on a column overlay, find next available row
    // If dropped on a card, try to use that card's position first
    if (columnMatch) {
      targetPosition = 0; // Start from top for column drops
    }

    // Find first available row where this card can fit
    const endCol = targetColumn + cardSpan - 1;
    let finalPosition = targetPosition;

    while (finalPosition < 100) {
      const occupied = rowOccupancy.get(finalPosition);
      if (!occupied) {
        // Row is completely empty
        break;
      }

      // Check if columns needed for this card are free
      let allFree = true;
      for (let col = targetColumn; col <= endCol; col++) {
        if (occupied.has(col)) {
          allFree = false;
          break;
        }
      }

      if (allFree) {
        // Found a free spot
        break;
      }

      finalPosition++;
    }

    const updatedCards = cards.map((c) => {
      if (c.id === activeCard.id) {
        return { ...c, column: targetColumn, position: finalPosition };
      }
      return c;
    });

    console.log(`[Drag] Placed card: column=${targetColumn}, position=${finalPosition}, span=${cardSpan}`);

    setCards(updatedCards);
    setHasUnsavedChanges(true);
  };

  const handleAddCard = (cardType: string) => {
    // Determine default span based on card type
    let defaultSpan = 1;
    if (cardType === "interface-statistics") {
      defaultSpan = 2;
    }

    // New cards always start at column 0
    const targetColumn = 0;

    // Build occupancy map from existing cards
    const rowOccupancy: Map<number, Set<number>> = new Map();
    for (const card of cards) {
      const span = card.span || 1;
      const startCol = card.column;
      const endCol = Math.min(startCol + span - 1, 2);

      if (!rowOccupancy.has(card.position)) {
        rowOccupancy.set(card.position, new Set());
      }

      for (let col = startCol; col <= endCol; col++) {
        rowOccupancy.get(card.position)!.add(col);
      }
    }

    // Find first available row where this card can fit
    let targetPosition = 0;
    const endCol = targetColumn + defaultSpan - 1;

    while (targetPosition < 100) {
      const occupied = rowOccupancy.get(targetPosition);
      if (!occupied) {
        // Row is completely empty
        break;
      }

      // Check if columns needed for this card are free
      let allFree = true;
      for (let col = targetColumn; col <= endCol; col++) {
        if (occupied.has(col)) {
          allFree = false;
          break;
        }
      }

      if (allFree) {
        break;
      }

      targetPosition++;
    }

    const newCard: DashboardCard = {
      id: `card-${Date.now()}`,
      type: cardType,
      column: targetColumn,
      position: targetPosition,
      span: defaultSpan,
    };

    setCards([...cards, newCard]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveCard = (cardId: string) => {
    setCards(cards.filter((c) => c.id !== cardId));
    setHasUnsavedChanges(true);
  };

  const handleCardSpanChange = (cardId: string, newSpan: number) => {
    setCards(cards.map((c) => {
      if (c.id === cardId) {
        return { ...c, span: newSpan };
      }
      return c;
    }));
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

  const renderCard = (card: DashboardCard) => {
    const baseProps = {
      config: card.config,
      onRemove: editMode ? () => handleRemoveCard(card.id) : undefined,
      span: card.span || 1,
      onSpanChange: editMode ? (newSpan: number) => handleCardSpanChange(card.id, newSpan) : undefined,
    };

    switch (card.type) {
      case "interface-statistics":
        return <InterfaceStatisticsCard {...baseProps} />;
      default:
        return null;
    }
  };

  // Get grid placement classes and styles for explicit positioning
  const getGridClasses = (card: DashboardCard) => {
    const span = card.span || 1;
    let classes = "";

    // Column span
    if (span === 2) classes += "col-span-2 ";
    if (span === 3) classes += "col-span-3 ";

    // Column start position
    if (card.column === 1) classes += "col-start-2 ";
    if (card.column === 2) classes += "col-start-3 ";

    return classes.trim();
  };

  const getGridStyle = (card: DashboardCard) => {
    // Explicit row placement
    return {
      gridRow: card.position + 1
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
        {cards.length === 0 && !editMode ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Your dashboard is empty. Click &quot;Edit Dashboard&quot; to add cards.
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
              <div className="grid grid-cols-3 gap-6 auto-rows-min relative z-0">
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
                      <div key={card.id}>{renderCard(card)}</div>
                    );

                    return (
                      <div
                        key={card.id}
                        className={getGridClasses(card)}
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
                <div className="opacity-80 cursor-grabbing">
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
      </div>
    </AppLayout>
  );
}
