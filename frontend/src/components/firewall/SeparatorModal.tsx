"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  firewallSeparatorsService,
  type FirewallSeparator,
  type SeparatorFamily,
} from "@/lib/api/firewall-separators";

// A small preset palette. 6-digit hex so SeparatorBar's alpha tint works.
const COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Slate", value: "#64748b" },
];

interface SeparatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  family: SeparatorFamily;
  chain: string;
  /** When set, edit this separator; otherwise create a new one. */
  editing?: FirewallSeparator | null;
  /**
   * Position for a new separator, taken from the gap that was clicked. The bar
   * renders above the first rule whose number >= this value. Defaults to the
   * top of the chain. Ignored when editing (drag the bar to move it instead).
   */
  defaultPosition?: number | null;
  /** Called with the instance's refreshed separator list after a save. */
  onSaved: (separators: FirewallSeparator[]) => void;
}

export function SeparatorModal({
  open,
  onOpenChange,
  family,
  chain,
  editing,
  defaultPosition,
  onSaved,
}: SeparatorModalProps) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the form whenever the modal is opened.
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setLabel(editing.label);
      setColor(editing.color);
    } else {
      setLabel("");
      setColor(COLORS[0].value);
    }
  }, [open, editing]);

  const handleSave = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Label is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Keep the existing position when editing; for a new separator use the
      // clicked gap (defaultPosition), falling back to the top of the chain.
      const position = editing ? editing.position : defaultPosition ?? 0;
      const separators = await firewallSeparatorsService.save({
        id: editing?.id,
        family,
        chain,
        position,
        label: trimmed,
        color,
      });
      onSaved(separators);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save separator");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Separator" : "Add Separator"}</DialogTitle>
          <DialogDescription>
            Separators are visual section labels for the{" "}
            <span className="font-medium capitalize">{chain} </span> chain. They
            are stored in VyManager and don&apos;t change the router config.
            {editing ? " Drag the bar to move it between rules." : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="separator-label">Label</Label>
            <Input
              id="separator-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Ingress, Management, VPN"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={c.name}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    color === c.value
                      ? "scale-110 border-foreground"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editing ? "Save Changes" : "Add Separator"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
