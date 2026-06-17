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
import { dummyService, type DummyCapabilities } from "@/lib/api/dummy";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface CreateDummyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: DummyCapabilities | null;
  existingInterfaces: string[];
}

export function CreateDummyModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
}: CreateDummyModalProps) {
  // Basic
  const [name, setName] = useState("dum0");
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

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`dum${i}`)) {
      i++;
    }
    return `dum${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setDescription("");
    setMtu("");
    setVrf("");
    setDisabled(false);
    setAddresses("");
    setIpv6AddressEui64("");
    setIpv6AddressNoDefaultLinkLocal(false);
    setIpDisableForwarding(false);
    setIpSourceValidation("");
    setIpv6DisableForwarding(false);
    setMirrorIngress("");
    setMirrorEgress("");
    setRedirect("");
    setMac("");
    setNetns("");
    setError(null);
  };

  useEffect(() => {
    if (open) {
      resetForm();
      showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const validateForm = (): string | null => {
    if (!name.trim()) return "Interface name is required";
    if (!/^dum\d+$/.test(name)) return "Name must be dum0, dum1, etc.";
    if (existingInterfaces.includes(name)) return `Interface ${name} already exists`;
    if (mtu.trim()) {
      const mtuNum = parseInt(mtu.trim(), 10);
      if (isNaN(mtuNum) || mtuNum < 68 || mtuNum > 16000) {
        return "MTU must be between 68 and 16000";
      }
    }
    return null;
  };

  const handleSubmit = async () => {
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

      const config: Parameters<typeof dummyService.createInterface>[0] = {
        name,
      };

      if (description.trim()) config.description = description.trim();
      if (addrList.length > 0) config.addresses = addrList;
      if (mtu.trim()) config.mtu = mtu.trim();
      if (vrf.trim()) config.vrf = vrf.trim();
      if (disabled) config.disabled = true;
      if (ipDisableForwarding) config.ip_disable_forwarding = true;
      if (ipSourceValidation) config.ip_source_validation = ipSourceValidation;
      if (ipv6DisableForwarding) config.ipv6_disable_forwarding = true;
      if (eui64List.length > 0) config.ipv6_address_eui64 = eui64List;
      if (ipv6AddressNoDefaultLinkLocal) config.ipv6_address_no_default_link_local = true;
      if (mirrorIngress.trim()) config.mirror_ingress = mirrorIngress.trim();
      if (mirrorEgress.trim()) config.mirror_egress = mirrorEgress.trim();
      if (redirect.trim()) config.redirect = redirect.trim();
      if (mac.trim()) config.mac = mac.trim();
      if (netns.trim()) config.netns = netns.trim();

      const result = await dummyService.createInterface(config);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to create dummy interface");
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const showHardwareSection =
    capabilities?.features.mac?.supported || capabilities?.features.netns?.supported;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Create Dummy Interface
          </DialogTitle>
          <DialogDescription>
            Create a new software-only dummy interface.
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
              <Label htmlFor="name">Interface Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="dum0"
              />
              <p className="text-xs text-muted-foreground">Must match pattern: dum0, dum1, dum2, …</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mtu">MTU</Label>
              <Input
                id="mtu"
                value={mtu}
                onChange={(e) => setMtu(e.target.value)}
                placeholder="1500"
              />
              <p className="text-xs text-muted-foreground">Valid range: 68–16000</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vrf">VRF</Label>
              <Input
                id="vrf"
                value={vrf}
                onChange={(e) => setVrf(e.target.value)}
                placeholder="Optional VRF name"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} id="disabled" />
              <Label htmlFor="disabled" className="font-normal">Disable Interface</Label>
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="addresses">IP Addresses</Label>
              <Textarea
                id="addresses"
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                placeholder={"10.0.0.1/32\n192.168.1.1/24"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">One address per line, IPv4 or IPv6 CIDR notation</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eui64">IPv6 EUI-64 Prefixes</Label>
              <Textarea
                id="eui64"
                value={ipv6AddressEui64}
                onChange={(e) => setIpv6AddressEui64(e.target.value)}
                placeholder={"2001:db8::/64"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">One /64 prefix per line</p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="noDefaultLinkLocal"
                checked={ipv6AddressNoDefaultLinkLocal}
                onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)}
              />
              <Label htmlFor="noDefaultLinkLocal" className="font-normal">No Default Link-Local</Label>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* IP Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">IP Settings</h4>
              <div className="flex items-center gap-2">
                <Checkbox id="ipDisableForwarding" checked={ipDisableForwarding} onCheckedChange={(c) => setIpDisableForwarding(c === true)} />
                <Label htmlFor="ipDisableForwarding" className="font-normal">Disable IPv4 Forwarding</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceValidation">Source Validation</Label>
                <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                  <SelectTrigger id="sourceValidation">
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
                <Checkbox id="ipv6DisableForwarding" checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c === true)} />
                <Label htmlFor="ipv6DisableForwarding" className="font-normal">Disable IPv6 Forwarding</Label>
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
                    <Label htmlFor="mac">MAC Address</Label>
                    <Input
                      id="mac"
                      value={mac}
                      onChange={(e) => setMac(e.target.value)}
                      placeholder="xx:xx:xx:xx:xx:xx"
                    />
                  </div>
                )}
                {capabilities?.features.netns?.supported && (
                  <div className="space-y-2">
                    <Label htmlFor="netns">Network Namespace</Label>
                    <Input
                      id="netns"
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
