"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { wireguardService, WireGuardPeer } from "@/lib/api/wireguard";
import { ApiError } from "@/lib/types/api";

interface DeletePeerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceName: string;
  peerData: WireGuardPeer | null;
}

export function DeletePeerModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceName,
  peerData,
}: DeletePeerModalProps) {
  const t = useTranslations("wireguard");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!peerData) return;

    setLoading(true);
    setError(null);

    try {
      const result = await wireguardService.deletePeer(interfaceName, peerData.name);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("deletePeer.failed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("deletePeer.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!peerData) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t("deletePeer.title", { name: peerData.name })}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {t("deletePeer.confirm", { interface: interfaceName })}
            </p>
            <div className="rounded-lg bg-muted p-3 mt-2 space-y-1 text-sm">
              <p>
                <span className="font-medium">{t("deletePeer.allowedIps")}</span>{" "}
                {peerData.allowed_ips.join(", ") || tc("none")}
              </p>
              {peerData.address && (
                <p>
                  <span className="font-medium">{t("deletePeer.endpoint")}</span> {peerData.address}
                  {peerData.port ? `:${peerData.port}` : ""}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tc("deleting")}
              </>
            ) : (
              t("deletePeer.submit")
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
