"use client";

import { useState, useRef, KeyboardEvent } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import {
  TelegrafPrometheusClient,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";

interface TelegrafPrometheusClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: TelegrafPrometheusClient | null;
  caps: ServiceMonitoringCapabilities;
  onSuccess: () => void;
}

export function TelegrafPrometheusClientModal({
  open,
  onOpenChange,
  original,
  caps,
  onSuccess,
}: TelegrafPrometheusClientModalProps) {
  const [port, setPort] = useState(original?.port ? String(original.port) : "");
  const [listenAddress, setListenAddress] = useState(original?.listen_address ?? "");
  const [metricVersion, setMetricVersion] = useState(
    original?.metric_version ? String(original.metric_version) : ""
  );
  const [allowFrom, setAllowFrom] = useState<string[]>(original?.allow_from ?? []);
  const [allowInput, setAllowInput] = useState("");
  const [username, setUsername] = useState(original?.authentication?.username ?? "");
  const [password, setPassword] = useState(original?.authentication?.password ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const metricVersionValues = caps.features.telegraf.outputs.prometheus_client.metric_version_values;

  const addAllowFrom = () => {
    const val = allowInput.trim();
    if (!val || allowFrom.includes(val)) return;
    setAllowFrom((prev) => [...prev, val]);
    setAllowInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addAllowFrom(); }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await serviceMonitoringService.saveTelegrafPrometheusClient(original, {
        port: port ? parseInt(port, 10) : null,
        listen_address: listenAddress || null,
        metric_version: metricVersion ? parseInt(metricVersion, 10) : null,
        allow_from: allowFrom,
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
          <DialogTitle>Configure Prometheus Client Output</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="prom-port">Port</Label>
              <Input
                id="prom-port"
                type="number"
                placeholder="9273"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prom-listen">Listen Address</Label>
              <Input
                id="prom-listen"
                placeholder="e.g. 0.0.0.0"
                value={listenAddress}
                onChange={(e) => setListenAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Metric Version</Label>
              <Select value={metricVersion} onValueChange={setMetricVersion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {metricVersionValues.map((v) => (
                    <SelectItem key={v} value={String(v)}>Version {v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Allow From</Label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="e.g. 192.168.0.0/24"
                  value={allowInput}
                  onChange={(e) => setAllowInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" size="sm" variant="outline" onClick={addAllowFrom}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {allowFrom.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {allowFrom.map((a) => (
                    <Badge key={a} variant="secondary" className="font-mono gap-1 pr-1">
                      {a}
                      <button
                        type="button"
                        onClick={() => setAllowFrom((prev) => prev.filter((x) => x !== a))}
                        className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prom-username">Username</Label>
              <Input
                id="prom-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prom-password">Password</Label>
              <Input
                id="prom-password"
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
