"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ethernetService } from "@/lib/api/ethernet";
import type { TransceiverStatus } from "@/lib/api/types/ethernet";

const measurementLabels: Record<string, string> = {
  temperature: "Temperature",
  voltage: "Voltage",
  laser_bias: "Laser bias",
  tx_power: "TX optical power",
  rx_power: "RX optical power",
};

function severity(status?: TransceiverStatus | null) {
  if (!status) return "unknown";
  if (status.alarms.length) return "alarm";
  if (status.warnings.length) return "warning";
  if (!status.present) return "warning";
  return "ok";
}

export function TransceiverDiagnosticsDialog({
  interfaceName,
  open,
  onOpenChange,
}: {
  interfaceName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState<TransceiverStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!interfaceName) return;
    setLoading(true);
    setError(null);
    try {
      setStatus(await ethernetService.getTransceiver(interfaceName));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load diagnostics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !interfaceName) return;
    void ethernetService.getTransceiver(interfaceName).then(setStatus).catch((err) => {
      setError(err instanceof Error ? err.message : "Unable to load diagnostics");
    });
  }, [open, interfaceName]);

  const currentSeverity = severity(status);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-8">
            <div>
              <DialogTitle className="font-mono">{interfaceName} transceiver</DialogTitle>
              <DialogDescription>Live digital optical monitoring diagnostics</DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>
        </DialogHeader>

        {loading && !status ? <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="animate-spin" /> Reading transceiver...</div> : null}
        {error ? <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><XCircle className="size-4" />{error}</div> : null}
        {status ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {currentSeverity === "ok" ? <Badge className="bg-green-600"><CheckCircle2 /> Healthy</Badge> : null}
              {currentSeverity === "warning" ? <Badge className="bg-yellow-600"><AlertTriangle /> Warning</Badge> : null}
              {currentSeverity === "alarm" ? <Badge variant="destructive"><CircleAlert /> Alarm</Badge> : null}
              {!status.present ? <span className="text-sm text-muted-foreground">No transceiver detected</span> : null}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["Type", status.transceiver], ["Vendor", status.vendor], ["Part number", status.part_number], ["Serial number", status.serial_number]].map(([label, value]) => (
                <Card key={label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate font-medium">{value || "-"}</p></CardContent></Card>
              ))}
            </div>
            {Object.keys(status.measurements).length > 0 ? <div><h3 className="mb-2 text-sm font-semibold">Live measurements</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Object.entries(status.measurements).map(([key, measurement]) => <Card key={key}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{measurementLabels[key] || key}</p><p className="mt-1 font-mono font-medium">{measurement.value || "-"}</p></CardContent></Card>)}</div></div> : null}
            {status.alarms.length || status.warnings.length ? <div className="space-y-1 text-sm">{status.alarms.map((item) => <p key={`a-${item}`} className="text-destructive">Alarm: {item}</p>)}{status.warnings.map((item) => <p key={`w-${item}`} className="text-yellow-700 dark:text-yellow-400">Warning: {item}</p>)}</div> : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}