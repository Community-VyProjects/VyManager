"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  MonitorSpeaker,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  consoleServerService,
  ConsoleDevice,
  ConsoleServerConfig,
} from "@/lib/api/console-server";
import { ConsoleServerModal } from "./ConsoleServerModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
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

const EMPTY_CONFIG: ConsoleServerConfig = { devices: [] };

/** Formats serial config as compact industry-standard notation, e.g. "8N1". */
function formatSerialConfig(device: ConsoleDevice): string {
  const bits = device.data_bits ?? "8";
  const stopBits = device.stop_bits ?? "1";
  const parityChar = device.parity === "even" ? "E" : device.parity === "odd" ? "O" : "N";
  return `${bits}${parityChar}${stopBits}`;
}

export function ConsoleServerContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.CONSOLE_SERVER);

  const [config, setConfig] = useState<ConsoleServerConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<ConsoleDevice | null>(null);

  // Per-device delete dialog
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteDeviceError, setDeleteDeviceError] = useState<string | null>(null);
  const [deleteDeviceLoading, setDeleteDeviceLoading] = useState(false);

  // Remove-all dialog
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await consoleServerService.getConfig(refresh);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load console server configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openAddModal() {
    setEditingDevice(null);
    setModalOpen(true);
  }

  function openEditModal(device: ConsoleDevice) {
    setEditingDevice(device);
    setModalOpen(true);
  }

  const handleSave = async (updated: ConsoleDevice) => {
    await consoleServerService.saveDevice(editingDevice, updated);
    setModalOpen(false);
    await loadData(true);
  };

  function openDeleteDevice(deviceName: string) {
    setDeleteTarget(deviceName);
    setDeleteDeviceError(null);
  }

  async function handleDeleteDevice() {
    if (!deleteTarget) return;
    setDeleteDeviceLoading(true);
    setDeleteDeviceError(null);
    try {
      await consoleServerService.deleteDevice(deleteTarget);
      setDeleteTarget(null);
      await loadData(true);
    } catch (err) {
      setDeleteDeviceError(err instanceof Error ? err.message : "Failed to delete device.");
    } finally {
      setDeleteDeviceLoading(false);
    }
  }

  async function handleDeleteAll() {
    setDeleteAllLoading(true);
    setDeleteAllError(null);
    try {
      await consoleServerService.deleteConsoleServer();
      setDeleteAllOpen(false);
      await loadData(true);
    } catch (err) {
      setDeleteAllError(err instanceof Error ? err.message : "Failed to remove configuration.");
    } finally {
      setDeleteAllLoading(false);
    }
  }

  const hasDevices = config.devices.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !hasDevices) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <MonitorSpeaker className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">Console Server</h1>
                  {!hasWritePermission && (
                    <Badge variant="secondary">Read Only</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Serial console server for remote out-of-band device access
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {hasWritePermission && (
                <>
                  <Button size="sm" onClick={openAddModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Device
                  </Button>
                  {hasDevices && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setDeleteAllError(null);
                        setDeleteAllOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove All
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-auto">
          {!hasDevices ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MonitorSpeaker className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  No serial console devices configured
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={openAddModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Device
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Device</TableHead>
                    <TableHead>Alias</TableHead>
                    <TableHead className="w-[110px]">Speed</TableHead>
                    <TableHead className="w-[80px]">Config</TableHead>
                    <TableHead className="w-[100px]">SSH Port</TableHead>
                    <TableHead>Description</TableHead>
                    {hasWritePermission && (
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.devices.map((device) => (
                    <TableRow key={device.name}>
                      <TableCell className="font-mono font-medium">
                        {device.name}
                      </TableCell>
                      <TableCell>
                        {device.alias ? (
                          <span className="text-sm">{device.alias}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {device.speed ?? <span className="text-muted-foreground text-xs">9600</span>}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {formatSerialConfig(device)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {device.ssh?.port != null ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {device.ssh.port}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {device.description ?? ""}
                      </TableCell>
                      {hasWritePermission && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditModal(device)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => openDeleteDevice(device.name)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>

      {/* Add / Edit modal */}
      <ConsoleServerModal
        open={modalOpen}
        device={editingDevice}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      />

      {/* Per-device delete dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Console Device</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the console device{" "}
              <span className="font-mono font-medium">{deleteTarget}</span> and stop all
              associated SSH access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteDeviceError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive whitespace-pre-wrap font-mono">
                {deleteDeviceError}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDeviceLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteDevice();
              }}
              disabled={deleteDeviceLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDeviceLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove-all dialog */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove All Console Server Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all console server devices and their configurations. All serial
              console access will stop immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteAllError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive whitespace-pre-wrap font-mono">
                {deleteAllError}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAllLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAll();
              }}
              disabled={deleteAllLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAllLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
