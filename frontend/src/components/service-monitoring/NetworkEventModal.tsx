"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
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
import { AlertCircle, Loader2 } from "lucide-react";
import {
  NetworkEventConfig,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";

interface NetworkEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: NetworkEventConfig | null;
  caps: ServiceMonitoringCapabilities;
  onSuccess: () => void;
}

const EVENT_LABELS: Record<string, string> = {
  addr: "Address",
  link: "Link",
  neigh: "Neighbor",
  route: "Route",
  rule: "Policy Rule",
};

export function NetworkEventModal({ open, onOpenChange, original, caps, onSuccess }: NetworkEventModalProps) {
  const [logLevel, setLogLevel] = useState(original?.log_level ?? "");
  const [queueSize, setQueueSize] = useState(original?.queue_size ? String(original.queue_size) : "");
  const [events, setEvents] = useState<string[]>(original?.events ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logLevelValues = caps.features.network_event.log_level_values;
  const eventTypes = caps.features.network_event.event_types;

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await serviceMonitoringService.saveNetworkEvent(original, {
        log_level: logLevel || null,
        queue_size: queueSize ? parseInt(queueSize, 10) : null,
        events,
      });
      onSuccess();
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
          <DialogTitle>
            {original ? "Edit" : "Configure"} Network Event Logging
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label>Log Level</Label>
            <Select value={logLevel} onValueChange={setLogLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {logLevelValues.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ne-queue">Queue Size</Label>
            <Input
              id="ne-queue"
              type="number"
              placeholder="100"
              min={caps.features.network_event.queue_size.min}
              value={queueSize}
              onChange={(e) => setQueueSize(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Minimum {caps.features.network_event.queue_size.min}</p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Event Types</Label>
            <div className="grid grid-cols-2 gap-2">
              {eventTypes.map((event) => (
                <div key={event} className="flex items-center gap-2">
                  <Checkbox
                    id={`event-${event}`}
                    checked={events.includes(event)}
                    onCheckedChange={() => toggleEvent(event)}
                  />
                  <Label htmlFor={`event-${event}`} className="cursor-pointer text-sm">
                    {EVENT_LABELS[event] ?? event}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

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
