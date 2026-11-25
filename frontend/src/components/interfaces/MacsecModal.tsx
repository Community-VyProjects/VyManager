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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { MultiValueInput } from "@/components/service/webproxy/MultiValueInput";
import { listedNames } from "@/lib/named-list-select-options";
import { Lock, Loader2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { macsecService, type MacsecInterface, type MacsecCapabilities } from "@/lib/api/macsec";
import {
  ACCEPT_DAD_VALUES,
  ARP_CACHE_TIMEOUT_RANGE,
  BASE_REACHABLE_TIME_RANGE,
  DAD_TRANSMITS_RANGE,
  DEFAULT_ROUTE_DISTANCE_RANGE,
  DESCRIPTION_MAX,
  MKA_PRIORITY_RANGE,
  MTU_RANGE,
  PD_ADDRESS_RANGE,
  PD_ID_RANGE,
  PD_LENGTH_RANGE,
  PD_SLA_ID_RANGE,
  PEER_NAME_MAX,
  REPLAY_WINDOW_RANGE,
  SOURCE_INTERFACE_TYPE,
  emptyMacsecDhcp,
  emptyMacsecDhcpv6,
  macsecCipherValues,
  macsecDraft,
  macsecKeyHexLength,
  macsecSaveProblem,
  macsecSourceValidationValues,
  macsecSupports,
  nextPdId,
  nextPeerName,
  type MacsecDhcpDraft,
  type MacsecDhcpv6Draft,
  type MacsecDraft,
  type MacsecIpDraft,
  type MacsecIpv6Draft,
  type MacsecMode,
  type MacsecPdDraft,
  type MacsecPdInterfaceDraft,
  type MacsecPeerDraft,
  type MacsecProblem,
  type NumericRange,
} from "@/lib/api/macsec-save-ops";
import type { ApiError } from "@/lib/types/api";

interface MacsecModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: MacsecCapabilities | null;
  existingInterfaces: string[];
  existing?: MacsecInterface | null;
}

/** The page passes a `key` that changes per open, so the draft is seeded from props here. */
export function MacsecModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
  existing,
}: MacsecModalProps) {
  const t = useTranslations("macsec");
  const tc = useTranslations("common");
  const isEdit = !!existing;
  const original = existing ?? null;

  const [draft, setDraft] = useState<MacsecDraft>(() => macsecDraft(original, capabilities, existingInterfaces));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<MacsecDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const updateIp = (patch: Partial<MacsecIpDraft>) => setDraft((d) => ({ ...d, ip: { ...d.ip, ...patch } }));
  const updateIpv6 = (patch: Partial<MacsecIpv6Draft>) => setDraft((d) => ({ ...d, ipv6: { ...d.ipv6, ...patch } }));
  const updateDhcp = (patch: Partial<MacsecDhcpDraft>) =>
    setDraft((d) => ({ ...d, dhcp_options: { ...d.dhcp_options, ...patch } }));
  const updateDhcpv6 = (patch: Partial<MacsecDhcpv6Draft>) =>
    setDraft((d) => ({ ...d, dhcpv6_options: { ...d.dhcpv6_options, ...patch } }));

  // Static peers (row key is the index; a new row gets the next unused name)
  const addPeer = () =>
    setDraft((d) => ({
      ...d,
      peers: [...d.peers, { name: nextPeerName(d.peers, original), key: "", mac: "", disable: false }],
    }));
  const removePeer = (index: number) => setDraft((d) => ({ ...d, peers: d.peers.filter((_, i) => i !== index) }));
  const updatePeer = (index: number, patch: Partial<MacsecPeerDraft>) =>
    setDraft((d) => ({ ...d, peers: d.peers.map((p, i) => (i === index ? { ...p, ...patch } : p)) }));

  // DHCPv6 prefix delegations
  const setPd = (pd: MacsecPdDraft[]) => updateDhcpv6({ pd });
  const pdRows = draft.dhcpv6_options.pd;
  const addPd = () => setPd([...pdRows, { id: nextPdId(pdRows, original), length: "", interfaces: [] }]);
  const removePd = (index: number) => setPd(pdRows.filter((_, i) => i !== index));
  const updatePd = (index: number, patch: Partial<MacsecPdDraft>) =>
    setPd(pdRows.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  const addPdInterface = (index: number) =>
    updatePd(index, { interfaces: [...pdRows[index].interfaces, { name: "", address: "", sla_id: "" }] });
  const removePdInterface = (index: number, row: number) =>
    updatePd(index, { interfaces: pdRows[index].interfaces.filter((_, i) => i !== row) });
  const updatePdInterface = (index: number, row: number, patch: Partial<MacsecPdInterfaceDraft>) =>
    updatePd(index, {
      interfaces: pdRows[index].interfaces.map((r, i) => (i === row ? { ...r, ...patch } : r)),
    });

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  // An empty name reuses the shared common message.
  const problemText = (p: MacsecProblem) =>
    p.key === "nameRequired" ? tc("interfaceNameRequired") : t(`modal.errors.${p.key}`, p.values);

  const handleSubmit = async () => {
    const issue = macsecSaveProblem(original, draft, capabilities, existingInterfaces);
    if (issue) {
      setError(problemText(issue));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (original) await macsecService.updateInterface(original, draft, capabilities);
      else await macsecService.createInterface(draft, capabilities);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t(isEdit ? "modal.errors.updateFailed" : "modal.errors.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  const ciphers = listedNames(macsecCipherValues(capabilities), draft.cipher);
  const sourceValidation = macsecSourceValidationValues(capabilities);
  const sourceValidationLabels: Record<string, string> = {
    strict: t("modal.advanced.strict"),
    loose: t("modal.advanced.loose"),
    disable: t("modal.advanced.disable"),
  };
  const keyPlaceholder = macsecKeyHexLength(draft.cipher) === 64 ? t("modal.security.hex64") : t("modal.security.hex32");
  const hasInterfaceIdentifier = macsecSupports(capabilities, "ipv6_address_interface_identifier");
  const hasNoRequestDns = macsecSupports(capabilities, "dhcpv6_options_no_request_dns");
  const hasNoRequestDomainName = macsecSupports(capabilities, "dhcpv6_options_no_request_domain_name");
  const none = { label: tc("none"), value: "" };

  const numberField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    range: NumericRange,
    placeholder?: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
        type="number"
        min={range.min}
        max={range.max}
      />
    </div>
  );

  const checkField = (id: string, label: string, checked: boolean, onChange: (checked: boolean) => void) => (
    <div className="flex items-center space-x-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} />
      <Label htmlFor={id} className="text-xs font-normal">{label}</Label>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {isEdit ? t("modal.editTitle") : t("modal.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {existing ? (
              t.rich("modal.editDescription", {
                name: existing.name,
                code: (chunks) => (
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
                    {chunks}
                  </code>
                ),
              })
            ) : (
              t("modal.createDescription")
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">{t("modal.tabs.basic")}</TabsTrigger>
            <TabsTrigger value="security">{t("modal.tabs.security")}</TabsTrigger>
            <TabsTrigger value="addresses">{t("modal.tabs.addresses")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("modal.tabs.advanced")}</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("modal.basic.interfaceName")}</Label>
                <Input
                  id="name"
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="macsec0"
                  disabled={isEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceInterface">{t("modal.basic.sourceInterface")} <span className="text-destructive">*</span></Label>
                <InterfaceSelect
                  id="sourceInterface"
                  value={draft.source_interface}
                  onValueChange={(source_interface) => update({ source_interface })}
                  filter={(iface) => iface.type === SOURCE_INTERFACE_TYPE}
                  placeholder={t("modal.basic.sourceInterfacePlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{tc("description")}</Label>
              <Input
                id="description"
                value={draft.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder={t("modal.basic.descriptionPlaceholder")}
                maxLength={DESCRIPTION_MAX}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {numberField("mtu", "MTU", draft.mtu, (mtu) => update({ mtu }), MTU_RANGE, t("modal.basic.mtuPlaceholder"))}
              <div className="space-y-2">
                <Label htmlFor="vrf" className="text-xs">VRF</Label>
                <VrfSelect id="vrf" value={draft.vrf} onValueChange={(vrf) => update({ vrf })} />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="disabled" checked={draft.disabled} onCheckedChange={(checked) => update({ disabled: checked === true })} />
              <Label htmlFor="disabled" className="text-sm font-normal">{t("modal.basic.disableInterface")}</Label>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cipher" className="text-xs">{t("modal.security.cipherSuite")}</Label>
                <Select value={draft.cipher} onValueChange={(cipher) => update({ cipher })}>
                  <SelectTrigger id="cipher" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ciphers.map((cipher) => (
                      <SelectItem key={cipher} value={cipher} className="font-mono">{cipher}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {numberField(
                "replayWindow",
                t("modal.security.replayWindow"),
                draft.replay_window,
                (replay_window) => update({ replay_window }),
                REPLAY_WINDOW_RANGE,
                t("modal.security.replayWindowPlaceholder"),
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="encrypt" checked={draft.encrypt} onCheckedChange={(checked) => update({ encrypt: checked === true })} />
              <Label htmlFor="encrypt" className="text-sm font-normal">{t("modal.security.enableEncryption")}</Label>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="securityMode">{t("modal.security.securityMode")}</Label>
              <Select value={draft.mode} onValueChange={(v) => update({ mode: v as MacsecMode })}>
                <SelectTrigger id="securityMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mka">{t("modal.security.modeMka")}</SelectItem>
                  <SelectItem value="static">{t("modal.security.modeStatic")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {draft.mode === "mka" ? (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-medium">{t("modal.security.mkaTitle")}</h4>
                <div className="space-y-2">
                  <Label htmlFor="cak">{t("modal.security.cak")}</Label>
                  <Input
                    id="cak"
                    type="password"
                    autoComplete="new-password"
                    value={draft.mka_cak}
                    onChange={(e) => update({ mka_cak: e.target.value })}
                    placeholder={keyPlaceholder}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ckn">{t("modal.security.ckn")}</Label>
                  <Input
                    id="ckn"
                    value={draft.mka_ckn}
                    onChange={(e) => update({ mka_ckn: e.target.value })}
                    placeholder={t("modal.security.cknPlaceholder")}
                    className="font-mono"
                  />
                </div>
                {numberField(
                  "priority",
                  t("modal.security.mkaPriority"),
                  draft.mka_priority,
                  (mka_priority) => update({ mka_priority }),
                  MKA_PRIORITY_RANGE,
                  t("modal.security.mkaPriorityPlaceholder"),
                )}
              </div>
            ) : (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-medium">{t("modal.security.staticTitle")}</h4>
                <div className="space-y-2">
                  <Label htmlFor="staticKey">{t("modal.security.localKey")}</Label>
                  <Input
                    id="staticKey"
                    type="password"
                    autoComplete="new-password"
                    value={draft.static_key}
                    onChange={(e) => update({ static_key: e.target.value })}
                    placeholder={keyPlaceholder}
                    className="font-mono"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{t("modal.security.staticPeers")}</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addPeer}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> {t("modal.security.addPeer")}
                  </Button>
                </div>

                {draft.peers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">{t("modal.security.noPeers")}</p>
                )}

                {draft.peers.map((peer, index) => (
                  <div key={index} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t("modal.security.peerLabel", { n: String(index + 1) })}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removePeer(index)}
                        aria-label={tc("delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor={`peerName${index}`} className="text-xs">{tc("name")}</Label>
                        <Input
                          id={`peerName${index}`}
                          value={peer.name}
                          onChange={(e) => updatePeer(index, { name: e.target.value })}
                          maxLength={PEER_NAME_MAX}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`peerKey${index}`} className="text-xs">{t("modal.security.peerKey")}</Label>
                        <Input
                          id={`peerKey${index}`}
                          type="password"
                          autoComplete="new-password"
                          value={peer.key}
                          onChange={(e) => updatePeer(index, { key: e.target.value })}
                          placeholder={t("modal.security.peerKeyPlaceholder")}
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`peerMac${index}`} className="text-xs">{t("modal.security.macAddress")}</Label>
                        <Input
                          id={`peerMac${index}`}
                          value={peer.mac}
                          onChange={(e) => updatePeer(index, { mac: e.target.value })}
                          placeholder="00:11:22:33:44:55"
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                    </div>
                    {checkField(`peerDisable${index}`, t("modal.security.disablePeer"), peer.disable, (disable) => updatePeer(index, { disable }))}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <MultiValueInput
              label={t("modal.addresses.ipAddresses")}
              values={draft.addresses}
              onChange={(addresses) => update({ addresses })}
              placeholder="10.0.0.1/24"
            />

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox id="useDhcp" checked={draft.dhcp} onCheckedChange={(checked) => update(checked === true ? { dhcp: true } : { dhcp: false, dhcp_options: emptyMacsecDhcp() })} />
                <Label htmlFor="useDhcp" className="text-sm font-normal">{t("modal.addresses.enableDhcp")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="useDhcpv6" checked={draft.dhcpv6} onCheckedChange={(checked) => update(checked === true ? { dhcpv6: true } : { dhcpv6: false, dhcpv6_options: emptyMacsecDhcpv6() })} />
                <Label htmlFor="useDhcpv6" className="text-sm font-normal">{t("modal.addresses.enableDhcpv6")}</Label>
              </div>
            </div>

            {draft.dhcp && (
              <>
                <Separator />
                <h4 className="text-sm font-medium">{t("modal.addresses.dhcpOptions")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dhcpClientId" className="text-xs">{t("modal.addresses.clientId")}</Label>
                    <Input id="dhcpClientId" value={draft.dhcp_options.client_id} onChange={(e) => updateDhcp({ client_id: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dhcpHostName" className="text-xs">{t("modal.addresses.hostName")}</Label>
                    <Input id="dhcpHostName" value={draft.dhcp_options.host_name} onChange={(e) => updateDhcp({ host_name: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dhcpVendorClassId" className="text-xs">{t("modal.addresses.vendorClassId")}</Label>
                    <Input id="dhcpVendorClassId" value={draft.dhcp_options.vendor_class_id} onChange={(e) => updateDhcp({ vendor_class_id: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dhcpUserClass" className="text-xs">{t("modal.addresses.userClass")}</Label>
                    <Input id="dhcpUserClass" value={draft.dhcp_options.user_class} onChange={(e) => updateDhcp({ user_class: e.target.value })} className="h-8 text-sm" />
                  </div>
                  {numberField(
                    "dhcpDefaultRouteDistance",
                    t("modal.addresses.defaultRouteDistance"),
                    draft.dhcp_options.default_route_distance,
                    (default_route_distance) => updateDhcp({ default_route_distance }),
                    DEFAULT_ROUTE_DISTANCE_RANGE,
                  )}
                </div>
                <MultiValueInput
                  label={t("modal.addresses.reject")}
                  values={draft.dhcp_options.reject}
                  onChange={(reject) => updateDhcp({ reject })}
                  placeholder="192.0.2.1"
                />
                <div className="flex gap-6">
                  {checkField("dhcpNoDefaultRoute", t("modal.addresses.noDefaultRoute"), draft.dhcp_options.no_default_route, (no_default_route) => updateDhcp({ no_default_route }))}
                  {checkField("dhcpMtu", t("modal.addresses.requestMtu"), draft.dhcp_options.mtu, (mtu) => updateDhcp({ mtu }))}
                </div>
              </>
            )}

            {draft.dhcpv6 && (
              <>
                <Separator />
                <h4 className="text-sm font-medium">{t("modal.addresses.dhcpv6Options")}</h4>
                <div className="space-y-2">
                  <Label htmlFor="dhcpv6Duid" className="text-xs">{t("modal.addresses.duid")}</Label>
                  <Input
                    id="dhcpv6Duid"
                    value={draft.dhcpv6_options.duid}
                    onChange={(e) => updateDhcpv6({ duid: e.target.value })}
                    placeholder="00:01:00:01"
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {checkField("dhcpv6RapidCommit", t("modal.addresses.rapidCommit"), draft.dhcpv6_options.rapid_commit, (rapid_commit) => updateDhcpv6({ rapid_commit }))}
                  {checkField("dhcpv6NoRelease", t("modal.addresses.noRelease"), draft.dhcpv6_options.no_release, (no_release) => updateDhcpv6({ no_release }))}
                  {checkField("dhcpv6ParametersOnly", t("modal.addresses.parametersOnly"), draft.dhcpv6_options.parameters_only, (parameters_only) => updateDhcpv6({ parameters_only }))}
                  {checkField("dhcpv6Temporary", t("modal.addresses.temporary"), draft.dhcpv6_options.temporary, (temporary) => updateDhcpv6({ temporary }))}
                  {hasNoRequestDns &&
                    checkField("dhcpv6NoRequestDns", t("modal.addresses.noRequestDns"), draft.dhcpv6_options.no_request_dns, (no_request_dns) => updateDhcpv6({ no_request_dns }))}
                  {hasNoRequestDomainName &&
                    checkField(
                      "dhcpv6NoRequestDomainName",
                      t("modal.addresses.noRequestDomainName"),
                      draft.dhcpv6_options.no_request_domain_name,
                      (no_request_domain_name) => updateDhcpv6({ no_request_domain_name }),
                    )}
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{t("modal.addresses.prefixDelegation")}</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addPd}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> {t("modal.addresses.addPd")}
                  </Button>
                </div>
                {pdRows.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">{t("modal.addresses.noPd")}</p>
                )}
                {pdRows.map((pd, index) => (
                  <div key={index} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-end gap-2">
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        {numberField(`pdId${index}`, t("modal.addresses.pdId"), pd.id, (id) => updatePd(index, { id }), PD_ID_RANGE)}
                        {numberField(`pdLength${index}`, t("modal.addresses.pdLength"), pd.length, (length) => updatePd(index, { length }), PD_LENGTH_RANGE)}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removePd(index)}
                        aria-label={tc("delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {pd.interfaces.map((iface, row) => (
                      <div key={row} className="flex items-end gap-2">
                        <div className="grid grid-cols-3 gap-2 flex-1">
                          <div className="space-y-2">
                            <Label htmlFor={`pdInterface${index}-${row}`} className="text-xs">{t("modal.addresses.pdInterface")}</Label>
                            <InterfaceSelect
                              id={`pdInterface${index}-${row}`}
                              value={iface.name}
                              onValueChange={(name) => updatePdInterface(index, row, { name })}
                              className="h-8 text-sm"
                            />
                          </div>
                          {numberField(
                            `pdAddress${index}-${row}`,
                            t("modal.addresses.pdAddress"),
                            iface.address,
                            (address) => updatePdInterface(index, row, { address }),
                            PD_ADDRESS_RANGE,
                          )}
                          {numberField(
                            `pdSlaId${index}-${row}`,
                            t("modal.addresses.slaId"),
                            iface.sla_id,
                            (sla_id) => updatePdInterface(index, row, { sla_id }),
                            PD_SLA_ID_RANGE,
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removePdInterface(index, row)}
                          aria-label={tc("delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addPdInterface(index)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> {tc("addInterface")}
                    </Button>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <h4 className="text-sm font-medium">{t("modal.advanced.ipv4Settings")}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipAdjustMss" className="text-xs">{t("modal.advanced.adjustMss")}</Label>
                <Input
                  id="ipAdjustMss"
                  value={draft.ip.adjust_mss}
                  onChange={(e) => updateIp({ adjust_mss: e.target.value })}
                  placeholder={t("modal.advanced.adjustMssPlaceholder")}
                  className="h-8 text-sm"
                />
              </div>
              {numberField(
                "ipArpCacheTimeout",
                t("modal.advanced.arpCacheTimeout"),
                draft.ip.arp_cache_timeout,
                (arp_cache_timeout) => updateIp({ arp_cache_timeout }),
                ARP_CACHE_TIMEOUT_RANGE,
              )}
              <div className="space-y-2">
                <Label htmlFor="ipSourceValidation" className="text-xs">{t("modal.advanced.sourceValidation")}</Label>
                <NamedListSelect
                  id="ipSourceValidation"
                  value={draft.ip.source_validation}
                  names={sourceValidation}
                  labels={sourceValidationLabels}
                  onValueChange={(source_validation) => updateIp({ source_validation })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {checkField("ipDisableArpFilter", t("modal.advanced.disableArpFilter"), draft.ip.disable_arp_filter, (disable_arp_filter) => updateIp({ disable_arp_filter }))}
              {checkField("ipDisableForwarding", t("modal.advanced.disableForwarding"), draft.ip.disable_forwarding, (disable_forwarding) => updateIp({ disable_forwarding }))}
              {checkField("ipEnableArpAccept", t("modal.advanced.enableArpAccept"), draft.ip.enable_arp_accept, (enable_arp_accept) => updateIp({ enable_arp_accept }))}
              {checkField("ipEnableArpAnnounce", t("modal.advanced.enableArpAnnounce"), draft.ip.enable_arp_announce, (enable_arp_announce) => updateIp({ enable_arp_announce }))}
              {checkField("ipEnableArpIgnore", t("modal.advanced.enableArpIgnore"), draft.ip.enable_arp_ignore, (enable_arp_ignore) => updateIp({ enable_arp_ignore }))}
              {checkField("ipEnableDirectedBroadcast", t("modal.advanced.enableDirectedBroadcast"), draft.ip.enable_directed_broadcast, (enable_directed_broadcast) => updateIp({ enable_directed_broadcast }))}
              {checkField("ipEnableProxyArp", t("modal.advanced.enableProxyArp"), draft.ip.enable_proxy_arp, (enable_proxy_arp) => updateIp({ enable_proxy_arp }))}
              {checkField("ipProxyArpPvlan", t("modal.advanced.proxyArpPvlan"), draft.ip.proxy_arp_pvlan, (proxy_arp_pvlan) => updateIp({ proxy_arp_pvlan }))}
            </div>

            <Separator />

            <h4 className="text-sm font-medium">{t("modal.advanced.ipv6Settings")}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ipv6AcceptDad" className="text-xs">{t("modal.advanced.acceptDad")}</Label>
                <NamedListSelect
                  id="ipv6AcceptDad"
                  value={draft.ipv6.accept_dad}
                  names={ACCEPT_DAD_VALUES}
                  noneLabel={tc("default")}
                  onValueChange={(accept_dad) => updateIpv6({ accept_dad })}
                />
              </div>
              {numberField(
                "ipv6DupAddrDetect",
                t("modal.advanced.dadTransmits"),
                draft.ipv6.dup_addr_detect_transmits,
                (dup_addr_detect_transmits) => updateIpv6({ dup_addr_detect_transmits }),
                DAD_TRANSMITS_RANGE,
              )}
              {hasInterfaceIdentifier && (
                <div className="space-y-2">
                  <Label htmlFor="ipv6InterfaceIdentifier" className="text-xs">{t("modal.advanced.interfaceIdentifier")}</Label>
                  <Input
                    id="ipv6InterfaceIdentifier"
                    value={draft.ipv6.address_interface_identifier}
                    onChange={(e) => updateIpv6({ address_interface_identifier: e.target.value })}
                    placeholder="::1"
                    className="h-8 text-sm font-mono"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="ipv6AdjustMss" className="text-xs">{t("modal.advanced.adjustMss")}</Label>
                <Input
                  id="ipv6AdjustMss"
                  value={draft.ipv6.adjust_mss}
                  onChange={(e) => updateIpv6({ adjust_mss: e.target.value })}
                  placeholder={t("modal.advanced.adjustMssPlaceholder")}
                  className="h-8 text-sm"
                />
              </div>
              {numberField(
                "ipv6BaseReachableTime",
                t("modal.advanced.baseReachableTime"),
                draft.ipv6.base_reachable_time,
                (base_reachable_time) => updateIpv6({ base_reachable_time }),
                BASE_REACHABLE_TIME_RANGE,
              )}
              <div className="space-y-2">
                <Label htmlFor="ipv6SourceValidation" className="text-xs">{t("modal.advanced.sourceValidation")}</Label>
                <NamedListSelect
                  id="ipv6SourceValidation"
                  value={draft.ipv6.source_validation}
                  names={sourceValidation}
                  labels={sourceValidationLabels}
                  onValueChange={(source_validation) => updateIpv6({ source_validation })}
                />
              </div>
            </div>
            <MultiValueInput
              label={t("modal.advanced.eui64Prefix")}
              values={draft.ipv6.address_eui64}
              onChange={(address_eui64) => updateIpv6({ address_eui64 })}
              placeholder="2001:db8::/64"
            />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {checkField("ipv6AddressAutoconf", t("modal.advanced.addressAutoconf"), draft.ipv6.address_autoconf, (address_autoconf) => updateIpv6({ address_autoconf }))}
              {checkField("ipv6NoDefaultLinkLocal", t("modal.advanced.noDefaultLinkLocal"), draft.ipv6.address_no_default_link_local, (address_no_default_link_local) => updateIpv6({ address_no_default_link_local }))}
              {checkField("ipv6DisableForwarding", t("modal.advanced.disableForwarding"), draft.ipv6.disable_forwarding, (disable_forwarding) => updateIpv6({ disable_forwarding }))}
            </div>

            <Separator />

            <h4 className="text-sm font-medium">{t("modal.advanced.mirrorRedirect")}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mirrorIngress" className="text-xs">{t("modal.advanced.mirrorIngress")}</Label>
                <InterfaceSelect id="mirrorIngress" value={draft.mirror_ingress} onValueChange={(mirror_ingress) => update({ mirror_ingress })} noneOption={none} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mirrorEgress" className="text-xs">{t("modal.advanced.mirrorEgress")}</Label>
                <InterfaceSelect id="mirrorEgress" value={draft.mirror_egress} onValueChange={(mirror_egress) => update({ mirror_egress })} noneOption={none} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redirect" className="text-xs">{t("modal.advanced.redirect")}</Label>
                <InterfaceSelect id="redirect" value={draft.redirect} onValueChange={(redirect) => update({ redirect })} noneOption={none} className="h-8 text-sm" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? tc("saving") : tc("creating")}
              </>
            ) : isEdit ? (
              tc("saveChanges")
            ) : (
              t("modal.createInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
