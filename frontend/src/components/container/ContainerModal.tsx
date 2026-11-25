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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MultiValueInput } from "@/components/service/webproxy/MultiValueInput";
import { AlertCircle, AlertTriangle, Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import { containerService } from "@/lib/api/container";
import type {
  ContainerCapabilities,
  ContainerHealthCheck,
  ContainerInstance,
  ContainerNetworkAttachment,
  ContainerNetworkConfig,
} from "@/lib/api/container";
import {
  containerProblem,
  emptyContainer,
  DESCRIPTION_MAX,
  HEALTH_INTERVAL_RANGE,
  HEALTH_RETRY_RANGE,
  HEALTH_TIMEOUT_RANGE,
  ID_RANGE,
  MEMORY_RANGE,
  removableVolumeDirs,
  SHARED_MEMORY_RANGE,
  STOP_TIMEOUT_RANGE,
  TMPFS_SIZE_RANGE,
  VOLUME_BASE,
  type ContainerProblem,
} from "@/lib/api/container-save-ops";
import type { ApiError } from "@/lib/types/api";
import { AttachmentMacSelect } from "./AttachmentMacSelect";
import { RowList } from "./RowList";
import { SECTION_LABEL_KEYS } from "./container-form";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The container being edited; null adds one. */
  container: ContainerInstance | null;
  capabilities: ContainerCapabilities;
  availableNetworks: ContainerNetworkConfig[];
  /** Every configured container (name reuse, attachment uniqueness, shared volume paths). */
  containers: ContainerInstance[];
  availableImages: string[];
  imagesLoading: boolean;
  imagesError: string | null;
  onSubmit: (draft: ContainerInstance) => Promise<void>;
}

/** Select item for a typed interval in seconds. */
const CUSTOM = "custom";

function seed(container: ContainerInstance | null): ContainerInstance {
  const c = container ?? emptyContainer();
  return {
    ...c,
    capabilities: [...c.capabilities],
    name_servers: [...c.name_servers],
    devices: c.devices.map((d) => ({ ...d })),
    environments: c.environments.map((e) => ({ ...e })),
    labels: c.labels.map((l) => ({ ...l })),
    networks: c.networks.map((n) => ({ ...n, addresses: [...n.addresses] })),
    ports: c.ports.map((p) => ({ ...p, listen_addresses: [...p.listen_addresses] })),
    sysctl_params: c.sysctl_params.map((s) => ({ ...s })),
    tmpfs_mounts: c.tmpfs_mounts.map((m) => ({ ...m })),
    volumes: c.volumes.map((v) => ({ ...v })),
  };
}

export function ContainerModal({
  open,
  onOpenChange,
  container,
  capabilities,
  availableNetworks,
  containers,
  availableImages,
  imagesLoading,
  imagesError,
  onSubmit,
}: Props) {
  const t = useTranslations("containers");
  const tr = useTranslations("containerResources");
  const tc = useTranslations("common");
  const isEditMode = !!container;
  const { features, values } = capabilities;

  const [draft, setDraft] = useState<ContainerInstance>(() => seed(container));
  const attachment: ContainerNetworkAttachment | undefined = draft.networks[0];
  const health: ContainerHealthCheck = draft.health_check ?? {};
  const macKeywords = values.network_mac_keywords || [];
  const intervalKeywords = values.health_check_interval_keywords || [];
  const [intervalSeconds, setIntervalSeconds] = useState(() => {
    const interval = container?.health_check?.interval;
    return !!interval && !intervalKeywords.includes(interval);
  });
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  const [imageSearch, setImageSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  const set = (patch: Partial<ContainerInstance>) => setDraft((d) => ({ ...d, ...patch }));
  const setHealth = (patch: Partial<ContainerHealthCheck>) =>
    setDraft((d) => ({ ...d, health_check: { ...(d.health_check ?? {}), ...patch } }));
  const setAttachment = (patch: Partial<ContainerNetworkAttachment>) =>
    setDraft((d) => (d.networks[0] ? { ...d, networks: [{ ...d.networks[0], ...patch }] } : d));

  const handleOpenChange = (next: boolean) => {
    if (!next && saving) return;
    onOpenChange(next);
  };

  const problemText = (p: ContainerProblem) =>
    t(`problems.${p.key}`, { ...p.values, section: p.section ? t(SECTION_LABEL_KEYS[p.section]) : "" });

  /**
   * Sources of the stored volumes: a loaded row's source never follows its name, and the save
   * does not `mkdir -p` it (it may be a bind-mounted file).
   */
  const storedVolumeSources = new Set((container?.volumes ?? []).map((v) => (v.source ?? "").trim()));

  const handleSubmit = async () => {
    const issue = containerProblem(container, draft, {
      features,
      existingNames: containers.map((c) => c.name),
      networks: availableNetworks,
      values,
      rules: capabilities,
      containers,
    });
    if (issue) {
      setError(problemText(issue));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const containerName = (container?.name ?? draft.name).trim();
      const dirs = new Set<string>([`${VOLUME_BASE}${containerName}`]);
      for (const vol of draft.volumes) {
        const source = (vol.source ?? "").trim();
        if (source.startsWith(VOLUME_BASE) && !storedVolumeSources.has(source)) dirs.add(source);
      }
      const mkdirResult = await containerService.createContainerDirs([...dirs]);
      if (!mkdirResult.success) {
        setError(mkdirResult.error || t("modal.createDirsFailed"));
        return;
      }

      await onSubmit(draft);

      // Best-effort: remove a host path this edit stopped using, unless a kept
      // volume of this container or any volume of another container still uses it.
      if (container) {
        const inUse = [
          ...draft.volumes.map((v) => v.source ?? ""),
          ...containers.filter((c) => c.name !== container.name).flatMap((c) => c.volumes.map((v) => v.source ?? "")),
        ];
        const dropped = removableVolumeDirs(
          container.volumes.map((v) => v.source ?? ""),
          inUse,
        );
        for (const source of dropped) {
          try {
            await containerService.removeContainerDir(source);
          } catch {
            /* the config is already saved */
          }
        }
      }
      onOpenChange(false);
    } catch (err: unknown) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setSaving(false);
    }
  };

  const pickNetwork = (name: string) =>
    set(name ? { networks: [{ name, addresses: [], mac: "" }], allow_host_networks: false } : { networks: [] });

  const capabilityNames = [
    ...(values.capabilities || []),
    ...draft.capabilities.filter((cap) => !(values.capabilities || []).includes(cap)),
  ];
  const toggleCap = (cap: string) =>
    set({
      capabilities: draft.capabilities.includes(cap)
        ? draft.capabilities.filter((c) => c !== cap)
        : [...draft.capabilities, cap],
    });

  const filteredImages = availableImages.filter(
    (img) => !imageSearch || img.toLowerCase().includes(imageSearch.toLowerCase()),
  );
  const image = draft.image ?? "";

  const intervalMode = intervalSeconds
    ? CUSTOM
    : health.interval && intervalKeywords.includes(health.interval) ? health.interval : NONE_SENTINEL;
  const volumeBase = `${VOLUME_BASE}${(container?.name ?? draft.name).trim()}/`;

  const tabs = ["general", "runtime", "networking", "storage", "environment", "security"] as const;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("modal.editTitle", { name: container?.name ?? "" }) : t("tab.addContainer")}
          </DialogTitle>
          <DialogDescription>{isEditMode ? t("modal.editDescription") : t("modal.addDescription")}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-1">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            {tabs.map((tab) => (
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
                    value={draft.name}
                    onChange={(e) => set({ name: e.target.value })}
                    disabled={isEditMode}
                    maxLength={63}
                    placeholder={t("modal.namePlaceholder")}
                    className={isEditMode ? "bg-muted font-mono" : "font-mono"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="c-image">{t("modal.image")}</Label>
                  <Popover
                    open={imagePopoverOpen}
                    onOpenChange={(next) => {
                      setImagePopoverOpen(next);
                      if (!next) setImageSearch("");
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        id="c-image"
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
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="border-b p-2">
                        <Input
                          aria-label={t("modal.searchImage")}
                          placeholder={t("modal.searchImage")}
                          value={imageSearch}
                          onChange={(e) => setImageSearch(e.target.value)}
                          className="h-8 font-mono text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        {imagesLoading ? (
                          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {t("modal.loadingImages")}
                          </div>
                        ) : (
                          <>
                            {imagesError && (
                              <p className="px-2 py-3 text-sm text-destructive whitespace-pre-wrap">{imagesError}</p>
                            )}
                            {!imagesError && filteredImages.length === 0 && !imageSearch && (
                              <p className="px-2 py-3 text-sm text-muted-foreground">{t("modal.noImages")}</p>
                            )}
                            {filteredImages.map((img) => (
                              <button
                                key={img}
                                type="button"
                                className="w-full text-left px-2 py-2 text-sm font-mono hover:bg-accent rounded flex items-center gap-2"
                                onClick={() => {
                                  set({ image: img });
                                  setImageSearch("");
                                  setImagePopoverOpen(false);
                                }}
                              >
                                <Check className={`h-3 w-3 shrink-0 ${image === img ? "opacity-100" : "opacity-0"}`} />
                                {img}
                              </button>
                            ))}
                            {imageSearch && !filteredImages.some((img) => img === imageSearch) && (
                              <button
                                type="button"
                                className="w-full text-left px-2 py-2 text-sm font-mono hover:bg-accent rounded flex items-center gap-2 border-t mt-1 pt-2"
                                onClick={() => {
                                  set({ image: imageSearch });
                                  setImageSearch("");
                                  setImagePopoverOpen(false);
                                }}
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
                  <Input
                    id="c-desc"
                    value={draft.description ?? ""}
                    onChange={(e) => set({ description: e.target.value })}
                    maxLength={DESCRIPTION_MAX}
                    placeholder={tc("optionalDescription")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="c-restart">{t("modal.restartPolicy")}</Label>
                  <NamedListSelect
                    id="c-restart"
                    value={draft.restart ?? ""}
                    names={values.restart_policies || []}
                    onValueChange={(v) => set({ restart: v })}
                    noneLabel={t("modal.defaultOption")}
                  />
                </div>

                {features.log_driver && (
                  <div className="space-y-2">
                    <Label htmlFor="c-log">{t("modal.logDriver")}</Label>
                    <NamedListSelect
                      id="c-log"
                      value={draft.log_driver ?? ""}
                      names={values.log_drivers || []}
                      onValueChange={(v) => set({ log_driver: v })}
                      noneLabel={t("modal.defaultOption")}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox id="c-disabled" checked={draft.disabled} onCheckedChange={(v) => set({ disabled: v === true })} />
                  <Label htmlFor="c-disabled" className="cursor-pointer">{t("modal.disableContainer")}</Label>
                </div>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Runtime */}
            <TabsContent value="runtime" className="m-0 px-1">
              <div className="space-y-4 pb-2">
                <div className="space-y-2">
                  <Label htmlFor="c-cmd">{t("modal.command")}</Label>
                  <Input id="c-cmd" value={draft.command ?? ""} onChange={(e) => set({ command: e.target.value })} placeholder="/usr/bin/my-app" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-ep">{t("modal.entrypoint")}</Label>
                  <Input id="c-ep" value={draft.entrypoint ?? ""} onChange={(e) => set({ entrypoint: e.target.value })} placeholder="/entrypoint.sh" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-args">{t("modal.arguments")}</Label>
                  {/* eslint-disable-next-line vymanager/no-untranslated-text -- example value */}
                  <Input id="c-args" value={draft.arguments ?? ""} onChange={(e) => set({ arguments: e.target.value })} placeholder="--flag value --other" className="font-mono" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="c-cpu">{t("modal.cpuQuota")}</Label>
                    <Input id="c-cpu" value={draft.cpu_quota ?? ""} onChange={(e) => set({ cpu_quota: e.target.value })} placeholder={t("modal.cpuQuotaPlaceholder")} className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-mem">{t("modal.memory")}</Label>
                    <Input id="c-mem" type="number" min={MEMORY_RANGE.min} max={MEMORY_RANGE.max} value={draft.memory ?? ""} onChange={(e) => set({ memory: e.target.value })} placeholder={t("modal.memoryPlaceholder")} className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-shmem">{t("modal.sharedMemory")}</Label>
                    <Input id="c-shmem" type="number" min={SHARED_MEMORY_RANGE.min} max={SHARED_MEMORY_RANGE.max} value={draft.shared_memory ?? ""} onChange={(e) => set({ shared_memory: e.target.value })} placeholder={t("modal.sharedMemoryPlaceholder")} className="font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="c-uid">{t("modal.uid")}</Label>
                    <Input id="c-uid" type="number" min={ID_RANGE.min} max={ID_RANGE.max} value={draft.uid ?? ""} onChange={(e) => set({ uid: e.target.value })} placeholder={t("modal.idPlaceholder")} className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-gid">{t("modal.gid")}</Label>
                    <Input id="c-gid" type="number" min={ID_RANGE.min} max={ID_RANGE.max} value={draft.gid ?? ""} onChange={(e) => set({ gid: e.target.value })} placeholder={t("modal.idPlaceholder")} className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-hn">{t("modal.hostname")}</Label>
                    <Input id="c-hn" value={draft.host_name ?? ""} onChange={(e) => set({ host_name: e.target.value })} placeholder="container-host" className="font-mono" />
                  </div>
                </div>
                {features.stop_timeout && (
                  <div className="space-y-2">
                    <Label htmlFor="c-stop">{t("modal.stopTimeout")}</Label>
                    <Input id="c-stop" type="number" min={STOP_TIMEOUT_RANGE.min} max={STOP_TIMEOUT_RANGE.max} value={draft.stop_timeout ?? ""} onChange={(e) => set({ stop_timeout: e.target.value })} className="font-mono" />
                  </div>
                )}

                {features.health_check && (
                  <div className="space-y-3 pt-1">
                    <p className="text-sm font-semibold">{t("modal.healthCheck")}</p>
                    <div className="space-y-2">
                      <Label htmlFor="c-hc-cmd">{t("modal.command")}</Label>
                      <Input id="c-hc-cmd" value={health.command ?? ""} onChange={(e) => setHealth({ command: e.target.value })} className="font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="c-hc-interval">{t("modal.healthInterval")}</Label>
                        <Select
                          value={intervalMode}
                          onValueChange={(mode) => {
                            setIntervalSeconds(mode === CUSTOM);
                            setHealth({ interval: intervalKeywords.includes(mode) ? mode : "" });
                          }}
                        >
                          <SelectTrigger id="c-hc-interval"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_SENTINEL}>{t("modal.defaultOption")}</SelectItem>
                            {intervalKeywords.map((keyword) => (
                              <SelectItem key={keyword} value={keyword} className="font-mono">{keyword}</SelectItem>
                            ))}
                            <SelectItem value={CUSTOM}>{t("modal.healthIntervalSeconds")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {intervalSeconds && (
                        <div className="space-y-2">
                          <Label htmlFor="c-hc-seconds">{t("modal.healthIntervalSeconds")}</Label>
                          <Input id="c-hc-seconds" type="number" min={HEALTH_INTERVAL_RANGE.min} max={HEALTH_INTERVAL_RANGE.max} value={health.interval ?? ""} onChange={(e) => setHealth({ interval: e.target.value })} className="font-mono" />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="c-hc-retry">{t("modal.healthRetry")}</Label>
                        <Input id="c-hc-retry" type="number" min={HEALTH_RETRY_RANGE.min} max={HEALTH_RETRY_RANGE.max} value={health.retry ?? ""} onChange={(e) => setHealth({ retry: e.target.value })} className="font-mono" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="c-hc-timeout">{t("modal.healthTimeout")}</Label>
                        <Input id="c-hc-timeout" type="number" min={HEALTH_TIMEOUT_RANGE.min} max={HEALTH_TIMEOUT_RANGE.max} value={health.timeout ?? ""} onChange={(e) => setHealth({ timeout: e.target.value })} className="font-mono" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Networking */}
            <TabsContent value="networking" className="m-0 px-1">
              <div className="space-y-5 pb-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="c-ahn"
                    checked={draft.allow_host_networks}
                    onCheckedChange={(v) =>
                      set(v === true ? { allow_host_networks: true, networks: [] } : { allow_host_networks: false })
                    }
                  />
                  <Label htmlFor="c-ahn" className="cursor-pointer">{t("modal.allowHostNetworks")}</Label>
                </div>

                {!draft.allow_host_networks && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="c-net">{tr("wizard.network")}</Label>
                      <NamedListSelect
                        id="c-net"
                        value={attachment?.name ?? ""}
                        names={availableNetworks.map((n) => n.name)}
                        onValueChange={pickNetwork}
                      />
                    </div>
                    {attachment && (
                      <>
                        <MultiValueInput
                          label={t("modal.addresses")}
                          values={attachment.addresses}
                          onChange={(addresses) => setAttachment({ addresses })}
                          placeholder={t("modal.addressPlaceholder")}
                        />
                        {features.network_mac && (
                          <AttachmentMacSelect
                            key={attachment.name}
                            id="c-mac"
                            label={tr("wizard.macAddress")}
                            value={attachment.mac ?? ""}
                            onChange={(mac) => setAttachment({ mac })}
                            keywords={macKeywords}
                            disabled={saving}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}

                <RowList
                  title={t("modal.portMappings")}
                  rows={draft.ports}
                  onChange={(ports) => set({ ports })}
                  newRow={() => ({ name: "", source: "", destination: "", protocol: "", listen_addresses: [] })}
                  addLabel={t("modal.addPort")}
                  removeLabel={t("modal.removeRow")}
                  disabled={saving}
                >
                  {(row, index, update) => (
                    <>
                      <Input aria-label={t("modal.portNamePlaceholder")} value={row.name} onChange={(e) => update({ name: e.target.value })} placeholder={t("modal.portNamePlaceholder")} className="font-mono self-end" />
                      <div className="space-y-1">
                        <Label htmlFor={`c-port-proto-${index}`} className="text-xs">{t("modal.protocol")}</Label>
                        <NamedListSelect
                          id={`c-port-proto-${index}`}
                          value={row.protocol ?? ""}
                          names={values.port_protocols || []}
                          onValueChange={(v) => update({ protocol: v })}
                          noneLabel={t("modal.defaultOption")}
                        />
                      </div>
                      <Input aria-label={t("modal.hostPort")} value={row.source ?? ""} onChange={(e) => update({ source: e.target.value })} placeholder={t("modal.hostPort")} className="font-mono" />
                      <Input aria-label={t("modal.containerPort")} value={row.destination ?? ""} onChange={(e) => update({ destination: e.target.value })} placeholder={t("modal.containerPort")} className="font-mono" />
                      <div className="col-span-2">
                        <MultiValueInput
                          label={t("modal.listenAddresses")}
                          values={row.listen_addresses}
                          onChange={(listen_addresses) => update({ listen_addresses })}
                          placeholder={t("modal.addressPlaceholder")}
                        />
                      </div>
                    </>
                  )}
                </RowList>

                <MultiValueInput
                  label={t("modal.nameServers")}
                  values={draft.name_servers}
                  onChange={(name_servers) => set({ name_servers })}
                  placeholder={t("modal.dnsServerIp")}
                />
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Storage */}
            <TabsContent value="storage" className="m-0 px-1">
              <div className="space-y-5 pb-2">
                <RowList
                  title={t("modal.volumeMounts")}
                  rows={draft.volumes}
                  onChange={(volumes) => set({ volumes })}
                  newRow={() => ({ name: "", source: "", destination: "", mode: "", propagation: "" })}
                  addLabel={t("modal.addVolume")}
                  removeLabel={t("modal.removeRow")}
                  disabled={saving}
                >
                  {(row, index, update) => (
                    <>
                      <Input
                        aria-label={t("modal.volumeNamePlaceholder")}
                        value={row.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          // The source of a row added here follows the name until the user edits it.
                          const source = (row.source ?? "").trim();
                          const followName =
                            !source || (source === `${volumeBase}${row.name}` && !storedVolumeSources.has(source));
                          update(followName ? { name, source: name ? `${volumeBase}${name}` : "" } : { name });
                        }}
                        placeholder={t("modal.volumeNamePlaceholder")}
                        className="font-mono"
                      />
                      <Input aria-label={t("modal.sourcePath")} value={row.source ?? ""} onChange={(e) => update({ source: e.target.value })} placeholder={t("modal.sourcePath")} className="font-mono" />
                      <Input aria-label={t("modal.containerDestination")} value={row.destination ?? ""} onChange={(e) => update({ destination: e.target.value })} placeholder={t("modal.containerDestination")} className="font-mono col-span-2" />
                      <div className="space-y-1">
                        <Label htmlFor={`c-vol-mode-${index}`} className="text-xs">{t("modal.mode")}</Label>
                        <NamedListSelect
                          id={`c-vol-mode-${index}`}
                          value={row.mode ?? ""}
                          names={values.volume_modes || []}
                          onValueChange={(v) => update({ mode: v })}
                          noneLabel={t("modal.defaultOption")}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`c-vol-prop-${index}`} className="text-xs">{t("modal.propagation")}</Label>
                        <NamedListSelect
                          id={`c-vol-prop-${index}`}
                          value={row.propagation ?? ""}
                          names={values.volume_propagations || []}
                          onValueChange={(v) => update({ propagation: v })}
                          noneLabel={t("modal.defaultOption")}
                        />
                      </div>
                    </>
                  )}
                </RowList>

                {features.tmpfs && (
                  <RowList
                    title={t("modal.tmpfsMounts")}
                    rows={draft.tmpfs_mounts}
                    onChange={(tmpfs_mounts) => set({ tmpfs_mounts })}
                    newRow={() => ({ name: "", destination: "", size: "" })}
                    addLabel={t("modal.addTmpfs")}
                    removeLabel={t("modal.removeRow")}
                    disabled={saving}
                  >
                    {(row, _index, update) => (
                      <>
                        <Input aria-label={t("modal.mountName")} value={row.name} onChange={(e) => update({ name: e.target.value })} placeholder={t("modal.mountName")} className="font-mono" />
                        <Input aria-label={t("modal.mountPath")} value={row.destination ?? ""} onChange={(e) => update({ destination: e.target.value })} placeholder={t("modal.mountPath")} className="font-mono" />
                        <Input aria-label={t("modal.sizeMb")} type="number" min={TMPFS_SIZE_RANGE.min} max={TMPFS_SIZE_RANGE.max} value={row.size ?? ""} onChange={(e) => update({ size: e.target.value })} placeholder={t("modal.sizeMb")} className="font-mono" />
                      </>
                    )}
                  </RowList>
                )}

                <RowList
                  title={t("modal.deviceMappings")}
                  rows={draft.devices}
                  onChange={(devices) => set({ devices })}
                  newRow={() => ({ name: "", source: "", destination: "" })}
                  addLabel={t("modal.addDevice")}
                  removeLabel={t("modal.removeRow")}
                  disabled={saving}
                >
                  {(row, _index, update) => (
                    <>
                      <Input aria-label={t("modal.deviceName")} value={row.name} onChange={(e) => update({ name: e.target.value })} placeholder={t("modal.deviceName")} className="font-mono" />
                      <Input aria-label={t("modal.hostDevicePath")} value={row.source ?? ""} onChange={(e) => update({ source: e.target.value })} placeholder={t("modal.hostDevicePath")} className="font-mono" />
                      <Input aria-label={t("modal.containerPath")} value={row.destination ?? ""} onChange={(e) => update({ destination: e.target.value })} placeholder={t("modal.containerPath")} className="font-mono" />
                    </>
                  )}
                </RowList>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Environment */}
            <TabsContent value="environment" className="m-0 px-1">
              <div className="space-y-5 pb-2">
                <RowList
                  title={t("modal.environmentVariables")}
                  rows={draft.environments}
                  onChange={(environments) => set({ environments })}
                  newRow={() => ({ name: "", value: "" })}
                  addLabel={t("modal.addVariable")}
                  removeLabel={t("modal.removeRow")}
                  disabled={saving}
                >
                  {(row, _index, update) => (
                    <>
                      <Input aria-label={t("modal.variableName")} value={row.name} onChange={(e) => update({ name: e.target.value })} placeholder={t("modal.variableName")} className="font-mono" />
                      <Input aria-label={t("modal.valueOptional")} value={row.value ?? ""} onChange={(e) => update({ value: e.target.value })} placeholder={t("modal.valueOptional")} className="font-mono" />
                    </>
                  )}
                </RowList>

                <RowList
                  title={t("modal.labels")}
                  rows={draft.labels}
                  onChange={(labels) => set({ labels })}
                  newRow={() => ({ name: "", value: "" })}
                  addLabel={t("modal.addLabel")}
                  removeLabel={t("modal.removeRow")}
                  disabled={saving}
                >
                  {(row, _index, update) => (
                    <>
                      <Input aria-label={t("modal.labelName")} value={row.name} onChange={(e) => update({ name: e.target.value })} placeholder={t("modal.labelName")} className="font-mono" />
                      <Input aria-label={t("modal.value")} value={row.value ?? ""} onChange={(e) => update({ value: e.target.value })} placeholder={t("modal.value")} className="font-mono" />
                    </>
                  )}
                </RowList>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------------- Security */}
            <TabsContent value="security" className="m-0 px-1">
              <div className="space-y-5 pb-2">
                <div className="space-y-3">
                  <p className="text-sm font-semibold">{t("modal.hostAccess")}</p>
                  <div className="flex items-center gap-2">
                    <Checkbox id="c-ahp" checked={draft.allow_host_pid} onCheckedChange={(v) => set({ allow_host_pid: v === true })} />
                    <Label htmlFor="c-ahp" className="cursor-pointer">{t("modal.allowHostPid")}</Label>
                  </div>
                  {features.allow_host_cgroups && (
                    <div className="flex items-center gap-2">
                      <Checkbox id="c-ahc" checked={draft.allow_host_cgroups} onCheckedChange={(v) => set({ allow_host_cgroups: v === true })} />
                      <Label htmlFor="c-ahc" className="cursor-pointer">{t("modal.allowHostCgroups")}</Label>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="c-priv" checked={draft.privileged} onCheckedChange={(v) => set({ privileged: v === true })} />
                      <Label htmlFor="c-priv" className="cursor-pointer">{t("modal.privileged")}</Label>
                    </div>
                    {draft.privileged && (
                      <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">{t("modal.privilegedWarning")}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">{t("modal.linuxCapabilities")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {capabilityNames.map((cap) => (
                      <div key={cap} className="flex items-center gap-2">
                        <Checkbox id={`cap-${cap}`} checked={draft.capabilities.includes(cap)} onCheckedChange={() => toggleCap(cap)} />
                        <Label htmlFor={`cap-${cap}`} className="cursor-pointer font-mono text-sm">{cap}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <RowList
                  title={t("modal.sysctlParameters")}
                  rows={draft.sysctl_params}
                  onChange={(sysctl_params) => set({ sysctl_params })}
                  newRow={() => ({ name: "", value: "" })}
                  addLabel={t("modal.addParameter")}
                  removeLabel={t("modal.removeRow")}
                  disabled={saving}
                >
                  {(row, _index, update) => (
                    <>
                      <Input aria-label={t("modal.parameterName")} value={row.name} onChange={(e) => update({ name: e.target.value })} placeholder="net.ipv4.ip_forward" className="font-mono" />
                      <Input aria-label={t("modal.valueOptional")} value={row.value ?? ""} onChange={(e) => update({ value: e.target.value })} placeholder={t("modal.valueOptional")} className="font-mono" />
                    </>
                  )}
                </RowList>
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
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditMode ? tc("saving") : t("modal.adding")}</>
            ) : isEditMode ? tc("saveChanges") : t("tab.addContainer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
