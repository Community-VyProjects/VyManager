"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ZoneCache } from "@/lib/api/dns-forwarding";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoneCache: ZoneCache | null;
  onSubmit: (
    zone: string,
    sourceUrl: string | null,
    sourceAxfr: string | null,
    options: ZoneCache["options"]
  ) => Promise<void>;
}

export function DNSForwardingZoneCacheModal({ open, onOpenChange, zoneCache, onSubmit }: Props) {
  const t = useTranslations("dnsForwarding");
  const tc = useTranslations("common");
  const isEdit = !!zoneCache;

  const [zone, setZone] = useState("");
  const [sourceType, setSourceType] = useState<"url" | "axfr">("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceAxfr, setSourceAxfr] = useState("");
  const [dnssec, setDnssec] = useState("");
  const [maxZoneSize, setMaxZoneSize] = useState("");
  const [refreshInterval, setRefreshInterval] = useState("");
  const [refreshOnReload, setRefreshOnReload] = useState(false);
  const [retryInterval, setRetryInterval] = useState("");
  const [timeout, setTimeout] = useState("");
  const [zonemd, setZonemd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (zoneCache) {
        setZone(zoneCache.zone);
        if (zoneCache.source_axfr) {
          setSourceType("axfr");
          setSourceAxfr(zoneCache.source_axfr);
          setSourceUrl("");
        } else {
          setSourceType("url");
          setSourceUrl(zoneCache.source_url ?? "");
          setSourceAxfr("");
        }
        setDnssec(zoneCache.options.dnssec ?? "");
        setMaxZoneSize(zoneCache.options.max_zone_size != null ? String(zoneCache.options.max_zone_size) : "");
        setRefreshInterval(zoneCache.options.refresh_interval != null ? String(zoneCache.options.refresh_interval) : "");
        setRefreshOnReload(zoneCache.options.refresh_on_reload);
        setRetryInterval(zoneCache.options.retry_interval != null ? String(zoneCache.options.retry_interval) : "");
        setTimeout(zoneCache.options.timeout != null ? String(zoneCache.options.timeout) : "");
        setZonemd(zoneCache.options.zonemd ?? "");
      } else {
        setZone("");
        setSourceType("url");
        setSourceUrl("");
        setSourceAxfr("");
        setDnssec("");
        setMaxZoneSize("");
        setRefreshInterval("");
        setRefreshOnReload(false);
        setRetryInterval("");
        setTimeout("");
        setZonemd("");
      }
      setError(null);
    }
  }, [open, zoneCache]);

  const handleSubmit = async () => {
    if (!isEdit && !zone.trim()) {
      setError(t("zoneNameRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(
        isEdit ? zoneCache!.zone : zone.trim(),
        sourceType === "url" ? sourceUrl || null : null,
        sourceType === "axfr" ? sourceAxfr || null : null,
        {
          dnssec: dnssec || null,
          max_zone_size: maxZoneSize ? parseInt(maxZoneSize, 10) : null,
          refresh_interval: refreshInterval ? parseInt(refreshInterval, 10) : null,
          refresh_on_reload: refreshOnReload,
          retry_interval: retryInterval ? parseInt(retryInterval, 10) : null,
          timeout: timeout ? parseInt(timeout, 10) : null,
          zonemd: zonemd || null,
        }
      );
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("zoneCache.editTitle") : t("content.addZoneCache")}</DialogTitle>
          <DialogDescription>{t("zoneCache.description")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 pb-2">
            <div className="space-y-2">
              <Label htmlFor="zc-zone">{t("zoneName")}</Label>
              <Input
                id="zc-zone"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder={t("domainPlaceholder")}
                disabled={isEdit}
                className={isEdit ? "bg-muted font-mono" : "font-mono"}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("content.sourceType")}</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as "url" | "axfr")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="axfr">AXFR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sourceType === "url" ? (
              <div className="space-y-2">
                <Label htmlFor="zc-url">URL</Label>
                <Input
                  id="zc-url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://example.com/zone.txt"
                  className="font-mono"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="zc-axfr">{t("zoneCache.axfrServerIp")}</Label>
                <Input
                  id="zc-axfr"
                  value={sourceAxfr}
                  onChange={(e) => setSourceAxfr(e.target.value)}
                  placeholder={t("example", { value: "192.168.1.1" })}
                  className="font-mono"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>DNSSEC</Label>
              <Select value={dnssec || "none"} onValueChange={(v) => setDnssec(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder={t("selectPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc("notSet")}</SelectItem>
                  <SelectItem value="ignore">{t("zoneCache.ignore")}</SelectItem>
                  <SelectItem value="validate">{t("validate")}</SelectItem>
                  <SelectItem value="require">{t("zoneCache.require")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zc-maxsize">{t("zoneCache.maxZoneSize")}</Label>
                <Input
                  id="zc-maxsize"
                  type="number"
                  value={maxZoneSize}
                  onChange={(e) => setMaxZoneSize(e.target.value)}
                  placeholder="0–1024"
                  min={0}
                  max={1024}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zc-refresh">{t("zoneCache.refreshInterval")}</Label>
                <Input
                  id="zc-refresh"
                  type="number"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  placeholder={t("zoneCache.seconds")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zc-retry">{t("zoneCache.retryInterval")}</Label>
                <Input
                  id="zc-retry"
                  type="number"
                  value={retryInterval}
                  onChange={(e) => setRetryInterval(e.target.value)}
                  placeholder={t("zoneCache.seconds")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zc-timeout">{t("zoneCache.timeout")}</Label>
                <Input
                  id="zc-timeout"
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(e.target.value)}
                  placeholder={t("zoneCache.seconds")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ZONEMD</Label>
              <Select value={zonemd || "none"} onValueChange={(v) => setZonemd(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder={t("selectPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc("notSet")}</SelectItem>
                  <SelectItem value="ignore">{t("zoneCache.ignore")}</SelectItem>
                  <SelectItem value="validate">{t("validate")}</SelectItem>
                  <SelectItem value="require">{t("zoneCache.require")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="zc-reload"
                checked={refreshOnReload}
                onCheckedChange={(c) => setRefreshOnReload(c === true)}
              />
              <Label htmlFor="zc-reload" className="cursor-pointer">{t("zoneCache.refreshOnReload")}</Label>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : t("adding")}</> : isEdit ? t("saveChanges") : t("content.addZoneCache")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
