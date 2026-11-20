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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { OspfRedistribute, OspfCapabilities } from "@/lib/api/ospf";
import type { ApiError } from "@/lib/types/api";
import { useTranslations } from "next-intl";

const NONE = "__none__";

interface OspfRedistributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: OspfRedistribute) => Promise<void>;
  capabilities?: OspfCapabilities | null;
  existingProtocols: string[];
  existingEntry?: OspfRedistribute | null;
  routeMapNames?: string[];
}

export function OspfRedistributeModal({
  open,
  onOpenChange,
  onSubmit,
  capabilities,
  existingProtocols,
  existingEntry,
  routeMapNames = [],
}: OspfRedistributeModalProps) {
  const t = useTranslations("ospf");
  const tc = useTranslations("common");
  const isEditMode = !!existingEntry;
  const [protocol, setProtocol] = useState("");
  const [metric, setMetric] = useState("");
  const [metricType, setMetricType] = useState("");
  const [routeMap, setRouteMap] = useState("");
  const [tableId, setTableId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allProtocols = capabilities?.features?.redistribute?.protocols || [];
  const metricTypes = capabilities?.features?.redistribute?.metric_types || [];
  const availableProtocols = allProtocols.filter((p) => !existingProtocols.includes(p));

  useEffect(() => {
    if (!open) return;
    setProtocol(existingEntry?.protocol ?? "");
    setMetric(existingEntry?.metric ?? "");
    setMetricType(existingEntry?.metric_type ?? "");
    setRouteMap(existingEntry?.route_map ?? "");
    setTableId(existingEntry?.table ?? "");
    setError(null);
  }, [open, existingEntry]);

  const handleClose = () => onOpenChange(false);

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
      await onSubmit({
        protocol,
        metric: metric.trim() || null,
        metric_type: metricType || null,
        route_map: routeMap || null,
        table: protocol === "table" ? tableId.trim() : null,
      });
      handleClose();
    } catch (err: unknown) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t("redistributeModal.titleEdit") : t("redistributeModal.title")}</DialogTitle>
          <DialogDescription>
            {t("redistributeModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ospf-redist-proto">{t("fields.protocol")}</Label>
            <Select value={protocol} onValueChange={setProtocol} disabled={isEditMode}>
              <SelectTrigger id="ospf-redist-proto">
                <SelectValue placeholder={t("redistributeModal.selectProtocol")} />
              </SelectTrigger>
              <SelectContent>
                {isEditMode && protocol !== "table" && (
                  <SelectItem value={protocol}>{protocol}</SelectItem>
                )}
                {!isEditMode && availableProtocols.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
                <SelectItem value="table">{tc("shown.table")}</SelectItem>
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
                disabled={isEditMode}
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
              <Select value={metricType || NONE} onValueChange={(v) => setMetricType(v === NONE ? "" : v)}>
                <SelectTrigger id="ospf-redist-metric-type">
                  <SelectValue placeholder={tc("default")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{tc("default")}</SelectItem>
                  {metricTypes.map((mt) => (
                    <SelectItem key={mt} value={mt}>{t("values.type", { type: mt })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ospf-redist-route-map">{t("fields.routeMap")}</Label>
            <NamedListSelect id="ospf-redist-route-map" value={routeMap} names={routeMapNames} onValueChange={setRouteMap} />
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
