"use client";

import { useState, useMemo, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/contexts/ThemeContext";
import { deriveThemeFromPrimary } from "@/themes/utils";
import type { ThemeDefinition } from "@/themes/types";
import { cn } from "@/lib/utils";

interface CustomThemeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTheme?: ThemeDefinition;
}

function extractHue(variables: Record<string, string>): number {
  const primary = variables["primary"] ?? "";
  // Matches the third value in oklch(L C H) or oklch(L C H / alpha)
  const match = primary.match(/oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/);
  return match ? Math.round(Number(match[1])) : 250;
}

export function CustomThemeEditor({ open, onOpenChange, editingTheme }: CustomThemeEditorProps) {
  const { addCustomTheme, updateCustomTheme, setThemeId } = useTheme();
  const [name, setName] = useState("My Theme");
  const [hue, setHue] = useState(250);
  const [isDark, setIsDark] = useState(true);

  // Populate fields when editing an existing theme
  useEffect(() => {
    if (open && editingTheme) {
      setName(editingTheme.name);
      setHue(extractHue(editingTheme.variables));
      setIsDark(editingTheme.isDark);
    } else if (open && !editingTheme) {
      setName("My Theme");
      setHue(250);
      setIsDark(true);
    }
  }, [open, editingTheme]);

  const preview = useMemo(() => deriveThemeFromPrimary(hue, isDark), [hue, isDark]);

  function handleSave() {
    if (editingTheme) {
      updateCustomTheme(editingTheme.id, {
        ...editingTheme,
        name: name.trim() || editingTheme.name,
        isDark,
        variables: preview,
      });
    } else {
      const id = `custom-${Date.now()}`;
      addCustomTheme({ id, name: name.trim() || "My Theme", isDark, isCustom: true, variables: preview });
      setThemeId(id);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editingTheme ? "Edit theme" : "Create custom theme"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Theme"
              maxLength={32}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Variant</label>
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setIsDark(true)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 py-1.5 text-xs font-medium transition-colors",
                  isDark
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
              <button
                onClick={() => setIsDark(false)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 py-1.5 text-xs font-medium transition-colors",
                  !isDark
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Primary hue — {hue}°
            </label>
            <input
              type="range"
              min={0}
              max={359}
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{
                background:
                  "linear-gradient(to right, oklch(0.63 0.23 0), oklch(0.63 0.23 60), oklch(0.63 0.23 120), oklch(0.63 0.23 180), oklch(0.63 0.23 240), oklch(0.63 0.23 300), oklch(0.63 0.23 359))",
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Preview</label>
            <div className="flex flex-col gap-1 rounded-md border p-2">
              <div className="flex h-8 gap-0.5 overflow-hidden rounded">
                <div className="flex-1" style={{ background: preview["background"] }} />
                <div className="flex-1" style={{ background: preview["primary"] }} />
                <div className="flex-1" style={{ background: preview["accent"] }} />
                <div className="flex-1" style={{ background: preview["card"] }} />
              </div>
              <div className="flex gap-1 mt-1">
                {["primary", "chart-1", "chart-2", "chart-3", "chart-4"].map((key) => (
                  <div
                    key={key}
                    className="h-3 flex-1 rounded-sm"
                    style={{ background: preview[key] }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{editingTheme ? "Save changes" : "Save theme"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
