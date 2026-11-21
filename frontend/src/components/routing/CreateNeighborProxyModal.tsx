"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { staticRoutesService } from "@/lib/api/static-routes";
import {
  neighborProxyProblem,
  type NeighborProxyFields,
  type NeighborProxyKind,
  type NeighborProxyProblem,
} from "@/lib/api/static-routes-save-ops";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceMultiSelect } from "@/components/ui/interface-multi-select";
import { lockedIdentity, modalIsEdit } from "@/lib/modal-mode";
import type { ApiError } from "@/lib/types/api";

interface CreateNeighborProxyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existing?: NeighborProxyFields | null;
  /** `kind|address` of every entry on the device. */
  configured: string[];
}

function emptyProxy(): NeighborProxyFields {
  return { kind: "arp", address: "", interfaces: [] };
}

export function CreateNeighborProxyModal({
  open,
  onOpenChange,
  onSuccess,
  existing,
  configured,
}: CreateNeighborProxyModalProps) {
  const t = useTranslations("routingExtras");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const initial = useMemo(() => existing ?? emptyProxy(), [existing]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [draft, setDraft] = useState<NeighborProxyFields>(initial);

  const seedKey = open ? JSON.stringify(initial) : "";
  const [seed, setSeed] = useState(seedKey);
  if (seedKey !== seed) {
    setSeed(seedKey);
    setDraft(initial);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    showService
      .getAllInterfaces()
      .then((response) => {
        if (live) setAvailableInterfaces(response.interfaces);
      })
      .catch(() => {
        if (live) setAvailableInterfaces([]);
      });
    return () => {
      live = false;
    };
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  const lockedAddress = lockedIdentity(existing, (entry) => entry.address, draft.address);

  const problemMessage = (problem: NeighborProxyProblem): string => {
    switch (problem.key) {
      case "ipAddressRequired":
        return t("neighborProxyModal.ipRequired");
      case "interfaceRequired":
        return t("neighborProxyModal.interfaceRequired");
      case "invalidIpv4Address":
        return t("neighborProxyModal.invalidIpv4");
      case "invalidIpv6Address":
        return t("neighborProxyModal.invalidIpv6");
      default:
        return t("neighborProxyModal.exists", { name: problem.name });
    }
  };

  const handleSubmit = async () => {
    const original = isEdit ? initial : null;
    const problem = neighborProxyProblem(original, draft, configured);
    if (problem) {
      setError(problemMessage(problem));
      return;
    }
    const failed = isEdit ? t("neighborProxyModal.updateFailed") : t("neighborProxyModal.createFailed");
    setError(null);
    setLoading(true);
    try {
      const result = await staticRoutesService.saveNeighborProxy(original, draft);
      if (result && !result.success) {
        setError(result.error || failed);
        return;
      }
      if (result) onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("neighborProxyModal.editTitle") : t("neighborProxyModal.title")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("neighborProxyModal.editDescription", { address: existing.address })
              : t("neighborProxyModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
            </div>
          )}

          {!isEdit && (
            <Tabs
              value={draft.kind}
              onValueChange={(v) => setDraft((d) => ({ ...d, kind: v as NeighborProxyKind }))}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="arp">{t("shared.arpProxy")}</TabsTrigger>
                <TabsTrigger value="nd">{t("shared.ndProxy")}</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <div className="space-y-2">
            <Label htmlFor="proxy-address">
              {draft.kind === "arp" ? t("neighborProxyModal.ipv4Address") : t("neighborProxyModal.ipv6Address")}
            </Label>
            <Input
              id="proxy-address"
              placeholder={draft.kind === "arp" ? "192.168.1.100" : "2001:db8::1"}
              value={lockedAddress.value}
              disabled={lockedAddress.disabled}
              className={lockedAddress.disabled ? "bg-muted" : undefined}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proxy-interfaces">{t("shared.interfaces")}</Label>
            <InterfaceMultiSelect
              id="proxy-interfaces"
              values={draft.interfaces}
              onChange={(values) => setDraft((d) => ({ ...d, interfaces: values }))}
              interfaces={availableInterfaces}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? tc("saveChanges") : t("shared.createEntry")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
