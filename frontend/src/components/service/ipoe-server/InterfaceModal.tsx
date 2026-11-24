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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Loader2, Network, X } from "lucide-react";
import { ipoeServerService, IPoECapabilities, IPoEInterface } from "@/lib/api/ipoe-server";
import { interfaceProblem, type IPoEInterfaceDraft } from "@/lib/api/ipoe-server-save-ops";
import { ApiError } from "@/lib/types/api";

interface InterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingInterface: IPoEInterface | null;
  capabilities: IPoECapabilities | null;
  /** Interfaces already under the server; the Add picker leaves them out. */
  configuredInterfaces: string[];
}

export function InterfaceModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterface,
  capabilities,
  configuredInterfaces,
}: InterfaceModalProps) {
  const t = useTranslations("ipoeServer");
  const tc = useTranslations("common");
  const isEdit = !!existingInterface;

  const [ifaceName, setIfaceName] = useState("");
  // Empty mode, network and start-session leave the leaf unset (lab default).
  const [mode, setMode] = useState("");
  const [network, setNetwork] = useState("");
  const [startSession, setStartSession] = useState("");
  const [clientSubnet, setClientSubnet] = useState("");
  const [vlans, setVlans] = useState<string[]>([]);
  const [vlanInput, setVlanInput] = useState("");
  const [vlanMon, setVlanMon] = useState(false);
  const [luaUsername, setLuaUsername] = useState("");
  const [dhcpRelay, setDhcpRelay] = useState("");
  const [giaddr, setGiaddr] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vlanMonSupported = capabilities?.features.vlan_mon ?? false;
  const values = capabilities?.values;

  useEffect(() => {
    if (open) {
      setIfaceName(existingInterface?.interface || "");
      setMode(existingInterface?.mode || "");
      setNetwork(existingInterface?.network || "");
      setStartSession(existingInterface?.start_session || "");
      setClientSubnet(existingInterface?.client_subnet || "");
      setVlans(existingInterface?.vlans || []);
      setVlanMon(existingInterface?.vlan_mon || false);
      setLuaUsername(existingInterface?.lua_username || "");
      setDhcpRelay(existingInterface?.external_dhcp?.dhcp_relay || "");
      setGiaddr(existingInterface?.external_dhcp?.giaddr || "");
      setVlanInput("");
      setError(null);
    }
  }, [open, existingInterface]);

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const addVlan = () => {
    const val = vlanInput.trim();
    if (val && !vlans.includes(val)) {
      setVlans([...vlans, val]);
      setVlanInput("");
    }
  };

  const handleSubmit = async () => {
    const draft: IPoEInterfaceDraft = {
      interface: ifaceName,
      mode,
      network,
      start_session: startSession,
      client_subnet: clientSubnet,
      vlans,
      vlan_mon: vlanMonSupported && vlanMon,
      lua_username: luaUsername,
      dhcp_relay: dhcpRelay,
      giaddr,
    };
    const problem = interfaceProblem(existingInterface, draft, configuredInterfaces);
    if (problem === "interfaceRequired") {
      setError(tc("interfaceNameRequired"));
      return;
    }
    if (problem) {
      setError(t(`interfaceModal.errors.${problem}`));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await ipoeServerService.saveInterface(existingInterface, draft, vlanMonSupported);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("interfaceModal.saveFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("interfaceModal.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {isEdit ? t("interfaceModal.editTitle") : tc("addInterface")}
          </DialogTitle>
          <DialogDescription>{t("interfaceModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("interfaceModal.interfaceName")}</Label>
            <InterfaceSelect
              value={ifaceName}
              onValueChange={setIfaceName}
              disabled={isEdit}
              filter={isEdit ? undefined : (iface) => !configuredInterfaces.includes(iface.name)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("interfaceModal.mode")}</Label>
              <NamedListSelect
                value={mode}
                names={values?.interface_modes || []}
                onValueChange={setMode}
                noneLabel={tc("default")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("interfaceModal.network")}</Label>
              <NamedListSelect
                value={network}
                names={values?.interface_networks || []}
                onValueChange={setNetwork}
                noneLabel={tc("default")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("interfaceModal.startSession")}</Label>
            <NamedListSelect
              value={startSession}
              names={values?.start_session || []}
              onValueChange={setStartSession}
              noneLabel={tc("default")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("interfaceModal.clientSubnet")}</Label>
            <Input value={clientSubnet} onChange={(e) => setClientSubnet(e.target.value)} placeholder="192.168.100.0/24" />
          </div>

          <div className="space-y-2">
            <Label>{tc("shown.vlans")}</Label>
            <div className="flex gap-2">
              <Input
                value={vlanInput}
                onChange={(e) => setVlanInput(e.target.value)}
                placeholder={t("interfaceModal.vlanPlaceholder")}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVlan(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addVlan}>{tc("add")}</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {vlans.map((vlan) => (
                <Badge key={vlan} variant="secondary" className="gap-1 font-mono text-xs">
                  {vlan}
                  <button type="button" onClick={() => setVlans(vlans.filter((v) => v !== vlan))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {vlanMonSupported && (
            <div className="flex items-center gap-2">
              <Checkbox id="vlan-mon" checked={vlanMon} onCheckedChange={(v) => setVlanMon(!!v)} />
              <Label htmlFor="vlan-mon" className="cursor-pointer">{t("interfaceModal.vlanMonitoring")}</Label>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("interfaceModal.luaUsername")}</Label>
            <Input value={luaUsername} onChange={(e) => setLuaUsername(e.target.value)} placeholder="getUsername" />
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("interfaceModal.externalDhcp")}</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("interfaceModal.dhcpRelay")}</Label>
              <Input value={dhcpRelay} onChange={(e) => setDhcpRelay(e.target.value)} placeholder="10.0.0.1" />
            </div>
            <div className="space-y-2">
              <Label>{t("interfaceModal.giaddr")}</Label>
              <Input value={giaddr} onChange={(e) => setGiaddr(e.target.value)} placeholder="10.0.0.2" />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : t("adding")}</> : isEdit ? tc("saveChanges") : tc("addInterface")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
