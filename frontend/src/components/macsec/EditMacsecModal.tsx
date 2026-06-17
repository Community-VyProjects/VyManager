"use client";

import { useState, useEffect } from "react";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { VrfSelect } from "@/components/ui/vrf-select";
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
import { Lock, Loader2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { macsecService, type MacsecInterface, type MacsecCapabilities, type MacsecMkaConfig, type MacsecStaticConfig, type MacsecSecurityConfig } from "@/lib/api/macsec";
import { ApiError } from "@/lib/types/api";

interface StaticPeerEntry {
  name: string;
  key: string;
  mac: string;
  disable: boolean;
}

interface EditMacsecModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: MacsecCapabilities | null;
  interfaceData: MacsecInterface | null;
}

export function EditMacsecModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  interfaceData,
}: EditMacsecModalProps) {
  const [allInterfaces, setAllInterfaces] = useState<InterfaceName[]>([]);

  useEffect(() => {
    if (open) {
      showService.getAllInterfaces().then((res) => setAllInterfaces(res.interfaces)).catch(() => {});
    }
  }, [open]);

  // Basic
  const [sourceInterface, setSourceInterface] = useState("");
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Security
  const [cipher, setCipher] = useState("gcm-aes-128");
  const [encrypt, setEncrypt] = useState(true);
  const [replayWindow, setReplayWindow] = useState("");
  const [securityMode, setSecurityMode] = useState<"mka" | "static">("mka");

  // MKA
  const [mkaCak, setMkaCak] = useState("");
  const [mkaCkn, setMkaCkn] = useState("");
  const [mkaPriority, setMkaPriority] = useState("");

  // Static
  const [staticKey, setStaticKey] = useState("");
  const [staticPeers, setStaticPeers] = useState<StaticPeerEntry[]>([]);

  // Addresses
  const [addresses, setAddresses] = useState("");
  const [useDhcp, setUseDhcp] = useState(false);
  const [useDhcpv6, setUseDhcpv6] = useState(false);

  // DHCP Options
  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");
  const [dhcpVendorClassId, setDhcpVendorClassId] = useState("");
  const [dhcpNoDefaultRoute, setDhcpNoDefaultRoute] = useState(false);
  const [dhcpDefaultRouteDistance, setDhcpDefaultRouteDistance] = useState("");
  const [dhcpMtu, setDhcpMtu] = useState(false);

  // IP settings
  const [ipAdjustMss, setIpAdjustMss] = useState("");
  const [ipArpCacheTimeout, setIpArpCacheTimeout] = useState("");
  const [ipDisableArpFilter, setIpDisableArpFilter] = useState(false);
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipEnableArpAccept, setIpEnableArpAccept] = useState(false);
  const [ipEnableArpAnnounce, setIpEnableArpAnnounce] = useState(false);
  const [ipEnableArpIgnore, setIpEnableArpIgnore] = useState(false);
  const [ipEnableDirectedBroadcast, setIpEnableDirectedBroadcast] = useState(false);
  const [ipEnableProxyArp, setIpEnableProxyArp] = useState(false);
  const [ipProxyArpPvlan, setIpProxyArpPvlan] = useState(false);
  const [ipSourceValidation, setIpSourceValidation] = useState("");

  // IPv6 settings
  const [ipv6AcceptDad, setIpv6AcceptDad] = useState("");
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressEui64, setIpv6AddressEui64] = useState("");
  const [ipv6NoDefaultLinkLocal, setIpv6NoDefaultLinkLocal] = useState(false);
  const [ipv6InterfaceIdentifier, setIpv6InterfaceIdentifier] = useState("");
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6BaseReachableTime, setIpv6BaseReachableTime] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6DupAddrDetect, setIpv6DupAddrDetect] = useState("");
  const [ipv6SourceValidation, setIpv6SourceValidation] = useState("");

  // Mirror & Redirect
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");
  const [redirect, setRedirect] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form from interfaceData
  useEffect(() => {
    if (!open || !interfaceData) return;

    setSourceInterface(interfaceData.source_interface || "");
    setDescription(interfaceData.description || "");
    setMtu(interfaceData.mtu || "");
    setVrf(interfaceData.vrf || "");
    setDisabled(interfaceData.disabled);

    setCipher(interfaceData.security?.cipher || "gcm-aes-128");
    setEncrypt(interfaceData.security?.encrypt ?? true);
    setReplayWindow(interfaceData.security?.replay_window || "");

    // Determine security mode
    if (interfaceData.security?.static?.key || (interfaceData.security?.static?.peers && interfaceData.security.static.peers.length > 0)) {
      setSecurityMode("static");
      setStaticKey(interfaceData.security.static?.key || "");
      setStaticPeers(
        (interfaceData.security.static?.peers || []).map((p) => ({
          name: p.name,
          key: p.key || "",
          mac: p.mac || "",
          disable: p.disable,
        }))
      );
      setMkaCak("");
      setMkaCkn("");
      setMkaPriority("");
    } else {
      setSecurityMode("mka");
      setMkaCak(interfaceData.security?.mka?.cak || "");
      setMkaCkn(interfaceData.security?.mka?.ckn || "");
      setMkaPriority(interfaceData.security?.mka?.priority || "");
      setStaticKey("");
      setStaticPeers([]);
    }

    // Addresses
    const staticAddrs = (interfaceData.addresses || []).filter((a) => a !== "dhcp" && a !== "dhcpv6");
    setAddresses(staticAddrs.join(", "));
    setUseDhcp((interfaceData.addresses || []).includes("dhcp"));
    setUseDhcpv6((interfaceData.addresses || []).includes("dhcpv6"));

    // DHCP Options
    setDhcpClientId(interfaceData.dhcp_options?.client_id || "");
    setDhcpHostName(interfaceData.dhcp_options?.host_name || "");
    setDhcpVendorClassId(interfaceData.dhcp_options?.vendor_class_id || "");
    setDhcpNoDefaultRoute(interfaceData.dhcp_options?.no_default_route ?? false);
    setDhcpDefaultRouteDistance(interfaceData.dhcp_options?.default_route_distance || "");
    setDhcpMtu(interfaceData.dhcp_options?.mtu ?? false);

    // IP settings
    setIpAdjustMss(interfaceData.ip?.adjust_mss || "");
    setIpArpCacheTimeout(interfaceData.ip?.arp_cache_timeout || "");
    setIpDisableArpFilter(interfaceData.ip?.disable_arp_filter ?? false);
    setIpDisableForwarding(interfaceData.ip?.disable_forwarding ?? false);
    setIpEnableArpAccept(interfaceData.ip?.enable_arp_accept ?? false);
    setIpEnableArpAnnounce(interfaceData.ip?.enable_arp_announce ?? false);
    setIpEnableArpIgnore(interfaceData.ip?.enable_arp_ignore ?? false);
    setIpEnableDirectedBroadcast(interfaceData.ip?.enable_directed_broadcast ?? false);
    setIpEnableProxyArp(interfaceData.ip?.enable_proxy_arp ?? false);
    setIpProxyArpPvlan(interfaceData.ip?.proxy_arp_pvlan ?? false);
    setIpSourceValidation(interfaceData.ip?.source_validation || "");

    // IPv6 settings
    setIpv6AcceptDad(interfaceData.ipv6?.accept_dad || "");
    setIpv6AddressAutoconf(interfaceData.ipv6?.address_autoconf ?? false);
    setIpv6AddressEui64(interfaceData.ipv6?.address_eui64 || "");
    setIpv6NoDefaultLinkLocal(interfaceData.ipv6?.address_no_default_link_local ?? false);
    setIpv6InterfaceIdentifier(interfaceData.ipv6?.address_interface_identifier || "");
    setIpv6AdjustMss(interfaceData.ipv6?.adjust_mss || "");
    setIpv6BaseReachableTime(interfaceData.ipv6?.base_reachable_time || "");
    setIpv6DisableForwarding(interfaceData.ipv6?.disable_forwarding ?? false);
    setIpv6DupAddrDetect(interfaceData.ipv6?.dup_addr_detect_transmits || "");
    setIpv6SourceValidation(interfaceData.ipv6?.source_validation || "");

    // Mirror & Redirect
    setMirrorIngress(interfaceData.mirror_ingress || "");
    setMirrorEgress(interfaceData.mirror_egress || "");
    setRedirect(interfaceData.redirect || "");

    setError(null);
  }, [open, interfaceData]);

  const addStaticPeer = () => {
    setStaticPeers([...staticPeers, { name: `peer${staticPeers.length}`, key: "", mac: "", disable: false }]);
  };

  const removeStaticPeer = (index: number) => {
    setStaticPeers(staticPeers.filter((_, i) => i !== index));
  };

  const updateStaticPeer = (index: number, field: keyof StaticPeerEntry, value: string | boolean) => {
    const updated = [...staticPeers];
    updated[index] = { ...updated[index], [field]: value };
    setStaticPeers(updated);
  };

  const handleSubmit = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses
        .split(/[,\n]/)
        .map((a) => a.trim())
        .filter(Boolean);
      if (useDhcp) addrList.push("dhcp");
      if (useDhcpv6) addrList.push("dhcpv6");

      const updated: Parameters<typeof macsecService.updateInterface>[2] = {};

      // Basic fields - compare with current
      const desc = description.trim() || null;
      if (desc !== (interfaceData.description || null)) updated.description = desc;

      const src = sourceInterface.trim() || null;
      if (src !== (interfaceData.source_interface || null)) updated.source_interface = src;

      const mtuVal = mtu.trim() || null;
      if (mtuVal !== (interfaceData.mtu || null)) updated.mtu = mtuVal;

      const vrfVal = vrf.trim() || null;
      if (vrfVal !== (interfaceData.vrf || null)) updated.vrf = vrfVal;

      if (disabled !== interfaceData.disabled) updated.disabled = disabled;

      // Addresses
      const currentAddrs = [...(interfaceData.addresses || [])].sort();
      const newAddrs = [...addrList].sort();
      if (JSON.stringify(currentAddrs) !== JSON.stringify(newAddrs)) {
        updated.addresses = addrList;
      }

      // Security
      const secUpdated: {
        cipher?: string | null;
        encrypt?: boolean;
        replay_window?: string | null;
        mka?: Partial<MacsecMkaConfig> | null;
        static?: Partial<MacsecStaticConfig> | null;
      } = {};
      let secChanged = false;

      const cipherVal = cipher || null;
      if (cipherVal !== (interfaceData.security?.cipher || null)) {
        secUpdated.cipher = cipherVal;
        secChanged = true;
      }

      if (encrypt !== (interfaceData.security?.encrypt ?? false)) {
        secUpdated.encrypt = encrypt;
        secChanged = true;
      }

      const rwVal = replayWindow.trim() || null;
      if (rwVal !== (interfaceData.security?.replay_window || null)) {
        secUpdated.replay_window = rwVal;
        secChanged = true;
      }

      // MKA vs Static mode changes
      const currentMode = (interfaceData.security?.static?.key || (interfaceData.security?.static?.peers && interfaceData.security.static.peers.length > 0)) ? "static" : "mka";

      if (securityMode === "mka") {
        // If switching from static to mka, clear static
        if (currentMode === "static") {
          secUpdated.static = null;
          secChanged = true;
        }

        const mkaUpdated: Partial<MacsecMkaConfig> = {};
        let mkaChanged = false;
        const cakVal = mkaCak.trim() || null;
        if (cakVal !== (interfaceData.security?.mka?.cak || null)) { mkaUpdated.cak = cakVal; mkaChanged = true; }
        const cknVal = mkaCkn.trim() || null;
        if (cknVal !== (interfaceData.security?.mka?.ckn || null)) { mkaUpdated.ckn = cknVal; mkaChanged = true; }
        const priVal = mkaPriority.trim() || null;
        if (priVal !== (interfaceData.security?.mka?.priority || null)) { mkaUpdated.priority = priVal; mkaChanged = true; }

        if (mkaChanged) {
          secUpdated.mka = mkaUpdated;
          secChanged = true;
        }
      } else {
        // Static mode
        if (currentMode === "mka") {
          secUpdated.mka = null;
          secChanged = true;
        }

        const staticUpdated: Partial<MacsecStaticConfig> = {};
        let staticChanged = false;

        const keyVal = staticKey.trim() || null;
        if (keyVal !== (interfaceData.security?.static?.key || null)) { staticUpdated.key = keyVal; staticChanged = true; }

        const currentPeers = JSON.stringify((interfaceData.security?.static?.peers || []).map((p) => ({ name: p.name, key: p.key, mac: p.mac, disable: p.disable })));
        const newPeersData = staticPeers.map((p) => ({ name: p.name, key: p.key || null, mac: p.mac || null, disable: p.disable }));
        if (JSON.stringify(newPeersData) !== currentPeers) {
          staticUpdated.peers = newPeersData;
          staticChanged = true;
        }

        if (staticChanged) {
          secUpdated.static = staticUpdated;
          secChanged = true;
        }
      }

      if (secChanged) updated.security = secUpdated as typeof updated.security;

      // Mirror & Redirect
      const mi = mirrorIngress.trim() || null;
      if (mi !== (interfaceData.mirror_ingress || null)) updated.mirror_ingress = mi;
      const me = mirrorEgress.trim() || null;
      if (me !== (interfaceData.mirror_egress || null)) updated.mirror_egress = me;
      const rd = redirect.trim() || null;
      if (rd !== (interfaceData.redirect || null)) updated.redirect = rd;

      const result = await macsecService.updateInterface(interfaceData.name, interfaceData, updated);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update MACsec interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update MACsec interface");
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Edit MACsec Interface: {interfaceData.name}
          </DialogTitle>
          <DialogDescription>Modify the MACsec interface configuration</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interface Name</Label>
                <Input value={interfaceData.name} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Source Interface <span className="text-destructive">*</span></Label>
                <InterfaceSelect
                  value={sourceInterface}
                  onValueChange={setSourceInterface}
                  interfaces={allInterfaces}
                  placeholder="Select source interface"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="MACsec encrypted link" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-mtu">MTU</Label>
                <Input id="edit-mtu" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="1460 (default)" type="number" min={68} max={16000} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-vrf">VRF</Label>
                <VrfSelect id="edit-vrf" value={vrf} onValueChange={setVrf} />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="edit-disabled" checked={disabled} onCheckedChange={(checked) => setDisabled(checked === true)} />
              <Label htmlFor="edit-disabled" className="text-sm font-normal">Administratively disable interface</Label>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cipher Suite</Label>
                <Select value={cipher} onValueChange={setCipher}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gcm-aes-128">GCM-AES-128</SelectItem>
                    <SelectItem value="gcm-aes-256">GCM-AES-256</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Replay Window</Label>
                <Input value={replayWindow} onChange={(e) => setReplayWindow(e.target.value)} placeholder="0 (strict)" type="number" min={0} />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="edit-encrypt" checked={encrypt} onCheckedChange={(checked) => setEncrypt(checked === true)} />
              <Label htmlFor="edit-encrypt" className="text-sm font-normal">Enable MACsec encryption</Label>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Security Mode</Label>
              <Select value={securityMode} onValueChange={(v) => setSecurityMode(v as "mka" | "static")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mka">MKA (Dynamic Key Agreement)</SelectItem>
                  <SelectItem value="static">Static Key</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {securityMode === "mka" ? (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-medium">MACsec Key Agreement (MKA)</h4>
                <div className="space-y-2">
                  <Label>Connectivity Association Key (CAK)</Label>
                  <Input value={mkaCak} onChange={(e) => setMkaCak(e.target.value)} placeholder={cipher === "gcm-aes-256" ? "64 hex characters" : "32 hex characters"} className="font-mono" />
                  <p className="text-xs text-muted-foreground">{cipher === "gcm-aes-256" ? "32-byte (256-bit) hex string — 64 hex digits" : "16-byte (128-bit) hex string — 32 hex digits"}</p>
                </div>
                <div className="space-y-2">
                  <Label>Connectivity Association Key Name (CKN)</Label>
                  <Input value={mkaCkn} onChange={(e) => setMkaCkn(e.target.value)} placeholder="2-64 hex characters" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>MKA Priority</Label>
                  <Input value={mkaPriority} onChange={(e) => setMkaPriority(e.target.value)} placeholder="255 (default)" type="number" min={0} max={255} />
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-medium">Static Key Configuration</h4>
                <div className="space-y-2">
                  <Label>Local Key</Label>
                  <Input value={staticKey} onChange={(e) => setStaticKey(e.target.value)} placeholder={cipher === "gcm-aes-256" ? "64 hex characters" : "32 hex characters"} className="font-mono" />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Static Peers</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addStaticPeer}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Peer
                  </Button>
                </div>

                {staticPeers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No static peers configured</p>
                )}

                {staticPeers.map((peer, index) => (
                  <div key={index} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Peer {index + 1}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStaticPeer(index)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input value={peer.name} onChange={(e) => updateStaticPeer(index, "name", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Key (hex)</Label>
                        <Input value={peer.key} onChange={(e) => updateStaticPeer(index, "key", e.target.value)} className="h-8 text-sm font-mono" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">MAC Address</Label>
                        <Input value={peer.mac} onChange={(e) => updateStaticPeer(index, "mac", e.target.value)} className="h-8 text-sm font-mono" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox checked={peer.disable} onCheckedChange={(checked) => updateStaticPeer(index, "disable", checked === true)} />
                      <Label className="text-xs font-normal">Disable this peer</Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>IP Addresses</Label>
              <Input value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder="10.0.0.1/24, 192.168.1.1/24" />
              <p className="text-xs text-muted-foreground">Comma-separated CIDR addresses</p>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox id="edit-useDhcp" checked={useDhcp} onCheckedChange={(checked) => setUseDhcp(checked === true)} />
                <Label htmlFor="edit-useDhcp" className="text-sm font-normal">Enable DHCP</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="edit-useDhcpv6" checked={useDhcpv6} onCheckedChange={(checked) => setUseDhcpv6(checked === true)} />
                <Label htmlFor="edit-useDhcpv6" className="text-sm font-normal">Enable DHCPv6</Label>
              </div>
            </div>

            {useDhcp && (
              <>
                <Separator />
                <h4 className="text-sm font-medium">DHCP Options</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Client ID</Label>
                    <Input value={dhcpClientId} onChange={(e) => setDhcpClientId(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Host Name</Label>
                    <Input value={dhcpHostName} onChange={(e) => setDhcpHostName(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Vendor Class ID</Label>
                    <Input value={dhcpVendorClassId} onChange={(e) => setDhcpVendorClassId(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Default Route Distance</Label>
                    <Input value={dhcpDefaultRouteDistance} onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)} className="h-8 text-sm" type="number" />
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox checked={dhcpNoDefaultRoute} onCheckedChange={(checked) => setDhcpNoDefaultRoute(checked === true)} />
                    <Label className="text-xs font-normal">No Default Route</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked={dhcpMtu} onCheckedChange={(checked) => setDhcpMtu(checked === true)} />
                    <Label className="text-xs font-normal">Request MTU</Label>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <h4 className="text-sm font-medium">IPv4 Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Adjust MSS</Label>
                <Input value={ipAdjustMss} onChange={(e) => setIpAdjustMss(e.target.value)} placeholder="clamp-mss-to-pmtu or value" className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">ARP Cache Timeout</Label>
                <Input value={ipArpCacheTimeout} onChange={(e) => setIpArpCacheTimeout(e.target.value)} className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Source Validation</Label>
                <Select value={ipSourceValidation} onValueChange={setIpSourceValidation}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="loose">Loose</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox checked={ipDisableArpFilter} onCheckedChange={(checked) => setIpDisableArpFilter(checked === true)} />
                <Label className="text-xs font-normal">Disable ARP Filter</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={ipDisableForwarding} onCheckedChange={(checked) => setIpDisableForwarding(checked === true)} />
                <Label className="text-xs font-normal">Disable Forwarding</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={ipEnableArpAccept} onCheckedChange={(checked) => setIpEnableArpAccept(checked === true)} />
                <Label className="text-xs font-normal">Enable ARP Accept</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={ipEnableArpAnnounce} onCheckedChange={(checked) => setIpEnableArpAnnounce(checked === true)} />
                <Label className="text-xs font-normal">Enable ARP Announce</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={ipEnableArpIgnore} onCheckedChange={(checked) => setIpEnableArpIgnore(checked === true)} />
                <Label className="text-xs font-normal">Enable ARP Ignore</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={ipEnableDirectedBroadcast} onCheckedChange={(checked) => setIpEnableDirectedBroadcast(checked === true)} />
                <Label className="text-xs font-normal">Enable Directed Broadcast</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={ipEnableProxyArp} onCheckedChange={(checked) => setIpEnableProxyArp(checked === true)} />
                <Label className="text-xs font-normal">Enable Proxy ARP</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={ipProxyArpPvlan} onCheckedChange={(checked) => setIpProxyArpPvlan(checked === true)} />
                <Label className="text-xs font-normal">Proxy ARP PVLAN</Label>
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">IPv6 Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Accept DAD</Label>
                <Input value={ipv6AcceptDad} onChange={(e) => setIpv6AcceptDad(e.target.value)} className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">DAD Transmits</Label>
                <Input value={ipv6DupAddrDetect} onChange={(e) => setIpv6DupAddrDetect(e.target.value)} className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">EUI-64 Prefix</Label>
                <Input value={ipv6AddressEui64} onChange={(e) => setIpv6AddressEui64(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Interface Identifier</Label>
                <Input value={ipv6InterfaceIdentifier} onChange={(e) => setIpv6InterfaceIdentifier(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Adjust MSS</Label>
                <Input value={ipv6AdjustMss} onChange={(e) => setIpv6AdjustMss(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Base Reachable Time</Label>
                <Input value={ipv6BaseReachableTime} onChange={(e) => setIpv6BaseReachableTime(e.target.value)} className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Source Validation</Label>
                <Select value={ipv6SourceValidation} onValueChange={setIpv6SourceValidation}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="loose">Loose</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox checked={ipv6AddressAutoconf} onCheckedChange={(checked) => setIpv6AddressAutoconf(checked === true)} />
                <Label className="text-xs font-normal">Address Autoconf (SLAAC)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={ipv6NoDefaultLinkLocal} onCheckedChange={(checked) => setIpv6NoDefaultLinkLocal(checked === true)} />
                <Label className="text-xs font-normal">No Default Link-Local</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={ipv6DisableForwarding} onCheckedChange={(checked) => setIpv6DisableForwarding(checked === true)} />
                <Label className="text-xs font-normal">Disable Forwarding</Label>
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">Mirror & Redirect</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Mirror Ingress</Label>
                <Input value={mirrorIngress} onChange={(e) => setMirrorIngress(e.target.value)} className="h-8 text-sm" placeholder="eth1" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mirror Egress</Label>
                <Input value={mirrorEgress} onChange={(e) => setMirrorEgress(e.target.value)} className="h-8 text-sm" placeholder="eth1" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Redirect</Label>
                <Input value={redirect} onChange={(e) => setRedirect(e.target.value)} className="h-8 text-sm" placeholder="eth1" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
