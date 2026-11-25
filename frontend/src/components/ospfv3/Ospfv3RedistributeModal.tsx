"use client";

import { NONE_SENTINEL } from "@/lib/named-list-select-options";
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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Ospfv3Redistribute, Ospfv3Capabilities } from "@/lib/api/ospfv3";
import { ospfv3ProblemArgs, ospfv3Range, ospfv3RedistributeProblem } from "@/lib/api/ospfv3-save-ops";
import type { ApiError } from "@/lib/types/api";
import { useTranslations } from "next-intl";

interface Ospfv3RedistributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: Ospfv3Redistribute) => Promise<void>;
  capabilities?: Ospfv3Capabilities | null;
  existingProtocols: string[];
  existingEntry?: Ospfv3Redistribute | null;
  routeMapNames?: string[];
}

export function Ospfv3RedistributeModal({
  open,
  onOpenChange,
  onSubmit,
  capabilities,
  existingProtocols,
  existingEntry,
  routeMapNames = [],
}: Ospfv3RedistributeModalProps) {
  const t = useTranslations("ospfv3");
  const tc = useTranslations("common");
  const isEditMode = !!existingEntry;
  const [protocol, setProtocol] = useState("");
  const [metric, setMetric] = useState("");
  const [metricType, setMetricType] = useState("");
  const [routeMap, setRouteMap] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allProtocols = capabilities?.features?.redistribute?.protocols || [];
  const metricTypes = capabilities?.features?.redistribute?.metric_types || [];
  const availableProtocols = allProtocols.filter((p) => !existingProtocols.includes(p));
  const metricRange = ospfv3Range(capabilities, "metric");

  useEffect(() => {
    if (!open) return;
    setProtocol(existingEntry?.protocol ?? "");
    setMetric(existingEntry?.metric ?? "");
    setMetricType(existingEntry?.metric_type ?? "");
    setRouteMap(existingEntry?.route_map ?? "");
    setError(null);
  }, [open, existingEntry]);

  const handleClose = () => onOpenChange(false);

  const handleOpenChange = (next: boolean) => {
    if (!next && !loading) handleClose();
  };

  const handleSubmit = async () => {
    const entry: Ospfv3Redistribute = {
      protocol,
      metric: metric.trim() || null,
      metric_type: metricType || null,
      route_map: routeMap || null,
    };
    const problem = ospfv3RedistributeProblem(entry, capabilities);
    if (problem) {
      setError(t(`validation.${problem.key}`, ospfv3ProblemArgs(problem)));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(entry);
      handleClose();
    } catch (err: unknown) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t("redistributeModal.titleEdit") : t("redistributeModal.title")}</DialogTitle>
          <DialogDescription>
            {t("redistributeModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ospfv3-redist-proto">{t("fields.protocol")}</Label>
            <Select value={protocol} onValueChange={setProtocol} disabled={isEditMode}>
              <SelectTrigger id="ospfv3-redist-proto">
                <SelectValue placeholder={t("redistributeModal.selectProtocol")} />
              </SelectTrigger>
              <SelectContent>
                {isEditMode && protocol && <SelectItem value={protocol}>{protocol}</SelectItem>}
                {!isEditMode && availableProtocols.map((p) => (
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
                min={metricRange?.min}
                max={metricRange?.max}
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder={t("redistributeModal.metricPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ospfv3-redist-metric-type">{t("fields.metricType")}</Label>
              <Select value={metricType || NONE_SENTINEL} onValueChange={(v) => setMetricType(v === NONE_SENTINEL ? "" : v)}>
                <SelectTrigger id="ospfv3-redist-metric-type">
                  <SelectValue placeholder={tc("default")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                  {metricTypes.map((mt) => (
                    <SelectItem key={mt} value={mt}>{t("values.type", { type: mt })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ospfv3-redist-route-map">{t("fields.routeMap")}</Label>
            <NamedListSelect
              id="ospfv3-redist-route-map"
              value={routeMap}
              names={routeMapNames}
              onValueChange={setRouteMap}
            />
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
                {isEditMode ? tc("saving") : t("fields.adding")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              t("fields.addRedistribute")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
