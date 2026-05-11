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
  health_check: null,
  networks: [],
  ports: [],
  sysctl_params: [],
  tmpfs_mounts: [],
  volumes: [],
};

export function ContainerModal({ open, onOpenChange, container, capabilities, availableNetworks, availableImages, imagesLoading, onSubmit }: Props) {
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
  const [netMac, setNetMac] = useState("");
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

  // Health check
  const [hcCommand, setHcCommand] = useState("");
  const [hcInterval, setHcInterval] = useState("");
  const [hcRetry, setHcRetry] = useState("");
  const [hcTimeout, setHcTimeout] = useState("");

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
    if (c.health_check) {
      setHcCommand(c.health_check.command ?? "");
      setHcInterval(c.health_check.interval ?? "");
      setHcRetry(c.health_check.retry ?? "");
      setHcTimeout(c.health_check.timeout ?? "");
    } else {
      setHcCommand(""); setHcInterval(""); setHcRetry(""); setHcTimeout("");
    }
    setError(null);
    setActiveTab("general");
    setImagePopoverOpen(false);
    setImageSearch("");
    // clear sub-form inputs
    setNetName(""); setNetAddr(""); setNetMac("");
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
    health_check: (hcCommand || hcInterval || hcRetry || hcTimeout)
      ? { command: hcCommand || null, interval: hcInterval || null, retry: hcRetry || null, timeout: hcTimeout || null }
      : null,
    networks,
    ports,
    sysctl_params: sysctlParams,
    tmpfs_mounts: tmpfsMounts,
    volumes,
  });

  const validate = (): string | null => {
    if (!isEditMode && !name.trim()) return "Container name is required.";
    if (!isEditMode && !/^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}$/.test(name.trim())) return "Container name must start with a letter or digit, may contain hyphens, and be at most 63 characters.";
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
        setError(mkdirResult.error || "Failed to create container directories.");
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
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  // ---- Networking helpers ----
  const addNetwork = () => {
    if (!netName) return;
    if (networks.find(n => n.name === netName)) return;
    setNetworks([...networks, { name: netName, addresses: netAddr ? [netAddr] : [], mac: netMac || null }]);
    setNetName(""); setNetAddr(""); setNetMac("");
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

  const addSysctl = () => {
    if (!sysctlKey) return;
    if (sysctlParams.find(s => s.name === sysctlKey)) return;
    setSysctlParams([...sysctlParams, { name: sysctlKey, value: sysctlVal || null }]);
    setSysctlKey(""); setSysctlVal("");
  };

  const showHealthCheck = caps?.health_check?.supported ?? true;
  const restartValues = caps?.restart_policy?.values ?? ["no", "on-failure", "always"];
  const logDriverValues = caps?.log_driver?.values ?? ["k8s-file", "journald", "none"];
  const showLogDriver = caps?.log_driver?.supported ?? true;
  const propagationValues = caps?.volume_propagation?.values ?? ["shared", "slave", "private", "rshared", "rslave", "rprivate"];
  const showTmpfs = caps?.tmpfs?.supported ?? true;
  const showMac = caps?.network_attachment_mac?.supported ?? true;
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
    ...(showHealthCheck ? ["health-check"] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? `Edit Container — ${container?.name}` : "Add Container"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modify this container's configuration." : "Configure a new VyOS container."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-1">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            {tabs.map(t => (
              <TabsTrigger key={t} value={t} className="text-xs shrink-0">
                {t === "health-check" ? "Health Check" : t.charAt(0).toUpperCase() + t.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="max-h-[55vh] mt-2 pr-4">
            {/* ---------------------------------------------------------------- General */}
            <TabsContent value="general" className="m-0 px-1">
              <div className="space-y-4 pb-2">
                <div className="space-y-2">
                  <Label htmlFor="c-name">Container Name</Label>
                  <Input
                    id="c-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={isEditMode}
                    placeholder="e.g. my-app"
                    className={isEditMode ? "bg-muted font-mono" : "font-mono"}
                  />
                  {isEditMode && <p className="text-xs text-muted-foreground">Container name cannot be changed after creation.</p>}
                </div>

                <div className="space-y-2">
                  <Label>Image</Label>
                  <Popover open={imagePopoverOpen} onOpenChange={open => { setImagePopoverOpen(open); if (!open) setImageSearch(""); }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={imagePopoverOpen}
                        className="w-full justify-between font-mono font-normal h-10"
                      >
                        <span className={image ? "truncate" : "text-muted-foreground font-sans text-sm"}>
                          {image || "Select or type an image..."}
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
                          placeholder="Search or type image..."
                          value={imageSearch}
                          onChange={e => setImageSearch(e.target.value)}
                          className="h-8 font-mono text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        {imagesLoading ? (
                          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />Loading images...
                          </div>
                        ) : filteredImages.length === 0 && !imageSearch ? (
                          <p className="px-2 py-3 text-sm text-muted-foreground">No images found on device</p>
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
                                Use &quot;{imageSearch}&quot;
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="c-desc">Description</Label>
                  <Input id="c-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
                </div>

                <div className="space-y-2">
                  <Label>Restart Policy</Label>
                  <Select value={restart} onValueChange={setRestart}>
                    <SelectTrigger><SelectValue placeholder="Select restart policy" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— None —</SelectItem>
                      {restartValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {showLogDriver && (
                  <div className="space-y-2">
                    <Label>Log Driver</Label>
                    <Select value={logDriver} onValueChange={setLogDriver}>
                      <SelectTrigger><SelectValue placeholder="Select log driver" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— None —</SelectItem>
                        {logDriverValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox id="c-disabled" checked={disabled} onCheckedChange={v => setDisabled(v === true)} />
                  <Label htmlFor="c-disabled" className="cursor-pointer">Disable this container</Label>
                </div>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Runtime */}
            <TabsContent value="runtime" className="m-0 px-1">
              <div className="space-y-4 pb-2">
                <div className="space-y-2">
                  <Label htmlFor="c-cmd">Command</Label>
                  <Input id="c-cmd" value={command} onChange={e => setCommand(e.target.value)} placeholder="/usr/bin/my-app" className="font-mono" />
                  <p className="text-xs text-muted-foreground">Override the default container command.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-ep">Entrypoint</Label>
                  <Input id="c-ep" value={entrypoint} onChange={e => setEntrypoint(e.target.value)} placeholder="/entrypoint.sh" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-args">Arguments</Label>
                  <Input id="c-args" value={args} onChange={e => setArgs(e.target.value)} placeholder="--flag value --other" className="font-mono" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="c-cpu">CPU Quota</Label>
                    <Input id="c-cpu" value={cpuQuota} onChange={e => setCpuQuota(e.target.value)} placeholder="e.g. 0.5" className="font-mono" />
                    <p className="text-xs text-muted-foreground">Fraction of CPU (e.g. 0.5 = 50%)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-mem">Memory (MB)</Label>
                    <Input id="c-mem" type="number" value={memory} onChange={e => setMemory(e.target.value)} placeholder="e.g. 512" className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-shmem">Shared Mem (MB)</Label>
                    <Input id="c-shmem" type="number" value={sharedMemory} onChange={e => setSharedMemory(e.target.value)} placeholder="e.g. 64" className="font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="c-uid">UID</Label>
                    <Input id="c-uid" type="number" value={uid} onChange={e => setUid(e.target.value)} placeholder="e.g. 1000" className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-gid">GID</Label>
                    <Input id="c-gid" type="number" value={gid} onChange={e => setGid(e.target.value)} placeholder="e.g. 1000" className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-hn">Hostname</Label>
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
                  <Label className="text-sm font-semibold">Network Attachments</Label>
                  {networks.length > 0 && (
                    <div className="space-y-2">
                      {networks.map(net => (
                        <div key={net.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span>
                            <span className="font-mono font-medium">{net.name}</span>
                            {net.addresses.length > 0 && <span className="text-muted-foreground ml-2 font-mono">{net.addresses.join(", ")}</span>}
                            {net.mac && <span className="text-muted-foreground ml-2 font-mono">{net.mac}</span>}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNetworks(networks.filter(n => n.name !== net.name))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid gap-2">
                    <div className="flex gap-2">
                      <Select value={netName} onValueChange={setNetName}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Select network" /></SelectTrigger>
                        <SelectContent>
                          {availableNetworks.filter(n => !networks.find(a => a.name === n.name)).map(n => (
                            <SelectItem key={n.name} value={n.name}><span className="font-mono">{n.name}</span></SelectItem>
                          ))}
                          {availableNetworks.length === 0 && <SelectItem value="_none" disabled>No networks configured</SelectItem>}
                        </SelectContent>
                      </Select>
                      <Input value={netAddr} onChange={e => setNetAddr(e.target.value)} placeholder="IP address (optional)" className="flex-1 font-mono" />
                      {showMac && <Input value={netMac} onChange={e => setNetMac(e.target.value)} placeholder="MAC (optional)" className="flex-1 font-mono" />}
                      <Button variant="outline" size="icon" onClick={addNetwork} disabled={!netName}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>

                {/* Ports */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Port Mappings</Label>
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
                    <Input value={portName} onChange={e => setPortName(e.target.value)} placeholder="Port name (e.g. http)" className="font-mono" />
                    <Select value={portProto} onValueChange={setPortProto}>
                      <SelectTrigger><SelectValue placeholder="Protocol" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Any —</SelectItem>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="udp">UDP</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={portSrc} onChange={e => setPortSrc(e.target.value)} placeholder="Host port (source)" className="font-mono" />
                    <Input value={portDst} onChange={e => setPortDst(e.target.value)} placeholder="Container port (dest)" className="font-mono" />
                    <Input value={portListenAddr} onChange={e => setPortListenAddr(e.target.value)} placeholder="Listen address (optional)" className="font-mono col-span-1" />
                    <Button variant="outline" onClick={addPort} disabled={!portName}>
                      <Plus className="h-4 w-4 mr-1" /> Add Port
                    </Button>
                  </div>
                </div>

                {/* Name Servers */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Name Servers</Label>
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
                    <Input value={nsInput} onChange={e => setNsInput(e.target.value)} placeholder="DNS server IP" className="font-mono" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (nsInput && !nameServers.includes(nsInput)) { setNameServers([...nameServers, nsInput]); setNsInput(""); } } }} />
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
                  <Label className="text-sm font-semibold">Volume Mounts</Label>
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
                      placeholder="Volume name (e.g. data)"
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
                    <Input value={volDst} onChange={e => setVolDst(e.target.value)} placeholder="Container destination" className="font-mono" />
                    <Select value={volMode} onValueChange={setVolMode}>
                      <SelectTrigger><SelectValue placeholder="Mode (ro/rw)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Default —</SelectItem>
                        <SelectItem value="ro">ro (read-only)</SelectItem>
                        <SelectItem value="rw">rw (read-write)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={volProp} onValueChange={setVolProp}>
                      <SelectTrigger><SelectValue placeholder="Propagation" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Default —</SelectItem>
                        {propagationValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={addVolume} disabled={!volName}>
                      <Plus className="h-4 w-4 mr-1" /> Add Volume
                    </Button>
                  </div>
                </div>

                {/* Tmpfs */}
                {showTmpfs && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Tmpfs Mounts</Label>
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
                      <Input value={tmpfsName} onChange={e => setTmpfsName(e.target.value)} placeholder="Mount name" className="font-mono" />
                      <Input value={tmpfsDst} onChange={e => setTmpfsDst(e.target.value)} placeholder="Mount path in container" className="font-mono" />
                      <Input type="number" value={tmpfsSize} onChange={e => setTmpfsSize(e.target.value)} placeholder="Size (MB, optional)" className="font-mono" />
                      <Button variant="outline" onClick={addTmpfs} disabled={!tmpfsName}><Plus className="h-4 w-4 mr-1" /> Add Tmpfs</Button>
                    </div>
                  </div>
                )}

                {/* Devices */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Device Mappings</Label>
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
                    <Input value={devName} onChange={e => setDevName(e.target.value)} placeholder="Device name" className="font-mono" />
                    <Input value={devSrc} onChange={e => setDevSrc(e.target.value)} placeholder="Host device path" className="font-mono" />
                    <Input value={devDst} onChange={e => setDevDst(e.target.value)} placeholder="Container path" className="font-mono" />
                    <Button variant="outline" onClick={addDevice} disabled={!devName}><Plus className="h-4 w-4 mr-1" /> Add Device</Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Environment */}
            <TabsContent value="environment" className="m-0 px-1">
              <div className="space-y-5 pb-2">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Environment Variables</Label>
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
                    <Input value={envKey} onChange={e => setEnvKey(e.target.value)} placeholder="Variable name" className="font-mono flex-1" />
                    <Input value={envVal} onChange={e => setEnvVal(e.target.value)} placeholder="Value (optional)" className="font-mono flex-1" />
                    <Button variant="outline" size="icon" onClick={addEnv} disabled={!envKey}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Labels</Label>
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
                    <Input value={lblKey} onChange={e => setLblKey(e.target.value)} placeholder="Label name" className="font-mono flex-1" />
                    <Input value={lblVal} onChange={e => setLblVal(e.target.value)} placeholder="Value (optional)" className="font-mono flex-1" />
                    <Button variant="outline" size="icon" onClick={addLabel} disabled={!lblKey}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Security */}
            <TabsContent value="security" className="m-0 px-1">
              <div className="space-y-5 pb-2">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Host Access</Label>
                  {showAllowHostNetworks && (
                    <div className="flex items-center gap-2">
                      <Checkbox id="c-ahn" checked={allowHostNetworks} onCheckedChange={v => setAllowHostNetworks(v === true)} />
                      <Label htmlFor="c-ahn" className="cursor-pointer">Allow host networks</Label>
                    </div>
                  )}
                  {showAllowHostPid && (
                    <div className="flex items-center gap-2">
                      <Checkbox id="c-ahp" checked={allowHostPid} onCheckedChange={v => setAllowHostPid(v === true)} />
                      <Label htmlFor="c-ahp" className="cursor-pointer">Allow host PID namespace</Label>
                    </div>
                  )}
                  {showPrivileged && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox id="c-priv" checked={privileged} onCheckedChange={v => setPrivileged(v === true)} />
                        <Label htmlFor="c-priv" className="cursor-pointer">Privileged</Label>
                      </div>
                      {privileged && (
                        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700 dark:text-amber-400">Privileged containers have root-level access to the host. Use only when required.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {caps?.capabilities?.supported !== false && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Linux Capabilities</Label>
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
                    <Label className="text-sm font-semibold">Sysctl Parameters</Label>
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
                      <Input value={sysctlVal} onChange={e => setSysctlVal(e.target.value)} placeholder="Value" className="font-mono flex-1" />
                      <Button variant="outline" size="icon" onClick={addSysctl} disabled={!sysctlKey}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Health Check */}
            {showHealthCheck && (
              <TabsContent value="health-check" className="m-0 px-1">
                <div className="space-y-4 pb-2">
                  <p className="text-xs text-muted-foreground">Leave all fields empty to disable health check.</p>
                  <div className="space-y-2">
                    <Label htmlFor="hc-cmd">Command</Label>
                    <Input id="hc-cmd" value={hcCommand} onChange={e => setHcCommand(e.target.value)} placeholder="CMD /bin/health-check.sh" className="font-mono" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="hc-interval">Interval (s)</Label>
                      <Input id="hc-interval" type="number" value={hcInterval} onChange={e => setHcInterval(e.target.value)} placeholder="e.g. 30" className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hc-retry">Retry Count</Label>
                      <Input id="hc-retry" type="number" value={hcRetry} onChange={e => setHcRetry(e.target.value)} placeholder="e.g. 3" className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hc-timeout">Timeout (s)</Label>
                      <Input id="hc-timeout" type="number" value={hcTimeout} onChange={e => setHcTimeout(e.target.value)} placeholder="e.g. 10" className="font-mono" />
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 mt-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditMode ? "Saving…" : "Adding…"}</>
            ) : isEditMode ? "Save Changes" : "Add Container"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
