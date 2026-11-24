"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { systemSettingsService } from "@/lib/api/system-settings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Check, CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  containerService,
  type ContainerInstance,
  type ContainerNetworkConfig,
} from "@/lib/api/container";
import {
  containerNameProblem,
  containerProblem,
  emptyContainer,
  networkNameProblem,
  networkProblem,
} from "@/lib/api/container-save-ops";
import type { ApiError } from "@/lib/types/api";
import type { WizardProps } from "@/lib/apps-catalog";
import { useAppsCatalogText, useLocalizedInstallConfig } from "@/lib/apps-catalog-i18n";
import { cn } from "@/lib/utils";
import { SECTION_LABEL_KEYS } from "./container-form";

type NetworkMode = "host" | "existing" | "new";
type TaskStatus = "pending" | "running" | "done" | "error";
interface DeployTask { label: string; status: TaskStatus; error?: string; }

function resolve(template: string | undefined, values: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\$\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
          <div className="flex items-center gap-2 shrink-0">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
              i < current   ? "bg-primary border-primary text-primary-foreground" :
              i === current ? "border-primary text-primary bg-background" :
                              "border-muted-foreground/30 text-muted-foreground bg-background"
            )}>
              {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={cn("text-sm font-medium",
              i === current ? "text-foreground" : "text-muted-foreground"
            )}>{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("flex-1 h-px mx-2", i < current ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}

function TaskRow({ task }: { task: DeployTask }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 shrink-0">
        {task.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
        {task.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {task.status === "done"    && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {task.status === "error"   && <XCircle className="h-4 w-4 text-destructive" />}
      </div>
      <div>
        <p className={cn("text-sm", task.status === "pending" && "text-muted-foreground")}>{task.label}</p>
        {task.error && <p className="text-xs text-destructive mt-0.5 whitespace-pre-wrap">{task.error}</p>}
      </div>
    </div>
  );
}

export function GenericAppWizard({ open, onOpenChange, config, capabilities, onComplete, app }: WizardProps) {
  const t = useTranslations("containerResources");
  const tm = useTranslations("containers");
  const tc = useTranslations("common");
  const ic = useLocalizedInstallConfig(app);
  const appName = useAppsCatalogText().appName(app);
  const netCfg = ic.network;
  const hasNetwork = !!netCfg;
  const features = capabilities?.features;

  const availableModes = useMemo((): NetworkMode[] => {
    if (!netCfg) return [];
    const modes: NetworkMode[] = [];
    if (netCfg.allowHost)              modes.push("host");
    if (netCfg.allowExisting !== false) modes.push("existing");
    if (netCfg.allowNew      !== false) modes.push("new");
    return modes;
  }, [netCfg]);

  const steps = hasNetwork
    ? [t("wizard.steps.basic"), t("wizard.steps.network"), t("wizard.steps.deploy")]
    : [t("wizard.steps.basic"), t("wizard.steps.deploy")];

  // ── State ──────────────────────────────────────────────────────────────────

  const [step, setStep] = useState(0);
  const [containerName, setContainerName] = useState(app.defaultContainerName);

  const defaultFieldValues = useMemo(
    () => Object.fromEntries((ic.fields ?? []).map(f => [f.name, String(f.default ?? "")])),
    [ic.fields]
  );

  const [fieldValues, setFieldValues] = useState<Record<string, string>>(defaultFieldValues);

  useEffect(() => {
    if (!open) return;

    type SystemTimeConfig = { time_zone?: string | null; timezone?: string | null };
    let active = true;

    systemSettingsService
      .getConfig()
      .then((config) => {
        if (!active) return;
        const tz = (config as SystemTimeConfig).time_zone ?? (config as SystemTimeConfig).timezone;
        if (!tz) return;

        setFieldValues((current) => {
          const field = ic.fields?.find((f) => f.name === "timezone");
          if (!field) return current;
          const previousValue = current["timezone"] ?? "";
          const defaultValue = String(field.default ?? "");
          if (previousValue === "" || previousValue === defaultValue) {
            return { ...current, timezone: tz };
          }
          return current;
        });
      })
      .catch(() => {
        // ignore config fetch errors; just keep existing defaults
      });

    return () => {
      active = false;
    };
  }, [open, ic.fields]);

  const initialMode: NetworkMode = (netCfg?.defaultMode as NetworkMode | undefined) ?? availableModes[0] ?? "existing";
  const [networkMode, setNetworkMode] = useState<NetworkMode>(initialMode);
  const [existingNetwork, setExistingNetwork] = useState("");
  const [netAddress, setNetAddress] = useState("");
  const [netMac, setNetMac] = useState("");
  const [newNetName, setNewNetName] = useState(app.defaultContainerName.slice(0, 11));
  const [newNetPrefix, setNewNetPrefix] = useState("172.20.0.0/24");

  const [tasks, setTasks] = useState<DeployTask[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  const existingContainerNames = config.containers.map(c => c.name);
  const existingNetNames = config.networks.map(n => n.name);
  const showMac = !!netCfg?.allowMac && !!features?.network_mac;

  // ── Validation ─────────────────────────────────────────────────────────────

  const step1Error = (): string | null => {
    const nameIssue = containerNameProblem(containerName, existingContainerNames);
    if (nameIssue) return tm(`problems.${nameIssue.key}`, nameIssue.values);
    for (const f of ic.fields ?? []) {
      if (f.required && !fieldValues[f.name]?.trim()) return t("wizard.fieldRequired", { label: f.label });
      if (f.type === "number" && fieldValues[f.name] && isNaN(Number(fieldValues[f.name])))
        return t("wizard.fieldNumber", { label: f.label });
    }
    return null;
  };

  const step2Error = (): string | null => {
    if (networkMode === "existing" && !existingNetwork) return t("wizard.selectNetwork");
    if (networkMode === "new") {
      const nameIssue = networkNameProblem(newNetName, existingNetNames);
      if (nameIssue) return t(`networkProblems.${nameIssue.key}`, nameIssue.values);
      if (!newNetPrefix.trim()) return t("wizard.subnetRequired");
    }
    return null;
  };

  const currentStepError = (): string | null => {
    if (step === 0) return step1Error();
    if (hasNetwork && step === 1) return step2Error();
    return null;
  };

  // ── Deploy ─────────────────────────────────────────────────────────────────

  const name = containerName.trim();
  const resolvedValues: Record<string, string> = { ...fieldValues, containerName: name };
  const basePath = `/config/containers/${name}`;

  const buildNetwork = (): ContainerNetworkConfig => ({
    name: newNetName.trim(),
    description: `Created by ${app.name} wizard`,
    gateways: [],
    mtu: null,
    no_name_server: false,
    prefixes: [newNetPrefix.trim()],
    network_type: null,
    macvlan_mode: null,
    macvlan_parent: null,
    vrf: null,
  });

  const buildContainer = (): ContainerInstance => {
    const supports = features ?? null;
    const networks: ContainerInstance["networks"] = [];
    if (hasNetwork && networkMode !== "host") {
      networks.push({
        name: networkMode === "existing" ? existingNetwork : newNetName.trim(),
        addresses: netAddress.trim() ? [netAddress.trim()] : [],
        mac: showMac ? netMac.trim() : "",
      });
    }
    const ports = (hasNetwork && networkMode === "host") ? [] : (ic.ports ?? []).map(p => ({
      name: p.name,
      source: resolve(String(p.source), resolvedValues),
      destination: resolve(String(p.destination), resolvedValues),
      protocol: p.protocol ?? "tcp",
      listen_addresses: p.listenAddresses ?? [],
    }));
    const supportedCapabilities = capabilities?.values.capabilities || [];
    const health = ic.healthCheck;
    return {
      ...emptyContainer(name),
      image: app.dockerImage,
      description: ic.description ? resolve(ic.description, resolvedValues) : null,
      allow_host_networks: hasNetwork && networkMode === "host",
      allow_host_pid: ic.allowHostPid ?? false,
      privileged: ic.privileged ?? false,
      restart: ic.restart ?? null,
      memory: ic.memory ? resolve(ic.memory, resolvedValues) : null,
      arguments: ic.arguments ? resolve(ic.arguments, resolvedValues) : null,
      command: ic.command ? resolve(ic.command, resolvedValues) : null,
      entrypoint: ic.entrypoint ? resolve(ic.entrypoint, resolvedValues) : null,
      cpu_quota: ic.cpuQuota ? resolve(ic.cpuQuota, resolvedValues) : null,
      shared_memory: ic.sharedMemory ?? null,
      uid: ic.uid ? resolve(ic.uid, resolvedValues) : null,
      gid: ic.gid ? resolve(ic.gid, resolvedValues) : null,
      host_name: ic.hostname ? resolve(ic.hostname, resolvedValues) : null,
      log_driver: ic.logDriver && supports?.log_driver ? ic.logDriver : null,
      health_check: health && supports?.health_check
        ? {
            command: health.command ?? null,
            interval: health.interval ?? null,
            retry: health.retry != null ? String(health.retry) : null,
            timeout: health.timeout ?? null,
          }
        : null,
      capabilities: (ic.capabilities ?? []).filter((cap) => supportedCapabilities.includes(cap)),
      name_servers: ic.nameServers ?? [],
      devices: (ic.devices ?? []).map(d => ({ name: d.name, source: d.source, destination: d.destination })),
      labels: (ic.labels ?? []).map(l => ({ name: l.name, value: resolve(l.value, resolvedValues) })),
      sysctl_params: (ic.sysctl ?? []).map(s => ({ name: s.name, value: s.value })),
      tmpfs_mounts: supports?.tmpfs && ic.tmpfs
        ? ic.tmpfs.map(m => ({ name: m.name, destination: m.destination, size: m.size ?? null }))
        : [],
      environments: (ic.environment ?? []).map(e => ({ name: e.name, value: resolve(e.value, resolvedValues) })),
      networks,
      ports,
      volumes: (ic.volumes ?? []).map(v => ({
        name: v.name,
        source: `${basePath}/${v.name}`,
        destination: v.destination,
        mode: v.mode ?? null,
        propagation: v.propagation ?? null,
      })),
    };
  };

  const buildTasks = (): DeployTask[] => {
    const list: DeployTask[] = [];
    if (hasNetwork && networkMode === "new") list.push({ label: t("wizard.taskCreateNetwork", { name: newNetName }), status: "pending" });
    list.push({ label: t("wizard.taskCreateDirs", { name }), status: "pending" });
    list.push({ label: t("wizard.taskPullImage", { image: app.dockerImage }), status: "pending" });
    list.push({ label: t("wizard.taskCommit"), status: "pending" });
    return list;
  };

  const deploy = async () => {
    if (!capabilities) return;
    const creatingNetwork = hasNetwork && networkMode === "new";
    const net = buildNetwork();
    const draft = buildContainer();

    // Check both objects before anything changes on the router.
    if (creatingNetwork) {
      const netIssue = networkProblem(null, net, { features: capabilities.features, existingNames: existingNetNames });
      if (netIssue) {
        setDeployError(t(`networkProblems.${netIssue.key}`, netIssue.values));
        return;
      }
    }
    const issue = containerProblem(null, draft, {
      features: capabilities.features,
      existingNames: existingContainerNames,
      networks: creatingNetwork ? [...config.networks, net] : config.networks,
      values: capabilities.values,
    });
    if (issue) {
      setDeployError(tm(`problems.${issue.key}`, {
        ...issue.values,
        section: issue.section ? tm(SECTION_LABEL_KEYS[issue.section]) : "",
      }));
      return;
    }

    const initial = buildTasks();
    setTasks(initial);
    setDeploying(true);
    setDeployError(null);

    let idx = 0;
    let cur = [...initial];
    const running = (i: number) => { cur = cur.map((t, j) => j === i ? { ...t, status: "running" as TaskStatus } : t); setTasks([...cur]); };
    const done    = (i: number) => { cur = cur.map((t, j) => j === i ? { ...t, status: "done"    as TaskStatus } : t); setTasks([...cur]); };
    const fail    = (i: number, err: string) => { cur = cur.map((t, j) => j === i ? { ...t, status: "error"   as TaskStatus, error: err } : t); setTasks([...cur]); };

    try {
      if (creatingNetwork) {
        running(idx);
        await containerService.saveNetwork(null, net, capabilities.features);
        done(idx++);
      }

      running(idx);
      const resolvedInitFiles = (ic.initFiles ?? []).map(f => resolve(f, resolvedValues));
      const initFileDirs = resolvedInitFiles.map(f => f.substring(0, f.lastIndexOf("/")));
      const allDirs = [...new Set([
        basePath,
        ...(ic.volumes ?? []).map(v => `${basePath}/${v.name}`),
        ...initFileDirs,
      ])];
      const mkResult = await containerService.createContainerDirs(allDirs);
      if (!mkResult.success) {
        fail(idx, mkResult.error || t("wizard.createDirsFailed"));
        setDeployError(t("wizard.dirCreationFailed"));
        return;
      }
      if (resolvedInitFiles.length > 0) {
        const touchResult = await containerService.touchContainerFiles(resolvedInitFiles);
        if (!touchResult.success) {
          fail(idx, touchResult.error || t("wizard.initFilesFailed"));
          setDeployError(t("wizard.fileInitFailed"));
          return;
        }
      }
      done(idx++);

      running(idx);
      const pullResult = await containerService.pullImage(app.dockerImage);
      if (!pullResult.success) {
        fail(idx, pullResult.error || t("wizard.pullFailed"));
        setDeployError(t("wizard.pullFailedSeeAbove"));
        return;
      }
      done(idx++);

      running(idx);
      await containerService.saveContainer(null, draft, capabilities.features);
      done(idx++);
      setDeployed(true);
    } catch (err: unknown) {
      const msg = (err as ApiError).message || t("wizard.unexpectedError");
      if (idx < cur.length) fail(idx, msg);
      setDeployError(msg);
    } finally {
      setDeploying(false);
    }
  };

  // The parent unmounts the wizard on close, so the next install starts fresh.
  const handleOpenChange = (o: boolean) => {
    if (deploying) return;
    onOpenChange(o);
  };

  const isLastStep = step === steps.length - 1;
  const err = currentStepError();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {app.iconPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={app.iconPath} alt="" className="h-6 w-6" />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
                {app.name[0].toUpperCase()}
              </span>
            )}
            {t("wizard.title", { name: appName })}
          </DialogTitle>
        </DialogHeader>

        <StepIndicator steps={steps} current={step} />

        <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── Step 0: Basic ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wiz-name">{t("wizard.containerName")}</Label>
              <Input
                id="wiz-name"
                value={containerName}
                onChange={e => setContainerName(e.target.value)}
                className="font-mono"
                placeholder={app.defaultContainerName}
              />
              {containerName && existingContainerNames.includes(containerName.trim()) && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{t("wizard.nameInUse")}
                </p>
              )}
            </div>

            {(ic.fields ?? []).map(f => (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={`wiz-field-${f.name}`}>
                  {f.label}
                  {f.required && <span className="text-destructive ml-1">*</span>}
                </Label>

                {f.type === "select" && (
                  <NamedListSelect
                    id={`wiz-field-${f.name}`}
                    value={fieldValues[f.name] ?? ""}
                    names={f.options ?? []}
                    labels={f.optionLabels}
                    onValueChange={v => setFieldValues(prev => ({ ...prev, [f.name]: v }))}
                    noneLabel={t("wizard.selectOption")}
                  />
                )}

                {f.type === "checkbox" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`wiz-field-${f.name}`}
                      checked={fieldValues[f.name] === "true"}
                      onCheckedChange={v => setFieldValues(prev => ({ ...prev, [f.name]: String(v === true) }))}
                    />
                    {f.description && (
                      <span className="text-sm text-muted-foreground">{f.description}</span>
                    )}
                  </div>
                )}

                {f.type === "interface" && (
                  <InterfaceSelect
                    id={`wiz-field-${f.name}`}
                    value={fieldValues[f.name] ?? ""}
                    onValueChange={v => setFieldValues(prev => ({ ...prev, [f.name]: v }))}
                  />
                )}

                {(f.type === "text" || f.type === "number") && (
                  <Input
                    id={`wiz-field-${f.name}`}
                    type={f.type}
                    value={fieldValues[f.name] ?? ""}
                    onChange={e => setFieldValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                )}

                {f.description && f.type !== "checkbox" && (
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                )}
              </div>
            ))}

            <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">{t("wizard.fixedConfig")}</p>
              <p className="text-xs font-mono text-muted-foreground">{t("wizard.fixedImage", { image: app.dockerImage })}</p>
              {ic.restart && <p className="text-xs font-mono text-muted-foreground">{t("wizard.fixedRestart", { restart: ic.restart })}</p>}
              {(ic.volumes ?? []).map(v => (
                <p key={v.name} className="text-xs font-mono text-muted-foreground">
                  /config/containers/{containerName || "…"}/{v.name} → {v.destination}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1: Network ── */}
        {hasNetwork && step === 1 && (
          <div className="space-y-3">
            {availableModes.map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setNetworkMode(mode)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  networkMode === mode
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={cn(
                    "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    networkMode === mode ? "border-primary" : "border-muted-foreground/50"
                  )}>
                    {networkMode === mode && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <span className="font-medium text-sm">
                    {mode === "host"     && t("wizard.modeHost")}
                    {mode === "existing" && t("wizard.modeExisting")}
                    {mode === "new"      && t("wizard.modeNew")}
                  </span>
                  {mode === netCfg?.defaultMode && (
                    <Badge variant="secondary" className="text-xs ml-auto">{t("wizard.recommended")}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  {mode === "host"     && t("wizard.modeHostHelp")}
                  {mode === "existing" && t("wizard.modeExistingHelp")}
                  {mode === "new"      && t("wizard.modeNewHelp")}
                </p>
              </button>
            ))}

            {networkMode === "existing" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-network">{t("wizard.network")}</Label>
                  <NamedListSelect
                    id="wiz-network"
                    value={existingNetwork}
                    names={existingNetNames}
                    onValueChange={setExistingNetwork}
                    noneLabel={t("wizard.chooseNetwork")}
                  />
                  {config.networks.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t("wizard.noNetworksYet")}</p>
                  )}
                </div>
                <IpMacFields
                  allowStaticIp={netCfg?.allowStaticIp}
                  showMac={showMac}
                  netAddress={netAddress}
                  setNetAddress={setNetAddress}
                  netMac={netMac}
                  setNetMac={setNetMac}
                />
              </div>
            )}

            {networkMode === "new" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-new-net">{t("wizard.networkName")}</Label>
                  <Input
                    id="wiz-new-net"
                    value={newNetName}
                    onChange={e => setNewNetName(e.target.value)}
                    maxLength={11}
                    className="font-mono"
                    placeholder={app.defaultContainerName.slice(0, 11)}
                  />
                  {newNetName && existingNetNames.includes(newNetName.trim()) && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{t("wizard.nameInUse")}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-new-prefix">{t("wizard.subnetPrefix")}</Label>
                  <Input
                    id="wiz-new-prefix"
                    value={newNetPrefix}
                    onChange={e => setNewNetPrefix(e.target.value)}
                    className="font-mono"
                    placeholder="172.20.0.0/24"
                  />
                </div>
                <IpMacFields
                  allowStaticIp={netCfg?.allowStaticIp}
                  showMac={showMac}
                  netAddress={netAddress}
                  setNetAddress={setNetAddress}
                  netMac={netMac}
                  setNetMac={setNetMac}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Deploy step ── */}
        {isLastStep && (
          <div className="space-y-4">
            {!deploying && !deployed && tasks.length === 0 && (
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
                <p className="font-semibold">{t("wizard.review")}</p>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{t("wizard.container")}</span>
                    <span className="font-mono text-foreground">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("wizard.image")}</span>
                    <span className="font-mono text-foreground text-xs truncate max-w-[55%]">{app.dockerImage}</span>
                  </div>
                  {(ic.fields ?? []).map(f => (
                    <div key={f.name} className="flex justify-between">
                      <span>{f.label}</span>
                      <span className="font-mono text-foreground">{fieldValues[f.name] || "—"}</span>
                    </div>
                  ))}
                  {hasNetwork && (
                    <div className="flex justify-between">
                      <span>{t("wizard.network")}</span>
                      <span className="font-mono text-foreground">
                        {networkMode === "host"
                          ? t("wizard.host")
                          : networkMode === "existing"
                          ? existingNetwork || "—"
                          : t("wizard.newNetwork", { name: newNetName })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tasks.length > 0 && (
              <div className="divide-y rounded-lg border">
                {tasks.map((task, i) => (
                  <div key={i} className="px-4"><TaskRow task={task} /></div>
                ))}
              </div>
            )}

            {deployed && (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  {t("wizard.deployed", { name: appName })}
                </p>
              </div>
            )}

            {deployError && !deployed && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive whitespace-pre-wrap">{deployError}</p>
              </div>
            )}
          </div>
        )}

        </div>{/* end scrollable area */}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => {
              if (deployed) { handleOpenChange(false); onComplete(); return; }
              if (step === 0) handleOpenChange(false);
              else setStep(s => s - 1);
            }}
            disabled={deploying}
          >
            {deployed ? tc("close") : step === 0 ? tc("cancel") : t("wizard.back")}
          </Button>

          {!deployed && (
            !isLastStep ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!!err}>
                {t("wizard.next")}
              </Button>
            ) : (
              <Button onClick={deploy} disabled={deploying || !capabilities}>
                {deploying
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("wizard.deploying")}</>
                  : t("wizard.deploy")}
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface IpMacFieldsProps {
  allowStaticIp?: boolean;
  showMac: boolean;
  netAddress: string;
  setNetAddress: (v: string) => void;
  netMac: string;
  setNetMac: (v: string) => void;
}

/** The optional static address and MAC of the attachment, shared by the existing and new network branches. */
function IpMacFields({ allowStaticIp, showMac, netAddress, setNetAddress, netMac, setNetMac }: IpMacFieldsProps) {
  const t = useTranslations("containerResources");
  if (!allowStaticIp && !showMac) return null;

  return (
    <div className="grid gap-3 grid-cols-1">
      {allowStaticIp && (
        <div className="space-y-1.5">
          <Label htmlFor="wiz-address">{t("wizard.ipAddress")} <span className="text-muted-foreground font-normal">{t("wizard.optionalSuffix")}</span></Label>
          <Input
            id="wiz-address"
            value={netAddress}
            onChange={e => setNetAddress(e.target.value)}
            className="font-mono"
            placeholder="172.20.0.2"
          />
        </div>
      )}
      {showMac && (
        <div className="space-y-1.5">
          <Label htmlFor="wiz-mac">{t("wizard.macAddress")} <span className="text-muted-foreground font-normal">{t("wizard.optionalSuffix")}</span></Label>
          <Input
            id="wiz-mac"
            value={netMac}
            onChange={e => setNetMac(e.target.value)}
            className="font-mono"
            placeholder="02:00:00:00:00:01"
          />
        </div>
      )}
    </div>
  );
}
