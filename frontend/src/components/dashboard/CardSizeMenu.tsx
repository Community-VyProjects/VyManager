"use client";

import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
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

const WIDTH_PRESETS: { id: "small" | "medium" | "large"; value: number }[] = [
  { id: "small", value: 1 },
  { id: "medium", value: 2 },
  { id: "large", value: 3 },
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
  const t = useTranslations("dashboard.sizeMenu");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("cardWidth")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {WIDTH_PRESETS.map((preset) => (
          <DropdownMenuItem key={preset.value} onClick={() => onSpanChange(preset.value)}>
            <div className="flex items-center justify-between w-full">
              <span>{t(preset.id)}</span>
              {span === preset.value && <span className="ml-2 text-primary">✓</span>}
            </div>
          </DropdownMenuItem>
        ))}

        {onHeightChange && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("cardHeight")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {HEIGHT_PRESETS.map((preset) => (
              <DropdownMenuItem key={preset.value} onClick={() => onHeightChange(preset.value)}>
                <div className="flex items-center justify-between w-full">
                  <span>{t(preset.id)}</span>
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
