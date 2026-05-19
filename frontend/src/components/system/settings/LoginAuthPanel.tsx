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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Edit2, Plus, Trash2 } from "lucide-react";
import {
  systemSettingsService,
  type SystemConfig,
  type SystemCapabilities,
} from "@/lib/api/system-settings";
import { useToast } from "@/hooks/useToast";

interface Props {
  config: SystemConfig;
  capabilities: SystemCapabilities;
  isReadOnly: boolean;
  onRefresh: () => void;
}

export function LoginAuthPanel({ config, capabilities: _cap, isReadOnly, onRefresh }: Props) {
  const { toast } = useToast();

  // --- RADIUS ---
  const [addingRadius, setAddingRadius] = useState(false);
  const [radiusServer, setRadiusServer] = useState("");
  const [radiusPort, setRadiusPort] = useState("");
  const [radiusTimeout, setRadiusTimeout] = useState("");
  const [radiusKey, setRadiusKey] = useState("");
  const [radiusSaving, setRadiusSaving] = useState(false);
  const [radiusError, setRadiusError] = useState<string | null>(null);

  const [deleteRadiusTarget, setDeleteRadiusTarget] = useState<string | null>(null);
  const [deletingRadius, setDeletingRadius] = useState(false);

  // RADIUS source address
  const [editingRadiusSrc, setEditingRadiusSrc] = useState(false);
  const [radiusSrcAddr, setRadiusSrcAddr] = useState(config.login_radius?.source_address ?? "");
  const [radiusSrcSaving, setRadiusSrcSaving] = useState(false);
  const [radiusSrcError, setRadiusSrcError] = useState<string | null>(null);

  // --- TACACS ---
  const [addingTacacs, setAddingTacacs] = useState(false);
  const [tacacsServer, setTacacsServer] = useState("");
  const [tacacsPort, setTacacsPort] = useState("");
  const [tacacsTimeout, setTacacsTimeout] = useState("");
  const [tacacsKey, setTacacsKey] = useState("");
  const [tacacsSaving, setTacacsSaving] = useState(false);
  const [tacacsError, setTacacsError] = useState<string | null>(null);

  const [deleteTacacsTarget, setDeleteTacacsTarget] = useState<string | null>(null);
  const [deletingTacacs, setDeletingTacacs] = useState(false);

  // TACACS source address + timeout
  const [editingTacacsGlobal, setEditingTacacsGlobal] = useState(false);
  const [tacacsSrcAddr, setTacacsSrcAddr] = useState(config.login_tacacs?.source_address ?? "");
  const [tacacsGlobalTimeout, setTacacsGlobalTimeout] = useState(
    config.login_tacacs?.timeout ? String(config.login_tacacs.timeout) : ""
  );
  const [tacacsGlobalSaving, setTacacsGlobalSaving] = useState(false);
  const [tacacsGlobalError, setTacacsGlobalError] = useState<string | null>(null);

  const handleAddRadius = async () => {
    if (!radiusServer.trim()) { setRadiusError("Server address is required"); return; }
    setRadiusSaving(true);
    setRadiusError(null);
    try {
      const result = await systemSettingsService.addRadiusServer(
        radiusServer.trim(),
        radiusPort ? parseInt(radiusPort, 10) : null,
        radiusTimeout ? parseInt(radiusTimeout, 10) : null,
        radiusKey || null,
      );
      if (!result.success) { setRadiusError(result.error ?? "Failed to add server"); return; }
      toast.success("RADIUS server added");
      setAddingRadius(false);
      setRadiusServer(""); setRadiusPort(""); setRadiusTimeout(""); setRadiusKey("");
      onRefresh();
    } catch { setRadiusError("An unexpected error occurred"); }
    finally { setRadiusSaving(false); }
  };

  const handleDeleteRadius = async () => {
    if (!deleteRadiusTarget) return;
    setDeletingRadius(true);
    try {
      const result = await systemSettingsService.deleteRadiusServer(deleteRadiusTarget);
      if (!result.success) { toast.error("Delete failed", result.error ?? "Could not delete server"); }
      else { toast.success("RADIUS server removed"); onRefresh(); }
    } catch { toast.error("Error", "An unexpected error occurred"); }
    finally { setDeletingRadius(false); setDeleteRadiusTarget(null); }
  };

  const handleSaveRadiusSrc = async () => {
    setRadiusSrcSaving(true);
    setRadiusSrcError(null);
    try {
      const result = radiusSrcAddr.trim()
        ? await systemSettingsService.setRadiusSourceAddress(radiusSrcAddr.trim())
        : await systemSettingsService.deleteRadiusSourceAddress();
      if (!result.success) { setRadiusSrcError(result.error ?? "Failed to save"); return; }
      toast.success("RADIUS source address saved");
      setEditingRadiusSrc(false);
      onRefresh();
    } catch { setRadiusSrcError("An unexpected error occurred"); }
    finally { setRadiusSrcSaving(false); }
  };

  const handleAddTacacs = async () => {
    if (!tacacsServer.trim()) { setTacacsError("Server address is required"); return; }
    setTacacsSaving(true);
    setTacacsError(null);
    try {
      const result = await systemSettingsService.addTacacsServer(
        tacacsServer.trim(),
        tacacsPort ? parseInt(tacacsPort, 10) : null,
        tacacsTimeout ? parseInt(tacacsTimeout, 10) : null,
        tacacsKey || null,
      );
      if (!result.success) { setTacacsError(result.error ?? "Failed to add server"); return; }
      toast.success("TACACS+ server added");
      setAddingTacacs(false);
      setTacacsServer(""); setTacacsPort(""); setTacacsTimeout(""); setTacacsKey("");
      onRefresh();
    } catch { setTacacsError("An unexpected error occurred"); }
    finally { setTacacsSaving(false); }
  };

  const handleDeleteTacacs = async () => {
    if (!deleteTacacsTarget) return;
    setDeletingTacacs(true);
    try {
      const result = await systemSettingsService.deleteTacacsServer(deleteTacacsTarget);
      if (!result.success) { toast.error("Delete failed", result.error ?? "Could not delete server"); }
      else { toast.success("TACACS+ server removed"); onRefresh(); }
    } catch { toast.error("Error", "An unexpected error occurred"); }
    finally { setDeletingTacacs(false); setDeleteTacacsTarget(null); }
  };

  const handleSaveTacacsGlobal = async () => {
    setTacacsGlobalSaving(true);
    setTacacsGlobalError(null);
    try {
      const ops: Promise<unknown>[] = [];
      if (tacacsSrcAddr.trim()) {
        ops.push(systemSettingsService.setTacacsSourceAddress(tacacsSrcAddr.trim()));
      } else {
        ops.push(systemSettingsService.deleteTacacsSourceAddress());
      }
      if (tacacsGlobalTimeout.trim()) {
        ops.push(systemSettingsService.setTacacsTimeout(parseInt(tacacsGlobalTimeout, 10)));
      } else {
        ops.push(systemSettingsService.deleteTacacsTimeout());
      }
      await Promise.all(ops);
      toast.success("TACACS+ settings saved");
      setEditingTacacsGlobal(false);
      onRefresh();
    } catch { setTacacsGlobalError("An unexpected error occurred"); }
    finally { setTacacsGlobalSaving(false); }
  };

  const radiusServers = config.login_radius?.servers ?? [];
  const tacacsServers = config.login_tacacs?.servers ?? [];

  return (
    <div className="space-y-6">
      {/* RADIUS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>RADIUS Authentication</CardTitle>
              <CardDescription>Remote AAA via RADIUS servers.</CardDescription>
            </div>
            {!isReadOnly && !addingRadius && (
              <Button size="sm" variant="outline" onClick={() => setAddingRadius(true)}>
                <Plus className="h-4 w-4 mr-2" />Add Server
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {addingRadius && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              {radiusError && (
                <div className="rounded border border-destructive/20 bg-destructive/10 p-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">{radiusError}</pre>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <Label className="text-xs">Server IP/Host</Label>
                  <Input value={radiusServer} onChange={(e) => setRadiusServer(e.target.value)} placeholder="192.168.1.10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Port</Label>
                  <Input type="number" value={radiusPort} onChange={(e) => setRadiusPort(e.target.value)} placeholder="1812" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Timeout (s)</Label>
                  <Input type="number" value={radiusTimeout} onChange={(e) => setRadiusTimeout(e.target.value)} placeholder="2" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Shared Key</Label>
                  <Input type="password" value={radiusKey} onChange={(e) => setRadiusKey(e.target.value)} placeholder="secret" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddRadius} disabled={radiusSaving}>
                  {radiusSaving ? "Adding…" : "Add"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingRadius(false); setRadiusError(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {radiusServers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No RADIUS servers configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Timeout</TableHead>
                  {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {radiusServers.map((s) => (
                  <TableRow key={s.server}>
                    <TableCell className="font-mono">{s.server}</TableCell>
                    <TableCell>{s.port ?? <span className="text-muted-foreground">1812</span>}</TableCell>
                    <TableCell>{s.timeout != null ? `${s.timeout}s` : <span className="text-muted-foreground">Default</span>}</TableCell>
                    {!isReadOnly && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteRadiusTarget(s.server)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Source address */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Source Address</Label>
              {!isReadOnly && !editingRadiusSrc && (
                <Button variant="ghost" size="sm" onClick={() => { setRadiusSrcAddr(config.login_radius?.source_address ?? ""); setEditingRadiusSrc(true); }}>
                  <Edit2 className="h-3 w-3 mr-1" />Edit
                </Button>
              )}
            </div>
            {editingRadiusSrc ? (
              <div className="space-y-2">
                {radiusSrcError && (
                  <div className="rounded border border-destructive/20 bg-destructive/10 p-2">
                    <pre className="text-xs text-destructive font-mono">{radiusSrcError}</pre>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input value={radiusSrcAddr} onChange={(e) => setRadiusSrcAddr(e.target.value)} placeholder="Leave blank to remove" className="max-w-xs" />
                  <Button size="sm" onClick={handleSaveRadiusSrc} disabled={radiusSrcSaving}>{radiusSrcSaving ? "Saving…" : "Save"}</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingRadiusSrc(false); setRadiusSrcError(null); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm">{config.login_radius?.source_address ?? <span className="text-muted-foreground">Not configured</span>}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* TACACS+ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>TACACS+ Authentication</CardTitle>
              <CardDescription>Remote AAA via TACACS+ servers.</CardDescription>
            </div>
            {!isReadOnly && !addingTacacs && (
              <Button size="sm" variant="outline" onClick={() => setAddingTacacs(true)}>
                <Plus className="h-4 w-4 mr-2" />Add Server
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {addingTacacs && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              {tacacsError && (
                <div className="rounded border border-destructive/20 bg-destructive/10 p-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">{tacacsError}</pre>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <Label className="text-xs">Server IP/Host</Label>
                  <Input value={tacacsServer} onChange={(e) => setTacacsServer(e.target.value)} placeholder="192.168.1.20" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Port</Label>
                  <Input type="number" value={tacacsPort} onChange={(e) => setTacacsPort(e.target.value)} placeholder="49" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Timeout (s)</Label>
                  <Input type="number" value={tacacsTimeout} onChange={(e) => setTacacsTimeout(e.target.value)} placeholder="3" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Shared Key</Label>
                  <Input type="password" value={tacacsKey} onChange={(e) => setTacacsKey(e.target.value)} placeholder="secret" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddTacacs} disabled={tacacsSaving}>
                  {tacacsSaving ? "Adding…" : "Add"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingTacacs(false); setTacacsError(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {tacacsServers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No TACACS+ servers configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Timeout</TableHead>
                  {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tacacsServers.map((s) => (
                  <TableRow key={s.server}>
                    <TableCell className="font-mono">{s.server}</TableCell>
                    <TableCell>{s.port ?? <span className="text-muted-foreground">49</span>}</TableCell>
                    <TableCell>{s.timeout != null ? `${s.timeout}s` : <span className="text-muted-foreground">Default</span>}</TableCell>
                    {!isReadOnly && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTacacsTarget(s.server)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Global TACACS settings */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Global Settings</span>
              {!isReadOnly && !editingTacacsGlobal && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setTacacsSrcAddr(config.login_tacacs?.source_address ?? "");
                  setTacacsGlobalTimeout(config.login_tacacs?.timeout ? String(config.login_tacacs.timeout) : "");
                  setEditingTacacsGlobal(true);
                }}>
                  <Edit2 className="h-3 w-3 mr-1" />Edit
                </Button>
              )}
            </div>
            {editingTacacsGlobal ? (
              <div className="space-y-3">
                {tacacsGlobalError && (
                  <div className="rounded border border-destructive/20 bg-destructive/10 p-2">
                    <pre className="text-xs text-destructive font-mono">{tacacsGlobalError}</pre>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm">
                  <div className="space-y-1">
                    <Label className="text-xs">Source Address</Label>
                    <Input value={tacacsSrcAddr} onChange={(e) => setTacacsSrcAddr(e.target.value)} placeholder="Leave blank to remove" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Timeout (s)</Label>
                    <Input type="number" value={tacacsGlobalTimeout} onChange={(e) => setTacacsGlobalTimeout(e.target.value)} placeholder="Leave blank to remove" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveTacacsGlobal} disabled={tacacsGlobalSaving}>{tacacsGlobalSaving ? "Saving…" : "Save"}</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingTacacsGlobal(false); setTacacsGlobalError(null); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Source Address: </span>
                  {config.login_tacacs?.source_address ?? <span className="text-muted-foreground">Not configured</span>}
                </div>
                <div>
                  <span className="text-muted-foreground">Timeout: </span>
                  {config.login_tacacs?.timeout != null ? `${config.login_tacacs.timeout}s` : <span className="text-muted-foreground">Default</span>}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete dialogs */}
      <AlertDialog open={!!deleteRadiusTarget} onOpenChange={(o) => { if (!o) setDeleteRadiusTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove RADIUS Server</AlertDialogTitle>
            <AlertDialogDescription>Remove RADIUS server <strong>{deleteRadiusTarget}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingRadius}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRadius} disabled={deletingRadius} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingRadius ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTacacsTarget} onOpenChange={(o) => { if (!o) setDeleteTacacsTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove TACACS+ Server</AlertDialogTitle>
            <AlertDialogDescription>Remove TACACS+ server <strong>{deleteTacacsTarget}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTacacs}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTacacs} disabled={deletingTacacs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingTacacs ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
