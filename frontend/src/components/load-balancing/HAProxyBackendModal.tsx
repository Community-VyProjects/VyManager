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
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertCircle, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { lbService, LBBackend, LBCapabilities } from "@/lib/api/load-balancing";

interface ServerForm {
  name: string;
  address: string;
  port: string;
  backup: boolean;
  check: boolean;
  check_port: string;
  send_proxy: boolean;
}

interface FormState {
  name: string;
  description: string;
  mode: string;
  balance: string;
  health_check: string;
  http_check_method: string;
  http_check_uri: string;
  http_check_expect_status: string;
  http_check_expect_string: string;
  ssl_ca_certificate: string;
  ssl_no_verify: boolean;
  servers: ServerForm[];
}

const emptyServer = (): ServerForm => ({
  name: "", address: "", port: "", backup: false, check: false,
  check_port: "", send_proxy: false,
});

const emptyForm = (): FormState => ({
  name: "", description: "", mode: "http", balance: "round-robin",
  health_check: "", http_check_method: "", http_check_uri: "",
  http_check_expect_status: "", http_check_expect_string: "",
  ssl_ca_certificate: "", ssl_no_verify: false,
  servers: [emptyServer()],
});

function backendToForm(b: LBBackend): FormState {
  return {
    name: b.name,
    description: b.description ?? "",
    mode: b.mode ?? "http",
    balance: b.balance ?? "round-robin",
    health_check: b.health_check ?? "",
    http_check_method: b.http_check?.method ?? "",
    http_check_uri: b.http_check?.uri ?? "",
    http_check_expect_status: b.http_check?.expect?.status ?? "",
    http_check_expect_string: b.http_check?.expect?.string ?? "",
    ssl_ca_certificate: b.ssl?.ca_certificate ?? "",
    ssl_no_verify: b.ssl?.no_verify ?? false,
    servers: b.servers.length > 0
      ? b.servers.map((s) => ({
          name: s.name, address: s.address ?? "", port: s.port ?? "",
          backup: s.backup, check: s.check, check_port: s.check_port ?? "",
          send_proxy: s.send_proxy,
        }))
      : [emptyServer()],
  };
}

function formToBackend(f: FormState, existingRules: LBBackend["rules"]): LBBackend {
  const hasHttpCheck = !!(f.http_check_method || f.http_check_uri);
  const hasSsl = !!(f.ssl_ca_certificate || f.ssl_no_verify);
  return {
    name: f.name.trim(),
    description: f.description || null,
    mode: f.mode || null,
    balance: f.balance || null,
    health_check: f.health_check || null,
    http_check: hasHttpCheck ? {
      method: f.http_check_method || null,
      uri: f.http_check_uri || null,
      expect: {
        status: f.http_check_expect_status || null,
        string: f.http_check_expect_string || null,
      },
    } : null,
    ssl: hasSsl ? { ca_certificate: f.ssl_ca_certificate || null, no_verify: f.ssl_no_verify } : null,
    timeout: { check: null, connect: null, server: null },
    servers: f.servers
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        address: s.address || null,
        port: s.port || null,
        backup: s.backup,
        check: s.check,
        check_port: s.check_port || null,
        send_proxy: s.send_proxy,
        send_proxy_v2: false,
      })),
    rules: existingRules,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  backend?: LBBackend | null;
  capabilities: LBCapabilities | null;
  onSuccess: () => void;
}

export function HAProxyBackendModal({ open, onOpenChange, backend, capabilities, onSuccess }: Props) {
  const isEdit = !!backend;
  const isV15 = capabilities?.features.server_check_port.supported ?? false;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(backend ? backendToForm(backend) : emptyForm());
      setError(null);
      setAdvancedOpen(false);
    }
  }, [open, backend]);

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
    if (!form.name.trim()) { setError("Backend name is required"); return; }

    setLoading(true);
    setError(null);
    try {
      const data = formToBackend(form, backend?.rules ?? []);
      if (isEdit && backend) {
        await lbService.updateBackend(backend, data);
      } else {
        await lbService.createBackend(data);
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
          <DialogTitle>{isEdit ? "Edit Backend" : "Add Backend"}</DialogTitle>
          <DialogDescription>
            Configure a HAProxy backend pool with servers and load balancing settings.
            {isEdit && " Routing rules are managed on the backend detail page."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="web-backends"
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
              <Label>Balance Algorithm</Label>
              <Select value={form.balance} onValueChange={(v) => set("balance", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="round-robin">Round Robin</SelectItem>
                  <SelectItem value="least-conn">Least Connections</SelectItem>
                  <SelectItem value="source-hash">Source Hash</SelectItem>
                  <SelectItem value="uri">URI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Health Check</Label>
            <Select
              value={form.health_check || "_none"}
              onValueChange={(v) => set("health_check", v === "_none" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                <SelectItem value="tcp">TCP</SelectItem>
                <SelectItem value="http">HTTP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Servers</Label>
              <Button type="button" variant="outline" size="sm" onClick={addServer}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Server
              </Button>
            </div>

            {form.servers.map((srv, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Server {idx + 1}</span>
                  {form.servers.length > 1 && (
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeServer(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input className="h-8 text-sm" value={srv.name}
                      onChange={(e) => setServer(idx, "name", e.target.value)} placeholder="web1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Address</Label>
                    <Input className="h-8 text-sm" value={srv.address}
                      onChange={(e) => setServer(idx, "address", e.target.value)} placeholder="10.0.0.10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Port</Label>
                    <Input className="h-8 text-sm" value={srv.port}
                      onChange={(e) => setServer(idx, "port", e.target.value)} placeholder="8080" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={srv.check} onCheckedChange={(c) => setServer(idx, "check", !!c)} />
                    Health check
                  </label>
                  {isV15 && srv.check && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Check port</Label>
                      <Input className="h-7 w-20 text-xs" value={srv.check_port}
                        onChange={(e) => setServer(idx, "check_port", e.target.value)} placeholder="80" />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={srv.backup} onCheckedChange={(c) => setServer(idx, "backup", !!c)} />
                    Backup
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={srv.send_proxy} onCheckedChange={(c) => setServer(idx, "send_proxy", !!c)} />
                    Send PROXY protocol
                  </label>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-sm font-semibold hover:text-foreground text-muted-foreground transition-colors">
              Advanced Options
              <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">HTTP Health Check</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Method</Label>
                  <Select value={form.http_check_method || "_none"}
                    onValueChange={(v) => set("http_check_method", v === "_none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="HEAD">HEAD</SelectItem>
                      <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">URI</Label>
                  <Input value={form.http_check_uri}
                    onChange={(e) => set("http_check_uri", e.target.value)} placeholder="/health" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Expect Status</Label>
                  <Input value={form.http_check_expect_status}
                    onChange={(e) => set("http_check_expect_status", e.target.value)} placeholder="200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Expect String</Label>
                  <Input value={form.http_check_expect_string}
                    onChange={(e) => set("http_check_expect_string", e.target.value)} placeholder="OK" />
                </div>
              </div>

              <Separator />

              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">SSL/TLS (Backend)</p>
              <div className="space-y-1.5">
                <Label className="text-sm">CA Certificate</Label>
                <Input value={form.ssl_ca_certificate}
                  onChange={(e) => set("ssl_ca_certificate", e.target.value)} placeholder="ca-cert name" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={form.ssl_no_verify}
                  onCheckedChange={(c) => set("ssl_no_verify", !!c)} />
                Disable SSL verification (no-verify)
              </label>
            </CollapsibleContent>
          </Collapsible>
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
            {isEdit ? "Save Changes" : "Create Backend"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
