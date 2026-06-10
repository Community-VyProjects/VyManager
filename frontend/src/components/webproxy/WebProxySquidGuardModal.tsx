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
import type { SquidGuard, WebProxyCapabilities } from "@/lib/api/webproxy";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squidguard: SquidGuard | null;
  caps: WebProxyCapabilities | null;
  onSubmit: (sg: SquidGuard) => Promise<void>;
}

const numOrNull = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
};

const CATEGORY_HINT = "Categories come from the squidGuard blacklist database installed on the router.";

export function WebProxySquidGuardModal({ open, onOpenChange, squidguard, caps, onSubmit }: Props) {
  const [defaultAction, setDefaultAction] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [autoUpdateHour, setAutoUpdateHour] = useState("");
  const [allowIpaddrUrl, setAllowIpaddrUrl] = useState(false);
  const [enableSafeSearch, setEnableSafeSearch] = useState(false);
  const [allowCategories, setAllowCategories] = useState<string[]>([]);
  const [blockCategories, setBlockCategories] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [localBlock, setLocalBlock] = useState<string[]>([]);
  const [localBlockKeyword, setLocalBlockKeyword] = useState<string[]>([]);
  const [localBlockUrl, setLocalBlockUrl] = useState<string[]>([]);
  const [localOk, setLocalOk] = useState<string[]>([]);
  const [localOkUrl, setLocalOkUrl] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && squidguard) {
      setDefaultAction(squidguard.default_action ?? "");
      setRedirectUrl(squidguard.redirect_url ?? "");
      setAutoUpdateHour(squidguard.auto_update_hour != null ? String(squidguard.auto_update_hour) : "");
      setAllowIpaddrUrl(squidguard.allow_ipaddr_url);
      setEnableSafeSearch(squidguard.enable_safe_search);
      setAllowCategories([...squidguard.allow_categories]);
      setBlockCategories([...squidguard.block_categories]);
      setLog([...squidguard.log]);
      setLocalBlock([...squidguard.local_block]);
      setLocalBlockKeyword([...squidguard.local_block_keyword]);
      setLocalBlockUrl([...squidguard.local_block_url]);
      setLocalOk([...squidguard.local_ok]);
      setLocalOkUrl([...squidguard.local_ok_url]);
      setError(null);
    }
  }, [open, squidguard]);

  const handleSubmit = async () => {
    if (!squidguard) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        ...squidguard,
        default_action: defaultAction || null,
        redirect_url: redirectUrl.trim() || null,
        auto_update_hour: numOrNull(autoUpdateHour),
        allow_ipaddr_url: allowIpaddrUrl,
        enable_safe_search: enableSafeSearch,
        allow_categories: allowCategories,
        block_categories: blockCategories,
        log,
        local_block: localBlock,
        local_block_keyword: localBlockKeyword,
        local_block_url: localBlockUrl,
        local_ok: localOk,
        local_ok_url: localOkUrl,
      });
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
          <DialogTitle>squidGuard Filtering</DialogTitle>
          <DialogDescription>Default policy and global allow/block lists applied to all traffic.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 pb-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Action</Label>
                <Select value={defaultAction} onValueChange={setDefaultAction}>
                  <SelectTrigger><SelectValue placeholder="allow" /></SelectTrigger>
                  <SelectContent>
                    {(caps?.options.default_action ?? ["allow", "block"]).map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sg-update-hour">Auto-update Hour (0-23)</Label>
                <Input id="sg-update-hour" type="number" min={0} max={23} value={autoUpdateHour} onChange={(e) => setAutoUpdateHour(e.target.value)} placeholder="0" className="font-mono" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="sg-redirect">Redirect URL</Label>
                <Input id="sg-redirect" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="block.vyos.net" className="font-mono" />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="sg-ipaddr" checked={allowIpaddrUrl} onCheckedChange={(c) => setAllowIpaddrUrl(c === true)} />
                <Label htmlFor="sg-ipaddr" className="cursor-pointer">Allow IP-address URLs</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="sg-safe" checked={enableSafeSearch} onCheckedChange={(c) => setEnableSafeSearch(c === true)} />
                <Label htmlFor="sg-safe" className="cursor-pointer">Enable safe search</Label>
              </div>
            </div>

            <MultiValueInput label="Allow Categories" values={allowCategories} onChange={setAllowCategories} placeholder="e.g. news" hint={CATEGORY_HINT} />
            <MultiValueInput label="Block Categories" values={blockCategories} onChange={setBlockCategories} placeholder="e.g. ads" hint={CATEGORY_HINT} />
            <MultiValueInput label="Log Categories" values={log} onChange={setLog} placeholder="all or a category" />
            <MultiValueInput label="Local Block (sites)" values={localBlock} onChange={setLocalBlock} placeholder="IP or FQDN" />
            <MultiValueInput label="Local Block Keywords" values={localBlockKeyword} onChange={setLocalBlockKeyword} placeholder="keyword or regex" />
            <MultiValueInput label="Local Block URLs" values={localBlockUrl} onChange={setLocalBlockUrl} placeholder="example.com/path" />
            <MultiValueInput label="Local Allow (sites)" values={localOk} onChange={setLocalOk} placeholder="IP or FQDN" />
            <MultiValueInput label="Local Allow URLs" values={localOkUrl} onChange={setLocalOkUrl} placeholder="example.com/path" />
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Filtering"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
