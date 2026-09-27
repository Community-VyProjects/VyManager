"use client";

import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  snmpService,
  SNMPConfig,
  SNMPCapabilities,
  SNMPGeneralUpdate,
} from "@/lib/api/snmp";
import { SNMPMultiValueField } from "./SNMPMultiValueField";

interface SNMPGeneralSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SNMPConfig;
  capabilities: SNMPCapabilities;
  onSuccess: () => void;
}

const DEFAULT_PROTOCOL = "__default__";

export function SNMPGeneralSettingsModal({
  open,
  onOpenChange,
  config,
  capabilities,
  onSuccess,
}: SNMPGeneralSettingsModalProps) {
  const t = useTranslations("snmp");
  const tc = useTranslations("common");
  const [contact, setContact] = useState(config.contact ?? "");
  const [description, setDescription] = useState(config.description ?? "");
  const [location, setLocation] = useState(config.location ?? "");
  const [protocol, setProtocol] = useState(config.protocol ?? DEFAULT_PROTOCOL);
  const [trapSource, setTrapSource] = useState(config.trap_source ?? "");
  const [vrf, setVrf] = useState(config.vrf ?? "");
  const [engineid, setEngineid] = useState(config.v3.engineid ?? "");
  const [smuxPeers, setSmuxPeers] = useState<string[]>(config.smux_peers);
  const [oidEnable, setOidEnable] = useState<string[]>(config.oid_enable);
  const [mibInterfaces, setMibInterfaces] = useState<string[]>(config.mib_interfaces);
  const [mibInterfaceMax, setMibInterfaceMax] = useState(config.mib_interface_max ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (list: string[], setter: (v: string[]) => void, value: string) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const update: SNMPGeneralUpdate = {
      original: config,
      contact,
      description,
      location,
      protocol: protocol === DEFAULT_PROTOCOL ? "" : protocol,
      trapSource,
      vrf,
      engineid,
      smuxPeers,
      oidEnable,
      mibInterfaces,
      mibInterfaceMax,
    };
    try {
      await snmpService.updateGeneral(update);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("general.title")}</DialogTitle>
          <DialogDescription>
            {t("general.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            {/* Identity */}
            <div className="space-y-1.5">
              <Label htmlFor="snmp-contact">{t("content.contact")}</Label>
              <Input
                id="snmp-contact"
                placeholder={t("general.contactPlaceholder")}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="snmp-location">{t("content.location")}</Label>
              <Input
                id="snmp-location"
                placeholder={t("general.locationPlaceholder")}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="snmp-description">{tc("description")}</Label>
              <Input
                id="snmp-description"
                placeholder={t("general.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Separator />

            {/* Transport */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("general.transportProtocol")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("general.transportProtocolHelp")}
              </p>
              <Select value={protocol} onValueChange={setProtocol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_PROTOCOL}>
                    {t("general.defaultValue", { value: capabilities.features.protocol.default.toUpperCase() })}
                  </SelectItem>
                  {capabilities.features.protocol.values.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="snmp-trap-source">{t("general.trapSourceAddress")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("general.trapSourceHelp")}
              </p>
              <Input
                id="snmp-trap-source"
                placeholder={t("general.trapSourcePlaceholder")}
                value={trapSource}
                onChange={(e) => setTrapSource(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="snmp-vrf">{t("general.vrfInstance")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("general.vrfHelp")}
              </p>
              <VrfSelect
                id="snmp-vrf"
                placeholder={t("general.defaultRoutingTable")}
                value={vrf}
                onValueChange={setVrf}
                extraOptions={[{ label: tc("default"), value: "default" }]}
              />
            </div>

            <Separator />

            {/* SNMPv3 engine id */}
            <div className="space-y-1.5">
              <Label htmlFor="snmp-engineid">{t("content.engineId")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("general.engineIdHelp")}
              </p>
              <Input
                id="snmp-engineid"
                placeholder={t("general.engineIdPlaceholder")}
                value={engineid}
                onChange={(e) => setEngineid(e.target.value)}
                className="font-mono"
              />
            </div>

            <Separator />

            {/* OID enable */}
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">{t("general.enableOids")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("general.enableOidsHelp")}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {capabilities.features.oid_enable.values.map((oid) => (
                  <div key={oid} className="flex items-center gap-2">
                    <Checkbox
                      id={`oid-${oid}`}
                      checked={oidEnable.includes(oid)}
                      onCheckedChange={() => toggle(oidEnable, setOidEnable, oid)}
                    />
                    <Label htmlFor={`oid-${oid}`} className="cursor-pointer font-mono text-xs">
                      {oid}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* MIB interface collection */}
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">{t("general.ifMibPrefixes")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("general.ifMibPrefixesHelp")}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {capabilities.features.mib.interface_prefixes.map((prefix) => (
                  <div key={prefix} className="flex items-center gap-2">
                    <Checkbox
                      id={`mib-${prefix}`}
                      checked={mibInterfaces.includes(prefix)}
                      onCheckedChange={() => toggle(mibInterfaces, setMibInterfaces, prefix)}
                    />
                    <Label htmlFor={`mib-${prefix}`} className="cursor-pointer font-mono text-xs">
                      {prefix}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="snmp-mib-max">{t("content.maxIfMibInterfaces")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("general.maxIfMibHelp")}
              </p>
              <Input
                id="snmp-mib-max"
                type="number"
                min={1}
                placeholder={t("general.maxIfMibPlaceholder")}
                value={mibInterfaceMax}
                onChange={(e) => setMibInterfaceMax(e.target.value)}
              />
            </div>

            <Separator />

            {/* SMUX peers */}
            <SNMPMultiValueField
              label={t("content.smuxPeers")}
              description={t("general.smuxPeersHelp")}
              placeholder={t("general.smuxPeersPlaceholder")}
              values={smuxPeers}
              onChange={setSmuxPeers}
            />
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
