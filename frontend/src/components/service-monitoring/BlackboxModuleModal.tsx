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
    if (!name.trim()) return "Module name is required";
    if (!isEdit && existingNames.includes(name.trim())) return "A module with this name already exists";
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
            query_name: queryName || null,
            query_type: queryType || null,
          }
        );
      }
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
          <DialogTitle>
            {isEdit ? "Edit" : "Add"} {moduleType.toUpperCase()} Module
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="mod-name">Module Name</Label>
            <Input
              id="mod-name"
              placeholder="e.g. ping-ipv4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={isEdit}
              className={isEdit ? "bg-muted" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred IP Protocol</Label>
            <Select value={preferredIpProtocol} onValueChange={setPreferredIpProtocol}>
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
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
              Allow IP protocol fallback
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mod-timeout">Timeout (seconds)</Label>
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
                <Label htmlFor="dns-query">Query Name (FQDN)</Label>
                <Input
                  id="dns-query"
                  placeholder="e.g. example.com"
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Query Type</Label>
                <Select value={queryType} onValueChange={setQueryType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    {dnsQueryTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
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
