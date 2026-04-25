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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  pppoeService,
  type PppoeCapabilities,
  type PppoeCreateConfig,
  type PppoeInterface,
  type PppoePdInstanceInput,
  type PppoePdInterfaceInput,
} from "@/lib/api/pppoe";
import { ApiError } from "@/lib/types/api";

interface EditPppoeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: PppoeCapabilities | null;
  interfaceData: PppoeInterface | null;
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

export function EditPppoeModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  interfaceData,
  availableEthernet,
}: EditPppoeModalProps) {
  const feat = (key: string) =>
    capabilities?.features?.[key]?.supported ?? false;

  const [description, setDescription] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [sourceInterface, setSourceInterface] = useState("");
  const [accessConcentrator, setAccessConcentrator] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [vrf, setVrf] = useState("");
  const [redirect, setRedirect] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mtu, setMtu] = useState("");
  const [mru, setMru] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [remoteAddress, setRemoteAddress] = useState("");
  const [holdoff, setHoldoff] = useState("");
  const [idleTimeout, setIdleTimeout] = useState("");
  const [hostUniq, setHostUniq] = useState("");

  const [connectOnDemand, setConnectOnDemand] = useState(false);
  const [noDefaultRoute, setNoDefaultRoute] = useState(false);
  const [defaultRouteDistance, setDefaultRouteDistance] = useState("");
  const [noPeerDns, setNoPeerDns] = useState(false);

  const [ipAdjustMss, setIpAdjustMss] = useState("");
  const [ipAdjustMssClamp, setIpAdjustMssClamp] = useState(false);
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipSourceValidation, setIpSourceValidation] = useState("");

  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressDhcpv6, setIpv6AddressDhcpv6] = useState(false);
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6AdjustMssClamp, setIpv6AdjustMssClamp] = useState(false);
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6InterfaceIdentifier, setIpv6InterfaceIdentifier] = useState("");

  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6NoRequestDns, setDhcpv6NoRequestDns] = useState(false);
  const [dhcpv6NoRequestDomainName, setDhcpv6NoRequestDomainName] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);
  const [pdInstances, setPdInstances] = useState<PdInstanceForm[]>([]);

  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !interfaceData) return;

    setDescription(interfaceData.description ?? "");
    setDisabled(!!interfaceData.disabled);
    setSourceInterface(interfaceData.source_interface ?? "");
    setAccessConcentrator(interfaceData.access_concentrator ?? "");
    setServiceName(interfaceData.service_name ?? "");
    setVrf(interfaceData.vrf ?? "");
    setRedirect(interfaceData.redirect ?? "");

    setUsername(interfaceData.authentication?.username ?? "");
    setPassword(interfaceData.authentication?.password ?? "");
    setMtu(interfaceData.mtu ?? "");
    setMru(interfaceData.mru ?? "");
    setLocalAddress(interfaceData.local_address ?? "");
    setRemoteAddress(interfaceData.remote_address ?? "");
    setHoldoff(interfaceData.holdoff ?? "");
    setIdleTimeout(interfaceData.idle_timeout ?? "");
    setHostUniq(interfaceData.host_uniq ?? "");

    setConnectOnDemand(!!interfaceData.connect_on_demand);
    setNoDefaultRoute(!!interfaceData.no_default_route);
    setDefaultRouteDistance(interfaceData.default_route_distance ?? "");
    setNoPeerDns(!!interfaceData.no_peer_dns);

    const ip = interfaceData.ip;
    setIpAdjustMss(
      ip?.adjust_mss && ip.adjust_mss !== "clamp-mss-to-pmtu" ? ip.adjust_mss : "",
    );
    setIpAdjustMssClamp(ip?.adjust_mss === "clamp-mss-to-pmtu");
    setIpDisableForwarding(!!ip?.disable_forwarding);
    setIpSourceValidation(ip?.source_validation ?? "");

    const ipv6 = interfaceData.ipv6;
    setIpv6AddressAutoconf(!!ipv6?.address_autoconf);
    setIpv6AddressDhcpv6(interfaceData.addresses?.includes("dhcpv6") ?? false);
    setIpv6AdjustMss(
      ipv6?.adjust_mss && ipv6.adjust_mss !== "clamp-mss-to-pmtu"
        ? ipv6.adjust_mss
        : "",
    );
    setIpv6AdjustMssClamp(ipv6?.adjust_mss === "clamp-mss-to-pmtu");
    setIpv6DisableForwarding(!!ipv6?.disable_forwarding);
    setIpv6InterfaceIdentifier(ipv6?.address_interface_identifier ?? "");

    const d6 = interfaceData.dhcpv6_options;
    setDhcpv6Duid(d6?.duid ?? "");
    setDhcpv6NoRelease(!!d6?.no_release);
    setDhcpv6NoRequestDns(!!d6?.no_request_dns);
    setDhcpv6NoRequestDomainName(!!d6?.no_request_domain_name);
    setDhcpv6ParametersOnly(!!d6?.parameters_only);
    setDhcpv6RapidCommit(!!d6?.rapid_commit);
    setDhcpv6Temporary(!!d6?.temporary);
    setPdInstances(
      (d6?.pd ?? []).map((pd) => ({
        instance: pd.instance,
        length: pd.length ?? "",
        interfaces: (pd.interfaces ?? []).map((di) => ({
          name: di.name,
          address: di.address ?? "",
          sla_id: di.sla_id ?? "",
        })),
      })),
    );

    setMirrorIngress(interfaceData.mirror_ingress ?? "");
    setMirrorEgress(interfaceData.mirror_egress ?? "");

    setError(null);
  }, [open, interfaceData]);

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

  const buildUpdate = (): Partial<PppoeCreateConfig> => {
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

    return {
      description,
      disabled,
      source_interface: sourceInterface,
      access_concentrator: accessConcentrator,
      service_name: serviceName,
      vrf,
      redirect,
      connect_on_demand: connectOnDemand,
      default_route_distance: defaultRouteDistance,
      no_default_route: noDefaultRoute,
      no_peer_dns: noPeerDns,
      holdoff,
      idle_timeout: idleTimeout,
      host_uniq: hostUniq,
      mtu,
      mru,
      local_address: localAddress,
      remote_address: remoteAddress,
      authentication: { username, password },
      dhcpv6_options: {
        duid: dhcpv6Duid,
        no_release: dhcpv6NoRelease,
        no_request_dns: dhcpv6NoRequestDns,
        no_request_domain_name: dhcpv6NoRequestDomainName,
        parameters_only: dhcpv6ParametersOnly,
        rapid_commit: dhcpv6RapidCommit,
        temporary: dhcpv6Temporary,
        pd,
      },
      ip: {
        adjust_mss: ipAdjustMssClamp ? undefined : ipAdjustMss,
        adjust_mss_clamp_to_pmtu: ipAdjustMssClamp,
        disable_forwarding: ipDisableForwarding,
        source_validation: ipSourceValidation,
      },
      ipv6: {
        address_autoconf: ipv6AddressAutoconf,
        address_dhcpv6: ipv6AddressDhcpv6,
        adjust_mss: ipv6AdjustMssClamp ? undefined : ipv6AdjustMss,
        adjust_mss_clamp_to_pmtu: ipv6AdjustMssClamp,
        disable_forwarding: ipv6DisableForwarding,
        address_interface_identifier: ipv6InterfaceIdentifier,
      },
      mirror_ingress: mirrorIngress,
      mirror_egress: mirrorEgress,
    };
  };

  const handleSubmit = async () => {
    if (!interfaceData) return;
    const clientError = validate();
    if (clientError) {
      setError(clientError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await pppoeService.updateInterface(
        interfaceData.name,
        interfaceData,
        buildUpdate(),
      );
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update PPPoE interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update PPPoE interface");
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  const sourceOptions = availableEthernet ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit PPPoE Interface: {interfaceData.name}</DialogTitle>
          <DialogDescription>
            Update this PPPoE session&apos;s configuration. Changes commit atomically.
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
            <div>
              <Label htmlFor="edit-pppoe-desc">Description</Label>
              <Input
                id="edit-pppoe-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-pppoe-source">Source Interface</Label>
              <Select
                value={sourceInterface || "__none__"}
                onValueChange={(v) =>
                  setSourceInterface(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger id="edit-pppoe-source">
                  <SelectValue placeholder="Select ethernet or VLAN" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {sourceOptions.map((iface) => (
                    <SelectItem key={iface} value={iface}>
                      {iface}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-pppoe-ac">Access Concentrator</Label>
                <Input
                  id="edit-pppoe-ac"
                  value={accessConcentrator}
                  onChange={(e) => setAccessConcentrator(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-pppoe-service">Service Name</Label>
                <Input
                  id="edit-pppoe-service"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-pppoe-vrf">VRF</Label>
                <Input
                  id="edit-pppoe-vrf"
                  value={vrf}
                  onChange={(e) => setVrf(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-pppoe-redirect">Redirect Interface</Label>
                <Input
                  id="edit-pppoe-redirect"
                  value={redirect}
                  onChange={(e) => setRedirect(e.target.value)}
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
                <Label htmlFor="edit-pppoe-user">PAP/CHAP Username</Label>
                <Input
                  id="edit-pppoe-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="edit-pppoe-pass">PAP/CHAP Password</Label>
                <Input
                  id="edit-pppoe-pass"
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
                <Label htmlFor="edit-pppoe-mtu">MTU</Label>
                <Input
                  id="edit-pppoe-mtu"
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  placeholder="68-1500"
                />
              </div>
              <div>
                <Label htmlFor="edit-pppoe-mru">MRU</Label>
                <Input
                  id="edit-pppoe-mru"
                  value={mru}
                  onChange={(e) => setMru(e.target.value)}
                  placeholder="128-16384"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-pppoe-local">Local Address (IPv4)</Label>
                <Input
                  id="edit-pppoe-local"
                  value={localAddress}
                  onChange={(e) => setLocalAddress(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-pppoe-remote">Remote Address (IPv4)</Label>
                <Input
                  id="edit-pppoe-remote"
                  value={remoteAddress}
                  onChange={(e) => setRemoteAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-pppoe-holdoff">Holdoff (s)</Label>
                <Input
                  id="edit-pppoe-holdoff"
                  value={holdoff}
                  onChange={(e) => setHoldoff(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-pppoe-idle">Idle Timeout (s)</Label>
                <Input
                  id="edit-pppoe-idle"
                  value={idleTimeout}
                  onChange={(e) => setIdleTimeout(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-pppoe-hostuniq">Host-Uniq (hex)</Label>
                <Input
                  id="edit-pppoe-hostuniq"
                  value={hostUniq}
                  onChange={(e) => setHostUniq(e.target.value)}
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
              <span>Connect on demand</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={noDefaultRoute}
                onCheckedChange={(v) => setNoDefaultRoute(!!v)}
              />
              <span>Do not install a default route</span>
            </label>
            <div>
              <Label htmlFor="edit-pppoe-drd">Default Route Distance</Label>
              <Input
                id="edit-pppoe-drd"
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
              <span>Disable IPv4 forwarding</span>
            </label>
            <div>
              <Label htmlFor="edit-pppoe-srcval">Source Validation</Label>
              <Select
                value={ipSourceValidation || "__none__"}
                onValueChange={(v) =>
                  setIpSourceValidation(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger id="edit-pppoe-srcval">
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
              <span>Disable IPv6 forwarding</span>
            </label>
            {feat("ipv6_address_interface_identifier") && (
              <div>
                <Label htmlFor="edit-pppoe-ipv6-iid">Interface Identifier</Label>
                <Input
                  id="edit-pppoe-ipv6-iid"
                  value={ipv6InterfaceIdentifier}
                  onChange={(e) => setIpv6InterfaceIdentifier(e.target.value)}
                />
              </div>
            )}
          </TabsContent>

          {/* DHCPv6 */}
          <TabsContent value="dhcpv6" className="space-y-4">
            <div>
              <Label htmlFor="edit-pppoe-duid">DUID</Label>
              <Input
                id="edit-pppoe-duid"
                value={dhcpv6Duid}
                onChange={(e) => setDhcpv6Duid(e.target.value)}
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
              <Label htmlFor="edit-pppoe-mirror-in">Ingress Mirror Interface</Label>
              <Select
                value={mirrorIngress || "__none__"}
                onValueChange={(v) =>
                  setMirrorIngress(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger id="edit-pppoe-mirror-in">
                  <SelectValue placeholder="Select interface" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {sourceOptions.map((iface) => (
                    <SelectItem key={iface} value={iface}>
                      {iface}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-pppoe-mirror-out">Egress Mirror Interface</Label>
              <Select
                value={mirrorEgress || "__none__"}
                onValueChange={(v) =>
                  setMirrorEgress(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger id="edit-pppoe-mirror-out">
                  <SelectValue placeholder="Select interface" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {sourceOptions.map((iface) => (
                    <SelectItem key={iface} value={iface}>
                      {iface}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
