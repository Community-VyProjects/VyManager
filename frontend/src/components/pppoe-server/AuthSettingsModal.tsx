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
import { AlertCircle, Key, Loader2 } from "lucide-react";
import { pppoeServerService, PPPoEAuthentication } from "@/lib/api/pppoe-server";
import { ApiError } from "@/lib/types/api";

const ALL_PROTOCOLS = ["pap", "chap", "mschap", "mschap-v2"];

interface AuthSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentAuth: PPPoEAuthentication;
}

export function AuthSettingsModal({ open, onOpenChange, onSuccess, currentAuth }: AuthSettingsModalProps) {
  const [mode, setMode] = useState("local");
  const [protocols, setProtocols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(currentAuth.mode || "local");
      setProtocols(currentAuth.protocols || []);
      setError(null);
    }
  }, [open, currentAuth]);

  const toggleProtocol = (p: string) => {
    setProtocols((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pppoeServerService.updateAuthSettings(currentAuth, {
        mode,
        protocols: mode === "local" ? protocols : undefined,
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Authentication Settings
          </DialogTitle>
          <DialogDescription>Configure the PPPoE authentication mode.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Authentication Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="radius">RADIUS</SelectItem>
                <SelectItem value="noauth">No Authentication</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "local" && (
            <div className="space-y-2">
              <Label>Protocols</Label>
              <div className="space-y-1">
                {ALL_PROTOCOLS.map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <Checkbox
                      id={`proto-${p}`}
                      checked={protocols.includes(p)}
                      onCheckedChange={() => toggleProtocol(p)}
                    />
                    <Label htmlFor={`proto-${p}`} className="cursor-pointer font-mono text-sm">{p}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}
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
