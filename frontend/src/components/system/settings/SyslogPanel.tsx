"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Edit2, Plus, Trash2 } from "lucide-react";
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
  const t = useTranslations("systemSyslog");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const { syslog: { facilities, levels, supports_console, supports_file, supports_user, supports_marker_disable, supports_remote_format } } =
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

  // Edit remote format flags (1.5 only)
  const [formatEditHost, setFormatEditHost] = useState<string | null>(null);
  const [formatTz, setFormatTz] = useState(false);
  const [formatOctet, setFormatOctet] = useState(false);
  const [formatSaving, setFormatSaving] = useState(false);

  const handleSaveRemoteFormat = async () => {
    if (!formatEditHost) return;
    setFormatSaving(true);
    try {
      const result = await systemSettingsService.setSyslogRemoteFormat(
        formatEditHost,
        formatTz,
        formatOctet,
      );
      if (!result.success) {
        toast.error(t("saveFailed"), result.error ?? t("syslog.updateFormatFailed"));
      } else {
        toast.success(t("syslog.formatUpdated"));
        setFormatEditHost(null);
        onRefresh();
      }
    } catch {
      toast.error(t("saveFailed"), t("unexpectedError"));
    } finally {
      setFormatSaving(false);
    }
  };

  // Syslog marker
  const [editingMarker, setEditingMarker] = useState(false);
  const [markerInterval, setMarkerInterval] = useState(
    config.syslog_marker?.interval ? String(config.syslog_marker.interval) : ""
  );
  const [markerDisabled, setMarkerDisabled] = useState(config.syslog_marker?.disabled ?? false);
  const [markerSaving, setMarkerSaving] = useState(false);
  const [markerError, setMarkerError] = useState<string | null>(null);

  const handleAddLocalFacility = async () => {
    setLocalSaving(true);
    setLocalError(null);
    try {
      const result = await systemSettingsService.setSyslogLocalFacility(localFac, localLevel);
      if (!result.success) {
        setLocalError(result.error ?? t("syslog.setFacilityFailed"));
      } else {
        toast.success(t("syslog.localFacilitySet"));
        setAddingLocal(false);
        onRefresh();
      }
    } catch {
      setLocalError(t("unexpectedError"));
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
        setConsoleError(result.error ?? t("syslog.setFacilityFailed"));
      } else {
        toast.success(t("syslog.consoleFacilitySet"));
        setAddingConsole(false);
        onRefresh();
      }
    } catch {
      setConsoleError(t("unexpectedError"));
    } finally {
      setConsoleSaving(false);
    }
  };

  const handleSaveMarker = async () => {
    setMarkerSaving(true);
    setMarkerError(null);
    try {
      const ops: Promise<unknown>[] = [];
      if (markerInterval.trim()) {
        ops.push(systemSettingsService.setSyslogMarkerInterval(parseInt(markerInterval, 10)));
      } else {
        ops.push(systemSettingsService.deleteSyslogMarkerInterval());
      }
      if (supports_marker_disable) {
        ops.push(systemSettingsService.setSyslogMarkerDisable(markerDisabled));
      }
      await Promise.all(ops);
      toast.success(t("syslog.markerSaved"));
      setEditingMarker(false);
      onRefresh();
    } catch { setMarkerError(t("unexpectedError")); }
    finally { setMarkerSaving(false); }
  };

  const handleDeleteRemoteHost = async () => {
    if (!deleteRemoteTarget) return;
    setDeletingRemote(true);
    try {
      const result = await systemSettingsService.deleteSyslogRemoteHost(deleteRemoteTarget);
      if (!result.success) {
        toast.error(t("deleteFailed"), result.error ?? t("syslog.removeHostFailed"));
      } else {
        toast.success(t("syslog.hostRemoved"));
        onRefresh();
      }
    } catch {
      toast.error(t("deleteFailed"), t("unexpectedError"));
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
              <CardTitle>{t("syslog.localTitle")}</CardTitle>
              <CardDescription>
                {t("syslog.localDescription", { target: capabilities.syslog.local_target })}
              </CardDescription>
            </div>
            {!isReadOnly && !addingLocal && (
              <Button size="sm" variant="outline" onClick={() => setAddingLocal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("syslog.addFacility")}
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
                  <span className="text-xs text-muted-foreground">{t("facility")}</span>
                  <Select value={localFac} onValueChange={setLocalFac}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {facilities.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">{t("level")}</span>
                  <Select value={localLevel} onValueChange={setLocalLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleAddLocalFacility} disabled={localSaving}>
                  {localSaving ? t("saving") : t("syslog.apply")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingLocal(false); setLocalError(null); }}>
                  {tc("cancel")}
                </Button>
              </div>
            </div>
          )}

          {config.syslog.local_facilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("syslog.noLocal")}</p>
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
              <CardTitle>{t("syslog.remoteTitle")}</CardTitle>
              <CardDescription>{t("syslog.remoteDescription", { target: capabilities.syslog.remote_target })}</CardDescription>
            </div>
            {!isReadOnly && (
              <Button size="sm" onClick={() => setRemoteModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("syslog.addHost")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("syslog.host")}</TableHead>
                <TableHead>{t("port")}</TableHead>
                <TableHead>{t("syslog.facilities")}</TableHead>
                {supports_remote_format && <TableHead>{t("syslog.format")}</TableHead>}
                {!isReadOnly && <TableHead className="text-right">{tc("actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.syslog.remote_hosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? (supports_remote_format ? 4 : 3) : (supports_remote_format ? 5 : 4)} className="text-center text-muted-foreground py-6">
                    {t("syslog.noRemote")}
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
                    {supports_remote_format && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rh.format_include_timezone && (
                            <Badge variant="outline" className="text-xs">include-timezone</Badge>
                          )}
                          {rh.format_octet_counted && (
                            <Badge variant="outline" className="text-xs">octet-counted</Badge>
                          )}
                          {!rh.format_include_timezone && !rh.format_octet_counted && (
                            <span className="text-xs text-muted-foreground">{tc("default")}</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {!isReadOnly && (
                      <TableCell className="text-right">
                        {supports_remote_format && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormatEditHost(rh.host);
                              setFormatTz(rh.format_include_timezone);
                              setFormatOctet(rh.format_octet_counted);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
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
                <CardTitle>{t("syslog.consoleTitle")}</CardTitle>
                <CardDescription>{t("syslog.consoleDescription")}</CardDescription>
              </div>
              {!isReadOnly && !addingConsole && (
                <Button size="sm" variant="outline" onClick={() => setAddingConsole(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("syslog.addFacility")}
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
                    <span className="text-xs text-muted-foreground">{t("facility")}</span>
                    <Select value={consoleFac} onValueChange={setConsoleFac}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {facilities.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-xs text-muted-foreground">{t("level")}</span>
                    <Select value={consoleLevel} onValueChange={setConsoleLevel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={handleAddConsoleFacility} disabled={consoleSaving}>
                    {consoleSaving ? t("saving") : t("syslog.apply")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAddingConsole(false); setConsoleError(null); }}>
                    {tc("cancel")}
                  </Button>
                </div>
              </div>
            )}
            {config.syslog.console_facilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("syslog.noConsole")}</p>
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
            <CardTitle>{t("syslog.fileTitle")}</CardTitle>
            <CardDescription>{t("syslog.fileDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("syslog.filename")}</TableHead>
                  <TableHead>{t("syslog.facilities")}</TableHead>
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
            <CardTitle>{t("syslog.userTitle")}</CardTitle>
            <CardDescription>{t("syslog.userDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("syslog.username")}</TableHead>
                  <TableHead>{t("syslog.facilities")}</TableHead>
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

      {/* Syslog Marker */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("syslog.markerTitle")}</CardTitle>
              <CardDescription>
                {t("syslog.markerDescription")}
              </CardDescription>
            </div>
            {!isReadOnly && (
              editingMarker ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingMarker(false); setMarkerError(null); }} disabled={markerSaving}>{tc("cancel")}</Button>
                  <Button size="sm" onClick={handleSaveMarker} disabled={markerSaving}>{markerSaving ? t("saving") : tc("save")}</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => {
                  setMarkerInterval(config.syslog_marker?.interval ? String(config.syslog_marker.interval) : "");
                  setMarkerDisabled(config.syslog_marker?.disabled ?? false);
                  setMarkerError(null);
                  setEditingMarker(true);
                }}>
                  <Edit2 className="h-4 w-4 mr-2" />{tc("edit")}
                </Button>
              )
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {markerError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{markerError}</pre>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("syslog.intervalMinutes")}</Label>
              {editingMarker ? (
                <Input
                  type="number"
                  min="1"
                  value={markerInterval}
                  onChange={(e) => setMarkerInterval(e.target.value)}
                  placeholder={t("syslog.leaveBlankToDisable")}
                  className="max-w-xs"
                />
              ) : (
                <p className="text-sm font-medium">
                  {config.syslog_marker?.interval != null
                    ? t("syslog.minutesValue", { value: config.syslog_marker.interval })
                    : <span className="text-muted-foreground">{t("notConfigured")}</span>}
                </p>
              )}
            </div>
            {supports_marker_disable && (
              <div className="flex items-center justify-between">
                <Label>{t("syslog.disableMarker")}</Label>
                {editingMarker ? (
                  <Checkbox checked={markerDisabled} onCheckedChange={(v) => setMarkerDisabled(!!v)} />
                ) : (
                  <span className={`text-sm font-medium ${config.syslog_marker?.disabled ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                    {config.syslog_marker?.disabled ? tc("disabled") : t("syslog.active")}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <SyslogRemoteModal
        open={remoteModalOpen}
        onOpenChange={setRemoteModalOpen}
        facilities={facilities}
        levels={levels}
        supportsFormat={supports_remote_format}
        onSuccess={onRefresh}
      />

      <AlertDialog open={!!deleteRemoteTarget} onOpenChange={(o: boolean) => { if (!o) setDeleteRemoteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("syslog.removeHostTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich("syslog.removeHostConfirm", { host: deleteRemoteTarget ?? "", strong: (chunks) => <strong>{chunks}</strong> })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingRemote}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRemoteHost}
              disabled={deletingRemote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingRemote ? t("syslog.removing") : t("syslog.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!formatEditHost} onOpenChange={(o: boolean) => { if (!o) setFormatEditHost(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("syslog.editFormatTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich("syslog.editFormatDescription", { host: formatEditHost ?? "", strong: (chunks) => <strong>{chunks}</strong> })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-fmt-tz"
                checked={formatTz}
                onCheckedChange={(v) => setFormatTz(!!v)}
              />
              <Label htmlFor="edit-fmt-tz" className="text-sm font-normal">
                {t("includeTimezone")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-fmt-octet"
                checked={formatOctet}
                onCheckedChange={(v) => setFormatOctet(!!v)}
              />
              <Label htmlFor="edit-fmt-octet" className="text-sm font-normal">
                {t("octetCounted")}
              </Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={formatSaving}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveRemoteFormat} disabled={formatSaving}>
              {formatSaving ? t("saving") : tc("save")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
