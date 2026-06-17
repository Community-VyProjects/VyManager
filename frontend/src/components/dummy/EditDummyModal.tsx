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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Box, Loader2 } from "lucide-react";
import { dummyService, type DummyInterface, type DummyCapabilities } from "@/lib/api/dummy";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface EditDummyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: DummyInterface | null;
  capabilities: DummyCapabilities | null;
}

export function EditDummyModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
  capabilities,
}: EditDummyModalProps) {
  // Basic
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState("");
  const [ipv6AddressEui64, setIpv6AddressEui64] = useState("");
  const [ipv6AddressNoDefaultLinkLocal, setIpv6AddressNoDefaultLinkLocal] = useState(false);

  // Advanced
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipSourceValidation, setIpSourceValidation] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");
  const [redirect, setRedirect] = useState("");
  const [mac, setMac] = useState("");
  const [netns, setNetns] = useState("");

  // Available interfaces for dropdowns
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (interfaceData) {
      showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
      setDescription(interfaceData.description ?? "");
      setMtu(interfaceData.mtu ?? "");
      setVrf(interfaceData.vrf ?? "");
      setDisabled(interfaceData.disable ?? false);
      setAddresses(interfaceData.addresses.join("\n"));
      setIpv6AddressEui64(interfaceData.ipv6_address_eui64.join("\n"));
      setIpv6AddressNoDefaultLinkLocal(interfaceData.ipv6_address_no_default_link_local ?? false);
      setIpDisableForwarding(interfaceData.ip_disable_forwarding ?? false);
      setIpSourceValidation(interfaceData.ip_source_validation ?? "");
      setIpv6DisableForwarding(interfaceData.ipv6_disable_forwarding ?? false);
      setMirrorIngress(interfaceData.mirror_ingress ?? "");
      setMirrorEgress(interfaceData.mirror_egress ?? "");
      setRedirect(interfaceData.redirect ?? "");
      setMac(interfaceData.mac ?? "");
      setNetns(interfaceData.netns ?? "");
      setError(null);
    }
  }, [interfaceData]);

  const validateForm = (): string | null => {
    if (mtu.trim()) {
      const mtuNum = parseInt(mtu.trim(), 10);
      if (isNaN(mtuNum) || mtuNum < 68 || mtuNum > 16000) {
        return "MTU must be between 68 and 16000";
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!interfaceData) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);
      const eui64List = ipv6AddressEui64.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const result = await dummyService.updateInterface(interfaceData.name, interfaceData, {
        description: description.trim() || null,
        addresses: addrList,
        mtu: mtu.trim() || null,
        vrf: vrf.trim() || null,
        disabled,
        ip_disable_forwarding: ipDisableForwarding,
        ip_source_validation: ipSourceValidation || null,
        ipv6_disable_forwarding: ipv6DisableForwarding,
        ipv6_address_eui64: eui64List,
        ipv6_address_no_default_link_local: ipv6AddressNoDefaultLinkLocal,
        mirror_ingress: mirrorIngress.trim() || null,
        mirror_egress: mirrorEgress.trim() || null,
        redirect: redirect.trim() || null,
        mac: mac.trim() || null,
        netns: netns.trim() || null,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update dummy interface");
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  const showHardwareSection =
    capabilities?.features.mac?.supported || capabilities?.features.netns?.supported;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Edit Dummy Interface
          </DialogTitle>
          <DialogDescription>
            Editing interface{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
              {interfaceData.name}
            </code>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Interface Name</Label>
              <code className="block rounded bg-muted px-3 py-2 font-mono text-sm text-foreground">
                {interfaceData.name}
              </code>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-mtu">MTU</Label>
              <Input
                id="edit-mtu"
                value={mtu}
                onChange={(e) => setMtu(e.target.value)}
                placeholder="1500"
              />
              <p className="text-xs text-muted-foreground">Valid range: 68–16000</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-vrf">VRF</Label>
              <Input
                id="edit-vrf"
                value={vrf}
                onChange={(e) => setVrf(e.target.value)}
                placeholder="Optional VRF name"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="edit-disabled" checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
              <Label htmlFor="edit-disabled" className="font-normal">Disable Interface</Label>
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-addresses">IP Addresses</Label>
              <Textarea
                id="edit-addresses"
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                placeholder={"10.0.0.1/32\n192.168.1.1/24"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">One address per line, IPv4 or IPv6 CIDR notation</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-eui64">IPv6 EUI-64 Prefixes</Label>
              <Textarea
                id="edit-eui64"
                value={ipv6AddressEui64}
                onChange={(e) => setIpv6AddressEui64(e.target.value)}
                placeholder={"2001:db8::/64"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">One /64 prefix per line</p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-noDefaultLinkLocal"
                checked={ipv6AddressNoDefaultLinkLocal}
                onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)}
              />
              <Label htmlFor="edit-noDefaultLinkLocal" className="font-normal">No Default Link-Local</Label>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* IP Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">IP Settings</h4>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-ipDisableForwarding" checked={ipDisableForwarding} onCheckedChange={(c) => setIpDisableForwarding(c === true)} />
                <Label htmlFor="edit-ipDisableForwarding" className="font-normal">Disable IPv4 Forwarding</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sourceValidation">Source Validation</Label>
                <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                  <SelectTrigger id="edit-sourceValidation">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="loose">Loose</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* IPv6 Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">IPv6 Settings</h4>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-ipv6DisableForwarding" checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c === true)} />
                <Label htmlFor="edit-ipv6DisableForwarding" className="font-normal">Disable IPv6 Forwarding</Label>
              </div>
            </div>

            {/* Traffic Mirroring */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Traffic Mirroring</h4>
              <div className="space-y-2">
                <Label>Mirror Ingress →</Label>
                <InterfaceSelect
                  value={mirrorIngress || "none"}
                  onValueChange={(v) => setMirrorIngress(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: "None", value: "none" }}
                  placeholder="None"
                />
              </div>
              <div className="space-y-2">
                <Label>Mirror Egress →</Label>
                <InterfaceSelect
                  value={mirrorEgress || "none"}
                  onValueChange={(v) => setMirrorEgress(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: "None", value: "none" }}
                  placeholder="None"
                />
              </div>
              <div className="space-y-2">
                <Label>Redirect To</Label>
                <InterfaceSelect
                  value={redirect || "none"}
                  onValueChange={(v) => setRedirect(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: "None", value: "none" }}
                  placeholder="None"
                />
              </div>
            </div>

            {/* Hardware (capability-gated) */}
            {showHardwareSection && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Hardware</h4>
                {capabilities?.features.mac?.supported && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-mac">MAC Address</Label>
                    <Input
                      id="edit-mac"
                      value={mac}
                      onChange={(e) => setMac(e.target.value)}
                      placeholder="xx:xx:xx:xx:xx:xx"
                    />
                  </div>
                )}
                {capabilities?.features.netns?.supported && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-netns">Network Namespace</Label>
                    <Input
                      id="edit-netns"
                      value={netns}
                      onChange={(e) => setNetns(e.target.value)}
                      placeholder="Namespace name"
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mt-4">
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
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
