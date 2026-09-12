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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Plus, X } from "lucide-react";
import {
  dhcpService,
  type DHCPCapabilitiesResponse,
  type DHCPDdnsConfig,
  type DHCPDdnsDomain,
  type DHCPDdnsTsigKey,
} from "@/lib/api/dhcp";

interface DHCPDdnsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  ddns: DHCPDdnsConfig;
  capabilities: DHCPCapabilitiesResponse | null;
}

const emptyDdns = (): DHCPDdnsConfig => ({
  present: false,
  send_updates: "",
  tsig_keys: [],
  forward_domains: [],
  reverse_domains: [],
});

const ALGOS = ["md5", "sha1", "sha224", "sha256", "sha384", "sha512"];

export function DHCPDdnsModal({
  open,
  onOpenChange,
  onSuccess,
  ddns,
  capabilities,
}: DHCPDdnsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DHCPDdnsConfig>(emptyDdns());
  const leaf = capabilities?.fields.dynamic_dns_update_leaf?.supported ?? false;
  const kea = capabilities?.fields.dynamic_dns_update_kea?.supported ?? false;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      present: ddns.present,
      send_updates: ddns.send_updates ?? "",
      tsig_keys: ddns.tsig_keys.map((k) => ({ ...k })),
      forward_domains: ddns.forward_domains.map((d) => ({
        ...d,
        dns_servers: d.dns_servers.map((s) => ({ ...s })),
      })),
      reverse_domains: ddns.reverse_domains.map((d) => ({
        ...d,
        dns_servers: d.dns_servers.map((s) => ({ ...s })),
      })),
    });
  }, [open, ddns]);

  const addKey = () => {
    setForm((prev) => ({
      ...prev,
      present: true,
      tsig_keys: [...prev.tsig_keys, { name: "", algorithm: "sha256", secret: "" }],
    }));
  };

  const updateKey = (index: number, patch: Partial<DHCPDdnsTsigKey>) => {
    setForm((prev) => ({
      ...prev,
      tsig_keys: prev.tsig_keys.map((k, i) => (i === index ? { ...k, ...patch } : k)),
    }));
  };

  const addDomain = (kind: "forward_domains" | "reverse_domains") => {
    setForm((prev) => ({
      ...prev,
      present: true,
      [kind]: [...prev[kind], { name: "", key_name: "", dns_servers: [] }],
    }));
  };

  const updateDomain = (
    kind: "forward_domains" | "reverse_domains",
    index: number,
    patch: Partial<DHCPDdnsDomain>
  ) => {
    setForm((prev) => ({
      ...prev,
      [kind]: prev[kind].map((d, i) => (i === index ? { ...d, ...patch } : d)),
    }));
  };

  const addServer = (kind: "forward_domains" | "reverse_domains", index: number) => {
    setForm((prev) => ({
      ...prev,
      [kind]: prev[kind].map((d, i) => {
        if (i !== index) return d;
        const nextId = String((d.dns_servers.length || 0) + 1);
        return {
          ...d,
          dns_servers: [...d.dns_servers, { id: nextId, address: "", port: "" }],
        };
      }),
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dhcpService.saveDdns(ddns, form, leaf, kea);
      if (!result.success) {
        setError(result.error ?? "Failed to save dynamic DNS");
        setLoading(false);
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save dynamic DNS");
    } finally {
      setLoading(false);
    }
  };

  const domainEditor = (title: string, kind: "forward_domains" | "reverse_domains") => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => addDomain(kind)}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {form[kind].map((domain, index) => (
        <div key={`${kind}-${index}`} className="border rounded-md p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              className="font-mono"
              placeholder="example.com"
              value={domain.name}
              onChange={(e) => updateDomain(kind, index, { name: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  [kind]: prev[kind].filter((_, i) => i !== index),
                }))
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="TSIG key name"
            value={domain.key_name ?? ""}
            onChange={(e) => updateDomain(kind, index, { key_name: e.target.value })}
          />
          {domain.dns_servers.map((server, sidx) => (
            <div key={server.id} className="flex gap-2">
              <Input
                className="w-16 font-mono"
                value={server.id}
                onChange={(e) => {
                  const dns_servers = domain.dns_servers.map((s, i) =>
                    i === sidx ? { ...s, id: e.target.value } : s
                  );
                  updateDomain(kind, index, { dns_servers });
                }}
              />
              <Input
                className="font-mono"
                placeholder="192.0.2.53"
                value={server.address ?? ""}
                onChange={(e) => {
                  const dns_servers = domain.dns_servers.map((s, i) =>
                    i === sidx ? { ...s, address: e.target.value } : s
                  );
                  updateDomain(kind, index, { dns_servers });
                }}
              />
              <Input
                className="w-20 font-mono"
                placeholder="53"
                value={server.port ?? ""}
                onChange={(e) => {
                  const dns_servers = domain.dns_servers.map((s, i) =>
                    i === sidx ? { ...s, port: e.target.value } : s
                  );
                  updateDomain(kind, index, { dns_servers });
                }}
              />
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => addServer(kind, index)}>
            Add DNS server
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>DHCP dynamic DNS</DialogTitle>
          <DialogDescription>Update DNS from DHCP leases</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {leaf && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="ddns-leaf"
                checked={form.present}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, present: Boolean(v) }))}
              />
              <Label htmlFor="ddns-leaf" className="cursor-pointer">
                Enable dynamic DNS updates
              </Label>
            </div>
          )}
          {kea && (
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ddns-present"
                  checked={form.present}
                  onCheckedChange={(v) => setForm((prev) => ({ ...prev, present: Boolean(v) }))}
                />
                <Label htmlFor="ddns-present" className="cursor-pointer">
                  Configure dynamic DNS
                </Label>
              </div>
              {form.present && (
                <>
                  <div className="space-y-1">
                    <Label>Send updates</Label>
                    <Select
                      value={form.send_updates || "__none__"}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          send_updates: v === "__none__" ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unset</SelectItem>
                        <SelectItem value="enable">enable</SelectItem>
                        <SelectItem value="disable">disable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>TSIG keys</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addKey}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    {form.tsig_keys.map((key, index) => (
                      <div key={index} className="border rounded-md p-3 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="key name"
                            value={key.name}
                            onChange={(e) => updateKey(index, { name: e.target.value })}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                tsig_keys: prev.tsig_keys.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Select
                          value={key.algorithm || "sha256"}
                          onValueChange={(v) => updateKey(index, { algorithm: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALGOS.map((a) => (
                              <SelectItem key={a} value={a}>
                                {a}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="font-mono"
                          placeholder="base64 secret"
                          value={key.secret ?? ""}
                          onChange={(e) => updateKey(index, { secret: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                  {domainEditor("Forward domains", "forward_domains")}
                  {domainEditor("Reverse domains", "reverse_domains")}
                </>
              )}
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
