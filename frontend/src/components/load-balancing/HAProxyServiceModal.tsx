"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertCircle, ChevronDown, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { lbService, LBService, LBBackend, LBCapabilities } from "@/lib/api/load-balancing";

interface FormState {
  name: string;
  description: string;
  mode: string;
  port: string;
  listen_addresses: string[];
  backends: string[];
  redirect_http_to_https: boolean;
  ssl_certificates: string[];
  http_compression_algorithm: string;
  http_compression_mime_types: string[];
  new_address: string;
  new_cert: string;
  new_mime: string;
}

const emptyForm = (): FormState => ({
  name: "", description: "", mode: "http", port: "", listen_addresses: [],
  backends: [], redirect_http_to_https: false, ssl_certificates: [],
  http_compression_algorithm: "", http_compression_mime_types: [],
  new_address: "", new_cert: "", new_mime: "",
});

function serviceToForm(s: LBService): FormState {
  return {
    name: s.name,
    description: s.description ?? "",
    mode: s.mode ?? "http",
    port: s.port ?? "",
    listen_addresses: s.listen_addresses.map((la) => la.address),
    backends: [...s.backends],
    redirect_http_to_https: s.redirect_http_to_https,
    ssl_certificates: s.ssl?.certificates ?? [],
    http_compression_algorithm: s.http_compression?.algorithm ?? "",
    http_compression_mime_types: s.http_compression?.mime_types ?? [],
    new_address: "", new_cert: "", new_mime: "",
  };
}

function formToService(f: FormState, existingRules: LBService["rules"]): LBService {
  const hasSsl = f.ssl_certificates.length > 0;
  const hasCompression = !!(f.http_compression_algorithm || f.http_compression_mime_types.length);
  return {
    name: f.name.trim(),
    description: f.description || null,
    mode: f.mode || null,
    port: f.port || null,
    listen_addresses: f.listen_addresses.map((a) => ({ address: a, accept_proxy: false })),
    backends: [...f.backends],
    redirect_http_to_https: f.redirect_http_to_https,
    ssl: hasSsl ? { certificates: f.ssl_certificates } : null,
    http_compression: hasCompression ? {
      algorithm: f.http_compression_algorithm || null,
      mime_types: f.http_compression_mime_types,
    } : null,
    http_response_headers: {},
    logging: {},
    tcp_request: null,
    timeout: { client: null },
    rules: existingRules,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  service?: LBService | null;
  backends: LBBackend[];
  capabilities: LBCapabilities | null;
  onSuccess: () => void;
}

export function HAProxyServiceModal({ open, onOpenChange, service, backends, capabilities, onSuccess }: Props) {
  const isEdit = !!service;
  const isV15 = capabilities?.features.http_compression.supported ?? false;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sslOpen, setSslOpen] = useState(false);
  const [compressionOpen, setCompressionOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(service ? serviceToForm(service) : emptyForm());
      setError(null);
      setSslOpen(false);
      setCompressionOpen(false);
    }
  }, [open, service]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const addAddress = () => {
    const addr = form.new_address.trim();
    if (!addr || form.listen_addresses.includes(addr)) return;
    setForm((f) => ({ ...f, listen_addresses: [...f.listen_addresses, addr], new_address: "" }));
  };
  const removeAddress = (addr: string) =>
    setForm((f) => ({ ...f, listen_addresses: f.listen_addresses.filter((a) => a !== addr) }));

  const toggleBackend = (name: string) =>
    setForm((f) => ({
      ...f,
      backends: f.backends.includes(name)
        ? f.backends.filter((b) => b !== name)
        : [...f.backends, name],
    }));

  const addCert = () => {
    const cert = form.new_cert.trim();
    if (!cert || form.ssl_certificates.includes(cert)) return;
    setForm((f) => ({ ...f, ssl_certificates: [...f.ssl_certificates, cert], new_cert: "" }));
  };
  const removeCert = (cert: string) =>
    setForm((f) => ({ ...f, ssl_certificates: f.ssl_certificates.filter((c) => c !== cert) }));

  const addMime = () => {
    const mt = form.new_mime.trim();
    if (!mt || form.http_compression_mime_types.includes(mt)) return;
    setForm((f) => ({
      ...f,
      http_compression_mime_types: [...f.http_compression_mime_types, mt],
      new_mime: "",
    }));
  };
  const removeMime = (mt: string) =>
    setForm((f) => ({
      ...f,
      http_compression_mime_types: f.http_compression_mime_types.filter((m) => m !== mt),
    }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Service name is required"); return; }
    if (!form.port) { setError("Port is required"); return; }

    setLoading(true);
    setError(null);
    try {
      const data = formToService(form, service?.rules ?? []);
      if (isEdit && service) {
        await lbService.updateService(service, data);
      } else {
        await lbService.createService(data);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Service" : "Add Service"}</DialogTitle>
          <DialogDescription>
            Configure a HAProxy frontend service (listener).
            {isEdit && " Routing rules are managed on the service detail page."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="https-frontend"
                disabled={isEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => set("mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Port <span className="text-destructive">*</span></Label>
              <Input
                value={form.port}
                onChange={(e) => set("port", e.target.value)}
                placeholder="443"
                type="number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Listen Addresses</Label>
            <div className="flex gap-2">
              <Input
                value={form.new_address}
                onChange={(e) => set("new_address", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAddress())}
                placeholder="0.0.0.0 or 192.168.1.1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addAddress}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {form.listen_addresses.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.listen_addresses.map((addr) => (
                  <Badge key={addr} variant="secondary" className="gap-1 pr-1">
                    {addr}
                    <button onClick={() => removeAddress(addr)} className="hover:text-destructive ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Backends</Label>
            {backends.length === 0 ? (
              <p className="text-sm text-muted-foreground">No backends configured yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {backends.map((be) => (
                  <label key={be.name} className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border p-2 hover:bg-accent/50">
                    <Checkbox
                      checked={form.backends.includes(be.name)}
                      onCheckedChange={() => toggleBackend(be.name)}
                    />
                    <span>{be.name}</span>
                    {be.mode && <Badge variant="outline" className="text-xs ml-auto">{be.mode}</Badge>}
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={form.redirect_http_to_https}
              onCheckedChange={(c) => set("redirect_http_to_https", !!c)}
            />
            Redirect HTTP to HTTPS
          </label>

          <Separator />

          <Collapsible open={sslOpen} onOpenChange={setSslOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-sm font-semibold hover:text-foreground text-muted-foreground transition-colors">
              SSL/TLS Settings
              <ChevronDown className={cn("h-4 w-4 transition-transform", sslOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="flex gap-2">
                <Input
                  value={form.new_cert}
                  onChange={(e) => set("new_cert", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCert())}
                  placeholder="Certificate name (from PKI)"
                />
                <Button type="button" variant="outline" size="sm" onClick={addCert}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {form.ssl_certificates.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.ssl_certificates.map((cert) => (
                    <Badge key={cert} variant="secondary" className="gap-1 pr-1">
                      {cert}
                      <button onClick={() => removeCert(cert)} className="hover:text-destructive ml-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {isV15 && (
            <Collapsible open={compressionOpen} onOpenChange={setCompressionOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-sm font-semibold hover:text-foreground text-muted-foreground transition-colors">
                HTTP Compression
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">VyOS 1.5+</Badge>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", compressionOpen && "rotate-180")} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Algorithm</Label>
                  <Select
                    value={form.http_compression_algorithm || "_none"}
                    onValueChange={(v) => set("http_compression_algorithm", v === "_none" ? "" : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      <SelectItem value="gzip">gzip</SelectItem>
                      <SelectItem value="deflate">deflate</SelectItem>
                      <SelectItem value="raw-deflate">raw-deflate</SelectItem>
                      <SelectItem value="identity">identity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">MIME Types</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.new_mime}
                      onChange={(e) => set("new_mime", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMime())}
                      placeholder="text/html"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addMime}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {form.http_compression_mime_types.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {form.http_compression_mime_types.map((mt) => (
                        <Badge key={mt} variant="secondary" className="gap-1 pr-1">
                          {mt}
                          <button onClick={() => removeMime(mt)} className="hover:text-destructive ml-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {error && (
          <div className="flex gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
