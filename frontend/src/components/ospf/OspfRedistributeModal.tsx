"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { OspfRedistribute, OspfCapabilities } from "@/lib/api/ospf";
import { useTranslations } from "next-intl";

interface OspfRedistributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: OspfRedistribute) => Promise<void>;
  capabilities?: OspfCapabilities | null;
  existingProtocols: string[];
  routeMapNames?: string[];
}

export function OspfRedistributeModal({
  open,
  onOpenChange,
  onSubmit,
  capabilities,
  existingProtocols,
  routeMapNames = [],
}: OspfRedistributeModalProps) {
  const t = useTranslations("ospf");
  const tc = useTranslations("common");
  const [protocol, setProtocol] = useState("");
  const [metric, setMetric] = useState("");
  const [metricType, setMetricType] = useState("");
  const [routeMap, setRouteMap] = useState("");
  const [tableId, setTableId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allProtocols = capabilities?.redistribute_protocols || [
    "connected", "static", "bgp", "kernel", "rip", "isis", "babel",
  ];

  const availableProtocols = allProtocols.filter(
    (p) => !existingProtocols.includes(p)
  );

  useEffect(() => {
    if (open) {
      setProtocol("");
      setMetric("");
      setMetricType("");
      setRouteMap("");
      setTableId("");
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!protocol) return t("redistributeModal.selectProtocolError");
    if (protocol === "table" && !tableId.trim()) return t("redistributeModal.tableIdRequired");
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const entry: OspfRedistribute = {
        protocol,
        metric: metric.trim() || null,
        metric_type: metricType || null,
        route_map: routeMap.trim() || null,
        table: protocol === "table" ? tableId.trim() : null,
      };

      await onSubmit(entry);
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tc("operationFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("redistributeModal.title")}</DialogTitle>
          <DialogDescription>
            {t("redistributeModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ospf-redist-proto">{t("fields.protocol")}</Label>
            <Select value={protocol} onValueChange={setProtocol}>
              <SelectTrigger id="ospf-redist-proto">
                <SelectValue placeholder={t("redistributeModal.selectProtocol")} />
              </SelectTrigger>
              <SelectContent>
                {availableProtocols.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
                {!existingProtocols.includes("table") && (
                  <SelectItem value="table">table</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {protocol === "table" && (
            <div className="space-y-2">
              <Label htmlFor="ospf-redist-table">{t("fields.tableId")}</Label>
              <Input
                id="ospf-redist-table"
                type="number"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                placeholder={t("redistributeModal.tableIdPlaceholder")}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ospf-redist-metric">{t("fields.metric")}</Label>
              <Input
                id="ospf-redist-metric"
                type="number"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder={t("redistributeModal.metricPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ospf-redist-metric-type">{t("fields.metricType")}</Label>
              <Select value={metricType} onValueChange={setMetricType}>
                <SelectTrigger id="ospf-redist-metric-type">
                  <SelectValue placeholder={tc("default")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("fields.type1")}</SelectItem>
                  <SelectItem value="2">{t("fields.type2")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ospf-redist-route-map">{t("fields.routeMap")}</Label>
            <Select
              value={routeMap}
              onValueChange={(v) => setRouteMap(v === "__none__" ? "" : v)}
            >
              <SelectTrigger id="ospf-redist-route-map">
                <SelectValue placeholder={tc("none")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{tc("none")}</SelectItem>
                {routeMapNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("fields.adding")}
              </>
            ) : (
              t("fields.addRedistribute")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
