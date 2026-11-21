"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Code, Loader2, Power, Settings2, Shield, Trash2 } from "lucide-react";
import {
  vrfService,
  VrfInstance,
  VrfCapabilities,
  type VyOSResponse,
} from "@/lib/api/vrf";
import type { ApiError } from "@/lib/types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RpkiModal } from "./RpkiModal";

interface VrfRpkiTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfRpkiTab({ vrf, canWrite, onRefresh }: VrfRpkiTabProps) {
  const t = useTranslations("vrfProtocols");
  const [modalOpen, setModalOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const [confirm, setConfirm] = useState<"enable" | "remove" | null>(null);
  const [applying, setApplying] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const tc = useTranslations("common");
  const rpki = vrf.rpki;
  const caches = rpki?.caches ?? [];
  // The dialog applies to the state it opened for; a refresh that flips the
  // RPKI node closes it instead of offering the other action.
  const confirmOpen = confirm === (rpki ? "remove" : "enable");

  const closeConfirm = (open: boolean) => {
    if (open || applying) return;
    setConfirm(null);
    setConfirmError(null);
  };

  const handleApply = async () => {
    setApplying(true);
    setConfirmError(null);
    try {
      const result: VyOSResponse =
        confirm === "remove" ? await vrfService.deleteRpki(vrf.name) : await vrfService.enableRpki(vrf.name);
      if (!result.success) {
        setConfirmError(result.error || tc("operationFailed"));
        return;
      }
      setConfirm(null);
      onRefresh();
    } catch (e) {
      setConfirmError((e as ApiError).message || tc("operationFailed"));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("rpki.caches")}</p>
            <p className="text-lg font-semibold">{caches.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("rpki.expireIntervalTitle")}</p>
            <p className="text-sm font-mono">{rpki?.expire_interval ?? t("rpki.default")}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("rpki.pollingPeriodTitle")}</p>
            <p className="text-sm font-mono">{rpki?.polling_period ?? t("rpki.default")}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("rpki.retryIntervalTitle")}</p>
            <p className="text-sm font-mono">{rpki?.retry_interval ?? t("rpki.default")}</p>
          </CardContent>
        </Card>
      </div>

      {caches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Shield className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">{t("rpki.noCaches")}</p>
        </div>
      )}

      {caches.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-1.5">
            {caches.map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="font-mono">{c.name}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {c.source_address ? `${c.source_address}:` : ""}{c.port ?? "—"}
                  {c.ssh ? " · ssh" : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        {canWrite && !rpki && (
          <Button variant="outline" size="sm" onClick={() => setConfirm("enable")}>
            <Power className="h-3.5 w-3.5 mr-1.5" />
            {t("rpki.enable")}
          </Button>
        )}
        {canWrite && rpki && (
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirm("remove")}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {t("rpki.remove")}
          </Button>
        )}
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            {t("rpki.configure")}
          </Button>
        )}
        {rpki?.raw_config && (
          <Button variant="outline" size="sm" onClick={() => setRawOpen(true)}>
            <Code className="h-3.5 w-3.5 mr-1.5" />
            {t("tabs.viewRawConfig")}
          </Button>
        )}
      </div>

      <RpkiModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vrfName={vrf.name}
        rpki={rpki}
        canWrite={canWrite}
        onSaved={onRefresh}
      />

      <Dialog open={confirmOpen} onOpenChange={closeConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirm === "remove" ? t("rpki.remove") : t("rpki.enable")}</DialogTitle>
            <DialogDescription>
              {confirm === "remove"
                ? t("rpki.removeDescription", { vrf: vrf.name })
                : t("rpki.enableDescription", { vrf: vrf.name })}
            </DialogDescription>
          </DialogHeader>
          {confirmError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {confirmError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => closeConfirm(false)} disabled={applying}>
              {tc("cancel")}
            </Button>
            <Button
              variant={confirm === "remove" ? "destructive" : "default"}
              onClick={handleApply}
              disabled={applying}
            >
              {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("rpki.apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rawOpen} onOpenChange={setRawOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t("rpki.rawTitle", { vrf: vrf.name })}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(rpki?.raw_config ?? {}, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
