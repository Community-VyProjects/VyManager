"use client";

import { useMemo, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { vrfService, VrfBatchOperation } from "@/lib/api/vrf";

type Raw = Record<string, unknown>;

interface Cache {
  name: string;
  port: string;
  preference: string;
  sourceAddress: string;
  sshUsername: string;
  sshKey: string;
}

interface RpkiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vrfName: string;
  rpkiRaw: Raw | null | undefined;
  canWrite: boolean;
  onSaved: () => void;
}

function str(v: unknown): string {
  return typeof v === "string" || typeof v === "number" ? String(v) : "";
}

function parseCaches(node: unknown): Cache[] {
  if (!node || typeof node !== "object") return [];
  return Object.entries(node as Raw).map(([name, raw]) => {
    const c = (raw && typeof raw === "object" ? raw : {}) as Raw;
    const ssh = (c.ssh && typeof c.ssh === "object" ? c.ssh : {}) as Raw;
    return {
      name,
      port: str(c.port),
      preference: str(c.preference),
      sourceAddress: str(c["source-address"]),
      sshUsername: str(ssh.username),
      sshKey: str(ssh.key),
    };
  });
}

export function RpkiModal({ open, onOpenChange, vrfName, rpkiRaw, canWrite, onSaved }: RpkiModalProps) {
  const initial = useMemo(
    () => ({
      expire: str(rpkiRaw?.["expire-interval"]),
      polling: str(rpkiRaw?.["polling-period"]),
      retry: str(rpkiRaw?.["retry-interval"]),
      caches: parseCaches(rpkiRaw?.cache),
      origNames: Object.keys((rpkiRaw?.cache as Raw) ?? {}),
    }),
    [rpkiRaw]
  );

  const [expire, setExpire] = useState(initial.expire);
  const [polling, setPolling] = useState(initial.polling);
  const [retry, setRetry] = useState(initial.retry);
  const [caches, setCaches] = useState<Cache[]>(initial.caches);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seedKey = `${open}:${initial.origNames.join(",")}`;
  const [seed, setSeed] = useState(seedKey);
  if (seedKey !== seed) {
    setSeed(seedKey);
    setExpire(initial.expire);
    setPolling(initial.polling);
    setRetry(initial.retry);
    setCaches(initial.caches);
    setError(null);
  }

  const updateCache = (i: number, patch: Partial<Cache>) =>
    setCaches(caches.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const buildOps = (): VrfBatchOperation[] => {
    const ops: VrfBatchOperation[] = [];
    const globalField = (op: string, value: string) => {
      const v = value.trim();
      ops.push(v ? { op: `set_${op}`, value: `${vrfName},${v}` } : { op: `delete_${op}`, value: vrfName });
    };
    globalField("vrf_rpki_expire_interval", expire);
    globalField("vrf_rpki_polling_period", polling);
    globalField("vrf_rpki_retry_interval", retry);

    const names = caches.map((c) => c.name.trim()).filter(Boolean);
    for (const orig of initial.origNames) {
      if (!names.includes(orig)) ops.push({ op: "delete_vrf_rpki_cache", value: `${vrfName},${orig}` });
    }
    for (const c of caches) {
      const n = c.name.trim();
      if (!n) continue;
      ops.push({ op: "set_vrf_rpki_cache", value: `${vrfName},${n}` });
      const field = (op: string, value: string) => {
        const v = value.trim();
        ops.push(v ? { op: `set_${op}`, value: `${vrfName},${n},${v}` } : { op: `delete_${op}`, value: `${vrfName},${n}` });
      };
      field("vrf_rpki_cache_port", c.port);
      field("vrf_rpki_cache_preference", c.preference);
      field("vrf_rpki_cache_source_address", c.sourceAddress);
      field("vrf_rpki_cache_ssh_username", c.sshUsername);
      field("vrf_rpki_cache_ssh_key", c.sshKey);
    }
    return ops;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await vrfService.batchConfigure(buildOps());
      if (!result.success) {
        setError(result.error || "Operation failed");
        return;
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const disabled = !canWrite || saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh]">
        <DialogHeader>
          <DialogTitle>RPKI — {vrfName}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[64vh] pr-4">
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-semibold mb-2">Intervals</h4>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Expire interval" value={expire} type="number" disabled={disabled} onChange={setExpire} />
                <Field label="Polling period" value={polling} type="number" disabled={disabled} onChange={setPolling} />
                <Field label="Retry interval" value={retry} type="number" disabled={disabled} onChange={setRetry} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Caches</h4>
                {!disabled && (
                  <Button size="sm" variant="outline" onClick={() => setCaches([...caches, { name: "", port: "", preference: "", sourceAddress: "", sshUsername: "", sshKey: "" }])}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add cache
                  </Button>
                )}
              </div>
              {caches.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
              {caches.map((c, i) => (
                <div key={i} className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input className="h-8 font-mono" placeholder="Cache name / address" value={c.name} disabled={disabled} onChange={(e) => updateCache(i, { name: e.target.value })} />
                    {!disabled && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCaches(caches.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Port" value={c.port} type="number" disabled={disabled} onChange={(v) => updateCache(i, { port: v })} />
                    <Field label="Preference" value={c.preference} type="number" disabled={disabled} onChange={(v) => updateCache(i, { preference: v })} />
                    <Field label="Source address" value={c.sourceAddress} disabled={disabled} onChange={(v) => updateCache(i, { sourceAddress: v })} />
                    <Field label="SSH username" value={c.sshUsername} disabled={disabled} onChange={(v) => updateCache(i, { sshUsername: v })} />
                    <Field label="SSH key" value={c.sshKey} disabled={disabled} onChange={(v) => updateCache(i, { sshKey: v })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <pre className="whitespace-pre-wrap break-words font-mono text-xs">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={disabled}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <Input className="h-8" type={type} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
