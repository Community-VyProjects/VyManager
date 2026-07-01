"use client";

import { useEffect, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Check, Copy, KeyRound } from "lucide-react";
import { tokenService, type CreateTokenRequest } from "@/lib/api/tokens";
import { sessionService, type Site, type Instance } from "@/lib/api/session";
import { ApiError } from "@/lib/types/api";

interface CreateTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

type AccessMode = "all" | "sites" | "instances";

const EXPIRY_OPTIONS = [
  { label: "Never", value: "0" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "1 year", value: "365" },
];

export function CreateTokenDialog({ open, onOpenChange, onCreated }: CreateTokenDialogProps) {
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("0");
  const [readOnly, setReadOnly] = useState(true);
  const [accessMode, setAccessMode] = useState<AccessMode>("all");

  const [sites, setSites] = useState<Site[]>([]);
  const [instancesBySite, setInstancesBySite] = useState<Record<string, Instance[]>>({});
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [selectedInstances, setSelectedInstances] = useState<Set<string>>(new Set());

  const [loadingScope, setLoadingScope] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset everything whenever the dialog is opened fresh.
  useEffect(() => {
    if (open) {
      setName("");
      setExpiry("0");
      setReadOnly(true);
      setAccessMode("all");
      setSelectedSites(new Set());
      setSelectedInstances(new Set());
      setError(null);
      setCreatedToken(null);
      setCopied(false);
    }
  }, [open]);

  // Lazily load sites (and their instances) when a scoped mode is chosen.
  useEffect(() => {
    if (!open || accessMode === "all" || sites.length > 0) return;
    let cancelled = false;
    setLoadingScope(true);
    (async () => {
      try {
        const loadedSites = await sessionService.listSites();
        const instanceLists = await Promise.all(
          loadedSites.map((s) => sessionService.listInstances(s.id).catch(() => []))
        );
        if (cancelled) return;
        const map: Record<string, Instance[]> = {};
        loadedSites.forEach((s, i) => {
          map[s.id] = instanceLists[i];
        });
        setSites(loadedSites);
        setInstancesBySite(map);
      } catch {
        if (!cancelled) setError("Could not load sites and instances.");
      } finally {
        if (!cancelled) setLoadingScope(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, accessMode, sites.length]);

  const toggle = (set: Set<string>, id: string): Set<string> => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (accessMode === "sites" && selectedSites.size === 0) {
      setError("Select at least one site, or choose a different access option.");
      return;
    }
    if (accessMode === "instances" && selectedInstances.size === 0) {
      setError("Select at least one instance, or choose a different access option.");
      return;
    }

    const body: CreateTokenRequest = {
      name: name.trim(),
      expires_in_days: expiry === "0" ? null : Number(expiry),
      scopes: readOnly ? ["read"] : [],
      allowed_site_ids: accessMode === "sites" ? [...selectedSites] : [],
      allowed_instance_ids: accessMode === "instances" ? [...selectedInstances] : [],
    };

    setSubmitting(true);
    try {
      const result = await tokenService.create(body);
      setCreatedToken(result.token);
      onCreated();
    } catch (err) {
      setError((err as ApiError).message || "Failed to create token.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToken = async () => {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        {createdToken ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Token created
              </DialogTitle>
              <DialogDescription>
                Copy it now — for security it will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 text-sm font-mono">
                {createdToken}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={copyToken}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Create API token
              </DialogTitle>
              <DialogDescription>
                A personal token that acts as you. It can never exceed your own permissions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="token-name">Name</Label>
                <Input
                  id="token-name"
                  placeholder="e.g. mcp-server"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Expiry</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="token-readonly"
                  checked={readOnly}
                  onCheckedChange={(c) => setReadOnly(c === true)}
                />
                <div className="grid gap-1 leading-none">
                  <Label htmlFor="token-readonly">Read-only</Label>
                  <p className="text-xs text-muted-foreground">
                    Cannot make configuration changes (recommended).
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Access</Label>
                <RadioGroup value={accessMode} onValueChange={(v) => setAccessMode(v as AccessMode)}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="all" id="access-all" />
                    <Label htmlFor="access-all" className="font-normal">
                      All instances I can access
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="sites" id="access-sites" />
                    <Label htmlFor="access-sites" className="font-normal">
                      Specific sites
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="instances" id="access-instances" />
                    <Label htmlFor="access-instances" className="font-normal">
                      Specific instances
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {accessMode !== "all" && (
                <div className="rounded-md border p-3">
                  {loadingScope ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : accessMode === "sites" ? (
                    <div className="space-y-2">
                      {sites.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedSites.has(s.id)}
                            onCheckedChange={() => setSelectedSites((prev) => toggle(prev, s.id))}
                          />
                          {s.name}
                        </label>
                      ))}
                      {sites.length === 0 && (
                        <p className="text-sm text-muted-foreground">No sites available.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sites.map((s) => (
                        <div key={s.id} className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">{s.name}</p>
                          {(instancesBySite[s.id] ?? []).map((inst) => (
                            <label key={inst.id} className="flex items-center gap-2 pl-2 text-sm">
                              <Checkbox
                                checked={selectedInstances.has(inst.id)}
                                onCheckedChange={() =>
                                  setSelectedInstances((prev) => toggle(prev, inst.id))
                                }
                              />
                              {inst.name}
                            </label>
                          ))}
                          {(instancesBySite[s.id] ?? []).length === 0 && (
                            <p className="pl-2 text-xs text-muted-foreground">No instances.</p>
                          )}
                        </div>
                      ))}
                      {sites.length === 0 && (
                        <p className="text-sm text-muted-foreground">No instances available.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !name.trim()}>
                {submitting ? "Creating…" : "Create token"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
