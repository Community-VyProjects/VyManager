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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Key } from "lucide-react";
import { l2tpService, L2TPAuthentication, L2TPCapabilities } from "@/lib/api/l2tp";
import { ApiError } from "@/lib/types/api";

interface AuthSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentAuth: L2TPAuthentication;
  capabilities: L2TPCapabilities | null;
}

export function AuthSettingsModal({
  open,
  onOpenChange,
  onSuccess,
  currentAuth,
  capabilities,
}: AuthSettingsModalProps) {
  const [mode, setMode] = useState("");
  const [protocols, setProtocols] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableModes = capabilities?.features.authentication.modes || ["local", "radius", "noauth"];
  const availableProtocols = capabilities?.features.authentication.protocols || ["pap", "chap", "mschap", "mschap-v2"];

  useEffect(() => {
    if (open) {
      setMode(currentAuth.mode || "");
      setProtocols(currentAuth.protocols || []);
      setError(null);
    }
  }, [open, currentAuth]);

  const toggleProtocol = (proto: string) => {
    setProtocols(prev =>
      prev.includes(proto) ? prev.filter(p => p !== proto) : [...prev, proto]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await l2tpService.updateAuthSettings(currentAuth, {
        mode,
        protocols,
      });
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update authentication settings");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update authentication settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Authentication Settings
          </DialogTitle>
          <DialogDescription>Configure authentication mode and protocols.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Authentication Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                {availableModes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Authentication Protocols</Label>
            <div className="space-y-2">
              {availableProtocols.map(proto => (
                <div key={proto} className="flex items-center gap-2">
                  <Checkbox
                    id={`proto-${proto}`}
                    checked={protocols.includes(proto)}
                    onCheckedChange={() => toggleProtocol(proto)}
                  />
                  <Label htmlFor={`proto-${proto}`} className="cursor-pointer font-mono text-sm">{proto}</Label>
                </div>
              ))}
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
