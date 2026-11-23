"use client";

import { useState } from "react";
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
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2 } from "lucide-react";
import type { RipRedistribute } from "@/lib/api/rip";
import type { ApiError } from "@/lib/types/api";
import { METRIC_RANGE, inRange } from "@/lib/api/rip-ranges";

interface RipRedistributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: RipRedistribute) => Promise<void>;
  existingEntry?: RipRedistribute | null;
  existingProtocols: string[];
  routeMapNames: string[];
  /** Redistribute sources the device offers, from capabilities. */
  protocols: string[];
}

/** Seeded from props on mount; the page remounts it with a new key on every open. */
export function RipRedistributeModal({
  open,
  onOpenChange,
  onSubmit,
  existingEntry,
  existingProtocols,
  routeMapNames,
  protocols,
}: RipRedistributeModalProps) {
  const t = useTranslations("rip");
  const tc = useTranslations("common");
  const isEditMode = !!existingEntry;

  const [protocol, setProtocol] = useState(existingEntry?.protocol ?? "");
  const [metric, setMetric] = useState(existingEntry?.metric != null ? String(existingEntry.metric) : "");
  const [routeMap, setRouteMap] = useState(existingEntry?.route_map ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableProtocols = isEditMode
    ? protocols
    : protocols.filter((p) => !existingProtocols.includes(p));

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  const validate = (): string | null => {
    if (!protocol) return t("validation.selectProtocol");
    if (!inRange(metric, METRIC_RANGE)) return t("validation.metricRange", METRIC_RANGE);
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const entry: RipRedistribute = {
      protocol,
      metric: metric.trim() ? Number(metric.trim()) : null,
      route_map: routeMap || null,
    };

    try {
      setLoading(true);
      setError(null);
      await onSubmit(entry);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("redistModal.editTitle") : t("redistModal.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("redistModal.editDescription", { protocol: existingEntry?.protocol ?? "" })
              : t("redistModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Protocol */}
          <div className="space-y-2">
            <Label htmlFor="rip-redist-protocol">{t("redistribute.protocol")}</Label>
            <Select value={protocol} onValueChange={setProtocol} disabled={isEditMode}>
              <SelectTrigger id="rip-redist-protocol" className={isEditMode ? "bg-muted" : ""}>
                <SelectValue placeholder={t("redistModal.selectProtocol")} />
              </SelectTrigger>
              <SelectContent>
                {availableProtocols.map((p) => (
                  <SelectItem key={p} value={p} className="font-mono">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metric */}
          <div className="space-y-2">
            <Label htmlFor="rip-redist-metric">{t("redistribute.metric")} <span className="text-muted-foreground text-xs">{t("redistModal.metricHint", METRIC_RANGE)}</span></Label>
            <Input
              id="rip-redist-metric"
              type="number"
              min={METRIC_RANGE.min}
              max={METRIC_RANGE.max}
              placeholder={tc("default")}
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            />
          </div>

          {/* Route Map */}
          <div className="space-y-2">
            <Label htmlFor="rip-redist-route-map">{t("redistribute.routeMap")} <span className="text-muted-foreground text-xs">{t("modal.optionalHint")}</span></Label>
            <NamedListSelect id="rip-redist-route-map" value={routeMap} names={routeMapNames} onValueChange={setRouteMap} />
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : t("modal.adding")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              tc("add")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
