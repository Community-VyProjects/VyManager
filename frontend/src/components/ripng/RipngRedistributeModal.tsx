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
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2 } from "lucide-react";
import type { RipNgRedistribute } from "@/lib/api/ripng";

const DEFAULT_PROTOCOLS = ["babel", "bgp", "connected", "kernel", "ospfv3", "static"];

interface RipngRedistributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: RipNgRedistribute) => Promise<void>;
  existingEntry?: RipNgRedistribute | null;
  existingProtocols: string[];
  routeMapNames: string[];
  protocols?: string[];
}

export function RipngRedistributeModal({
  open,
  onOpenChange,
  onSubmit,
  existingEntry,
  existingProtocols,
  routeMapNames,
  protocols = DEFAULT_PROTOCOLS,
}: RipngRedistributeModalProps) {
  const t = useTranslations("ripng");
  const tc = useTranslations("common");
  const isEditMode = !!existingEntry;

  const [protocol, setProtocol] = useState("");
  const [metric, setMetric] = useState("");
  const [routeMap, setRouteMap] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableProtocols = isEditMode
    ? protocols
    : protocols.filter((p) => !existingProtocols.includes(p));

  useEffect(() => {
    if (!open) return;
    if (existingEntry) {
      setProtocol(existingEntry.protocol);
      setMetric(existingEntry.metric != null ? String(existingEntry.metric) : "");
      setRouteMap(existingEntry.route_map || "");
    } else {
      setProtocol("");
      setMetric("");
      setRouteMap("");
      setError(null);
    }
  }, [open, existingEntry]);

  const handleClose = () => {
    setProtocol("");
    setMetric("");
    setRouteMap("");
    setError(null);
    onOpenChange(false);
  };

  const validate = (): string | null => {
    if (!protocol) return t("validation.selectProtocol");
    if (metric.trim()) {
      const val = parseInt(metric.trim(), 10);
      if (isNaN(val) || val < 1 || val > 16) return t("validation.metricRange");
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const entry: RipNgRedistribute = {
      protocol,
      metric: metric.trim() ? parseInt(metric.trim(), 10) : null,
      route_map: routeMap || null,
    };

    try {
      setLoading(true);
      setError(null);
      await onSubmit(entry);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Label>{t("redistribute.protocol")}</Label>
            <Select value={protocol} onValueChange={setProtocol} disabled={isEditMode}>
              <SelectTrigger className={isEditMode ? "bg-muted" : ""}>
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
            <Label>{t("redistribute.metric")} <span className="text-muted-foreground text-xs">{t("redistModal.metricHint")}</span></Label>
            <Input
              type="number"
              min={1}
              max={16}
              placeholder={tc("default")}
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            />
          </div>

          {/* Route Map */}
          <div className="space-y-2">
            <Label>{t("redistribute.routeMap")} <span className="text-muted-foreground text-xs">{t("modal.optionalHint")}</span></Label>
            <Select value={routeMap || "none"} onValueChange={(v) => setRouteMap(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder={tc("none")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{tc("none")}</SelectItem>
                {routeMapNames.map((rm) => (
                  <SelectItem key={rm} value={rm} className="font-mono">{rm}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
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
