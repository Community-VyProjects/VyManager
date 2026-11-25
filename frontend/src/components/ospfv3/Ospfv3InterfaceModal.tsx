"use client";

import { NONE_SENTINEL } from "@/lib/named-list-select-options";
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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Ospfv3Interface, Ospfv3Capabilities, Ospfv3RangeKey } from "@/lib/api/ospfv3";
import { ospfv3Int, ospfv3InterfaceProblem, ospfv3ProblemArgs, ospfv3Range } from "@/lib/api/ospfv3-save-ops";
import type { ApiError } from "@/lib/types/api";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { useTranslations } from "next-intl";

interface Ospfv3InterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: Ospfv3Interface) => Promise<void>;
  existingInterface?: Ospfv3Interface | null;
  capabilities?: Ospfv3Capabilities | null;
  bfdProfileNames: string[];
  /** Area IDs the area leaf can name (protocols ospfv3 area). */
  areaIds: string[];
  /** Interfaces already under protocols ospfv3; Add does not offer them. */
  configuredInterfaces: string[];
}

const toText = (value: number | string | null | undefined) => (value == null ? "" : String(value));

export function Ospfv3InterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  capabilities,
  bfdProfileNames,
  areaIds,
  configuredInterfaces,
}: Ospfv3InterfaceModalProps) {
  const t = useTranslations("ospfv3");
  const tc = useTranslations("common");
  const isEditMode = !!existingInterface;
  const networkTypes = capabilities?.features?.interfaces?.network_types || [];

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

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces()
      .then((response) => setAvailableInterfaces(response.interfaces))
      .catch(() => setAvailableInterfaces([]));
    const src = existingInterface;
    setName(src?.name ?? "");
    setArea(src?.area ?? "");
    setCost(toText(src?.cost));
    setPriority(toText(src?.priority));
    setHelloInterval(toText(src?.hello_interval));
    setDeadInterval(toText(src?.dead_interval));
    setRetransmitInterval(toText(src?.retransmit_interval));
    setTransmitDelay(toText(src?.transmit_delay));
    setNetwork(src?.network ?? "");
    setPassive(src?.passive ?? false);
    setBfd(src?.bfd ?? false);
    setBfdProfile(src?.bfd_profile ?? "");
    setMtuIgnore(src?.mtu_ignore ?? false);
    setIfmtu(toText(src?.ifmtu));
    setInstanceId(toText(src?.instance_id));
    setError(null);
  }, [open, existingInterface]);

  const handleClose = () => onOpenChange(false);

  const buildConfig = (): Ospfv3Interface => ({
    name: name.trim(),
    area: area.trim() || null,
    cost: ospfv3Int(cost),
    priority: ospfv3Int(priority),
    hello_interval: ospfv3Int(helloInterval),
    dead_interval: ospfv3Int(deadInterval),
    retransmit_interval: ospfv3Int(retransmitInterval),
    transmit_delay: ospfv3Int(transmitDelay),
    network: network || null,
    passive,
    bfd,
    bfd_profile: bfd ? bfdProfile || null : null,
    mtu_ignore: mtuIgnore,
    ifmtu: ospfv3Int(ifmtu),
    instance_id: ospfv3Int(instanceId),
  });

  const handleSubmit = async () => {
    const config = buildConfig();
    const problem = ospfv3InterfaceProblem(config, capabilities);
    if (problem) {
      setError(t(`validation.${problem.key}`, ospfv3ProblemArgs(problem)));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(config);
      handleClose();
    } catch (err: unknown) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const numberField = (
    id: string,
    label: string,
    value: string,
    setValue: (v: string) => void,
    rangeKey: Ospfv3RangeKey,
    placeholder?: string,
  ) => {
    const range = ospfv3Range(capabilities, rangeKey);
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          type="number"
          min={range?.min}
          max={range?.max}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? (range ? `${range.min}-${range.max}` : undefined)}
        />
      </div>
    );
  };

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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ospfv3-iface-name">{t("fields.interface")}</Label>
                <InterfaceSelect
                  value={name}
                  onValueChange={setName}
                  disabled={isEditMode}
                  id="ospfv3-iface-name"
                  className={isEditMode ? "bg-muted" : ""}
                  interfaces={
                    isEditMode
                      ? availableInterfaces
                      : availableInterfaces.filter((i) => !configuredInterfaces.includes(i.name))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ospfv3-iface-area">{t("fields.area")}</Label>
                <NamedListSelect id="ospfv3-iface-area" value={area} names={areaIds} onValueChange={setArea} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ospfv3-iface-network">{t("fields.networkType")}</Label>
                <Select value={network || NONE_SENTINEL} onValueChange={(v) => setNetwork(v === NONE_SENTINEL ? "" : v)}>
                  <SelectTrigger id="ospfv3-iface-network">
                    <SelectValue placeholder={tc("default")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                    {networkTypes.map((nt) => (
                      <SelectItem key={nt} value={nt}>{nt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("interfaceModal.costAndPriority")}</h4>
              <div className="grid grid-cols-2 gap-4">
                {numberField("ospfv3-iface-cost", t("fields.cost"), cost, setCost, "cost")}
                {numberField("ospfv3-iface-priority", t("fields.priority"), priority, setPriority, "priority")}
                {numberField("ospfv3-iface-ifmtu", t("interfaceModal.interfaceMtu"), ifmtu, setIfmtu, "ifmtu",
                  t("interfaceModal.interfaceMtuPlaceholder"))}
                {numberField("ospfv3-iface-instance-id", t("fields.instanceId"), instanceId, setInstanceId, "instance_id")}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("interfaceModal.timers")}</h4>
              <div className="grid grid-cols-2 gap-4">
                {numberField("ospfv3-iface-hello", t("interfaceModal.helloInterval"), helloInterval, setHelloInterval,
                  "hello_interval", t("interfaceModal.seconds"))}
                {numberField("ospfv3-iface-dead", t("interfaceModal.deadInterval"), deadInterval, setDeadInterval,
                  "dead_interval", t("interfaceModal.seconds"))}
                {numberField("ospfv3-iface-retransmit", t("interfaceModal.retransmitInterval"), retransmitInterval,
                  setRetransmitInterval, "retransmit_interval", t("interfaceModal.seconds"))}
                {numberField("ospfv3-iface-transmit-delay", t("interfaceModal.transmitDelay"), transmitDelay,
                  setTransmitDelay, "transmit_delay", t("interfaceModal.seconds"))}
              </div>
            </div>

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
                  <NamedListSelect
                    id="ospfv3-iface-bfd-profile"
                    value={bfdProfile}
                    names={bfdProfileNames}
                    onValueChange={setBfdProfile}
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
