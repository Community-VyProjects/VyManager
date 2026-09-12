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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { pkiService } from "@/lib/api/pki";
import {
  dhcpService,
  type DHCPCapabilitiesResponse,
  type DHCPFailoverConfig,
} from "@/lib/api/dhcp";

interface DHCPFailoverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  failover?: DHCPFailoverConfig;
  capabilities: DHCPCapabilitiesResponse | null;
}

const empty: DHCPFailoverConfig = {
  mode: "",
  name: "",
  remote: "",
  source_address: "",
  status: "",
  certificate: "",
  ca_certificate: "",
};

export function DHCPFailoverModal({
  open,
  onOpenChange,
  onSuccess,
  failover,
  capabilities,
}: DHCPFailoverModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DHCPFailoverConfig>(empty);
  const [certs, setCerts] = useState<string[]>([]);
  const [cas, setCas] = useState<string[]>([]);
  const canCert = capabilities?.fields.failover_certificate?.supported ?? false;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      mode: failover?.mode ?? "",
      name: failover?.name ?? "",
      remote: failover?.remote ?? "",
      source_address: failover?.source_address ?? "",
      status: failover?.status ?? "",
      certificate: failover?.certificate ?? "",
      ca_certificate: failover?.ca_certificate ?? "",
    });
    if (canCert) {
      pkiService
        .getConfig()
        .then((pki) => {
          setCerts(pki.certificates.map((c) => c.name));
          setCas(pki.ca.map((c) => c.name));
        })
        .catch(() => {
          setCerts([]);
          setCas([]);
        });
    }
  }, [open, failover, canCert]);

  const set = (field: keyof DHCPFailoverConfig, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value === "__none__" ? "" : value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dhcpService.saveFailover(failover, form, canCert);
      if (!result.success) {
        setError(result.error ?? "Failed to save high availability");
        setLoading(false);
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save high availability");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>DHCP high availability</DialogTitle>
          <DialogDescription>Peer settings for this DHCP server</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Mode</Label>
            <Select value={form.mode || "__none__"} onValueChange={(v) => set("mode", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Unset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unset</SelectItem>
                <SelectItem value="active-active">active-active</SelectItem>
                <SelectItem value="active-passive">active-passive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Remote</Label>
            <Input
              className="font-mono"
              value={form.remote ?? ""}
              onChange={(e) => set("remote", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Source address</Label>
            <Input
              className="font-mono"
              value={form.source_address ?? ""}
              onChange={(e) => set("source_address", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status || "__none__"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Unset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unset</SelectItem>
                <SelectItem value="primary">primary</SelectItem>
                <SelectItem value="secondary">secondary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canCert && (
            <>
              <div className="space-y-1">
                <Label>Certificate</Label>
                <Select
                  value={form.certificate || "__none__"}
                  onValueChange={(v) => set("certificate", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {certs.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>CA certificate</Label>
                <Select
                  value={form.ca_certificate || "__none__"}
                  onValueChange={(v) => set("ca_certificate", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {cas.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
