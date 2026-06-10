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
import { AlertCircle, Loader2 } from "lucide-react";
import { MultiValueInput } from "./MultiValueInput";
import type { WebProxyConfig, WebProxyCapabilities } from "@/lib/api/webproxy";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: WebProxyConfig | null;
  caps: WebProxyCapabilities | null;
  onSubmit: (config: WebProxyConfig) => Promise<void>;
}

const numOrNull = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
};

export function WebProxySettingsModal({ open, onOpenChange, config, caps, onSubmit }: Props) {
  const [appendDomain, setAppendDomain] = useState("");
  const [defaultPort, setDefaultPort] = useState("");
  const [cacheSize, setCacheSize] = useState("");
  const [memCacheSize, setMemCacheSize] = useState("");
  const [maxObjectSize, setMaxObjectSize] = useState("");
  const [minObjectSize, setMinObjectSize] = useState("");
  const [replyBodyMaxSize, setReplyBodyMaxSize] = useState("");
  const [outgoingAddress, setOutgoingAddress] = useState("");
  const [disableAccessLog, setDisableAccessLog] = useState(false);
  const [domainBlock, setDomainBlock] = useState<string[]>([]);
  const [domainNoncache, setDomainNoncache] = useState<string[]>([]);
  const [replyBlockMime, setReplyBlockMime] = useState<string[]>([]);
  const [safePorts, setSafePorts] = useState<string[]>([]);
  const [sslSafePorts, setSslSafePorts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && config) {
      setAppendDomain(config.append_domain ?? "");
      setDefaultPort(config.default_port != null ? String(config.default_port) : "");
      setCacheSize(config.cache_size != null ? String(config.cache_size) : "");
      setMemCacheSize(config.mem_cache_size != null ? String(config.mem_cache_size) : "");
      setMaxObjectSize(config.maximum_object_size != null ? String(config.maximum_object_size) : "");
      setMinObjectSize(config.minimum_object_size != null ? String(config.minimum_object_size) : "");
      setReplyBodyMaxSize(config.reply_body_max_size != null ? String(config.reply_body_max_size) : "");
      setOutgoingAddress(config.outgoing_address ?? "");
      setDisableAccessLog(config.disable_access_log);
      setDomainBlock([...config.domain_block]);
      setDomainNoncache([...config.domain_noncache]);
      setReplyBlockMime([...config.reply_block_mime]);
      setSafePorts([...config.safe_ports]);
      setSslSafePorts([...config.ssl_safe_ports]);
      setError(null);
    }
  }, [open, config]);

  const handleSubmit = async () => {
    if (!config) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        ...config,
        append_domain: appendDomain.trim() || null,
        default_port: numOrNull(defaultPort),
        cache_size: numOrNull(cacheSize),
        mem_cache_size: numOrNull(memCacheSize),
        maximum_object_size: numOrNull(maxObjectSize),
        minimum_object_size: numOrNull(minObjectSize),
        reply_body_max_size: numOrNull(replyBodyMaxSize),
        outgoing_address: outgoingAddress.trim() || null,
        disable_access_log: disableAccessLog,
        domain_block: domainBlock,
        domain_noncache: domainNoncache,
        reply_block_mime: replyBlockMime,
        safe_ports: safePorts,
        ssl_safe_ports: sslSafePorts,
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
          <DialogTitle>Web Proxy Settings</DialogTitle>
          <DialogDescription>Global Squid proxy ports, cache sizing and content controls.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 pb-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wp-default-port">Default Port</Label>
                <Input id="wp-default-port" type="number" value={defaultPort} onChange={(e) => setDefaultPort(e.target.value)} placeholder="3128" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-outgoing">Outgoing Address</Label>
                <Input id="wp-outgoing" value={outgoingAddress} onChange={(e) => setOutgoingAddress(e.target.value)} placeholder="e.g. 203.0.113.1" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-cache-size">Disk Cache Size (MB)</Label>
                <Input id="wp-cache-size" type="number" value={cacheSize} onChange={(e) => setCacheSize(e.target.value)} placeholder="100 (0 disables)" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-mem-cache">Memory Cache Size (MB)</Label>
                <Input id="wp-mem-cache" type="number" value={memCacheSize} onChange={(e) => setMemCacheSize(e.target.value)} placeholder="20" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-max-obj">Max Object Size (KB)</Label>
                <Input id="wp-max-obj" type="number" value={maxObjectSize} onChange={(e) => setMaxObjectSize(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-min-obj">Min Object Size (KB)</Label>
                <Input id="wp-min-obj" type="number" value={minObjectSize} onChange={(e) => setMinObjectSize(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-reply-max">Reply Body Max Size (KB)</Label>
                <Input id="wp-reply-max" type="number" value={replyBodyMaxSize} onChange={(e) => setReplyBodyMaxSize(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-append">Append Domain</Label>
                <Input id="wp-append" value={appendDomain} onChange={(e) => setAppendDomain(e.target.value)} placeholder=".example.com" className="font-mono" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="wp-disable-log" checked={disableAccessLog} onCheckedChange={(c) => setDisableAccessLog(c === true)} />
              <Label htmlFor="wp-disable-log" className="cursor-pointer">Disable access logging</Label>
            </div>

            <MultiValueInput label="Safe Ports" values={safePorts} onChange={setSafePorts} type="number" placeholder="e.g. 8080" hint="Allowed destination ports (1-1024). Common ports are allowed by default." />
            <MultiValueInput label="SSL Safe Ports" values={sslSafePorts} onChange={setSslSafePorts} type="number" placeholder="e.g. 8443" hint="Allowed CONNECT (HTTPS) ports. 443 is allowed by default." />
            <MultiValueInput label="Blocked Domains" values={domainBlock} onChange={setDomainBlock} placeholder="e.g. bad.example.com" />
            <MultiValueInput label="Non-cached Domains" values={domainNoncache} onChange={setDomainNoncache} placeholder="e.g. dynamic.example.com" />
            <MultiValueInput
              label="Blocked MIME Types"
              values={replyBlockMime}
              onChange={setReplyBlockMime}
              placeholder="e.g. application/pdf"
              suggestions={caps?.options.reply_block_mime}
              hint="Reply content types to block."
            />
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
