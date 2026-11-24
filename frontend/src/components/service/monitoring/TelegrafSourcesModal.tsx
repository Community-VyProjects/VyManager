"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import {
  PrometheusFrrExporter,
  TelegrafConfig,
  TelegrafGlobalTag,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";
import type { ApiError } from "@/lib/types/api";

interface TelegrafSourcesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TelegrafConfig | null;
  /** The configured frr-exporter, which `frr-metrics` relays (same VRF required). */
  frrExporter: PrometheusFrrExporter | null;
  caps: ServiceMonitoringCapabilities;
  onSuccess: () => void;
}

const SOURCE_LABELS: Record<string, "telegraf.sources.all" | "telegraf.sources.hardwareUtilization" | "telegraf.sources.logs" | "telegraf.sources.network" | "telegraf.sources.system" | "telegraf.sources.telegraf"> = {
  all: "telegraf.sources.all",
  "hardware-utilization": "telegraf.sources.hardwareUtilization",
  logs: "telegraf.sources.logs",
  network: "telegraf.sources.network",
  system: "telegraf.sources.system",
  telegraf: "telegraf.sources.telegraf",
};

// The lab's global-tag name regex.
const TAG_NAME = /^[-_a-zA-Z0-9]+$/;

export function TelegrafSourcesModal({
  open,
  onOpenChange,
  config,
  frrExporter,
  caps,
  onSuccess,
}: TelegrafSourcesModalProps) {
  const t = useTranslations("serviceMonitoring");
  const tc = useTranslations("common");
  const [sources, setSources] = useState<string[]>(config?.sources ?? []);
  const [vrf, setVrf] = useState(config?.vrf ?? "");
  const [frrMetrics, setFrrMetrics] = useState(config?.frr_metrics ?? false);
  const [globalTags, setGlobalTags] = useState<TelegrafGlobalTag[]>(
    (config?.global_tags ?? []).map((g) => ({ name: g.name, value: g.value ?? "" }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSource = (source: string) => {
    setSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const updateTag = (index: number, patch: Partial<TelegrafGlobalTag>) => {
    setGlobalTags((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  };

  /** Trimmed tags, a blank row dropped; the check and the save read the same list. */
  const normalizedTags = () =>
    globalTags
      .map((g) => ({ name: g.name.trim(), value: (g.value ?? "").trim() }))
      .filter((g) => g.name || g.value);

  const validate = (tags: TelegrafGlobalTag[]): string | null => {
    const seen = new Set<string>();
    for (const tag of tags) {
      if (!tag.name) return t("telegraf.globalTags.nameRequired");
      if (!TAG_NAME.test(tag.name)) return t("telegraf.globalTags.nameInvalid", { name: tag.name });
      if (seen.has(tag.name)) return t("telegraf.globalTags.nameDuplicate", { name: tag.name });
      if (!tag.value) return t("telegraf.globalTags.valueRequired", { name: tag.name });
      seen.add(tag.name);
    }
    // Verify refuses frr-metrics without an frr-exporter in the same VRF.
    if (frrMetrics && !frrExporter) return t("telegraf.frrMetricsNeedsExporter");
    if (frrMetrics && (frrExporter?.vrf ?? "") !== vrf) return t("telegraf.frrMetricsVrfMismatch");
    return null;
  };

  const handleSubmit = async () => {
    const tags = normalizedTags();
    const problem = validate(tags);
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await serviceMonitoringService.saveTelegrafSources(config, {
        sources,
        vrf,
        frr_metrics: frrMetrics,
        global_tags: tags,
      });
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const sourceValues = caps.features.telegraf.source_values;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("telegraf.generalSettingsTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("telegraf.sourcesLabel")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {sourceValues.map((source) => (
                <div key={source} className="flex items-center gap-2">
                  <Checkbox
                    id={`source-${source}`}
                    checked={sources.includes(source)}
                    onCheckedChange={() => toggleSource(source)}
                  />
                  <Label htmlFor={`source-${source}`} className="cursor-pointer text-sm">
                    {SOURCE_LABELS[source] ? t(SOURCE_LABELS[source]) : source}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegraf-vrf">VRF</Label>
            <VrfSelect
              id="telegraf-vrf"
              value={vrf}
              onValueChange={setVrf}
              extraOptions={[{ label: tc("default"), value: "default" }]}
            />
          </div>

          {caps.features.telegraf.frr_metrics.supported && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="telegraf-frr-metrics"
                checked={frrMetrics}
                onCheckedChange={(c) => setFrrMetrics(!!c)}
              />
              <Label htmlFor="telegraf-frr-metrics" className="cursor-pointer text-sm">
                {t("telegraf.frrMetrics")}
              </Label>
            </div>
          )}

          {caps.features.telegraf.global_tag.supported && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t("telegraf.globalTags.title")}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setGlobalTags((prev) => [...prev, { name: "", value: "" }])}
                >
                  <Plus className="h-3 w-3 mr-1" />{tc("add")}
                </Button>
              </div>
              {globalTags.map((tag, index) => (
                // Index key: typing in the name must not remount the row.
                <div key={index} className="flex items-center gap-2">
                  <Input
                    aria-label={tc("name")}
                    placeholder={tc("name")}
                    value={tag.name}
                    onChange={(e) => updateTag(index, { name: e.target.value })}
                  />
                  <Input
                    aria-label={t("telegraf.globalTags.value")}
                    placeholder={t("telegraf.globalTags.value")}
                    value={tag.value ?? ""}
                    onChange={(e) => updateTag(index, { value: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => setGlobalTags((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
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
