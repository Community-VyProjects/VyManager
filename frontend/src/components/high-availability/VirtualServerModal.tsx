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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Plus, Server, Trash2 } from "lucide-react";
import type { VirtualServer, RealServer } from "@/lib/api/high-availability";

interface VirtualServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingServer?: VirtualServer | null;
  onSubmit: (vs: VirtualServer) => Promise<void>;
}

interface RealServerEntry {
  address: string;
  port: string;
  connection_timeout: string;
  health_check_script: string;
}

interface FormState {
  name: string;
  address: string;
  port: string;
  protocol: string;
  algorithm: string;
  forward_method: string;
  delay_loop: string;
  persistence_timeout: string;
  fwmark: string;
  real_servers: RealServerEntry[];
}

const emptyForm = (): FormState => ({
  name: "",
  address: "",
  port: "",
  protocol: "",
  algorithm: "",
  forward_method: "",
  delay_loop: "",
  persistence_timeout: "",
  fwmark: "",
  real_servers: [],
});

function serverToForm(vs: VirtualServer): FormState {
  return {
    name: vs.name,
    address: vs.address ?? "",
    port: vs.port ?? "",
    protocol: vs.protocol ?? "",
    algorithm: vs.algorithm ?? "",
    forward_method: vs.forward_method ?? "",
    delay_loop: vs.delay_loop ?? "",
    persistence_timeout: vs.persistence_timeout ?? "",
    fwmark: vs.fwmark ?? "",
    real_servers: vs.real_servers.map((rs) => ({
      address: rs.address,
      port: rs.port ?? "",
      connection_timeout: rs.connection_timeout ?? "",
      health_check_script: rs.health_check_script ?? "",
    })),
  };
}

function formToServer(f: FormState): VirtualServer {
  const real_servers: RealServer[] = f.real_servers
    .filter((rs) => rs.address.trim())
    .map((rs) => ({
      address: rs.address.trim(),
      port: rs.port.trim() || null,
      connection_timeout: rs.connection_timeout.trim() || null,
      health_check_script: rs.health_check_script.trim() || null,
    }));

  return {
    name: f.name.trim(),
    address: f.address.trim() || null,
    port: f.port.trim() || null,
    protocol: f.protocol || null,
    algorithm: f.algorithm || null,
    forward_method: f.forward_method || null,
    delay_loop: f.delay_loop.trim() || null,
    persistence_timeout: f.persistence_timeout.trim() || null,
    fwmark: f.fwmark.trim() || null,
    real_servers,
  };
}

const emptyRealServer = (): RealServerEntry => ({
  address: "",
  port: "",
  connection_timeout: "",
  health_check_script: "",
});

export function VirtualServerModal({
  open,
  onOpenChange,
  existingServer,
  onSubmit,
}: VirtualServerModalProps) {
  const isEdit = !!existingServer;
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(existingServer ? serverToForm(existingServer) : emptyForm());
      setError(null);
    }
  }, [open, existingServer]);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setRealServer = (idx: number, field: keyof RealServerEntry, value: string) => {
    setForm((prev) => {
      const real_servers = [...prev.real_servers];
      real_servers[idx] = { ...real_servers[idx], [field]: value };
      return { ...prev, real_servers };
    });
  };

  const addRealServer = () =>
    setForm((prev) => ({ ...prev, real_servers: [...prev.real_servers, emptyRealServer()] }));

  const removeRealServer = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      real_servers: prev.real_servers.filter((_, i) => i !== idx),
    }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.name.trim()) { setError("Virtual server name is required"); return; }
    setLoading(true);
    try {
      await onSubmit(formToServer(form));
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? "Edit Virtual Server" : "Add Virtual Server"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Editing virtual server "${existingServer!.name}"`
              : "Configure a keepalived virtual server for load balancing"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="space-y-5 py-2">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive whitespace-pre-wrap font-mono leading-relaxed">{error}</p>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label>Server Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                disabled={isEdit}
                placeholder="e.g. web-lb"
                className={isEdit ? "opacity-60" : ""}
              />
              {isEdit && <p className="text-xs text-muted-foreground">Name cannot be changed</p>}
            </div>

            {/* Address & Port */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Virtual IP Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => set("address")(e.target.value)}
                  placeholder="10.0.0.100"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Port</Label>
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port}
                  onChange={(e) => set("port")(e.target.value)}
                  placeholder="80"
                />
              </div>
            </div>

            {/* Protocol, Algorithm, Forward Method */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Protocol</Label>
                <Select value={form.protocol} onValueChange={(v) => set("protocol")(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any</SelectItem>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Algorithm</Label>
                <Select value={form.algorithm} onValueChange={(v) => set("algorithm")(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default</SelectItem>
                    <SelectItem value="round-robin">Round Robin</SelectItem>
                    <SelectItem value="weighted-round-robin">Weighted Round Robin</SelectItem>
                    <SelectItem value="least-connection">Least Connection</SelectItem>
                    <SelectItem value="weighted-least-connection">Weighted Least Connection</SelectItem>
                    <SelectItem value="source-hashing">Source Hashing</SelectItem>
                    <SelectItem value="destination-hashing">Destination Hashing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Forward Method</Label>
                <Select value={form.forward_method} onValueChange={(v) => set("forward_method")(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default</SelectItem>
                    <SelectItem value="dr">Direct Routing (DR)</SelectItem>
                    <SelectItem value="nat">NAT</SelectItem>
                    <SelectItem value="tunnel">Tunnel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Delay Loop, Persistence, FWMark */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Delay Loop (s)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.delay_loop}
                  onChange={(e) => set("delay_loop")(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Persistence Timeout (s)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.persistence_timeout}
                  onChange={(e) => set("persistence_timeout")(e.target.value)}
                  placeholder="360"
                />
              </div>
              <div className="space-y-1.5">
                <Label>FW Mark</Label>
                <Input
                  value={form.fwmark}
                  onChange={(e) => set("fwmark")(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Real Servers */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Real Servers</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Backend servers that receive traffic</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addRealServer}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Server
                </Button>
              </div>

              {form.real_servers.length === 0 ? (
                <div className="border border-dashed rounded-lg p-6 flex flex-col items-center gap-2 text-center">
                  <Server className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No real servers configured</p>
                  <p className="text-xs text-muted-foreground">Click &quot;Add Server&quot; to add backend servers</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.real_servers.map((rs, idx) => (
                    <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                      {/* Card header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Server {idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeRealServer(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                      </div>

                      {/* Address row */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">IP Address <span className="text-destructive">*</span></Label>
                        <Input
                          value={rs.address}
                          onChange={(e) => setRealServer(idx, "address", e.target.value)}
                          placeholder="192.168.1.10"
                          className="font-mono"
                        />
                      </div>

                      {/* Port + Timeout row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Port</Label>
                          <Input
                            type="number"
                            min={1}
                            max={65535}
                            value={rs.port}
                            onChange={(e) => setRealServer(idx, "port", e.target.value)}
                            placeholder="e.g. 80"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Connection Timeout (s)</Label>
                          <Input
                            type="number"
                            min={1}
                            value={rs.connection_timeout}
                            onChange={(e) => setRealServer(idx, "connection_timeout", e.target.value)}
                            placeholder="e.g. 5"
                          />
                        </div>
                      </div>

                      {/* Health check script */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Health Check Script</Label>
                        <Input
                          value={rs.health_check_script}
                          onChange={(e) => setRealServer(idx, "health_check_script", e.target.value)}
                          placeholder="/etc/keepalived/check.sh"
                          className="font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
