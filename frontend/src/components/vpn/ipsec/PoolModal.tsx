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
import { AlertCircle, Loader2, Database } from "lucide-react";
import { ipsecService, RAPool, IPSecCapabilities } from "@/lib/api/ipsec";
import { ApiError } from "@/lib/types/api";

interface PoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: IPSecCapabilities | null;
  existingPool: RAPool | null;
}

export function PoolModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingPool,
}: PoolModalProps) {
  const t = useTranslations("ipsecSettings");
  const tc = useTranslations("common");
  const isEdit = !!existingPool;

  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [nameServers, setNameServers] = useState("");
  const [exclude, setExclude] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeStop, setRangeStop] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingPool) {
        setName(existingPool.name);
        setPrefix((existingPool.prefix || []).join(", "));
        setNameServers((existingPool.name_servers || []).join(", "));
        setExclude((existingPool.exclude || []).join(", "));
        setRangeStart(existingPool.range_start || "");
        setRangeStop(existingPool.range_stop || "");
      } else {
        setName("");
        setPrefix("");
        setNameServers("");
        setExclude("");
        setRangeStart("");
        setRangeStop("");
      }
      setError(null);
    }
  }, [open, existingPool]);

  const splitValues = (str: string) => str.split(",").map((s) => s.trim()).filter(Boolean);

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t("pool.nameRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      if (isEdit) await ipsecService.deleteRAPool(existingPool!.name);

      const result = await ipsecService.createRAPool(name.trim(), {
        prefix: prefix ? splitValues(prefix) : undefined,
        name_servers: nameServers ? splitValues(nameServers) : undefined,
        exclude: exclude ? splitValues(exclude) : undefined,
        range_start: rangeStart || undefined,
        range_stop: rangeStop || undefined,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("pool.saveFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("pool.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {isEdit ? t("pool.titleEdit") : t("pool.titleCreate")}
          </DialogTitle>
          <DialogDescription>{t("pool.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{tc("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ra-pool" disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <Label>{t("pool.prefixes")}</Label>
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="10.10.0.0/24, 10.10.1.0/24" />
            <p className="text-xs text-muted-foreground">{t("pool.prefixesHelp")}</p>
          </div>
          <div className="space-y-2">
            <Label>{t("pool.dnsServers")}</Label>
            <Input value={nameServers} onChange={(e) => setNameServers(e.target.value)} placeholder="8.8.8.8, 8.8.4.4" />
          </div>
          <div className="space-y-2">
            <Label>{t("pool.exclude")}</Label>
            <Input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="10.10.0.1, 10.10.0.254" />
            <p className="text-xs text-muted-foreground">{t("pool.excludeHelp")}</p>
          </div>
          {capabilities?.features.pool_range.supported && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("pool.rangeStart")}</Label>
                <Input value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} placeholder="10.10.0.10" />
              </div>
              <div className="space-y-2">
                <Label>{t("pool.rangeStop")}</Label>
                <Input value={rangeStop} onChange={(e) => setRangeStop(e.target.value)} placeholder="10.10.0.250" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : t("shared.creating")}</> : isEdit ? t("shared.saveChanges") : t("pool.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
