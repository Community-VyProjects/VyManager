"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { IsisDefaultInfoEntry, IsisCapabilities } from "@/lib/api/isis";

interface IsisDefaultInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: IsisDefaultInfoEntry) => Promise<void>;
  existingKeys: string[];
  routeMapNames: string[];
  capabilities: IsisCapabilities | null;
}

const LEVELS = ["level-1", "level-2"] as const;

export function IsisDefaultInfoModal({
  open,
  onOpenChange,
  onSubmit,
  existingKeys,
  routeMapNames,
  capabilities,
}: IsisDefaultInfoModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [family, setFamily] = useState<"ipv4" | "ipv6">("ipv4");
  const [level, setLevel] = useState("");
  const [always, setAlways] = useState(false);
  const [metric, setMetric] = useState("");
  const [routeMap, setRouteMap] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFamily("ipv4");
    setLevel("");
    setAlways(false);
    setMetric("");
    setRouteMap("");
  }, [open]);

  const isDuplicate = level && existingKeys.includes(`${family}|${level}`);

  const handleSubmit = async () => {
    if (!level) { setError("Level is required"); return; }
    if (isDuplicate) { setError(`${family} default-information already exists at ${level}`); return; }

    try {
      setSaving(true);
      setError(null);
      await onSubmit({
        family,
        level,
        always,
        metric: metric.trim() ? parseInt(metric.trim(), 10) : null,
        route_map: routeMap || null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add default-information");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Default Information</DialogTitle>
          <DialogDescription>
            Originate a default route into IS-IS.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Address family</Label>
            <Select value={family} onValueChange={(v) => setFamily(v as "ipv4" | "ipv6")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ipv4">IPv4</SelectItem>
                {capabilities?.features.redistribute_ipv6?.supported !== false && (
                  <SelectItem value="ipv6">IPv6</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>IS-IS Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="di-always" checked={always} onCheckedChange={(v) => setAlways(!!v)} />
            <Label htmlFor="di-always">Always</Label>
          </div>
          <div className="space-y-2">
            <Label>Metric (optional)</Label>
            <Input type="number" value={metric} onChange={(e) => setMetric(e.target.value)} min={1} />
          </div>
          <div className="space-y-2">
            <Label>Route Map (optional)</Label>
            <Select value={routeMap} onValueChange={(v) => setRouteMap(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {routeMapNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !!isDuplicate}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
