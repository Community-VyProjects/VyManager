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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { OspfInterface, OspfCapabilities } from "@/lib/api/ospf";
import {
  ospfAuthDraft,
  ospfAuthFromDraft,
  ospfAuthProblem,
  ospfInterfaceProblem,
  ospfPassiveMode,
  type OspfAuthDraft,
  type OspfPassiveMode,
} from "@/lib/api/ospf-save-ops";
import type { ApiError } from "@/lib/types/api";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { OspfAuthFields } from "./OspfAuthFields";
import { useTranslations } from "next-intl";

const NONE = "__none__";

interface OspfInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: OspfInterface) => Promise<void>;
  existingInterface?: OspfInterface | null;
  capabilities?: OspfCapabilities | null;
  bfdProfileNames: string[];
  /** Area IDs the area leaf can name (protocols ospf area). */
  areaIds: string[];
  /** Interfaces already under protocols ospf; Add does not offer them. */
  configuredInterfaces: string[];
}

const toText = (value: number | string | null | undefined) => (value == null ? "" : String(value));
const toInt = (value: string) => (value.trim() ? parseInt(value.trim(), 10) : null);

export function OspfInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  capabilities,
  bfdProfileNames,
  areaIds,
  configuredInterfaces,
}: OspfInterfaceModalProps) {
  const t = useTranslations("ospf");
  const tc = useTranslations("common");
  const isEditMode = !!existingInterface;
  const showRetransmitWindow = capabilities?.features?.interfaces?.retransmit_window === true;
  const networkTypes = capabilities?.features?.interfaces?.network_types || [];
  const authModes = capabilities?.features?.interfaces?.authentication_modes || [];

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [cost, setCost] = useState("");
  const [priority, setPriority] = useState("");
  const [helloInterval, setHelloInterval] = useState("");
  const [deadInterval, setDeadInterval] = useState("");
  const [helloMultiplier, setHelloMultiplier] = useState("");
  const [retransmitInterval, setRetransmitInterval] = useState("");
  const [retransmitWindow, setRetransmitWindow] = useState("");
  const [transmitDelay, setTransmitDelay] = useState("");
  const [network, setNetwork] = useState("");
  const [passive, setPassive] = useState<OspfPassiveMode>("");
  const [bfd, setBfd] = useState(false);
  const [bfdProfile, setBfdProfile] = useState("");
  const [mtuIgnore, setMtuIgnore] = useState(false);
  const [ldpSync, setLdpSync] = useState(false);
  const [ldpSyncDisable, setLdpSyncDisable] = useState(false);
  const [ldpSyncHolddown, setLdpSyncHolddown] = useState("");
  const [bandwidth, setBandwidth] = useState("");
  const [auth, setAuth] = useState<OspfAuthDraft>(ospfAuthDraft(null));

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
    setHelloMultiplier(toText(src?.hello_multiplier));
    setRetransmitInterval(toText(src?.retransmit_interval));
    setRetransmitWindow(toText(src?.retransmit_window));
    setTransmitDelay(toText(src?.transmit_delay));
    setNetwork(src?.network ?? "");
    setPassive(ospfPassiveMode(src));
    setBfd(src?.bfd ?? false);
    setBfdProfile(src?.bfd_profile ?? "");
    setMtuIgnore(src?.mtu_ignore ?? false);
    setLdpSync(src?.ldp_sync ?? false);
    setLdpSyncDisable(src?.ldp_sync_disable ?? false);
    setLdpSyncHolddown(toText(src?.ldp_sync_holddown));
    setBandwidth(toText(src?.bandwidth));
    setAuth(ospfAuthDraft(src?.authentication));
    setError(null);
  }, [open, existingInterface]);

  const handleClose = () => onOpenChange(false);

  const buildConfig = (): OspfInterface => ({
    name: name.trim(),
    area: area.trim() || null,
    cost: toInt(cost),
    priority: toInt(priority),
    hello_interval: toInt(helloInterval),
    dead_interval: toInt(deadInterval),
    hello_multiplier: toInt(helloMultiplier),
    retransmit_interval: toInt(retransmitInterval),
    retransmit_window: showRetransmitWindow ? toInt(retransmitWindow) : null,
    transmit_delay: toInt(transmitDelay),
    network: network || null,
    passive: passive === "passive",
    passive_disable: passive === "disable",
    bfd,
    bfd_profile: bfd ? bfdProfile || null : null,
    mtu_ignore: mtuIgnore,
    bandwidth: toInt(bandwidth),
    authentication: ospfAuthFromDraft(auth),
    ldp_sync: ldpSync,
    ldp_sync_disable: ldpSync && ldpSyncDisable,
    ldp_sync_holddown: ldpSync ? toInt(ldpSyncHolddown) : null,
  });

  const validateForm = (config: OspfInterface): string | null => {
    if (!config.name) return t("interfaceModal.selectInterface");
    if (config.cost != null && (isNaN(config.cost) || config.cost < 1 || config.cost > 65535)) {
      return t("interfaceModal.costRange");
    }
    if (config.priority != null && (isNaN(config.priority) || config.priority < 0 || config.priority > 255)) {
      return t("interfaceModal.priorityRange");
    }
    if (config.ldp_sync_holddown != null && (isNaN(config.ldp_sync_holddown) || config.ldp_sync_holddown < 0 || config.ldp_sync_holddown > 10000)) {
      return t("interfaceModal.ldpSyncHolddownRange");
    }
    const ifaceProblem = ospfInterfaceProblem(config);
    if (ifaceProblem) return t(`interfaceModal.${ifaceProblem}`);
    const authProblem = ospfAuthProblem(existingInterface?.authentication, auth);
    if (authProblem) return t(`auth.${authProblem}`);
    return null;
  };

  const handleSubmit = async () => {
    const config = buildConfig();
    const validationError = validateForm(config);
    if (validationError) {
      setError(validationError);
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

  const numberField = (id: string, label: string, value: string, setValue: (v: string) => void, placeholder?: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
    </div>
  );

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
                <Label htmlFor="ospf-iface-name">{t("fields.interface")}</Label>
                <InterfaceSelect
                  value={name}
                  onValueChange={setName}
                  disabled={isEditMode}
                  id="ospf-iface-name"
                  className={isEditMode ? "bg-muted" : ""}
                  interfaces={
                    isEditMode
                      ? availableInterfaces
                      : availableInterfaces.filter((i) => !configuredInterfaces.includes(i.name))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ospf-iface-area">{t("fields.area")}</Label>
                <NamedListSelect id="ospf-iface-area" value={area} names={areaIds} onValueChange={setArea} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ospf-iface-network">{t("fields.networkType")}</Label>
                <Select value={network || NONE} onValueChange={(v) => setNetwork(v === NONE ? "" : v)}>
                  <SelectTrigger id="ospf-iface-network">
                    <SelectValue placeholder={tc("default")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{tc("default")}</SelectItem>
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
                {numberField("ospf-iface-cost", t("fields.cost"), cost, setCost)}
                {numberField("ospf-iface-priority", t("fields.priority"), priority, setPriority)}
                {numberField("ospf-iface-bandwidth", t("interfaceModal.bandwidth"), bandwidth, setBandwidth, t("interfaceModal.bandwidthPlaceholder"))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("interfaceModal.timers")}</h4>
              <div className="grid grid-cols-2 gap-4">
                {numberField("ospf-iface-hello", t("interfaceModal.helloInterval"), helloInterval, setHelloInterval, t("interfaceModal.seconds"))}
                {numberField("ospf-iface-dead", t("interfaceModal.deadInterval"), deadInterval, setDeadInterval, t("interfaceModal.seconds"))}
                {numberField("ospf-iface-hello-multiplier", t("interfaceModal.helloMultiplier"), helloMultiplier, setHelloMultiplier)}
                {numberField("ospf-iface-retransmit", t("interfaceModal.retransmitInterval"), retransmitInterval, setRetransmitInterval, t("interfaceModal.seconds"))}
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
                {numberField("ospf-iface-transmit-delay", t("interfaceModal.transmitDelay"), transmitDelay, setTransmitDelay, t("interfaceModal.seconds"))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("fields.options")}</h4>
              <div className="space-y-2">
                <Label htmlFor="ospf-iface-passive">{t("fields.passive")}</Label>
                <Select value={passive || NONE} onValueChange={(v) => setPassive(v === NONE ? "" : (v as OspfPassiveMode))}>
                  <SelectTrigger id="ospf-iface-passive">
                    <SelectValue placeholder={tc("default")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{tc("default")}</SelectItem>
                    <SelectItem value="passive">{t("fields.passive")}</SelectItem>
                    <SelectItem value="disable">{t("interfaceModal.passiveDisable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <Checkbox id="ospf-iface-bfd" checked={bfd} onCheckedChange={(checked) => setBfd(checked === true)} />
                  <Label htmlFor="ospf-iface-bfd" className="cursor-pointer text-sm">{t("fields.bfd")}</Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <Checkbox id="ospf-iface-mtu-ignore" checked={mtuIgnore} onCheckedChange={(checked) => setMtuIgnore(checked === true)} />
                  <Label htmlFor="ospf-iface-mtu-ignore" className="cursor-pointer text-sm">{t("interfaceModal.mtuIgnore")}</Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border p-3">
                  <Checkbox id="ospf-iface-ldp-sync" checked={ldpSync} onCheckedChange={(checked) => setLdpSync(checked === true)} />
                  <Label htmlFor="ospf-iface-ldp-sync" className="cursor-pointer text-sm">{t("interfaceModal.ldpSync")}</Label>
                </div>
                {ldpSync && (
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
                )}
              </div>
              {bfd && (
                <div className="space-y-2">
                  <Label htmlFor="ospf-iface-bfd-profile">{t("interfaceModal.bfdProfile")}</Label>
                  <NamedListSelect
                    id="ospf-iface-bfd-profile"
                    value={bfdProfile}
                    names={bfdProfileNames}
                    onValueChange={setBfdProfile}
                  />
                </div>
              )}
              {ldpSync && (
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
              )}
            </div>

            <OspfAuthFields idPrefix="ospf-iface" draft={auth} onChange={setAuth} modes={authModes} />
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
