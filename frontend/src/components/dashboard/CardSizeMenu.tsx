"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEFAULT_HEIGHT, HEIGHT_PRESETS } from "@/lib/dashboard-layout";

const WIDTH_PRESETS: { label: string; value: number }[] = [
  { label: "Small (1 column)", value: 1 },
  { label: "Medium (2 columns)", value: 2 },
  { label: "Large (3 columns)", value: 3 },
];

interface CardSizeMenuProps {
  span?: number;
  onSpanChange: (newSpan: number) => void;
  height?: number;
  onHeightChange?: (newHeight: number) => void;
}

/**
 * Shared gear-icon dropdown for choosing a dashboard card's width and height.
 * Rendered only in edit mode (callers gate on `onSpanChange` being defined).
 */
export function CardSizeMenu({
  span = 1,
  onSpanChange,
  height = DEFAULT_HEIGHT,
  onHeightChange,
}: CardSizeMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Card Width</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {WIDTH_PRESETS.map((preset) => (
          <DropdownMenuItem key={preset.value} onClick={() => onSpanChange(preset.value)}>
            <div className="flex items-center justify-between w-full">
              <span>{preset.label}</span>
              {span === preset.value && <span className="ml-2 text-primary">✓</span>}
            </div>
          </DropdownMenuItem>
        ))}

        {onHeightChange && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Card Height</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {HEIGHT_PRESETS.map((preset) => (
              <DropdownMenuItem key={preset.value} onClick={() => onHeightChange(preset.value)}>
                <div className="flex items-center justify-between w-full">
                  <span>{preset.label}</span>
                  {height === preset.value && <span className="ml-2 text-primary">✓</span>}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
