"use client";

import { useEffect, useState } from "react";
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
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  pppoeService,
  type PppoeCapabilities,
  type PppoeCreateConfig,
  type PppoeInterface,
  type PppoePdInstanceInput,
  type PppoePdInterfaceInput,
} from "@/lib/api/pppoe";
import { ApiError } from "@/lib/types/api";
import {
  pppoeLockedName,
  pppoeModalIsEdit,
  pppoeWriteKind,
} from "./pppoe-modal-mode";

interface PppoeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: PppoeCapabilities | null;
  existingInterfaces: string[];
  availableEthernet?: string[];
  existing?: PppoeInterface | null;
}

interface PdInstanceForm {
  instance: string;
  length: string;
  interfaces: PppoePdInterfaceInput[];
}

const SOURCE_VALIDATION_OPTIONS = [
  { value: "strict" },
  { value: "loose" },
  { value: "disable" },
] as const;

const PPPOE_NAME_RE = /^pppoe[0-9]+$/;

export function PppoeModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
  availableEthernet,
  existing,
}: PppoeModalProps) {
  const t = useTranslations("pppoe");
  const tc = useTranslations("common");
  const isEdit = pppoeModalIsEdit(existing);
  const feat = (key: string) =>
    capabilities?.features?.[key]?.supported ?? false;

  // Basic
  const [name, setName] = useState("pppoe0");
  const [description, setDescription] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [sourceInterface, setSourceInterface] = useState("");
  const [accessConcentrator, setAccessConcentrator] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [vrf, setVrf] = useState("");
  const [redirect, setRedirect] = useState("");

  // PPP
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mtu, setMtu] = useState("");
  const [mru, setMru] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [remoteAddress, setRemoteAddress] = useState("");
  const [holdoff, setHoldoff] = useState("");
  const [idleTimeout, setIdleTimeout] = useState("");
  const [hostUniq, setHostUniq] = useState("");

  // Routing
  const [connectOnDemand, setConnectOnDemand] = useState(false);
  const [noDefaultRoute, setNoDefaultRoute] = useState(false);
  const [defaultRouteDistance, setDefaultRouteDistance] = useState("");
  const [noPeerDns, setNoPeerDns] = useState(false);

  // IP
  const [ipAdjustMss, setIpAdjustMss] = useState("");
  const [ipAdjustMssClamp, setIpAdjustMssClamp] = useState(false);
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipSourceValidation, setIpSourceValidation] = useState("");

  // IPv6
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressDhcpv6, setIpv6AddressDhcpv6] = useState(false);
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6AdjustMssClamp, setIpv6AdjustMssClamp] = useState(false);
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6InterfaceIdentifier, setIpv6InterfaceIdentifier] = useState("");

  // DHCPv6
  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6NoRequestDns, setDhcpv6NoRequestDns] = useState(false);
  const [dhcpv6NoRequestDomainName, setDhcpv6NoRequestDomainName] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);
  const [pdInstances, setPdInstances] = useState<PdInstanceForm[]>([]);

  // Mirror
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("pppoe0");
    setDescription("");
    setDisabled(false);
    setSourceInterface("");
    setAccessConcentrator("");
    setServiceName("");
    setVrf("");
    setRedirect("");
    setUsername("");
    setPassword("");
    setMtu("");
    setMru("");
    setLocalAddress("");
    setRemoteAddress("");
    setHoldoff("");
    setIdleTimeout("");
    setHostUniq("");
    setConnectOnDemand(false);
    setNoDefaultRoute(false);
    setDefaultRouteDistance("");
    setNoPeerDns(false);
    setIpAdjustMss("");
    setIpAdjustMssClamp(false);
    setIpDisableForwarding(false);
    setIpSourceValidation("");
    setIpv6AddressAutoconf(false);
    setIpv6AddressDhcpv6(false);
    setIpv6AdjustMss("");
    setIpv6AdjustMssClamp(false);
    setIpv6DisableForwarding(false);
    setIpv6InterfaceIdentifier("");
    setDhcpv6Duid("");
    setDhcpv6NoRelease(false);
    setDhcpv6NoRequestDns(false);
    setDhcpv6NoRequestDomainName(false);
    setDhcpv6ParametersOnly(false);
    setDhcpv6RapidCommit(false);
    setDhcpv6Temporary(false);
    setPdInstances([]);
    setMirrorIngress("");
    setMirrorEgress("");
    setError(null);
  };

  const populateForm = (interfaceData: PppoeInterface) => {
    setName(interfaceData.name);
    setDescription(interfaceData.description ?? "");
    setDisabled(!!interfaceData.disabled);
    setSourceInterface(interfaceData.source_interface ?? "");
    setAccessConcentrator(interfaceData.access_concentrator ?? "");
    setServiceName(interfaceData.service_name ?? "");
    setVrf(interfaceData.vrf ?? "");
    setRedirect(interfaceData.redirect ?? "");

    setUsername(interfaceData.authentication?.username ?? "");
    setPassword(interfaceData.authentication?.password ?? "");
    setMtu(interfaceData.mtu ?? "");
    setMru(interfaceData.mru ?? "");
    setLocalAddress(interfaceData.local_address ?? "");
    setRemoteAddress(interfaceData.remote_address ?? "");
    setHoldoff(interfaceData.holdoff ?? "");
    setIdleTimeout(interfaceData.idle_timeout ?? "");
    setHostUniq(interfaceData.host_uniq ?? "");

    setConnectOnDemand(!!interfaceData.connect_on_demand);
    setNoDefaultRoute(!!interfaceData.no_default_route);
    setDefaultRouteDistance(interfaceData.default_route_distance ?? "");
    setNoPeerDns(!!interfaceData.no_peer_dns);

    const ip = interfaceData.ip;
    setIpAdjustMss(
      ip?.adjust_mss && ip.adjust_mss !== "clamp-mss-to-pmtu" ? ip.adjust_mss : "",
    );
    setIpAdjustMssClamp(ip?.adjust_mss === "clamp-mss-to-pmtu");
    setIpDisableForwarding(!!ip?.disable_forwarding);
    setIpSourceValidation(ip?.source_validation ?? "");

    const ipv6 = interfaceData.ipv6;
    setIpv6AddressAutoconf(!!ipv6?.address_autoconf);
    setIpv6AddressDhcpv6(interfaceData.addresses?.includes("dhcpv6") ?? false);
    setIpv6AdjustMss(
      ipv6?.adjust_mss && ipv6.adjust_mss !== "clamp-mss-to-pmtu"
        ? ipv6.adjust_mss
        : "",
    );
    setIpv6AdjustMssClamp(ipv6?.adjust_mss === "clamp-mss-to-pmtu");
    setIpv6DisableForwarding(!!ipv6?.disable_forwarding);
    setIpv6InterfaceIdentifier(ipv6?.address_interface_identifier ?? "");

    const d6 = interfaceData.dhcpv6_options;
    setDhcpv6Duid(d6?.duid ?? "");
    setDhcpv6NoRelease(!!d6?.no_release);
    setDhcpv6NoRequestDns(!!d6?.no_request_dns);
    setDhcpv6NoRequestDomainName(!!d6?.no_request_domain_name);
    setDhcpv6ParametersOnly(!!d6?.parameters_only);
    setDhcpv6RapidCommit(!!d6?.rapid_commit);
    setDhcpv6Temporary(!!d6?.temporary);
    setPdInstances(
      (d6?.pd ?? []).map((pd) => ({
        instance: pd.instance,
        length: pd.length ?? "",
        interfaces: (pd.interfaces ?? []).map((di) => ({
          name: di.name,
          address: di.address ?? "",
          sla_id: di.sla_id ?? "",
        })),
      })),
    );

    setMirrorIngress(interfaceData.mirror_ingress ?? "");
    setMirrorEgress(interfaceData.mirror_egress ?? "");

    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
  }, [open, existing]);

  const addPdInstance = () => {
    setPdInstances((prev) => [
      ...prev,
      { instance: String(prev.length + 1), length: "", interfaces: [] },
    ]);
  };

  const removePdInstance = (index: number) => {
    setPdInstances((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePdInstance = (index: number, patch: Partial<PdInstanceForm>) => {
    setPdInstances((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addPdDelegatedIface = (instanceIdx: number) => {
    setPdInstances((prev) =>
      prev.map((row, i) =>
        i === instanceIdx
          ? {
              ...row,
              interfaces: [...row.interfaces, { name: "", address: "", sla_id: "" }],
            }
          : row,
      ),
    );
  };

  const removePdDelegatedIface = (instanceIdx: number, ifaceIdx: number) => {
    setPdInstances((prev) =>
      prev.map((row, i) =>
        i === instanceIdx
          ? {
              ...row,
              interfaces: row.interfaces.filter((_, j) => j !== ifaceIdx),
            }
          : row,
      ),
    );
  };

  const updatePdDelegatedIface = (
    instanceIdx: number,
    ifaceIdx: number,
    patch: Partial<PppoePdInterfaceInput>,
  ) => {
    setPdInstances((prev) =>
      prev.map((row, i) =>
        i === instanceIdx
          ? {
              ...row,
              interfaces: row.interfaces.map((iface, j) =>
                j === ifaceIdx ? { ...iface, ...patch } : iface,
              ),
            }
          : row,
      ),
    );
  };

  const validateShared = (): string | null => {
    if (mtu) {
      const n = Number(mtu);
      if (!Number.isInteger(n) || n < 68 || n > 1500) {
        return t("validation.mtuRange");
      }
    }
    if (mru) {
      const n = Number(mru);
      if (!Number.isInteger(n) || n < 128 || n > 16384) {
        return t("validation.mruRange");
      }
    }
    if (defaultRouteDistance) {
      const n = Number(defaultRouteDistance);
      if (!Number.isInteger(n) || n < 1 || n > 255) {
        return t("validation.defaultRouteDistanceRange");
      }
    }
    for (const pd of pdInstances) {
      if (!pd.instance.trim()) {
        return t("validation.pdInstanceRequired");
      }
      if (pd.length) {
        const n = Number(pd.length);
        if (!Number.isInteger(n) || n < 32 || n > 64) {
          return t("validation.pdLengthRange");
        }
      }
      for (const di of pd.interfaces) {
        if (!di.name?.trim()) {
          return t("validation.delegatedNameRequired");
        }
      }
    }
    return null;
  };

  const validateCreate = (): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return t("validation.nameRequired");
    if (!PPPOE_NAME_RE.test(trimmed)) {
      return t("validation.namePattern");
    }
    if (existingInterfaces.includes(trimmed)) {
      return t("validation.nameExists", { name: trimmed });
    }
    return validateShared();
  };

  const buildConfig = (): PppoeCreateConfig => {
    const pd: PppoePdInstanceInput[] = pdInstances.map((row) => ({
      instance: row.instance.trim(),
      length: row.length || undefined,
      interfaces: row.interfaces
        .filter((di) => di.name?.trim())
        .map((di) => ({
          name: di.name.trim(),
          address: di.address?.trim() || undefined,
          sla_id: di.sla_id?.trim() || undefined,
        })),
    }));

    const auth =
      username.trim() || password
        ? { username: username.trim() || undefined, password: password || undefined }
        : undefined;

    const hasDhcpv6 =
      dhcpv6Duid.trim() ||
      dhcpv6NoRelease ||
      dhcpv6NoRequestDns ||
      dhcpv6NoRequestDomainName ||
      dhcpv6ParametersOnly ||
      dhcpv6RapidCommit ||
      dhcpv6Temporary ||
      pd.length > 0;

    const hasIp =
      ipAdjustMss.trim() ||
      ipAdjustMssClamp ||
      ipDisableForwarding ||
      !!ipSourceValidation;

    const hasIpv6 =
      ipv6AddressAutoconf ||
      ipv6AddressDhcpv6 ||
      ipv6AdjustMss.trim() ||
      ipv6AdjustMssClamp ||
      ipv6DisableForwarding ||
      ipv6InterfaceIdentifier.trim();

    return {
      name: name.trim(),
      description: description.trim() || undefined,
      disabled: disabled || undefined,
      source_interface: sourceInterface || undefined,
      access_concentrator: accessConcentrator.trim() || undefined,
      service_name: serviceName.trim() || undefined,
      vrf: vrf.trim() || undefined,
      redirect: redirect.trim() || undefined,
      connect_on_demand: connectOnDemand || undefined,
      default_route_distance: defaultRouteDistance.trim() || undefined,
      no_default_route: noDefaultRoute || undefined,
      no_peer_dns: noPeerDns || undefined,
      holdoff: holdoff.trim() || undefined,
      idle_timeout: idleTimeout.trim() || undefined,
      host_uniq: hostUniq.trim() || undefined,
      mtu: mtu.trim() || undefined,
      mru: mru.trim() || undefined,
      local_address: localAddress.trim() || undefined,
      remote_address: remoteAddress.trim() || undefined,
      authentication: auth,
      dhcpv6_options: hasDhcpv6
        ? {
            duid: dhcpv6Duid.trim() || undefined,
            no_release: dhcpv6NoRelease || undefined,
            no_request_dns: dhcpv6NoRequestDns || undefined,
            no_request_domain_name: dhcpv6NoRequestDomainName || undefined,
            parameters_only: dhcpv6ParametersOnly || undefined,
            rapid_commit: dhcpv6RapidCommit || undefined,
            temporary: dhcpv6Temporary || undefined,
            pd: pd.length > 0 ? pd : undefined,
          }
        : undefined,
      ip: hasIp
        ? {
            adjust_mss: ipAdjustMssClamp ? undefined : ipAdjustMss.trim() || undefined,
            adjust_mss_clamp_to_pmtu: ipAdjustMssClamp || undefined,
            disable_forwarding: ipDisableForwarding || undefined,
            source_validation: ipSourceValidation || undefined,
          }
        : undefined,
      ipv6: hasIpv6
        ? {
            address_autoconf: ipv6AddressAutoconf || undefined,
            address_dhcpv6: ipv6AddressDhcpv6 || undefined,
            adjust_mss: ipv6AdjustMssClamp ? undefined : ipv6AdjustMss.trim() || undefined,
            adjust_mss_clamp_to_pmtu: ipv6AdjustMssClamp || undefined,
            disable_forwarding: ipv6DisableForwarding || undefined,
            address_interface_identifier: ipv6InterfaceIdentifier.trim() || undefined,
          }
        : undefined,
      mirror_ingress: mirrorIngress || undefined,
      mirror_egress: mirrorEgress || undefined,
    };
  };

  const buildUpdate = (): Partial<PppoeCreateConfig> => {
    const pd: PppoePdInstanceInput[] = pdInstances.map((row) => ({
      instance: row.instance.trim(),
      length: row.length || undefined,
      interfaces: row.interfaces
        .filter((di) => di.name?.trim())
        .map((di) => ({
          name: di.name.trim(),
          address: di.address?.trim() || undefined,
          sla_id: di.sla_id?.trim() || undefined,
        })),
    }));

    return {
      description,
      disabled,
      source_interface: sourceInterface,
      access_concentrator: accessConcentrator,
      service_name: serviceName,
      vrf,
      redirect,
      connect_on_demand: connectOnDemand,
      default_route_distance: defaultRouteDistance,
      no_default_route: noDefaultRoute,
      no_peer_dns: noPeerDns,
      holdoff,
      idle_timeout: idleTimeout,
      host_uniq: hostUniq,
      mtu,
      mru,
      local_address: localAddress,
      remote_address: remoteAddress,
      authentication: { username, password },
      dhcpv6_options: {
        duid: dhcpv6Duid,
        no_release: dhcpv6NoRelease,
        no_request_dns: dhcpv6NoRequestDns,
        no_request_domain_name: dhcpv6NoRequestDomainName,
        parameters_only: dhcpv6ParametersOnly,
        rapid_commit: dhcpv6RapidCommit,
        temporary: dhcpv6Temporary,
        pd,
      },
      ip: {
        adjust_mss: ipAdjustMssClamp ? undefined : ipAdjustMss,
        adjust_mss_clamp_to_pmtu: ipAdjustMssClamp,
        disable_forwarding: ipDisableForwarding,
        source_validation: ipSourceValidation,
      },
      ipv6: {
        address_autoconf: ipv6AddressAutoconf,
        address_dhcpv6: ipv6AddressDhcpv6,
        adjust_mss: ipv6AdjustMssClamp ? undefined : ipv6AdjustMss,
        adjust_mss_clamp_to_pmtu: ipv6AdjustMssClamp,
        disable_forwarding: ipv6DisableForwarding,
        address_interface_identifier: ipv6InterfaceIdentifier,
      },
      mirror_ingress: mirrorIngress,
      mirror_egress: mirrorEgress,
    };
  };

  const handleSubmit = async () => {
    const write = pppoeWriteKind(existing);
    if (write.kind === "update") {
      if (!existing) return;
      const clientError = validateShared();
      if (clientError) {
        setError(clientError);
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const result = await pppoeService.updateInterface(
          write.name,
          existing,
          buildUpdate(),
        );
        if (result.success) {
          onOpenChange(false);
          onSuccess();
        } else {
          setError(result.error || t("modal.updateFailed"));
        }
      } catch (err) {
        setError((err as ApiError).message || t("modal.updateFailed"));
      } finally {
        setLoading(false);
      }
      return;
    }

    const clientError = validateCreate();
    if (clientError) {
      setError(clientError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await pppoeService.createInterface(buildConfig());
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("modal.createFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("modal.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  const sourceOptions = availableEthernet ?? [];
  const lockedName = pppoeLockedName(existing, name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("modal.editTitle") : t("modal.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? (
              <>
                {t("modal.editing")}{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
                  {existing.name}
                </code>
              </>
            ) : (
              t("modal.createDescription")
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="basic">{t("tabs.basic")}</TabsTrigger>
            <TabsTrigger value="ppp">PPP</TabsTrigger>
            <TabsTrigger value="routing">{t("tabs.routing")}</TabsTrigger>
            <TabsTrigger value="ip">IP</TabsTrigger>
            <TabsTrigger value="ipv6">IPv6</TabsTrigger>
            <TabsTrigger value="dhcpv6">DHCPv6</TabsTrigger>
            <TabsTrigger value="mirror">{t("tabs.mirror")}</TabsTrigger>
          </TabsList>

          {/* Basic */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pppoe-name">
                  {t("basic.interfaceName")} {isEdit ? null : "*"}
                </Label>
                <Input
                  id="pppoe-name"
                  value={lockedName.value}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="pppoe0"
                  disabled={lockedName.disabled}
                />
                {isEdit ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("basic.nameLocked")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("basic.namePatternHint")}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="pppoe-desc">{tc("description")}</Label>
                <Input
                  id="pppoe-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("basic.descriptionPlaceholder")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pppoe-source">{t("basic.sourceInterface")} {isEdit ? null : "*"}</Label>
              <InterfaceSelect
                value={sourceInterface || "__none__"}
                onValueChange={(v) => setSourceInterface(v === "__none__" ? "" : v)}
                id="pppoe-source"
                interfaces={sourceOptions.map((n) => ({ name: n, type: "", description: null }))}
                noneOption={{ label: tc("none"), value: "__none__" }}
                placeholder={t("basic.sourcePlaceholder")}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("basic.sourceHint")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pppoe-ac">{t("basic.accessConcentrator")}</Label>
                <Input
                  id="pppoe-ac"
                  value={accessConcentrator}
                  onChange={(e) => setAccessConcentrator(e.target.value)}
                  placeholder={t("basic.accessConcentratorPlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="pppoe-service">{t("basic.serviceName")}</Label>
                <Input
                  id="pppoe-service"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder={t("basic.serviceNamePlaceholder")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pppoe-vrf">VRF</Label>
                <VrfSelect
                  id="pppoe-vrf"
                  value={vrf}
                  onValueChange={setVrf}
                />
              </div>
              <div>
                <Label htmlFor="pppoe-redirect">{t("basic.redirectInterface")}</Label>
                <Input
                  id="pppoe-redirect"
                  value={redirect}
                  onChange={(e) => setRedirect(e.target.value)}
                  placeholder={t("basic.redirectPlaceholder")}
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <Checkbox
                checked={disabled}
                onCheckedChange={(v) => setDisabled(!!v)}
              />
              <span>{t("basic.disableInterface")}</span>
            </label>
          </TabsContent>

          {/* PPP */}
          <TabsContent value="ppp" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pppoe-user">{t("ppp.username")}</Label>
                <Input
                  id="pppoe-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="pppoe-pass">{t("ppp.password")}</Label>
                <Input
                  id="pppoe-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pppoe-mtu">MTU</Label>
                <Input
                  id="pppoe-mtu"
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  placeholder="68-1500"
                />
              </div>
              <div>
                <Label htmlFor="pppoe-mru">MRU</Label>
                <Input
                  id="pppoe-mru"
                  value={mru}
                  onChange={(e) => setMru(e.target.value)}
                  placeholder="128-16384"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pppoe-local">{t("ppp.localAddress")}</Label>
                <Input
                  id="pppoe-local"
                  value={localAddress}
                  onChange={(e) => setLocalAddress(e.target.value)}
                  placeholder={t("ppp.examplePlaceholder", { value: "10.0.0.1" })}
                />
              </div>
              <div>
                <Label htmlFor="pppoe-remote">{t("ppp.remoteAddress")}</Label>
                <Input
                  id="pppoe-remote"
                  value={remoteAddress}
                  onChange={(e) => setRemoteAddress(e.target.value)}
                  placeholder={t("ppp.examplePlaceholder", { value: "10.0.0.2" })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="pppoe-holdoff">{t("ppp.holdoff")}</Label>
                <Input
                  id="pppoe-holdoff"
                  value={holdoff}
                  onChange={(e) => setHoldoff(e.target.value)}
                  placeholder={t("ppp.holdoffPlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="pppoe-idle">{t("ppp.idleTimeout")}</Label>
                <Input
                  id="pppoe-idle"
                  value={idleTimeout}
                  onChange={(e) => setIdleTimeout(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pppoe-hostuniq">{t("ppp.hostUniq")}</Label>
                <Input
                  id="pppoe-hostuniq"
                  value={hostUniq}
                  onChange={(e) => setHostUniq(e.target.value)}
                  placeholder="RFC2516 host-uniq"
                />
              </div>
            </div>
          </TabsContent>

          {/* Routing */}
          <TabsContent value="routing" className="space-y-4">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={connectOnDemand}
                onCheckedChange={(v) => setConnectOnDemand(!!v)}
              />
              <span>{t("routing.connectOnDemand")}</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={noDefaultRoute}
                onCheckedChange={(v) => setNoDefaultRoute(!!v)}
              />
              <span>{t("routing.noDefaultRoute")}</span>
            </label>
            <div>
              <Label htmlFor="pppoe-drd">{t("routing.defaultRouteDistance")}</Label>
              <Input
                id="pppoe-drd"
                value={defaultRouteDistance}
                onChange={(e) => setDefaultRouteDistance(e.target.value)}
                placeholder="1-255"
              />
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={noPeerDns}
                onCheckedChange={(v) => setNoPeerDns(!!v)}
              />
              <span>{t("routing.noPeerDns")}</span>
            </label>
          </TabsContent>

          {/* IP */}
          <TabsContent value="ip" className="space-y-4">
            <div className="space-y-2">
              <Label>{t("ip.adjustMss")}</Label>
              <div className="flex items-center gap-3">
                <Input
                  value={ipAdjustMss}
                  onChange={(e) => setIpAdjustMss(e.target.value)}
                  placeholder={t("ip.mssPlaceholder")}
                  disabled={ipAdjustMssClamp}
                  className="max-w-xs"
                />
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={ipAdjustMssClamp}
                    onCheckedChange={(v) => setIpAdjustMssClamp(!!v)}
                  />
                  <span>{t("ip.clampToPmtu")}</span>
                </label>
              </div>
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={ipDisableForwarding}
                onCheckedChange={(v) => setIpDisableForwarding(!!v)}
              />
              <span>{t("ip.disableIpv4Forwarding")}</span>
            </label>
            <div>
              <Label htmlFor="pppoe-srcval">{t("ip.sourceValidation")}</Label>
              <Select
                value={ipSourceValidation || "__none__"}
                onValueChange={(v) =>
                  setIpSourceValidation(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger id="pppoe-srcval">
                  <SelectValue placeholder={tc("notSet")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{tc("notSet")}</SelectItem>
                  {SOURCE_VALIDATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {t(`ip.sourceValidationOptions.${o.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* IPv6 */}
          <TabsContent value="ipv6" className="space-y-4">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={ipv6AddressAutoconf}
                onCheckedChange={(v) => setIpv6AddressAutoconf(!!v)}
              />
              <span>{t("ipv6.addressAutoconf")}</span>
            </label>
            {feat("address_dhcpv6") && (
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipv6AddressDhcpv6}
                  onCheckedChange={(v) => setIpv6AddressDhcpv6(!!v)}
                />
                <span>{t("ipv6.requestDhcpv6Address")}</span>
              </label>
            )}
            <div className="space-y-2">
              <Label>{t("ip.adjustMssIpv6")}</Label>
              <div className="flex items-center gap-3">
                <Input
                  value={ipv6AdjustMss}
                  onChange={(e) => setIpv6AdjustMss(e.target.value)}
                  placeholder={t("ip.mssPlaceholder")}
                  disabled={ipv6AdjustMssClamp}
                  className="max-w-xs"
                />
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={ipv6AdjustMssClamp}
                    onCheckedChange={(v) => setIpv6AdjustMssClamp(!!v)}
                  />
                  <span>{t("ip.clampToPmtu")}</span>
                </label>
              </div>
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={ipv6DisableForwarding}
                onCheckedChange={(v) => setIpv6DisableForwarding(!!v)}
              />
              <span>{t("ipv6.disableIpv6Forwarding")}</span>
            </label>
            {feat("ipv6_address_interface_identifier") && (
              <div>
                <Label htmlFor="pppoe-ipv6-iid">{t("ipv6.interfaceIdentifier")}</Label>
                <Input
                  id="pppoe-ipv6-iid"
                  value={ipv6InterfaceIdentifier}
                  onChange={(e) => setIpv6InterfaceIdentifier(e.target.value)}
                  placeholder={t("ipv6.interfaceIdentifierPlaceholder")}
                />
              </div>
            )}
          </TabsContent>

          {/* DHCPv6 */}
          <TabsContent value="dhcpv6" className="space-y-4">
            <div>
              <Label htmlFor="pppoe-duid">DUID</Label>
              <Input
                id="pppoe-duid"
                value={dhcpv6Duid}
                onChange={(e) => setDhcpv6Duid(e.target.value)}
                placeholder={t("dhcpv6.duidPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={dhcpv6NoRelease}
                  onCheckedChange={(v) => setDhcpv6NoRelease(!!v)}
                />
                <span>{t("dhcpv6.noRelease")}</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={dhcpv6RapidCommit}
                  onCheckedChange={(v) => setDhcpv6RapidCommit(!!v)}
                />
                <span>{t("dhcpv6.rapidCommit")}</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={dhcpv6Temporary}
                  onCheckedChange={(v) => setDhcpv6Temporary(!!v)}
                />
                <span>{t("dhcpv6.temporaryAddress")}</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={dhcpv6ParametersOnly}
                  onCheckedChange={(v) => setDhcpv6ParametersOnly(!!v)}
                />
                <span>{t("dhcpv6.parametersOnly")}</span>
              </label>
              {feat("dhcpv6_no_request_dns") && (
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={dhcpv6NoRequestDns}
                    onCheckedChange={(v) => setDhcpv6NoRequestDns(!!v)}
                  />
                  <span>{t("dhcpv6.noRequestDns")}</span>
                </label>
              )}
              {feat("dhcpv6_no_request_domain_name") && (
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={dhcpv6NoRequestDomainName}
                    onCheckedChange={(v) => setDhcpv6NoRequestDomainName(!!v)}
                  />
                  <span>{t("dhcpv6.noRequestDomainName")}</span>
                </label>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("dhcpv6.prefixDelegation")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("dhcpv6.prefixDelegationHint")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPdInstance}
              >
                <Plus className="h-4 w-4 mr-1" /> {t("dhcpv6.addPdInstance")}
              </Button>
            </div>

            {pdInstances.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("dhcpv6.noPdInstances")}
              </p>
            )}

            {pdInstances.map((pd, idx) => (
              <div
                key={idx}
                className="rounded-lg border p-3 space-y-3 bg-muted/20"
              >
                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                  <div>
                    <Label>{t("dhcpv6.instance")}</Label>
                    <Input
                      value={pd.instance}
                      onChange={(e) =>
                        updatePdInstance(idx, { instance: e.target.value })
                      }
                      placeholder={t("dhcpv6.instancePlaceholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("dhcpv6.prefixLength")}</Label>
                    <Input
                      value={pd.length}
                      onChange={(e) =>
                        updatePdInstance(idx, { length: e.target.value })
                      }
                      placeholder="32-64"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePdInstance(idx)}
                    aria-label={t("dhcpv6.removePdInstance")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t("dhcpv6.delegatedInterfaces")}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPdDelegatedIface(idx)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> {t("dhcpv6.addInterface")}
                    </Button>
                  </div>
                  {pd.interfaces.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("dhcpv6.noDelegatedInterfaces")}
                    </p>
                  )}
                  {pd.interfaces.map((di, ifaceIdx) => (
                    <div
                      key={ifaceIdx}
                      className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
                    >
                      <div>
                        <Label className="text-xs">{t("dhcpv6.interface")}</Label>
                        <Input
                          value={di.name ?? ""}
                          onChange={(e) =>
                            updatePdDelegatedIface(idx, ifaceIdx, {
                              name: e.target.value,
                            })
                          }
                          placeholder="eth1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t("dhcpv6.address")}</Label>
                        <Input
                          value={di.address ?? ""}
                          onChange={(e) =>
                            updatePdDelegatedIface(idx, ifaceIdx, {
                              address: e.target.value,
                            })
                          }
                          placeholder={t("dhcpv6.optionalPlaceholder")}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">SLA ID</Label>
                        <Input
                          value={di.sla_id ?? ""}
                          onChange={(e) =>
                            updatePdDelegatedIface(idx, ifaceIdx, {
                              sla_id: e.target.value,
                            })
                          }
                          placeholder={t("dhcpv6.optionalPlaceholder")}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePdDelegatedIface(idx, ifaceIdx)}
                        aria-label={t("dhcpv6.removeDelegatedInterface")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Mirror */}
          <TabsContent value="mirror" className="space-y-4">
            <div>
              <Label htmlFor="pppoe-mirror-in">{t("mirror.ingress")}</Label>
              <InterfaceSelect
                value={mirrorIngress || "__none__"}
                onValueChange={(v) => setMirrorIngress(v === "__none__" ? "" : v)}
                id="pppoe-mirror-in"
                interfaces={sourceOptions.map((n) => ({ name: n, type: "", description: null }))}
                noneOption={{ label: tc("none"), value: "__none__" }}
                placeholder={t("mirror.selectInterface")}
              />
            </div>
            <div>
              <Label htmlFor="pppoe-mirror-out">{t("mirror.egress")}</Label>
              <InterfaceSelect
                value={mirrorEgress || "__none__"}
                onValueChange={(v) => setMirrorEgress(v === "__none__" ? "" : v)}
                id="pppoe-mirror-out"
                interfaces={sourceOptions.map((n) => ({ name: n, type: "", description: null }))}
                noneOption={{ label: tc("none"), value: "__none__" }}
                placeholder={t("mirror.selectInterface")}
              />
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? tc("saving") : t("modal.creating")}
              </>
            ) : isEdit ? (
              t("modal.saveChanges")
            ) : (
              t("modal.createInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
