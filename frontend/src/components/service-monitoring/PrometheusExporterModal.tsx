"use client";

import { useState, useRef, KeyboardEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import {
  PrometheusNodeExporter,
  PrometheusExporterBase,
  PrometheusBlackboxExporter,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";

type ExporterType = "node" | "frr" | "blackbox";

interface PrometheusExporterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ExporterType;
  original: PrometheusNodeExporter | PrometheusExporterBase | PrometheusBlackboxExporter | null;
  caps: ServiceMonitoringCapabilities;
  onSuccess: () => void;
}

const TITLES: Record<ExporterType, string> = {
  node: "Node Exporter",
  frr: "FRR Exporter",
  blackbox: "Blackbox Exporter",
};

export function PrometheusExporterModal({
  open,
  onOpenChange,
  type,
  original,
  caps,
  onSuccess,
}: PrometheusExporterModalProps) {
  const [port, setPort] = useState(original?.port ? String(original.port) : "");
  const [vrf, setVrf] = useState(original?.vrf ?? "");
  const [listenAddresses, setListenAddresses] = useState<string[]>(
    original?.listen_addresses ?? []
  );
  const [listenInput, setListenInput] = useState("");
  const [textfileCollector, setTextfileCollector] = useState(
    type === "node" ? ((original as PrometheusNodeExporter)?.textfile_collector ?? false) : false
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addListenAddress = () => {
    const val = listenInput.trim();
    if (!val || listenAddresses.includes(val)) return;
    setListenAddresses((prev) => [...prev, val]);
    setListenInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addListenAddress(); }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const base = {
        port: port ? parseInt(port, 10) : null,
        listen_addresses: listenAddresses,
        vrf: vrf || null,
      };

      if (type === "node") {
        await serviceMonitoringService.savePrometheusNodeExporter(
          original as PrometheusNodeExporter | null,
          { ...base, textfile_collector: textfileCollector }
        );
      } else if (type === "frr") {
        await serviceMonitoringService.savePrometheusFrrExporter(original, base);
      } else {
        await serviceMonitoringService.savePrometheusBlackboxExporter(
          original as PrometheusBlackboxExporter | null,
          { ...base, icmp_modules: [], dns_modules: [] }
        );
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const defaultPort = type === "node"
    ? caps.features.prometheus.exporters.node_exporter.default_port
    : type === "frr"
    ? caps.features.prometheus.exporters.frr_exporter.default_port
    : caps.features.prometheus.exporters.blackbox_exporter.default_port;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{original ? "Edit" : "Configure"} {TITLES[type]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="exp-port">Port</Label>
            <Input
              id="exp-port"
              type="number"
              placeholder={String(defaultPort)}
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Listen Addresses</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="e.g. 0.0.0.0"
                value={listenInput}
                onChange={(e) => setListenInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button type="button" size="sm" variant="outline" onClick={addListenAddress}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {listenAddresses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {listenAddresses.map((a) => (
                  <Badge key={a} variant="secondary" className="font-mono gap-1 pr-1">
                    {a}
                    <button
                      type="button"
                      onClick={() => setListenAddresses((prev) => prev.filter((x) => x !== a))}
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
            <Label htmlFor="exp-vrf">VRF</Label>
            <VrfSelect
              id="exp-vrf"
              value={vrf}
              onValueChange={setVrf}
              extraOptions={[{ label: "Default", value: "default" }]}
            />
          </div>

          {type === "node" && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="textfile"
                checked={textfileCollector}
                onCheckedChange={(c) => setTextfileCollector(!!c)}
              />
              <Label htmlFor="textfile" className="cursor-pointer">
                Enable textfile collector
              </Label>
            </div>
          )}
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
