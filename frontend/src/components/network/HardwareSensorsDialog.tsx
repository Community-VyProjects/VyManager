"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Loader2, RefreshCw, Thermometer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { showService, type HardwareSensorsResponse } from "@/lib/api/show";

export function HardwareSensorsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [data, setData] = useState<HardwareSensorsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try { setData(await showService.getHardwareSensors()); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load hardware sensors"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!open) return;
    void showService.getHardwareSensors().then(setData).catch((err) => {
      setError(err instanceof Error ? err.message : "Unable to load hardware sensors");
    });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-8">
            <div>
              <DialogTitle>Hardware health</DialogTitle>
              <DialogDescription>CPU, network-card, and system temperature sensors</DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button>
          </div>
        </DialogHeader>
        {loading && !data ? <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="animate-spin" /> Reading sensors...</div> : null}
        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        {data && !data.sensors.length && !error ? <p className="py-8 text-sm text-muted-foreground">No hardware sensors were reported by VyOS.</p> : null}
        {data?.sensors.length ? <div className="grid gap-3 sm:grid-cols-2">{data.sensors.map((sensor) => <Card key={`${sensor.name}-${sensor.value}`}><CardContent className="flex items-start justify-between gap-3 p-4"><div className="flex min-w-0 items-start gap-3"><Thermometer className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="truncate font-medium">{sensor.name}</p><p className="font-mono text-lg">{sensor.value}</p>{sensor.high || sensor.critical ? <p className="text-xs text-muted-foreground">{sensor.high ? `High ${sensor.high}` : ""}{sensor.high && sensor.critical ? " | " : ""}{sensor.critical ? `Critical ${sensor.critical}` : ""}</p> : null}</div></div>{sensor.status === "critical" ? <Badge variant="destructive"><CircleAlert /> Critical</Badge> : sensor.status === "warning" ? <Badge className="bg-yellow-600"><AlertTriangle /> Warning</Badge> : <Badge variant="outline" className="border-green-500/30 text-green-700 dark:text-green-400"><CheckCircle2 /> OK</Badge>}</CardContent></Card>)}</div> : null}
      </DialogContent>
    </Dialog>
  );
}