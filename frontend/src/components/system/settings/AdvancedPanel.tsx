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
import { AlertCircle, Edit2, FolderOpen, Info, Loader2, Plus, Search, Trash2 } from "lucide-react";
import {
  systemSettingsService,
  type ArchiveFile,
  type SystemConfig,
  type SystemCapabilities,
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
  const [frrProfile, setFrrProfile] = useState(config.frr_profile ?? "");
  const [frrSaving, setFrrSaving] = useState(false);

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

      {/* Watchdog / Wireless / FRR — small cards in a responsive grid */}
      {(features.watchdog.supported || features.wireless.supported || features.frr_profile.supported) && (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
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

          {features.frr_profile.supported && (
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>FRR Profile</CardTitle>
                <CardDescription>FRRouting configuration profile.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2">
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
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
