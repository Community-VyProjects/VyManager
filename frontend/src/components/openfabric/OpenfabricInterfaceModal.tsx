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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import {
  OpenfabricInterfaceConfig,
  OpenfabricCapabilities,
} from "@/lib/api/openfabric";
import { showService } from "@/lib/api/show";

interface OpenfabricInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (iface: OpenfabricInterfaceConfig) => Promise<void>;
  existingInterface: OpenfabricInterfaceConfig | null;
  capabilities: OpenfabricCapabilities | null;
}

export function OpenfabricInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  capabilities,
}: OpenfabricInterfaceModalProps) {
  const isEdit = !!existingInterface;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interfaceNames, setInterfaceNames] = useState<string[]>([]);
  const [interfacesLoading, setInterfacesLoading] = useState(false);

  // General
  const [name, setName] = useState("");
  const [addressFamilyIpv4, setAddressFamilyIpv4] = useState(false);
  const [addressFamilyIpv6, setAddressFamilyIpv6] = useState(false);
  const [metric, setMetric] = useState("");
  const [passive, setPassive] = useState(false);

  // Timers
  const [csnpInterval, setCsnpInterval] = useState("");
  const [helloInterval, setHelloInterval] = useState("");
  const [helloMultiplier, setHelloMultiplier] = useState("");
  const [psnpInterval, setPsnpInterval] = useState("");

  // Authentication
  const [passwordType, setPasswordType] = useState("none");
  const [passwordValue, setPasswordValue] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);

    setInterfacesLoading(true);
    showService
      .getAllInterfaces()
      .then((res) => setInterfaceNames(res.interfaces.map((i) => i.name).sort()))
      .catch(() => setInterfaceNames([]))
      .finally(() => setInterfacesLoading(false));

    if (existingInterface) {
      const i = existingInterface;
      setName(i.name);
      setAddressFamilyIpv4(i.address_family_ipv4);
      setAddressFamilyIpv6(i.address_family_ipv6);
      setMetric(i.metric != null ? String(i.metric) : "");
      setPassive(i.passive);
      setCsnpInterval(i.csnp_interval != null ? String(i.csnp_interval) : "");
      setHelloInterval(i.hello_interval != null ? String(i.hello_interval) : "");
      setHelloMultiplier(i.hello_multiplier != null ? String(i.hello_multiplier) : "");
      setPsnpInterval(i.psnp_interval != null ? String(i.psnp_interval) : "");
      setPasswordType(i.password_type || "none");
      setPasswordValue(i.password_value || "");
    } else {
      setName("");
      setAddressFamilyIpv4(false);
      setAddressFamilyIpv6(false);
      setMetric("");
      setPassive(false);
      setCsnpInterval("");
      setHelloInterval("");
      setHelloMultiplier("");
      setPsnpInterval("");
      setPasswordType("none");
      setPasswordValue("");
    }
  }, [open, existingInterface]);

  const handleSubmit = async () => {
    if (!name) {
      setError("Please select an interface");
      return;
    }

    const iface: OpenfabricInterfaceConfig = {
      name,
      address_family_ipv4: addressFamilyIpv4,
      address_family_ipv6: addressFamilyIpv6,
      metric: metric.trim() ? parseInt(metric.trim(), 10) : null,
      passive,
      csnp_interval: csnpInterval.trim() ? parseInt(csnpInterval.trim(), 10) : null,
      hello_interval: helloInterval.trim() ? parseInt(helloInterval.trim(), 10) : null,
      hello_multiplier: helloMultiplier.trim() ? parseInt(helloMultiplier.trim(), 10) : null,
      psnp_interval: psnpInterval.trim() ? parseInt(psnpInterval.trim(), 10) : null,
      password_type: passwordType !== "none" ? passwordType : null,
      password_value: passwordType !== "none" ? passwordValue.trim() || null : null,
    };

    try {
      setSaving(true);
      setError(null);
      await onSubmit(iface);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save interface");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit OpenFabric Interface" : "Add OpenFabric Interface"}</DialogTitle>
          <DialogDescription>
            Configure OpenFabric parameters for this interface.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <Tabs defaultValue="general">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
            <TabsTrigger value="timers" className="flex-1">Timers</TabsTrigger>
            <TabsTrigger value="auth" className="flex-1">Authentication</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Interface <span className="text-destructive">*</span></Label>
              {isEdit ? (
                <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted text-sm font-mono">
                  {name}
                </div>
              ) : (
                <Select value={name} onValueChange={setName} disabled={interfacesLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={interfacesLoading ? "Loading interfaces..." : "Select interface"} />
                  </SelectTrigger>
                  <SelectContent>
                    {interfaceNames.map((iface) => (
                      <SelectItem key={iface} value={iface} className="font-mono">
                        {iface}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Address Family</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="af-ipv4" checked={addressFamilyIpv4} onCheckedChange={(c) => setAddressFamilyIpv4(!!c)} />
                  <Label htmlFor="af-ipv4">IPv4</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="af-ipv6" checked={addressFamilyIpv6} onCheckedChange={(c) => setAddressFamilyIpv6(!!c)} />
                  <Label htmlFor="af-ipv6">IPv6</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Metric</Label>
              <Input
                type="number"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder="Default"
                min={0}
                max={16777215}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="passive" checked={passive} onCheckedChange={(c) => setPassive(!!c)} />
              <Label htmlFor="passive">Passive (suppress hellos)</Label>
            </div>
          </TabsContent>

          {/* Timers Tab */}
          <TabsContent value="timers" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CSNP Interval (s)</Label>
                <Input
                  type="number"
                  value={csnpInterval}
                  onChange={(e) => setCsnpInterval(e.target.value)}
                  placeholder="Default (10)"
                  min={1}
                  max={600}
                />
              </div>
              <div className="space-y-2">
                <Label>Hello Interval (s)</Label>
                <Input
                  type="number"
                  value={helloInterval}
                  onChange={(e) => setHelloInterval(e.target.value)}
                  placeholder="Default (3)"
                  min={1}
                  max={600}
                />
              </div>
              <div className="space-y-2">
                <Label>Hello Multiplier</Label>
                <Input
                  type="number"
                  value={helloMultiplier}
                  onChange={(e) => setHelloMultiplier(e.target.value)}
                  placeholder="Default (10)"
                  min={2}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>PSNP Interval (s)</Label>
                <Input
                  type="number"
                  value={psnpInterval}
                  onChange={(e) => setPsnpInterval(e.target.value)}
                  placeholder="Default (2)"
                  min={0}
                  max={120}
                />
              </div>
            </div>
          </TabsContent>

          {/* Authentication Tab */}
          <TabsContent value="auth" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Configure per-interface authentication for OpenFabric.
            </p>
            <div className="space-y-2">
              <Label>Password Type</Label>
              <Select value={passwordType} onValueChange={setPasswordType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="md5">MD5</SelectItem>
                  <SelectItem value="plaintext">Plaintext</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {passwordType !== "none" && (
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder={`${passwordType === "md5" ? "MD5" : "Plaintext"} password`}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Add Interface"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
