"use client";

/**
 * HAProxy Quick Setup Modal
 *
 * VyOS requires BOTH a backend and a service to exist before it will commit
 * the haproxy configuration. This modal creates them together in a single
 * atomic batch request to avoid the error:
 *   "Both 'service' and 'backend' must be configured!"
 */

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
import { AlertCircle, Database, Globe, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { lbService, LBBackend, LBService } from "@/lib/api/load-balancing";

// ============================================================================
// Form types
// ============================================================================

interface ServerForm {
  name: string;
  address: string;
  port: string;
  check: boolean;
}

interface FormState {
  // Backend
  backendName: string;
  backendMode: string;
  backendBalance: string;
  servers: ServerForm[];
  // Service
  serviceName: string;
  serviceMode: string;
  servicePort: string;
  listenAddress: string;
  sslCert: string;
}

const emptyServer = (): ServerForm => ({ name: "", address: "", port: "", check: false });

const emptyForm = (): FormState => ({
  backendName: "backend1",
  backendMode: "http",
  backendBalance: "round-robin",
  servers: [emptyServer()],
  serviceName: "frontend1",
  serviceMode: "http",
  servicePort: "80",
  listenAddress: "",
  sslCert: "",
});

// ============================================================================
// Props
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function HAProxyQuickSetupModal({ open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setError(null);
    }
  }, [open]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setServer = <K extends keyof ServerForm>(idx: number, key: K, val: ServerForm[K]) =>
    setForm((f) => {
      const servers = [...f.servers];
      servers[idx] = { ...servers[idx], [key]: val };
      return { ...f, servers };
    });

  const addServer = () => setForm((f) => ({ ...f, servers: [...f.servers, emptyServer()] }));
  const removeServer = (idx: number) =>
    setForm((f) => ({ ...f, servers: f.servers.filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    if (!form.backendName.trim()) { setError("Backend name is required"); return; }
    if (!form.serviceName.trim()) { setError("Service name is required"); return; }
    if (!form.servicePort) { setError("Service port is required"); return; }

    const backend: LBBackend = {
      name: form.backendName.trim(),
      description: null,
      mode: form.backendMode,
      balance: form.backendBalance,
      health_check: null,
      http_check: null,
      ssl: null,
      timeout: { check: null, connect: null, server: null },
      servers: form.servers
        .filter((s) => s.name.trim())
        .map((s) => ({
          name: s.name.trim(),
          address: s.address || null,
          port: s.port || null,
          backup: false,
          check: s.check,
          check_port: null,
          send_proxy: false,
          send_proxy_v2: false,
        })),
      rules: [],
    };

    const hasSsl = !!form.sslCert.trim();
    const service: LBService = {
      name: form.serviceName.trim(),
      description: null,
      mode: form.serviceMode,
      port: form.servicePort,
      listen_addresses: form.listenAddress.trim()
        ? [{ address: form.listenAddress.trim(), accept_proxy: false }]
        : [],
      backends: [form.backendName.trim()],
      redirect_http_to_https: false,
      ssl: hasSsl ? { certificates: [form.sslCert.trim()] } : null,
      http_compression: null,
      http_response_headers: {},
      logging: {},
      tcp_request: null,
      timeout: { client: null },
      rules: [],
    };

    setLoading(true);
    setError(null);
    try {
      await lbService.quickSetup(backend, service);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>HAProxy Quick Setup</DialogTitle>
          <DialogDescription>
            Create a backend pool and frontend service together in one step.
          </DialogDescription>
        </DialogHeader>

        {/* VyOS constraint notice */}
        <div className="flex gap-2.5 rounded-md bg-blue-500/10 border border-blue-500/20 p-3 text-sm text-blue-700 dark:text-blue-400">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            VyOS requires a <strong>backend</strong> and a <strong>service</strong> to be configured
            simultaneously. This wizard creates both in a single commit.
          </span>
        </div>

        <div className="space-y-5 py-1">
          {/* ---------------------------------------------------------------- */}
          {/* Backend section */}
          {/* ---------------------------------------------------------------- */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10">
                <Database className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <h3 className="text-sm font-semibold">Backend (Server Pool)</h3>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Backend Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.backendName}
                    onChange={(e) => set("backendName", e.target.value)}
                    placeholder="backend1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select value={form.backendMode} onValueChange={(v) => set("backendMode", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="tcp">TCP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Balance</Label>
                  <Select value={form.backendBalance} onValueChange={(v) => set("backendBalance", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round-robin">Round Robin</SelectItem>
                      <SelectItem value="least-conn">Least Connections</SelectItem>
                      <SelectItem value="source-hash">Source Hash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Servers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Servers</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={addServer}>
                    <Plus className="h-3 w-3 mr-1" /> Add Server
                  </Button>
                </div>
                {form.servers.map((srv, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_80px_auto_auto] gap-2 items-end">
                    <div className="space-y-1">
                      {idx === 0 && <Label className="text-xs">Name</Label>}
                      <Input
                        className="h-8 text-sm"
                        value={srv.name}
                        onChange={(e) => setServer(idx, "name", e.target.value)}
                        placeholder="web1"
                      />
                    </div>
                    <div className="space-y-1">
                      {idx === 0 && <Label className="text-xs">Address</Label>}
                      <Input
                        className="h-8 text-sm"
                        value={srv.address}
                        onChange={(e) => setServer(idx, "address", e.target.value)}
                        placeholder="10.0.0.10"
                      />
                    </div>
                    <div className="space-y-1">
                      {idx === 0 && <Label className="text-xs">Port</Label>}
                      <Input
                        className="h-8 text-sm"
                        value={srv.port}
                        onChange={(e) => setServer(idx, "port", e.target.value)}
                        placeholder="8080"
                      />
                    </div>
                    <div className="space-y-1">
                      {idx === 0 && <Label className="text-xs">Check</Label>}
                      <div className="h-8 flex items-center">
                        <Checkbox
                          checked={srv.check}
                          onCheckedChange={(c) => setServer(idx, "check", !!c)}
                        />
                      </div>
                    </div>
                    <div className={idx === 0 ? "pt-5" : ""}>
                      {form.servers.length > 1 && (
                        <Button
                          type="button" variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => removeServer(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* ---------------------------------------------------------------- */}
          {/* Service section */}
          {/* ---------------------------------------------------------------- */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10">
                <Globe className="h-3.5 w-3.5 text-green-500" />
              </div>
              <h3 className="text-sm font-semibold">Service (Frontend Listener)</h3>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Service Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.serviceName}
                    onChange={(e) => set("serviceName", e.target.value)}
                    placeholder="frontend1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select value={form.serviceMode} onValueChange={(v) => set("serviceMode", v)}>
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
                    value={form.servicePort}
                    onChange={(e) => set("servicePort", e.target.value)}
                    placeholder="80"
                    type="number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    Listen Address
                    <span className="ml-1 text-xs text-muted-foreground">(optional, defaults to all)</span>
                  </Label>
                  <Input
                    value={form.listenAddress}
                    onChange={(e) => set("listenAddress", e.target.value)}
                    placeholder="0.0.0.0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    SSL Certificate
                    <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    value={form.sslCert}
                    onChange={(e) => set("sslCert", e.target.value)}
                    placeholder="my-cert (from PKI)"
                  />
                </div>
              </div>

              <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
                <Info className="h-3.5 w-3.5 shrink-0" />
                This service will automatically route traffic to the <Badge variant="outline" className="text-xs mx-0.5">{form.backendName || "backend"}</Badge> backend.
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Backend + Service
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
