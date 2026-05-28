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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import { TelegrafLoki, serviceMonitoringService } from "@/lib/api/service-monitoring";

interface TelegrafLokiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: TelegrafLoki | null;
  onSuccess: () => void;
}

export function TelegrafLokiModal({ open, onOpenChange, original, onSuccess }: TelegrafLokiModalProps) {
  const [url, setUrl] = useState(original?.url ?? "");
  const [port, setPort] = useState(original?.port ? String(original.port) : "");
  const [metricNameLabel, setMetricNameLabel] = useState(original?.metric_name_label ?? "");
  const [username, setUsername] = useState(original?.authentication?.username ?? "");
  const [password, setPassword] = useState(original?.authentication?.password ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await serviceMonitoringService.saveTelegrafLoki(original, {
        url: url || null,
        port: port ? parseInt(port, 10) : null,
        metric_name_label: metricNameLabel || null,
        authentication: {
          username: username || null,
          password: password || null,
        },
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
          <DialogTitle>Configure Loki Output</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="loki-url">URL</Label>
              <Input
                id="loki-url"
                placeholder="e.g. https://loki.example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loki-port">Port</Label>
              <Input
                id="loki-port"
                type="number"
                placeholder="3100"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loki-label">Metric Name Label</Label>
              <Input
                id="loki-label"
                placeholder="e.g. __name__"
                value={metricNameLabel}
                onChange={(e) => setMetricNameLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loki-username">Username</Label>
              <Input
                id="loki-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loki-password">Password</Label>
              <Input
                id="loki-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
