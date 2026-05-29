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
import { AlertCircle, Loader2, User } from "lucide-react";
import { pppoeServerService, PPPoELocalUser } from "@/lib/api/pppoe-server";
import { ApiError } from "@/lib/types/api";

interface LocalUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingUser?: PPPoELocalUser | null;
}

export function LocalUserModal({ open, onOpenChange, onSuccess, existingUser }: LocalUserModalProps) {
  const isEdit = !!existingUser;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [staticIp, setStaticIp] = useState("");
  const [rateDownload, setRateDownload] = useState("");
  const [rateUpload, setRateUpload] = useState("");
  const [disabled, setDisabled] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingUser) {
        setUsername(existingUser.username);
        setPassword("");
        setStaticIp(existingUser.static_ip || "");
        setRateDownload(existingUser.rate_limit?.download || "");
        setRateUpload(existingUser.rate_limit?.upload || "");
        setDisabled(existingUser.disabled || false);
      } else {
        setUsername("");
        setPassword("");
        setStaticIp("");
        setRateDownload("");
        setRateUpload("");
        setDisabled(false);
      }
      setError(null);
    }
  }, [open, existingUser]);

  const handleSubmit = async () => {
    if (!username.trim()) { setError("Username is required"); return; }
    if (!isEdit && !password.trim()) { setError("Password is required for new users"); return; }

    setLoading(true);
    setError(null);

    try {
      let result;
      if (isEdit) {
        result = await pppoeServerService.updateLocalUser(existingUser!.username, existingUser!, {
          password: password || undefined,
          static_ip: staticIp,
          rate_download: rateDownload,
          rate_upload: rateUpload,
          disabled,
        });
      } else {
        result = await pppoeServerService.createLocalUser(username.trim(), {
          password,
          static_ip: staticIp || undefined,
          rate_download: rateDownload || undefined,
          rate_upload: rateUpload || undefined,
          disabled,
        });
      }

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to save user");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {isEdit ? "Edit" : "Add"} Local User
          </DialogTitle>
          <DialogDescription>Configure a PPPoE local authentication user.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="user@example.com" disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "Leave blank to keep current" : "Enter password"}
            />
          </div>
          <div className="space-y-2">
            <Label>Static IP (optional)</Label>
            <Input value={staticIp} onChange={(e) => setStaticIp(e.target.value)} placeholder="192.168.100.10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rate Limit Download</Label>
              <Input value={rateDownload} onChange={(e) => setRateDownload(e.target.value)} placeholder="10m" />
            </div>
            <div className="space-y-2">
              <Label>Rate Limit Upload</Label>
              <Input value={rateUpload} onChange={(e) => setRateUpload(e.target.value)} placeholder="5m" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="user-disabled" checked={disabled} onCheckedChange={(v) => setDisabled(!!v)} />
            <Label htmlFor="user-disabled" className="cursor-pointer">Disabled</Label>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Adding..."}</> : isEdit ? "Save Changes" : "Add User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
