"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Edit2, FolderOpen, Info, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  systemSettingsService,
  type ArchiveFile,
  type SystemConfig,
  type SystemCapabilities,
  type FrrBmpTarget,
} from "@/lib/api/system-settings";
import { useToast } from "@/hooks/useToast";

const FRR_PROFILES = ["datacenter", "traditional"];

const COUNTRY_CODES = [
  "AU", "AT", "BE", "BR", "CA", "CN", "DK", "FI", "FR", "DE", "GR", "HK",
  "HU", "IN", "IE", "IL", "IT", "JP", "NL", "NZ", "NO", "PL", "PT", "RU",
  "SG", "ZA", "KR", "ES", "SE", "CH", "TW", "TR", "GB", "US",
];

interface Props {
  config: SystemConfig;
  capabilities: SystemCapabilities;
  isReadOnly: boolean;
  onRefresh: () => void;
}

export function AdvancedPanel({ config, capabilities, isReadOnly, onRefresh }: Props) {
  const { toast } = useToast();
  const { features } = capabilities;

  // Config management
  const [editingCm, setEditingCm] = useState(false);
  const [cmRevisions, setCmRevisions] = useState(
    config.config_management.commit_revisions ? String(config.config_management.commit_revisions) : ""
  );
  const [archiveInput, setArchiveInput] = useState("");
  const [cmSaving, setCmSaving] = useState(false);
  const [cmError, setCmError] = useState<string | null>(null);
  const [deleteArchiveTarget, setDeleteArchiveTarget] = useState<string | null>(null);
  const [deletingArchive, setDeletingArchive] = useState(false);

  // Archive restore
  const [browseArchiveTarget, setBrowseArchiveTarget] = useState<string | null>(null);
  const [archiveFiles, setArchiveFiles] = useState<ArchiveFile[]>([]);
  const [archiveFilesLoading, setArchiveFilesLoading] = useState(false);
  const [archiveFilesError, setArchiveFilesError] = useState<string | null>(null);
  const [selectedArchiveFile, setSelectedArchiveFile] = useState<string | null>(null);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [manualFilename, setManualFilename] = useState("");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Sysctl
  const [addingSysctl, setAddingSysctl] = useState(false);
  const [sysctlParam, setSysctlParam] = useState("");
  const [sysctlValue, setSysctlValue] = useState("");
  const [sysctlSaving, setSysctlSaving] = useState(false);
  const [sysctlError, setSysctlError] = useState<string | null>(null);
  const [deleteSysctlTarget, setDeleteSysctlTarget] = useState<string | null>(null);
  const [deletingSysctl, setDeletingSysctl] = useState(false);

  // Console devices
  const [editingConsole, setEditingConsole] = useState<string | null>(null); // device name being edited
  const [consoleSpeed, setConsoleSpeed] = useState("");
  const [consolePowersave, setConsolePowersave] = useState(false);
  const [consoleSaving, setConsoleSaving] = useState(false);
  const [consoleError, setConsoleError] = useState<string | null>(null);

  // Watchdog (1.5)
  const [editingWd, setEditingWd] = useState(false);
  const [wdTimeout, setWdTimeout] = useState(
    config.watchdog?.timeout ? String(config.watchdog.timeout) : ""
  );
  const [wdReboot, setWdReboot] = useState(
    config.watchdog?.reboot_timeout ? String(config.watchdog.reboot_timeout) : ""
  );
  const [wdSaving, setWdSaving] = useState(false);
  const [wdError, setWdError] = useState<string | null>(null);

  // Wireless country (1.5)
  const [wirelessCode, setWirelessCode] = useState(config.wireless_country_code ?? "");
  const [wirelessSaving, setWirelessSaving] = useState(false);

  // FRR profile (1.5)
  const [frrProfile, setFrrProfile] = useState(config.frr?.profile ?? "");
  const [frrSaving, setFrrSaving] = useState(false);

  // FRR BMP targets
  const [addingBmpTarget, setAddingBmpTarget] = useState(false);
  const [bmpName, setBmpName] = useState("");
  const [bmpAddress, setBmpAddress] = useState("");
  const [bmpPort, setBmpPort] = useState("");
  const [bmpSaving, setBmpSaving] = useState(false);
  const [bmpError, setBmpError] = useState<string | null>(null);
  const [deleteBmpTarget, setDeleteBmpTarget] = useState<FrrBmpTarget | null>(null);
  const [deletingBmp, setDeletingBmp] = useState(false);

  // Kernel Options
  const kern = config.options?.kernel;
  const resLimits = config.options?.resource_limits;
  const [editingKernel, setEditingKernel] = useState(false);
  const [kDisableHpet, setKDisableHpet] = useState(kern?.disable_hpet ?? false);
  const [kDisableMce, setKDisableMce] = useState(kern?.disable_mce ?? false);
  const [kDisableSoftlockup, setKDisableSoftlockup] = useState(kern?.disable_softlockup ?? false);
  const [kDisableNmiWatchdog, setKDisableNmiWatchdog] = useState(kern?.cpu?.disable_nmi_watchdog ?? false);
  const [kIsolateCpus, setKIsolateCpus] = useState(kern?.cpu?.isolate_cpus ?? "");
  const [kNohzFull, setKNohzFull] = useState(kern?.cpu?.nohz_full ?? "");
  const [kRcuNoCbs, setKRcuNoCbs] = useState(kern?.cpu?.rcu_no_cbs ?? "");
  const [kDisableNumaBalancing, setKDisableNumaBalancing] = useState(kern?.memory?.disable_numa_balancing ?? false);
  const [kDefaultHugepageSize, setKDefaultHugepageSize] = useState(kern?.memory?.default_hugepage_size ?? "");
  const [kHugepageSize, setKHugepageSize] = useState(kern?.memory?.hugepage_size ?? "");
  const [kMaxMapCount, setKMaxMapCount] = useState(resLimits?.max_map_count ? String(resLimits.max_map_count) : "");
  const [kShmmax, setKShmmax] = useState(resLimits?.shmmax ? String(resLimits.shmmax) : "");
  const [kernelSaving, setKernelSaving] = useState(false);
  const [kernelError, setKernelError] = useState<string | null>(null);

  // System Options
  const opts = config.options;
  const [editingOpts, setEditingOpts] = useState(false);
  const [optKeyboard, setOptKeyboard] = useState(opts?.keyboard_layout ?? "");
  const [optTimeFormat, setOptTimeFormat] = useState(opts?.time_format ?? "");
  const [optCtrlAlt, setOptCtrlAlt] = useState(opts?.ctrl_alt_delete ?? "");
  const [optStartupBeep, setOptStartupBeep] = useState(opts?.startup_beep ?? false);
  const [optUsbAutosuspend, setOptUsbAutosuspend] = useState(opts?.disable_usb_autosuspend ?? false);
  const [optRebootOnPanic, setOptRebootOnPanic] = useState(opts?.reboot_on_panic ?? false);
  const [optRootResize, setOptRootResize] = useState(opts?.root_partition_auto_resize ?? false);
  const [optRebootUpgrade, setOptRebootUpgrade] = useState(opts?.reboot_on_upgrade_failure ?? false);
  const [optHttpAddr, setOptHttpAddr] = useState(opts?.http_client?.source_address ?? "");
  const [optHttpIface, setOptHttpIface] = useState(opts?.http_client?.source_interface ?? "");
  const [optSshAddr, setOptSshAddr] = useState(opts?.ssh_client?.source_address ?? "");
  const [optSshIface, setOptSshIface] = useState(opts?.ssh_client?.source_interface ?? "");
  const [optsSaving, setOptsSaving] = useState(false);
  const [optsError, setOptsError] = useState<string | null>(null);

  // Proxy
  const px = config.proxy;
  const [editingProxy, setEditingProxy] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(px?.url ?? "");
  const [proxyPort, setProxyPort] = useState(px?.port ? String(px.port) : "");
  const [proxyUsername, setProxyUsername] = useState(px?.username ?? "");
  const [proxyNoProxyInput, setProxyNoProxyInput] = useState("");
  const [proxySaving, setProxySaving] = useState(false);
  const [proxyError, setProxyError] = useState<string | null>(null);

  // Logs / logrotate
  const [editingLogs, setEditingLogs] = useState(false);
  const [logAtopSize, setLogAtopSize] = useState(config.logs?.atop?.max_size ? String(config.logs.atop.max_size) : "");
  const [logAtopRotate, setLogAtopRotate] = useState(config.logs?.atop?.rotate_count ? String(config.logs.atop.rotate_count) : "");
  const [logMsgSize, setLogMsgSize] = useState(config.logs?.messages?.max_size ? String(config.logs.messages.max_size) : "");
  const [logMsgRotate, setLogMsgRotate] = useState(config.logs?.messages?.rotate_count ? String(config.logs.messages.rotate_count) : "");
  const [logsSaving, setLogsSaving] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Update check
  const [editingUc, setEditingUc] = useState(false);
  const [ucUrl, setUcUrl] = useState(config.update_check?.url ?? "");
  const [ucAuto, setUcAuto] = useState(config.update_check?.auto_install ?? false);
  const [ucSaving, setUcSaving] = useState(false);
  const [ucError, setUcError] = useState<string | null>(null);

  // Config Management handlers
  const handleSaveCm = async () => {
    setCmSaving(true);
    setCmError(null);
    try {
      if (cmRevisions && parseInt(cmRevisions, 10) !== config.config_management.commit_revisions) {
        const r = await systemSettingsService.setCommitRevisions(parseInt(cmRevisions, 10));
        if (!r.success) { setCmError(r.error ?? "Failed"); return; }
      }
      toast.success("Config management saved");
      setEditingCm(false);
      onRefresh();
    } catch {
      setCmError("An unexpected error occurred");
    } finally {
      setCmSaving(false);
    }
  };

  const handleAddArchive = async () => {
    const url = archiveInput.trim();
    if (!url) return;
    setCmSaving(true);
    try {
      const r = await systemSettingsService.addArchiveLocation(url);
      if (!r.success) {
        toast.error("Failed", r.error ?? "Could not add archive location");
      } else {
        toast.success("Archive location added");
        setArchiveInput("");
        onRefresh();
      }
    } catch {
      toast.error("Error", "An unexpected error occurred");
    } finally {
      setCmSaving(false);
    }
  };

  const handleDeleteArchive = async () => {
    if (!deleteArchiveTarget) return;
    setDeletingArchive(true);
    try {
      const r = await systemSettingsService.deleteArchiveLocation(deleteArchiveTarget);
      if (!r.success) {
        toast.error("Failed", r.error ?? "Could not remove archive location");
      } else {
        toast.success("Archive location removed");
        onRefresh();
      }
    } catch {
      toast.error("Error", "An unexpected error occurred");
    } finally {
      setDeletingArchive(false);
      setDeleteArchiveTarget(null);
    }
  };

  // Archive restore handlers
  const handleBrowseArchive = async (location: string) => {
    setBrowseArchiveTarget(location);
    setArchiveFiles([]);
    setArchiveFilesError(null);
    setSelectedArchiveFile(null);
    setArchiveSearch("");
    setManualFilename("");
    setConfirmRestore(false);
    setArchiveFilesLoading(true);
    try {
      const resp = await systemSettingsService.listArchiveFiles(location);
      setArchiveFiles(resp.files);
      if (resp.files.length === 0) {
        setArchiveFilesError("No backup files found or directory listing not supported for this protocol.");
      }
    } catch {
      setArchiveFilesError("Failed to list files at this archive location.");
    } finally {
      setArchiveFilesLoading(false);
    }
  };

  const getRestoreFilename = (): string | null => {
    if (selectedArchiveFile) return selectedArchiveFile;
    const manual = manualFilename.trim();
    if (manual && /^config\.boot[\w.\-]*$/.test(manual)) return manual;
    return null;
  };

  const handleRestore = async () => {
    const filename = getRestoreFilename();
    if (!browseArchiveTarget || !filename) return;
    setRestoring(true);
    try {
      const r = await systemSettingsService.restoreFromArchive(browseArchiveTarget, filename);
      if (!r.success) {
        toast.error("Restore failed", r.error ?? "Could not restore configuration");
      } else {
        toast.success("Configuration restored successfully");
        setBrowseArchiveTarget(null);
        onRefresh();
      }
    } catch {
      toast.error("Error", "An unexpected error occurred during restore");
    } finally {
      setRestoring(false);
      setConfirmRestore(false);
    }
  };

  const maskCredentials = (url: string): string => {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        parsed.password = "***";
      }
      return parsed.toString();
    } catch {
      return url.replace(/:([^@/]+)@/, ":***@");
    }
  };

  // Sysctl handlers
  const handleAddSysctl = async () => {
    setSysctlSaving(true);
    setSysctlError(null);
    try {
      if (!sysctlParam.trim() || !sysctlValue.trim()) {
        setSysctlError("Parameter and value are required.");
        return;
      }
      const r = await systemSettingsService.setSysctlParameter(sysctlParam.trim(), sysctlValue.trim());
      if (!r.success) {
        setSysctlError(r.error ?? "Failed");
      } else {
        toast.success("Sysctl parameter set");
        setSysctlParam("");
        setSysctlValue("");
        setAddingSysctl(false);
        onRefresh();
      }
    } catch {
      setSysctlError("An unexpected error occurred");
    } finally {
      setSysctlSaving(false);
    }
  };

  const handleDeleteSysctl = async () => {
    if (!deleteSysctlTarget) return;
    setDeletingSysctl(true);
    try {
      const r = await systemSettingsService.deleteSysctlParameter(deleteSysctlTarget);
      if (!r.success) {
        toast.error("Failed", r.error ?? "Could not delete parameter");
      } else {
        toast.success("Parameter removed");
        onRefresh();
      }
    } catch {
      toast.error("Error", "An unexpected error occurred");
    } finally {
      setDeletingSysctl(false);
      setDeleteSysctlTarget(null);
    }
  };

  // Console device handlers
  const handleSaveConsoleDevice = async () => {
    if (!editingConsole) return;
    setConsoleSaving(true);
    setConsoleError(null);
    try {
      const currentDevice = config.console_devices.find((d) => d.device === editingConsole);
      const speedChanged = consoleSpeed !== (currentDevice?.speed ?? "");
      const powersaveChanged = consolePowersave !== (currentDevice?.powersave ?? false);

      if (speedChanged) {
        const r = await systemSettingsService.setConsoleSpeed(editingConsole, consoleSpeed);
        if (!r.success) {
          setConsoleError(r.error ?? "Failed to update speed");
          return;
        }
      }
      if (powersaveChanged) {
        const r = await systemSettingsService.setConsolePowersave(consolePowersave);
        if (!r.success) {
          setConsoleError(r.error ?? "Failed to update powersave");
          return;
        }
      }

      toast.success("Console device updated");
      setEditingConsole(null);
      onRefresh();
    } catch {
      setConsoleError("An unexpected error occurred");
    } finally {
      setConsoleSaving(false);
    }
  };

  // Watchdog handlers
  const handleSaveWatchdog = async () => {
    setWdSaving(true);
    setWdError(null);
    try {
      const timeoutVal = wdTimeout ? parseInt(wdTimeout, 10) : null;
      const rebootVal = wdReboot ? parseInt(wdReboot, 10) : null;
      const timeoutChanged = timeoutVal !== (config.watchdog?.timeout ?? null);
      const rebootChanged = rebootVal !== (config.watchdog?.reboot_timeout ?? null);

      if (!timeoutChanged && !rebootChanged) {
        setEditingWd(false);
        return;
      }

      const result = await systemSettingsService.updateWatchdogSettings({
        timeout: timeoutChanged && timeoutVal !== null ? timeoutVal : undefined,
        clearTimeout: timeoutChanged && timeoutVal === null,
        rebootTimeout: rebootChanged && rebootVal !== null ? rebootVal : undefined,
        clearRebootTimeout: rebootChanged && rebootVal === null,
      });

      if (!result.success) {
        setWdError(result.error ?? "Failed to save watchdog settings");
        return;
      }

      toast.success("Watchdog settings saved");
      setEditingWd(false);
      onRefresh();
    } catch {
      setWdError("An unexpected error occurred");
    } finally {
      setWdSaving(false);
    }
  };

  // Wireless handler
  const handleSaveWireless = async () => {
    setWirelessSaving(true);
    try {
      const r = wirelessCode
        ? await systemSettingsService.setWirelessCountryCode(wirelessCode)
        : await systemSettingsService.deleteWirelessCountryCode();
      if (!r.success) {
        toast.error("Failed", r.error ?? "Could not update wireless country");
      } else {
        toast.success("Wireless country code updated");
        onRefresh();
      }
    } catch {
      toast.error("Error", "An unexpected error occurred");
    } finally {
      setWirelessSaving(false);
    }
  };

  // System Options handler
  const handleSaveOptions = async () => {
    setOptsSaving(true);
    setOptsError(null);
    try {
      const prev = opts;
      const ops: Array<() => Promise<{ success: boolean; error?: string | null }>> = [];

      // Keyboard layout
      const kb = optKeyboard.trim();
      if (kb !== (prev?.keyboard_layout ?? "")) {
        ops.push(() => kb ? systemSettingsService.setKeyboardLayout(kb) : systemSettingsService.deleteKeyboardLayout());
      }
      // Time format
      const tf = optTimeFormat.trim();
      if (tf !== (prev?.time_format ?? "")) {
        ops.push(() => tf ? systemSettingsService.setTimeFormat(tf) : systemSettingsService.deleteTimeFormat());
      }
      // Ctrl-alt-delete
      const ca = optCtrlAlt.trim();
      if (ca !== (prev?.ctrl_alt_delete ?? "")) {
        ops.push(() => ca ? systemSettingsService.setCtrlAltDelete(ca) : systemSettingsService.deleteCtrlAltDelete());
      }
      // Boolean flags
      if (optStartupBeep !== (prev?.startup_beep ?? false))
        ops.push(() => systemSettingsService.setStartupBeep(optStartupBeep));
      if (optUsbAutosuspend !== (prev?.disable_usb_autosuspend ?? false))
        ops.push(() => systemSettingsService.setDisableUsbAutosuspend(optUsbAutosuspend));
      if (optRebootOnPanic !== (prev?.reboot_on_panic ?? false))
        ops.push(() => systemSettingsService.setRebootOnPanic(optRebootOnPanic));
      if (optRootResize !== (prev?.root_partition_auto_resize ?? false))
        ops.push(() => systemSettingsService.setRootPartitionAutoResize(optRootResize));
      if (optRebootUpgrade !== (prev?.reboot_on_upgrade_failure ?? false))
        ops.push(() => systemSettingsService.setRebootOnUpgradeFailure(optRebootUpgrade));

      // HTTP client source
      const httpAddrChanged = optHttpAddr.trim() !== (prev?.http_client?.source_address ?? "");
      const httpIfaceChanged = optHttpIface.trim() !== (prev?.http_client?.source_interface ?? "");
      if (httpAddrChanged || httpIfaceChanged) {
        ops.push(() => systemSettingsService.updateHttpClientSource({
          address: optHttpAddr.trim() || undefined,
          clearAddress: !optHttpAddr.trim() && httpAddrChanged,
          iface: optHttpIface.trim() || undefined,
          clearIface: !optHttpIface.trim() && httpIfaceChanged,
        }));
      }
      // SSH client source
      const sshAddrChanged = optSshAddr.trim() !== (prev?.ssh_client?.source_address ?? "");
      const sshIfaceChanged = optSshIface.trim() !== (prev?.ssh_client?.source_interface ?? "");
      if (sshAddrChanged || sshIfaceChanged) {
        ops.push(() => systemSettingsService.updateSshClientSource({
          address: optSshAddr.trim() || undefined,
          clearAddress: !optSshAddr.trim() && sshAddrChanged,
          iface: optSshIface.trim() || undefined,
          clearIface: !optSshIface.trim() && sshIfaceChanged,
        }));
      }

      for (const op of ops) {
        const r = await op();
        if (!r.success) { setOptsError(r.error ?? "Failed"); return; }
      }
      toast.success("System options saved");
      setEditingOpts(false);
      onRefresh();
    } catch {
      setOptsError("An unexpected error occurred");
    } finally {
      setOptsSaving(false);
    }
  };

  // Proxy handler
  const handleSaveProxy = async () => {
    setProxySaving(true);
    setProxyError(null);
    try {
      const url = proxyUrl.trim();
      const port = proxyPort.trim() ? parseInt(proxyPort.trim(), 10) : null;
      const user = proxyUsername.trim();

      if (url !== (px?.url ?? "")) {
        const r = url ? await systemSettingsService.setProxyUrl(url) : await systemSettingsService.deleteProxyUrl();
        if (!r.success) { setProxyError(r.error ?? "Failed"); return; }
      }
      if (port !== (px?.port ?? null)) {
        const r = port ? await systemSettingsService.setProxyPort(port) : await systemSettingsService.deleteProxyPort();
        if (!r.success) { setProxyError(r.error ?? "Failed"); return; }
      }
      if (user !== (px?.username ?? "")) {
        const r = user ? await systemSettingsService.setProxyUsername(user) : await systemSettingsService.deleteProxyUsername();
        if (!r.success) { setProxyError(r.error ?? "Failed"); return; }
      }
      toast.success("Proxy settings saved");
      setEditingProxy(false);
      onRefresh();
    } catch {
      setProxyError("An unexpected error occurred");
    } finally {
      setProxySaving(false);
    }
  };

  const handleAddNoProxy = async () => {
    const host = proxyNoProxyInput.trim();
    if (!host) return;
    try {
      const r = await systemSettingsService.addProxyNoProxy(host);
      if (!r.success) { toast.error("Failed", r.error ?? "Could not add entry"); return; }
      setProxyNoProxyInput("");
      onRefresh();
    } catch {
      toast.error("Error", "An unexpected error occurred");
    }
  };

  // Logs handler
  const handleSaveLogs = async () => {
    setLogsSaving(true);
    setLogsError(null);
    try {
      const prevAtop = config.logs?.atop;
      const prevMsg = config.logs?.messages;
      const atopSize = logAtopSize.trim() ? parseInt(logAtopSize.trim(), 10) : null;
      const atopRotate = logAtopRotate.trim() ? parseInt(logAtopRotate.trim(), 10) : null;
      const msgSize = logMsgSize.trim() ? parseInt(logMsgSize.trim(), 10) : null;
      const msgRotate = logMsgRotate.trim() ? parseInt(logMsgRotate.trim(), 10) : null;

      const atopSizeChanged = atopSize !== (prevAtop?.max_size ?? null);
      const atopRotateChanged = atopRotate !== (prevAtop?.rotate_count ?? null);
      const msgSizeChanged = msgSize !== (prevMsg?.max_size ?? null);
      const msgRotateChanged = msgRotate !== (prevMsg?.rotate_count ?? null);

      if (atopSizeChanged || atopRotateChanged) {
        const r = await systemSettingsService.updateLogrotateAtop({
          maxSize: atopSizeChanged ? atopSize : undefined,
          clearMaxSize: atopSizeChanged && atopSize === null,
          rotate: atopRotateChanged ? atopRotate : undefined,
          clearRotate: atopRotateChanged && atopRotate === null,
        });
        if (!r.success) { setLogsError(r.error ?? "Failed"); return; }
      }
      if (msgSizeChanged || msgRotateChanged) {
        const r = await systemSettingsService.updateLogrotateMessages({
          maxSize: msgSizeChanged ? msgSize : undefined,
          clearMaxSize: msgSizeChanged && msgSize === null,
          rotate: msgRotateChanged ? msgRotate : undefined,
          clearRotate: msgRotateChanged && msgRotate === null,
        });
        if (!r.success) { setLogsError(r.error ?? "Failed"); return; }
      }
      toast.success("Log rotation settings saved");
      setEditingLogs(false);
      onRefresh();
    } catch {
      setLogsError("An unexpected error occurred");
    } finally {
      setLogsSaving(false);
    }
  };

  // Update check handler
  const handleSaveUc = async () => {
    setUcSaving(true);
    setUcError(null);
    try {
      const url = ucUrl.trim();
      if (url !== (config.update_check?.url ?? "")) {
        const r = url ? await systemSettingsService.setUpdateCheckUrl(url) : await systemSettingsService.deleteUpdateCheckUrl();
        if (!r.success) { setUcError(r.error ?? "Failed"); return; }
      }
      if (ucAuto !== (config.update_check?.auto_install ?? false)) {
        const r = await systemSettingsService.setUpdateCheckAutoInstall(ucAuto);
        if (!r.success) { setUcError(r.error ?? "Failed"); return; }
      }
      toast.success("Update check settings saved");
      setEditingUc(false);
      onRefresh();
    } catch {
      setUcError("An unexpected error occurred");
    } finally {
      setUcSaving(false);
    }
  };

  // Kernel handler
  const startEditKernel = () => {
    setKDisableHpet(kern?.disable_hpet ?? false);
    setKDisableMce(kern?.disable_mce ?? false);
    setKDisableSoftlockup(kern?.disable_softlockup ?? false);
    setKDisableNmiWatchdog(kern?.cpu?.disable_nmi_watchdog ?? false);
    setKIsolateCpus(kern?.cpu?.isolate_cpus ?? "");
    setKNohzFull(kern?.cpu?.nohz_full ?? "");
    setKRcuNoCbs(kern?.cpu?.rcu_no_cbs ?? "");
    setKDisableNumaBalancing(kern?.memory?.disable_numa_balancing ?? false);
    setKDefaultHugepageSize(kern?.memory?.default_hugepage_size ?? "");
    setKHugepageSize(kern?.memory?.hugepage_size ?? "");
    setKMaxMapCount(resLimits?.max_map_count ? String(resLimits.max_map_count) : "");
    setKShmmax(resLimits?.shmmax ? String(resLimits.shmmax) : "");
    setKernelError(null);
    setEditingKernel(true);
  };

  const handleSaveKernel = async () => {
    setKernelSaving(true);
    setKernelError(null);
    try {
      const r1 = await systemSettingsService.saveKernelOptions(kern ?? null, {
        disableHpet: kDisableHpet, disableMce: kDisableMce, disableSoftlockup: kDisableSoftlockup,
        disableNmiWatchdog: kDisableNmiWatchdog,
        isolateCpus: kIsolateCpus, nohzFull: kNohzFull, rcuNoCbs: kRcuNoCbs,
        defaultHugepageSize: kDefaultHugepageSize, disableNumaBalancing: kDisableNumaBalancing, hugepageSize: kHugepageSize,
      });
      if (!r1.success) { setKernelError(r1.error ?? "Failed to save kernel options"); return; }
      const r2 = await systemSettingsService.saveResourceLimits(resLimits ?? null, {
        maxMapCount: kMaxMapCount, shmmax: kShmmax,
      });
      if (!r2.success) { setKernelError(r2.error ?? "Failed to save resource limits"); return; }
      toast.success("Kernel options saved");
      setEditingKernel(false);
      onRefresh();
    } catch {
      setKernelError("An unexpected error occurred");
    } finally {
      setKernelSaving(false);
    }
  };

  // FRR BMP handlers
  const handleAddBmpTarget = async () => {
    if (!bmpName.trim()) { setBmpError("Name is required"); return; }
    setBmpSaving(true); setBmpError(null);
    try {
      const r = await systemSettingsService.addFrrBmpTarget(
        bmpName.trim(),
        bmpAddress.trim() || null,
        bmpPort.trim() ? parseInt(bmpPort.trim(), 10) : null,
      );
      if (!r.success) { setBmpError(r.error ?? "Failed to add target"); return; }
      toast.success("BMP target added");
      setAddingBmpTarget(false);
      setBmpName(""); setBmpAddress(""); setBmpPort("");
      onRefresh();
    } catch { setBmpError("An unexpected error occurred"); }
    finally { setBmpSaving(false); }
  };

  const handleDeleteBmpTarget = async () => {
    if (!deleteBmpTarget) return;
    setDeletingBmp(true);
    try {
      const r = await systemSettingsService.deleteFrrBmpTarget(deleteBmpTarget.name);
      if (!r.success) toast.error("Delete failed", r.error ?? "Could not remove target");
      else { toast.success("BMP target removed"); onRefresh(); }
    } catch { toast.error("Error", "An unexpected error occurred"); }
    finally { setDeletingBmp(false); setDeleteBmpTarget(null); }
  };

  // FRR handler
  const handleSaveFrr = async () => {
    setFrrSaving(true);
    try {
      const r = frrProfile
        ? await systemSettingsService.setFrrProfile(frrProfile)
        : await systemSettingsService.deleteFrrProfile();
      if (!r.success) {
        toast.error("Failed", r.error ?? "Could not update FRR profile");
      } else {
        toast.success("FRR profile updated");
        onRefresh();
      }
    } catch {
      toast.error("Error", "An unexpected error occurred");
    } finally {
      setFrrSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Config Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Config Management</CardTitle>
              <CardDescription>Commit history revisions and archive locations.</CardDescription>
            </div>
            {!isReadOnly && !editingCm && (
              <Button variant="outline" size="sm" onClick={() => {
                setCmRevisions(config.config_management.commit_revisions ? String(config.config_management.commit_revisions) : "");
                setCmError(null);
                setEditingCm(true);
              }}>
                <Edit2 className="h-4 w-4 mr-2" />Edit
              </Button>
            )}
            {editingCm && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingCm(false); setCmError(null); }} disabled={cmSaving}>Cancel</Button>
                <Button size="sm" onClick={handleSaveCm} disabled={cmSaving}>{cmSaving ? "Saving…" : "Save"}</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cmError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{cmError}</pre>
              </div>
            </div>
          )}
          <div className="space-y-2 max-w-xs">
            <Label>Commit Revisions</Label>
            {editingCm ? (
              <Input type="number" min="0" value={cmRevisions} onChange={(e) => setCmRevisions(e.target.value)} placeholder="100" />
            ) : (
              <p className="text-sm font-medium">{config.config_management.commit_revisions ?? <span className="text-muted-foreground">Default</span>}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Archive Locations</Label>
            <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Backup browsing support: </span>
                <span className="font-medium">SCP, SFTP, FTP</span> — full file listing.{" "}
                <span className="font-medium">HTTP/HTTPS</span> — requires server directory indexing.{" "}
                <span className="font-medium">TFTP, git+https</span> — no listing (manual filename entry only).
              </div>
            </div>
            <div className="space-y-2">
              {config.config_management.archive_locations.map((loc) => (
                <div key={loc} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2">
                  <span className="font-mono text-sm truncate flex-1 mr-2">{maskCredentials(loc)}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Browse backups" onClick={() => handleBrowseArchive(loc)}>
                      <FolderOpen className="h-3.5 w-3.5" />
                    </Button>
                    {!isReadOnly && (
                      <Button variant="ghost" size="sm" className="text-destructive h-6 w-6 p-0" onClick={() => setDeleteArchiveTarget(loc)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {config.config_management.archive_locations.length === 0 && (
                <p className="text-sm text-muted-foreground">No archive locations configured.</p>
              )}
            </div>
            {!isReadOnly && (
              <div className="flex gap-2 mt-2">
                <Input value={archiveInput} onChange={(e) => setArchiveInput(e.target.value)} placeholder="scp://user@host//path" className="flex-1" />
                <Button variant="outline" size="sm" onClick={handleAddArchive} disabled={cmSaving}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sysctl Parameters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sysctl Parameters</CardTitle>
              <CardDescription>Custom kernel parameter overrides.</CardDescription>
            </div>
            {!isReadOnly && !addingSysctl && (
              <Button size="sm" variant="outline" onClick={() => { setSysctlParam(""); setSysctlValue(""); setSysctlError(null); setAddingSysctl(true); }}>
                <Plus className="h-4 w-4 mr-2" />Add Parameter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {addingSysctl && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              {sysctlError && (
                <div className="rounded border border-destructive/20 bg-destructive/10 p-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">{sysctlError}</pre>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Parameter</Label>
                  <Input value={sysctlParam} onChange={(e) => setSysctlParam(e.target.value)} placeholder="net.ipv4.ip_forward" className="font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Value</Label>
                  <Input value={sysctlValue} onChange={(e) => setSysctlValue(e.target.value)} placeholder="1" className="font-mono text-xs" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddSysctl} disabled={sysctlSaving}>{sysctlSaving ? "Saving…" : "Set"}</Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingSysctl(false); setSysctlError(null); }}>Cancel</Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Value</TableHead>
                {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.sysctl_parameters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 2 : 3} className="text-center text-muted-foreground py-4">
                    No custom sysctl parameters
                  </TableCell>
                </TableRow>
              ) : (
                config.sysctl_parameters.map((p) => (
                  <TableRow key={p.parameter}>
                    <TableCell className="font-mono text-sm">{p.parameter}</TableCell>
                    <TableCell className="font-mono text-sm">{p.value}</TableCell>
                    {!isReadOnly && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteSysctlTarget(p.parameter)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Console Devices */}
      {config.console_devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Console Devices</CardTitle>
            <CardDescription>Serial console device speed and powersave configuration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {consoleError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{consoleError}</pre>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Speed (bps)</TableHead>
                  <TableHead>Powersave</TableHead>
                  {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.console_devices.map((d) => (
                  <TableRow key={d.device}>
                    <TableCell className="font-mono">{d.device}</TableCell>
                    <TableCell>
                      {editingConsole === d.device ? (
                        <Select value={consoleSpeed} onValueChange={setConsoleSpeed}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {["1200","2400","4800","9600","19200","38400","57600","115200"].map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        d.speed ?? <span className="text-muted-foreground">Default</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingConsole === d.device ? (
                        <button
                          type="button"
                          className="text-sm font-medium"
                          onClick={() => setConsolePowersave(!consolePowersave)}
                        >
                          {consolePowersave
                            ? <span className="text-green-600 dark:text-green-400">Enabled</span>
                            : <span className="text-muted-foreground">Disabled</span>}
                        </button>
                      ) : (
                        <span className="text-sm">
                          {d.powersave
                            ? <span className="text-green-600 dark:text-green-400">Enabled</span>
                            : <span className="text-muted-foreground">Disabled</span>}
                        </span>
                      )}
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell className="text-right">
                        {editingConsole === d.device ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={handleSaveConsoleDevice} disabled={consoleSaving}>
                              {consoleSaving ? "Saving…" : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingConsole(null); setConsoleError(null); }}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setConsoleSpeed(d.speed ?? "9600");
                              setConsolePowersave(d.powersave);
                              setConsoleError(null);
                              setEditingConsole(d.device);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Watchdog / Wireless — small cards in a responsive grid */}
      {(features.watchdog.supported || features.wireless.supported) && (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {features.watchdog.supported && (
            <Card className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Watchdog</CardTitle>
                    <CardDescription>Hardware watchdog timer configuration.</CardDescription>
                  </div>
                  {!isReadOnly && !editingWd && (
                    <Button variant="outline" size="sm" onClick={() => {
                      setWdTimeout(config.watchdog?.timeout ? String(config.watchdog.timeout) : "");
                      setWdReboot(config.watchdog?.reboot_timeout ? String(config.watchdog.reboot_timeout) : "");
                      setWdError(null);
                      setEditingWd(true);
                    }}>
                      <Edit2 className="h-4 w-4 mr-2" />Edit
                    </Button>
                  )}
                  {editingWd && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingWd(false); setWdError(null); }} disabled={wdSaving}>Cancel</Button>
                      <Button size="sm" onClick={handleSaveWatchdog} disabled={wdSaving}>{wdSaving ? "Saving…" : "Save"}</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                {wdError && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{wdError}</pre>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Timeout (s)</Label>
                    {editingWd ? (
                      <Input type="number" min="1" value={wdTimeout} onChange={(e) => setWdTimeout(e.target.value)} placeholder="60" />
                    ) : (
                      <p className="text-sm font-medium">{config.watchdog?.timeout ?? <span className="text-muted-foreground">Not set</span>}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Reboot Timeout (s)</Label>
                    {editingWd ? (
                      <Input type="number" min="1" value={wdReboot} onChange={(e) => setWdReboot(e.target.value)} placeholder="120" />
                    ) : (
                      <p className="text-sm font-medium">{config.watchdog?.reboot_timeout ?? <span className="text-muted-foreground">Not set</span>}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {features.wireless.supported && (
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Wireless</CardTitle>
                <CardDescription>Wireless regulatory domain configuration.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2">
                  <Label>Country Code</Label>
                  <div className="flex gap-2">
                    <Select value={wirelessCode || "unset"} onValueChange={(v) => setWirelessCode(v === "unset" ? "" : v)} disabled={isReadOnly}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">Not set</SelectItem>
                        {COUNTRY_CODES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!isReadOnly && (
                      <Button size="sm" onClick={handleSaveWireless} disabled={wirelessSaving}>
                        {wirelessSaving ? "Saving…" : "Save"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      )}

      {/* FRR */}
      {features.frr_profile.supported && (
        <Card>
          <CardHeader>
            <CardTitle>FRR</CardTitle>
            <CardDescription>FRRouting configuration profile and BMP monitoring targets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 max-w-xs">
              <Label>Profile</Label>
              <div className="flex gap-2">
                <Select value={frrProfile || "unset"} onValueChange={(v) => setFrrProfile(v === "unset" ? "" : v)} disabled={isReadOnly}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not set</SelectItem>
                    {FRR_PROFILES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isReadOnly && (
                  <Button size="sm" onClick={handleSaveFrr} disabled={frrSaving}>
                    {frrSaving ? "Saving…" : "Save"}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">BMP Targets</p>
                {!isReadOnly && !addingBmpTarget && (
                  <Button size="sm" variant="outline" onClick={() => { setBmpName(""); setBmpAddress(""); setBmpPort(""); setBmpError(null); setAddingBmpTarget(true); }}>
                    <Plus className="h-4 w-4 mr-1" />Add Target
                  </Button>
                )}
              </div>

              {addingBmpTarget && (
                <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                  {bmpError && (
                    <div className="rounded border border-destructive/20 bg-destructive/10 p-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">{bmpError}</pre>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={bmpName} onChange={(e) => setBmpName(e.target.value)} placeholder="my-target" className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Address</Label>
                      <Input value={bmpAddress} onChange={(e) => setBmpAddress(e.target.value)} placeholder="10.0.0.1" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Port</Label>
                      <Input type="number" value={bmpPort} onChange={(e) => setBmpPort(e.target.value)} placeholder="11019" className="text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddBmpTarget} disabled={bmpSaving}>{bmpSaving ? "Adding…" : "Add"}</Button>
                    <Button size="sm" variant="outline" onClick={() => { setAddingBmpTarget(false); setBmpError(null); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {(config.frr?.bmp?.targets ?? []).length === 0 && !addingBmpTarget ? (
                <p className="text-sm text-muted-foreground">No BMP targets configured.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Port</TableHead>
                      {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config.frr?.bmp?.targets ?? []).map((t) => (
                      <TableRow key={t.name}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="font-mono text-sm">{t.address ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{t.port ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        {!isReadOnly && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteBmpTarget(t)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Options</CardTitle>
              <CardDescription>Keyboard layout, boot behaviour, and network client bindings.</CardDescription>
            </div>
            {!isReadOnly && !editingOpts && (
              <Button variant="outline" size="sm" onClick={() => {
                setOptKeyboard(opts?.keyboard_layout ?? "");
                setOptTimeFormat(opts?.time_format ?? "");
                setOptCtrlAlt(opts?.ctrl_alt_delete ?? "");
                setOptStartupBeep(opts?.startup_beep ?? false);
                setOptUsbAutosuspend(opts?.disable_usb_autosuspend ?? false);
                setOptRebootOnPanic(opts?.reboot_on_panic ?? false);
                setOptRootResize(opts?.root_partition_auto_resize ?? false);
                setOptRebootUpgrade(opts?.reboot_on_upgrade_failure ?? false);
                setOptHttpAddr(opts?.http_client?.source_address ?? "");
                setOptHttpIface(opts?.http_client?.source_interface ?? "");
                setOptSshAddr(opts?.ssh_client?.source_address ?? "");
                setOptSshIface(opts?.ssh_client?.source_interface ?? "");
                setOptsError(null);
                setEditingOpts(true);
              }}>
                <Edit2 className="h-4 w-4 mr-2" />Edit
              </Button>
            )}
            {editingOpts && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingOpts(false); setOptsError(null); }} disabled={optsSaving}>Cancel</Button>
                <Button size="sm" onClick={handleSaveOptions} disabled={optsSaving}>{optsSaving ? "Saving…" : "Save"}</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {optsError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{optsError}</pre>
              </div>
            </div>
          )}

          {/* Select-style options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Keyboard Layout</Label>
              {editingOpts ? (
                <Input value={optKeyboard} onChange={(e) => setOptKeyboard(e.target.value)} placeholder="us" />
              ) : (
                <p className="text-sm font-medium">{opts?.keyboard_layout ?? <span className="text-muted-foreground">Default</span>}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Time Format</Label>
              {editingOpts ? (
                <Select value={optTimeFormat || "unset"} onValueChange={(v) => setOptTimeFormat(v === "unset" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Default</SelectItem>
                    <SelectItem value="24-hour">24-hour</SelectItem>
                    <SelectItem value="12-hour">12-hour</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{opts?.time_format ?? <span className="text-muted-foreground">Default</span>}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Ctrl-Alt-Delete</Label>
              {editingOpts ? (
                <Select value={optCtrlAlt || "unset"} onValueChange={(v) => setOptCtrlAlt(v === "unset" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Default</SelectItem>
                    <SelectItem value="ignore">Ignore</SelectItem>
                    <SelectItem value="reboot">Reboot</SelectItem>
                    <SelectItem value="poweroff">Poweroff</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{opts?.ctrl_alt_delete ?? <span className="text-muted-foreground">Default</span>}</p>
              )}
            </div>
          </div>

          {/* Boolean flags */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">System behaviour</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
              {([
                { label: "Startup beep", key: "startup_beep", state: optStartupBeep, setter: setOptStartupBeep },
                { label: "Disable USB autosuspend", key: "disable_usb_autosuspend", state: optUsbAutosuspend, setter: setOptUsbAutosuspend },
                { label: "Reboot on kernel panic", key: "reboot_on_panic", state: optRebootOnPanic, setter: setOptRebootOnPanic },
                { label: "Root partition auto-resize", key: "root_partition_auto_resize", state: optRootResize, setter: setOptRootResize },
                ...(features.watchdog.supported ? [{ label: "Reboot on upgrade failure", key: "reboot_on_upgrade_failure", state: optRebootUpgrade, setter: setOptRebootUpgrade }] : []),
              ] as { label: string; key: string; state: boolean; setter: (v: boolean) => void }[]).map(({ label, key, state, setter }) => (
                <div key={key} className="flex items-center gap-3">
                  {editingOpts ? (
                    <Checkbox
                      checked={state}
                      onCheckedChange={(v) => setter(!!v)}
                      id={`opt-${key}`}
                    />
                  ) : (
                    <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${state ? "bg-primary border-primary" : "border-input"}`}>
                      {state && <span className="text-primary-foreground text-xs">✓</span>}
                    </div>
                  )}
                  <Label htmlFor={`opt-${key}`} className="cursor-pointer font-normal">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* HTTP / SSH client source bindings */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Network client source binding</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HTTP client</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Source address</Label>
                  {editingOpts ? (
                    <Input value={optHttpAddr} onChange={(e) => setOptHttpAddr(e.target.value)} placeholder="192.168.1.1" className="text-sm" />
                  ) : (
                    <p className="text-sm">{opts?.http_client?.source_address ?? <span className="text-muted-foreground">Not set</span>}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Source interface</Label>
                  {editingOpts ? (
                    <Input value={optHttpIface} onChange={(e) => setOptHttpIface(e.target.value)} placeholder="eth0" className="text-sm" />
                  ) : (
                    <p className="text-sm">{opts?.http_client?.source_interface ?? <span className="text-muted-foreground">Not set</span>}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SSH client</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Source address</Label>
                  {editingOpts ? (
                    <Input value={optSshAddr} onChange={(e) => setOptSshAddr(e.target.value)} placeholder="192.168.1.1" className="text-sm" />
                  ) : (
                    <p className="text-sm">{opts?.ssh_client?.source_address ?? <span className="text-muted-foreground">Not set</span>}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Source interface</Label>
                  {editingOpts ? (
                    <Input value={optSshIface} onChange={(e) => setOptSshIface(e.target.value)} placeholder="eth0" className="text-sm" />
                  ) : (
                    <p className="text-sm">{opts?.ssh_client?.source_interface ?? <span className="text-muted-foreground">Not set</span>}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kernel Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Kernel Options</CardTitle>
              <CardDescription>Boot-time kernel flags, CPU isolation, memory settings, and resource limits.</CardDescription>
            </div>
            {!isReadOnly && (
              editingKernel ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingKernel(false); setKernelError(null); }} disabled={kernelSaving}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveKernel} disabled={kernelSaving}>{kernelSaving ? "Saving…" : "Save"}</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={startEditKernel}>
                  <Edit2 className="h-4 w-4 mr-2" />Edit
                </Button>
              )
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {kernelError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{kernelError}</pre>
              </div>
            </div>
          )}

          {/* General flags */}
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">General</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-8">
              {([
                { label: "Disable HPET", key: "hpet", state: editingKernel ? kDisableHpet : (kern?.disable_hpet ?? false), setter: setKDisableHpet },
                { label: "Disable MCE", key: "mce", state: editingKernel ? kDisableMce : (kern?.disable_mce ?? false), setter: setKDisableMce },
                { label: "Disable softlockup", key: "softlockup", state: editingKernel ? kDisableSoftlockup : (kern?.disable_softlockup ?? false), setter: setKDisableSoftlockup },
              ] as { label: string; key: string; state: boolean; setter: (v: boolean) => void }[]).map(({ label, key, state, setter }) => (
                <div key={key} className="flex items-center gap-3">
                  {editingKernel ? (
                    <Checkbox checked={state} onCheckedChange={(v) => setter(!!v)} id={`kern-${key}`} />
                  ) : (
                    <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${state ? "bg-primary border-primary" : "border-input"}`}>
                      {state && <span className="text-primary-foreground text-xs">✓</span>}
                    </div>
                  )}
                  <Label htmlFor={`kern-${key}`} className="cursor-pointer font-normal">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* CPU */}
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">CPU</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              <div className="flex items-center gap-3 sm:col-span-2">
                {editingKernel ? (
                  <Checkbox checked={kDisableNmiWatchdog} onCheckedChange={(v) => setKDisableNmiWatchdog(!!v)} id="kern-nmi" />
                ) : (
                  <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${(kern?.cpu?.disable_nmi_watchdog ?? false) ? "bg-primary border-primary" : "border-input"}`}>
                    {(kern?.cpu?.disable_nmi_watchdog ?? false) && <span className="text-primary-foreground text-xs">✓</span>}
                  </div>
                )}
                <Label htmlFor="kern-nmi" className="cursor-pointer font-normal">Disable NMI watchdog</Label>
              </div>
              {([
                { label: "Isolate CPUs", val: editingKernel ? kIsolateCpus : (kern?.cpu?.isolate_cpus ?? ""), set: setKIsolateCpus, placeholder: "0-3" },
                { label: "nohz_full CPUs", val: editingKernel ? kNohzFull : (kern?.cpu?.nohz_full ?? ""), set: setKNohzFull, placeholder: "1-3" },
                { label: "rcu_no_cbs CPUs", val: editingKernel ? kRcuNoCbs : (kern?.cpu?.rcu_no_cbs ?? ""), set: setKRcuNoCbs, placeholder: "1-3" },
              ] as { label: string; val: string; set: (v: string) => void; placeholder: string }[]).map(({ label, val, set, placeholder }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  {editingKernel ? (
                    <Input value={val} onChange={(e) => set(e.target.value)} placeholder={placeholder} className="font-mono text-sm" />
                  ) : (
                    <p className="text-sm font-mono">{val || <span className="text-muted-foreground">Not set</span>}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Memory */}
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Memory</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-6">
              <div className="flex items-center gap-3 sm:col-span-3">
                {editingKernel ? (
                  <Checkbox checked={kDisableNumaBalancing} onCheckedChange={(v) => setKDisableNumaBalancing(!!v)} id="kern-numa" />
                ) : (
                  <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${(kern?.memory?.disable_numa_balancing ?? false) ? "bg-primary border-primary" : "border-input"}`}>
                    {(kern?.memory?.disable_numa_balancing ?? false) && <span className="text-primary-foreground text-xs">✓</span>}
                  </div>
                )}
                <Label htmlFor="kern-numa" className="cursor-pointer font-normal">Disable NUMA balancing</Label>
              </div>
              {([
                { label: "Default hugepage size", val: editingKernel ? kDefaultHugepageSize : (kern?.memory?.default_hugepage_size ?? ""), set: setKDefaultHugepageSize },
                { label: "Hugepage size", val: editingKernel ? kHugepageSize : (kern?.memory?.hugepage_size ?? ""), set: setKHugepageSize },
              ] as { label: string; val: string; set: (v: string) => void }[]).map(({ label, val, set }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  {editingKernel ? (
                    <Select value={val || "unset"} onValueChange={(v) => set(v === "unset" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">Not set</SelectItem>
                        <SelectItem value="2M">2M</SelectItem>
                        <SelectItem value="1G">1G</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-mono">{val || <span className="text-muted-foreground">Not set</span>}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Resource Limits (1.5 only) */}
          {features.resource_limits.supported && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Resource Limits</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Max map count</Label>
                  {editingKernel ? (
                    <Input type="number" min="0" value={kMaxMapCount} onChange={(e) => setKMaxMapCount(e.target.value)} placeholder="Default" />
                  ) : (
                    <p className="text-sm font-medium">{resLimits?.max_map_count ?? <span className="text-muted-foreground">Default</span>}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Shared memory max (bytes)</Label>
                  {editingKernel ? (
                    <Input type="number" min="0" value={kShmmax} onChange={(e) => setKShmmax(e.target.value)} placeholder="Default" />
                  ) : (
                    <p className="text-sm font-medium">{resLimits?.shmmax ?? <span className="text-muted-foreground">Default</span>}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs / Logrotate */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Log Rotation</CardTitle>
              <CardDescription>Configure log size limits and rotation counts for system logs.</CardDescription>
            </div>
            {!isReadOnly && !editingLogs && (
              <Button variant="outline" size="sm" onClick={() => {
                setLogAtopSize(config.logs?.atop?.max_size ? String(config.logs.atop.max_size) : "");
                setLogAtopRotate(config.logs?.atop?.rotate_count ? String(config.logs.atop.rotate_count) : "");
                setLogMsgSize(config.logs?.messages?.max_size ? String(config.logs.messages.max_size) : "");
                setLogMsgRotate(config.logs?.messages?.rotate_count ? String(config.logs.messages.rotate_count) : "");
                setLogsError(null);
                setEditingLogs(true);
              }}>
                <Edit2 className="h-4 w-4 mr-2" />Edit
              </Button>
            )}
            {editingLogs && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingLogs(false); setLogsError(null); }} disabled={logsSaving}>Cancel</Button>
                <Button size="sm" onClick={handleSaveLogs} disabled={logsSaving}>{logsSaving ? "Saving…" : "Save"}</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {logsError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{logsError}</pre>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "atop", size: logAtopSize, setSize: setLogAtopSize, rotate: logAtopRotate, setRotate: setLogAtopRotate, current: config.logs?.atop },
              { label: "messages", size: logMsgSize, setSize: setLogMsgSize, rotate: logMsgRotate, setRotate: setLogMsgRotate, current: config.logs?.messages },
            ].map(({ label, size, setSize, rotate, setRotate, current }) => (
              <div key={label} className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max size (KB)</Label>
                    {editingLogs ? (
                      <Input type="number" min="0" value={size} onChange={(e) => setSize(e.target.value)} placeholder="Default" className="text-sm" />
                    ) : (
                      <p className="text-sm font-medium">{current?.max_size ?? <span className="text-muted-foreground">Default</span>}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Rotate count</Label>
                    {editingLogs ? (
                      <Input type="number" min="0" value={rotate} onChange={(e) => setRotate(e.target.value)} placeholder="Default" className="text-sm" />
                    ) : (
                      <p className="text-sm font-medium">{current?.rotate_count ?? <span className="text-muted-foreground">Default</span>}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Update Check & Proxy — side-by-side on wide screens */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">

        {/* Update check */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Update Check</CardTitle>
                <CardDescription>Automatic package update notifications.</CardDescription>
              </div>
              {!isReadOnly && !editingUc && (
                <Button variant="outline" size="sm" onClick={() => {
                  setUcUrl(config.update_check?.url ?? "");
                  setUcAuto(config.update_check?.auto_install ?? false);
                  setUcError(null);
                  setEditingUc(true);
                }}>
                  <Edit2 className="h-4 w-4 mr-2" />Edit
                </Button>
              )}
              {editingUc && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingUc(false); setUcError(null); }} disabled={ucSaving}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveUc} disabled={ucSaving}>{ucSaving ? "Saving…" : "Save"}</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {ucError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{ucError}</pre>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Check URL</Label>
              {editingUc ? (
                <Input value={ucUrl} onChange={(e) => setUcUrl(e.target.value)} placeholder="https://packages.vyos.net/…" />
              ) : (
                <p className="text-sm font-medium break-all">{config.update_check?.url ?? <span className="text-muted-foreground">Default</span>}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {editingUc ? (
                <Checkbox checked={ucAuto} onCheckedChange={(v) => setUcAuto(!!v)} id="uc-auto" />
              ) : (
                <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${ucAuto ? "bg-primary border-primary" : "border-input"}`}>
                  {ucAuto && <span className="text-primary-foreground text-xs">✓</span>}
                </div>
              )}
              <Label htmlFor="uc-auto" className="cursor-pointer font-normal">Auto-install packages</Label>
            </div>
          </CardContent>
        </Card>

        {/* Proxy */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Proxy</CardTitle>
                <CardDescription>Outbound HTTP proxy for system traffic.</CardDescription>
              </div>
              {!isReadOnly && !editingProxy && (
                <Button variant="outline" size="sm" onClick={() => {
                  setProxyUrl(px?.url ?? "");
                  setProxyPort(px?.port ? String(px.port) : "");
                  setProxyUsername(px?.username ?? "");
                  setProxyError(null);
                  setEditingProxy(true);
                }}>
                  <Edit2 className="h-4 w-4 mr-2" />Edit
                </Button>
              )}
              {editingProxy && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingProxy(false); setProxyError(null); }} disabled={proxySaving}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveProxy} disabled={proxySaving}>{proxySaving ? "Saving…" : "Save"}</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {proxyError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{proxyError}</pre>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>URL</Label>
                {editingProxy ? (
                  <Input value={proxyUrl} onChange={(e) => setProxyUrl(e.target.value)} placeholder="http://proxy.example.com" />
                ) : (
                  <p className="text-sm font-medium break-all">{px?.url ?? <span className="text-muted-foreground">Not set</span>}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Port</Label>
                {editingProxy ? (
                  <Input type="number" value={proxyPort} onChange={(e) => setProxyPort(e.target.value)} placeholder="3128" />
                ) : (
                  <p className="text-sm font-medium">{px?.port ?? <span className="text-muted-foreground">—</span>}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              {editingProxy ? (
                <Input value={proxyUsername} onChange={(e) => setProxyUsername(e.target.value)} placeholder="Optional" />
              ) : (
                <p className="text-sm font-medium">{px?.username ?? <span className="text-muted-foreground">Not set</span>}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>No-proxy hosts</Label>
              <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
                {(px?.no_proxy ?? []).map((h) => (
                  <div key={h} className="flex items-center gap-1 bg-muted rounded px-2 py-0.5 text-xs font-mono">
                    {h}
                    {!isReadOnly && (
                      <button
                        type="button"
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          await systemSettingsService.deleteProxyNoProxy(h);
                          onRefresh();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {(px?.no_proxy ?? []).length === 0 && (
                  <span className="text-sm text-muted-foreground">None configured</span>
                )}
              </div>
              {!isReadOnly && (
                <div className="flex gap-2">
                  <Input
                    value={proxyNoProxyInput}
                    onChange={(e) => setProxyNoProxyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNoProxy(); } }}
                    placeholder="example.com"
                    className="flex-1 text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={handleAddNoProxy}>
                    <Plus className="h-4 w-4 mr-1" />Add
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete archive confirm */}
      <AlertDialog open={!!deleteArchiveTarget} onOpenChange={(o: boolean) => { if (!o) setDeleteArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Archive Location</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteArchiveTarget}</strong> from archive locations?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingArchive}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteArchive} disabled={deletingArchive} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingArchive ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete BMP target confirm */}
      <AlertDialog open={!!deleteBmpTarget} onOpenChange={(o: boolean) => { if (!o) setDeleteBmpTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove BMP Target</AlertDialogTitle>
            <AlertDialogDescription>
              Remove BMP target <strong>{deleteBmpTarget?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBmp}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBmpTarget} disabled={deletingBmp} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingBmp ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete sysctl confirm */}
      <AlertDialog open={!!deleteSysctlTarget} onOpenChange={(o: boolean) => { if (!o) setDeleteSysctlTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Sysctl Parameter</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteSysctlTarget}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSysctl}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSysctl} disabled={deletingSysctl} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingSysctl ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive restore dialog */}
      <Dialog open={!!browseArchiveTarget} onOpenChange={(o) => { if (!o && !restoring) { setBrowseArchiveTarget(null); setConfirmRestore(false); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Restore from Archive</DialogTitle>
            <DialogDescription>
              {browseArchiveTarget && maskCredentials(browseArchiveTarget)}
            </DialogDescription>
          </DialogHeader>

          {!confirmRestore ? (
            <div className="space-y-4">
              {archiveFilesLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading backup files...</span>
                </div>
              )}

              {!archiveFilesLoading && archiveFilesError && archiveFiles.length === 0 && (
                <div className="rounded-lg border border-muted p-4 text-center">
                  <p className="text-sm text-muted-foreground">{archiveFilesError}</p>
                </div>
              )}

              {!archiveFilesLoading && archiveFiles.length > 0 && (() => {
                const filtered = archiveSearch
                  ? archiveFiles.filter((f) => f.filename.toLowerCase().includes(archiveSearch.toLowerCase()))
                  : archiveFiles;
                return (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={archiveSearch}
                        onChange={(e) => setArchiveSearch(e.target.value)}
                        placeholder="Filter backups..."
                        className="pl-8 text-xs"
                      />
                    </div>
                    <div className="rounded border">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-background">
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Filename</TableHead>
                            <TableHead className="text-right w-20">Size</TableHead>
                          </TableRow>
                        </TableHeader>
                      </Table>
                      <div className="max-h-[220px] overflow-y-auto">
                        <Table>
                          <TableBody>
                            {filtered.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">
                                  No matching files
                                </TableCell>
                              </TableRow>
                            ) : (
                              filtered.map((f) => (
                                <TableRow
                                  key={f.filename}
                                  className={`cursor-pointer ${selectedArchiveFile === f.filename ? "bg-accent" : "hover:bg-muted/50"}`}
                                  onClick={() => { setSelectedArchiveFile(f.filename); setManualFilename(""); }}
                                >
                                  <TableCell className="w-8">
                                    <input
                                      type="radio"
                                      name="archive-file"
                                      checked={selectedArchiveFile === f.filename}
                                      onChange={() => { setSelectedArchiveFile(f.filename); setManualFilename(""); }}
                                      className="h-3.5 w-3.5"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-mono text-xs">{f.filename}</div>
                                    {f.modified && (
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(f.modified).toLocaleString()}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right text-xs text-muted-foreground w-20">
                                    {f.size != null ? `${(f.size / 1024).toFixed(1)} KB` : "—"}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Or enter filename manually</Label>
                <Input
                  value={manualFilename}
                  onChange={(e) => { setManualFilename(e.target.value); setSelectedArchiveFile(null); }}
                  placeholder="config.boot-hostname.20250101_120000"
                  className="font-mono text-xs"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setBrowseArchiveTarget(null)}>Cancel</Button>
                <Button
                  disabled={!getRestoreFilename() || isReadOnly}
                  onClick={() => setConfirmRestore(true)}
                >
                  Restore
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 space-y-2">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  This will replace the running configuration
                </p>
                <p className="text-sm text-muted-foreground">
                  The current running config will be replaced with the selected backup. This action takes effect immediately.
                </p>
              </div>
              <div className="rounded border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground">Restoring file:</p>
                <p className="font-mono text-sm font-medium">{getRestoreFilename()}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmRestore(false)} disabled={restoring}>Back</Button>
                <Button
                  variant="destructive"
                  onClick={handleRestore}
                  disabled={restoring}
                >
                  {restoring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Restoring...
                    </>
                  ) : (
                    "Confirm Restore"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
