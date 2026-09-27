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
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("ospfv3");
  const tc = useTranslations("common");
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
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  const loadInterfaces = async () => {
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces);
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
    if (!name) return t("interfaceModal.selectInterface");
    if (cost.trim()) {
      const val = parseInt(cost.trim(), 10);
      if (isNaN(val) || val < 1 || val > 65535) return t("interfaceModal.costRange");
    }
    if (priority.trim()) {
      const val = parseInt(priority.trim(), 10);
      if (isNaN(val) || val < 0 || val > 255) return t("interfaceModal.priorityRange");
    }
    if (instanceId.trim()) {
      const val = parseInt(instanceId.trim(), 10);
      if (isNaN(val) || val < 0 || val > 255) return t("interfaceModal.instanceIdRange");
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
      const message = err instanceof Error ? err.message : tc("operationFailed");
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
            {isEditMode ? t("interfaceModal.titleEdit") : t("interfaceModal.titleAdd")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("interfaceModal.descriptionEdit", { name: existingInterface?.name ?? "" })
              : t("interfaceModal.descriptionAdd")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* Basic Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ospfv3-iface-name">{t("fields.interface")}</Label>
                <InterfaceSelect
                  value={name}
                  onValueChange={setName}
                  disabled={isEditMode}
                  id="ospfv3-iface-name"
                  className={isEditMode ? "bg-muted" : ""}
                  interfaces={availableInterfaces}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ospfv3-iface-area">{t("fields.area")}</Label>
                <Input
                  id="ospfv3-iface-area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={t("interfaceModal.areaPlaceholder")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("interfaceModal.areaHelp")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ospfv3-iface-network">{t("fields.networkType")}</Label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger id="ospfv3-iface-network">
                    <SelectValue placeholder={tc("default")} />
                  </SelectTrigger>
                  <SelectContent>
                    {networkTypes.map((nt) => (
                      <SelectItem key={nt} value={nt}>{nt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cost & Priority */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("interfaceModal.costAndPriority")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-cost">{t("fields.cost")}</Label>
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
                  <Label htmlFor="ospfv3-iface-priority">{t("fields.priority")}</Label>
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
                  <Label htmlFor="ospfv3-iface-ifmtu">{t("interfaceModal.interfaceMtu")}</Label>
                  <Input
                    id="ospfv3-iface-ifmtu"
                    type="number"
                    value={ifmtu}
                    onChange={(e) => setIfmtu(e.target.value)}
                    placeholder={t("interfaceModal.interfaceMtuPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-instance-id">{t("fields.instanceId")}</Label>
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
              <h4 className="text-sm font-medium">{t("interfaceModal.timers")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-hello">{t("interfaceModal.helloInterval")}</Label>
                  <Input
                    id="ospfv3-iface-hello"
                    type="number"
                    value={helloInterval}
                    onChange={(e) => setHelloInterval(e.target.value)}
                    placeholder={t("interfaceModal.seconds")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-dead">{t("interfaceModal.deadInterval")}</Label>
                  <Input
                    id="ospfv3-iface-dead"
                    type="number"
                    value={deadInterval}
                    onChange={(e) => setDeadInterval(e.target.value)}
                    placeholder={t("interfaceModal.seconds")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-retransmit">{t("interfaceModal.retransmitInterval")}</Label>
                  <Input
                    id="ospfv3-iface-retransmit"
                    type="number"
                    value={retransmitInterval}
                    onChange={(e) => setRetransmitInterval(e.target.value)}
                    placeholder={t("interfaceModal.seconds")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-iface-transmit-delay">{t("interfaceModal.transmitDelay")}</Label>
                  <Input
                    id="ospfv3-iface-transmit-delay"
                    type="number"
                    value={transmitDelay}
                    onChange={(e) => setTransmitDelay(e.target.value)}
                    placeholder={t("interfaceModal.seconds")}
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("fields.options")}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <Checkbox
                    id="ospfv3-iface-passive"
                    checked={passive}
                    onCheckedChange={(checked) => setPassive(checked === true)}
                  />
                  <Label htmlFor="ospfv3-iface-passive" className="cursor-pointer text-sm">
                    {t("fields.passive")}
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <Checkbox
                    id="ospfv3-iface-mtu-ignore"
                    checked={mtuIgnore}
                    onCheckedChange={(checked) => setMtuIgnore(checked === true)}
                  />
                  <Label htmlFor="ospfv3-iface-mtu-ignore" className="cursor-pointer text-sm">
                    {t("interfaceModal.mtuIgnore")}
                  </Label>
                </div>
              </div>
            </div>

            {/* BFD */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("interfaceModal.bfdTitle")}</h4>
              <div className="flex items-center space-x-3 rounded-lg border p-3">
                <Checkbox
                  id="ospfv3-iface-bfd"
                  checked={bfd}
                  onCheckedChange={(checked) => setBfd(checked === true)}
                />
                <Label htmlFor="ospfv3-iface-bfd" className="cursor-pointer text-sm">
                  {t("interfaceModal.enableBfd")}
                </Label>
              </div>
              {bfd && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label htmlFor="ospfv3-iface-bfd-profile">{t("interfaceModal.bfdProfile")}</Label>
                  <Input
                    id="ospfv3-iface-bfd-profile"
                    value={bfdProfile}
                    onChange={(e) => setBfdProfile(e.target.value)}
                    placeholder={t("interfaceModal.bfdProfilePlaceholder")}
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
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : t("fields.creating")}
              </>
            ) : isEditMode ? (
              t("fields.saveChanges")
            ) : (
              t("fields.addInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
