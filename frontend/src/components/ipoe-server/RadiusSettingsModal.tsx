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
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { ipoeServerService, IPoERadiusSettings } from "@/lib/api/ipoe-server";
import { ApiError } from "@/lib/types/api";

interface RadiusSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentSettings: IPoERadiusSettings;
}

export function RadiusSettingsModal({ open, onOpenChange, onSuccess, currentSettings }: RadiusSettingsModalProps) {
  const t = useTranslations("ipoeServer");
  const tc = useTranslations("common");
  const [sourceAddress, setSourceAddress] = useState("");
  const [timeout, setTimeout] = useState("");
  const [maxTry, setMaxTry] = useState("");
  const [nasIdentifier, setNasIdentifier] = useState("");
  const [nasIpAddress, setNasIpAddress] = useState("");
  const [preallocateVif, setPreallocateVif] = useState(false);
  const [acctInterval, setAcctInterval] = useState("");
  const [acctJitter, setAcctJitter] = useState("");
  const [acctTimeout, setAcctTimeout] = useState("");
  const [daeServer, setDaeServer] = useState("");
  const [daePort, setDaePort] = useState("");
  const [daeKey, setDaeKey] = useState("");
  const [rateLimitEnable, setRateLimitEnable] = useState(false);
  const [rateLimitAttribute, setRateLimitAttribute] = useState("");
  const [rateLimitVendor, setRateLimitVendor] = useState("");
  const [rateLimitMultiplier, setRateLimitMultiplier] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSourceAddress(currentSettings.source_address || "");
      setTimeout(currentSettings.timeout || "");
      setMaxTry(currentSettings.max_try || "");
      setNasIdentifier(currentSettings.nas_identifier || "");
      setNasIpAddress(currentSettings.nas_ip_address || "");
      setPreallocateVif(currentSettings.preallocate_vif || false);
      setAcctInterval(currentSettings.accounting_interim_interval || "");
      setAcctJitter(currentSettings.acct_interim_jitter || "");
      setAcctTimeout(currentSettings.acct_timeout || "");
      setDaeServer(currentSettings.dynamic_author?.server || "");
      setDaePort(currentSettings.dynamic_author?.port || "");
      setDaeKey("");
      setRateLimitEnable(currentSettings.rate_limit?.enable || false);
      setRateLimitAttribute(currentSettings.rate_limit?.attribute || "");
      setRateLimitVendor(currentSettings.rate_limit?.vendor || "");
      setRateLimitMultiplier(currentSettings.rate_limit?.multiplier || "");
      setError(null);
    }
  }, [open, currentSettings]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ipoeServerService.updateRadiusSettings(currentSettings, {
        source_address: sourceAddress,
        timeout,
        max_try: maxTry,
        nas_identifier: nasIdentifier,
        nas_ip_address: nasIpAddress,
        preallocate_vif: preallocateVif,
        accounting_interim_interval: acctInterval,
        acct_interim_jitter: acctJitter,
        acct_timeout: acctTimeout,
        dae_server: daeServer,
        dae_port: daePort,
        dae_key: daeKey || undefined,
        rate_limit_enable: rateLimitEnable,
        rate_limit_attribute: rateLimitAttribute,
        rate_limit_vendor: rateLimitVendor,
        rate_limit_multiplier: rateLimitMultiplier,
      });
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("radiusSettingsModal.updateFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("radiusSettingsModal.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t("radiusSettingsModal.title")}
          </DialogTitle>
          <DialogDescription>{t("radiusSettingsModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("radiusSettingsModal.sourceAddress")}</Label>
              <Input value={sourceAddress} onChange={(e) => setSourceAddress(e.target.value)} placeholder="10.0.0.1" />
            </div>
            <div className="space-y-2">
              <Label>{t("radiusSettingsModal.timeout")}</Label>
              <Input value={timeout} onChange={(e) => setTimeout(e.target.value)} placeholder="3" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("radiusSettingsModal.maxTry")}</Label>
              <Input value={maxTry} onChange={(e) => setMaxTry(e.target.value)} placeholder="3" />
            </div>
            <div className="space-y-2">
              <Label>{t("radiusSettingsModal.nasIdentifier")}</Label>
              <Input value={nasIdentifier} onChange={(e) => setNasIdentifier(e.target.value)} placeholder="vyos-ipoe" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("radiusSettingsModal.nasIpAddress")}</Label>
            <Input value={nasIpAddress} onChange={(e) => setNasIpAddress(e.target.value)} placeholder="10.0.0.1" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="preallocate-vif" checked={preallocateVif} onCheckedChange={(v) => setPreallocateVif(!!v)} />
            <Label htmlFor="preallocate-vif" className="cursor-pointer">{t("radiusSettingsModal.preallocateVif")}</Label>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("radiusSettingsModal.accounting")}</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("radiusSettingsModal.interimInterval")}</Label>
              <Input value={acctInterval} onChange={(e) => setAcctInterval(e.target.value)} placeholder="60" />
            </div>
            <div className="space-y-2">
              <Label>{t("radiusSettingsModal.interimJitter")}</Label>
              <Input value={acctJitter} onChange={(e) => setAcctJitter(e.target.value)} placeholder="10" />
            </div>
            <div className="space-y-2">
              <Label>{t("radiusSettingsModal.acctTimeout")}</Label>
              <Input value={acctTimeout} onChange={(e) => setAcctTimeout(e.target.value)} placeholder="3" />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("radiusSettingsModal.dynamicAuthorization")}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("radiusSettingsModal.daeServer")}</Label>
              <Input value={daeServer} onChange={(e) => setDaeServer(e.target.value)} placeholder="10.0.0.100" />
            </div>
            <div className="space-y-2">
              <Label>{t("radiusSettingsModal.daePort")}</Label>
              <Input value={daePort} onChange={(e) => setDaePort(e.target.value)} placeholder="3799" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("radiusSettingsModal.daeKey")}</Label>
            <Input type="password" value={daeKey} onChange={(e) => setDaeKey(e.target.value)} placeholder={currentSettings.dynamic_author?.key ? t("radiusSettingsModal.daeKeyKeep") : t("radiusSettingsModal.daeKeyEnter")} />
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("radiusSettingsModal.rateLimiting")}</h4>
          <div className="flex items-center gap-2">
            <Checkbox id="rate-limit-enable" checked={rateLimitEnable} onCheckedChange={(v) => setRateLimitEnable(!!v)} />
            <Label htmlFor="rate-limit-enable" className="cursor-pointer">{t("radiusSettingsModal.enableRateLimiting")}</Label>
          </div>
          {rateLimitEnable && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("radiusSettingsModal.attribute")}</Label>
                {/* eslint-disable-next-line vymanager/no-untranslated-text -- RADIUS attribute name */}
                <Input value={rateLimitAttribute} onChange={(e) => setRateLimitAttribute(e.target.value)} placeholder="Filter-Id" />
              </div>
              <div className="space-y-2">
                <Label>{t("radiusSettingsModal.vendor")}</Label>
                <Input value={rateLimitVendor} onChange={(e) => setRateLimitVendor(e.target.value)} placeholder={t("radiusSettingsModal.vendor")} />
              </div>
              <div className="space-y-2">
                <Label>{t("radiusSettingsModal.multiplier")}</Label>
                <Input value={rateLimitMultiplier} onChange={(e) => setRateLimitMultiplier(e.target.value)} placeholder="1" />
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : t("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
