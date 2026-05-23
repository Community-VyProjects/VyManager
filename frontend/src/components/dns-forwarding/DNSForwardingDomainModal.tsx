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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { DomainForwarder, NameServerEntry } from "@/lib/api/dns-forwarding";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: DomainForwarder | null;
  onSubmit: (
    domain: string,
    nameServers: NameServerEntry[],
    addnta: boolean,
    recursionDesired: boolean
  ) => Promise<void>;
}

export function DNSForwardingDomainModal({ open, onOpenChange, domain, onSubmit }: Props) {
  const isEdit = !!domain;

  const [domainName, setDomainName] = useState("");
  const [nameServers, setNameServers] = useState<NameServerEntry[]>([]);
  const [nsIp, setNsIp] = useState("");
  const [nsPort, setNsPort] = useState("");
  const [addnta, setAddnta] = useState(false);
  const [recursionDesired, setRecursionDesired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (domain) {
        setDomainName(domain.domain);
        setNameServers([...domain.name_servers]);
        setAddnta(domain.addnta);
        setRecursionDesired(domain.recursion_desired);
      } else {
        setDomainName("");
        setNameServers([]);
        setAddnta(false);
        setRecursionDesired(false);
      }
      setNsIp("");
      setNsPort("");
      setError(null);
    }
  }, [open, domain]);

  const handleAddNs = () => {
    if (!nsIp.trim()) return;
    const portNum = nsPort ? parseInt(nsPort, 10) : null;
    setNameServers([...nameServers, { ip: nsIp.trim(), port: portNum }]);
    setNsIp("");
    setNsPort("");
  };

  const handleRemoveNs = (idx: number) => {
    setNameServers(nameServers.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!isEdit && !domainName.trim()) {
      setError("Domain name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(
        isEdit ? domain!.domain : domainName.trim(),
        nameServers,
        addnta,
        recursionDesired
      );
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Domain Forwarder" : "Add Domain Forwarder"}</DialogTitle>
          <DialogDescription>Forward queries for a specific domain to upstream servers.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 pb-2">
            <div className="space-y-2">
              <Label htmlFor="df-domain">Domain</Label>
              <Input
                id="df-domain"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="e.g. example.com"
                disabled={isEdit}
                className={isEdit ? "bg-muted font-mono" : "font-mono"}
              />
              {isEdit && <p className="text-xs text-muted-foreground">Domain cannot be changed after creation.</p>}
            </div>

            <div className="space-y-3">
              <Label>Name Servers</Label>
              {nameServers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {nameServers.map((ns, idx) => (
                    <Badge key={idx} variant="secondary" className="font-mono gap-1 pr-1">
                      {ns.ip}{ns.port ? `:${ns.port}` : ""}
                      <button onClick={() => handleRemoveNs(idx)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={nsIp}
                  onChange={(e) => setNsIp(e.target.value)}
                  placeholder="IP address"
                  className="flex-1 font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleAddNs()}
                />
                <Input
                  value={nsPort}
                  onChange={(e) => setNsPort(e.target.value)}
                  placeholder="Port"
                  type="number"
                  className="w-24 font-mono"
                  min={1}
                  max={65535}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNs()}
                />
                <Button variant="outline" size="icon" onClick={handleAddNs} disabled={!nsIp.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="df-addnta"
                  checked={addnta}
                  onCheckedChange={(c) => setAddnta(c === true)}
                />
                <Label htmlFor="df-addnta" className="cursor-pointer">Add NTA (Negative Trust Anchor)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="df-rd"
                  checked={recursionDesired}
                  onCheckedChange={(c) => setRecursionDesired(c === true)}
                />
                <Label htmlFor="df-rd" className="cursor-pointer">Recursion Desired</Label>
              </div>
            </div>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Adding..."}</> : isEdit ? "Save Changes" : "Add Domain"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
