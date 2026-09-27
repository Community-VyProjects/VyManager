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
import { Loader2, AlertCircle } from "lucide-react";
import { IsisRedistributeEntry, IsisCapabilities } from "@/lib/api/isis";
import { useTranslations } from "next-intl";

interface IsisRedistributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: IsisRedistributeEntry) => Promise<void>;
  existingProtocols: string[]; // "family|protocol|level"
  routeMapNames: string[];
  capabilities: IsisCapabilities | null;
}

const LEVELS = ["level-1", "level-2"] as const;

export function IsisRedistributeModal({
  open,
  onOpenChange,
  onSubmit,
  existingProtocols,
  routeMapNames,
  capabilities,
}: IsisRedistributeModalProps) {
  const t = useTranslations("isis");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [family, setFamily] = useState<"ipv4" | "ipv6">("ipv4");
  const [protocol, setProtocol] = useState("");
  const [level, setLevel] = useState("");
  const [metric, setMetric] = useState("");
  const [routeMap, setRouteMap] = useState("");

  const protocols = capabilities?.redistribute_protocols?.[family] ?? [];

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFamily("ipv4");
    setProtocol("");
    setLevel("");
    setMetric("");
    setRouteMap("");
  }, [open]);

  const isDuplicate =
    protocol && level && existingProtocols.includes(`${family}|${protocol}|${level}`);

  const handleSubmit = async () => {
    if (!protocol) { setError(t("redistributeModal.protocolRequired")); return; }
    if (!level) { setError(t("fields.levelRequired")); return; }
    if (isDuplicate) { setError(t("redistributeModal.alreadyRedistributed", { protocol, level })); return; }

    const entry: IsisRedistributeEntry = {
      family,
      protocol,
      level,
      metric: metric.trim() ? parseInt(metric.trim(), 10) : null,
      route_map: routeMap || null,
    };

    try {
      setSaving(true);
      setError(null);
      await onSubmit(entry);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("redistributeModal.addFailed"));
    } finally {
      setSaving(false);
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

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("fields.addressFamily")} <span className="text-destructive">*</span></Label>
            <Select value={family} onValueChange={(v) => { setFamily(v as "ipv4" | "ipv6"); setProtocol(""); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ipv4">IPv4</SelectItem>
                {capabilities?.features.redistribute_ipv6?.supported !== false && (
                  <SelectItem value="ipv6">IPv6</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("fields.protocol")} <span className="text-destructive">*</span></Label>
            <Select value={protocol} onValueChange={setProtocol}>
              <SelectTrigger>
                <SelectValue placeholder={t("fields.selectProtocol")} />
              </SelectTrigger>
              <SelectContent>
                {protocols.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("fields.isisLevel")} <span className="text-destructive">*</span></Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder={t("fields.selectLevel")} />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{l === "level-1" ? t("redistributeModal.level1") : t("redistributeModal.level2")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isDuplicate && (
            <p className="text-sm text-destructive">
              {t("redistributeModal.alreadyConfigured", { protocol, level })}
            </p>
          )}

          <div className="space-y-2">
            <Label>{t("fields.metricOptional")}</Label>
            <Input
              type="number"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder={tc("default")}
              min={1}
              max={16777214}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("fields.routeMapOptional")}</Label>
            <Select value={routeMap} onValueChange={(v) => setRouteMap(v === "__none__" ? "" : v)}>
              <SelectTrigger>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !!isDuplicate}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("fields.addRedistribute")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
