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
import { Textarea } from "@/components/ui/textarea";
import { Repeat, Loader2 } from "lucide-react";
import { loopbackService, type LoopbackCapabilities } from "@/lib/api/loopback";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface CreateLoopbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: LoopbackCapabilities | null;
}

export function CreateLoopbackModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateLoopbackModalProps) {
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState("");
  const [ipSourceValidation, setIpSourceValidation] = useState("");
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");
  const [redirect, setRedirect] = useState("");

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setDescription("");
    setAddresses("");
    setIpSourceValidation("");
    setMirrorIngress("");
    setMirrorEgress("");
    setRedirect("");
    setError(null);
  };

  useEffect(() => {
    if (open) {
      resetForm();
      showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
    }
  }, [open]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const config: Parameters<typeof loopbackService.createInterface>[0] = {
        name: "lo",
      };

      if (description.trim()) config.description = description.trim();
      if (addrList.length > 0) config.addresses = addrList;
      if (ipSourceValidation) config.ip_source_validation = ipSourceValidation;
      if (mirrorIngress.trim()) config.mirror_ingress = mirrorIngress.trim();
      if (mirrorEgress.trim()) config.mirror_egress = mirrorEgress.trim();
      if (redirect.trim()) config.redirect = redirect.trim();

      const result = await loopbackService.createInterface(config);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to configure loopback interface");
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Configure Loopback Interface
          </DialogTitle>
          <DialogDescription>
            Configure the loopback interface (lo).
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Interface Name</Label>
              <code className="block rounded bg-muted px-3 py-2 font-mono text-sm text-foreground">
                lo
              </code>
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
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">IP Settings</h4>
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

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Traffic Mirroring</h4>
              <div className="space-y-2">
                <Label>Mirror Ingress</Label>
                <InterfaceSelect
                  value={mirrorIngress || "none"}
                  onValueChange={(v) => setMirrorIngress(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: "None", value: "none" }}
                  placeholder="None"
                />
              </div>
              <div className="space-y-2">
                <Label>Mirror Egress</Label>
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
                Configuring...
              </>
            ) : (
              "Configure Loopback"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
