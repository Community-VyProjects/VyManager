"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Plus, X } from "lucide-react";
import { dhcpService, type DHCPCapabilitiesResponse, type DHCPRange, type DHCPSubnet } from "@/lib/api/dhcp";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import { DhcpCatalogFields } from "./DhcpCatalogFields";
import {
  catalogCreateOps,
  catalogDraftFrom,
  catalogOps,
  emptyCatalogDraft,
  type CatalogDraft,
} from "./dhcp-catalog";
import { failedSaveMessage } from "./dhcp-save";
import {
  emptyServerDraft,
  serverDraftFrom,
  serverFieldSupport,
  submitServerCreate,
  submitServerUpdate,
  validateServerCreate,
  validateServerShared,
  type ServerDraft,
} from "./dhcp-server-form";

const NO_LEAVES: never[] = [];

interface DHCPServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: DHCPCapabilitiesResponse | null;
  existingNetwork?: string;
  existing?: { network: string; subnet: DHCPSubnet } | null;
}

export function DHCPServerModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingNetwork,
  existing,
}: DHCPServerModalProps) {
  const t = useTranslations("dhcpServer");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mode selection
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existingNetworks, setExistingNetworks] = useState<string[]>([]);

  // Basic fields
  const [networkName, setNetworkName] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [description, setDescription] = useState("");
  const [subnet, setSubnet] = useState("");
  const [subnetId, setSubnetId] = useState("");
  const [defaultRouter, setDefaultRouter] = useState("");
  const [domainName, setDomainName] = useState("");
  const [lease, setLease] = useState("86400"); // 24 hours default

  // DNS fields
  const [nameServers, setNameServers] = useState<string[]>([""]);
  const [domainSearch, setDomainSearch] = useState<string[]>([]);

  // DHCP Pool fields
  const [ranges, setRanges] = useState<DHCPRange[]>([{ range_id: "0", start: "", stop: "" }]);
  const [excludes, setExcludes] = useState<string[]>([]);

  // Advanced options
  const [bootfileName, setBootfileName] = useState("");
  const [bootfileServer, setBootfileServer] = useState("");
  const [tftpServerName, setTftpServerName] = useState("");
  const [timeServers, setTimeServers] = useState<string[]>([]);
  const [ntpServers, setNtpServers] = useState<string[]>([]);
  const [winsServers, setWinsServers] = useState<string[]>([]);
  const [timeOffset, setTimeOffset] = useState("");
  const [clientPrefixLength, setClientPrefixLength] = useState("");
  const [wpadUrl, setWpadUrl] = useState("");

  // Options
  const [pingCheck, setPingCheck] = useState(false);
  const [enableFailover, setEnableFailover] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [catalogDraft, setCatalogDraft] = useState<CatalogDraft>({});
  const [catalogOriginal, setCatalogOriginal] = useState<CatalogDraft>({});
  const subnetLeaves = capabilities?.catalog?.subnet ?? NO_LEAVES;
  const support = serverFieldSupport(capabilities);

  const calculateNextSubnetId = useCallback(async () => {
    if (!capabilities?.has_subnet_id) return;

    try {
      const config = await dhcpService.getConfig();
      const usedIds = new Set<number>();

      // Collect all used subnet IDs
      config.shared_networks.forEach((network) => {
        network.subnets.forEach((subnet) => {
          if (subnet.subnet_id) {
            usedIds.add(subnet.subnet_id);
          }
        });
      });

      // Find the lowest available ID starting from 1
      let nextId = 1;
      while (usedIds.has(nextId)) {
        nextId++;
      }

      setSubnetId(nextId.toString());
    } catch (err) {
      console.error("Failed to calculate next subnet ID:", err);
      setSubnetId("1");
    }
  }, [capabilities]);

  const applyDraft = (next: ServerDraft) => {
    setMode(next.mode);
    setNetworkName(next.networkName);
    setSelectedNetwork(next.selectedNetwork);
    setDescription(next.description);
    setSubnet(next.subnet);
    setSubnetId(next.subnetId);
    setDefaultRouter(next.defaultRouter);
    setDomainName(next.domainName);
    setLease(next.lease);
    setNameServers(next.nameServers);
    setDomainSearch(next.domainSearch);
    setRanges(next.ranges);
    setExcludes(next.excludes);
    setBootfileName(next.bootfileName);
    setBootfileServer(next.bootfileServer);
    setTftpServerName(next.tftpServerName);
    setTimeServers(next.timeServers);
    setNtpServers(next.ntpServers);
    setWinsServers(next.winsServers);
    setTimeOffset(next.timeOffset);
    setClientPrefixLength(next.clientPrefixLength);
    setWpadUrl(next.wpadUrl);
    setPingCheck(next.pingCheck);
    setEnableFailover(next.enableFailover);
    setDisabled(next.disabled);
  };

  const readDraft = (): ServerDraft => ({
    mode,
    networkName,
    selectedNetwork,
    description,
    subnet,
    subnetId,
    defaultRouter,
    domainName,
    lease,
    nameServers,
    domainSearch,
    ranges,
    excludes,
    bootfileName,
    bootfileServer,
    tftpServerName,
    timeServers,
    ntpServers,
    winsServers,
    timeOffset,
    clientPrefixLength,
    wpadUrl,
    pingCheck,
    enableFailover,
    disabled,
  });

  useEffect(() => {
    if (!open) return;
    if (existing) {
      applyDraft(serverDraftFrom(existing.network, existing.subnet));
      const loaded = catalogDraftFrom(subnetLeaves, existing.subnet.catalog);
      setCatalogDraft(loaded);
      setCatalogOriginal({ ...loaded });
    } else {
      const next = emptyServerDraft();
      if (existingNetwork) {
        next.mode = "existing";
        next.selectedNetwork = existingNetwork;
      }
      applyDraft(next);
      calculateNextSubnetId();
      loadExistingNetworks();
      const loaded = emptyCatalogDraft(subnetLeaves);
      setCatalogDraft(loaded);
      setCatalogOriginal(loaded);
    }
    setError(null);
  }, [open, existing, existingNetwork, calculateNextSubnetId, subnetLeaves]);

  const loadExistingNetworks = async () => {
    try {
      const config = await dhcpService.getConfig();
      setExistingNetworks(config.shared_networks.map(n => n.name));
    } catch (err) {
      console.error("Failed to load existing networks:", err);
    }
  };


  const resetForm = () => {
    setMode("new");
    setNetworkName("");
    setSelectedNetwork("");
    setDescription("");
    setSubnet("");
    setSubnetId("");
    setDefaultRouter("");
    setDomainName("");
    setLease("86400");
    setNameServers([""]);
    setDomainSearch([]);
    setRanges([{ range_id: "0", start: "", stop: "" }]);
    setExcludes([]);
    setBootfileName("");
    setBootfileServer("");
    setTftpServerName("");
    setTimeServers([]);
    setNtpServers([]);
    setWinsServers([]);
    setTimeOffset("");
    setClientPrefixLength("");
    setWpadUrl("");
    setPingCheck(false);
    setEnableFailover(false);
    setDisabled(false);
    setCatalogDraft(emptyCatalogDraft(subnetLeaves));
    setCatalogOriginal(emptyCatalogDraft(subnetLeaves));
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const draft = readDraft();
    const validationError = isEdit && existing
      ? validateServerShared(draft, existing.subnet.subnet)
      : validateServerCreate(draft);
    if (validationError) {
      setError("values" in validationError ? t(validationError.key, validationError.values) : t(validationError.key));
      return;
    }

    const write = modalWriteKind(existing ? { name: existing.subnet.subnet } : null);
    setLoading(true);
    setError(null);

    try {
      if (write.kind === "update" && existing) {
        const updated = await submitServerUpdate(
          existing,
          draft,
          support,
          catalogOps(
            "set_subnet_catalog",
            "delete_subnet_catalog",
            subnetLeaves,
            catalogOriginal,
            catalogDraft,
          ),
          dhcpService,
        );
        const updateError = failedSaveMessage(updated, t("edit.failed"));
        if (updateError) {
          setError(updateError);
          return;
        }
      } else {
        let calculatedSubnetId: number | undefined;
        if (support.hasSubnetId) {
          if (subnetId) {
            calculatedSubnetId = parseInt(subnetId, 10);
          } else {
            const config = await dhcpService.getConfig();
            const usedIds = new Set<number>();
            config.shared_networks.forEach((network) => {
              network.subnets.forEach((entry) => {
                if (entry.subnet_id) usedIds.add(entry.subnet_id);
              });
            });
            let nextId = 1;
            while (usedIds.has(nextId)) nextId++;
            calculatedSubnetId = nextId;
          }
        }
        const created = await submitServerCreate(
          draft,
          support,
          calculatedSubnetId,
          catalogCreateOps("set_subnet_catalog", subnetLeaves, catalogDraft),
          dhcpService,
        );
        const createError = failedSaveMessage(created, t("create.failed"));
        if (createError) {
          setError(createError);
          return;
        }
      }
      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message ||
          (isEdit ? t("edit.failed") : t("create.failed")),
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for array management
  const addNameServer = () => setNameServers([...nameServers, ""]);
  const updateNameServer = (index: number, value: string) => {
    const updated = [...nameServers];
    updated[index] = value;
    setNameServers(updated);
  };
  const removeNameServer = (index: number) => {
    setNameServers(nameServers.filter((_, i) => i !== index));
  };

  const addDomainSearch = () => setDomainSearch([...domainSearch, ""]);
  const updateDomainSearch = (index: number, value: string) => {
    const updated = [...domainSearch];
    updated[index] = value;
    setDomainSearch(updated);
  };
  const removeDomainSearch = (index: number) => {
    setDomainSearch(domainSearch.filter((_, i) => i !== index));
  };

  const addRange = () => {
    const nextId = ranges.length.toString();
    setRanges([...ranges, { range_id: nextId, start: "", stop: "" }]);
  };
  const updateRange = (index: number, field: "start" | "stop", value: string) => {
    const updated = [...ranges];
    updated[index][field] = value;
    setRanges(updated);
  };
  const removeRange = (index: number) => {
    setRanges(ranges.filter((_, i) => i !== index));
  };

  const addExclude = () => setExcludes([...excludes, ""]);
  const updateExclude = (index: number, value: string) => {
    const updated = [...excludes];
    updated[index] = value;
    setExcludes(updated);
  };
  const removeExclude = (index: number) => {
    setExcludes(excludes.filter((_, i) => i !== index));
  };

  const addTimeServer = () => setTimeServers([...timeServers, ""]);
  const updateTimeServer = (index: number, value: string) => {
    const updated = [...timeServers];
    updated[index] = value;
    setTimeServers(updated);
  };
  const removeTimeServer = (index: number) => {
    setTimeServers(timeServers.filter((_, i) => i !== index));
  };

  const addNtpServer = () => setNtpServers([...ntpServers, ""]);
  const updateNtpServer = (index: number, value: string) => {
    const updated = [...ntpServers];
    updated[index] = value;
    setNtpServers(updated);
  };
  const removeNtpServer = (index: number) => {
    setNtpServers(ntpServers.filter((_, i) => i !== index));
  };

  const addWinsServer = () => setWinsServers([...winsServers, ""]);
  const updateWinsServer = (index: number, value: string) => {
    const updated = [...winsServers];
    updated[index] = value;
    setWinsServers(updated);
  };
  const removeWinsServer = (index: number) => {
    setWinsServers(winsServers.filter((_, i) => i !== index));
  };

  const lockedNetwork = lockedIdentity(existing, (record) => record.network, networkName);
  const lockedSubnet = lockedIdentity(existing, (record) => record.subnet.subnet, subnet);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("edit.title") : mode === "new" ? t("create.titleNew") : t("create.titleExisting")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("edit.description", { subnet: lockedSubnet.value, network: lockedNetwork.value })
              : mode === "new"
                ? t("create.descriptionNew")
                : t("create.descriptionExisting")}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selection - only show when not adding to existing network */}
        {!isEdit && !existingNetwork && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{t("create.mode")}</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="new"
                    checked={mode === "new"}
                    onChange={(e) => setMode(e.target.value as "new")}
                    className="text-primary"
                  />
                  <span className="text-sm">{t("create.modeNew")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="existing"
                    checked={mode === "existing"}
                    onChange={(e) => setMode(e.target.value as "existing")}
                    className="text-primary"
                  />
                  <span className="text-sm">{t("create.modeExisting")}</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
            <TabsTrigger value="basic">{t("subnetForm.tabs.basic")}</TabsTrigger>
            <TabsTrigger value="dns">{t("subnetForm.tabs.dns")}</TabsTrigger>
            <TabsTrigger value="pool">{t("subnetForm.tabs.pool")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("subnetForm.tabs.advanced")}</TabsTrigger>
            <TabsTrigger value="options">{t("subnetForm.tabs.options")}</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4 min-h-0">
            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div>
                  <Label className={isEdit ? undefined : "required"}>
                    {t("subnetForm.sharedNetworkName")}
                  </Label>
                  {isEdit ? (
                    <Input value={lockedNetwork.value} disabled />
                  ) : mode === "new" ? (
                    <Input
                      value={networkName}
                      onChange={(e) => setNetworkName(e.target.value)}
                      placeholder={t("examplePlaceholder", { example: "LAN" })}
                    />
                  ) : (
                    <select
                      value={selectedNetwork}
                      onChange={(e) => setSelectedNetwork(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">{t("create.selectExistingNetwork")}</option>
                      {existingNetworks.map((network) => (
                        <option key={network} value={network}>
                          {network}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEdit
                      ? t("edit.networkLocked")
                      : mode === "new"
                        ? t("create.networkNameHelp")
                        : t("create.existingNetworkHelp")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="createDescription">{tc("description")}</Label>
                  <Input
                    id="createDescription"
                    placeholder={tc("optionalDescription")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="subnet" className={isEdit ? undefined : "required"}>
                    {t("subnetForm.subnetCidr")}
                  </Label>
                  <Input
                    id="subnet"
                    value={lockedSubnet.value}
                    onChange={(e) => setSubnet(e.target.value)}
                    placeholder={t("examplePlaceholder", { example: "192.168.1.0/24" })}
                    disabled={lockedSubnet.disabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEdit
                      ? t("edit.cannotChange")
                      : t("subnetForm.subnetCidrHelp")}
                  </p>
                </div>

                {isEdit && support.subnetDisable && (
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <Checkbox
                      id="subnetDisabled"
                      checked={disabled}
                      onCheckedChange={(checked) => setDisabled(checked === true)}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="subnetDisabled" className="cursor-pointer">{t("edit.disableSubnet")}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t("edit.disableSubnetHelp")}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="defaultRouter" className="required">
                    {t("subnetForm.defaultRouter")}
                  </Label>
                  <Input
                    id="defaultRouter"
                    value={defaultRouter}
                    onChange={(e) => setDefaultRouter(e.target.value)}
                    placeholder="e.g., 192.168.1.1"
                  />
                </div>

                <div>
                  <Label htmlFor="domainName" className="required">
                    {t("subnetForm.domainName")}
                  </Label>
                  <Input
                    id="domainName"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                    placeholder={t("examplePlaceholder", { example: "local.lan" })}
                  />
                </div>

                <div>
                  <Label htmlFor="lease" className="required">
                    {t("subnetForm.leaseTime")}
                  </Label>
                  <Input
                    id="lease"
                    type="number"
                    value={lease}
                    onChange={(e) => setLease(e.target.value)}
                    placeholder="86400"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("subnetForm.leaseTimeHelp")}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* DNS Tab */}
            <TabsContent value="dns" className="space-y-4 mt-4">
              <div>
                <Label className="required">{t("subnetForm.nameServers")}</Label>
                <div className="space-y-2 mt-2">
                  {nameServers.map((ns, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={ns}
                        onChange={(e) => updateNameServer(index, e.target.value)}
                        placeholder="e.g., 8.8.8.8"
                      />
                      {nameServers.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeNameServer(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNameServer}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("subnetForm.addNameServer")}
                  </Button>
                </div>
              </div>

              <div>
                <Label>{t("subnetForm.domainSearchList")}</Label>
                <div className="space-y-2 mt-2">
                  {domainSearch.map((ds, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={ds}
                        onChange={(e) => updateDomainSearch(index, e.target.value)}
                        placeholder={t("examplePlaceholder", { example: "example.com" })}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeDomainSearch(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDomainSearch}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("subnetForm.addDomainSearch")}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* DHCP Pool Tab */}
            <TabsContent value="pool" className="space-y-4 mt-4">
              <div>
                <Label className="required">{t("subnetForm.ipRanges")}</Label>
                <div className="space-y-3 mt-2">
                  {ranges.map((range, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <Input
                            value={range.start}
                            onChange={(e) => updateRange(index, "start", e.target.value)}
                            placeholder={t("subnetForm.startIp")}
                          />
                        </div>
                        <div>
                          <Input
                            value={range.stop}
                            onChange={(e) => updateRange(index, "stop", e.target.value)}
                            placeholder={t("subnetForm.stopIp")}
                          />
                        </div>
                      </div>
                      {ranges.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeRange(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addRange}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("subnetForm.addRange")}
                  </Button>
                </div>
              </div>

              <div>
                <Label>{t("subnetForm.excludedAddresses")}</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t("subnetForm.excludedAddressesHelp")}
                </p>
                <div className="space-y-2">
                  {excludes.map((exclude, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={exclude}
                        onChange={(e) => updateExclude(index, e.target.value)}
                        placeholder="e.g., 192.168.1.50"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeExclude(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addExclude}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("subnetForm.addExclude")}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4 mt-4 pb-24">
              <div className="grid gap-4">
                {capabilities?.fields.bootfile_name.supported && (
                  <div>
                    <Label htmlFor="bootfileName">{t("subnetForm.bootfileName")}</Label>
                    <Input
                      id="bootfileName"
                      value={bootfileName}
                      onChange={(e) => setBootfileName(e.target.value)}
                      placeholder={t("examplePlaceholder", { example: "pxelinux.0" })}
                    />
                  </div>
                )}

                {capabilities?.fields.bootfile_server.supported && (
                  <div>
                    <Label htmlFor="bootfileServer">{t("subnetForm.bootfileServer")}</Label>
                    <Input
                      id="bootfileServer"
                      value={bootfileServer}
                      onChange={(e) => setBootfileServer(e.target.value)}
                      placeholder="e.g., 192.168.1.10"
                    />
                  </div>
                )}

                {capabilities?.fields.tftp_server_name.supported && (
                  <div>
                    <Label htmlFor="tftpServerName">{t("subnetForm.tftpServerName")}</Label>
                    <Input
                      id="tftpServerName"
                      value={tftpServerName}
                      onChange={(e) => setTftpServerName(e.target.value)}
                      placeholder={t("examplePlaceholder", { example: "tftp.local.lan" })}
                    />
                  </div>
                )}

                {capabilities?.fields.time_servers.supported && (
                  <div>
                    <Label>{t("subnetForm.timeServers")}</Label>
                  <div className="space-y-2 mt-2">
                    {timeServers.map((ts, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={ts}
                          onChange={(e) => updateTimeServer(index, e.target.value)}
                          placeholder="e.g., 192.168.1.1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeTimeServer(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTimeServer}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("subnetForm.addTimeServer")}
                    </Button>
                  </div>
                  </div>
                )}

                {capabilities?.fields.ntp_servers.supported && (
                  <div>
                    <Label>{t("subnetForm.ntpServers")}</Label>
                    <div className="space-y-2 mt-2">
                    {ntpServers.map((ntp, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={ntp}
                          onChange={(e) => updateNtpServer(index, e.target.value)}
                          placeholder="e.g., 192.168.1.1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeNtpServer(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNtpServer}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("subnetForm.addNtpServer")}
                    </Button>
                  </div>
                  </div>
                )}

                {capabilities?.fields.wins_servers.supported && (
                  <div>
                    <Label>{t("subnetForm.winsServers")}</Label>
                    <div className="space-y-2 mt-2">
                    {winsServers.map((wins, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={wins}
                          onChange={(e) => updateWinsServer(index, e.target.value)}
                          placeholder="e.g., 192.168.1.2"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeWinsServer(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addWinsServer}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("subnetForm.addWinsServer")}
                    </Button>
                  </div>
                  </div>
                )}

                {capabilities?.fields.time_offset.supported && (
                  <div>
                    <Label htmlFor="timeOffset">{t("subnetForm.timeOffset")}</Label>
                    <Input
                      id="timeOffset"
                      value={timeOffset}
                      onChange={(e) => setTimeOffset(e.target.value)}
                      placeholder={t("subnetForm.timeOffsetPlaceholder")}
                    />
                  </div>
                )}

                {capabilities?.fields.client_prefix_length.supported && (
                  <div>
                    <Label htmlFor="clientPrefixLength">{t("subnetForm.clientPrefixLength")}</Label>
                    <Input
                      id="clientPrefixLength"
                      value={clientPrefixLength}
                      onChange={(e) => setClientPrefixLength(e.target.value)}
                      placeholder="e.g., 24"
                    />
                  </div>
                )}

                {capabilities?.fields.wpad_url.supported && (
                  <div>
                    <Label htmlFor="wpadUrl">{t("subnetForm.wpadUrl")}</Label>
                    <Input
                      id="wpadUrl"
                      value={wpadUrl}
                      onChange={(e) => setWpadUrl(e.target.value)}
                      placeholder={t("examplePlaceholder", { example: "http://wpad.local.lan/wpad.dat" })}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Options Tab */}
            <TabsContent value="options" className="space-y-4 mt-4">
              <div className="space-y-4">
                {capabilities?.fields.ping_check.supported && (
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="pingCheck"
                      checked={pingCheck}
                      onCheckedChange={(checked) => setPingCheck(checked as boolean)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="pingCheck" className="cursor-pointer">
                        {t("subnetForm.pingCheck")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("subnetForm.pingCheckHelp")}
                      </p>
                    </div>
                  </div>
                )}

                {capabilities?.fields.enable_failover.supported && (
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="enableFailover"
                      checked={enableFailover}
                      onCheckedChange={(checked) => setEnableFailover(checked as boolean)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="enableFailover" className="cursor-pointer">
                        {t("subnetForm.enableFailover")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("subnetForm.enableFailoverHelp")}
                      </p>
                    </div>
                  </div>
                )}
                <DhcpCatalogFields
                  leaves={subnetLeaves}
                  values={catalogDraft}
                  onChange={(token, value) =>
                    setCatalogDraft((current) => ({ ...current, [token]: value }))
                  }
                  idPrefix="server-dhcp"
                />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? isEdit
                ? tc("saving")
                : tc("creating")
              : isEdit
                ? t("edit.submit")
                : t("create.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
