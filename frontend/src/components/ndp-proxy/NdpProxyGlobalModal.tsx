"use client";

import { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import { ndpProxyService, NdpProxyConfig } from "@/lib/api/ndp-proxy";

interface NdpProxyGlobalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: NdpProxyConfig;
  onSuccess: () => void;
}

export function NdpProxyGlobalModal({
  open,
  onOpenChange,
  config,
  onSuccess,
}: NdpProxyGlobalModalProps) {
  const [routeRefresh, setRouteRefresh] = useState(
    config.route_refresh !== null ? String(config.route_refresh) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    const trimmed = routeRefresh.trim();
    if (trimmed === "") return null;
    const val = parseInt(trimmed, 10);
    if (isNaN(val) || String(val) !== trimmed) return "Must be a whole number";
    if (val < 10000 || val > 120000) return "Value must be between 10000 and 120000 ms";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await ndpProxyService.setGlobal(config, routeRefresh || null);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Global Settings</DialogTitle>
          <DialogDescription>
            Configure global NDP proxy service settings
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="route-refresh">Route Refresh Interval (ms)</Label>
              <Input
                id="route-refresh"
                placeholder="30000 (default)"
                value={routeRefresh}
                onChange={(e) => {
                  setRouteRefresh(e.target.value);
                  setError(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                How often to refresh IPv6 routes. Leave empty to use the default (30000 ms). Valid range: 10000–120000 ms.
              </p>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
