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
import { AlertCircle, Loader2, Server } from "lucide-react";
import { ipoeServerService, IPoERadiusServer } from "@/lib/api/ipoe-server";
import { ApiError } from "@/lib/types/api";

interface RadiusServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingServer: IPoERadiusServer | null;
}

export function RadiusServerModal({ open, onOpenChange, onSuccess, existingServer }: RadiusServerModalProps) {
  const isEdit = !!existingServer;

  const [address, setAddress] = useState("");
  const [key, setKey] = useState("");
  const [port, setPort] = useState("");
  const [acctPort, setAcctPort] = useState("");
  const [priority, setPriority] = useState("");
  const [failTime, setFailTime] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [backup, setBackup] = useState(false);
  const [disableAccounting, setDisableAccounting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingServer) {
        setAddress(existingServer.address);
        setKey("");
        setPort(existingServer.port || "");
        setAcctPort(existingServer.acct_port || "");
        setPriority(existingServer.priority || "");
        setFailTime(existingServer.fail_time || "");
        setDisabled(existingServer.disabled || false);
        setBackup(existingServer.backup || false);
        setDisableAccounting(existingServer.disable_accounting || false);
      } else {
        setAddress("");
        setKey("");
        setPort("");
        setAcctPort("");
        setPriority("");
        setFailTime("");
        setDisabled(false);
        setBackup(false);
        setDisableAccounting(false);
      }
      setError(null);
    }
  }, [open, existingServer]);

  const handleSubmit = async () => {
    if (!address.trim()) { setError("Server address is required"); return; }

    setLoading(true);
    setError(null);

    try {
      if (isEdit) await ipoeServerService.deleteRadiusServer(existingServer!.address);

      const result = await ipoeServerService.createRadiusServer(address.trim(), {
        key: key || undefined,
        port: port || undefined,
        acct_port: acctPort || undefined,
        priority: priority || undefined,
        fail_time: failTime || undefined,
        disabled,
        backup,
        disable_accounting: disableAccounting,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to save RADIUS server");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to save RADIUS server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            {isEdit ? "Edit" : "Add"} RADIUS Server
          </DialogTitle>
          <DialogDescription>Configure a RADIUS authentication server.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Server Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="10.0.0.100" disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <Label>Shared Key</Label>
            <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={isEdit ? "Leave blank to keep current" : "Enter shared key"} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Auth Port</Label>
              <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="1812" />
            </div>
            <div className="space-y-2">
              <Label>Accounting Port</Label>
              <Input value={acctPort} onChange={(e) => setAcctPort(e.target.value)} placeholder="1813" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Input value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="1" />
            </div>
            <div className="space-y-2">
              <Label>Fail Time</Label>
              <Input value={failTime} onChange={(e) => setFailTime(e.target.value)} placeholder="60" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="srv-disabled" checked={disabled} onCheckedChange={(v) => setDisabled(!!v)} />
              <Label htmlFor="srv-disabled" className="cursor-pointer">Disabled</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="srv-backup" checked={backup} onCheckedChange={(v) => setBackup(!!v)} />
              <Label htmlFor="srv-backup" className="cursor-pointer">Backup Server</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="srv-no-acct" checked={disableAccounting} onCheckedChange={(v) => setDisableAccounting(!!v)} />
              <Label htmlFor="srv-no-acct" className="cursor-pointer">Disable Accounting</Label>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Adding..."}</> : isEdit ? "Save Changes" : "Add Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
