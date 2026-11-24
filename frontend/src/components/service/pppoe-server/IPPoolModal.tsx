"use client";

import { useState } from "react";
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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Loader2, Network } from "lucide-react";
import { MultiValueInput } from "@/components/service/webproxy/MultiValueInput";
import { pppoeServerService, PPPoEIPv4Pool } from "@/lib/api/pppoe-server";
import { ipPoolProblem, type PPPoEIPPoolDraft } from "@/lib/api/pppoe-server-save-ops";
import type { ApiError } from "@/lib/types/api";

interface IPPoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingPool: PPPoEIPv4Pool | null;
  /** Configured IPv4 pool names: Add rejects them, next-pool picks from them. */
  poolNames: string[];
}

export function IPPoolModal({ open, onOpenChange, onSuccess, existingPool, poolNames }: IPPoolModalProps) {
  const t = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
  const isEdit = !!existingPool;
  // The page remounts this modal (key) on every open, so state seeds from props.
  const [draft, setDraft] = useState<PPPoEIPPoolDraft>(() => ({
    name: existingPool?.name || "",
    ranges: existingPool?.ranges || [],
    next_pool: existingPool?.next_pool || "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<PPPoEIPPoolDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async () => {
    const issue = ipPoolProblem(existingPool, draft, poolNames);
    if (issue) {
      const { problem, params } = issue;
      setError(problem === "poolNameRequired" || problem === "poolExists"
        ? t(problem, params)
        : t(`ipPool.${problem}`));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await pppoeServerService.saveIPPool(existingPool, draft);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("ipPool.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {isEdit ? t("ipPool.editTitle") : t("ipPool.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("ipPool.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pppoe-pool-name">{t("poolName")}</Label>
            <Input
              id="pppoe-pool-name"
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="pool1"
              disabled={isEdit}
            />
          </div>

          <MultiValueInput
            label={t("ipPool.ranges")}
            values={draft.ranges}
            placeholder={t("ipPool.rangePlaceholder")}
            onChange={(ranges) => update({ ranges })}
          />

          <div className="space-y-2">
            <Label htmlFor="pppoe-pool-next">{t("ipPool.nextPool")}</Label>
            <NamedListSelect
              id="pppoe-pool-next"
              value={draft.next_pool}
              names={poolNames.filter((name) => name !== existingPool?.name)}
              onValueChange={(next_pool) => update({ next_pool })}
            />
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : tc("creating")}</> : isEdit ? tc("saveChanges") : t("createPool")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
