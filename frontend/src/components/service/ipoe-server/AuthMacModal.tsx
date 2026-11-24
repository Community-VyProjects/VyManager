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
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Shield } from "lucide-react";
import { ipoeServerService, IPoEAuthMac, IPoEAuthInterface } from "@/lib/api/ipoe-server";
import { authMacProblem, type IPoEAuthMacDraft } from "@/lib/api/ipoe-server-save-ops";
import { ApiError } from "@/lib/types/api";

interface AuthMacModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingMac: IPoEAuthMac | null;
  preselectedInterface: string;
  authInterfaces: IPoEAuthInterface[];
}

export function AuthMacModal({ open, onOpenChange, onSuccess, existingMac, preselectedInterface, authInterfaces }: AuthMacModalProps) {
  const t = useTranslations("ipoeServer");
  const tc = useTranslations("common");
  const isEdit = !!existingMac;

  const [selectedIface, setSelectedIface] = useState("");
  const [mac, setMac] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [vlan, setVlan] = useState("");
  const [rateDown, setRateDown] = useState("");
  const [rateUp, setRateUp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedIface(preselectedInterface || authInterfaces[0]?.interface || "");
      setMac(existingMac?.mac || "");
      setIpAddress(existingMac?.ip_address || "");
      setVlan(existingMac?.vlan || "");
      setRateDown(existingMac?.rate_limit?.download || "");
      setRateUp(existingMac?.rate_limit?.upload || "");
      setError(null);
    }
  }, [open, existingMac, preselectedInterface, authInterfaces]);

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async () => {
    const draft: IPoEAuthMacDraft = {
      interface: selectedIface,
      mac,
      ip_address: ipAddress,
      vlan,
      rate_download: rateDown,
      rate_upload: rateUp,
    };
    const configuredMacs = (authInterfaces.find((ai) => ai.interface === selectedIface.trim())?.macs ?? [])
      .map((entry) => entry.mac);
    const problem = authMacProblem(existingMac, draft, configuredMacs);
    if (problem) {
      setError(t(`authMacModal.${problem}`));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await ipoeServerService.saveAuthMac(existingMac, draft);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("authMacModal.saveFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("authMacModal.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isEdit ? t("authMacModal.editTitle") : t("authMacModal.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("authMacModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("authMacModal.interface")}</Label>
            <InterfaceSelect value={selectedIface} onValueChange={setSelectedIface} disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <Label>{t("authMacModal.macAddress")}</Label>
            <Input value={mac} onChange={(e) => setMac(e.target.value)} placeholder="00:11:22:33:44:55" disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <Label>{t("authMacModal.staticIp")}</Label>
            <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="192.168.1.100" />
          </div>
          <div className="space-y-2">
            <Label>{t("authMacModal.vlan")}</Label>
            <Input value={vlan} onChange={(e) => setVlan(e.target.value)} placeholder="1-4094" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("authMacModal.rateDownload")}</Label>
              <Input value={rateDown} onChange={(e) => setRateDown(e.target.value)} placeholder="kbits/sec" />
            </div>
            <div className="space-y-2">
              <Label>{t("authMacModal.rateUpload")}</Label>
              <Input value={rateUp} onChange={(e) => setRateUp(e.target.value)} placeholder="kbits/sec" />
            </div>
          </div>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : t("adding")}</> : isEdit ? tc("saveChanges") : t("authMacModal.addEntry")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
