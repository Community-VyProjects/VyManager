"use client";

import { useState, useMemo } from "react";
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

interface CustomThemeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomThemeEditor({ open, onOpenChange }: CustomThemeEditorProps) {
  const { addCustomTheme, setThemeId } = useTheme();
  const [name, setName] = useState("My Theme");
  const [hue, setHue] = useState(250);

  const preview = useMemo(() => deriveThemeFromPrimary(hue), [hue]);

  function handleSave() {
    const id = `custom-${Date.now()}`;
    addCustomTheme({
      id,
      name: name.trim() || "My Theme",
      isDark: true,
      isCustom: true,
      variables: preview,
    });
    setThemeId(id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create custom theme</DialogTitle>
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
            <label className="text-xs font-medium text-muted-foreground">
              Primary hue — {hue}°
            </label>
            <div className="relative">
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
          <Button onClick={handleSave}>Save theme</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
