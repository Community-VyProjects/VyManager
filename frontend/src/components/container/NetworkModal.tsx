"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { ContainerNetworkConfig, ContainerCapabilities } from "@/lib/api/container";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  network: ContainerNetworkConfig | null;
  capabilities: ContainerCapabilities | null;
  onSubmit: (data: ContainerNetworkConfig) => Promise<void>;
}

export function NetworkModal({ open, onOpenChange, network, capabilities, onSubmit }: Props) {
  const t = useTranslations("containerResources");
  const tc = useTranslations("common");
  const isEditMode = !!network;
  const caps = capabilities?.features;

  const showType = (caps?.network_type_bridge?.supported || caps?.network_type_macvlan?.supported) ?? true;
  const showMtu = caps?.network_mtu?.supported ?? true;
  const showGateways = caps?.network_gateway?.supported ?? true;
  const macvlanModes = caps?.network_type_macvlan?.macvlan_modes ?? ["bridge", "private", "vepa"];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [networkType, setNetworkType] = useState("");
  const [macvlanMode, setMacvlanMode] = useState("");
  const [macvlanParent, setMacvlanParent] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [noNameServer, setNoNameServer] = useState(false);
  const [prefixes, setPrefixes] = useState<string[]>([]);
  const [prefixInput, setPrefixInput] = useState("");
  const [gateways, setGateways] = useState<string[]>([]);
  const [gatewayInput, setGatewayInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const n = network;
    setName(n?.name ?? "");
    setDescription(n?.description ?? "");
    setNetworkType(n?.network_type ?? "");
    setMacvlanMode(n?.macvlan_mode ?? "");
    setMacvlanParent(n?.macvlan_parent ?? "");
    setMtu(n?.mtu ?? "");
    setVrf(n?.vrf ?? "");
    setNoNameServer(n?.no_name_server ?? false);
    setPrefixes([...(n?.prefixes ?? [])]);
    setGateways([...(n?.gateways ?? [])]);
    setPrefixInput("");
    setGatewayInput("");
    setError(null);
  }, [open, network]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const addPrefix = () => {
    if (!prefixInput || prefixes.includes(prefixInput)) return;
    setPrefixes([...prefixes, prefixInput]);
    setPrefixInput("");
  };

  const addGateway = () => {
    if (!gatewayInput || gateways.includes(gatewayInput)) return;
    setGateways([...gateways, gatewayInput]);
    setGatewayInput("");
  };

  const validate = (): string | null => {
    if (!isEditMode && !name.trim()) return t("networkModal.nameRequired");
    if (!isEditMode && !/^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}$/.test(name.trim())) return t("networkModal.nameInvalid");
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        network_type: networkType || null,
        macvlan_mode: networkType === "macvlan" ? (macvlanMode || null) : null,
        macvlan_parent: networkType === "macvlan" ? (macvlanParent.trim() || null) : null,
        mtu: mtu.trim() || null,
        vrf: vrf.trim() || null,
        no_name_server: noNameServer,
        prefixes,
        gateways,
      });
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const typeOptions: { value: string; label: string }[] = [
    ...(caps?.network_type_bridge?.supported !== false ? [{ value: "bridge", label: t("networkModal.typeBridge") }] : []),
    ...(caps?.network_type_macvlan?.supported !== false ? [{ value: "macvlan", label: "MACVLAN" }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t("networkModal.editTitle", { name: network?.name ?? "" }) : t("networks.addNetwork")}</DialogTitle>
          <DialogDescription>
            {isEditMode ? t("networkModal.editDescription") : t("networkModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 pb-2">
            <div className="space-y-2">
              <Label htmlFor="net-name">{t("networkModal.networkName")}</Label>
              <Input
                id="net-name"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isEditMode}
                className={isEditMode ? "bg-muted font-mono" : "font-mono"}
                placeholder={t("networkModal.namePlaceholder")}
              />
              {isEditMode && <p className="text-xs text-muted-foreground">{t("networkModal.nameImmutable")}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="net-desc">{tc("description")}</Label>
              <Input id="net-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder={t("networkModal.descriptionPlaceholder")} />
            </div>

            {showType && typeOptions.length > 0 && (
              <div className="space-y-2">
                <Label>{t("networkModal.networkType")}</Label>
                <Select value={networkType} onValueChange={setNetworkType}>
                  <SelectTrigger><SelectValue placeholder={t("networkModal.selectType")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{t("networkModal.noneOption")}</SelectItem>
                    {typeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {networkType === "macvlan" && (
              <>
                <div className="space-y-2">
                  <Label>{t("networkModal.macvlanMode")}</Label>
                  <Select value={macvlanMode} onValueChange={setMacvlanMode}>
                    <SelectTrigger><SelectValue placeholder={t("networkModal.selectMode")} /></SelectTrigger>
                    <SelectContent>
                      {macvlanModes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="net-parent">{t("networkModal.parentInterface")}</Label>
                  <Input id="net-parent" value={macvlanParent} onChange={e => setMacvlanParent(e.target.value)} placeholder={t("networkModal.parentPlaceholder")} className="font-mono" />
                </div>
              </>
            )}

            {showMtu && (
              <div className="space-y-2">
                <Label htmlFor="net-mtu">MTU</Label>
                <Input id="net-mtu" type="number" value={mtu} onChange={e => setMtu(e.target.value)} placeholder={t("networkModal.mtuPlaceholder")} className="font-mono" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="net-vrf">VRF</Label>
              <VrfSelect id="net-vrf" value={vrf} onValueChange={setVrf} className="font-mono" />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="net-nns" checked={noNameServer} onCheckedChange={v => setNoNameServer(v === true)} />
              <Label htmlFor="net-nns" className="cursor-pointer">{t("networkModal.noNameServer")}</Label>
            </div>

            {/* Prefixes */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">{t("networks.prefixes")}</Label>
              {prefixes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {prefixes.map(p => (
                    <Badge key={p} variant="secondary" className="font-mono gap-1 pr-1">
                      {p}
                      <button onClick={() => setPrefixes(prefixes.filter(x => x !== p))} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input value={prefixInput} onChange={e => setPrefixInput(e.target.value)} placeholder={t("networkModal.prefixPlaceholder")} className="font-mono flex-1" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPrefix(); } }} />
                <Button variant="outline" size="icon" onClick={addPrefix} disabled={!prefixInput}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Gateways */}
            {showGateways && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{t("networks.gateways")}</Label>
                {gateways.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {gateways.map(g => (
                      <Badge key={g} variant="secondary" className="font-mono gap-1 pr-1">
                        {g}
                        <button onClick={() => setGateways(gateways.filter(x => x !== g))} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input value={gatewayInput} onChange={e => setGatewayInput(e.target.value)} placeholder={t("networkModal.gatewayPlaceholder")} className="font-mono flex-1" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addGateway(); } }} />
                  <Button variant="outline" size="icon" onClick={addGateway} disabled={!gatewayInput}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditMode ? t("networkModal.saving") : t("networkModal.adding")}</>
            ) : isEditMode ? t("networkModal.saveChanges") : t("networks.addNetwork")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
