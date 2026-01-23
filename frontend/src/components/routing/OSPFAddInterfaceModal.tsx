"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Network } from "lucide-react";
import { ospfService, type OSPFArea, type OSPFOperation } from "@/lib/api/ospf";
import { useToast } from "@/hooks/useToast";

interface OSPFAddInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  areas: OSPFArea[];
}

const NETWORK_TYPES = [
  { value: "broadcast", label: "Broadcast" },
  { value: "point-to-point", label: "Point-to-Point" },
  { value: "point-to-multipoint", label: "Point-to-Multipoint" },
  { value: "non-broadcast", label: "Non-Broadcast (NBMA)" },
];

export function OSPFAddInterfaceModal({
  open,
  onOpenChange,
  onSuccess,
  areas,
}: OSPFAddInterfaceModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Basic settings
  const [interfaceName, setInterfaceName] = useState("");
  const [area, setArea] = useState("");

  // Optional settings
  const [cost, setCost] = useState("");
  const [priority, setPriority] = useState("");
  const [networkType, setNetworkType] = useState("");
  const [helloInterval, setHelloInterval] = useState("");
  const [deadInterval, setDeadInterval] = useState("");
  const [passive, setPassive] = useState(false);
  const [bfd, setBfd] = useState(false);
  const [mtuIgnore, setMtuIgnore] = useState(false);

  const resetForm = () => {
    setInterfaceName("");
    setArea("");
    setCost("");
    setPriority("");
    setNetworkType("");
    setHelloInterval("");
    setDeadInterval("");
    setPassive(false);
    setBfd(false);
    setMtuIgnore(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!interfaceName.trim()) {
      toast.error("Validation Error", "Interface name is required");
      return;
    }

    setLoading(true);
    try {
      const operations: OSPFOperation[] = [];

      // Add interface
      operations.push({
        op: "add_interface",
        interface: interfaceName.trim(),
        area: area || undefined,
      });

      // Cost
      if (cost.trim()) {
        operations.push({
          op: "set_interface_cost",
          interface: interfaceName.trim(),
          value: parseInt(cost, 10),
        });
      }

      // Priority
      if (priority.trim()) {
        operations.push({
          op: "set_interface_priority",
          interface: interfaceName.trim(),
          value: parseInt(priority, 10),
        });
      }

      // Network type
      if (networkType) {
        operations.push({
          op: "set_interface_network",
          interface: interfaceName.trim(),
          value: networkType,
        });
      }

      // Timers
      if (helloInterval.trim() || deadInterval.trim()) {
        operations.push({
          op: "set_interface_timers",
          interface: interfaceName.trim(),
          hello: helloInterval.trim() ? parseInt(helloInterval, 10) : undefined,
          dead: deadInterval.trim() ? parseInt(deadInterval, 10) : undefined,
        });
      }

      // Passive
      if (passive) {
        operations.push({
          op: "enable_interface_passive",
          interface: interfaceName.trim(),
        });
      }

      // BFD
      if (bfd) {
        operations.push({
          op: "enable_interface_bfd",
          interface: interfaceName.trim(),
        });
      }

      // MTU Ignore
      if (mtuIgnore) {
        operations.push({
          op: "enable_interface_mtu_ignore",
          interface: interfaceName.trim(),
        });
      }

      const response = await ospfService.configureBatch({ operations });

      if (response.success) {
        toast.success("Interface Added", `Interface ${interfaceName} added to OSPF`);
        onOpenChange(false);
        onSuccess();
        resetForm();
      } else {
        toast.error("Failed to Add Interface", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Add interface error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to add interface");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-purple-500" />
            Add OSPF Interface
          </DialogTitle>
          <DialogDescription>
            Add an interface to participate in OSPF routing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="interface">
                Interface Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="interface"
                placeholder="e.g., eth0 or eth0.100"
                value={interfaceName}
                onChange={(e) => setInterfaceName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="area">Area</Label>
              <Select value={area} onValueChange={setArea} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select area (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      Area {a.id}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">Enter custom...</SelectItem>
                </SelectContent>
              </Select>
              {area === "new" && (
                <Input
                  placeholder="e.g., 0.0.0.1"
                  onChange={(e) => setArea(e.target.value)}
                  disabled={loading}
                />
              )}
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced">
                <AccordionTrigger className="text-sm">Advanced Options</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="cost">Cost</Label>
                      <Input
                        id="cost"
                        type="number"
                        min="1"
                        max="65535"
                        placeholder="1-65535"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Input
                        id="priority"
                        type="number"
                        min="0"
                        max="255"
                        placeholder="0-255"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="network-type">Network Type</Label>
                    <Select
                      value={networkType}
                      onValueChange={setNetworkType}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {NETWORK_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="hello">Hello Interval (s)</Label>
                      <Input
                        id="hello"
                        type="number"
                        min="1"
                        max="65535"
                        placeholder="Default: 10"
                        value={helloInterval}
                        onChange={(e) => setHelloInterval(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dead">Dead Interval (s)</Label>
                      <Input
                        id="dead"
                        type="number"
                        min="1"
                        max="65535"
                        placeholder="Default: 40"
                        value={deadInterval}
                        onChange={(e) => setDeadInterval(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="passive">Passive Mode</Label>
                        <p className="text-xs text-muted-foreground">
                          Don&apos;t send OSPF packets on this interface
                        </p>
                      </div>
                      <Switch
                        id="passive"
                        checked={passive}
                        onCheckedChange={setPassive}
                        disabled={loading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="bfd">BFD</Label>
                        <p className="text-xs text-muted-foreground">
                          Enable Bidirectional Forwarding Detection
                        </p>
                      </div>
                      <Switch
                        id="bfd"
                        checked={bfd}
                        onCheckedChange={setBfd}
                        disabled={loading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="mtu-ignore">MTU Ignore</Label>
                        <p className="text-xs text-muted-foreground">
                          Ignore MTU mismatch with neighbors
                        </p>
                      </div>
                      <Switch
                        id="mtu-ignore"
                        checked={mtuIgnore}
                        onCheckedChange={setMtuIgnore}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Interface
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
