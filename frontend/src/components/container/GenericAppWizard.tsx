"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { systemSettingsService } from "@/lib/api/system-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { containerService, type ContainerNetworkConfig } from "@/lib/api/container";
import type { WizardProps } from "@/lib/apps-catalog";
import { cn } from "@/lib/utils";

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
  const ic = app.installConfig ?? {};
  const netCfg = ic.network;
  const hasNetwork = !!netCfg;

  const availableModes = useMemo((): NetworkMode[] => {
    if (!netCfg) return [];
    const modes: NetworkMode[] = [];
    if (netCfg.allowHost)              modes.push("host");
    if (netCfg.allowExisting !== false) modes.push("existing");
    if (netCfg.allowNew      !== false) modes.push("new");
    return modes;
  }, [netCfg]);

  const steps = hasNetwork ? ["Basic", "Network", "Deploy"] : ["Basic", "Deploy"];

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
  const [newNetName, setNewNetName] = useState(app.defaultContainerName);
  const [newNetPrefix, setNewNetPrefix] = useState("172.20.0.0/24");

  const [tasks, setTasks] = useState<DeployTask[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  const existingContainerNames = config.containers.map(c => c.name);
  const existingNetNames = config.networks.map(n => n.name);

  // ── Validation ─────────────────────────────────────────────────────────────

  const step1Error = (): string | null => {
    const n = containerName.trim();
    if (!n) return "Container name is required.";
    if (!/^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}$/.test(n)) return "Name must start with a letter or digit, may contain hyphens, and be at most 63 characters.";
    if (existingContainerNames.includes(n)) return `Container "${n}" already exists.`;
    for (const f of ic.fields ?? []) {
      if (f.required && !fieldValues[f.name]?.trim()) return `${f.label} is required.`;
      if (f.type === "number" && fieldValues[f.name] && isNaN(Number(fieldValues[f.name])))
        return `${f.label} must be a number.`;
    }
    return null;
  };

  const step2Error = (): string | null => {
    if (networkMode === "existing" && !existingNetwork) return "Select a network.";
    if (networkMode === "new") {
      if (!newNetName.trim()) return "Network name is required.";
      if (!/^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}$/.test(newNetName.trim())) return "Network name must start with a letter or digit, may contain hyphens, and be at most 63 characters.";
      if (existingNetNames.includes(newNetName.trim())) return `Network "${newNetName.trim()}" already exists.`;
      if (!newNetPrefix.trim()) return "Subnet prefix is required.";
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

  const buildTasks = (): DeployTask[] => {
    const t: DeployTask[] = [];
    if (hasNetwork && networkMode === "new") t.push({ label: `Create network "${newNetName}"`, status: "pending" });
    t.push({ label: `Create directories for "${name}"`, status: "pending" });
    t.push({ label: `Pull image ${app.dockerImage}`, status: "pending" });
    t.push({ label: "Commit container configuration", status: "pending" });
    return t;
  };

  const deploy = async () => {
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
      if (hasNetwork && networkMode === "new") {
        running(idx);
        const net: ContainerNetworkConfig = {
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
        };
        await containerService.createNetwork(net);
        done(idx++);
      }

      running(idx);
      const basePath = `/config/containers/${name}`;
      const resolvedInitFiles = (ic.initFiles ?? []).map(f => resolve(f, resolvedValues));
      const initFileDirs = resolvedInitFiles.map(f => f.substring(0, f.lastIndexOf("/")));
      const allDirs = [...new Set([
        basePath,
        ...(ic.volumes ?? []).map(v => `${basePath}/${v.name}`),
        ...initFileDirs,
      ])];
      const mkResult = await containerService.createContainerDirs(allDirs);
      if (!mkResult.success) {
        fail(idx, mkResult.error || "Failed to create directories.");
        setDeployError("Directory creation failed — see above.");
        return;
      }
      if (resolvedInitFiles.length > 0) {
        const touchResult = await containerService.touchContainerFiles(resolvedInitFiles);
        if (!touchResult.success) {
          fail(idx, touchResult.error || "Failed to create init files.");
          setDeployError("File initialisation failed — see above.");
          return;
        }
      }
      done(idx++);

      running(idx);
      const pullResult = await containerService.pullImage(app.dockerImage);
      if (!pullResult.success) {
        fail(idx, pullResult.error || "Image pull failed.");
        setDeployError("Image pull failed — see above.");
        return;
      }
      done(idx++);

      running(idx);

      const showMac = netCfg?.allowMac && capabilities?.features?.network_attachment_mac?.supported !== false;

      let networks: Array<{ name: string; addresses: string[]; mac: string | null }> = [];
      if (hasNetwork && networkMode !== "host") {
        const netName = networkMode === "existing" ? existingNetwork : newNetName.trim();
        networks = [{ name: netName, addresses: netAddress ? [netAddress] : [], mac: showMac ? (netMac || null) : null }];
      }

      const ports = (hasNetwork && networkMode === "host") ? [] : (ic.ports ?? []).map(p => ({
        name: p.name,
        source: resolve(String(p.source), resolvedValues),
        destination: resolve(String(p.destination), resolvedValues),
        protocol: p.protocol ?? "tcp",
        listen_addresses: p.listenAddresses ?? [],
      }));

      const environments = (ic.environment ?? []).map(e => ({
        name: e.name,
        value: resolve(e.value, resolvedValues),
      }));

      const volumes = (ic.volumes ?? []).map(v => ({
        name: v.name,
        source: `${basePath}/${v.name}`,
        destination: v.destination,
        mode: v.mode ?? null,
        propagation: v.propagation ?? null,
      }));

      const memoryStr = ic.memory ? resolve(ic.memory, resolvedValues) : null;

      const supportsHealthCheck = capabilities?.features?.health_check?.supported !== false;
      const healthCheck = (ic.healthCheck && supportsHealthCheck) ? {
        command:  ic.healthCheck.command  ?? null,
        interval: ic.healthCheck.interval ?? null,
        retry:    ic.healthCheck.retry?.toString() ?? null,
        timeout:  ic.healthCheck.timeout  ?? null,
      } : null;

      const supportsLogDriver = capabilities?.features?.log_driver?.supported !== false;
      const logDriver = (ic.logDriver && supportsLogDriver) ? ic.logDriver : null;

      const supportsTmpfs = capabilities?.features?.tmpfs?.supported !== false;
      const tmpfsMounts = (supportsTmpfs && ic.tmpfs) ? ic.tmpfs.map(t => ({
        name: t.name,
        destination: t.destination,
        size: t.size ?? null,
      })) : [];

      const supportedCapabilities = capabilities?.features?.capabilities?.values ?? [];
      const requestedCapabilities = (ic.capabilities ?? []).filter((cap) => supportedCapabilities.includes(cap));

      await containerService.createContainer({
        name,
        image: app.dockerImage,
        description: ic.description ? resolve(ic.description, resolvedValues) : null,
        disabled: false,
        allow_host_networks: hasNetwork && networkMode === "host",
        allow_host_pid: ic.allowHostPid ?? false,
        privileged: ic.privileged ?? false,
        restart: ic.restart ?? null,
        memory: memoryStr,
        arguments: ic.arguments ? resolve(ic.arguments, resolvedValues) : null,
        command: ic.command ? resolve(ic.command, resolvedValues) : null,
        entrypoint: ic.entrypoint ? resolve(ic.entrypoint, resolvedValues) : null,
        cpu_quota: ic.cpuQuota ? resolve(ic.cpuQuota, resolvedValues) : null,
        shared_memory: ic.sharedMemory ?? null,
        uid: ic.uid ? resolve(ic.uid, resolvedValues) : null,
        gid: ic.gid ? resolve(ic.gid, resolvedValues) : null,
        host_name: ic.hostname ? resolve(ic.hostname, resolvedValues) : null,
        log_driver: logDriver,
        capabilities: requestedCapabilities,
        name_servers: ic.nameServers ?? [],
        devices: (ic.devices ?? []).map(d => ({ name: d.name, source: d.source, destination: d.destination })),
        labels: (ic.labels ?? []).map(l => ({ name: l.name, value: resolve(l.value, resolvedValues) })),
        health_check: healthCheck,
        sysctl_params: (ic.sysctl ?? []).map(s => ({ name: s.name, value: s.value })),
        tmpfs_mounts: tmpfsMounts,
        environments,
        networks,
        ports,
        volumes,
      });
      done(idx++);
      setDeployed(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      if (idx < cur.length) fail(idx, msg);
      setDeployError(msg);
    } finally {
      setDeploying(false);
    }
  };

  // ── Reset on close ─────────────────────────────────────────────────────────

  const handleOpenChange = (o: boolean) => {
    if (deploying) return;
    if (!o) {
      setStep(0);
      setContainerName(app.defaultContainerName);
      setFieldValues(Object.fromEntries((ic.fields ?? []).map(f => [f.name, String(f.default ?? "")])));
      setNetworkMode(initialMode);
      setExistingNetwork(""); setNetAddress(""); setNetMac("");
      setNewNetName(app.defaultContainerName); setNewNetPrefix("172.20.0.0/24");
      setTasks([]); setDeploying(false); setDeployed(false); setDeployError(null);
    }
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
            Install {app.name}
          </DialogTitle>
        </DialogHeader>

        <StepIndicator steps={steps} current={step} />

        <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── Step 0: Basic ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Container Name</Label>
              <Input
                value={containerName}
                onChange={e => setContainerName(e.target.value)}
                className="font-mono"
                placeholder={app.defaultContainerName}
              />
              {containerName && existingContainerNames.includes(containerName.trim()) && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />Name already in use.
                </p>
              )}
            </div>

            {(ic.fields ?? []).map(f => (
              <div key={f.name} className="space-y-1.5">
                <Label>
                  {f.label}
                  {f.required && <span className="text-destructive ml-1">*</span>}
                </Label>

                {f.type === "select" && (
                  <select
                    value={fieldValues[f.name] ?? ""}
                    onChange={e => setFieldValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— Select —</option>
                    {(f.options ?? []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {f.type === "checkbox" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={fieldValues[f.name] === "true"}
                      onChange={e => setFieldValues(prev => ({ ...prev, [f.name]: String(e.target.checked) }))}
                      className="h-4 w-4"
                    />
                    {f.description && (
                      <span className="text-sm text-muted-foreground">{f.description}</span>
                    )}
                  </div>
                )}

                {(f.type === "text" || f.type === "number") && (
                  <Input
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
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Fixed configuration</p>
              <p className="text-xs font-mono text-muted-foreground">Image: {app.dockerImage}</p>
              {ic.restart && <p className="text-xs font-mono text-muted-foreground">Restart: {ic.restart}</p>}
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
                    {mode === "host"     && "Host Networking"}
                    {mode === "existing" && "Use Existing Network"}
                    {mode === "new"      && "Create New Network"}
                  </span>
                  {mode === netCfg?.defaultMode && (
                    <Badge variant="secondary" className="text-xs ml-auto">Recommended</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  {mode === "host"     && "Container shares the host network directly."}
                  {mode === "existing" && "Attach to a VyOS container network already configured."}
                  {mode === "new"      && "Create a new VyOS container network as part of this installation."}
                </p>
              </button>
            ))}

            {networkMode === "existing" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label>Network</Label>
                  <select
                    value={existingNetwork}
                    onChange={e => setExistingNetwork(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                  >
                    <option value="">— Choose a network —</option>
                    {config.networks.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}
                  </select>
                  {config.networks.length === 0 && (
                    <p className="text-xs text-muted-foreground">No networks configured yet.</p>
                  )}
                </div>
                {(netCfg?.allowStaticIp || netCfg?.allowMac) && (
                  <IpMacFields
                    allowStaticIp={netCfg?.allowStaticIp}
                    allowMac={netCfg?.allowMac}
                    capabilities={capabilities}
                    netAddress={netAddress}
                    setNetAddress={setNetAddress}
                    netMac={netMac}
                    setNetMac={setNetMac}
                  />
                )}
              </div>
            )}

            {networkMode === "new" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label>Network Name</Label>
                  <Input
                    value={newNetName}
                    onChange={e => setNewNetName(e.target.value)}
                    className="font-mono"
                    placeholder={app.defaultContainerName}
                  />
                  {newNetName && existingNetNames.includes(newNetName.trim()) && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />Name already in use.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Subnet Prefix</Label>
                  <Input
                    value={newNetPrefix}
                    onChange={e => setNewNetPrefix(e.target.value)}
                    className="font-mono"
                    placeholder="172.20.0.0/24"
                  />
                </div>
                {(netCfg?.allowStaticIp || netCfg?.allowMac) && (
                  <IpMacFields
                    allowStaticIp={netCfg?.allowStaticIp}
                    allowMac={netCfg?.allowMac}
                    capabilities={capabilities}
                    netAddress={netAddress}
                    setNetAddress={setNetAddress}
                    netMac={netMac}
                    setNetMac={setNetMac}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Deploy step ── */}
        {isLastStep && (
          <div className="space-y-4">
            {!deploying && !deployed && tasks.length === 0 && (
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
                <p className="font-semibold">Review</p>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Container</span>
                    <span className="font-mono text-foreground">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Image</span>
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
                      <span>Network</span>
                      <span className="font-mono text-foreground">
                        {networkMode === "host"
                          ? "Host"
                          : networkMode === "existing"
                          ? existingNetwork || "—"
                          : `New — ${newNetName}`}
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
                  {app.name} deployed successfully!
                </p>
              </div>
            )}

            {deployError && !deployed && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{deployError}</p>
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
            {deployed ? "Close" : step === 0 ? "Cancel" : "Back"}
          </Button>

          {!deployed && (
            !isLastStep ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!!err}>
                Next
              </Button>
            ) : (
              <Button onClick={deploy} disabled={deploying}>
                {deploying
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deploying…</>
                  : "Deploy"}
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
  allowMac?: boolean;
  capabilities: import("@/lib/api/container").ContainerCapabilities | null;
  netAddress: string;
  setNetAddress: (v: string) => void;
  netMac: string;
  setNetMac: (v: string) => void;
}

// Extracted to avoid repeating the IP/MAC grid in both "existing" and "new" branches
function IpMacFields({ allowStaticIp, allowMac, capabilities, netAddress, setNetAddress, netMac, setNetMac }: IpMacFieldsProps) {
  const showIp  = allowStaticIp;
  const showMac = allowMac && capabilities?.features?.network_attachment_mac?.supported !== false;

  if (!showIp && !showMac) return null;

  return (
    <div className={cn("grid gap-3", showIp && showMac ? "grid-cols-2" : "grid-cols-1")}>
      {showIp && (
        <div className="space-y-1.5">
          <Label>IP Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            value={netAddress}
            onChange={e => setNetAddress(e.target.value)}
            className="font-mono"
            placeholder="172.20.0.2"
          />
        </div>
      )}
      {showMac && (
        <div className="space-y-1.5">
          <Label>MAC Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            value={netMac}
            onChange={e => setNetMac(e.target.value)}
            className="font-mono"
            placeholder="02:1f:f4:05:ce:00"
          />
        </div>
      )}
    </div>
  );
}
