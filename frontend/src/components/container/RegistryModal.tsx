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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import type { ContainerRegistry, ContainerCapabilities } from "@/lib/api/container";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registry: ContainerRegistry | null;
  capabilities: ContainerCapabilities | null;
  onSubmit: (data: ContainerRegistry) => Promise<void>;
}

export function RegistryModal({ open, onOpenChange, registry, capabilities, onSubmit }: Props) {
  const isEditMode = !!registry;
  const caps = capabilities?.features;
  const showInsecure = caps?.registry_insecure?.supported ?? true;
  const showMirror = caps?.registry_mirror?.supported ?? true;

  const [name, setName] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [insecure, setInsecure] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [mirrorAddress, setMirrorAddress] = useState("");
  const [mirrorHostName, setMirrorHostName] = useState("");
  const [mirrorPath, setMirrorPath] = useState("");
  const [mirrorPort, setMirrorPort] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const r = registry;
    setName(r?.name ?? "");
    setDisabled(r?.disabled ?? false);
    setInsecure(r?.insecure ?? false);
    setAuthUsername(r?.authentication?.username ?? "");
    setAuthPassword(r?.authentication?.password ?? "");
    setMirrorAddress(r?.mirror?.address ?? "");
    setMirrorHostName(r?.mirror?.host_name ?? "");
    setMirrorPath(r?.mirror?.path ?? "");
    setMirrorPort(r?.mirror?.port ?? "");
    setError(null);
  }, [open, registry]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const validate = (): string | null => {
    if (!isEditMode && !name.trim()) return "Registry name is required.";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError(null);

    const hasMirror = mirrorAddress || mirrorHostName || mirrorPath || mirrorPort;

    try {
      await onSubmit({
        name: name.trim(),
        disabled,
        insecure: showInsecure ? insecure : false,
        authentication: (authUsername || authPassword)
          ? { username: authUsername || null, password: authPassword || null }
          : null,
        mirror: (showMirror && hasMirror)
          ? { address: mirrorAddress || null, host_name: mirrorHostName || null, path: mirrorPath || null, port: mirrorPort || null }
          : null,
      });
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? `Edit Registry — ${registry?.name}` : "Add Registry"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modify this container registry." : "Configure a container image registry."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 pb-2">
            <div className="space-y-2">
              <Label htmlFor="reg-name">Registry</Label>
              <Input
                id="reg-name"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isEditMode}
                className={isEditMode ? "bg-muted font-mono" : "font-mono"}
                placeholder="e.g. docker.io"
              />
              {isEditMode && <p className="text-xs text-muted-foreground">Registry name cannot be changed after creation.</p>}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="reg-disabled" checked={disabled} onCheckedChange={v => setDisabled(v === true)} />
              <Label htmlFor="reg-disabled" className="cursor-pointer">Disable this registry</Label>
            </div>

            {showInsecure && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="reg-insecure" checked={insecure} onCheckedChange={v => setInsecure(v === true)} />
                  <Label htmlFor="reg-insecure" className="cursor-pointer">Allow insecure connections (HTTP)</Label>
                </div>
                {insecure && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">Insecure mode allows unencrypted HTTP connections. Only use on trusted networks.</p>
                  </div>
                )}
              </div>
            )}

            {/* Authentication */}
            <div className="space-y-3 pt-1">
              <Label className="text-sm font-semibold">Authentication</Label>
              <div className="space-y-2">
                <Label htmlFor="reg-user">Username</Label>
                <Input id="reg-user" value={authUsername} onChange={e => setAuthUsername(e.target.value)} placeholder="Registry username (optional)" className="font-mono" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-pass">Password</Label>
                <Input id="reg-pass" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Registry password (optional)" autoComplete="new-password" />
              </div>
            </div>

            {/* Mirror */}
            {showMirror && (
              <div className="space-y-3 pt-1">
                <Label className="text-sm font-semibold">Mirror</Label>
                <p className="text-xs text-muted-foreground">Configure a mirror to redirect pulls for this registry.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="mir-addr">Address</Label>
                    <Input id="mir-addr" value={mirrorAddress} onChange={e => setMirrorAddress(e.target.value)} placeholder="e.g. 192.168.1.100" className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mir-host">Hostname</Label>
                    <Input id="mir-host" value={mirrorHostName} onChange={e => setMirrorHostName(e.target.value)} placeholder="mirror.example.com" className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mir-path">Path</Label>
                    <Input id="mir-path" value={mirrorPath} onChange={e => setMirrorPath(e.target.value)} placeholder="/v2" className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mir-port">Port</Label>
                    <Input id="mir-port" type="number" value={mirrorPort} onChange={e => setMirrorPort(e.target.value)} placeholder="e.g. 5000" className="font-mono" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditMode ? "Saving…" : "Adding…"}</>
            ) : isEditMode ? "Save Changes" : "Add Registry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
