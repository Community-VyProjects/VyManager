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
  PrometheusBlackboxICMPModule,
  PrometheusBlackboxDNSModule,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";
import type { ApiError } from "@/lib/types/api";
import {
  NONE_SENTINEL,
  fromNamedListValue,
  toNamedListValue,
} from "@/lib/named-list-select-options";

interface BlackboxModuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleType: "icmp" | "dns";
  original: PrometheusBlackboxICMPModule | PrometheusBlackboxDNSModule | null;
  existingNames: string[];
  caps: ServiceMonitoringCapabilities;
  onSuccess: () => void;
}

export function BlackboxModuleModal({
  open,
  onOpenChange,
  moduleType,
  original,
  existingNames,
  caps,
  onSuccess,
}: BlackboxModuleModalProps) {
  const t = useTranslations("serviceMonitoring");
  const tc = useTranslations("common");
  const isEdit = !!original;
  const [name, setName] = useState(original?.name ?? "");
  const [preferredIpProtocol, setPreferredIpProtocol] = useState(
    original?.preferred_ip_protocol ?? ""
  );
  const [ipProtocolFallback, setIpProtocolFallback] = useState(
    original?.ip_protocol_fallback ?? false
  );
  const [timeout, setTimeout] = useState(
    original?.timeout ? String(original.timeout) : ""
  );

  const [queryName, setQueryName] = useState(
    moduleType === "dns" ? ((original as PrometheusBlackboxDNSModule)?.query_name ?? "") : ""
  );
  const [queryType, setQueryType] = useState(
    moduleType === "dns" ? ((original as PrometheusBlackboxDNSModule)?.query_type ?? "") : ""
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ipProtocolValues = caps.features.prometheus.exporters.blackbox_exporter.preferred_ip_protocol_values;
  const dnsQueryTypes = caps.features.prometheus.exporters.blackbox_exporter.dns_query_types;

  const validateName = () => {
    if (!name.trim()) return t("blackbox.nameRequired");
    // The batch splits multi-argument values on commas, so a name cannot hold one.
    if (name.includes(",")) return t("blackbox.nameComma");
    if (!isEdit && existingNames.includes(name.trim())) return t("blackbox.nameExists");
    // The lab's verify requires a query name on every DNS module.
    if (moduleType === "dns" && !queryName.trim()) {
      return t("common.fieldRequired", { field: t("blackbox.queryNameFqdn") });
    }
    return null;
  };

  const handleSubmit = async () => {
    const nameErr = validateName();
    if (nameErr) { setError(nameErr); return; }

    setSubmitting(true);
    setError(null);
    try {
      const base = {
        name: name.trim(),
        preferred_ip_protocol: preferredIpProtocol || null,
        ip_protocol_fallback: ipProtocolFallback,
        timeout: timeout ? parseInt(timeout, 10) : null,
      };

      if (moduleType === "icmp") {
        await serviceMonitoringService.saveBlackboxICMPModule(
          original as PrometheusBlackboxICMPModule | null,
          base
        );
      } else {
        await serviceMonitoringService.saveBlackboxDNSModule(
          original as PrometheusBlackboxDNSModule | null,
          {
            ...base,
            query_name: queryName.trim(),
            query_type: queryType || null,
          }
        );
      }
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("blackbox.editTitle", { type: moduleType.toUpperCase() }) : t("blackbox.addTitle", { type: moduleType.toUpperCase() })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="mod-name">{t("blackbox.moduleName")}</Label>
            <Input
              id="mod-name"
              placeholder={t("blackbox.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={isEdit}
              className={isEdit ? "bg-muted" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("blackbox.preferredIpProtocol")}</Label>
            <Select
              value={toNamedListValue(preferredIpProtocol)}
              onValueChange={(v) => setPreferredIpProtocol(fromNamedListValue(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                {ipProtocolValues.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="fallback"
              checked={ipProtocolFallback}
              onCheckedChange={(c) => setIpProtocolFallback(!!c)}
            />
            <Label htmlFor="fallback" className="cursor-pointer">
              {t("blackbox.ipProtocolFallback")}
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mod-timeout">{t("blackbox.timeoutSeconds")}</Label>
            <Input
              id="mod-timeout"
              type="number"
              placeholder="5"
              min={1}
              max={60}
              value={timeout}
              onChange={(e) => setTimeout(e.target.value)}
            />
          </div>

          {moduleType === "dns" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="dns-query">{t("blackbox.queryNameFqdn")}</Label>
                <Input
                  id="dns-query"
                  placeholder={t("blackbox.queryNamePlaceholder")}
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("blackbox.queryType")}</Label>
                <Select
                  value={toNamedListValue(queryType)}
                  onValueChange={(v) => setQueryType(fromNamedListValue(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                    {dnsQueryTypes.map((qt) => (
                      <SelectItem key={qt} value={qt}>{qt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
