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
import { Badge } from "@/components/ui/badge";
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
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import {
  systemSettingsService,
  type SystemConfig,
  type SystemCapabilities,
} from "@/lib/api/system-settings";
import { useToast } from "@/hooks/useToast";
import { SyslogRemoteModal } from "./SyslogRemoteModal";

interface Props {
  config: SystemConfig;
  capabilities: SystemCapabilities;
  isReadOnly: boolean;
  onRefresh: () => void;
}

export function SyslogPanel({ config, capabilities, isReadOnly, onRefresh }: Props) {
  const { toast } = useToast();
  const { syslog: { facilities, levels, supports_console, supports_file, supports_user } } =
    capabilities;

  // Local facility add
  const [addingLocal, setAddingLocal] = useState(false);
  const [localFac, setLocalFac] = useState("all");
  const [localLevel, setLocalLevel] = useState("info");
  const [localSaving, setLocalSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Console facility add
  const [addingConsole, setAddingConsole] = useState(false);
  const [consoleFac, setConsoleFac] = useState("all");
  const [consoleLevel, setConsoleLevel] = useState("warning");
  const [consoleSaving, setConsoleSaving] = useState(false);
  const [consoleError, setConsoleError] = useState<string | null>(null);

  // Remote host modal
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);

  // Delete remote
  const [deleteRemoteTarget, setDeleteRemoteTarget] = useState<string | null>(null);
  const [deletingRemote, setDeletingRemote] = useState(false);

  const handleAddLocalFacility = async () => {
    setLocalSaving(true);
    setLocalError(null);
    try {
      const result = await systemSettingsService.setSyslogLocalFacility(localFac, localLevel);
      if (!result.success) {
        setLocalError(result.error ?? "Failed to set facility");
      } else {
        toast.success("Local facility set");
        setAddingLocal(false);
        onRefresh();
      }
    } catch {
      setLocalError("An unexpected error occurred");
    } finally {
      setLocalSaving(false);
    }
  };

  const handleAddConsoleFacility = async () => {
    setConsoleSaving(true);
    setConsoleError(null);
    try {
      const result = await systemSettingsService.setSyslogConsoleFacility(consoleFac, consoleLevel);
      if (!result.success) {
        setConsoleError(result.error ?? "Failed to set facility");
      } else {
        toast.success("Console facility set");
        setAddingConsole(false);
        onRefresh();
      }
    } catch {
      setConsoleError("An unexpected error occurred");
    } finally {
      setConsoleSaving(false);
    }
  };

  const handleDeleteRemoteHost = async () => {
    if (!deleteRemoteTarget) return;
    setDeletingRemote(true);
    try {
      const result = await systemSettingsService.deleteSyslogRemoteHost(deleteRemoteTarget);
      if (!result.success) {
        toast.error("Delete failed", result.error ?? "Failed to remove remote host");
      } else {
        toast.success("Remote host removed");
        onRefresh();
      }
    } catch {
      toast.error("Delete failed", "An unexpected error occurred");
    } finally {
      setDeletingRemote(false);
      setDeleteRemoteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Local Facilities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Local Logging</CardTitle>
              <CardDescription>
                Facilities logged to the local syslog ({capabilities.syslog.local_target}).
              </CardDescription>
            </div>
            {!isReadOnly && !addingLocal && (
              <Button size="sm" variant="outline" onClick={() => setAddingLocal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Facility
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add local facility inline */}
          {addingLocal && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              {localError && (
                <div className="rounded border border-destructive/20 bg-destructive/10 p-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">{localError}</pre>
                  </div>
                </div>
              )}
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">Facility</span>
                  <Select value={localFac} onValueChange={setLocalFac}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {facilities.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">Level</span>
                  <Select value={localLevel} onValueChange={setLocalLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleAddLocalFacility} disabled={localSaving}>
                  {localSaving ? "Saving…" : "Apply"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingLocal(false); setLocalError(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {config.syslog.local_facilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No local facilities configured.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {config.syslog.local_facilities.map((f) => (
                <Badge key={f.facility} variant="secondary">
                  {f.facility} / {f.level}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remote Hosts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Remote Syslog Hosts</CardTitle>
              <CardDescription>Forward logs to remote syslog servers ({capabilities.syslog.remote_target}).</CardDescription>
            </div>
            {!isReadOnly && (
              <Button size="sm" onClick={() => setRemoteModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Host
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Host</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Facilities</TableHead>
                {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.syslog.remote_hosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 3 : 4} className="text-center text-muted-foreground py-6">
                    No remote hosts configured
                  </TableCell>
                </TableRow>
              ) : (
                config.syslog.remote_hosts.map((rh) => (
                  <TableRow key={rh.host}>
                    <TableCell className="font-mono">{rh.host}</TableCell>
                    <TableCell>{rh.port ?? <span className="text-muted-foreground">514</span>}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {rh.facilities.map((f) => (
                          <Badge key={f.facility} variant="outline" className="text-xs">
                            {f.facility}/{f.level}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteRemoteTarget(rh.host)}
                        >
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

      {/* Console Facilities (1.5 only) */}
      {supports_console && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Console Logging</CardTitle>
                <CardDescription>Facilities logged to the system console.</CardDescription>
              </div>
              {!isReadOnly && !addingConsole && (
                <Button size="sm" variant="outline" onClick={() => setAddingConsole(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Facility
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {addingConsole && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                {consoleError && (
                  <div className="rounded border border-destructive/20 bg-destructive/10 p-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">{consoleError}</pre>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <span className="text-xs text-muted-foreground">Facility</span>
                    <Select value={consoleFac} onValueChange={setConsoleFac}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {facilities.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-xs text-muted-foreground">Level</span>
                    <Select value={consoleLevel} onValueChange={setConsoleLevel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={handleAddConsoleFacility} disabled={consoleSaving}>
                    {consoleSaving ? "Saving…" : "Apply"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAddingConsole(false); setConsoleError(null); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {config.syslog.console_facilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No console facilities configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {config.syslog.console_facilities.map((f) => (
                  <Badge key={f.facility} variant="secondary">
                    {f.facility} / {f.level}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* File targets (1.4 only) */}
      {supports_file && config.syslog.files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>File Targets</CardTitle>
            <CardDescription>Log to named files.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Facilities</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.syslog.files.map((f) => (
                  <TableRow key={f.filename}>
                    <TableCell className="font-mono">{f.filename}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {f.facilities.map((fac) => (
                          <Badge key={fac.facility} variant="outline" className="text-xs">
                            {fac.facility}/{fac.level}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* User targets (1.4 only) */}
      {supports_user && config.syslog.users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>User Targets</CardTitle>
            <CardDescription>Log messages to system users.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Facilities</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.syslog.users.map((u) => (
                  <TableRow key={u.username}>
                    <TableCell className="font-mono">{u.username}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.facilities.map((f) => (
                          <Badge key={f.facility} variant="outline" className="text-xs">
                            {f.facility}/{f.level}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <SyslogRemoteModal
        open={remoteModalOpen}
        onOpenChange={setRemoteModalOpen}
        facilities={facilities}
        levels={levels}
        onSuccess={onRefresh}
      />

      <AlertDialog open={!!deleteRemoteTarget} onOpenChange={(o: boolean) => { if (!o) setDeleteRemoteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Remote Host</AlertDialogTitle>
            <AlertDialogDescription>
              Remove syslog forwarding to <strong>{deleteRemoteTarget}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingRemote}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRemoteHost}
              disabled={deletingRemote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingRemote ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
