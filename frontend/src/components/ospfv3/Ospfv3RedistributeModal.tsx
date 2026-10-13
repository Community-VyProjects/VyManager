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
import type { Ospfv3Redistribute, Ospfv3Capabilities } from "@/lib/api/ospfv3";
import { useTranslations } from "next-intl";

interface Ospfv3RedistributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: Ospfv3Redistribute) => Promise<void>;
  capabilities?: Ospfv3Capabilities | null;
  existingProtocols: string[];
  routeMapNames?: string[];
}

export function Ospfv3RedistributeModal({
  open,
  onOpenChange,
  onSubmit,
  capabilities,
  existingProtocols,
  routeMapNames = [],
}: Ospfv3RedistributeModalProps) {
  const t = useTranslations("ospfv3");
  const tc = useTranslations("common");
  const [protocol, setProtocol] = useState("");
  const [metric, setMetric] = useState("");
  const [metricType, setMetricType] = useState("");
  const [routeMap, setRouteMap] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allProtocols = capabilities?.redistribute_protocols || [
    "babel", "bgp", "connected", "isis", "kernel", "ripng", "static",
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
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!protocol) return t("redistributeModal.selectProtocolError");
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
      const entry: Ospfv3Redistribute = {
        protocol,
        metric: metric.trim() || null,
        metric_type: metricType || null,
        route_map: routeMap.trim() || null,
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
            <Label htmlFor="ospfv3-redist-proto">{t("fields.protocol")}</Label>
            <Select value={protocol} onValueChange={setProtocol}>
              <SelectTrigger id="ospfv3-redist-proto">
                <SelectValue placeholder={t("redistributeModal.selectProtocol")} />
              </SelectTrigger>
              <SelectContent>
                {availableProtocols.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ospfv3-redist-metric">{t("fields.metric")}</Label>
              <Input
                id="ospfv3-redist-metric"
                type="number"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder={t("redistributeModal.metricPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ospfv3-redist-metric-type">{t("fields.metricType")}</Label>
              <Select value={metricType} onValueChange={setMetricType}>
                <SelectTrigger id="ospfv3-redist-metric-type">
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
            <Label htmlFor="ospfv3-redist-route-map">{t("fields.routeMap")}</Label>
            <Select
              value={routeMap}
              onValueChange={(v) => setRouteMap(v === "__none__" ? "" : v)}
            >
              <SelectTrigger id="ospfv3-redist-route-map">
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
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
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
