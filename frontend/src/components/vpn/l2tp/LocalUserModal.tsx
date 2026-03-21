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
import { AlertCircle, Loader2, Users } from "lucide-react";
import { l2tpService, L2TPLocalUser } from "@/lib/api/l2tp";
import { ApiError } from "@/lib/types/api";

interface LocalUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingUser: L2TPLocalUser | null;
}

export function LocalUserModal({
  open,
  onOpenChange,
  onSuccess,
  existingUser,
}: LocalUserModalProps) {
  const isEdit = !!existingUser;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [staticIp, setStaticIp] = useState("");
  const [rateLimitDown, setRateLimitDown] = useState("");
  const [rateLimitUp, setRateLimitUp] = useState("");
  const [disabled, setDisabled] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingUser) {
        setUsername(existingUser.username);
        setPassword("");
        setStaticIp(existingUser.static_ip || "");
        setRateLimitDown(existingUser.rate_limit_download || "");
        setRateLimitUp(existingUser.rate_limit_upload || "");
        setDisabled(existingUser.disabled || false);
      } else {
        setUsername("");
        setPassword("");
        setStaticIp("");
        setRateLimitDown("");
        setRateLimitUp("");
        setDisabled(false);
      }
      setError(null);
    }
  }, [open, existingUser]);

  const handleSubmit = async () => {
    if (!username.trim()) { setError("Username is required"); return; }
    if (!isEdit && !password) { setError("Password is required for new users"); return; }

    setLoading(true);
    setError(null);

    try {
      let result;
      if (isEdit) {
        result = await l2tpService.updateLocalUser(username.trim(), existingUser!, {
          password: password || undefined,
          static_ip: staticIp,
          rate_limit_download: rateLimitDown,
          rate_limit_upload: rateLimitUp,
          disabled,
        });
      } else {
        result = await l2tpService.createLocalUser(username.trim(), {
          password,
          static_ip: staticIp || undefined,
          rate_limit_download: rateLimitDown || undefined,
          rate_limit_upload: rateLimitUp || undefined,
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
            <Users className="h-5 w-5 text-primary" />
            {isEdit ? "Edit" : "Create"} Local User
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "Update local user settings." : "Add a new L2TP local user."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="vpnuser" disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEdit ? "Leave blank to keep current" : "Enter password"} />
          </div>
          <div className="space-y-2">
            <Label>Static IP</Label>
            <Input value={staticIp} onChange={(e) => setStaticIp(e.target.value)} placeholder="10.255.0.10 (optional)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rate Limit Down</Label>
              <Input value={rateLimitDown} onChange={(e) => setRateLimitDown(e.target.value)} placeholder="e.g., 10000" />
            </div>
            <div className="space-y-2">
              <Label>Rate Limit Up</Label>
              <Input value={rateLimitUp} onChange={(e) => setRateLimitUp(e.target.value)} placeholder="e.g., 5000" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="disabled" checked={disabled} onCheckedChange={(v) => setDisabled(!!v)} />
            <Label htmlFor="disabled" className="cursor-pointer">Disabled</Label>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Creating..."}</> : isEdit ? "Save Changes" : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
