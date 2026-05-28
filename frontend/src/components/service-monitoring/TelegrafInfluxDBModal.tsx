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
import {
  TelegrafInfluxDB,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";

interface TelegrafInfluxDBModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: TelegrafInfluxDB | null;
  onSuccess: () => void;
}

export function TelegrafInfluxDBModal({
  open,
  onOpenChange,
  original,
  onSuccess,
}: TelegrafInfluxDBModalProps) {
  const [url, setUrl] = useState(original?.url ?? "");
  const [port, setPort] = useState(original?.port ? String(original.port) : "");
  const [bucket, setBucket] = useState(original?.bucket ?? "");
  const [token, setToken] = useState(original?.authentication?.token ?? "");
  const [organization, setOrganization] = useState(original?.authentication?.organization ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await serviceMonitoringService.saveTelegrafInfluxDB(original, {
        url: url || null,
        port: port ? parseInt(port, 10) : null,
        bucket: bucket || null,
        authentication: {
          token: token || null,
          organization: organization || null,
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
          <DialogTitle>Configure InfluxDB Output</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="influxdb-url">URL</Label>
              <Input
                id="influxdb-url"
                placeholder="e.g. https://influxdb.example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="influxdb-port">Port</Label>
              <Input
                id="influxdb-port"
                type="number"
                placeholder="8086"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="influxdb-bucket">Bucket</Label>
              <Input
                id="influxdb-bucket"
                placeholder="e.g. vyos"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="influxdb-token">Token</Label>
              <Input
                id="influxdb-token"
                type="password"
                placeholder="API token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="influxdb-org">Organization</Label>
              <Input
                id="influxdb-org"
                placeholder="e.g. my-org"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
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
