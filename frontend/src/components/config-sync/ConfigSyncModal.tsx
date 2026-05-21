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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  ConfigSyncConfig,
  ConfigSyncSections,
  defaultSections,
} from "@/lib/api/config-sync";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ConfigSyncConfig | null;
  onSuccess: () => void;
  onSubmit: (data: ConfigSyncConfig) => Promise<void>;
}

export function ConfigSyncModal({ open, onOpenChange, config, onSuccess, onSubmit }: Props) {
  const [activeTab, setActiveTab] = useState<"connection" | "sections">("connection");

  const [mode, setMode] = useState<"load" | "set" | "">("");
  const [address, setAddress] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [port, setPort] = useState("");
  const [timeout, setTimeout] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [sections, setSections] = useState<ConfigSyncSections>(defaultSections());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab("connection");
      setError(null);
      setShowKey(false);
      if (config) {
        setMode((config.mode as "load" | "set") ?? "");
        setAddress(config.secondary?.address ?? "");
        setApiKey(config.secondary?.key ?? "");
        setPort(config.secondary?.port != null ? String(config.secondary.port) : "");
        setTimeout(config.secondary?.timeout != null ? String(config.secondary.timeout) : "");
        setSections({ ...defaultSections(), ...config.sections });
      } else {
        setMode("");
        setAddress("");
        setApiKey("");
        setPort("");
        setTimeout("");
        setSections(defaultSections());
      }
    }
  }, [open, config]);

  const setSection = (key: keyof ConfigSyncSections, value: boolean) => {
    setSections((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const updated: ConfigSyncConfig = {
        mode: mode || null,
        secondary: {
          address: address || null,
          key: apiKey || null,
          port: port ? parseInt(port, 10) : null,
          timeout: timeout ? parseInt(timeout, 10) : null,
        },
        sections,
      };
      await onSubmit(updated);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{config ? "Edit Config Sync" : "Configure Config Sync"}</DialogTitle>
          <DialogDescription>
            Synchronize configuration sections from this router to a secondary router.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "connection" | "sections")} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="sections">Sync Sections</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="flex-1 overflow-auto mt-4 space-y-5">
            {/* Sync Mode */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sync Mode</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as "load" | "set")}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="load" id="mode-load" />
                  <Label htmlFor="mode-load" className="font-normal cursor-pointer">
                    Load — replace the section entirely on secondary
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="set" id="mode-set" />
                  <Label htmlFor="mode-set" className="font-normal cursor-pointer">
                    Set — merge into the existing section on secondary
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Secondary Router */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Secondary Router</Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="address" className="text-xs text-muted-foreground">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="192.168.1.2"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="apiKey" className="text-xs text-muted-foreground">API Key</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="API key for secondary router"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full w-10"
                      onClick={() => setShowKey((v) => !v)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="port" className="text-xs text-muted-foreground">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="443 (default)"
                    min={1}
                    max={65535}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timeout" className="text-xs text-muted-foreground">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={timeout}
                    onChange={(e) => setTimeout(e.target.value)}
                    placeholder="60 (default)"
                    min={1}
                    max={3600}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sections" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[420px] pr-3">
              <div className="space-y-5">
                {/* Simple Sections */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Simple Sections</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(["firewall", "nat", "nat66", "pki", "policy", "vpn", "vrf"] as const).map((name) => (
                      <div key={name} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sec-${name}`}
                          checked={sections[name]}
                          onCheckedChange={(v) => setSection(name, !!v)}
                        />
                        <Label htmlFor={`sec-${name}`} className="font-normal cursor-pointer capitalize text-sm">{name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Interfaces */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Interfaces</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex items-center space-x-2 col-span-4">
                      <Checkbox
                        id="sec-interfaces"
                        checked={sections.interfaces}
                        onCheckedChange={(v) => setSection("interfaces", !!v)}
                      />
                      <Label htmlFor="sec-interfaces" className="font-normal cursor-pointer text-sm">All Interfaces</Label>
                    </div>
                    {([
                      ["interfaces_bonding", "Bonding"],
                      ["interfaces_bridge", "Bridge"],
                      ["interfaces_dummy", "Dummy"],
                      ["interfaces_ethernet", "Ethernet"],
                      ["interfaces_geneve", "GENEVE"],
                      ["interfaces_input", "Input"],
                      ["interfaces_l2tpv3", "L2TPv3"],
                      ["interfaces_loopback", "Loopback"],
                      ["interfaces_macsec", "MACsec"],
                      ["interfaces_openvpn", "OpenVPN"],
                      ["interfaces_pppoe", "PPPoE"],
                      ["interfaces_pseudo_ethernet", "Pseudo-Ethernet"],
                      ["interfaces_sstpc", "SSTPC"],
                      ["interfaces_tunnel", "Tunnel"],
                      ["interfaces_virtual_ethernet", "Virtual Ethernet"],
                      ["interfaces_vti", "VTI"],
                      ["interfaces_vxlan", "VXLAN"],
                      ["interfaces_wireguard", "WireGuard"],
                      ["interfaces_wireless", "Wireless"],
                      ["interfaces_wwan", "WWAN"],
                    ] as [keyof ConfigSyncSections, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sec-${key}`}
                          checked={sections[key] as boolean}
                          onCheckedChange={(v) => setSection(key, !!v)}
                        />
                        <Label htmlFor={`sec-${key}`} className="font-normal cursor-pointer text-sm">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Protocols */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Protocols</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex items-center space-x-2 col-span-4">
                      <Checkbox
                        id="sec-protocols"
                        checked={sections.protocols}
                        onCheckedChange={(v) => setSection("protocols", !!v)}
                      />
                      <Label htmlFor="sec-protocols" className="font-normal cursor-pointer text-sm">All Protocols</Label>
                    </div>
                    {([
                      ["protocols_babel", "Babel"],
                      ["protocols_bfd", "BFD"],
                      ["protocols_bgp", "BGP"],
                      ["protocols_failover", "Failover"],
                      ["protocols_igmp_proxy", "IGMP Proxy"],
                      ["protocols_isis", "IS-IS"],
                      ["protocols_mpls", "MPLS"],
                      ["protocols_nhrp", "NHRP"],
                      ["protocols_ospf", "OSPF"],
                      ["protocols_ospfv3", "OSPFv3"],
                      ["protocols_pim", "PIM"],
                      ["protocols_pim6", "PIMv6"],
                      ["protocols_rip", "RIP"],
                      ["protocols_ripng", "RIPng"],
                      ["protocols_rpki", "RPKI"],
                      ["protocols_segment_routing", "Segment Routing"],
                      ["protocols_static", "Static Routes"],
                    ] as [keyof ConfigSyncSections, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sec-${key}`}
                          checked={sections[key] as boolean}
                          onCheckedChange={(v) => setSection(key, !!v)}
                        />
                        <Label htmlFor={`sec-${key}`} className="font-normal cursor-pointer text-sm">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* QoS */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">QoS</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex items-center space-x-2 col-span-4">
                      <Checkbox
                        id="sec-qos"
                        checked={sections.qos}
                        onCheckedChange={(v) => setSection("qos", !!v)}
                      />
                      <Label htmlFor="sec-qos" className="font-normal cursor-pointer text-sm">All QoS</Label>
                    </div>
                    {([
                      ["qos_interface", "Interface"],
                      ["qos_policy", "Policy"],
                    ] as [keyof ConfigSyncSections, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sec-${key}`}
                          checked={sections[key] as boolean}
                          onCheckedChange={(v) => setSection(key, !!v)}
                        />
                        <Label htmlFor={`sec-${key}`} className="font-normal cursor-pointer text-sm">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Service */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex items-center space-x-2 col-span-4">
                      <Checkbox
                        id="sec-service"
                        checked={sections.service}
                        onCheckedChange={(v) => setSection("service", !!v)}
                      />
                      <Label htmlFor="sec-service" className="font-normal cursor-pointer text-sm">All Services</Label>
                    </div>
                    {([
                      ["service_console_server", "Console Server"],
                      ["service_dhcp_relay", "DHCP Relay"],
                      ["service_dhcp_server", "DHCP Server"],
                      ["service_dhcpv6_relay", "DHCPv6 Relay"],
                      ["service_dhcpv6_server", "DHCPv6 Server"],
                      ["service_dns", "DNS"],
                      ["service_lldp", "LLDP"],
                      ["service_mdns", "mDNS"],
                      ["service_monitoring", "Monitoring"],
                      ["service_ndp_proxy", "NDP Proxy"],
                      ["service_ntp", "NTP"],
                      ["service_snmp", "SNMP"],
                      ["service_tftp_server", "TFTP Server"],
                      ["service_webproxy", "Web Proxy"],
                    ] as [keyof ConfigSyncSections, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sec-${key}`}
                          checked={sections[key] as boolean}
                          onCheckedChange={(v) => setSection(key, !!v)}
                        />
                        <Label htmlFor={`sec-${key}`} className="font-normal cursor-pointer text-sm">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* System */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">System</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex items-center space-x-2 col-span-4">
                      <Checkbox
                        id="sec-system"
                        checked={sections.system}
                        onCheckedChange={(v) => setSection("system", !!v)}
                      />
                      <Label htmlFor="sec-system" className="font-normal cursor-pointer text-sm">All System</Label>
                    </div>
                    {([
                      ["system_conntrack", "Conntrack"],
                      ["system_flow_accounting", "Flow Accounting"],
                      ["system_login", "Login"],
                      ["system_option", "Options"],
                      ["system_sflow", "sFlow"],
                      ["system_static_host_mapping", "Static Host Mapping"],
                      ["system_sysctl", "Sysctl"],
                      ["system_time_zone", "Time Zone"],
                    ] as [keyof ConfigSyncSections, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sec-${key}`}
                          checked={sections[key] as boolean}
                          onCheckedChange={(v) => setSection(key, !!v)}
                        />
                        <Label htmlFor={`sec-${key}`} className="font-normal cursor-pointer text-sm">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Operation Failed</p>
              <p className="text-xs text-destructive whitespace-pre-wrap font-mono mt-1">{error}</p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
