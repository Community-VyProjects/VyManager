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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { DNSForwardingConfig, DNSForwardingCapabilities } from "@/lib/api/dns-forwarding";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DNSForwardingConfig | null;
  caps: DNSForwardingCapabilities | null;
  onSubmit: (config: DNSForwardingConfig) => Promise<void>;
  initialTab?: string;
}

function BadgeListInput({
  label,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !items.includes(v)) {
      onAdd(v);
      setInput("");
    }
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="font-mono gap-1 pr-1">
              {item}
              <button onClick={() => onRemove(item)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="font-mono"
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button variant="outline" size="icon" onClick={add} disabled={!input.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function DNSForwardingSettingsModal({
  open,
  onOpenChange,
  config,
  caps,
  onSubmit,
  initialTab = "listener",
}: Props) {
  const [form, setForm] = useState<DNSForwardingConfig>(() => getDefault());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getDefault(): DNSForwardingConfig {
    return {
      listen_addresses: [],
      allow_from: [],
      name_servers: [],
      port: null,
      cache_size: null,
      dnssec: null,
      system: false,
      negative_ttl: null,
      timeout: null,
      dhcp_interfaces: [],
      ignore_hosts_file: false,
      no_serve_rfc1918: false,
      source_addresses: [],
      serve_stale_extension: null,
      dns64_prefix: null,
      exclude_throttle_addresses: [],
      domain_forwarders: [],
      authoritative_domains: [],
      zone_caches: [],
      ecs_options: { ecs_add_for: [], ecs_ipv4_bits: null, edns_subnet_allow_list: [] },
    };
  }

  useEffect(() => {
    if (open && config) {
      setForm({
        ...config,
        ecs_options: { ...config.ecs_options },
        domain_forwarders: config.domain_forwarders,
        authoritative_domains: config.authoritative_domains,
        zone_caches: config.zone_caches,
      });
      setError(null);
    }
  }, [open, config]);

  const set = (updates: Partial<DNSForwardingConfig>) => setForm((f) => ({ ...f, ...updates }));
  const setEcs = (updates: Partial<DNSForwardingConfig["ecs_options"]>) =>
    setForm((f) => ({ ...f, ecs_options: { ...f.ecs_options, ...updates } }));

  const addToList = (field: keyof DNSForwardingConfig, value: string) =>
    set({ [field]: [...(form[field] as string[]), value] } as Partial<DNSForwardingConfig>);
  const removeFromList = (field: keyof DNSForwardingConfig, value: string) =>
    set({ [field]: (form[field] as string[]).filter((v) => v !== value) } as Partial<DNSForwardingConfig>);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const ecsSupported = caps?.features.options_ecs.supported ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>DNS Forwarding Settings</DialogTitle>
          <DialogDescription>Configure global DNS forwarding service settings.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={initialTab} className="flex-1">
          <TabsList className="w-full">
            <TabsTrigger value="listener" className="flex-1">Listener</TabsTrigger>
            <TabsTrigger value="resolver" className="flex-1">Resolver</TabsTrigger>
            <TabsTrigger value="routing" className="flex-1">Routing</TabsTrigger>
            {ecsSupported && <TabsTrigger value="ecs" className="flex-1">ECS</TabsTrigger>}
          </TabsList>

          {/* Listener Tab */}
          <TabsContent value="listener">
            <ScrollArea className="h-72 pr-4">
              <div className="space-y-5 py-2">
                <BadgeListInput
                  label="Listen Addresses"
                  items={form.listen_addresses}
                  onAdd={(v) => addToList("listen_addresses", v)}
                  onRemove={(v) => removeFromList("listen_addresses", v)}
                  placeholder="e.g. 0.0.0.0 or ::"
                />
                <BadgeListInput
                  label="Allow From"
                  items={form.allow_from}
                  onAdd={(v) => addToList("allow_from", v)}
                  onRemove={(v) => removeFromList("allow_from", v)}
                  placeholder="e.g. 192.168.0.0/16"
                />
                <div className="space-y-2">
                  <Label htmlFor="set-port">Port</Label>
                  <Input
                    id="set-port"
                    type="number"
                    value={form.port ?? ""}
                    onChange={(e) => set({ port: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="53 (default)"
                    min={1}
                    max={65535}
                    className="font-mono"
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Resolver Tab */}
          <TabsContent value="resolver">
            <ScrollArea className="h-72 pr-4">
              <div className="space-y-5 py-2">
                <div className="space-y-2">
                  <Label htmlFor="set-cache">Cache Size</Label>
                  <Input
                    id="set-cache"
                    type="number"
                    value={form.cache_size ?? ""}
                    onChange={(e) => set({ cache_size: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="10000 (default)"
                    min={0}
                    max={2147483647}
                  />
                </div>
                <div className="space-y-2">
                  <Label>DNSSEC</Label>
                  <Select
                    value={form.dnssec ?? "none"}
                    onValueChange={(v) => set({ dnssec: v === "none" ? null : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="process-no-validate">Process (no validate)</SelectItem>
                      <SelectItem value="process">Process</SelectItem>
                      <SelectItem value="log-fail">Log Fail</SelectItem>
                      <SelectItem value="validate">Validate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="set-negttl">Negative TTL (s)</Label>
                    <Input
                      id="set-negttl"
                      type="number"
                      value={form.negative_ttl ?? ""}
                      onChange={(e) => set({ negative_ttl: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="3600 (default)"
                      min={0}
                      max={7200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="set-timeout">Timeout (ms)</Label>
                    <Input
                      id="set-timeout"
                      type="number"
                      value={form.timeout ?? ""}
                      onChange={(e) => set({ timeout: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="1500 (default)"
                      min={10}
                      max={60000}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="set-stale">Serve Stale Extension</Label>
                  <Input
                    id="set-stale"
                    type="number"
                    value={form.serve_stale_extension ?? ""}
                    onChange={(e) => set({ serve_stale_extension: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="0 (default)"
                    min={0}
                    max={65535}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="set-system"
                      checked={form.system}
                      onCheckedChange={(c) => set({ system: c === true })}
                    />
                    <Label htmlFor="set-system" className="cursor-pointer">Use System Nameservers</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="set-ignorehosts"
                      checked={form.ignore_hosts_file}
                      onCheckedChange={(c) => set({ ignore_hosts_file: c === true })}
                    />
                    <Label htmlFor="set-ignorehosts" className="cursor-pointer">Ignore Hosts File</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="set-norfc1918"
                      checked={form.no_serve_rfc1918}
                      onCheckedChange={(c) => set({ no_serve_rfc1918: c === true })}
                    />
                    <Label htmlFor="set-norfc1918" className="cursor-pointer">No Serve RFC1918</Label>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Routing Tab */}
          <TabsContent value="routing">
            <ScrollArea className="h-72 pr-4">
              <div className="space-y-5 py-2">
                <BadgeListInput
                  label="Source Addresses"
                  items={form.source_addresses}
                  onAdd={(v) => addToList("source_addresses", v)}
                  onRemove={(v) => removeFromList("source_addresses", v)}
                  placeholder="e.g. 192.168.1.1"
                />
                <BadgeListInput
                  label="DHCP Interfaces"
                  items={form.dhcp_interfaces}
                  onAdd={(v) => addToList("dhcp_interfaces", v)}
                  onRemove={(v) => removeFromList("dhcp_interfaces", v)}
                  placeholder="e.g. eth0"
                />
                <BadgeListInput
                  label="Exclude Throttle Addresses"
                  items={form.exclude_throttle_addresses}
                  onAdd={(v) => addToList("exclude_throttle_addresses", v)}
                  onRemove={(v) => removeFromList("exclude_throttle_addresses", v)}
                  placeholder="e.g. 8.8.8.8"
                />
                <div className="space-y-2">
                  <Label htmlFor="set-dns64">DNS64 Prefix</Label>
                  <Input
                    id="set-dns64"
                    value={form.dns64_prefix ?? ""}
                    onChange={(e) => set({ dns64_prefix: e.target.value || null })}
                    placeholder="e.g. 64:ff9b::/96"
                    className="font-mono"
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ECS Tab */}
          {ecsSupported && (
            <TabsContent value="ecs">
              <ScrollArea className="h-72 pr-4">
                <div className="space-y-5 py-2">
                  <BadgeListInput
                    label="ECS Add For"
                    items={form.ecs_options.ecs_add_for}
                    onAdd={(v) => setEcs({ ecs_add_for: [...form.ecs_options.ecs_add_for, v] })}
                    onRemove={(v) => setEcs({ ecs_add_for: form.ecs_options.ecs_add_for.filter((x) => x !== v) })}
                    placeholder="e.g. 0.0.0.0/0"
                  />
                  <div className="space-y-2">
                    <Label htmlFor="set-ecsbits">ECS IPv4 Bits (0–32)</Label>
                    <Input
                      id="set-ecsbits"
                      type="number"
                      value={form.ecs_options.ecs_ipv4_bits ?? ""}
                      onChange={(e) => setEcs({ ecs_ipv4_bits: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="e.g. 24"
                      min={0}
                      max={32}
                    />
                  </div>
                  <BadgeListInput
                    label="EDNS Subnet Allow List"
                    items={form.ecs_options.edns_subnet_allow_list}
                    onAdd={(v) => setEcs({ edns_subnet_allow_list: [...form.ecs_options.edns_subnet_allow_list, v] })}
                    onRemove={(v) => setEcs({ edns_subnet_allow_list: form.ecs_options.edns_subnet_allow_list.filter((x) => x !== v) })}
                    placeholder="e.g. 192.0.2.0/24"
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
