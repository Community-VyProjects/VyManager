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
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import type { OspfInterface, OspfCapabilities } from "@/lib/api/ospf";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { useTranslations } from "next-intl";

interface OspfInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: OspfInterface) => Promise<void>;
  existingInterface?: OspfInterface | null;
  capabilities?: OspfCapabilities | null;
}

export function OspfInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  capabilities,
}: OspfInterfaceModalProps) {
  const t = useTranslations("ospf");
  const tc = useTranslations("common");
  const isEditMode = !!existingInterface;

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [cost, setCost] = useState("");
  const [priority, setPriority] = useState("");
  const [helloInterval, setHelloInterval] = useState("");
  const [deadInterval, setDeadInterval] = useState("");
  const [retransmitInterval, setRetransmitInterval] = useState("");
  const [retransmitWindow, setRetransmitWindow] = useState("");
  const [transmitDelay, setTransmitDelay] = useState("");
  const [network, setNetwork] = useState("");
  const [passive, setPassive] = useState(false);
  const [bfd, setBfd] = useState(false);
  const [mtuIgnore, setMtuIgnore] = useState(false);
  const [ldpSync, setLdpSync] = useState(false);
  const [ldpSyncDisable, setLdpSyncDisable] = useState(false);
  const [ldpSyncHolddown, setLdpSyncHolddown] = useState("");
  const [bandwidth, setBandwidth] = useState("");

  // Authentication
  const [md5Keys, setMd5Keys] = useState<Array<{ keyId: string; keyValue: string }>>([]);
  const [plaintextPassword, setPlaintextPassword] = useState("");

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
        setRetransmitWindow(existingInterface.retransmit_window != null ? String(existingInterface.retransmit_window) : "");
        setTransmitDelay(existingInterface.transmit_delay != null ? String(existingInterface.transmit_delay) : "");
        setNetwork(existingInterface.network || "");
        setPassive(existingInterface.passive === true);
        setBfd(existingInterface.bfd);
        setMtuIgnore(existingInterface.mtu_ignore);
        setLdpSync(existingInterface.ldp_sync);
        setLdpSyncDisable(existingInterface.ldp_sync_disable);
        setLdpSyncHolddown(existingInterface.ldp_sync_holddown != null ? String(existingInterface.ldp_sync_holddown) : "");
        setBandwidth(existingInterface.bandwidth != null ? String(existingInterface.bandwidth) : "");
        setPlaintextPassword(existingInterface.authentication.plaintext_password || "");
        const keys = Object.entries(existingInterface.authentication.md5_key_ids).map(
          ([keyId, keyValue]) => ({ keyId, keyValue })
        );
        setMd5Keys(keys.length > 0 ? keys : []);
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
    setRetransmitWindow("");
    setTransmitDelay("");
    setNetwork("");
    setPassive(false);
    setBfd(false);
    setMtuIgnore(false);
    setLdpSync(false);
    setLdpSyncDisable(false);
    setLdpSyncHolddown("");
    setBandwidth("");
    setMd5Keys([]);
    setPlaintextPassword("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addMd5Key = () => {
    setMd5Keys([...md5Keys, { keyId: "", keyValue: "" }]);
  };

  const removeMd5Key = (idx: number) => {
    setMd5Keys(md5Keys.filter((_, i) => i !== idx));
  };

  const updateMd5Key = (idx: number, field: "keyId" | "keyValue", value: string) => {
    const updated = [...md5Keys];
    updated[idx] = { ...updated[idx], [field]: value };
    setMd5Keys(updated);
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
    if (ldpSyncHolddown.trim()) {
      const val = parseInt(ldpSyncHolddown.trim(), 10);
      if (isNaN(val) || val < 0 || val > 10000) return t("interfaceModal.ldpSyncHolddownRange");
    }
    for (const key of md5Keys) {
      if (key.keyId && !key.keyValue) return t("interfaceModal.md5KeyValueRequired");
      if (!key.keyId && key.keyValue) return t("interfaceModal.md5KeyIdRequired");
    }
    return null;
  };

  const showRetransmitWindow = capabilities?.features?.retransmit_window?.supported === true;

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const md5KeyIds: Record<string, string> = {};
      for (const key of md5Keys) {
        if (key.keyId.trim()) {
          md5KeyIds[key.keyId.trim()] = key.keyValue;
        }
      }

      const config: OspfInterface = {
        name: name.trim(),
        area: area.trim() || null,
        cost: cost.trim() ? parseInt(cost.trim(), 10) : null,
        priority: priority.trim() ? parseInt(priority.trim(), 10) : null,
        hello_interval: helloInterval.trim() ? parseInt(helloInterval.trim(), 10) : null,
        dead_interval: deadInterval.trim() ? parseInt(deadInterval.trim(), 10) : null,
        retransmit_interval: retransmitInterval.trim() ? parseInt(retransmitInterval.trim(), 10) : null,
        retransmit_window: showRetransmitWindow
          ? (retransmitWindow.trim() ? parseInt(retransmitWindow.trim(), 10) : null)
          : (existingInterface?.retransmit_window ?? null),
        transmit_delay: transmitDelay.trim() ? parseInt(transmitDelay.trim(), 10) : null,
        network: network || null,
        passive: passive || null,
        passive_disable: false,
        bfd,
        mtu_ignore: mtuIgnore,
        bandwidth: bandwidth.trim() ? parseInt(bandwidth.trim(), 10) : null,
        hello_multiplier: null,
        authentication: {
          md5_key_ids: md5KeyIds,
          plaintext_password: plaintextPassword.trim() || null,
        },
        ldp_sync: ldpSync,
        ldp_sync_disable: ldpSyncDisable,
        ldp_sync_holddown: ldpSyncHolddown.trim() ? parseInt(ldpSyncHolddown.trim(), 10) : null,
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

  const networkTypes = capabilities?.network_types || [
    "broadcast", "non-broadcast", "point-to-multipoint", "point-to-point",
  ];

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
                <Label htmlFor="ospf-iface-name">{t("fields.interface")}</Label>
                <InterfaceSelect
                  value={name}
                  onValueChange={setName}
                  disabled={isEditMode}
                  id="ospf-iface-name"
                  className={isEditMode ? "bg-muted" : ""}
                  interfaces={availableInterfaces}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ospf-iface-area">{t("fields.area")}</Label>
                <Input
                  id="ospf-iface-area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={t("interfaceModal.areaPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ospf-iface-network">{t("fields.networkType")}</Label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger id="ospf-iface-network">
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
                  <Label htmlFor="ospf-iface-cost">{t("fields.cost")}</Label>
                  <Input
                    id="ospf-iface-cost"
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="1-65535"
                    min={1}
                    max={65535}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospf-iface-priority">{t("fields.priority")}</Label>
                  <Input
                    id="ospf-iface-priority"
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    placeholder="0-255"
                    min={0}
                    max={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospf-iface-bandwidth">{t("interfaceModal.bandwidth")}</Label>
                  <Input
                    id="ospf-iface-bandwidth"
                    type="number"
                    value={bandwidth}
                    onChange={(e) => setBandwidth(e.target.value)}
                    placeholder={t("interfaceModal.bandwidthPlaceholder")}
                  />
                </div>
              </div>
            </div>

            {/* Timers */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("interfaceModal.timers")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ospf-iface-hello">{t("interfaceModal.helloInterval")}</Label>
                  <Input
                    id="ospf-iface-hello"
                    type="number"
                    value={helloInterval}
                    onChange={(e) => setHelloInterval(e.target.value)}
                    placeholder={t("interfaceModal.seconds")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospf-iface-dead">{t("interfaceModal.deadInterval")}</Label>
                  <Input
                    id="ospf-iface-dead"
                    type="number"
                    value={deadInterval}
                    onChange={(e) => setDeadInterval(e.target.value)}
                    placeholder={t("interfaceModal.seconds")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospf-iface-retransmit">{t("interfaceModal.retransmitInterval")}</Label>
                  <Input
                    id="ospf-iface-retransmit"
                    type="number"
                    value={retransmitInterval}
                    onChange={(e) => setRetransmitInterval(e.target.value)}
                    placeholder={t("interfaceModal.seconds")}
                  />
                </div>
                {showRetransmitWindow && (
                  <div className="space-y-2">
                    <Label htmlFor="ospf-iface-retransmit-window">{t("interfaceModal.retransmitWindow")}</Label>
                    <Input
                      id="ospf-iface-retransmit-window"
                      type="number"
                      value={retransmitWindow}
                      onChange={(e) => setRetransmitWindow(e.target.value)}
                      placeholder={t("interfaceModal.packets")}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="ospf-iface-transmit-delay">{t("interfaceModal.transmitDelay")}</Label>
                  <Input
                    id="ospf-iface-transmit-delay"
                    type="number"
                    value={transmitDelay}
                    onChange={(e) => setTransmitDelay(e.target.value)}
                    placeholder={t("interfaceModal.seconds")}
                  />
                </div>
              </div>
            </div>

            {/* Flags */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("fields.options")}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <Checkbox
                    id="ospf-iface-passive"
                    checked={passive}
                    onCheckedChange={(checked) => setPassive(checked === true)}
                  />
                  <Label htmlFor="ospf-iface-passive" className="cursor-pointer text-sm">
                    {t("fields.passive")}
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <Checkbox
                    id="ospf-iface-bfd"
                    checked={bfd}
                    onCheckedChange={(checked) => setBfd(checked === true)}
                  />
                  <Label htmlFor="ospf-iface-bfd" className="cursor-pointer text-sm">
                    BFD
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <Checkbox
                    id="ospf-iface-mtu-ignore"
                    checked={mtuIgnore}
                    onCheckedChange={(checked) => setMtuIgnore(checked === true)}
                  />
                  <Label htmlFor="ospf-iface-mtu-ignore" className="cursor-pointer text-sm">
                    {t("interfaceModal.mtuIgnore")}
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <Checkbox
                    id="ospf-iface-ldp-sync"
                    checked={ldpSync}
                    onCheckedChange={(checked) => setLdpSync(checked === true)}
                  />
                  <Label htmlFor="ospf-iface-ldp-sync" className="cursor-pointer text-sm">
                    {t("interfaceModal.ldpSync")}
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <Checkbox
                    id="ospf-iface-ldp-sync-disable"
                    checked={ldpSyncDisable}
                    onCheckedChange={(checked) => setLdpSyncDisable(checked === true)}
                  />
                  <Label htmlFor="ospf-iface-ldp-sync-disable" className="cursor-pointer text-sm">
                    {t("interfaceModal.disableLdpSync")}
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ospf-iface-ldp-sync-holddown">{t("interfaceModal.ldpSyncHolddown")}</Label>
                <Input
                  id="ospf-iface-ldp-sync-holddown"
                  type="number"
                  value={ldpSyncHolddown}
                  onChange={(e) => setLdpSyncHolddown(e.target.value)}
                  placeholder={t("interfaceModal.seconds")}
                  min={0}
                  max={10000}
                />
              </div>
            </div>

            {/* Authentication */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("fields.authentication")}</h4>
              <div className="space-y-2">
                <Label htmlFor="ospf-iface-plaintext">{t("fields.plaintextPassword")}</Label>
                <Input
                  id="ospf-iface-plaintext"
                  type="password"
                  value={plaintextPassword}
                  onChange={(e) => setPlaintextPassword(e.target.value)}
                  placeholder={t("interfaceModal.plaintextPasswordPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("interfaceModal.md5Keys")}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMd5Key}>
                    <Plus className="h-3 w-3 mr-1" />
                    {t("interfaceModal.addKey")}
                  </Button>
                </div>
                {md5Keys.map((key, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={key.keyId}
                      onChange={(e) => updateMd5Key(idx, "keyId", e.target.value)}
                      placeholder={t("interfaceModal.keyId")}
                      className="w-24"
                    />
                    <Input
                      type="password"
                      value={key.keyValue}
                      onChange={(e) => updateMd5Key(idx, "keyValue", e.target.value)}
                      placeholder={t("interfaceModal.md5Key")}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMd5Key(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
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
                {isEditMode ? tc("saving") : tc("creating")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              tc("addInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
