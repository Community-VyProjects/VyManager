"use client";

import { useState } from "react";
import { Palette, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemeDefinition } from "@/themes/types";
import { cn } from "@/lib/utils";
import { CustomThemeEditor } from "@/components/ui/custom-theme-editor";

function ThemeCard({
  theme,
  isActive,
  onSelect,
  onDelete,
}: {
  theme: ThemeDefinition;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col gap-1.5 rounded-md border p-2 text-left transition-all hover:border-primary/50 w-full",
        isActive && "border-primary ring-1 ring-primary/30"
      )}
    >
      <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded">
        <div className="flex-1" style={{ background: theme.variables["background"] }} />
        <div className="flex-1" style={{ background: theme.variables["primary"] }} />
        <div className="flex-1" style={{ background: theme.variables["accent"] }} />
      </div>
      <span className="text-xs font-medium leading-none truncate pr-3">{theme.name}</span>
      {theme.isCustom && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-1 right-1 rounded p-0.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </button>
  );
}

export function ThemeSelector() {
  const { themeId, setThemeId, allThemes, removeCustomTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const activeTheme = allThemes.find((t) => t.id === themeId) ?? allThemes[0];

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="h-3 w-3 rounded-full border border-border/50 shrink-0"
                style={{ background: activeTheme?.variables["primary"] }}
              />
              <span className="truncate">{activeTheme?.name}</span>
            </span>
            <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start" side="top">
          <p className="text-xs font-medium text-muted-foreground mb-2">Theme</p>
          <div className="grid grid-cols-2 gap-2">
            {allThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isActive={theme.id === themeId}
                onSelect={() => {
                  setThemeId(theme.id);
                  setOpen(false);
                }}
                onDelete={theme.isCustom ? () => removeCustomTheme(theme.id) : undefined}
              />
            ))}
          </div>
          <Separator className="my-2" />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={() => {
              setOpen(false);
              setEditorOpen(true);
            }}
          >
            <Plus className="h-3 w-3" />
            Create custom theme
          </Button>
        </PopoverContent>
      </Popover>
      <CustomThemeEditor open={editorOpen} onOpenChange={setEditorOpen} />
    </>
  );
}
