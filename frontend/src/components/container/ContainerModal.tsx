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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, AlertTriangle, Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { containerService } from "@/lib/api/container";
import type {
  ContainerInstance,
  ContainerCapabilities,
  ContainerDevice,
  ContainerEnvironment,
  ContainerLabel,
  ContainerNetworkAttachment,
  ContainerPort,
  ContainerSysctlParam,
  ContainerTmpfs,
  ContainerVolume,
  ContainerNetworkConfig,
} from "@/lib/api/container";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: ContainerInstance | null;
  capabilities: ContainerCapabilities | null;
  availableNetworks: ContainerNetworkConfig[];
  availableImages: string[];
  imagesLoading: boolean;
  onSubmit: (data: ContainerInstance) => Promise<void>;
}

const EMPTY_CONTAINER: ContainerInstance = {
  name: "",
  image: null,
  description: null,
  disabled: false,
  allow_host_networks: false,
  allow_host_pid: false,
  privileged: false,
  arguments: null,
  command: null,
  entrypoint: null,
  cpu_quota: null,
  memory: null,
  shared_memory: null,
  uid: null,
  gid: null,
  host_name: null,
  log_driver: null,
  restart: null,
  capabilities: [],
  name_servers: [],
  devices: [],
  environments: [],
  labels: [],
  networks: [],
  ports: [],
  sysctl_params: [],
  tmpfs_mounts: [],
  volumes: [],
};

export function ContainerModal({ open, onOpenChange, container, capabilities, availableNetworks, availableImages, imagesLoading, onSubmit }: Props) {
  const t = useTranslations("containers");
  const tc = useTranslations("common");
  const isEditMode = !!container;
  const caps = capabilities?.features;

  // General
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [restart, setRestart] = useState("");
  const [logDriver, setLogDriver] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Runtime
  const [command, setCommand] = useState("");
  const [entrypoint, setEntrypoint] = useState("");
  const [args, setArgs] = useState("");
  const [cpuQuota, setCpuQuota] = useState("");
  const [memory, setMemory] = useState("");
  const [sharedMemory, setSharedMemory] = useState("");
  const [uid, setUid] = useState("");
  const [gid, setGid] = useState("");
  const [hostName, setHostName] = useState("");

  // Networking
  const [networks, setNetworks] = useState<ContainerNetworkAttachment[]>([]);
  const [netName, setNetName] = useState("");
  const [netAddr, setNetAddr] = useState("");
  const [ports, setPorts] = useState<ContainerPort[]>([]);
  const [portName, setPortName] = useState("");
  const [portSrc, setPortSrc] = useState("");
  const [portDst, setPortDst] = useState("");
  const [portProto, setPortProto] = useState("");
  const [portListenAddr, setPortListenAddr] = useState("");
  const [nameServers, setNameServers] = useState<string[]>([]);
  const [nsInput, setNsInput] = useState("");

  // Storage
  const [volumes, setVolumes] = useState<ContainerVolume[]>([]);
  const [volName, setVolName] = useState("");
  const [volSrcSuffix, setVolSrcSuffix] = useState("");
  const [volDst, setVolDst] = useState("");
  const [volMode, setVolMode] = useState("");
  const [volProp, setVolProp] = useState("");
  const [tmpfsMounts, setTmpfsMounts] = useState<ContainerTmpfs[]>([]);
  const [tmpfsName, setTmpfsName] = useState("");
  const [tmpfsDst, setTmpfsDst] = useState("");
  const [tmpfsSize, setTmpfsSize] = useState("");
  const [devices, setDevices] = useState<ContainerDevice[]>([]);
  const [devName, setDevName] = useState("");
  const [devSrc, setDevSrc] = useState("");
  const [devDst, setDevDst] = useState("");

  // Environment
  const [environments, setEnvironments] = useState<ContainerEnvironment[]>([]);
  const [envKey, setEnvKey] = useState("");
  const [envVal, setEnvVal] = useState("");
  const [labels, setLabels] = useState<ContainerLabel[]>([]);
  const [lblKey, setLblKey] = useState("");
  const [lblVal, setLblVal] = useState("");

  // Security
  const [allowHostNetworks, setAllowHostNetworks] = useState(false);
  const [allowHostPid, setAllowHostPid] = useState(false);
  const [privileged, setPrivileged] = useState(false);
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [sysctlParams, setSysctlParams] = useState<ContainerSysctlParam[]>([]);
  const [sysctlKey, setSysctlKey] = useState("");
  const [sysctlVal, setSysctlVal] = useState("");

  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  const [imageSearch, setImageSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (!open) return;
    const c = container ?? EMPTY_CONTAINER;
    setName(c.name);
    setImage(c.image ?? "");
    setDescription(c.description ?? "");
    setRestart(c.restart ?? "");
    setLogDriver(c.log_driver ?? "");
    setDisabled(c.disabled);
    setCommand(c.command ?? "");
    setEntrypoint(c.entrypoint ?? "");
    setArgs(c.arguments ?? "");
    setCpuQuota(c.cpu_quota ?? "");
    setMemory(c.memory ?? "");
    setSharedMemory(c.shared_memory ?? "");
    setUid(c.uid ?? "");
    setGid(c.gid ?? "");
    setHostName(c.host_name ?? "");
    setNetworks([...c.networks]);
    setPorts([...c.ports]);
    setNameServers([...c.name_servers]);
    setVolumes([...c.volumes]);
    setTmpfsMounts([...c.tmpfs_mounts]);
    setDevices([...c.devices]);
    setEnvironments([...c.environments]);
    setLabels([...c.labels]);
    setAllowHostNetworks(c.allow_host_networks);
    setAllowHostPid(c.allow_host_pid);
    setPrivileged(c.privileged);
    setSelectedCaps([...c.capabilities]);
    setSysctlParams([...c.sysctl_params]);
    setError(null);
    setActiveTab("general");
    setImagePopoverOpen(false);
    setImageSearch("");
    // clear sub-form inputs
    setNetName(""); setNetAddr("");
    setPortName(""); setPortSrc(""); setPortDst(""); setPortProto(""); setPortListenAddr("");
    setNsInput("");
    setVolName(""); setVolSrcSuffix(""); setVolDst(""); setVolMode(""); setVolProp("");
    setTmpfsName(""); setTmpfsDst(""); setTmpfsSize("");
    setDevName(""); setDevSrc(""); setDevDst("");
    setEnvKey(""); setEnvVal("");
    setLblKey(""); setLblVal("");
    setSysctlKey(""); setSysctlVal("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const buildContainer = (): ContainerInstance => ({
    name: name.trim(),
    image: image.trim() || null,
    description: description.trim() || null,
    disabled,
    allow_host_networks: allowHostNetworks,
    allow_host_pid: allowHostPid,
    privileged,
    arguments: args.trim() || null,
    command: command.trim() || null,
    entrypoint: entrypoint.trim() || null,
    cpu_quota: cpuQuota.trim() || null,
    memory: memory.trim() || null,
    shared_memory: sharedMemory.trim() || null,
    uid: uid.trim() || null,
    gid: gid.trim() || null,
    host_name: hostName.trim() || null,
    log_driver: logDriver || null,
    restart: restart || null,
    capabilities: selectedCaps,
    name_servers: nameServers,
    devices,
    environments,
    labels,
    networks,
    ports,
    sysctl_params: sysctlParams,
    tmpfs_mounts: tmpfsMounts,
    volumes,
  });

  const validate = (): string | null => {
    if (!isEditMode && !name.trim()) return t("modal.nameRequired");
    if (!isEditMode && !/^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}$/.test(name.trim())) return t("modal.nameInvalid");
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError(null);
    try {
      const built = buildContainer();

      // Collect dirs to create: always create /config/containers/{name},
      // plus any volume sources under /config/containers/
      const containerName = isEditMode ? container!.name : built.name;
      const dirsToCreate = new Set<string>();
      dirsToCreate.add(`/config/containers/${containerName}`);
      for (const vol of built.volumes) {
        if (vol.source?.startsWith("/config/containers/")) {
          dirsToCreate.add(vol.source);
        }
      }

      const mkdirResult = await containerService.createContainerDirs([...dirsToCreate]);
      if (!mkdirResult.success) {
        setError(mkdirResult.error || t("modal.createDirsFailed"));
        return;
      }

      await onSubmit(built);

      // Best-effort: delete directories for volumes removed in edit mode
      if (isEditMode && container) {
        const removedVols = container.volumes.filter(
          orig => !built.volumes.some(u => u.name === orig.name)
        );
        for (const vol of removedVols) {
          if (vol.source?.startsWith("/config/containers/")) {
            try {
              await containerService.removeContainerDir(vol.source);
            } catch { /* ignore */ }
          }
        }
      }

      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ---- Networking helpers ----
  const addNetwork = () => {
    if (!netName) return;
    if (networks.find(n => n.name === netName)) return;
    // Auto-disable host networks when adding network attachments
    if (allowHostNetworks) {
      setAllowHostNetworks(false);
    }
    setNetworks([...networks, { name: netName, addresses: netAddr ? [netAddr] : [] }]);
    setNetName(""); setNetAddr("");
  };

  const addPort = () => {
    if (!portName) return;
    if (ports.find(p => p.name === portName)) return;
    setPorts([...ports, { name: portName, source: portSrc || null, destination: portDst || null, protocol: portProto || null, listen_addresses: portListenAddr ? [portListenAddr] : [] }]);
    setPortName(""); setPortSrc(""); setPortDst(""); setPortProto(""); setPortListenAddr("");
  };

  // ---- Storage helpers ----
  const addVolume = () => {
    if (!volName) return;
    if (volumes.find(v => v.name === volName)) return;
    const containerName = isEditMode ? container!.name : name.trim();
    const fullSrc = containerName && volSrcSuffix
      ? `/config/containers/${containerName}/${volSrcSuffix}`
      : volSrcSuffix || null;
    setVolumes([...volumes, { name: volName, source: fullSrc, destination: volDst || null, mode: volMode || null, propagation: volProp || null }]);
    setVolName(""); setVolSrcSuffix(""); setVolDst(""); setVolMode(""); setVolProp("");
  };

  const addTmpfs = () => {
    if (!tmpfsName) return;
    if (tmpfsMounts.find(t => t.name === tmpfsName)) return;
    setTmpfsMounts([...tmpfsMounts, { name: tmpfsName, destination: tmpfsDst || null, size: tmpfsSize || null }]);
    setTmpfsName(""); setTmpfsDst(""); setTmpfsSize("");
  };

  const addDevice = () => {
    if (!devName) return;
    if (devices.find(d => d.name === devName)) return;
    setDevices([...devices, { name: devName, source: devSrc || null, destination: devDst || null }]);
    setDevName(""); setDevSrc(""); setDevDst("");
  };

  // ---- Environment/Label helpers ----
  const addEnv = () => {
    if (!envKey) return;
    if (environments.find(e => e.name === envKey)) return;
    setEnvironments([...environments, { name: envKey, value: envVal || null }]);
    setEnvKey(""); setEnvVal("");
  };

  const addLabel = () => {
    if (!lblKey) return;
    if (labels.find(l => l.name === lblKey)) return;
    setLabels([...labels, { name: lblKey, value: lblVal || null }]);
    setLblKey(""); setLblVal("");
  };

  const toggleCap = (cap: string) => {
    setSelectedCaps(prev => prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]);
  };

  // Auto-clear networks when enabling host networks, and auto-disable host networks when adding networks
  const handleAllowHostNetworksChange = (enabled: boolean) => {
    if (enabled && networks.length > 0) {
      setNetworks([]);
    }
    setAllowHostNetworks(enabled);
  };

  const addSysctl = () => {
    if (!sysctlKey) return;
    if (sysctlParams.find(s => s.name === sysctlKey)) return;
    setSysctlParams([...sysctlParams, { name: sysctlKey, value: sysctlVal || null }]);
    setSysctlKey(""); setSysctlVal("");
  };

  const restartValues = caps?.restart_policy?.values ?? ["no", "on-failure", "always"];
  const logDriverValues = caps?.log_driver?.values ?? ["k8s-file", "journald", "none"];
  const showLogDriver = caps?.log_driver?.supported ?? true;
  const propagationValues = caps?.volume_propagation?.values ?? ["shared", "slave", "private", "rshared", "rslave", "rprivate"];
  const showTmpfs = caps?.tmpfs?.supported ?? true;
  const capValues = caps?.capabilities?.values ?? ["net-admin", "net-bind-service", "net-raw", "mknod", "setpcap", "sys-admin", "sys-module", "sys-nice", "sys-time"];
  const showSysctl = caps?.sysctl?.supported ?? true;
  const showAllowHostNetworks = caps?.allow_host_networks?.supported ?? true;
  const showAllowHostPid = caps?.allow_host_pid?.supported ?? true;
  const showPrivileged = caps?.privileged?.supported ?? true;

  const filteredImages = availableImages.filter(img =>
    !imageSearch || img.toLowerCase().includes(imageSearch.toLowerCase())
  );

  const tabs = [
    "general", "runtime", "networking", "storage", "environment", "security",
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t("modal.editTitle", { name: container?.name ?? "" }) : t("modal.addTitle")}</DialogTitle>
          <DialogDescription>
            {isEditMode ? t("modal.editDescription") : t("modal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-1">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            {tabs.map(tab => (
              <TabsTrigger key={tab} value={tab} className="text-xs shrink-0">
                {t(`modal.tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="max-h-[55vh] mt-2 pr-4">
            {/* ---------------------------------------------------------------- General */}
            <TabsContent value="general" className="m-0 px-1">
              <div className="space-y-4 pb-2">
                <div className="space-y-2">
                  <Label htmlFor="c-name">{t("modal.containerName")}</Label>
                  <Input
                    id="c-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={isEditMode}
                    placeholder={t("modal.namePlaceholder")}
                    className={isEditMode ? "bg-muted font-mono" : "font-mono"}
                  />
                  {isEditMode && <p className="text-xs text-muted-foreground">{t("modal.nameImmutable")}</p>}
                </div>

                <div className="space-y-2">
                  <Label>{t("modal.image")}</Label>
                  <Popover open={imagePopoverOpen} onOpenChange={open => { setImagePopoverOpen(open); if (!open) setImageSearch(""); }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={imagePopoverOpen}
                        className="w-full justify-between font-mono font-normal h-10"
                      >
                        <span className={image ? "truncate" : "text-muted-foreground font-sans text-sm"}>
                          {image || t("modal.selectImage")}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-0 w-[var(--radix-popover-trigger-width)]"
                      align="start"
                      onOpenAutoFocus={e => e.preventDefault()}
                    >
                      <div className="border-b p-2">
                        <Input
                          placeholder={t("modal.searchImage")}
                          value={imageSearch}
                          onChange={e => setImageSearch(e.target.value)}
                          className="h-8 font-mono text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        {imagesLoading ? (
                          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />{t("modal.loadingImages")}
                          </div>
                        ) : filteredImages.length === 0 && !imageSearch ? (
                          <p className="px-2 py-3 text-sm text-muted-foreground">{t("modal.noImages")}</p>
                        ) : (
                          <>
                            {filteredImages.map(img => (
                              <button
                                key={img}
                                type="button"
                                className="w-full text-left px-2 py-2 text-sm font-mono hover:bg-accent rounded flex items-center gap-2"
                                onClick={() => { setImage(img); setImageSearch(""); setImagePopoverOpen(false); }}
                              >
                                <Check className={`h-3 w-3 shrink-0 ${image === img ? "opacity-100" : "opacity-0"}`} />
                                {img}
                              </button>
                            ))}
                            {imageSearch && !filteredImages.some(img => img === imageSearch) && (
                              <button
                                type="button"
                                className="w-full text-left px-2 py-2 text-sm font-mono hover:bg-accent rounded flex items-center gap-2 border-t mt-1 pt-2"
                                onClick={() => { setImage(imageSearch); setImageSearch(""); setImagePopoverOpen(false); }}
                              >
                                <Plus className="h-3 w-3 shrink-0" />
                                {t("modal.useImage", { image: imageSearch })}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="c-desc">{tc("description")}</Label>
                  <Input id="c-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder={tc("optionalDescription")} />
                </div>

                <div className="space-y-2">
                  <Label>{t("modal.restartPolicy")}</Label>
                  <Select value={restart} onValueChange={setRestart}>
                    <SelectTrigger><SelectValue placeholder={t("modal.selectRestartPolicy")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{t("modal.noneOption")}</SelectItem>
                      {restartValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {showLogDriver && (
                  <div className="space-y-2">
                    <Label>{t("modal.logDriver")}</Label>
                    <Select value={logDriver} onValueChange={setLogDriver}>
                      <SelectTrigger><SelectValue placeholder={t("modal.selectLogDriver")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{t("modal.noneOption")}</SelectItem>
                        {logDriverValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox id="c-disabled" checked={disabled} onCheckedChange={v => setDisabled(v === true)} />
                  <Label htmlFor="c-disabled" className="cursor-pointer">{t("modal.disableContainer")}</Label>
                </div>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Runtime */}
            <TabsContent value="runtime" className="m-0 px-1">
              <div className="space-y-4 pb-2">
                <div className="space-y-2">
                  <Label htmlFor="c-cmd">{t("modal.command")}</Label>
                  <Input id="c-cmd" value={command} onChange={e => setCommand(e.target.value)} placeholder="/usr/bin/my-app" className="font-mono" />
                  <p className="text-xs text-muted-foreground">{t("modal.commandHelp")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-ep">{t("modal.entrypoint")}</Label>
                  <Input id="c-ep" value={entrypoint} onChange={e => setEntrypoint(e.target.value)} placeholder="/entrypoint.sh" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-args">{t("modal.arguments")}</Label>
                  {/* eslint-disable-next-line vymanager/no-untranslated-text -- example value */}
                  <Input id="c-args" value={args} onChange={e => setArgs(e.target.value)} placeholder="--flag value --other" className="font-mono" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="c-cpu">{t("modal.cpuQuota")}</Label>
                    <Input id="c-cpu" value={cpuQuota} onChange={e => setCpuQuota(e.target.value)} placeholder={t("modal.cpuQuotaPlaceholder")} className="font-mono" />
                    <p className="text-xs text-muted-foreground">{t("modal.cpuQuotaHelp")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-mem">{t("modal.memory")}</Label>
                    <Input id="c-mem" type="number" value={memory} onChange={e => setMemory(e.target.value)} placeholder={t("modal.memoryPlaceholder")} className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-shmem">{t("modal.sharedMemory")}</Label>
                    <Input id="c-shmem" type="number" value={sharedMemory} onChange={e => setSharedMemory(e.target.value)} placeholder={t("modal.sharedMemoryPlaceholder")} className="font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="c-uid">UID</Label>
                    <Input id="c-uid" type="number" value={uid} onChange={e => setUid(e.target.value)} placeholder={t("modal.idPlaceholder")} className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-gid">GID</Label>
                    <Input id="c-gid" type="number" value={gid} onChange={e => setGid(e.target.value)} placeholder={t("modal.idPlaceholder")} className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-hn">{t("modal.hostname")}</Label>
                    <Input id="c-hn" value={hostName} onChange={e => setHostName(e.target.value)} placeholder="container-host" className="font-mono" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Networking */}
            <TabsContent value="networking" className="m-0 px-1">
              <div className="space-y-5 pb-2">
                {/* Networks */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t("modal.networkAttachments")}</Label>
                  {allowHostNetworks && (
                    <div className="flex items-start gap-2 rounded-md bg-blue-500/10 border border-blue-500/20 p-2">
                      <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700 dark:text-blue-400">{t("modal.hostNetworksEnabledWarning")}</p>
                    </div>
                  )}
                  {!allowHostNetworks && networks.length > 0 && (
                    <div className="space-y-2">
                      {networks.map(net => (
                        <div key={net.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span>
                            <span className="font-mono font-medium">{net.name}</span>
                            {net.addresses.length > 0 && <span className="text-muted-foreground ml-2 font-mono">{net.addresses.join(", ")}</span>}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNetworks(networks.filter(n => n.name !== net.name))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {!allowHostNetworks && (
                    <div className="grid gap-2">
                      <div className="flex gap-2">
                        <Select value={netName} onValueChange={setNetName}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder={t("modal.selectNetwork")} /></SelectTrigger>
                          <SelectContent>
                            {availableNetworks.filter(n => !networks.find(a => a.name === n.name)).map(n => (
                              <SelectItem key={n.name} value={n.name}><span className="font-mono">{n.name}</span></SelectItem>
                            ))}
                            {availableNetworks.length === 0 && <SelectItem value="_none" disabled>{t("modal.noNetworks")}</SelectItem>}
                          </SelectContent>
                        </Select>
                        <Input value={netAddr} onChange={e => setNetAddr(e.target.value)} placeholder={t("modal.ipAddressOptional")} className="flex-1 font-mono" />
                        <Button variant="outline" size="icon" onClick={addNetwork} disabled={!netName}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ports */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t("modal.portMappings")}</Label>
                  {ports.length > 0 && (
                    <div className="space-y-2">
                      {ports.map(p => (
                        <div key={p.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span className="font-mono">
                            <span className="font-medium">{p.name}</span>
                            {p.source && p.destination && <span className="text-muted-foreground ml-2">{p.source}→{p.destination}{p.protocol ? `/${p.protocol}` : ""}</span>}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPorts(ports.filter(x => x.name !== p.name))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={portName} onChange={e => setPortName(e.target.value)} placeholder={t("modal.portNamePlaceholder")} className="font-mono" />
                    <Select value={portProto} onValueChange={setPortProto}>
                      <SelectTrigger><SelectValue placeholder={t("modal.protocol")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{t("modal.anyOption")}</SelectItem>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="udp">UDP</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={portSrc} onChange={e => setPortSrc(e.target.value)} placeholder={t("modal.hostPort")} className="font-mono" />
                    <Input value={portDst} onChange={e => setPortDst(e.target.value)} placeholder={t("modal.containerPort")} className="font-mono" />
                    <Input value={portListenAddr} onChange={e => setPortListenAddr(e.target.value)} placeholder={t("modal.listenAddress")} className="font-mono col-span-1" />
                    <Button variant="outline" onClick={addPort} disabled={!portName}>
                      <Plus className="h-4 w-4 mr-1" /> {t("modal.addPort")}
                    </Button>
                  </div>
                </div>

                {/* Name Servers */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t("modal.nameServers")}</Label>
                  {nameServers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {nameServers.map(ns => (
                        <Badge key={ns} variant="secondary" className="font-mono gap-1 pr-1">
                          {ns}
                          <button onClick={() => setNameServers(nameServers.filter(s => s !== ns))} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input value={nsInput} onChange={e => setNsInput(e.target.value)} placeholder={t("modal.dnsServerIp")} className="font-mono" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (nsInput && !nameServers.includes(nsInput)) { setNameServers([...nameServers, nsInput]); setNsInput(""); } } }} />
                    <Button variant="outline" size="icon" onClick={() => { if (nsInput && !nameServers.includes(nsInput)) { setNameServers([...nameServers, nsInput]); setNsInput(""); } }} disabled={!nsInput}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Storage */}
            <TabsContent value="storage" className="m-0 px-1">
              <div className="space-y-5 pb-2">
                {/* Volumes */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t("modal.volumeMounts")}</Label>
                  {volumes.length > 0 && (
                    <div className="space-y-2">
                      {volumes.map(v => (
                        <div key={v.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span className="font-mono">
                            <span className="font-medium">{v.name}</span>
                            {v.source && <span className="text-muted-foreground ml-2">{v.source}→{v.destination}</span>}
                            {v.mode && <Badge variant="outline" className="ml-2 text-xs">{v.mode}</Badge>}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setVolumes(volumes.filter(x => x.name !== v.name))}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={volName}
                      onChange={e => {
                        const newName = e.target.value;
                        setVolName(newName);
                        // Keep suffix in sync with volume name while user hasn't manually changed it
                        if (!volSrcSuffix || volSrcSuffix === volName) {
                          setVolSrcSuffix(newName);
                        }
                      }}
                      placeholder={t("modal.volumeNamePlaceholder")}
                      className="font-mono"
                    />
                    {/* Split source input: read-only base path + editable suffix */}
                    <div className="flex items-center rounded-md border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
                      <span className="pl-3 text-xs font-mono text-muted-foreground whitespace-nowrap select-none shrink-0">
                        /config/containers/{(isEditMode ? container!.name : name.trim()) || "…"}/
                      </span>
                      <input
                        value={volSrcSuffix}
                        onChange={e => setVolSrcSuffix(e.target.value)}
                        placeholder="subdir"
                        className="flex-1 min-w-0 bg-transparent py-2 pr-3 text-xs font-mono outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <Input value={volDst} onChange={e => setVolDst(e.target.value)} placeholder={t("modal.containerDestination")} className="font-mono" />
                    <Select value={volMode} onValueChange={setVolMode}>
                      <SelectTrigger><SelectValue placeholder={t("modal.modePlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{t("modal.defaultOption")}</SelectItem>
                        <SelectItem value="ro">{t("modal.readOnlyMode")}</SelectItem>
                        <SelectItem value="rw">{t("modal.readWriteMode")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={volProp} onValueChange={setVolProp}>
                      <SelectTrigger><SelectValue placeholder={t("modal.propagation")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{t("modal.defaultOption")}</SelectItem>
                        {propagationValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={addVolume} disabled={!volName}>
                      <Plus className="h-4 w-4 mr-1" /> {t("modal.addVolume")}
                    </Button>
                  </div>
                </div>

                {/* Tmpfs */}
                {showTmpfs && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">{t("modal.tmpfsMounts")}</Label>
                    {tmpfsMounts.length > 0 && (
                      <div className="space-y-2">
                        {tmpfsMounts.map(t => (
                          <div key={t.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <span className="font-mono">
                              <span className="font-medium">{t.name}</span>
                              {t.destination && <span className="text-muted-foreground ml-2">{t.destination}</span>}
                              {t.size && <Badge variant="outline" className="ml-2 text-xs">{t.size} MB</Badge>}
                            </span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTmpfsMounts(tmpfsMounts.filter(x => x.name !== t.name))}><X className="h-3 w-3" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={tmpfsName} onChange={e => setTmpfsName(e.target.value)} placeholder={t("modal.mountName")} className="font-mono" />
                      <Input value={tmpfsDst} onChange={e => setTmpfsDst(e.target.value)} placeholder={t("modal.mountPath")} className="font-mono" />
                      <Input type="number" value={tmpfsSize} onChange={e => setTmpfsSize(e.target.value)} placeholder={t("modal.sizeOptional")} className="font-mono" />
                      <Button variant="outline" onClick={addTmpfs} disabled={!tmpfsName}><Plus className="h-4 w-4 mr-1" /> {t("modal.addTmpfs")}</Button>
                    </div>
                  </div>
                )}

                {/* Devices */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t("modal.deviceMappings")}</Label>
                  {devices.length > 0 && (
                    <div className="space-y-2">
                      {devices.map(d => (
                        <div key={d.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span className="font-mono">
                            <span className="font-medium">{d.name}</span>
                            {d.source && <span className="text-muted-foreground ml-2">{d.source}→{d.destination}</span>}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDevices(devices.filter(x => x.name !== d.name))}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={devName} onChange={e => setDevName(e.target.value)} placeholder={t("modal.deviceName")} className="font-mono" />
                    <Input value={devSrc} onChange={e => setDevSrc(e.target.value)} placeholder={t("modal.hostDevicePath")} className="font-mono" />
                    <Input value={devDst} onChange={e => setDevDst(e.target.value)} placeholder={t("modal.containerPath")} className="font-mono" />
                    <Button variant="outline" onClick={addDevice} disabled={!devName}><Plus className="h-4 w-4 mr-1" /> {t("modal.addDevice")}</Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Environment */}
            <TabsContent value="environment" className="m-0 px-1">
              <div className="space-y-5 pb-2">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t("modal.environmentVariables")}</Label>
                  {environments.length > 0 && (
                    <div className="space-y-2">
                      {environments.map(e => (
                        <div key={e.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span className="font-mono"><span className="font-medium">{e.name}</span>{e.value != null && <span className="text-muted-foreground ml-1">= {e.value}</span>}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEnvironments(environments.filter(x => x.name !== e.name))}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input value={envKey} onChange={e => setEnvKey(e.target.value)} placeholder={t("modal.variableName")} className="font-mono flex-1" />
                    <Input value={envVal} onChange={e => setEnvVal(e.target.value)} placeholder={t("modal.valueOptional")} className="font-mono flex-1" />
                    <Button variant="outline" size="icon" onClick={addEnv} disabled={!envKey}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t("modal.labels")}</Label>
                  {labels.length > 0 && (
                    <div className="space-y-2">
                      {labels.map(l => (
                        <div key={l.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span className="font-mono"><span className="font-medium">{l.name}</span>{l.value != null && <span className="text-muted-foreground ml-1">= {l.value}</span>}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLabels(labels.filter(x => x.name !== l.name))}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input value={lblKey} onChange={e => setLblKey(e.target.value)} placeholder={t("modal.labelName")} className="font-mono flex-1" />
                    <Input value={lblVal} onChange={e => setLblVal(e.target.value)} placeholder={t("modal.valueOptional")} className="font-mono flex-1" />
                    <Button variant="outline" size="icon" onClick={addLabel} disabled={!lblKey}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Security */}
            <TabsContent value="security" className="m-0 px-1">
              <div className="space-y-5 pb-2">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t("modal.hostAccess")}</Label>
                  {showAllowHostNetworks && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox id="c-ahn" checked={allowHostNetworks} onCheckedChange={v => handleAllowHostNetworksChange(v === true)} />
                        <Label htmlFor="c-ahn" className="cursor-pointer">{t("modal.allowHostNetworks")}</Label>
                      </div>
                      {networks.length > 0 && !allowHostNetworks && (
                        <div className="flex items-start gap-2 rounded-md bg-blue-500/10 border border-blue-500/20 p-2">
                          <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700 dark:text-blue-400">{t("modal.hostNetworksRemoveWarning")}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {showAllowHostPid && (
                    <div className="flex items-center gap-2">
                      <Checkbox id="c-ahp" checked={allowHostPid} onCheckedChange={v => setAllowHostPid(v === true)} />
                      <Label htmlFor="c-ahp" className="cursor-pointer">{t("modal.allowHostPid")}</Label>
                    </div>
                  )}
                  {showPrivileged && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox id="c-priv" checked={privileged} onCheckedChange={v => setPrivileged(v === true)} />
                        <Label htmlFor="c-priv" className="cursor-pointer">{t("modal.privileged")}</Label>
                      </div>
                      {privileged && (
                        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700 dark:text-amber-400">{t("modal.privilegedWarning")}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {caps?.capabilities?.supported !== false && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">{t("modal.linuxCapabilities")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {capValues.map(cap => (
                        <div key={cap} className="flex items-center gap-2">
                          <Checkbox id={`cap-${cap}`} checked={selectedCaps.includes(cap)} onCheckedChange={() => toggleCap(cap)} />
                          <Label htmlFor={`cap-${cap}`} className="cursor-pointer font-mono text-sm">{cap}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showSysctl && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">{t("modal.sysctlParameters")}</Label>
                    {sysctlParams.length > 0 && (
                      <div className="space-y-2">
                        {sysctlParams.map(s => (
                          <div key={s.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <span className="font-mono"><span className="font-medium">{s.name}</span>{s.value != null && <span className="text-muted-foreground ml-1">= {s.value}</span>}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSysctlParams(sysctlParams.filter(x => x.name !== s.name))}><X className="h-3 w-3" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input value={sysctlKey} onChange={e => setSysctlKey(e.target.value)} placeholder="net.ipv4.ip_forward" className="font-mono flex-1" />
                      <Input value={sysctlVal} onChange={e => setSysctlVal(e.target.value)} placeholder={t("modal.value")} className="font-mono flex-1" />
                      <Button variant="outline" size="icon" onClick={addSysctl} disabled={!sysctlKey}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 mt-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditMode ? tc("saving") : t("modal.adding")}</>
            ) : isEditMode ? tc("saveChanges") : t("modal.addTitle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
