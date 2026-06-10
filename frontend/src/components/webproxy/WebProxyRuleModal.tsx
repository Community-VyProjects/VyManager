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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { MultiValueInput } from "./MultiValueInput";
import type { SquidGuardRule, WebProxyCapabilities } from "@/lib/api/webproxy";

const NONE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: SquidGuardRule | null;
  caps: WebProxyCapabilities | null;
  sourceGroups: string[];
  timePeriods: string[];
  existingNumbers: string[];
  onSubmit: (rule: SquidGuardRule, isEdit: boolean) => Promise<void>;
}

const emptyRule = (): SquidGuardRule => ({
  number: "",
  allow_categories: [],
  block_categories: [],
  log: [],
  local_block: [],
  local_block_keyword: [],
  local_block_url: [],
  local_ok: [],
  local_ok_url: [],
  allow_ipaddr_url: false,
  enable_safe_search: false,
});

export function WebProxyRuleModal({
  open,
  onOpenChange,
  rule,
  caps,
  sourceGroups,
  timePeriods,
  existingNumbers,
  onSubmit,
}: Props) {
  const isEdit = !!rule;
  const [form, setForm] = useState<SquidGuardRule>(emptyRule());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(rule ? { ...rule } : emptyRule());
      setError(null);
    }
  }, [open, rule]);

  const update = (patch: Partial<SquidGuardRule>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async () => {
    const num = form.number.trim();
    if (!num) {
      setError("Rule number is required");
      return;
    }
    if (!isEdit && existingNumbers.includes(num)) {
      setError(`Rule ${num} already exists`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ ...form, number: num }, isEdit);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Rule ${rule?.number}` : "Add Filter Rule"}</DialogTitle>
          <DialogDescription>Apply a filtering policy to a source-group, optionally limited to a time-period.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 pb-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-number">Rule Number</Label>
                <Input id="rule-number" type="number" min={1} max={1024} value={form.number} onChange={(e) => update({ number: e.target.value })} placeholder="10" disabled={isEdit} className={isEdit ? "bg-muted font-mono" : "font-mono"} />
              </div>
              <div className="space-y-2">
                <Label>Default Action</Label>
                <Select value={form.default_action ?? ""} onValueChange={(v) => update({ default_action: v })}>
                  <SelectTrigger><SelectValue placeholder="allow" /></SelectTrigger>
                  <SelectContent>
                    {(caps?.options.default_action ?? ["allow", "block"]).map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source Group</Label>
                <Select value={form.source_group ?? NONE} onValueChange={(v) => update({ source_group: v === NONE ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Any (no source-group)</SelectItem>
                    {sourceGroups.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time Period</Label>
                <Select value={form.time_period ?? NONE} onValueChange={(v) => update({ time_period: v === NONE ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Always" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Always (no time-period)</SelectItem>
                    {timePeriods.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="rule-redirect">Redirect URL</Label>
                <Input id="rule-redirect" value={form.redirect_url ?? ""} onChange={(e) => update({ redirect_url: e.target.value })} placeholder="block.vyos.net" className="font-mono" />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="rule-ipaddr" checked={form.allow_ipaddr_url} onCheckedChange={(c) => update({ allow_ipaddr_url: c === true })} />
                <Label htmlFor="rule-ipaddr" className="cursor-pointer">Allow IP-address URLs</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="rule-safe" checked={form.enable_safe_search} onCheckedChange={(c) => update({ enable_safe_search: c === true })} />
                <Label htmlFor="rule-safe" className="cursor-pointer">Enable safe search</Label>
              </div>
            </div>

            <MultiValueInput label="Allow Categories" values={form.allow_categories} onChange={(v) => update({ allow_categories: v })} placeholder="e.g. news" />
            <MultiValueInput label="Block Categories" values={form.block_categories} onChange={(v) => update({ block_categories: v })} placeholder="e.g. ads" />
            <MultiValueInput label="Log Categories" values={form.log} onChange={(v) => update({ log: v })} placeholder="all or a category" />
            <MultiValueInput label="Local Block (sites)" values={form.local_block} onChange={(v) => update({ local_block: v })} placeholder="IP or FQDN" />
            <MultiValueInput label="Local Block Keywords" values={form.local_block_keyword} onChange={(v) => update({ local_block_keyword: v })} placeholder="keyword or regex" />
            <MultiValueInput label="Local Block URLs" values={form.local_block_url} onChange={(v) => update({ local_block_url: v })} placeholder="example.com/path" />
            <MultiValueInput label="Local Allow (sites)" values={form.local_ok} onChange={(v) => update({ local_ok: v })} placeholder="IP or FQDN" />
            <MultiValueInput label="Local Allow URLs" values={form.local_ok_url} onChange={(v) => update({ local_ok_url: v })} placeholder="example.com/path" />
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : isEdit ? "Save Changes" : "Add Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
