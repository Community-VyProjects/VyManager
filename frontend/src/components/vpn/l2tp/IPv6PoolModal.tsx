"use client";

import { useState, useEffect } from "react";
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
import { l2tpService, L2TPClientIPv6Pool } from "@/lib/api/l2tp";
import { ApiError } from "@/lib/types/api";

interface IPv6PoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingPool: L2TPClientIPv6Pool | null;
}

export function IPv6PoolModal({
  open,
  onOpenChange,
  onSuccess,
  existingPool,
}: IPv6PoolModalProps) {
  const isEdit = !!existingPool;

  const [name, setName] = useState("");
  const [prefixes, setPrefixes] = useState<Array<{ prefix: string; mask: string }>>([]);
  const [delegates, setDelegates] = useState<Array<{ prefix: string; delegation_prefix: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingPool) {
        setName(existingPool.name);
        setPrefixes((existingPool.prefixes || []).map(p => ({ prefix: p.prefix, mask: p.mask || "" })));
        setDelegates((existingPool.delegates || []).map(d => ({ prefix: d.prefix, delegation_prefix: d.delegation_prefix || "" })));
      } else {
        setName("");
        setPrefixes([{ prefix: "", mask: "" }]);
        setDelegates([]);
      }
      setError(null);
    }
  }, [open, existingPool]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Pool name is required"); return; }

    setLoading(true);
    setError(null);

    try {
      if (isEdit) await l2tpService.deleteIPv6Pool(existingPool!.name);

      const result = await l2tpService.createIPv6Pool(name.trim(), {
        prefixes: prefixes.filter(p => p.prefix).map(p => ({
          prefix: p.prefix,
          mask: p.mask || undefined,
        })),
        delegates: delegates.filter(d => d.prefix).map(d => ({
          prefix: d.prefix,
          delegation_prefix: d.delegation_prefix || undefined,
        })),
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to save IPv6 pool");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to save IPv6 pool");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {isEdit ? "Edit" : "Create"} IPv6 Pool
          </DialogTitle>
          <DialogDescription>Configure an IPv6 client address pool.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Pool Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ipv6-pool1" disabled={isEdit} />
          </div>

          {/* Prefixes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Prefixes</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPrefixes([...prefixes, { prefix: "", mask: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {prefixes.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input value={p.prefix} onChange={(e) => { const np = [...prefixes]; np[i].prefix = e.target.value; setPrefixes(np); }} placeholder="2001:db8::/48" className="flex-1" />
                <Input value={p.mask} onChange={(e) => { const np = [...prefixes]; np[i].mask = e.target.value; setPrefixes(np); }} placeholder="mask (e.g. 64)" className="w-24" />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setPrefixes(prefixes.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          {/* Delegates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Delegate Prefixes</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDelegates([...delegates, { prefix: "", delegation_prefix: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {delegates.map((d, i) => (
              <div key={i} className="flex gap-2">
                <Input value={d.prefix} onChange={(e) => { const nd = [...delegates]; nd[i].prefix = e.target.value; setDelegates(nd); }} placeholder="2001:db8:1::/48" className="flex-1" />
                <Input value={d.delegation_prefix} onChange={(e) => { const nd = [...delegates]; nd[i].delegation_prefix = e.target.value; setDelegates(nd); }} placeholder="delegation (e.g. 56)" className="w-32" />
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Creating..."}</> : isEdit ? "Save Changes" : "Create Pool"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
