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
import { AlertCircle, Loader2 } from "lucide-react";
import { MplsLdpNeighbor } from "@/lib/api/mpls";

interface MplsLdpNeighborModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (neighbor: MplsLdpNeighbor) => Promise<void>;
  existingNeighbor: MplsLdpNeighbor | null;
}

export function MplsLdpNeighborModal({
  open,
  onOpenChange,
  onSubmit,
  existingNeighbor,
}: MplsLdpNeighborModalProps) {
  const t = useTranslations("mpls");
  const tc = useTranslations("common");
  const isEditMode = existingNeighbor !== null;

  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [sessionHoldtime, setSessionHoldtime] = useState("");
  const [ttlSecurity, setTtlSecurity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAddress(existingNeighbor?.address ?? "");
      setPassword(existingNeighbor?.password ?? "");
      setSessionHoldtime(
        existingNeighbor?.session_holdtime != null
          ? String(existingNeighbor.session_holdtime)
          : ""
      );
      setTtlSecurity(existingNeighbor?.ttl_security ?? "");
      setError(null);
    }
  }, [open, existingNeighbor]);

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      setError(t("neighborModal.addressRequired"));
      return;
    }

    const holdtime = sessionHoldtime ? parseInt(sessionHoldtime, 10) : null;
    if (sessionHoldtime && (isNaN(holdtime!) || holdtime! < 0)) {
      setError(t("neighborModal.holdtimeInvalid"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        address: address.trim(),
        password: password.trim() || null,
        session_holdtime: holdtime,
        ttl_security: ttlSecurity.trim() || null,
      });
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
            {isEditMode ? t("neighborModal.editTitle") : t("neighborModal.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Peer Address */}
          <div className="space-y-2">
            <Label htmlFor="ldp-neighbor-addr">{t("neighborModal.peerIpv4Address")}</Label>
            {isEditMode ? (
              <p className="text-sm font-mono font-medium px-3 py-2 bg-muted rounded-md">
                {existingNeighbor?.address}
              </p>
            ) : (
              <Input
                id="ldp-neighbor-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("general.ipv4Placeholder")}
              />
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="ldp-neighbor-pw">{t("neighbors.password")}</Label>
            <Input
              id="ldp-neighbor-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("neighborModal.passwordPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("neighborModal.passwordHelp")}
            </p>
          </div>

          {/* Session Holdtime */}
          <div className="space-y-2">
            <Label htmlFor="ldp-neighbor-holdtime">{t("neighborModal.sessionHoldtimeSeconds")}</Label>
            <Input
              id="ldp-neighbor-holdtime"
              type="number"
              min={0}
              value={sessionHoldtime}
              onChange={(e) => setSessionHoldtime(e.target.value)}
              placeholder={t("neighborModal.holdtimePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("neighborModal.holdtimeHelp")}
            </p>
          </div>

          {/* TTL Security */}
          <div className="space-y-2">
            <Label htmlFor="ldp-neighbor-ttl">{t("neighbors.ttlSecurity")}</Label>
            <Input
              id="ldp-neighbor-ttl"
              value={ttlSecurity}
              onChange={(e) => setTtlSecurity(e.target.value)}
              placeholder={t("neighborModal.ttlPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("neighborModal.ttlHelp")}
            </p>
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
                {isEditMode ? tc("saving") : t("adding")}
              </>
            ) : isEditMode ? (
              t("saveChanges")
            ) : (
              t("neighbors.add")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
