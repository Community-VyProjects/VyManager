"use client";

import { useState, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import {
  PrometheusNodeExporter,
  PrometheusExporterBase,
  PrometheusFrrExporter,
  PrometheusBlackboxExporter,
  ServiceMonitoringCapabilities,
  TelegrafConfig,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";
import type { ApiError } from "@/lib/types/api";
import {
  NONE_SENTINEL,
  fromNamedListValue,
  toNamedListValue,
} from "@/lib/named-list-select-options";

type ExporterType = "node" | "frr" | "blackbox";

interface PrometheusExporterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ExporterType;
  original: PrometheusNodeExporter | PrometheusFrrExporter | PrometheusBlackboxExporter | null;
  /** Telegraf, whose `frr-metrics` relay must run in the frr-exporter's VRF. */
  telegraf?: TelegrafConfig | null;
  caps: ServiceMonitoringCapabilities;
  onSuccess: () => void;
}

const TITLES: Record<ExporterType, string> = {
  node: "Node Exporter",
  frr: "FRR Exporter",
  blackbox: "Blackbox Exporter",
};

// val_help of collector ospf-instance: u32:1-65535.
const OSPF_INSTANCE_MIN = 1;
const OSPF_INSTANCE_MAX = 65535;

export function PrometheusExporterModal({
  open,
  onOpenChange,
  type,
  original,
  telegraf,
  caps,
  onSuccess,
}: PrometheusExporterModalProps) {
  const t = useTranslations("serviceMonitoring");
  const tc = useTranslations("common");
  const frrOriginal = type === "frr" ? (original as PrometheusFrrExporter | null) : null;
  const [port, setPort] = useState(original?.port ? String(original.port) : "");
  const [vrf, setVrf] = useState(original?.vrf ?? "");
  const [listenAddresses, setListenAddresses] = useState<string[]>(
    original?.listen_addresses ?? []
  );
  const [listenInput, setListenInput] = useState("");
  const [textfileCollector, setTextfileCollector] = useState(
    type === "node" ? ((original as PrometheusNodeExporter)?.textfile_collector ?? false) : false
  );
  const [collectors, setCollectors] = useState<string[]>(frrOriginal?.collectors ?? []);
  const [bgpOptions, setBgpOptions] = useState<string[]>(frrOriginal?.bgp_options ?? []);
  const [peerDescription, setPeerDescription] = useState(frrOriginal?.bgp_peer_description ?? "");
  const [ospfInstances, setOspfInstances] = useState<string[]>(frrOriginal?.ospf_instances ?? []);
  const [ospfInput, setOspfInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frrCaps = caps.features.prometheus.exporters.frr_exporter;

  const addListenAddress = () => {
    const val = listenInput.trim();
    if (!val || listenAddresses.includes(val)) return;
    setListenAddresses((prev) => [...prev, val]);
    setListenInput("");
  };

  const addOspfInstance = () => {
    const val = ospfInput.trim();
    if (!val) return;
    const id = Number(val);
    if (!/^\d+$/.test(val) || id < OSPF_INSTANCE_MIN || id > OSPF_INSTANCE_MAX) {
      setError(t("exporter.ospfInstanceRange", { min: OSPF_INSTANCE_MIN, max: OSPF_INSTANCE_MAX }));
      return;
    }
    setError(null);
    const normalized = String(id);
    if (!ospfInstances.includes(normalized)) setOspfInstances((prev) => [...prev, normalized]);
    setOspfInput("");
  };

  const toggle = (setter: (fn: (prev: string[]) => string[]) => void, value: string) => {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addListenAddress(); }
  };

  const handleSubmit = async () => {
    // Verify refuses an frr-exporter VRF that differs from Telegraf's while frr-metrics relays it.
    if (type === "frr" && telegraf?.frr_metrics && (telegraf.vrf ?? "") !== vrf) {
      setError(t("telegraf.frrMetricsVrfMismatch"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const base: PrometheusExporterBase = {
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
        await serviceMonitoringService.savePrometheusFrrExporter(frrOriginal, {
          ...base,
          collectors,
          bgp_options: bgpOptions,
          bgp_peer_description: peerDescription || null,
          ospf_instances: ospfInstances,
        });
      } else {
        await serviceMonitoringService.savePrometheusBlackboxExporter(
          original as PrometheusBlackboxExporter | null,
          { ...base, icmp_modules: [], dns_modules: [] }
        );
      }
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const defaultPort = type === "node"
    ? caps.features.prometheus.exporters.node_exporter.default_port
    : type === "frr"
    ? frrCaps.default_port
    : caps.features.prometheus.exporters.blackbox_exporter.default_port;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{original ? t("common.editTitle", { name: TITLES[type] }) : t("common.configureTitle", { name: TITLES[type] })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="exp-port">{t("common.port")}</Label>
            <Input
              id="exp-port"
              type="number"
              placeholder={String(defaultPort)}
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("common.listenAddresses")}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t("exporter.listenPlaceholder")}
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
              extraOptions={[{ label: tc("default"), value: "default" }]}
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
                {t("exporter.enableTextfileCollector")}
              </Label>
            </div>
          )}

          {type === "frr" && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("exporter.collectors")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {frrCaps.collectors.map((c) => (
                    <div key={c} className="flex items-center gap-2">
                      <Checkbox
                        id={`collector-${c}`}
                        checked={collectors.includes(c)}
                        onCheckedChange={() => toggle(setCollectors, c)}
                      />
                      <Label htmlFor={`collector-${c}`} className="cursor-pointer text-sm font-mono">{c}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("exporter.bgpOptions")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {frrCaps.bgp_options.map((o) => (
                    <div key={o} className="flex items-center gap-2">
                      <Checkbox
                        id={`bgp-${o}`}
                        checked={bgpOptions.includes(o)}
                        onCheckedChange={() => toggle(setBgpOptions, o)}
                      />
                      <Label htmlFor={`bgp-${o}`} className="cursor-pointer text-sm font-mono">{o}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("exporter.peerDescription")}</Label>
                <Select
                  value={toNamedListValue(peerDescription)}
                  onValueChange={(v) => setPeerDescription(fromNamedListValue(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                    {frrCaps.peer_description_values.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("exporter.ospfInstances")}</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={OSPF_INSTANCE_MIN}
                    max={OSPF_INSTANCE_MAX}
                    value={ospfInput}
                    onChange={(e) => setOspfInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOspfInstance(); } }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addOspfInstance}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {ospfInstances.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ospfInstances.map((i) => (
                      <Badge key={i} variant="secondary" className="font-mono gap-1 pr-1">
                        {i}
                        <button
                          type="button"
                          onClick={() => setOspfInstances((prev) => prev.filter((x) => x !== i))}
                          className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
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
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
