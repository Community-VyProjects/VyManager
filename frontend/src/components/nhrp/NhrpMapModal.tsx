"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import { NhrpMapEntry, NhrpCapabilities } from "@/lib/api/nhrp";

interface NhrpMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tunnelIp: string, nbma: string, cisco: boolean, register: boolean) => Promise<void>;
  existingMap: NhrpMapEntry | null;
  capabilities: NhrpCapabilities;
}

export function NhrpMapModal({
  open,
  onOpenChange,
  onSubmit,
  existingMap,
  capabilities,
}: NhrpMapModalProps) {
  const t = useTranslations("nhrp");
  const tc = useTranslations("common");
  const isEditMode = existingMap !== null;

  const [tunnelIp, setTunnelIp] = useState("");
  const [nbma, setNbma] = useState("");
  const [cisco, setCisco] = useState(false);
  const [register, setRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTunnelIp(existingMap?.tunnel_ip ?? "");
      setNbma(existingMap?.nbma_address ?? "");
      setCisco(existingMap?.cisco ?? false);
      setRegister(existingMap?.register ?? false);
      setError(null);
    }
  }, [open, existingMap]);

  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!tunnelIp.trim()) {
      setError(t("tunnelIpRequired"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(tunnelIp.trim(), nbma.trim(), cisco, register);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("mapModal.editTitle") : t("mapModal.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="map-tunnel-ip">{t("tunnel.tunnelIp")}</Label>
            {isEditMode ? (
              <p className="text-sm font-mono font-medium px-3 py-2 bg-muted rounded-md">
                {existingMap?.tunnel_ip}
              </p>
            ) : (
              <Input
                id="map-tunnel-ip"
                value={tunnelIp}
                onChange={(e) => setTunnelIp(e.target.value)}
                placeholder={t("placeholders.tunnelIp")}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="map-nbma">{t("tunnel.nbmaAddress")}</Label>
            <Input
              id="map-nbma"
              value={nbma}
              onChange={(e) => setNbma(e.target.value)}
              placeholder={t("placeholders.nbma")}
            />
          </div>

          {capabilities.features.map_cisco.supported && (
            <div className="flex items-center gap-3">
              <Checkbox
                id="map-cisco"
                checked={cisco}
                onCheckedChange={(checked) => setCisco(checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="map-cisco" className="cursor-pointer">
                  Cisco
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("mapModal.ciscoHelp")}
                </p>
              </div>
            </div>
          )}

          {capabilities.features.map_register.supported && (
            <div className="flex items-center gap-3">
              <Checkbox
                id="map-register"
                checked={register}
                onCheckedChange={(checked) => setRegister(checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="map-register" className="cursor-pointer">
                  {t("tunnel.register")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("mapModal.registerHelp")}
                </p>
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
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : t("adding")}
              </>
            ) : isEditMode ? (
              t("saveChanges")
            ) : (
              t("mapModal.addMap")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
