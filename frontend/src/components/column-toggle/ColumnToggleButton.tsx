"use client";

import { SlidersHorizontal, GripVertical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ColumnDef } from "@/hooks/useColumnVisibility";

interface SortableColumnItemProps {
  column: ColumnDef;
  checked: boolean;
  onToggle: () => void;
}

function SortableColumnItem({ column, checked, onToggle }: SortableColumnItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-sm select-none ${isDragging ? "opacity-50 bg-accent" : "hover:bg-accent"}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Checkbox
        id={`col-${column.id}`}
        checked={checked}
        onCheckedChange={onToggle}
      />
      <label
        htmlFor={`col-${column.id}`}
        className="text-sm cursor-pointer flex-1 leading-none"
      >
        {column.label}
      </label>
    </div>
  );
}

interface ColumnToggleButtonProps {
  columns: ColumnDef[];
  visibleColumns: Set<string>;
  onToggle: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onReset: () => void;
}

export function ColumnToggleButton({
  columns,
  visibleColumns,
  onToggle,
  onReorder,
  onReset,
}: ColumnToggleButtonProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="end">
        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Toggle &amp; drag to reorder</p>
        <Separator className="my-1" />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={columns.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {columns.map((col) => (
              <SortableColumnItem
                key={col.id}
                column={col}
                checked={visibleColumns.has(col.id)}
                onToggle={() => onToggle(col.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
        <Separator className="my-1" />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={onReset}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-2" />
          Reset to Default
        </Button>
      </PopoverContent>
    </Popover>
  );
}
