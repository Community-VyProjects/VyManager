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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { IsisRedistributeEntry } from "@/lib/api/isis";

interface IsisRedistributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: IsisRedistributeEntry) => Promise<void>;
  existingProtocols: string[]; // "protocol|level" combos already configured
  routeMapNames: string[];
}

const PROTOCOLS = ["bgp", "connected", "kernel", "ospf", "rip", "static"] as const;
const LEVELS = ["level-1", "level-2"] as const;

export function IsisRedistributeModal({
  open,
  onOpenChange,
  onSubmit,
  existingProtocols,
  routeMapNames,
}: IsisRedistributeModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [protocol, setProtocol] = useState("");
  const [level, setLevel] = useState("");
  const [metric, setMetric] = useState("");
  const [routeMap, setRouteMap] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setProtocol("");
    setLevel("");
    setMetric("");
    setRouteMap("");
  }, [open]);

  const isDuplicate = protocol && level && existingProtocols.includes(`${protocol}|${level}`);

  const handleSubmit = async () => {
    if (!protocol) { setError("Protocol is required"); return; }
    if (!level) { setError("Level is required"); return; }
    if (isDuplicate) { setError(`${protocol} is already redistributed at ${level}`); return; }

    const entry: IsisRedistributeEntry = {
      protocol,
      level,
      metric: metric.trim() ? parseInt(metric.trim(), 10) : null,
      route_map: routeMap || null,
    };

    try {
      setSaving(true);
      setError(null);
      await onSubmit(entry);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add redistribution");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Redistribution</DialogTitle>
          <DialogDescription>
            Redistribute routes from another protocol into IS-IS.
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
            <Label>Protocol <span className="text-destructive">*</span></Label>
            <Select value={protocol} onValueChange={setProtocol}>
              <SelectTrigger>
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent>
                {PROTOCOLS.map((p) => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>IS-IS Level <span className="text-destructive">*</span></Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{l === "level-1" ? "Level 1" : "Level 2"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isDuplicate && (
            <p className="text-sm text-destructive">
              {protocol} is already configured at {level}.
            </p>
          )}

          <div className="space-y-2">
            <Label>Metric (optional)</Label>
            <Input
              type="number"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder="Default"
              min={1}
              max={16777214}
            />
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !!isDuplicate}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Redistribute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
