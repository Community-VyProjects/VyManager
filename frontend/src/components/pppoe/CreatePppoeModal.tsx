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
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  pppoeService,
  type PppoeCapabilities,
  type PppoeCreateConfig,
  type PppoePdInstanceInput,
  type PppoePdInterfaceInput,
} from "@/lib/api/pppoe";
import { ApiError } from "@/lib/types/api";

interface CreatePppoeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: PppoeCapabilities | null;
  existingInterfaces: string[];
  availableEthernet?: string[];
}

interface PdInstanceForm {
  instance: string;
  length: string;
  interfaces: PppoePdInterfaceInput[];
}

const SOURCE_VALIDATION_OPTIONS = [
  { value: "strict", label: "Strict" },
  { value: "loose", label: "Loose" },
  { value: "disable", label: "Disable" },
];

const PPPOE_NAME_RE = /^pppoe[0-9]+$/;

export function CreatePppoeModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
  availableEthernet,
}: CreatePppoeModalProps) {
  const feat = (key: string) =>
    capabilities?.features?.[key]?.supported ?? false;

  // Basic
  const [name, setName] = useState("pppoe0");
  const [description, setDescription] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [sourceInterface, setSourceInterface] = useState("");
  const [accessConcentrator, setAccessConcentrator] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [vrf, setVrf] = useState("");
  const [redirect, setRedirect] = useState("");

  // PPP
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mtu, setMtu] = useState("");
  const [mru, setMru] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [remoteAddress, setRemoteAddress] = useState("");
  const [holdoff, setHoldoff] = useState("");
  const [idleTimeout, setIdleTimeout] = useState("");
  const [hostUniq, setHostUniq] = useState("");

  // Routing
  const [connectOnDemand, setConnectOnDemand] = useState(false);
  const [noDefaultRoute, setNoDefaultRoute] = useState(false);
  const [defaultRouteDistance, setDefaultRouteDistance] = useState("");
  const [noPeerDns, setNoPeerDns] = useState(false);

  // IP
  const [ipAdjustMss, setIpAdjustMss] = useState("");
  const [ipAdjustMssClamp, setIpAdjustMssClamp] = useState(false);
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipSourceValidation, setIpSourceValidation] = useState("");

  // IPv6
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressDhcpv6, setIpv6AddressDhcpv6] = useState(false);
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6AdjustMssClamp, setIpv6AdjustMssClamp] = useState(false);
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6InterfaceIdentifier, setIpv6InterfaceIdentifier] = useState("");

  // DHCPv6
  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6NoRequestDns, setDhcpv6NoRequestDns] = useState(false);
  const [dhcpv6NoRequestDomainName, setDhcpv6NoRequestDomainName] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);
  const [pdInstances, setPdInstances] = useState<PdInstanceForm[]>([]);

  // Mirror
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("pppoe0");
    setDescription("");
    setDisabled(false);
    setSourceInterface("");
    setAccessConcentrator("");
    setServiceName("");
    setVrf("");
    setRedirect("");
    setUsername("");
    setPassword("");
    setMtu("");
    setMru("");
    setLocalAddress("");
    setRemoteAddress("");
    setHoldoff("");
    setIdleTimeout("");
    setHostUniq("");
    setConnectOnDemand(false);
    setNoDefaultRoute(false);
    setDefaultRouteDistance("");
    setNoPeerDns(false);
    setIpAdjustMss("");
    setIpAdjustMssClamp(false);
    setIpDisableForwarding(false);
    setIpSourceValidation("");
    setIpv6AddressAutoconf(false);
    setIpv6AddressDhcpv6(false);
    setIpv6AdjustMss("");
    setIpv6AdjustMssClamp(false);
    setIpv6DisableForwarding(false);
    setIpv6InterfaceIdentifier("");
    setDhcpv6Duid("");
    setDhcpv6NoRelease(false);
    setDhcpv6NoRequestDns(false);
    setDhcpv6NoRequestDomainName(false);
    setDhcpv6ParametersOnly(false);
    setDhcpv6RapidCommit(false);
    setDhcpv6Temporary(false);
    setPdInstances([]);
    setMirrorIngress("");
    setMirrorEgress("");
    setError(null);
  }, [open]);

  const addPdInstance = () => {
    setPdInstances((prev) => [
      ...prev,
      { instance: String(prev.length + 1), length: "", interfaces: [] },
    ]);
  };

  const removePdInstance = (index: number) => {
    setPdInstances((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePdInstance = (index: number, patch: Partial<PdInstanceForm>) => {
    setPdInstances((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addPdDelegatedIface = (instanceIdx: number) => {
    setPdInstances((prev) =>
      prev.map((row, i) =>
        i === instanceIdx
          ? {
              ...row,
              interfaces: [...row.interfaces, { name: "", address: "", sla_id: "" }],
            }
          : row,
      ),
    );
  };

  const removePdDelegatedIface = (instanceIdx: number, ifaceIdx: number) => {
    setPdInstances((prev) =>
      prev.map((row, i) =>
        i === instanceIdx
          ? {
              ...row,
              interfaces: row.interfaces.filter((_, j) => j !== ifaceIdx),
            }
          : row,
      ),
    );
  };

  const updatePdDelegatedIface = (
    instanceIdx: number,
    ifaceIdx: number,
    patch: Partial<PppoePdInterfaceInput>,
  ) => {
    setPdInstances((prev) =>
      prev.map((row, i) =>
        i === instanceIdx
          ? {
              ...row,
              interfaces: row.interfaces.map((iface, j) =>
                j === ifaceIdx ? { ...iface, ...patch } : iface,
              ),
            }
          : row,
      ),
    );
  };

  const validate = (): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return "Interface name is required.";
    if (!PPPOE_NAME_RE.test(trimmed)) {
      return "Interface name must match pattern 'pppoeN' (e.g. pppoe0).";
    }
    if (existingInterfaces.includes(trimmed)) {
      return `Interface '${trimmed}' already exists.`;
    }
    if (mtu) {
      const n = Number(mtu);
      if (!Number.isInteger(n) || n < 68 || n > 1500) {
        return "MTU must be an integer between 68 and 1500.";
      }
    }
    if (mru) {
      const n = Number(mru);
      if (!Number.isInteger(n) || n < 128 || n > 16384) {
        return "MRU must be an integer between 128 and 16384.";
      }
    }
    if (defaultRouteDistance) {
      const n = Number(defaultRouteDistance);
      if (!Number.isInteger(n) || n < 1 || n > 255) {
        return "Default route distance must be between 1 and 255.";
      }
    }
    for (const pd of pdInstances) {
      if (!pd.instance.trim()) {
        return "Each PD instance must have an identifier.";
      }
      if (pd.length) {
        const n = Number(pd.length);
        if (!Number.isInteger(n) || n < 32 || n > 64) {
          return "PD length must be between 32 and 64.";
        }
      }
      for (const di of pd.interfaces) {
        if (!di.name?.trim()) {
          return "Each delegated interface must have a name.";
        }
      }
    }
    return null;
  };

  const buildConfig = (): PppoeCreateConfig => {
    const pd: PppoePdInstanceInput[] = pdInstances.map((row) => ({
      instance: row.instance.trim(),
      length: row.length || undefined,
      interfaces: row.interfaces
        .filter((di) => di.name?.trim())
        .map((di) => ({
          name: di.name.trim(),
          address: di.address?.trim() || undefined,
          sla_id: di.sla_id?.trim() || undefined,
        })),
    }));

    const auth =
      username.trim() || password
        ? { username: username.trim() || undefined, password: password || undefined }
        : undefined;

    const hasDhcpv6 =
      dhcpv6Duid.trim() ||
      dhcpv6NoRelease ||
      dhcpv6NoRequestDns ||
      dhcpv6NoRequestDomainName ||
      dhcpv6ParametersOnly ||
      dhcpv6RapidCommit ||
      dhcpv6Temporary ||
      pd.length > 0;

    const hasIp =
      ipAdjustMss.trim() ||
      ipAdjustMssClamp ||
      ipDisableForwarding ||
      !!ipSourceValidation;

    const hasIpv6 =
      ipv6AddressAutoconf ||
      ipv6AddressDhcpv6 ||
      ipv6AdjustMss.trim() ||
      ipv6AdjustMssClamp ||
      ipv6DisableForwarding ||
      ipv6InterfaceIdentifier.trim();

    return {
      name: name.trim(),
      description: description.trim() || undefined,
      disabled: disabled || undefined,
      source_interface: sourceInterface || undefined,
      access_concentrator: accessConcentrator.trim() || undefined,
      service_name: serviceName.trim() || undefined,
      vrf: vrf.trim() || undefined,
      redirect: redirect.trim() || undefined,
      connect_on_demand: connectOnDemand || undefined,
      default_route_distance: defaultRouteDistance.trim() || undefined,
      no_default_route: noDefaultRoute || undefined,
      no_peer_dns: noPeerDns || undefined,
      holdoff: holdoff.trim() || undefined,
      idle_timeout: idleTimeout.trim() || undefined,
      host_uniq: hostUniq.trim() || undefined,
      mtu: mtu.trim() || undefined,
      mru: mru.trim() || undefined,
      local_address: localAddress.trim() || undefined,
      remote_address: remoteAddress.trim() || undefined,
      authentication: auth,
      dhcpv6_options: hasDhcpv6
        ? {
            duid: dhcpv6Duid.trim() || undefined,
            no_release: dhcpv6NoRelease || undefined,
            no_request_dns: dhcpv6NoRequestDns || undefined,
            no_request_domain_name: dhcpv6NoRequestDomainName || undefined,
            parameters_only: dhcpv6ParametersOnly || undefined,
            rapid_commit: dhcpv6RapidCommit || undefined,
            temporary: dhcpv6Temporary || undefined,
            pd: pd.length > 0 ? pd : undefined,
          }
        : undefined,
      ip: hasIp
        ? {
            adjust_mss: ipAdjustMssClamp ? undefined : ipAdjustMss.trim() || undefined,
            adjust_mss_clamp_to_pmtu: ipAdjustMssClamp || undefined,
            disable_forwarding: ipDisableForwarding || undefined,
            source_validation: ipSourceValidation || undefined,
          }
        : undefined,
      ipv6: hasIpv6
        ? {
            address_autoconf: ipv6AddressAutoconf || undefined,
            address_dhcpv6: ipv6AddressDhcpv6 || undefined,
            adjust_mss: ipv6AdjustMssClamp ? undefined : ipv6AdjustMss.trim() || undefined,
            adjust_mss_clamp_to_pmtu: ipv6AdjustMssClamp || undefined,
            disable_forwarding: ipv6DisableForwarding || undefined,
            address_interface_identifier: ipv6InterfaceIdentifier.trim() || undefined,
          }
        : undefined,
      mirror_ingress: mirrorIngress || undefined,
      mirror_egress: mirrorEgress || undefined,
    };
  };

  const handleSubmit = async () => {
    const clientError = validate();
    if (clientError) {
      setError(clientError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await pppoeService.createInterface(buildConfig());
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to create PPPoE interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create PPPoE interface");
    } finally {
      setLoading(false);
    }
  };

  const sourceOptions = availableEthernet ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create PPPoE Interface</DialogTitle>
          <DialogDescription>
            Dial up to an upstream access concentrator over an Ethernet source interface.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="ppp">PPP</TabsTrigger>
            <TabsTrigger value="routing">Routing</TabsTrigger>
            <TabsTrigger value="ip">IP</TabsTrigger>
            <TabsTrigger value="ipv6">IPv6</TabsTrigger>
            <TabsTrigger value="dhcpv6">DHCPv6</TabsTrigger>
            <TabsTrigger value="mirror">Mirror</TabsTrigger>
          </TabsList>

          {/* Basic */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pppoe-name">Interface Name *</Label>
                <Input
                  id="pppoe-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="pppoe0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must match pattern pppoeN.
                </p>
              </div>
              <div>
                <Label htmlFor="pppoe-desc">Description</Label>
                <Input
                  id="pppoe-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ISP uplink"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pppoe-source">Source Interface *</Label>
              <InterfaceSelect
                value={sourceInterface}
                onValueChange={setSourceInterface}
                id="pppoe-source"
                interfaces={sourceOptions.map((n) => ({ name: n, type: "", description: null }))}
                placeholder="Select ethernet or VLAN"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Underlying interface used to establish the session.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pppoe-ac">Access Concentrator</Label>
                <Input
                  id="pppoe-ac"
                  value={accessConcentrator}
                  onChange={(e) => setAccessConcentrator(e.target.value)}
                  placeholder="optional AC name"
                />
              </div>
              <div>
                <Label htmlFor="pppoe-service">Service Name</Label>
                <Input
                  id="pppoe-service"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="only connect to ACs advertising this service"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pppoe-vrf">VRF</Label>
                <Input
                  id="pppoe-vrf"
                  value={vrf}
                  onChange={(e) => setVrf(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pppoe-redirect">Redirect Interface</Label>
                <Input
                  id="pppoe-redirect"
                  value={redirect}
                  onChange={(e) => setRedirect(e.target.value)}
                  placeholder="destination interface for incoming packets"
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <Checkbox
                checked={disabled}
                onCheckedChange={(v) => setDisabled(!!v)}
              />
              <span>Administratively disable this interface</span>
            </label>
          </TabsContent>

          {/* PPP */}
          <TabsContent value="ppp" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pppoe-user">PAP/CHAP Username</Label>
                <Input
                  id="pppoe-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="pppoe-pass">PAP/CHAP Password</Label>
                <Input
                  id="pppoe-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pppoe-mtu">MTU</Label>
                <Input
                  id="pppoe-mtu"
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  placeholder="68-1500"
                />
              </div>
              <div>
                <Label htmlFor="pppoe-mru">MRU</Label>
                <Input
                  id="pppoe-mru"
                  value={mru}
                  onChange={(e) => setMru(e.target.value)}
                  placeholder="128-16384"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pppoe-local">Local Address (IPv4)</Label>
                <Input
                  id="pppoe-local"
                  value={localAddress}
                  onChange={(e) => setLocalAddress(e.target.value)}
                  placeholder="e.g. 10.0.0.1"
                />
              </div>
              <div>
                <Label htmlFor="pppoe-remote">Remote Address (IPv4)</Label>
                <Input
                  id="pppoe-remote"
                  value={remoteAddress}
                  onChange={(e) => setRemoteAddress(e.target.value)}
                  placeholder="e.g. 10.0.0.2"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="pppoe-holdoff">Holdoff (seconds)</Label>
                <Input
                  id="pppoe-holdoff"
                  value={holdoff}
                  onChange={(e) => setHoldoff(e.target.value)}
                  placeholder="re-dial delay"
                />
              </div>
              <div>
                <Label htmlFor="pppoe-idle">Idle Timeout (seconds)</Label>
                <Input
                  id="pppoe-idle"
                  value={idleTimeout}
                  onChange={(e) => setIdleTimeout(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pppoe-hostuniq">Host-Uniq (hex)</Label>
                <Input
                  id="pppoe-hostuniq"
                  value={hostUniq}
                  onChange={(e) => setHostUniq(e.target.value)}
                  placeholder="RFC2516 host-uniq"
                />
              </div>
            </div>
          </TabsContent>

          {/* Routing */}
          <TabsContent value="routing" className="space-y-4">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={connectOnDemand}
                onCheckedChange={(v) => setConnectOnDemand(!!v)}
              />
              <span>Connect on demand (dial only when traffic is sent)</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={noDefaultRoute}
                onCheckedChange={(v) => setNoDefaultRoute(!!v)}
              />
              <span>Do not install a default route</span>
            </label>
            <div>
              <Label htmlFor="pppoe-drd">Default Route Distance</Label>
              <Input
                id="pppoe-drd"
                value={defaultRouteDistance}
                onChange={(e) => setDefaultRouteDistance(e.target.value)}
                placeholder="1-255"
              />
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={noPeerDns}
                onCheckedChange={(v) => setNoPeerDns(!!v)}
              />
              <span>Do not use peer-provided DNS servers</span>
            </label>
          </TabsContent>

          {/* IP */}
          <TabsContent value="ip" className="space-y-4">
            <div className="space-y-2">
              <Label>Adjust MSS</Label>
              <div className="flex items-center gap-3">
                <Input
                  value={ipAdjustMss}
                  onChange={(e) => setIpAdjustMss(e.target.value)}
                  placeholder="MSS value (bytes)"
                  disabled={ipAdjustMssClamp}
                  className="max-w-xs"
                />
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={ipAdjustMssClamp}
                    onCheckedChange={(v) => setIpAdjustMssClamp(!!v)}
                  />
                  <span>Clamp to PMTU</span>
                </label>
              </div>
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={ipDisableForwarding}
                onCheckedChange={(v) => setIpDisableForwarding(!!v)}
              />
              <span>Disable IPv4 forwarding on this interface</span>
            </label>
            <div>
              <Label htmlFor="pppoe-srcval">Source Validation</Label>
              <Select
                value={ipSourceValidation || "__none__"}
                onValueChange={(v) =>
                  setIpSourceValidation(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger id="pppoe-srcval">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not set</SelectItem>
                  {SOURCE_VALIDATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* IPv6 */}
          <TabsContent value="ipv6" className="space-y-4">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={ipv6AddressAutoconf}
                onCheckedChange={(v) => setIpv6AddressAutoconf(!!v)}
              />
              <span>Address autoconf (SLAAC)</span>
            </label>
            {feat("address_dhcpv6") && (
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipv6AddressDhcpv6}
                  onCheckedChange={(v) => setIpv6AddressDhcpv6(!!v)}
                />
                <span>Request a stateful DHCPv6 address</span>
              </label>
            )}
            <div className="space-y-2">
              <Label>Adjust MSS (IPv6)</Label>
              <div className="flex items-center gap-3">
                <Input
                  value={ipv6AdjustMss}
                  onChange={(e) => setIpv6AdjustMss(e.target.value)}
                  placeholder="MSS value (bytes)"
                  disabled={ipv6AdjustMssClamp}
                  className="max-w-xs"
                />
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={ipv6AdjustMssClamp}
                    onCheckedChange={(v) => setIpv6AdjustMssClamp(!!v)}
                  />
                  <span>Clamp to PMTU</span>
                </label>
              </div>
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={ipv6DisableForwarding}
                onCheckedChange={(v) => setIpv6DisableForwarding(!!v)}
              />
              <span>Disable IPv6 forwarding on this interface</span>
            </label>
            {feat("ipv6_address_interface_identifier") && (
              <div>
                <Label htmlFor="pppoe-ipv6-iid">Interface Identifier</Label>
                <Input
                  id="pppoe-ipv6-iid"
                  value={ipv6InterfaceIdentifier}
                  onChange={(e) => setIpv6InterfaceIdentifier(e.target.value)}
                  placeholder="manual SLAAC identifier"
                />
              </div>
            )}
          </TabsContent>

          {/* DHCPv6 */}
          <TabsContent value="dhcpv6" className="space-y-4">
            <div>
              <Label htmlFor="pppoe-duid">DUID</Label>
              <Input
                id="pppoe-duid"
                value={dhcpv6Duid}
                onChange={(e) => setDhcpv6Duid(e.target.value)}
                placeholder="DHCP Unique Identifier"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={dhcpv6NoRelease}
                  onCheckedChange={(v) => setDhcpv6NoRelease(!!v)}
                />
                <span>No release</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={dhcpv6RapidCommit}
                  onCheckedChange={(v) => setDhcpv6RapidCommit(!!v)}
                />
                <span>Rapid commit</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={dhcpv6Temporary}
                  onCheckedChange={(v) => setDhcpv6Temporary(!!v)}
                />
                <span>Temporary address</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={dhcpv6ParametersOnly}
                  onCheckedChange={(v) => setDhcpv6ParametersOnly(!!v)}
                />
                <span>Parameters only</span>
              </label>
              {feat("dhcpv6_no_request_dns") && (
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={dhcpv6NoRequestDns}
                    onCheckedChange={(v) => setDhcpv6NoRequestDns(!!v)}
                  />
                  <span>Don&apos;t request DNS</span>
                </label>
              )}
              {feat("dhcpv6_no_request_domain_name") && (
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={dhcpv6NoRequestDomainName}
                    onCheckedChange={(v) => setDhcpv6NoRequestDomainName(!!v)}
                  />
                  <span>Don&apos;t request domain name</span>
                </label>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Prefix Delegation</p>
                <p className="text-xs text-muted-foreground">
                  Request IPv6 prefixes and delegate them to downstream interfaces.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPdInstance}
              >
                <Plus className="h-4 w-4 mr-1" /> Add PD Instance
              </Button>
            </div>

            {pdInstances.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No PD instances configured.
              </p>
            )}

            {pdInstances.map((pd, idx) => (
              <div
                key={idx}
                className="rounded-lg border p-3 space-y-3 bg-muted/20"
              >
                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                  <div>
                    <Label>Instance</Label>
                    <Input
                      value={pd.instance}
                      onChange={(e) =>
                        updatePdInstance(idx, { instance: e.target.value })
                      }
                      placeholder="instance id"
                    />
                  </div>
                  <div>
                    <Label>Prefix Length</Label>
                    <Input
                      value={pd.length}
                      onChange={(e) =>
                        updatePdInstance(idx, { length: e.target.value })
                      }
                      placeholder="32-64"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePdInstance(idx)}
                    aria-label="Remove PD instance"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Delegated Interfaces</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPdDelegatedIface(idx)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Interface
                    </Button>
                  </div>
                  {pd.interfaces.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No delegated interfaces.
                    </p>
                  )}
                  {pd.interfaces.map((di, ifaceIdx) => (
                    <div
                      key={ifaceIdx}
                      className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
                    >
                      <div>
                        <Label className="text-xs">Interface</Label>
                        <Input
                          value={di.name ?? ""}
                          onChange={(e) =>
                            updatePdDelegatedIface(idx, ifaceIdx, {
                              name: e.target.value,
                            })
                          }
                          placeholder="eth1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Address</Label>
                        <Input
                          value={di.address ?? ""}
                          onChange={(e) =>
                            updatePdDelegatedIface(idx, ifaceIdx, {
                              address: e.target.value,
                            })
                          }
                          placeholder="optional"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">SLA ID</Label>
                        <Input
                          value={di.sla_id ?? ""}
                          onChange={(e) =>
                            updatePdDelegatedIface(idx, ifaceIdx, {
                              sla_id: e.target.value,
                            })
                          }
                          placeholder="optional"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePdDelegatedIface(idx, ifaceIdx)}
                        aria-label="Remove delegated interface"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Mirror */}
          <TabsContent value="mirror" className="space-y-4">
            <div>
              <Label htmlFor="pppoe-mirror-in">Ingress Mirror Interface</Label>
              <InterfaceSelect
                value={mirrorIngress || "__none__"}
                onValueChange={(v) => setMirrorIngress(v === "__none__" ? "" : v)}
                id="pppoe-mirror-in"
                interfaces={sourceOptions.map((n) => ({ name: n, type: "", description: null }))}
                noneOption={{ label: "None", value: "__none__" }}
                placeholder="Select interface"
              />
            </div>
            <div>
              <Label htmlFor="pppoe-mirror-out">Egress Mirror Interface</Label>
              <InterfaceSelect
                value={mirrorEgress || "__none__"}
                onValueChange={(v) => setMirrorEgress(v === "__none__" ? "" : v)}
                id="pppoe-mirror-out"
                interfaces={sourceOptions.map((n) => ({ name: n, type: "", description: null }))}
                noneOption={{ label: "None", value: "__none__" }}
                placeholder="Select interface"
              />
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
