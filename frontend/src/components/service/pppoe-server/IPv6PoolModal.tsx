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
import { AlertCircle, Loader2, Network, Plus, Trash2 } from "lucide-react";
import { pppoeServerService, PPPoEIPv6Pool } from "@/lib/api/pppoe-server";
import {
  ipv6PoolProblem,
  PPPOE_RANGES,
  type PPPoEIPv6DelegateRow,
  type PPPoEIPv6PrefixRow,
} from "@/lib/api/pppoe-server-save-ops";
import type { ApiError } from "@/lib/types/api";

interface IPv6PoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingPool: PPPoEIPv6Pool | null;
  /** Configured IPv6 pool names; Add rejects them. */
  poolNames: string[];
}

export function IPv6PoolModal({ open, onOpenChange, onSuccess, existingPool, poolNames }: IPv6PoolModalProps) {
  const t = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
  const isEdit = !!existingPool;
  // The page remounts this modal (key) on every open, so state seeds from props.
  const [name, setName] = useState(existingPool?.name || "");
  const [prefixes, setPrefixes] = useState<PPPoEIPv6PrefixRow[]>(() => existingPool
    ? existingPool.prefixes.map((p) => ({ prefix: p.prefix, mask: p.mask || "" }))
    : [{ prefix: "", mask: "" }]);
  const [delegates, setDelegates] = useState<PPPoEIPv6DelegateRow[]>(() => (existingPool?.delegates ?? [])
    .map((d) => ({ prefix: d.prefix, delegation_prefix: d.delegation_prefix || "" })));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mask = PPPOE_RANGES.ipv6PrefixMask;
  const delegation = PPPOE_RANGES.ipv6DelegationPrefix;

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const updatePrefix = (index: number, patch: Partial<PPPoEIPv6PrefixRow>) => {
    setPrefixes(prefixes.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateDelegate = (index: number, patch: Partial<PPPoEIPv6DelegateRow>) => {
    setDelegates(delegates.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleSubmit = async () => {
    const draft = { name, prefixes, delegates };
    const issue = ipv6PoolProblem(existingPool, draft, poolNames);
    if (issue) {
      const { problem, params } = issue;
      setError(problem === "poolNameRequired" || problem === "poolExists"
        ? t(problem, params)
        : t(`ipv6Pool.${problem}`, params));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await pppoeServerService.saveIPv6Pool(existingPool, draft);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("ipv6Pool.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {isEdit ? t("ipv6Pool.editTitle") : t("ipv6Pool.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("ipv6Pool.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pppoe-ipv6-pool-name">{t("poolName")}</Label>
            <Input
              id="pppoe-ipv6-pool-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ipv6-pool1"
              disabled={isEdit}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("ipv6Pool.prefixes")}</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPrefixes([...prefixes, { prefix: "", mask: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> {tc("add")}
              </Button>
            </div>
            {prefixes.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={p.prefix}
                  onChange={(e) => updatePrefix(i, { prefix: e.target.value })}
                  placeholder="2001:db8::/48"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={mask.min}
                  max={mask.max}
                  value={p.mask}
                  onChange={(e) => updatePrefix(i, { mask: e.target.value })}
                  placeholder={t("ipv6Pool.maskPlaceholder", { min: mask.min, max: mask.max })}
                  className="w-32"
                />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setPrefixes(prefixes.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("ipv6Pool.delegatePrefixes")}</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDelegates([...delegates, { prefix: "", delegation_prefix: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> {tc("add")}
              </Button>
            </div>
            {delegates.map((d, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={d.prefix}
                  onChange={(e) => updateDelegate(i, { prefix: e.target.value })}
                  placeholder="2001:db8:1::/48"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={delegation.min}
                  max={delegation.max}
                  value={d.delegation_prefix}
                  onChange={(e) => updateDelegate(i, { delegation_prefix: e.target.value })}
                  placeholder={t("ipv6Pool.delegationPlaceholder", { min: delegation.min, max: delegation.max })}
                  className="w-36"
                />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setDelegates(delegates.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
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
