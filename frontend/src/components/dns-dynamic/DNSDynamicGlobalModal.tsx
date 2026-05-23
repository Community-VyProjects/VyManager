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
import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interval: number | null;
  vrf: string | null;
  onSubmit: (interval: number | null, vrf: string | null) => Promise<void>;
}

export function DNSDynamicGlobalModal({ open, onOpenChange, interval, vrf, onSubmit }: Props) {
  const [intervalVal, setIntervalVal] = useState("");
  const [vrfVal, setVrfVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIntervalVal(interval != null ? String(interval) : "");
      setVrfVal(vrf ?? "");
      setError(null);
    }
  }, [open, interval, vrf]);

  const handleSubmit = async () => {
    const parsedInterval = intervalVal ? parseInt(intervalVal, 10) : null;
    if (intervalVal && (isNaN(parsedInterval!) || parsedInterval! < 60 || parsedInterval! > 3600)) {
      setError("Interval must be between 60 and 3600 seconds");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(parsedInterval, vrfVal.trim() || null);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Global DDNS Settings</DialogTitle>
          <DialogDescription>Configure global Dynamic DNS service settings.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ddns-interval">Check Interval (seconds)</Label>
            <Input
              id="ddns-interval"
              type="number"
              value={intervalVal}
              onChange={(e) => setIntervalVal(e.target.value)}
              placeholder="300 (default)"
              min={60}
              max={3600}
            />
            <p className="text-xs text-muted-foreground">How often to check for IP changes (60–3600 s).</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ddns-vrf">VRF (optional)</Label>
            <Input
              id="ddns-vrf"
              value={vrfVal}
              onChange={(e) => setVrfVal(e.target.value)}
              placeholder="e.g. mgmt"
              className="font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
