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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Ospfv3Interface, Ospfv3Capabilities } from "@/lib/api/ospfv3";
import { showService } from "@/lib/api/show";

interface Ospfv3InterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: Ospfv3Interface) => Promise<void>;
  existingInterface?: Ospfv3Interface | null;
  capabilities?: Ospfv3Capabilities | null;
}

export function Ospfv3InterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  capabilities,
}: Ospfv3InterfaceModalProps) {
  const isEditMode = !!existingInterface;

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [cost, setCost] = useState("");
  const [priority, setPriority] = useState("");
  const [helloInterval, setHelloInterval] = useState("");
  const [deadInterval, setDeadInterval] = useState("");
  const [retransmitInterval, setRetransmitInterval] = useState("");
  const [transmitDelay, setTransmitDelay] = useState("");
  const [network, setNetwork] = useState("");
  const [passive, setPassive] = useState(false);
  const [bfd, setBfd] = useState(false);
  const [bfdProfile, setBfdProfile] = useState("");
  const [mtuIgnore, setMtuIgnore] = useState(false);
  const [ifmtu, setIfmtu] = useState("");
  const [instanceId, setInstanceId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);

  const loadInterfaces = async () => {
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces.map((i) => i.name));
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  useEffect(() => {
    if (open) {
      loadInterfaces();
      if (existingInterface) {
        setName(existingInterface.name);
        setArea(existingInterface.area || "");
        setCost(existingInterface.cost != null ? String(existingInterface.cost) : "");
        setPriority(existingInterface.priority != null ? String(existingInterface.priority) : "");
        setHelloInterval(existingInterface.hello_interval != null ? String(existingInterface.hello_interval) : "");
        setDeadInterval(existingInterface.dead_interval != null ? String(existingInterface.dead_interval) : "");
        setRetransmitInterval(existingInterface.retransmit_interval != null ? String(existingInterface.retransmit_interval) : "");
        setTransmitDelay(existingInterface.transmit_delay != null ? String(existingInterface.transmit_delay) : "");
        setNetwork(existingInterface.network || "");
        setPassive(existingInterface.passive);
        setBfd(existingInterface.bfd);
        setBfdProfile(existingInterface.bfd_profile || "");
        setMtuIgnore(existingInterface.mtu_ignore);
        setIfmtu(existingInterface.ifmtu != null ? String(existingInterface.ifmtu) : "");
        setInstanceId(existingInterface.instance_id != null ? String(existingInterface.instance_id) : "");
      } else {
        resetForm();
      }
    }
  }, [open, existingInterface]);

  const resetForm = () => {
    setName("");
    setArea("");
    setCost("");
    setPriority("");
    setHelloInterval("");
    setDeadInterval("");
    setRetransmitInterval("");
    setTransmitDelay("");
    setNetwork("");
    setPassive(false);
    setBfd(false);
    setBfdProfile("");
    setMtuIgnore(false);
    setIfmtu("");
    setInstanceId("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!name) return "Please select an interface";
    if (cost.trim()) {
      const val = parseInt(cost.trim(), 10);
      if (isNaN(val) || val < 1 || val > 65535) return "Cost must be between 1 and 65535";
    }
    if (priority.trim()) {
      const val = parseInt(priority.trim(), 10);
      if (isNaN(val) || val < 0 || val > 255) return "Priority must be between 0 and 255";
    }
    if (instanceId.trim()) {
      const val = parseInt(instanceId.trim(), 10);
      if (isNaN(val) || val < 0 || val > 255) return "Instance ID must be between 0 and 255";
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
      const config: Ospfv3Interface = {
        name: name.trim(),
        area: area.trim() || null,
        cost: cost.trim() ? parseInt(cost.trim(), 10) : null,
        priority: priority.trim() ? parseInt(priority.trim(), 10) : null,
        hello_interval: helloInterval.trim() ? parseInt(helloInterval.trim(), 10) : null,
        dead_interval: deadInterval.trim() ? parseInt(deadInterval.trim(), 10) : null,
        retransmit_interval: retransmitInterval.trim() ? parseInt(retransmitInterval.trim(), 10) : null,
        transmit_delay: transmitDelay.trim() ? parseInt(transmitDelay.trim(), 10) : null,
        network: network || null,
        passive,
        bfd,
        bfd_profile: bfdProfile.trim() || null,
        mtu_ignore: mtuIgnore,
        ifmtu: ifmtu.trim() ? parseInt(ifmtu.trim(), 10) : null,
        instance_id: instanceId.trim() ? parseInt(instanceId.trim(), 10) : null,
      };

      await onSubmit(config);
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Operation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const networkTypes = capabilities?.network_types || ["broadcast", "point-to-point"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit OSPFv3 Interface" : "Add OSPFv3 Interface"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify OSPFv3 settings for ${existingInterface?.name}.`
              : "Configure OSPFv3 on a network interface for IPv6 routing."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* Basic Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ospfv3-iface-name">Interface</Label>
                <Select value={name} onValueChange={setName} disabled={isEditMode}>
                  <SelectTrigger id="ospfv3-iface-name" className={isEditMode ? "bg-muted" : ""}>
                    <SelectValue placeholder="Select an interface" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInterfaces.map((iface) => (
                      <SelectItem key={iface} value={iface}>{iface}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ospfv3-iface-area">Area</Label>
                <Input
                  id="ospfv3-iface-area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. 0.0.0.0 or 0"
                />
                <p className="text-xs text-muted-foreground">
                  Assign this interface to an OSPFv3 area.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ospfv3-iface-network">Network Type</Label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger id="ospfv3-iface-network">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    {networkTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cost & Priority */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Cost & Priority</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-cost">Cost</Label>
                  <Input
                    id="ospfv3-iface-cost"
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="1-65535"
                    min={1}
                    max={65535}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-priority">Priority</Label>
                  <Input
                    id="ospfv3-iface-priority"
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    placeholder="0-255"
                    min={0}
                    max={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-ifmtu">Interface MTU</Label>
                  <Input
                    id="ospfv3-iface-ifmtu"
                    type="number"
                    value={ifmtu}
                    onChange={(e) => setIfmtu(e.target.value)}
                    placeholder="IPv6 MTU (bytes)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-instance-id">Instance ID</Label>
                  <Input
                    id="ospfv3-iface-instance-id"
                    type="number"
                    value={instanceId}
                    onChange={(e) => setInstanceId(e.target.value)}
                    placeholder="0-255"
                    min={0}
                    max={255}
                  />
                </div>
              </div>
            </div>

            {/* Timers */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Timers</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-hello">Hello Interval</Label>
                  <Input
                    id="ospfv3-iface-hello"
                    type="number"
                    value={helloInterval}
                    onChange={(e) => setHelloInterval(e.target.value)}
                    placeholder="seconds"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-dead">Dead Interval</Label>
                  <Input
                    id="ospfv3-iface-dead"
                    type="number"
                    value={deadInterval}
                    onChange={(e) => setDeadInterval(e.target.value)}
                    placeholder="seconds"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-retransmit">Retransmit Interval</Label>
                  <Input
                    id="ospfv3-iface-retransmit"
                    type="number"
                    value={retransmitInterval}
                    onChange={(e) => setRetransmitInterval(e.target.value)}
                    placeholder="seconds"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-transmit-delay">Transmit Delay</Label>
                  <Input
                    id="ospfv3-iface-transmit-delay"
                    type="number"
                    value={transmitDelay}
                    onChange={(e) => setTransmitDelay(e.target.value)}
                    placeholder="seconds"
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Options</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <Checkbox
                    id="ospfv3-iface-passive"
                    checked={passive}
                    onCheckedChange={(checked) => setPassive(checked === true)}
                  />
                  <Label htmlFor="ospfv3-iface-passive" className="cursor-pointer text-sm">
                    Passive
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <Checkbox
                    id="ospfv3-iface-mtu-ignore"
                    checked={mtuIgnore}
                    onCheckedChange={(checked) => setMtuIgnore(checked === true)}
                  />
                  <Label htmlFor="ospfv3-iface-mtu-ignore" className="cursor-pointer text-sm">
                    MTU Ignore
                  </Label>
                </div>
              </div>
            </div>

            {/* BFD */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">BFD (Bidirectional Forwarding Detection)</h4>
              <div className="flex items-center space-x-3 rounded-lg border p-3">
                <Checkbox
                  id="ospfv3-iface-bfd"
                  checked={bfd}
                  onCheckedChange={(checked) => setBfd(checked === true)}
                />
                <Label htmlFor="ospfv3-iface-bfd" className="cursor-pointer text-sm">
                  Enable BFD
                </Label>
              </div>
              {bfd && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label htmlFor="ospfv3-iface-bfd-profile">BFD Profile</Label>
                  <Input
                    id="ospfv3-iface-bfd-profile"
                    value={bfdProfile}
                    onChange={(e) => setBfdProfile(e.target.value)}
                    placeholder="Profile name (optional)"
                  />
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Saving..." : "Creating..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
