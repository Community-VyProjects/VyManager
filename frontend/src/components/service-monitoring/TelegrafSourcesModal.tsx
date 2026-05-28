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
import { AlertCircle, Loader2 } from "lucide-react";
import {
  TelegrafConfig,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";

interface TelegrafSourcesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TelegrafConfig | null;
  caps: ServiceMonitoringCapabilities;
  onSuccess: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  all: "All",
  "hardware-utilization": "Hardware Utilization",
  logs: "Logs",
  network: "Network",
  system: "System",
  telegraf: "Telegraf",
};

export function TelegrafSourcesModal({
  open,
  onOpenChange,
  config,
  caps,
  onSuccess,
}: TelegrafSourcesModalProps) {
  const [sources, setSources] = useState<string[]>(config?.sources ?? []);
  const [vrf, setVrf] = useState(config?.vrf ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSource = (source: string) => {
    setSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await serviceMonitoringService.saveTelegrafSources(config, sources, vrf);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const sourceValues = caps.features.telegraf.source_values;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Telegraf General Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Sources</Label>
            <div className="grid grid-cols-2 gap-2">
              {sourceValues.map((source) => (
                <div key={source} className="flex items-center gap-2">
                  <Checkbox
                    id={`source-${source}`}
                    checked={sources.includes(source)}
                    onCheckedChange={() => toggleSource(source)}
                  />
                  <Label htmlFor={`source-${source}`} className="cursor-pointer text-sm">
                    {SOURCE_LABELS[source] ?? source}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegraf-vrf">VRF</Label>
            <Input
              id="telegraf-vrf"
              placeholder="e.g. mgmt"
              value={vrf}
              onChange={(e) => setVrf(e.target.value)}
            />
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
